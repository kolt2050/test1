import os
import pathlib
from backup_manager import BackupManager

def test_path_logic():
    # Mock data
    game_name = "DOOM: The Dark Ages"
    source_path_str = r"V:\OfflineSTEAM\userdata\1482238173\3017860"
    source_path = pathlib.Path(source_path_str)
    
    # Instantiate manager
    mgr = BackupManager()
    
    # Replicate the logic from backup_saves
    safe_game_name = "".join(c for c in game_name if c.isalnum() or c in (' ', '_', '-')).strip()
    target_dir = pathlib.Path("V:/backup-saved-games/TEST_TIMESTAMP")
    dest_path = target_dir / safe_game_name
    
    drive, path_without_drive = os.path.splitdrive(source_path)
    relative_path = path_without_drive.lstrip(os.sep)
    final_dest = dest_path / relative_path
    
    print(f"Game: {game_name}")
    print(f"Source: {source_path}")
    print(f"Safe Name: {safe_game_name}")
    print(f"Calculated Dest: {final_dest}")
    
    # Validate against expected
    expected_suffix = r"DOOM The Dark Ages\OfflineSTEAM\userdata\1482238173\3017860"
    if str(final_dest).endswith(expected_suffix):
        print("SUCCESS: Path structure matches requirements.")
    else:
        print(f"FAILURE: Expected suffix '{expected_suffix}' not found.")

if __name__ == "__main__":
    test_path_logic()
