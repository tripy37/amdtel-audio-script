import { LitElement, css, html } from 'lit';

import './script-chooser.js';
import './script-control.js';
import './script-view.js';
import './audio-recorder-app.js';
import { getScriptState } from './store/script-store.js';

export class AudioScriptApp extends LitElement {
  static get properties() {
    return {
      _title: { type: String },
      _data: { type: Object },
      _chooser: { type: Boolean },
      _act: { type: Number },
      _scene: { type: Number },
      _idx: { type: Number },
      _record: { type: Boolean },
      _showControls: { type: Boolean },
      _loading: { type: Boolean },
      _error: { type: String }
    };
  }

  static get styles() {
    return [
      css`
        :host {
          display: grid;
          gap: var(--size-4);
          height: 100vh;
          grid-template-rows: auto 1fr auto;
        }

        .script {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: var(--surface-2);
          border-radius: var(--radius-2);
          height: 100%;
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

        .record-btn, .finish-btn {
          padding: var(--size-3) var(--size-4);
          background: var(--brand);
          color: white;
          border: none;
          border-radius: var(--radius-2);
          font-weight: var(--font-weight-6);
          cursor: pointer;
          transition: all 0.2s ease;
          margin: var(--size-3);
        }

        .record-btn:hover, .finish-btn:hover {
          background: var(--brand-4);
          transform: translateY(-1px);
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
    // Initialize state controller
    this.scriptState = getScriptState();
    
    // Initialize state from the store
    this._title = this.scriptState.state.title;
    this._data = this.scriptState.state.data;
    this._chooser = this.scriptState.state.showChooser;
    this._act = this.scriptState.state.act;
    this._scene = this.scriptState.state.scene;
    this._idx = this.scriptState.state.idx;
    this._record = this.scriptState.state.isRecording;
    this._showControls = this.scriptState.state.showControls;
    this._loading = this.scriptState.state.loading;
    this._error = this.scriptState.state.error;

    // Subscribe to state changes
    this._unsubscribe = this.scriptState.subscribe((state) => {
      console.log('State updated:', state);
      this._title = state.title;
      this._data = state.data;
      this._chooser = state.showChooser;
      this._act = state.act;
      this._scene = state.scene;
      this._idx = state.idx;
      this._record = state.isRecording;
      this._showControls = state.showControls;
      this._loading = state.loading;
      this._error = state.error;
      this.requestUpdate();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up subscription when component is removed
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  render() {
    console.log('Rendering AudioScriptApp with:', {
      data: this._data,
      act: this._act,
      scene: this._scene,
      idx: this._idx,
      showControls: this._showControls
    });

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
          <button @click="${() => this.scriptState.reset()}" class="try-again-btn">
            Return to Script Selection
          </button>
        </div>
      `;
    }

    const currentAct = this._data?.act?.[this._act];
    const currentScene = currentAct?.scene?.[this._scene];
    const currentDialogue = currentScene?.dialogue || [];

    console.log('Current data:', {
      act: currentAct,
      scene: currentScene,
      dialogue: currentDialogue
    });

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
          ${this._showControls ? html`
            <div class="controls-panel">
              <script-control 
                .script="${this._data?.act || []}" 
                .act="${this._act}" 
                .scene="${this._scene}" 
                .idx="${this._idx}" 
                @update-script="${this._updateScript}">
              </script-control>
            </div>
          ` : ''}
          <button 
            class="menu-btn ${this._showControls ? 'active' : ''}" 
            @click="${() => this.scriptState.toggleControls()}"
            aria-label="Toggle script controls"
            aria-expanded="${this._showControls}">
            ⚙️ Controls
          </button>
        </div>
        
        <div class="script">
          <script-view 
            .dialogue="${currentDialogue}" 
            .idx="${this._idx}" 
            @update-index="${this._updateIndex}">
          </script-view>
          <button class="record-btn" @click="${() => this.scriptState.toggleRecording()}">Record Lines</button>
        </div>`
        :html`
        <div class="script">
          <script-view 
            .dialogue="${currentDialogue}" 
            .idx="${this._idx}" 
            @update-index="${this._updateIndex}">
          </script-view>
          <button class="finish-btn" @click="${() => this.scriptState.toggleRecording()}">Finish Recording</button>
          <audio-recorder-app></audio-recorder-app>
        </div>`}`
      }
    `;
  }

  async _displayData(e) {
    console.log('Displaying data:', e.detail);
    this.scriptState.setLoading(true);
    this.scriptState.setError('');
    
    try {
      if (!e.detail.data || !e.detail.data.act || !Array.isArray(e.detail.data.act)) {
        throw new Error('Invalid script format');
      }

      // Log the structure of the first act and scene for debugging
      if (e.detail.data.act[0] && e.detail.data.act[0].scene) {
        console.log('First act structure:', {
          name: e.detail.data.act[0].name,
          sceneCount: e.detail.data.act[0].scene.length,
          firstScene: e.detail.data.act[0].scene[0]
        });
      }

      this.scriptState.setScript(e.detail.title, e.detail.data);
    } catch (error) {
      console.error('Script loading error:', error);
      this.scriptState.setError(error.message);
    } finally {
      this.scriptState.setLoading(false);
    }
  }

  _updateScript(e) {
    console.log('Updating script:', e.detail);
    this.scriptState.updateNavigation(e.detail.act, e.detail.scene, e.detail.idx);
  }

  _updateIndex(e) {
    console.log('Updating index:', e.detail);
    this.scriptState.updateNavigation(this._act, this._scene, e.detail.idx);
  }
}

window.customElements.define('audio-script-app', AudioScriptApp);