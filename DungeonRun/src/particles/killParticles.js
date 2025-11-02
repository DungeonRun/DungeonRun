import * as THREE from 'three';

// Pooled, fixed-size particle systems to avoid allocating materials/geometry per spawn
export class KillParticleManager {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.MAX_PARTICLES = options.maxParticles || 32;
        this._pool = [];
        this.activeSystems = [];
        this._tmpVec = new THREE.Vector3();

        // shared shader material (uniforms per-instance via material.clone when needed)
        this._baseMaterial = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                uTime: { value: 0.0 },
                uLifetime: { value: 0.7 },
                uColor: { value: new THREE.Vector3(1.0, 0.5, 0.2) },
                uSize: { value: 0.60 }
            },
            vertexShader: `
                attribute vec3 aVelocity;
                attribute float aStart;
                attribute float aEnabled;
                uniform float uTime;
                uniform float uLifetime;
                uniform float uSize;
                varying float vLife;

                void main() {
                    float t = uTime - aStart;
                    float lifeNorm = clamp(t / uLifetime, 0.0, 1.0);
                    vLife = aEnabled * (1.0 - lifeNorm);
                    // decelerating motion: v * t * (1 - t/life)
                    float f = t * (1.0 - lifeNorm);
                    vec3 pos = position + aVelocity * f;
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    gl_PointSize = uSize * (1.0 + vLife * 0.5) * (300.0 / max(1.0, -mvPosition.z));
                }
            `,
            fragmentShader: `
                precision mediump float;
                uniform vec3 uColor;
                varying float vLife;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float alpha = smoothstep(0.5, 0.0, d) * vLife;
                    gl_FragColor = vec4(uColor * (0.5 + 0.5 * vLife), alpha);
                }
            `
        });

        // prepare one pooled geometry template (fixed size)
        this._templateGeometry = new THREE.BufferGeometry();
        const pos = new Float32Array(this.MAX_PARTICLES * 3);
        const vel = new Float32Array(this.MAX_PARTICLES * 3);
        const starts = new Float32Array(this.MAX_PARTICLES);
        const enabled = new Float32Array(this.MAX_PARTICLES);
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            // initialize disabled
            starts[i] = -9999.0;
            enabled[i] = 0.0;
            pos[i*3+0] = 0; pos[i*3+1] = 0; pos[i*3+2] = 0;
            vel[i*3+0] = 0; vel[i*3+1] = 0; vel[i*3+2] = 0;
        }
        this._templateGeometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this._templateGeometry.setAttribute('aVelocity', new THREE.BufferAttribute(vel, 3));
        this._templateGeometry.setAttribute('aStart', new THREE.BufferAttribute(starts, 1));
        this._templateGeometry.setAttribute('aEnabled', new THREE.BufferAttribute(enabled, 1));
    }

    _createSystem() {
        // clone geometry attributes arrays per system to allow independent updates
        const geom = new THREE.BufferGeometry();
        const basePos = this._templateGeometry.getAttribute('position').array.slice(0);
        const baseVel = this._templateGeometry.getAttribute('aVelocity').array.slice(0);
        const baseStart = this._templateGeometry.getAttribute('aStart').array.slice(0);
        const baseEnabled = this._templateGeometry.getAttribute('aEnabled').array.slice(0);

        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(basePos), 3));
        geom.setAttribute('aVelocity', new THREE.BufferAttribute(new Float32Array(baseVel), 3));
        geom.setAttribute('aStart', new THREE.BufferAttribute(new Float32Array(baseStart), 1));
        geom.setAttribute('aEnabled', new THREE.BufferAttribute(new Float32Array(baseEnabled), 1));

        const material = this._baseMaterial.clone();
        const points = new THREE.Points(geom, material);
        points.userData._activeCount = 0;
        points.userData._lifetime = material.uniforms.uLifetime.value;
        points.userData._startTime = 0;
        points.visible = false;
        return points;
    }

    spawn(position, options = {}) {
        const now = performance.now() / 1000.0;
    const count = Math.min(options.count || 18, this.MAX_PARTICLES);
    // death particles: default longer lifetime, red color, spawn slightly above hit position
    const lifetime = options.lifetime || 0.6;
    const size = options.size || 0.18;
    const color = options.color || new THREE.Color(1.0, 0.0, 0.0);
    const offsetY = typeof options.offsetY === 'number' ? options.offsetY : 0.9;
    const upwardSpread = typeof options.upwardSpread === 'number' ? options.upwardSpread : 1.6;

        let sys = null;
        if (this._pool.length > 0) sys = this._pool.pop();
        else sys = this._createSystem();

        const geom = sys.geometry;
        const posAttr = geom.getAttribute('position');
        const velAttr = geom.getAttribute('aVelocity');
        const startAttr = geom.getAttribute('aStart');
        const enabledAttr = geom.getAttribute('aEnabled');

        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            if (i < count) {
                // spawn slightly above the given position so particles appear from chest/torso
                posAttr.array[i*3+0] = position.x;
                posAttr.array[i*3+1] = position.y + offsetY;
                posAttr.array[i*3+2] = position.z;
                // bias velocities upwards for a higher spread
                const rx = (Math.random() - 0.5) * 2;
                const rz = (Math.random() - 0.5) * 2;
                const ry = (Math.random() * 0.8 + 0.6) * upwardSpread; // stronger upward component
                const dir = new THREE.Vector3(rx, ry, rz).normalize();
                const speed = 3.0 * (0.6 + Math.random() * 0.8);
                velAttr.array[i*3+0] = dir.x * speed;
                velAttr.array[i*3+1] = dir.y * speed;
                velAttr.array[i*3+2] = dir.z * speed;
                startAttr.array[i] = now;
                enabledAttr.array[i] = 1.0;
            } else {
                // deactivate remainder
                enabledAttr.array[i] = 0.0;
                startAttr.array[i] = now - (lifetime + 10.0);
            }
        }

        posAttr.needsUpdate = true;
        velAttr.needsUpdate = true;
        startAttr.needsUpdate = true;
        enabledAttr.needsUpdate = true;

        sys.material.uniforms.uTime.value = now;
        sys.material.uniforms.uLifetime.value = lifetime;
        sys.material.uniforms.uSize.value = size;
        sys.material.uniforms.uColor.value.set(color.r, color.g, color.b);

        sys.userData._activeCount = count;
        sys.userData._lifetime = lifetime;
        sys.userData._startTime = now;

        if (!sys.parent) this.scene.add(sys);
        sys.visible = true;
        this.activeSystems.push(sys);
        return sys;
    }

    update(delta) {
        const now = performance.now() / 1000.0;
        for (let i = this.activeSystems.length - 1; i >= 0; --i) {
            const sys = this.activeSystems[i];
            sys.material.uniforms.uTime.value = now;
            const age = now - sys.userData._startTime;
            if (age >= sys.userData._lifetime) {
                // recycle
                try { sys.visible = false; } catch (e) {}
                this.activeSystems.splice(i, 1);
                this._pool.push(sys);
            }
        }
    }
}

export default KillParticleManager;
