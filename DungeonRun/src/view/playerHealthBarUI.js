export class PlayerHealthBarUI {
    constructor(options = {}) {
        this.maxHealth = options.maxHealth || 100;
        this.health = this.maxHealth;

        // Create container
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '32px';
        this.container.style.right = '32px';
        this.container.style.width = '220px';
        this.container.style.height = '32px';
        this.container.style.background = 'rgba(30,30,30,0.7)';
        this.container.style.border = '2px solid #222';
        this.container.style.borderRadius = '8px';
        this.container.style.zIndex = 1000;
        this.container.style.display = 'flex';
        this.container.style.alignItems = 'center';
        this.container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

        // Create label
        this.label = document.createElement('span');
        this.label.textContent = 'Player';
        this.label.style.color = '#fff';
        this.label.style.fontWeight = 'bold';
        this.label.style.margin = '0 10px 0 10px';
        this.label.style.fontSize = '16px';

        // Create bar background
        this.barBg = document.createElement('div');
        this.barBg.style.flex = '1';
        this.barBg.style.height = '16px';
        this.barBg.style.background = '#444';
        this.barBg.style.borderRadius = '6px';
        this.barBg.style.overflow = 'hidden';
        this.barBg.style.marginRight = '10px';

        // Create bar foreground
        this.bar = document.createElement('div');
        this.bar.style.height = '100%';
        this.bar.style.width = '100%';
        this.bar.style.background = 'linear-gradient(90deg, #0f0, #ff0)';
        this.bar.style.transition = 'width 0.2s';

        this.barBg.appendChild(this.bar);
        this.container.appendChild(this.label);
        this.container.appendChild(this.barBg);

        document.body.appendChild(this.container);
    }

    setHealth(value) {
        this.health = Math.max(0, Math.min(this.maxHealth, value));
        const percent = (this.health / this.maxHealth) * 100;
        this.bar.style.width = percent + '%';
        if (percent > 30) {
            this.bar.style.background = 'linear-gradient(90deg, #0f0, #ff0)';
        } else {
            this.bar.style.background = 'linear-gradient(90deg, #f00, #ff0)';
        }
    }

    remove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}