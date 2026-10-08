#!/usr/bin/env python3
"""Static file server for the browser compatibility harness.

Behaves like http.server for GET, but also answers every POST with a
generic, shape-correct ubus JSON-RPC reply (one reply per batched
message, ids preserved). The in-page harness stubs request.post itself
for fine-grained answers; this server is the safety net for startup
RPCs that fire before that stub is installed, so no request ever ends
in a 501 / "No related RPC reply" console error.

usage: serve-harness.py <root-dir> [port]
"""

import json
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8765


class HarnessHandler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0) or 0)
        raw = self.rfile.read(length) if length else b''
        try:
            data = json.loads(raw.decode('utf-8')) if raw else None
        except ValueError:
            data = None

        def reply(msg):
            if not isinstance(msg, dict):
                return {'jsonrpc': '2.0', 'id': None, 'result': [0, {}]}
            params = msg.get('params') or [None, None, None]
            obj = params[1] if len(params) > 1 else None
            meth = params[2] if len(params) > 2 else None
            if msg.get('method') == 'list':
                result = {}
            elif obj == 'session' and meth == 'access':
                result = [0, {'access': True}]
            else:
                result = [0, {}]
            return {'jsonrpc': '2.0', 'id': msg.get('id'), 'result': result}

        out = [reply(m) for m in data] if isinstance(data, list) else reply(data)
        body = json.dumps(out).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass


HTTPServer.allow_reuse_address = True
with HTTPServer(('127.0.0.1', PORT), HarnessHandler) as httpd:
    print('serving %s on 127.0.0.1:%d' % (ROOT, PORT), flush=True)
    httpd.serve_forever()
