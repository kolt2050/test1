import html
import os
from datetime import datetime

def generate_html(save_data: list, output_file: str = "index.html"):
    """Generates an HTML report of found save paths with game names."""
    
    # Sort by game name
    sorted_data = sorted(save_data, key=lambda x: x['game'].lower())
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Save Report</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #1a1a1a;
            color: #e0e0e0;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }}
        .container {{
            max-width: 1000px;
            margin: 0 auto;
            background-color: #2d2d2d;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }}
        h1 {{
            margin-top: 0;
            border-bottom: 2px solid #4a4a4a;
            padding-bottom: 10px;
            color: #ffffff;
        }}
        .stats {{
            background-color: #383838;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 4px solid #4caf50;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        th, td {{
            padding: 6px;
            text-align: left;
            border-bottom: 1px solid #444;
        }}
        th {{
            background-color: #333;
            color: #fff;
            font-weight: 600;
        }}
        tr:hover {{
            background-color: #3d3d3d;
        }}
        .game-name {{
            font-weight: bold;
            color: #4caf50;
            width: 30%;
        }}
        .path-cell {{
            font-family: monospace;
            color: #aaa;
            font-size: 0.9em;
            word-break: break-all;
        }}
        .time-cell {{
            font-size: 0.85em;
            color: #888;
            white-space: nowrap;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Game Save Support</h1>
        
        <div class="stats">
            <strong>Scan Complete:</strong> Found {len(sorted_data)} potential save locations.
            <br><small>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</small>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Game</th>
                    <th>Save Path</th>
                    <th>Last Modified</th>
                </tr>
            </thead>
            <tbody>
                {_generate_table_rows(sorted_data)}
            </tbody>
        </table>
    </div>
</body>
</html>
"""
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"HTML report successfully generated: {output_file}")
    except Exception as e:
        print(f"Error generating HTML report: {e}")

def _generate_table_rows(data: list) -> str:
    rows = []
    for item in data:
        path = item["path"]
        mtime_str = "Unknown"
        try:
            mtime = os.path.getmtime(path)
            mtime_str = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
        except:
            pass
            
        rows.append(f'<tr><td class="game-name">{html.escape(item["game"])}</td><td class="path-cell">{html.escape(path)}</td><td class="time-cell">{mtime_str}</td></tr>')
    return ''.join(rows)
