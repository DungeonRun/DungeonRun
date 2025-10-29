import * as THREE from 'three';

/**
 * First Person Camera implementation
 * Features:
 * - Camera positioned at player's eye level
 * - Mouse controls both camera view and player rotation
 * - Smooth mouse look with vertical angle limits
 * - Player rotates in the direction of camera look
 */
class FirstPersonCamera {
    constructor(params) {
        this._params = params;
        this._camera = params.camera;
        this._target = params.target; // The avatar model
        
        // Camera positioning - directly at avatar's face/eyes
        this._eyeHeight = 1.6; // Eye level height from player feet
        this._eyeForwardOffset = 0.1; // Slight forward offset to be at face level
        this._eyeOffset = new THREE.Vector3(0, this._eyeHeight, this._eyeForwardOffset);
        
        // Mouse sensitivity and rotation limits
        this._mouseSensitivity = 0.002;
        this._minPolarAngle = -Math.PI / 3; // Look up limit (60 degrees)
        this._maxPolarAngle = Math.PI / 3;  // Look down limit (60 degrees)
        
        // Current rotation angles
        this._verticalAngle = 0; // Vertical look angle (pitch)
        this._horizontalAngle = 0; // Horizontal look angle (yaw) - will control player rotation
        
        // Mouse control state
        this._isMouseLocked = false;
        
        // Initialize camera position
        this._InitializeCamera();
        this._SetupMouseControls();
    }

    _InitializeCamera() {
        if (this._target) {
            // Position camera at eye level
            const eyePosition = this._target.position.clone().add(this._eyeOffset);
            this._camera.position.copy(eyePosition);
            
            // Set initial rotation based on player's facing direction
            const playerForward = new THREE.Vector3(0, 0, 1);
            playerForward.applyQuaternion(this._target.quaternion);
            this._horizontalAngle = Math.atan2(playerForward.x, playerForward.z);
            
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

            // Update horizontal angle (player rotation)
            this._horizontalAngle -= event.movementX * this._mouseSensitivity;
            
            // Update vertical angle (camera pitch) with limits
            this._verticalAngle -= event.movementY * this._mouseSensitivity;
            this._verticalAngle = Math.max(this._minPolarAngle, Math.min(this._maxPolarAngle, this._verticalAngle));
        });

        // ESC to unlock mouse
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this._isMouseLocked) {
                document.exitPointerLock();
            }
        });
    }

    _UpdateCameraRotation() {
        // Apply rotation to camera
        // First apply horizontal rotation, then vertical
        const euler = new THREE.Euler(this._verticalAngle, this._horizontalAngle, 0, 'YXZ');
        this._camera.quaternion.setFromEuler(euler);
    }

    Update(deltaTime) {
        if (!this._target) return;

        // Update camera position to follow player at eye level
        const eyePosition = this._target.position.clone().add(this._eyeOffset);
        this._camera.position.copy(eyePosition);
        
        // Update camera rotation
        this._UpdateCameraRotation();
        
        // Rotate player to face camera direction (only horizontal rotation)
        const playerRotation = new THREE.Quaternion();
        playerRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this._horizontalAngle);
        
        // Smoothly rotate player to match camera direction
        this._target.quaternion.slerp(playerRotation, 0.15);
    }

    // Get camera forward direction (for movement calculations)
    GetForwardVector() {
        const forward = new THREE.Vector3(0, 0, -1);
        const euler = new THREE.Euler(0, this._horizontalAngle, 0, 'YXZ');
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        forward.applyQuaternion(quaternion);
        forward.normalize();
        return forward;
    }

    // Get camera right vector (for strafing)
    GetRightVector() {
        const right = new THREE.Vector3(1, 0, 0);
        const euler = new THREE.Euler(0, this._horizontalAngle, 0, 'YXZ');
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        right.applyQuaternion(quaternion);
        right.normalize();
        return right;
    }

    // Get current target
    GetTarget() {
        return this._target;
    }

    // Update target if needed
    SetTarget(newTarget) {
        this._target = newTarget;
        this._InitializeCamera();
    }

    // Get mouse lock status
    IsMouseLocked() {
        return this._isMouseLocked;
    }

    // Cleanup
    cleanup() {
        if (this._isMouseLocked) {
            document.exitPointerLock();
        }
    }

    // Get current angles (useful for debugging)
    GetAngles() {
        return {
            horizontal: this._horizontalAngle,
            vertical: this._verticalAngle
        };
    }

    // Sync with player rotation when switching from third person
    SyncWithPlayerRotation() {
        if (!this._target) return;
        
        const playerForward = new THREE.Vector3(0, 0, 1);
        playerForward.applyQuaternion(this._target.quaternion);
        this._horizontalAngle = Math.atan2(playerForward.x, playerForward.z);
        this._verticalAngle = 0; // Reset vertical look
    }
}

export { FirstPersonCamera };