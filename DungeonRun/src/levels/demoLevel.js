import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EnemyMovement } from '../movements/enemyMovement.js';
import { ThirdPersonCamera } from '../view/thirdPersonCamera.js';
import { CharacterControls } from '../movements/characterControls.js';
import { addGlowingKey } from '../keyGlow.js';
import { EnemyHealthBar } from '../view/enemyHealthBar.js';



export async function loadDemoLevel({
    scene,
    renderer,
    camera,
    onPlayerLoaded,
    onEnemiesLoaded,
    onKeyLoaded
}) {
    THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
    THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
    THREE.Mesh.prototype.raycast = acceleratedRaycast;

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
    //ALLLL of this is placeholder for room model geometry.
    const size = 20;
    const roomGeometry = new THREE.BoxGeometry(size, size, size);
    const roomMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.BackSide
    });
    const room = new THREE.Mesh(roomGeometry, roomMaterial);
    room.position.y = size / 2 - 0.05;
    room.receiveShadow = true;
    scene.add(room);
    // Assuming 'size' is the length of the cube's sides and 'room' is your cube mesh
    const half = size / 2;
    const wallThickness = 0.2; // Thin wall

    const wallPlanes = [
        // +X wall (right)
        new THREE.Mesh(new THREE.BoxGeometry(wallThickness, size, size), new THREE.MeshBasicMaterial({ visible: false })),
        // -X wall (left)
        new THREE.Mesh(new THREE.BoxGeometry(wallThickness, size, size), new THREE.MeshBasicMaterial({ visible: false })),
        // +Z wall (back)
        new THREE.Mesh(new THREE.BoxGeometry(size, size, wallThickness), new THREE.MeshBasicMaterial({ visible: false })),
        // -Z wall (front)
        new THREE.Mesh(new THREE.BoxGeometry(size, size, wallThickness), new THREE.MeshBasicMaterial({ visible: false })),
        // Floor (optional)
        // new THREE.Mesh(new THREE.BoxGeometry(size, wallThickness, size), new THREE.MeshBasicMaterial({ visible: false })),
        // Ceiling (optional)
        // new THREE.Mesh(new THREE.BoxGeometry(size, wallThickness, size), new THREE.MeshBasicMaterial({ visible: false })),
    ];

    // Position the walls
    wallPlanes[0].position.set(room.position.x + half, room.position.y, room.position.z); // +X
    wallPlanes[1].position.set(room.position.x - half, room.position.y, room.position.z); // -X
    wallPlanes[2].position.set(room.position.x, room.position.y, room.position.z + half); // +Z
    wallPlanes[3].position.set(room.position.x, room.position.y, room.position.z - half); // -Z

    wallPlanes.forEach(wall => {
        wall.geometry.computeBoundsTree();
        scene.add(wall);
    });
    const collidables = [...wallPlanes];

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

            const characterControls = new CharacterControls(model, mixer, animationsMap, thirdPersonCamera, 'Idle', collidables);

            if (onPlayerLoaded) onPlayerLoaded({ model, mixer, animationsMap, characterControls, thirdPersonCamera, collidables });

            // Enemies
            const enemies = [];
            const enemyHealthBars = [];
            const enemyConfigs = [
                { pos: new THREE.Vector3(0, 1, 0), type: "mutant" },
                { pos: new THREE.Vector3(5, 1, -5), type: "mutant" },
                { pos: new THREE.Vector3(-5, 1, -10), type: "scaryMonster" },
                { pos: new THREE.Vector3(10, 1, -5), type: "monsterEye" }
            ];

            enemyConfigs.forEach(cfg => {
                const enemy = new EnemyMovement(scene, model, cfg.pos, cfg.type, (enemyModel) => {
                    const bar = new EnemyHealthBar(enemyModel, { maxHealth: 100 });
                    enemy.healthBar = bar; // Link bar to enemy
                    enemyHealthBars.push(bar);
                }, collidables);
                enemies.push(enemy);
            });
            if (onEnemiesLoaded) onEnemiesLoaded({ enemies, enemyHealthBars, collidables });
        }
    );

    // Key
    addGlowingKey(scene).then(({ animator, key }) => {
        if (onKeyLoaded) onKeyLoaded({ animator, key });
    });
}

export function boxIntersectsMeshBVH(box, mesh) {
    // Create a geometry bounding box helper mesh for intersection test
    const geometry = mesh.geometry;
    if (!geometry.boundsTree) return false; // BVH not built

    // Use BVH's intersectsBox method
    return geometry.boundsTree.intersectsBox(box, mesh.matrixWorld);
}