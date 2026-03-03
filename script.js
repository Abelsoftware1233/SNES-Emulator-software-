const canvas = document.getElementById('nes-canvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status-text');
const romLoader = document.getElementById('rom-loader');
const audioBtn = document.getElementById('start-audio-btn');

// Optimalisatie: Hergebruik ImageData buffer voor snelheid op mobiel
const imageData = ctx.createImageData(256, 240);
const buf = new Uint32Array(imageData.data.buffer);

const nes = new jsnes.NES({
    onFrame: (frameBuffer) => {
        for (let i = 0; i < 256 * 240; i++) {
            // Zet pixels om naar het juiste formaat (RGBA)
            buf[i] = 0xFF000000 | frameBuffer[i];
        }
        ctx.putImageData(imageData, 0, 0);
    },
    onAudioSample: (l, r) => { 
        if (audioCtx && audioCtx.state === 'running') audioBuffer.push(l, r); 
    }
});

let audioCtx = null, audioBuffer = [], gameLoop = null;

function startLoop() { 
    if(gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(() => { 
        nes.frame(); 
        if(audioCtx && audioBuffer.length > 2048) playAudio(); 
    }, 1000/60); 
}

function playAudio() {
    if (!audioCtx) return;
    const b = audioCtx.createBuffer(2, audioBuffer.length/2, 44100);
    for(let i=0; i<2; i++) { 
        const d = b.getChannelData(i); 
        for(let j=0; j<b.length; j++) d[j] = audioBuffer[j*2+i]; 
    }
    const s = audioCtx.createBufferSource(); 
    s.buffer = b; 
    s.connect(audioCtx.destination); 
    s.start(); 
    audioBuffer = [];
}

// ROM Laden
romLoader.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => { 
        nes.loadROM(ev.target.result); 
        startLoop(); 
        statusText.innerText = "Nu aan het spelen: " + file.name; 
    };
    r.readAsBinaryString(file);
};

// Audio activeren (browser beveiliging fix)
audioBtn.onclick = async () => { 
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume();
    audioBtn.style.display = 'none'; // Verberg knop na activatie
};

// Input Mapping
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

// Touch events voor mobiele knoppen
Object.keys(NES_KEYS).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            nes.buttonDown(1, NES_KEYS[id]); 
        });
        el.addEventListener('touchend', (e) => { 
            e.preventDefault(); 
            nes.buttonUp(1, NES_KEYS[id]); 
        });
    }
});

// Toetsenbord ondersteuning voor desktop testen
const KB_MAP = {38:'btn-up', 40:'btn-down', 37:'btn-left', 39:'btn-right', 88:'btn-a', 90:'btn-b', 13:'btn-start', 16:'btn-select'};
document.onkeydown = (e) => { if(KB_MAP[e.keyCode]) nes.buttonDown(1, NES_KEYS[KB_MAP[e.keyCode]]); };
document.onkeyup = (e) => { if(KB_MAP[e.keyCode]) nes.buttonUp(1, NES_KEYS[KB_MAP[e.keyCode]]); };

// Save & Load functionaliteit
document.getElementById('save-btn').onclick = () => {
    localStorage.setItem('nes_save_state', JSON.stringify(nes.toJSON()));
    alert("Spel opgeslagen!");
};
document.getElementById('load-btn').onclick = () => { 
    const s = localStorage.getItem('nes_save_state'); 
    if(s) {
        nes.fromJSON(JSON.parse(s));
        alert("Spel geladen!");
    } else {
        alert("Geen savegame gevonden.");
    }
};

// Pause knop
document.getElementById('pause-btn').onclick = () => {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
        statusText.innerText = "Gepauzeerd";
    } else {
        startLoop();
        statusText.innerText = "Speel nu!";
    }
};

