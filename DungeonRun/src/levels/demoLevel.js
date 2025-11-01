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

    wallPlanes.forEach(wall => {
        if (wall.geometry && wall.geometry.computeBoundsTree) deferComputeBoundsTree(wall.geometry);
        wall.userData.staticCollision = true;
        scene.add(wall);
    });
    const collidables = [...wallPlanes];

    // Load Level1.glb as the room/level geometry
    try {
        const levelLoader = new GLTFLoader();
        const level1 = await new Promise((resolve, reject) => {
            levelLoader.load(
                '/src/levels/level1/Level1.glb',
                (gltf) => resolve(gltf.scene),
                undefined,
                (err) => reject(err)
            );
        });
        level1.name = 'Level1Room';
        level1.position.copy(roomCenter);
        // REMOVED SCALING - Use room at original Blender size
        // level1.scale.set(0.5, 0.5, 0.5);
        
        console.log('\n=== LEVEL1 TEXTURE DEBUG ===');
        level1.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
                
                console.log(`\nMesh: ${obj.name || 'Unnamed'}`);
                console.log('Position:', obj.position.toArray());
                console.log('Has UV:', !!obj.geometry.attributes.uv);
                
                // FIXED: Handle materials with proper texture settings
                if (obj.material) {
                    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                    
                    materials.forEach((mat, index) => {
                        console.log(`  Material ${index}:`, mat.name || 'Unnamed');
                        console.log('    Color:', mat.color?.getHexString());
                        console.log('    Roughness:', mat.roughness);
                        console.log('    Metalness:', mat.metalness);
                        
                        // CRITICAL FIX: Try different wrapping modes
                        // Base Color / Albedo Map
                        if (mat.map) {
                            console.log('    ✓ Base Color Map found');
                            console.log('      Size:', mat.map.image?.width, 'x', mat.map.image?.height);
                            mat.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                            mat.map.encoding = THREE.sRGBEncoding;
                            
                            // FIX: Try ClampToEdge instead of RepeatWrapping
                            // This often fixes "broken lines" issues
                            mat.map.wrapS = THREE.ClampToEdgeWrapping;
                            mat.map.wrapT = THREE.ClampToEdgeWrapping;
                            
                            // Log current repeat values from Blender
                            console.log('      Repeat:', mat.map.repeat.x, mat.map.repeat.y);
                            console.log('      Offset:', mat.map.offset.x, mat.map.offset.y);
                            
                            // CRITICAL: Reset repeat to 1,1 if it's causing issues
                            mat.map.repeat.set(1, 1);
                            mat.map.offset.set(0, 0);
                            
                            mat.map.needsUpdate = true;
                        } else {
                            console.log('    ✗ No Base Color Map');
                        }
                        
                        // Normal Map
                        if (mat.normalMap) {
                            console.log('    ✓ Normal Map found');
                            mat.normalMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
                            mat.normalMap.wrapS = THREE.ClampToEdgeWrapping;
                            mat.normalMap.wrapT = THREE.ClampToEdgeWrapping;
                            mat.normalMap.repeat.set(1, 1);
                            mat.normalMap.offset.set(0, 0);
                            
                            // Ensure normal scale is set
                            if (!mat.normalScale) {
                                mat.normalScale = new THREE.Vector2(1, 1);
                            }
                            console.log('      Normal Scale:', mat.normalScale.x, mat.normalScale.y);
                            mat.normalMap.needsUpdate = true;
                        } else {
                            console.log('    ✗ No Normal Map');
                        }
                        
                        // Roughness Map
                        if (mat.roughnessMap) {
                            console.log('    ✓ Roughness Map found');
                            mat.roughnessMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
                            mat.roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
                            mat.roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
                            mat.roughnessMap.repeat.set(1, 1);
                            mat.roughnessMap.offset.set(0, 0);
                            mat.roughnessMap.needsUpdate = true;
                        } else {
                            console.log('    ✗ No Roughness Map');
                        }
                        
                        // Metalness Map
                        if (mat.metalnessMap) {
                            console.log('    ✓ Metalness Map found');
                            mat.metalnessMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
                            mat.metalnessMap.wrapS = THREE.ClampToEdgeWrapping;
                            mat.metalnessMap.wrapT = THREE.ClampToEdgeWrapping;
                            mat.metalnessMap.repeat.set(1, 1);
                            mat.metalnessMap.offset.set(0, 0);
                            mat.metalnessMap.needsUpdate = true;
                        }
                        
                        // AO Map (requires UV2)
                        if (mat.aoMap) {
                            console.log('    ✓ AO Map found');
                            mat.aoMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
                            mat.aoMap.wrapS = THREE.ClampToEdgeWrapping;
                            mat.aoMap.wrapT = THREE.ClampToEdgeWrapping;
                            mat.aoMap.repeat.set(1, 1);
                            mat.aoMap.offset.set(0, 0);
                            
                            // Check for UV2 channel
                            if (obj.geometry && !obj.geometry.attributes.uv2) {
                                console.warn('    ⚠ AO map needs UV2, copying from UV');
                                obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
                            }
                            mat.aoMap.needsUpdate = true;
                        }
                        
                        // Ensure proper rendering
                        mat.side = THREE.FrontSide;
                        mat.needsUpdate = true;
                    });
                }
                
                if (obj.geometry && obj.geometry.computeBoundsTree) deferComputeBoundsTree(obj.geometry);
                obj.userData.staticCollision = true;
                collidables.push(obj);
            }
        });
        
        console.log('=== END TEXTURE DEBUG ===\n');
        scene.add(level1);
    } catch (e) {
        console.warn('Level1.glb failed to load:', e);
    }

    // Spawn the player inside the small negative room
    const playerSpawn = new THREE.Vector3(-89.25, 1.00, -22.37);

    // Position enemies inside the small negative room
    const enemyConfigs = [
        { pos: new THREE.Vector3(-36.56, 1.00, 39.62), type: "goblin", modelPath: "/src/animations/enemies/enemy1_1.glb" },
        { pos: new THREE.Vector3(-25.57, 1.00, -100.84), type: "goblin", modelPath: "/src/animations/enemies/enemy1_1.glb" },
        { pos: new THREE.Vector3(21.99, 1.00, 97.69), type: "vampire", modelPath: "/src/animations/enemies/enemy2.glb" },
        { pos: new THREE.Vector3(46.72, 1.00, -37.18), type: "boss", modelPath: "/src/animations/enemies/boss.glb" }
    ];

    // Position chests inside the small negative room (near corners but within bounds)
    const chestPositions = [
        new THREE.Vector3(-9.80, 1.00, 20.41),
        new THREE.Vector3(65.22, 1.00, -118.77),
        new THREE.Vector3(-7.69, 1.00, 12.97),
        new THREE.Vector3(-13.18, 1.00, 71.78)
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
            '/src/animations/avatar/avatar2.glb',
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
    const keyPosition = new THREE.Vector3(73.01, 1.00, -62.46);
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
            '/src/models/artifacts/stylized_low_poly_potion_red.glb',
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
                '/src/models/treasure_chest.glb',
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
                    chestCollisionBox.userData.isChestTrigger = true;
                    scene.add(chestCollisionBox);
                    
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

// MOVE THIS FUNCTION OUTSIDE OF loadDemoLevel - it should be at the module level
export function cleanupDemoLevel() {
    soundManager.stopCurrentMusic();
}

export function boxIntersectsMeshBVH(box, mesh) {
    const geometry = mesh.geometry;
    if (!geometry.boundsTree) return false;
    return geometry.boundsTree.intersectsBox(box, mesh.matrixWorld);
}