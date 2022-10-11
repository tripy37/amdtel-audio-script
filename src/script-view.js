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
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 70vh 5vh;
        }
        .lines {
          font-size: var(--font-size-fluid-0);
          font-family: var(--font-mono);
          text-align: justify;
          letter-spacing: var(--font-letterspacing-3);
          grid-column: 1/3;
        }
        .sd {
          color: var(--orange-3);
        }
        #first {
        }
        #second {
        }
        #third {
        }
      `
    ];
  }

  constructor() {
    super();
    this.idx = 0;
  }

  render(first=this.dialogue[this.idx], second=this.dialogue[this.idx + 1], third=this.dialogue[this.idx + 2]) {
    return html`
        <section>
          <div class="lines">
            <p id="first" class="${first.character}"><b>${first.character}:</b><br> ${first.lines}</p>
            ${this.idx + 1 < this.dialogue.length ? html`<p id="second" class="${second.character}"><b>${second.character}:</b><br> ${second.lines}</p>` : html``}
            ${this.idx + 2 < this.dialogue.length ? html`<p id="third" class="${third.character}"><b>${third.character}:</b><br> ${third.lines}</p>` : html``}
          </div>
          <button @click="${() => {this.idx==0?this.idx=this.dialogue.length-1:this.idx--;this._updateIndex()}}" ?disabled="${this.idx == 0}">Previous</button>
          <button @click="${() => {this.idx==this.dialogue.length-1?this.idx=0:this.idx++;this._updateIndex()}}">Next</button>
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