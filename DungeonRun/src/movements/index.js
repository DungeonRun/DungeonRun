import * as THREE from 'three';
import { KeyDisplay } from '../view/keyDisplay.js';
import { PlayerHealthBarUI } from '../view/playerHealthBarUI.js';
import { Inventory } from '../view/inventory.js';
import { ProjectileManager } from './projectiles.js';
import { GameOverUI } from '../view/gameOverUI.js';
import { Loader } from '../load/load.js';
import { loadDemoLevel, boxIntersectsMeshBVH, cleanupDemoLevel } from '../levels/demoLevel.js';
import { loadLevel2, cleanupLevel2 } from '../levels/level2.js'; // ADD CLEANUP IMPORT
import { loadLevel3, cleanupLevel3 } from '../levels/level3.js'; // ADD CLEANUP IMPORT
import { PauseMenuUI } from '../view/pauseMenuUI.js';
import { GameTimerUI } from '../view/timerUI.js';
import { ChestController } from '../ChestController.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

let isGameOver = false;
let currentLevel = 1;
let keyAnimator = null;
let keyObject = null;
let isKeyGrabbed = false;
let debugMode = false;
let debugHelpers = [];
let occludedMeshes = new Set();
const _occlusionRay = new THREE.Raycaster();
let levelMusic = null;
let debugFrameCounter = 0;

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
        duration: 0.4, // seconds the hitbox remains active/visible
        distance: -1.0, // forward distance from player origin
        size: new THREE.Vector3(1.0, 3.0, 1.2), // w,h,d
        damage: 8
    },
    sword: {
        delay: 0.4,
        duration: 0.22,
        distance: -0.8,
        size: new THREE.Vector3(3.6, 3.6, 1.4),
        damage: 25
    }
};

// Health
let playerHealthBar;

// Pause menu and timer
let pauseMenuUI;
let isPaused = false;
let gameTimer = null;

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

// Debug overlay for telemetry (position/state) shown when debugMode === true
let debugOverlay = null;
function initDebugOverlay() {
    debugOverlay = document.createElement('div');
    debugOverlay.id = 'debugOverlay';
    debugOverlay.style.position = 'absolute';
    debugOverlay.style.right = '10px';
    debugOverlay.style.top = '10px';
    debugOverlay.style.padding = '8px';
    debugOverlay.style.background = 'rgba(0,0,0,0.6)';
    debugOverlay.style.color = '#7CFC00';
    debugOverlay.style.fontFamily = 'monospace';
    debugOverlay.style.fontSize = '12px';
    debugOverlay.style.zIndex = 10000;
    debugOverlay.style.whiteSpace = 'pre';
    debugOverlay.style.display = 'none';
    document.body.appendChild(debugOverlay);
}
initDebugOverlay();

function updateDebugOverlay() {
    if (!debugOverlay) return;
    if (!debugMode) {
        debugOverlay.style.display = 'none';
        return;
    }
    debugOverlay.style.display = 'block';
    const pos = (characterControls && characterControls.model) ? characterControls.model.position : new THREE.Vector3();
    const action = characterControls ? characterControls.currentAction : 'N/A';
    const health = characterControls ? (typeof characterControls.health === 'number' ? characterControls.health : 'N/A') : (playerHealthBar ? 'N/A' : 'N/A');
    const selected = inventory ? inventory.getSelected() : 'N/A';
    const projCount = projectileManager ? (projectileManager.projectiles ? projectileManager.projectiles.length : 0) : (projectiles ? projectiles.length : 0);
    const enemyCount = enemies ? enemies.length : 0;
    const collision = (characterControls && characterControls.lastCollision) ? characterControls.lastCollision : 'none';
    debugOverlay.textContent = `pos: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}\naction: ${action}\nhealth: ${health}\nselected: ${selected}\nkeyGrabbed: ${isKeyGrabbed}\nprojectiles: ${projCount}\nenemies: ${enemyCount}\ncollision: ${collision}`;
}

// Level state
let characterControls;
let thirdPersonCamera;
let enemies = [];

// UI Elements
let gameOverUI;
let loader;
let keyDisplay;

// Projectiles
const projectileManager = new ProjectileManager(scene, enemies);
let projectiles = [];
let removalQueue = [];

// Chest interaction state
let isHoldingChestKey = false;
let chestKeyHoldTime = 0;
const CHEST_OPEN_HOLD_TIME = 0.5; // Hold T for 0.5 seconds to open chest

// === Clear Scene Function ===
function clearScene() {
    if (thirdPersonCamera) thirdPersonCamera.cleanup();
    while (scene.children.length > 0) scene.remove(scene.children[0]);

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

    if (gameOverUI) gameOverUI.remove();
    if (gameTimer) gameTimer.remove();
    if (inventory) inventory.remove();
    if (keyDisplay) keyDisplay.remove();
}

// === Cleanup Current Level ===
function cleanupCurrentLevel() {
    switch (currentLevel) {
        case 1:
            cleanupDemoLevel();
            break;
        case 2:
            cleanupLevel2();
            break;
        case 3:
            cleanupLevel3();
            break;
        default:
            cleanupDemoLevel();
    }
    console.log(`✓ Cleaned up Level ${currentLevel}`);
}

// === Load Level ===
async function loadLevel(levelLoader, levelName = '') {
    loader = new Loader(scene, camera, renderer, levelName);
    loader.show();

    // ⚠️ CLEANUP BEFORE LOADING NEW LEVEL ⚠️
    cleanupCurrentLevel();
    clearScene();

    await levelLoader({
        scene,
        renderer,
        camera,
        loader,
        onPlayerLoaded: ({ model, mixer, animationsMap, characterControls: cc, thirdPersonCamera: cam }) => {
            characterControls = cc;
            thirdPersonCamera = cam;
            ChestController.setPlayerModel(model);
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

    // play level-specific music (level1.mp3, level2.mp3, ... in src/sounds)
    try {
        playMusicForLevel(currentLevel);
    } catch (e) {
        console.warn('Could not play level music:', e);
    }

    // === Initialize Timer ===
    gameTimer = new GameTimerUI();
    gameTimer.reset();
    gameTimer.start();

    // === Initialize UI Elements ===
    playerHealthBar = new PlayerHealthBarUI({ maxHealth: 100 });
    gameOverUI = new GameOverUI();
    pauseMenuUI = new PauseMenuUI();
    inventory = new Inventory();
    keyDisplay = new KeyDisplay();
}

function playMusicForLevel(level) {
    // stop previous
    try {
        if (levelMusic) {
            levelMusic.pause();
            levelMusic = null;
        }
        const path = `./src/sounds/level${level}.mp3`;
        levelMusic = new Audio(path);
        levelMusic.loop = true;
        levelMusic.volume = 0.45;
        // ignore play promise rejection (autoplay policy) — will play after user gesture
        levelMusic.play().catch(() => {});
    } catch (e) {
        console.warn('playMusicForLevel error', e);
    }
}

// === Keyboard Controls ===
const keysPressed = {};
document.addEventListener('keydown', (event) => {
    if (loader && loader.isLoading) return;

    // F1 key to toggle pause
    if (event.key === 'm') {
        event.preventDefault(); // Prevent browser's default F1 behavior
        togglePause();
        return;
    }

    if (isPaused) return;

    // Always mark the key as pressed for continuous controls
    keysPressed[event.code] = true;
    if (keyDisplay) keyDisplay.down(event.code);

    // One-shot actions should only run on initial keydown (avoid heavy repeated work during auto-repeat)
    const firstPress = !event.repeat;

    // Try pickup from open chest first (artifact/potion)
    if (firstPress && event.code === 'KeyR') {
        if (tryPickupChestArtifact()) return;
    }

    // Key pickup - R key (explicit grab when near)
    if (firstPress && event.code === 'KeyR' && keyObject && !isKeyGrabbed && characterControls) {
        const playerPos = characterControls.model.position;
        const keyPos = keyObject.position;
        if (playerPos.distanceTo(keyPos) < 1.0) grabKey();
    }

    // Chest interaction - T key (hold to open)
    if (firstPress && event.code === 'KeyT' && characterControls) {
        const nearestDist = ChestController.getNearestChestDistance();
        if (nearestDist < 3) {
            isHoldingChestKey = true;
            chestKeyHoldTime = 0;
            characterControls.playOpen();
        }
    }

    // Quick chest toggle - C key (instant toggle)
    if (firstPress && event.code === 'KeyC' && characterControls) {
        const interacted = ChestController.tryInteract();
        if (interacted) {
            console.log('✓ Chest toggled');
        } else {
            console.log('No chest nearby to interact with');
        }
    }
    // Inventory controls (1=punch, 2=sword, 3=spell) - only on initial press
    if (firstPress) {
        if (event.code === 'Digit1') inventory && inventory.select && inventory.select(0);
        if (event.code === 'Digit2') inventory && inventory.select && inventory.select(1);
        if (event.code === 'Digit3') inventory && inventory.select && inventory.select(2);
        if (event.code === 'KeyQ') inventory && inventory.switchItem && inventory.switchItem();
    }

    // Player attack / Key pickup (KeyE)
    if (event.code === 'KeyE' && characterControls && firstPress) {
        playerAttack();
    }

    // Damage player (single press)
    if (firstPress && event.code === 'KeyH' && playerHealthBar) {
        playerHealthBar.setHealth(playerHealthBar.health - 10);
        if (characterControls) characterControls.health = playerHealthBar.health;
    }

    // Debug mode (toggle only on initial press)
    if (firstPress && event.code === 'KeyP') {
        debugMode = !debugMode;
        updateDebugHelpers();
    }
}, false);

document.addEventListener('keyup', (event) => {
    if ((loader && loader.isLoading) || isPaused) return;
    keysPressed[event.code] = false;
    if (keyDisplay) keyDisplay.up(event.code);

    // Stop chest opening when T is released
    if (event.code === 'KeyT') {
        isHoldingChestKey = false;
        chestKeyHoldTime = 0;
    }
}, false);

// === Key Grab Logic ===
function grabKey() {
    if (!keyObject || isKeyGrabbed || !characterControls || !keyObject.visible) return;

    isKeyGrabbed = true;
    keyObject.userData.isGrabbed = true;
    gameTimer.stop();
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

    // lightweight hitbox object using distance checks to avoid Box3 allocations
    const hitbox = {
        type,
        cfg,
        active: false,
        hits: new Set(),
        debugMesh: null
    };

    // create debug mesh but only add to scene if debugMode is on
    try {
        const boxGeo = new THREE.BoxGeometry(cfg.size.x, cfg.size.y, cfg.size.z);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff8800, wireframe: true, transparent: true, opacity: 0.9 });
        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.visible = !!debugMode;
        hitbox.debugMesh = mesh;
        if (mesh.visible) scene.add(mesh);
        debugHelpers.push(mesh);
    } catch (e) {
        // ignore
    }

    const delayMs = Math.max(0, Math.floor(cfg.delay * 1000));
    const removeMs = Math.max(50, Math.floor((cfg.delay + cfg.duration) * 1000));

    // Activate hit after delay
    setTimeout(() => {
        hitbox.active = true;

        // compute center in front of player
        const playerPos = characterControls.model.position.clone();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(characterControls.model.quaternion).normalize();
        const center = playerPos.clone().add(forward.multiplyScalar(cfg.distance));
        center.y += cfg.size.y * 0.25;

        if (hitbox.debugMesh) {
            hitbox.debugMesh.position.copy(center);
            hitbox.debugMesh.rotation.copy(characterControls.model.rotation);
            if (!scene.children.includes(hitbox.debugMesh)) scene.add(hitbox.debugMesh);
            hitbox.debugMesh.visible = !!debugMode;
        }

        // check enemies using cached radii
        for (let i = 0; i < enemies.length; ++i) {
            const enemy = enemies[i];
            if (!enemy || !enemy.enemyModel) continue;
            const enemyPos = enemy.enemyModel.position;
            const enemyRadius = (enemy.enemyModel.userData && enemy.enemyModel.userData.radius) ? enemy.enemyModel.userData.radius : 1.0;
            const hitExtent = Math.max(cfg.size.x, cfg.size.z) * 0.5;
            const r = enemyRadius + hitExtent;
            if (center.distanceToSquared(enemyPos) <= r * r) {
                if (!hitbox.hits.has(enemy)) {
                    enemy.health = Math.max(0, enemy.health - cfg.damage);
                    if (enemy.healthBar) enemy.healthBar.setHealth(enemy.health);
                    hitbox.hits.add(enemy);
                    if (type === 'punch') break; // punch only hits one enemy
                }
            }
        }
    }, delayMs);

    // cleanup debug mesh after its duration
    setTimeout(() => {
        if (hitbox.debugMesh) {
            const idx = debugHelpers.indexOf(hitbox.debugMesh);
            if (idx !== -1) debugHelpers.splice(idx, 1);
            try { if (hitbox.debugMesh.parent) hitbox.debugMesh.parent.remove(hitbox.debugMesh); } catch (e) {}
            hitbox.debugMesh = null;
        }
        hitbox.active = false;
    }, removeMs);
}

// === Pause Menu Handling ===
function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;

    if (isPaused) {
        Object.keys(keysPressed).forEach(k => keysPressed[k] = false);
        if (thirdPersonCamera && thirdPersonCamera.IsMouseLocked()) document.exitPointerLock();
        gameTimer.stop(); // ⏸️ Stop timer on pause

        pauseMenuUI.show(
            () => {
                isPaused = false;
                gameTimer.start(); // ▶️ Resume timer on continue
            },
            () => {
                isPaused = false;
                isGameOver = false;
                window._levelSwitched = false;
                // ⚠️ CLEANUP BEFORE RESTARTING LEVEL ⚠️
                cleanupCurrentLevel();
                let levelToLoad = currentLevel === 2 ? loadLevel2 : currentLevel === 3 ? loadLevel3 : loadDemoLevel;
                loadLevel(levelToLoad);
            }
        );
    } else {
        pauseMenuUI.hide();
        gameTimer.start();
    }
}

// === Main Game Loop ===
const clock = new THREE.Clock();
function animate() {
    const delta = clock.getDelta();

    if (loader && loader.isLoading || isGameOver) {
        loader.render();
        requestAnimationFrame(animate);
        return;
    }

    if (!isPaused) {
        if (characterControls) {
            characterControls.update(delta, keysPressed);

            // Handle chest opening with T key held
            if (isHoldingChestKey) {
                chestKeyHoldTime += delta;
                if (chestKeyHoldTime >= CHEST_OPEN_HOLD_TIME) {
                    const interacted = ChestController.tryInteract();
                    if (interacted) console.log('✓ Chest opened after holding T');
                    isHoldingChestKey = false;
                    chestKeyHoldTime = 0;
                }
            }
        }

        // Death animation on health <= 0
        if (characterControls.health <= 0 && !isGameOver) {
            characterControls.playDeath();
            isGameOver = true; // Prevent repeated triggers
            if (gameTimer) gameTimer.stop();

            if (thirdPersonCamera && thirdPersonCamera.IsMouseLocked()) {
                document.exitPointerLock();
            }
            const cameraPosition = camera.position.clone();
            const cameraRotation = camera.rotation.clone();
            setTimeout(() => {
                //if (characterControls.model) { scene.remove(characterControls.model); }
            },1000)
            
            gameOverUI.show(() => {
                // ⚠️ CLEANUP BEFORE RESTARTING LEVEL ⚠️
                cleanupCurrentLevel();
                loadLevel(loadDemoLevel);
            });
            characterControls = null;
        }
    }

    ChestController.update(delta);


        enemies.forEach(enemy => {
            enemy.update(delta, characterControls);
            if (enemy.healthBar) {
                enemy.healthBar.setHealth(enemy.health);
                enemy.healthBar.update(camera);
            }
        });

        // batch enemy removals to avoid single-frame spikes
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (enemy.health <= 0) {
                removalQueue.push(enemy);
                enemies.splice(i, 1);
            }
        }
        // process up to 2 removals per frame
        let removalsThisFrame = 0;
        while (removalQueue.length > 0 && removalsThisFrame < 2) {
            const enemy = removalQueue.shift();
            try {
                if (enemy.enemyModel) scene.remove(enemy.enemyModel);
                if (enemy.healthBar) enemy.healthBar.remove();
                if (enemy.debugHelper) {
                    scene.remove(enemy.debugHelper);
                    enemy.debugHelper = null;
                }
            } catch (e) { console.warn('Error removing enemy:', e); }
            removalsThisFrame++;
        }

        if (keyAnimator) keyAnimator();



        // Key pickup prompt (R)
        if (keyObject && !isKeyGrabbed) {
        const allEnemiesDefeated = (enemies.length === 0);
        keyObject.visible = allEnemiesDefeated;
        
        // Only show key interaction prompt when enemies are defeated
        if (allEnemiesDefeated && characterControls) {
            const playerPos = characterControls.model.position;
            const distance = playerPos.distanceTo(keyObject.position);
            if (distance < 3) {
                if (keyDisplay) {
                    keyDisplay.down('KeyR');
                }
                if (distance < 3 && distance > 2) {
                    console.log('Press R to grab the key!');
                }
            } else {
                if (keyDisplay) {
                    keyDisplay.up('KeyR');
                }
            }
        } else {
            if (keyDisplay) {
                keyDisplay.up('KeyR');
            }
        }
    } else {
        if (keyDisplay) {
            keyDisplay.up('KeyR');
        }
    }

        // Chest prompts (T hold, C toggle)
        if (characterControls && keyDisplay) {
            const nearestChestDistance = ChestController.getNearestChestDistance();
            if (nearestChestDistance < 3) {
                keyDisplay.down('KeyT');
                keyDisplay.down('KeyC');
            } else {
                keyDisplay.up('KeyT');
                keyDisplay.up('KeyC');
            }
        }

        projectileManager.enemies = enemies;
        projectileManager.update(delta);

        if (thirdPersonCamera) {
            thirdPersonCamera.Update(delta);
        }

        if (playerHealthBar && characterControls) {
            playerHealthBar.setHealth(characterControls.health);
        }

    

    if (debugMode) updateDebugHelpers();
    // update camera->player occlusion each frame
    updateOcclusion();

    // update textual debug overlay
    updateDebugOverlay();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// === Switch Level ===
async function switchLevel() {
    console.log(`Switching from Level ${currentLevel}...`);

    // ⚠️ CLEANUP BEFORE SWITCHING LEVEL ⚠️
    cleanupCurrentLevel();
    
    currentLevel = currentLevel === 1 ? 2 : currentLevel === 2 ? 3 : 1;
    const nextLoader = currentLevel === 1 ? loadDemoLevel : currentLevel === 2 ? loadLevel2 : loadLevel3;
    await loadLevel(nextLoader, `LEVEL ${currentLevel}`);

    console.log(`Now on Level ${currentLevel}`);
    window._levelSwitched = false;
}

// === Debug ===
function updateDebugHelpers() {
    // If debug mode is disabled, remove helpers and reset frame counter
    if (!debugMode) {
        debugHelpers.forEach(h => { try { scene.remove(h); } catch (e) {} });
        debugHelpers = [];
        debugFrameCounter = 0;
        return;
    }

    // throttle heavy debug helper rebuilds to once every 10 frames
    if (debugFrameCounter++ % 1 !== 0) return;

    // remove previous helpers before rebuilding
    debugHelpers.forEach(h => { try { scene.remove(h); } catch (e) {} });
    debugHelpers = [];

    // 1) Highlight only the specific collided geometry (player or enemies)
    const highlightMeshes = new Set();
    if (characterControls && characterControls.lastCollisionMesh) {
        highlightMeshes.add(characterControls.lastCollisionMesh);
    }
    // if enemies expose lastCollisionMesh, include them too
    enemies.forEach(en => { if (en && en.lastCollisionMesh) highlightMeshes.add(en.lastCollisionMesh); });

    // Add wireframe and approximate normal for each highlighted mesh only
    highlightMeshes.forEach((obj) => {
        try {
            if (!obj || !obj.isMesh) return;
            // wireframe overlay
            if (obj.geometry) {
                const wfGeo = new THREE.WireframeGeometry(obj.geometry);
                const wfMat = new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 2, transparent: true, opacity: 0.9 });
                const wire = new THREE.LineSegments(wfGeo, wfMat);
                wire.matrixAutoUpdate = false;
                wire.matrix.copy(obj.matrixWorld);
                wire.userData._isDebugHelper = true;
                scene.add(wire);
                debugHelpers.push(wire);
            }

            // approximate normal arrow at mesh world position
            if (obj.geometry && obj.geometry.attributes && obj.geometry.attributes.normal) {
                const normals = obj.geometry.attributes.normal.array;
                if (normals && normals.length >= 3) {
                    let ax = 0, ay = 0, az = 0, count = 0;
                    for (let i = 0; i < normals.length; i += 3) {
                        ax += normals[i]; ay += normals[i+1]; az += normals[i+2];
                        count++;
                        if (count > 300) break;
                    }
                    if (count > 0) {
                        const avg = new THREE.Vector3(ax / count, ay / count, az / count);
                        const normalMatrix = new THREE.Matrix3().getNormalMatrix(obj.matrixWorld);
                        avg.applyMatrix3(normalMatrix).normalize();
                        const worldPos = new THREE.Vector3();
                        obj.getWorldPosition(worldPos);
                        const arrow = new THREE.ArrowHelper(avg, worldPos, 2.0, 0xffaa00, 0.35, 0.2);
                        arrow.userData._isDebugHelper = true;
                        scene.add(arrow);
                        debugHelpers.push(arrow);
                    }
                }
            }
        } catch (e) {
            // ignore per-mesh debug helper errors
        }
    });

    // 2) Player collision displacement vector
    if (characterControls && characterControls.model) {
        const playerBox = new THREE.Box3().setFromObject(characterControls.model);
        const playerHelper = new THREE.Box3Helper(playerBox, 0x00ff00);
        playerHelper.userData._isDebugHelper = true;
        scene.add(playerHelper);
        debugHelpers.push(playerHelper);

        // collision push vector (if present)
        try {
            const push = characterControls.collisionPush ? characterControls.collisionPush.clone() : new THREE.Vector3(0,0,0);
            if (push.lengthSq() > 1e-6) {
                const from = characterControls.model.position.clone();
                const dir = push.clone().normalize();
                const len = push.length();
                // brighter red and larger head for visibility
                const arrow = new THREE.ArrowHelper(dir, from, len, 0xff2222, 0.35, 0.2);
                arrow.userData._isDebugHelper = true;
                scene.add(arrow);
                debugHelpers.push(arrow);
            }
        } catch (e) {}
    }

    // 3) Enemies collision boxes
    enemies.forEach(enemy => {
        if (!enemy || !enemy.enemyModel) return;
        try {
            const box = new THREE.Box3().setFromObject(enemy.enemyModel);
            const helper = new THREE.Box3Helper(box, 0xff0000);
            helper.userData._isDebugHelper = true;
            scene.add(helper);
            debugHelpers.push(helper);
        } catch (e) {}
    });

    // 4) Projectiles collision boxes
    try {
        if (projectileManager && projectileManager.projectiles) {
            for (const spell of projectileManager.projectiles) {
                try {
                    const box = new THREE.Box3().setFromObject(spell);
                    const helper = new THREE.Box3Helper(box, 0xffff00);
                    helper.userData._isDebugHelper = true;
                    scene.add(helper);
                    debugHelpers.push(helper);
                } catch (e) {}
            }
        }
    } catch (e) {}
}

// Occlusion: make meshes between camera and player semi-transparent
function restoreOcclusion(exceptSet = new Set()) {
    for (const mesh of Array.from(occludedMeshes)) {
        if (exceptSet.has(mesh)) continue;
        if (mesh.userData && mesh.userData._origMaterial) {
            try {
                // dispose the temporary material
                if (mesh.material && mesh.material.dispose) mesh.material.dispose();
            } catch (e) {}
            mesh.material = mesh.userData._origMaterial;
            delete mesh.userData._origMaterial;
        }
        occludedMeshes.delete(mesh);
    }
}

function updateOcclusion() {
    if (!characterControls || !characterControls.model) {
        restoreOcclusion();
        return;
    }

    // Use the camera's world position (not its local position) because the camera
    // is parented to a pivot object. Using `camera.position` returns the local
    // coordinates relative to the pivot which makes occlusion incorrect when the
    // pivot is rotated. `getWorldPosition` returns the actual world-space origin
    // we should shoot the occlusion ray from.
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const playerPos = characterControls.model.position.clone().add(new THREE.Vector3(0, 1.0, 0));
    const dir = playerPos.clone().sub(camPos);
    const dist = dir.length();
    if (dist <= 0.01) {
        restoreOcclusion();
        return;
    }
    dir.normalize();

    _occlusionRay.set(camPos, dir);
    _occlusionRay.far = dist;
    const intersects = _occlusionRay.intersectObjects(scene.children, true);

    const keepSet = new Set();
    for (const it of intersects) {
        const obj = it.object;
        // skip player or enemy models
        if (!obj.isMesh) continue;
        const root = obj; // use the hit mesh directly
        if (root.name && (root.name.toLowerCase().includes('player') || root.name.toLowerCase().includes('enemy') || root.name.toLowerCase().includes('key') || root.name.toLowerCase().includes('hitbox'))) {
            // stop at player or other important object
            break;
        }

        // mark and make transparent
        if (!root.userData._origMaterial) {
            root.userData._origMaterial = root.material;
            const mat = Array.isArray(root.userData._origMaterial) ? root.userData._origMaterial.map(m => m.clone()) : root.userData._origMaterial.clone();
            if (Array.isArray(mat)) mat.forEach(m => { m.transparent = true; m.opacity = 0.28; m.dithering = true; });
            else { mat.transparent = true; mat.opacity = 0.28; mat.dithering = true; }
            root.material = mat;
        } else {
            // update opacity if already cloned
            if (Array.isArray(root.material)) root.material.forEach(m => m.opacity = 0.28);
            else root.material.opacity = 0.28;
        }
        occludedMeshes.add(root);
        keepSet.add(root);
    }

    // restore any previously occluded meshes that are no longer blocking
    restoreOcclusion(keepSet);
}

function tryPickupChestArtifact() {
    if (!characterControls) return false;
    // Find nearest chest within 3 units that is open and has a visible artifact
    const playerPos = characterControls.model.position;
    let nearest = null;
    let nearestDist = 3;
    for (const chest of ChestController.chests) {
        if (!chest.isOpen || !chest.artifact || !chest.artifact.visible) continue;
        const chestPos = new THREE.Vector3();
        chest.root.getWorldPosition(chestPos);
        const d = playerPos.distanceTo(chestPos);
        if (d < nearestDist) {
            nearest = chest;
            nearestDist = d;
        }
    }
    if (!nearest) return false;

    // Consume artifact: hide and detach
    if (nearest.artifact) {
        nearest.artifact.visible = false;
        nearest.root.remove(nearest.artifact);
        nearest.artifact = null;
    }

    // Heal player by the standard damage amount (10), clamped to max
    if (playerHealthBar) {
        const healAmount = 10;
        const newHealth = Math.min(playerHealthBar.health + healAmount, playerHealthBar.maxHealth ?? 100);
        playerHealthBar.setHealth(newHealth);
        if (characterControls) characterControls.health = newHealth;
    }

    console.log('✓ Potion picked up: health increased');
    return true;
}

// === Window Resize ===
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (keyDisplay) keyDisplay.updatePosition();
}
window.addEventListener('resize', onWindowResize);

// === Initialize ===
loadLevel(loadDemoLevel, 'LEVEL 1');
animate();