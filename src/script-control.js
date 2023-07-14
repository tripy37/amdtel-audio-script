import { LitElement, css, html } from 'lit';

export class ScriptControl extends LitElement {
  static get properties() {
    return {
      script: {type: Array},
      act: {type: Number},
      scene: {type: Number},
      idx: {type: Number}
    }
  }

  static get styles() {
    return [
      css`
        section {
          display: grid;
          grid-template-columns: 1fr 2fr 2fr;
        }
        .scenebutton {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        select {
          height: 5vh;
        }
      `
    ];
  }


  constructor() {
    super();
    this.act = 0;
    this.scene = 0;
    this.idx =0;
  }

  render() {
    return html`
        <section>
          <select .selectedIndex="${this.act}" @change="${(e) => {this.act = e.currentTarget.selectedIndex;this.scene=0;this.idx=0;this._updateScript()}}">
            ${this.script.map((act) => html`<option>${act.name}</option>`)}
          </select>
          <select .selectedIndex="${this.scene}" @change="${(e) => {this.scene = e.currentTarget.selectedIndex;this.idx=0;this._updateScript()}}">
            ${this.script[this.act].scene.map((scene) => html`<option>${scene.title}</option>`)}
          </select>
          <select .selectedIndex="${this.idx}" @change="${(e) => {this.idx = e.currentTarget.selectedIndex;this._updateScript()}}">
            ${this.script[this.act].scene[this.scene].dialogue.map((line, idx) => html`<option>${idx}: ${line.character} ${line.lines.slice(0,25)}...</option>`)}
          </select>
        </section>
        <div class="scenebutton">
          <button @click="${() => {this.scene==0?this.scene=this.script[this.act].scene.length-1:this.scene--;this.idx=0;this._updateScript()}}" ?disabled="${this.scene == 0}">Previous Scene</button>
          <button @click="${() => {this.scene==this.script[this.act].scene.length-1?this.scene=0:this.scene++;this.idx=0;this._updateScript()}}">Next Scene</button>
        </div>
    `;
  }

  _updateScript() {
    this.dispatchEvent(new CustomEvent('update-script', {
      detail: {
        act: this.act,
        scene: this.scene,
        idx: this.idx
      }
    }));
  }
}

window.customElements.define('script-control', ScriptControl);