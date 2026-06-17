import os
import json
import urllib.request
import urllib.error
import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Register .jsx mimetype to serve JSX files correctly as javascript
mimetypes.add_type("application/javascript", ".jsx")
mimetypes.add_type("text/javascript", ".jsx")

PORT = 8000

class ProxyHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/api/messages":
            # Load API key
            api_key = os.environ.get("ANTHROPIC_API_KEY", "")
            if not api_key:
                if os.path.exists(".env"):
                    try:
                        with open(".env", "r", encoding="utf-8") as f:
                            for line in f:
                                if line.strip().startswith("ANTHROPIC_API_KEY="):
                                    api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                                    break
                    except Exception as e:
                        print(f"Error reading .env: {e}")
            
            if not api_key:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                # Enable CORS just in case for error responses
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": {
                        "type": "authentication_error",
                        "message": "ANTHROPIC_API_KEY is not set. Please create a `.env` file in the project folder with ANTHROPIC_API_KEY=your_key or set the environment variable."
                    }
                }).encode("utf-8"))
                return

            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            
            # Detect OpenRouter keys and configure request accordingly
            is_openrouter = api_key.startswith("sk-or-v1-")
            target_url = "https://openrouter.ai/api/v1/messages" if is_openrouter else "https://api.anthropic.com/v1/messages"
            
            # Map model name if running via OpenRouter
            if is_openrouter:
                try:
                    data = json.loads(body.decode("utf-8"))
                    if data.get("model") == "claude-sonnet-4-6":
                        data["model"] = "anthropic/claude-sonnet-4.6"
                    body = json.dumps(data).encode("utf-8")
                except Exception as e:
                    print(f"Error mapping model for OpenRouter: {e}")

            req_headers = {
                "content-type": "application/json",
                "accept-encoding": "identity"  # Avoid compression for easier streaming
            }
            if is_openrouter:
                req_headers["Authorization"] = f"Bearer {api_key}"
                req_headers["HTTP-Referer"] = "http://127.0.0.1:8000"
                req_headers["X-Title"] = "AI Study Assistant"
            else:
                req_headers["x-api-key"] = api_key
                req_headers["anthropic-version"] = "2023-06-01"

            # Forward the request to the API
            req = urllib.request.Request(
                target_url,
                data=body,
                headers=req_headers,
                method="POST"
            )
            
            try:
                with urllib.request.urlopen(req) as response:
                    self.send_response(response.status)
                    # Copy response headers from Anthropic, filtering headers python handles
                    for header, val in response.getheaders():
                        if header.lower() not in ["content-encoding", "transfer-encoding", "connection"]:
                            self.send_header(header, val)
                    self.end_headers()
                    
                    # Stream the response back
                    while True:
                        chunk = response.read(1024)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        self.wfile.flush()
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                for header, val in e.headers.items():
                    if header.lower() not in ["content-encoding", "transfer-encoding", "connection"]:
                        self.send_header(header, val)
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": {
                        "type": "api_error",
                        "message": str(e)
                    }
                }).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def do_OPTIONS(self):
        # Support preflight check if needed
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

def run():
    # Make sure we serve files from the directory of server.py
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"Starting server on http://127.0.0.1:{PORT} ...")
    server = ThreadingHTTPServer(("127.0.0.1", PORT), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.server_close()

if __name__ == "__main__":
    run()
