from save_searcher import GameSaveFinder
import pathlib
import os

def debug():
    finder = GameSaveFinder()
    
    # Check if LocalLow is in search paths
    roots = finder.get_search_paths()
    locallow = pathlib.Path(os.environ['USERPROFILE']) / 'AppData' / 'LocalLow'
    
    print(f"LocalLow path: {locallow}")
    print(f"LocalLow exists: {locallow.exists()}")
    print(f"LocalLow in roots: {locallow in roots}")

    questline = locallow / 'Questline'
    print(f"Questline path: {questline}")
    print(f"Questline exists: {questline.exists()}")
    
    if questline.exists():
        print("Scaning Questline directly...")
        found = finder._find_save_in_game_folder(questline, depth=5)
        print(f"Found in Questline: {found}")
        
    print("\n--- Listing LocalLow children ---")
    try:
        count = 0
        for child in locallow.iterdir():
            if child.name == 'Questline':
                print(f"FOUND 'Questline' entry in iterdir! Is Dir: {child.is_dir()}")
            if count < 5:
                print(f" - {child.name}")
            count += 1
    except Exception as e:
        print(f"Error listing LocalLow: {e}")

if __name__ == "__main__":
    debug()
