import * as THREE from 'three';

export class FirstPersonCamera {
    constructor({ camera, target, scene }) {
        this._camera = camera;
        this._target = target;
        this._scene = scene;
        
        // Camera settings
        this._currentPosition = new THREE.Vector3();
        this._currentLookAt = new THREE.Vector3();
        
        // Mouse control
        this._phi = 0; // vertical rotation
        this._theta = 0; // horizontal rotation
        this._mouseSensitivity = 0.002;
        this._minPhi = -Math.PI / 2 + 0.1; // prevent camera flip
        this._maxPhi = Math.PI / 2 - 0.1;
        
        // Head offset (position relative to character model)
        this._headOffset = new THREE.Vector3(0, 1.6, 0); // eye level
        
        // Mouse lock state
        this._isMouseLocked = false;
        
        // Bind mouse move handler
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onPointerLockChange = this._onPointerLockChange.bind(this);
        this._onPointerLockError = this._onPointerLockError.bind(this);
        
        // Setup pointer lock
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        document.addEventListener('pointerlockerror', this._onPointerLockError);
    }
    
    _onMouseMove(event) {
        if (!this._isMouseLocked) return;
        
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        // Update rotation angles
        this._theta -= movementX * this._mouseSensitivity;
        this._phi -= movementY * this._mouseSensitivity;
        
        // Clamp vertical rotation
        this._phi = Math.max(this._minPhi, Math.min(this._maxPhi, this._phi));
    }
    
    _onPointerLockChange() {
        this._isMouseLocked = document.pointerLockElement === document.body;
        
        if (this._isMouseLocked) {
            document.addEventListener('mousemove', this._onMouseMove);
        } else {
            document.removeEventListener('mousemove', this._onMouseMove);
        }
    }
    
    _onPointerLockError() {
        console.error('Pointer lock error');
    }
    
    RequestPointerLock() {
        if (!this._isMouseLocked) {
            document.body.requestPointerLock();
        }
    }
    
    ExitPointerLock() {
        if (this._isMouseLocked) {
            document.exitPointerLock();
        }
    }
    
    IsMouseLocked() {
        return this._isMouseLocked;
    }
    
    GetRotationAngles() {
        return { theta: this._theta, phi: this._phi };
    }
    
    SetRotationAngles(theta, phi) {
        this._theta = theta;
        this._phi = phi;
    }
    
    Update(timeElapsedS) {
        if (!this._target) return;
        
        // Get character position and rotation
        const targetPosition = this._target.position.clone();
        const targetRotation = this._target.quaternion.clone();
        
        // Calculate camera position at character's head
        const headPosition = targetPosition.clone().add(this._headOffset);
        
        // Calculate look direction based on mouse movement
        const lookDirection = new THREE.Vector3(
            Math.sin(this._theta) * Math.cos(this._phi),
            Math.sin(this._phi),
            Math.cos(this._theta) * Math.cos(this._phi)
        );
        
        // Set camera position and look at point
        this._camera.position.copy(headPosition);
        this._camera.lookAt(headPosition.clone().add(lookDirection));
        
        // Store for character rotation sync
        this._currentPosition.copy(headPosition);
        this._currentLookAt.copy(headPosition.clone().add(lookDirection));
    }
    
    cleanup() {
        this.ExitPointerLock();
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
        document.removeEventListener('pointerlockerror', this._onPointerLockError);
        document.removeEventListener('mousemove', this._onMouseMove);
    }
    
    // Get forward direction for character movement
    GetForwardDirection() {
        const direction = new THREE.Vector3();
        direction.x = Math.sin(this._theta);
        direction.z = Math.cos(this._theta);
        direction.y = 0;
        direction.normalize();
        return direction;
    }
    
    // Get right direction for character movement
    GetRightDirection() {
        const forward = this.GetForwardDirection();
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        right.normalize();
        return right;
    }
}