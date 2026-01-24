from save_searcher import GameSaveFinder

def debug_roots():
    finder = GameSaveFinder()
    roots = finder.get_search_paths()
    print("Search roots:")
    for r in roots:
        print(f" - {r}")
    
    print("\nScanning AppData/Local specifically...")
    for root in roots:
        if "AppData\\Local" in str(root) and "LocalLow" not in str(root):
            print(f"Found AppData/Local root: {root}")
            found_keeper = False
            try:
                for entry in root.iterdir():
                    if entry.name.lower() == 'keeper':
                        print(f"FOUND Keeper in {root} at top level iteration!")
                        found_keeper = True
                        save_dir = finder._find_save_in_game_folder(entry, depth=5)
                        print(f"Save dir: {save_dir}")
                if not found_keeper:
                    print(f"Keeper NOT found in {root} top level iteration.")
            except Exception as e:
                print(f"Error iterating {root}: {e}")

if __name__ == "__main__":
    debug_roots()
