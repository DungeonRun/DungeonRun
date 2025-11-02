// Create audio element for main menu
const mainMenuMusic = new Audio('./src/sounds/mainMenuSound.mp3');
mainMenuMusic.loop = true;

const savedMusicVolume = localStorage.getItem('musicVolume');
const isMusicMuted = localStorage.getItem('musicMuted') === 'true';
mainMenuMusic.volume = isMusicMuted ? 0 : (savedMusicVolume ? parseFloat(savedMusicVolume) : 0.5);

// Create audio element for button clicks
const clickSound = new Audio('./src/sounds/clickButton.mp3');
const savedSoundVolume = localStorage.getItem('soundVolume');
clickSound.volume = savedSoundVolume ? parseFloat(savedSoundVolume) : 1.0;

// Try to play music when page loads
function playMainMenuMusic() {
    mainMenuMusic.play().catch(error => {
        console.log('Autoplay blocked. Music could not start immediately:', error);
    });
}

// Show a full-screen horror-themed start overlay
function showStartScreen(message = 'Click anywhere to enter') {
    return new Promise((resolve) => {
        try {
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'radial-gradient(circle at 50% 50%, #1a1a1a, #000 80%)';
            overlay.style.zIndex = '9999';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.cursor = 'pointer';
            overlay.style.animation = 'fadeIn 1s ease';

            // Add pulsing animation keyframes
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes textGlow {
                    0%, 100% { 
                        text-shadow: 0 0 15px #ff0000, 0 0 30px #8b0000, 0 0 45px #8b0000;
                    }
                    50% { 
                        text-shadow: 0 0 25px #ff0000, 0 0 50px #ff4500, 0 0 75px #8b0000;
                    }
                }
                @keyframes skullPulse {
                    0%, 100% { 
                        transform: scale(1);
                        opacity: 0.8;
                    }
                    50% { 
                        transform: scale(1.1);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);

            // Container for content
            const container = document.createElement('div');
            container.style.textAlign = 'center';
            container.style.padding = '40px';
            container.style.background = 'rgba(10, 0, 0, 0.8)';
            container.style.border = '4px solid #8b0000';
            container.style.borderRadius = '15px';
            container.style.boxShadow = '0 0 40px rgba(139, 0, 0, 0.8), inset 0 0 30px rgba(0, 0, 0, 0.9)';

            // Skull icon
            const skull = document.createElement('div');
            skull.textContent = '☠';
            skull.style.fontSize = '80px';
            skull.style.color = '#ff4500';
            skull.style.textShadow = '0 0 20px #ff0000, 0 0 40px #8b0000';
            skull.style.marginBottom = '20px';
            skull.style.animation = 'skullPulse 2s ease-in-out infinite';
            container.appendChild(skull);

            // Main message
            const msg = document.createElement('div');
            msg.textContent = message;
            msg.style.color = '#ff0000';
            msg.style.fontFamily = `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
            msg.style.fontSize = '32px';
            msg.style.fontWeight = 'bold';
            msg.style.textAlign = 'center';
            msg.style.userSelect = 'none';
            msg.style.textTransform = 'uppercase';
            msg.style.letterSpacing = '4px';
            msg.style.marginBottom = '15px';
            msg.style.animation = 'textGlow 2s ease-in-out infinite';
            container.appendChild(msg);

            // Subtitle
            const subtitle = document.createElement('div');
            subtitle.textContent = 'Press any key or click';
            subtitle.style.color = '#ff4500';
            subtitle.style.fontFamily = `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
            subtitle.style.fontSize = '16px';
            subtitle.style.fontWeight = 'normal';
            subtitle.style.letterSpacing = '2px';
            subtitle.style.textShadow = '0 0 8px #ff0000';
            subtitle.style.opacity = '0.9';
            container.appendChild(subtitle);

            overlay.appendChild(container);
            document.body.appendChild(overlay);

            const cleanup = () => {
                try { 
                    overlay.style.animation = 'fadeOut 0.5s ease';
                    setTimeout(() => {
                        document.body.removeChild(overlay);
                    }, 500);
                } catch (e) {}
                window.removeEventListener('keydown', onKey);
                overlay.removeEventListener('pointerdown', onClick);
            };

            const onClick = (e) => {
                cleanup();
                resolve();
            };
            const onKey = (e) => {
                cleanup();
                resolve();
            };

            overlay.addEventListener('pointerdown', onClick, { once: true });
            window.addEventListener('keydown', onKey, { once: true });

            // Add fadeOut animation
            const fadeOutStyle = document.createElement('style');
            fadeOutStyle.textContent = `
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(fadeOutStyle);
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
    
    window.location.href = "./src/movements/index.html";
}

function settings() {
    clickSound.play();
    sessionStorage.setItem('playMusic', 'true');
    window.location.href = "./src/gameText/settings.html";
}

function credits() {
    clickSound.play();
    sessionStorage.setItem('playMusic', 'true');
    window.location.href = "./src/gameText/credits.html";
}

function instructions(){
    clickSound.play();
    sessionStorage.setItem('playMusic', 'true');
    window.location.href = "./src/gameText/instructions.html";
}

// Background animation
function backGroundAnimate() {
    const canvas = document.getElementById('embers');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

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

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.y -= p.speedY;
            p.x += p.speedX;

            if (p.y < -10) {
                p.y = canvas.height + 10;
                p.x = Math.random() * canvas.width;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 140, 0, ${p.alpha})`;
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    animate();
}

// Initialize everything when page loads
window.addEventListener('DOMContentLoaded', () => {
    backGroundAnimate();
    showStartScreen('Click anywhere to enter').then(() => {
        playMainMenuMusic();
    }).catch(() => { playMainMenuMusic(); });
});