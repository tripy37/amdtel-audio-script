import { LitElement, css, html } from 'lit';

export class ScriptRecord extends LitElement {
  static get properties() {
    return {
      _gotMedia: {type: Boolean},
      _stream: {type: Object},
      _media: {type: Object},
      _track: {type: String},
      recordingStatus: {type: Boolean},
      url: {type: Array}
    }
  }

  static get styles() {
    return [
      css`
        section {
          display: grid;
          grid-template-columns: 3fr 1fr;
          grid-row-gap: 5px;
        }
      `
    ];
  }

  constructor() {
    super();
    this._media = { tag: 'audio', type: 'audio/ogg; codecs=opus', ext: '.ogg', gUM: {audio: true}};
    this._gotMedia = false;
    this.recordingStatus = false;
    this._track = '';
    this.url = [];
  }

  render() {
    if(!this._gotMedia) {return html`<p>Geting Audio Mic...</p>`}
    else {
      return html`
        <button id="startButton" @click="${this.startRecording}" ?disabled="${this.recordingStatus}">Record</button>
        <button id="stopButton" @click="${this.stopRecording}" ?disabled="${!this.recordingStatus}">Stop</button>
      <section>
        ${this.url.map((item, idx) => 
          html`<audio controls .src="${item}"></audio>
          <button @click="${()=>{URL.revokeObjectURL(item);this.url.splice(idx, 1); this.requestUpdate()}}">delete</button>`)}
      </section>
    `
    }
  }

  firstUpdated() {
    window._chunks = [];
    navigator.mediaDevices.getUserMedia(this._media.gUM).then(_stream => {
      this._stream = _stream;
      window.scriptAudioRecorder = new MediaRecorder(this._stream);
      window.scriptAudioRecorder.ondataavailable = e => {
        window._chunks.push(e.data);
        if(window.scriptAudioRecorder.state == 'inactive')  this.makeLink();
      };
      this._gotMedia = true;
      console.log('got media successfully');

    }).catch(console.log('media err'));
  }

  startRecording() {
    this.recordingStatus = true;
    window._chunks = [];
    window.scriptAudioRecorder.start()
  }

  stopRecording() {
    window.scriptAudioRecorder.stop()
    this.recordingStatus = false;
  }

  makeLink(){
    console.log('make media file')
    let blob = new Blob(window._chunks, {type: this._media.type});
    this._track = URL.createObjectURL(blob)
    this.url.push(this._track);
    this.requestUpdate();
  }
}

window.customElements.define('script-record', ScriptRecord);