import { LitElement, css, html } from 'lit';

export class ScriptView extends LitElement {
  static get properties() {
    return {
      dialogue: {type: Array},
      idx: {type: Number}
    }
  }

  static get styles() {
    return [
      css`
        section {
          display: flex;
          flex-direction: column;
          gap: var(--size-3);
          height: 100%;
        }

        .lines {
          flex: 1;
          overflow-y: auto;
          padding: var(--size-4);
          background: var(--surface-1);
          border-radius: var(--radius-3);
          box-shadow: var(--shadow-2);
          position: relative;
        }

        .progress-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 3px;
          background: var(--surface-4);
          transition: width 0.3s ease;
        }

        .dialogue-line {
          margin-bottom: var(--size-4);
          padding: var(--size-4);
          border-radius: var(--radius-3);
          transition: all 0.3s ease;
          position: relative;
          opacity: 0.7;
        }

        .line-number {
          position: absolute;
          left: -40px;
          top: 50%;
          transform: translateY(-50%);
          font-size: var(--font-size-0);
          color: var(--text-2);
          opacity: 0.5;
        }

        .dialogue-line.current {
          background: var(--surface-2);
          box-shadow: var(--shadow-2);
          transform: translateX(var(--size-2));
          opacity: 1;
          border-left: 3px solid var(--brand);
        }

        .dialogue-line.current .line-number {
          opacity: 1;
          color: var(--brand);
          font-weight: var(--font-weight-6);
        }

        .character-name {
          font-size: var(--font-size-2);
          font-weight: var(--font-weight-7);
          color: var(--brand);
          margin-bottom: var(--size-2);
        }

        .line-text {
          font-family: var(--font-sans);
          font-size: var(--font-size-2);
          line-height: var(--font-lineheight-3);
          color: var(--text-1);
        }

        .sd {
          color: var(--orange-6);
          font-style: italic;
          background: var(--orange-1);
          padding: var(--size-2);
          border-radius: var(--radius-1);
          margin: var(--size-2) 0;
        }

        .navigation {
          display: flex;
          justify-content: space-between;
          padding: var(--size-2);
          position: sticky;
          bottom: 0;
          background: var(--surface-1);
          border-top: 1px solid var(--surface-2);
          z-index: 1;
        }

        .progress-text {
          font-size: var(--font-size-0);
          color: var(--text-2);
          text-align: center;
          padding: var(--size-2);
        }

        button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--size-2);
          padding: var(--size-3);
          background: var(--surface-2);
          border: 1px solid var(--surface-3);
          border-radius: var(--radius-2);
          color: var(--text-1);
          font-weight: var(--font-weight-6);
          transition: all 0.2s ease;
        }

        button:not(:disabled):hover {
          background: var(--surface-3);
          transform: translateY(-1px);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .lines {
            font-size: var(--font-size-1);
          }

          .dialogue-line {
            padding: var(--size-2);
          }
        }
      `
    ];
  }

  constructor() {
    super();
    this.idx = 0;
    this.tabIndex = 0; // Make component focusable
  }

  firstUpdated() {
    this.addEventListener('focus', () => {
      const currentLine = this.shadowRoot.querySelector('.dialogue-line.current');
      if (currentLine) {
        currentLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  _handleKeydown(e) {
    switch(e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        if (this.idx > 0) {
          this.idx--;
          this._updateIndex();
        }
        break;
      case 'ArrowRight':
      case 'ArrowDown':
      case 'Space':
        if (this.idx < this.dialogue.length - 1) {
          this.idx++;
          this._updateIndex();
        }
        break;
      case 'Home':
        this.idx = 0;
        this._updateIndex();
        break;
      case 'End':
        this.idx = this.dialogue.length - 1;
        this._updateIndex();
        break;
      default:
        return;
    }
    e.preventDefault();
    
    // Scroll current line into view
    requestAnimationFrame(() => {
      const currentLine = this.shadowRoot.querySelector('.dialogue-line.current');
      if (currentLine) {
        currentLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  render(first=this.dialogue[this.idx], second=this.dialogue[this.idx + 1], third=this.dialogue[this.idx + 2]) {
    const progress = ((this.idx + 1) / this.dialogue.length) * 100;
    
    return html`
      <section @keydown="${this._handleKeydown}">
        <div 
          class="lines" 
          role="region" 
          aria-label="Script dialogue"
          tabindex="0"
          aria-live="polite"
        >
          <div class="progress-bar" style="width: ${progress}%"></div>
          <div class="dialogue-line current">
            <span class="line-number">${this.idx + 1}</span>
            <div class="character-name">${first.character}</div>
            <div class="line-text">${first.lines}</div>
          </div>
          ${this.idx + 1 < this.dialogue.length ? html`
            <div class="dialogue-line">
              <span class="line-number">${this.idx + 2}</span>
              <div class="character-name">${second.character}</div>
              <div class="line-text">${second.lines}</div>
            </div>
          ` : ''}
          ${this.idx + 2 < this.dialogue.length ? html`
            <div class="dialogue-line">
              <span class="line-number">${this.idx + 3}</span>
              <div class="character-name">${third.character}</div>
              <div class="line-text">${third.lines}</div>
            </div>
          ` : ''}
        </div>
        <div class="progress-text">
          Line ${this.idx + 1} of ${this.dialogue.length}
        </div>
        <div class="navigation">
          <button 
            @click="${() => {this.idx==0?this.idx=this.dialogue.length-1:this.idx--;this._updateIndex()}}" 
            ?disabled="${this.idx == 0}"
            aria-label="Previous line">
            ← Previous
          </button>
          <button 
            @click="${() => {this.idx==this.dialogue.length-1?this.idx=0:this.idx++;this._updateIndex()}}" 
            ?disabled="${this.idx == this.dialogue.length-1}"
            aria-label="Next line">
            Next →
          </button>
        </div>
      </section>
    `;
  }

  _updateIndex() {
    this.dispatchEvent(new CustomEvent('update-index', {
      detail: {
        idx: this.idx
      }
    }));
  }
}

window.customElements.define('script-view', ScriptView);