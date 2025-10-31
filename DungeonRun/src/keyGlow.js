// keyGlow.js - renders the animated key

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


export function addGlowingKey(scene, position = null) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load('/src/models/the_golden_key.glb', (gltf) => {
            const key = gltf.scene;
            key.scale.set(0.001, 0.001, 0.001);

            // custom or default position
            if (position) key.position.copy(position);
            else key.position.set(1, 0.5, 1);

            key.userData = { isGrabbed: false };
            key.visible = true;

            key.traverse((child) => {
                if (child.isMesh) {
                    if (!child.material) return;
                    child.material = child.material.clone();
                    child.material.emissive = new THREE.Color(0xffd700);
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
                if (!key.userData.isGrabbed && key.visible) {
                    const t = clock.getElapsedTime();
                    key.position.y = (position ? position.y : 0.5) + Math.sin(t * 2) * 0.2;
                    key.rotation.y = t * 0.5;
                }
            };

            resolve({ animator: animateKey, key });
        }, undefined, reject);
    });
}
