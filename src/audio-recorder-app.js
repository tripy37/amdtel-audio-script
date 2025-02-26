import { LitElement, html, css } from 'lit';
import './audio-recorder.js';
import './audio-ipfs-uploader.js';

export class AudioRecorderApp extends LitElement {
  static properties = {
    recordings: { type: Array, state: true },
    currentStatus: { type: String, state: true },
    selectedRecording: { type: Object, state: true }
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
    .recordings {
      margin-top: 2rem;
    }
    .recording-item {
      padding: 1rem;
      margin: 1rem 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    h2 {
      color: #333;
      margin: 0 0 1rem 0;
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
    .no-recordings {
      text-align: center;
      color: #666;
      padding: 2rem;
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
    .loading {
      color: #666;
      font-style: italic;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }
    button {
      padding: 0.5rem 1rem;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      background: #0369a1;
      color: white;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    button:hover {
      background: #0284c7;
    }
    button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    button.delete {
      background: #dc2626;
    }
    button.delete:hover {
      background: #b91c1c;
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
    this._loadRecordings();
  }

  async _loadRecordings() {
    try {
      const stored = localStorage.getItem('audioRecordings');
      if (stored) {
        this.recordings = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
      this.currentStatus = 'Error loading recordings';
    }
  }

  deleteRecording(index) {
    if (this.recordings[index].audioUrl) {
      URL.revokeObjectURL(this.recordings[index].audioUrl);
    }
    this.recordings = [
      ...this.recordings.slice(0, index),
      ...this.recordings.slice(index + 1)
    ];
    this._saveRecordings();
    this.currentStatus = 'Recording deleted';
  }

  async saveToIpfs(index) {
    const recording = this.recordings[index];
    if (!recording || recording.ipfsStatus === 'uploading') return;

    this.selectedRecording = recording;
    const uploader = this.shadowRoot.querySelector('ipfs-audio-uploader');
    if (!uploader) {
      this.currentStatus = 'Error: IPFS uploader not initialized';
      return;
    }

    try {
      recording.ipfsStatus = 'uploading';
      this._saveRecordings();
      
      await uploader.setAudioData(recording.chunks);
      this.currentStatus = 'Uploading to IPFS...';
    } catch (error) {
      recording.ipfsStatus = 'failed';
      this._saveRecordings();
      this.currentStatus = `Error: ${error.message}`;
    }
  }

  _saveRecordings() {
    try {
      localStorage.setItem('audioRecordings', JSON.stringify(this.recordings));
    } catch (error) {
      console.error('Failed to save recordings:', error);
    }
  }

  handleUploadComplete(e) {
    const { cid, gatewayUrl } = e.detail;
    if (this.selectedRecording) {
      this.selectedRecording.cid = cid;
      this.selectedRecording.gatewayUrl = gatewayUrl;
      this.selectedRecording.ipfsStatus = 'uploaded';
      this._saveRecordings();
      this.currentStatus = 'Successfully saved to IPFS';
      this.selectedRecording = null;
    }
  }

  handleUploadError(e) {
    const { message } = e.detail;
    this.currentStatus = `Error: ${message}`;
  }

  handleStatusUpdate(e) {
    this.currentStatus = e.detail;
  }

  handleRecordingComplete(e) {
    const blob = new Blob(e.detail.chunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(blob);
    
    const newRecording = {
      chunks: e.detail.chunks,
      audioUrl,
      timestamp: new Date().toLocaleString(),
      ipfsStatus: 'local' // 'local', 'uploading', 'uploaded', 'failed'
    };
    
    this.recordings = [...this.recordings, newRecording];
    this._saveRecordings();
    this.currentStatus = 'Recording saved locally';
  }

  render() {
    return html`
      <div class="container">
        <h2>Audio Recorder</h2>
        
        <!-- Status Display -->
        ${this.currentStatus ? html`
          <div class="status-message ${this.currentStatus.includes('Error') ? 'error' : 'info'}">
            ${this.currentStatus}
          </div>
        ` : ''}
        
        <!-- Recorder Component -->
        <audio-recorder
          @recording-complete=${this.handleRecordingComplete}
        ></audio-recorder>

        <!-- Hidden IPFS Uploader Component -->
        <ipfs-audio-uploader
          gateway="https://ipfs.io/ipfs/"
          @upload-complete=${this.handleUploadComplete}
          @upload-error=${this.handleUploadError}
          style="display: none;"
        ></ipfs-audio-uploader>

        <!-- Recording History -->
        <div class="recordings">
          <h2>Recording History</h2>
          ${this.recordings.length === 0 ? html`
            <div class="no-recordings">No recordings yet</div>
          ` : 
          this.recordings.map((recording, index) => html`
            <div class="recording-item">
              <div class="recording-info">
                <div>Recorded: ${recording.timestamp}</div>
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
                  <button @click=${() => this.saveToIpfs(index)}
                          ?disabled=${recording.ipfsStatus === 'uploading'}>
                    Save to IPFS
                  </button>
                ` : ''}
                <button class="delete" @click=${() => this.deleteRecording(index)}>
                  Delete
                </button>
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }




}

customElements.define('audio-recorder-app', AudioRecorderApp);