from save_searcher import GameSaveFinder
from html_reporter import generate_html
import os

def main():
    print("--- Game Save Finder ---")
    finder = GameSaveFinder()
    found = finder.scan()

    if found:
        print(f"\nFound {len(found)} potential save locations:")
        for item in sorted(found, key=lambda x: x['game']):
            print(f" - [{item['game']}] {item['path']}")
        
        # Generate HTML report
        generate_html(found)
        print(f"Report saved to: {os.path.abspath('index.html')}")
    else:
        print("\nNo obvious save locations found.")

if __name__ == "__main__":
    main()
