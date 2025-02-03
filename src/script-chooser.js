import { LitElement, css, html } from 'lit';

export class ScriptChooser extends LitElement {
  static get properties() {
    return {
      _data: { type: Array },
      value: { type: Object },
      _loading: { type: Boolean },
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        padding: var(--size-3);
      }

      .scripts-grid {
        display: grid;
        gap: var(--size-3);
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        margin-top: var(--size-4);
      }

      .script-button {
        position: relative;
        overflow: hidden;
        width: 100%;
        padding: 0;
        background: var(--surface-1);
        border: 1px solid var(--surface-3);
        border-radius: var(--radius-3);
        transition: all 0.3s ease;
        cursor: pointer;
      }

      .script-content {
        display: grid;
        gap: var(--size-2);
        padding: var(--size-5);
        text-align: left;
      }

      .script-title {
        font-size: var(--font-size-3);
        font-weight: var(--font-weight-6);
        color: var(--text-1);
        margin-bottom: var(--size-2);
      }

      .script-info {
        display: flex;
        gap: var(--size-3);
        font-size: var(--font-size-1);
        color: var(--text-2);
      }

      .script-icon {
        position: absolute;
        top: var(--size-3);
        right: var(--size-3);
        font-size: var(--font-size-4);
        opacity: 0.5;
        transition: all 0.3s ease;
      }

      .script-button:hover {
        background: var(--surface-2);
        transform: translateY(-2px);
        box-shadow: var(--shadow-3);
        border-color: var(--brand-5);
      }

      .script-button:hover .script-icon {
        transform: rotate(10deg);
        opacity: 1;
      }

      .no-scripts {
        text-align: center;
        color: var(--text-2);
        padding: var(--size-5);
        background: var(--surface-2);
        border-radius: var(--radius-2);
        font-style: italic;
      }

      .script-button:active {
        transform: translateY(0);
      }

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 200px;
        color: var(--text-2);
        font-size: var(--font-size-4);
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

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @media (max-width: 768px) {
        .scripts-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
  }

  constructor() {
    super();
    this._data = [];
    this.value = {};
    this._loading = true;
  }

  render() {
    return html`
      ${this._loading
        ? html`<div class="loading" role="status" aria-live="polite">
            Loading Scripts
          </div>`
        : this._data.length > 0
        ? html`
            <section class="scripts-grid">
              ${this._data.map(
                (item) => html`
                  ${this._renderScriptButton(item)}
                `
              )}
            </section>
          `
        : html`<p class="no-scripts">No scripts available. Please check back later.</p>`}
    `;
  }

  _renderScriptButton(item) {
    if (!item || !item.title) {
      console.error('Invalid script item:', item);
      return '';
    }

    return html`
      <button
        class="script-button"
        @click="${() => this._changeScript(item)}"
        aria-label="Select script: ${item.title}"
      >
        <div class="script-content">
          <span class="script-title">${item.title}</span>
          <div class="script-info">
            <span class="script-author">
              By ${item.Author}
            </span>
          </div>
          <div class="script-icon">📜</div>
        </div>
      </button>
    `;
  }

  firstUpdated() {
    fetch('./scriptsDB.json')
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format: expected an array');
        }
        this._data = data;
        this._loading = false;
      })
      .catch((e) => {
        console.error('Failed to load scripts:', e);
        this._loading = false;
        this._data = [];
      });
  }

  async _changeScript(item) {
    try {
      const response = await fetch(item.script);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const scriptData = await response.json();
      
      this.dispatchEvent(
        new CustomEvent('script-changed', {
          detail: {
            title: item.title,
            script: item.script,
            ...scriptData
          }
        })
      );
    } catch (error) {
      console.error('Error loading script:', error);
      // Show error in UI
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: {
            message: `Failed to load script: ${error.message}`
          }
        })
      );
    }
  }
}

window.customElements.define('script-chooser', ScriptChooser);
