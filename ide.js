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
    
    const notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.textContent = 'Code saved successfully!';
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
