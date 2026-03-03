// Configuratie en Selectors
const canvas = document.getElementById('nes-canvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status-text');
const romLoader = document.getElementById('rom-loader');
const audioBtn = document.getElementById('start-audio-btn');

// Prestatie-optimalisatie: Gebruik een directe buffer naar het canvas
const imageData = ctx.createImageData(256, 240);
const canvasBuffer = new Uint32Array(imageData.data.buffer);

// Initialiseer JSNES
const nes = new jsnes.NES({
    onFrame: (frameBuffer) => {
        for (let i = 0; i < 256 * 240; i++) {
            // Converteer JSNES pixel naar 32-bit RGBA (0xFFBBGGRR -> 0xAABBGGRR)
            canvasBuffer[i] = 0xFF000000 | frameBuffer[i];
        }
        ctx.putImageData(imageData, 0, 0);
    },
    onAudioSample: (l, r) => {
        if (audioCtx && audioCtx.state === 'running') {
            audioBuffer.push(l, r);
        }
    }
});

let audioCtx = null;
let audioBuffer = [];
let gameLoop = null;

// Audio Systeem
function playAudio() {
    if (audioBuffer.length < 1024) return;
    const b = audioCtx.createBuffer(2, audioBuffer.length / 2, 44100);
    for (let i = 0; i < 2; i++) {
        const d = b.getChannelData(i);
        for (let j = 0; j < b.length; j++) d[j] = audioBuffer[j * 2 + i];
    }
    const s = audioCtx.createBufferSource();
    s.buffer = b;
    s.connect(audioCtx.destination);
    s.start();
    audioBuffer = [];
}

// Game Loop
function startLoop() {
    if (gameLoop) stopLoop();
    gameLoop = setInterval(() => {
        nes.frame();
        if (audioCtx) playAudio();
    }, 1000 / 60);
}

function stopLoop() {
    clearInterval(gameLoop);
    gameLoop = null;
}

// ROM Inladen
romLoader.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        nes.loadROM(event.target.result);
        startLoop();
        statusText.innerText = "Spelen: " + file.name;
    };
    reader.readAsBinaryString(file);
};

// Audio activatie (Noodzakelijk voor browsers)
audioBtn.onclick = async () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    await audioCtx.resume();
    audioBtn.style.display = 'none';
    statusText.innerText = "Geluid actief!";
};

// Input Handling
const NES_KEYS = {
    'btn-up': jsnes.Controller.BUTTON_UP,
    'btn-down': jsnes.Controller.BUTTON_DOWN,
    'btn-left': jsnes.Controller.BUTTON_LEFT,
    'btn-right': jsnes.Controller.BUTTON_RIGHT,
    'btn-a': jsnes.Controller.BUTTON_A,
    'btn-b': jsnes.Controller.BUTTON_B,
    'btn-start': jsnes.Controller.BUTTON_START,
    'btn-select': jsnes.Controller.BUTTON_SELECT
};

// Mobiele Touch Events
Object.keys(NES_KEYS).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('touchstart', (e) => { e.preventDefault(); nes.buttonDown(1, NES_KEYS[id]); });
        el.addEventListener('touchend', (e) => { e.preventDefault(); nes.buttonUp(1, NES_KEYS[id]); });
    }
});

// Toetsenbord (Desktop backup)
const KB_MAP = { 38: 'btn-up', 40: 'btn-down', 37: 'btn-left', 39: 'btn-right', 88: 'btn-a', 90: 'btn-b', 13: 'btn-start', 16: 'btn-select' };
document.onkeydown = (e) => { if (KB_MAP[e.keyCode]) nes.buttonDown(1, NES_KEYS[KB_MAP[e.keyCode]]); };
document.onkeyup = (e) => { if (KB_MAP[e.keyCode]) nes.buttonUp(1, NES_KEYS[KB_MAP[e.keyCode]]); };

// Systeem Functies
document.getElementById('save-btn').onclick = () => {
    localStorage.setItem('nes_save', JSON.stringify(nes.toJSON()));
    alert("Voortgang opgeslagen!");
};

document.getElementById('load-btn').onclick = () => {
    const save = localStorage.getItem('nes_save');
    if (save) {
        nes.fromJSON(JSON.parse(save));
        alert("Voortgang geladen!");
    }
};

document.getElementById('pause-btn').onclick = () => {
    if (gameLoop) { stopLoop(); statusText.innerText = "Pauze"; }
    else { startLoop(); statusText.innerText = "Spelen maar!"; }
};
