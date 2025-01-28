import { LitElement, html, css } from 'lit';

export class AudioRecorder extends LitElement {
  static properties = {
    isRecording: { type: Boolean, state: true },
    error: { type: String, state: true },
  };

  static styles = css`
    :host {
      display: block;
      padding: 1rem;
    }
    .controls {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    button {
      padding: 0.5rem 1rem;
      border-radius: 4px;
      border: none;
      background: #007bff;
      color: white;
      cursor: pointer;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    button.stop {
      background: #dc3545;
    }
    .status {
      margin-top: 0.5rem;
      color: #666;
    }
    .error {
      color: #dc3545;
    }
  `;

  constructor() {
    super();
    this.mediaRecorder = null;
    this.isRecording = false;
    this.audioChunks = [];
    this.error = '';
    this.audioURL = '';
  }

  async initializeRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        try {
          // Create a single blob from all chunks
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Test playback before sending
          const testUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(testUrl);
          
          // Wait for audio metadata to load to ensure it's valid
          await new Promise((resolve) => {
            audio.onloadedmetadata = resolve;
            audio.onerror = () => {
              console.error('Audio test failed');
              resolve();
            };
          });

          // Dispatch the recording complete event with the tested audio data
          this.dispatchEvent(new CustomEvent('recording-complete', {
            detail: {
              chunks: [uint8Array],
              isRecording: false,
              testUrl
            }
          }));
        } catch (error) {
          console.error('Error processing recording:', error);
          this.error = 'Error processing recording';
        }
      };

      this.error = '';
    } catch (error) {
      this.error = `Microphone access error: ${error.message}`;
      console.error('Microphone access error:', error);
    }
  }

  async startRecording() {
    if (!this.mediaRecorder) {
      await this.initializeRecorder();
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
      this.audioChunks = [];
      this.isRecording = true;
      this.mediaRecorder.start(100); // Get chunks every 100ms
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  render() {
    return html`
      <div>
        <div class="controls">
          <button
            @click=${this.startRecording}
            ?disabled=${this.isRecording}
          >
            Start Recording
          </button>
          <button
            class="stop"
            @click=${this.stopRecording}
            ?disabled=${!this.isRecording}
          >
            Stop Recording
          </button>
        </div>

        <div class="status">
          ${this.isRecording ? 'Recording...' : 'Not recording'}
        </div>
        
        ${this.error ? html`
          <div class="error">${this.error}</div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('audio-recorder', AudioRecorder);