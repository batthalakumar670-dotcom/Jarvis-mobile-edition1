/* =========================================================
   J.A.R.V.I.S. — AI + LIVE WEB + MEMORY + VOICE
   ========================================================= */


/* =========================================================
   1. API KEY
   ========================================================= */

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your Gemini API Key:");

  if (API_KEY) {
    localStorage.setItem("jarvis_key", API_KEY);
  }
}


/* =========================================================
   2. ELEMENTS
   ========================================================= */

const chat = document.getElementById("chat");
const input = document.getElementById("msg");

const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");

const systemState = document.getElementById("system-state");

const aiStatus = document.getElementById("ai-status");
const networkStatus = document.getElementById("network-status");

const memoryStatus = document.getElementById("memory-status");
const voiceStatus = document.getElementById("voice-status");


/* =========================================================
   3. GEMINI MODEL
   ========================================================= */

const MODEL = "gemini-3.8-flash";


/* =========================================================
   4. CONVERSATION MEMORY
   ========================================================= */

let conversation = [];


/* =========================================================
   5. INDEXEDDB MEMORY
   ========================================================= */

const DB_NAME = "JARVIS_MEMORY_DB";
const DB_VERSION = 2;

let db = null;


function openDatabase() {

  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {

      const database = event.target.result;

      if (!database.objectStoreNames.contains("memories")) {

        const store = database.createObjectStore(
          "memories",
          {
            keyPath: "id",
            autoIncrement: true
          }
        );

        store.createIndex(
          "created",
          "created",
          {
            unique: false
          }
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


async function saveMemory(title, text) {

  if (!db) {
    await openDatabase();
  }

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      "memories",
      "readwrite"
    );

    const store = transaction.objectStore("memories");

    store.add({

      title,
      text,

      created: new Date().toISOString()

    });

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);

  });

}


async function getMemories() {

  if (!db) {
    await openDatabase();
  }

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      "memories",
      "readonly"
    );

    const store = transaction.objectStore("memories");

    const request = store.getAll();

    request.onsuccess = () => {

      resolve(
        request.result.sort(
          (a, b) =>
            new Date(b.created) -
            new Date(a.created)
        )
      );

    };

    request.onerror = () => {

      reject(request.error);

    };

  });

}


async function deleteMemory(id) {

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      "memories",
      "readwrite"
    );

    transaction
      .objectStore("memories")
      .delete(id);

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);

  });

}


async function clearMemory() {

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      "memories",
      "readwrite"
    );

    transaction
      .objectStore("memories")
      .clear();

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);

  });

}


/* =========================================================
   6. LOAD MEMORY
   ========================================================= */

async function buildMemoryContext() {

  try {

    const memories = await getMemories();

    if (!memories.length) {
      return "";
    }

    const recent = memories.slice(0, 12);

    return recent
      .map(memory =>
        `[Memory: ${memory.title}]\n${memory.text}`
      )
      .join("\n\n");

  } catch (error) {

    console.warn("Memory unavailable:", error);

    return "";

  }

}


/* =========================================================
   7. LIVE WEB AI
   ========================================================= */

async function callGemini(userQuestion) {

  if (!API_KEY) {

    throw new Error(
      "Gemini API key is missing."
    );

  }


  const memoryContext =
    await buildMemoryContext();


  const systemPrompt = `
You are J.A.R.V.I.S., a highly capable personal AI assistant.

IMPORTANT RULES:

1. Answer normal questions intelligently.
2. When the user asks about CURRENT, TODAY, LATEST, RECENT,
   LIVE, NEWS, STOCKS, MARKET, PRICES, WEATHER, EVENTS,
   TECHNOLOGY NEWS, AI NEWS or anything that may have changed,
   USE GOOGLE SEARCH.
3. Never pretend that you know today's information if it was not
   verified.
4. For Indian stock-market questions, search for current reliable
   information about NIFTY 50, SENSEX and relevant Indian market
   news.
5. Clearly say when a market is closed.
6. Give concise but useful answers.
7. Do not invent stock prices.
8. For financial information, clearly state that it is informational
   and not personalized financial advice.
9. Use the user's saved memory when it is relevant.
10. If sources are available, mention the important sources naturally.

You are speaking as J.A.R.V.I.S., so keep the style calm,
precise and futuristic.

USER MEMORY:
${memoryContext || "No saved memory."}
`;


  const requestBody = {

    contents: [

      {
        role: "user",

        parts: [

          {
            text:
              systemPrompt +
              "\n\nUSER QUESTION:\n" +
              userQuestion
          }

        ]

      }

    ],

    tools: [

      {
        google_search: {}
      }

    ]

  };


  const response = await fetch(

    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,

    {

      method: "POST",

      headers: {

        "Content-Type": "application/json",

        "x-goog-api-key": API_KEY

      },

      body: JSON.stringify(requestBody)

    }

  );


  const data = await response.json();


  if (!response.ok || data.error) {

    throw new Error(
      data?.error?.message ||
      `Gemini request failed (${response.status})`
    );

  }


  const answer =
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();


  if (!answer) {

    throw new Error(
      "J.A.R.V.I.S. received an empty response."
    );

  }


  return answer;

}


/* =========================================================
   8. ASK JARVIS
   ========================================================= */

async function askJarvis(question) {

  addMessage(
    "J.A.R.V.I.S: Accessing intelligence systems...",
    "ai"
  );

  systemState.innerText = "PROCESSING REQUEST";
  aiStatus.innerText = "THINKING";

  networkStatus.innerText = "SEARCHING";

  try {

    conversation.push({
      role: "user",
      text: question
    });


    const answer =
      await callGemini(question);


    const lastMessage =
      chat.lastElementChild;

    if (lastMessage) {

      lastMessage.innerText =
        "J.A.R.V.I.S: " + answer;

    }


    conversation.push({
      role: "assistant",
      text: answer
    });


    systemState.innerText =
      "SYSTEM READY";

    aiStatus.innerText =
      "ONLINE";

    networkStatus.innerText =
      "CONNECTED";


    speak(answer);

  } catch (error) {

    const lastMessage =
      chat.lastElementChild;

    if (lastMessage) {

      lastMessage.innerText =
        "J.A.R.V.I.S: ERROR\n" +
        error.message;

    }


    systemState.innerText =
      "SYSTEM ERROR";

    aiStatus.innerText =
      "ERROR";

    networkStatus.innerText =
      "OFFLINE";

  }

}


/* =========================================================
   9. SEND MESSAGE
   ========================================================= */

function sendMessage() {

  const text =
    input.value.trim();

  if (!text) {
    return;
  }

  addMessage(
    "YOU: " + text,
    "user"
  );

  input.value = "";

  askJarvis(text);

}


sendBtn.addEventListener(
  "click",
  sendMessage
);


input.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      sendMessage();

    }

  }
);


/* =========================================================
   10. CHAT MESSAGE
   ========================================================= */

function addMessage(text, type) {

  const message =
    document.createElement("div");

  message.className =
    "msg " + type;

  message.innerText =
    text;

  chat.appendChild(message);

  chat.scrollTop =
    chat.scrollHeight;

}


/* =========================================================
   11. QUICK ACTIONS
   ========================================================= */

document
  .querySelectorAll(".quick-actions button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const query =
          button.dataset.query;

        addMessage(
          "YOU: " + query,
          "user"
        );

        askJarvis(query);

      }
    );

  });


/* =========================================================
   12. SPEECH RECOGNITION
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


  recognition.onstart = () => {

    micBtn.innerText =
      "🔴";

    voiceStatus.innerText =
      "LISTENING";

  };


  recognition.onresult = event => {

    const text =
      event.results[0][0].transcript;

    input.value = text;

    sendMessage();

  };


  recognition.onerror = event => {

    console.warn(
      "Speech recognition:",
      event.error
    );

  };


  recognition.onend = () => {

    micBtn.innerText =
      "🎙️";

    voiceStatus.innerText =
      "READY";

  };


  micBtn.onclick = () => {

    try {

      recognition.start();

    } catch (error) {

      console.warn(error);

    }

  };

} else {

  micBtn.disabled = true;

  micBtn.title =
    "Speech recognition is not supported by this browser.";

}


/* =========================================================
   13. TEXT TO SPEECH
   ========================================================= */

const voiceSelect =
  document.getElementById("voice-select");

const pitchSlider =
  document.getElementById("pitch");

const rateSlider =
  document.getElementById("rate");

const testVoice =
  document.getElementById("test-voice");


let voices = [];


function loadVoices() {

  voices =
    speechSynthesis.getVoices();


  voiceSelect.innerHTML =
    "";


  voices
    .filter(voice =>
      voice.lang.startsWith("en")
    )
    .forEach((voice, index) => {

      const option =
        document.createElement("option");

      option.value =
        index;

      option.textContent =
        `${voice.name} (${voice.lang})`;

      voiceSelect.appendChild(
        option
      );

    });


  voiceStatus.innerText =
    voices.length
      ? "READY"
      : "WAITING";

}


loadVoices();

speechSynthesis.onvoiceschanged =
  loadVoices;


function getSelectedVoice() {

  const englishVoices =
    voices.filter(
      voice =>
        voice.lang.startsWith("en")
    );


  return englishVoices[
    Number(voiceSelect.value)
  ] || englishVoices[0];

}


function speak(text) {

  if (
    !window.speechSynthesis ||
    !text
  ) {
    return;
  }


  speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  utterance.rate =
    Number(rateSlider.value);

  utterance.pitch =
    Number(pitchSlider.value);


  const voice =
    getSelectedVoice();


  if (voice) {

    utterance.voice =
      voice;

  }


  speechSynthesis.speak(
    utterance
  );

}


testVoice.onclick = () => {

  speak(
    "Good day. J.A.R.V.I.S. systems are online. How may I assist you?"
  );

};


/* =========================================================
   14. MEMORY PANEL
   ========================================================= */

const memoryPanel =
  document.getElementById(
    "memory-panel"
  );

const overlay =
  document.getElementById(
    "overlay"
  );

const memoryBtn =
  document.getElementById(
    "memory-btn"
  );

const closeMemory =
  document.getElementById(
    "close-memory"
  );

const memoryList =
  document.getElementById(
    "memory-list"
  );

const memorySearch =
  document.getElementById(
    "memory-search"
  );


function openMemoryPanel() {

  memoryPanel.classList.add(
    "open"
  );

  overlay.classList.add(
    "open"
  );

  renderMemories();

}


function closeMemoryPanel() {

  memoryPanel.classList.remove(
    "open"
  );

  overlay.classList.remove(
    "open"
  );

}


memoryBtn.onclick =
  openMemoryPanel;

closeMemory.onclick =
  closeMemoryPanel;

overlay.onclick =
  closeMemoryPanel;


/* =========================================================
   15. RENDER MEMORY
   ========================================================= */

async function renderMemories() {

  const memories =
    await getMemories();


  const search =
    memorySearch.value
      .trim()
      .toLowerCase();


  memoryList.innerHTML =
    "";


  const filtered =
    memories.filter(memory => {

      if (!search) {
        return true;
      }

      return (
        memory.title
          .toLowerCase()
          .includes(search) ||

        memory.text
          .toLowerCase()
          .includes(search)
      );

    });


  if (!filtered.length) {

    memoryList.innerHTML =
      `<div class="msg system">
        No memories found.
      </div>`;

    return;

  }


  filtered.forEach(memory => {

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "memory-card";


    const title =
      document.createElement(
        "div"
      );

    title.className =
      "memory-card-title";

    title.innerText =
      memory.title;


    const date =
      document.createElement(
        "div"
      );

    date.className =
      "memory-card-date";

    date.innerText =
      new Date(
        memory.created
      ).toLocaleString();


    const text =
      document.createElement(
        "div"
      );

    text.className =
      "memory-card-text";

    text.innerText =
      memory.text;


    const remove =
      document.createElement(
        "button"
      );

    remove.className =
      "memory-delete";

    remove.innerText =
      "DELETE";


    remove.onclick =
      async () => {

        await deleteMemory(
          memory.id
        );

        renderMemories();

      };


    card.appendChild(title);
    card.appendChild(date);
    card.appendChild(text);
    card.appendChild(remove);

    memoryList.appendChild(card);

  });

}


memorySearch.addEventListener(
  "input",
  renderMemories
);


/* =========================================================
   16. SAVE CURRENT CHAT
   ========================================================= */

document
  .getElementById("save-chat")
  .onclick = async () => {

    if (!conversation.length) {

      alert(
        "There is no conversation to save."
      );

      return;

    }


    const recent =
      conversation.slice(-10);


    const text =
      recent
        .map(item =>
          `${item.role.toUpperCase()}: ${item.text}`
        )
        .join("\n\n");


    await saveMemory(
      "Conversation",
      text
    );


    memoryStatus.innerText =
      "SAVED";


    renderMemories();


    setTimeout(() => {

      memoryStatus.innerText =
        "ONLINE";

    }, 2000);

  };


/* =========================================================
   17. CLEAR MEMORY
   ========================================================= */

document
  .getElementById("clear-memory")
  .onclick = async () => {

    const confirmed =
      confirm(
        "Delete all J.A.R.V.I.S. memory?"
      );


    if (!confirmed) {
      return;
    }


    await clearMemory();

    renderMemories();

    memoryStatus.innerText =
      "CLEARED";


    setTimeout(() => {

      memoryStatus.innerText =
        "ONLINE";

    }, 2000);

  };


/* =========================================================
   18. STARTUP
   ========================================================= */

async function initializeJarvis() {

  try {

    await openDatabase();

    const memories =
      await getMemories();

    memoryStatus.innerText =
      "ONLINE";

    addMessage(
      "J.A.R.V.I.S: Systems initialized. Web intelligence, memory and voice systems online. How may I assist you?",
      "ai"
    );


    if (memories.length) {

      addMessage(
        `J.A.R.V.I.S: ${memories.length} stored memories detected.`,
        "system"
      );

    }

  } catch (error) {

    memoryStatus.innerText =
      "ERROR";

    addMessage(
      "J.A.R.V.I.S: Memory system unavailable.",
      "system"
    );

  }

}


initializeJarvis();
