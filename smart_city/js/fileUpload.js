// Enhanced File Upload System
let selectedFiles = [];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

// Initialize file upload system
function initFileUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileItems = document.getElementById('fileItems');

    if (!dropZone || !fileInput) return;

    // Click to browse
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });
}

// Handle file selection
function handleFileSelect(e) {
    handleFiles(e.target.files);
}

// Handle files (both from input and drag-drop)
function handleFiles(files) {
    const fileList = document.getElementById('fileList');
    const fileItems = document.getElementById('fileItems');

    // Check file count limit
    if (selectedFiles.length + files.length > MAX_FILES) {
        showUploadError(`Maximum ${MAX_FILES} files allowed. You already have ${selectedFiles.length} selected.`);
        return;
    }

    // Process each file
    Array.from(files).forEach(file => {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            showUploadError(`File "${file.name}" exceeds 10MB limit.`);
            return;
        }

        // Check for duplicates
        if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            showUploadError(`File "${file.name}" is already selected.`);
            return;
        }

        // Add to selected files
        selectedFiles.push({
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            id: Date.now() + Math.random()
        });
    });

    updateFileDisplay();
}

// Update file display
function updateFileDisplay() {
    const fileList = document.getElementById('fileList');
    const fileItems = document.getElementById('fileItems');

    if (selectedFiles.length === 0) {
        fileList.style.display = 'none';
        fileItems.innerHTML = '';
        return;
    }

    fileList.style.display = 'block';
    
    fileItems.innerHTML = selectedFiles.map(file => {
        const icon = getFileIcon(file.type);
        const sizeText = formatFileSize(file.size);
        
        return `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-info">
                    <div class="file-icon ${icon.class}">${icon.emoji}</div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${sizeText}</div>
                    </div>
                </div>
                <button class="file-remove" onclick="removeFile(${file.id})">×</button>
            </div>
        `;
    }).join('');
}

// Get file icon based on type
function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) {
        return { emoji: '🖼️', class: 'image' };
    } else if (mimeType.startsWith('video/')) {
        return { emoji: '🎥', class: 'video' };
    } else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('application/msword') || mimeType.includes('application/vnd.openxmlformats-officedocument')) {
        return { emoji: '📄', class: 'document' };
    } else {
        return { emoji: '📎', class: 'other' };
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Remove file
function removeFile(fileId) {
    selectedFiles = selectedFiles.filter(file => file.id !== fileId);
    updateFileDisplay();
}

// Show upload error
function showUploadError(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.innerHTML = `❌ ${message}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #ef4444;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-weight: 600;
        box-shadow: 0 5px 20px rgba(239, 68, 68, 0.3);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Get files for form submission
function getSelectedFiles() {
    return selectedFiles.map(item => item.file);
}

// Clear all selected files
function clearSelectedFiles() {
    selectedFiles = [];
    updateFileDisplay();
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initFileUpload();
});
