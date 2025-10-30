import * as THREE from 'three';
import { KeyDisplay } from '../view/keyDisplay.js';
import { PlayerHealthBarUI } from '../view/playerHealthBarUI.js';
import { Inventory } from '../view/inventory.js';
import { ProjectileManager } from './projectiles.js';
import { GameOverUI } from '../view/gameOverUI.js';
import { Loader } from '../load/load.js';
import { loadDemoLevel, boxIntersectsMeshBVH } from '../levels/demoLevel.js';
import { loadLevel2 } from '../levels/level2.js';
import { loadLevel3 } from '../levels/level3.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

let isGameOver = false;
let currentLevel = 1; //implementation for level switching.
let keyAnimator = null;
let keyObject = null;
let isKeyGrabbed = false;
let debugMode = false;
let debugHelpers = [];

// Inventory
let inventory;

// Inventory slot indexes
const SLOT_PUNCH = 0;
const SLOT_SWORD = 1;
const SLOT_SPELL = 2;

// cooldown durations (seconds)
const PUNCH_COOLDOWN = 0.6;
const SWORD_COOLDOWN = 1.5;
const SPELL_COOLDOWN = 3.0;

// Attack hitbox configuration (adjust to fit animations)
const ATTACK_CONFIG = {
    punch: {
        delay: 0.12, // seconds after animation start when hit registers
        duration: 0.18, // seconds the hitbox remains active/visible
        distance: 1.4, // forward distance from player origin
        size: new THREE.Vector3(1.0, 1.0, 1.2), // w,h,d
        damage: 8
    },
    sword: {
        delay: 0.18,
        duration: 0.22,
        distance: 1.8,
        size: new THREE.Vector3(1.6, 1.6, 1.4),
        damage: 25
    }
};

// Health
let playerHealthBar;

// Camera setup
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 5);

// Renderer setup
const canvas = document.querySelector('#gameCanvas');
if (!canvas) {
    console.error('Canvas with id="gameCanvas" not found!');
    throw new Error('Canvas element not found');
}
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// Level state
let characterControls;
let thirdPersonCamera;
let enemies = [];

// Game Over UI
let gameOverUI;

//loading
let loader;

//controls
let keyDisplay;

// Projectiles
const projectileManager = new ProjectileManager(scene, camera, enemies);
let projectiles = [];

function clearScene() {
    if (thirdPersonCamera) {
        thirdPersonCamera.cleanup();
    }
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    keyAnimator = null;
    keyObject = null;
    isKeyGrabbed = false;
    characterControls = null;
    thirdPersonCamera = null;
    enemies = [];
    enemies.forEach(enemy => enemy.healthBar && enemy.healthBar.remove());
    
    if (playerHealthBar) {
        playerHealthBar.remove();
        playerHealthBar = null;
    }
    
    if (gameOverUI) {
        gameOverUI.remove();
        gameOverUI = null;
    }

    if (inventory) {
        inventory.remove();
        inventory = null;
    }

    if (keyDisplay) {
        keyDisplay.remove();
        keyDisplay = null;
    }
}

// Level loading
async function loadLevel(levelLoader, levelName = '') {
    loader = new Loader(scene, camera, renderer, levelName);
    loader.show();

    clearScene();
    await levelLoader({
        scene,
        renderer,
        camera,
        loader,
        onPlayerLoaded: ({ model, mixer, animationsMap, characterControls: cc, thirdPersonCamera: cam }) => {
            characterControls = cc;
            thirdPersonCamera = cam;
        },
        onEnemiesLoaded: ({ enemies: enemyArr }) => {
            enemies = enemyArr;
        },
        onKeyLoaded: ({ animator, key }) => {
            keyAnimator = animator;
            keyObject = key;
        }
    });
    loader.hide();

    //show UI
    playerHealthBar = new PlayerHealthBarUI({ maxHealth: 100 });
    gameOverUI = new GameOverUI();
    inventory = new Inventory();
    keyDisplay = new KeyDisplay();
}

// Keyboard controls
const keysPressed = {};

document.addEventListener('keydown', (event) => {
    if (loader && loader.isLoading) return; //to prevent controls during loading

    keysPressed[event.code] = true;
    
    // Use the class-based KeyDisplay
    if (keyDisplay) {
        keyDisplay.down(event.code);
    }

    // Inventory controls (1=punch, 2=sword, 3=spell)
    if (event.code === 'Digit1') inventory && inventory.select && inventory.select(0);
    if (event.code === 'Digit2') inventory && inventory.select && inventory.select(1);
    if (event.code === 'Digit3') inventory && inventory.select && inventory.select(2);
    if (event.code === 'KeyQ') inventory && inventory.switchItem && inventory.switchItem();

    // Player attack / Key pickup (KeyE)
    if (event.code === 'KeyE' && characterControls) {
        // If there's a visible key nearby, prioritize pickup and don't attack
        if (keyObject && !isKeyGrabbed && keyObject.visible) {
            const playerPos = characterControls.model.position;
            const keyPos = keyObject.position;
            const distance = playerPos.distanceTo(keyPos);
            if (distance < 1.0) {
                grabKey();
                return; // don't proceed to attack
            }
        }
        playerAttack();
    }

    // Damage player
    if (event.code === 'KeyH' && playerHealthBar) {
        playerHealthBar.setHealth(playerHealthBar.health - 10);
        if (characterControls) {
            characterControls.health = playerHealthBar.health;
        }
    }

    // Debug mode
    if (event.code === 'KeyP') {
        debugMode = !debugMode;
        updateDebugHelpers();
    }
}, false);

document.addEventListener('keyup', (event) => {
     if (loader && loader.isLoading) return;

    keysPressed[event.code] = false;
    
    // Use the class-based KeyDisplay
    if (keyDisplay) {
        keyDisplay.up(event.code);
    }
}, false);

function grabKey() {
    if (!keyObject || isKeyGrabbed || !characterControls || !keyObject.visible) return;

    isKeyGrabbed = true;
    keyObject.userData.isGrabbed = true;

    characterControls.playPickup();

    if (keyDisplay) {
        keyDisplay.updateKeyStatus('yes');
        keyDisplay.up('KeyE');
    }

    keysPressed['KeyE'] = false;

    const PICKUP_ANIM_MS = 2700;
    setTimeout(() => {
        if (keyObject) { keyObject.visible = false; }
    }, PICKUP_ANIM_MS);

    setTimeout(() => {
        if (isKeyGrabbed && !window._levelSwitched) {
            window._levelSwitched = true;
            switchLevel();
        }
    }, PICKUP_ANIM_MS + 2300);
}

function playerAttack() {
    if (!characterControls || !characterControls.model || !inventory) return;
    const selected = inventory.getSelected();

    if (selected === 'punch') {
        if (!inventory.isOnCooldown(SLOT_PUNCH)) {
            // play punch animation and schedule hitbox
            characterControls.playPunch();
            spawnAttackHitbox('punch');
            inventory.startCooldown(SLOT_PUNCH, PUNCH_COOLDOWN);
        }
    } else if (selected === 'sword') {
        if (!inventory.isOnCooldown(SLOT_SWORD)) {
            characterControls.playSword();
            spawnAttackHitbox('sword');
            inventory.startCooldown(SLOT_SWORD, SWORD_COOLDOWN);
        }
    } else if (selected === 'spell') {
        if (!inventory.isOnCooldown(SLOT_SPELL)) {
            const origin = characterControls.model.position.clone();
            origin.y += 1.2;
            const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(characterControls.model.quaternion);
            projectileManager.fireSpell(origin, direction);
            inventory.startCooldown(SLOT_SPELL, SPELL_COOLDOWN);
        }
    }
}

function swordAttack() {
    // kept for backward compatibility but not used by new timed hitbox system
    return;
}

/**
 * Spawn a timed hitbox for an attack type (punch/sword).
 * The actual hit check runs after the configured delay so it lines up with the animation.
 */
function spawnAttackHitbox(type) {
    if (!characterControls || !characterControls.model) return;
    const cfg = ATTACK_CONFIG[type];
    if (!cfg) return;

    // Visual mesh for debug (created immediately but only visible when debugMode)
    const boxGeo = new THREE.BoxGeometry(cfg.size.x, cfg.size.y, cfg.size.z);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, transparent: true, opacity: 0.6 });
    const hitMesh = new THREE.Mesh(boxGeo, mat);
    hitMesh.name = `hitbox_${type}`;
    hitMesh.visible = debugMode;
    scene.add(hitMesh);

    // Track for debug cleanup
    debugHelpers.push(hitMesh);

    // Schedule the moment the hit actually registers
    const delayMs = Math.max(0, Math.floor(cfg.delay * 1000));
    const durationMs = Math.max(50, Math.floor(cfg.duration * 1000));

    const applyHit = () => {
        // compute center based on current player orientation so timing offset matches animation
        const playerPos = characterControls.model.position.clone();
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(characterControls.model.quaternion).normalize();
        const center = playerPos.clone().add(forward.clone().multiplyScalar(cfg.distance));
        // lift the hitbox a bit to player chest height
        center.y += 1.0;

        // position visual mesh
        hitMesh.position.copy(center);
        // orient mesh to face same forward direction
        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
        hitMesh.quaternion.copy(quat);

        // build Box3 for collision test
        const half = cfg.size.clone().multiplyScalar(0.5);
        const min = center.clone().sub(half);
        const max = center.clone().add(half);
        const hitBox = new THREE.Box3(min, max);

        // debug: ensure visible when enabled
        hitMesh.visible = debugMode;

        // apply damage to enemies that intersect
        enemies.forEach(enemy => {
            if (!enemy.enemyModel) return;
            const enemyBox = new THREE.Box3().setFromObject(enemy.enemyModel);
            if (hitBox.intersectsBox(enemyBox)) {
                // apply damage depending on type
                const dmg = cfg.damage || 1;
                enemy.health = Math.max(0, enemy.health - dmg);
            }
        });

        // keep hitMesh visible for durationMs then remove
        setTimeout(() => {
            // remove visual and from debugHelpers
            const idx = debugHelpers.indexOf(hitMesh);
            if (idx !== -1) debugHelpers.splice(idx, 1);
            if (hitMesh.parent) hitMesh.parent.remove(hitMesh);
        }, durationMs);
    };

    // Initially position hitMesh near player (so you can see it if debugMode is on)
    const initPos = characterControls.model.position.clone().add(new THREE.Vector3(0, 1, 0));
    hitMesh.position.copy(initPos);

    // schedule apply
    setTimeout(applyHit, delayMs);
}

// Animation loop
const clock = new THREE.Clock();
function animate() {
    const mixerUpdateDelta = clock.getDelta();

    if (loader && loader.isLoading || isGameOver) {
        loader.render();
        requestAnimationFrame(animate);
        return;
    }

    if (characterControls) {
        characterControls.update(mixerUpdateDelta, keysPressed);

        // Check for chest interaction (for Open animation)
        if (keysPressed['KeyT'] && !isKeyGrabbed) {
            const playerBox = new THREE.Box3().setFromObject(characterControls.model);
            const nearChest = characterControls.collidables.some(mesh => {
                if (mesh.name.includes('chest_collision')) {
                    return boxIntersectsMeshBVH(playerBox, mesh);
                }
                return false;
            });
            if (nearChest) {
                characterControls.playOpen();
            }
        }

        // Death animation on health <= 0
        if (characterControls.health <= 0 && !isGameOver) {
            characterControls.playDeath();
            isGameOver = true; // Prevent repeated triggers

            if (thirdPersonCamera && thirdPersonCamera.IsMouseLocked()) {
                document.exitPointerLock();
            }
            const cameraPosition = camera.position.clone();
            const cameraRotation = camera.rotation.clone();
            setTimeout(() => {
                //if (characterControls.model) { scene.remove(characterControls.model); }
            },1000)
            
            gameOverUI.show(() => {
                loadLevel(loadDemoLevel);
            });
            characterControls = null;
        }
    }


    enemies.forEach(enemy => {
        enemy.update(mixerUpdateDelta, characterControls);
        if (enemy.healthBar) {
            enemy.healthBar.setHealth(enemy.health);
            enemy.healthBar.update(camera);
        }
    });

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.health <= 0) {
            if (enemy.healthBar) {
                enemy.healthBar.remove();
                enemy.healthBar = null;
            }
            if (enemy.enemyModel) {
                scene.remove(enemy.enemyModel);
            }
            if (enemy.debugHelper) {
                scene.remove(enemy.debugHelper);
                enemy.debugHelper = null;
            }
            enemies.splice(i, 1);
        }
    }

    if (keyAnimator) keyAnimator();

    if (keyObject && !isKeyGrabbed) {
        const allEnemiesDefeated = (enemies.length === 0);
        keyObject.visible = allEnemiesDefeated;
        
        // Only show key interaction prompt when enemies are defeated
        if (allEnemiesDefeated && characterControls) {
            const playerPos = characterControls.model.position;
            const distance = playerPos.distanceTo(keyObject.position);
            if (distance < 3) {
                if (keyDisplay) {
                    keyDisplay.down('KeyE');
                }
                if (distance < 3 && distance > 2) {
                    console.log('Press E to grab the key!');
                }
            } else {
                if (keyDisplay) {
                    keyDisplay.up('KeyE');
                }
            }
        } else {
            if (keyDisplay) {
                keyDisplay.up('KeyE');
            }
        }
    } else {
        if (keyDisplay) {
            keyDisplay.up('KeyE');
        }
    }

    projectileManager.enemies = enemies;
    projectileManager.update(mixerUpdateDelta);

    if (thirdPersonCamera) {
        thirdPersonCamera.Update(mixerUpdateDelta);
    }

    if (playerHealthBar && characterControls) {
        playerHealthBar.setHealth(characterControls.health);
    }

    

    if (debugMode) updateDebugHelpers();

    renderer.render(scene, camera);
    
    requestAnimationFrame(animate);
}

//loading of levels implementation
async function switchLevel() {
    console.log(`Switching from Level ${currentLevel}...`);

    // Determine next level
    if (currentLevel === 1) {
        currentLevel = 2;
        loadLevel(loadLevel2, 'LEVEL 2');
    } 
    else if (currentLevel === 2) {
        currentLevel = 3;
        loadLevel(loadLevel3, 'LEVEL 3');
    } 
    else {
        currentLevel = 1;
        loadLevel(loadDemoLevel, 'LEVEL 1');
    }

    console.log(` Now on Level ${currentLevel}`);
    window._levelSwitched = false;
}

function updateDebugHelpers() {
    debugHelpers.forEach(h => scene.remove(h));
    debugHelpers = [];
    if (!debugMode) return;
    const playerBox = new THREE.Box3().setFromObject(characterControls.model);
    const playerHelper = new THREE.Box3Helper(playerBox, 0x00ff00);
    scene.add(playerHelper);
    debugHelpers.push(playerHelper);

    enemies.forEach(enemy => {
        const box = new THREE.Box3().setFromObject(enemy.enemyModel);
        const helper = new THREE.Box3Helper(box, 0xff0000);
        scene.add(helper);
        debugHelpers.push(helper);
    });

    projectiles.forEach(spell => {
        const box = new THREE.Box3().setFromObject(spell);
        const helper = new THREE.Box3Helper(box, 0xaa00ff);
        scene.add(helper);
        debugHelpers.push(helper);
    });
}

// Resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Use the class-based KeyDisplay
    if (keyDisplay) {
        keyDisplay.updatePosition();
    }
}
window.addEventListener('resize', onWindowResize);

loadLevel(loadDemoLevel, 'LEVEL 1');
animate();