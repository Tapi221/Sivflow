```javascript
let folders = [];
let currentFolder = null;

function loadFolders() {
    const folderList = document.getElementById('folder-list');
    folderList.innerHTML = '';
    
    folders.forEach((folder, index) => {
        const li = document.createElement('li');
        li.textContent = folder;
        li.draggable = true;
        li.dataset.index = index;
        
        // ドラッグ開始
        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
            li.classList.add('dragging');
        });
        
        // ドラッグ終了
        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
        });
        
        // ドラッグオーバー
        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const draggingElement = document.querySelector('.dragging');
            if (draggingElement && draggingElement !== li) {
                const rect = li.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                if (e.clientY < midpoint) {
                    li.parentNode.insertBefore(draggingElement, li);
                } else {
                    li.parentNode.insertBefore(draggingElement, li.nextSibling);
                }
            }
        });
        
        // ドロップ
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = Array.from(folderList.children).indexOf(li);
            
            if (fromIndex !== toIndex) {
                // フォルダ配列を並べ替え
                const [movedFolder] = folders.splice(fromIndex, 1);
                const newIndex = Array.from(folderList.children).findIndex(child => 
                    child.textContent === folder
                );
                folders.splice(newIndex, 0, movedFolder);
                
                // 順序を保存
                saveFolderOrder();
                loadFolders();
            }
        });
        
        li.addEventListener('click', () => selectFolder(folder));
        folderList.appendChild(li);
    });
}

// フォルダの順序を保存
function saveFolderOrder() {
    localStorage.setItem('folderOrder', JSON.stringify(folders));
}

// フォルダの順序を復元
function loadFolderOrder() {
    const savedOrder = localStorage.getItem('folderOrder');
    if (savedOrder) {
        const orderedFolders = JSON.parse(savedOrder);
        // 保存された順序に従ってフォルダを並べ替え
        const newFolders = [];
        orderedFolders.forEach(folderName => {
            if (folders.includes(folderName)) {
                newFolders.push(folderName);
            }
        });
        // 新しく追加されたフォルダを末尾に追加
        folders.forEach(folder => {
            if (!newFolders.includes(folder)) {
                newFolders.push(folder);
            }
        });
        folders = newFolders;
    }
}

window.api.getFolders().then(folderList => {
    folders = folderList;
    loadFolderOrder();
    loadFolders();
});

function addFolder() {
    const folderName = document.getElementById('new-folder-name').value.trim();
    if (folderName && !folders.includes(folderName)) {
        window.api.addFolder(folderName).then(() => {
            folders.push(folderName);
            saveFolderOrder();
            loadFolders();
            document.getElementById('new-folder-name').value = '';
        });
    }
}
```