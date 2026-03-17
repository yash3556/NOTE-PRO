const AI_API_ENDPOINT = "/api/gemini";
const LOCAL_GEMINI_KEY_STORAGE = "gemini_api_key";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL_CANDIDATES = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001"
];
let cachedGeminiModel = null;
let currentEmail = localStorage.getItem("currentUser");

if(!currentEmail){
    window.location.href = "login.html";
}

let users = JSON.parse(localStorage.getItem("users")) || [];
let currentUser = users.find(u => u.email === currentEmail);

if(!currentUser){
    window.location.href = "login.html";
}

let notes = currentUser.notes || [];

let currentEditingId = null;
let pinnedState = false;

if(!window.showAppToast){
    (function initAppToast(){
        function ensureToastStyles(){
            if(document.getElementById("appToastStyles")) return;

            let style = document.createElement("style");
            style.id = "appToastStyles";
            style.textContent = `
                #appToastContainer{
                    position: fixed;
                    top: 16px;
                    right: 16px;
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    width: min(360px, calc(100vw - 24px));
                    pointer-events: none;
                }

                .app-toast{
                    border-radius: 12px;
                    border: 1px solid rgba(148,163,184,0.35);
                    background: #0f172a;
                    color: #f8fafc;
                    box-shadow: 0 16px 28px rgba(2,6,23,0.3);
                    padding: 11px 13px;
                    line-height: 1.4;
                    font-size: 14px;
                    transform: translateX(116%);
                    opacity: 0;
                    transition: transform 0.28s ease, opacity 0.28s ease;
                    pointer-events: auto;
                }

                .app-toast.is-visible{
                    transform: translateX(0);
                    opacity: 1;
                }

                .app-toast.is-hiding{
                    transform: translateX(116%);
                    opacity: 0;
                }

                .app-toast--success{ border-left: 4px solid #22c55e; }
                .app-toast--error{ border-left: 4px solid #ef4444; }
                .app-toast--warning{ border-left: 4px solid #f59e0b; }
                .app-toast--info{ border-left: 4px solid #3b82f6; }
            `;
            document.head.appendChild(style);
        }

        function ensureToastContainer(){
            let container = document.getElementById("appToastContainer");
            if(container) return container;

            container = document.createElement("div");
            container.id = "appToastContainer";
            container.setAttribute("aria-live", "polite");
            container.setAttribute("aria-atomic", "true");
            document.body.appendChild(container);
            return container;
        }

        window.showAppToast = function(message, type = "info", options = {}){
            if(!message) return;

            ensureToastStyles();
            let container = ensureToastContainer();
            let tone = ["success", "error", "warning", "info"].includes(type) ? type : "info";
            let duration = Number(options.duration) || (tone === "error" ? 3400 : 2600);

            let toast = document.createElement("div");
            toast.className = `app-toast app-toast--${tone}`;
            toast.setAttribute("role", "status");
            toast.textContent = String(message);
            container.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.add("is-visible");
            });

            let dismissed = false;
            let dismiss = () => {
                if(dismissed) return;
                dismissed = true;
                toast.classList.remove("is-visible");
                toast.classList.add("is-hiding");
                setTimeout(() => {
                    toast.remove();
                }, 280);
            };

            setTimeout(dismiss, duration);
            toast.addEventListener("click", dismiss);
        };
    })();
}

function saveToLocal(){
    currentUser.notes = notes;

    users = users.map(u =>
        u.email === currentEmail ? currentUser : u
    );

    localStorage.setItem("users", JSON.stringify(users));
}

let pin = document.getElementById("pin");
let save = document.getElementById("save");
let Delete = document.getElementById("Delete");
let ai = document.getElementById("ai");
let toggle = document.getElementById("toggle");

let search = document.getElementById("searchs");
let searchs = document.getElementById("search");

let NewNotes = document.getElementById("newNotes");
let allNotes = document.getElementById("allNotes");

let ulnotes = document.getElementById("ulnotes");
let ulpinned = document.getElementById("ulpinned");
let ultrash = document.getElementById("ultrash");

let titleHead = document.getElementById("title");
let titleNotes = document.getElementById("textarea");
let notesContainer = document.getElementById("notesContainer");

let wordCountEl = document.getElementById("wordCount");

let toggleBtn = document.getElementById("toggle");

document.addEventListener("keydown",function(e){

if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="k"){
e.preventDefault();
openAIAssistant();
}

if(e.key === "Escape"){
let panel = document.getElementById("aiSidebar") || document.getElementById("aiModal");
if(panel && panel.classList.contains("active")){
    closeAIAssistant();
}
}

});

const AI_HISTORY_KEY_PREFIX = "ai_chat_history_";
const AI_HISTORY_LIMIT = 80;
const AI_WELCOME_TEXT = "Hello! I can help you with:\n- Improve notes\n- Generate exam questions\n- Summaries\n- Explain concepts";

function getAIHistoryKey(){
    return `${AI_HISTORY_KEY_PREFIX}${currentEmail || "guest"}`;
}

function readAIHistory(){
    try{
        let raw = localStorage.getItem(getAIHistoryKey());
        if(!raw) return [];
        let parsed = JSON.parse(raw);
        if(!Array.isArray(parsed)) return [];

        return parsed
            .filter(item => item && typeof item.text === "string" && (item.role === "user" || item.role === "assistant"))
            .slice(-AI_HISTORY_LIMIT);
    }
    catch(_err){
        return [];
    }
}

function writeAIHistory(history){
    localStorage.setItem(getAIHistoryKey(), JSON.stringify((history || []).slice(-AI_HISTORY_LIMIT)));
}

function appendAIHistory(role, text){
    let history = readAIHistory();
    history.push({ role, text: String(text || "") });
    writeAIHistory(history);
}

function getLastAssistantReply(){
    let history = readAIHistory();
    for(let i = history.length - 1; i >= 0; i--){
        if(history[i].role === "assistant" && history[i].text){
            return history[i].text;
        }
    }
    return "";
}

function fallbackCopyText(text){
    let temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    try{
        document.execCommand("copy");
    }
    finally{
        document.body.removeChild(temp);
    }
}

async function copyTextQuick(text, triggerButton){
    if(!text) return;

    try{
        if(navigator.clipboard && window.isSecureContext){
            await navigator.clipboard.writeText(text);
        }
        else{
            fallbackCopyText(text);
        }

        if(triggerButton){
            let oldLabel = triggerButton.textContent;
            triggerButton.textContent = "Copied";
            setTimeout(() => {
                triggerButton.textContent = oldLabel;
            }, 1000);
        }
    }
    catch(_err){
        showAppToast("Could not copy text. Please copy manually.", "error");
    }
}

function buildChatMessage(role, text){
    let message = document.createElement("div");
    let isAssistant = role === "assistant";
    message.className = isAssistant ? "ai-message" : "user-message";
    message.dataset.role = role;

    if(isAssistant){
        let header = document.createElement("div");
        header.className = "ai-message-header";

        let label = document.createElement("span");
        label.className = "ai-role";
        label.textContent = "AI";

        let copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "ai-copy-btn";
        copyBtn.textContent = "Copy";
        copyBtn.addEventListener("click", () => copyTextQuick(text, copyBtn));

        let body = document.createElement("div");
        body.className = "ai-message-body";
        body.textContent = text;

        header.appendChild(label);
        header.appendChild(copyBtn);
        message.appendChild(header);
        message.appendChild(body);
    }
    else{
        message.textContent = text;
    }

    return message;
}

function pushChatMessage(role, text, options = {}){
    let chat = document.getElementById("aiChat");
    if(!chat) return;

    let { persist = true } = options;
    let messageNode = buildChatMessage(role, text);
    chat.appendChild(messageNode);

    if(persist){
        appendAIHistory(role, text);
    }

    chat.scrollTop = chat.scrollHeight;
}

function renderAIHistory(){
    let chat = document.getElementById("aiChat");
    if(!chat) return;

    chat.innerHTML = "";
    let history = readAIHistory();

    if(!history.length){
        pushChatMessage("assistant", AI_WELCOME_TEXT, { persist: false });
        return;
    }

    history.forEach(item => {
        pushChatMessage(item.role, item.text, { persist: false });
    });
}

function openAIAssistant(){
let panel = document.getElementById("aiSidebar") || document.getElementById("aiModal");
if(!panel) return;
panel.classList.add("active");
document.body.classList.add("ai-open");
renderAIHistory();

let input = document.getElementById("aiQuestion");
if(input){
    setTimeout(() => input.focus(), 50);
}
}

function closeAIAssistant(){
let panel = document.getElementById("aiSidebar") || document.getElementById("aiModal");
if(!panel) return;
panel.classList.remove("active");
document.body.classList.remove("ai-open");
}

function clearAIHistory(){
    localStorage.removeItem(getAIHistoryKey());
    renderAIHistory();
}

async function copyLastAIReply(){
    let lastReply = getLastAssistantReply();
    if(!lastReply){
        showAppToast("No AI reply available to copy yet.", "info");
        return;
    }

    let copyBtn = document.getElementById("copyLastAI");
    await copyTextQuick(lastReply, copyBtn);
}

function getLocalGeminiKey(){
    return localStorage.getItem(LOCAL_GEMINI_KEY_STORAGE) || "";
}

function ensureApiKeyModalStyles(){
    if(document.getElementById("apiKeyModalStyles")) return;

    let style = document.createElement("style");
    style.id = "apiKeyModalStyles";
    style.textContent = `
        .api-key-modal{
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(6px);
            z-index: 100000;
        }
        .api-key-modal__card{
            width: min(520px, 92vw);
            background: #0b1220;
            border: 1px solid rgba(148,163,184,0.3);
            border-radius: 16px;
            box-shadow: 0 24px 40px rgba(2,6,23,0.45);
            padding: 20px 22px;
            color: #e2e8f0;
        }
        .api-key-modal__header{
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }
        .api-key-modal__title{
            margin: 0;
            font-size: 20px;
            letter-spacing: 0.2px;
        }
        .api-key-modal__close{
            border: none;
            background: transparent;
            color: #94a3b8;
            font-size: 14px;
            cursor: pointer;
        }
        .api-key-modal__sub{
            margin: 8px 0 14px;
            color: #cbd5f5;
            font-size: 14px;
            line-height: 1.5;
        }
        .api-key-modal__steps{
            background: rgba(30,41,59,0.65);
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 14px;
        }
        .api-key-modal__steps h3{
            margin: 0 0 8px;
            font-size: 14px;
            color: #f8fafc;
        }
        .api-key-modal__steps ol{
            margin: 0;
            padding-left: 20px;
            font-size: 13px;
            color: #dbeafe;
            line-height: 1.45;
        }
        .api-key-modal__steps a{
            color: #38bdf8;
        }
        .api-key-modal__label{
            display: block;
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 6px;
        }
        .api-key-modal__input{
            width: 100%;
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid rgba(148,163,184,0.35);
            background: #0f172a;
            color: #e2e8f0;
            font-size: 14px;
        }
        .api-key-modal__note{
            margin-top: 8px;
            font-size: 12px;
            color: #94a3b8;
        }
        .api-key-modal__error{
            margin-top: 8px;
            min-height: 18px;
            font-size: 12px;
            color: #f87171;
        }
        .api-key-modal__actions{
            margin-top: 14px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        .api-key-modal__btn{
            border-radius: 10px;
            padding: 8px 14px;
            font-size: 13px;
            border: 1px solid rgba(148,163,184,0.45);
            cursor: pointer;
        }
        .api-key-modal__btn--ghost{
            background: transparent;
            color: #e2e8f0;
        }
        .api-key-modal__btn--primary{
            background: #38bdf8;
            color: #0b1220;
            border-color: transparent;
        }
    `;
    document.head.appendChild(style);
}

function openApiKeyModal(){
    return new Promise(resolve => {
        ensureApiKeyModalStyles();

        let existing = document.getElementById("apiKeyModal");
        if(existing){
            existing.remove();
        }

        let overlay = document.createElement("div");
        overlay.id = "apiKeyModal";
        overlay.className = "api-key-modal";
        overlay.innerHTML = `
            <div class="api-key-modal__card" role="dialog" aria-modal="true" aria-labelledby="apiKeyTitle">
                <div class="api-key-modal__header">
                    <h2 class="api-key-modal__title" id="apiKeyTitle">Connect Gemini API</h2>
                    <button class="api-key-modal__close" type="button">Close</button>
                </div>
                <p class="api-key-modal__sub">
                    To use AI locally, add your personal Gemini API key. It will be stored only in this browser.
                </p>
                <div class="api-key-modal__steps">
                    <h3>Get your key from Google AI Studio</h3>
                    <ol>
                        <li>Open <a href="https://aistudio.google.com/" target="_blank" rel="noopener">Google AI Studio</a>.</li>
                        <li>Sign in with your Google account.</li>
                        <li>Click "Get API key" and create a new key.</li>
                        <li>Copy the key and paste it below.</li>
                    </ol>
                </div>
                <label class="api-key-modal__label" for="apiKeyInput">Gemini API Key</label>
                <input class="api-key-modal__input" id="apiKeyInput" type="password" placeholder="AIza..." autocomplete="off">
                <div class="api-key-modal__note">
                    For production on Vercel, set GEMINI_API_KEY in Environment Variables instead.
                </div>
                <div class="api-key-modal__error" id="apiKeyError"></div>
                <div class="api-key-modal__actions">
                    <button class="api-key-modal__btn api-key-modal__btn--ghost" type="button" id="apiKeyCancel">Cancel</button>
                    <button class="api-key-modal__btn api-key-modal__btn--primary" type="button" id="apiKeySave">Save Key</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        let input = overlay.querySelector("#apiKeyInput");
        let errorBox = overlay.querySelector("#apiKeyError");
        let saveBtn = overlay.querySelector("#apiKeySave");
        let cancelBtn = overlay.querySelector("#apiKeyCancel");
        let closeBtn = overlay.querySelector(".api-key-modal__close");

        let cleanup = (value) => {
            overlay.remove();
            resolve(value || "");
        };

        let attemptSave = () => {
            let value = input.value.trim();
            if(!value){
                errorBox.textContent = "Please paste your API key to continue.";
                return;
            }
            cleanup(value);
        };

        saveBtn.addEventListener("click", attemptSave);
        cancelBtn.addEventListener("click", () => cleanup(""));
        closeBtn.addEventListener("click", () => cleanup(""));
        overlay.addEventListener("click", (e) => {
            if(e.target === overlay){
                cleanup("");
            }
        });
        input.addEventListener("keydown", (e) => {
            if(e.key === "Enter"){
                e.preventDefault();
                attemptSave();
            }
        });

        setTimeout(() => {
            input.focus();
        }, 20);
    });
}

async function ensureLocalGeminiKey(){
    let key = getLocalGeminiKey();
    if(key) return key;

    let input = await openApiKeyModal();
    if(input && input.trim()){
        key = input.trim();
        localStorage.setItem(LOCAL_GEMINI_KEY_STORAGE, key);
        return key;
    }

    return "";
}

function isServerlessMissing(error){
    if(!error || typeof error !== "object") return false;
    if(error.status !== 404) return false;

    const body = String(error.body || "");
    const contentType = String(error.contentType || "");

    if(contentType.includes("text/html")) return true;
    if(body.includes("<!DOCTYPE html>")) return true;
    if(body.toLowerCase().includes("file not found")) return true;

    return false;
}

async function requestGeminiServerless(prompt){
    const response = await fetch(
        AI_API_ENDPOINT,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: String(prompt || "")
            })
        }
    );

    if(response.ok){
        return response.json();
    }

    let errorText = "";
    try{
        errorText = await response.text();
    }
    catch(_err){
        errorText = "";
    }

    let message = `API request failed (${response.status})`;
    if(errorText){
        try{
            let parsed = JSON.parse(errorText);
            if(parsed?.error?.message){
                message += `: ${parsed.error.message}`;
            }
            else if(parsed?.error){
                message += `: ${String(parsed.error)}`;
            }
            else{
                message += `: ${errorText}`;
            }
        }
        catch(_jsonErr){
            message += `: ${errorText}`;
        }
    }

    let err = new Error(message);
    err.status = response.status;
    err.body = errorText;
    err.contentType = response.headers.get("content-type") || "";
    throw err;
}

async function requestGeminiDirect(prompt, apiKey){
    const modelsToTry = cachedGeminiModel
        ? [cachedGeminiModel, ...GEMINI_MODEL_CANDIDATES.filter(model => model !== cachedGeminiModel)]
        : [...GEMINI_MODEL_CANDIDATES];

    let lastError = null;

    for(const model of modelsToTry){
        const response = await fetch(
            `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ]
                })
            }
        );

        if(response.ok){
            cachedGeminiModel = model;
            return response.json();
        }

        let errorText = "";
        try{
            errorText = await response.text();
        }
        catch(_err){
            errorText = "";
        }

        if(response.status === 404){
            lastError = new Error(`Model '${model}' not found for this API key.`);
            continue;
        }

        let message = `API request failed (${response.status})`;
        if(errorText){
            try{
                let parsed = JSON.parse(errorText);
                if(parsed?.error?.message){
                    message += `: ${parsed.error.message}`;
                }
                else{
                    message += `: ${errorText}`;
                }
            }
            catch(_jsonErr){
                message += `: ${errorText}`;
            }
        }

        throw new Error(message);
    }

    if(lastError){
        throw lastError;
    }

    throw new Error("No compatible Gemini model was available.");
}

async function requestGemini(prompt){
    try{
        return await requestGeminiServerless(prompt);
    }
    catch(error){
        if(isServerlessMissing(error)){
            const localKey = await ensureLocalGeminiKey();
            if(localKey){
                return requestGeminiDirect(prompt, localKey);
            }

            throw new Error("Local serverless API not available. Run `vercel dev` or provide a local Gemini API key.");
        }

        throw error;
    }
}

async function sendToAI(){

let input = document.getElementById("aiQuestion");
let message = input.value.trim();

if(message === "") return;

let chat = document.getElementById("aiChat");
if(!chat) return;

pushChatMessage("user", message, { persist: true });
input.value = "";

let noteContent = document.getElementById("textarea").value;

let prompt = `
You are a helpful study assistant.

Student Notes:
${noteContent}

Student Question:
${message}

Give a clear helpful answer.
`;

let thinking = document.createElement("div");
thinking.className = "ai-message ai-thinking";
thinking.textContent = "Thinking...";
chat.appendChild(thinking);
chat.scrollTop = chat.scrollHeight;

try{

const data = await requestGemini(prompt);

if(thinking.parentNode){
thinking.parentNode.removeChild(thinking);
}

let aiText = "No response from AI.";

if(data?.candidates?.length){
let parts = data.candidates[0]?.content?.parts || [];
aiText = parts.map(part => part.text || "").join("\n").trim() || aiText;
}

pushChatMessage("assistant", aiText, { persist: true });

}
catch(error){

if(thinking.parentNode){
thinking.parentNode.removeChild(thinking);
}

let errorText = `AI Error: ${error?.message || "Unknown error"}`;
pushChatMessage("assistant", errorText, { persist: true });

console.error("AI ERROR:",error);

}

}

const aiQuestionInput = document.getElementById("aiQuestion");
if(aiQuestionInput){
aiQuestionInput.addEventListener("keydown", function(e){
    if(e.key === "Enter"){
        e.preventDefault();
        sendToAI();
    }
});
}

const clearAIHistoryBtn = document.getElementById("clearAIHistory");
if(clearAIHistoryBtn){
    clearAIHistoryBtn.addEventListener("click", clearAIHistory);
}

const copyLastAIBtn = document.getElementById("copyLastAI");
if(copyLastAIBtn){
    copyLastAIBtn.addEventListener("click", copyLastAIReply);
}

if(document.getElementById("aiChat")){
    renderAIHistory();
}

const aiModalPanel = document.getElementById("aiModal");
if(aiModalPanel){
    aiModalPanel.addEventListener("click", (e) => {
        if(e.target === aiModalPanel){
            closeAIAssistant();
        }
    });
}

let settings = currentUser.settings || {
    theme: localStorage.getItem("theme") || "light",
    fontSize: "medium",
    accent: "blue",
    defaultCategory: "work",
    autoSave: false,
    showWordCount: false,
    sortOrder: "newest",
    view: "list",
    showPinnedFirst: true
};

currentUser.settings = settings;

function setTheme(mode){
    if(mode === "dark"){
        document.body.classList.add("dark-mode");
        localStorage.setItem("theme","dark");
    } else {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("theme","light");
    }

    settings.theme = mode;
    saveToLocal();
}

let savedTheme = settings.theme || localStorage.getItem("theme") || "light";
setTheme(savedTheme);

function applySettings(){
    document.body.classList.remove("font-small","font-large");
    if(settings.fontSize === "small"){
        document.body.classList.add("font-small");
    } else if(settings.fontSize === "large"){
        document.body.classList.add("font-large");
    }

    document.body.classList.remove("view-grid");
    if(settings.view === "grid"){
        document.body.classList.add("view-grid");
    }

    let catSelect = document.querySelector("#Categories select");
    if(catSelect && settings.defaultCategory){
        catSelect.value = settings.defaultCategory;
    }

    if(wordCountEl){
        if(settings.showWordCount){
            wordCountEl.classList.remove("hide");
        } else {
            wordCountEl.classList.add("hide");
        }
    }
}

applySettings();

function updateWordCount(){
    if(!wordCountEl || !titleNotes) return;
    let text = titleNotes.value.trim();
    if(!text){
        wordCountEl.textContent = "0 words";
        return;
    }
    let words = text.split(/\s+/).filter(Boolean).length;
    wordCountEl.textContent = words + (words === 1 ? " word" : " words");
}

if(titleNotes){
    titleNotes.addEventListener("input", () => {
        if(settings.showWordCount){
            updateWordCount();
        }
    });
}

if(toggleBtn){
    toggleBtn.addEventListener("click", () => {

        let newMode = document.body.classList.contains("dark-mode") ? "light" : "dark";
        setTheme(newMode);

        let lightRadio = document.getElementById("themeLight");
        let darkRadio = document.getElementById("themeDark");
        if(lightRadio && darkRadio){
            if(newMode === "dark"){
                darkRadio.checked = true;
            } else {
                lightRadio.checked = true;
            }
        }

    });
}

const STUDY_ASSISTANT_PROMPT_TEMPLATE = `You are an intelligent study assistant inside a Notes App designed to help students learn better.

Your job is to analyze the user's note and provide helpful academic assistance.

User Note:
"{NOTE_CONTENT}"

Tasks:
1. If the note is incomplete, expand it with clear explanations.
2. Rewrite the note in well-structured and easy-to-understand language.
3. Convert the note into organized bullet points.
4. Highlight key concepts and important points.
5. Generate possible exam questions based on the topic (short answer and long answer).
6. Provide a short summary for quick revision.
7. If the user note is empty or very short, generate helpful study notes on the topic mentioned.

Output Format:

\u{1F4D8} Improved Notes
(Clear rewritten explanation)

\u{1F4CC} Key Points
\u2022 bullet points of important ideas

\u2753 Important Exam Questions
\u2022 Short answer questions
\u2022 Long answer questions

\u{1F4DD} Quick Summary
(A very short revision summary)

Rules:
- Keep the explanation simple and student-friendly.
- Focus on clarity and learning.
- Do not add unrelated topics.
- Format the output neatly.`;

const STUDY_STOP_WORDS = new Set([
    "a","an","and","are","as","at","be","by","for","from","has","have","in","is","it","of","on","or","that","the","to","was","were","will","with","this","these","those","your","you","we","our","their","they","but","not","can","into","about","using","use","used"
]);

function buildStudyAssistantPrompt(noteContent){
    return STUDY_ASSISTANT_PROMPT_TEMPLATE.replace("{NOTE_CONTENT}", noteContent || "");
}

function escapeHtml(value){
    return (value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeLine(text){
    return (text || "").replace(/\s+/g, " ").trim();
}

function getWordCount(text){
    let clean = normalizeLine(text);
    if(!clean) return 0;
    return clean.split(" ").filter(Boolean).length;
}

function splitIntoSentences(text){
    return (text || "")
        .replace(/\r/g, " ")
        .split(/[\n.!?]+/)
        .map(normalizeLine)
        .filter(Boolean);
}

function formatSentence(text){
    let clean = normalizeLine(text);
    if(!clean) return "";

    let first = clean.charAt(0).toUpperCase();
    let rest = clean.slice(1);
    let sentence = first + rest;

    if(!/[.!?]$/.test(sentence)){
        sentence += ".";
    }
    return sentence;
}

function extractKeywords(text, limit = 5){
    let words = (text || "").toLowerCase().match(/[a-z][a-z0-9-]*/g) || [];
    let frequency = {};

    words.forEach(word => {
        if(word.length < 3 || STUDY_STOP_WORDS.has(word)) return;
        frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
        .sort((a,b) => b[1] - a[1] || b[0].length - a[0].length)
        .slice(0, limit)
        .map(item => item[0]);
}

function detectTopic(noteTitle, noteContent){
    let title = normalizeLine(noteTitle);
    if(title) return title;

    let sentences = splitIntoSentences(noteContent);
    if(sentences.length){
        return sentences[0].slice(0, 80);
    }
    return "General Study Topic";
}

function makeImprovedNotes(topic, sentences, isVeryShort, isIncomplete){
    if(isVeryShort){
        return `
            <p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
            <p>Your note is very short, so these study notes are expanded to make revision easier.</p>
            <p>Start by learning the definition of ${escapeHtml(topic)}, then understand its main components, and finally connect each part to practical examples.</p>
            <p>For exam preparation, revise this topic with short self-tests so you can explain it clearly in your own words.</p>
        `;
    }

    let rewritten = sentences
        .slice(0, 6)
        .map(formatSentence)
        .filter(Boolean)
        .join(" ");

    let addOn = isIncomplete
        ? "The original note looked incomplete, so add definitions, examples, and clear links between ideas."
        : "This rewritten version keeps the note clear, structured, and easy to revise.";

    return `
        <p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
        <p>${escapeHtml(rewritten)}</p>
        <p>${escapeHtml(addOn)}</p>
    `;
}

function makeKeyPoints(sentences, keywords, isVeryShort){
    let keyPoints = [];

    if(!isVeryShort){
        keyPoints = sentences
            .slice(0, 6)
            .map(text => formatSentence(text).replace(/[.!?]$/, ""));
    }

    if(keywords.length){
        keyPoints.push("Important terms: " + keywords.join(", "));
    }

    let fillers = [
        "Start with the definition before moving to advanced details",
        "Use one practical example for each major idea",
        "Compare related concepts to avoid confusion in exams",
        "Practice active recall by writing answers without looking",
        "Maintain a short formula or keyword sheet for revision"
    ];

    fillers.forEach(point => {
        if(keyPoints.length < 6 && !keyPoints.includes(point)){
            keyPoints.push(point);
        }
    });

    return keyPoints.slice(0, 6);
}

function makeExamQuestions(topic, keywords){
    let conceptOne = keywords[0] || topic;
    let conceptTwo = keywords[1] || "other key concepts";

    return {
        short: [
            `Define ${conceptOne} in simple terms.`,
            `List any three important points related to ${topic}.`,
            `Why is ${conceptOne} important for understanding ${topic}?`,
            `Give one practical example connected to ${topic}.`
        ],
        long: [
            `Explain ${topic} in detail with suitable examples.`,
            `Discuss the relationship between ${conceptOne} and ${conceptTwo} in ${topic}.`,
            `Analyze major challenges and solutions related to ${topic}.`
        ]
    };
}

function makeQuickSummary(topic, keyPoints, isVeryShort){
    if(isVeryShort){
        return `${topic} is introduced briefly. Focus on definition, key components, and examples for quick revision.`;
    }

    let firstTwo = keyPoints.slice(0, 2);
    if(!firstTwo.length){
        return `${topic} has been rewritten into clear points. Revise regularly and practice short answers.`;
    }

    return `${topic} mainly covers ${firstTwo.join(" and ").toLowerCase()}. Revise key terms and practice exam-style answers.`;
}

function generateStudyAssistantResponse(noteTitle, noteContent){
    buildStudyAssistantPrompt(noteContent);

    let topic = detectTopic(noteTitle, noteContent);
    let sentences = splitIntoSentences(noteContent);
    let wordCount = getWordCount(noteContent);
    let keywords = extractKeywords(noteContent);

    if(!keywords.length && topic && topic !== "General Study Topic"){
        keywords = extractKeywords(topic, 2);
    }

    let isVeryShort = wordCount < 12;
    let isIncomplete = isVeryShort || sentences.length < 2 || wordCount < 35;

    let improvedNotes = makeImprovedNotes(topic, sentences, isVeryShort, isIncomplete);
    let keyPoints = makeKeyPoints(sentences, keywords, isVeryShort);
    let examQuestions = makeExamQuestions(topic, keywords);
    let summary = makeQuickSummary(topic, keyPoints, isVeryShort);

    return {
        improvedNotes,
        keyPoints,
        shortQuestions: examQuestions.short,
        longQuestions: examQuestions.long,
        summary
    };
}

function renderStudyAssistantResponse(response){
    if(!notesContainer) return;

    let renderList = (items) => {
        return items.map(item => `<li>${escapeHtml(item)}</li>`).join("");
    };

    notesContainer.innerHTML = `
        <div class="ai-study-output">
            <h3>&#128216; Improved Notes</h3>
            <div class="ai-study-section">${response.improvedNotes}</div>

            <h3>&#128204; Key Points</h3>
            <ul>${renderList(response.keyPoints)}</ul>

            <h3>&#10067; Important Exam Questions</h3>
            <h4>Short answer questions</h4>
            <ul>${renderList(response.shortQuestions)}</ul>
            <h4>Long answer questions</h4>
            <ul>${renderList(response.longQuestions)}</ul>

            <h3>&#128221; Quick Summary</h3>
            <p>${escapeHtml(response.summary)}</p>
        </div>
    `;

    notesContainer.classList.remove("hide");
}

if(ai){
    ai.addEventListener("click", () => {
        let noteTitle = titleHead ? titleHead.value.trim() : "";
        let noteContent = titleNotes ? titleNotes.value.trim() : "";

        let response = generateStudyAssistantResponse(noteTitle, noteContent);
        renderStudyAssistantResponse(response);

        if(notesContainer){
            notesContainer.scrollIntoView({behavior: "smooth", block: "start"});
        }
    });
}

let userName = document.getElementById("name");
let email = document.getElementById("email");
let password = document.getElementById("password");
let bio = document.getElementById("bio");
let joinedDate = document.getElementById("joinedDate");
let lastLogin = document.getElementById("lastLogin");
let image = document.getElementById("img");
let userImage = document.getElementById("userImage");
let editBtn = document.getElementById("edit");

let backprofile = document.getElementById("User");
if(backprofile){
backprofile.addEventListener("click",(e)=>{
       window.location.href = "notes.html";  
});
}
;
if (userName && email && editBtn) {

    userName.value = currentUser.name;
    email.value = currentUser.email;
    password.value = currentUser.password;
    bio.value = currentUser.bio;

    joinedDate.value = currentUser.joinedDate
        ? new Date(currentUser.joinedDate).toLocaleString()
        : "";

    lastLogin.value = currentUser.lastLogin
        ? new Date(currentUser.lastLogin).toLocaleString()
        : "";

    if (currentUser.avatar) {
        image.src = currentUser.avatar;
    }

    userName.disabled = true;
    email.disabled = true;
    password.disabled = true;
    bio.disabled = true;
    userImage.disabled = true;

    editBtn.addEventListener("click", toggleEdit);

    function toggleEdit() {

        if (userName.disabled) {

            userName.disabled = false;
            email.disabled = false;
            password.disabled = false;
            bio.disabled = false;
            userImage.disabled = false;

            userImage.classList.remove("hide");

            editBtn.innerText = "Save";
            userName.focus();

        } else {

            currentUser.name = userName.value.trim();
            currentUser.email = email.value.trim();
            currentUser.password = password.value.trim();
            currentUser.bio = bio.value.trim();

            const file = userImage.files[0];

            if (file) {

                if (file.size > 2000000) {
                    showAppToast("Image must be less than 2MB.", "warning");
                    return;
                }

                const reader = new FileReader();

                reader.onload = function (e) {

                    currentUser.avatar = e.target.result;
                    image.src = e.target.result;

                    finishSaving();
                };

                reader.readAsDataURL(file);

            } else {
                finishSaving();
            }
        }
    }

    function finishSaving() {

        localStorage.setItem("currentUser", currentUser.email);
        currentEmail = currentUser.email;

        saveToLocal();

        userName.disabled = true;
        email.disabled = true;
        password.disabled = true;
        bio.disabled = true;
        userImage.disabled = true;

        userImage.classList.add("hide");
        editBtn.innerText = "Edit";
    }
}
 

if(NewNotes){
NewNotes.addEventListener("click", () => {
    titleHead.value = "";
    titleNotes.value = "";
    pinnedState = false;
    currentEditingId = null;
    if(notesContainer){
        notesContainer.classList.add("hide");
        notesContainer.innerHTML = "";
    }
});
}

let totalNotesEl = document.getElementById("totalNotes");
let totalPinEl = document.getElementById("totalPin");
let totalTrashEl = document.getElementById("totalTrash");
let lastEditEl = document.getElementById("lastEdit");

if(totalNotesEl && totalPinEl && totalTrashEl){

    let totalNotes = currentUser.notes.filter(n => !n.dele).length;
    let pinnedNotes = currentUser.notes.filter(n => n.pinn && !n.dele).length;
    let trashNotes = currentUser.notes.filter(n => n.dele).length;

    totalNotesEl.innerText = totalNotes;
    totalPinEl.innerText = pinnedNotes;
    totalTrashEl.innerText = trashNotes;
    lastEditEl.innerText = currentUser.lastLogin
     ? new Date(currentUser.lastLogin).toLocaleString()
        : "No login yet";
    

};

let editProfile = document.getElementById("EditProfile");
let changePass = document.getElementById("changePassword");
let logout = document.getElementById("logout");

if(logout){
    logout.addEventListener("click",(e)=>{
        e.preventDefault();
        localStorage.removeItem("currentUser");
        showAppToast("Logged out.", "info");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 350);
        
});
}

if(editProfile){
editProfile.addEventListener("click",(e)=>{
    e.preventDefault();
   toggleEdit();
});
}
if(changePass){
changePass.addEventListener("click",(e)=>{
    e.preventDefault();
  window.location.href="password.html"
});
}

let newPass = document.getElementById("newpass");
let confirmPass = document.getElementById("Confirmpass");
let subpass = document.getElementById("submitPass");
if(subpass){
let passwordForm = subpass.closest("form");
if(passwordForm){
    passwordForm.addEventListener("submit", function(e){
        e.preventDefault();
        subpass.click();
    });
}

[newPass, confirmPass].forEach(field => {
    if(!field) return;
    field.addEventListener("keydown", function(e){
        if(e.key === "Enter"){
            e.preventDefault();
            subpass.click();
        }
    });
});

subpass.addEventListener("click",(e)=>{
      e.preventDefault();

if(newPass.value.trim() !== confirmPass.value.trim()){
    showAppToast("Confirm password does not match.", "error");
}
else{
    currentUser.password = newPass.value.trim();
    showAppToast("Password changed successfully.", "success");
    saveToLocal();
    setTimeout(() => {
        window.location.href = "profile.html";
    }, 450);
}

});
}

function exportNotesPDF() {
    document.getElementById("userExport").classList.toggle("hide");

const { jsPDF } = window.jspdf;
const doc = new jsPDF();

let y = 20;
const pageHeight = doc.internal.pageSize.height;

const selectedNotes = document.querySelectorAll(".exportNote:checked");

if(selectedNotes.length === 0){
    showAppToast("Select at least one note to export.", "warning");
    return;
}

selectedNotes.forEach((checkbox, index) => {

    const noteId = Number(checkbox.value);
    const note = currentUser.notes.find(n => n.id === noteId);

    if(!note) return;

    let titleLines = doc.splitTextToSize("Title: " + note.title, 180);
    let contentLines = doc.splitTextToSize("Content: " + note.content, 180);

    titleLines.forEach(line => {

        if(y > pageHeight - 10){
            doc.addPage();
            y = 20;
        }

        doc.text(line, 10, y);
        y += 8;
    });

    y += 5;

    contentLines.forEach(line => {

        if(y > pageHeight - 10){
            doc.addPage();
            y = 20;
        }

        doc.text(line, 10, y);
        y += 8;
    });

    y += 10;

});

doc.save("SelectedNotes.pdf");

}

function loadExportNotes(){

let exportList = document.getElementById("userExport");
if(!exportList) return;

exportList.innerHTML = "Select Notes";

notes.filter(n => !n.dele).forEach(note => {

let div = document.createElement("li");

div.innerHTML = `
<input type="checkbox" class="exportNote" value="${note.id}">
${note.title || "Untitled"}
`;

exportList.appendChild(div);

});

}

loadExportNotes();

let importBtn = document.getElementById("import");
let importFile = document.getElementById("importFile");

if(importBtn && importFile){

importBtn.addEventListener("click", () => {
    importFile.click();
});

importFile.addEventListener("change", function(){

    const file = this.files[0];
    if(!file) return;

    const reader = new FileReader();

    reader.onload = function(e){

        try{

            const importedNotes = JSON.parse(e.target.result);

            if(!Array.isArray(importedNotes)){
                showAppToast("Invalid notes file.", "error");
                return;
            }

            importedNotes.forEach(note => {

                notes.unshift({
                    id: Date.now() + Math.random(),
                    title: note.title || "Untitled",
                    content: note.content || "",
                    pinn: note.pinn || false,
                    dele: false
                });

            });

            saveToLocal();
            renderNotes();

            showAppToast(importedNotes.length + " notes imported successfully.", "success");

        }
        catch(err){
            showAppToast("File format is incorrect.", "error");
        }

    };

    reader.readAsText(file);

});

}

let clearTrash = document.getElementById("remove");
if(clearTrash){
clearTrash.addEventListener("click",(e)=>{
    
    let confirmDelete = confirm("Are you sure you want to delete all notes from Trash?");

    if(!confirmDelete) return;

    
    notes = notes.filter(note => !note.dele);

    saveToLocal();
    renderNotes();
});
}

let factoryReset = document.getElementById("resetData");

if(factoryReset){
    factoryReset.addEventListener("click",(e)=>{
        let users = JSON.parse(localStorage.getItem("users"));
        let currentUserEmail = localStorage.getItem("currentUser");

        let user = users.find(u => u.email === currentUserEmail);

        if(user){
            user.notes = [];
            user.pinned = [];
            user.trash = [];
        }

        localStorage.setItem("users", JSON.stringify(users));

        showAppToast("All notes deleted.", "success");

        renderNotes();
    });
}

let deleteAccount = document.getElementById("deleteAccount");
let deleteAccountConfirmUntil = 0;

if(deleteAccount){
    deleteAccount.addEventListener("click",(e)=>{
        e.preventDefault();

        let now = Date.now();
        if(now > deleteAccountConfirmUntil){
            deleteAccountConfirmUntil = now + 5000;
            showAppToast("Click Delete Account again within 5 seconds to confirm.", "warning", { duration: 4200 });
            return;
        }

        deleteAccountConfirmUntil = 0;

        let users = JSON.parse(localStorage.getItem("users")) || [];
        let currentUserEmail = localStorage.getItem("currentUser");

        users = users.filter(user => user.email !== currentUserEmail);
        localStorage.setItem("users", JSON.stringify(users));
        localStorage.removeItem("currentUser");

        showAppToast("Your account and all data have been deleted.", "success");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 450);
    });
}

let pinnedBtn = document.getElementById("pinned");
let trashBtn = document.getElementById("Trash");
let profileBtn = document.getElementById("Profile");
let settingsBtn = document.getElementById("Settings");
let categoriesBtn = document.getElementById("Categories");
let categorySelect = document.getElementById("categoryFilter");

let settingsOverlay = document.getElementById("settingsOverlay");
let closeSettingsBtn = document.getElementById("closeSettings");

if(settingsOverlay){
    settingsOverlay.classList.add("hide");
}

function openSettings(){
    if(!settingsOverlay) return;
    settingsOverlay.classList.remove("hide");
}

function closeSettings(){
    if(!settingsOverlay) return;
    settingsOverlay.classList.add("hide");
}

window.closeSettingsPanel = function(){
    closeSettings();
};

if(allNotes){
allNotes.addEventListener("click", () => {
    
    ulnotes.classList.toggle("hide");
});
}

if(pinnedBtn){
pinnedBtn.addEventListener("click", () => {
    
    ulpinned.classList.toggle("hide");
});
}

if(trashBtn){
trashBtn.addEventListener("click", () => {
    
    ultrash.classList.toggle("hide");
});
}

if(profileBtn){
profileBtn.addEventListener("click", () => {
    window.location.href = "profile.html";
});
}

if(categoriesBtn && categorySelect){
    categoriesBtn.addEventListener("click", (e) => {
        if(e.target === categorySelect) return;
        categorySelect.classList.toggle("hide");
    });
}

if(settingsBtn && settingsOverlay){
    settingsBtn.addEventListener("click", () => {
        openSettings();
        hydrateSettingsUI();
    });
}

if(closeSettingsBtn){
    closeSettingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeSettings();
    });
}

if(settingsOverlay){
    settingsOverlay.addEventListener("click", (e) => {
        if(e.target === settingsOverlay){
            closeSettings();
        }
    });
}

function hydrateSettingsUI(){
    let lightRadio = document.getElementById("themeLight");
    let darkRadio = document.getElementById("themeDark");
    if(lightRadio && darkRadio){
        if(settings.theme === "dark"){
            darkRadio.checked = true;
        } else {
            lightRadio.checked = true;
        }

        lightRadio.onchange = () => setTheme("light");
        darkRadio.onchange = () => setTheme("dark");
    }

    let fontSelect = document.getElementById("fontSizeSelect");
    if(fontSelect){
        fontSelect.value = settings.fontSize || "medium";
        fontSelect.onchange = () => {
            settings.fontSize = fontSelect.value;
            saveToLocal();
            applySettings();
        };
    }

    let accentContainer = document.getElementById("accentSelect");
    if(accentContainer){
        let swatches = accentContainer.querySelectorAll(".accent-swatch");
        swatches.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.accent === settings.accent);
            btn.onclick = () => {
                settings.accent = btn.dataset.accent;
                swatches.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                saveToLocal();
            };
        });
    }

    let defaultCat = document.getElementById("defaultCategorySelect");
    if(defaultCat){
        defaultCat.value = settings.defaultCategory || "work";
        defaultCat.onchange = () => {
            settings.defaultCategory = defaultCat.value;
            saveToLocal();
            applySettings();
        };
    }

    let autoSaveT = document.getElementById("autoSaveToggle");
    if(autoSaveT){
        autoSaveT.checked = !!settings.autoSave;
        autoSaveT.onchange = () => {
            settings.autoSave = autoSaveT.checked;
            saveToLocal();
        };
    }

    let wordT = document.getElementById("showWordCountToggle");
    if(wordT){
        wordT.checked = !!settings.showWordCount;
        wordT.onchange = () => {
            settings.showWordCount = wordT.checked;
            saveToLocal();
            applySettings();
            if(settings.showWordCount){
                updateWordCount();
            }
        };
    }

    let sortSel = document.getElementById("sortOrderSelect");
    if(sortSel){
        sortSel.value = settings.sortOrder || "newest";
        sortSel.onchange = () => {
            settings.sortOrder = sortSel.value;
            saveToLocal();
            renderNotes();
        };
    }

    let viewList = document.getElementById("viewList");
    let viewGrid = document.getElementById("viewGrid");
    if(viewList && viewGrid){
        if(settings.view === "grid"){
            viewGrid.checked = true;
        } else {
            viewList.checked = true;
        }

        viewList.onchange = () => {
            settings.view = "list";
            saveToLocal();
            applySettings();
        };
        viewGrid.onchange = () => {
            settings.view = "grid";
            saveToLocal();
            applySettings();
        };
    }

    let pinnedFirst = document.getElementById("showPinnedFirstToggle");
    if(pinnedFirst){
        pinnedFirst.checked = settings.showPinnedFirst !== false;
        pinnedFirst.onchange = () => {
            settings.showPinnedFirst = pinnedFirst.checked;
            saveToLocal();
            renderNotes();
        };
    }
}

if(save){
save.addEventListener("click", (e) => {
    e.preventDefault();

    const title = titleHead.value.trim();
    const content = titleNotes.value.trim();

    if(!title && !content) return;

    if(currentEditingId){
        notes = notes.map(note =>
            note.id === currentEditingId
            ? {...note, title, content, pinn: pinnedState}
            : note
        );
    } 
    else if(notes.some(note => note.title === title)){
        showAppToast("This file name already exists.", "warning");
        return;
    }
    else {
        notes.unshift({
            id: Date.now(),
            title,
            content,
            pinn: pinnedState,
            dele: false
        });
    }

    saveToLocal();
    renderNotes();

    titleHead.value = "";
    titleNotes.value = "";
    pinnedState = false;
    currentEditingId = null;
});
}

if(Delete){
Delete.addEventListener("click", () => {

    if(!currentEditingId) return;

    notes = notes.map(note =>
        note.id === currentEditingId
        ? {...note, dele: true}
        : note
    );

    saveToLocal();
    renderNotes();

    titleHead.value = "";
    titleNotes.value = "";
    currentEditingId = null;
});
}

if(pin){
pin.addEventListener("click", () => {
    pinnedState = !pinnedState;
});
}

if(search){
search.addEventListener("click", () => {

    let value = searchs.value.trim().toLowerCase();

    let foundNote = notes.find(note =>
        note.title && note.title.toLowerCase() === value
    );

    if(!foundNote){
        showAppToast("No such note exists.", "warning");
        return;
    }

    if(foundNote.dele){
        showAppToast("Note is in Trash. Restore it first.", "info");
        return;
    }

    titleHead.value = foundNote.title;
    titleNotes.value = foundNote.content;
    currentEditingId = foundNote.id;
    pinnedState = foundNote.pinn;
});
}

function renderNotes(){
    if(!ulnotes || !ulpinned || !ultrash) return;

    ulnotes.innerHTML = "";
    ulpinned.innerHTML = "";
    ultrash.innerHTML = "";

    let sortOrder = settings.sortOrder || "newest";
    let showPinnedFirst = settings.showPinnedFirst !== false;

    notes.sort((a,b) => {
        if(showPinnedFirst){
            if(a.pinn && !b.pinn) return -1;
            if(!a.pinn && b.pinn) return 1;
        }

        let dir = sortOrder === "oldest" ? 1 : -1;
        return (a.id - b.id) * dir;
    });

    notes.forEach(note => {

        if(!note.dele){
    
    
            let li = document.createElement("li");
            li.innerHTML = ` 
           
            ${note.title || "Untitled"} ${note.pinn ? "📌" : ""}
            `;

            li.addEventListener("click", (e) => {
            if(e.target.classList.contains("exportNote")) {
                e.stopPropagation();
                    return;
                }

                titleHead.value = note.title;
                titleNotes.value = note.content;
                pinnedState = note.pinn;
                currentEditingId = note.id;
            });

            ulnotes.appendChild(li);
        }

        if(note.pinn && !note.dele){
            let liPinned = document.createElement("li");
            liPinned.innerText = note.title || "Untitled";

            
            liPinned.addEventListener("click", () => {
                titleHead.value = note.title;
                titleNotes.value = note.content;
                pinnedState = note.pinn;
                currentEditingId = note.id;
            });

            ulpinned.appendChild(liPinned);
        }

        if(note.dele){
            let liTrash = document.createElement("li");
            
            liTrash.innerText =`${note.title || "Untitled"} ${note.pinn ? "📌" : ""}`;

            liTrash.addEventListener("click", () => {
                notes = notes.map(n =>
                    n.id === note.id ? {...n, dele:false} : n
                );
                titleHead.value = note.title;
                titleNotes.value = note.content;
                pinnedState = note.pinn;
                currentEditingId = note.id;

                saveToLocal();
                renderNotes();
            });

            ultrash.appendChild(liTrash);
        }

    });
}

if(ulnotes && ulpinned && ultrash){
    renderNotes();
}

