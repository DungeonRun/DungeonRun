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
        this.runVelocity = 5;
        this.walkVelocity = 2;

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
            // Get camera from thirdPersonCamera
            const camera = this.thirdPersonCamera._camera;
            const angleYCameraDirection = Math.atan2(
                (camera.position.x - this.model.position.x),
                (camera.position.z - this.model.position.z)
            );
            const directionOffset = this.directionOffset(keysPressed);

            this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset);
            this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

            camera.getWorldDirection(this.walkDirection);
            this.walkDirection.y = 0;
            this.walkDirection.normalize();
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

            const velocity = this.currentAction === 'Run' ? this.runVelocity : this.walkVelocity;

            const moveX = this.walkDirection.x * velocity * delta;
            const moveZ = this.walkDirection.z * velocity * delta;
            this.model.position.x += moveX;
            this.model.position.z += moveZ;
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