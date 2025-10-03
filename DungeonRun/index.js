function play(){
    window.location.href = "./src/movements/index.html";
}
function settings(){
    alert("Under development");
}
function credits(){
    alert("Under development");
}

function backGroundAnimate(){
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

backGroundAnimate();