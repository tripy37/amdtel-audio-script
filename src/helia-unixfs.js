import {html, LitElement} from 'lit';
import { unixfs } from '@helia/unixfs'
import { createHeliaHTTP } from '@helia/http'

export class HeliaUnixfs extends LitElement {
  static get properties() {
    return {
      _helia: {type: Object},
      _msg: {type: Text}
    }
  }

  constructor() {
    super();
    this._helia = null;
    this._msg = 'Messages will appear here';
  }

  async firstUpdated() {
    const helia = await createHeliaHTTP();
    this._msg = "ipfs loaded";
    const fs = unixfs(helia);
    const encoder = new TextEncoder();

    this._helia = fs
  }

  async addFile() {
    const cid = await fs.addBytes(encoder.encode('Hello World 101'), {
      onProgress: (evt) => {
        console.info('add event', evt.type, evt.detail)
      }
     })
    console.log('Added file:', cid.toString())
  }

  render() {
    return html`
      <section>
      <button @click="${() => this.initHelia()}">Start IPFS</button>  
      <p>${this._msg}</p>
      </section>
    `;
  }
}

window.customElements.define('helia-unixfs', HeliaUnixfs);