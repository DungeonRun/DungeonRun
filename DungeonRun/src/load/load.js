import * as THREE from 'three';

export class Loader {
    constructor(scene, camera, renderer, headerText = '') {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.isLoading = false;
        this.progress = 0;
        this.frameCounter = 0;
        this.sampleInterval = 150;
        this.lastCaptureFrame = 0;
        this.headerText = headerText;

        // spider-web canvas state placeholders
        this._webs = [];
        this._webAnimFrame = null;
        this._resizeWebHandler = null;
        this._cleanupWebs = null;

        this.setupLoadingScreen();
        this.setupWebCanvas(); // <-- spider-web canvas
        this.setupBlurEffect();
    }

    setupLoadingScreen() {
        // inject CSS animations/styles used by the loader UI (avoid duplicates)
        if (!document.getElementById('loader-ui-styles')) {
            const style = document.createElement('style');
            style.id = 'loader-ui-styles';
            style.textContent = `
                @keyframes loaderFadeIn {
                    0% { opacity: 0; transform: scale(0.98); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes loaderTitleGlow {
                    0% { text-shadow: 0 0 8px #ff0000, 0 0 18px #ff4500; }
                    50% { text-shadow: 0 0 18px #ff4500, 0 0 36px #ff0000; }
                    100% { text-shadow: 0 0 8px #ff0000, 0 0 18px #ff4500; }
                }
                @keyframes loadingPulse {
                    0% { box-shadow: 0 8px 20px rgba(255,69,0,0.6); }
                    50% { box-shadow: 0 12px 28px rgba(255,69,0,0.85); }
                    100% { box-shadow: 0 8px 20px rgba(255,69,0,0.6); }
                }
                /* optional shimmer for progress container (keeps subtle) */
                .progress-shimmer::after {
                  content: "";
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.03) 100%);
                  transform: translateX(-100%);
                  animation: shimmer 1.6s linear infinite;
                  border-radius: 12px;
                  mix-blend-mode: overlay;
                  pointer-events: none;
                }
                @keyframes shimmer { 100% { transform: translateX(100%); } }
            `;
            document.head.appendChild(style);
        }

        // main container
        this.loadingScreen = document.createElement('div');
        this.loadingScreen.style.position = 'fixed';
        this.loadingScreen.style.top = '0';
        this.loadingScreen.style.left = '0';
        this.loadingScreen.style.width = '100%';
        this.loadingScreen.style.height = '100%';
        this.loadingScreen.style.background = 'radial-gradient(circle at 50% 50%, rgba(26,26,26,0.95), rgba(0,0,0,0.9))';
        this.loadingScreen.style.display = 'flex';
        this.loadingScreen.style.flexDirection = 'column';
        this.loadingScreen.style.justifyContent = 'center';
        this.loadingScreen.style.alignItems = 'center';
        this.loadingScreen.style.zIndex = '1000';
        this.loadingScreen.style.color = '#fff';
        this.loadingScreen.style.fontFamily = `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
        this.loadingScreen.style.fontSize = '24px';
        this.loadingScreen.style.textAlign = 'center';
        this.loadingScreen.style.animation = 'loaderFadeIn 0.9s ease both';
        this.loadingScreen.style.overflow = 'hidden';

        // optional header (e.g., "Saving Dungeon..." or stage name)
        if (this.headerText) {
            this.loadingHeader = document.createElement('div');
            this.loadingHeader.textContent = this.headerText;
            this.loadingHeader.style.marginBottom = '12px';
            this.loadingHeader.style.fontSize = '34px';
            this.loadingHeader.style.fontWeight = '800';
            this.loadingHeader.style.textTransform = 'uppercase';
            this.loadingHeader.style.letterSpacing = '2px';
            this.loadingHeader.style.color = '#ff6347';
            this.loadingHeader.style.textShadow = '0 0 8px #ff4500';
            this.loadingHeader.style.animation = 'loaderTitleGlow 2s ease-in-out infinite alternate';
            this.loadingHeader.style.zIndex = '2';
            this.loadingScreen.appendChild(this.loadingHeader);
        }

        // LOADING text (big)
        this.loadingText = document.createElement('div');
        this.loadingText.textContent = 'LOADING';
        this.loadingText.style.marginBottom = '12px';
        this.loadingText.style.fontSize = '32px';
        this.loadingText.style.fontWeight = '800';
        this.loadingText.style.letterSpacing = '3px';
        this.loadingText.style.color = '#ff6347';
        this.loadingText.style.textShadow = '0 0 10px rgba(255,69,0,0.9)';
        this.loadingText.style.zIndex = '2';
        this.loadingScreen.appendChild(this.loadingText);

        // percentage text
        this.loadingPercentage = document.createElement('div');
        this.loadingPercentage.textContent = '0%';
        this.loadingPercentage.style.fontSize = '20px';
        this.loadingPercentage.style.marginBottom = '8px';
        this.loadingPercentage.style.fontWeight = '700';
        this.loadingPercentage.style.color = '#fff';
        this.loadingPercentage.style.textShadow = '0 0 6px rgba(255,69,0,0.5)';
        this.loadingPercentage.style.zIndex = '2';
        this.loadingScreen.appendChild(this.loadingPercentage);

        // progress bar container (subtle dark container with orange border glow)
        this.progressBarContainer = document.createElement('div');
        this.progressBarContainer.style.width = '360px';
        this.progressBarContainer.style.height = '22px';
        this.progressBarContainer.style.backgroundColor = 'rgba(255,255,255,0.03)';
        this.progressBarContainer.style.borderRadius = '14px';
        this.progressBarContainer.style.marginTop = '18px';
        this.progressBarContainer.style.overflow = 'hidden';
        this.progressBarContainer.style.border = '3px solid rgba(255,69,0,0.12)';
        this.progressBarContainer.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';
        this.progressBarContainer.style.backdropFilter = 'blur(4px)';
        this.progressBarContainer.style.position = 'relative';
        this.progressBarContainer.classList.add('progress-shimmer');
        this.progressBarContainer.style.zIndex = '2';

        // inner progress bar (red gradient matching buttons)
        this.progressBar = document.createElement('div');
        this.progressBar.style.width = '0%';
        this.progressBar.style.height = '100%';
        this.progressBar.style.background = 'linear-gradient(145deg, #ff0000, #8b0000)';
        this.progressBar.style.transition = 'width 0.25s ease';
        this.progressBar.style.borderRadius = '12px';
        this.progressBar.style.boxShadow = 'inset 0 -4px 12px rgba(0,0,0,0.4)';
        this.progressBar.style.zIndex = '2';

        // small glowing overlay to emphasize motion (follows width)
        this.progressGlow = document.createElement('div');
        this.progressGlow.style.position = 'absolute';
        this.progressGlow.style.top = '0';
        this.progressGlow.style.left = '0';
        this.progressGlow.style.height = '100%';
        this.progressGlow.style.width = '0%';
        this.progressGlow.style.borderRadius = '12px';
        this.progressGlow.style.pointerEvents = 'none';
        this.progressGlow.style.boxShadow = '0 8px 20px rgba(255,69,0,0.6)';
        this.progressGlow.style.transition = 'width 0.25s ease';
        this.progressGlow.style.zIndex = '1';

        this.progressBarContainer.appendChild(this.progressBar);
        this.progressBarContainer.appendChild(this.progressGlow);

        // optional small helper text
        this.hintText = document.createElement('div');
        this.hintText.textContent = 'Tip: press M to pause';
        this.hintText.style.marginTop = '14px';
        this.hintText.style.fontSize = '14px';
        this.hintText.style.color = 'rgba(255,255,255,0.9)';
        this.hintText.style.textShadow = '0 0 5px rgba(255,69,0,0.25)';
        this.hintText.style.fontWeight = '600';
        this.hintText.style.zIndex = '2';

        // append all elements to screen (web canvas will be appended separately and sit behind them)
        this.loadingScreen.appendChild(this.progressBarContainer);
        this.loadingScreen.appendChild(this.hintText);
    }

    // ---------- Spider-Web Canvas Setup (replaces ember canvas) ----------
    setupWebCanvas() {
        // create canvas and place it inside loadingScreen (behind UI elements)
        this.webCanvas = document.createElement('canvas');
        this.webCanvas.style.position = 'absolute';
        this.webCanvas.style.top = '0';
        this.webCanvas.style.left = '0';
        this.webCanvas.style.width = '100%';
        this.webCanvas.style.height = '100%';
        this.webCanvas.style.pointerEvents = 'none';
        // web canvas behind UI children; UI elements set to zIndex '2' above
        this.webCanvas.style.zIndex = '0';
        this.loadingScreen.insertBefore(this.webCanvas, this.loadingScreen.firstChild);

        const ctx = this.webCanvas.getContext('2d');
        const DPR = window.devicePixelRatio || 1;

        const resizeWebCanvas = () => {
            this.webCanvas.width = Math.max(1, Math.round(window.innerWidth * DPR));
            this.webCanvas.height = Math.max(1, Math.round(window.innerHeight * DPR));
            this.webCanvas.style.width = `${window.innerWidth}px`;
            this.webCanvas.style.height = `${window.innerHeight}px`;
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        };
        resizeWebCanvas();

        // keep reference for cleanup
        this._resizeWebHandler = resizeWebCanvas;
        window.addEventListener('resize', resizeWebCanvas);

        // web array & parameters
        this._webs = [];
        const MAX_WEBS = 12;           // control performance
        const SPAWN_PROB = 0.25;       // chance to spawn per frame when under max

        function createWeb() {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight * 0.8; // prefer upper area
            const scale = 0.6 + Math.random() * 1.4; // overall size multiplier
            const rings = 4 + Math.floor(Math.random() * 3); // concentric rings
            const spokes = 8 + Math.floor(Math.random() * 6); // radial spokes
            const rotation = Math.random() * Math.PI * 2;
            const rotationSpeed = (Math.random() - 0.5) * 0.2 * (Math.random() < 0.5 ? 1 : 0.5); // slow rotate
            const driftX = (Math.random() - 0.5) * 8;    // slow lateral drift px/sec
            const driftY = -5 - Math.random() * 10;     // slow upward drift px/sec (negative = up)
            const life = 8 + Math.random() * 12;        // seconds
            const hueShift = -10 + Math.random() * 20; // slight color variation
            const lineWidth = 1 + Math.random() * 1.2;
            return { x, y, scale, rings, spokes, rotation, rotationSpeed, driftX, driftY, life, age: 0, hueShift, lineWidth };
        }

        let lastTime = performance.now();

        const webLoop = (t) => {
            const dt = Math.min(0.05, (t - lastTime) / 1000); // seconds (cap)
            lastTime = t;

            // spawn new webs occasionally
            if (this._webs.length < MAX_WEBS && Math.random() < SPAWN_PROB) {
                this._webs.push(createWeb());
            }

            // clear canvas, keep subtle background darkness (transparent)
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            // draw each web
            for (let i = this._webs.length - 1; i >= 0; i--) {
                const w = this._webs[i];
                w.age += dt;
                if (w.age >= w.life) {
                    this._webs.splice(i, 1);
                    continue;
                }

                // update motion & rotation
                w.x += w.driftX * dt;
                w.y += w.driftY * dt;
                w.rotation += w.rotationSpeed * dt;

                // fade in/out
                const tNorm = w.age / w.life;
                const alpha = Math.max(0, Math.sin(Math.min(1, tNorm) * Math.PI)); // fades in then out (sin curve)
                const sizeBase = 60 * w.scale; // base radius for rings

                // subtle scale pulsation
                const pulse = 1 + 0.03 * Math.sin(w.age * 3.0);

                ctx.save();
                ctx.translate(w.x, w.y);
                ctx.rotate(w.rotation);
                ctx.scale(pulse, pulse);

                // set web stroke style: pale with warm rim glow to fit theme
                // main thread color (very pale), rim glow uses shadow
                const mainColor = `rgba(245,245,250,${0.95 * alpha * 0.9})`; // near-white
                const rimColor = `rgba(255,140,70,${0.9 * alpha * 0.35})`;    // warm orange rim
                ctx.lineWidth = w.lineWidth;
                ctx.lineCap = 'round';

                // glow
                ctx.shadowBlur = 8 * alpha;
                ctx.shadowColor = rimColor;

                // draw radial spokes
                for (let s = 0; s < w.spokes; s++) {
                    const angle = (s / w.spokes) * Math.PI * 2;
                    const rx = Math.cos(angle) * sizeBase;
                    const ry = Math.sin(angle) * sizeBase;

                    // slight irregularity: shorten or lengthen spoke a bit
                    const jitter = 0.85 + Math.random() * 0.3;
                    ctx.beginPath();
                    ctx.strokeStyle = mainColor;
                    ctx.moveTo(0, 0);
                    ctx.lineTo(rx * jitter, ry * jitter);
                    ctx.stroke();
                }

                // draw concentric rings (approx with arcs, leaving small gaps for a handmade look)
                for (let r = 1; r <= w.rings; r++) {
                    const radius = (r / (w.rings + 1)) * sizeBase;
                    ctx.beginPath();
                    // draw ring in several arc segments to create irregularity + holes
                    const segments = 8;
                    for (let seg = 0; seg < segments; seg++) {
                        const start = (seg / segments) * Math.PI * 2 + (Math.random() * 0.04 - 0.02);
                        const end = ((seg + 1) / segments) * Math.PI * 2 - (Math.random() * 0.04 - 0.02);
                        ctx.moveTo(Math.cos(start) * radius, Math.sin(start) * radius);
                        ctx.arc(0, 0, radius, start, end);
                    }
                    ctx.strokeStyle = mainColor;
                    ctx.stroke();
                }

                // subtle inner knots (small dots at intersection points) to make it read as web
                const knotAlpha = 0.9 * alpha * 0.9;
                ctx.fillStyle = `rgba(255,240,220,${knotAlpha * 0.9})`;
                const knotCount = Math.min(12, Math.floor(w.spokes * Math.min(6, w.rings)));
                for (let ks = 0; ks < knotCount; ks++) {
                    const spokeIndex = Math.floor((ks / knotCount) * w.spokes);
                    const ringIndex = 1 + (ks % w.rings);
                    const angle = (spokeIndex / w.spokes) * Math.PI * 2;
                    const radius = (ringIndex / (w.rings + 1)) * sizeBase;
                    const kx = Math.cos(angle) * radius;
                    const ky = Math.sin(angle) * radius;
                    ctx.beginPath();
                    ctx.arc(kx, ky, 1.2 * (1 + (w.lineWidth * 0.3)), 0, Math.PI * 2);
                    ctx.fill();
                }

                // subtle rim overlay to make it "glow" orange at edges
                ctx.shadowBlur = 0;
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = rimColor;
                ctx.lineWidth = Math.max(0.8, w.lineWidth * 0.6) * alpha;
                ctx.beginPath();
                ctx.arc(0, 0, sizeBase * 1.02, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalCompositeOperation = 'source-over';

                ctx.restore();
            }

            this._webAnimFrame = requestAnimationFrame(webLoop);
        };

        // start loop
        this._webAnimFrame = requestAnimationFrame(webLoop);

        // cleanup function used in hide/remove
        this._cleanupWebs = () => {
            if (this._webAnimFrame) {
                cancelAnimationFrame(this._webAnimFrame);
                this._webAnimFrame = null;
            }
            if (this._resizeWebHandler) {
                window.removeEventListener('resize', this._resizeWebHandler);
                this._resizeWebHandler = null;
            }
            if (this.webCanvas && this.webCanvas.parentNode) {
                this.webCanvas.parentNode.removeChild(this.webCanvas);
            }
        };
    }
    // ---------- End Spider-Web Canvas Setup ----------

    setupBlurEffect() {
        this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

        this.horizontalBlurTexture = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat
            }
        );

        this.currentFrameTexture = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat
            }
        );

        this.previousFrameTexture = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat
            }
        );

        this.interpolationProgress = 0;
        this.interpolationFrames = this.sampleInterval;
        this.hasPreviousFrame = false;
        this.lastCaptureFrame = 0;

        // need separate passes
        const horizontalBlurMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                blurAmount: { value: 10.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float blurAmount;
                uniform vec2 resolution;
                varying vec2 vUv;

                const float weights[9] = float[](
                    0.01621622, 0.05405405, 0.12162162,
                    0.19459459, 0.22702703,
                    0.19459459, 0.12162162, 0.05405405, 0.01621622
                );

                void main() {
                    vec4 color = vec4(0.0);
                    vec2 pixelSize = vec2(1.0) / resolution;

                    for (int i = -4; i <= 4; i++) {
                        float weight = weights[i + 4];
                        vec2 offset = vec2(float(i) * pixelSize.x * blurAmount, 0.0);
                        color += texture2D(tDiffuse, vUv + offset) * weight;
                    }

                    gl_FragColor = color;
                }
            `
        });

        const verticalBlurMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                blurAmount: { value: 10.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float blurAmount;
                uniform vec2 resolution;
                varying vec2 vUv;

                const float weights[9] = float[](
                    0.01621622, 0.05405405, 0.12162162,
                    0.19459459, 0.22702703,
                    0.19459459, 0.12162162, 0.05405405, 0.01621622
                );

                void main() {
                    vec4 color = vec4(0.0);
                    vec2 pixelSize = vec2(1.0) / resolution;

                    for (int i = -4; i <= 4; i++) {
                        float weight = weights[i + 4];
                        vec2 offset = vec2(0.0, float(i) * pixelSize.y * blurAmount);
                        color += texture2D(tDiffuse, vUv + offset) * weight;
                    }

                    gl_FragColor = color;
                }
            `
        });

        const compositeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tCurrentFrame: { value: this.currentFrameTexture.texture },
                tPreviousFrame: { value: this.previousFrameTexture.texture },
                interpolationProgress: { value: 0 },
                hasPreviousFrame: { value: 0 },
                quantizationLevels: { value: 16.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tCurrentFrame;
                uniform sampler2D tPreviousFrame;
                uniform float interpolationProgress;
                uniform int hasPreviousFrame;
                uniform float quantizationLevels;
                varying vec2 vUv;

                vec3 quantizeWithDither(vec3 color, float levels, vec2 uv) {
                    float bayerMatrix[16] = float[](
                        0.0,  8.0,  2.0,  10.0,
                        12.0, 4.0,  14.0, 6.0,
                        3.0,  11.0, 1.0,  9.0,
                        15.0, 7.0,  13.0, 5.0
                    );

                    vec2 pixelPos = floor(mod(uv * 800.0, 4.0)); // Scale for screen size
                    int index = int(pixelPos.x + pixelPos.y * 4.0);
                    float dither = bayerMatrix[index] / 16.0 - 0.5;

                    vec3 quantized = floor(color * levels + dither / levels) / levels;
                    return clamp(quantized, 0.0, 1.0);
                }

                void main() {
                    vec4 current = texture2D(tCurrentFrame, vUv);
                    vec4 finalColor;

                    if (hasPreviousFrame == 1) {
                        vec4 previous = texture2D(tPreviousFrame, vUv);
                        finalColor = mix(previous, current, interpolationProgress);
                    } else {
                        finalColor = current;
                    }

                    vec3 quantizedColor = quantizeWithDither(finalColor.rgb, quantizationLevels, vUv);

                    gl_FragColor = vec4(quantizedColor, finalColor.a);
                }
            `
        });

        this.horizontalBlurScene = new THREE.Scene();
        this.verticalBlurScene = new THREE.Scene();
        this.blurScene = new THREE.Scene();

        this.blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        this.horizontalBlurQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), horizontalBlurMaterial);
        this.verticalBlurQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), verticalBlurMaterial);
        this.compositeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compositeMaterial);

        this.horizontalBlurScene.add(this.horizontalBlurQuad);
        this.verticalBlurScene.add(this.verticalBlurQuad);
        this.blurScene.add(this.compositeQuad);
    }

    render() {
        if (!this.isLoading) return;

        this.frameCounter++;

        const originalBackground = this.scene.background;

        this.scene.background = null;
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);
        this.scene.background = originalBackground;

        this.horizontalBlurQuad.material.uniforms.tDiffuse.value = this.renderTarget.texture;
        this.renderer.setRenderTarget(this.horizontalBlurTexture);
        this.renderer.render(this.horizontalBlurScene, this.blurCamera);
        this.renderer.setRenderTarget(null);

        this.verticalBlurQuad.material.uniforms.tDiffuse.value = this.horizontalBlurTexture.texture;
        this.renderer.setRenderTarget(this.currentFrameTexture);
        this.renderer.render(this.verticalBlurScene, this.blurCamera);
        this.renderer.setRenderTarget(null);

        if (this.hasPreviousFrame) {
            this.interpolationProgress = Math.min(1.0, this.interpolationProgress + (1.0 / this.interpolationFrames));

            const framesSinceLastCapture = this.frameCounter - this.lastCaptureFrame;
            if (framesSinceLastCapture >= this.sampleInterval && this.interpolationProgress >= 0.5) {
                this.capturePreviousFrame();
                this.interpolationProgress = 0;
                this.lastCaptureFrame = this.frameCounter;
            }

            if (this.interpolationProgress >= 1.0) {
                this.interpolationProgress = 1.0;
            }
        } else {
            if (this.frameCounter % this.sampleInterval === 0) {
                this.capturePreviousFrame();
                this.interpolationProgress = 0;
                this.lastCaptureFrame = this.frameCounter;
            }
        }

        this.compositeQuad.material.uniforms.tCurrentFrame.value = this.currentFrameTexture.texture;
        this.compositeQuad.material.uniforms.tPreviousFrame.value = this.previousFrameTexture.texture;
        this.compositeQuad.material.uniforms.interpolationProgress.value = this.interpolationProgress;
        this.compositeQuad.material.uniforms.hasPreviousFrame.value = this.hasPreviousFrame ? 1 : 0;

        this.renderer.render(this.blurScene, this.blurCamera);
    }

    copyToTexture(sourceTexture, targetTexture) {
        const tempScene = new THREE.Scene();
        const tempCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const tempQuad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshBasicMaterial({ map: sourceTexture })
        );
        tempScene.add(tempQuad);

        this.renderer.setRenderTarget(targetTexture);
        this.renderer.render(tempScene, tempCamera);
        this.renderer.setRenderTarget(null);

        tempQuad.material.dispose();
        tempQuad.geometry.dispose();
    }

    capturePreviousFrame() {
        this.copyToTexture(this.currentFrameTexture.texture, this.previousFrameTexture);
        this.hasPreviousFrame = true;
        this.interpolationProgress = 0;
    }

    onResize() {
        if (this.renderTarget) {
            this.renderTarget.setSize(window.innerWidth, window.innerHeight);
            this.horizontalBlurTexture.setSize(window.innerWidth, window.innerHeight);
            this.currentFrameTexture.setSize(window.innerWidth, window.innerHeight);
            this.previousFrameTexture.setSize(window.innerWidth, window.innerHeight);

            if (this.horizontalBlurQuad && this.horizontalBlurQuad.material) {
                this.horizontalBlurQuad.material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
            }
            if (this.verticalBlurQuad && this.verticalBlurQuad.material) {
                this.verticalBlurQuad.material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
            }
        }

        // if loading screen exists, keep it full-screen and responsive
        if (this.loadingScreen) {
            this.loadingScreen.style.width = `${window.innerWidth}px`;
            this.loadingScreen.style.height = `${window.innerHeight}px`;
        }

        // resize web canvas as well (handler was registered in setupWebCanvas)
        if (this._resizeWebHandler) {
            this._resizeWebHandler();
        }
    }

    updateProgress(percent) {
        this.progress = Math.max(0, Math.min(100, percent));
        if (this.loadingPercentage) this.loadingPercentage.textContent = `${Math.round(this.progress)}%`;
        if (this.progressBar) this.progressBar.style.width = `${this.progress}%`;
        if (this.progressGlow) this.progressGlow.style.width = `${this.progress}%`;
    }

    setHeaderText(text) {
        this.headerText = text;
        if (this.loadingHeader) {
            this.loadingHeader.textContent = text;
        }
    }

    show() {
        this.isLoading = true;
        this.progress = 0;
        this.frameCounter = 0;
        this.hasPreviousFrame = false;
        this.interpolationProgress = 0;
        this.lastCaptureFrame = 0;

        document.body.appendChild(this.loadingScreen);
        this.updateProgress(0);
    }

    // redundant below factors for hide/remove, need to refactor
    hide() {
        if (this.loadingScreen && this.loadingScreen.parentNode) {
            this.loadingScreen.parentNode.removeChild(this.loadingScreen);
        }
        this.isLoading = false;

        // cleanup web canvas & listeners
        if (this._cleanupWebs) {
            try { this._cleanupWebs(); } catch (e) { /* ignore cleanup errors */ }
            this._cleanupWebs = null;
        }
    }

    remove() {
        // ensure same cleanup is performed
        this.hide();
    }
}
