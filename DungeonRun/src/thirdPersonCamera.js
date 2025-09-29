import * as THREE from 'three';

/**
 * Third Person Camera implementation
 * Based on tutorial approach with smooth following and look-at mechanics
 * Maintains fixed offset behind and above the target (avatar)
 */
class ThirdPersonCamera {
    constructor(params) {
        this._params = params;
        this._camera = params.camera;
        this._target = params.target; // The avatar/player model

        // Current smooth positions for interpolation
        this._currentPosition = new THREE.Vector3();
        this._currentLookat = new THREE.Vector3();

        // Camera configuration
        this._cameraOffset = new THREE.Vector3(-8, 6, -12); // behind, above, and back from player
        this._lookatOffset = new THREE.Vector3(0, 2, 8); // look ahead of player at head height
        
        // Initialize camera positions
        this._InitializePositions();
    }

    _InitializePositions() {
        // Set initial camera position based on target
        if (this._target) {
            const initialOffset = this._CalculateIdealOffset();
            const initialLookat = this._CalculateIdealLookat();
            
            this._currentPosition.copy(initialOffset);
            this._currentLookat.copy(initialLookat);
            
            this._camera.position.copy(this._currentPosition);
            this._camera.lookAt(this._currentLookat);
        }
    }

    _CalculateIdealOffset() {
        // Calculate where the camera should be positioned relative to the target
        const idealOffset = this._cameraOffset.clone();
        idealOffset.applyQuaternion(this._target.quaternion);
        idealOffset.add(this._target.position);
        return idealOffset;
    }

    _CalculateIdealLookat() {
        // Calculate where the camera should be looking relative to the target
        const idealLookat = this._lookatOffset.clone();
        idealLookat.applyQuaternion(this._target.quaternion);
        idealLookat.add(this._target.position);
        return idealLookat;
    }

    Update(deltaTime) {
        if (!this._target) return;

        const idealOffset = this._CalculateIdealOffset();
        const idealLookat = this._CalculateIdealLookat();

        // Smoothing factor - higher values = more responsive, lower = smoother
        // Using the same approach as the tutorial: 1.0 - Math.pow(smoothness, deltaTime)
        const t = 1.0 - Math.pow(0.001, deltaTime);

        // Smoothly interpolate to ideal positions
        this._currentPosition.lerp(idealOffset, t);
        this._currentLookat.lerp(idealLookat, t);

        // Apply to camera
        this._camera.position.copy(this._currentPosition);
        this._camera.lookAt(this._currentLookat);
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
}

export { ThirdPersonCamera };
