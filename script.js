const canvas = document.getElementById('nes-canvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status-text');
const romLoader = document.getElementById('rom-loader');
const audioBtn = document.getElementById('start-audio-btn');

const imageData = ctx.createImageData(256, 240);
const canvasBuffer = new Uint32Array(imageData.data.buffer);

const nes = new jsnes.NES({
    onFrame: (frameBuffer) => {
        for (let i = 0; i < 256 * 240; i++) {
            canvasBuffer[i] = 0xFF000000 | frameBuffer[i];
        }
        ctx.putImageData(imageData, 0, 0);
    },
    onAudioSample: (l, r) => {
        if (audioCtx && audioCtx.state === 'running') audioBuffer.push(l, r);
    }
});

let audioCtx = null, audioBuffer = [], gameLoop = null;

function playAudio() {
    if (audioBuffer.length < 1024) return;
    const b = audioCtx.createBuffer(2, audioBuffer.length/2, 44100);
    for(let i=0; i<2; i++) {
        const d = b.getChannelData(i);
        for(let j=0; j<b.length; j++) d[j] = audioBuffer[j*2+i];
    }
    const s = audioCtx.createBufferSource();
    s.buffer = b; s.connect(audioCtx.destination); s.start();
    audioBuffer = [];
}

function startLoop() {
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(() => {
        nes.frame();
        if (audioCtx) playAudio();
    }, 1000/60);
}

romLoader.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        nes.loadROM(ev.target.result);
        startLoop();
        statusText.innerText = "Spelen: " + file.name;
    };
    reader.readAsBinaryString(file);
};

audioBtn.onclick = async () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    await audioCtx.resume();
    audioBtn.style.display = 'none';
};

const NES_KEYS = {
    'btn-up': jsnes.Controller.BUTTON_UP, 'btn-down': jsnes.Controller.BUTTON_DOWN,
    'btn-left': jsnes.Controller.BUTTON_LEFT, 'btn-right': jsnes.Controller.BUTTON_RIGHT,
    'btn-a': jsnes.Controller.BUTTON_A, 'btn-b': jsnes.Controller.BUTTON_B,
    'btn-start': jsnes.Controller.BUTTON_START, 'btn-select': jsnes.Controller.BUTTON_SELECT
};

// Touch events met trilling (Navigator.vibrate)
Object.keys(NES_KEYS).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (navigator.vibrate) navigator.vibrate(15);
            nes.buttonDown(1, NES_KEYS[id]);
        });
        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            nes.buttonUp(1, NES_KEYS[id]);
        });
    }
});

document.getElementById('save-btn').onclick = () => { localStorage.setItem('nes_save', JSON.stringify(nes.toJSON())); alert("Saved!"); };
document.getElementById('load-btn').onclick = () => { 
    const s = localStorage.getItem('nes_save'); 
    if(s) { nes.fromJSON(JSON.parse(s)); alert("Loaded!"); }
};
document.getElementById('pause-btn').onclick = () => {
    if (gameLoop) { clearInterval(gameLoop); gameLoop = null; statusText.innerText = "Pauze"; }
    else { startLoop(); statusText.innerText = "Spelen!"; }
};
