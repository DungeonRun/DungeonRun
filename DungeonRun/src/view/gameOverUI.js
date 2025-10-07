export class GameOverUI {
    constructor() {
        this.isGameOver = false;
        this.overlay = null;
    }

    show(retryCallback) {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        this.overlay = document.createElement('div');
        this.overlay.id = 'game-over-overlay';
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100vw';
        this.overlay.style.height = '100vh';
        this.overlay.style.background = 'rgba(0,0,0,0.8)';
        this.overlay.style.display = 'flex';
        this.overlay.style.flexDirection = 'column';
        this.overlay.style.justifyContent = 'center';
        this.overlay.style.alignItems = 'center';
        this.overlay.style.zIndex = '9999';
        this.overlay.style.color = 'white';
        
        this.overlay.innerHTML = `
            <h1 style="font-size:4em; margin-bottom:20px;">Game Over</h1>
            <p style="font-size:1.5em; margin-bottom:30px;">You have been defeated</p>
            <button id="retry-btn" style="font-size:2em; padding:10px 20px; cursor:pointer; background:#4CAF50; color:white; border:none; border-radius:5px;">Retry</button>
        `;

        document.body.appendChild(this.overlay);

        // Add retry button event listener
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