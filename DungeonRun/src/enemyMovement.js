// enemyMovement.js
import * as THREE from 'three';

export class EnemyMovement {
    constructor(scene, player, startPosition = new THREE.Vector3(0, 1, 0)) {
        this.raycaster = new THREE.Raycaster();
        this.scene = scene;
        this.enemyCube = null;
        this.spotLight = null; // our "torch light"
        this.player = player; // Directly pass the player model
        this.lag = 0.05; // Enemy speed

        // enemy starting position
        this.startPosition = startPosition;

        this.initCubes();
        this.initSpotlight();
    }

    initCubes() {
        // Enemy cube
        this.enemyCube = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.5),
            new THREE.MeshPhongMaterial({ color: 0xff69b4 })
        );
        this.enemyCube.position.copy(this.startPosition);
        this.scene.add(this.enemyCube);

        if (!this.player) {
            console.warn('Player object not provided to EnemyMovement!');
        }
    }

    initSpotlight() {
        // Create a spotlight to act as a torch/flashlight
        this.spotLight = new THREE.SpotLight(0xffaa00, 2, 20, Math.PI / 6, 0.3, 1);
        this.spotLight.position.set(
            this.enemyCube.position.x,
            this.enemyCube.position.y + 2,
            this.enemyCube.position.z
        );
        this.spotLight.target.position.set(
            this.enemyCube.position.x,
            this.enemyCube.position.y,
            this.enemyCube.position.z + 1
        );

        this.scene.add(this.spotLight);
        this.scene.add(this.spotLight.target);
    }

    checkForTarget() {
        if (!this.player) return;

        // --- Direct raycast from enemy to player ---
        const rayOrigin = new THREE.Vector3(
            this.enemyCube.position.x,
            this.enemyCube.position.y + 1,
            this.enemyCube.position.z
        );
        const directionToPlayer = this.player.position.clone().sub(rayOrigin).normalize();
        this.raycaster.set(rayOrigin, directionToPlayer);

        // Exclude the enemy itself from intersection test
        const objectsToTest = this.scene.children.filter(obj => obj !== this.enemyCube);
        const intersects = this.raycaster.intersectObjects(objectsToTest, true);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            if (hit.name === 'player' || hit.parent?.name === 'player') {
                const distance = this.enemyCube.position.distanceTo(this.player.position);
                if (distance > 2) {
                    this.enemyCube.position.add(
                        directionToPlayer.clone().multiplyScalar(this.lag)
                    );
                }
            }
        } else {
            const distance = this.enemyCube.position.distanceTo(this.player.position);
            if (distance > 2) {
                this.enemyCube.position.add(
                    directionToPlayer.clone().multiplyScalar(this.lag)
                );
            }
        }

        // --- Update spotlight position & target ---
        this.spotLight.position.set(
            this.enemyCube.position.x,
            this.enemyCube.position.y + 2,
            this.enemyCube.position.z
        );
        this.spotLight.target.position.copy(this.player.position); // aim light at player
    }

    update() {
        this.checkForTarget();
    }
}
