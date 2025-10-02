import * as THREE from 'three';

/**
 * Fortnite-Style Third Person Camera implementation
 * Features:
 * - Camera sits behind and slightly above the avatar with over-the-shoulder view
 * - Independent mouse orbiting (camera can rotate around player without rotating player)
 * - Smooth following with natural distance and positioning
 * - Player movement is relative to camera direction
 */
class ThirdPersonCamera {
    constructor(params) {
        this._params = params;
        this._camera = params.camera;
        this._target = params.target; // The avatar model
        this._scene = params.scene; // Need scene to add camera pivot

        // Camera pivot for independent rotation
        this._cameraPivot = new THREE.Object3D();
        this._scene.add(this._cameraPivot);
        
        // Remove camera from scene and add to pivot
        this._scene.remove(this._camera);
        this._cameraPivot.add(this._camera);

        // Camera configuration - Fortnite style positioning
        // Over-the-shoulder view: slightly right, above, and behind
        // Fortnite typically has camera closer to player for tighter control feel
        this._cameraOffset = new THREE.Vector3(1.5, 4.5, -7); // Closer Fortnite-style positioning
        this._lookatOffset = new THREE.Vector3(0, 1.8, 2); // Look slightly ahead of player

        // Mouse sensitivity and rotation limits
        this._mouseSensitivity = 0.002;
        this._minPolarAngle = Math.PI * 0.1; // Prevent looking too far up
        this._maxPolarAngle = Math.PI * 0.8; // Prevent looking too far down
        
        // Current rotation angles
        this._azimuthalAngle = Math.PI; // Start behind the player (PI radians = 180 degrees = behind)
        this._polarAngle = Math.PI * 0.4; // Vertical rotation (start slightly looking down)
        
        // Smooth following
        this._currentPivotPosition = new THREE.Vector3();
        this._currentLookatPosition = new THREE.Vector3();

        // Mouse control state
        this._isMouseLocked = false;
        
        // Initialize camera positions
        this._InitializePositions();
        this._SetupMouseControls();
    }

    _InitializePositions() {
        if (this._target) {
            // Set initial pivot position to target
            this._currentPivotPosition.copy(this._target.position);
            this._cameraPivot.position.copy(this._currentPivotPosition);
            
            // Set initial camera position based on angles
            this._UpdateCameraPosition();
            
            // Set initial lookat
            const initialLookat = this._target.position.clone().add(this._lookatOffset);
            this._currentLookatPosition.copy(initialLookat);
            this._camera.lookAt(this._currentLookatPosition);
        }
    }

    _SetupMouseControls() {
        // Mouse lock controls
        document.addEventListener('click', () => {
            if (!this._isMouseLocked) {
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this._isMouseLocked = document.pointerLockElement === document.body;
        });

        // Mouse movement for camera rotation
        document.addEventListener('mousemove', (event) => {
            if (!this._isMouseLocked) return;

            // Update rotation angles based on mouse movement
            this._azimuthalAngle -= event.movementX * this._mouseSensitivity;
            this._polarAngle -= event.movementY * this._mouseSensitivity;

            // Clamp polar angle to prevent flipping
            this._polarAngle = Math.max(this._minPolarAngle, Math.min(this._maxPolarAngle, this._polarAngle));
        });

        // ESC to unlock mouse
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this._isMouseLocked) {
                document.exitPointerLock();
            }
        });
    }

    _UpdateCameraPosition() {
        this._UpdateCameraPositionWithAngle(this._azimuthalAngle);
    }

    _UpdateCameraPositionWithAngle(azimuthalAngle) {
        // Calculate camera position behind the player
        // Use the offset as a base and rotate it around the player
        const offset = this._cameraOffset.clone();
        
        // Rotate the offset by the azimuthal angle (horizontal rotation)
        const rotatedOffset = new THREE.Vector3();
        rotatedOffset.x = offset.x * Math.cos(azimuthalAngle) - offset.z * Math.sin(azimuthalAngle);
        rotatedOffset.z = offset.x * Math.sin(azimuthalAngle) + offset.z * Math.cos(azimuthalAngle);
        rotatedOffset.y = offset.y;
        
        // Adjust height based on polar angle for looking up/down
        const heightAdjustment = Math.tan(this._polarAngle - Math.PI * 0.5) * 3;
        rotatedOffset.y += heightAdjustment;
        
        this._camera.position.copy(rotatedOffset);
    }

    Update(deltaTime) {
        if (!this._target) return;

        // Get player's rotation to keep camera behind them
        const playerRotation = this._target.quaternion.clone();
        const playerEuler = new THREE.Euler().setFromQuaternion(playerRotation);
        
        // Adjust camera azimuthal angle to stay behind player
        // Subtract the player's Y rotation to keep camera behind them
        const baseAzimuthalAngle = this._azimuthalAngle;
        const adjustedAzimuthalAngle = baseAzimuthalAngle - playerEuler.y;

        // Smoothly follow target position
        const targetPosition = this._target.position.clone();
        const t = 1.0 - Math.pow(0.02, deltaTime); // Balanced - smooth but responsive
        
        this._currentPivotPosition.lerp(targetPosition, t);
        this._cameraPivot.position.copy(this._currentPivotPosition);

        // Update camera position with adjusted angle to stay behind player
        this._UpdateCameraPositionWithAngle(adjustedAzimuthalAngle);

        // Smooth lookat following
        const idealLookat = targetPosition.clone().add(this._lookatOffset);
        this._currentLookatPosition.lerp(idealLookat, t);
        this._camera.lookAt(this._currentLookatPosition);
    }

    // Get camera direction for character movement
    GetCameraDirection() {
        // Calculate forward direction based on where camera is looking
        // Since camera is behind player, forward direction is from camera toward player
        const cameraToPlayer = new THREE.Vector3();
        cameraToPlayer.subVectors(this._currentPivotPosition, this._camera.getWorldPosition(new THREE.Vector3()));
        cameraToPlayer.y = 0; // Remove vertical component
        cameraToPlayer.normalize();
        return cameraToPlayer;
    }

    // Get camera forward direction (for movement calculations)
    GetForwardVector() {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this._cameraPivot.quaternion);
        forward.y = 0;
        forward.normalize();
        return forward;
    }

    // Get camera right vector (for strafing)
    GetRightVector() {
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this._cameraPivot.quaternion);
        right.y = 0;
        right.normalize();
        return right;
    }

    // Allow dynamic adjustment of camera offsets
    SetCameraOffset(x, y, z) {
        this._cameraOffset.set(x, y, z);
    }

    SetLookatOffset(x, y, z) {
        this._lookatOffset.set(x, y, z);
    }

    // Get current target for debugging
    GetTarget() {
        return this._target;
    }

    // Update target if needed
    SetTarget(newTarget) {
        this._target = newTarget;
        this._InitializePositions();
    }

    // Get mouse lock status
    IsMouseLocked() {
        return this._isMouseLocked;
    }

    // Get current camera angles (useful for debugging)
    GetAngles() {
        return {
            azimuthal: this._azimuthalAngle,
            polar: this._polarAngle
        };
    }
}

export { ThirdPersonCamera };
