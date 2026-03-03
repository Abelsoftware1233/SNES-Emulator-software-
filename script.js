const canvas = document.getElementById('nes-canvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status-text');
const romLoader = document.getElementById('rom-loader');
const pauseBtn = document.getElementById('pause-btn');
const audioBtn = document.getElementById('start-audio-btn');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');

let isPaused = false;
let gameInterval = null;
let audioContext = null;
let audioBuffer = [];

// NES Initialisatie
const nes = new jsnes.NES({
    onFrame: (frameBuffer) => {
        const imageData = ctx.getImageData(0, 0, 256, 240);
        const data = imageData.data;
        for (let i = 0; i < frameBuffer.length; i++) {
            const pixel = frameBuffer[i];
            data[i * 4] = pixel & 0xFF;
            data[i * 4 + 1] = (pixel >> 8) & 0xFF;
            data[i * 4 + 2] = (pixel >> 16) & 0xFF;
            data[i * 4 + 3] = 0xFF;
        }
        ctx.putImageData(imageData, 0, 0);
    },
    onAudioSample: (left, right) => {
        if (audioContext) audioBuffer.push(left, right);
    }
});

// Audio verwerking
function playAudio() {
    if (!audioContext || audioBuffer.length < 4096) return;
    const buffer = audioContext.createBuffer(2, audioBuffer.length / 2, 44100);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < audioBuffer.length / 2; i++) {
        left[i] = audioBuffer[i * 2];
        right[i] = audioBuffer[i * 2 + 1];
    }
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
    audioBuffer = [];
}

// Game Loop
function startGameLoop() {
    gameInterval = setInterval(() => {
        nes.frame();
        if (audioContext) playAudio();
    }, 1000 / 60);
}

// Event Listeners
romLoader.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        nes.loadROM(event.target.result);
        if (gameInterval) clearInterval(gameInterval);
        startGameLoop();
        statusText.innerText = "Game geladen!";
    };
    reader.readAsBinaryString(e.target.files[0]);
};

audioBtn.onclick = () => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioBtn.disabled = true;
    audioBtn.innerText = "🔊 Audio Aan";
};

pauseBtn.onclick = () => {
    isPaused = !isPaused;
    if (isPaused) {
        clearInterval(gameInterval);
        pauseBtn.classList.add('active');
        statusText.innerText = "Gepauzeerd";
    } else {
        startGameLoop();
        pauseBtn.classList.remove('active');
        statusText.innerText = "Systeem draait";
    }
};

saveBtn.onclick = () => {
    localStorage.setItem('nes_save', JSON.stringify(nes.toJSON()));
    statusText.innerText = "💾 Opgeslagen!";
};

loadBtn.onclick = () => {
    const data = localStorage.getItem('nes_save');
    if (data) {
        nes.fromJSON(JSON.parse(data));
        statusText.innerText = "📂 Geladen!";
    }
};

// Toetsenbord
const keys = {38:0, 40:1, 37:2, 39:3, 88:4, 90:5, 13:7, 16:6};
document.onkeydown = (e) => { if(keys[e.keyCode]!==undefined) nes.buttonDown(1, [jsnes.Controller.BUTTON_UP, jsnes.Controller.BUTTON_DOWN, jsnes.Controller.BUTTON_LEFT, jsnes.Controller.BUTTON_RIGHT, jsnes.Controller.BUTTON_A, jsnes.Controller.BUTTON_B, jsnes.Controller.BUTTON_SELECT, jsnes.Controller.BUTTON_START][keys[e.keyCode]]); };
document.onkeyup = (e) => { if(keys[e.keyCode]!==undefined) nes.buttonUp(1, [jsnes.Controller.BUTTON_UP, jsnes.Controller.BUTTON_DOWN, jsnes.Controller.BUTTON_LEFT, jsnes.Controller.BUTTON_RIGHT, jsnes.Controller.BUTTON_A, jsnes.Controller.BUTTON_B, jsnes.Controller.BUTTON_SELECT, jsnes.Controller.BUTTON_START][keys[e.keyCode]]); };
