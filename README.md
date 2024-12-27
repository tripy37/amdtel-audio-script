# Audio Audition Scripts

A modern web application for managing, viewing, and recording audio scripts. Built with Lit elements and featuring IPFS integration for decentralized storage.

## Features

- **Script Selection**: Choose from multiple available scripts
- **Script Navigation**: 
  - Navigate through acts and scenes
  - View dialogue with previous/next controls
  - Track current position in script
- **Recording Capabilities**:
  - Record audio lines directly in the browser
  - Save recordings in OGG format
  - Playback recorded audio
  - Delete unwanted recordings
- **IPFS Integration**:
  - Store recordings on IPFS using Helia
  - Decentralized file storage support
  - Progress tracking for file uploads

## Technologies Used

- [Lit](https://lit.dev/) - For building fast, lightweight web components
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) - For audio recording functionality
- [Helia](https://github.com/ipfs/helia) - For IPFS integration
- Modern JavaScript (ES6+)
- CSS Grid for responsive layouts

## Project Structure

```
src/
├── audio-script.js     # Main application component
├── script-chooser.js   # Script selection component
├── script-control.js   # Navigation controls component
├── script-view.js      # Script display component
├── script-record.js    # Audio recording component
└── helia-unixfs.js     # IPFS integration component
```

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Start the development server:
```bash
npm run dev
```

## Usage

1. **Select a Script**: 
   - Launch the application
   - Choose from available scripts in the script chooser

2. **Navigate the Script**:
   - Use the dropdown menus to select acts and scenes
   - Navigate between lines using Previous/Next buttons
   - View current and upcoming lines in the script view

3. **Record Audio**:
   - Click "Record Lines" to enter recording mode
   - Use the Record/Stop buttons to capture audio
   - Play back recordings using the audio controls
   - Delete unwanted recordings
   - Optionally save recordings to IPFS

## IPFS Integration

The application includes IPFS integration through Helia for decentralized storage:
- Automatic IPFS node initialization
- File storage on the IPFS network
- Progress tracking for file uploads
- Retrieval of stored files using CIDs

## Browser Support

Requires a modern browser with support for:
- Web Components
- MediaRecorder API
- ES6+ JavaScript features

## License

[MIT License](LICENSE)