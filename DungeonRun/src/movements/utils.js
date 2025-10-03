export const UP = 'arrowup';
export const DOWN = 'arrowdown';
export const LEFT = 'arrowleft';
export const RIGHT = 'arrowright';
export const SHIFT = 'shift';
export const DIRECTIONS = [UP, DOWN, LEFT, RIGHT];

export function KeyDisplay() {
    this.map = new Map();

    const up = document.createElement("div");
    const down = document.createElement("div");
    const left = document.createElement("div");
    const right = document.createElement("div");
    const shift = document.createElement("div");

    this.map.set(UP, up);
    this.map.set(DOWN, down);
    this.map.set(LEFT, left);
    this.map.set(RIGHT, right);
    this.map.set(SHIFT, shift);

    this.map.forEach((v, k) => {
        v.style.color = 'blue';
        v.style.fontSize = '50px';
        v.style.fontWeight = '800';
        v.style.position = 'absolute';
        v.textContent = k === UP ? '↑' : k === DOWN ? '↓' : k === LEFT ? '←' : k === RIGHT ? '→' : 'Shift';
    });

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

    this.map.get(UP).style.left = `${300}px`;
    this.map.get(LEFT).style.left = `${200}px`;
    this.map.get(DOWN).style.left = `${300}px`;
    this.map.get(RIGHT).style.left = `${400}px`;
    this.map.get(SHIFT).style.left = `${50}px`;
};

KeyDisplay.prototype.down = function(key) {
    if (this.map.get(key.toLowerCase())) {
        this.map.get(key.toLowerCase()).style.color = 'red';
    }
};

KeyDisplay.prototype.up = function(key) {
    if (this.map.get(key.toLowerCase())) {
        this.map.get(key.toLowerCase()).style.color = 'blue';
    }
};