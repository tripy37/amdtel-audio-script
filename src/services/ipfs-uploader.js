import { createHeliaHTTP } from '@helia/http';
import { unixfs } from '@helia/unixfs';
import { json } from '@helia/json';

export class IpfsService {
  constructor() {
    // Use more reliable gateways for development
    this.gateway = 'https://ipfs.io/ipfs/';
    this.fallbackGateways = [
      'https://cloudflare-ipfs.com/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://dweb.link/ipfs/',
      'https://ipfs.eth.aragon.network/ipfs/',
      'https://gateway.ipfs.io/ipfs/'
    ];
    this._ipfs = null;
    this._fs = null;
    this._json = null;
    this._requestTimeout = 15000;
    this._gatewayDelay = 500;
    this._maxRetries = 3;
    this._blobUrls = new Set();
    this._uploadedCids = new Set();
    this._pinnedCids = new Set();
  }

  async initialize() {
    try {
      // Use HeliaHTTP for now - it's simpler and more reliable for our use case
      this._ipfs = await createHeliaHTTP();
      this._fs = unixfs(this._ipfs);
      this._json = json(this._ipfs);
      
      // Load previously pinned CIDs from IndexedDB
      await this._loadPinnedCids();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize IPFS:', error);
      return false;
    }
  }

  async _loadPinnedCids() {
    try {
      const db = await this._getPinnedCidsDB();
      const transaction = db.transaction(['pinned'], 'readonly');
      const store = transaction.objectStore('pinned');
      const request = store.openCursor();
      
      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            this._pinnedCids.add(cursor.value.cid);
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
    } catch (error) {
      console.error('Failed to load pinned CIDs:', error);
    }
  }

  async _savePinnedCid(cid) {
    try {
      const db = await this._getPinnedCidsDB();
      const transaction = db.transaction(['pinned'], 'readwrite');
      const store = transaction.objectStore('pinned');
      
      return new Promise((resolve, reject) => {
        const request = store.put({ cid });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Failed to save pinned CID:', error);
    }
  }

  async _getPinnedCidsDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ipfsPinnedDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('pinned')) {
          const store = db.createObjectStore('pinned', { keyPath: 'cid' });
          // Add any indexes if needed
          store.createIndex('cid', 'cid', { unique: true });
        }
      };
    });
  }

  async pin(cid) {
    if (!this._ipfs || !this._fs) {
      throw new Error('IPFS not initialized');
    }

    try {
      // Pin the content
      await this._fs.pin.add(cid);
      this._pinnedCids.add(cid);
      await this._savePinnedCid(cid);
      return true;
    } catch (error) {
      console.error('Failed to pin CID:', error);
      return false;
    }
  }

  async unpin(cid) {
    if (!this._ipfs || !this._fs) {
      throw new Error('IPFS not initialized');
    }

    try {
      // Unpin the content
      await this._fs.pin.rm(cid);
      this._pinnedCids.delete(cid);
      
      // Remove from IndexedDB
      const db = await this._getPinnedCidsDB();
      const transaction = db.transaction(['pinned'], 'readwrite');
      const store = transaction.objectStore('pinned');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(cid);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
      });
    } catch (error) {
      console.error('Failed to unpin CID:', error);
      return false;
    }
  }

  _createBlobUrl(blob) {
    const url = URL.createObjectURL(blob);
    this._blobUrls.add(url);
    return url;
  }

  _revokeBlobUrl(url) {
    if (this._blobUrls.has(url)) {
      URL.revokeObjectURL(url);
      this._blobUrls.delete(url);
    }
  }

  async uploadAudio(audioData, onProgress) {
    if (!this._ipfs || !this._fs) {
      throw new Error('IPFS not initialized');
    }

    if (!audioData) {
      throw new Error('No audio data provided');
    }

    try {
      // Convert ArrayBuffer to Uint8Array for IPFS
      const uint8Array = new Uint8Array(audioData);
      
      // Add with progress tracking
      const cid = await this._fs.addBytes(uint8Array, {
        onProgress: (evt) => {
          if (evt.type === 'progress' && onProgress) {
            onProgress(Math.round(evt.detail.progress));
          }
        }
      });

      const cidString = cid.toString();
      
      // Pin the content
      await this.pin(cidString);
      
      // Verify the upload
      const verified = await this._verifyUpload(cidString);
      if (!verified) {
        throw new Error('Failed to verify upload');
      }

      // Track the uploaded CID
      this._uploadedCids.add(cidString);
      
      // Get the audio URL
      const audioUrl = await this._verifyAndGetAudioUrl(cidString);
      
      return {
        cid: cidString,
        audioUrl
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async _verifyUpload(cid) {
    // Try to retrieve the data from IPFS directly first
    try {
      const data = await this._fs.cat(cid);
      return data !== null;
    } catch (error) {
      console.warn('Direct IPFS verification failed, trying gateways:', error);
    }

    // If direct verification fails, try gateways
    for (let i = 0; i <= this.fallbackGateways.length; i++) {
      const currentGateway = i === 0 ? this.gateway : this.fallbackGateways[i - 1];
      const url = `${currentGateway}${cid}`;
      
      try {
        const response = await this._fetchWithTimeout(url, {
          method: 'HEAD', // Just check if the resource exists
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-cache'
        });
        
        if (response.ok) {
          return true;
        }
      } catch (error) {
        console.warn(`Gateway ${currentGateway} verification failed:`, error);
      }
    }
    
    return false;
  }

  async uploadScriptData(scriptData) {
    if (!this._ipfs || !this._json) {
      throw new Error('IPFS not initialized');
    }

    try {
      // Add the script data as a JSON DAG
      const cid = await this._json.add(scriptData);
      const cidString = cid.toString();
      
      // Pin the content
      await this.pin(cidString);
      
      // Verify the upload
      const verified = await this._verifyUpload(cidString);
      if (!verified) {
        throw new Error('Failed to verify script data upload');
      }

      // Track the uploaded CID
      this._uploadedCids.add(cidString);
      
      return cidString;
    } catch (error) {
      throw new Error(`Failed to upload script data: ${error.message}`);
    }
  }

  async retrieveScriptData(cid) {
    if (!this._ipfs || !this._json) {
      throw new Error('IPFS not initialized');
    }

    try {
      const data = await this._json.get(cid);
      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve script data: ${error.message}`);
    }
  }

  async retrieveAudio(cid) {
    if (!cid) {
      throw new Error('No CID provided');
    }

    try {
      const audioUrl = await this._verifyAndGetAudioUrl(cid);
      return audioUrl;
    } catch (error) {
      throw new Error(`Failed to retrieve audio: ${error.message}`);
    }
  }

  async _verifyAndGetAudioUrl(cid) {
    let lastError = null;
    
    // Try direct IPFS retrieval first
    try {
      const data = await this._fs.cat(cid);
      if (data) {
        const blob = new Blob([data], { type: 'audio/webm' });
        return this._createBlobUrl(blob);
      }
    } catch (error) {
      console.warn('Direct IPFS retrieval failed:', error);
      lastError = error;
    }

    // If direct retrieval fails, try gateways with retries
    for (let i = 0; i <= this.fallbackGateways.length; i++) {
      const currentGateway = i === 0 ? this.gateway : this.fallbackGateways[i - 1];
      
      for (let retry = 0; retry < this._maxRetries; retry++) {
        try {
          const url = `${currentGateway}${cid}`;
          const response = await this._fetchWithTimeout(url, {
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-cache',
            headers: {
              'Accept': 'audio/webm,audio/*,application/octet-stream'
            }
          });

          if (response.ok) {
            const blob = await response.blob();
            if (blob.type.includes('audio') || blob.type === 'application/octet-stream') {
              return this._createBlobUrl(
                blob.type === 'application/octet-stream' 
                  ? new Blob([await blob.arrayBuffer()], { type: 'audio/webm' })
                  : blob
              );
            }
          }
        } catch (error) {
          console.warn(`Gateway ${currentGateway} attempt ${retry + 1} failed:`, error);
          lastError = error;
          
          if (retry < this._maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, this._gatewayDelay));
          }
        }
      }
    }
    
    throw new Error(`All retrieval attempts failed: ${lastError?.message || 'Unknown error'}`);
  }

  async _fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this._requestTimeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  async cleanup() {
    // Cleanup blob URLs
    this._blobUrls.forEach(url => URL.revokeObjectURL(url));
    this._blobUrls.clear();
    
    // Cleanup IPFS resources
    if (this._ipfs) {
      try {
        await this._ipfs.stop();
      } catch (error) {
        console.error('Error stopping IPFS:', error);
      }
    }
  }

  // Get list of pinned CIDs
  getPinnedCids() {
    return Array.from(this._pinnedCids);
  }

  // Check if a CID is pinned
  isPinned(cid) {
    return this._pinnedCids.has(cid);
  }
}

// Create and export a singleton instance
export const ipfsService = new IpfsService(); 