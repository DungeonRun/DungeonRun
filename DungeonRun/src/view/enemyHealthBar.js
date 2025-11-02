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

        // Create background (grey)
        const bgGeometry = new THREE.PlaneGeometry(this.width, this.height);
        const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.7, depthTest: false });
        this.bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        this.bgMesh.renderOrder = 999; // Always on top

        // Create foreground (green/red)
        const fgGeometry = new THREE.PlaneGeometry(this.width, this.height);
        const fgMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.9, depthTest: false });
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
        // Change color if low
        this.fgMesh.material.color.set(healthPercent > 0.3 ? 0x00ff00 : 0xff0000);
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

        // Always face the camera - FIXED: Use camera's world position and lookAt
        const cameraPosition = new THREE.Vector3();
        camera.getWorldPosition(cameraPosition);
        
        // Make health bar look at camera while keeping it upright
        this.group.lookAt(cameraPosition);
        
        // Ensure health bar stays upright (only rotate around Y axis)
        // This prevents the health bar from tilting when camera moves vertically
        const euler = new THREE.Euler();
        euler.setFromQuaternion(this.group.quaternion);
        euler.x = 0; // Lock X rotation
        euler.z = 0; // Lock Z rotation
        this.group.quaternion.setFromEuler(euler);
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