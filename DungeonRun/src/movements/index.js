// index.js - main file for rendering scene essentially

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterControls } from './characterControls.js';
import { KeyDisplay } from './utils.js';
import { PlayerHealthBarUI } from '../view/playerHealthBarUI.js';
import { EnemyMovement } from './enemyMovement.js';
import { ThirdPersonCamera } from '../view/thirdPersonCamera.js';
import { addGlowingKey } from '../keyGlow.js';
import { loadDemoLevel } from '../levels/demoLevel.js';
import { Inventory } from '../view/invetory.js';


// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

let keyAnimator = null;
let keyObject = null; 
let isKeyGrabbed = false; 

//invetory
let invetory;

//health
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

function clearScene() {
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
}

// Level loading
async function loadLevel(levelLoader) {
    clearScene();
    playerHealthBar = new PlayerHealthBarUI({ maxHealth: 100 });
    invetory = new Inventory();
    await levelLoader({
        scene,
        renderer,
        camera,
        onPlayerLoaded: ({ model, mixer, animationsMap, characterControls: cc, thirdPersonCamera: cam }) => {
            characterControls = cc;
            thirdPersonCamera = cam;
        },
        onEnemiesLoaded: ({ enemies: enemyArr}) => {
            enemies = enemyArr;
        },
        onKeyLoaded: ({ animator, key }) => {
            keyAnimator = animator;
            keyObject = key;
        }
    });
}

// Keyboard controls
const keysPressed = {};
const keyDisplayQueue = new KeyDisplay();

document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key);
    keysPressed[event.key.toLowerCase()] = true;

    if (event.key.toLowerCase() === 'e' && keyObject && !isKeyGrabbed && characterControls) {
        const playerPos = characterControls.model.position;
        const keyPos = keyObject.position;
        const distance = playerPos.distanceTo(keyPos);
        if (distance < 0.5) {
            grabKey();
        }
    }

    if (event.code === 'Space') {
        playerAttack();
    }

    if (event.key.toLowerCase() === 'h') { // Press H to damage player
        if (playerHealthBar) {
            playerHealthBar.setHealth(playerHealthBar.health - 10);
        }
    }


}, false);

document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    keysPressed[event.key.toLowerCase()] = false;
}, false);

function grabKey() {
    if (!keyObject || isKeyGrabbed) return;
    
    isKeyGrabbed = true;
    keyObject.userData.isGrabbed = true;
    keyObject.visible = false;
    keyDisplayQueue.updateKeyStatus('yes');
    keyDisplayQueue.up('e');
    console.log('Key grabbed! Status updated to yes.');
}

function playerAttack() {
    if (!characterControls || !characterControls.model) return;

    //hitbox code
    const playerPos = characterControls.model.position.clone();
    const forward = new THREE.Vector3(0, 0.5, -0.33).applyQuaternion(characterControls.model.quaternion);
    const hitboxCenter = playerPos.clone().add(forward.multiplyScalar(2)); // 2 units in front
    const hitboxSize = new THREE.Vector3(1.5, 2, 1.4); // width, height, depth

    const hitbox = new THREE.Box3().setFromCenterAndSize(hitboxCenter, hitboxSize);

     //visualiation
    /*const helper = new THREE.Box3Helper(hitbox, 0xff0000);
    scene.add(helper);
    setTimeout(() => scene.remove(helper), 100);
    */
    
    //enemy intersection, will need timeout delays for animations.
    enemies.forEach(enemy => {
        if (!enemy.model) return;
        const enemyBox = new THREE.Box3().setFromObject(enemy.model);
        if (hitbox.intersectsBox(enemyBox)) {
            enemy.health = Math.max(0, enemy.health - 25);
            if (enemy.healthBar) {
                enemy.healthBar.setHealth(enemy.health);
            }
            if (enemy.health <= 0){
                scene.remove(enemy.model);
                if (enemy.healthBar){
                    enemy.healthBar.remove();
                }
                enemies.splice(i, 1);
            }
        }
    });
}

// Animation loop
const clock = new THREE.Clock();
function animate() {
    const mixerUpdateDelta = clock.getDelta();
    if (characterControls) {
        characterControls.update(mixerUpdateDelta, keysPressed);
    }
    enemies.forEach(e => e.update(mixerUpdateDelta));
    if (keyAnimator) keyAnimator();

    if (keyObject && !isKeyGrabbed && characterControls) {
        const playerPos = characterControls.model.position;
        const distance = playerPos.distanceTo(keyObject.position);
        if (distance < 3) {
            keyDisplayQueue.down('e');
            if (distance < 3 && distance > 2) {
                console.log('Press E to grab the key!');
            }
        } else {
            keyDisplayQueue.up('e');
        }
    } else {
        keyDisplayQueue.up('e');
    }

    enemies.forEach(enemy => { 
        if (enemy.healthBar) enemy.healthBar.update(camera);
    });

    if (thirdPersonCamera) {
        thirdPersonCamera.Update(mixerUpdateDelta);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);

    //example for switching levels ! this should hopefully be changed
    if (isKeyGrabbed && !window._levelSwitched) {
        window._levelSwitched = true;
        setTimeout(() => {
            switchLevel();
        }, 1000);
    }
    
}

function switchLevel() {
    // For now, reload demo level (replace with another loader for more levels)
    loadLevel(loadDemoLevel);
    window._levelSwitched = false;
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
