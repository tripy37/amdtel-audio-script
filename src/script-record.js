import { LitElement, css, html } from 'lit';

export class ScriptRecord extends LitElement {
  static get properties() {
    return {
      _gotMedia: {type: Boolean},
      _stream: {type: Object},
      _counter: {type: Number},
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
          height: 10vh;
        }
      `
    ];
  }

  constructor() {
    super();
    this._media = { tag: 'audio', type: 'audio/ogg; codecs=opus', ext: '.ogg', gUM: {audio: true}};
    this._gotMedia = false;
    this.recordingStatus = false;
    this._counter = 1;
    this._track = '';
    this.url = [];
  }

  render() {
    if(!this._gotMedia) {return html`<button @click="${this.getUserMedia}">Get Audio Mic</button>`}
    else {
      return html`
      <section>
        <button id="startButton" @click="${this.startRecording}" ?disabled="${this.recordingStatus}">Record</button>
        <button id="stopButton" @click="${this.stopRecording}" ?disabled="${!this.recordingStatus}">Stop</button>
        <audio controls .src="${this._track}"></audio>
        ${this.url.map((item, idx) => html`<button @click="${()=>this._track = item}">cue</button><button @click="${()=>{URL.revokeObjectURL(item);this.url.splice(idx, 1); this.requestUpdate()}}">delete</button>`)}
      </section>
    `
    }
  }

  getUserMedia() {
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