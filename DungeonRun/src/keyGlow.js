// keyGlow.js - renders the animated key

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


export function addGlowingKey(scene) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load('../../src/models/the_golden_key.glb', (gltf) => {
            const key = gltf.scene;
            key.scale.set(0.001, 0.001, 0.001);
            key.position.set(1, 0.5, 1); // Positioned on the floor, away from player/enemies for visibility
            key.userData = { isGrabbed: false }; // Flag for grab state
            key.visible = true; // Explicitly set visible initially

            // gold/yellow glow effect
            key.traverse((child) => {
                if (child.isMesh) {
                    if (!child.material) return;
                    child.material = child.material.clone();
                    child.material.emissive = new THREE.Color(0xffd700); // Golden yellow for a key
                    child.material.emissiveIntensity = 1.5; 
                    child.material.emissiveMap = child.material.emissiveMap || child.material.map;
                }
            });

            scene.add(key);

            
            const keyLight = new THREE.PointLight(0xffd700, 2, 10);
            keyLight.position.set(0, 0, 0);
            key.add(keyLight);

            
            const auraLight = new THREE.PointLight(0xffffaa, 0.5, 15);
            auraLight.position.set(0, 0, 0);
            key.add(auraLight);

            
            const clock = new THREE.Clock();
            const animateKey = () => {
                if (!key.userData.isGrabbed && key.visible) { // Stop animating and hide if grabbed
                    const t = clock.getElapsedTime();
                    key.position.y = 0.5 + Math.sin(t * 2) * 0.2;
                    key.rotation.y = t * 0.5;
                }
            };

            resolve({ animator: animateKey, key: key }); 
        }, undefined, reject);
    });
}