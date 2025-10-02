// enemyMovement.js
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class EnemyMovement {
    constructor(scene, player, startPosition = new THREE.Vector3(0, 1, 0)) {
        this.raycaster = new THREE.Raycaster();
        this.scene = scene;
        this.enemyModel = null;   // Mutant FBX instead of cube
        this.spotLight = null;    // Torch light
        this.player = player;
        this.lag = 0.05;          // Speed
        this.startPosition = startPosition;

        this.mixer = null; // For FBX animations

        this.loadMutant();
    }

    loadMutant() {
        const loader = new FBXLoader();
        loader.load(
            '/src/models/Mutant/mutant.fbx',
            (fbx) => {
                fbx.scale.set(0.01, 0.01, 0.01); // Mutants are usually huge, shrink down
                fbx.position.copy(this.startPosition);
                fbx.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.enemyModel = fbx;
                this.scene.add(this.enemyModel);

                // Animations (if the FBX has them)
                this.mixer = new THREE.AnimationMixer(fbx);
                if (fbx.animations.length > 0) {
                    const action = this.mixer.clipAction(fbx.animations[0]);
                    action.play();
                }

                this.initSpotlight();
            },
            (xhr) => console.log(`Mutant ${ (xhr.loaded / xhr.total) * 100 }% loaded`),
            (err) => console.error('Error loading Mutant:', err)
        );
    }

    initSpotlight() {
        if (!this.enemyModel) return;
        this.spotLight = new THREE.SpotLight(0xffaa00, 2, 20, Math.PI / 6, 0.3, 1);
        this.spotLight.position.set(
            this.enemyModel.position.x,
            this.enemyModel.position.y + 2,
            this.enemyModel.position.z
        );
        this.spotLight.target.position.copy(this.player.position);
        this.scene.add(this.spotLight);
        this.scene.add(this.spotLight.target);
    }

    checkForTarget() {
        if (!this.player || !this.enemyModel) return;

        const rayOrigin = new THREE.Vector3(
            this.enemyModel.position.x,
            this.enemyModel.position.y + 1,
            this.enemyModel.position.z
        );
        const directionToPlayer = this.player.position.clone().sub(rayOrigin).normalize();
        this.raycaster.set(rayOrigin, directionToPlayer);

        const objectsToTest = this.scene.children.filter(obj => obj !== this.enemyModel);
        const intersects = this.raycaster.intersectObjects(objectsToTest, true);

        const distance = this.enemyModel.position.distanceTo(this.player.position);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            if (hit.name === 'player' || hit.parent?.name === 'player') {
                if (distance > 2) {
                    this.enemyModel.position.add(directionToPlayer.clone().multiplyScalar(this.lag));
                }
            }
        } else {
            if (distance > 2) {
                this.enemyModel.position.add(directionToPlayer.clone().multiplyScalar(this.lag));
            }
        }

        // Update spotlight to follow mutant
        if (this.spotLight) {
            this.spotLight.position.set(
                this.enemyModel.position.x,
                this.enemyModel.position.y + 2,
                this.enemyModel.position.z
            );
            this.spotLight.target.position.copy(this.player.position);
        }
    }

    update(delta) {
        this.checkForTarget();
        if (this.mixer) this.mixer.update(delta); // keep animations running
    }
}
