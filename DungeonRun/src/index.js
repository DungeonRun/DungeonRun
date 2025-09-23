import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterControls } from './characterControls.js';
import { KeyDisplay } from './utils.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

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

// Orbit controls
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 15;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.update();

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
        loadTexture('/textures/sand/Sand_002_COLOR.jpg'),
        loadTexture('/textures/sand/Sand_002_NRM.jpg'),
        loadTexture('/textures/sand/Sand_002_DISP.jpg'),
        loadTexture('/textures/sand/Sand_002_OCC.jpg')
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
new GLTFLoader().load(
    '/src/models/Soldier.glb',
    function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            if (object.isMesh) object.castShadow = true;
        });
        scene.add(model);

        const gltfAnimations = gltf.animations;
        const mixer = new THREE.AnimationMixer(model);
        const animationsMap = new Map();
        gltfAnimations.filter(a => a.name !== 'TPose').forEach((a) => {
            animationsMap.set(a.name, mixer.clipAction(a));
        });

        characterControls = new CharacterControls(model, mixer, animationsMap, orbitControls, camera, 'Idle');
    },
    undefined,
    function (error) {
        console.error('Error loading Soldier.glb:', error);
    }
);

// Keyboard controls
const keysPressed = {};
const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key);
    keysPressed[event.key.toLowerCase()] = true;
}, false);
document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    keysPressed[event.key.toLowerCase()] = false;
}, false);

// Animation loop
const clock = new THREE.Clock();
function animate() {
    const mixerUpdateDelta = clock.getDelta();
    if (characterControls) {
        characterControls.update(mixerUpdateDelta, keysPressed);
    }
    orbitControls.update();
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