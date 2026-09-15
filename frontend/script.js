/* =========================================================
   J.A.R.V.I.S. MOBILE EDITION
   FRONTEND ENGINE v3.0

   Gemini API is NOT stored here.
   All AI requests go through the Render backend.
   ========================================================= */

"use strict";

/* =========================================================
   BACKEND
   ========================================================= */

const BACKEND_URL = "https://jarvis-backend-wwpa.onrender.com";

/* =========================================================
   STATE
   ========================================================= */

let conversation = [];
let isSending = false;
let isListening = false;
let recognition = null;
let currentVoices = [];

/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}

/* =========================================================
   MAIN ELEMENTS
   ========================================================= */

const chatBox = $("chatBox");
const userInput = $("userInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");

const aiStatus = $("aiStatus");
const networkStatus = $("networkStatus");
const memoryStatus = $("memoryStatus");
const voiceStatus = $("voiceStatus");

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initializeJarvis();
});

/*
   This also runs immediately if this script is loaded
   after the HTML has already loaded.
*/
if (document.readyState !== "loading") {
    initializeJarvis();
}

let initialized = false;

function initializeJarvis() {
    if (initialized) return;
    initialized = true;

    console.log("J.A.R.V.I.S. frontend starting...");

    setupSendButton();
    setupInput();
    setupQuickCommands();
    setupVoiceRecognition();
    setupSpeechSynthesis();
    setupMemory();
    checkBackend();

    console.log("J.A.R.V.I.S. frontend ready.");
}

/* =========================================================
   SEND BUTTON
   ========================================================= */

function setupSendButton() {

    if (!sendBtn) {
        console.warn("Send button not found.");
        return;
    }

    sendBtn.addEventListener("click", function(event) {
        event.preventDefault();
        sendMessage();
    });
}

/* =========================================================
   TEXT INPUT
   ========================================================= */

function setupInput() {

    if (!userInput) {
        console.warn("User input not found.");
        return;
    }

    userInput.addEventListener("keydown", function(event) {

        /*
           Enter = send
           Shift + Enter = new line
        */
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (isSending) return;

    if (!userInput) {
        console.error("userInput element missing.");
        return;
    }

    const message = userInput.value.trim();

    if (!message) {
        return;
    }

    isSending = true;

    /*
       Get message before clearing input.
    */
    userInput.value = "";

    /*
       Show user message.
    */
    addMessage(message, "user");

    /*
       Show thinking message.
    */
    const thinkingElement = addThinkingMessage();

    setSendingState(true);

    try {

        console.log("Sending message to J.A.R.V.I.S. backend...");

        const response = await fetch(`${BACKEND_URL}/api/chat`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message,
                context: buildContext()
            })
        });

        console.log("Backend response:", response.status);

        /*
           Try to read JSON.
        */
        let data = null;

        try {
            data = await response.json();
        } catch (jsonError) {
            throw new Error(
                `Backend returned an invalid response (${response.status}).`
            );
        }

        console.log("Backend data:", data);

        /*
           Remove thinking indicator.
        */
        removeThinkingMessage(thinkingElement);

        /*
           Backend error.
        */
        if (!response.ok) {

            const errorMessage =
                data?.error ||
                `Backend error: ${response.status}`;

            addMessage(
                `⚠️ ${errorMessage}`,
                "assistant",
                true
            );

            speak(
                "I encountered a backend error. Please try again."
            );

            return;
        }

        /*
           Successful response.
        */
        if (data && data.reply) {

            const reply = String(data.reply).trim();

            addMessage(reply, "assistant");

            /*
               Save conversation.
            */
            conversation.push({
                role: "user",
                content: message
            });

            conversation.push({
                role: "assistant",
                content: reply
            });

            saveConversation();

            /*
               Voice output.
            */
            speak(reply);

        } else {

            addMessage(
                "⚠️ J.A.R.V.I.S. received an empty response.",
                "assistant",
                true
            );
        }

    } catch (error) {

        console.error("J.A.R.V.I.S. request failed:", error);

        removeThinkingMessage(thinkingElement);

        let messageText =
            "⚠️ I could not connect to the J.A.R.V.I.S. backend.";

        if (error && error.message) {
            messageText += `\n\n${error.message}`;
        }

        addMessage(
            messageText,
            "assistant",
            true
        );

        /*
           Update network status.
        */
        setStatus(networkStatus, "OFFLINE");

    } finally {

        isSending = false;
        setSendingState(false);

        /*
           Put cursor back in input.
        */
        if (userInput) {
            userInput.focus();
        }
    }
}

/* =========================================================
   ADD MESSAGE
   ========================================================= */

function addMessage(text, sender = "assistant", isError = false) {

    if (!chatBox) {
        console.error("chatBox element missing.");
        return null;
    }

    const messageWrapper = document.createElement("div");

    messageWrapper.className =
        sender === "user"
            ? "message user-message"
            : "message assistant-message";

    if (isError) {
        messageWrapper.classList.add("error-message");
    }

    const messageContent = document.createElement("div");

    messageContent.className = "message-content";

    /*
       Preserve line breaks safely.
    */
    const lines = String(text).split("\n");

    lines.forEach((line, index) => {

        const span = document.createElement("span");

        span.textContent = line;

        messageContent.appendChild(span);

        if (index < lines.length - 1) {
            messageContent.appendChild(
                document.createElement("br")
            );
        }
    });

    messageWrapper.appendChild(messageContent);

    chatBox.appendChild(messageWrapper);

    scrollChatToBottom();

    return messageWrapper;
}

/* =========================================================
   THINKING MESSAGE
   ========================================================= */

function addThinkingMessage() {

    if (!chatBox) return null;

    const wrapper = document.createElement("div");

    wrapper.className =
        "message assistant-message jarvis-thinking";

    const content = document.createElement("div");

    content.className = "message-content";

    content.innerHTML =
        "J.A.R.V.I.S. is thinking<span class=\"thinking-dots\">...</span>";

    wrapper.appendChild(content);

    chatBox.appendChild(wrapper);

    scrollChatToBottom();

    return wrapper;
}

/* =========================================================
   REMOVE THINKING MESSAGE
   ========================================================= */

function removeThinkingMessage(element) {

    if (!element) return;

    if (element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

/* =========================================================
   SCROLL CHAT
   ========================================================= */

function scrollChatToBottom() {

    if (!chatBox) return;

    setTimeout(() => {
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 50);
}

/* =========================================================
   BUTTON STATE
   ========================================================= */

function setSendingState(sending) {

    if (!sendBtn) return;

    if (sending) {

        sendBtn.disabled = true;

        sendBtn.setAttribute(
            "aria-label",
            "J.A.R.V.I.S. is processing"
        );

        sendBtn.classList.add("sending");

    } else {

        sendBtn.disabled = false;

        sendBtn.setAttribute(
            "aria-label",
            "Send message"
        );

        sendBtn.classList.remove("sending");
    }
}

/* =========================================================
   BACKEND HEALTH CHECK
   ========================================================= */

async function checkBackend() {

    console.log("Checking J.A.R.V.I.S. backend...");

    try {

        const response = await fetch(
            `${BACKEND_URL}/api/health`,
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Health check failed: ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Backend health:", data);

        setStatus(networkStatus, "ONLINE");

        if (data.online) {
            setStatus(aiStatus, "READY");
        }

        if (data.aiConfigured) {
            setStatus(aiStatus, "READY");
        } else {
            setStatus(aiStatus, "NOT CONFIGURED");
        }

    } catch (error) {

        console.error(
            "Backend health check failed:",
            error
        );

        setStatus(networkStatus, "OFFLINE");

    }
}

/* =========================================================
   STATUS HELPER
   ========================================================= */

function setStatus(element, text) {

    if (!element) return;

    /*
       Support both normal elements and inputs.
    */
    if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA"
    ) {
        element.value = text;
    } else {
        element.textContent = text;
    }

    element.setAttribute(
        "data-status",
        String(text).toLowerCase()
    );
}

/* =========================================================
   QUICK COMMANDS
   ========================================================= */

function setupQuickCommands() {

    const buttons =
        document.querySelectorAll("[data-command]");

    buttons.forEach(button => {

        button.addEventListener("click", event => {

            event.preventDefault();

            const command =
                button.getAttribute("data-command");

            if (!command) return;

            /*
               Put command into input.
            */
            if (userInput) {
                userInput.value = command;
                userInput.focus();
            }

            /*
               Send immediately.
            */
            sendMessage();
        });
    });
}

/* =========================================================
   BUILD CONTEXT
   ========================================================= */

function buildContext() {

    /*
       Keep the context short.
       This prevents huge requests.
    */

    const recentConversation =
        conversation.slice(-10);

    if (!recentConversation.length) {
        return "No previous conversation.";
    }

    return recentConversation
        .map(item => {
            return `${item.role}: ${item.content}`;
        })
        .join("\n");
}

/* =========================================================
   MEMORY
   ========================================================= */

const MEMORY_KEY = "JARVIS_MEMORY";

function setupMemory() {

    setStatus(memoryStatus, "ACTIVE");

    try {

        const saved =
            localStorage.getItem(MEMORY_KEY);

        if (saved) {

            console.log(
                "J.A.R.V.I.S. memory restored."
            );

        } else {

            localStorage.setItem(
                MEMORY_KEY,
                JSON.stringify({
                    created: new Date().toISOString()
                })
            );
        }

    } catch (error) {

        console.warn(
            "Memory storage unavailable:",
            error
        );

        setStatus(memoryStatus, "LIMITED");
    }
}

/* =========================================================
   SAVE CONVERSATION
   ========================================================= */

function saveConversation() {

    try {

        /*
           Only save the last 30 messages.
        */
        const data =
            conversation.slice(-30);

        localStorage.setItem(
            "JARVIS_CONVERSATION",
            JSON.stringify(data)
        );

    } catch (error) {

        console.warn(
            "Could not save conversation:",
            error
        );
    }
}

/* =========================================================
   LOAD CONVERSATION
   ========================================================= */

function loadConversation() {

    try {

        const saved =
            localStorage.getItem(
                "JARVIS_CONVERSATION"
            );

        if (!saved) return;

        const data = JSON.parse(saved);

        if (!Array.isArray(data)) return;

        conversation = data;

    } catch (error) {

        console.warn(
            "Could not load conversation:",
            error
        );
    }
}

/* =========================================================
   VOICE RECOGNITION
   ========================================================= */

function setupVoiceRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        console.warn(
            "Speech recognition is not supported."
        );

        setStatus(voiceStatus, "UNAVAILABLE");

        return;
    }

    recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;

    /*
       Telugu + English.
       Browser may choose the best available language.
    */
    recognition.lang = "en-IN";

    recognition.onstart = () => {

        isListening = true;

        setStatus(voiceStatus, "LISTENING");

        if (micBtn) {
            micBtn.classList.add("active");
        }

        console.log("Voice recognition started.");
    };

    recognition.onresult = event => {

        let transcript = "";

        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            transcript +=
                event.results[i][0].transcript;
        }

        if (userInput) {
            userInput.value = transcript.trim();
        }
    };

    recognition.onerror = event => {

        console.error(
            "Voice recognition error:",
            event.error
        );

        isListening = false;

        setStatus(voiceStatus, "READY");

        if (micBtn) {
            micBtn.classList.remove("active");
        }
    };

    recognition.onend = () => {

        isListening = false;

        setStatus(voiceStatus, "READY");

        if (micBtn) {
            micBtn.classList.remove("active");
        }

        /*
           Automatically send recognized speech.
        */
        if (
            userInput &&
            userInput.value.trim()
        ) {
            sendMessage();
        }
    };

    if (micBtn) {

        micBtn.addEventListener("click", event => {

            event.preventDefault();

            toggleVoiceRecognition();

        });
    }

    setStatus(voiceStatus, "READY");
}

/* =========================================================
   TOGGLE VOICE
   ========================================================= */

function toggleVoiceRecognition() {

    if (!recognition) {

        console.warn(
            "Voice recognition unavailable."
        );

        return;
    }

    if (isListening) {

        recognition.stop();

    } else {

        try {

            recognition.start();

        } catch (error) {

            console.warn(
                "Could not start recognition:",
                error
            );
        }
    }
}

/* =========================================================
   SPEECH SYNTHESIS
   ========================================================= */

function setupSpeechSynthesis() {

    if (!("speechSynthesis" in window)) {

        setStatus(voiceStatus, "LIMITED");

        return;
    }

    loadVoices();

    window.speechSynthesis.onvoiceschanged =
        loadVoices;
}

function loadVoices() {

    if (!("speechSynthesis" in window)) return;

    currentVoices =
        window.speechSynthesis.getVoices();

    if (currentVoices.length) {
        setStatus(voiceStatus, "READY");
    }
}

/* =========================================================
   SPEAK
   ========================================================= */

function speak(text) {

    if (!("speechSynthesis" in window)) {
        return;
    }

    if (!text) return;

    /*
       Stop previous speech.
    */
    window.speechSynthesis.cancel();

    /*
       Remove markdown symbols so speech sounds natural.
    */
    const cleanText =
        String(text)
            .replace(/[*_#>`~]/g, "")
            .replace(/\[(.*?)\]\(.*?\)/g, "$1")
            .trim();

    if (!cleanText) return;

    const utterance =
        new SpeechSynthesisUtterance(cleanText);

    /*
       Prefer Indian English voice.
    */
    let voice =
        currentVoices.find(v =>
            v.lang &&
            v.lang.toLowerCase() === "en-in"
        );

    if (!voice) {

        voice =
            currentVoices.find(v =>
                v.lang &&
                v.lang.toLowerCase().startsWith("en")
            );
    }

    if (voice) {
        utterance.voice = voice;
    }

    utterance.lang = "en-IN";

    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    utterance.volume = 1;

    utterance.onstart = () => {
        setStatus(voiceStatus, "SPEAKING");
    };

    utterance.onend = () => {
        setStatus(voiceStatus, "READY");
    };

    utterance.onerror = () => {
        setStatus(voiceStatus, "READY");
    };

    window.speechSynthesis.speak(utterance);
}

/* =========================================================
   STOP SPEAKING
   ========================================================= */

function stopSpeaking() {

    if (!("speechSynthesis" in window)) {
        return;
    }

    window.speechSynthesis.cancel();

    setStatus(voiceStatus, "READY");
}

/* =========================================================
   GLOBAL JARVIS COMMANDS
   ===========================
