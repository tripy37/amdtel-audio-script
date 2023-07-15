import {html, LitElement} from 'lit';
import { unixfs } from '@helia/unixfs'
import { createHelia } from 'helia'

export class HeliaUnixfs extends LitElement {
  static get properties() {
    return {
      _helia: {state: true},
    }
  }

  constructor() {
    super();

    this._helia = null;
  }

  connectedCallback() {
    super.connectedCallback()

    this.initHelia();
  }

  async initHelia() {
    const helia = await createHelia();
    const fs = unixfs(helia);
    const encoder = new TextEncoder();

    this._helia = helia

    const cid = await fs.addBytes(encoder.encode('Hello World 101'), {
        onProgress: (evt) => {
          console.info('add event', evt.type, evt.detail)
        }
      })
      

    console.log('Added file:', cid.toString())
  }

  render() {
    if (!this._helia) {
      return html`Loading...`;
    }

    return html`
      <section>
        <p>data here</p>
      </section>
    `;
  }
}

customElements.define('helia-unixfs', HeliaUnixfs);