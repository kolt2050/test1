from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

def main():
    # Use Playwright to handle JS rendering/redirects
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Dzen often redirects or loads via JS
        page.goto('https://dzen.ru/news')
        
        # Wait for valid content to load
        # We try to wait for a known headline class
        try:
            page.wait_for_selector('.mg-card__title, .card__title', timeout=15000)
        except:
            # If timeout, we proceed with whatever we have (maybe it loaded differently)
            pass

        html = page.content()
        browser.close()

    soup = BeautifulSoup(html, 'html.parser')
    titles = []

    # Potential classes for headlines on Dzen (these change often, so we check a few patterns)
    target_classes = ['mg-card__title', 'card__title', 'news-card__title', 'mg-story__title']

    found_any = False
    for cls_name in target_classes:
        # Find elements containing the class name
        elements = soup.find_all(class_=lambda x: x and cls_name in x)
        if elements:
            found_any = True
            for el in elements:
                text = el.get_text(strip=True)
                if text and text not in titles:
                    titles.append(text)

    # Fallback if no specific classes found: look for H2/H3 tags
    if not found_any:
        for tag in ['h2', 'h3']:
            for el in soup.find_all(tag):
                text = el.get_text(strip=True)
                # Simple filter to avoid short nav items
                if len(text) > 10 and text not in titles:
                    titles.append(text)

    # Output ONLY headlines as requested
    for title in titles:
        print(title)

if __name__ == "__main__":
    main()
