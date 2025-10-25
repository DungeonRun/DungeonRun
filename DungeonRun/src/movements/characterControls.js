import * as THREE from 'three';
import { UP, DOWN, LEFT, RIGHT, DIRECTIONS } from './utils.js';
import { boxIntersectsMeshBVH } from '../levels/demoLevel.js';
import { PhysicsController } from './physics.js';


class CharacterControls {
    constructor(model, mixer, animationsMap, thirdPersonCamera, currentAction, collidables = [], scene) {
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap || new Map();
        this.thirdPersonCamera = thirdPersonCamera;
        this.currentAction = currentAction;
        this.toggleRun = true;
        this.walkDirection = new THREE.Vector3();
        this.rotateAngle = new THREE.Vector3(0, 1, 0);
        this.rotateQuarternion = new THREE.Quaternion();
        this.fadeDuration = 0.15;
        this.runVelocity = 5.5;
        this.walkVelocity = 2.5;
        this.rotationSpeed = 0.25;
        this.collidables = collidables;
        this.health = 100;

        // Add physics controller for gravity
        this.physics = new PhysicsController(model, scene, 0); // 0 offset for player

        this.animationsMap.forEach((value, key) => {
            if (key === currentAction) {
                value.play();
            }
        });

        // Handle non-looping animation completion
        this.mixer.addEventListener('finished', (e) => {
            if (['Jump', 'Punch', 'Sword', 'Push', 'Open', 'Pickup', 'Death'].includes(this.currentAction)) {
                this.playIdle();
            }
        });
    }

    // Animation Functions
    playAnimation(animationName, loop = true) {
        if (!this.animationsMap.has(animationName)) {
            console.warn(`Animation ${animationName} not found`);
            return;
        }

        if (this.currentAction !== animationName) {
            const toPlay = this.animationsMap.get(animationName);
            const current = this.animationsMap.get(this.currentAction);

            if (current) current.fadeOut(this.fadeDuration);
            if (toPlay) {
                toPlay.reset().fadeIn(this.fadeDuration).play();
                toPlay.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
            }

            this.currentAction = animationName;
        }
    }

    playIdle() {
        this.playAnimation('Idle', true);
    }

    playWalk() {
        this.playAnimation('Walk', true);
    }

    playRun() {
        this.playAnimation('Run', true);
    }

    playJump() {
        this.playAnimation('Jump', false);
    }

    playOpen() {
        this.playAnimation('Open', false);
    }

    playPickup() {
        this.playAnimation('Pickup', false);
    }

    playPush() {
        this.playAnimation('Push', false);
    }

    playPunch() {
        this.playAnimation('Punch', false);
    }

    playSword() {
        this.playAnimation('Sword', false);
    }

    playDeath() {
        this.playAnimation('Death', false);
    }

    switchRunToggle() {
        this.toggleRun = !this.toggleRun; // unused function now
    }

    willCollide(nextPosition) {
        const box = new THREE.Box3().setFromObject(this.model);
        const delta = nextPosition.clone().sub(this.model.position);
        box.translate(delta);

        for (const mesh of this.collidables) {
            if (boxIntersectsMeshBVH(box, mesh)) {
                return true;
            }
        }
        return false;
    }

    jump() {
        // Trigger jump through physics controller
        this.physics.jump();
    }

    update(delta, keysPressed) {
        // Update physics (gravity) first
        this.physics.update(delta);

        const directionPressed = DIRECTIONS.some(key => keysPressed[key] === true);

        // Handle animation triggers
        if (keysPressed['Space']) {
            this.playJump();
            // Add vertical movement for jump
            if (this.currentAction === 'Jump') {
                const action = this.animationsMap.get('Jump');
                if (action && action.isRunning()) {
                    this.model.position.y += 2 * delta; // Adjust height/speed as needed
                    if (this.model.position.y > 2) this.model.position.y = 2;
                }
            }
        } else if (keysPressed['KeyF']) {
            this.playPunch();
        } else if (keysPressed['KeyE']) {
            this.playSword();
        } else if (keysPressed['KeyR']) {
            this.playPickup();
        } else if (keysPressed['KeyT']) {
            this.playOpen();
        } else if (keysPressed['KeyG']) {
            this.playPush();
        } else if (keysPressed['KeyX']) {  //x key is for death but this has to be automated when they die
            this.playDeath();
        } else if (directionPressed && (keysPressed['ShiftLeft'] || keysPressed['ShiftRight'])) {
            this.playRun();
        } else if (directionPressed) {
            this.playWalk();
        } else {
            this.playIdle();
            // Reset vertical position when not jumping
            if (this.model.position.y > 0) {
                this.model.position.y -= 2 * delta; // Fall back to ground
                if (this.model.position.y < 0) this.model.position.y = 0;
            }
        }

        this.mixer.update(delta);

        if (this.currentAction === 'Run' || this.currentAction === 'Walk') {
            let moveDirection = new THREE.Vector3(0, 0, 0);
            
            const cameraWorldPos = this.thirdPersonCamera._camera.getWorldPosition(new THREE.Vector3());
            const playerPos = this.model.position.clone();
            
            const cameraForward = new THREE.Vector3();
            cameraForward.subVectors(playerPos, cameraWorldPos);
            cameraForward.y = 0;
            cameraForward.normalize();
            
            const cameraRight = new THREE.Vector3();
            cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));
            cameraRight.normalize();

            if (keysPressed[UP]) {
                moveDirection.add(cameraForward);
            }
            if (keysPressed[DOWN]) {
                moveDirection.sub(cameraForward);
            }
            if (keysPressed[LEFT]) {
                moveDirection.sub(cameraRight);
            }
            if (keysPressed[RIGHT]) {
                moveDirection.add(cameraRight);
            }

            if (moveDirection.length() > 0) {
                moveDirection.normalize();
                
                const angle = Math.atan2(moveDirection.x, moveDirection.z); //Niel: Pi got added to this but this might be causing issues down the line. Just noting
                this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angle);
                
                this.model.quaternion.rotateTowards(this.rotateQuarternion, this.rotationSpeed);

                const velocity = this.currentAction === 'Run' ? this.runVelocity : this.walkVelocity;
                const moveX = moveDirection.x * velocity * delta;
                const moveZ = moveDirection.z * velocity * delta;
                
                // Only move on X and Z, Y is handled by physics
                const nextPosition = this.model.position.clone().add(new THREE.Vector3(moveX, 0, moveZ));

                if (!this.willCollide(nextPosition)) {
                    this.model.position.x = nextPosition.x;
                    this.model.position.z = nextPosition.z;
                }
            }
        }
    }

    directionOffset(keysPressed) {
        let directionOffset = 0;

        if (keysPressed[UP]) {
            if (keysPressed[LEFT]) {
                directionOffset = Math.PI / 4;
            } else if (keysPressed[RIGHT]) {
                directionOffset = -Math.PI / 4;
            }
        } else if (keysPressed[DOWN]) {
            if (keysPressed[LEFT]) {
                directionOffset = Math.PI / 4 + Math.PI / 2;
            } else if (keysPressed[RIGHT]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2;
            } else {
                directionOffset = Math.PI;
            }
        } else if (keysPressed[LEFT]) {
            directionOffset = Math.PI / 2;
        } else if (keysPressed[RIGHT]) {
            directionOffset = -Math.PI / 2;
        }

        return directionOffset;
    }
}

export { CharacterControls };