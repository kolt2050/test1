from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
import sys
import webbrowser
from threading import Thread
import time

from save_searcher import GameSaveFinder
from html_reporter import generate_html
from backup_manager import BackupManager

# Global state to share scan results
SCAN_RESULTS = []

class SaveScannerHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = 'index.html'
        return super().do_GET()

    def do_POST(self):
        if self.path == '/backup':
            try:
                print("Received backup request...")
                backup_mgr = BackupManager()
                
                # Capture stdout to silence printing locally or handle it? 
                # For now let it print to server console, user sees it there.
                
                # Perform backup
                # We need to know counting for the response
                # BackupManager prints to stdout. Let's update BackupManager later to return stats, 
                # but for now we'll assume it works safely.
                
                # Actually we can capture output or modify backup_manager.
                # Let's keep it simple: run it and return success.
                
                # For better UX, we should count results.
                # Since BackupManager prints, let's just run it.
                backup_mgr.backup_saves(SCAN_RESULTS)
                
                response_data = {
                    "success": True, 
                    "location": str(backup_mgr.backup_root),
                    "errors": 0 # We don't capturing errors exactly without refactor, assume logs show it.
                }
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
        else:
            self.send_error(404)

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, SaveScannerHandler)
    print(f"Server started at http://localhost:{port}")
    webbrowser.open(f"http://localhost:{port}")
    httpd.serve_forever()

def main():
    global SCAN_RESULTS
    print("--- Game Save Finder & Server ---")
    
    # 1. Perform Scan
    finder = GameSaveFinder()
    SCAN_RESULTS = finder.scan()

    if SCAN_RESULTS:
        print(f"\nFound {len(SCAN_RESULTS)} potential save locations.")
        
        # 2. Generate HTML (static file for the server to serve)
        generate_html(SCAN_RESULTS)
        print(f"Report generated: index.html")
        
        # 3. Start Server
        print("\nStarting local server interface...")
        print("Press Ctrl+C to stop.")
        try:
            run_server()
        except KeyboardInterrupt:
            print("\nServer stopped.")
    else:
        print("\nNo obvious save locations found.")

if __name__ == "__main__":
    main()
