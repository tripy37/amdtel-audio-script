import { LitElement, css, html } from 'lit';

export class ScriptChooser extends LitElement {
  static get properties() {
    return {
      _data: { type: Array },
      value: { type: Object },
    };
  }

  constructor() {
    super();
    this._data = [];
    this.value = {};
  }

  render() {
    return html`
      ${
        this._data.length > 0
          ? html`
        <section>
          ${this._data.map(
            (item) =>
              html`<button @click="${() => {
                this._changeScript(item);
              }}">${item.title}</button>`
          )}
        </section>
        `
          : html`<p>Loading...</p>`
      }
    `;
  }

  firstUpdated() {
    fetch('./scriptsDB.json')
      .then((r) => r.json())
      .then((data) => {
        this._data = data;
      })
      .catch((e) => console.log('fetch error:', e));
  }

  _changeScript(item) {
    this.dispatchEvent(
      new CustomEvent('script-changed', {
        detail: item,
      })
    );
  }
}

window.customElements.define('script-chooser', ScriptChooser);
