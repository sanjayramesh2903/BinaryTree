document.addEventListener('DOMContentLoaded', function() {
    // Make editor globally accessible
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

    loadCode(); // Load the saved code here

    const runBtn = document.getElementById('run-btn');
    const clearBtn = document.getElementById('clear-btn');
    const output = document.getElementById('output');

    // Force a refresh after a short delay to ensure proper rendering
    setTimeout(function() {
        window.editor.refresh();
    }, 500);
    
    // Also refresh on window resize
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
});

function getCode(){
    const code = editor.getValue(); // This was missing in your getCode()
    return JSON.stringify({
        language: 'python',
        version: '3.10',
        files: [{
            content: code
        }]
    });
}

//Saving of the code on tab-close
const STORAGEKEY = "python_code";
function saveCode() {
    const code = getCode();
    localStorage.setItem(STORAGEKEY, code);
    alert("Code saved to localStorage!");
}

function loadCode() {
    const saved = localStorage.getItem(STORAGEKEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            const code = parsed.files?.[0]?.content || ""; //Fallback to not throw error as well
            editor.setValue(code);
        } catch (e) {
            alert("Failed to load saved code: ", e);
        }
    }
}

window.addEventListener("beforeunload", () => {
    saveCode();
});

document.addEventListener('keydown', function(e) {
    //Check if Ctrl+S or Cmd+S is pressed
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault(); //Prevent the browser's default save dialog
        saveCode();
    }
});
