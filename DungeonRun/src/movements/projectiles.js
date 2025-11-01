import * as THREE from 'three';

export class ProjectileManager {
    constructor(scene, enemies) {
        this.scene = scene;
        this.enemies = enemies;
        this.projectiles = [];
        this.debugHelpers = [];
        //this.debugModeRef = debugModeRef;
        // pooling to avoid repeated geometry/material allocation
        this._pool = [];
        this._sharedGeometry = new THREE.SphereGeometry(0.5, 20, 20);
        this._sharedMaterial = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0.0 } },
            vertexShader: `
                uniform float time;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    vNormal = normal;
                    float shimmer = sin(time * 8.0 + position.x * 10.0 + position.y * 15.0 + position.z * 12.0);
                    float shimmerStrength = 0.04; 
                    vec3 displacedPosition = position + normal * shimmer * shimmerStrength;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec3 vNormal;
                void main() {
                    float colorSpeed1 = time * 1.5;
                    float colorSpeed2 = time * 2.0;
                    float colorSpeed3 = time * 2.5;
                    
                    //base pink-purple
                    vec3 baseColor;
                    baseColor.r = 0.8 + 0.3 * sin(colorSpeed1);
                    baseColor.g = 0.1 + 0.1 * sin(colorSpeed2 + 1.0);
                    baseColor.b = 0.7 + 0.4 * sin(colorSpeed3 + 2.0);
                    
                    // Intense, oscillating glow with multiple frequencies
                    float glow1 = 0.5 + 0.5 * sin(time * 4.0 + length(vNormal));
                    float glow2 = 0.5 + 0.5 * sin(time * 6.0 + length(vNormal) * 2.0);
                    float glow3 = 0.5 + 0.5 * sin(time * 8.0 + length(vNormal) * 3.0);
                    float combinedGlow = (glow1 + glow2 + glow3) / 3.0;
                    float intenseGlow = 1.0 + 7.0 * combinedGlow; // Much brighter glow
                    vec3 finalColor = baseColor * intenseGlow;
                    finalColor = clamp(finalColor, 0.0, 1.5); //clamp
                    
                    gl_FragColor = vec4(finalColor, 0.9);
                }
            `,
            transparent: true
        });
    }

    fireSpell(origin, direction) {
        let spell = null;
        if (this._pool.length > 0) {
            spell = this._pool.pop();
        } else {
            spell = new THREE.Mesh(this._sharedGeometry, this._sharedMaterial);
        }
        spell.position.copy(origin);
        spell.userData = {
            direction: direction.clone(),
            speed: 8,
            created: performance.now(),
            // track which enemies this spell has already hit to allow multi-hit behavior
            hitSet: new Set()
        };
        // avoid per-spell dynamic lights (expensive); if needed add cheap emissive material
        this.scene.add(spell);
        this.projectiles.push(spell);

        //debug mode
        /*
        if (this.debugModeRef && this.debugModeRef.value) {
            const box = new THREE.Box3().setFromObject(spell);
            const helper = new THREE.Box3Helper(box, 0xaa00ff);
            this.scene.add(helper);
            this.debugHelpers.push({ mesh: spell, helper });
        }
        */
    }

    update(delta) {
        //clear out old things
        this.debugHelpers.forEach(({ helper }) => this.scene.remove(helper));
        this.debugHelpers = [];

        // temp vector reused to avoid allocation in loop
        const tmp = ProjectileManager._tmpVec || (ProjectileManager._tmpVec = new THREE.Vector3());

        const now = performance.now();
        const keep = [];
        for (let i = 0; i < this.projectiles.length; ++i) {
            const spell = this.projectiles[i];
            // update shader time uniform
            if (spell.material && spell.material.uniforms && spell.material.uniforms.time) spell.material.uniforms.time.value = now / 1000;

            tmp.copy(spell.userData.direction).multiplyScalar(spell.userData.speed * delta);
            spell.position.add(tmp);

            if (now - spell.userData.created > 5000) {
                this.scene.remove(spell);
                this._pool.push(spell);
                continue;
            }

            // fast distance-based collision using cached enemy radius (avoid expensive setFromObject)
            const spellPos = spell.position;
            const spellRadius = 0.5; // matches geometry
            let collided = false;
            // temp containers to avoid allocations per-enemy
            const tmpBox = ProjectileManager._tmpBox || (ProjectileManager._tmpBox = new THREE.Box3());
            const tmpCenter = ProjectileManager._tmpCenter || (ProjectileManager._tmpCenter = new THREE.Vector3());
            for (let j = 0; j < this.enemies.length; ++j) {
                const enemy = this.enemies[j];
                if (!enemy || !enemy.enemyModel) continue;
                // compute enemy's visual hitbox center (not rely on model origin)
                try {
                    tmpBox.setFromObject(enemy.enemyModel);
                    tmpBox.getCenter(tmpCenter);
                } catch (e) {
                    // fallback to model position
                    tmpCenter.copy(enemy.enemyModel.position);
                }
                const enemyRadius = (enemy.enemyModel.userData && enemy.enemyModel.userData.radius) ? enemy.enemyModel.userData.radius : 1.0;
                const r = spellRadius + enemyRadius;
                const d2 = spellPos.distanceToSquared(tmpCenter);
                if (d2 <= r * r) {
                    // allow a spell to hit multiple enemies but only once per enemy
                    if (!spell.userData.hitSet.has(enemy)) {
                        spell.userData.hitSet.add(enemy);
                        enemy.health = Math.max(0, enemy.health - 40);
                        if (enemy.healthBar) enemy.healthBar.setHealth(enemy.health);
                    }
                    // do not consume the spell; let it continue until lifetime expires (multi-hit)
                    collided = false; // do not remove the spell
                }
            }
            if (!collided) keep.push(spell);
        }
        this.projectiles = keep;
    }
}