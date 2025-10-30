export class PauseMenuUI {
    constructor() {
        this.isPaused = false;
        this.overlay = null;
    }

    show(continueCallback, restartCallback) {
        if (this.isPaused) return;
        
        this.isPaused = true;
        this.overlay = document.createElement('div');
        this.overlay.id = 'pause-menu-overlay';
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100vw';
        this.overlay.style.height = '100vh';
        this.overlay.style.background = 'radial-gradient(circle at 50% 50%, rgba(26, 26, 26, 0.95), rgba(0, 0, 0, 0.98) 80%)';
        this.overlay.style.display = 'flex';
        this.overlay.style.flexDirection = 'column';
        this.overlay.style.justifyContent = 'center';
        this.overlay.style.alignItems = 'center';
        this.overlay.style.zIndex = '9999';
        this.overlay.style.color = '#fff';
        this.overlay.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        
        this.overlay.innerHTML = `
            <h1 id="pause-title" style="
                font-size: 4em; 
                margin-bottom: 60px; 
                letter-spacing: 3px;
                text-shadow: 0 0 10px #ff0000, 0 0 20px #ff4500;
                animation: pauseTitleGlow 2s ease-in-out infinite alternate;
            ">PAUSED</h1>
            <div style="display: flex; flex-direction: column; gap: 20px; align-items: center;">
                <button id="continue-btn" style="
                    background: linear-gradient(145deg, #ff0000, #8b0000);
                    border: 3px solid #ff4500;
                    color: #fff;
                    padding: 25px 60px;
                    font-size: 2em;
                    font-weight: bold;
                    cursor: pointer;
                    border-radius: 15px;
                    transition: all 0.3s ease;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                    width: 300px;
                    text-align: center;
                ">Continue</button>
                <button id="restart-btn" style="
                    background: linear-gradient(145deg, #ff0000, #8b0000);
                    border: 3px solid #ff4500;
                    color: #fff;
                    padding: 25px 60px;
                    font-size: 2em;
                    font-weight: bold;
                    cursor: pointer;
                    border-radius: 15px;
                    transition: all 0.3s ease;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                    width: 300px;
                    text-align: center;
                ">Restart Level</button>
            </div>
            <p style="
                margin-top: 60px; 
                font-size: 1.2em; 
                opacity: 0.7;
                text-shadow: 0 0 5px rgba(255, 69, 0, 0.5);
            ">Press F1 to resume</p>
        `;

        // Add CSS animation for title glow
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pauseTitleGlow {
                0% { text-shadow: 0 0 10px #ff0000, 0 0 20px #ff4500; }
                50% { text-shadow: 0 0 20px #ff4500, 0 0 40px #ff0000; }
                100% { text-shadow: 0 0 10px #ff0000, 0 0 20px #ff4500; }
            }
            @keyframes pauseHoverPulse {
                0% { box-shadow: 0 8px 20px rgba(255, 69, 0, 0.7), 0 0 20px rgba(255,0,0,0.5); }
                50% { box-shadow: 0 12px 25px rgba(255, 69, 0, 0.9), 0 0 30px rgba(255,0,0,0.7); }
                100% { box-shadow: 0 8px 20px rgba(255, 69, 0, 0.7), 0 0 20px rgba(255,0,0,0.5); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(this.overlay);

        // Add hover effects matching your game's style
        const continueBtn = document.getElementById('continue-btn');
        const restartBtn = document.getElementById('restart-btn');

        continueBtn.onmouseover = () => {
            continueBtn.style.background = 'linear-gradient(145deg, #ff4500, #ff0000)';
            continueBtn.style.transform = 'scale(1.1) rotate(-2deg)';
            continueBtn.style.boxShadow = '0 8px 20px rgba(255, 69, 0, 0.7), 0 0 20px rgba(255,0,0,0.5)';
            continueBtn.style.borderColor = '#ff0000';
            continueBtn.style.animation = 'pauseHoverPulse 0.6s ease-in-out infinite alternate';
        };
        continueBtn.onmouseout = () => {
            continueBtn.style.background = 'linear-gradient(145deg, #ff0000, #8b0000)';
            continueBtn.style.transform = 'scale(1)';
            continueBtn.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)';
            continueBtn.style.borderColor = '#ff4500';
            continueBtn.style.animation = 'none';
        };
        continueBtn.onmousedown = () => {
            continueBtn.style.transform = 'scale(0.95)';
            continueBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.6)';
        };

        restartBtn.onmouseover = () => {
            restartBtn.style.background = 'linear-gradient(145deg, #ff4500, #ff0000)';
            restartBtn.style.transform = 'scale(1.1) rotate(-2deg)';
            restartBtn.style.boxShadow = '0 8px 20px rgba(255, 69, 0, 0.7), 0 0 20px rgba(255,0,0,0.5)';
            restartBtn.style.borderColor = '#ff0000';
            restartBtn.style.animation = 'pauseHoverPulse 0.6s ease-in-out infinite alternate';
        };
        restartBtn.onmouseout = () => {
            restartBtn.style.background = 'linear-gradient(145deg, #ff0000, #8b0000)';
            restartBtn.style.transform = 'scale(1)';
            restartBtn.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)';
            restartBtn.style.borderColor = '#ff4500';
            restartBtn.style.animation = 'none';
        };
        restartBtn.onmousedown = () => {
            restartBtn.style.transform = 'scale(0.95)';
            restartBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.6)';
        };

        // Button event listeners
        continueBtn.onclick = () => {
            this.hide();
            if (continueCallback) continueCallback();
        };

        restartBtn.onclick = () => {
            this.hide();
            if (restartCallback) restartCallback();
        };
    }

    hide() {
        this.isPaused = false;
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
    }

    remove() {
        this.hide();
    }
}