import * as THREE from 'three';

export class ProjectileManager {
    constructor(scene, enemies) {
        this.scene = scene;
        this.enemies = enemies;
        this.projectiles = [];
        this.debugHelpers = [];
        this._pool = [];
        this._sharedGeometry = new THREE.SphereGeometry(0.5, 20, 20);
        this._sharedMaterial = new THREE.ShaderMaterial({
            uniforms: { 
                time: { value: 0.0 },
                randomSeed: { value: Math.random() * 1000.0 } // Unique seed per projectile
            },
            vertexShader: `
                uniform float time;
                uniform float randomSeed;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    vNormal = normal;
                    vPosition = position;
                    
                    // Generate 3 different random directions using the seed
                    vec3 dir1 = normalize(vec3(
                        sin(randomSeed * 1.23),
                        cos(randomSeed * 2.34), 
                        sin(randomSeed * 3.45)
                    ));
                    
                    vec3 dir2 = normalize(vec3(
                        cos(randomSeed * 4.56),
                        sin(randomSeed * 5.67),
                        cos(randomSeed * 6.78)
                    ));
                    
                    vec3 dir3 = normalize(vec3(
                        sin(randomSeed * 7.89),
                        cos(randomSeed * 8.90),
                        sin(randomSeed * 9.01)
                    ));
                    
                    // 3 different shimmer effects with different frequencies and directions
                    float shimmer1 = sin(time * 12.0 + dot(position, dir1) * 8.0 + randomSeed);
                    float shimmer2 = cos(time * 15.0 + dot(position, dir2) * 10.0 + randomSeed * 2.0);
                    float shimmer3 = sin(time * 18.0 + dot(position, dir3) * 12.0 + randomSeed * 3.0);
                    
                    // Combine all shimmer effects for chaotic movement
                    float combinedShimmer = (shimmer1 + shimmer2 + shimmer3) / 3.0;
                    float shimmerStrength = 0.2; // Increased for more dramatic effect
                    
                    // Apply displacement in multiple directions for chaotic look
                    vec3 displacedPosition = position + 
                        dir1 * shimmer1 * shimmerStrength * 0.5 +
                        dir2 * shimmer2 * shimmerStrength * 0.7 +
                        dir3 * shimmer3 * shimmerStrength * 0.9;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float randomSeed;
                varying vec3 vNormal;
                varying vec3 vPosition;

                void main() {
                    // Chaotic color variations using the random seed
                    float colorSpeed1 = time * 2.0 + randomSeed;
                    float colorSpeed2 = time * 3.0 + randomSeed * 1.5;
                    float colorSpeed3 = time * 4.0 + randomSeed * 2.0;
                    
                    // Base pink-purple with chaotic variations
                    vec3 baseColor;
                    baseColor.r = 0.8 + 0.4 * sin(colorSpeed1 + vPosition.x * 5.0);
                    baseColor.g = 0.1 + 0.2 * sin(colorSpeed2 + vPosition.y * 6.0);
                    baseColor.b = 0.7 + 0.5 * sin(colorSpeed3 + vPosition.z * 7.0);
                    
                    // Multiple chaotic glow patterns
                    float glow1 = 0.5 + 0.5 * sin(time * 8.0 + dot(vNormal, vec3(1.0, 0.0, 0.0)) * 10.0 + randomSeed);
                    float glow2 = 0.5 + 0.5 * cos(time * 10.0 + dot(vNormal, vec3(0.0, 1.0, 0.0)) * 12.0 + randomSeed * 1.3);
                    float glow3 = 0.5 + 0.5 * sin(time * 14.0 + dot(vNormal, vec3(0.0, 0.0, 1.0)) * 14.0 + randomSeed * 1.7);
                    
                    // Combine glows chaotically
                    float combinedGlow = (glow1 * 0.4 + glow2 * 0.3 + glow3 * 0.3);
                    float intenseGlow = 1.0 + 8.0 * combinedGlow;
                    
                    // Add some high-frequency noise for extra chaos
                    float noise = sin(time * 20.0 + vPosition.x * 15.0 + vPosition.y * 18.0 + vPosition.z * 12.0 + randomSeed);
                    intenseGlow += 2.0 * noise * 0.3;
                    
                    vec3 finalColor = baseColor * intenseGlow;
                    finalColor = clamp(finalColor, 0.0, 2.0);
                    
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
                // Use cached world position and precomputed radius to avoid expensive setFromObject
                try {
                    enemy.enemyModel.getWorldPosition(tmpCenter);
                } catch (e) {
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