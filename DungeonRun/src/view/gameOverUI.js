export class GameOverUI {
    constructor() {
        this.isGameOver = false;
        this.overlay = null;
        this.gameOverSound = new Audio('../sounds/gameover.mp3');
        this.gameOverSound.volume = parseFloat(localStorage.getItem('soundVolume')) || 1.0;
    }

    show(retryCallback) {
        if (this.isGameOver) return;

        this.isGameOver = true;

        //  Create overlay container
        this.overlay = document.createElement('div');
        this.overlay.id = 'game-over-overlay';
        Object.assign(this.overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: 'radial-gradient(circle at 50% 50%, rgba(26, 26, 26, 0.95), rgba(0, 0, 0, 0.9))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '9999',
            color: '#fff',
            fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
            textAlign: 'center',
            animation: 'fadeIn 1s ease'
        });

        //  Inject styled inner content
        this.overlay.innerHTML = `
            <h1 style="
                font-size: 4em;
                margin-bottom: 20px;
                color: #ff0000;
                text-shadow: 0 0 10px #ff0000, 0 0 25px #ff4500;
                animation: titleGlow 2s ease-in-out infinite alternate;
                letter-spacing: 3px;
            ">
                GAME OVER
            </h1>

            <p style="
                font-size: 1.5em;
                margin-bottom: 40px;
                color: #fff;
                text-shadow: 0 0 8px rgba(255, 69, 0, 0.7);
            ">
                You have been defeated
            </p>

            <button id="retry-btn" style="
                background: linear-gradient(145deg, #ff0000, #8b0000);
                border: 3px solid #ff4500;
                color: #fff;
                padding: 20px 60px;
                font-size: 1.8em;
                font-weight: bold;
                cursor: pointer;
                border-radius: 15px;
                transition: all 0.3s ease;
                box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                text-transform: uppercase;
            ">
                Retry
            </button>
        `;

        document.body.appendChild(this.overlay);

        //  Play sound
        this.gameOverSound.currentTime = 0;
        this.gameOverSound.play().catch(err => console.log('Sound blocked until interaction:', err));

        //  Button behavior
        const retryButton = document.getElementById('retry-btn');
        retryButton.addEventListener('mouseenter', () => {
            retryButton.style.background = 'linear-gradient(145deg, #ff4500, #ff0000)';
            retryButton.style.transform = 'scale(1.1) rotate(-2deg)';
            retryButton.style.boxShadow = '0 8px 20px rgba(255, 69, 0, 0.7), 0 0 20px rgba(255,0,0,0.5)';
            retryButton.style.borderColor = '#ff0000';
        });

        retryButton.addEventListener('mouseleave', () => {
            retryButton.style.background = 'linear-gradient(145deg, #ff0000, #8b0000)';
            retryButton.style.transform = 'scale(1) rotate(0deg)';
            retryButton.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)';
            retryButton.style.borderColor = '#ff4500';
        });

        retryButton.addEventListener('click', () => {
            retryButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.hide();
                if (retryCallback) retryCallback();
            }, 200);
        });
    }

    hide() {
        this.isGameOver = false;
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
    }

    remove() {
        this.hide();
    }
}
