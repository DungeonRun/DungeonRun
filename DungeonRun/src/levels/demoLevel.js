import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ChestController } from '../ChestController.js';
import { EnemyMovement } from '../movements/enemyMovement.js';
import { ThirdPersonCamera } from '../view/thirdPersonCamera.js';
import { CharacterControls } from '../movements/characterControls.js';
import { addGlowingKey } from '../keyGlow.js';
import { EnemyHealthBar } from '../view/enemyHealthBar.js';

export async function loadDemoLevel({
    scene,
    renderer,
    camera,
    loader,
    onPlayerLoaded,
    onEnemiesLoaded,
    onKeyLoaded
}) {
    // Initialize ChestController first
    ChestController.init(scene, null);
    console.log('ChestController initialized');

    THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
    THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
    THREE.Mesh.prototype.raycast = acceleratedRaycast;

    // helper: defer heavy BVH build to avoid blocking the main loader frame
    function deferComputeBoundsTree(geometry) {
        if (!geometry || !geometry.computeBoundsTree) return;
        const fn = () => {
            try { geometry.computeBoundsTree(); } catch (e) { console.warn('computeBoundsTree failed', e); }
        };
        if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(fn);
        else setTimeout(fn, 0);
    }

    //  Ambient and Directional Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
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

    //  Floor
    const textureLoader = new THREE.TextureLoader();
    const [sandBaseColor, sandNormalMap, sandHeightMap, sandAmbientOcclusion] = await Promise.all([
        textureLoader.loadAsync('../../src/textures/sand/Sand 002_COLOR.jpg'),
        textureLoader.loadAsync('../../src/textures/sand/Sand 002_NRM.jpg'),
        textureLoader.loadAsync('../../src/textures/sand/Sand 002_DISP.jpg'),
        textureLoader.loadAsync('../../src/textures/sand/Sand 002_OCC.jpg')
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
        color: 0x000000,
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
    // include floor in collidables so player/enemies raycasts and collisions consider it
    floor.name = 'ground';
    if (floor.geometry && floor.geometry.computeBoundsTree) deferComputeBoundsTree(floor.geometry);
    // mark floor as static collision geometry so BVH-based triangle checks are used
    floor.userData.staticCollision = true;

    //  Room Cube
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

    const half = size / 2;
    const wallThickness = 0.2;
    const wallPlanes = [
        new THREE.Mesh(new THREE.BoxGeometry(wallThickness, size, size), new THREE.MeshBasicMaterial({ visible: false })),
        new THREE.Mesh(new THREE.BoxGeometry(wallThickness, size, size), new THREE.MeshBasicMaterial({ visible: false })),
        new THREE.Mesh(new THREE.BoxGeometry(size, size, wallThickness), new THREE.MeshBasicMaterial({ visible: false })),
        new THREE.Mesh(new THREE.BoxGeometry(size, size, wallThickness), new THREE.MeshBasicMaterial({ visible: false }))
    ];

    wallPlanes[0].position.set(room.position.x + half, room.position.y, room.position.z);
    wallPlanes[1].position.set(room.position.x - half, room.position.y, room.position.z);
    wallPlanes[2].position.set(room.position.x, room.position.y, room.position.z + half);
    wallPlanes[3].position.set(room.position.x, room.position.y, room.position.z - half);

    wallPlanes.forEach(wall => {
        if (wall.geometry && wall.geometry.computeBoundsTree) deferComputeBoundsTree(wall.geometry);
        // mark walls as static collision geometry
        wall.userData.staticCollision = true;
        scene.add(wall);
    });
    const collidables = [...wallPlanes];
    collidables.push(floor);

    const playerSpawn = new THREE.Vector3(0, 1, 0);

    const enemyConfigs = [
        { pos: new THREE.Vector3(0, 1, -11), type: "boss", modelPath: "../../src/animations/enemies/boss.glb" },
        { pos: new THREE.Vector3(3, 1, -12), type: "goblin", modelPath: "../../src/animations/enemies/enemy1_1.glb" },
        { pos: new THREE.Vector3(-3, 1, -8), type: "goblin", modelPath: "../../src/animations/enemies/enemy1_1.glb" },
        { pos: new THREE.Vector3(1, 1, -8), type: "vampire", modelPath: "../../src/animations/enemies/enemy2.glb" }
    ];

    const chestPositions = [
        new THREE.Vector3(-12, 0, -12),
        new THREE.Vector3(12, 0, -12),
        new THREE.Vector3(-12, 0, 12),
        new THREE.Vector3(12, 0, 12)
    ];

    const totalSteps = 1 + enemyConfigs.length + 1 + chestPositions.length;
    let completedSteps = 0;
    function updateLoader() {
        if (loader) loader.updateProgress((++completedSteps / totalSteps) * 100);
    }

    //  Player
    let model;
    const playerLoadPromise = new Promise(resolve => {
        new GLTFLoader().load(
            '../../src/animations/avatar/avatar2.glb',
            function (gltf) {
                model = gltf.scene;
                model.position.copy(playerSpawn);
                model.traverse(function (object) {
                    if (object.isMesh) {
                        object.castShadow = true;
                        object.name = 'player';
                    }
                });
                model.name = 'player';

                const playerLight = new THREE.PointLight(0xff7700, 15, 15); 
                playerLight.position.set(0, 0, 0);
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

                ChestController.setPlayerModel(model);
                console.log('Player initial position:', model.position.toArray());

                if (onPlayerLoaded) onPlayerLoaded({ model, mixer, animationsMap, characterControls, thirdPersonCamera, collidables });
                updateLoader();
                resolve();
            }
        );
    });
    
    //  Enemies
    const enemies = [];
    const enemyHealthBars = [];
    const enemiesLoadPromise = playerLoadPromise.then(async (playerData) => {
        for (const cfg of enemyConfigs) {
            await new Promise(resolve => {
                const enemy = new EnemyMovement(scene, cfg.modelPath, cfg.pos, cfg.type, (enemyModel) => {
                    const enemyLight = new THREE.PointLight(0xff0000, 1, 4);
                    enemyLight.position.set(0, 0, 0);
                    enemyModel.add(enemyLight);

                    const bar = new EnemyHealthBar(enemyModel, scene, { maxHealth: 100 });
                    enemy.healthBar = bar;
                    enemyHealthBars.push(bar);

                    updateLoader();
                    resolve();
                }, collidables);

                enemies.push(enemy);
            });
        }
        if (onEnemiesLoaded) onEnemiesLoaded({ enemies, enemyHealthBars, collidables });
    });

    //  Key
    const keyLoadPromise = addGlowingKey(scene).then(({ animator, key }) => {
        key.visible = false;
        if (onKeyLoaded) onKeyLoaded({ animator, key });
        updateLoader();
        return { animator, key };
    });

    // ===== LOAD POTION MODEL =====
    const artifactLoader = new GLTFLoader();
    const potionPromise = new Promise((resolve) => {
        artifactLoader.load(
            '../../src/models/artifacts/stylized_low_poly_potion_red.glb',
            (gltf) => {
                console.log('✓ Potion model loaded');
                resolve(gltf.scene);
            },
            undefined,
            (err) => { 
                console.error('Potion load error:', err); 
                resolve(null); 
            }
        );
    });

    const potionModel = await potionPromise;
    // ===== END POTION LOADING =====

    //  Treasure Chests 
    const chestLoader = new GLTFLoader();
    const chestPromises = chestPositions.map((position, index) => {
        return new Promise(resolve => {
            chestLoader.load(
                '../../src/models/treasure_chest.glb',
                function (gltf) {
                    const chest = gltf.scene.clone();
                    chest.position.copy(position);
                    chest.scale.set(1.0, 1.0, 1.0);
                    
                    if (index === 1 || index === 3) {
                        chest.rotation.y = Math.PI;
                    }
                    
                    chest.traverse(function (object) {
                        if (object.isMesh) {
                            object.castShadow = true;
                            object.receiveShadow = true;
                        }
                    });
                    
                    chest.name = `treasure_chest_${index}`;
                    scene.add(chest);

                    // ===== ADD POTION TO CHEST =====
                    let artifact = null;
                    if (potionModel) {
                        artifact = potionModel.clone();
                        artifact.scale.set(0.08, 0.08, 0.08);
                        artifact.rotation.set(0, 0, 0);
                        
                        artifact.traverse((obj) => {
                            if (obj.isMesh) {
                                obj.castShadow = true;
                                obj.receiveShadow = true;
                            }
                        });
                        
                        console.log(`Chest ${index}: Potion added`);
                    }
                    // ===== END POTION SETUP =====
                    
                    // Register chest
                    const registeredChest = ChestController.registerChest(chest, {
                        rotationAxis: 'y',
                        openAngle: Math.PI / 2,
                        pivotOffset: new THREE.Vector3(0, 0, 0.5),
                        duration: 1.2,
                        artifact: artifact
                    });
                    
                    if (!registeredChest) {
                        console.error(`Failed to register chest ${index}`);
                    } else {
                        console.log(`Chest ${index} registered successfully`);
                    }
                    
                    // Collision box
                    const chestCollisionBox = new THREE.Mesh(
                        new THREE.BoxGeometry(2, 2, 2),
                        new THREE.MeshBasicMaterial({ visible: false })
                    );
                    chestCollisionBox.position.copy(position);
                    chestCollisionBox.position.y = 1;
                    chestCollisionBox.name = `chest_collision_${index}`;
                    // This mesh is used only as a proximity/trigger for opening the chest.
                    // Do NOT mark it as staticCollision or add it to `collidables` so it doesn't
                    // participate in the movement collision checks and won't block the player.
                    chestCollisionBox.userData.isChestTrigger = true;
                    scene.add(chestCollisionBox);
                    // intentionally not added to `collidables`
                    
                    console.log(`Treasure chest ${index + 1} added at position:`, position);
                    updateLoader();
                    resolve();
                },
                function (progress) {
                    //console.log('Loading treasure chest progress:', (progress.loaded / progress.total * 100) + '%');
                },
                function (error) {
                    console.error('Error loading treasure chest:', error);
                    resolve();
                }
            );
        });
    });

    await Promise.all([playerLoadPromise, enemiesLoadPromise, keyLoadPromise, ...chestPromises]);
    
    console.log(`\n✓ Level loaded with ${ChestController.chests.length} chests`);
}

export function boxIntersectsMeshBVH(box, mesh) {
    const geometry = mesh.geometry;
    if (!geometry.boundsTree) return false;
    return geometry.boundsTree.intersectsBox(box, mesh.matrixWorld);
}