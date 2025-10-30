import * as THREE from 'three';

class Chest {
    constructor(root, lids, opts = {}) {
        this.root = root;
        this.originalLids = Array.isArray(lids) ? lids : [lids];
        this.pivotHelpers = [];
        this.isOpen = false;
        this.duration = opts.duration ?? 1.2;

        const defaultAngle = (11111 % 360) * Math.PI / 180;
        const pivotOffset = opts.pivotOffset ?? new THREE.Vector3(0, 0, 0.5);
        const openAngle = opts.openAngle ?? defaultAngle;
        const rotationAxis = opts.rotationAxis ?? 'y';

        // Create pivot helpers for each lid
        this.originalLids.forEach((lid, index) => {
            if (!lid) return;

            const originalParent = lid.parent;
            const originalPosition = lid.position.clone();
            const originalRotation = lid.rotation.clone();

            const pivotHelper = new THREE.Object3D();
            pivotHelper.name = `pivot_helper_${index}`;
            
            const hingePosition = originalPosition.clone();
            hingePosition.add(pivotOffset);
            
            pivotHelper.position.copy(hingePosition);
            originalParent.add(pivotHelper);

            originalParent.remove(lid);
            pivotHelper.add(lid);

            lid.position.set(-pivotOffset.x, -pivotOffset.y, -pivotOffset.z);
            lid.rotation.copy(originalRotation);

            this.pivotHelpers.push(pivotHelper);

            console.log(`Lid ${index} (${lid.name}) pivot setup:`);
            console.log(`  Pivot offset:`, pivotOffset.toArray());
            console.log(`  Open angle: ${THREE.MathUtils.radToDeg(openAngle).toFixed(1)}° on ${rotationAxis.toUpperCase()}-axis`);
        });

        // Set up rotation based on axis
        this.closed = this.pivotHelpers.map(p => p.rotation.clone());
        this.open = this.closed.map(r => {
            const newRot = new THREE.Euler();
            newRot.copy(r);
            if (rotationAxis === 'x') {
                newRot.x += openAngle;
            } else if (rotationAxis === 'y') {
                newRot.y += openAngle;
            } else if (rotationAxis === 'z') {
                newRot.z += openAngle;
            }
            return newRot;
        });

        this._t = 0;
        this._from = null;
        this._to = null;

        //  ARTIFACT SETUP 
        this.artifact = opts.artifact || null;
        if (this.artifact) {
            console.log('ARTIFACT SETUP STARTING...');
            console.log('Artifact exists:', !!this.artifact);
            console.log('Root exists:', !!root);
            
            // Add artifact directly to chest root
            root.add(this.artifact);
            console.log('Artifact added to chest root');
            
            // ADJUST THESE VALUES TO POSITION ARTIFACT:
            const artifactY = 0.3;  // ← CHANGE THIS VALUE (try 0.3 to 1.0)
            this.artifact.position.set(0, artifactY, 0);
            
            // Make artifact always visible for testing
            this.artifact.visible = true;
            
            // Force all child meshes to be visible
            this.artifact.traverse((node) => {
                if (node.isMesh) {
                    node.visible = true;
                    node.frustumCulled = false;
                    console.log('    Mesh:', node.name, 'Material:', node.material ? 'YES' : 'NO');
                }
            });
            
            console.log('    Artifact configured:');
            console.log('    Position:', this.artifact.position.toArray());
            console.log('    Scale:', this.artifact.scale.toArray());
            console.log('    Visible:', this.artifact.visible);
            console.log('    Children count:', this.artifact.children.length);
        } else {
            console.log('No artifact provided for this chest');
        }
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this._t = 0;
        this._from = this.pivotHelpers.map(p => p.rotation.clone());
        this._to = this.pivotHelpers.map((p, i) => (
            this.isOpen ? this.open[i].clone() : this.closed[i].clone()
        ));
        
        // Keep artifact visible even when closed for debugging
        if (this.artifact) {
            console.log(`Artifact visibility: ${this.artifact.visible}`);
        }
        
        console.log(`Chest ${this.isOpen ? 'OPENING' : 'CLOSING'}...`);
    }

    update(dt) {
        if (!this._from || !this._to) return;
        
        this._t += dt;
        const t = Math.min(1, this._t / this.duration);
        
        const s = t < 0.5 
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
        
        this.pivotHelpers.forEach((pivot, i) => {
            if (!pivot) return;
            const f = this._from[i];
            const to = this._to[i];
            pivot.rotation.set(
                THREE.MathUtils.lerp(f.x, to.x, s),
                THREE.MathUtils.lerp(f.y, to.y, s),
                THREE.MathUtils.lerp(f.z, to.z, s)
            );
        });
        
        if (t >= 1) {
            this._from = this._to = null;
            console.log(`Chest ${this.isOpen ? 'FULLY OPENED' : 'FULLY CLOSED'}`);
        }
    }
}

export const ChestController = {
    chests: [],
    playerModel: null,
    scene: null,

    init(scene, playerModel) {
        this.scene = scene;
        this.playerModel = playerModel;
        this.chests = [];
        console.log('ChestController initialized');
    },

    setPlayerModel(model) {
        this.playerModel = model;
        console.log('ChestController: player model set');
    },

    registerChest(root, opts = {}) {
        const names = opts.lidNames || ['Lid', 'Lid.001', 'lid', 'lid.001', 'lid001'];
        const lids = [];
        
        for (const n of names) {
            const obj = root.getObjectByName(n);
            if (obj) {
                console.log(`Found lid part: ${obj.name}`);
                lids.push(obj);
            }
        }
        
        if (lids.length === 0) {
            root.traverse(node => {
                if (node.name && /lid/i.test(node.name)) {
                    console.log(`Found lid part: ${node.name}`);
                    lids.push(node);
                }
            });
        }
        
        if (lids.length === 0) {
            console.error('No lid found in chest');
            return null;
        }

        const chest = new Chest(root, lids, opts);
        this.chests.push(chest);
        console.log(`Registered chest #${this.chests.length} with ${lids.length} lid parts`);
        
        return chest;
    },

    getNearestChestDistance() {
        if (!this.playerModel || this.chests.length === 0) return Infinity;
        
        const playerPos = this.playerModel.position;
        let minDist = Infinity;
        
        for (const chest of this.chests) {
            const chestPos = new THREE.Vector3();
            chest.root.getWorldPosition(chestPos);
            const dist = playerPos.distanceTo(chestPos);
            if (dist < minDist) minDist = dist;
        }
        
        return minDist;
    },

    tryInteract(maxDistance = 3) {
        if (!this.playerModel) {
            console.warn('No player model set');
            return false;
        }
        
        const playerPos = this.playerModel.position;
        let closest = null;
        let minDist = maxDistance;
        
        for (const chest of this.chests) {
            const chestPos = new THREE.Vector3();
            chest.root.getWorldPosition(chestPos);
            const dist = playerPos.distanceTo(chestPos);
            
            if (dist < minDist) {
                minDist = dist;
                closest = chest;
            }
        }
        
        if (closest) {
            console.log(`Interacting with chest at distance ${minDist.toFixed(2)}m`);
            closest.toggle();
            return true;
        }
        
        return false;
    },

    update(dt) {
        for (const chest of this.chests) {
            chest.update(dt);
        }
    }
};