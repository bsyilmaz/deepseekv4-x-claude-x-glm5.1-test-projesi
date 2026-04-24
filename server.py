#!/usr/bin/env python3
"""Static file server + NVIDIA NIM API proxy for Study Buddy simulation.

Neden gerekli: tarayıcılar doğrudan integrate.api.nvidia.com adresine
istek atamaz (CORS). Bu script hem index.html'i sunar hem de
POST /api/chat üzerinden NVIDIA'ya proxy yapar.

Kullanım:
  python3 server.py         # default port 8000
  python3 server.py 8080    # custom port
"""
import http.server
import socketserver
import urllib.request
import urllib.error
import json
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/chat":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        auth = self.headers.get("Authorization", "")

        req = urllib.request.Request(
            NVIDIA_URL,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": auth,
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read()
                self.send_response(resp.status)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    def log_message(self, fmt, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {fmt % args}\n")


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"✓ Study Buddy sunucu http://localhost:{PORT}")
        print(f"  Proxy: POST /api/chat → {NVIDIA_URL}")
        print(f"  Durdur: Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n✓ Sunucu durduruldu.")
