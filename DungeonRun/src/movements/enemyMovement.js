// enemyMovement.js - Updated with gravity
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { boxIntersectsMeshBVH } from '../levels/demoLevel.js';
import { PhysicsController } from './physics.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * EnemyMovement Class
 * Handles loading, scaling, movement, animations, and attack logic for enemies.
 * Supports Boss, Goblin, and Vampire types with different behaviors.
 */
export class EnemyMovement {
  constructor(scene, modelPath, position, type, onModelLoaded, collidableObjects = []) {
    this.scene = scene;
    this.modelPath = modelPath;
    this.position = position;
    this.type = type;
    this.onModelLoaded = onModelLoaded;
    this.collidableObjects = collidableObjects;

    // Core enemy state
    this.enemyModel = null;
    this.health = 30;
    this.mixer = null;
    this.animationsMap = new Map();
    this.currentAction = null;
    this.animationActions = [];

    // Movement & environment helpers
    this.groundOffset = 0.05; // keeps enemy slightly above ground
    this.raycaster = new THREE.Raycaster();
    this.spotlight = null;
    this.player = null;
    this.healthBar = null;

    // Physics controller will be initialized after model loads
    this.physics = null;

    // Debug
    this.debug = false;

    // Initialize type-specific behavior
    this.setBehaviorByType();

    // Load enemy model
    this.loadModel(this.modelPath);
  }

  /**
   * Defines per-enemy-type attributes.
   */
  setBehaviorByType() {
    switch (this.type.toLowerCase()) {
      case "boss":
        this.speed = 0.015;
        this.detectionRange = 18;
        this.attackRange = 3;
        this.attackCooldown = 3;
        this.scale = 1; // Boss should look big
        this.groundOffset = 0.2;
        break;
      case "goblin":
        this.speed = 0.03;
        this.detectionRange = 12;
        this.attackRange = 2;
        this.attackCooldown = 1.5;
        this.scale = 0.8; // Slightly smaller for goblin
        this.groundOffset = 0.1;
        break;
      case "vampire":
        this.speed = 0.045;
        this.detectionRange = 10;
        this.attackRange = 1.5;
        this.attackCooldown = 1.2;
        this.scale = 0.9; // Taller, faster model
        this.groundOffset = 0.15;
        break;
      default:
        this.speed = 0.02;
        this.detectionRange = 10;
        this.attackRange = 2;
        this.attackCooldown = 2;
        this.scale = 1;
        this.groundOffset = 0.2;
        break;
    }
    this.lastAttackTime = 0;
  }

  /**
   * Loads GLTF enemy model and sets up animations.
   */
  loadModel(url) {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        this.enemyModel = gltf.scene || gltf.scenes[0];
        this.enemyModel.position.copy(this.position);
        this.enemyModel.scale.set(this.scale, this.scale, this.scale);
        this.enemyModel.name = `${this.type.toLowerCase()}_enemy`;

        // Compute bounding box to adjust model origin
        const box = new THREE.Box3().setFromObject(this.enemyModel);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        // Adjust model to align base with ground
        this.enemyModel.position.y -= center.y - size.y / 2;
        this.enemyModel.position.y += this.groundOffset;

        // Add to scene
        this.scene.add(this.enemyModel);

        //this.groundOffset = 0;
        this.physics = new PhysicsController(this.enemyModel, this.scene, this.groundOffset);

        // Set up animations
        this.mixer = new THREE.AnimationMixer(this.enemyModel);
        if (gltf.animations && gltf.animations.length > 0) {
          gltf.animations.forEach((clip) => {
            const action = this.mixer.clipAction(clip);
            this.animationsMap.set(clip.name.toLowerCase(), action);
            this.animationActions.push(action);
          });
        }

        // Default to idle animation
        this.playAnimation("idle");

        // Add light following enemy
        this.initSpotlight();

        // Adjust to ground height
        //this.updateGroundPosition();

        // Callback
        if (typeof this.onModelLoaded === "function") {
          this.onModelLoaded(this.enemyModel);
        }

        if (this.debug) console.log(`${this.type} model loaded successfully`);
      },
      undefined,
      (error) => console.error("Error loading enemy model:", error)
    );
  }

  /**
   * Smooth animation switching.
   */
  playAnimation(nameOrIndex) {
    if (!this.mixer || this.animationActions.length === 0) return;

    let action = null;
    if (typeof nameOrIndex === "number") {
      action = this.animationActions[nameOrIndex];
    } else if (typeof nameOrIndex === "string") {
      action = this.animationsMap.get(nameOrIndex.toLowerCase());
      // Fallback to first available animation if specific one is missing
      if (!action && nameOrIndex.toLowerCase() === "walk" && this.animationsMap.size > 0) {
        action = this.animationsMap.get([...this.animationsMap.keys()][0]);
      }
      if (!action && nameOrIndex.toLowerCase() === "attack" && this.animationsMap.size > 0) {
        action = this.animationsMap.get([...this.animationsMap.keys()][0]);
      }
    }

    if (action && action !== this.currentAction) {
      if (this.currentAction) this.currentAction.fadeOut(0.3);
      this.currentAction = action;
      this.currentAction.reset().fadeIn(0.3).play();
    }
  }

  /**
   * Creates a spotlight that follows the enemy.
   */
  initSpotlight() {
    this.spotlight = new THREE.SpotLight(0xffffff, 1.5, 15, Math.PI / 4, 0.5);
    this.spotlight.position.set(0, 3, 0);
    this.scene.add(this.spotlight);

    const target = new THREE.Object3D();
    this.scene.add(target);
    this.spotlight.target = target;
  }

  /**
   * Keeps enemy attached to the ground.
   */
 /*updateGroundPosition() {
  if (!this.enemyModel) return;

  // Ray starts slightly above the model’s feet
  const origin = this.enemyModel.position.clone().add(new THREE.Vector3(0, 2, 0));
  this.raycaster.set(origin, new THREE.Vector3(0, -1, 0));
  this.raycaster.far = 10;

  // Only include ground-like meshes
  const groundMeshes = [];
  this.scene.traverse((obj) => {
    if (
      obj.isMesh &&
      obj.visible &&
      !obj.name.toLowerCase().includes("enemy") &&
      !obj.name.toLowerCase().includes("player") &&
      !obj.isLight &&
      obj.name.toLowerCase().includes("ground") // Only ground meshes
    ) {
      groundMeshes.push(obj);
    }
  });

  const intersects = this.raycaster.intersectObjects(groundMeshes, true);

  if (intersects.length > 0) {
    const groundY = intersects[0].point.y + this.groundOffset;

    // Smoothly interpolate toward ground level (no flicker)
    this.enemyModel.position.y = THREE.MathUtils.lerp(
      this.enemyModel.position.y,
      groundY,
      0.25
    );
  } else {
    // Fall back to cached ground height if available
    if (this.cachedGroundY !== undefined) {
      this.enemyModel.position.y = THREE.MathUtils.lerp(
        this.enemyModel.position.y,
        this.cachedGroundY + this.groundOffset,
        0.25
      );
    } else {
      // Store initial ground height
      this.cachedGroundY = this.enemyModel.position.y;
    }
  }
}*/

  /**
   * Handles movement and attack logic toward player.
   */
  moveTowardsPlayer(delta, characterControls) {
    if (!this.enemyModel || !this.player) return;

    const direction = new THREE.Vector3();
    direction.subVectors(this.player.position, this.enemyModel.position);
    const distance = direction.length();

    // Attack if close enough
    if (distance < this.attackRange) {
      this.attackPlayer(characterControls);
      return;
    }

    // Move if within detection range
    if (distance < this.detectionRange) {
      direction.normalize();
      const step = direction.multiplyScalar(this.speed);
      this.enemyModel.position.add(step);

      // Rotate to face player
      const targetRotation = Math.atan2(
        this.player.position.x - this.enemyModel.position.x,
        this.player.position.z - this.enemyModel.position.z
      );
      this.enemyModel.rotation.y = targetRotation;

      //old code movement to be refactored
      /*
      const rayOrigin = new THREE.Vector3(
          this.enemyModel.position.x,
          this.enemyModel.position.y + 1,
          this.enemyModel.position.z
      );
      const directionToPlayer = this.player.position.clone().sub(rayOrigin).normalize();
      const moveVec = directionToPlayer.clone();
      moveVec.y = 0;
      moveVec.normalize();
      moveVec.multiplyScalar(this.lag);
      
      this.enemyModel.position.x += moveVec.x;
      this.enemyModel.position.z += moveVec.z;
      */

      // Switch to walk animation
      this.playAnimation("walk");
    } else {
      this.playAnimation("idle");
    }

    //this.updateGroundPosition();
  }

  /**
   * Plays attack animation and reduces player health.
   */
  attackPlayer(characterControls) {
    const now = performance.now() / 1000;
    if (now - this.lastAttackTime < this.attackCooldown) return;

    this.playAnimation("attack");
    this.lastAttackTime = now;

    if (characterControls) { //fixed the issue but it required boding the code to take in characterControls for this method, moveTowardsPlayer(), and update()
      characterControls.health = Math.max(characterControls.health - 2, 0);
    }

    if (this.debug) console.log(`${this.type} attacks the player!`);
  }

  /**
   * Called each frame.
   */
  update(delta, characterControls) {
    if (!this.enemyModel) return;

    if (this.physics) {
        this.physics.update(delta);
    }

    // Find player if not set
    if (!this.player) {
      this.player = this.scene.getObjectByName("player");
    }

    // Perform movement and logic
    this.moveTowardsPlayer(delta, characterControls);

    // Update animations
    if (this.mixer) this.mixer.update(delta);

    // Update spotlight position
    if (this.spotlight && this.enemyModel) {
      this.spotlight.position.copy(this.enemyModel.position).add(new THREE.Vector3(0, 3, 0));
      this.spotlight.target.position.copy(this.enemyModel.position);
      this.spotlight.target.updateMatrixWorld();
    }
  }
}