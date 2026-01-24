from save_searcher import GameSaveFinder
import pathlib
import os

def debug_keeper():
    finder = GameSaveFinder()
    
    local_app_data = pathlib.Path(os.environ['LOCALAPPDATA'])
    keeper_dir = local_app_data / 'Keeper'
    
    print(f"Checking Keeper dir: {keeper_dir}")
    print(f"Exists: {keeper_dir.exists()}")
    
    if keeper_dir.exists():
        print("Scaning Keeper directly...")
        found = finder._find_save_in_game_folder(keeper_dir, depth=5)
        print(f"Found in Keeper: {found}")
        
    print("\n--- Testing keyword match ---")
    test_name = "Saved"
    is_match = any(kw in test_name.lower() for kw in finder.save_keywords)
    print(f"Keyword 'save' in 'saved': {is_match}")
    
    print("\n--- Iterating LocalAppData for Keeper ---")
    found_keeper = False
    for entry in local_app_data.iterdir():
        if entry.name.lower() == 'keeper':
            print(f"FOUND Keeper in iterdir: {entry}")
            found_keeper = True
            save_dir = finder._find_save_in_game_folder(entry, depth=5)
            print(f"Save dir found via _find_save_in_game_folder: {save_dir}")
    
    if not found_keeper:
        print("Keeper NOT found in LocalAppData iterdir!")

if __name__ == "__main__":
    debug_keeper()
