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
        this.headerText = headerText
        
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

        if (this.headerText) {
            this.loadingHeader = document.createElement('div');
            this.loadingHeader.textContent = this.headerText;
            this.loadingHeader.style.marginBottom = '20px';
            this.loadingHeader.style.fontSize = '36px';
            this.loadingHeader.style.fontWeight = 'bold';
            this.loadingHeader.style.textTransform = 'uppercase';
            this.loadingHeader.style.letterSpacing = '2px';
            this.loadingScreen.appendChild(this.loadingHeader);
        }
        
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
        
        //need separate passes

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
                    
                    //done with dither pattern
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
    }

    updateProgress(percent) {
        this.progress = Math.max(0, Math.min(100, percent));
        this.loadingPercentage.textContent = `${Math.round(this.progress)}%`;
        this.progressBar.style.width = `${this.progress}%`;
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