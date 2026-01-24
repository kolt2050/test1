import html
import os
from datetime import datetime

def generate_html(save_data: list, output_file: str = "index.html"):
    """Generates an HTML report of found save paths with game names."""
    
    # Sort by game name
    sorted_data = sorted(save_data, key=lambda x: x['game'].lower())
    
    # Categorize data
    all_steam = [item for item in sorted_data if "steam" in item["path"].lower() or "steam" in item["game"].lower()]
    steam_named_data = [item for item in all_steam if not item["game"].startswith("Steam App ")]
    steam_unidentified_data = [item for item in all_steam if item["game"].startswith("Steam App ")]
    other_data = [item for item in sorted_data if item not in all_steam]
    
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
            max-width: 1100px;
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
        h2 {{
            margin-top: 40px;
            color: #4caf50;
            border-left: 4px solid #4caf50;
            padding-left: 15px;
            background: rgba(76, 175, 80, 0.1);
            padding-top: 5px;
            padding-bottom: 5px;
        }}
        h2.unidentified {{
            color: #ff9800;
            border-left-color: #ff9800;
            background: rgba(255, 152, 0, 0.1);
        }}
        .stats {{
            background-color: #383838;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 4px solid #2196f3;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 30px;
        }}
        th, td {{
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #444;
            vertical-align: top;
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
            width: 25%;
            border-right: 1px solid #444;
        }}
        .game-name.unidentified {{
            color: #ff9800;
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
            width: 150px;
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

        <h2>📦 Steam Games</h2>
        <table>
            <thead>
                <tr>
                    <th>Game</th>
                    <th>Save Path</th>
                    <th>Last Modified</th>
                </tr>
            </thead>
            <tbody>
                {_generate_table_rows(steam_named_data)}
            </tbody>
        </table>

        <h2>🕹️ Other Games</h2>
        <table>
            <thead>
                <tr>
                    <th>Game</th>
                    <th>Save Path</th>
                    <th>Last Modified</th>
                </tr>
            </thead>
            <tbody>
                {_generate_table_rows(other_data)}
            </tbody>
        </table>

        <h2 class="unidentified">❓ Unidentified Steam Apps</h2>
        <table>
            <thead>
                <tr>
                    <th>App ID</th>
                    <th>Save Path</th>
                    <th>Last Modified</th>
                </tr>
            </thead>
            <tbody>
                {_generate_table_rows(steam_unidentified_data, is_unidentified=True)}
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

import pathlib

def _shorten_path(path_str: str) -> str:
    """Shortens a path from the right, keeping only parts up to the game root."""
    p = pathlib.Path(path_str)
    parts = p.parts
    
    # 1. Steam userdata logic: ...\userdata\[userid]\[appid]\... -> ...\userdata\[userid]\[appid]
    if "userdata" in parts:
        try:
            ud_idx = parts.index("userdata")
            if len(parts) >= ud_idx + 3:
                return os.path.join(*parts[:ud_idx + 3])
        except: pass

    # 2. Steam common logic: ...\common\[game_folder]\... -> ...\common\[game_folder]
    if "common" in parts:
        try:
            c_idx = parts.index("common")
            if len(parts) >= c_idx + 2:
                return os.path.join(*parts[:c_idx + 2])
        except: pass

    # 3. AppData logic: ...\AppData\[Local/Roaming/LocalLow]\[game_folder]\... -> ...\AppData\[mode]\[game_folder]
    if "AppData" in parts:
        try:
            a_idx = parts.index("AppData")
            if len(parts) >= a_idx + 3:
                return os.path.join(*parts[:a_idx + 3])
        except: pass

    # 4. Saved Games / My Games logic
    for marker in ["Saved Games", "My Games"]:
        if marker in parts:
            try:
                m_idx = parts.index(marker)
                if len(parts) >= m_idx + 2:
                    return os.path.join(*parts[:m_idx + 2])
            except: pass

    return path_str

def _generate_table_rows(data: list, is_unidentified: bool = False) -> str:
    from collections import Counter
    game_counts = Counter(item["game"] for item in data)
    rows = []
    seen_games = set()
    
    for item in data:
        game_name = item["game"]
        path = item["path"]
        display_path = _shorten_path(path)
        mtime_str = "Unknown"
        try:
            mtime = os.path.getmtime(path)
            mtime_str = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
        except:
            pass
        
        row_html = "<tr>"
        if game_name not in seen_games:
            count = game_counts[game_name]
            td_class = "game-name unidentified" if is_unidentified else "game-name"
            row_html += f'<td class="{td_class}" rowspan="{count}">{html.escape(game_name)}</td>'
            seen_games.add(game_name)
            
        row_html += f'<td class="path-cell" title="{html.escape(path)}">{html.escape(display_path)}</td>'
        row_html += f'<td class="time-cell">{mtime_str}</td>'
        row_html += "</tr>"
        rows.append(row_html)
        
    return ''.join(rows)
