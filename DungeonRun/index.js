// Create audio element for main menu
const mainMenuMusic = new Audio('./src/sounds/mainMenuSound.mp3');
mainMenuMusic.loop = true;  // Loop the music
//mainMenuMusic.volume = 0.5; // Set volume to 50%

const savedMusicVolume = localStorage.getItem('musicVolume');
mainMenuMusic.volume = savedMusicVolume ? parseFloat(savedMusicVolume) : 0.5;

// Create audio element for button clicks
const clickSound = new Audio('./src/sounds/clickButton.mp3');
//clickSound.volume = 1; // Set volume to 100%
const savedSoundVolume = localStorage.getItem('soundVolume');
clickSound.volume = savedSoundVolume ? parseFloat(savedSoundVolume) : 1.0;

// Try to play music when page loads
function playMainMenuMusic() {
    mainMenuMusic.play().catch(error => {
        console.log('Autoplay blocked. Music could not start immediately:', error);
    });
}

// Show a full-screen start overlay that waits for a user gesture (click/keypress)
function showStartScreen(message = 'Click anywhere to start') {
    return new Promise((resolve) => {
        try {
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'rgba(0,0,0,1)';
            overlay.style.zIndex = '9999';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.cursor = 'pointer';

            const msg = document.createElement('div');
            msg.textContent = message;
            msg.style.color = '#ffffff';
            msg.style.fontFamily = `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
            msg.style.fontSize = '28px';
            msg.style.fontWeight = '700';
            msg.style.textAlign = 'center';
            msg.style.userSelect = 'none';
            msg.style.textTransform = 'uppercase';
            msg.style.letterSpacing = '2px';

            overlay.appendChild(msg);
            document.body.appendChild(overlay);

            const cleanup = () => {
                try { document.body.removeChild(overlay); } catch (e) {}
                window.removeEventListener('keydown', onKey);
                overlay.removeEventListener('pointerdown', onClick);
            };

            const onClick = (e) => {
                cleanup();
                resolve();
            };
            const onKey = (e) => {
                if (e.code === 'Enter' || e.code === 'Space' || !e.code) {
                    cleanup();
                    resolve();
                }
            };

            overlay.addEventListener('pointerdown', onClick, { once: true });
            window.addEventListener('keydown', onKey, { once: true });
        } catch (e) {
            resolve();
        }
    });
}

// Navigation functions
function play() {
    // Stop the music before navigating
    clickSound.play();
    mainMenuMusic.pause();
    mainMenuMusic.currentTime = 0;
    
    window.location.href = "./src/movements/index.html"; //"./src/levels/level2/level2.html" ||
}

function settings() {
    clickSound.play();
    sessionStorage.setItem('playMusic', 'true'); // Remember to play music
    window.location.href = "./src/gameText/settings.html";
}

function credits() {
    clickSound.play();
    sessionStorage.setItem('playMusic', 'true'); // Remember to play music
    window.location.href = "./src/gameText/credits.html";
}

//adding the instructions code here
function instructions(){
    clickSound.play();
    sessionStorage.setItem('playMusic', 'true'); // Remember to play music
    window.location.href = "./src/gameText/instructions.html";
}

// Background animation
function backGroundAnimate() {
    const canvas = document.getElementById('embers');
    const ctx = canvas.getContext('2d');

    // Make the canvas full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // Ember particles
    const particles = [];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2 + 1,
            speedY: Math.random() * 0.5 + 0.2,
            speedX: (Math.random() - 0.5) * 0.2,
            alpha: Math.random() * 0.5 + 0.3
        });
    }

    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.y -= p.speedY;
            p.x += p.speedX;

            // Reset particle when it goes off screen
            if (p.y < -10) {
                p.y = canvas.height + 10;
                p.x = Math.random() * canvas.width;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 140, 0, ${p.alpha})`; // fiery ember color
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    animate();
}

// Initialize everything when page loads
window.addEventListener('DOMContentLoaded', () => {
    backGroundAnimate();
    // show click-to-start so music can play after a user gesture
    showStartScreen('Click anywhere to start').then(() => {
        playMainMenuMusic();
    }).catch(() => { playMainMenuMusic(); });
});