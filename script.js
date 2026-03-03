const canvas = document.getElementById('nes-canvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status-text');
const romLoader = document.getElementById('rom-loader');
const audioBtn = document.getElementById('start-audio-btn');
const nes = new jsnes.NES({
    onFrame: (frameBuffer) => {
        const imageData = ctx.getImageData(0, 0, 256, 240);
        const data = imageData.data;
        for (let i = 0; i < frameBuffer.length; i++) {
            data[i*4] = frameBuffer[i] & 0xFF;
            data[i*4+1] = (frameBuffer[i] >> 8) & 0xFF;
            data[i*4+2] = (frameBuffer[i] >> 16) & 0xFF;
            data[i*4+3] = 0xFF;
        }
        ctx.putImageData(imageData, 0, 0);
    },
    onAudioSample: (l, r) => { if (audioCtx) audioBuffer.push(l, r); }
});

let audioCtx = null, audioBuffer = [], gameLoop = null;

function startLoop() { gameLoop = setInterval(() => { nes.frame(); if(audioCtx && audioBuffer.length > 4096) playAudio(); }, 1000/60); }
function playAudio() {
    const b = audioCtx.createBuffer(2, audioBuffer.length/2, 44100);
    for(let i=0; i<2; i++) { const d = b.getChannelData(i); for(let j=0; j<b.length; j++) d[j] = audioBuffer[j*2+i]; }
    const s = audioCtx.createBufferSource(); s.buffer = b; s.connect(audioCtx.destination); s.start(); audioBuffer = [];
}

romLoader.onchange = (e) => {
    const r = new FileReader();
    r.onload = (ev) => { nes.loadROM(ev.target.result); if(gameLoop) clearInterval(gameLoop); startLoop(); statusText.innerText = "Speel nu!"; };
    r.readAsBinaryString(e.target.files[0]);
};

audioBtn.onclick = () => { audioCtx = new AudioContext(); audioBtn.style.display = 'none'; };

// Input Mapping
const NES_KEYS = {
    'btn-up': jsnes.Controller.BUTTON_UP, 'btn-down': jsnes.Controller.BUTTON_DOWN,
    'btn-left': jsnes.Controller.BUTTON_LEFT, 'btn-right': jsnes.Controller.BUTTON_RIGHT,
    'btn-a': jsnes.Controller.BUTTON_A, 'btn-b': jsnes.Controller.BUTTON_B,
    'btn-start': jsnes.Controller.BUTTON_START, 'btn-select': jsnes.Controller.BUTTON_SELECT
};

// Touch events voor mobiel
Object.keys(NES_KEYS).forEach(id => {
    const el = document.getElementById(id);
    el.ontouchstart = (e) => { e.preventDefault(); nes.buttonDown(1, NES_KEYS[id]); };
    el.ontouchend = (e) => { e.preventDefault(); nes.buttonUp(1, NES_KEYS[id]); };
});

// Toetsenbord voor desktop
const KB_MAP = {38:'btn-up', 40:'btn-down', 37:'btn-left', 39:'btn-right', 88:'btn-a', 90:'btn-b', 13:'btn-start', 16:'btn-select'};
document.onkeydown = (e) => { if(KB_MAP[e.keyCode]) nes.buttonDown(1, NES_KEYS[KB_MAP[e.keyCode]]); };
document.onkeyup = (e) => { if(KB_MAP[e.keyCode]) nes.buttonUp(1, NES_KEYS[KB_MAP[e.keyCode]]); };

// Save & Load
document.getElementById('save-btn').onclick = () => localStorage.setItem('save', JSON.stringify(nes.toJSON()));
document.getElementById('load-btn').onclick = () => { const s = localStorage.getItem('save'); if(s) nes.fromJSON(JSON.parse(s)); };
