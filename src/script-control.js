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
        :host {
          display: block;
          background: var(--surface-1);
          padding: var(--size-3);
          border-radius: var(--radius-2);
          box-shadow: var(--shadow-1);
        }

        .controls-container {
          display: flex;
          flex-direction: column;
          gap: var(--size-4);
          padding: var(--size-2);
        }

        .selects-group {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--size-4);
          background: var(--surface-2);
          padding: var(--size-3);
          border-radius: var(--radius-2);
        }

        .select-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--size-2);
        }

        label {
          font-size: var(--font-size-1);
          font-weight: var(--font-weight-6);
          color: var(--text-2);
        }

        select {
          width: 100%;
          padding: var(--size-2);
          background: var(--surface-1);
          border: 1px solid var(--surface-3);
          border-radius: var(--radius-2);
          color: var(--text-1);
          font-size: var(--font-size-1);
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 32px;
        }

        select:hover {
          border-color: var(--brand);
        }

        select:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 2px var(--brand-3);
        }



        @media (max-width: 768px) {
          .selects-group {
            grid-template-columns: 1fr;
          }

          select {
            font-size: var(--font-size-1);
            padding: var(--size-3);
          }
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
      <div class="controls-container" role="group" aria-label="Script navigation controls">
        <div class="selects-group">
          <div class="select-wrapper">
            <label for="act-select">Act</label>
            <select 
              id="act-select"
              .selectedIndex="${this.act}" 
              @change="${(e) => {this.act = e.currentTarget.selectedIndex;this.scene=0;this.idx=0;this._updateScript()}}"
              aria-label="Select Act">
              ${this.script.map((act) => html`<option>${act.name}</option>`)}
            </select>
          </div>

          <div class="select-wrapper">
            <label for="scene-select">Scene</label>
            <select 
              id="scene-select"
              .selectedIndex="${this.scene}" 
              @change="${(e) => {this.scene = e.currentTarget.selectedIndex;this.idx=0;this._updateScript()}}"
              aria-label="Select Scene">
              ${this.script[this.act].scene.map((scene) => html`<option>${scene.title}</option>`)}
            </select>
          </div>

          <div class="select-wrapper">
            <label for="line-select">Line</label>
            <select 
              id="line-select"
              .selectedIndex="${this.idx}" 
              @change="${(e) => {this.idx = e.currentTarget.selectedIndex;this._updateScript()}}"
              aria-label="Select Line">
              ${this.script[this.act].scene[this.scene].dialogue.map((line, idx) => html`
                <option>${idx + 1}: ${line.character} - ${line.lines.slice(0,25)}${line.lines.length > 25 ? '...' : ''}</option>
              `)}
            </select>
          </div>
        </div>
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