import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ChestController } from '../ChestController.js';
import { EnemyMovement } from '../movements/enemyMovement.js';
import { ThirdPersonCamera } from '../view/thirdPersonCamera.js';
import { CharacterControls } from '../movements/characterControls.js';
import { addGlowingKey } from '../keyGlow.js';
import { EnemyHealthBar } from '../view/enemyHealthBar.js';
import { soundManager } from '../sounds/soundManger.js'; 

// Function to flip face normals of a geometry
function flipFaceNormals(geometry) {
    if (!geometry.index) {
        console.warn('Geometry has no index, cannot flip normals');
        return;
    }
    
    const indices = geometry.index.array;
    
    // Flip winding order by swapping every second and third vertex
    for (let i = 0; i < indices.length; i += 3) {
        const temp = indices[i + 1];
        indices[i + 1] = indices[i + 2];
        indices[i + 2] = temp;
    }
    
    geometry.index.needsUpdate = true;
    
    // Also flip existing vertex normals if they exist
    if (geometry.attributes.normal) {
        const normals = geometry.attributes.normal.array;
        for (let i = 0; i < normals.length; i++) {
            normals[i] = -normals[i];
        }
        geometry.attributes.normal.needsUpdate = true;
    }
    
    console.log('✓ Flipped face normals for geometry');
}

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
    
    //  Background Music - Use sound manager
    const level1Music = soundManager.playLevelMusic('../sounds/level1.mp3');
    
    // Store reference in scene for cleanup if needed
    scene.userData.levelMusic = level1Music;

    // Define a small room area in negative coordinates and create invisible boundary walls
    const size = 6;
    const half = size / 2;
    const roomCenter = new THREE.Vector3(-10, 0, -10);
    const wallHeight = 6;
    const wallThickness = 0.2;

    const wallPlanes = [
        new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, size), new THREE.MeshBasicMaterial({ visible: false })),
        new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, size), new THREE.MeshBasicMaterial({ visible: false })),
        new THREE.Mesh(new THREE.BoxGeometry(size, wallHeight, wallThickness), new THREE.MeshBasicMaterial({ visible: false })),
        new THREE.Mesh(new THREE.BoxGeometry(size, wallHeight, wallThickness), new THREE.MeshBasicMaterial({ visible: false }))
    ];

    wallPlanes[0].position.set(roomCenter.x + half, wallHeight / 2, roomCenter.z);
    wallPlanes[1].position.set(roomCenter.x - half, wallHeight / 2, roomCenter.z);
    wallPlanes[2].position.set(roomCenter.x, wallHeight / 2, roomCenter.z + half);
    wallPlanes[3].position.set(roomCenter.x, wallHeight / 2, roomCenter.z - half);

    const collidables = [];

    wallPlanes.forEach(wall => {
        if (wall.geometry && wall.geometry.computeBoundsTree) deferComputeBoundsTree(wall.geometry);
        wall.userData.staticCollision = true;
        scene.add(wall);
        collidables.push(wall);
    });

    // 🆕 LOAD LEVEL GEOMETRY FIRST (level2.js approach)
    const levelModelPromise = new Promise(resolve => {
        const levelLoader = new GLTFLoader();
        levelLoader.load(
            '../../src/levels/level1/Level1.glb',
            (gltf) => {
                const levelModel = gltf.scene;
                levelModel.name = 'Level1Room';
                levelModel.position.copy(roomCenter);
                levelModel.scale.set(0.2, 0.2, 0.2);

                levelModel.traverse((obj) => {
                    if (obj.isMesh) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;
                        obj.userData.staticCollision = true;
                        
                        // 🆕 Mark ground meshes for proper collision handling (level2.js approach)
                        if (obj.name.toLowerCase().includes('ground') || obj.name.toLowerCase().includes('floor')) {
                            obj.userData.isGround = true;
                        }
                        
                        if (obj.geometry && obj.geometry.computeBoundsTree) deferComputeBoundsTree(obj.geometry);
                    }
                });
                
                scene.add(levelModel);
                
                // 🆕 CRITICAL: Update world matrices immediately for proper collision detection (level2.js approach)
                try { 
                    levelModel.updateMatrixWorld(true); 
                    scene.updateMatrixWorld(true);
                } catch (e) {
                    console.warn('Matrix update warning:', e);
                }
                
                // 🆕 Add collidables after matrix update (level2.js approach)
                levelModel.traverse(obj => {
                    if (obj.isMesh && obj.userData.staticCollision) {
                        collidables.push(obj);
                        console.log('Added collidable:', obj.name || 'unnamed mesh');
                    }
                });
                
                resolve(levelModel);
            },
            undefined,
            (err) => {
                console.warn('Level1.glb failed to load:', err);
                resolve();
            }
        );
    });

    // 🆕 WAIT FOR LEVEL GEOMETRY TO LOAD BEFORE PLAYER (level2.js approach)
    const levelModel = await levelModelPromise;

    // 🆕 NEW: Create a simple ground plane at the correct height to ensure player stays on ground (level2.js approach)
    const groundPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.3,
            visible: false // Make invisible but still functional for collisions
        })
    );
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = 0.05; // Match enemy ground height
    groundPlane.name = 'ground_plane';
    groundPlane.userData.staticCollision = true;
    groundPlane.userData.isGround = true;
    scene.add(groundPlane);
    collidables.push(groundPlane);

    // Spawn the player inside the small negative room
    const playerSpawn = new THREE.Vector3(-18, 0.5, -5.0);

    // 🆕 Debug: Add spawn marker to visualize spawn position (level2.js approach)
    //const spawnMarker = new THREE.Mesh(
    //    new THREE.SphereGeometry(0.5),
    //    new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 })
    //);
    //spawnMarker.position.copy(playerSpawn);
    //scene.add(spawnMarker);

    // Position enemies inside the small negative room
    const enemyConfigs = [
        { pos: new THREE.Vector3(-7, 0.15, 8), type: "goblin", modelPath: "../../src/animations/enemies/enemy1_1.glb" },
        { pos: new THREE.Vector3(-5, 0.15, -20), type: "goblin", modelPath: "../../src/animations/enemies/enemy1_1.glb" },
        { pos: new THREE.Vector3(1, 0.15, 8), type: "vampire", modelPath: "../../src/animations/enemies/enemy2.glb" },
        { pos: new THREE.Vector3(3.0, 0.15, -17), type: "boss", modelPath: "../../src/animations/enemies/boss.glb" }
    ];

    // Position chests inside the small negative room (near corners but within bounds)
    const chestPositions = [
        new THREE.Vector3(-5, 0.15, 7),
        new THREE.Vector3(6.0, 0.15, -27),
        new THREE.Vector3(-5, 0.15, 11),
        new THREE.Vector3(-9, 0.15, 0)
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

                // 🆕 Small delay to ensure collision system is fully initialized (level2.js approach)
                setTimeout(() => {
                    const characterControls = new CharacterControls(model, mixer, animationsMap, thirdPersonCamera, 'Idle', collidables);
                    
                    // 🆕 Debug: Verify spawn position and collision setup (level2.js approach)
                    console.log('Player spawned at:', playerSpawn);
                    console.log('Total collidables:', collidables.length);
                    console.log('Level geometry loaded:', levelModel ? 'Yes' : 'No');
                    
                    // 🆕 NEW: Force immediate ground snapping using CharacterControls method
                    characterControls.update(0.016, {}); // Small delta to initialize
                    
                    ChestController.setPlayerModel(model);
                    console.log('Player initial position:', model.position.toArray());

                    if (onPlayerLoaded) onPlayerLoaded({ 
                        model, 
                        mixer, 
                        animationsMap, 
                        characterControls, 
                        thirdPersonCamera, 
                        collidables 
                    });
                    updateLoader();
                    resolve();
                }, 100);
            }
        );
    });
    
    //  Enemies
    const enemies = [];
    const enemyHealthBars = [];
    const enemiesLoadPromise = playerLoadPromise.then(async () => {
        for (const cfg of enemyConfigs) {
            await new Promise(resolve => {
                const enemy = new EnemyMovement(scene, cfg.modelPath, cfg.pos, cfg.type, (enemyModel) => {
                    const enemyLight = new THREE.PointLight(0xff0000, 1, 4);
                    enemyLight.position.set(0, 0, 0);
                    enemyModel.add(enemyLight);

                    // create health bar using the enemy's configured health so the UI fills correctly
                    const bar = new EnemyHealthBar(enemyModel, scene, { maxHealth: enemy.health });
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
    const keyPosition = new THREE.Vector3(-7, 0.15, -16);
    const keyLoadPromise = addGlowingKey(scene, keyPosition).then(({ animator, key }) => {
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
                    
                    // 🆕 Collision box (improved like level2.js)
                    const chestCollisionBox = new THREE.Mesh(
                        new THREE.BoxGeometry(2, 2, 2),
                        new THREE.MeshBasicMaterial({ visible: false })
                    );
                    chestCollisionBox.position.copy(position);
                    chestCollisionBox.position.y = 1;
                    chestCollisionBox.name = `chest_collision_${index}`;
                    chestCollisionBox.userData.staticCollision = true;  // 🆕 CHANGED from isChestTrigger
                    if (chestCollisionBox.geometry && chestCollisionBox.geometry.computeBoundsTree)
                        deferComputeBoundsTree(chestCollisionBox.geometry);
                    scene.add(chestCollisionBox);
                    try { chestCollisionBox.updateMatrixWorld(true); } catch (e) {}
                    
                    collidables.push(chestCollisionBox);  // 🆕 NEW: Add to collidables array
                    
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
    
    // 🆕 Final debug info (level2.js approach)
    console.log(`\n✓ Level loaded with ${ChestController.chests.length} chests`);
    console.log('Player spawn position:', playerSpawn);
    console.log('Total collidable objects:', collidables.length);
}

// MOVE THIS FUNCTION OUTSIDE OF loadDemoLevel - it should be at the module level
export function cleanupDemoLevel() {
    soundManager.stopCurrentMusic();
}

export function boxIntersectsMeshBVH(box, mesh) {
    const geometry = mesh.geometry;
    if (!geometry.boundsTree) return false;
    return geometry.boundsTree.intersectsBox(box, mesh.matrixWorld);
}