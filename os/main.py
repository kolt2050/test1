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
SCAN_PATHS = []

class SaveScannerHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = 'index.html'
        return super().do_GET()

    def do_POST(self):
        global SCAN_RESULTS, SCAN_PATHS
        if self.path == '/backup':
            try:
                print("Received backup request...")
                
                # Open folder selection dialog
                import tkinter as tk
                from tkinter import filedialog
                
                # Create hidden root window
                root = tk.Tk()
                root.withdraw()
                root.attributes('-topmost', True) # Bring to front
                
                print("Waiting for user to select folder...")
                selected_folder = filedialog.askdirectory(title="Select Backup Destination")
                root.destroy()
                
                if not selected_folder:
                    print("Backup cancelled by user.")
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Backup cancelled by user"}).encode())
                    return

                print(f"User selected: {selected_folder}")
                backup_mgr = BackupManager(backup_root=selected_folder)
                backup_mgr.backup_saves(SCAN_RESULTS)
                
                response_data = {
                    "success": True, 
                    "location": str(selected_folder),
                    "errors": 0
                }
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode())
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
                
        elif self.path == '/scan':
            try:
                print("Received scan request...")
                finder = GameSaveFinder()
                SCAN_RESULTS, SCAN_PATHS = finder.scan()
                
                # Regenerate HTML
                generate_html(SCAN_RESULTS, SCAN_PATHS)
                print("Report regenerated.")
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "count": len(SCAN_RESULTS)}).encode())
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
        elif self.path == '/stop':
            print("Received stop request...")
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode())
            
            def kill_me():
                time.sleep(1)
                print("Server shutting down by user request.")
                
                # Cleanup logs and temp files
                import glob
                import shutil
                
                patterns = [
                    "server_log_*.txt",
                    "debug_*.py",
                    "index.html",
                    "output.txt",
                    "output_new.txt"
                ]
                
                for pattern in patterns:
                    for f in glob.glob(pattern):
                        try:
                            os.remove(f)
                            print(f"Deleted: {f}")
                        except Exception as e:
                            print(f"Error deleting {f}: {e}")
                            
                # Cleanup cache dir
                if os.path.exists("__pycache__"):
                    try:
                        shutil.rmtree("__pycache__")
                        print("Deleted __pycache__")
                    except Exception as e:
                        print(f"Error deleting __pycache__: {e}")

                os._exit(0)
                
            Thread(target=kill_me).start()
            
        else:
            self.send_error(404)

def run_server(port=8001):
    server_address = ('', port)
    httpd = HTTPServer(server_address, SaveScannerHandler)
    print(f"Server started at http://localhost:{port}")
    webbrowser.open(f"http://localhost:{port}")
    httpd.serve_forever()

def main():
    try:
        global SCAN_RESULTS, SCAN_PATHS
        print("--- Game Save Finder & Server ---")
        
        # 1. Perform Scan
        finder = GameSaveFinder()
        SCAN_RESULTS, SCAN_PATHS = finder.scan()

        if SCAN_RESULTS:
            print(f"\nFound {len(SCAN_RESULTS)} potential save locations.")
            print(f"DEBUG: SCAN_PATHS has {len(SCAN_PATHS)} items.")
            
            # 2. Generate HTML (static file for the server to serve)
            generate_html(SCAN_RESULTS, SCAN_PATHS)
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
    except Exception as e:
        import traceback
        traceback.print_exc()
        input("Press Enter to exit...")

if __name__ == "__main__":
    main()
