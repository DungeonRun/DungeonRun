import * as THREE from 'three';

/**
 * Simple DisposalManager
 * - Enqueue objects (meshes/groups) for staged disposal
 * - Each frame dispose up to `perFrame` items to avoid single-frame GC spikes
 */
export default class DisposalManager {
  constructor(scene, perFrame = 2) {
    this.scene = scene;
    this.queue = [];
    this.perFrame = perFrame;
  }

  /**
   * Enqueue an object (mesh/group) for disposal. The object will be unparented
   * immediately (if still parented) and then its geometries/materials/textures
   * will be disposed over subsequent frames.
   * @param {THREE.Object3D} obj
   */
  enqueue(obj) {
    if (!obj) return;
    // Unparent immediately so it's not rendered
    try {
      if (obj.parent) obj.parent.remove(obj);
    } catch (e) {}

    // Mark for disposal and push to queue
    this.queue.push(obj);
  }

  /**
   * Process up to `perFrame` queued items, disposing their geometries and materials.
   */
  update() {
    let count = 0;
    while (this.queue.length > 0 && count < this.perFrame) {
      const obj = this.queue.shift();
      try {
        this._disposeObject(obj);
      } catch (e) {
        // best-effort disposal
      }
      count++;
    }
  }

  /**
   * Best-effort recursive disposal of object, geometries, materials, and textures.
   * Does not attempt to touch resources owned by other scenes.
   */
  _disposeObject(obj) {
    if (!obj) return;

    obj.traverse((child) => {
      try {
        if (child.geometry) {
          try { child.geometry.dispose(); } catch (e) {}
        }
        if (child.material) {
          // handle material arrays
          const mats = Array.isArray(child.material) ? child.material.slice() : [child.material];
          mats.forEach((m) => {
            try {
              // dispose textures
              if (m.map) { try { m.map.dispose(); } catch (e) {} }
              if (m.lightMap) { try { m.lightMap.dispose(); } catch (e) {} }
              if (m.bumpMap) { try { m.bumpMap.dispose(); } catch (e) {} }
              if (m.normalMap) { try { m.normalMap.dispose(); } catch (e) {} }
              if (m.specularMap) { try { m.specularMap.dispose(); } catch (e) {} }
              if (m.envMap) { try { m.envMap.dispose(); } catch (e) {} }
              if (m.alphaMap) { try { m.alphaMap.dispose(); } catch (e) {} }
            } catch (e) {}
            try { m.dispose(); } catch (e) {}
          });
        }
      } catch (e) {}
    });
  }

  /**
   * Immediately dispose everything in the queue (used during full cleanup)
   */
  flushAll() {
    while (this.queue.length > 0) {
      const obj = this.queue.shift();
      try { this._disposeObject(obj); } catch (e) {}
    }
  }
}
