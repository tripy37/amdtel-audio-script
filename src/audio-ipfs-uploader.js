import { LitElement, html, css } from 'lit';
import { createHeliaHTTP } from '@helia/http';
import { unixfs } from '@helia/unixfs';

export class AudioIpfsUploader extends LitElement {
  static properties = {
    gateway: { type: String },
    fallbackGateways: { type: Array },
    cid: { type: String, state: true },
    status: { type: String, state: true },
    audioUrl: { type: String, state: true },
    isUploading: { type: Boolean, state: true },
    isRetrieving: { type: Boolean, state: true },
    uploadProgress: { type: Number, state: true }
  };

  static styles = css`
    :host {
      display: block;
      padding: 1rem;
    }
    .status {
      color: #666;
      margin: 0.5rem 0;
      padding: 0.5rem;
      border-radius: 4px;
    }
    .error {
      background-color: #fee2e2;
      color: #dc2626;
    }
    .success {
      background-color: #dcfce7;
      color: #16a34a;
    }
    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    .progress {
      height: 100%;
      background: #0369a1;
      transition: width 0.3s ease;
    }
    audio {
      width: 100%;
      margin-top: 1rem;
    }
    .gateway-info {
      font-size: 0.875rem;
      color: #666;
      margin-top: 0.25rem;
    }
  `;

  constructor() {
    super();
    this.gateway = 'https://dweb.link/ipfs/';
    this.fallbackGateways = [
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://cf-ipfs.com/ipfs/',
      'https://ipfs.eth.aragon.network/ipfs/',
      'https://gateway.ipfs.io/ipfs/'
    ];
    this.cid = '';
    this.status = 'Ready';
    this.audioUrl = '';
    this.isUploading = false;
    this.isRetrieving = false;
    this.uploadProgress = 0;
    this._audioData = null;
    this._ipfs = null;
    this._fs = null;
    this._currentGatewayIndex = 0;
    this._retryAttempts = 3;
    this._blobUrls = new Set();
    this._requestTimeout = 30000; // 30 seconds timeout
    this._gatewayDelay = 1000; // 1 second delay between gateways
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Cleanup blob URLs when component is removed
    this._blobUrls.forEach(url => URL.revokeObjectURL(url));
    this._blobUrls.clear();
  }

  async firstUpdated() {
    try {
      this._ipfs = await createHeliaHTTP();
      this._fs = unixfs(this._ipfs);
    } catch (error) {
      this._handleError('Failed to initialize IPFS', error);
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

  async setAudioData(chunks) {
    if (!chunks?.length) {
      this._handleError('No audio data provided');
      return;
    }

    try {
      // Combine all chunks if multiple are provided
      const blob = new Blob(chunks, { type: 'audio/webm' });
      this._audioData = await blob.arrayBuffer();
      await this.uploadToIpfs();
    } catch (error) {
      this._handleError('Failed to process audio data', error);
    }
  }

  async uploadToIpfs() {
    if (!this._audioData) {
      this._handleError('No audio data to upload');
      return;
    }

    if (!this._ipfs || !this._fs) {
      this._handleError('IPFS not initialized');
      return;
    }

    if (this.isUploading) {
      this._handleError('Upload already in progress');
      return;
    }

    try {
      this.isUploading = true;
      this.uploadProgress = 0;
      this.status = 'Preparing upload...';

      // Convert ArrayBuffer to Uint8Array for IPFS
      const uint8Array = new Uint8Array(this._audioData);
      
      // Add with progress tracking
      const cid = await this._fs.addBytes(uint8Array, {
        onProgress: (evt) => {
          if (evt.type === 'progress') {
            this.uploadProgress = Math.round(evt.detail.progress);
            this.status = `Uploading: ${this.uploadProgress}%`;
          }
        }
      });
      
      this.cid = cid.toString();
      await this._verifyAndSetAudioUrl();
      this.status = 'Upload complete';

      this._dispatchUploadComplete();
      this._audioData = null;
    } catch (error) {
      this._handleError('Upload failed', error);
      throw error; // Propagate error to parent component
    } finally {
      this.isUploading = false;
      this.uploadProgress = 0;
    }
  }

  async _verifyAndSetAudioUrl() {
    this.status = 'Verifying upload...';
    this._currentGatewayIndex = 0;
    await this._tryNextGateway();
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

  async _tryNextGateway() {
    if (this._currentGatewayIndex >= this.fallbackGateways.length + 1) {
      throw new Error('All gateways failed');
    }

    const currentGateway = this._currentGatewayIndex === 0 
      ? this.gateway 
      : this.fallbackGateways[this._currentGatewayIndex - 1];
    
    const url = `${currentGateway}${this.cid}`;
    
    try {
      // Try GET request with blob response and timeout
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
        // Verify blob is audio or octet-stream
        if (blob.type.includes('audio') || blob.type === 'application/octet-stream') {
          // If old blob URL exists, revoke it
          if (this.audioUrl && this.audioUrl.startsWith('blob:')) {
            this._revokeBlobUrl(this.audioUrl);
          }
          // Create new blob URL
          this.audioUrl = this._createBlobUrl(
            blob.type === 'application/octet-stream' 
              ? new Blob([await blob.arrayBuffer()], { type: 'audio/webm' })
              : blob
          );
          return;
        }
      }
    } catch (error) {
      const errorType = error.name === 'AbortError' ? 'timeout' :
                       error.message.includes('CORS') ? 'CORS' : 'network';
      console.warn(`Gateway ${currentGateway} failed (${errorType}):`, error);
    }

    // Add delay before trying next gateway to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, this._gatewayDelay));
    this._currentGatewayIndex++;
    await this._tryNextGateway();
  }

  async retrieveFromIpfs(cid) {
    if (!this._ipfs || !this._fs) {
      this._handleError('IPFS not initialized');
      return;
    }

    if (this.isRetrieving) {
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;

    try {
      this.isRetrieving = true;

      while (retryCount < maxRetries) {
        try {
          this.status = `Retrieving from IPFS${retryCount > 0 ? ` (Attempt ${retryCount + 1}/${maxRetries})` : ''}...`;
          
          // Try to retrieve using Helia with timeout
          const chunks = [];
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('IPFS retrieval timed out')), this._requestTimeout)
          );
          
          const retrievalPromise = (async () => {
            for await (const chunk of this._fs.cat(cid)) {
              chunks.push(chunk);
            }
          })();

          await Promise.race([retrievalPromise, timeoutPromise]);
          
          // Combine chunks and create blob
          const uint8Array = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
          let offset = 0;
          for (const chunk of chunks) {
            uint8Array.set(chunk, offset);
            offset += chunk.length;
          }
          
          const blob = new Blob([uint8Array], { type: 'audio/webm' });
          
          // If old blob URL exists, revoke it
          if (this.audioUrl && this.audioUrl.startsWith('blob:')) {
            this._revokeBlobUrl(this.audioUrl);
          }
          
          this.audioUrl = this._createBlobUrl(blob);
          this.status = 'Retrieval complete';
          
          return this.audioUrl;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            this._handleError('Direct IPFS retrieval failed, trying gateways...', error);
            // Fallback to gateway URLs if direct retrieval fails
            this.cid = cid;
            await this._verifyAndSetAudioUrl();
            return this.audioUrl;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } finally {
      this.isRetrieving = false;
    }
  }

  _handleError(message, error = null) {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    this.status = errorMessage;
    console.error(errorMessage, error);
    
    this.dispatchEvent(new CustomEvent('upload-error', {
      detail: { message: errorMessage, error }
    }));
  }

  _dispatchUploadComplete() {
    this.dispatchEvent(new CustomEvent('upload-complete', {
      detail: {
        cid: this.cid,
        gatewayUrl: this.audioUrl
      }
    }));
  }

  render() {
    return html`
      <div>
        <div class="status ${this.status === 'Upload complete' || this.status === 'Retrieval complete' ? 'success' : 
                           this.status.includes('error') || this.status.includes('failed') ? 'error' : ''}">
          ${this.status}
          ${(this.isUploading || this.isRetrieving) && this.uploadProgress > 0 ? html`
            <div class="progress-bar">
              <div class="progress" style="width: ${this.uploadProgress}%"></div>
            </div>
          ` : ''}
        </div>
        ${this.cid ? html`
          <div>CID: ${this.cid}</div>
          <div>
            Gateway URL: 
            <a href="${this.audioUrl}" target="_blank">${this.audioUrl}</a>
            <div class="gateway-info">
              Using gateway: ${this._currentGatewayIndex === 0 ? 
                this.gateway : 
                this.fallbackGateways[this._currentGatewayIndex - 1]}
            </div>
          </div>
          ${this.audioUrl ? html`
            <audio controls src="${this.audioUrl}"></audio>
          ` : ''}
        ` : ''}
      </div>
    `;
  }
}

customElements.define('audio-ipfs-uploader', AudioIpfsUploader);