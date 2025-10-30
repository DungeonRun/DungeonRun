import * as THREE from 'three';
import { UP, DOWN, LEFT, RIGHT, DIRECTIONS } from './utils.js';
import { boxIntersectsMeshBVH } from '../levels/demoLevel.js';

class CharacterControls {
    constructor(model, mixer, animationsMap, thirdPersonCamera, currentAction, collidables = []) {
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap || new Map();
        this.thirdPersonCamera = thirdPersonCamera;
        this.firstPersonCamera = null; // Will be set externally
        this.currentCamera = thirdPersonCamera;
        this.isFirstPerson = false;
        
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

        this.animationsMap.forEach((value, key) => {
            if (key === currentAction) {
                value.play();
            }
        });

        this.mixer.addEventListener('finished', (e) => {
            if (['Jump', 'Punch', 'Sword', 'Push', 'Open', 'Pickup', 'Death'].includes(this.currentAction)) {
                this.playIdle();
            }
        });
    }

    setFirstPersonCamera(fpCamera) {
        this.firstPersonCamera = fpCamera;
    }

    toggleCameraMode(isFirstPerson) {
        this.isFirstPerson = isFirstPerson;
        
        if (isFirstPerson) {
            this.currentCamera = this.firstPersonCamera;
            // Hide player model in first person
            this.model.visible = false;
            // Request pointer lock for first person
            if (this.firstPersonCamera) {
                this.firstPersonCamera.RequestPointerLock();
            }
        } else {
            this.currentCamera = this.thirdPersonCamera;
            // Show player model in third person
            this.model.visible = true;
            // Exit pointer lock
            if (this.firstPersonCamera) {
                this.firstPersonCamera.ExitPointerLock();
            }
        }
    }

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
        this.toggleRun = !this.toggleRun;
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

    update(delta, keysPressed) {
        const directionPressed = DIRECTIONS.some(key => keysPressed[key] === true);

        // Handle animation triggers
        if (keysPressed['Space']) {
            this.playJump();
            if (this.currentAction === 'Jump') {
                const action = this.animationsMap.get('Jump');
                if (action && action.isRunning()) {
                    this.model.position.y += 2 * delta;
                    if (this.model.position.y > 2) this.model.position.y = 2;
                }
            }
        } else if (keysPressed['KeyF']) {
            this.playPunch();
        } else if (keysPressed['KeyE']) {
            this.playSword();
        } else if (keysPressed['KeyR']) {
            if (this.currentAction !== 'Pickup') {
                this.playPickup();
            }
        } else if (keysPressed['KeyT']) {
            this.playOpen();
        } else if (keysPressed['KeyG']) {
            this.playPush();
        } else if (keysPressed['KeyX']) {
            this.playDeath();
        } else if (directionPressed && (keysPressed['ShiftLeft'] || keysPressed['ShiftRight'])) {
            this.playRun();
        } else if (directionPressed) {
            this.playWalk();
        } else {
            this.playIdle();
            if (this.model.position.y > 0) {
                this.model.position.y -= 2 * delta;
                if (this.model.position.y < 0) this.model.position.y = 0;
            }
        }

        this.mixer.update(delta);

        if (this.currentAction === 'Run' || this.currentAction === 'Walk') {
            let moveDirection = new THREE.Vector3(0, 0, 0);
            
            if (this.isFirstPerson && this.firstPersonCamera) {
                // First person movement - use camera direction
                const cameraForward = this.firstPersonCamera.GetForwardDirection();
                const cameraRight = this.firstPersonCamera.GetRightDirection();

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
                
                // Rotate character to face movement direction
                if (moveDirection.length() > 0) {
                    const angle = Math.atan2(moveDirection.x, moveDirection.z);
                    this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angle);
                    this.model.quaternion.copy(this.rotateQuarternion);
                }
            } else {
                // Third person movement - use camera relative direction
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
                    const angle = Math.atan2(moveDirection.x, moveDirection.z);
                    this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angle);
                    this.model.quaternion.rotateTowards(this.rotateQuarternion, this.rotationSpeed);
                }
            }

            if (moveDirection.length() > 0) {
                moveDirection.normalize();
                const velocity = this.currentAction === 'Run' ? this.runVelocity : this.walkVelocity;
                const moveX = moveDirection.x * velocity * delta;
                const moveZ = moveDirection.z * velocity * delta;
                const nextPosition = this.model.position.clone().add(new THREE.Vector3(moveX, 0, moveZ));

                if (!this.willCollide(nextPosition)) {
                    this.model.position.copy(nextPosition);
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

    resetAnimation() {
        if (!this.mixer || !this.animationsMap) return;

        this.mixer.stopAllAction();

        const idle = this.animationsMap.get('Idle');
        if (idle) {
            idle.reset().fadeIn(this.fadeDuration).play();
            this.currentAction = 'Idle';
        }

        console.log("CharacterControls: Animation reset to Idle");
    }
}

export { CharacterControls };