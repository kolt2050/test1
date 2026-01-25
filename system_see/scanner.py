import os
import database
import fnmatch

IGNORE_FILE = 'ignore_patterns.txt'

def load_ignore_patterns():
    patterns = []
    if os.path.exists(IGNORE_FILE):
        with open(IGNORE_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    patterns.append(line)
    return patterns

def is_ignored(filename, patterns):
    for pattern in patterns:
        if fnmatch.fnmatch(filename, pattern):
            return True
    return False

def scan_drive(scan_id, root_path='C:\\'):
    """
    Scans the drive and inputs data into the database in batches.
    """
    file_batch = []
    batch_size = 1000
    
    ignore_patterns = load_ignore_patterns()
    
    # Common directories to skip to avoid permission errors or infinite loops
    skip_dirs = {'Windows', 'Program Files', 'Program Files (x86)', '$Recycle.Bin', 'System Volume Information'}
    
    # We will target specific user areas and safer system areas for demonstration
    # Scanning entire C:\ can range from minutes to hours. 
    # Let's limit scope slightly or just handle errors gracefully.
    
    for root, dirs, files in os.walk(root_path, topdown=True):
        # Modify dirs in-place to skip specific folders if desired
        dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith('.')]
        
        for name in files:
            if is_ignored(name, ignore_patterns):
                continue
                
            try:
                path = os.path.join(root, name)
                stats = os.stat(path)
                
                # (path, size, mtime)
                file_batch.append((path, stats.st_size, stats.st_mtime))
                
                if len(file_batch) >= batch_size:
                    database.add_file_entries(scan_id, file_batch)
                    file_batch = []
            except (OSError, PermissionError):
                continue
                
    if file_batch:
        database.add_file_entries(scan_id, file_batch)
