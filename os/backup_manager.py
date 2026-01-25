import os
import shutil
import datetime
import pathlib

class BackupManager:
    def __init__(self, backup_root: str = r"V:\backup-saved-games"):
        self.backup_root = pathlib.Path(backup_root)

    def backup_saves(self, found_saves: list):
        """
        Backs up found saves to a timestamped folder.
        
        Args:
            found_saves (list): List of dicts with 'game' and 'path'.
        """
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        target_dir = self.backup_root / timestamp
        
        print(f"\nStarting backup to: {target_dir}")
        
        try:
            target_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"Error creating backup directory: {e}")
            return

        success_count = 0
        error_count = 0

        for item in found_saves:
            game_name = item['game']
            source_path = pathlib.Path(item['path'])
            
            # Clean game name for filesystem usage
            safe_game_name = "".join(c for c in game_name if c.isalnum() or c in (' ', '_', '-')).strip()
            if not safe_game_name:
                safe_game_name = "Unknown_Game"
                
            dest_path = target_dir / safe_game_name

            # Structure: target_dir / safe_game_name / [path_without_drive]
            # e.g. V:\backup\timestamp\GameName\Users\PC\AppData\Local\GameName\Saved
            
            drive, path_without_drive = os.path.splitdrive(source_path)
            # path_without_drive starts with \, so joining might treat it as root. 
            # We need to strip the leading separator.
            relative_path = path_without_drive.lstrip(os.sep)
            
            final_dest = dest_path / relative_path
                
            print(f" - Backing up [{game_name}]...")
            try:
                # shutil.copytree requires dest to NOT exist usually (in older python versions), 
                # or dirs_exist_ok=True in newer (3.8+).
                # We generated a unique final_dest, so it shouldn't exist.
                
                if source_path.is_dir():
                    shutil.copytree(source_path, final_dest, dirs_exist_ok=True)
                else:
                    # It's a file
                    final_dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_path, final_dest)
                    
                success_count += 1
            except Exception as e:
                print(f"   Failed to backup {source_path}: {e}")
                error_count += 1

        print(f"\nBackup completed. Success: {success_count}, Errors: {error_count}")
