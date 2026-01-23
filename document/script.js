document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const btnBold = document.getElementById('btn-bold');
    const btnItalic = document.getElementById('btn-italic');
    const btnUnderline = document.getElementById('btn-underline');
    const btnImage = document.getElementById('btn-image');
    const btnSave = document.getElementById('btn-save');
    const btnOpen = document.getElementById('btn-open');
    const imageInput = document.getElementById('image-input');
    const fileInput = document.getElementById('file-input');

    // Rich Text Commands
    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        editor.focus();
    };

    btnBold.addEventListener('click', () => execCommand('bold'));
    btnItalic.addEventListener('click', () => execCommand('italic'));
    btnUnderline.addEventListener('click', () => execCommand('underline'));

    // Alignment Commands
    document.getElementById('btn-left').addEventListener('click', () => execCommand('justifyLeft'));
    document.getElementById('btn-center').addEventListener('click', () => execCommand('justifyCenter'));
    document.getElementById('btn-right').addEventListener('click', () => execCommand('justifyRight'));

    // Image Handling
    if (btnImage) {
        btnImage.addEventListener('click', () => {
            imageInput.click();
        });
    }

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = `<img src="${event.target.result}" alt="Uploaded Image">`;
                execCommand('insertHTML', img);
            };
            reader.readAsDataURL(file);
        }
        imageInput.value = '';
    });

    // HTML Save/Load Handling
    btnSave.addEventListener('click', async () => {
        const content = editor.innerHTML;
        const title = document.title || 'Document';

        const htmlTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background: #f5f7fa; padding: 40px 20px; display: flex; justify-content: center; }
        .paper { background: #fff; width: 100%; max-width: 850px; min-height: 1056px; padding: 60px 80px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); border-radius: 4px; color: #333; line-height: 1.5; }
        .paper h1 { font-family: 'Outfit', sans-serif; margin-bottom: 20px; color: #222; }
        .paper p { line-height: 1.5; margin-bottom: 15px; }
        .paper img { max-width: 100%; height: auto; border-radius: 8px; margin: 0; }
        .paper a { color: #4a90e2; text-decoration: underline; }
    </style>
</head>
<body>
    <div class="paper">
        ${content}
    </div>
</body>
</html>`;

        try {
            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'document.html',
                    types: [{
                        description: 'HTML Document',
                        accept: { 'text/html': ['.html'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(htmlTemplate);
                await writable.close();
            } else {
                const blob = new Blob([htmlTemplate], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'document.html';
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Save failed:', err);
                alert('Не удалось сохранить файл.');
            }
        }
    });

    btnOpen.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const html = event.target.result;
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const savedContent = doc.querySelector('.paper');

            if (savedContent) {
                editor.innerHTML = savedContent.innerHTML;
            } else {
                editor.innerHTML = doc.body.innerHTML;
            }
        };
        reader.readAsText(file);
        fileInput.value = '';
    });

    editor.focus();

    document.querySelector('.toolbar').addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('select')) {
            e.preventDefault();
        }
    });

    // Link Bubble Elements
    const linkBubble = document.getElementById('link-bubble');
    const bubbleUrl = document.getElementById('bubble-url');
    const btnCopyLink = document.getElementById('btn-copy-link');
    const btnEditLink = document.getElementById('btn-edit-link');
    const btnUnlink = document.getElementById('btn-unlink');
    let currentLink = null;

    // Position and show bubble
    const showBubble = (link) => {
        currentLink = link;
        bubbleUrl.href = link.href;
        bubbleUrl.textContent = link.href;

        const rect = link.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        linkBubble.style.display = 'flex';

        // Position above the link
        const bubbleRect = linkBubble.getBoundingClientRect();
        linkBubble.style.left = `${rect.left + scrollX + (rect.width / 2) - (bubbleRect.width / 2)}px`;
        linkBubble.style.top = `${rect.top + scrollY - bubbleRect.height - 10}px`;
    };

    const hideBubble = () => {
        linkBubble.style.display = 'none';
        currentLink = null;
    };

    // Handle clicks in editor for link detection
    editor.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link) {
            if (e.ctrlKey) {
                // Ctrl + Click opens link directly
                e.preventDefault();
                window.open(link.href, '_blank');
                hideBubble();
            } else {
                // Regular click shows bubble
                showBubble(link);
            }
        } else {
            hideBubble();
        }
    });

    // Bubble Action Handlers
    btnCopyLink.addEventListener('click', () => {
        if (currentLink) {
            navigator.clipboard.writeText(currentLink.href).then(() => {
                const originalTitle = btnCopyLink.title;
                btnCopyLink.title = 'Скопировано!';
                setTimeout(() => btnCopyLink.title = originalTitle, 2000);
            });
        }
    });

    btnEditLink.addEventListener('click', () => {
        if (currentLink) {
            const newUrl = prompt('Изменить URL:', currentLink.href);
            if (newUrl && newUrl !== currentLink.href) {
                let finalUrl = newUrl;
                if (!/^https?:\/\//i.test(finalUrl)) {
                    finalUrl = 'https://' + finalUrl;
                }
                currentLink.href = finalUrl;
                bubbleUrl.href = finalUrl;
                bubbleUrl.textContent = finalUrl;
            }
        }
    });

    btnUnlink.addEventListener('click', () => {
        if (currentLink) {
            const parent = currentLink.parentNode;
            while (currentLink.firstChild) {
                parent.insertBefore(currentLink.firstChild, currentLink);
            }
            parent.removeChild(currentLink);
            hideBubble();
        }
    });

    // Autolink logic
    editor.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            if (!range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) return;

            const textNode = range.startContainer;
            const text = textNode.textContent.substring(0, range.startOffset);

            // Regex to find URL at the end of the text before cursor
            const urlMatch = text.match(/(https?:\/\/[^\s]+)$/i);

            if (urlMatch) {
                const url = urlMatch[1];
                const startOffset = range.startOffset - url.length;

                // Create a new range for the URL part
                const urlRange = document.createRange();
                urlRange.setStart(textNode, startOffset);
                urlRange.setEnd(textNode, range.startOffset);

                // Create the link
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.appendChild(urlRange.extractContents());
                urlRange.insertNode(link);

                // Move cursor after the link/space
                selection.removeAllRanges();
                const newRange = document.createRange();

                e.preventDefault();
                const spacer = document.createTextNode(e.key === ' ' ? '\u00A0' : '\n');
                link.parentNode.insertBefore(spacer, link.nextSibling);

                newRange.setStartAfter(spacer);
                newRange.collapse(true);
                selection.addRange(newRange);
            }
        }
    });

    // Hide bubble when scrolling or clicking outside
    window.addEventListener('scroll', hideBubble);
    document.addEventListener('mousedown', (e) => {
        if (!linkBubble.contains(e.target) && !editor.contains(e.target)) {
            hideBubble();
        }
    });
});
