#!/usr/bin/env python3
"""Serve the Solana Desk Dashboard locally (static files + CORS-friendly).

Usage:
  python3 server.py          # http://127.0.0.1:8765
  python3 server.py 8080     # custom port

GitHub Pages: push this repo and enable Pages on / (root) — no server needed.
"""
from __future__ import annotations

import functools
import http.server
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # Help local bot writers / browser refresh see fresh activity.json
        if self.path.startswith("/data/") or self.path.endswith(".json"):
            self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


def main() -> None:
    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Solana Desk → http://127.0.0.1:{PORT}")
        print(f"Serving {ROOT}")
        print("Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
