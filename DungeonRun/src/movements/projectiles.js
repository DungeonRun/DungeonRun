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
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0.0 } },
            vertexShader: `varying vec3 vNormal; void main() { vNormal = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
            fragmentShader: `
                uniform float time;
                varying vec3 vNormal;
                void main() {
                    float glow = 0.5 + 0.5 * sin(time + length(vNormal));
                    gl_FragColor = vec4(0.7, 0.2 + 0.3*glow, 1.0, 1.0);
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

    update(clock) {
        //clear out old things
        this.debugHelpers.forEach(({ helper }) => this.scene.remove(helper));
        this.debugHelpers = [];

        this.projectiles = this.projectiles.filter(spell => {
            spell.material.uniforms.time.value = performance.now() / 1000;
            spell.position.add(spell.userData.direction.clone().multiplyScalar(spell.userData.speed * clock.getDelta()));
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