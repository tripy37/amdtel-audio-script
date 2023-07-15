import { LitElement, css, html } from 'lit';

import './script-chooser.js';
import './script-control.js';
import './script-view.js';
import './script-record.js';

import './helia-unixfs.js';

export class AudioScript extends LitElement {
  static get properties() {
    return {
      _title: {type: String},
      _data: {type: Object},
      _chooser: {type: Boolean},
      _act: {type: Number},
      _scene: {type: Number},
      _idx: {type: Number}
    };
  }

  static get styles() {
    return [
      css`
        :host {
          display: grid;
          grid-template-rows: 5vh 8vh 77vh 10vh;
        }
        .script {
          overflow-y: auto;
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
  }

  render() {
    return html`
      ${this._chooser ?
        html`<script-chooser @script-changed="${(e) => this._displayData(e)}"></script-chooser>
              <helia-unixfs></helia-unixfs>`
        :html`
        <button @click="${() => this._chooser = true}">${this._title} Change Script...</button>
        <script-control .script="${this._data.act}" .act="${this._act}" .scene="${this._scene}" .idx="${this._idx}" @update-script="${this._updateScript}"></script-control>
        <script-view .dialogue="${this._data.act[this._act].scene[this._scene].dialogue}" .idx="${this._idx}" @update-index="${this._updateIndex}"></script-view>
        <script-record></script-record>`
      }
    `;
  }

  _displayData(e) {
    fetch(e.detail.script)
    .then(r => r.json())
    .then(data => {this._data=data;this._title = e.detail.title;this._act=0;this._scene=0;this._idx=0;this._chooser=false})
    .catch(e => console.log("fetch error:", e));
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