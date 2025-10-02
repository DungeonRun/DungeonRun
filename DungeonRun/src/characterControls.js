import * as THREE from 'three';
import { UP, DOWN, LEFT, RIGHT, DIRECTIONS } from './utils.js';

class CharacterControls {
    constructor(model, mixer, animationsMap, thirdPersonCamera, currentAction) {
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap || new Map();
        this.thirdPersonCamera = thirdPersonCamera;
        this.currentAction = currentAction;
        this.toggleRun = true;
        this.walkDirection = new THREE.Vector3();
        this.rotateAngle = new THREE.Vector3(0, 1, 0);
        this.rotateQuarternion = new THREE.Quaternion();
        this.fadeDuration = 0.2;
        this.runVelocity = 6; // Slightly faster for better responsiveness
        this.walkVelocity = 3; // Slightly faster for better responsiveness

        this.animationsMap.forEach((value, key) => {
            if (key === currentAction) {
                value.play();
            }
        });
    }

    switchRunToggle() {
        this.toggleRun = !this.toggleRun; //unused function now
    }

    update(delta, keysPressed) {
        const directionPressed = DIRECTIONS.some(key => keysPressed[key] === true);
        let play = '';
        if (directionPressed && keysPressed['shift']) {
            play = 'Run';
        } else if (directionPressed) {
            play = 'Walk';
        } else {
            play = 'Idle';
        }

        if (this.currentAction !== play) {
            const toPlay = this.animationsMap.get(play);
            const current = this.animationsMap.get(this.currentAction);

            if (current) current.fadeOut(this.fadeDuration);
            if (toPlay) toPlay.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = play;
        }

        this.mixer.update(delta);

        if (this.currentAction === 'Run' || this.currentAction === 'Walk') {
            // Calculate movement direction based on camera and keys pressed
            let moveDirection = new THREE.Vector3(0, 0, 0);
            
            // Get camera's azimuthal angle to calculate forward and right directions
            const azimuthalAngle = this.thirdPersonCamera._azimuthalAngle;
            
            // Calculate forward direction (where camera is looking)
            const cameraForward = new THREE.Vector3();
            cameraForward.x = Math.sin(azimuthalAngle);
            cameraForward.z = Math.cos(azimuthalAngle);
            cameraForward.y = 0;
            cameraForward.normalize();
            
            // Calculate right direction (perpendicular to forward)
            const cameraRight = new THREE.Vector3();
            cameraRight.x = -Math.cos(azimuthalAngle);
            cameraRight.z = Math.sin(azimuthalAngle);
            cameraRight.y = 0;
            cameraRight.normalize();

            // Calculate movement based on keys pressed
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

            // Normalize movement direction
            if (moveDirection.length() > 0) {
                moveDirection.normalize();
                
                // Set character rotation to face movement direction
                // Add PI to make character face forward instead of backward
                const angle = Math.atan2(moveDirection.x, moveDirection.z) + Math.PI;
                this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angle);
                // Faster rotation for smoother direction changes (0.2 -> 0.3)
                this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.3);

                // Move the character directly in the movement direction
                // This ensures movement matches the intended direction exactly
                const velocity = this.currentAction === 'Run' ? this.runVelocity : this.walkVelocity;
                const moveX = moveDirection.x * velocity * delta;
                const moveZ = moveDirection.z * velocity * delta;
                this.model.position.x += moveX;
                this.model.position.z += moveZ;
            }
        }
    }


    directionOffset(keysPressed) {
        let directionOffset = 0; // arrowup

        if (keysPressed[UP]) {
            if (keysPressed[LEFT]) {
                directionOffset = Math.PI / 4; // arrowup+arrowleft
            } else if (keysPressed[RIGHT]) {
                directionOffset = -Math.PI / 4; // arrowup+arrowright
            }
        } else if (keysPressed[DOWN]) {
            if (keysPressed[LEFT]) {
                directionOffset = Math.PI / 4 + Math.PI / 2; // arrowdown+arrowleft
            } else if (keysPressed[RIGHT]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2; // arrowdown+arrowright
            } else {
                directionOffset = Math.PI; // arrowdown
            }
        } else if (keysPressed[LEFT]) {
            directionOffset = Math.PI / 2; // arrowleft
        } else if (keysPressed[RIGHT]) {
            directionOffset = -Math.PI / 2; // arrowright
        }

        return directionOffset;
    }
}

export { CharacterControls };