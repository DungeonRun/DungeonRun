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

        // Camera configuration - Professional third-person positioning
        // Over-the-shoulder view with realistic distance and angles
        this._cameraOffset = new THREE.Vector3(1.2, 4, -6); // Optimal professional positioning
        this._lookatOffset = new THREE.Vector3(0, 1.6, 1.5); // Look ahead at upper body level

        // Mouse sensitivity and rotation limits
        this._mouseSensitivity = 0.0025; // Slightly increased for better control
        this._minPolarAngle = Math.PI * 0.15; // Allow looking more up
        this._maxPolarAngle = Math.PI * 0.75; // Allow looking more down
        
        // Current rotation angles
        this._azimuthalAngle = Math.PI; // Start behind the player
        this._polarAngle = Math.PI * 0.38; // Optimal viewing angle
        
        // Smooth following with separate speeds
        this._currentPivotPosition = new THREE.Vector3();
        this._currentLookatPosition = new THREE.Vector3();
        this._targetCameraOffset = new THREE.Vector3();
        
        // Smoothing factors for different camera behaviors
        // Higher values = more responsive, lower = smoother but can feel floaty
        this._positionSmoothSpeed = 0.12; // Position following - balanced
        this._rotationSmoothSpeed = 0.15; // Rotation following - smooth
        this._lookAtSmoothSpeed = 0.1; // Look-at smoothing - very smooth to avoid shake
        
        // Camera auto-rotation behind player (when moving)
        this._autoRotateSpeed = 0.015; // VERY GENTLE drift back behind player
        this._autoRotateEnabled = false; // Disabled to eliminate shake - pure free-cam
        
        // Camera state for dynamic adjustments
        this._currentCameraDistance = 6;
        this._targetCameraDistance = 6;

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
            
            if (!this._isMouseLocked && !this._target) {
                //prevent re-locking when player is dead
                this._isMouseLocked = false;
            }
        });

        // Mouse movement for camera rotation
        document.addEventListener('mousemove', (event) => {
            if (!this._isMouseLocked) return;

            // Update rotation angles based on mouse movement
            this._azimuthalAngle += event.movementX * this._mouseSensitivity;
            this._polarAngle += event.movementY * this._mouseSensitivity;

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

    _normalizeAngle(angle) {
        // Normalize angle to [-PI, PI] range for smooth interpolation
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
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

        // Clamp delta time to prevent large jumps
        const clampedDelta = Math.min(deltaTime, 0.1);

        // Use camera's own rotation angle (no player rotation tracking)
        // This eliminates shake from player rotation changes
        const adjustedAzimuthalAngle = this._azimuthalAngle;

        // Smoothly follow target position with frame-rate independent interpolation
        const targetPosition = this._target.position.clone();
        const positionT = 1.0 - Math.pow(1 - this._positionSmoothSpeed, clampedDelta * 60);
        
        this._currentPivotPosition.lerp(targetPosition, positionT);
        this._cameraPivot.position.copy(this._currentPivotPosition);

        // Update camera position with adjusted angle to stay behind player
        this._UpdateCameraPositionWithAngle(adjustedAzimuthalAngle);

        // Smooth lookat following with separate smoothing for more natural feel
        const lookAtT = 1.0 - Math.pow(1 - this._lookAtSmoothSpeed, clampedDelta * 60);
        const idealLookat = targetPosition.clone().add(this._lookatOffset);
        this._currentLookatPosition.lerp(idealLookat, lookAtT);
        
        // Use simple lookAt for stable camera (no quaternion slerp jitter)
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

    //to exit pointer lock
    cleanup() {
        if (this._isMouseLocked) {
            document.exitPointerLock();
        }
    }

}

export { ThirdPersonCamera };
