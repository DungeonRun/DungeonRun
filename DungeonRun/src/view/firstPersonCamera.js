import * as THREE from 'three';

/**
 * First Person Camera implementation
 * Features:
 * - Camera positioned at player's eye level
 * - Independent mouse look (rotation)
 * - Smooth following
 * - Compatible with third-person camera system
 */
class FirstPersonCamera {
    constructor(params) {
        this._params = params;
        this._camera = params.camera;
        this._target = params.target; // The avatar model
        this._scene = params.scene;

        // Camera pivot for independent rotation
        this._cameraPivot = new THREE.Object3D();
        this._scene.add(this._cameraPivot);
        
        // Remove camera from scene and add to pivot
        this._scene.remove(this._camera);
        this._cameraPivot.add(this._camera);

        // First-person camera configuration
        this._cameraOffset = new THREE.Vector3(0, 1.6, 0); // Eye level height
        this._eyeHeight = 1.6;

        // Mouse sensitivity and rotation limits
        this._mouseSensitivity = 0.0025;
        this._minPolarAngle = Math.PI * 0.1; // Look up limit
        this._maxPolarAngle = Math.PI * 0.9; // Look down limit
        
        // Current rotation angles
        this._azimuthalAngle = 0; // Horizontal rotation
        this._polarAngle = Math.PI * 0.5; // Vertical rotation (start looking forward)
        
        // Smooth following
        this._currentPivotPosition = new THREE.Vector3();
        this._positionSmoothSpeed = 0.2; // Fast and responsive for FPS

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
            this._currentPivotPosition.y += this._eyeHeight;
            this._cameraPivot.position.copy(this._currentPivotPosition);
            
            // Set camera at origin of pivot (looking forward)
            this._camera.position.set(0, 0, 0);
            this._camera.rotation.set(0, 0, 0);
            
            // Update initial rotation
            this._UpdateCameraRotation();
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
                // Prevent re-locking when player is dead
                this._isMouseLocked = false;
            }
        });

        // Mouse movement for camera rotation
        document.addEventListener('mousemove', (event) => {
            if (!this._isMouseLocked) return;

            // Update rotation angles based on mouse movement
            this._azimuthalAngle -= event.movementX * this._mouseSensitivity;
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

    _UpdateCameraRotation() {
        // Apply rotation to the camera pivot
        // Azimuthal (horizontal) rotation around Y axis
        // Polar (vertical) rotation
        
        const euler = new THREE.Euler(
            this._polarAngle - Math.PI * 0.5, // Adjust for coordinate system
            this._azimuthalAngle,
            0,
            'YXZ' // Important: YXZ order prevents gimbal lock
        );
        
        this._cameraPivot.quaternion.setFromEuler(euler);
    }

    Update(deltaTime) {
        if (!this._target) return;

        // Clamp delta time to prevent large jumps
        const clampedDelta = Math.min(deltaTime, 0.1);

        // Smoothly follow target position
        const targetPosition = this._target.position.clone();
        targetPosition.y += this._eyeHeight;
        
        const positionT = 1.0 - Math.pow(1 - this._positionSmoothSpeed, clampedDelta * 60);
        this._currentPivotPosition.lerp(targetPosition, positionT);
        this._cameraPivot.position.copy(this._currentPivotPosition);

        // Update camera rotation based on mouse input
        this._UpdateCameraRotation();
    }

    // Get camera forward direction (for movement calculations)
    GetForwardVector() {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this._cameraPivot.quaternion);
        forward.y = 0; // Remove vertical component for movement
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

    // Get camera direction for character movement
    GetCameraDirection() {
        return this.GetForwardVector();
    }

    // Update target if needed
    SetTarget(newTarget) {
        this._target = newTarget;
        this._InitializePositions();
    }

    // Get current target
    GetTarget() {
        return this._target;
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

    // Exit pointer lock
    cleanup() {
        if (this._isMouseLocked) {
            document.exitPointerLock();
        }
    }

    // Set eye height dynamically
    SetEyeHeight(height) {
        this._eyeHeight = height;
        this._cameraOffset.y = height;
    }
}

export { FirstPersonCamera };