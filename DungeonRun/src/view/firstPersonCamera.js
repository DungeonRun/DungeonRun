import * as THREE from 'three';

/**
 * FirstPersonCamera (movement-facing)
 * - Eye-level placement (prefers head bone if present)
 * - Faces movement direction when provided (so you see where the avatar is going)
 * - Optionally hides the avatar mesh for true first-person
 * - Smooth position and rotation
 *
 * Usage:
 *   const fp = new FirstPersonCamera({
 *     camera: threeCamera,
 *     target: playerRootObject3D,
 *     eyeHeight: 1.7,
 *     forwardOffset: 0.05,
 *     posLerp: 0.18,
 *     rotLerp: 0.18,
 *     domElement: renderer.domElement // optional: pointer lock mouse
 *   });
 *
 *   // each frame:
 *   // movementVec should be a THREE.Vector3 in world-space indicating where the avatar is moving.
 *   // e.g. new THREE.Vector3(vx, 0, vz) or null if not available.
 *   fp.Update(dt, movementVec);
 *
 *   // to prefer movement-based facing:
 *   fp.SetUseMovementFacing(true);
 *
 *   // optionally hide avatar (so you don't see its body)
 *   fp.hideAvatarForFirstPerson();
 */

class FirstPersonCamera {
  constructor(params = {}) {
    this._params = params;
    this._camera = params.camera || null;
    this._target = params.target || null;

    // configuration
    this._eyeHeight = params.eyeHeight !== undefined ? params.eyeHeight : 1.7;
    this._forwardOffset = params.forwardOffset !== undefined ? params.forwardOffset : 0.05;
    this._posLerp = params.posLerp !== undefined ? params.posLerp : 0.18;
    this._rotLerp = params.rotLerp !== undefined ? params.rotLerp : 0.18;
    this._minPitch = params.minPitch !== undefined ? params.minPitch : -Math.PI / 2 + 0.05;
    this._maxPitch = params.maxPitch !== undefined ? params.maxPitch : Math.PI / 2 - 0.05;
    this._useMovementFacing = params.useMovementFacing !== undefined ? params.useMovementFacing : true;
    this._movementFacingThreshold = params.movementFacingThreshold !== undefined ? params.movementFacingThreshold : 0.001;

    // internal angles (camera looks along negative Z by default in three.js)
    this._yaw = 0;   // horizontal (world Y axis)
    this._pitch = 0; // vertical

    // head bone if available
    this._headObject = null;
    if (this._target && typeof this._target.getObjectByName === 'function') {
      const headNames = ['Head', 'head', 'mixamorigHead', 'Head_N', 'Neck', 'neck', 'Head_01'];
      for (let name of headNames) {
        const found = this._target.getObjectByName(name);
        if (found) {
          this._headObject = found;
          break;
        }
      }
    }

    // temporaries
    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this._tmpQ = new THREE.Quaternion();

    // pointer lock mouse look (optional)
    if (params.domElement && params.enableMouse !== false) {
      this._setupPointerLock(params.domElement);
    }

    if (this._camera) {
      this._camera.near = this._camera.near || 0.01;
      this._camera.far = this._camera.far || 1000;
    }

    // place camera immediately
    this._initializeImmediate();
  }

  // public: choose whether to use movement vector to face
  SetUseMovementFacing(flag) {
    this._useMovementFacing = !!flag;
  }

  // optionally hide avatar meshes so you don't see the front of the avatar.
  // This will make target.visible = false for Mesh objects under the target.
  hideAvatarForFirstPerson() {
    if (!this._target) return;
    this._target.traverse((child) => {
      if (child.isMesh) {
        child.userData._origVisible = child.visible;
        child.visible = false;
      }
    });
  }

  // restore visibility for meshes that were hidden by hideAvatarForFirstPerson
  restoreAvatarVisibility() {
    if (!this._target) return;
    this._target.traverse((child) => {
      if (child.isMesh && child.userData._origVisible !== undefined) {
        child.visible = child.userData._origVisible;
        delete child.userData._origVisible;
      }
    });
  }

  // Immediately set camera position/orientation
  _initializeImmediate() {
    if (!this._camera) return;
    const eye = this._computeEyeWorldPosition();
    this._camera.position.copy(eye);

    // derive an initial yaw: prefer target facing direction so movement feels aligned.
    if (this._target) {
      const q = this._target.getWorldQuaternion(new THREE.Quaternion());
      // model forward: assume local +Z is model forward; convert to world forward
      const modelForward = new THREE.Vector3(0, 0, 1).applyQuaternion(q).setY(0).normalize();
      // if modelForward is near zero fallback to world -Z
      if (modelForward.lengthSq() < 1e-6) modelForward.set(0, 0, -1);
      // yaw = atan2(x, z) so that Euler(pitch,yaw,roll,'YXZ') aligns yaw to forward
      this._yaw = Math.atan2(modelForward.x, modelForward.z);
      // default pitch 0
      this._pitch = 0;
    } else {
      // default
      this._yaw = 0;
      this._pitch = 0;
    }

    // set camera quaternion from yaw/pitch
    const e = new THREE.Euler(this._pitch, this._yaw, 0, 'YXZ');
    this._camera.quaternion.setFromEuler(e);
  }

  // Compute world-space eye position using head bone if available
  _computeEyeWorldPosition() {
    if (this._headObject) {
      this._headObject.getWorldPosition(this._tmpV);
      // apply small forward offset along head's forward
      this._headObject.getWorldQuaternion(this._tmpQ);
      const headForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this._tmpQ).normalize();
      headForward.multiplyScalar(this._forwardOffset);
      return this._tmpV.clone().add(headForward);
    }

    if (this._target) {
      this._target.getWorldPosition(this._tmpV);
      this._tmpV.y += this._eyeHeight;
      // forward offset from target rotation so camera sits slightly ahead
      this._target.getWorldQuaternion(this._tmpQ);
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this._tmpQ);
      forward.setY(0).normalize();
      forward.multiplyScalar(this._forwardOffset);
      return this._tmpV.clone().add(forward);
    }

    return new THREE.Vector3(0, this._eyeHeight, 0);
  }

  // pointer lock
  _setupPointerLock(domElement) {
    this._dom = domElement;
    this._isLocked = false;

    this._dom.addEventListener('click', () => {
      if (this._dom.requestPointerLock) this._dom.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this._isLocked = document.pointerLockElement === this._dom;
    });

    this._onMouseMove = (ev) => {
      if (!this._isLocked) return;
      const mx = ev.movementX || ev.mozMovementX || ev.webkitMovementX || 0;
      const my = ev.movementY || ev.mozMovementY || ev.webkitMovementY || 0;
      const sensitivity = 0.0025;
      this._yaw -= mx * sensitivity;
      this._pitch -= my * sensitivity;
      this._pitch = Math.max(this._minPitch, Math.min(this._maxPitch, this._pitch));
    };

    document.addEventListener('mousemove', this._onMouseMove);
  }

  /**
   * Update the camera each frame.
   * @param {number} dt - delta seconds (optional)
   * @param {THREE.Vector3|null} movementVec - world-space movement direction/velocity (optional).
   *        If provided and non-zero, and useMovementFacing==true, camera will face this direction.
   */
  Update(dt = 1 / 60, movementVec = null) {
    if (!this._camera) return;

    // choose desired yaw:
    let desiredYaw = this._yaw; // default keep current

    // 1) If movementVec provided and we use movement-facing: face movement
    if (this._useMovementFacing && movementVec instanceof THREE.Vector3) {
      // ignore vertical component
      this._tmpV2.copy(movementVec);
      this._tmpV2.y = 0;
      const lenSq = this._tmpV2.lengthSq();
      if (lenSq > this._movementFacingThreshold) {
        // movement direction in world coordinates; compute yaw to face that direction
        // atan2(x, z) aligns with Euler('YXZ') yaw usage
        this._tmpV2.normalize();
        desiredYaw = Math.atan2(this._tmpV2.x, this._tmpV2.z);
      } else {
        // movement vector tiny -> fall back to model forward below
      }
    }

    // 2) If we didn't set desiredYaw from movementVec, use target's facing as fallback
    if (desiredYaw === this._yaw || (this._useMovementFacing && (movementVec == null || !(movementVec instanceof THREE.Vector3)))) {
      if (this._target) {
        this._target.getWorldQuaternion(this._tmpQ);
        // model forward: use local +Z as model forward then convert to world
        const modelForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this._tmpQ).setY(0).normalize();
        if (modelForward.lengthSq() > 1e-6) {
          desiredYaw = Math.atan2(modelForward.x, modelForward.z);
        }
      }
    }

    // smooth yaw towards desiredYaw (shortest angle)
    // compute angle difference and wrap to [-PI,PI]
    const diff = this._wrapAngle(desiredYaw - this._yaw);
    const yawStep = diff * Math.min(1, this._rotLerp);
    this._yaw = this._yaw + yawStep;

    // position smoothing
    const desiredPos = this._computeEyeWorldPosition();
    this._camera.position.lerp(desiredPos, Math.min(1, this._posLerp));

    // apply pitch limits (if pitch modified elsewhere e.g., mouse)
    this._pitch = Math.max(this._minPitch, Math.min(this._maxPitch, this._pitch));

    // compute desired quaternion from pitch/yaw (Euler order YXZ or YXZ? Using 'YXZ' places yaw around Y first)
    const e = new THREE.Euler(this._pitch, this._yaw, 0, 'YXZ');
    const desiredQuat = new THREE.Quaternion().setFromEuler(e);

    // smooth quaternion
    this._camera.quaternion.slerp(desiredQuat, Math.min(1, this._rotLerp));
  }

  // helper: wrap angle to [-PI, PI]
  _wrapAngle(a) {
    let r = a;
    while (r <= -Math.PI) r += Math.PI * 2;
    while (r > Math.PI) r -= Math.PI * 2;
    return r;
  }

  // returns camera forward vector (world space) with Y=0
  GetForwardVector() {
    if (!this._camera) return new THREE.Vector3(0, 0, -1);
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(this._camera.quaternion);
    f.y = 0;
    return f.normalize();
  }

  // returns camera right vector (world space)
  GetRightVector() {
    if (!this._camera) return new THREE.Vector3(1, 0, 0);
    const r = new THREE.Vector3(1, 0, 0).applyQuaternion(this._camera.quaternion);
    r.y = 0;
    return r.normalize();
  }

  // Sync camera yaw with player facing (call when switching from 3rd -> 1st)
  SyncWithPlayerRotation() {
    if (!this._target) return;
    this._target.getWorldQuaternion(this._tmpQ);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this._tmpQ).setY(0).normalize();
    if (forward.lengthSq() > 1e-6) this._yaw = Math.atan2(forward.x, forward.z);
  }

  // dispose listeners
  Dispose() {
    if (this._onMouseMove) {
      document.removeEventListener('mousemove', this._onMouseMove);
      this._onMouseMove = null;
    }
  }
}

export { FirstPersonCamera };
