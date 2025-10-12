import * as THREE from 'three';

export class Loader {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.isLoading = false;
        this.progress = 0;
        this.frameCounter = 0;
        this.sampleInterval = 100;
        this.lastCaptureFrame = 0;
        
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
        this.loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
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
        
        const blurMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tCurrentFrame: { value: this.currentFrameTexture.texture },
                tPreviousFrame: { value: this.previousFrameTexture.texture },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                interpolationProgress: { value: 0 },
                hasPreviousFrame: { value: 0 },
                blurAmount: { value: 6 }
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
                uniform float blurAmount;
                uniform vec2 resolution;
                varying vec2 vUv;
                
                vec4 applyBlur(sampler2D tex, vec2 uv, float strength) {
                    vec4 color = vec4(0.0);
                    float total = 0.0;
                    float sigma = strength;
                    
                    for (float i = -4.0; i <= 4.0; i++) {
                        for (float j = -4.0; j <= 4.0; j++) {
                            vec2 offset = vec2(i, j) * strength / resolution;
                            float weight = exp(-(i*i + j*j) / (2.0 * sigma * sigma));
                            color += texture2D(tex, uv + offset) * weight;
                            total += weight;
                        }
                    }
                    return color / total;
                }
                
                void main() {
                    if (hasPreviousFrame == 1) {
                        vec4 previous = applyBlur(tPreviousFrame, vUv, blurAmount * (1.0 - interpolationProgress));
                        vec4 current = applyBlur(tCurrentFrame, vUv, blurAmount * interpolationProgress);
                        
                        gl_FragColor = mix(previous, current, interpolationProgress);
                    } else {
                        gl_FragColor = applyBlur(tCurrentFrame, vUv, blurAmount);
                    }
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
        
        this.copyToTexture(this.renderTarget.texture, this.currentFrameTexture);
        
        //interpolation update
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
        
        this.blurQuad.material.uniforms.tCurrentFrame.value = this.currentFrameTexture.texture;
        this.blurQuad.material.uniforms.tPreviousFrame.value = this.previousFrameTexture.texture;
        this.blurQuad.material.uniforms.interpolationProgress.value = this.interpolationProgress;
        this.blurQuad.material.uniforms.hasPreviousFrame.value = this.hasPreviousFrame ? 1 : 0;
        
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
            this.currentFrameTexture.setSize(window.innerWidth, window.innerHeight);
            this.previousFrameTexture.setSize(window.innerWidth, window.innerHeight);
            
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
        this.frameCounter = 0;
        this.hasPreviousFrame = false;
        this.interpolationProgress = 0;
        this.lastCaptureFrame = 0;
        
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