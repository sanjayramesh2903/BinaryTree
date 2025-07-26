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
    const inputContainer = document.getElementById('input-container');
    const userInput = document.getElementById('user-input');
    const submitInput = document.getElementById('submit-input');

    // Global variables for execution state
    let isWaitingForInput = false;
    let currentInputPrompt = '';
    let userInputs = [];
    let executionContext = null;

    filenameInput.addEventListener('input', function() {
        this.value = this.value.replace(/[\\/:*?"<>|]/g, '_');
    });

    setTimeout(function() {
        window.editor.refresh();
    }, 500);
    
    window.addEventListener('resize', function() {
        window.editor.refresh();
    });

    // Handle input submission
    submitInput.addEventListener('click', submitUserInput);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitUserInput();
        }
    });

    function submitUserInput() {
        if (!isWaitingForInput) return;
        
        const inputValue = userInput.value;
        userInput.value = '';
        
        // Display the input in the output
        output.textContent += inputValue + '\n';
        
        // Hide input container
        inputContainer.style.display = 'none';
        isWaitingForInput = false;
        
        // Store the input and continue execution
        userInputs.push(inputValue);
        continueExecution();
    }

    function showInputPrompt(prompt = '') {
        if (prompt && !output.textContent.endsWith(prompt)) {
            output.textContent += prompt;
        }
        inputContainer.style.display = 'flex';
        userInput.focus();
        isWaitingForInput = true;
    }

    function hideInputPrompt() {
        inputContainer.style.display = 'none';
        isWaitingForInput = false;
    }

    function extractInputPrompts(code) {
        // Extract input() statements and their prompts
        const inputPattern = /input\s*\(\s*["']([^"']*)["']\s*\)|input\s*\(\s*\)/g;
        const prompts = [];
        let match;
        
        while ((match = inputPattern.exec(code)) !== null) {
            prompts.push(match[1] || '');
        }
        
        return prompts;
    }

    async function continueExecution() {
        if (!executionContext) return;
        
        try {
            // Execute with all collected inputs
            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    language: 'python',
                    version: '3.10',
                    files: [{
                        content: executionContext.code
                    }],
                    stdin: userInputs.join('\n') + '\n'
                })
            });

            const data = await response.json();
            
            if (data.run.output) {
                const outputText = data.run.output;
                
                // Count how many inputs we've provided vs how many are needed
                const expectedInputs = executionContext.expectedInputs || 0;
                
                if (userInputs.length < expectedInputs) {
                    // Still need more inputs
                    const currentPrompt = executionContext.prompts[userInputs.length] || '';
                    
                    // Clear and show current output up to this point
                    const lines = outputText.split('\n');
                    const relevantOutput = lines.slice(0, userInputs.length + 1).join('\n');
                    
                    if (!output.textContent.includes(relevantOutput)) {
                        output.textContent = relevantOutput;
                    }
                    
                    showInputPrompt(currentPrompt);
                } else {
                    // All inputs provided, show final output
                    output.textContent = outputText;
                    executionContext = null;
                    userInputs = [];
                }
            } else if (data.run.stderr) {
                output.textContent += '\nError: ' + data.run.stderr;
                executionContext = null;
                userInputs = [];
                hideInputPrompt();
            }
        } catch (error) {
            output.textContent += '\nError: Failed to execute code.';
            executionContext = null;
            userInputs = [];
            hideInputPrompt();
        }
    }

    async function executeWithInteractiveInput(code) {
        output.textContent = '';
        hideInputPrompt();
        userInputs = [];
        
        // Check if code contains input() statements
        const prompts = extractInputPrompts(code);
        
        if (prompts.length === 0) {
            // No input needed, execute normally
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
                output.textContent = data.run.output || data.run.stderr || data.message || 'No output';
            } catch (error) {
                output.textContent = 'Error: Failed to execute code.';
            }
            return;
        }
        
        // Code has input statements
        executionContext = {
            code: code,
            prompts: prompts,
            expectedInputs: prompts.length
        };
        
        // Start with the first input prompt
        const firstPrompt = prompts[0] || '';
        showInputPrompt(firstPrompt);
    }

    runBtn.addEventListener('click', async () => {
        const code = editor.getValue();
        await executeWithInteractiveInput(code);
    });

    clearBtn.addEventListener('click', () => {
        editor.setValue('');
        output.textContent = '';
        hideInputPrompt();
        executionContext = null;
        userInputs = [];
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
