export class PlayerHealthBarUI {
    constructor(options = {}) {
        this.maxHealth = options.maxHealth || 100;
        this.health = this.maxHealth;

        // Create container with horror styling
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '32px';
        this.container.style.right = '32px';
        this.container.style.width = '280px';
        this.container.style.padding = '15px';
        this.container.style.background = 'rgba(20, 20, 20, 0.85)';
        this.container.style.border = '3px solid #8b0000';
        this.container.style.borderRadius = '10px';
        this.container.style.zIndex = 1000;
        this.container.style.boxShadow = '0 0 20px rgba(139, 0, 0, 0.6), inset 0 0 15px rgba(0, 0, 0, 0.8)';
        this.container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

        // Create label with glowing effect
        this.label = document.createElement('div');
        this.label.textContent = 'VITALITY';
        this.label.style.color = '#ff4500';
        this.label.style.fontWeight = 'bold';
        this.label.style.fontSize = '14px';
        this.label.style.letterSpacing = '2px';
        this.label.style.marginBottom = '8px';
        this.label.style.textShadow = '0 0 8px #ff0000, 0 0 12px #8b0000';
        this.label.style.textAlign = 'center';

        // Create bar background with inner shadow
        this.barBg = document.createElement('div');
        this.barBg.style.width = '100%';
        this.barBg.style.height = '24px';
        this.barBg.style.background = 'linear-gradient(180deg, #1a0000, #000)';
        this.barBg.style.borderRadius = '8px';
        this.barBg.style.overflow = 'hidden';
        this.barBg.style.border = '2px solid #4a0000';
        this.barBg.style.boxShadow = 'inset 0 3px 8px rgba(0, 0, 0, 0.9)';
        this.barBg.style.position = 'relative';

        // Create bar foreground with horror red gradient
        this.bar = document.createElement('div');
        this.bar.style.height = '100%';
        this.bar.style.width = '100%';
        this.bar.style.background = 'linear-gradient(90deg, #8b0000, #ff0000, #ff4500)';
        this.bar.style.transition = 'width 0.3s ease, box-shadow 0.3s ease';
        this.bar.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.8), inset 0 0 10px rgba(255, 69, 0, 0.5)';
        this.bar.style.position = 'relative';

        // Add pulsing animation to bar
        this.bar.style.animation = 'healthPulse 2s ease-in-out infinite';

        // Create health text overlay
        this.healthText = document.createElement('div');
        this.healthText.textContent = `${Math.ceil(this.health)} / ${this.maxHealth}`;
        this.healthText.style.position = 'absolute';
        this.healthText.style.top = '0';
        this.healthText.style.left = '0';
        this.healthText.style.width = '100%';
        this.healthText.style.height = '100%';
        this.healthText.style.display = 'flex';
        this.healthText.style.alignItems = 'center';
        this.healthText.style.justifyContent = 'center';
        this.healthText.style.color = '#fff';
        this.healthText.style.fontSize = '12px';
        this.healthText.style.fontWeight = 'bold';
        this.healthText.style.textShadow = '0 0 5px #000, 2px 2px 3px #000';
        this.healthText.style.pointerEvents = 'none';
        this.healthText.style.zIndex = '2';

        // Assemble components
        this.barBg.appendChild(this.bar);
        this.barBg.appendChild(this.healthText);
        this.container.appendChild(this.label);
        this.container.appendChild(this.barBg);

        // Add keyframe animation to document
        this.addAnimationStyles();

        document.body.appendChild(this.container);
    }

    addAnimationStyles() {
        // Check if style already exists
        if (document.getElementById('horror-health-animations')) return;

        const style = document.createElement('style');
        style.id = 'horror-health-animations';
        style.textContent = `
            @keyframes healthPulse {
                0%, 100% { 
                    filter: brightness(1);
                }
                50% { 
                    filter: brightness(1.2);
                }
            }

            @keyframes criticalPulse {
                0%, 100% { 
                    box-shadow: 0 0 15px rgba(255, 0, 0, 0.8), inset 0 0 10px rgba(255, 69, 0, 0.5);
                }
                50% { 
                    box-shadow: 0 0 25px rgba(255, 0, 0, 1), inset 0 0 15px rgba(255, 69, 0, 0.8);
                }
            }

            @keyframes containerShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-2px); }
                75% { transform: translateX(2px); }
            }
        `;
        document.head.appendChild(style);
    }

    setHealth(value) {
        this.health = Math.max(0, Math.min(this.maxHealth, value));
        const percent = (this.health / this.maxHealth) * 100;
        
        // Update bar width
        this.bar.style.width = percent + '%';
        
        // Update health text
        this.healthText.textContent = `${Math.ceil(this.health)} / ${this.maxHealth}`;
        
        // Change color and effects based on health percentage
        if (percent > 60) {
            // Healthy - red/orange gradient
            this.bar.style.background = 'linear-gradient(90deg, #8b0000, #ff0000, #ff4500)';
            this.bar.style.animation = 'healthPulse 2s ease-in-out infinite';
            this.container.style.animation = 'none';
        } else if (percent > 30) {
            // Wounded - darker red
            this.bar.style.background = 'linear-gradient(90deg, #660000, #cc0000, #ff0000)';
            this.bar.style.animation = 'healthPulse 1.5s ease-in-out infinite';
            this.container.style.animation = 'none';
        } else {
            // Critical - dark red with intense pulsing
            this.bar.style.background = 'linear-gradient(90deg, #4a0000, #8b0000, #cc0000)';
            this.bar.style.animation = 'criticalPulse 0.8s ease-in-out infinite';
            this.container.style.animation = 'containerShake 0.3s ease-in-out infinite';
        }
    }

    remove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}