export const UP = 'KeyW';
export const DOWN = 'KeyS';
export const LEFT = 'KeyA';
export const RIGHT = 'KeyD';
export const SHIFT = 'ShiftLeft';
export const E_KEY = 'KeyE';
export const DIRECTIONS = [UP, DOWN, LEFT, RIGHT];

export class KeyDisplay {
    constructor() {
        this.map = new Map();
        this.keyStatus = 'no';
        
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.bottom = '0';
        this.container.style.left = '0';
        this.container.style.zIndex = '1000';
        this.container.style.pointerEvents = 'none';
        this.container.style.width = '100%'; 
        this.container.style.height = '200px'; 
        this.container.style.overflow = 'visible'; 
        
        this.keyStatusDisplay = document.createElement('div');
        this.keyStatusDisplay.className = 'key-status-display';
        this.keyStatusDisplay.style.color = 'white';
        this.keyStatusDisplay.style.fontSize = '24px';
        this.keyStatusDisplay.style.fontWeight = 'bold';
        this.keyStatusDisplay.style.position = 'absolute';
        this.keyStatusDisplay.style.top = '20px'; 
        this.keyStatusDisplay.style.left = '20px'; 
        this.keyStatusDisplay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.keyStatusDisplay.style.padding = '10px';
        this.keyStatusDisplay.style.borderRadius = '5px';
        this.keyStatusDisplay.textContent = `Key: ${this.keyStatus}`;
            
        this.createKeyElements();
        this.updatePosition();
        
        this.container.appendChild(this.keyStatusDisplay);
        this.map.forEach((element) => {
            this.container.appendChild(element);
        });
        
        document.body.appendChild(this.container);
    }

    createKeyElements() {
        const up = document.createElement("div");
        const down = document.createElement("div");
        const left = document.createElement("div");
        const right = document.createElement("div");
        const shift = document.createElement("div");
        const eKey = document.createElement("div");

        this.map.set(UP, up);
        this.map.set(DOWN, down);
        this.map.set(LEFT, left);
        this.map.set(RIGHT, right);
        this.map.set(SHIFT, shift);
        this.map.set(E_KEY, eKey);

        this.map.forEach((element, key) => {
            element.style.color = 'blue';
            element.style.fontSize = '50px';
            element.style.fontWeight = '800';
            element.style.position = 'absolute';
            element.textContent = this.getKeyDisplayText(key);
            
            if (key === E_KEY) {
                element.style.display = 'none';
            }
        });
    }

    getKeyDisplayText(key) {
        const keyTextMap = {
            [UP]: 'W',
            [DOWN]: 'S', 
            [LEFT]: 'A',
            [RIGHT]: 'D',
            [SHIFT]: 'Shift',
            [E_KEY]: 'E'
        };
        return keyTextMap[key] || key;
    }

    updatePosition() {
        // Position keys relative to bottom of container
        const containerHeight = 200;
        
        this.map.get(UP).style.bottom = '100px';
        this.map.get(DOWN).style.bottom = '50px';
        this.map.get(LEFT).style.bottom = '50px';
        this.map.get(RIGHT).style.bottom = '50px';
        this.map.get(SHIFT).style.bottom = '50px';
        this.map.get(E_KEY).style.bottom = '50px';

        this.map.get(UP).style.left = '300px';
        this.map.get(LEFT).style.left = '200px';
        this.map.get(DOWN).style.left = '300px';
        this.map.get(RIGHT).style.left = '400px';
        this.map.get(SHIFT).style.left = '50px';
        this.map.get(E_KEY).style.left = '150px';
        
        // Keep key status at top left of screen
        if (this.keyStatusDisplay) {
            this.keyStatusDisplay.style.top = '20px';
            this.keyStatusDisplay.style.left = '20px';
        }
    }

    down(code) {
        if (this.map.get(code)) {
            this.map.get(code).style.color = 'red';
            if (code === E_KEY) {
                this.map.get(code).style.display = 'block';
            }
        }
    }

    up(code) {
        if (this.map.get(code)) {
            this.map.get(code).style.color = 'blue';
            if (code === E_KEY) {
                this.map.get(code).style.display = 'none';
            }
        }
    }

    updateKeyStatus(status) {
        this.keyStatus = status;
        const statusElement = document.querySelector('.key-status-display');
        if (statusElement) {
            statusElement.textContent = `Key: ${status}`;
            statusElement.style.color = status === 'yes' ? 'gold' : 'white';
        } else {
            console.error('Key status display element not found!');
        }
    }

    remove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}