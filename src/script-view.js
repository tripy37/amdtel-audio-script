import { LitElement, css, html } from 'lit';

export class ScriptView extends LitElement {
  static get properties() {
    return {
      dialogue: { type: Array },
      idx: { type: Number },
      hasRecording: { type: Boolean, state: true },
      currentRecording: { type: Object, state: true }
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        height: 100%;
      }

      .dialogue-container {
        display: flex;
        flex-direction: column;
        gap: var(--size-4);
        position: relative;
        min-height: 70vh;
        max-height: 70vh;
        overflow-y: auto;
        padding-right: var(--size-2);
      }

      .dialogue-container::-webkit-scrollbar {
        width: 8px;
      }

      .dialogue-container::-webkit-scrollbar-track {
        background: var(--surface-2);
        border-radius: var(--radius-2);
      }

      .dialogue-container::-webkit-scrollbar-thumb {
        background: var(--surface-4);
        border-radius: var(--radius-2);
      }

      .dialogue-container::-webkit-scrollbar-thumb:hover {
        background: var(--surface-5);
      }

      .dialogue-item {
        padding: var(--size-3);
        background: var(--surface-5);
        border-radius: var(--radius-2);
        transition: all 0.2s ease;
        border: 1px solid var(--surface-4);
      }

      .dialogue-item.current {
        background: var(--surface-1);
        border-left: 4px solid var(--brand);
        box-shadow: var(--shadow-3);
      }

      .character {
        font-weight: var(--font-weight-6);
        color: var(--text-1);
        margin-bottom: var(--size-2);
      }

      .dialogue-item.current .character {
        color: var(--brand);
        font-weight: var(--font-weight-7);
      }

      .lines {
        color: var(--text-1);
        line-height: 1.6;
      }

      .dialogue-item.current .lines {
        color: var(--text-2);
        font-weight: var(--font-weight-5);
      }

      .no-dialogue {
        text-align: center;
        padding: var(--size-5);
        color: var(--text-2);
        font-style: italic;
      }

      .navigation {
        display: flex;
        justify-content: space-between;
        padding: var(--size-3);
        background: var(--surface-1);
        border-radius: var(--radius-2);
        margin-top: var(--size-4);
        position: sticky;
        bottom: 0;
        z-index: 1;
      }

      .nav-button {
        padding: var(--size-2) var(--size-4);
        background: var(--surface-2);
        border: 1px solid var(--surface-3);
        border-radius: var(--radius-2);
        color: var(--text-1);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .nav-button:hover:not(:disabled) {
        background: var(--surface-3);
        transform: translateY(-1px);
      }

      .nav-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .progress-text {
        font-size: var(--font-size-1);
        color: var(--text-2);
        text-align: center;
        padding: var(--size-2);
      }

      .recording-indicator {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #16a34a;
        cursor: pointer;
      }

      .recording-indicator:hover {
        color: #15803d;
      }

      .playback-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      audio {
        width: 100%;
        margin-top: 0.5rem;
      }
    `;
  }

  constructor() {
    super();
    this.dialogue = [];
    this.idx = 0;
    this.hasRecording = false;
    this.currentRecording = null;
    this.linesPerPage = 4;
  }

  updated(changedProperties) {
    if (changedProperties.has('dialogue')) {
      console.log('Dialogue data updated:', this.dialogue);
    }
    if (changedProperties.has('idx')) {
      console.log('Current index updated:', this.idx);
      this._checkForRecording();
    }
  }

  async _checkForRecording() {
    const recorderApp = document.querySelector('audio-recorder-app');
    if (recorderApp) {
      const scriptState = document.querySelector('audio-script-app').scriptState;
      const currentLine = this.dialogue[this.idx];
      
      if (currentLine) {
        const recording = recorderApp.getRecordingForLine(
          scriptState.state.title,
          scriptState.state.act,
          scriptState.state.scene,
          this.idx
        );
        
        this.hasRecording = !!recording;
        this.currentRecording = recording;
      }
    }
  }

  _handlePlayback() {
    if (this.currentRecording) {
      const audio = new Audio(this.currentRecording.audioUrl);
      audio.play();
    }
  }

  render() {
    console.log('Rendering ScriptView with:', {
      dialogue: this.dialogue,
      idx: this.idx
    });

    if (!this.dialogue || !Array.isArray(this.dialogue) || this.dialogue.length === 0) {
      return html`
        <div class="no-dialogue">
          No dialogue available for this scene.
        </div>
      `;
    }

    // Calculate the range of lines to show
    const startIdx = Math.max(0, this.idx - 1);
    const endIdx = Math.min(this.dialogue.length, startIdx + this.linesPerPage);
    const visibleLines = this.dialogue.slice(startIdx, endIdx);

    return html`
      <div class="dialogue-container">
        ${visibleLines.map((item, index) => {
          const actualIndex = startIdx + index;
          return html`
            <div 
              class="dialogue-item ${actualIndex === this.idx ? 'current' : ''}"
              @click="${() => this._updateIndex(actualIndex)}"
            >
              <div class="character">${item.character || 'Unknown'}</div>
              <div class="lines">${item.lines || ''}</div>
              ${actualIndex === this.idx && this.hasRecording ? html`
                <div class="recording-indicator" @click=${this._handlePlayback}>
                  🔊 Play Recording
                </div>
                <div class="playback-controls">
                  <audio controls src="${this.currentRecording?.audioUrl || ''}"></audio>
                </div>
              ` : ''}
            </div>
          `;
        })}
      </div>
      <div class="navigation">
        <button 
          class="nav-button"
          @click="${() => this._updateIndex(Math.max(0, this.idx - 1))}"
          ?disabled="${this.idx === 0}"
        >
          ← Previous
        </button>
        <div class="progress-text">
          Line ${this.idx + 1} of ${this.dialogue.length}
        </div>
        <button 
          class="nav-button"
          @click="${() => this._updateIndex(Math.min(this.dialogue.length - 1, this.idx + 1))}"
          ?disabled="${this.idx === this.dialogue.length - 1}"
        >
          Next →
        </button>
      </div>
    `;
  }

  _updateIndex(index) {
    console.log('Updating index to:', index);
    this.dispatchEvent(new CustomEvent('update-index', {
      detail: { idx: index }
    }));
  }
}

window.customElements.define('script-view', ScriptView);