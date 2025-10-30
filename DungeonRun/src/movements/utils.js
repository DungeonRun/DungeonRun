export const UP = 'KeyW';
export const DOWN = 'KeyS';
export const LEFT = 'KeyA';
export const RIGHT = 'KeyD';
export const SHIFT = 'ShiftLeft'; // Also check ShiftRight in CharacterControls
export const E_KEY = 'KeyE';
export const DIRECTIONS = [UP, DOWN, LEFT, RIGHT];

export function KeyDisplay() {
    this.map = new Map();
    this.keyStatus = 'no';

    const up = document.createElement("div");
    const down = document.createElement("div");
    const left = document.createElement("div");
    const right = document.createElement("div");
    const shift = document.createElement("div");
    const eKey = document.createElement("div");
    const keyStatusDisplay = document.createElement("div");

    this.map.set(UP, up);
    this.map.set(DOWN, down);
    this.map.set(LEFT, left);
    this.map.set(RIGHT, right);
    this.map.set(SHIFT, shift);
    this.map.set(E_KEY, eKey);

    this.map.forEach((v, k) => {
        v.style.color = 'blue';
        v.style.fontSize = '50px';
        v.style.fontWeight = '800';
        v.style.position = 'absolute';
        v.textContent = k === UP ? 'W' : k === DOWN ? 'S' : k === LEFT ? 'A' : k === RIGHT ? 'D' : k === SHIFT ? 'Shift' : 'E';
        if (k === E_KEY) {
            v.style.display = 'none';
        }
    });

    keyStatusDisplay.className = 'key-status-display';
    keyStatusDisplay.style.color = 'white';
    keyStatusDisplay.style.fontSize = '24px';
    keyStatusDisplay.style.fontWeight = 'bold';
    keyStatusDisplay.style.position = 'absolute';
    keyStatusDisplay.style.top = '50px';
    keyStatusDisplay.style.left = '50px';
    keyStatusDisplay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    keyStatusDisplay.style.padding = '10px';
    keyStatusDisplay.style.borderRadius = '5px';
    keyStatusDisplay.textContent = `Key: ${this.keyStatus}`;
    document.body.append(keyStatusDisplay);

    this.updatePosition();

    this.map.forEach((v) => {
        document.body.append(v);
    });
}

KeyDisplay.prototype.updatePosition = function() {
    this.map.get(UP).style.top = `${window.innerHeight - 150}px`;
    this.map.get(DOWN).style.top = `${window.innerHeight - 100}px`;
    this.map.get(LEFT).style.top = `${window.innerHeight - 100}px`;
    this.map.get(RIGHT).style.top = `${window.innerHeight - 100}px`;
    this.map.get(SHIFT).style.top = `${window.innerHeight - 100}px`;
    this.map.get(E_KEY).style.top = `${window.innerHeight - 100}px`;

    this.map.get(UP).style.left = `${300}px`;
    this.map.get(LEFT).style.left = `${200}px`;
    this.map.get(DOWN).style.left = `${300}px`;
    this.map.get(RIGHT).style.left = `${400}px`;
    this.map.get(SHIFT).style.left = `${50}px`;
    this.map.get(E_KEY).style.left = `${150}px`;
};

KeyDisplay.prototype.down = function(code) {
    if (this.map.get(code)) {
        this.map.get(code).style.color = 'red';
        if (code === E_KEY) {
            this.map.get(code).style.display = 'block';
        }
    }
};

KeyDisplay.prototype.up = function(code) {
    if (this.map.get(code)) {
        this.map.get(code).style.color = 'blue';
        if (code === E_KEY) {
            this.map.get(code).style.display = 'none';
        }
    }
};

KeyDisplay.prototype.updateKeyStatus = function(status) {
    this.keyStatus = status;
    const statusElement = document.querySelector('.key-status-display');
    if (statusElement) {
        statusElement.textContent = `Key: ${status}`;
        statusElement.style.color = status === 'yes' ? 'gold' : 'white';
    } else {
        console.error('Key status display element not found!');
    }
};