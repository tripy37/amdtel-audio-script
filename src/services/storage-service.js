export class StorageService {
  constructor() {
    this.dbName = 'audioScriptDB';
    this.dbVersion = 1;
    this.storeName = 'recordings';
    this.db = null;
    this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('scriptLine', ['scriptId', 'act', 'scene', 'lineIndex'], { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveRecording(recording) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Create a new object without the audioUrl (it will be recreated on load)
      const recordingToStore = {
        ...recording,
        audioUrl: undefined
      };
      
      const request = store.put(recordingToStore);

      request.onsuccess = () => resolve(recording);
      request.onerror = () => reject(request.error);
    });
  }

  async getRecordingsForLine(scriptId, act, scene, lineIndex) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('scriptLine');
      const range = IDBKeyRange.only([scriptId, act, scene, lineIndex]);
      const request = index.getAll(range);

      request.onsuccess = () => {
        // Recreate audio URLs for each recording
        const recordings = request.result.map(recording => ({
          ...recording,
          audioUrl: recording.chunks ? URL.createObjectURL(this.arrayBufferToBlob(recording.chunks[0])) : null
        }));
        resolve(recordings);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecording(recordingId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(recordingId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllRecordings() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        // Recreate audio URLs for each recording
        const recordings = request.result.map(recording => ({
          ...recording,
          audioUrl: recording.chunks ? URL.createObjectURL(this.arrayBufferToBlob(recording.chunks[0])) : null
        }));
        resolve(recordings);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Helper method to convert Blob to ArrayBuffer
  async blobToArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  // Helper method to convert ArrayBuffer to Blob
  arrayBufferToBlob(arrayBuffer, type = 'audio/webm') {
    return new Blob([arrayBuffer], { type });
  }
}

// Create and export a singleton instance
export const storageService = new StorageService(); 