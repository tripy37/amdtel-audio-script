import { LitElement, html, css } from 'lit';

export class AudioRecorder extends LitElement {
  static properties = {
    isRecording: { type: Boolean, state: true },
    error: { type: String, state: true },
    recordingTime: { type: Number, state: true },
    recordingLevel: { type: Number, state: true }
  };

  static styles = css`
    :host {
      display: block;
      padding: var(--size-4);
      background: var(--surface-2);
      border-radius: var(--radius-2);
    }

    .recorder-container {
      display: flex;
      flex-direction: column;
      gap: var(--size-4);
    }

    .controls {
      display: flex;
      gap: var(--size-3);
      justify-content: center;
      margin-bottom: var(--size-4);
    }

    .record-button {
      padding: var(--size-3) var(--size-6);
      border-radius: var(--radius-2);
      border: none;
      background: var(--red-5);
      color: white;
      font-weight: var(--font-weight-6);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: var(--size-2);
    }

    .record-button:hover:not(:disabled) {
      background: var(--red-6);
      transform: translateY(-1px);
    }

    .record-button:disabled {
      background: var(--surface-3);
      cursor: not-allowed;
    }

    .record-button.recording {
      background: var(--red-6);
      animation: pulse 1.5s infinite;
    }

    .status-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--size-2);
    }

    .recording-status {
      font-size: var(--font-size-3);
      color: var(--text-2);
      display: flex;
      align-items: center;
      gap: var(--size-2);
    }

    .recording-time {
      font-family: monospace;
      font-size: var(--font-size-4);
      color: var(--text-1);
    }

    .level-meter {
      width: 100%;
      height: 4px;
      background: var(--surface-3);
      border-radius: var(--radius-1);
      overflow: hidden;
      margin: var(--size-2) 0;
    }

    .level-bar {
      height: 100%;
      background: var(--brand);
      width: 0%;
      transition: width 0.1s ease;
    }

    .error {
      color: var(--red-9);
      background: var(--red-2);
      padding: var(--size-2);
      border-radius: var(--radius-2);
      margin-top: var(--size-2);
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  `;

  constructor() {
    super();
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.isRecording = false;
    this.audioChunks = [];
    this.error = '';
    this.recordingTime = 0;
    this.recordingLevel = 0;
    this.recordingTimer = null;
    this.analyserInterval = null;
  }

  async initializeRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context and analyzer for level metering
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      
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
          // Stop the level meter
          if (this.analyserInterval) {
            clearInterval(this.analyserInterval);
            this.analyserInterval = null;
          }
          
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
              testUrl,
              duration: this.recordingTime
            }
          }));

          // Reset recording state
          this.recordingTime = 0;
          this.recordingLevel = 0;
          if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
          }
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

  startLevelMeter() {
    if (this.analyser) {
      this.analyserInterval = setInterval(() => {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate average level
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        this.recordingLevel = (average / 255) * 100;
      }, 100);
    }
  }

  async startRecording() {
    if (!this.mediaRecorder) {
      await this.initializeRecorder();
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
      this.audioChunks = [];
      this.isRecording = true;
      this.recordingTime = 0;
      this.mediaRecorder.start(100); // Get chunks every 100ms
      
      // Start recording timer
      this.recordingTimer = setInterval(() => {
        this.recordingTime += 0.1;
      }, 100);
      
      // Start level meter
      this.startLevelMeter();
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  render() {
    return html`
      <div class="recorder-container">
        <div class="controls">
          <button
            class="record-button ${this.isRecording ? 'recording' : ''}"
            @click=${this.isRecording ? this.stopRecording : this.startRecording}
          >
            ${this.isRecording ? '⏹️ Stop Recording' : '🎙️ Start Recording'}
          </button>
        </div>

        <div class="status-container">
          <div class="recording-status">
            ${this.isRecording ? '🔴 Recording in progress' : 'Ready to record'}
          </div>
          
          ${this.isRecording ? html`
            <div class="recording-time">${this.formatTime(this.recordingTime)}</div>
            <div class="level-meter">
              <div class="level-bar" style="width: ${this.recordingLevel}%"></div>
            </div>
          ` : ''}
        </div>
        
        ${this.error ? html`
          <div class="error">${this.error}</div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('audio-recorder', AudioRecorder);