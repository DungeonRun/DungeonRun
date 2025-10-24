import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterControls } from './characterControls.js';
import { KeyDisplay } from './utils.js';
import { PlayerHealthBarUI } from '../view/playerHealthBarUI.js';
import { EnemyMovement } from './enemyMovement.js';
import { ThirdPersonCamera } from '../view/thirdPersonCamera.js';
import { addGlowingKey } from '../keyGlow.js';
import { loadDemoLevel } from '../levels/demoLevel.js';
import { Inventory } from '../view/inventory.js';
import { ProjectileManager } from './projectiles.js';
import { GameOverUI } from '../view/gameOverUI.js';
import { Loader } from '../load/load.js';
import { boxIntersectsMeshBVH } from '../levels/demoLevel.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

let isGameOver = false;
let keyAnimator = null;
let keyObject = null;
let isKeyGrabbed = false;
let debugMode = false;
let debugHelpers = [];

// Inventory
let inventory;

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
let keyDisplayQueue;

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
    }
}

// Level loading
async function loadLevel(levelLoader) {
    loader = new Loader(scene, camera, renderer); //update parameters?
    loader.show()

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
    keyDisplayQueue = new KeyDisplay();

    
}

// Keyboard controls
const keysPressed = {};

document.addEventListener('keydown', (event) => {
    if (loader && loader.isLoading) return; //to prevent controls during loading

    keysPressed[event.code] = true;
    keyDisplayQueue.down(event.code); // Use event.code for consistency

    // Key pickup changed to R as the animation is triggered
    if (event.code === 'KeyR' && keyObject && !isKeyGrabbed && characterControls) {
        const playerPos = characterControls.model.position;
        const keyPos = keyObject.position;
        const distance = playerPos.distanceTo(keyPos);
        if (distance < 0.5) {
            grabKey();
        }
    }

    // Inventory controls
    if (event.code === 'Digit1') inventory.selected = 0;
    if (event.code === 'Digit2') inventory.selected = 1;
    if (event.code === 'KeyQ') inventory.switchItem();

    // Player attack (only when not jumping or other actions)
    if (event.code === 'KeyV' && characterControls) {
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
    keyDisplayQueue.up(event.code);
}, false);


function grabKey() {
    if (!keyObject || isKeyGrabbed || !characterControls) return;
    isKeyGrabbed = true;
    keyObject.userData.isGrabbed = true;
    keyObject.visible = false;
    keyDisplayQueue.updateKeyStatus('yes');
    keyDisplayQueue.up('KeyE');
    alert("Key grabbed!");
    characterControls.playPickup(); // Trigger pickup animation
    console.log('Key grabbed! Status updated to yes.');
}

let spellCooldownEnd = 5000;
function playerAttack() {
    if (!characterControls || !characterControls.model) return;
    if (inventory.getSelected() === 'sword') {
        swordAttack();
        characterControls.playSword(); // Trigger sword animation
    } else if (inventory.getSelected() === 'spell') {
        if (performance.now() > spellCooldownEnd) {
            const origin = characterControls.model.position.clone();
            origin.y += 1.2;
            const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(characterControls.model.quaternion);
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
    const hitboxSize = new THREE.Vector3(1.5, 2, 1.4);
    const hitbox = new THREE.Box3().setFromCenterAndSize(hitboxCenter, hitboxSize);

    enemies.forEach(enemy => {
        if (!enemy.model) return;
        const enemyBox = new THREE.Box3().setFromObject(enemy.model);
        if (hitbox.intersectsBox(enemyBox)) {
            enemy.health = Math.max(0, enemy.health - 25);
        }
    });
}

// Animation loop
const clock = new THREE.Clock();
function animate() {
    const mixerUpdateDelta = clock.getDelta();

    if (loader && loader.isLoading) {
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
            scene.remove(enemy.model);
            if (enemy.healthBar) enemy.healthBar.remove();
            if (enemy.debugHelper) {
                scene.remove(enemy.debugHelper);
                enemy.debugHelper = null;
            }
            enemies.splice(i, 1);
        }
    }

    if (keyAnimator) keyAnimator();

    if (keyObject && !isKeyGrabbed && characterControls) {
        const playerPos = characterControls.model.position;
        const distance = playerPos.distanceTo(keyObject.position);
        if (distance < 3) {
            keyDisplayQueue.down('KeyR');
            if (distance < 3 && distance > 2) {
                console.log('Press R to grab the key!');
            }
        } else {
            keyDisplayQueue.up('KeyR');
        }
    } else {
        keyDisplayQueue.up('KeyR');
    }

    projectileManager.enemies = enemies;
    projectileManager.update(mixerUpdateDelta);

    if (thirdPersonCamera) {
        thirdPersonCamera.Update(mixerUpdateDelta);
    }

    if (playerHealthBar && characterControls) {
        playerHealthBar.setHealth(characterControls.health);
    }

    if (characterControls && characterControls.health <= 0 && !gameOverUI.isGameOver) {
        if (thirdPersonCamera && thirdPersonCamera.IsMouseLocked()) {
            document.exitPointerLock();
        }
        const cameraPosition = camera.position.clone();
        const cameraRotation = camera.rotation.clone();
        if (characterControls.model) {
            scene.remove(characterControls.model);
        }
        gameOverUI.show(() => {
            loadLevel(loadDemoLevel);
        });
        characterControls = null;
    }

    if (debugMode) updateDebugHelpers();

    renderer.render(scene, camera);
    
    requestAnimationFrame(animate);

    if (isKeyGrabbed && !window._levelSwitched) {
        window._levelSwitched = true;
        setTimeout(() => {
            switchLevel();
        }, 1000);
    }
}

function switchLevel() {
    loadLevel(loadDemoLevel);
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
        const box = new THREE.Box3().setFromObject(enemy.model);
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
    keyDisplayQueue.updatePosition();
}
window.addEventListener('resize', onWindowResize);

loadLevel(loadDemoLevel);
animate();