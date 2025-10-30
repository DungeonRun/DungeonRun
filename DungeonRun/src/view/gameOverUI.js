export class GameOverUI {
    constructor() {
        this.isGameOver = false;
        this.overlay = null;
        this.gameOverSound = new Audio('../sounds/gameover.mp3'); // 
        this.gameOverSound.volume = parseFloat(localStorage.getItem('soundVolume')) || 1.0;
    }

    show(retryCallback) {
        if (this.isGameOver) return;

        this.isGameOver = true;
        this.overlay = document.createElement('div');
        this.overlay.id = 'game-over-overlay';
        Object.assign(this.overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '9999',
            color: 'white'
        });

        this.overlay.innerHTML = `
            <h1 style="font-size:4em; margin-bottom:20px;">Game Over</h1>
            <p style="font-size:1.5em; margin-bottom:30px;">You have been defeated</p>
            <button id="retry-btn" style="font-size:2em; padding:10px 20px; cursor:pointer; background:#4CAF50; color:white; border:none; border-radius:5px;">Retry</button>
        `;

        document.body.appendChild(this.overlay);

        // 🔊 Play the Game Over sound
        this.gameOverSound.currentTime = 0; // restart from beginning
        this.gameOverSound.play().catch(err => console.log('Sound blocked until interaction:', err));

        // Retry button event listener
        document.getElementById('retry-btn').onclick = () => {
            this.hide();
            if (retryCallback) retryCallback();
        };
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
