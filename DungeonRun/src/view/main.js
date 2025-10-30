import * as THREE from 'three';
import { ChestController } from '../ChestController.js';

const scene = new THREE.Scene();

const cubeGeometry = new THREE.BoxGeometry(1,1,1);
const cubeMaterial = new THREE.MeshBasicMaterial({color: "red"});

const cubeMesh = new THREE.Mesh(
  cubeGeometry, 
  cubeMaterial
)

scene.add(cubeMesh);


const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  30
)


camera.position.z = 5


const canvas = document.querySelector('canvas.threejs')


const renderer = new THREE.WebGLRenderer({
  canvas: canvas
})




renderer.setSize(window.innerWidth, window.innerHeight)

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    // Update chest animations
    ChestController.update(deltaTime);
    
    renderer.render(scene, camera);
}

animate();