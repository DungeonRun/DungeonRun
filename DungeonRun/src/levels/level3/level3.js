import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColor(0xdddddd, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT);
camera.position.z = 50;
scene.add(camera);

draw();
function draw(){
    levelMap();
    render();
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

function primitive(){
    const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
    const basicMaterial = new THREE.MeshBasicMaterial({ color: 0x0095dd });
    const cube = new THREE.Mesh(boxGeometry, basicMaterial);
    cube.rotation.set(0.4, 0.2, 0);
    scene.add(cube);
}

//Map initialization
function levelMap(){
    const mapLoader = new GLTFLoader();
    mapLoader.load(`./level3.glb`,(gltf)=>mapLoad(gltf), (progress)=>mapLoadProgress(progress), ()=>{throw('error when loading level 3 map');});
}

function mapLoad(gltf){
    const map = gltf.scene;
    scene.add(map);
}
function mapLoadProgress(progress){
    console.log(`Level 3 map loading progress: ${progress.loaded/progress.total*100}%`);
}