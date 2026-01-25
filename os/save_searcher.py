import os
import pathlib
from typing import List, Set

class GameSaveFinder:
    STEAM_APPID_FALLBACK = {
        "7": "Steam Cloud / Internal",
        "204450": "Call of Juarez: Gunslinger",
        "228300": "Steam Controller Configs",
        "237930": "Transistor",
        "241100": "Steam Input Configs",
        "391220": "Rise of the Tomb Raider",
        "391490": "Tortuga Island (Market Items)",
        "534380": "Dying Light 2 Stay Human",
        "546560": "Half-Life: Alyx",
        "801800": "Atomfall",
        "860950": "Dead Rising Deluxe Remaster",
        "978300": "Dragon's Dogma 2",
        "1184050": "Gears Tactics",
        "1338770": "Sniper Ghost Warrior Contracts 2",
        "1649010": "Miasma Chronicles",
        "1804270": "Warhammer 40,000: Rogue Trader",
        "2054970": "Dragon's Dogma 2",
        "2186680": "Warhammer 40,000: Rogue Trader",
        "2527390": "Dead Rising Deluxe Remaster",
        "3008130": "Dying Light: The Beast",
        "386280": "Mortal Kombat X/XL"
    }

    def __init__(self):
        self.save_keywords = ['save', 'saves', 'saved games', 'savedgames', 'game data', 'saved', 'remote']
        self.save_extensions = ['.sav', '.save', '.dat', '.json', '.xml', '.bak', '.upipelinecache', '.details']
        # Some filtering to avoid system files or too much noise
        self.excluded_dirs = {'Microsoft', 'Windows', 'Packages', 'Temp', 'Common Files', '360MenuMgr'}
        self.appid_mapping = self.STEAM_APPID_FALLBACK.copy()

    def get_available_drives(self) -> List[str]:
        """Returns a list of available drive letters (e.g. ['C:\\', 'D:\\'])."""
        drives = []
        # Basic check for drives A-Z
        for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            drive = f"{letter}:\\"
            if pathlib.Path(drive).exists():
                drives.append(drive)
        return drives

    def get_search_paths(self) -> List[pathlib.Path]:
        """Returns a list of common paths where games save data."""
        paths = []
        user_profile = os.environ.get('USERPROFILE')
        if user_profile:
            base = pathlib.Path(user_profile)
            paths.extend([
                base / 'Documents',
                base / 'Saved Games',
                base / 'AppData' / 'Roaming',
                base / 'AppData' / 'Local',
                base / 'AppData' / 'LocalLow'
            ])
        
        # Add secondary drive locations
        common_game_folders = [
            'SteamLibrary', 'Steam', 'Games', 'XboxGames', 'GOG Games', 
            'Program Files (x86)/Steam', 'OfflineSTEAM', 'Vortex'
        ]
        
        for drive in self.get_available_drives():
            drive_path = pathlib.Path(drive)
            
            # Don't re-scan user profile if it's on C: and we just scanned it above
            # But simpler to just add specific likely game folders on all drives
            for folder_name in common_game_folders:
                potential_path = drive_path / folder_name
                if potential_path.exists():
                     paths.append(potential_path)
        
        # Filter out paths that don't exist
        return [p for p in paths if p.exists()]

    def is_potential_save_dir(self, path: pathlib.Path) -> bool:
        """Checks if a directory name suggests it contains saves."""
        name = path.name.lower()
        return any(keyword in name for keyword in self.save_keywords)

    def scan(self) -> List[dict]:
        """Scans common locations and returns a list of dicts with 'game' and 'path'."""
        found_saves = []
        search_roots = self.get_search_paths()

        print(f"Scanning {len(search_roots)} common locations:")
        for root in search_roots:
            print(f" - {root}")

        for root in search_roots:
            # First pass: load steam mappings if root is a steam library
            if root.name in ["SteamLibrary", "Steam", "OfflineSTEAM"] or (root / "steamapps").exists():
                self._load_steam_appid_mapping(root)

            try:
                # We do a shallow(ish) walk to find game folders first
                for entry in root.iterdir():
                    try:
                        if entry.is_dir() and entry.name not in self.excluded_dirs:
                            
                            # Logic to handle "My Games" folder specially
                            if entry.name == "My Games":
                                self._scan_my_games(entry, found_saves)
                                continue
                            
                            # Logic for SteamLibrary/steamapps/OfflineSTEAM
                            if entry.name in ["steamapps", "userdata"]:
                                 # Within steamapps, we might have userdata if it's a root
                                 userdata_path = entry if entry.name == "userdata" else entry.parent / "userdata"
                                 if userdata_path.exists():
                                     self._scan_steam_userdata(userdata_path, found_saves)
                                 
                                 if entry.name == "steamapps":
                                     self._scan_steamapps(entry, found_saves)
                                 continue

                            # Go one or two levels deeper to find "Save" folder inside a Game folder
                            # We assume 'entry' is the Game Name Candidate
                            save_dir = self._find_save_in_game_folder(entry, depth=5)
                            if save_dir:
                                found_saves.append({
                                    'game': entry.name,
                                    'path': str(save_dir)
                                })
                    except PermissionError:
                        continue
                    except Exception as e:
                        # Log specific entry error if needed, but don't stop the loop
                        pass
                            
            except PermissionError:
                continue
            except Exception as e:
                print(f"Error accessing {root}: {e}")

        return found_saves

    def _scan_steamapps(self, steamapps_root: pathlib.Path, found_saves: List[dict]):
        """Helper to scan inside 'steamapps/common'."""
        common_dir = steamapps_root / 'common'
        if not common_dir.exists():
            return

        try:
            for entry in common_dir.iterdir():
                if entry.is_dir():
                    # entry is the Game Name (e.g. ABInfinite)
                    save_dir = self._find_save_in_game_folder(entry, depth=5)
                    if save_dir:
                        found_saves.append({
                            'game': entry.name,
                            'path': str(save_dir)
                        })
        except Exception:
            pass

    def _scan_my_games(self, my_games_root: pathlib.Path, found_saves: List[dict]):
        """Helper to scan inside 'My Games' folder."""
        try:
            for entry in my_games_root.iterdir():
                if entry.is_dir():
                    # entry is likely the Game Name
                    save_dir = self._find_save_in_game_folder(entry, depth=5)
                    if save_dir:
                        found_saves.append({
                            'game': entry.name,
                            'path': str(save_dir)
                        })
        except Exception:
            pass

    def _scan_steam_userdata(self, userdata_root: pathlib.Path, found_saves: List[dict]):
        """Helper to scan inside 'userdata'. Can be called for 'userdata' dir or 'steamapps/..' if appropriate."""
        # userdata structure is usually: userdata/[UserId]/[AppId]/remote
        try:
            for user_dir in userdata_root.iterdir():
                if user_dir.is_dir() and user_dir.name.isdigit():
                    for app_dir in user_dir.iterdir():
                        if app_dir.is_dir() and app_dir.name.isdigit():
                            remote_dir = app_dir / 'remote'
                            if remote_dir.exists():
                                app_id = app_dir.name
                                game_name = self.appid_mapping.get(app_id, f"Steam App {app_id}")
                                found_saves.append({
                                    'game': game_name,
                                    'path': str(remote_dir)
                                })
        except Exception:
            pass

    def _load_steam_appid_mapping(self, library_root: pathlib.Path):
        """Finds appmanifest files and extracts game names."""
        import re
        
        steamapps_dirs = [library_root / "steamapps"]
        # Also check current if it is the steamapps folder
        if library_root.name == "steamapps":
            steamapps_dirs.append(library_root)
            
        for sa_dir in steamapps_dirs:
            if not sa_dir.exists(): continue
            try:
                for manifest in sa_dir.glob("appmanifest_*.acf"):
                    try:
                        content = manifest.read_text(encoding='utf-8', errors='ignore')
                        appid_match = re.search(r'"appid"\s+"(\d+)"', content)
                        name_match = re.search(r'"name"\s+"([^"]+)"', content)
                        if appid_match and name_match:
                            self.appid_mapping[appid_match.group(1)] = name_match.group(1)
                    except Exception:
                        continue
            except Exception:
                continue

    def _find_save_in_game_folder(self, folder: pathlib.Path, depth: int) -> dict:
        """
        Recursively looks for a save dir inside a game folder.
        Returns the path if found, None otherwise.
        """
        if depth == 0:
            return None

        # Check if current folder is a save dir
        if self.is_potential_save_dir(folder):
            return folder

        try:
            for entry in folder.iterdir():
                if entry.is_dir():
                    if self.is_potential_save_dir(entry):
                        return entry
                    else:
                        found = self._find_save_in_game_folder(entry, depth - 1)
                        if found:
                            return found
        except PermissionError:
            pass
        return None
