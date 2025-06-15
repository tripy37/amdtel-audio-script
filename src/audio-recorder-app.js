import { LitElement, html, css } from 'lit';
import './audio-recorder.js';
import { storageService } from './services/storage-service.js';
import { ipfsService } from './services/ipfs-uploader.js';

export class AudioRecorderApp extends LitElement {
  static properties = {
    recordings: { type: Array, state: true },
    currentStatus: { type: String, state: true },
    selectedRecording: { type: Object, state: true },
    scriptContext: { type: Object, state: true },
    currentLineRecordings: { type: Array, state: true }
  };

  static styles = css`
    :host {
      display: block;
      padding: 1rem;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .recorder-container {
      display: flex;
      flex-direction: column;
      gap: var(--size-4);
      padding: var(--size-4);
      background: var(--surface-2);
      border-radius: var(--radius-2);
    }
    .status-message {
      padding: 0.5rem;
      margin: 1rem 0;
      border-radius: 4px;
    }
    .status-message.error {
      background-color: #fee2e2;
      color: #dc2626;
    }
    .status-message.info {
      background-color: #e0f2fe;
      color: #0369a1;
    }
    .recording-history {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid var(--surface-3);
    }
    .recording-item {
      padding: 1rem;
      margin: 1rem 0;
      border: 1px solid var(--surface-3);
      border-radius: var(--radius-2);
      background: var(--surface-1);
      box-shadow: var(--shadow-1);
    }
    .recording-info {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .status {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    .status.local {
      background-color: #e0f2fe;
      color: #0369a1;
    }
    .status.uploading {
      background-color: #fef3c7;
      color: #92400e;
    }
    .status.uploaded {
      background-color: #dcfce7;
      color: #16a34a;
    }
    .status.failed {
      background-color: #fee2e2;
      color: #dc2626;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--surface-3);
    }
    button {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-2);
      border: none;
      cursor: pointer;
      background: var(--brand);
      color: white;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    button:hover {
      background: var(--brand-4);
    }
    button:disabled {
      background: var(--surface-3);
      cursor: not-allowed;
    }
    button.delete {
      background: var(--red-5);
    }
    button.delete:hover {
      background: var(--red-6);
    }
    audio {
      width: 100%;
      margin: 0.5rem 0;
    }
  `;

  constructor() {
    super();
    this.recordings = [];
    this.currentStatus = '';
    this.selectedRecording = null;
    this.scriptContext = null;
    this.currentLineRecordings = [];
    this._loadRecordings();
    this._initializeIpfs();
  }

  async _initializeIpfs() {
    try {
      const initialized = await ipfsService.initialize();
      if (!initialized) {
        this.currentStatus = 'Error: Failed to initialize IPFS service';
      }
    } catch (error) {
      console.error('Failed to initialize IPFS:', error);
      this.currentStatus = 'Error: Failed to initialize IPFS service';
    }
  }

  setScriptContext(context) {
    this.scriptContext = context;
    this._loadCurrentLineRecordings();
  }

  async _loadRecordings() {
    try {
      const allRecordings = await storageService.getAllRecordings();
      this.recordings = allRecordings;
      this._loadCurrentLineRecordings();
    } catch (error) {
      console.error('Failed to load recordings:', error);
      this.currentStatus = 'Error loading recordings';
    }
  }

  async _loadCurrentLineRecordings() {
    if (this.scriptContext) {
      try {
        this.currentLineRecordings = await storageService.getRecordingsForLine(
          this.scriptContext.scriptId,
          this.scriptContext.act,
          this.scriptContext.scene,
          this.scriptContext.lineIndex
        );
      } catch (error) {
        console.error('Failed to load line recordings:', error);
        this.currentStatus = 'Error loading line recordings';
      }
    } else {
      this.currentLineRecordings = [];
    }
  }

  async handleRecordingComplete(e) {
    if (!this.scriptContext) {
      this.currentStatus = 'Error: No script context available';
      return;
    }

    try {
      const blob = new Blob(e.detail.chunks, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(blob);
      
      const newRecording = {
        id: crypto.randomUUID(),
        chunks: e.detail.chunks,
        audioUrl,
        timestamp: new Date().toISOString(),
        duration: e.detail.duration,
        ipfsStatus: 'local',
        scriptId: this.scriptContext.scriptId,
        act: this.scriptContext.act,
        scene: this.scriptContext.scene,
        lineIndex: this.scriptContext.lineIndex,
        lineText: this.scriptContext.lineText
      };
      
      // Save to IndexedDB
      await storageService.saveRecording(newRecording);
      
      // Update local state
      this.currentLineRecordings = [...this.currentLineRecordings, newRecording];
      this.recordings = [...this.recordings, newRecording];
      
      this.currentStatus = 'Recording saved locally';
    } catch (error) {
      console.error('Failed to save recording:', error);
      this.currentStatus = 'Error saving recording';
    }
  }

  async deleteRecording(recordingId) {
    try {
      // Remove from IndexedDB
      await storageService.deleteRecording(recordingId);
      
      // Update local state
      this.currentLineRecordings = this.currentLineRecordings.filter(rec => rec.id !== recordingId);
      this.recordings = this.recordings.filter(rec => rec.id !== recordingId);
      
      // Clean up the audio URL
      const recording = this.recordings.find(rec => rec.id === recordingId);
      if (recording?.audioUrl) {
        URL.revokeObjectURL(recording.audioUrl);
      }
      
      this.currentStatus = 'Recording deleted';
    } catch (error) {
      console.error('Failed to delete recording:', error);
      this.currentStatus = 'Error deleting recording';
    }
  }

  async saveToIpfs(recordingId) {
    const recording = this.recordings.find(rec => rec.id === recordingId);
    if (!recording || recording.ipfsStatus === 'uploading') return;

    try {
      recording.ipfsStatus = 'uploading';
      this.currentStatus = 'Uploading to IPFS...';
      // Force UI update for uploading state
      this.requestUpdate();

      // Convert chunks to a single ArrayBuffer
      const audioData = await this._combineChunks(recording.chunks);
      
      // Upload to IPFS with progress tracking
      const { cid, audioUrl } = await ipfsService.uploadAudio(audioData, (progress) => {
        this.currentStatus = `Uploading to IPFS: ${progress}%`;
        this.requestUpdate();
      });

      // Update recording with IPFS data
      recording.cid = cid;
      recording.gatewayUrl = `${ipfsService.gateway}${cid}`;
      recording.ipfsStatus = 'uploaded';
      
      // Save updated recording to IndexedDB
      await storageService.saveRecording(recording);
      
      // Update the recordings array to trigger UI update
      this.recordings = [...this.recordings];
      this.currentLineRecordings = [...this.currentLineRecordings];
      
      this.currentStatus = 'Successfully saved to IPFS';
      this.requestUpdate();
    } catch (error) {
      console.error('IPFS upload failed:', error);
      recording.ipfsStatus = 'failed';
      this.currentStatus = `Error: ${error.message}`;
      this.requestUpdate();
    }
  }

  async _combineChunks(chunks) {
    // Combine all chunks into a single ArrayBuffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      combinedBuffer.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    return combinedBuffer.buffer;
  }

  handleStatusUpdate(e) {
    this.currentStatus = e.detail;
  }

  render() {
    return html`
      <div class="container">
        <!-- Status Display -->
        ${this.currentStatus ? html`
          <div class="status-message ${this.currentStatus.includes('Error') ? 'error' : 'info'}">
            ${this.currentStatus}
          </div>
        ` : ''}
        
        <div class="recorder-container">
          <!-- Recorder Component -->
          <audio-recorder
            @recording-complete=${this.handleRecordingComplete}
          ></audio-recorder>

          <!-- Current Line Recordings -->
          ${this.currentLineRecordings.length > 0 ? html`
            <div class="recording-history">
              <h3>Recordings for this line (${this.currentLineRecordings.length})</h3>
              ${this.currentLineRecordings.map((recording) => html`
                <div class="recording-item">
                  <div class="recording-info">
                    <div>Recorded: ${recording.timestamp}</div>
                    <div>Duration: ${this.formatDuration(recording.duration)}</div>
                    ${recording.cid ? html`
                      <div>CID: ${recording.cid}</div>
                      <div>IPFS URL: <a href="${recording.gatewayUrl}" target="_blank">${recording.gatewayUrl}</a></div>
                    ` : ''}
                    <div class="status ${recording.ipfsStatus}">
                      ${recording.ipfsStatus === 'local' ? 'Saved Locally' :
                        recording.ipfsStatus === 'uploading' ? 'Uploading to IPFS...' :
                        recording.ipfsStatus === 'uploaded' ? 'Saved to IPFS' :
                        recording.ipfsStatus === 'failed' ? 'IPFS Upload Failed' : ''}
                    </div>
                  </div>
                  
                  <audio controls src="${recording.audioUrl || recording.gatewayUrl}"></audio>
                  
                  <div class="actions">
                    ${recording.ipfsStatus === 'local' || recording.ipfsStatus === 'failed' ? html`
                      <button @click=${() => this.saveToIpfs(recording.id)}
                              ?disabled=${recording.ipfsStatus === 'uploading'}>
                        Save to IPFS
                      </button>
                    ` : ''}
                    <button class="delete" @click=${() => this.deleteRecording(recording.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              `)}
            </div>
          ` : html`
            <div class="no-recordings">
              No recordings yet for this line. Click the record button above to start recording.
            </div>
          `}
        </div>
      </div>
    `;
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

customElements.define('audio-recorder-app', AudioRecorderApp);