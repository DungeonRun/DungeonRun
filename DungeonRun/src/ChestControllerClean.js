import * as THREE from 'three';

class Chest {
    constructor(root, lids, opts = {}) {
        this.root = root;
        this.lids = Array.isArray(lids) ? lids : [lids];
        this.isOpen = false;
        this.duration = opts.duration ?? 0.5;
        this.openOffset = opts.openOffset ?? new THREE.Euler(Math.PI * 0.5, 0, 0);

        this.closed = this.lids.map(l => (l ? l.rotation.clone() : new THREE.Euler()));
        this.open = this.closed.map(r => new THREE.Euler(r.x + this.openOffset.x, r.y + this.openOffset.y, r.z + this.openOffset.z));

        this.lids.forEach((l, i) => { if (l && this.closed[i]) l.rotation.copy(this.closed[i]); });

        this._t = 0; this._from = null; this._to = null;
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this._t = 0;
        this._from = this.lids.map((l, i) => (l ? l.rotation.clone() : this.closed[i].clone()));
        this._to = this.lids.map((l, i) => (this.isOpen ? this.open[i].clone() : this.closed[i].clone()));
        console.log('Chest toggled:', this.isOpen ? 'opening' : 'closing');
    }

    update(dt) {
        if (!this._from || !this._to) return;
        this._t += dt;
        const t = Math.min(1, this._t / this.duration);
        const s = t * t * (3 - 2 * t);
        this.lids.forEach((l, i) => {
            if (!l) return;
            const f = this._from[i], to = this._to[i];
            l.rotation.set(
                THREE.MathUtils.lerp(f.x, to.x, s),
                THREE.MathUtils.lerp(f.y, to.y, s),
                THREE.MathUtils.lerp(f.z, to.z, s)
            );
        });
        if (t >= 1) { this._from = this._to = null; }
    }
}

export const ChestController = {
    chests: [],
    playerModel: null,

    setPlayerModel(model) { this.playerModel = model; console.log('ChestController: player set'); },

    registerChest(root, opts = {}) {
        const names = opts.lidNames || ['lid', 'lid001', 'Lid', 'Lid.001'];
        const lids = [];
        for (const n of names) {
            const o = root.getObjectByName(n);
            if (o) lids.push(o);
        }
        if (lids.length === 0) {
            root.traverse(n => { if (n.name && /lid/i.test(n.name) && n.isMesh) lids.push(n); });
        }
        if (lids.length === 0) {
            console.warn('ChestController: no lid found in', root.name || root.uuid);
            return null;
        }
        const chest = new Chest(root, lids, opts);
        this.chests.push(chest);
        console.log('ChestController: registered chest (lids =', lids.map(x => x.name).join(','), ')');
        return chest;
    },

    tryInteract(maxDistance = 5) {
        if (!this.playerModel) return false;
        const p = this.playerModel.position;
        let closest = null; let dmin = maxDistance;
        for (const c of this.chests) {
            const pos = new THREE.Vector3(); c.root.getWorldPosition(pos);
            const d = pos.distanceTo(p);
            if (d < dmin) { dmin = d; closest = c; }
        }
        if (closest) { closest.toggle(); return true; }
        return false;
    },

    update(dt) { for (const c of this.chests) c.update(dt); }
};
