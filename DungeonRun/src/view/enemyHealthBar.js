import * as THREE from 'three';

export class EnemyHealthBar {
    constructor(parent, options = {}) {
        this.maxHealth = options.maxHealth || 100;
        this.health = this.maxHealth;
        this.parent = parent;

        // Bar dimensions
        this.width = options.width || 50.2;
        this.height = options.height || 4;

        // Compute bounding box height
        const bbox = new THREE.Box3().setFromObject(parent);
        const bboxSize = new THREE.Vector3();
        bbox.getSize(bboxSize);
        // Place bar above the model
        this.offsetY = bbox.max.y - parent.position.y + (options.offsetY || this.height * 2);


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

        // Position above parent
        this.group.position.set(0, this.offsetY, 0);

        // Attach to parent
        this.parent.add(this.group);
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
        // Always face the camera
        this.group.quaternion.copy(camera.quaternion);
    }

    remove() {
        if (this.parent && this.group) {
            this.parent.remove(this.group);
        }
    }
}