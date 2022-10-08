var a = Object.freeze, p = Object.defineProperty;
var d = (s, t) => a(p(s, "raw", { value: a(t || s.slice()) }));
import { LitElement as c, html as e, css as r } from "lit";
class l extends c {
  static get properties() {
    return {
      _data: { type: Array },
      value: { type: Object }
    };
  }
  constructor() {
    super(), this._data = [], this.value = {};
  }
  render() {
    return e`
      ${this._data.length > 0 ? e`
        <section>
          ${this._data.map(
      (t) => e`<button @click="${() => {
        this._changeScript(t);
      }}">${t.title}</button>`
    )}
        </section>
        ` : e`<p>Loading...</p>`}
    `;
  }
  firstUpdated() {
    fetch("./scriptsDB.json").then((t) => t.json()).then((t) => {
      this._data = t;
    }).catch((t) => console.log("fetch error:", t));
  }
  _changeScript(t) {
    this.dispatchEvent(
      new CustomEvent("script-changed", {
        detail: t
      })
    );
  }
}
window.customElements.define("script-chooser", l);
class u extends c {
  static get properties() {
    return {
      script: { type: Array },
      act: { type: Number },
      scene: { type: Number },
      idx: { type: Number }
    };
  }
  static get styles() {
    return [
      r`
        section {
          display: grid;
          grid-template-columns: 20vw 40vw 40vw;
        }
        select {
          height: 5vh;
        }
      `
    ];
  }
  constructor() {
    super(), this.act = 0, this.scene = 0, this.idx = 0;
  }
  render() {
    return e`
        <section>
          <select .selectedIndex="${this.act}" @change="${(t) => {
      this.act = t.path[0].selectedIndex, this.scene = 0, this.idx = 0, this._updateScript();
    }}">
            ${this.script.map((t) => e`<option>${t.name}</option>`)}
          </select>
          <select .selectedIndex="${this.scene}" @change="${(t) => {
      this.scene = t.path[0].selectedIndex, this.idx = 0, this._updateScript();
    }}">
            ${this.script[this.act].scene.map((t) => e`<option>${t.title}</option>`)}
          </select>
          <select .selectedIndex="${this.idx}" @change="${(t) => {
      this.idx = t.path[0].selectedIndex, this._updateScript();
    }}">
            ${this.script[this.act].scene[this.scene].dialogue.map((t, i) => e`<option>${i}: ${t.character} ${t.lines.slice(0, 25)}...</option>`)}
          </select>
        </section>
    `;
  }
  _updateScript() {
    this.dispatchEvent(new CustomEvent("update-script", {
      detail: {
        act: this.act,
        scene: this.scene,
        idx: this.idx
      }
    }));
  }
}
window.customElements.define("script-control", u);
class g extends c {
  static get properties() {
    return {
      dialogue: { type: Array },
      idx: { type: Number }
    };
  }
  static get styles() {
    return [
      r`
        section {
          display: grid;
          grid-template-columns: 50vw 50vw;
          grid-template-rows: 60vh 20vh;
        }
        .lines {
          grid-column: 1/3;
          overflow-y: auto;
        }
        .sd {
          color: red;
        }
        #first {
          font-size: 1.5em;
        }
        #second {
          color: grey;
        }
        #third {
          color: lightgrey;
        }
      `
    ];
  }
  constructor() {
    super(), this.idx = 0;
  }
  render(t = this.dialogue[this.idx], i = this.dialogue[this.idx + 1], o = this.dialogue[this.idx + 2]) {
    return e`
        <section>
          <div class="lines">
            <p id="first" class="${t.character}"><b>${t.character}:</b> ${t.lines}</p>
            ${this.idx + 1 < this.dialogue.length ? e`<p id="second" class="${i.character}"><b>${i.character}:</b> ${i.lines}</p>` : e``}
            ${this.idx + 2 < this.dialogue.length ? e`<p id="third" class="${o.character}"><b>${o.character}:</b> ${o.lines}</p>` : e``}
          </div>
          <button @click="${() => {
      this.idx == 0 ? this.idx = this.dialogue.length - 1 : this.idx--, this._updateIndex();
    }}" ?disabled="${this.idx == 0}">Previous</button>
          <button @click="${() => {
      this.idx == this.dialogue.length - 1 ? this.idx = 0 : this.idx++, this._updateIndex();
    }}">Next</button>
        </section>
    `;
  }
  _updateIndex() {
    this.dispatchEvent(new CustomEvent("update-index", {
      detail: {
        idx: this.idx
      }
    }));
  }
}
window.customElements.define("script-view", g);
class _ extends c {
  static get properties() {
    return {
      _gotMedia: { type: Boolean },
      _stream: { type: Object },
      _counter: { type: Number },
      _media: { type: Object },
      _track: { type: String },
      recordingStatus: { type: Boolean },
      url: { type: Array }
    };
  }
  static get styles() {
    return [
      r`
        section {
          height: 10vh;
        }
      `
    ];
  }
  constructor() {
    super(), this._media = { tag: "audio", type: "audio/ogg; codecs=opus", ext: ".ogg", gUM: { audio: !0 } }, this._gotMedia = !1, this.recordingStatus = !1, this._counter = 1, this._track = "", this.url = [];
  }
  render() {
    return this._gotMedia ? e`
      <section>
        <button id="startButton" @click="${this.startRecording}" ?disabled="${this.recordingStatus}">Record</button>
        <button id="stopButton" @click="${this.stopRecording}" ?disabled="${!this.recordingStatus}">Stop</button>
        <audio controls .src="${this._track}"></audio>
        ${this.url.map((t, i) => e`<button @click="${() => this._track = t}">cue</button><button @click="${() => {
      URL.revokeObjectURL(t), this.url.splice(i, 1), this.requestUpdate();
    }}">delete</button>`)}
      </section>
    ` : e`<button @click="${this.getUserMedia}">Get Audio Mic</button>`;
  }
  getUserMedia() {
    window._chunks = [], navigator.mediaDevices.getUserMedia(this._media.gUM).then((t) => {
      this._stream = t, window.scriptAudioRecorder = new MediaRecorder(this._stream), window.scriptAudioRecorder.ondataavailable = (i) => {
        window._chunks.push(i.data), window.scriptAudioRecorder.state == "inactive" && this.makeLink();
      }, this._gotMedia = !0, console.log("got media successfully");
    }).catch(console.log("media err"));
  }
  startRecording() {
    this.recordingStatus = !0, window._chunks = [], window.scriptAudioRecorder.start();
  }
  stopRecording() {
    window.scriptAudioRecorder.stop(), this.recordingStatus = !1;
  }
  makeLink() {
    console.log("make media file");
    let t = new Blob(window._chunks, { type: this._media.type });
    this._track = URL.createObjectURL(t), this.url.push(this._track), this.requestUpdate();
  }
}
window.customElements.define("script-record", _);
var n, h;
class x extends c {
  static get properties() {
    return {
      _title: { type: String },
      _data: { type: Object },
      _chooser: { type: Boolean },
      _act: { type: Number },
      _scene: { type: Number },
      _idx: { type: Number }
    };
  }
  static get styles() {
    return [
      r`
        :host {
          display: grid;
          grid-template-rows: 5vh 5vh 80vh 10vh;
        }
        .script {
          overflow-y: auto;
        }
      `
    ];
  }
  constructor() {
    super(), this._chooser = !0, this._act = 0, this._scene = 0, this._idx = 0;
  }
  render() {
    return e`
      ${this._chooser ? e(n || (n = d(['<script-chooser @script-changed="', '"><\/script-chooser>'])), (t) => this._displayData(t)) : e(h || (h = d([`
        <button @click="`, '">', ` Change Script...</button>
        <script-control .script="`, '" .act="', '" .scene="', '" .idx="', '" @update-script="', `"><\/script-control>
        <script-view .dialogue="`, '" .idx="', '" @update-index="', `"><\/script-view>
        <script-record><\/script-record>`])), () => this._chooser = !0, this._title, this._data.act, this._act, this._scene, this._idx, this._updateScript, this._data.act[this._act].scene[this._scene].dialogue, this._idx, this._updateIndex)}
    `;
  }
  _displayData(t) {
    fetch(t.detail.script).then((i) => i.json()).then((i) => {
      this._data = i, this._title = t.detail.title, this._act = 0, this._scene = 0, this._idx = 0, this._chooser = !1;
    }).catch((i) => console.log("fetch error:", i));
  }
  _updateScript(t) {
    this._act = t.detail.act, this._scene = t.detail.scene, this._idx = t.detail.idx;
  }
  _updateIndex(t) {
    this._idx = t.detail.idx;
  }
}
window.customElements.define("audio-script", x);
export {
  x as AudioScript
};
