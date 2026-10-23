"""
TradeFox Dev Server
Serves static frontend files and seamlessly reverse-proxies `/api/*`
to the Spring Boot backend at http://localhost:8080/api/*
"""

import sys
import os
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BACKEND_TARGET = 'http://localhost:8080'
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5500

class TradeFoxHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for all frontend static requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.proxy_request('GET')
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self.proxy_request('POST')
        else:
            self.send_error(405, 'Method Not Allowed')

    def do_PUT(self):
        if self.path.startswith('/api/'):
            self.proxy_request('PUT')
        else:
            self.send_error(405, 'Method Not Allowed')

    def do_DELETE(self):
        if self.path.startswith('/api/'):
            self.proxy_request('DELETE')
        else:
            self.send_error(405, 'Method Not Allowed')

    def proxy_request(self, method):
        target_url = BACKEND_TARGET + self.path
        body = None
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            body = self.rfile.read(content_length)

        # Forward relevant headers to backend
        headers = {}
        for key, val in self.headers.items():
            if key.lower() not in ('host', 'content-length', 'connection'):
                headers[key] = val
        if 'Content-Type' not in headers and method in ('POST', 'PUT'):
            headers['Content-Type'] = 'application/json'
        if 'Accept' not in headers:
            headers['Accept'] = 'application/json'

        req = urllib.request.Request(target_url, data=body, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                resp_body = response.read()
                self.send_response(response.status)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
                self.send_header('Content-Length', str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as err:
            err_body = err.read()
            self.send_response(err.code)
            self.send_header('Content-Type', err.headers.get('Content-Type', 'application/json'))
            self.send_header('Content-Length', str(len(err_body)))
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as ex:
            msg = f'{{"error": "Backend connection failed", "detail": "{str(ex)}"}}\n'.encode('utf-8')
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)

if __name__ == '__main__':
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    server = ThreadingHTTPServer(('0.0.0.0', PORT), TradeFoxHandler)
    print(f'TradeFox Server running at http://localhost:{PORT} (Proxying /api -> {BACKEND_TARGET}/api)')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
