// physics.js - Gravity and ground collision system
import * as THREE from 'three';

export class PhysicsController {
    constructor(model, scene, groundOffset = 0) {
        this.model = model;
        this.scene = scene;
        this.groundOffset = groundOffset; // Height offset from ground (for model pivot point)
        
        // Physics properties
        this.gravity = -20; // Gravity acceleration (units per second squared)
        this.verticalVelocity = 0; // Current vertical velocity
        this.isGrounded = false; // Is the character on the ground?
        this.groundY = 0; // Current ground height
        
        // Raycaster for ground detection
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 100; // Maximum raycast distance
        
        // Jump properties
        this.canJump = true;
        this.jumpForce = 8; // Initial jump velocity
    }
    
    /**
     * Apply gravity and update vertical position
     */
    update(delta) {
        if (!this.model) return;
        
        // Detect ground
        this.detectGround();
        
        // Apply gravity if not grounded
        if (!this.isGrounded) {
            this.verticalVelocity += this.gravity * delta;
        } else {
            // Reset vertical velocity when grounded
            this.verticalVelocity = 0;
            
            // Snap to ground with offset
            this.model.position.y = this.groundY + this.groundOffset;
        }
        
        // Apply vertical velocity
        this.model.position.y += this.verticalVelocity * delta;
        
        // Prevent falling through world floor (safety check)
        if (this.model.position.y < this.groundOffset) {
            this.model.position.y = this.groundOffset;
            this.verticalVelocity = 0;
            this.isGrounded = true;
        }
    }
    
    /**
     * Detect ground below the character using raycast
     */
    detectGround() {
        if (!this.model) return;
        
        // Cast ray from above the character downward
        const rayOrigin = new THREE.Vector3(
            this.model.position.x,
            this.model.position.y + 2, // Start from above the character
            this.model.position.z
        );
        const rayDirection = new THREE.Vector3(0, -1, 0);
        
        this.raycaster.set(rayOrigin, rayDirection);
        
        // Get all scene objects that could be ground (exclude character itself)
        const objectsToTest = this.getGroundObjects();
        
        const intersects = this.raycaster.intersectObjects(objectsToTest, true);
        
        if (intersects.length > 0) {
            const groundPoint = intersects[0].point;
            const distanceToGround = rayOrigin.y - groundPoint.y;
            
            // Check if character is close to ground (within small threshold)
            const groundThreshold = 2.1; // Slightly more than ray origin offset
            
            if (distanceToGround <= groundThreshold) {
                this.isGrounded = true;
                this.groundY = groundPoint.y;
            } else {
                this.isGrounded = false;
            }
        } else {
            // No ground detected, character is falling
            this.isGrounded = false;
        }
    }
    
    /**
     * Get all objects that should be considered as ground
     */
    getGroundObjects() {
        return this.scene.children.filter(obj => {
            // Exclude the character itself and lights
            if (obj === this.model) return false;
            if (obj.type === 'Light' || obj.type === 'SpotLight' || obj.type === 'PointLight') return false;
            if (obj.name === 'player') return false;
            
            // Include meshes that could be ground
            return obj.isMesh || (obj.children && obj.children.some(child => child.isMesh));
        });
    }
    
    /**
     * Make the character jump
     */
    jump() {
        if (this.isGrounded && this.canJump) {
            this.verticalVelocity = this.jumpForce;
            this.isGrounded = false;
        }
    }
    
    /**
     * Set ground offset (useful for different character sizes)
     */
    setGroundOffset(offset) {
        this.groundOffset = offset;
    }
    
    /**
     * Get current grounded state
     */
    getIsGrounded() {
        return this.isGrounded;
    }
}