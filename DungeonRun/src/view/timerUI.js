export class GameTimerUI {
    constructor() {
        this.startTime = null;
        this.timerInterval = null;
        this.overlay = null;
        this.elapsed = 0;
        this.isRunning = false;

        // Create the timer UI and attach to body
        this.overlay = document.createElement('div');
        this.overlay.id = 'game-timer-overlay';
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '20px';
        this.overlay.style.left = '50%';
        this.overlay.style.transform = 'translateX(-50%)';
        this.overlay.style.background = 'linear-gradient(145deg, rgba(139, 0, 0, 0.9), rgba(0, 0, 0, 0.9))';
        this.overlay.style.padding = '15px 40px';
        this.overlay.style.borderRadius = '15px';
        this.overlay.style.border = '3px solid #ff4500';
        this.overlay.style.color = '#fff';
        this.overlay.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        this.overlay.style.fontSize = '2.5em';
        this.overlay.style.fontWeight = 'bold';
        this.overlay.style.letterSpacing = '2px';
        this.overlay.style.zIndex = '9999';
        this.overlay.style.boxShadow = '0 8px 20px rgba(0,0,0,0.7), 0 0 20px rgba(255, 69, 0, 0.5)';
        this.overlay.style.textAlign = 'center';
        this.overlay.style.textShadow = '0 0 10px #ff0000, 0 0 20px #ff4500';
        this.overlay.style.animation = 'timerGlow 2s ease-in-out infinite alternate';
        this.overlay.textContent = '0:00.0';
        
        // Add the glow animation
        this.addGlowAnimation();
        
        document.body.appendChild(this.overlay);
    }

    addGlowAnimation() {
        // Check if the animation already exists
        if (!document.querySelector('#timer-glow-animation')) {
            const style = document.createElement('style');
            style.id = 'timer-glow-animation';
            style.textContent = `
                @keyframes timerGlow {
                    0% { 
                        text-shadow: 0 0 10px #ff0000, 0 0 20px #ff4500;
                        box-shadow: 0 8px 20px rgba(0,0,0,0.7), 0 0 20px rgba(255, 69, 0, 0.5);
                    }
                    50% { 
                        text-shadow: 0 0 20px #ff4500, 0 0 40px #ff0000;
                        box-shadow: 0 8px 25px rgba(0,0,0,0.8), 0 0 30px rgba(255, 69, 0, 0.7);
                    }
                    100% { 
                        text-shadow: 0 0 10px #ff0000, 0 0 20px #ff4500;
                        box-shadow: 0 8px 20px rgba(0,0,0,0.7), 0 0 20px rgba(255, 69, 0, 0.5);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.startTime = Date.now() - this.elapsed;
        this.timerInterval = setInterval(() => this.update(), 100);
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    reset() {
        this.stop();
        this.elapsed = 0;
        this.overlay.textContent = '0:00.0';
    }

    update() {
        this.elapsed = Date.now() - this.startTime;
        const totalSeconds = this.elapsed / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const milliseconds = Math.floor((this.elapsed % 1000) / 100);
        this.overlay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
    }

    remove() {
        this.stop();
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
    }
}