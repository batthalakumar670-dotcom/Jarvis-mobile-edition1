/* =========================================================
   J.A.R.V.I.S
   Gemini + Voice + Persistent Memory
========================================================= */


/* =========================================================
   API KEY
========================================================= */

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your Gemini API Key:");

  if (API_KEY) {
    localStorage.setItem("jarvis_key", API_KEY);
  }
}


/* =========================================================
   MODELS
========================================================= */

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash"
];


/* =========================================================
   ELEMENTS
========================================================= */

const chat = document.getElementById("chat");
const input = document.getElementById("msg");

const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");

const coreState = document.getElementById("core-state");
const statusText = document.getElementById("status-text");

const memoryStatus =
  document.getElementById("memory-status");

const voiceStatus =
  document.getElementById("voice-status");

const memoryPanel =
  document.getElementById("memory-panel");

const overlay =
  document.getElementById("overlay");

const memoryToggle =
  document.getElementById("memory-toggle");

const memoryClose =
  document.getElementById("memory-close");

const memoryList =
  document.getElementById("memory-list");

const memoryCount =
  document.getElementById("memory-count");

const memorySearch =
  document.getElementById("memory-search");

const saveMemoryBtn =
  document.getElementById("save-memory");

const clearMemoryBtn =
  document.getElementById("clear-memory");

const voiceSelect =
  document.getElementById("voice-select");

const pitchControl =
  document.getElementById("pitch");

const rateControl =
  document.getElementById("rate");

const testVoiceBtn =
  document.getElementById("test-voice");


/* =========================================================
   CHAT STATE
========================================================= */

let conversation = [];

let currentConversationId =
  crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString();

let voices = [];


/* =========================================================
   UI STATUS
========================================================= */

function setStatus(state, message) {

  coreState.textContent = state;

  statusText.textContent = message;

}


/* =========================================================
   ADD CHAT MESSAGE
========================================================= */

function addMessage(text, type) {

  const message =
    document.createElement("div");

  message.className = `msg ${type}`;

  message.innerText = text;

  chat.appendChild(message);

  chat.scrollTop =
    chat.scrollHeight;

  return message;
}


/* =========================================================
   SAVE CONVERSATION LOCALLY
========================================================= */

function saveConversationMessage(role, text) {

  conversation.push({
    role,
    text,
    time: Date.now()
  });

}


/* =========================================================
   INDEXED DB
========================================================= */

const DB_NAME = "JARVIS_MEMORY_DB";

const DB_VERSION = 1;

const STORE_NAME = "memories";


function openDatabase() {

  return new Promise((resolve, reject) => {

    const request =
      indexedDB.open(DB_NAME, DB_VERSION);


    request.onupgradeneeded = event => {

      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {

        const store =
          db.createObjectStore(
            STORE_NAME,
            {
              keyPath: "id",
              autoIncrement: true
            }
          );

        store.createIndex(
          "created",
          "created"
        );

      }

    };


    request.onsuccess = () => {

      memoryStatus.textContent = "READY";

      resolve(request.result);

    };


    request.onerror = () => {

      memoryStatus.textContent = "ERROR";

      reject(request.error);

    };

  });

}


/* =========================================================
   SAVE MEMORY
========================================================= */

async function saveMemory(title, text) {

  const db =
    await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        STORE_NAME,
        "readwrite"
      );

    const store =
      transaction.objectStore(STORE_NAME);


    store.add({
      title,
      text,
      created: Date.now()
    });


    transaction.oncomplete = () => {

      loadMemories();

      resolve();

    };


    transaction.onerror = () => {

      reject(transaction.error);

    };

  });

}


/* =========================================================
   GET MEMORIES
========================================================= */

async function getMemories() {

  const db =
    await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        STORE_NAME,
        "readonly"
      );

    const store =
      transaction.objectStore(STORE_NAME);


    const request =
      store.getAll();


    request.onsuccess = () => {

      resolve(
        request.result.reverse()
      );

    };


    request.onerror = () => {

      reject(request.error);

    };

  });

}


/* =========================================================
   DELETE MEMORY
========================================================= */

async function deleteMemory(id) {

  const db =
    await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        STORE_NAME,
        "readwrite"
      );

    const store =
      transaction.objectStore(STORE_NAME);


    store.delete(id);


    transaction.oncomplete = () => {

      loadMemories();

      resolve();

    };


    transaction.onerror = () => {

      reject(transaction.error);

    };

  });

}


/* =========================================================
   CLEAR MEMORY
========================================================= */

async function clearAllMemory() {

  const confirmed =
    confirm(
      "Delete all J.A.R.V.I.S memories?"
    );

  if (!confirmed) return;


  const db =
    await openDatabase();


  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        STORE_NAME,
        "readwrite"
      );

    const store =
      transaction.objectStore(STORE_NAME);


    store.clear();


    transaction.oncomplete = () => {

      loadMemories();

      resolve();

    };


    transaction.onerror = () => {

      reject(transaction.error);

    };

  });

}


/* =========================================================
   DISPLAY MEMORIES
========================================================= */

async function loadMemories() {

  const memories =
    await getMemories();


  const search =
    memorySearch.value
      .trim()
      .toLowerCase();


  const filtered =
    memories.filter(memory => {

      if (!search) return true;

      return (
        memory.title
          .toLowerCase()
          .includes(search) ||

        memory.text
          .toLowerCase()
          .includes(search)
      );

    });


  memoryCount.textContent =
    `${memories.length} memor${memories.length === 1 ? "y" : "ies"}`;


  memoryList.innerHTML = "";


  if (filtered.length === 0) {

    memoryList.innerHTML = `
      <div class="memory-card">
        <div class="memory-card-text">
          No memories found.
        </div>
      </div>
    `;

    return;

  }


  filtered.forEach(memory => {

    const card =
      document.createElement("div");

    card.className =
      "memory-card";


    const title =
      document.createElement("div");

    title.className =
      "memory-card-title";

    title.innerText =
      memory.title;


    const text =
      document.createElement("div");

    text.className =
      "memory-card-text";

    text.innerText =
      memory.text;


    const date =
      document.createElement("div");

    date.className =
      "memory-card-date";

    date.innerText =
      new Date(memory.created)
        .toLocaleString();


    const deleteBtn =
      document.createElement("button");

    deleteBtn.className =
      "memory-delete";

    deleteBtn.innerText =
      "DELETE";


    deleteBtn.onclick =
      () => deleteMemory(memory.id);


    card.appendChild(title);

    card.appendChild(text);

    card.appendChild(date);

    card.appendChild(deleteBtn);

    memoryList.appendChild(card);

  });

}


/* =========================================================
   MEMORY PANEL
========================================================= */

function openMemory() {

  memoryPanel.classList.add("active");

  overlay.classList.add("active");

  loadMemories();

}


function closeMemory() {

  memoryPanel.classList.remove("active");

  overlay.classList.remove("active");

}


memoryToggle.onclick =
  openMemory;


memoryClose.onclick =
  closeMemory;


overlay.onclick =
  closeMemory;


memorySearch.addEventListener(
  "input",
  loadMemories
);


/* =========================================================
   SAVE CURRENT CHAT
========================================================= */

saveMemoryBtn.onclick =
  async () => {

    if (conversation.length === 0) {

      alert(
        "There is no conversation to save yet."
      );

      return;

    }


    const userMessages =
      conversation
        .filter(item => item.role === "user")
        .map(item => item.text);


    const aiMessages =
      conversation
        .filter(item => item.role === "assistant")
        .map(item => item.text);


    const summary =
      [
        ...userMessages.slice(-5),
        ...aiMessages.slice(-5)
      ]
      .join("\n");


    await saveMemory(
      "Conversation",
      summary
    );


    setStatus(
      "MEMORY",
      "Conversation saved"
    );

  };


/* =========================================================
   CLEAR MEMORY
========================================================= */

clearMemoryBtn.onclick =
  clearAllMemory;


/* =========================================================
   GEMINI API
========================================================= */

async function callGemini(prompt) {

  if (!API_KEY) {

    throw new Error(
      "Gemini API key is missing."
    );

  }


  let lastError = null;


  for (const model of MODELS) {

    try {

      const response =
        await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": API_KEY
            },

            body: JSON.stringify({

              contents: [
                {
                  parts: [
                    {
                      text: prompt
                    }
                  ]
                }
              ]

            })

          }
        );


      const data =
        await response.json();


      if (!response.ok || data.error) {

        lastError =
          new Error(
            data?.error?.message ||
            `HTTP ${response.status}`
          );

        continue;

      }


      const answer =
        data
          ?.candidates?.[0]
          ?.content
          ?.parts
          ?.map(part => part.text || "")
          ?.join("")
          ?.trim();


      if (!answer) {

        throw new Error(
          "Gemini returned an empty response."
        );

      }


      return answer;

    }

    catch (error) {

      lastError = error;

    }

  }


  throw (
    lastError ||
    new Error("Gemini request failed.")
  );

}


/* =========================================================
   BUILD MEMORY CONTEXT
========================================================= */

async function getMemoryContext() {

  try {

    const memories =
      await getMemories();


    if (!memories.length) {

      return "";

    }


    return memories
      .slice(0, 10)
      .map(
        memory =>
          `Memory: ${memory.title}\n${memory.text}`
      )
      .join("\n\n");

  }

  catch {

    return "";

  }

}


/* =========================================================
   ASK JARVIS
========================================================= */

async function askJarvis(userText) {

  setStatus(
    "THINKING",
    "Processing your request..."
  );


  const thinkingMessage =
    addMessage(
      "J.A.R.V.I.S: Thinking...",
      "ai"
    );


  saveConversationMessage(
    "user",
    userText
  );


  const memoryContext =
    await getMemoryContext();


  const recentConversation =
    conversation
      .slice(-12)
      .map(
        item =>
          `${item.role}: ${item.text}`
      )
      .join("\n");


  const prompt = `
You are J.A.R.V.I.S., a highly capable personal AI assistant.

Be helpful, intelligent, concise, and natural.

Use the supplied memory when it is relevant.
Do not claim to remember something if it is not present.

USER MEMORY:
${memoryContext || "No stored memories."}

RECENT CONVERSATION:
${recentConversation}

CURRENT USER MESSAGE:
${userText}

Respond directly to the user.
`;


  try {

    const reply =
      await callGemini(prompt);


    thinkingMessage.innerText =
      "J.A.R.V.I.S: " + reply;


    saveConversationMessage(
      "assistant",
      reply
    );


    setStatus(
      "SPEAKING",
      "Response ready"
    );


    speak(reply);


    setTimeout(() => {

      setStatus(
        "ONLINE",
        "Systems operational"
      );

    }, 1200);


  }

  catch (error) {

    console.error(error);


    thinkingMessage.innerText =
      "J.A.R.V.I.S: ERROR — " +
      error.message;


    setStatus(
      "ERROR",
      "System error"
    );

  }

}


/* =========================================================
   SEND MESSAGE
========================================================= */

function sendMessage() {

  const text =
    input.value.trim();


  if (!text) return;


  addMessage(
    "YOU: " + text,
    "user"
  );


  input.value = "";


  askJarvis(text);

}


sendBtn.onclick =
  sendMessage;


input.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      sendMessage();

    }

  }
);


/* =========================================================
   SPEECH RECOGNITION
========================================================= */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


let recognition = null;


if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();


  recognition.lang =
    "en-US";


  recognition.continuous =
    false;


  recognition.interimResults =
    false;


  recognition.onstart =
    () => {

      micBtn.classList.add(
        "listening"
      );

      micBtn.innerText =
        "⏺";

      setStatus(
        "LISTENING",
        "I'm listening..."
      );

    };


  recognition.onresult =
    event => {

      const text =
        event
          .results[0][0]
          .transcript
          .trim();


      if (!text) return;


      addMessage(
        "YOU: " + text,
        "user"
      );


      askJarvis(text);

    };


  recognition.onerror =
    event => {

      console.error(
        "Speech error:",
        event.error
      );


      setStatus(
        "ONLINE",
        "Microphone error"
      );

    };


  recognition.onend =
    () => {

      micBtn.classList.remove(
        "listening"
      );

      micBtn.innerText =
        "🎙️";


      if (
        coreState.textContent ===
        "LISTENING"
      ) {

        setStatus(
          "ONLINE",
          "Systems operational"
        );

      }

    };


  micBtn.onclick =
    () => {

      try {

        recognition.start();

      }

      catch (error) {

        console.log(error);

      }

    };


  voiceStatus.textContent =
    "READY";

}

else {

  micBtn.disabled =
    true;

  voiceStatus.textContent =
    "UNAVAILABLE";

}


/* =========================================================
   TEXT TO SPEECH
========================================================= */

function loadVoices() {

  voices =
    speechSynthesis.getVoices();


  voiceSelect.innerHTML = "";


  if (!voices.length) {

    const option =
      document.createElement("option");

    option.textContent =
      "Default browser voice";

    option.value = "";

    voiceSelect.appendChild(
      option
    );

    return;

  }


  const englishVoices =
    voices.filter(
      voice =>
        voice.lang
          .toLowerCase()
          .startsWith("en")
    );


  const available =
    englishVoices.length
      ? englishVoices
      : voices;


  available.forEach(
    (voice, index) => {

      const option =
        document.createElement("option");

      option.value =
        voices.indexOf(voice);

      option.textContent =
        `${voice.name} (${voice.lang})`;


      voiceSelect.appendChild(
        option
      );

    }
  );


  // Prefer an English male/deeper voice if available
  const preferredIndex =
    available.findIndex(
      voice =>
        /male|daniel|alex|david|george|guy|fred|arthur/i
          .test(voice.name)
    );


  if (preferredIndex >= 0) {

    voiceSelect.value =
      voices.indexOf(
        available[preferredIndex]
      );

  }


  voiceStatus.textContent =
    "READY";

}


loadVoices();


if ("onvoiceschanged" in speechSynthesis) {

  speechSynthesis.onvoiceschanged =
    loadVoices;

}


/* =========================================================
   JARVIS VOICE
========================================================= */

function speak(text) {

  if (
    !("speechSynthesis" in window)
  ) {

    return;

  }


  speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  utterance.rate =
    Number(rateControl.value);


  utterance.pitch =
    Number(pitchControl.value);


  const selectedIndex =
    Number(voiceSelect.value);


  if (
    !Number.isNaN(selectedIndex) &&
    voices[selectedIndex]
  ) {

    utterance.voice =
      voices[selectedIndex];

  }


  utterance.onstart =
    () => {

      setStatus(
        "SPEAKING",
        "J.A.R.V.I.S is speaking..."
      );

    };


  utterance.onend =
    () => {

      setStatus(
        "ONLINE",
        "Systems operational"
      );

    };


  speechSynthesis.speak(
    utterance
  );

}


/* =========================================================
   TEST VOICE
========================================================= */

testVoiceBtn.onclick =
  () => {

    speak(
      "Good evening. J.A.R.V.I.S systems are fully operational. How may I assist you?"
    );

  };


/* =========================================================
   INITIAL MESSAGE
========================================================= */

addMessage(
  "J.A.R.V.I.S: System initialized. Memory systems online. How may I assist you?",
  "ai"
);


/* =========================================================
   INITIALIZE MEMORY
========================================================= */

loadMemories()
  .catch(error =>
    console.error(
      "Memory initialization error:",
      error
    )
  );
