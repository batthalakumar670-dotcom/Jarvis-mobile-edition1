/* =========================================================
   J.A.R.V.I.S. MOBILE EDITION
   FRONTEND ENGINE v4.0
   ========================================================= */

"use strict";

/* =========================================================
   BACKEND
   ========================================================= */

const BACKEND_URL =
    "https://jarvis-backend-wwpa.onrender.com";


/* =========================================================
   STATE
   ========================================================= */

let conversation = [];
let isSending = false;
let recognition = null;
let isListening = false;
let resumeVoiceAfterSpeech = false;
let voices = [];


/* =========================================================
   DOM
   ========================================================= */

const chatBox =
    document.getElementById("chatBox");

const userInput =
    document.getElementById("userInput");

const sendBtn =
    document.getElementById("sendBtn");

const micBtn =
    document.getElementById("micBtn");

const aiStatus =
    document.getElementById("aiStatus");

const networkStatus =
    document.getElementById("networkStatus");

const memoryStatus =
    document.getElementById("memoryStatus");

const voiceStatus =
    document.getElementById("voiceStatus");

const voiceProtocolState =
    document.getElementById("voiceProtocolState");


/* =========================================================
   START
   ========================================================= */

function startJarvis() {

    console.log(
        "J.A.R.V.I.S. starting..."
    );

    console.log(
        "Send button:",
        sendBtn
    );

    console.log(
        "Input:",
        userInput
    );

    console.log(
        "Chat:",
        chatBox
    );

    setupSend();

    setupInput();

    setupQuickCommands();

    setupVoice();

    setupSpeech();

    setupMemory();

    checkBackend();

}


/* =========================================================
   SEND BUTTON
   ========================================================= */

function setupSend() {

    if (!sendBtn) {

        console.error(
            "ERROR: sendBtn not found."
        );

        return;
    }

    sendBtn.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            console.log(
                "SEND BUTTON CLICKED"
            );

            sendMessage();

        }
    );
}


/* =========================================================
   INPUT
   ========================================================= */

function setupInput() {

    if (!userInput) {

        console.error(
            "ERROR: userInput not found."
        );

        return;
    }

    userInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }

        }
    );
}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (isSending) {

        console.log(
            "Already processing message."
        );

        return;
    }

    if (!userInput) {

        console.error(
            "Input element missing."
        );

        return;
    }

    const message =
        userInput.value.trim();

    if (!message) {

        console.log(
            "Empty message."
        );

        return;
    }

    console.log(
        "USER MESSAGE:",
        message
    );
/* =========================
   J.A.R.V.I.S. APP COMMANDS
========================= */

const lowerMessage =
    message.toLowerCase();
/* NATURAL LANGUAGE COMMANDS */

/* NATURAL GOOGLE SEARCH */

if (
    lowerMessage.startsWith("google ") ||
    lowerMessage.startsWith("search for ") ||
    (
        lowerMessage.startsWith("find ") &&
        !lowerMessage.includes(" on amazon") &&
        !lowerMessage.includes(" on youtube") &&
        !lowerMessage.includes(" on wikipedia") &&
        !lowerMessage.includes(" on maps") &&
        !lowerMessage.includes(" on google maps")
    )
) {

    let query = "";

    if (
        lowerMessage.startsWith("google ")
    ) {

        query =
            message
                .replace(
                    /^google\s+/i,
                    ""
                )
                .trim();

    } else if (
        lowerMessage.startsWith("search for ")
    ) {

        query =
            message
                .replace(
                    /^search for\s+/i,
                    ""
                )
                .trim();

    } else {

        query =
            message
                .replace(
                    /^find\s+/i,
                    ""
                )
                .trim();
    }

    if (query) {

        addMessage(
            `Searching Google for "${query}".`,
            "assistant"
        );

        window.open(
            "https://www.google.com/search?q=" +
            encodeURIComponent(query),
            "_blank"
        );

        return;
    }
}


/* NATURAL YOUTUBE SEARCH */

if (
    lowerMessage.includes("on youtube")
) {

    const match =
        message.match(
            /(?:play|find|search)\s+(.+?)\s+on youtube/i
        );

    if (match) {

        const query =
            match[1].trim();

        addMessage(
            `Searching YouTube for "${query}".`,
            "assistant"
        );

        window.open(
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(query),
            "_blank"
        );

        return;
    }
}


/* NATURAL AMAZON SEARCH */

if (
    lowerMessage.includes("on amazon")
) {

    const match =
        message.match(
            /(?:find|search|buy)\s+(.+?)\s+on amazon/i
        );

    if (match) {

        const query =
            match[1].trim();

        addMessage(
            `Searching Amazon for "${query}".`,
            "assistant"
        );

        window.open(
            "https://www.amazon.in/s?k=" +
            encodeURIComponent(query),
            "_blank"
        );

        return;
    }
}


/* NATURAL WIKIPEDIA SEARCH */

if (
    lowerMessage.includes("on wikipedia")
) {

    const match =
        message.match(
            /(?:find|search)\s+(.+?)\s+on wikipedia/i
        );

    if (match) {

        const query =
            match[1].trim();

        addMessage(
            `Searching Wikipedia for "${query}".`,
            "assistant"
        );

        window.open(
            "https://en.wikipedia.org/wiki/Special:Search?search=" +
            encodeURIComponent(query),
            "_blank"
        );

        return;
    }
}


/* NATURAL MAPS SEARCH */

if (
    lowerMessage.includes("on maps") ||
    lowerMessage.includes("on google maps")
) {

    const match =
        message.match(
            /(?:find|search)\s+(.+?)\s+on (?:google )?maps/i
        );

    if (match) {

        const query =
            match[1].trim();

        addMessage(
            `Searching Google Maps for "${query}".`,
            "assistant"
        );

        window.open(
            "https://www.google.com/maps/search/" +
            encodeURIComponent(query),
            "_blank"
        );

        return;
    }
}
/* GOOGLE SEARCH */

if (
    lowerMessage.includes("search google for")
) {

    const query =
        message
            .replace(
                /.*search google for/i,
                ""
            )
            .trim();

    if (!query) {
        addMessage(
            "What should I search for on Google?",
            "assistant"
        );
        return;
    }

    addMessage(
        `Searching Google for "${query}".`,
        "assistant"
    );

    window.open(
        "https://www.google.com/search?q=" +
        encodeURIComponent(query),
        "_blank"
    );

    return;
}


/* GOOGLE */

if (
    lowerMessage.includes("open google")
) {

    addMessage(
        "Opening Google.",
        "assistant"
    );

    window.open(
        "https://www.google.com",
        "_blank"
    );

    return;
}


/* YOUTUBE SEARCH */

if (
    lowerMessage.includes("search youtube for")
) {

    const query =
        message
            .replace(
                /.*search youtube for/i,
                ""
            )
            .trim();

    if (!query) {
        addMessage(
            "What should I search for on YouTube?",
            "assistant"
        );
        return;
    }

    addMessage(
        `Searching YouTube for "${query}".`,
        "assistant"
    );

    window.open(
        "https://www.youtube.com/results?search_query=" +
        encodeURIComponent(query),
        "_blank"
    );

    return;
}


/* YOUTUBE */

if (
    lowerMessage.includes("open youtube")
) {

    addMessage(
        "Opening YouTube.",
        "assistant"
    );

    window.open(
        "https://www.youtube.com",
        "_blank"
    );

    return;
}


/* INSTAGRAM */

if (
    lowerMessage.includes("open instagram")
) {

    addMessage(
        "Opening Instagram.",
        "assistant"
    );

    window.open(
        "https://www.instagram.com",
        "_blank"
    );

    return;
}


/* SPOTIFY */

if (
    lowerMessage.includes("open spotify")
) {

    addMessage(
        "Opening Spotify.",
        "assistant"
    );

    window.open(
        "https://open.spotify.com",
        "_blank"
    );

    return;
}


/* GOOGLE MAPS SEARCH */

if (
    lowerMessage.includes("search maps for") ||
    lowerMessage.includes("search google maps for")
) {

    const query =
        message
            .replace(
                /.*search (google )?maps for/i,
                ""
            )
            .trim();

    if (!query) {
        addMessage(
            "What should I search for on Google Maps?",
            "assistant"
        );
        return;
    }

    addMessage(
        `Searching Google Maps for "${query}".`,
        "assistant"
    );

    window.open(
        "https://www.google.com/maps/search/" +
        encodeURIComponent(query),
        "_blank"
    );

    return;
}


/* GOOGLE MAPS */

if (
    lowerMessage.includes("open google maps") ||
    lowerMessage.includes("open maps")
) {

    addMessage(
        "Opening Google Maps.",
        "assistant"
    );

    window.open(
        "https://maps.google.com",
        "_blank"
    );

    return;
}


/* GMAIL */

if (
    lowerMessage.includes("open gmail")
) {

    addMessage(
        "Opening Gmail.",
        "assistant"
    );

    window.open(
        "https://mail.google.com",
        "_blank"
    );

    return;
}


/* AMAZON SEARCH */

if (
    lowerMessage.includes("search amazon for")
) {

    const query =
        message
            .replace(
                /.*search amazon for/i,
                ""
            )
            .trim();

    if (!query) {
        addMessage(
            "What should I search for on Amazon?",
            "assistant"
        );
        return;
    }

    addMessage(
        `Searching Amazon for "${query}".`,
        "assistant"
    );

    window.open(
        "https://www.amazon.in/s?k=" +
        encodeURIComponent(query),
        "_blank"
    );

    return;
}


/* AMAZON */

if (
    lowerMessage.includes("open amazon")
) {

    addMessage(
        "Opening Amazon.",
        "assistant"
    );

    window.open(
        "https://www.amazon.in",
        "_blank"
    );

    return;
}


/* WIKIPEDIA SEARCH */

if (
    lowerMessage.includes("search wikipedia for")
) {

    const query =
        message
            .replace(
                /.*search wikipedia for/i,
                ""
            )
            .trim();

    if (!query) {
        addMessage(
            "What should I search for on Wikipedia?",
            "assistant"
        );
        return;
    }

    addMessage(
        `Searching Wikipedia for "${query}".`,
        "assistant"
    );

    window.open(
        "https://en.wikipedia.org/wiki/Special:Search?search=" +
        encodeURIComponent(query),
        "_blank"
    );

    return;
}


/* WIKIPEDIA */

if (
    lowerMessage.includes("open wikipedia")
) {

    addMessage(
        "Opening Wikipedia.",
        "assistant"
    );

    window.open(
        "https://www.wikipedia.org",
        "_blank"
    );

    return;
}
   /* =========================
   LOCAL J.A.R.V.I.S. COMMANDS
========================= */

/* TIME */

if (
    lowerMessage.includes("what time is it") ||
   lowerMessage.includes("what is the time") ||
    lowerMessage === "time" ||
    lowerMessage.includes("current time")
) {

    const now =
        new Date();

    const time =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            }
        );

    addMessage(
        `The current time is ${time}.`,
        "assistant"
    );

    speak(
        `The current time is ${time}.`
    );

    return;
}


/* DATE */

if (
    lowerMessage.includes("what is today's date") ||
    lowerMessage.includes("what's today's date") ||
    lowerMessage.includes("today's date") ||
    lowerMessage === "date"
) {

    const now =
        new Date();

    const date =
        now.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );

    addMessage(
        `Today is ${date}.`,
        "assistant"
    );

    speak(
        `Today is ${date}.`
    );

    return;
}


/* BATTERY */

if (
    lowerMessage.includes("battery") ||
    lowerMessage.includes("battery percentage") ||
    lowerMessage.includes("battery level")
) {

    if (
        navigator.getBattery
    ) {

        const battery =
            await navigator.getBattery();

        const level =
            Math.round(
                battery.level * 100
            );

        const charging =
            battery.charging
                ? "and it is currently charging"
                : "and it is not charging";

        addMessage(
            `Battery level is ${level}% ${charging}.`,
            "assistant"
        );

        speak(
            `Battery level is ${level}% ${charging}.`
        );

    } else {

        addMessage(
            "Battery information is not available in this browser.",
            "assistant"
        );

    }

    return;
}


/* CALCULATOR */

if (
    lowerMessage.startsWith("calculate ") ||
    lowerMessage.startsWith("what is ")
) {

    let expression =
        message
            .replace(
                /^calculate\s+/i,
                ""
            )
            .replace(
                /^what is\s+/i,
                ""
            )
            .trim();

    if (
        /^[0-9+\-*/().%\s]+$/.test(
            expression
        )
    ) {

        try {

            const result =
                Function(
                    `"use strict"; return (${expression})`
                )();

            if (
                Number.isFinite(result)
            ) {

                addMessage(
                    `The answer is ${result}.`,
                    "assistant"
                );

                speak(
                    `The answer is ${result}.`
                );

                return;
            }

        } catch (error) {
            console.warn(
                "Calculator error:",
                error
            );
        }
    }

    addMessage(
        "I couldn't calculate that expression.",
        "assistant"
    );

    return;
}
    isSending = true;

    userInput.value = "";

    addMessage(
        message,
        "user"
    );

    const thinking =
        addThinking();

    setButtonLoading(true);


    try {

        setStatus(
            networkStatus,
            "CONNECTING"
        );

        console.log(
            "Connecting to:",
            `${BACKEND_URL}/api/chat`
        );


        const response =
            await fetch(
                `${BACKEND_URL}/api/chat`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        message: message,

                        context:
                            getContext()
                    })
                }
            );


        console.log(
            "HTTP STATUS:",
            response.status
        );


        let data;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                "The backend returned an invalid response."
            );
        }


        console.log(
            "BACKEND RESPONSE:",
            data
        );


        removeThinking(thinking);


        if (!response.ok) {

            const error =
                data?.error ||
                `Server error ${response.status}`;

            addMessage(
                `⚠️ ${error}`,
                "assistant",
                true
            );

            setStatus(
                networkStatus,
                "ONLINE"
            );

            return;
        }


        if (
            !data ||
            !data.reply
        ) {

            addMessage(
                "⚠️ J.A.R.V.I.S. returned no reply.",
                "assistant",
                true
            );

            return;
        }


        const reply =
            String(data.reply).trim();


        addMessage(
            reply,
            "assistant"
        );


        conversation.push({
            role: "user",
            content: message
        });


        conversation.push({
            role: "assistant",
            content: reply
        });


        saveConversation();


        setStatus(
            networkStatus,
            "ONLINE"
        );

        setStatus(
            aiStatus,
            "READY"
        );


        speak(reply);


    } catch (error) {

        console.error(
            "J.A.R.V.I.S. ERROR:",
            error
        );


        removeThinking(thinking);


        addMessage(
            "⚠️ Connection error.\n\n" +
            error.message,
            "assistant",
            true
        );


        setStatus(
            networkStatus,
            "OFFLINE"
        );

    } finally {

        isSending = false;

        setButtonLoading(false);

        if (userInput) {
            userInput.focus();
        }

    }
}


/* =========================================================
   ADD MESSAGE
   ========================================================= */

function addMessage(
    text,
    sender,
    isError = false
) {

    if (!chatBox) {

        console.error(
            "chatBox not found."
        );

        return null;
    }


    const message =
        document.createElement("div");


    message.className =
        "message " +
        (
            sender === "user"
                ? "user-message"
                : "assistant-message"
        );


    if (isError) {
        message.classList.add(
            "error-message"
        );
    }


    const content =
        document.createElement("div");


    content.className =
        "message-content";


    content.textContent =
        String(text);


    /*
       Convert newline characters to <br>
       without using unsafe HTML.
    */

    const lines =
        String(text).split("\n");


    content.textContent = "";


    lines.forEach(
        (line, index) => {

            content.appendChild(
                document.createTextNode(line)
            );

            if (
                index <
                lines.length - 1
            ) {

                content.appendChild(
                    document.createElement("br")
                );

            }

        }
    );


    message.appendChild(content);

    chatBox.appendChild(message);

    scrollChat();

    return message;
}


/* =========================================================
   THINKING
   ========================================================= */

function addThinking() {

    if (!chatBox) return null;


    const message =
        document.createElement("div");


    message.className =
        "message assistant-message jarvis-thinking";


    const content =
        document.createElement("div");


    content.className =
        "message-content";


    content.textContent =
        "J.A.R.V.I.S. is thinking...";


    message.appendChild(content);

    chatBox.appendChild(message);

    scrollChat();

    return message;
}


/* =========================================================
   REMOVE THINKING
   ========================================================= */

function removeThinking(element) {

    if (
        element &&
        element.parentNode
    ) {

        element.parentNode.removeChild(
            element
        );

    }
}


/* =========================================================
   SCROLL
   ========================================================= */

function scrollChat() {

    if (!chatBox) return;

    setTimeout(
        () => {

            chatBox.scrollTop =
                chatBox.scrollHeight;

        },
        30
    );
}


/* =========================================================
   BUTTON LOADING
   ========================================================= */

function setButtonLoading(
    loading
) {

    if (!sendBtn) return;


    sendBtn.disabled =
        loading;


    if (loading) {

        sendBtn.textContent =
            "…";

    } else {

        sendBtn.textContent =
            "➤";

    }

}


/* =========================================================
   BACKEND HEALTH
   ========================================================= */

async function checkBackend() {

    console.log(
        "Checking backend..."
    );


    try {

        const response =
            await fetch(
                `${BACKEND_URL}/api/health`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Health check: ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "HEALTH:",
            data
        );


        setStatus(
            networkStatus,
            "ONLINE"
        );


        if (
            data.aiConfigured
        ) {

            setStatus(
                aiStatus,
                "READY"
            );

        } else {

            setStatus(
                aiStatus,
                "NOT CONFIGURED"
            );

        }


    } catch (error) {

        console.error(
            "Backend offline:",
            error
        );


        setStatus(
            networkStatus,
            "OFFLINE"
        );

    }
}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(
    element,
    value
) {

    if (!element) return;

    element.textContent =
        value;

    element.dataset.status =
        String(value).toLowerCase();


    if (
        element === voiceStatus &&
        voiceProtocolState
    ) {

        voiceProtocolState.textContent =
            value;
    }
}


/* =========================================================
   CONTEXT
   ========================================================= */

function getContext() {

    const recent =
        conversation.slice(-10);


    if (!recent.length) {

        return "No previous conversation.";

    }


    return recent
        .map(
            item =>
                `${item.role}: ${item.content}`
        )
        .join("\n");
}


/* =========================================================
   QUICK COMMANDS
   ========================================================= */

function setupQuickCommands() {

    const buttons =
        document.querySelectorAll(
            "[data-command]"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const command =
                        button.dataset.command;


                    if (!command) return;


                    if (userInput) {

                        userInput.value =
                            command;

                    }


                    sendMessage();

                }
            );

        }
    );
}


/* =========================================================
   MEMORY
   ========================================================= */

function setupMemory() {

    setStatus(
        memoryStatus,
        "ACTIVE"
    );


    try {

        const saved =
            localStorage.getItem(
                "JARVIS_CONVERSATION"
            );


        if (saved) {

            const data =
                JSON.parse(saved);


            if (
                Array.isArray(data)
            ) {

                conversation =
                    data;

            }

        }

    } catch (error) {

        console.warn(
            "Memory unavailable:",
            error
        );


        setStatus(
            memoryStatus,
            "LIMITED"
        );
    }
}


/* =========================================================
   SAVE MEMORY
   ========================================================= */

function saveConversation() {

    try {

        localStorage.setItem(
            "JARVIS_CONVERSATION",
            JSON.stringify(
                conversation.slice(-30)
            )
        );

    } catch (error) {

        console.warn(
            "Could not save memory.",
            error
        );
    }
}


/* =========================================================
   VOICE RECOGNITION
   ========================================================= */

/* =========================================================
   VOICE RECOGNITION + HEY JARVIS
   ========================================================= */

function setupVoice() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        setStatus(
            voiceStatus,
            "UNAVAILABLE"
        );

        return;
    }

    recognition =
        new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    let wakeMode = false;
    let commandMode = false;

    recognition.onstart =
        function() {

            isListening = true;

            setStatus(
                voiceStatus,
                "LISTENING"
            );

            if (micBtn) {

                micBtn.classList.add(
                    "active"
                );

            }
        };


    recognition.onresult =
        function(event) {

            let text = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                text +=
                    event.results[i][0]
                        .transcript;
            }

            text =
                text.trim();

            if (!text) return;

            const lowerText =
                text.toLowerCase();


            /* =========================================
               WAIT FOR "HEY JARVIS"
               ========================================= */

            if (!wakeMode) {

                if (
                    lowerText.includes("hey jarvis") ||
                    lowerText.includes("hey jarvis")
                ) {

                    wakeMode = true;
                    commandMode = true;

                    const command =
                        text
                            .replace(
                                /hey jarvis/i,
                                ""
                            )
                            .trim();

                    if (command) {

                        if (userInput) {

                            userInput.value =
                                command;

                        }

                        sendMessage();

                    } else {

                        setStatus(
                            voiceStatus,
                            "READY"
                        );

                        speak(
                            "Yes, I'm listening."
                        );
                    }

                }

                return;
            }


            /* =========================================
               COMMAND MODE
               ========================================= */

            if (commandMode) {

                if (userInput) {

                    userInput.value =
                        text;

                }

            }

        };


    recognition.onerror =
        function(event) {

            console.error(
                "VOICE ERROR:",
                event.error
            );

        };


    recognition.onend =
        function() {

            isListening = false;

            if (micBtn) {

                micBtn.classList.remove(
                    "active"
                );

            }


            /*
               Automatically restart while
               hands-free mode is active.
            */
if (
    commandMode &&
    userInput &&
    userInput.value.trim()
) {
    wakeMode = false;
commandMode = false;
sendMessage();
}
            if (wakeMode) {

                setTimeout(
                    function() {

                        try {

                            recognition.start();

                        } catch (error) {

                            console.warn(
                                "Voice restart:",
                                error
                            );

                        }

                    },
                    500
                );

            } else {

                setStatus(
                    voiceStatus,
                    "READY"
                );

            }

        };


    /* ================================================
       MICROPHONE BUTTON
       ================================================ */

    if (micBtn) {

        micBtn.addEventListener(
            "click",
            function() {

                if (wakeMode) {

                    wakeMode = false;
                    commandMode = false;

                    try {

                        recognition.stop();

                    } catch (error) {

                        console.warn(
                            error
                        );

                    }

                    setStatus(
                        voiceStatus,
                        "READY"
                    );

                    return;
                }


                wakeMode = true;
commandMode = true;
               resumeVoiceAfterSpeech = true;

                try {

                    recognition.start();

                } catch (error) {

                    console.warn(
                        "Voice start:",
                        error
                    );

                }

            }
        );

    }

}


/* =========================================================
   SPEECH
   ========================================================= */

function setupSpeech() {

    if (
        !("speechSynthesis" in window)
    ) {

        return;
    }


    loadVoices();


    window.speechSynthesis
        .onvoiceschanged =
        loadVoices;
}


/* =========================================================
   LOAD VOICES
   ========================================================= */

function loadVoices() {

    if (
        !("speechSynthesis" in window)
    ) {

        return;
    }


    voices =
        window.speechSynthesis
            .getVoices();

}


/* =========================================================
   SPEAK
   ========================================================= */

function speak(text) {

    if (
        !("speechSynthesis" in window)
    ) {

        return;
    }


    if (!text) return;


    window.speechSynthesis.cancel();


    const clean =
        String(text)
            .replace(
                /[*_#>`~]/g,
                ""
            )
            .replace(
                /\[(.*?)\]\(.*?\)/g,
                "$1"
            )
            .trim();


    if (!clean) return;


    const utterance =
        new SpeechSynthesisUtterance(
            clean
        );


    const indianVoice =
        voices.find(
            voice =>
                voice.lang &&
                voice.lang
                    .toLowerCase() ===
                "en-in"
        );


    const englishVoice =
        voices.find(
            voice =>
                voice.lang &&
                voice.lang
                    .toLowerCase()
                    .startsWith("en")
        );


    if (indianVoice) {

        utterance.voice =
            indianVoice;

    } else if (englishVoice) {

        utterance.voice =
            englishVoice;

    }


    utterance.lang =
        "en-IN";

    utterance.rate =
        0.95;

    utterance.pitch =
        0.9;

    utterance.volume =
        1;


    utterance.onstart =
        function() {

            setStatus(
                voiceStatus,
                "SPEAKING"
            );

        };


    utterance.onend =
        function() {

            setStatus(
                voiceStatus,
                "READY"
            );
if (resumeVoiceAfterSpeech) {
    resumeVoiceAfterSpeech = false;
    wakeMode = true;
    commandMode = true;

    try {
        recognition.start();
    } catch (error) {
        console.warn(
            "Voice resume:",
            error
        );
    }
}
        };


    utterance.onerror =
        function() {

            setStatus(
                voiceStatus,
                "READY"
            );

        };


    window.speechSynthesis.speak(
        utterance
    );
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.JARVIS = {

    sendMessage,

    speak,

    checkBackend,

    stopSpeaking: function() {

        if (
            "speechSynthesis"
            in window
        ) {

            window.speechSynthesis.cancel();

        }

    }

};


/* =========================================================
   START J.A.R.V.I.S.
   ========================================================= */

/* =========================================================
   START J.A.R.V.I.S.
   ========================================================= */

startJarvis();

console.log(
    "================================="
);

console.log(
    "J.A.R.V.I.S. FRONTEND READY"
);

console.log(
    "BACKEND:",
    BACKEND_URL
);

console.log(
    "================================="
);
