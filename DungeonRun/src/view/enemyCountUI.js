export class EnemyCountUI {
    constructor(options = {}) {
        this.count = options.count || 0;

        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '32px';
        this.container.style.left = '32px';
        this.container.style.width = '160px';
        this.container.style.padding = '10px 12px';
        this.container.style.background = 'rgba(18,18,18,0.8)';
        this.container.style.border = '2px solid #444';
        this.container.style.borderRadius = '8px';
        this.container.style.zIndex = 1000;
        this.container.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6), inset 0 0 8px rgba(255,255,255,0.02)';
        this.container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        this.container.style.color = '#ffd700';

        this.label = document.createElement('div');
        this.label.textContent = 'ENEMIES LEFT';
        this.label.style.fontSize = '12px';
        this.label.style.letterSpacing = '2px';
        this.label.style.color = '#ffb347';
        this.label.style.fontWeight = '700';
        this.label.style.textShadow = '0 0 6px rgba(255,180,80,0.6)';
        this.label.style.marginBottom = '6px';
        this.container.appendChild(this.label);

        this.countEl = document.createElement('div');
        this.countEl.textContent = String(this.count);
        this.countEl.style.fontSize = '28px';
        this.countEl.style.fontWeight = '800';
        this.countEl.style.color = '#ffffff';
        this.countEl.style.textShadow = '0 2px 8px rgba(0,0,0,0.8)';
        this.countEl.style.textAlign = 'center';
        this.container.appendChild(this.countEl);

        document.body.appendChild(this.container);
    }

    setCount(n) {
        this.count = n;
        if (this.countEl) this.countEl.textContent = String(this.count);
        // subtle flash when count decreases
        if (this.container) {
            this.container.style.transition = 'transform 0.18s ease, box-shadow 0.18s ease';
            this.container.style.transform = 'scale(1.04)';
            this.container.style.boxShadow = '0 8px 28px rgba(0,0,0,0.7), inset 0 0 10px rgba(255,200,100,0.03)';
            setTimeout(() => {
                if (this.container) {
                    this.container.style.transform = '';
                    this.container.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6), inset 0 0 8px rgba(255,255,255,0.02)';
                }
            }, 160);
        }
    }

    remove() {
        if (this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
    }
}
