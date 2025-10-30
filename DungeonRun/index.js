// Create audio element for main menu
const mainMenuMusic = new Audio('./src/sounds/mainMenuSound.mp3');
mainMenuMusic.loop = true;  // Loop the music
mainMenuMusic.volume = 0.5; // Set volume to 50%

// Create audio element for button clicks
const clickSound = new Audio('./src/sounds/clickButton.mp3');
clickSound.volume = 0.7; // Set volume to 70%

// Try to play music when page loads
function playMainMenuMusic() {
    mainMenuMusic.play().catch(error => {
        console.log('Autoplay blocked. Music will play on first user interaction.');
        // If autoplay is blocked, play on first click
        document.addEventListener('click', () => {
            mainMenuMusic.play();
        }, { once: true });
    });
}

// Navigation functions
function play() {
    // Stop the music before navigating
    mainMenuMusic.pause();
    mainMenuMusic.currentTime = 0;
    
    window.location.href = "./src/movements/index.html"; //"./src/levels/level2/level2.html" ||
}

function settings() {
    alert("Under development");
}

function credits() {
    clickSound.play();
    window.location.href = "./src/gameText/credits.html";
}

//adding the instructions code here
function instructions(){
    clickSound.play();
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
    playMainMenuMusic();
});