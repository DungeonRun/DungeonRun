import * as THREE from 'three';

export class Loader {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.isLoading = false;
        this.progress = 0;
        this.frameCounter = 0;
        this.sampleInterval = 3;
        
        this.setupLoadingScreen();
        this.setupBlurEffect();
    }

    setupLoadingScreen() {
        this.loadingScreen = document.createElement('div');
        this.loadingScreen.style.position = 'fixed';
        this.loadingScreen.style.top = '0';
        this.loadingScreen.style.left = '0';
        this.loadingScreen.style.width = '100%';
        this.loadingScreen.style.height = '100%';
        this.loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.loadingScreen.style.display = 'flex';
        this.loadingScreen.style.flexDirection = 'column';
        this.loadingScreen.style.justifyContent = 'center';
        this.loadingScreen.style.alignItems = 'center';
        this.loadingScreen.style.zIndex = '1000';
        this.loadingScreen.style.color = 'white';
        this.loadingScreen.style.fontFamily = 'Arial, sans-serif';
        this.loadingScreen.style.fontSize = '24px';
        
        this.loadingText = document.createElement('div');
        this.loadingText.textContent = 'LOADING';
        this.loadingText.style.marginBottom = '20px';
        this.loadingText.style.fontSize = '32px';
        this.loadingText.style.fontWeight = 'bold';
        
        this.loadingPercentage = document.createElement('div');
        this.loadingPercentage.textContent = '0%';
        this.loadingPercentage.style.fontSize = '20px';
        
        this.progressBarContainer = document.createElement('div');
        this.progressBarContainer.style.width = '300px';
        this.progressBarContainer.style.height = '20px';
        this.progressBarContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        this.progressBarContainer.style.borderRadius = '10px';
        this.progressBarContainer.style.marginTop = '20px';
        this.progressBarContainer.style.overflow = 'hidden';
        
        this.progressBar = document.createElement('div');
        this.progressBar.style.width = '0%';
        this.progressBar.style.height = '100%';
        this.progressBar.style.backgroundColor = '#4CAF50';
        this.progressBar.style.transition = 'width 0.3s ease';
        
        this.progressBarContainer.appendChild(this.progressBar);
        this.loadingScreen.appendChild(this.loadingText);
        this.loadingScreen.appendChild(this.loadingPercentage);
        this.loadingScreen.appendChild(this.progressBarContainer);
    }

    setupBlurEffect() {
        this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.renderTargetBlur = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.blurScene = new THREE.Scene();
        this.blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        //temporal blur
        this.frameHistorySize = 5; //THIS IS A CONSTANT, fragment shader is hardcoded for 5
        this.frameTextures = [];
        this.frameWeights = [];
        
        for (let i = 0; i < this.frameHistorySize; i++) {
            const renderTarget = new THREE.WebGLRenderTarget(
                window.innerWidth, 
                window.innerHeight,
                {
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter,
                    format: THREE.RGBAFormat
                }
            );
            this.frameTextures.push(renderTarget.texture);
            this.frameWeights.push(1.0 / this.frameHistorySize); //uniform blurring
        }
        
        const samplerUniforms = {};
        const weightUniforms = {};
        for (let i = 0; i < this.frameHistorySize; i++) {
            samplerUniforms[`frameTexture${i}`] = { value: this.frameTextures[i] };
            weightUniforms[`frameWeight${i}`] = { value: this.frameWeights[i] };
        }
        
        const blurMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                frameCount: { value: this.frameHistorySize },
                blurAmount: { value: 10000.0 }, //might be set even higher
                ...samplerUniforms,
                ...weightUniforms
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
                uniform sampler2D frameTexture0;
                uniform sampler2D frameTexture1;
                uniform sampler2D frameTexture2;
                uniform sampler2D frameTexture3;
                uniform sampler2D frameTexture4;
                uniform float frameWeight0;
                uniform float frameWeight1;
                uniform float frameWeight2;
                uniform float frameWeight3;
                uniform float frameWeight4;
                uniform int frameCount;
                uniform float blurAmount;
                uniform vec2 resolution;
                varying vec2 vUv;
                
                vec4 getFrameColor(int index) {
                    if (index == 0) return texture2D(frameTexture0, vUv);
                    if (index == 1) return texture2D(frameTexture1, vUv);
                    if (index == 2) return texture2D(frameTexture2, vUv);
                    if (index == 3) return texture2D(frameTexture3, vUv);
                    if (index == 4) return texture2D(frameTexture4, vUv);
                    return vec4(0.0);
                }
                
                float getFrameWeight(int index) {
                    if (index == 0) return frameWeight0;
                    if (index == 1) return frameWeight1;
                    if (index == 2) return frameWeight2;
                    if (index == 3) return frameWeight3;
                    if (index == 4) return frameWeight4;
                    return 0.0;
                }
                
                vec4 applyStrongBlur(sampler2D tex, vec2 uv, vec2 resolution, float strength) {
                    vec4 color = vec4(0.0);
                    float total = 0.0;
                    
                    //kernel code
                    for (float x = -4.0; x <= 4.0; x++) {
                        for (float y = -4.0; y <= 4.0; y++) {
                            vec2 offset = vec2(x, y) * strength / resolution;
                            float weight = 1.0 / (1.0 + length(vec2(x, y)) * 0.5);
                            color += texture2D(tex, uv + offset) * weight;
                            total += weight;
                        }
                    }
                    
                    return color / total;
                }
                
                void main() {
                    vec4 currentColor = texture2D(tDiffuse, vUv);
                    vec4 historyColor = vec4(0.0);
                    float totalWeight = 0.0;
                    
                    //temporal blur across 5 frames
                    for(int i = 0; i < 5; i++) {
                        if(i >= frameCount) break;
                        
                        vec4 frameColor = getFrameColor(i);
                        float weight = getFrameWeight(i);
                        
                        //ignore blank before frame 0
                        if(length(frameColor.rgb) > 0.01) {
                            historyColor += frameColor * weight;
                            totalWeight += weight;
                        }
                    }
                    
                    if(totalWeight > 0.0) {
                        historyColor /= totalWeight;
                    } else {
                        historyColor = currentColor;
                    }
                    
                    //gaussian blur
                    vec2 pixelSize = 1.0 / resolution;
                    vec4 blurredResult = applyStrongBlur(tDiffuse, vUv, resolution, blurAmount);
                    
                    vec4 finalColor = mix(blurredResult, historyColor, 0.5);
                    
                    gl_FragColor = finalColor;
                }
            `
        });
        
        this.blurQuad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            blurMaterial
        );
        this.blurScene.add(this.blurQuad);
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
        
        if (this.frameCounter % this.sampleInterval === 0) {
            this.updateFrameHistory();
        }
        
        this.blurQuad.material.uniforms.tDiffuse.value = this.renderTarget.texture;
        this.renderer.render(this.blurScene, this.blurCamera);
    }

    updateFrameHistory() {
        for (let i = this.frameHistorySize - 1; i > 0; i--) {
            const temp = this.frameTextures[i];
            this.frameTextures[i] = this.frameTextures[i - 1];
            this.frameTextures[i - 1] = temp;
        }
        
        this.copyTextureToDataTexture(this.renderTarget.texture, this.frameTextures[0]);
        
        for (let i = 0; i < this.frameHistorySize; i++) {
            this.blurQuad.material.uniforms[`frameTexture${i}`].value = this.frameTextures[i];
        }
    }

    copyTextureToDataTexture(sourceTexture, targetDataTexture) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = window.innerWidth;
        tempCanvas.height = window.innerHeight;
        const ctx = tempCanvas.getContext('2d');
        
        // This is a simplified approach - in production you'd use readPixels
        // For now, we'll just mark the texture as needing update
        targetDataTexture.needsUpdate = true;
    }

    onResize() {
        if (this.renderTarget) {
            this.renderTarget.setSize(window.innerWidth, window.innerHeight);
            
            //resize frame history textures
            for (let i = 0; i < this.frameHistorySize; i++) {
                if (this.frameTextures[i]) {
                    this.frameTextures[i].dispose();
                    this.frameTextures[i] = new THREE.DataTexture(
                        new Uint8Array(window.innerWidth * window.innerHeight * 4),
                        window.innerWidth,
                        window.innerHeight,
                        THREE.RGBAFormat
                    );
                    this.frameTextures[i].needsUpdate = true;
                }
            }
            
            if (this.blurQuad && this.blurQuad.material) {
                this.blurQuad.material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
            }
        }
    }

    updateProgress(percent) {
        this.progress = Math.max(0, Math.min(100, percent));
        this.loadingPercentage.textContent = `${Math.round(this.progress)}%`;
        this.progressBar.style.width = `${this.progress}%`;
    }

    show() {
        this.isLoading = true;
        this.progress = 0;
        this.blurStrength = 10.0;
        this.frameCounter = 0;
        
        document.body.appendChild(this.loadingScreen);
        this.updateProgress(0);
    }

    //redundant below factors for hide/remove, need to refactor
    hide() {
        if (this.loadingScreen.parentNode) {
            this.loadingScreen.parentNode.removeChild(this.loadingScreen);
        }
        this.isLoading = false;
    }

    remove() {
        this.hide();
    }
}