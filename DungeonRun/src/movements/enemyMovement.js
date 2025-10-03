// enemyMovement.js
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class EnemyMovement {
    constructor(scene, player, startPosition = new THREE.Vector3(0, 1, 0), type = "mutant", onModelLoaded) {
        this.raycaster = new THREE.Raycaster();
        this.groundRaycaster = new THREE.Raycaster();
        this.scene = scene;
        this.enemyModel = null;
        this.spotLight = null;
        this.player = player;
        this.lag = 0.05; // Movement speed
        this.startPosition = startPosition;
        this.type = type; // "mutant" or "scaryMonster"
        this.groundOffset = 0; // Will be set based on enemy type

        this.onModelLoaded = onModelLoaded; //for enemy healthbars

        this.mixer = null; // For FBX animations

        // Choose which enemy to load
        if (this.type === "mutant") {
            this.loadMutant();
        } else if (this.type === "scaryMonster") {
            this.loadScaryMonster();
        } else if (this.type === "monsterEye") {
            this.loadMonsterEye(); 
        }
    }

    loadMutant() {
        const loader = new FBXLoader();
        loader.load(
            '/src/models/Mutant/mutant.fbx',
            (fbx) => {
                fbx.scale.set(0.01, 0.01, 0.01);
                fbx.position.copy(this.startPosition);
                fbx.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.enemyModel = fbx;
                this.groundOffset = 1; // Raised to keep feet on ground
                this.scene.add(this.enemyModel);

                if (typeof this.onModelLoaded === 'function') {
                    this.onModelLoaded(this.enemyModel);
                }

                this.mixer = new THREE.AnimationMixer(fbx);
                if (fbx.animations.length > 0) {
                    const action = this.mixer.clipAction(fbx.animations[0]);
                    action.play();
                }

                this.initSpotlight();
                this.updateGroundPosition(); // Set initial ground position
            },
            (xhr) => console.log(`Mutant ${(xhr.loaded / xhr.total) * 100}% loaded`),
            (err) => console.error('Error loading Mutant:', err)
        );
    }

    loadScaryMonster() {
        const loader = new FBXLoader();
        const textureLoader = new THREE.TextureLoader();

        // Load textures
        const diffuse = textureLoader.load('/src/textures/scaryMonster/parasiteZombie_body_diffuse.png');
        const normal = textureLoader.load('/src/textures/scaryMonster/parasiteZombie_normal.png');
        const specular = textureLoader.load('/src/textures/scaryMonster/parasiteZombie_specular.png');

        loader.load(
            '/src/models/scaryMonster/Horror_Tale_3_Tom.fbx',
            (fbx) => {
                fbx.scale.set(0.01, 0.01, 0.01);
                fbx.position.copy(this.startPosition);

                fbx.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshPhongMaterial({
                            map: diffuse,
                            normalMap: normal,
                            specularMap: specular
                        });
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.enemyModel = fbx;
                this.groundOffset = 0; // Adjust this if needed for scary monster
                this.scene.add(this.enemyModel);

                if (typeof this.onModelLoaded === 'function') {
                    this.onModelLoaded(this.enemyModel);
                }

                this.mixer = new THREE.AnimationMixer(fbx);
                if (fbx.animations.length > 0) {
                    const action = this.mixer.clipAction(fbx.animations[0]);
                    action.play();
                }

                this.initSpotlight();
                this.updateGroundPosition(); // Set initial ground position
            },
            (xhr) => console.log(`ScaryMonster ${(xhr.loaded / xhr.total) * 100}% loaded`),
            (err) => console.error('Error loading ScaryMonster:', err)
        );
    }

    loadMonsterEye() {
        const loader = new FBXLoader();
        loader.load(
            '/src/models/monsterEye/monster_eye1.fbx',
            (fbx) => {
                fbx.scale.set(0.05, 0.05, 0.05);
                fbx.position.copy(this.startPosition);

                // Apply textures
                fbx.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        const textureLoader = new THREE.TextureLoader();
                        const baseColor = textureLoader.load('/src/textures/monsterEye/Ip_eye_lambert1_Basecolor.png');
                        const normalMap = textureLoader.load('/src/textures/monsterEye/Ip_eye_lambert1_Normal.png');
                        const metalnessMap = textureLoader.load('/src/textures/monsterEye/Ip_eye_lambert1_Metallic.png');
                        const roughnessMap = textureLoader.load('/src/textures/monsterEye/Ip_eye_lambert1_Roughness.png');

                        child.material = new THREE.MeshStandardMaterial({
                            map: baseColor,
                            normalMap: normalMap,
                            metalnessMap: metalnessMap,
                            roughnessMap: roughnessMap
                        });
                    }
                });

                this.enemyModel = fbx;
                this.groundOffset = 0; // Adjust this if needed for monster eye
                this.scene.add(this.enemyModel);

                if (typeof this.onModelLoaded === 'function') {
                    this.onModelLoaded(this.enemyModel);
                }

                // Animations 
                this.mixer = new THREE.AnimationMixer(fbx);
                if (fbx.animations.length > 0) {
                    const action = this.mixer.clipAction(fbx.animations[0]);
                    action.play();
                }

                this.initSpotlight();
                this.updateGroundPosition(); // Set initial ground position
            },
            (xhr) => console.log(`Monster Eye ${(xhr.loaded / xhr.total) * 100}% loaded`),
            (err) => console.error('Error loading Monster Eye:', err)
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

    updateGroundPosition() {
        if (!this.enemyModel) return;

        // Cast a ray downward from high above the enemy
        const rayOrigin = new THREE.Vector3(
            this.enemyModel.position.x,
            this.enemyModel.position.y + 50,
            this.enemyModel.position.z
        );
        const rayDirection = new THREE.Vector3(0, -1, 0);
        
        this.groundRaycaster.set(rayOrigin, rayDirection);
        this.groundRaycaster.far = 100; // Make sure we can reach the ground

        // Get all objects except the enemy itself and spotlights
        const objectsToTest = this.scene.children.filter(obj => 
            obj !== this.enemyModel && 
            obj !== this.spotLight && 
            obj.type !== 'SpotLight' &&
            obj.isMesh
        );
        
        const intersects = this.groundRaycaster.intersectObjects(objectsToTest, true);

        if (intersects.length > 0) {
            // Set enemy position to be on the ground
            this.enemyModel.position.y = intersects[0].point.y + this.groundOffset;
        }
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
                    // Update ground position after moving
                    this.updateGroundPosition();
                }
            }
        } else {
            if (distance > 2) {
                this.enemyModel.position.add(directionToPlayer.clone().multiplyScalar(this.lag));
                // Update ground position after moving
                this.updateGroundPosition();
            }
        }

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
        if (this.mixer) this.mixer.update(delta);
    }

    //helper for enemy health ui
    get model() {
        return this.enemyModel;
    }
}