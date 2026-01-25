from save_searcher import GameSaveFinder

try:
    finder = GameSaveFinder()
    result = finder.scan()
    print(f"Type of result: {type(result)}")
    if isinstance(result, tuple):
        saves, paths = result
        print(f"Saves count: {len(saves)}")
        print(f"Paths count: {len(paths)}")
        print("Paths sample:", paths[:3])
    else:
        print("Result is not a tuple!")
except Exception as e:
    print(f"Error: {e}")
