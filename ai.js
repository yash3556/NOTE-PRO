let notes = JSON.parse(localStorage.getItem('notes')) || [];
let currentNoteId = null;
let currentNoteContent = '';

document.addEventListener('DOMContentLoaded', function() {
    loadNotesList();
    
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            openAIAssistant();
        }
    });
    
    document.getElementById('noteContent').addEventListener('input', updateWordCount);
});

function createNewNote() {
    const note = {
        id: Date.now(),
        title: 'Untitled Note',
        content: '',
        created: new Date().toLocaleString()
    };
    
    notes.push(note);
    saveNotesToStorage();
    loadNotesList();
    openNote(note.id);
}

function loadNotesList() {
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    
    notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = `note-item ${note.id === currentNoteId ? 'active' : ''}`;
        noteItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>${note.title}</strong>
                <small>${new Date(note.created).toLocaleDateString()}</small>
            </div>
            <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                ${note.content.substring(0, 30)}${note.content.length > 30 ? '...' : ''}
            </div>
        `;
        noteItem.onclick = () => openNote(note.id);
        notesList.appendChild(noteItem);
    });
}

function openNote(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        currentNoteId = note.id;
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        currentNoteContent = note.content;
        updateWordCount();
        loadNotesList();
    }
}

function saveNote() {
    if (!currentNoteId) {
        createNewNote();
    }
    
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
        note.title = document.getElementById('noteTitle').value || 'Untitled Note';
        note.content = document.getElementById('noteContent').value;
        note.updated = new Date().toLocaleString();
        
        saveNotesToStorage();
        loadNotesList();
        showNotification('Note saved successfully!');
    }
}

function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

function updateWordCount() {
    const content = document.getElementById('noteContent').value;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    document.getElementById('wordCount').textContent = `${words} words`;
}

function openAIAssistant() {
    document.getElementById('aiModal').style.display = 'flex';
    
    setTimeout(() => {
        document.getElementById('aiQuestion').focus();
    }, 100);
}

function closeAIAssistant() {
    document.getElementById('aiModal').style.display = 'none';
}

function sendToAI() {
    const question = document.getElementById('aiQuestion').value.trim();
    if (question) {
        processAIRequest(question);
        document.getElementById('aiQuestion').value = '';
    }
}

document.getElementById('aiQuestion').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendToAI();
    }
});

function askAI(action) {
    const currentNote = document.getElementById('noteContent').value;
    
    switch(action) {
        case 'improve notes':
            if (!currentNote.trim()) {
                processAIRequest('Generate study notes on a topic');
            } else {
                processAIRequest('Improve these notes with clear explanations, organize them better, and highlight key concepts: ' + currentNote);
            }
            break;
            
        case 'generate questions':
            if (!currentNote.trim()) {
                processAIRequest('Generate important exam questions on a popular study topic');
            } else {
                processAIRequest('Based on these notes, generate possible exam questions (short answer and long answer): ' + currentNote);
            }
            break;
            
        case 'summarize':
            if (!currentNote.trim()) {
                processAIRequest('Create a quick summary of how to study effectively');
            } else {
                processAIRequest('Create a short, clear summary of these notes for quick revision: ' + currentNote);
            }
            break;
            
        case 'explain concepts':
            if (!currentNote.trim()) {
                processAIRequest('Explain some key study techniques for students');
            } else {
                processAIRequest('Identify and explain the key concepts from these notes: ' + currentNote);
            }
            break;
    }
}

function enhanceWithAI() {
    const currentNote = document.getElementById('noteContent').value;
    if (currentNote.trim()) {
        processAIRequest('Improve these notes with clear explanations and better organization: ' + currentNote);
    } else {
        processAIRequest('Generate helpful study notes on a topic');
    }
}

function processAIRequest(prompt) {
    showLoading();
    
    setTimeout(() => {
        hideLoading();
        
        let response = '';
        
        if (prompt.includes('Improve these notes') || prompt.includes('improve notes')) {
            const originalNote = prompt.split(': ')[1] || '';
            response = generateImprovedNotes(originalNote);
        }
        else if (prompt.includes('generate questions')) {
            response = generateExamQuestions(prompt.split(': ')[1] || '');
        }
        else if (prompt.includes('summarize') || prompt.includes('summary')) {
            response = generateSummary(prompt.split(': ')[1] || '');
        }
        else if (prompt.includes('explain')) {
            response = explainConcepts(prompt.split(': ')[1] || '');
        }
        else if (prompt.includes('Generate study notes')) {
            response = generateStudyNotes();
        }
        else {
            response = answerQuestion(prompt);
        }
        
        displayAIResponse(response);
    }, 1500);
}

function generateImprovedNotes(originalContent) {
    if (!originalContent) {
        return `
            <div class="improved-notes">
                <h3>📘 Study Tips for Better Notes</h3>
                <p>To create effective study notes, try these techniques:</p>
                <ul>
                    <li><strong>Cornell Method:</strong> Divide your page into cues, notes, and summary sections</li>
                    <li><strong>Mind Mapping:</strong> Connect related concepts visually</li>
                    <li><strong>Outline Method:</strong> Use bullet points and indentation for organization</li>
                    <li><strong>Charting Method:</strong> Create tables to compare and contrast information</li>
                </ul>
                <p><strong>Pro Tip:</strong> Always review and revise your notes within 24 hours for better retention!</p>
            </div>
            
            <div class="key-points">
                <h3>📌 Key Points for Great Notes</h3>
                <ul>
                    <li>Use your own words - don't just copy</li>
                    <li>Focus on main ideas and key concepts</li>
                    <li>Add examples to clarify complex topics</li>
                    <li>Use colors and symbols for visual organization</li>
                    <li>Leave space for additional notes and questions</li>
                </ul>
            </div>
            
            <div class="quick-summary">
                <h3>📝 Quick Summary</h3>
                <p>Effective notes are personal, organized, and focused on understanding rather than transcribing. Choose a method that works for your learning style and subject matter!</p>
            </div>
        `;
    }
    
    return `
        <div class="improved-notes">
            <h3>📘 Improved Notes</h3>
            <p>${originalContent.substring(0, 100)}... [AI would enhance this with clear explanations and better structure]</p>
            <p><em>In a real implementation, this would contain properly formatted and enhanced version of your notes!</em></p>
        </div>
        
        <div class="key-points">
            <h3>📌 Key Concepts</h3>
            <ul>
                <li>Main concept 1 from your notes</li>
                <li>Main concept 2 from your notes</li>
                <li>Important definitions</li>
                <li>Critical relationships between ideas</li>
            </ul>
        </div>
        
        <div class="exam-questions">
            <h3>❓ Practice Questions</h3>
            <h4>Short Answer:</h4>
            <ul>
                <li>What are the main points discussed in these notes?</li>
                <li>Explain the relationship between key concepts.</li>
            </ul>
            <h4>Long Answer:</h4>
            <ul>
                <li>Analyze and evaluate the main ideas presented. How do they connect to real-world applications?</li>
            </ul>
        </div>
        
        <div class="quick-summary">
            <h3>📝 Quick Summary</h3>
            <p>Your notes cover important concepts. Remember to review regularly and create connections between ideas!</p>
        </div>
    `;
}

function generateExamQuestions(topic) {
    const subjects = {
        'math': 'Mathematics',
        'science': 'Science',
        'history': 'History',
        'literature': 'Literature',
        'programming': 'Programming'
    };
    
    return `
        <div class="exam-questions">
            <h3>❓ Exam Questions on ${topic || 'Your Topic'}</h3>
            
            <h4>📝 Short Answer Questions (2-3 marks each)</h4>
            <ol>
                <li>Define the main concept and provide an example.</li>
                <li>What are the key characteristics or components?</li>
                <li>Explain the significance in one paragraph.</li>
                <li>List and briefly describe the main types/categories.</li>
                <li>What is the relationship between X and Y in this topic?</li>
            </ol>
            
            <h4>📚 Long Answer Questions (5-10 marks each)</h4>
            <ol>
                <li>Analyze the topic in depth. Discuss its importance, applications, and implications. Provide examples to support your answer.</li>
                <li>Compare and contrast different aspects of this topic. How do they relate to each other and to real-world scenarios?</li>
                <li>Evaluate the impact or significance. Discuss pros and cons, challenges, and future directions.</li>
                <li>Create a detailed explanation that would help someone new understand this topic completely. Include diagrams in your description.</li>
            </ol>
            
            <h4>💡 Study Tips for This Topic</h4>
            <ul>
                <li>Create mind maps to visualize connections</li>
                <li>Practice with past exam papers</li>
                <li>Form study groups to discuss and debate concepts</li>
                <li>Teach the concept to someone else to ensure understanding</li>
            </ul>
        </div>
    `;
}

function generateSummary(content) {
    return `
        <div class="quick-summary">
            <h3>📝 Quick Revision Summary</h3>
            
            <p><strong>Main Idea:</strong> ${content ? content.substring(0, 50) + '...' : 'Focus on understanding core concepts rather than memorizing facts.'}</p>
            
            <div style="margin-top: 15px;">
                <h4>🎯 Key Takeaways:</h4>
                <ul>
                    <li>Focus on understanding, not just memorizing</li>
                    <li>Connect new information to what you already know</li>
                    <li>Use active recall and spaced repetition</li>
                    <li>Practice with examples and applications</li>
                </ul>
            </div>
            
            <div style="margin-top: 15px; background: #fff3cd; padding: 10px; border-radius: 5px;">
                <h4>⏰ 60-Second Summary:</h4>
                <p>${content ? 'Your notes cover important concepts. Review them within 24 hours for best retention!' : 'Effective learning = Understanding + Practice + Review + Application'}</p>
            </div>
            
            <p style="margin-top: 15px;"><strong>💪 Next Steps:</strong> Create practice questions, discuss with peers, or try to teach this to someone else!</p>
        </div>
    `;
}

function explainConcepts(content) {
    return `
        <div class="improved-notes">
            <h3>💡 Concept Explanation</h3>
            
            <div style="margin-bottom: 20px;">
                <h4>Simple Explanation:</h4>
                <p>Think of this concept like building blocks. Each part connects to create a bigger picture. Start with the basics, then build up to more complex ideas.</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4>Real-World Example:</h4>
                <p>Just like learning to ride a bike, you start with balance (basic concept), then add pedaling (application), and finally navigate traffic (complex scenarios).</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4>Common Mistakes to Avoid:</h4>
                <ul>
                    <li>❌ Rushing through without understanding basics</li>
                    <li>❌ Memorizing without understanding</li>
                    <li>❌ Not practicing with examples</li>
                    <li>❌ Skipping difficult parts</li>
                </ul>
            </div>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 5px;">
                <h4>✅ Learning Tips:</h4>
                <ul>
                    <li>Break it down into smaller parts</li>
                    <li>Use analogies and metaphors</li>
                    <li>Draw diagrams or mind maps</li>
                    <li>Explain it to someone else</li>
                </ul>
            </div>
        </div>
    `;
}

function generateStudyNotes() {
    return `
        <div class="improved-notes">
            <h3>📘 Effective Study Techniques</h3>
            
            <h4>The Pomodoro Technique</h4>
            <p>Study for 25 minutes, take a 5-minute break. After 4 cycles, take a longer 15-30 minute break. This maintains focus and prevents burnout.</p>
            
            <h4>Active Recall</h4>
            <p>Instead of re-reading, close your book and try to remember key points. This strengthens neural connections and improves long-term retention.</p>
            
            <h4>Spaced Repetition</h4>
            <p>Review material at increasing intervals: 1 day, 3 days, 1 week, 1 month. This moves information from short-term to long-term memory.</p>
        </div>
        
        <div class="key-points">
            <h3>📌 Study Tips That Work</h3>
            <ul>
                <li>🎯 Set specific goals for each study session</li>
                <li>📝 Take handwritten notes for better retention</li>
                <li>🗣️ Teach concepts to others</li>
                <li>🎨 Use visual aids and diagrams</li>
                <li>💤 Get enough sleep (7-9 hours)</li>
                <li>🚶 Take regular movement breaks</li>
            </ul>
        </div>
        
        <div class="exam-questions">
            <h3>❓ Self-Assessment Questions</h3>
            <ul>
                <li>What study technique works best for different types of material?</li>
                <li>How can I improve my focus during study sessions?</li>
                <li>What's my learning style and how can I optimize for it?</li>
                <li>How do I know if I truly understand the material?</li>
            </ul>
        </div>
    `;
}

function answerQuestion(question) {
    return `
        <div class="improved-notes">
            <h3>🤔 AI Response</h3>
            <p><strong>Your Question:</strong> ${question}</p>
            
            <div style="margin-top: 20px;">
                <p>That's a great question! Here's what you should know:</p>
                
                <h4>Quick Answer:</h4>
                <p>In a full implementation, I would connect to an AI API (like OpenAI's GPT) to provide intelligent, contextual answers based on your notes and study materials.</p>
                
                <h4>Study Tips Related to Your Question:</h4>
                <ul>
                    <li>Break down complex questions into smaller parts</li>
                    <li>Look for connections to topics you already understand</li>
                    <li>Create examples to test your understanding</li>
                    <li>Discuss with classmates or teachers</li>
                </ul>
                
                <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin-top: 15px;">
                    <p><strong>💡 Pro Tip:</strong> The best way to understand something is to try explaining it to someone else. If you can teach it, you know it!</p>
                </div>
            </div>
        </div>
    `;
}

function displayAIResponse(response) {
    document.getElementById('aiResponse').innerHTML = response;
    
    document.querySelector('.ai-response').scrollTop = 0;
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideInRight 0.3s;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

