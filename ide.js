document.addEventListener('DOMContentLoaded', function() {
    window.editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'python',
        theme: 'dracula',
        lineNumbers: true,
        autoCloseBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        lineWrapping: true,
        matchBrackets: true,
        fontFamily: "'JetBrains Mono', monospace"
    });

    loadCode();

    const runBtn = document.getElementById('run-btn');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const downloadBtn = document.getElementById('download-btn');
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('file-input');
    const filenameInput = document.getElementById('filename-input');
    const output = document.getElementById('output');

    filenameInput.addEventListener('input', function() {
        this.value = this.value.replace(/[\\/:*?"<>|]/g, '_');
    });

    setTimeout(function() {
        window.editor.refresh();
    }, 500);
    
    window.addEventListener('resize', function() {
        window.editor.refresh();
    });

    runBtn.addEventListener('click', async () => {
        const code = editor.getValue();
        output.textContent = 'Running...';

        try {
            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: getCode()
            });

            const data = await response.json();
            output.textContent = data.run.output || data.message;
        } catch (error) {
            output.textContent = 'Error: Failed to execute code. Please try again.';
        }
    });

    clearBtn.addEventListener('click', () => {
        editor.setValue('');
        output.textContent = '';
    });
    
    saveBtn.addEventListener('click', () => {
        saveCode();
    });
    
    downloadBtn.addEventListener('click', () => {
        downloadCode();
    });
    
    importBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const content = e.target.result;
                editor.setValue(content);
                
                // Update the filename input with the imported filename
                const fileName = file.name;
                filenameInput.value = fileName;
                
                // Show a notification
                showNotification('File imported successfully!', '#ffb86c');
            };
            
            reader.onerror = function() {
                showNotification('Error reading file!', '#ff5555');
            };
            
            reader.readAsText(file);
        }
        
        // Reset the file input so the same file can be selected again
        fileInput.value = '';
    });
});

function getCode(){
    const code = editor.getValue();
    return JSON.stringify({
        language: 'python',
        version: '3.10',
        files: [{
            content: code
        }]
    });
}

const STORAGEKEY = "python_code";
function saveCode() {
    const code = editor.getValue();
    localStorage.setItem(STORAGEKEY, JSON.stringify({
        files: [{
            content: code
        }]
    }));
    
    showNotification('Code saved successfully!', '#50fa7b');
}

function showNotification(message, backgroundColor) {
    const notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.textContent = message;
    notification.style.backgroundColor = backgroundColor;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 2000);
}

function loadCode() {
    const saved = localStorage.getItem(STORAGEKEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            const code = parsed.files?.[0]?.content || "";
            editor.setValue(code);
        } catch (e) {
            console.error("Failed to load saved code: ", e);
        }
    }
}

function downloadCode() {
    const code = editor.getValue();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    let filename = document.getElementById('filename-input').value.trim();
    
    if (!filename) {
        filename = 'code.py';
    } else if (!filename.toLowerCase().endsWith('.py')) {
        filename += '.py';
    }
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

window.addEventListener("beforeunload", () => {
    saveCode();
});

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCode();
    }
});
