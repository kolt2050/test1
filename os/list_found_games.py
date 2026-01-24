from save_searcher import GameSaveFinder

def list_all_found():
    finder = GameSaveFinder()
    found = finder.scan()
    print(f"\nTotal found: {len(found)}")
    games = sorted([f['game'] for f in found])
    for g in games:
        print(f" - {g}")
        if g.lower() == 'keeper':
            print("!!! KEEPER FOUND IN SCAN !!!")

if __name__ == "__main__":
    list_all_found()
