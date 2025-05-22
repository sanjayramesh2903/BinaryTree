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
                body: JSON.stringify({
                    language: 'python',
                    version: '3.10',
                    files: [{
                        content: code
                    }]
                })
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
