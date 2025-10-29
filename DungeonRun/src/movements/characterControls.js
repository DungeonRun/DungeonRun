import * as THREE from 'three';
import { UP, DOWN, LEFT, RIGHT, DIRECTIONS } from './utils.js';
import { boxIntersectsMeshBVH } from '../levels/demoLevel.js';

class CharacterControls {
    constructor(model, mixer, animationsMap, cameraManager, currentAction, collidables = []) {
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap || new Map();
        this.cameraController = cameraManager; // Now can be ThirdPersonCamera, FirstPersonCamera, or CameraManager
        this.currentAction = currentAction;
        this.toggleRun = true;
        this.walkDirection = new THREE.Vector3();
        this.rotateAngle = new THREE.Vector3(0, 1, 0);
        this.rotateQuarternion = new THREE.Quaternion();
        this.fadeDuration = 0.15; // Faster animation transitions
        this.runVelocity = 5.5; // Balanced speed
        this.walkVelocity = 2.5; // Balanced speed
        this.rotationSpeed = 0.25; // Smooth rotation speed
        this.collidables = collidables;

        this.health = 100;

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

    update(delta, keysPressed) {
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


             if (this.currentAction !== 'Pickup') {
                this.playPickup();
            }
            
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

            // Get camera reference - handle both direct camera and CameraManager
            // This `camera` variable is the actual THREE.Camera, used for some calculations below.
            let camera = this.cameraController._camera || this.cameraController.camera;
            // Also obtain the camera *wrapper* (object that may have Update, hideAvatarForFirstPerson, etc.)
            let cameraWrapper = this.cameraController;
            if (this.cameraController.GetActiveCamera) {
                // Using CameraManager: GetActiveCamera() returns the active camera wrapper
                cameraWrapper = this.cameraController.GetActiveCamera();
                camera = cameraWrapper._camera || camera; // fallback if wrapper doesn't expose `_camera`
            }

            const cameraWorldPos = camera.getWorldPosition(new THREE.Vector3());
            const playerPos = this.model.position.clone();

            // NOTE: change how cameraForward is computed for first-person vs third-person
            // The existing code computed cameraForward as playerPos - cameraWorldPos which works for 3rd-person.
            // Keep that for third-person movement directions (so controls remain consistent).
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

                // Check if using first person camera
                const isFirstPerson = this.cameraController.GetMode && this.cameraController.GetMode() === 'first';

                // If we have a camera wrapper with first-person helper methods, we can hide / restore avatar
                if (isFirstPerson) {
                    // Hide avatar meshes so you don't see the body in front of the camera
                    if (cameraWrapper && typeof cameraWrapper.hideAvatarForFirstPerson === 'function') {
                        if (!this._avatarHiddenForFP) {
                            cameraWrapper.hideAvatarForFirstPerson();
                            this._avatarHiddenForFP = true;
                        }
                    }
                } else {
                    // restore avatar visibility if we left first-person
                    if (this._avatarHiddenForFP) {
                        if (cameraWrapper && typeof cameraWrapper.restoreAvatarVisibility === 'function') {
                            cameraWrapper.restoreAvatarVisibility();
                        } else {
                            // fallback: unhide meshes ourselves
                            this.model.traverse((child) => {
                                if (child.isMesh && child.userData._origVisible !== undefined) {
                                    child.visible = child.userData._origVisible;
                                    delete child.userData._origVisible;
                                }
                            });
                        }
                        this._avatarHiddenForFP = false;
                    }
                }

                // Movement facing:
                // - In third-person: rotate player to face movement direction (existing behavior)
                // - In first-person: do NOT rotate player; instead tell the camera the movement vector so it faces where the avatar is going

                if (!isFirstPerson) {
                    // Third person: rotate player to face movement direction (existing behavior)
                    const angle = Math.atan2(moveDirection.x, moveDirection.z);
                    this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angle);
                    this.model.quaternion.rotateTowards(this.rotateQuarternion, this.rotationSpeed);
                } else {
                    // First-person: do not rotate the model. Instead feed the camera the movement vector so it faces movement.
                    // Build world-space movement velocity vector (not only direction) so the FP camera can use it.
                    const velocity = this.currentAction === 'Run' ? this.runVelocity : this.walkVelocity;
                    const movementVecWorld = moveDirection.clone().multiplyScalar(velocity);

                    // If camera wrapper exposes SetUseMovementFacing, prefer to enable it.
                    if (cameraWrapper && typeof cameraWrapper.SetUseMovementFacing === 'function') {
                        cameraWrapper.SetUseMovementFacing(true);
                    }

                    // If the active camera wrapper exposes Update(dt, movementVec), call it here to keep camera facing movement.
                    if (cameraWrapper && typeof cameraWrapper.Update === 'function') {
                        cameraWrapper.Update(delta, movementVecWorld);
                    } else if (cameraWrapper && cameraWrapper._camera && typeof cameraWrapper._camera.update === 'function') {
                        // fallback: some camera systems place the update on a different object; try `_camera.update`
                        cameraWrapper._camera.update(delta, movementVecWorld);
                    }
                }

                // Finally compute nextPosition and collision check (move the model regardless of camera mode)
                const velocity = this.currentAction === 'Run' ? this.runVelocity : this.walkVelocity;
                const moveX = moveDirection.x * velocity * delta;
                const moveZ = moveDirection.z * velocity * delta;
                const nextPosition = this.model.position.clone().add(new THREE.Vector3(moveX, 0, moveZ));

                if (!this.willCollide(nextPosition)) {
                    this.model.position.copy(nextPosition);
                }
            } else {
                // No input; still update camera to maintain orientation (use null movementVec to allow fallback to model forward)
                const isFirstPerson = this.cameraController.GetMode && this.cameraController.GetMode() === 'first';
                let cameraWrapper = this.cameraController;
                if (this.cameraController.GetActiveCamera) cameraWrapper = this.cameraController.GetActiveCamera();

                if (isFirstPerson) {
                    // ensure avatar hidden while in first person (even when standing)
                    if (cameraWrapper && typeof cameraWrapper.hideAvatarForFirstPerson === 'function' && !this._avatarHiddenForFP) {
                        cameraWrapper.hideAvatarForFirstPerson();
                        this._avatarHiddenForFP = true;
                    }
                } else {
                    if (this._avatarHiddenForFP) {
                        if (cameraWrapper && typeof cameraWrapper.restoreAvatarVisibility === 'function') {
                            cameraWrapper.restoreAvatarVisibility();
                        } else {
                            this.model.traverse((child) => {
                                if (child.isMesh && child.userData._origVisible !== undefined) {
                                    child.visible = child.userData._origVisible;
                                    delete child.userData._origVisible;
                                }
                            });
                        }
                        this._avatarHiddenForFP = false;
                    }
                }

                // Update camera even when idle so it aligns smoothly to facing fallback
                if (cameraWrapper && typeof cameraWrapper.Update === 'function') {
                    cameraWrapper.Update(delta, null); // null => use model forward fallback
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

    // Stop all active animations
    this.mixer.stopAllAction();

    // Reset to idle if available
    const idle = this.animationsMap.get('Idle');
    if (idle) {
        idle.reset().fadeIn(this.fadeDuration).play();
        this.currentAction = 'Idle';
    }

    console.log("CharacterControls: Animation reset to Idle"); //so that animations on previous level stop
}

}

export { CharacterControls };