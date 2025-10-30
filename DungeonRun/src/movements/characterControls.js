import * as THREE from 'three';
import { UP, DOWN, LEFT, RIGHT, DIRECTIONS } from '../view/keyDisplay.js';
import { boxIntersectsMeshBVH } from '../levels/demoLevel.js';

const debugMode = true;

class CharacterControls {
    constructor(model, mixer, animationsMap, thirdPersonCamera, currentAction, collidables = []) {
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap || new Map();
        this.thirdPersonCamera = thirdPersonCamera;
        this.currentAction = currentAction;
    // walking is default; run only when Shift is held
    this.toggleRun = false;
        this.walkDirection = new THREE.Vector3();
        this.rotateAngle = new THREE.Vector3(0, 1, 0);
        this.rotateQuarternion = new THREE.Quaternion();
        this.fadeDuration = 0.15; // Faster animation transitions
        this.runVelocity = 5.5; // Balanced speed
        this.walkVelocity = 2.5; // Balanced speed
        this.rotationSpeed = 0.25; // Smooth rotation speed
        this.collidables = collidables;

    // physics helpers
    this.raycaster = new THREE.Raycaster();
    this.stepHeight = 0.45; // max step up the player can climb
    this.velocityY = 0; // vertical speed for gravity
    this.gravity = -30; // gravity (tweak as needed)
    this.groundOffset = 0.05; // keep player slightly above ground
    this.capsule = { radius: 0.5, height: 1.6 };
    // death plane: if the player falls below deathY, reset Y to spawnY
    this.deathY = -10;
    this.spawnY = 2;
    // store last collision info for debugging
    this.lastCollision = null;
    this.lastCollisionMesh = null;
    this.collisionPush = new THREE.Vector3();
    // jump / vertical physics
    this.isJumping = false;
    this.jumpSpeed = 12.0; // initial upward velocity when jumping
    // ascending (smooth initial displacement) before gravity takes over
    this.isAscending = false;
    this.ascendElapsed = 0;
    this.ascendDuration = 0.18; // seconds for the smooth upward displacement
    this.ascendHeight = 1.2; // how high the smooth ascent moves the player before gravity
    this.ascendingStartY = 0;

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

    /*
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
    */


    willCollide(nextPosition) {
        // approximate player as an axis-aligned box centered at nextPosition
        const half = new THREE.Vector3(this.capsule.radius, this.capsule.height / 2, this.capsule.radius);
        const min = nextPosition.clone().sub(half);
        const max = nextPosition.clone().add(half);
        const playerBox = new THREE.Box3(min, max);
        // helper: sphere vs AABB test (center: Vector3, radius: number, box: Box3)
        const sphereIntersectsAABB = (center, radius, box) => {
            const x = Math.max(box.min.x, Math.min(center.x, box.max.x));
            const y = Math.max(box.min.y, Math.min(center.y, box.max.y));
            const z = Math.max(box.min.z, Math.min(center.z, box.max.z));
            const dx = x - center.x;
            const dy = y - center.y;
            const dz = z - center.z;
            return (dx * dx + dy * dy + dz * dz) <= (radius * radius);
        };

        for (const mesh of this.collidables) {
            if (!mesh || !mesh.geometry) continue;
            // skip invisible objects
            if (mesh.visible === false) continue;
            // skip meshes explicitly marked to ignore collisions
            if (mesh.userData && mesh.userData.ignoreCollision) continue;

            // room interior/backside-only meshes should not block; if material indicates BackSide, skip
            try {
                    if (mesh.material && mesh.material.side === THREE.BackSide) continue;
            } catch (e) {}

                // Explicitly ignore ground planes/meshes: ground is handled by raycasts in _sampleGroundHeight
                try {
                    if (mesh.name && mesh.name.toLowerCase().includes('ground')) {
                        continue;
                    }
                    if (mesh.userData && (mesh.userData.isGround || mesh.userData.ground)) {
                        continue;
                    }
                } catch (e) {}

            // If mesh is a large static mesh and has BVH available, prefer triangle-level (BVH) test
            if (mesh.userData && mesh.userData.staticCollision && mesh.geometry.boundsTree) {
                if (boxIntersectsMeshBVH(playerBox, mesh)) {
                    // store last collision details for debug UI
                    this.lastCollision = mesh.name || mesh.userData.tag || `id:${mesh.id}`;
                    this.lastCollisionMesh = mesh;
                    // approximate separation using mesh bounding box center and overlaps
                    try {
                        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
                        const meshBox = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
                        const meshCenter = meshBox.getCenter(new THREE.Vector3());
                        const playerCenter = playerBox.getCenter(new THREE.Vector3());
                        const diff = playerCenter.clone().sub(meshCenter);
                        diff.y = 0;
                        if (diff.lengthSq() < 1e-6) diff.set(0, 0, 1);
                        diff.normalize();
                        const overlapX = Math.max(0, Math.min(meshBox.max.x, playerBox.max.x) - Math.max(meshBox.min.x, playerBox.min.x));
                        const overlapZ = Math.max(0, Math.min(meshBox.max.z, playerBox.max.z) - Math.max(meshBox.min.z, playerBox.min.z));
                        const overlap = Math.max(overlapX, overlapZ) || 0.5;
                        this.collisionPush.copy(diff.multiplyScalar(overlap + 0.06));
                    } catch (e) {
                        this.collisionPush.set(0, 0, 0);
                    }
                    if (debugMode) console.debug('willCollide: BVH collided with', this.lastCollision, 'push:', this.collisionPush.toArray());
                    return true;
                }
                continue;
            }

            // If the mesh has a cached radius (dynamic object like enemy), test sphere vs AABB (fast)
            if (mesh.userData && mesh.userData.radius) {
                // use mesh.position (world) or a provided position in userData
                const center = (mesh.userData.position && mesh.userData.position.isVector3) ? mesh.userData.position : mesh.position;
                if (sphereIntersectsAABB(center, mesh.userData.radius, playerBox)) {
                    this.lastCollision = mesh.name || mesh.userData.tag || `id:${mesh.id}`;
                    this.lastCollisionMesh = mesh;
                    // push away from sphere center
                    try {
                        const playerCenter = playerBox.getCenter(new THREE.Vector3());
                        const dir = playerCenter.clone().sub(center);
                        dir.y = 0;
                        if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
                        dir.normalize();
                        const dist = playerCenter.distanceTo(center);
                        const overlap = Math.max(0, mesh.userData.radius + Math.max(this.capsule.radius, this.capsule.height / 2) - dist);
                        this.collisionPush.copy(dir.multiplyScalar(overlap + 0.06));
                    } catch (e) {
                        this.collisionPush.set(0, 0, 0);
                    }
                    if (debugMode) console.debug('willCollide: sphere-AABB collided with', this.lastCollision, 'push:', this.collisionPush.toArray());
                    return true;
                }
                continue;
            }

            // Fallback: use world-space boundingBox for quick reject or approximate collision
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const worldBox = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
            if (worldBox.intersectsBox(playerBox)) {
                this.lastCollision = mesh.name || mesh.userData.tag || `id:${mesh.id}`;
                this.lastCollisionMesh = mesh;
                try {
                    const meshCenter = worldBox.getCenter(new THREE.Vector3());
                    const playerCenter = playerBox.getCenter(new THREE.Vector3());
                    const diff = playerCenter.clone().sub(meshCenter);
                    diff.y = 0;
                    if (diff.lengthSq() < 1e-6) diff.set(0, 0, 1);
                    diff.normalize();
                    const overlapX = Math.max(0, Math.min(worldBox.max.x, playerBox.max.x) - Math.max(worldBox.min.x, playerBox.min.x));
                    const overlapZ = Math.max(0, Math.min(worldBox.max.z, playerBox.max.z) - Math.max(worldBox.min.z, playerBox.min.z));
                    const overlap = Math.max(overlapX, overlapZ) || 0.5;
                    this.collisionPush.copy(diff.multiplyScalar(overlap + 0.06));
                } catch (e) {
                    this.collisionPush.set(0, 0, 0);
                }
                if (debugMode) console.debug('willCollide: AABB collided with', this.lastCollision, 'push:', this.collisionPush.toArray());
                return true;
            }
        }
        // no collision found
        this.lastCollision = null;
        this.lastCollisionMesh = null;
        this.collisionPush.set(0, 0, 0);
        return false;
    }

    update(delta, keysPressed) {
        const directionPressed = DIRECTIONS.some(key => keysPressed[key] === true);

        // Prevent interrupting non-looping actions (attacks, pickup, death, jump)
        const NON_INTERRUPT_ACTIONS = ['Jump', 'Punch', 'Sword', 'Push', 'Open', 'Pickup', 'Death'];
        const currentActionObj = this.animationsMap.get(this.currentAction);
        if (NON_INTERRUPT_ACTIONS.includes(this.currentAction) && currentActionObj && currentActionObj.isRunning()) {
            // keep mixer progressing the current non-looping action and avoid switching to Idle/Walk/Run
            this.mixer.update(delta);
            // allow jump physics to run even while the Jump animation is playing
            if (this.currentAction !== 'Jump') return;
        }

        // If directional input is pressed, ensure we're playing Walk/Run so movement code runs below.
        // This is intentionally simple: we prefer Run if toggleRun is true, or when Shift is held.
        if (directionPressed) {
            // Walk by default; only run when Shift is held
            const wantsRun = keysPressed['ShiftLeft'] || keysPressed['ShiftRight'];
            if (wantsRun) {
                if (this.currentAction !== 'Run') this.playRun();
            } else {
                if (this.currentAction !== 'Walk') this.playWalk();
            }
        } else {
            // no movement keys -> go to idle (if not currently playing a non-interrupt action)
            if (this.currentAction !== 'Idle') this.playIdle();
        }

        // Handle animation triggers (separate checks so they don't clash)
        if (keysPressed['Space']) {
            if (!this.isJumping) {
                this.playJump();
                this.isJumping = true;
                this.velocityY = this.jumpSpeed;
            }
        }

        if (keysPressed['KeyT']) {
            this.playOpen();
        } else if (keysPressed['KeyG']) {
            this.playPush();
        } else if (keysPressed['KeyX']) {
            this.playDeath();
        }

        this.mixer.update(delta);

        // vertical physics: apply gravity/jump and ground snapping
        if (this.isJumping) {
            this.velocityY += this.gravity * delta;
            this.model.position.y += this.velocityY * delta;
            // check for landing
            const groundY = this._sampleGroundHeight(this.model.position);
            if (groundY !== null && this.velocityY <= 0 && this.model.position.y <= groundY + this.groundOffset + 0.01) {
                this.model.position.y = groundY + this.groundOffset;
                this.isJumping = false;
                this.velocityY = 0;
                // ensure idle if no directional input
                if (!directionPressed) this.playIdle();
            }
        } else {
            // gently snap to ground to avoid tiny floating offsets
            const groundY = this._sampleGroundHeight(this.model.position);
            if (groundY !== null) {
                this.model.position.y = THREE.MathUtils.lerp(this.model.position.y, groundY + this.groundOffset, 0.25);
                if (Math.abs(this.model.position.y - (groundY + this.groundOffset)) < 0.01) this.model.position.y = groundY + this.groundOffset;
            }
        }

        // Death plane: if player falls below deathY, reset their vertical position to spawnY
        if (this.model.position.y < this.deathY) {
            this.model.position.y = this.spawnY;
            this.velocityY = 0;
            this.isJumping = false;
            this.lastCollision = null;
            this.lastCollisionMesh = null;
            // ensure a neutral animation state after respawn
            if (this.currentAction !== 'Idle') this.playIdle();
        }

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
                const angle = Math.atan2(moveDirection.x, moveDirection.z);
                this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angle);
                this.model.quaternion.rotateTowards(this.rotateQuarternion, this.rotationSpeed);

                const velocity = this.currentAction === 'Run' ? this.runVelocity : this.walkVelocity;
                const moveX = moveDirection.x * velocity * delta;
                const moveZ = moveDirection.z * velocity * delta;
                const nextPosition = this.model.position.clone().add(new THREE.Vector3(moveX, 0, moveZ));

                // Check for collisions and step handling using ground raycasts
                //console.log(this.willCollide(nextPosition))
                if (!this.willCollide(nextPosition)) {
                    // sample ground height at current and next position
                    const groundAtCurrent = this._sampleGroundHeight(this.model.position);
                    const groundAtNext = this._sampleGroundHeight(nextPosition);

                    if (groundAtNext === null) {
                        // no ground detected, allow falling
                        this.model.position.copy(nextPosition);
                    } else {
                        const deltaH = groundAtNext - (groundAtCurrent === null ? this.model.position.y : groundAtCurrent);
                        if (deltaH > this.stepHeight) {
                            // too high to step
                            // don't move
                        } else {
                            // allowed: apply horizontal move and snap to ground
                            this.model.position.copy(nextPosition);
                            // snap smoothly
                            this.model.position.y = THREE.MathUtils.lerp(this.model.position.y, groundAtNext + this.groundOffset, 0.6);
                            this.velocityY = 0;
                        }
                    }
                } else {
                    // Instead of blocking movement, apply a small push away from the collider
                    if (this.collisionPush && this.collisionPush.lengthSq() > 0) {
                        const push = this.collisionPush.clone().multiplyScalar(0.6);
                        this.model.position.add(push);
                        // snap vertically to ground after push
                        const groundAfterPush = this._sampleGroundHeight(this.model.position);
                        if (groundAfterPush !== null) {
                            this.model.position.y = THREE.MathUtils.lerp(this.model.position.y, groundAfterPush + this.groundOffset, 0.6);
                        }
                        this.velocityY = 0;
                        // clear push so it doesn't accumulate
                        this.collisionPush.set(0, 0, 0);
                    }
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
    
    _sampleGroundHeight(position) {
        // cast a short ray downwards from above the player to find ground among collidables
        const origin = position.clone().add(new THREE.Vector3(0, 2.0, 0));
        this.raycaster.set(origin, new THREE.Vector3(0, -1, 0));
        this.raycaster.far = 5;
        const intersects = this.raycaster.intersectObjects(this.collidables, true);
        if (intersects && intersects.length > 0) {
            return intersects[0].point.y;
        }
        return null;
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