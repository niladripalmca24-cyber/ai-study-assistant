# AI Study Assistant (React)

A premium client-side React application built with UMD libraries and Babel Standalone.

## Prerequisites

To use the AI features of the Study Assistant, you need an **Anthropic Claude API Key**:
1. Copy `.env.example` to a new file named `.env` in this directory:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and replace `your_anthropic_api_key_here` with your actual API key.

Alternatively, you can set the `ANTHROPIC_API_KEY` environment variable in your system.

## Project Structure

- `index.html`: Entry point loading CDN scripts, Google Font (Outfit), and custom UI wrapper.
- `app.jsx`: React component logic adapted from original desktop JSX.
- `server.py`: Lightweight Python server that serves static assets and proxies API requests to bypass CORS.
- `.env.example`: Template for environment variable configurations.
- `.vscode/`: VS Code workflow configuration.
  - `launch.json`: Custom debug configurations for Chrome and Edge.
  - `tasks.json`: Background task to spin up Python local proxy server.

## Getting Started in VS Code

1. Open the project folder in VS Code.
2. Make sure you have created the `.env` file as described in the **Prerequisites** section.
3. Press `F5` or navigate to the **Run and Debug** view (`Ctrl+Shift+D`).
4. Select **Launch Chrome (Local Server)** or **Launch Edge (Local Server)**.
5. Click the green play button.
   - VS Code will automatically start the Python proxy server (`server.py`) in the integrated terminal.
   - A browser window will open at `http://127.0.0.1:8000`.

## Alternative Manual Run

If you want to run the server manually, open a terminal in this directory and execute:
```bash
python server.py
```
Then navigate to `http://127.0.0.1:8000` in any web browser.

