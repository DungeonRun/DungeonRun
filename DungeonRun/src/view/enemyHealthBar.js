import * as THREE from 'three';

export class EnemyHealthBar {
    constructor(parent, scene, options = {}) {
        this.maxHealth = options.maxHealth || 100;
        this.health = this.maxHealth;
        this.parent = parent;
        this.scene = scene;

        // Bar dimensions
        this.width = options.width || 1.2;
        this.height = options.height || 0.1;

        // Compute bounding box height
        const bbox = new THREE.Box3().setFromObject(parent);
        const bboxSize = new THREE.Vector3();
        bbox.getSize(bboxSize);
        // Place bar above the model
        this.offsetY = bbox.max.y - parent.position.y + (this.height * 0.2);

        // Create background (grey) - FIXED: Use emissive materials
        const bgGeometry = new THREE.PlaneGeometry(this.width, this.height);
        const bgMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x222222, 
            transparent: true, 
            opacity: 0.9, // Increased opacity
            depthTest: false,
            toneMapped: false // Important: disable tone mapping for consistent colors
        });
        this.bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        this.bgMesh.renderOrder = 999;

        // Create foreground (green/red) - FIXED: Use emissive materials
        const fgGeometry = new THREE.PlaneGeometry(this.width, this.height);
        const fgMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 1.0, // Full opacity
            depthTest: false,
            toneMapped: false // Important: disable tone mapping
        });
        this.fgMesh = new THREE.Mesh(fgGeometry, fgMaterial);
        this.fgMesh.renderOrder = 1000;

        // Group for easy positioning
        this.group = new THREE.Group();
        this.group.add(this.bgMesh);
        this.group.add(this.fgMesh);

        // Position above parent but add to scene, not parent
        this.group.position.copy(parent.position);
        this.group.position.y += this.offsetY;

        // Add to scene instead of parent to avoid being part of hitbox
        this.scene.add(this.group);
    }

    setHealth(value) {
        this.health = Math.max(0, Math.min(this.maxHealth, value));
        // Scale foreground bar
        const healthPercent = this.health / this.maxHealth;
        this.fgMesh.scale.x = healthPercent;
        this.fgMesh.position.x = -(1 - healthPercent) * this.width / 2;
        
        // Change color if low - FIXED: Ensure colors are bright
        if (healthPercent > 0.3) {
            this.fgMesh.material.color.setHex(0x00ff00); // Bright green
        } else {
            this.fgMesh.material.color.setHex(0xff0000); // Bright red
        }
    }

    update(camera) {
        if (!this.group || !this.parent) return;
        
        // Rudimentary culling: skip updating / hide when far from camera
        try {
            const camPos = new THREE.Vector3();
            camera.getWorldPosition(camPos);
            const distSq = camPos.distanceToSquared(this.parent.position);
            if (distSq > (60 * 60)) {
                if (this.group.visible) this.group.visible = false;
                return;
            } else {
                if (!this.group.visible) this.group.visible = true;
            }
        } catch (e) {
            // ignore culling errors and continue updating
        }

        // Update position to follow parent
        this.group.position.copy(this.parent.position);
        this.group.position.y += this.offsetY;

        // Always face the camera - IMPROVED: Use camera's world matrix directly
        // This works regardless of whether camera is in first-person or third-person mode
        this.group.lookAt(camera.getWorldPosition(new THREE.Vector3()));
    }

    remove() {
        if (this.group && this.scene) {
            this.scene.remove(this.group);
        }
        if (this.bgMesh) {
            this.bgMesh.geometry.dispose();
            this.bgMesh.material.dispose();
        }
        if (this.fgMesh) {
            this.fgMesh.geometry.dispose();
            this.fgMesh.material.dispose();
        }
        
        this.group = null;
        this.bgMesh = null;
        this.fgMesh = null;
        this.parent = null;
        this.scene = null;
    }
}