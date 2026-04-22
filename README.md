# Server Path Converter

A lightweight Tauri desktop app converts and open network file paths between Windows and macOS. Build with AI.

## What it does

- **Converts Formats:** Translates Windows UNC paths (`\\Server\Folder`) to macOS SMB paths (`/Volume/Server/Folder`), and vice versa.
- **Auto copy/paste:** Automatically reads the copied path from your clipboard and copies the converted result back.

## Download

Download latest macOS (`.dmg`) or Windows (`.exe`) installer from the [Releases page](https://github.com/Oyzariah/win-mac-server-path-converter/releases/latest).

## Development

To build the app, install Node.js and Rust, run:

```bash
npm install
npx tauri build
```
