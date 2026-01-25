import sqlite3
import os
from datetime import datetime

DB_NAME = 'system_see.db'

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Store information about each scan event
    c.execute('''CREATE TABLE IF NOT EXISTS scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )''')
    
    # Store file details linked to a scan
    # Composite index on scan_id and path for faster lookups
    c.execute('''CREATE TABLE IF NOT EXISTS file_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_id INTEGER,
                    path TEXT,
                    size INTEGER,
                    mtime REAL,
                    FOREIGN KEY (scan_id) REFERENCES scans (id)
                )''')
    
    c.execute('CREATE INDEX IF NOT EXISTS idx_scan_path ON file_entries (scan_id, path)')
    
    conn.commit()
    conn.close()

def create_scan():
    """Creates a new scan record and returns its ID."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('INSERT INTO scans (scan_date) VALUES (?)', (datetime.now(),))
    scan_id = c.lastrowid
    conn.commit()
    conn.close()
    
    # Cleanup old scans, keep only last 2 (current + previous)
    cleanup_old_scans()
    
    return scan_id

def cleanup_old_scans():
    """Keeps only the last 2 scans, deletes the rest."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('PRAGMA foreign_keys = ON') # Ensure cascading deletes if configured, or manual delete
    
    # Get IDs of scans to keep (latest 2)
    c.execute('SELECT id FROM scans ORDER BY id DESC LIMIT 2')
    rows = c.fetchall()
    keep_ids = [row['id'] for row in rows]
    
    if keep_ids:
        # Create placeholder string for query
        placeholders = ','.join('?' for _ in keep_ids)
        
        # Delete from file_entries first (if no cascade)
        c.execute(f'DELETE FROM file_entries WHERE scan_id NOT IN ({placeholders})', keep_ids)
        
        # Delete from scans
        c.execute(f'DELETE FROM scans WHERE id NOT IN ({placeholders})', keep_ids)
        
        conn.commit()
        
    conn.close()

def add_file_entries(scan_id, file_list):
    """
    Bulk insert file entries.
    file_list is a list of tuples: (path, size, mtime)
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    # Batch insert is much faster
    query = 'INSERT INTO file_entries (scan_id, path, size, mtime) VALUES (?, ?, ?, ?)'
    # Prepare data for executemany: add scan_id to each tuple
    data = [(scan_id, f[0], f[1], f[2]) for f in file_list]
    
    c.executemany(query, data)
    conn.commit()
    conn.close()

def get_scan_files(scan_id):
    """Returns a dictionary {path: (size, mtime)} for a given scan."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT path, size, mtime FROM file_entries WHERE scan_id = ?', (scan_id,))
    rows = c.fetchall()
    conn.close()
    return {row['path']: (row['size'], row['mtime']) for row in rows}

def get_last_two_scans():
    """Returns the IDs of the last two scans, most recent first."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT id FROM scans ORDER BY id DESC LIMIT 2')
    rows = c.fetchall()
    conn.close()
    return [row['id'] for row in rows]

def get_all_scans():
    """Returns a list of all scans with details."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT id, scan_date FROM scans ORDER BY id DESC')
    rows = c.fetchall()
    conn.close()
    return [{'id': row['id'], 'date': row['scan_date'].split('.')[0]} for row in rows]
