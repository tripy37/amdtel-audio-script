import { LitElement, css, html } from 'lit';

import './script-chooser.js';
import './script-control.js';
import './script-view.js';
import './audio-recorder-app.js';

export class AudioScript extends LitElement {
  static get properties() {
    return {
      _title: {type: String},
      _data: {type: Object},
      _chooser: {type: Boolean},
      _act: {type: Number},
      _scene: {type: Number},
      _idx: {type: Number},
      _record: {type: Boolean},
      _showControls: {type: Boolean},
      _loading: {type: Boolean},
      _error: {type: String}
    };
  }

  static get styles() {
    return [
      css`
        :host {
          display: grid;
          gap: var(--size-4);
        }
        .script {
          overflow-y: auto;
          min-height: 75vh;
          padding: var(--size-3);
          background: var(--surface-2);
          border-radius: var(--radius-2);
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
          color: var(--text-2);
          font-size: var(--font-size-4);
          background: var(--surface-1);
          border-radius: var(--radius-2);
          box-shadow: var(--shadow-1);
        }

        .loading::after {
          content: '';
          width: 1em;
          height: 1em;
          border: 2px solid var(--surface-3);
          border-top: 2px solid var(--brand);
          border-radius: 50%;
          margin-left: var(--size-3);
          animation: spin 1s linear infinite;
        }

        .error-container {
          text-align: center;
          padding: var(--size-5);
          background: var(--surface-1);
          border-radius: var(--radius-2);
          box-shadow: var(--shadow-1);
        }

        .error-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--size-3);
          padding: var(--size-3);
          background: var(--red-2);
          color: var(--red-9);
          border-radius: var(--radius-2);
          margin-bottom: var(--size-4);
        }

        .error-icon {
          font-size: var(--font-size-4);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .landing-container {
          text-align: center;
          animation: fadeIn 0.3s ease-in;
        }
        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--size-3);
          padding: var(--size-2);
          background: var(--surface-2);
          border-radius: var(--radius-2);
        }
        .menu-btn {
          padding: var(--size-2) var(--size-3);
          background: var(--surface-3);
          border: 1px solid var(--surface-4);
          border-radius: var(--radius-2);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .menu-btn.active {
          background: var(--brand-3);
          border-color: var(--brand-5);
        }
        .controls-panel {
          animation: slideDown 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `
    ];
  }

  constructor() {
    super();
    this._chooser = true;
    this._act = 0;
    this._scene = 0;
    this._idx = 0;
    this._record = false;
    this._showControls = false;
    this._loading = false;
    this._error = '';
  }

  render() {
    if (this._loading) {
      return html`
        <div class="loading" role="status" aria-live="polite">
          Loading Script...
        </div>
      `;
    }

    if (this._error) {
      return html`
        <div class="error-container">
          <div class="error-message" role="alert">
            <span class="error-icon">⚠️</span>
            <span>${this._error}</span>
          </div>
          <button @click="${() => {this._error = ''; this._chooser = true;}}" class="try-again-btn">
            Return to Script Selection
          </button>
        </div>
      `;
    }

    return html`
      ${this._chooser ?
        html`
        <div class="landing-container">
          <div class="landing-header">
            <h1>Audio Audition Scripts</h1>
            <p>Welcome to the Audio Script Recorder. Choose a script to begin your recording session.</p>
          </div>
          <script-chooser @script-changed="${this._displayData}"></script-chooser>
        </div>
        `
        :html`${!this._record ?
        html`
        <div class="top-bar">
          <!-- <button class="change-script-btn" @click="${() => this._chooser = true}">
            <span class="visually-hidden">Change current script:</span>
            ${this._title}
          </button> -->
          ${this._showControls ? html`
            <div class="controls-panel">
              <script-control 
                .script="${this._data.act}" 
                .act="${this._act}" 
                .scene="${this._scene}" 
                .idx="${this._idx}" 
                @update-script="${this._updateScript}">
              </script-control>
            </div>
          ` : ''}
          <button 
            class="menu-btn ${this._showControls ? 'active' : ''}" 
            @click="${() => this._showControls = !this._showControls}"
            aria-label="Toggle script controls"
            aria-expanded="${this._showControls}">
            ⚙️ Controls
          </button>
        </div>
        
        <div class="script">
          <script-view 
            .dialogue="${this._data.act[this._act].scene[this._scene].dialogue}" 
            .idx="${this._idx}" 
            @update-index="${this._updateIndex}">
          </script-view>
        </div>
        <button class="record-btn" @click="${() => this._record = true}">Record Lines</button>`
        :html`
        <div class="script">
          <script-view 
            .dialogue="${this._data.act[this._act].scene[this._scene].dialogue}" 
            .idx="${this._idx}" 
            @update-index="${this._updateIndex}">
          </script-view>
        </div>
        <button class="finish-btn" @click="${() => this._record = false}">Finish Recording</button>
        <audio-recorder-app></audio-recorder-app>`}`
      }
    `;
  }

  async _displayData(e) {
    this._loading = true;
    this._error = '';
    
    try {
      const response = await fetch(e.detail.script);
      if (!response.ok) {
        throw new Error(`Failed to load script (${response.status})`);
      }
      const data = await response.json();
      
      if (!data.act || !Array.isArray(data.act)) {
        throw new Error('Invalid script format');
      }

      this._data = data;
      this._title = e.detail.title;
      this._act = 0;
      this._scene = 0;
      this._idx = 0;
      this._chooser = false;
    } catch (error) {
      console.error('Script loading error:', error);
      this._error = error.message;
      this._data = null;
    } finally {
      this._loading = false;
    }
  }
  _updateScript(e) {
    this._act = e.detail.act;
    this._scene = e.detail.scene;
    this._idx = e.detail.idx;
  }
  _updateIndex(e) {
    this._idx = e.detail.idx
  }
}

window.customElements.define('audio-script', AudioScript);