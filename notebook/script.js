document.addEventListener('DOMContentLoaded', () => {
    // State management
    let documents = JSON.parse(localStorage.getItem('notebook_docs')) || [];
    let activeDocId = null;

    // DOM Elements
    const docListEl = document.getElementById('doc-list');
    const addBtn = document.getElementById('add-btn');
    const exportBtn = document.getElementById('export-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const titleInput = document.getElementById('doc-title-input');
    const contentInput = document.getElementById('doc-content-input');
    const noSelectionEl = document.getElementById('no-selection');
    const activeEditorEl = document.getElementById('active-editor');

    const importBtn = document.getElementById('import-btn');

    // Initialize
    renderDocList();

    // Event Listeners
    addBtn.addEventListener('click', createNewDoc);
    deleteBtn.addEventListener('click', deleteActiveDoc);
    exportBtn.addEventListener('click', exportToTxt);
    importBtn.addEventListener('click', importFromTxt);

    titleInput.addEventListener('input', () => {
        updateActiveDoc('title', titleInput.value);
    });

    contentInput.addEventListener('input', () => {
        updateActiveDoc('content', contentInput.value);
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
            // Добавляем после родителя или в конец (для простоты в конец массива, 
            // но при рендеринге дерево соберется правильно)
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
            contentInput.value = doc.content;

            noSelectionEl.classList.add('hidden');
            activeEditorEl.classList.remove('hidden');

            renderDocList();
        }
    }

    function updateActiveDoc(field, value) {
        const docIndex = documents.findIndex(d => d.id === activeDocId);
        if (docIndex !== -1) {
            documents[docIndex][field] = value;
            documents[docIndex].updatedAt = new Date().toISOString();
            saveToLocalStorage();
            // Для иерархии лучше делать полный рендер или точечно обновлять span
            const item = docListEl.querySelector(`[data-id="${activeDocId}"]`);
            if (item && field === 'title') {
                item.querySelector('.title').textContent = value || 'Без заголовка';
            }
        }
    }

    function deleteActiveDoc() {
        if (!activeDocId) return;

        const hasChildren = documents.some(d => d.parentId === activeDocId);
        const msg = hasChildren
            ? 'Этот документ содержит подзаметки. Удаление приведет к удалению всей ветки. Продолжить?'
            : 'Вы уверены, что хотите удалить этот документ?';

        if (confirm(msg)) {
            const idsToDelete = getAllChildIds(activeDocId);
            idsToDelete.push(activeDocId);

            documents = documents.filter(d => !idsToDelete.includes(d.id));
            activeDocId = null;

            activeEditorEl.classList.add('hidden');
            noSelectionEl.classList.remove('hidden');

            saveAndRender();
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

            // Обработчики кликов
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

    async function exportToTxt() {
        if (documents.length === 0) {
            alert('Нет документов для экспорта');
            return;
        }

        let exportText = '--- ЭКСПОРТ ВСЕХ ЗАМЕТОК ---\r\n\r\n';

        function exportNodes(nodes, level) {
            nodes.forEach(doc => {
                const indent = '  '.repeat(level);
                exportText += `${indent}ЗАГОЛОВОК: ${doc.title}\r\n`;
                exportText += `${indent}ДАТА: ${new Date(doc.updatedAt).toLocaleString('ru-RU')}\r\n`;
                // Содержание экспортируем без отступов для удобства чтения, 
                // но заголовок служит маркером начала нового документа
                exportText += `${indent}СОДЕРЖАНИЕ:\r\n${doc.content}\r\n`;
                exportText += `\r\n${'='.repeat(30)}\r\n\r\n`;

                const children = documents.filter(d => d.parentId === doc.id);
                if (children.length > 0) {
                    exportNodes(children, level + 1);
                }
            });
        }

        const roots = documents.filter(d => !d.parentId);
        exportNodes(roots, 0);

        const filename = `notebook_export_${new Date().toISOString().split('T')[0]}.txt`;

        // Используем File System Access API для показа диалога "Сохранить как"
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Текстовые файлы',
                        accept: { 'text/plain': ['.txt'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(exportText);
                await writable.close();
                alert('Файл успешно сохранён!');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Ошибка сохранения:', err);
                    alert('Ошибка при сохранении файла');
                }
            }
        } else {
            // Фолбэк для браузеров без поддержки File System Access API
            alert('Ваш браузер не поддерживает диалог сохранения. Попробуйте Chrome или Edge.');
        }
    }

    function importFromTxt() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.txt';

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target.result;
                parseAndImport(content);
            };
            reader.readAsText(file);
        };

        fileInput.click();
    }

    function parseAndImport(text) {
        try {
            // Убираем заголовок экспорта (учитываем разные переносы строк)
            const cleanText = text.replace(/--- ЭКСПОРТ ВСЕХ ЗАМЕТОК ---[\r\n]*/, '');

            // Разделяем документы по разделителю '=' (минимум 10 знаков равно для надежности)
            // Используем жадный поиск разделителей
            const docSections = cleanText.split(/={10,}/);
            const importedDocs = [];
            const levelStack = []; // Стек родительских ID для отслеживания иерархии

            docSections.forEach(section => {
                const lines = section.split(/[\r\n]+/);
                let titleLine = '';
                let titleLineIndex = -1;

                // Находим строку с заголовком и определяем уровень отступа
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('ЗАГОЛОВОК:')) {
                        titleLine = lines[i];
                        titleLineIndex = i;
                        break;
                    }
                }

                if (titleLineIndex !== -1) {
                    const indentMatch = titleLine.match(/^(\s*)/);
                    const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;
                    const title = titleLine.replace(/.*ЗАГОЛОВОК:\s*/, '').trim();

                    // Ищем дату
                    let dateStr = '';
                    for (let i = titleLineIndex + 1; i < lines.length; i++) {
                        if (lines[i].includes('ДАТА:')) {
                            dateStr = lines[i].replace(/.*ДАТА:\s*/, '').trim();
                            break;
                        }
                    }

                    // Ищем содержание (все что после строки СОДЕРЖАНИЕ до конца секции)
                    let noteContent = '';
                    const contentStartIdx = section.indexOf('СОДЕРЖАНИЕ:');
                    if (contentStartIdx !== -1) {
                        const contentPart = section.substring(contentStartIdx + 11);
                        noteContent = contentPart.trim();
                    }

                    let parsedDate = new Date();
                    if (dateStr) {
                        const attemptDate = new Date(dateStr.replace(/(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6'));
                        if (!isNaN(attemptDate.getTime())) {
                            parsedDate = attemptDate;
                        }
                    }

                    const newId = (Date.now() + importedDocs.length).toString();

                    // Определяем parentId на основе стека уровней
                    while (levelStack.length > indentLevel) {
                        levelStack.pop();
                    }
                    const parentId = levelStack.length > 0 ? levelStack[levelStack.length - 1] : null;

                    importedDocs.push({
                        id: newId,
                        title: title || 'Безымянная заметка',
                        content: noteContent,
                        updatedAt: parsedDate.toISOString(),
                        parentId: parentId,
                        expanded: true
                    });

                    // Добавляем текущий ID в стек для возможных детей
                    levelStack[indentLevel] = newId;
                }
            });

            if (importedDocs.length > 0) {
                if (confirm(`Найдено ${importedDocs.length} заметок. ВНИМАНИЕ: Все текущие заметки будут удалены и заменены на импортированные. Продолжить?`)) {
                    // Очищаем текущие и устанавливаем новые
                    documents = [...importedDocs];

                    // Сбрасываем активный документ, чтобы не возникло ошибок отображения
                    activeDocId = null;
                    activeEditorEl.classList.add('hidden');
                    noSelectionEl.classList.remove('hidden');

                    saveAndRender();
                    alert('Импорт успешно завершен! Текущие заметки заменены на заметки из файла.');
                }
            } else {
                alert('Не удалось найти заметки в файле. Убедитесь, что файл был экспортирован из этого приложения.');
            }
        } catch (error) {
            console.error('Ошибка при парсинге файла:', error);
            alert('Произошла ошибка при обработке файла. Проверьте консоль для деталей.');
        }
    }
});
