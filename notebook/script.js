document.addEventListener('DOMContentLoaded', () => {
    // State management
    let documents = JSON.parse(localStorage.getItem('notebook_docs')) || [];
    let activeDocId = null;

    // DOM Elements
    const docListEl = document.getElementById('doc-list');
    const addBtn = document.getElementById('add-btn');
    const exportSelectedBtn = document.getElementById('export-selected-btn');
    const exportAllBtn = document.getElementById('export-all-btn');
    const importBtn = document.getElementById('import-btn');
    const titleInput = document.getElementById('doc-title-input');
    const editorEl = document.getElementById('doc-content-editor');
    const noSelectionEl = document.getElementById('no-selection');
    const activeEditorEl = document.getElementById('active-editor');
    const deleteBtn = document.getElementById('delete-btn');

    // Rich Text Buttons
    const btnBold = document.getElementById('btn-bold');
    const btnItalic = document.getElementById('btn-italic');
    const btnUnderline = document.getElementById('btn-underline');
    const btnLeft = document.getElementById('btn-left');
    const btnCenter = document.getElementById('btn-center');
    const btnRight = document.getElementById('btn-right');

    // Link Bubble Elements
    const linkBubble = document.getElementById('link-bubble');
    const bubbleUrl = document.getElementById('bubble-url');
    const btnCopyLink = document.getElementById('btn-copy-link');
    const btnEditLink = document.getElementById('btn-edit-link');
    const btnUnlink = document.getElementById('btn-unlink');
    let currentLink = null;

    // Initialize
    renderDocList();

    // Event Listeners
    addBtn.addEventListener('click', () => createNewDoc());
    // Direct listener for delete button
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteActiveDoc();
        });
    }

    function deleteActiveDoc() {
        console.log('Delete requested. Active ID:', activeDocId);

        if (!activeDocId) {
            console.warn('No active document ID');
            return;
        }

        const hasChildren = documents.some(d => d.parentId === activeDocId);
        const msg = hasChildren
            ? 'Этот документ содержит подзаметки. Удаление приведет к удалению всей ветки. Продолжить?'
            : 'Вы уверены, что хотите удалить этот документ?';

        showConfirmModal(msg, () => {
            const idsToDelete = getAllChildIds(activeDocId);
            idsToDelete.push(activeDocId);

            documents = documents.filter(d => !idsToDelete.includes(d.id));
            activeDocId = null;

            activeEditorEl.classList.add('hidden');
            noSelectionEl.classList.remove('hidden');

            saveAndRender();
            console.log('Deletion complete');
        });
    }

    // Custom Modal
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');
    let onConfirmCallback = null;

    function showConfirmModal(message, onConfirm) {
        confirmMessage.textContent = message;
        onConfirmCallback = onConfirm;
        confirmModal.classList.remove('hidden');
    }

    function hideConfirmModal() {
        confirmModal.classList.add('hidden');
        onConfirmCallback = null;
    }

    confirmYes.addEventListener('click', () => {
        if (onConfirmCallback) onConfirmCallback();
        hideConfirmModal();
    });
    confirmNo.addEventListener('click', hideConfirmModal);
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) hideConfirmModal();
    });
    exportSelectedBtn.addEventListener('click', exportSelectedToHtml);
    exportAllBtn.addEventListener('click', exportAllToHtml);
    importBtn.addEventListener('click', importFromHtml);

    titleInput.addEventListener('input', () => {
        updateActiveDoc('title', titleInput.value);
    });

    editorEl.addEventListener('input', () => {
        updateActiveDoc('content', editorEl.innerHTML);
    });

    // Rich Text Commands
    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        editorEl.focus();
    };

    btnBold.addEventListener('click', () => execCommand('bold'));
    btnItalic.addEventListener('click', () => execCommand('italic'));
    btnUnderline.addEventListener('click', () => execCommand('underline'));
    btnLeft.addEventListener('click', () => execCommand('justifyLeft'));
    btnCenter.addEventListener('click', () => execCommand('justifyCenter'));
    btnRight.addEventListener('click', () => execCommand('justifyRight'));

    // Prevent losing focus when clicking toolbar
    // Prevent losing focus when clicking toolbar (except for delete and export buttons)
    document.querySelector('.toolbar').addEventListener('mousedown', (e) => {
        const btn = e.target.closest('button');
        const allowedIds = ['delete-btn', 'export-selected-btn'];
        if (btn && !allowedIds.includes(btn.id) && !btn.id.startsWith('btn-copy') && !btn.id.startsWith('btn-edit')) {
            e.preventDefault();
        }
    });

    // Functions
    function createNewDoc(parentId = null) {
        const newDoc = {
            id: Date.now().toString(),
            title: parentId ? 'Новая подзаметка' : 'Новая заметка',
            content: '',
            updatedAt: new Date().toISOString(),
            parentId: parentId,
            expanded: true
        };

        if (parentId) {
            const parent = documents.find(d => d.id === parentId);
            if (parent) parent.expanded = true;
            documents.push(newDoc);
        } else {
            documents.unshift(newDoc);
        }

        saveAndRender();
        selectDoc(newDoc.id);
    }

    function selectDoc(id) {
        activeDocId = id;
        const doc = documents.find(d => d.id === id);

        if (doc) {
            titleInput.value = doc.title;
            editorEl.innerHTML = doc.content;

            noSelectionEl.classList.add('hidden');
            activeEditorEl.classList.remove('hidden');

            renderDocList();
            editorEl.focus();
        }
    }

    function updateActiveDoc(field, value) {
        const docIndex = documents.findIndex(d => d.id === activeDocId);
        if (docIndex !== -1) {
            documents[docIndex][field] = value;
            documents[docIndex].updatedAt = new Date().toISOString();
            saveToLocalStorage();

            const item = docListEl.querySelector(`[data-id="${activeDocId}"]`);
            if (item && field === 'title') {
                item.querySelector('.title').textContent = value || 'Без заголовка';
            }
        }
    }



    function getAllChildIds(parentId) {
        let childIds = [];
        const children = documents.filter(d => d.parentId === parentId);
        children.forEach(child => {
            childIds.push(child.id);
            childIds = childIds.concat(getAllChildIds(child.id));
        });
        return childIds;
    }

    function saveToLocalStorage() {
        localStorage.setItem('notebook_docs', JSON.stringify(documents));
    }

    function renderDocList() {
        docListEl.innerHTML = '';
        const roots = documents.filter(d => !d.parentId);
        renderTree(roots, 0);
    }

    function renderTree(items, level) {
        items.forEach(doc => {
            const children = documents.filter(d => d.parentId === doc.id);
            const hasChildren = children.length > 0;

            const item = document.createElement('div');
            item.className = `doc-item ${doc.id === activeDocId ? 'active' : ''} ${doc.expanded ? 'expanded' : ''} ${!hasChildren ? 'no-children' : ''}`;
            item.dataset.id = doc.id;
            item.style.paddingLeft = `${10 + (level * 20)}px`;

            item.innerHTML = `
                <span class="chevron">▶</span>
                <span class="title">${doc.title || 'Без заголовка'}</span>
                <button class="add-sub-btn" title="Добавить подзаметку">+</button>
            `;

            item.querySelector('.chevron').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleExpand(doc.id);
            });

            item.querySelector('.add-sub-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                createNewDoc(doc.id);
            });

            item.addEventListener('click', () => selectDoc(doc.id));
            docListEl.appendChild(item);

            if (hasChildren && doc.expanded) {
                renderTree(children, level + 1);
            }
        });
    }

    function toggleExpand(id) {
        const doc = documents.find(d => d.id === id);
        if (doc) {
            doc.expanded = !doc.expanded;
            saveAndRender();
        }
    }

    function saveAndRender() {
        saveToLocalStorage();
        renderDocList();
    }

    // --- Link Bubble Logic ---
    const showBubble = (link) => {
        currentLink = link;
        bubbleUrl.href = link.href;
        bubbleUrl.textContent = link.href;

        const rect = link.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        linkBubble.style.display = 'flex';
        const bubbleRect = linkBubble.getBoundingClientRect();
        linkBubble.style.left = `${rect.left + scrollX + (rect.width / 2) - (bubbleRect.width / 2)}px`;
        linkBubble.style.top = `${rect.top + scrollY - bubbleRect.height - 10}px`;
    };

    const hideBubble = () => {
        linkBubble.style.display = 'none';
        currentLink = null;
    };

    editorEl.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link) {
            if (e.ctrlKey) {
                e.preventDefault();
                window.open(link.href, '_blank');
                hideBubble();
            } else {
                showBubble(link);
            }
        } else {
            hideBubble();
        }
    });

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
                updateActiveDoc('content', editorEl.innerHTML);
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
            updateActiveDoc('content', editorEl.innerHTML);
        }
    });

    // Autolink logic
    editorEl.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            if (!range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) return;

            const textNode = range.startContainer;
            const text = textNode.textContent.substring(0, range.startOffset);
            const urlMatch = text.match(/(https?:\/\/[^\s]+)$/i);

            if (urlMatch) {
                const url = urlMatch[1];
                const startOffset = range.startOffset - url.length;
                const urlRange = document.createRange();
                urlRange.setStart(textNode, startOffset);
                urlRange.setEnd(textNode, range.startOffset);

                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.appendChild(urlRange.extractContents());
                urlRange.insertNode(link);

                selection.removeAllRanges();
                const newRange = document.createRange();
                e.preventDefault();
                const spacer = document.createTextNode(e.key === ' ' ? '\u00A0' : '\n');
                link.parentNode.insertBefore(spacer, link.nextSibling);
                newRange.setStartAfter(spacer);
                newRange.collapse(true);
                selection.addRange(newRange);
                updateActiveDoc('content', editorEl.innerHTML);
            }
        }
    });

    window.addEventListener('scroll', hideBubble);
    document.addEventListener('mousedown', (e) => {
        if (!linkBubble.contains(e.target) && !editorEl.contains(e.target)) {
            hideBubble();
        }
    });

    // --- HTML Export Logic ---
    const htmlTemplate = (title, content) => `
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
        .doc-divider { margin: 80px 0; border: none; border-top: 2px dashed #eee; display: none; }
    </style>
</head>
<body>
    <div class="paper">
        ${content}
    </div>
</body>
</html>`;

    async function saveFile(content, suggestedName) {
        try {
            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: suggestedName,
                    types: [{
                        description: 'HTML Document',
                        accept: { 'text/html': ['.html'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
            } else {
                const blob = new Blob([content], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = suggestedName;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Save failed:', err);
                alert('Не удалось сохранить файл.');
            }
        }
    }

    function exportSelectedToHtml() {
        if (!activeDocId) {
            alert('Выберите документ для экспорта');
            return;
        }
        const doc = documents.find(d => d.id === activeDocId);
        const fullContent = `<h1>${doc.title}</h1>${doc.content}`;
        const html = htmlTemplate(doc.title, fullContent);
        saveFile(html, `${doc.title || 'document'}.html`);
    }

    function exportAllToHtml() {
        if (documents.length === 0) {
            alert('Нет документов для экспорта');
            return;
        }

        let combinedContent = '';

        function processNodes(nodes, level) {
            nodes.forEach(doc => {
                const titleTag = level < 6 ? `h${level + 1}` : 'h6';
                combinedContent += `<div class="exported-doc" data-id="${doc.id}" data-parent-id="${doc.parentId || ''}" data-updated-at="${doc.updatedAt}">
                    <${titleTag}>${doc.title}</${titleTag}>
                    <p><small>Обновлено: ${new Date(doc.updatedAt).toLocaleString('ru-RU')}</small></p>
                    <div class="doc-body">${doc.content}</div>
                </div>`;

                const children = documents.filter(d => d.parentId === doc.id);
                if (children.length > 0) {
                    processNodes(children, level + 1);
                }
            });
        }

        const roots = documents.filter(d => !d.parentId);
        processNodes(roots, 0);

        const html = htmlTemplate('Все заметки', combinedContent);
        saveFile(html, `notebook_all_docs_${new Date().toISOString().split('T')[0]}.html`);
    }

    function importFromHtml() {
        const fileInput = document.getElementById('file-input');
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const html = event.target.result;
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Find all exported documents
                const exportedDocs = doc.querySelectorAll('.exported-doc');

                if (exportedDocs.length === 0) {
                    // Fallback for single document files (the old format or document app format)
                    const paperContent = doc.querySelector('.paper');
                    const content = paperContent ? paperContent.innerHTML : doc.body.innerHTML;
                    const title = doc.title || file.name.replace('.html', '');

                    showConfirmModal('Импортировать этот файл как новую заметку?', () => {
                        const newDoc = {
                            id: Date.now().toString(),
                            title: title,
                            content: content,
                            updatedAt: new Date().toISOString(),
                            parentId: null,
                            expanded: true
                        };
                        documents.unshift(newDoc);
                        saveAndRender();
                        selectDoc(newDoc.id);
                    });
                    return;
                }

                // Multiple documents found
                showConfirmModal('Это действие удалит текущие заметки и заменит их данными из файла. Продолжить?', () => {
                    documents = []; // Clear current session

                    exportedDocs.forEach((el, index) => {
                        const id = el.dataset.id || (Date.now() + index).toString();
                        const parentId = el.dataset.parentId || null;
                        const updatedAt = el.dataset.updatedAt || new Date().toISOString();
                        const titleEl = el.querySelector('h1, h2, h3, h4, h5, h6');
                        const title = titleEl ? titleEl.textContent : 'Без заголовка';
                        const bodyEl = el.querySelector('.doc-body');
                        const content = bodyEl ? bodyEl.innerHTML : el.innerHTML;

                        documents.push({
                            id: id,
                            title: title,
                            content: content,
                            updatedAt: updatedAt,
                            parentId: parentId === '' ? null : parentId,
                            expanded: true
                        });
                    });

                    saveAndRender();
                    if (documents.length > 0) {
                        selectDoc(documents[0].id);
                    }
                    alert('Импорт успешно завершен!');
                });
            };
            reader.readAsText(file);
        };
        fileInput.click();
    }
});
