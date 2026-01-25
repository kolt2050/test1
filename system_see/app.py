from flask import Flask, render_template, jsonify, request
import os
import shutil
import time
import subprocess
import database
import scanner
import monitor
import threading

app = Flask(__name__)

# Initialize DB
database.init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scan', methods=['POST'])
def scan():
    try:
        start_time = time.time()
        scan_id = database.create_scan()
        scanner.scan_drive(scan_id, 'C:\\')
        
        result = monitor.get_latest_changes()
        
        elapsed = time.time() - start_time
        result['stats']['duration'] = round(elapsed, 2)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/open_folder', methods=['POST'])
def open_folder():
    try:
        data = request.get_json()
        path = data.get('path')
        if not path:
            return jsonify({'error': 'No path provided'}), 400
            
        # Normalize path for Windows
        norm_path = os.path.normpath(path)
        
        # Open explorer with file selected
        # Using PowerShell Start-Process is often better at handling window focus
        subprocess.Popen(['powershell', '-Command', f'Start-Process explorer -ArgumentList "/select,`"{norm_path}`""'])
        return jsonify({'status': 'ok'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/db_size', methods=['GET'])
def get_db_size():
    try:
        if os.path.exists(database.DB_NAME):
            size_bytes = os.path.getsize(database.DB_NAME)
            # Convert to readable format
            if size_bytes < 1024:
                size_str = f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                size_str = f"{size_bytes / 1024:.2f} KB"
            else:
                size_str = f"{size_bytes / (1024 * 1024):.2f} MB"
            return jsonify({'size': size_str})
        return jsonify({'size': '0 B'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/clear_db', methods=['POST'])
def clear_db():
    try:
        # Close connection is handled per request in database.py but we need 
        # to ensure no locks.
        # Simplest way: Delete file and re-init.
        if os.path.exists(database.DB_NAME):
            os.remove(database.DB_NAME)
        
        database.init_db()
        return jsonify({'status': 'ok', 'message': 'Database cleared'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/scan_history', methods=['GET'])
def scan_history():
    try:
        scans = database.get_all_scans()
        return jsonify(scans)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def cleanup():
    """Deletes __pycache__ folders."""
    print("Cleaning up unnecessary files...")
    
    # Delete __pycache__
    root_dir = os.path.dirname(os.path.abspath(__file__))
    for root, dirs, files in os.walk(root_dir):
        for d in dirs:
            if d == '__pycache__':
                path = os.path.join(root, d)
                try:
                    shutil.rmtree(path)
                    print(f"Deleted {path}")
                except Exception as e:
                    print(f"Error deleting {path}: {e}")

@app.route('/restart', methods=['POST'])
def restart():
    cleanup()
    print("Restarting server...")
    # Give a moment for the response to be sent
    def restart_server():
        time.sleep(1)
        import sys
        os.execl(sys.executable, sys.executable, *sys.argv)
    
    threading.Thread(target=restart_server).start()
    return jsonify({'message': 'Server is restarting...'})

@app.route('/shutdown', methods=['POST'])
def shutdown():
    cleanup() # cleanup immediately before killing server
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        return jsonify({'error': 'Not running with the Werkzeug Server'}), 500
    func()
    return jsonify({'message': 'Server shutting down and files cleaned.'})
    
# Register cleanup for normal exit (Ctrl+C)
import atexit
atexit.register(cleanup)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
