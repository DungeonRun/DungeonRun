import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EnemyMovement } from '../movements/enemyMovement.js';
import { ThirdPersonCamera } from '../view/thirdPersonCamera.js';
import { CharacterControls } from '../movements/characterControls.js';
import { addGlowingKey } from '../keyGlow.js';

export async function loadDemoLevel({
    scene,
    renderer,
    camera,
    onPlayerLoaded,
    onEnemiesLoaded,
    onKeyLoaded
}) {
    // Lighting
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

    // Floor
    const textureLoader = new THREE.TextureLoader();
    const [sandBaseColor, sandNormalMap, sandHeightMap, sandAmbientOcclusion] = await Promise.all([
        textureLoader.loadAsync('/sand/Sand 002_COLOR.jpg'),
        textureLoader.loadAsync('/sand/Sand 002_NRM.jpg'),
        textureLoader.loadAsync('/sand/Sand 002_DISP.jpg'),
        textureLoader.loadAsync('/sand/Sand 002_OCC.jpg')
    ]);
    const WIDTH = 80, LENGTH = 80;
    const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 100, 100);
    const material = new THREE.MeshStandardMaterial({
        map: sandBaseColor,
        normalMap: sandNormalMap,
        displacementMap: sandHeightMap,
        displacementScale: 0.05,
        aoMap: sandAmbientOcclusion,
        roughness: 0.9,
        metalness: 0.0
    });
    [material.map, material.normalMap, material.displacementMap, material.aoMap].forEach(map => {
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(8, 8);
        map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });
    const floor = new THREE.Mesh(geometry, material);
    floor.receiveShadow = true;
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Room Cube
    const size = 40;
    const roomGeometry = new THREE.BoxGeometry(size, size, size);
    const roomMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.BackSide
    });
    const room = new THREE.Mesh(roomGeometry, roomMaterial);
    room.position.y = size / 2 - 0.05;
    room.receiveShadow = true;
    scene.add(room);

    // Player
    new GLTFLoader().load(
        '/src/models/Soldier.glb',
        function (gltf) {
            const model = gltf.scene;
            model.traverse(function (object) {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.name = 'player';
                }
            });
            model.name = 'player';
            scene.add(model);

            const gltfAnimations = gltf.animations;
            const mixer = new THREE.AnimationMixer(model);
            const animationsMap = new Map();
            gltfAnimations.filter(a => a.name !== 'TPose').forEach((a) => {
                animationsMap.set(a.name, mixer.clipAction(a));
            });

            const thirdPersonCamera = new ThirdPersonCamera({
                camera: camera, 
                target: model,
                scene: scene
            });

            const characterControls = new CharacterControls(model, mixer, animationsMap, thirdPersonCamera, 'Idle');

            if (onPlayerLoaded) onPlayerLoaded({ model, mixer, animationsMap, characterControls, thirdPersonCamera });

            // Enemies
            const enemies = [
                new EnemyMovement(scene, model, new THREE.Vector3(0, 1, 0), "mutant"),
                new EnemyMovement(scene, model, new THREE.Vector3(5, 1, -5), "mutant"),
                new EnemyMovement(scene, model, new THREE.Vector3(-5, 1, -10), "scaryMonster"),
                new EnemyMovement(scene, model, new THREE.Vector3(10, 1, -5), "monsterEye")
            ];
            if (onEnemiesLoaded) onEnemiesLoaded(enemies);
        }
    );

    // Key
    addGlowingKey(scene).then(({ animator, key }) => {
        if (onKeyLoaded) onKeyLoaded({ animator, key });
    });
}