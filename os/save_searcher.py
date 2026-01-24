import os
import pathlib
from typing import List, Set

class GameSaveFinder:
    def __init__(self):
        self.save_keywords = ['save', 'saves', 'saved games', 'savedgames', 'game data', 'saved']
        self.save_extensions = ['.sav', '.save', '.dat', '.json', '.xml', '.bak', '.upipelinecache']
        # Some filtering to avoid system files or too much noise
        self.excluded_dirs = {'Microsoft', 'Windows', 'Packages', 'Temp', 'Common Files', '360MenuMgr'}

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
        common_game_folders = ['SteamLibrary', 'Steam', 'Games', 'XboxGames', 'GOG Games', 'Program Files (x86)/Steam']
        
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

        print(f"Scanning {len(search_roots)} common locations...")

        for root in search_roots:
            try:
                # We do a shallow(ish) walk to find game folders first
                for entry in root.iterdir():
                    try:
                        if entry.is_dir() and entry.name not in self.excluded_dirs:
                            
                            # Logic to handle "My Games" folder specially
                            if entry.name == "My Games":
                                self._scan_my_games(entry, found_saves)
                                continue
                            
                            # Logic for SteamLibrary/steamapps
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
