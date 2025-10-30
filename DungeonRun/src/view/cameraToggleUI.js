export class CameraToggleUI {
    constructor(onToggle) {
        this.isFirstPerson = false;
        this.onToggle = onToggle;
        
        // Create toggle button
        this.button = document.createElement('button');
        this.button.id = 'camera-toggle-btn';
        this.button.textContent = '🎥 Third Person';
        
        Object.assign(this.button.style, {
            position: 'fixed',
            top: '80px',
            right: '32px',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#fff',
            background: 'rgba(50, 50, 50, 0.8)',
            border: '2px solid #444',
            borderRadius: '8px',
            cursor: 'pointer',
            zIndex: '1000',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        });
        
        // Hover effects
        this.button.addEventListener('mouseenter', () => {
            this.button.style.background = 'rgba(70, 70, 70, 0.9)';
            this.button.style.transform = 'scale(1.05)';
        });
        
        this.button.addEventListener('mouseleave', () => {
            this.button.style.background = 'rgba(50, 50, 50, 0.8)';
            this.button.style.transform = 'scale(1)';
        });
        
        // Click handler
        this.button.addEventListener('click', () => {
            this.toggle();
        });
        
        document.body.appendChild(this.button);
        
        // Add keyboard shortcut (C key)
        this._onKeyDown = (event) => {
            if (event.code === 'KeyC') {
                this.toggle();
            }
        };
        document.addEventListener('keydown', this._onKeyDown);
    }
    
    toggle() {
        this.isFirstPerson = !this.isFirstPerson;
        this.updateButton();
        
        if (this.onToggle) {
            this.onToggle(this.isFirstPerson);
        }
    }
    
    updateButton() {
        if (this.isFirstPerson) {
            this.button.textContent = '🎥 First Person';
            this.button.style.background = 'rgba(70, 100, 70, 0.8)';
        } else {
            this.button.textContent = '🎥 Third Person';
            this.button.style.background = 'rgba(50, 50, 50, 0.8)';
        }
    }
    
    getMode() {
        return this.isFirstPerson ? 'first-person' : 'third-person';
    }
    
    remove() {
        if (this.button && this.button.parentNode) {
            this.button.parentNode.removeChild(this.button);
        }
        document.removeEventListener('keydown', this._onKeyDown);
    }
}