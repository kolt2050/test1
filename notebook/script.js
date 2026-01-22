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
    function createNewDoc() {
        const newDoc = {
            id: Date.now().toString(),
            title: 'Новая заметка',
            content: '',
            updatedAt: new Date().toISOString()
        };
        documents.unshift(newDoc);
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
            updateListItem(activeDocId, field, value);
        }
    }

    function updateListItem(id, field, value) {
        const item = docListEl.querySelector(`[data-id="${id}"]`);
        if (item && field === 'title') {
            item.querySelector('.title').textContent = value || 'Без заголовка';
        }
    }

    function deleteActiveDoc() {
        if (!activeDocId) return;

        if (confirm('Вы уверены, что хотите удалить этот документ?')) {
            documents = documents.filter(d => d.id !== activeDocId);
            activeDocId = null;

            activeEditorEl.classList.add('hidden');
            noSelectionEl.classList.remove('hidden');

            saveAndRender();
        }
    }

    function saveToLocalStorage() {
        localStorage.setItem('notebook_docs', JSON.stringify(documents));
    }

    function renderDocList() {
        docListEl.innerHTML = '';
        documents.forEach(doc => {
            const item = document.createElement('div');
            item.className = `doc-item ${doc.id === activeDocId ? 'active' : ''}`;
            item.dataset.id = doc.id;

            item.innerHTML = `
                <span class="title">${doc.title || 'Без заголовка'}</span>
            `;

            item.addEventListener('click', () => selectDoc(doc.id));
            docListEl.appendChild(item);
        });
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
        documents.forEach(doc => {
            exportText += `ЗАГОЛОВОК: ${doc.title}\r\n`;
            exportText += `ДАТА: ${new Date(doc.updatedAt).toLocaleString('ru-RU')}\r\n`;
            exportText += `СОДЕРЖАНИЕ:\r\n${doc.content}\r\n`;
            exportText += `\r\n${'='.repeat(30)}\r\n\r\n`;
        });

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

            docSections.forEach(section => {
                const trimmedSection = section.trim();
                if (!trimmedSection) return;

                // Используем регулярные выражения с флагом 'm' (multiline) для поиска полей
                const titleMatch = trimmedSection.match(/^ЗАГОЛОВОК:\s*(.*)$/m);
                const dateMatch = trimmedSection.match(/^ДАТА:\s*(.*)$/m);

                // Ищем начало содержания
                const contentMatch = trimmedSection.match(/^СОДЕРЖАНИЕ:\s*([\s\S]*)$/m);

                if (titleMatch && contentMatch) {
                    const title = titleMatch[1].trim();
                    const noteContent = contentMatch[1].trim();

                    let parsedDate = new Date();
                    if (dateMatch) {
                        const dateStr = dateMatch[1].trim();
                        const attemptDate = new Date(dateStr);
                        if (!isNaN(attemptDate.getTime())) {
                            parsedDate = attemptDate;
                        }
                    }

                    importedDocs.push({
                        id: (Date.now() + importedDocs.length).toString(),
                        title: title || 'Безымянная заметка',
                        content: noteContent,
                        updatedAt: parsedDate.toISOString()
                    });
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
