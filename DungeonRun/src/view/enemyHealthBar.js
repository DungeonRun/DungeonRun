export class EnemyHealthBar {
    constructor(parent, options = {}) {
        this.maxHealth = options.maxHealth || 100;
        this.health = this.maxHealth;

        // Create DOM element
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.width = options.width || '100px';
        this.container.style.height = options.height || '10px';
        this.container.style.background = '#333';
        this.container.style.border = '1px solid #000';
        this.container.style.borderRadius = '5px';
        this.container.style.overflow = 'hidden';
        this.container.style.zIndex = 10;

        this.bar = document.createElement('div');
        this.bar.style.height = '100%';
        this.bar.style.width = '100%';
        this.bar.style.background = options.color || '#0f0';
        this.bar.style.transition = 'width 0.2s';

        this.container.appendChild(this.bar);
        document.body.appendChild(this.container);

        this.parent = parent; 
        this.offset = options.offset || { x: 0, y: 50 }; 
    }

    setHealth(value) {
        this.health = Math.max(0, Math.min(this.maxHealth, value));
        this.bar.style.width = `${(this.health / this.maxHealth) * 100}%`;
        if (this.health <= 0) this.bar.style.background = '#f00';
    }

    update(camera) {
        if (!this.parent) return;
        const pos = this.parent.position.clone();
        pos.y += 2; // above head
        pos.project(camera);

        const x = (pos.x * 0.5 + 0.5) * window.innerWidth + this.offset.x;
        const y = (-pos.y * 0.5 + 0.5) * window.innerHeight + this.offset.y;
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;
    }

    remove() {
        document.body.removeChild(this.container);
    }
}