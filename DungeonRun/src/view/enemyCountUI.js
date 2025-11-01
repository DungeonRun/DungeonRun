export class EnemyCountUI {
    constructor(options = {}) {
        this.count = options.count || 0;

        // Create main container with horror styling
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '32px';
        this.container.style.left = '32px';
        this.container.style.width = '180px';
        this.container.style.padding = '15px 18px';
        this.container.style.background = 'rgba(20, 20, 20, 0.85)';
        this.container.style.border = '3px solid #8b0000';
        this.container.style.borderRadius = '10px';
        this.container.style.zIndex = 1000;
        this.container.style.boxShadow = '0 0 20px rgba(139, 0, 0, 0.6), inset 0 0 15px rgba(0, 0, 0, 0.8)';
        this.container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        this.container.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';

        // Add pulsing animation
        this.addAnimationStyles();

        // Label with blood-red glow
        this.label = document.createElement('div');
        this.label.textContent = 'ENEMIES LEFT';
        this.label.style.fontSize = '13px';
        this.label.style.letterSpacing = '2px';
        this.label.style.color = '#ff4500';
        this.label.style.fontWeight = 'bold';
        this.label.style.textShadow = '0 0 8px #ff0000, 0 0 12px #8b0000';
        this.label.style.marginBottom = '8px';
        this.label.style.textAlign = 'center';
        this.container.appendChild(this.label);

        // Count display with dramatic styling
        this.countEl = document.createElement('div');
        this.countEl.textContent = String(this.count);
        this.countEl.style.fontSize = '36px';
        this.countEl.style.fontWeight = '800';
        this.countEl.style.color = '#ff0000';
        this.countEl.style.textShadow = '0 0 15px #ff0000, 0 0 25px #8b0000, 0 3px 8px rgba(0, 0, 0, 0.8)';
        this.countEl.style.textAlign = 'center';
        this.countEl.style.animation = 'countPulse 2s ease-in-out infinite';
        this.container.appendChild(this.countEl);

        document.body.appendChild(this.container);
    }

    addAnimationStyles() {
        // Check if style already exists
        if (document.getElementById('enemy-count-animations')) return;

        const style = document.createElement('style');
        style.id = 'enemy-count-animations';
        style.textContent = `
            @keyframes countPulse {
                0%, 100% { 
                    transform: scale(1);
                    text-shadow: 0 0 15px #ff0000, 0 0 25px #8b0000, 0 3px 8px rgba(0, 0, 0, 0.8);
                }
                50% { 
                    transform: scale(1.05);
                    text-shadow: 0 0 20px #ff0000, 0 0 35px #ff4500, 0 3px 8px rgba(0, 0, 0, 0.8);
                }
            }

            @keyframes killFlash {
                0% { 
                    transform: scale(1);
                    box-shadow: 0 0 20px rgba(139, 0, 0, 0.6), inset 0 0 15px rgba(0, 0, 0, 0.8);
                }
                50% { 
                    transform: scale(1.12);
                    box-shadow: 0 0 40px rgba(255, 0, 0, 1), inset 0 0 20px rgba(255, 69, 0, 0.5);
                }
                100% { 
                    transform: scale(1);
                    box-shadow: 0 0 20px rgba(139, 0, 0, 0.6), inset 0 0 15px rgba(0, 0, 0, 0.8);
                }
            }

            @keyframes countDecrease {
                0% { 
                    transform: scale(1);
                    color: #ff0000;
                }
                50% { 
                    transform: scale(1.3);
                    color: #ff4500;
                    text-shadow: 0 0 25px #ff0000, 0 0 40px #ff4500, 0 3px 8px rgba(0, 0, 0, 0.8);
                }
                100% { 
                    transform: scale(1);
                    color: #ff0000;
                }
            }

            @keyframes greenPulse {
                0%, 100% { 
                    transform: scale(1);
                    text-shadow: 0 0 20px #00ff00, 0 0 35px #00ff00, 0 3px 8px rgba(0, 0, 0, 0.8);
                }
                50% { 
                    transform: scale(1.08);
                    text-shadow: 0 0 30px #00ff00, 0 0 50px #00ff00, 0 3px 8px rgba(0, 0, 0, 0.8);
                }
            }
        `;
        document.head.appendChild(style);
    }

    setCount(n) {
        this.count = n;
        if (this.countEl) {
            this.countEl.textContent = String(this.count);
            
            // Dramatic kill animation
            this.countEl.style.animation = 'none';
            setTimeout(() => {
                this.countEl.style.animation = 'countDecrease 0.5s ease, countPulse 2s ease-in-out infinite';
            }, 10);
        }

        // Flash the entire container with blood-red effect
        if (this.container) {
            this.container.style.animation = 'killFlash 0.4s ease';
            setTimeout(() => {
                if (this.container) {
                    this.container.style.animation = 'none';
                }
            }, 400);
        }

        // Change text when enemies are cleared (but keep red styling)
        if (n === 0) {
            this.label.textContent = 'ALL SLAIN';
        }
    }

    remove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}