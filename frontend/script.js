/* =========================================================
   J.A.R.V.I.S. 2.0
   FRONTEND ENGINE
   Gemini requests go through the secure Render backend.
   ========================================================= */

"use strict";

/* =========================================================
   BACKEND
   ========================================================= */

const BACKEND_URL = "https://jarvis-backend-wwpa.onrender.com";

/* =========================================================
   CONFIG
   ========================================================= */

const MEMORY_DB = "JARVIS_MEMORY_DB";
const MEMORY_STORE = "memories";

let db = null;
let conversation = [];
let recognition = null;
let isListening = false;
let currentVoices = [];

/* =========================================================
   DOM
   ========================================================= */

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const micBtn = document.getElementById("micBtn");

const aiStatus = document.getElementById("aiStatus");
const networkStatus = document.getElementById("networkStatus");
const memoryStatus = document.getElementById("memoryStatus");
const voiceStatus = document.getElementById("voiceStatus");

const memoryBtn = document.getElementById("memoryBtn");
const memoryDrawer = document.getElementById("memoryDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const closeMemory = document.getElementById("closeMemory");

const memoryList = document.getElementById("memoryList");
const memorySearch = document.getElementById("memorySearch");

const saveChatBtn = document.getElementById("saveChat");
const clearMemoryBtn = document.getElementById("clearMemory");

const voiceSelect = document.getElementById("voiceSelect");
const pitchSlider = document.getElementById("pitchSlider");
const rateSlider = document.getElementById("rateSlider");

const pitchValue = document.getElementById("pitchValue");
const rateValue = document.getElementById("rateValue");

const testVoiceBtn = document.getElementById("testVoice");

/* =========================================================
   SAFE ELEMENT HELPERS
   ========================================================= */

function exists(element) {
  return element !== null && element !== undefined;
}

function setText(element, text) {
  if (exists(element)) {
    element.textContent = text;
  }
}

function setStatus(element, text) {
  if (exists(element)) {
    element.textContent = text;
  }
}

/* =========================================================
   UI STATUS
   ========================================================= */

function setAIStatus(text) {
  setStatus(aiStatus, text);
}

function setNetworkStatus(text) {
  setStatus(networkStatus, text);
}

function setMemoryStatus(text) {
  setStatus(memoryStatus, text);
}

function setVoiceStatus(text) {
  setStatus(voiceStatus, text);
}

/* =========================================================
   CHAT UI
   ========================================================= */

function addMessage(role, text, speak = false) {
  if (!exists(chatBox)) return;

  const message = document.createElement("div");

  message.className =
    role === "user"
      ? "message user-message"
      : "message jarvis-message";

  const label = document.createElement("div");

  label.className = "message-label";
  label.textContent =
    role === "user" ? "YOU" : "J.A.R.V.I.S.";

  const content = document.createElement("div");

  content.className = "message-content";
  content.textContent = text;

  message.appendChild(label);
  message.appendChild(content);

  chatBox.appendChild(message);

  chatBox.scrollTop = chatBox.scrollHeight;

  if (speak && role !== "user") {
    speakText(text);
  }
}

function addThinkingMessage() {
  if (!exists(chatBox)) return null;

  const message = document.createElement("div");

  message.className = "message jarvis-message thinking-message";

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = "J.A.R.V.I.S.";

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = "Processing...";

  message.appendChild(label);
  message.appendChild(content);

  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;

  return message;
}

function removeMessage(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/* =========================================================
   CONVERSATION
   ========================================================= */

function addConversation(role, text) {
  conversation.push({
    role,
    text,
    time: Date.now()
  });

  /* Keep browser memory lightweight */
  if (conversation.length > 30) {
    conversation = conversation.slice(-30);
  }
}

function getRecentConversation() {
  return conversation
    .slice(-10)
    .map(item => {
      const name = item.role === "user" ? "User" : "JARVIS";
      return `${name}: ${item.text}`;
    })
    .join("\n");
}

/* =========================================================
   INDEXEDDB MEMORY
   ========================================================= */

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported."));
      return;
    }

    const request = indexedDB.open(MEMORY_DB, 1);

    request.onupgradeneeded = event => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(MEMORY_STORE)) {
        const store = database.createObjectStore(
          MEMORY_STORE,
          {
            keyPath: "id",
            autoIncrement: true
          }
        );

        store.createIndex(
          "createdAt",
          "createdAt",
          { unique: false }
        );
      }
    };

    request.onsuccess = event => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function saveMemory(title, content) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Memory database unavailable."));
      return;
    }

    const transaction = db.transaction(
      MEMORY_STORE,
      "readwrite"
    );

    const store = transaction.objectStore(MEMORY_STORE);

    const request = store.add({
      title: title || "J.A.R.V.I.S. Memory",
      content: content || "",
      createdAt: Date.now()
    });

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => reject(request.error);
  });
}

function getMemories() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve([]);
      return;
    }

    const transaction = db.transaction(
      MEMORY_STORE,
      "readonly"
    );

    const store = transaction.objectStore(MEMORY_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      const memories = request.result || [];

      memories.sort(
        (a, b) => b.createdAt - a.createdAt
      );

      resolve(memories);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function deleteMemory(id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Memory database unavailable."));
      return;
    }

    const transaction = db.transaction(
      MEMORY_STORE,
      "readwrite"
    );

    const store = transaction.objectStore(MEMORY_STORE);

    const request = store.delete(id);

    request.onsuccess = () => resolve();

    request.onerror = () => reject(request.error);
  });
}

function clearAllMemories() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    const transaction = db.transaction(
      MEMORY_STORE,
      "readwrite"
    );

    const store = transaction.objectStore(MEMORY_STORE);

    const request = store.clear();

    request.onsuccess = () => resolve();

    request.onerror = () => reject(request.error);
  });
}

/* =========================================================
   MEMORY CONTEXT
   ========================================================= */

async function getMemoryContext() {
  try {
    const memories = await getMemories();

    return memories
      .slice(0, 10)
      .map(memory => {
        return `${memory.title}: ${memory.content}`;
      })
      .join("\n");
  } catch (error) {
    console.warn("Memory context error:", error);
    return "";
  }
}

/* =========================================================
   RENDER MEMORY LIST
   ========================================================= */

async function renderMemories(filter = "") {
  if (!exists(memoryList)) return;

  try {
    const memories = await getMemories();

    const search = filter
      .trim()
      .toLowerCase();

    const filtered = memories.filter(memory => {
      if (!search) return true;

      return (
        memory.title.toLowerCase().includes(search) ||
        memory.content.toLowerCase().includes(search)
      );
    });

    memoryList.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("div");

      empty.className = "memory-empty";
      empty.textContent = "No memories found.";

      memoryList.appendChild(empty);
      return;
    }

    filtered.forEach(memory => {
      const item = document.createElement("div");

      item.className = "memory-item";

      const title = document.createElement("div");

      title.className = "memory-title";
      title.textContent = memory.title;

      const content = document.createElement("div");

      content.className = "memory-content";
      content.textContent = memory.content;

      const date = document.createElement("div");

      date.className = "memory-date";

      date.textContent = new Date(
        memory.createdAt
      ).toLocaleString();

      const deleteButton = document.createElement("button");

      deleteButton.className = "memory-delete";
      deleteButton.textContent = "DELETE";

      deleteButton.addEventListener(
        "click",
        async () => {
          await deleteMemory(memory.id);
          await renderMemories(
            exists(memorySearch)
              ? memorySearch.value
              : ""
          );
        }
      );

      item.appendChild(title);
      item.appendChild(content);
      item.appendChild(date);
      item.appendChild(deleteButton);

      memoryList.appendChild(item);
    });

    setMemoryStatus(`${filtered.length} MEMORY`);
  } catch (error) {
    console.error(error);
  }
}

/* =========================================================
   GEMINI → RENDER BACKEND
   ========================================================= */

async function callGemini(prompt) {
  const response = await fetch(
    `${BACKEND_URL}/api/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        message: prompt
      })
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "J.A.R.V.I.S. backend returned an invalid response."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Backend error: ${response.status}`
    );
  }

  if (!data.reply) {
    throw new Error(
      "J.A.R.V.I.S. received no AI response."
    );
  }

  return data.reply.trim();
}

/* =========================================================
   ASK JARVIS
   ========================================================= */

async function askJarvis(question) {
  if (!question || !question.trim()) {
    return;
  }

  const cleanQuestion = question.trim();

  addMessage(
    "user",
    cleanQuestion,
    false
  );

  addConversation(
    "user",
    cleanQuestion
  );

  if (exists(userInput)) {
    userInput.value = "";
  }

  setAIStatus("THINKING");
  setNetworkStatus("CONNECTING");

  const thinking = addThinkingMessage();

  try {
    const memory = await getMemoryContext();

    const recentConversation =
      getRecentConversation();

    const prompt = `
You are J.A.R.V.I.S., a futuristic personal AI assistant.

Personality:
- Intelligent
- Calm
- Helpful
- Clear
- Slightly futuristic
- Natural conversational style

Important:
- Never claim you performed an action unless the connected system actually performed it.
- If you cannot control something yet, clearly say so.
- Keep answers reasonably concise unless the user asks for detail.

Saved memory:
${memory || "No saved memories."}

Recent conversation:
${recentConversation || "No previous conversation."}

Current user request:
${cleanQuestion}
`;

    const reply = await callGemini(prompt);

    removeMessage(thinking);

    addMessage(
      "assistant",
      reply,
      true
    );

    addConversation(
      "assistant",
      reply
    );

    setAIStatus("ONLINE");
    setNetworkStatus("CONNECTED");

  } catch (error) {
    console.error(
      "J.A.R.V.I.S. error:",
      error
    );

    removeMessage(thinking);

    let message =
      "I am unable to connect to my AI core right now.";

    if (
      error.message &&
      error.message.length < 250
    ) {
      message += `\n\nError: ${error.message}`;
    }

    addMessage(
      "assistant",
      message,
      false
    );

    setAIStatus("ERROR");
    setNetworkStatus("OFFLINE");
  }
}

/* =========================================================
   SEND BUTTON
   ========================================================= */

function sendCurrentMessage() {
  if (!exists(userInput)) return;

  const message = userInput.value.trim();

  if (!message) return;

  askJarvis(message);
}

if (exists(sendBtn)) {
  sendBtn.addEventListener(
    "click",
    sendCurrentMessage
  );
}

if (exists(userInput)) {
  userInput.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        sendCurrentMessage();
      }
    }
  );
}

/* =========================================================
   QUICK COMMANDS
   ========================================================= */

document.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        "[data-command]"
      );

    if (!button) return;

    const command =
      button.getAttribute(
        "data-command"
      );

    if (command) {
      askJarvis(command);
    }
  }
);

/* =========================================================
   VOICE RECOGNITION
   ========================================================= */

function initializeSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setVoiceStatus("NOT SUPPORTED");
    return;
  }

  recognition =
    new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.lang = "en-IN";

  recognition.onstart = () => {
    isListening = true;

    setVoiceStatus("LISTENING");

    if (exists(micBtn)) {
      micBtn.classList.add(
        "listening"
      );
    }
  };

  recognition.onresult = event => {
    const result =
      event.results[
        event.results.length - 1
      ];

    const text =
      result[0].transcript.trim();

    if (text) {
      if (exists(userInput)) {
        userInput.value = text;
      }

      askJarvis(text);
    }
  };

  recognition.onerror = event => {
    console.warn(
      "Speech recognition:",
      event.error
    );

    isListening = false;

    setVoiceStatus("READY");

    if (exists(micBtn)) {
      micBtn.classList.remove(
        "listening"
      );
    }
  };

  recognition.onend = () => {
    isListening = false;

    setVoiceStatus("READY");

    if (exists(micBtn)) {
      micBtn.classList.remove(
        "listening"
      );
    }
  };
}

function toggleListening() {
  if (!recognition) {
    initializeSpeechRecognition();
  }

  if (!recognition) {
    alert(
      "Voice recognition is not supported by this browser."
    );
    return;
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  try {
    recognition.start();
  } catch (error) {
    console.warn(error);
  }
}

if (exists(micBtn)) {
  micBtn.addEventListener(
    "click",
    toggleListening
  );
}

/* =========================================================
   TEXT TO SPEECH
   ========================================================= */

function loadVoices() {
  if (!("speechSynthesis" in window)) {
    setVoiceStatus("NOT SUPPORTED");
    return;
  }

  currentVoices =
    speechSynthesis.getVoices();

  if (!exists(voiceSelect)) return;

  voiceSelect.innerHTML = "";

  currentVoices.forEach(
    (voice, index) => {
      const option =
        document.createElement("option");

      option.value = index;

      option.textContent =
        `${voice.name} — ${voice.lang}`;

      voiceSelect.appendChild(
        option
      );
    }
  );

  const preferredIndex =
    currentVoices.findIndex(
      voice =>
        voice.lang
          .toLowerCase()
          .includes("en-in")
    );

  if (preferredIndex >= 0) {
    voiceSelect.value =
      preferredIndex;
  }
}

function speakText(text) {
  if (
    !text ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );

  let selectedVoice = null;

  if (exists(voiceSelect)) {
    const index =
      Number(voiceSelect.value);

    if (
      currentVoices[index]
    ) {
      selectedVoice =
        currentVoices[index];
    }
  }

  if (selectedVoice) {
    utterance.voice =
      selectedVoice;
  }

  const pitch =
    exists(pitchSlider)
      ? Number(pitchSlider.value)
      : 1;

  const rate =
    exists(rateSlider)
      ? Number(rateSlider.value)
      : 1;

  utterance.pitch =
    Number.isFinite(pitch)
      ? pitch
      : 1;

  utterance.rate =
    Number.isFinite(rate)
      ? rate
      : 1;

  utterance.volume = 1;

  utterance.onstart = () => {
    setVoiceStatus("SPEAKING");
  };

  utterance.onend = () => {
    setVoiceStatus("READY");
  };

  utterance.onerror = () => {
    setVoiceStatus("READY");
  };

  speechSynthesis.speak(
    utterance
  );
}

/* =========================================================
   VOICE CONTROLS
   ========================================================= */

if (pitchSlider) {
  pitchSlider.addEventListener(
    "input",
    () => {
      setText(
        pitchValue,
        pitchSlider.value
      );
    }
  );
}

if (rateSlider) {
  rateSlider.addEventListener(
    "input",
    () => {
      setText(
        rateValue,
        rateSlider.value
      );
    }
  );
}

if (exists(testVoiceBtn)) {
  testVoiceBtn.addEventListener(
    "click",
    () => {
      speakText(
        "J.A.R.V.I.S. voice protocol is online."
      );
    }
  );
}

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged =
    loadVoices;

  loadVoices();
}

/* =========================================================
   MEMORY DRAWER
   ========================================================= */

function openMemoryDrawer() {
  if (exists(memoryDrawer)) {
    memoryDrawer.classList.add(
      "open"
    );
  }

  if (exists(drawerOverlay)) {
    drawerOverlay.classList.add(
      "open"
    );
  }

  renderMemories();
}

function closeMemoryDrawer() {
  if (exists(memoryDrawer)) {
    memoryDrawer.classList.remove(
      "open"
    );
  }

  if (exists(drawerOverlay)) {
    drawerOverlay.classList.remove(
      "open"
    );
  }
}

if (exists(memoryBtn)) {
  memoryBtn.addEventListener(
    "click",
    openMemoryDrawer
  );
}

if (exists(closeMemory)) {
  closeMemory.addEventListener(
