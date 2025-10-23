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
    scene.add(new THREE.AmbientLight(0xffffff, 0. ));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
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
        roughness: 0.7,
        metalness: 0.0,
        color: 0x000000, //tint
        emissive: 0x332200,
        emissiveIntensity: 0.1
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
    const size = 30;
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
        '/src/animations/avatar/avatar2.glb',
        function (gltf) {
            const model = gltf.scene;
            model.traverse(function (object) {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.name = 'player';
                }
            });
            model.name = 'player';

            const playerLight = new THREE.PointLight(0xff7700, 15, 15); 
            playerLight.position.set(0, 3, 0); 
            model.add(playerLight);

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
                { pos: new THREE.Vector3(0, 1, -11), type: "mutant" },
                { pos: new THREE.Vector3(3, 1, -12), type: "mutant" },
                { pos: new THREE.Vector3(-3, 1, -8), type: "scaryMonster" },
                { pos: new THREE.Vector3(1, 1, -8), type: "monsterEye" }
            ];

             enemyConfigs.forEach(cfg => {
                const enemy = new EnemyMovement(scene, model, cfg.pos, cfg.type, (enemyModel) => {
                    //lighting effect
                    const enemyLight = new THREE.PointLight(0xff0000, 1, 4); // Red light with 5 unit radius
                    enemyLight.position.set(0, 0, 0); // Position above enemy center
                    enemyModel.add(enemyLight);
                    
                    // Add light glow effect
                    /*
                    const lightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
                    const lightMaterial = new THREE.MeshBasicMaterial({ 
                        color: 0xff0000,
                        transparent: true,
                        opacity: 0.6
                    });
                    const lightGlow = new THREE.Mesh(lightGeometry, lightMaterial);
                    lightGlow.position.copy(enemyLight.position);
                    enemyModel.add(lightGlow);
                    */

                    const bar = new EnemyHealthBar(enemyModel, { maxHealth: enemy.health });
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

    // Treasure Chests
    const chestLoader = new GLTFLoader();
    const chestPositions = [
        new THREE.Vector3(-12, 0, -12),  // Bottom-left corner
        new THREE.Vector3(12, 0, -12),   // Bottom-right corner
        new THREE.Vector3(-12, 0, 12),   // Top-left corner
        new THREE.Vector3(12, 0, 12)     // Top-right corner
    ];

    chestPositions.forEach((position, index) => {
        chestLoader.load(
            '/src/models/treasure_chest.glb',
            function (gltf) {
                const chest = gltf.scene.clone();
                chest.position.copy(position);
                chest.scale.set(1.0, 1.0, 1.0); // Scale up the chest to 3x bigger (was 0.5, now 1.5)
                
                // Rotate the right chest (index 1) to face away from the wall
                if (index === 1) { // Right chest (bottom-right corner)
                    chest.rotation.y = Math.PI; // Rotate 180 degrees to face away from wall
                }
                if (index === 3) { // Right chest (bottom-right corner)
                    chest.rotation.y = Math.PI; // Rotate 180 degrees to face away from wall
                }
                
                // Enable shadows
                chest.traverse(function (object) {
                    if (object.isMesh) {
                        object.castShadow = true;
                        object.receiveShadow = true;
                    }
                });
                
                chest.name = `treasure_chest_${index}`;
                scene.add(chest);
                
                // Create collision box for the chest
                const chestCollisionBox = new THREE.Mesh(
                    new THREE.BoxGeometry(2, 2, 2), // Collision box size
                    new THREE.MeshBasicMaterial({ visible: false }) // Invisible collision mesh
                );
                chestCollisionBox.position.copy(position);
                chestCollisionBox.position.y = 1; // Center the collision box vertically
                chestCollisionBox.name = `chest_collision_${index}`;
                chestCollisionBox.geometry.computeBoundsTree(); // Enable BVH for collision detection
                scene.add(chestCollisionBox);
                
                // Add to collidables array for player and enemy collision detection
                collidables.push(chestCollisionBox);
                
                console.log(`Treasure chest ${index + 1} added at position:`, position);
            },
            function (progress) {
                console.log('Loading treasure chest progress:', (progress.loaded / progress.total * 100) + '%');
            },
            function (error) {
                console.error('Error loading treasure chest:', error);
            }
        );
    });
}

export function boxIntersectsMeshBVH(box, mesh) {
    // Create a geometry bounding box helper mesh for intersection test
    const geometry = mesh.geometry;
    if (!geometry.boundsTree) return false; // BVH not built

    // Use BVH's intersectsBox method
    return geometry.boundsTree.intersectsBox(box, mesh.matrixWorld);
}