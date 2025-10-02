// index.js - main file for rendering scene essentially

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterControls } from './characterControls.js';
import { KeyDisplay } from './utils.js';
import { EnemyMovement } from './enemyMovement.js';
import { ThirdPersonCamera } from './thirdPersonCamera.js';
import { addGlowingKey } from './keyGlow.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

let keyAnimator = null;
let keyObject = null; // Reference to the key for grabbing
let isKeyGrabbed = false; // Global flag

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

// Third person camera (will be initialized after model loads)
let thirdPersonCamera;

// Lighting
function light() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(-60, 100, -10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    scene.add(dirLight);
}

// Floor generation
function generateFloor() {
    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (path) => {
        return new Promise((resolve, reject) => {
            textureLoader.load(
                path,
                resolve,
                undefined,
                (err) => reject(`Failed to load texture: ${path}, Error: ${err.message}`)
            );
        });
    };

    Promise.all([
        loadTexture('/sand/Sand 002_COLOR.jpg'),
        loadTexture('/sand/Sand 002_NRM.jpg'),
        loadTexture('/sand/Sand 002_DISP.jpg'),
        loadTexture('/sand/Sand 002_OCC.jpg')
    ]).then(([sandBaseColor, sandNormalMap, sandHeightMap, sandAmbientOcclusion]) => {
        const WIDTH = 80;
        const LENGTH = 80;

        const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
        const material = new THREE.MeshStandardMaterial({
            map: sandBaseColor,
            normalMap: sandNormalMap,
            displacementMap: sandHeightMap,
            displacementScale: 0.1,
            aoMap: sandAmbientOcclusion
        });

        function wrapAndRepeatTexture(map) {
            map.wrapS = map.wrapT = THREE.RepeatWrapping;
            map.repeat.set(10, 10);
        }

        wrapAndRepeatTexture(material.map);
        wrapAndRepeatTexture(material.normalMap);
        wrapAndRepeatTexture(material.displacementMap);
        wrapAndRepeatTexture(material.aoMap);

        const floor = new THREE.Mesh(geometry, material);
        floor.receiveShadow = true;
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);
    }).catch((err) => {
        console.error(err);
    });
}

// Load model and animations
let characterControls;
let enemyMovement1;
let enemyMovement2;

new GLTFLoader().load(
    '/src/models/Soldier.glb',
    function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            if (object.isMesh) {
                object.castShadow = true;
                object.name = 'player'; // Ensure all meshes are named "player"
            }
        });
        model.name = 'player'; // Ensure the root is named "player"
        scene.add(model);

        const gltfAnimations = gltf.animations;
        const mixer = new THREE.AnimationMixer(model);
        const animationsMap = new Map();
        gltfAnimations.filter(a => a.name !== 'TPose').forEach((a) => {
            animationsMap.set(a.name, mixer.clipAction(a));
        });

        // Initialize third person camera
        thirdPersonCamera = new ThirdPersonCamera({
            camera: camera,
            target: model
        });

        characterControls = new CharacterControls(model, mixer, animationsMap, thirdPersonCamera, 'Idle');

        // Spawn 2 enemies with different start positions
        enemyMovement1 = new EnemyMovement(scene, model, new THREE.Vector3(0, 1, 0));  // default position
        enemyMovement2 = new EnemyMovement(scene, model, new THREE.Vector3(5, 1, -5)); // offset enemy
    },
    undefined,
    function (error) {
        console.error('Error loading Soldier.glb:', error);
    }
);

// Load the glowing key (positioned on the floor for visibility)
addGlowingKey(scene).then(({ animator, key }) => {
    keyAnimator = animator;
    keyObject = key; // Store reference
    console.log('Glowing key loaded and ready!');
}).catch(error => {
    console.error('Failed to load glowing key:', error);
});

// Keyboard controls
const keysPressed = {};
const keyDisplayQueue = new KeyDisplay(); // Now has extended KeyDisplay
document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key);
    keysPressed[event.key.toLowerCase()] = true;

    // Grab logic: Check if 'e' pressed and close to key (neat, non-breaking)
    if (event.key.toLowerCase() === 'e' && keyObject && !isKeyGrabbed && characterControls) {
        const playerPos = characterControls.model.position; // Access player position
        const keyPos = keyObject.position;
        const distance = playerPos.distanceTo(keyPos);
        if (distance < 0.5) { // Grab within 2 units
            grabKey();
        }
    }
}, false);
document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    keysPressed[event.key.toLowerCase()] = false;
}, false);

// Add this new function for grabbing (hides key and updates status)
function grabKey() {
    if (!keyObject || isKeyGrabbed) return;
    
    isKeyGrabbed = true;
    keyObject.userData.isGrabbed = true;
    keyObject.visible = false; // Hide the key instead of attaching
    
    // Update status display via KeyDisplay
    keyDisplayQueue.updateKeyStatus('yes');
    
    // Ensure 'E' is hidden after grab
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
   if (enemyMovement1) enemyMovement1.update(mixerUpdateDelta);
   if (enemyMovement2) enemyMovement2.update(mixerUpdateDelta);


    // Animate the key if loaded
    if (keyAnimator) {
        keyAnimator();
    }

    // Proximity check: Show 'E' icon only when near and not grabbed
    if (keyObject && !isKeyGrabbed && characterControls) {
        const playerPos = characterControls.model.position;
        const distance = playerPos.distanceTo(keyObject.position);
        if (distance < 3) { // Show 'E' icon within 3 units
            keyDisplayQueue.down('e'); // Highlight 'E' (shows and red)
            if (distance < 3 && distance > 2) { // Console prompt
                console.log('Press E to grab the key!');
            }
        } else {
            keyDisplayQueue.up('e'); // Hide 'E'
        }
    } else {
        keyDisplayQueue.up('e'); // Ensure hidden if grabbed or no key
    }

    // Update third person camera
    if (thirdPersonCamera) {
        thirdPersonCamera.Update(mixerUpdateDelta);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    keyDisplayQueue.updatePosition();
}
window.addEventListener('resize', onWindowResize);

// Initialize scene
light();
generateFloor();
animate();