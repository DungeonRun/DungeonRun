// utils.js - for keyboard movements as well as interactions.

export const UP = 'arrowup';
export const DOWN = 'arrowdown';
export const LEFT = 'arrowleft';
export const RIGHT = 'arrowright';
export const SHIFT = 'shift';
export const E_KEY = 'e'; 
export const keyUp = 'w';
export const keyDown = 's';
export const keyLeft = 'a';
export const keyRight = 'd';

export const DIRECTIONS = [UP, DOWN, LEFT, RIGHT, keyUp, keyDown, keyLeft, keyRight];

export function KeyDisplay() {
    this.map = new Map();
    this.keyStatus = 'no'; // Track key grab status: 'no' or 'yes'

    const up = document.createElement("div");
    const down = document.createElement("div");
    const left = document.createElement("div");
    const right = document.createElement("div");
    const shift = document.createElement("div");
    const eKey = document.createElement("div"); // Element for 'E' key icon
    const keyStatusDisplay = document.createElement("div"); // Element for "key: yes/no" status

    this.map.set(UP, up);
    this.map.set(DOWN, down);
    this.map.set(LEFT, left);
    this.map.set(RIGHT, right);
    this.map.set(SHIFT, shift);
    this.map.set(E_KEY, eKey); // Add 'E' to map for handling

    this.map.forEach((v, k) => {
        v.style.color = 'blue';
        v.style.fontSize = '50px';
        v.style.fontWeight = '800';
        v.style.position = 'absolute';
        v.textContent = k === UP ? '↑' : k === DOWN ? '↓' : k === LEFT ? '←' : k === RIGHT ? '→' : k === SHIFT ? 'Shift' : 'E'; // 'E' icon/text
        if (k === E_KEY) {
            v.style.display = 'none'; 
        }
    });

    // Style the key status display with a unique class
    keyStatusDisplay.className = 'key-status-display'; // Added unique class
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
    this.map.get(E_KEY).style.top = `${window.innerHeight - 100}px`; // Position 'E' icon (bottom-left)

    this.map.get(UP).style.left = `${300}px`;
    this.map.get(LEFT).style.left = `${200}px`;
    this.map.get(DOWN).style.left = `${300}px`;
    this.map.get(RIGHT).style.left = `${400}px`;
    this.map.get(SHIFT).style.left = `${50}px`;
    this.map.get(E_KEY).style.left = `${150}px`; 
};

KeyDisplay.prototype.down = function(key) {
    const lowerKey = key.toLowerCase();
    if (this.map.get(lowerKey)) {
        this.map.get(lowerKey).style.color = 'red';
        if (lowerKey === E_KEY) {
            this.map.get(lowerKey).style.display = 'block'; 
        }
    }
};

KeyDisplay.prototype.up = function(key) {
    const lowerKey = key.toLowerCase();
    if (this.map.get(lowerKey)) {
        this.map.get(lowerKey).style.color = 'blue';
        if (lowerKey === E_KEY) {
            this.map.get(lowerKey).style.display = 'none'; // Hide 'E' when up (not near or released)
        }
    }
};

// Updated  status display using class selector
KeyDisplay.prototype.updateKeyStatus = function(status) {
    this.keyStatus = status;
    const statusElement = document.querySelector('.key-status-display'); // Use class for reliable targeting
    if (statusElement) {
        statusElement.textContent = `Key: ${status}`;
        statusElement.style.color = status === 'yes' ? 'gold' : 'white'; // Color change for grabbed
    } else {
        console.error('Key status display element not found!');
    }
};