import * as THREE from 'three';
import { ThirdPersonCamera } from './thirdPersonCamera.js';
import { FirstPersonCamera } from './firstPersonCamera.js';

/**
 * Camera Manager - Handles switching between first and third person cameras
 */
class CameraManager {
    constructor(params) {
        this._scene = params.scene;
        this._camera = params.camera;
        this._target = params.target;
        
        // Camera mode: 'third' or 'first'
        this._currentMode = 'third';
        
        // Initialize both cameras
        this._thirdPersonCamera = new ThirdPersonCamera({
            camera: this._camera,
            target: this._target,
            scene: this._scene
        });
        
        this._firstPersonCamera = new FirstPersonCamera({
            camera: this._camera,
            target: this._target
        });
        
        // Current active camera controller
        this._activeCamera = this._thirdPersonCamera;
        
        // Setup toggle controls
        this._SetupToggleControls();
        
        // UI indicator
        this._CreateModeIndicator();
    }

    _SetupToggleControls() {
        document.addEventListener('keydown', (event) => {
            // Press 'C' to toggle camera mode
            if (event.code === 'KeyC') {
                this.ToggleCamera();
            }
        });
    }

    _CreateModeIndicator() {
        // Create UI element to show current camera mode
        this._indicator = document.createElement('div');
        this._indicator.style.position = 'fixed';
        this._indicator.style.bottom = '20px';
        this._indicator.style.left = '20px';
        this._indicator.style.padding = '10px 15px';
        this._indicator.style.background = 'rgba(0, 0, 0, 0.7)';
        this._indicator.style.color = 'white';
        this._indicator.style.fontFamily = 'Arial, sans-serif';
        this._indicator.style.fontSize = '14px';
        this._indicator.style.borderRadius = '5px';
        this._indicator.style.border = '2px solid #4CAF50';
        this._indicator.style.zIndex = '1000';
        this._indicator.style.transition = 'all 0.3s ease';
        
        this._UpdateIndicator();
        document.body.appendChild(this._indicator);
    }

    _UpdateIndicator() {
        if (this._currentMode === 'third') {
            this._indicator.innerHTML = '📹 Third Person View<br><span style="font-size: 11px; opacity: 0.8;">Press C to switch</span>';
            this._indicator.style.borderColor = '#4CAF50';
        } else {
            this._indicator.innerHTML = '👁️ First Person View<br><span style="font-size: 11px; opacity: 0.8;">Press C to switch</span>';
            this._indicator.style.borderColor = '#2196F3';
        }
    }

    ToggleCamera() {
        if (this._currentMode === 'third') {
            // Switch to first person
            this._currentMode = 'first';
            this._activeCamera = this._firstPersonCamera;
            
            // Sync first person camera with current player rotation
            this._firstPersonCamera.SyncWithPlayerRotation();
            
            console.log('Switched to First Person Camera');
        } else {
            // Switch to third person
            this._currentMode = 'third';
            this._activeCamera = this._thirdPersonCamera;
            
            console.log('Switched to Third Person Camera');
        }
        
        this._UpdateIndicator();
    }

    Update(deltaTime) {
        // Update the active camera
        if (this._activeCamera) {
            this._activeCamera.Update(deltaTime);
        }
    }

    // Get the active camera controller
    GetActiveCamera() {
        return this._activeCamera;
    }

    // Get current mode
    GetMode() {
        return this._currentMode;
    }

    // Check if mouse is locked
    IsMouseLocked() {
        return this._activeCamera ? this._activeCamera.IsMouseLocked() : false;
    }

    // Update target (when player changes)
    SetTarget(newTarget) {
        this._target = newTarget;
        if (this._thirdPersonCamera) {
            this._thirdPersonCamera.SetTarget(newTarget);
        }
        if (this._firstPersonCamera) {
            this._firstPersonCamera.SetTarget(newTarget);
        }
    }

    // Cleanup
    cleanup() {
        if (this._thirdPersonCamera) {
            this._thirdPersonCamera.cleanup();
        }
        if (this._firstPersonCamera) {
            this._firstPersonCamera.cleanup();
        }
        if (this._indicator && this._indicator.parentNode) {
            this._indicator.parentNode.removeChild(this._indicator);
        }
    }

    // Get forward/right vectors from active camera (for movement)
    GetForwardVector() {
        return this._activeCamera ? this._activeCamera.GetForwardVector() : new THREE.Vector3(0, 0, -1);
    }

    GetRightVector() {
        return this._activeCamera ? this._activeCamera.GetRightVector() : new THREE.Vector3(1, 0, 0);
    }
}

export { CameraManager };