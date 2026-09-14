/* =========================================
   J.A.R.V.I.S. CORE
========================================= */

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your Gemini API Key:");

  if (API_KEY) {
    localStorage.setItem("jarvis_key", API_KEY);
  }
}


/* =========================================
   CONFIG
========================================= */

const MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-latest"
];

const MEMORY_DB = "JARVIS_MEMORY_DB";
const MEMORY_STORE = "memories";


/* =========================================
   DOM
========================================= */

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


/* =========================================
   CONVERSATION
========================================= */

let conversation = [];


/* =========================================
   MEMORY DATABASE
========================================= */

let db = null;


function openDatabase() {

  return new Promise((resolve, reject) => {

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
          "createdAt"
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


/* =========================================
   SAVE MEMORY
========================================= */

function saveMemory(text) {

  if (!db || !text.trim()) {
    return;
  }

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      MEMORY_STORE,
      "readwrite"
    );

    const store = transaction.objectStore(
      MEMORY_STORE
    );

    store.add({
      text: text.trim(),
      createdAt: Date.now()
    });

    transaction.oncomplete = () => {

      memoryStatus.textContent = "ACTIVE";

      resolve();

    };

    transaction.onerror = () => {

      reject(transaction.error);

    };

  });

}


/* =========================================
   LOAD MEMORIES
========================================= */

function getMemories() {

  if (!db) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      MEMORY_STORE,
      "readonly"
    );

    const store = transaction.objectStore(
      MEMORY_STORE
    );

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


/* =========================================
   MEMORY CONTEXT
========================================= */

async function memoryContext() {

  try {

    const memories = await getMemories();

    return memories
      .slice(0, 8)
      .map(item => `- ${item.text}`)
      .join("\n");

  } catch {

    return "";

  }

}


/* =========================================
   RENDER MEMORY
========================================= */

async function renderMemories(filter = "") {

  const memories = await getMemories();

  const search = filter
    .trim()
    .toLowerCase();

  const filtered = memories.filter(memory =>
    memory.text
      .toLowerCase()
      .includes(search)
  );

  if (!filtered.length) {

    memoryList.innerHTML = `
      <div class="empty-memory">
        No stored memories.
      </div>
    `;

    return;

  }

  memoryList.innerHTML = filtered
    .map(memory => {

      const date = new Date(
        memory.createdAt
      ).toLocaleString();

      return `
        <div class="memory-item">

          <div class="memory-item-text">
            ${escapeHTML(memory.text)}
          </div>

          <div class="memory-item-date">
            ${escapeHTML(date)}
          </div>

        </div>
      `;

    })
    .join("");

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(text) {

  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================================
   CLEAR MEMORY
========================================= */

function clearMemory() {

  if (!db) return;

  const transaction = db.transaction(
    MEMORY_STORE,
    "readwrite"
  );

  transaction
    .objectStore(MEMORY_STORE)
    .clear();

  transaction.oncomplete = () => {

    renderMemories();

    memoryStatus.textContent = "EMPTY";

  };

}


/* =========================================
   GEMINI
========================================= */

async function callGemini(prompt) {

  if (!API_KEY) {

    throw new Error(
      "Gemini API key is missing."
    );

  }

  let lastError = new Error(
    "Unable to connect to Gemini."
  );


  for (const model of MODELS) {

    try {

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            contents: [
              {
                role: "user",

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


      const data = await response.json();


      if (!response.ok) {

        const message =
          data?.error?.message ||
          `HTTP ${response.status}`;

        lastError = new Error(message);


        if (
          /quota|limit|resource|high demand|unavailable|not found|deprecated/i
            .test(message)
        ) {

          continue;

        }

        throw lastError;

      }


      const answer =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;


      if (answer) {

        return answer.trim();

      }


      lastError = new Error(
        "Gemini returned no answer."
      );

    }

    catch (error) {

      lastError = error;

    }

  }


  throw lastError;

}


/* =========================================
   JARVIS PROMPT
========================================= */

async function askJarvis(question) {

  const memories = await memoryContext();


  const recentConversation =
    conversation
      .slice(-8)
      .map(item => {

        return `${item.role}: ${item.text}`;

      })
      .join("\n");


  const prompt = `
You are J.A.R.V.I.S., a calm, intelligent, futuristic AI assistant.

Personality:
- Intelligent
- Calm
- Helpful
- Concise
- Professional
- Slightly futuristic
- Never pretend to know something you do not know

Important:
Do not invent current stock prices, current news, weather,
or other live information if you do not actually have live access.

Use the user's stored memories when helpful.

STORED MEMORY:
${memories || "No stored memories."}

RECENT CONVERSATION:
${recentConversation || "No previous conversation."}

USER:
${question}

Respond naturally as J.A.R.V.I.S.
`;


  return await callGemini(prompt);

}


/* =========================================
   CHAT UI
========================================= */

function addMessage(
  text,
  type = "jarvis"
) {

  const message = document.createElement("div");

  message.className =
    `message ${
      type === "user"
        ? "user-message"
        : "jarvis-message"
    }`;


  message.innerHTML = `

    <div class="message-label">
      ${
        type === "user"
          ? "YOU"
          : "J.A.R.V.I.S."
      }
    </div>

    <div class="message-text">
      ${escapeHTML(text)}
    </div>

  `;


  chatBox.appendChild(message);

  chatBox.scrollTop =
    chatBox.scrollHeight;

}


/* =========================================
   SEND MESSAGE
========================================= */

async function sendMessage() {

  const question =
    userInput.value.trim();


  if (!question) {
    return;
  }


  if (!API_KEY) {

    addMessage(
      "Gemini API key is missing. Please reload the page and enter your API key.",
      "jarvis"
    );

    return;

  }


  addMessage(
    question,
    "user"
  );


  conversation.push({
    role: "user",
    text: question
  });


  userInput.value = "";


  aiStatus.textContent = "THINKING";
  networkStatus.textContent = "PROCESSING";


  sendBtn.disabled = true;


  try {

    const answer =
      await askJarvis(question);


    addMessage(
      answer,
      "jarvis"
    );


    conversation.push({
      role: "assistant",
      text: answer
    });


    aiStatus.textContent = "READY";
    networkStatus.textContent = "ONLINE";


    speak(answer);

  }

  catch (error) {

    console.error(error);


    addMessage(
      `I encountered a connection problem: ${error.message}`,
      "jarvis"
    );


    aiStatus.textContent = "ERROR";
    networkStatus.textContent = "OFFLINE";

  }

  finally {

    sendBtn.disabled = false;

    userInput.focus();

  }

}


/* =========================================
   BUTTON EVENTS
========================================= */

sendBtn.addEventListener(
  "click",
  sendMessage
);


userInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      event.preventDefault();

      sendMessage();

    }

  }
);


/* =========================================
   QUICK COMMANDS
========================================= */

document
  .querySelectorAll("[data-command]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        userInput.value =
          button.dataset.command;

        userInput.focus();

        sendMessage();

      }
    );

  });


/* =========================================
   MEMORY DRAWER
========================================= */

function openMemory() {

  memoryDrawer.classList.add("open");

  drawerOverlay.classList.add("open");

  renderMemories();

}


function closeMemoryDrawer() {

  memoryDrawer.classList.remove("open");

  drawerOverlay.classList.remove("open");

}


memoryBtn.addEventListener(
  "click",
  openMemory
);


closeMemory.addEventListener(
  "click",
  closeMemoryDrawer
);


drawerOverlay.addEventListener(
  "click",
  closeMemoryDrawer
);


memorySearch.addEventListener(
  "input",
  () => {

    renderMemories(
      memorySearch.value
    );

  }
);


/* =========================================
   SAVE CURRENT CHAT
========================================= */

saveChatBtn.addEventListener(
  "click",
  async () => {

    if (!conversation.length) {

      return;

    }


    const text =
      conversation
        .slice(-10)
        .map(item =>
          `${item.role.toUpperCase()}: ${item.text}`
        )
        .join("\n");


    try {

      await saveMemory(text);

      await renderMemories();

      memoryStatus.textContent =
        "SAVED";

    }

    catch (error) {

      console.error(error);

    }

  }
);


/* =========================================
   CLEAR MEMORY
========================================= */

clearMemoryBtn.addEventListener(
  "click",
  () => {

    const confirmed =
      confirm(
        "Clear all J.A.R.V.I.S. memories?"
      );


    if (confirmed) {

      clearMemory();

    }

  }
);


/* =========================================
   SPEECH RECOGNITION
========================================= */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


let recognition = null;

let isListening = false;


if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();


  recognition.continuous = false;

  recognition.interimResults = true;

  recognition.lang = "en-US";


  recognition.onstart = () => {

    isListening = true;

    micBtn.classList.add(
      "listening"
    );

    voiceStatus.textContent =
      "LISTENING";

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


    userInput.value =
      transcript;

  };


  recognition.onerror = error => {

    console.error(
      "Speech recognition:",
      error
    );

    isListening = false;

    micBtn.classList.remove(
      "listening"
    );

    voiceStatus.textContent =
      "READY";

  };


  recognition.onend = () => {

    isListening = false;

    micBtn.classList.remove(
      "listening"
    );

    voiceStatus.textContent =
      "READY";


    if (userInput.value.trim()) {

      sendMessage();

    }

  };


  micBtn.addEventListener(
    "click",
    () => {

      if (isListening) {

        recognition.stop();

      }

      else {

        try {

          recognition.start();

        }

        catch (error) {

          console.error(error);

        }

      }

    }
  );

}

else {

  micBtn.disabled = true;

  voiceStatus.textContent =
    "UNSUPPORTED";

}


/* =========================================
   TEXT TO SPEECH
========================================= */

let voices = [];

let selectedVoice = null;


function loadVoices() {

  voices =
    speechSynthesis.getVoices();


  voiceSelect.innerHTML = `
    <option value="">
      Default Voice
    </option>
  `;


  voices.forEach(
    (voice, index) => {

      const option =
        document.createElement("option");


      option.value =
        index;


      option.textContent =
        `${voice.name} (${voice.lang})`;


      voiceSelect.appendChild(
        option
      );

    }
  );

}


if ("speechSynthesis" in window) {

  loadVoices();

  speechSynthesis.onvoiceschanged =
    loadVoices;

}


/* =========================================
   SPEAK
========================================= */

function speak(text) {

  if (
    !("speechSynthesis" in window)
  ) {

    return;

  }


  speechSynthesis.cancel();


  const cleanText =
    text
      .replace(/[*#_`]/g, "")
      .replace(/\n+/g, ". ");


  const utterance =
    new SpeechSynthesisUtterance(
      cleanText
    );


  const voiceIndex =
    voiceSelect.value;


  if (
    voiceIndex !== "" &&
    voices[voiceIndex]
  ) {

    utterance.voice =
      voices[voiceIndex];

  }


  utterance.pitch =
    Number(pitchSlider.value);


  utterance.rate =
    Number(rateSlider.value);


  utterance.onstart = () => {

    voiceStatus.textContent =
      "SPEAKING";

  };


  utterance.onend = () => {

    voiceStatus.textContent =
      "READY";

  };


  speechSynthesis.speak(
    utterance
  );

}


/* =========================================
   VOICE CONTROLS
========================================= */

pitchSlider.addEventListener(
  "input",
  () => {

    pitchValue.textContent =
      Number(
        pitchSlider.value
      ).toFixed(1);

  }
);


rateSlider.addEventListener(
  "input",
  () => {

    rateValue.textContent =
      Number(
        rateSlider.value
      ).toFixed(1);

  }
);


voiceSelect.addEventListener(
  "change",
  () => {

    selectedVoice =
      voiceSelect.value;

  }
);


testVoiceBtn.addEventListener(
  "click",
  () => {

    speak(
      "Voice protocol is functioning normally. J.A.R.V.I.S. online."
    );

  }
);


/* =========================================
   STARTUP
========================================= */

async function startup() {

  try {

    await openDatabase();

    memoryStatus.textContent =
      "ACTIVE";

  }

  catch (error) {

    console.error(
      "Memory database error:",
      error
    );

    memoryStatus.textContent =
      "ERROR";

  }


  if (API_KEY) {

    aiStatus.textContent =
      "READY";

    networkStatus.textContent =
      "ONLINE";

  }

  else {

    aiStatus.textContent =
      "KEY NEEDED";

    networkStatus.textContent =
      "OFFLINE";

  }


  userInput.focus();

}


startup();
