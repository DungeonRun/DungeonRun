import * as THREE from 'three';

export class ProjectileManager {
    constructor(scene, enemies) {
        this.scene = scene;
        this.enemies = enemies;
        this.projectiles = [];
        this.debugHelpers = [];
        //this.debugModeRef = debugModeRef; 
    }

    fireSpell(origin, direction) {
        const geometry = new THREE.SphereGeometry(0.5, 20, 20);
        const material = new THREE.ShaderMaterial({
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
        const spell = new THREE.Mesh(geometry, material);
        spell.position.copy(origin);
        spell.userData = {
            direction: direction.clone(),
            speed: 8,
            created: performance.now()
        };
        const light = new THREE.PointLight(0xaa00ff, 1, 5);
        spell.add(light);
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

        this.projectiles = this.projectiles.filter(spell => {
            spell.material.uniforms.time.value = performance.now() / 1000;
            spell.position.add(spell.userData.direction.clone().multiplyScalar(spell.userData.speed * delta));
            if (performance.now() - spell.userData.created > 5000) {
                this.scene.remove(spell);
                return false;
            }

            for (const enemy of this.enemies) {
                if (!enemy.model) continue;
                const spellBox = new THREE.Box3().setFromObject(spell);
                const enemyBox = new THREE.Box3().setFromObject(enemy.model);
                if (spellBox.intersectsBox(enemyBox)) {
                    enemy.health = Math.max(0, enemy.health - 40);
                    if (enemy.healthBar) enemy.healthBar.setHealth(enemy.health);
                    this.scene.remove(spell);
                    return false;
                }
            }
            //debug mode only
            /*
            if (this.debugModeRef && this.debugModeRef.value) {
                const box = new THREE.Box3().setFromObject(spell);
                const helper = new THREE.Box3Helper(box, 0xaa00ff);
                this.scene.add(helper);
                this.debugHelpers.push({ mesh: spell, helper });
            }
            */
            return true;
            
        });
    }
}