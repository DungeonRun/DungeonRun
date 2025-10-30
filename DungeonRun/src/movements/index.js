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
import { PauseMenuUI } from '../view/pauseMenuUI.js';
import { GameTimerUI } from '../view/timerUI.js';

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

// Inventory
let inventory;

// Health bar
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

// Level state
let characterControls;
let thirdPersonCamera;
let enemies = [];

// UI Elements
let gameOverUI;
let loader;
let keyDisplay;

// Projectiles
const projectileManager = new ProjectileManager(scene, camera, enemies);
let projectiles = [];

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
}

// === Load Level ===
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
    keysPressed[event.code] = true;
    if (keyDisplay) keyDisplay.down(event.code);

    // Key pickup
    if (event.code === 'KeyE' && keyObject && !isKeyGrabbed && characterControls) {
        const playerPos = characterControls.model.position;
        const keyPos = keyObject.position;
        if (playerPos.distanceTo(keyPos) < 1.0) grabKey();
    }

    // Inventory controls
    if (event.code === 'Digit1') inventory.selected = 0;
    if (event.code === 'Digit2') inventory.selected = 1;
    if (event.code === 'KeyQ') inventory.switchItem();

    // Player attack
    if (event.code === 'KeyE' && characterControls) playerAttack();

    // Damage player (debug)
    if (event.code === 'KeyH' && playerHealthBar) {
        playerHealthBar.setHealth(playerHealthBar.health - 10);
        if (characterControls) characterControls.health = playerHealthBar.health;
    }

    // Debug mode
    if (event.code === 'KeyP') {
        debugMode = !debugMode;
        updateDebugHelpers();
    }
}, false);

document.addEventListener('keyup', (event) => {
    if ((loader && loader.isLoading) || isPaused) return;
    keysPressed[event.code] = false;
    if (keyDisplay) keyDisplay.up(event.code);
}, false);

// === Key Grab Logic ===
function grabKey() {
    if (!keyObject || isKeyGrabbed || !characterControls || !keyObject.visible) return;
    isKeyGrabbed = true;
    keyObject.userData.isGrabbed = true;
    keyObject.visible = false;

    if (keyDisplay) {
        keyDisplay.updateKeyStatus('yes');
        keyDisplay.up('KeyR');
    }

    characterControls.playPickup();
    keysPressed['KeyR'] = false;

    setTimeout(() => {
        if (isKeyGrabbed && !window._levelSwitched) {
            window._levelSwitched = true;
            switchLevel();
        }
    }, 1500);
}

// === Player Attack Logic ===
let spellCooldownEnd = 5000;
function playerAttack() {
    if (!characterControls || !characterControls.model) return;
    if (inventory.getSelected() === 'sword') {
        swordAttack();
        characterControls.playSword();
    } else if (inventory.getSelected() === 'spell') {
        if (performance.now() > spellCooldownEnd) {
            const origin = characterControls.model.position.clone();
            origin.y += 1.2;
            const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(characterControls.model.quaternion);
            projectileManager.fireSpell(origin, direction);
            spellCooldownEnd = performance.now() + 5000;
        }
    }
}

function swordAttack() {
    if (!characterControls || !characterControls.model) return;
    const playerPos = characterControls.model.position.clone();
    const forward = new THREE.Vector3(0, 0.5, -0.33).applyQuaternion(characterControls.model.quaternion);
    const hitboxCenter = playerPos.clone().add(forward.multiplyScalar(2));
    const hitbox = new THREE.Box3().setFromCenterAndSize(hitboxCenter, new THREE.Vector3(1.5, 2, 1.4));

    enemies.forEach(enemy => {
        if (!enemy.enemyModel) return;
        const enemyBox = new THREE.Box3().setFromObject(enemy.enemyModel);
        if (hitbox.intersectsBox(enemyBox)) enemy.health = Math.max(0, enemy.health - 25);
    });
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

    if (loader && loader.isLoading) {
        loader.render();
        requestAnimationFrame(animate);
        return;
    }

    if (!isPaused) {
        if (characterControls) {
            characterControls.update(delta, keysPressed);
            if (characterControls.health <= 0 && !isGameOver) {
                characterControls.playDeath();
                isGameOver = true;
                if (gameTimer) gameTimer.stop(); // ⛔ Stop timer on death
            }
        }

        enemies.forEach(enemy => {
            enemy.update(delta, characterControls);
            if (enemy.healthBar) {
                enemy.healthBar.setHealth(enemy.health);
                enemy.healthBar.update(camera);
            }
        });

        projectileManager.enemies = enemies;
        projectileManager.update(delta);

        if (thirdPersonCamera) thirdPersonCamera.Update(delta);
        if (playerHealthBar && characterControls) playerHealthBar.setHealth(characterControls.health);

        if (characterControls && characterControls.health <= 0 && !gameOverUI.isGameOver) {
            if (thirdPersonCamera && thirdPersonCamera.IsMouseLocked()) document.exitPointerLock();
            if (characterControls.model) scene.remove(characterControls.model);
            gameOverUI.show(() => {
                loadLevel(loadDemoLevel);
            });
            if (gameTimer) gameTimer.stop();
            characterControls = null;
        }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// === Switch Level ===
async function switchLevel() {
    console.log(`Switching from Level ${currentLevel}...`);

    currentLevel = currentLevel === 1 ? 2 : currentLevel === 2 ? 3 : 1;
    const nextLoader = currentLevel === 1 ? loadDemoLevel : currentLevel === 2 ? loadLevel2 : loadLevel3;
    await loadLevel(nextLoader, `LEVEL ${currentLevel}`);

    console.log(`Now on Level ${currentLevel}`);
    window._levelSwitched = false;
}

// === Debug ===
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
