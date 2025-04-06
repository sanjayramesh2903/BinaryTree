const API_KEY = 'AIzaSyDE7HRRYAVnLkozDFj9j33TZL3305mv3FU';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    let isProcessing = false;

    // Configure marked.js
    marked.setOptions({
        highlight: function(code, language) {
            return hljs.highlight(code, {language: language || 'plaintext'}).value;
        },
        breaks: true
    });

    async function sendMessage() {
        if (isProcessing) return;

        const message = userInput.value.trim();
        if (!message) return;

        appendMessage('user', message);
        userInput.value = '';
        const loadingDiv = appendMessage('assistant', 'Thinking...');
        
        isProcessing = true;
        sendButton.disabled = true;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a friendly and patient programming teacher who explains concepts in a clear, concise way. Your responses should be:
                            - Straightforward and easy to understand
                            - Focused on practical examples when relevant
                            - Brief but informative
                            - Encouraging for beginners
                            
                            Student's question: ${message}`
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`API error: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log('API Response:', data); // For debugging

            // Updated response format handling
            let aiResponse;
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                aiResponse = data.candidates[0].content.parts.map(part => part.text).join('');
            } else {
                throw new Error('Unexpected API response format');
            }

            // Format the response with marked
            const formattedResponse = marked.parse(aiResponse);
            loadingDiv.innerHTML = formattedResponse;

            // Apply syntax highlighting
            loadingDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });

        } catch (error) {
            console.error('Error:', error);
            loadingDiv.textContent = `Error: ${error.message}`;
            
            if (error.message.includes('Rate limit')) {
                const retryButton = document.createElement('button');
                retryButton.textContent = 'Retry';
                retryButton.className = 'retry-button';
                retryButton.onclick = () => {
                    loadingDiv.parentElement.remove();
                    sendMessage();
                };
                loadingDiv.appendChild(retryButton);
            }
        } finally {
            isProcessing = false;
            sendButton.disabled = false;
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function appendMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        return contentDiv;
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}); 