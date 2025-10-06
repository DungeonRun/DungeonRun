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


// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

let keyAnimator = null;
let keyObject = null; 
let isKeyGrabbed = false; 

//health
let playerHealthBar;
let enemyHealthBars = [];

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
    enemyHealthBars.forEach(bar => bar && bar.remove());
    enemyHealthBars = [];
    if (playerHealthBar) {
        playerHealthBar.remove();
        playerHealthBar = null;
    }
}

// Level loading
async function loadLevel(levelLoader) {
    clearScene();
    playerHealthBar = new PlayerHealthBarUI({ maxHealth: 100 });
    await levelLoader({
        scene,
        renderer,
        camera,
        onPlayerLoaded: ({ model, mixer, animationsMap, characterControls: cc, thirdPersonCamera: cam }) => {
            characterControls = cc;
            thirdPersonCamera = cam;
        },
        onEnemiesLoaded: ({ enemies: enemyArr, enemyHealthBars: bars }) => {
            enemies = enemyArr;
            enemyHealthBars = bars;
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

    if (event.key.toLowerCase() === 'h') { // Press H to damage player
        if (playerHealthBar) {
            playerHealthBar.setHealth(playerHealthBar.health - 10);
        }
    }
    if (event.key.toLowerCase() === 'j') { // Press J to damage all enemies
        enemyHealthBars.forEach(bar => {
            if (bar) bar.setHealth(bar.health - 15);
        });
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

    enemyHealthBars.forEach(bar => { 
        if (bar) bar.update(camera);
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
