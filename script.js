const canvas = document.getElementById('nes-canvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status-text');
const romLoader = document.getElementById('rom-loader');

// Initialiseer JSNES
const nes = new jsnes.NES({
    onFrame: (frameBuffer) => {
        const imageData = ctx.createImageData(256, 240);
        for (let i = 0; i < frameBuffer.length; i++) {
            imageData.data[i * 4] = frameBuffer[i] & 0xFF;         // R
            imageData.data[i * 4 + 1] = (frameBuffer[i] >> 8) & 0xFF;  // G
            imageData.data[i * 4 + 2] = (frameBuffer[i] >> 16) & 0xFF; // B
            imageData.data[i * 4 + 3] = 0xFF;                          // Alpha
        }
        ctx.putImageData(imageData, 0, 0);
    }
});

// Toetsenbord mapping
const keyboard = (keyCode, event) => {
    const map = {
        38: jsnes.Controller.BUTTON_UP,
        40: jsnes.Controller.BUTTON_DOWN,
        37: jsnes.Controller.BUTTON_LEFT,
        39: jsnes.Controller.BUTTON_RIGHT,
        88: jsnes.Controller.BUTTON_A,      // X toets
        90: jsnes.Controller.BUTTON_B,      // Z toets
        13: jsnes.Controller.BUTTON_START,  // Enter
        16: jsnes.Controller.BUTTON_SELECT  // Shift
    };
    if (map[keyCode] !== undefined) {
        nes[event](1, map[keyCode]);
    }
};

document.addEventListener('keydown', (e) => keyboard(e.keyCode, 'buttonDown'));
document.addEventListener('keyup', (e) => keyboard(e.keyCode, 'buttonUp'));

// ROM laden
romLoader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const romData = event.target.result;
        nes.loadROM(romData);
        statusText.innerText = "Systeem draait: " + file.name;
        
        // Start de game loop
        setInterval(nes.frame, 1000 / 60);
    };
    reader.readAsBinaryString(file);
});
