document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const btnBold = document.getElementById('btn-bold');
    const btnItalic = document.getElementById('btn-italic');
    const btnUnderline = document.getElementById('btn-underline');
    const btnImage = document.getElementById('btn-image');
    const btnPrint = document.getElementById('btn-print');
    const imageInput = document.getElementById('image-input');

    // Rich Text Commands
    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        editor.focus();
    };

    btnBold.addEventListener('click', () => execCommand('bold'));
    btnItalic.addEventListener('click', () => execCommand('italic'));
    btnUnderline.addEventListener('click', () => execCommand('underline'));
    document.getElementById('btn-link').addEventListener('click', () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            // ВАЖНО: Сохраняем range ДО вызова prompt, т.к. prompt сбрасывает выделение
            const savedRange = selection.getRangeAt(0).cloneRange();

            let url = prompt('Введите URL:', 'https://');

            if (url && url !== 'https://') {
                // Добавляем протокол если его нет
                if (!/^https?:\/\//i.test(url)) {
                    url = 'https://' + url;
                }

                // Восстанавливаем выделение
                selection.removeAllRanges();
                selection.addRange(savedRange);

                // Создаём ссылку вручную (более надежно чем execCommand)
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.appendChild(savedRange.extractContents());
                savedRange.insertNode(link);

                // Перемещаем курсор после ссылки
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.setStartAfter(link);
                newRange.collapse(true);
                selection.addRange(newRange);

                editor.focus();
            }
        } else {
            alert('Пожалуйста, сначала выделите текст, который хотите сделать ссылкой.');
        }
    });
    document.getElementById('btn-clear').addEventListener('click', () => execCommand('removeFormat'));

    // Heading Commands
    document.getElementById('btn-h1').addEventListener('click', () => execCommand('formatBlock', 'H1'));
    document.getElementById('btn-h2').addEventListener('click', () => execCommand('formatBlock', 'H2'));
    document.getElementById('btn-h3').addEventListener('click', () => execCommand('formatBlock', 'H3'));

    // Alignment Commands
    document.getElementById('btn-left').addEventListener('click', () => execCommand('justifyLeft'));
    document.getElementById('btn-center').addEventListener('click', () => execCommand('justifyCenter'));
    document.getElementById('btn-right').addEventListener('click', () => execCommand('justifyRight'));

    // Line Height Handling
    document.getElementById('select-line-height').addEventListener('change', (e) => {
        const height = e.target.value;
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);

            // Helper to get all block elements within the range
            const getSelectedBlocks = () => {
                const blocks = new Set();
                let container = range.commonAncestorContainer;
                if (container.nodeType !== 1) container = container.parentNode;

                // Find all elements that might be blocks and intersect the range
                const allElements = container.querySelectorAll('*');
                allElements.forEach(el => {
                    if (['P', 'DIV', 'H1', 'H2', 'H3', 'LI'].includes(el.tagName)) {
                        if (selection.containsNode(el, true)) {
                            blocks.add(el);
                        }
                    }
                });

                // Also check if the container itself is a block and contains the selection
                let parent = container;
                while (parent && parent !== editor) {
                    if (['P', 'DIV', 'H1', 'H2', 'H3', 'LI'].includes(parent.tagName)) {
                        blocks.add(parent);
                        break;
                    }
                    parent = parent.parentNode;
                }

                return blocks;
            };

            const targetBlocks = getSelectedBlocks();
            if (targetBlocks.size > 0) {
                targetBlocks.forEach(block => {
                    block.style.lineHeight = height;
                });
            } else {
                // Fallback: if no blocks found, maybe wrap text or (if editor is empty/simple) apply to editor
                // but usually there will be at least the editor's direct children
                if (editor.innerHTML.trim() !== "") {
                    // Add a block if it's just loose text? document.execCommand handles this usually
                }
            }
        }
    });

    // Image Handling
    btnImage.addEventListener('click', () => {
        imageInput.click();
    });

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
        // Clear input so same file can be selected again
        imageInput.value = '';
    });

    // PDF Save Handling
    btnPrint.addEventListener('click', async () => {
        console.log('Начинается генерация PDF...');
        const originalText = btnPrint.innerHTML;
        btnPrint.innerHTML = '<span>Подготовка...</span>';
        btnPrint.disabled = true;

        const element = document.getElementById('editor');
        const opt = {
            margin: [10, 10, 10, 10],
            filename: 'document.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            // Генерируем PDF как Blob
            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');

            // Используем File System Access API как в Notebook
            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'document.pdf',
                    types: [{
                        description: 'PDF Document',
                        accept: { 'application/pdf': ['.pdf'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(pdfBlob);
                await writable.close();
                console.log('PDF успешно сохранен через диалог');
            } else {
                // Фолбэк на обычное скачивание, если API не поддерживается
                html2pdf().set(opt).from(element).save();
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Ошибка при сохранении PDF:', err);
                // Если диалог не сработал (например, запуск через file://), пробуем обычный save
                html2pdf().set(opt).from(element).save();
            }
        } finally {
            btnPrint.innerHTML = originalText;
            btnPrint.disabled = false;
        }
    });

    // Auto-focus editor on start
    editor.focus();

    // Prevent losing focus on toolbar clicks
    document.querySelector('.toolbar').addEventListener('mousedown', (e) => {
        // Only prevent default if we're clicking a button or its child
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

                // If it's a space, we want the cursor to be after the space that will be inserted
                // But the space hasn't been inserted yet because we are in keydown.
                // It's better to let the default action happen OR insert the space manually.
                // Let's insert the space/enter manually and prevent default to have full control.

                e.preventDefault();
                const spacer = document.createTextNode(e.key === ' ' ? '\u00A0' : '\n');
                link.parentNode.insertBefore(spacer, link.nextSibling);

                if (e.key === 'Enter') {
                    // For Enter in contentEditable, usually we want a new block
                    // But for simplicity let's just insert a line break or let default happen.
                    // Actually, simple insertNode('\n') might not work well in all browsers for blocks.
                    // Let's just use a non-breaking space for ' ' and for Enter let's do a more complex wrap or reconsider.

                    // Re-evaluating: Just handle Space for now as it's the most common autolink trigger.
                    // If it's Enter, it's trickier.
                }

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
