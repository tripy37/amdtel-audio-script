import { LitElement } from 'lit';

export class ScriptState {
  constructor() {
    // Initialize state
    this._state = {
      // Script data
      title: '',
      data: null,
      loading: false,
      error: '',

      // Navigation state
      act: 0,
      scene: 0,
      idx: 0,

      // UI state
      showChooser: true,
      showControls: false,
      isRecording: false,
    };

    // Create a custom event target for state updates
    this._eventTarget = new EventTarget();
  }

  // Getter for state
  get state() {
    return this._state;
  }

  // Subscribe to state changes
  subscribe(callback) {
    const handler = (e) => callback(e.detail);
    this._eventTarget.addEventListener('state-change', handler);
    return () => this._eventTarget.removeEventListener('state-change', handler);
  }

  // Notify subscribers of state changes
  _notifyStateChange() {
    console.log('State changed:', this._state);
    this._eventTarget.dispatchEvent(new CustomEvent('state-change', {
      detail: this._state
    }));
  }

  // Actions
  setScript(title, data) {
    console.log('Setting script:', { title, data });
    this._state.title = title;
    this._state.data = data;
    this._state.showChooser = false;
    this._state.act = 0;
    this._state.scene = 0;
    this._state.idx = 0;
    this._state.showControls = true;
    this._notifyStateChange();
  }

  setLoading(loading) {
    console.log('Setting loading:', loading);
    this._state.loading = loading;
    this._notifyStateChange();
  }

  setError(error) {
    console.log('Setting error:', error);
    this._state.error = error;
    this._notifyStateChange();
  }

  updateNavigation(act, scene, idx) {
    console.log('Updating navigation:', { act, scene, idx });
    this._state.act = act;
    this._state.scene = scene;
    this._state.idx = idx;
    this._notifyStateChange();
  }

  toggleControls() {
    console.log('Toggling controls');
    this._state.showControls = !this._state.showControls;
    this._notifyStateChange();
  }

  toggleRecording() {
    console.log('Toggling recording');
    this._state.isRecording = !this._state.isRecording;
    this._notifyStateChange();
  }

  reset() {
    console.log('Resetting state');
    this._state = {
      ...this._state,
      showChooser: true,
      data: null,
      title: '',
      error: ''
    };
    this._notifyStateChange();
  }
}

// Create a singleton instance that can be used across components
let scriptStateInstance = null;

export function getScriptState() {
  if (!scriptStateInstance) {
    scriptStateInstance = new ScriptState();
  }
  return scriptStateInstance;
} 