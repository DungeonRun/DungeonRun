/**
 * Camera View Toggle UI
 * Displays an icon in the lower-left corner showing current camera mode
 * and the key to switch between first-person and third-person views
 */
export class CameraViewToggleUI {
    constructor() {
        this.isFirstPerson = false;
        this.container = null;
        this._createUI();
    }

    _createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'camera-view-toggle';
        Object.assign(this.container.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.7)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: '1000',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            userSelect: 'none'
        });

        // Icon container
        const iconContainer = document.createElement('div');
        Object.assign(iconContainer.style, {
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            transition: 'background 0.3s ease'
        });

        // SVG Icon (will switch between first and third person)
        this.icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.icon.setAttribute('width', '24');
        this.icon.setAttribute('height', '24');
        this.icon.setAttribute('viewBox', '0 0 24 24');
        this.icon.setAttribute('fill', 'none');
        this.icon.setAttribute('stroke', 'currentColor');
        this.icon.setAttribute('stroke-width', '2');
        this.icon.setAttribute('stroke-linecap', 'round');
        this.icon.setAttribute('stroke-linejoin', 'round');
        
        iconContainer.appendChild(this.icon);

        // Text label
        this.label = document.createElement('div');
        Object.assign(this.label.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
        });

        this.modeText = document.createElement('div');
        this.modeText.style.fontSize = '12px';
        this.modeText.style.opacity = '0.8';
        this.modeText.textContent = 'Camera View';

        this.keyText = document.createElement('div');
        Object.assign(this.keyText.style, {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#af4c4cff'
        });
        this.keyText.textContent = 'Press Y';

        this.label.appendChild(this.modeText);
        this.label.appendChild(this.keyText);

        this.container.appendChild(iconContainer);
        this.container.appendChild(this.label);

        // Hover effects
        this.container.addEventListener('mouseenter', () => {
            this.container.style.background = 'rgba(0, 0, 0, 0.85)';
            this.container.style.borderColor = 'rgba(175, 96, 76, 0.6)';
            this.container.style.transform = 'scale(1.05)';
            iconContainer.style.background = 'rgba(76, 175, 80, 0.2)';
        });

        this.container.addEventListener('mouseleave', () => {
            this.container.style.background = 'rgba(0, 0, 0, 0.7)';
            this.container.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            this.container.style.transform = 'scale(1)';
            iconContainer.style.background = 'rgba(255, 255, 255, 0.1)';
        });

        // Initial icon (third person)
        this._updateIcon();

        document.body.appendChild(this.container);
    }

    _updateIcon() {
        // Clear existing paths
        while (this.icon.firstChild) {
            this.icon.removeChild(this.icon.firstChild);
        }

        if (this.isFirstPerson) {
            // First person icon (eye symbol)
            const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path1.setAttribute('d', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z');
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '12');
            circle.setAttribute('cy', '12');
            circle.setAttribute('r', '3');
            this.icon.appendChild(path1);
            this.icon.appendChild(circle);
            this.modeText.textContent = 'First Person';
        } else {
            // Third person icon (person with camera behind)
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '12');
            circle.setAttribute('cy', '8');
            circle.setAttribute('r', '3');
            const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path1.setAttribute('d', 'M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2');
            const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path2.setAttribute('d', 'M19 8l3-3m0 0l-3-3m3 3H8');
            this.icon.appendChild(circle);
            this.icon.appendChild(path1);
            this.icon.appendChild(path2);
            this.modeText.textContent = 'Third Person';
        }
    }

    toggle() {
        this.isFirstPerson = !this.isFirstPerson;
        this._updateIcon();
        
        // Brief animation feedback
        this.container.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.container.style.transform = 'scale(1)';
        }, 150);
    }

    setMode(isFirstPerson) {
        if (this.isFirstPerson !== isFirstPerson) {
            this.isFirstPerson = isFirstPerson;
            this._updateIcon();
        }
    }

    show() {
        if (this.container) {
            this.container.style.display = 'flex';
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    remove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
            this.container = null;
        }
    }
}