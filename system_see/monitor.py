import os
import database

def detect_program(path):
    """
    Attempts to guess the program name from the path.
    """
    lower_path = path.lower()
    parts = path.split(os.sep)
    
    # Common locations
    if 'Windows' in parts or 'windows' in lower_path:
        return 'System'
        
    try:
        if 'Program Files' in parts:
            idx = parts.index('Program Files')
            if idx + 1 < len(parts):
                return parts[idx + 1] # Manufacturer or App
        elif 'Program Files (x86)' in parts:
            idx = parts.index('Program Files (x86)')
            if idx + 1 < len(parts):
                return parts[idx + 1]
        elif 'AppData' in parts:
             # AppData/Local/App
             idx = parts.index('AppData')
             if idx + 2 < len(parts):
                 return parts[idx + 2]
    except ValueError:
        pass
        
    return 'System'

def get_rich_file_list(paths):
    """Converts a set of paths to a sorted list of dicts with details."""
    result = []
    for path in paths:
        prog = detect_program(path)
        name = os.path.basename(path)
        result.append({
            'path': path, 
            'name': name, 
            'program': prog
        })
    # Sort by program first, then by name
    return sorted(result, key=lambda x: (x['program'], x['name']))

def compare_scans(old_scan_id, new_scan_id):
    """
    Compares two scans and returns a dictionary of changes.
    """
    old_files = database.get_scan_files(old_scan_id)
    new_files = database.get_scan_files(new_scan_id)
    
    old_paths = set(old_files.keys())
    new_paths = set(new_files.keys())
    
    added = new_paths - old_paths
    deleted = old_paths - new_paths
    common = old_paths & new_paths
    
    modified = []
    
    for path in common:
        old_meta = old_files[path]
        new_meta = new_files[path]
        if old_meta != new_meta:
            modified.append(path)
            
    return {
        'added': get_rich_file_list(added),
        'deleted': get_rich_file_list(deleted),
        'modified': get_rich_file_list(modified),
        'scan_time': 'Now', 
        'stats': {
            'total_files': len(new_files),
            'added_count': len(added),
            'deleted_count': len(deleted),
            'modified_count': len(modified)
        }
    }

def get_latest_changes():
    """
    Gets the last two scans and compares them.
    If only one scan exists, everything is considered 'added' (baseline).
    """
    scans = database.get_last_two_scans()
    
    if not scans:
        return {'status': 'No scans found'}
        
    if len(scans) == 1:
        # Only one scan (baseline)
        new_scan_id = scans[0]
        files = database.get_scan_files(new_scan_id)
        return {
            'status': 'Baseline scan complete',
            'added': [], 
            'deleted': [],
            'modified': [],
            'note': 'First scan completed. Future scans will show changes relative to this one.',
            'stats': {
                'total_files': len(files),
                'added_count': 0,
                'deleted_count': 0,
                'modified_count': 0
            }
        }
        
    # scans[0] is newest, scans[1] is older
    return compare_scans(scans[1], scans[0])
