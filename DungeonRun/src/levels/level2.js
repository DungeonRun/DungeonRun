import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EnemyMovement } from '../movements/enemyMovement.js';
import { ThirdPersonCamera } from '../view/thirdPersonCamera.js';
import { CharacterControls } from '../movements/characterControls.js';
import { addGlowingKey } from '../keyGlow.js';
import { EnemyHealthBar } from '../view/enemyHealthBar.js';
import { soundManager } from '../sounds/soundManger.js';

export async function loadLevel2({
    scene,
    renderer,
    camera,
    loader,
    onPlayerLoaded,
    onEnemiesLoaded,
    onKeyLoaded
}) {
    THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
    THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
    THREE.Mesh.prototype.raycast = acceleratedRaycast;

    function deferComputeBoundsTree(geometry) {
        if (!geometry || !geometry.computeBoundsTree) return;
        const fn = () => { try { geometry.computeBoundsTree(); } catch (e) { console.warn('computeBoundsTree failed', e); } };
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
    const level2Music = soundManager.playLevelMusic('../sounds/level2.mp3');
    
    // Store reference in scene for cleanup if needed
    scene.userData.levelMusic = level2Music;

    //  Floor
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

    floor.name = 'ground';
    floor.userData.staticCollision = true;
    if (floor.geometry && floor.geometry.computeBoundsTree) deferComputeBoundsTree(floor.geometry);

    const collidables = [];
    collidables.push(floor);

    const playerSpawn = new THREE.Vector3(3, 3, 0);

    const enemyConfigs = [
        { pos: new THREE.Vector3(21.94, 0.05, -20.59), type: "goblin", modelPath: "/src/animations/enemies/enemy1_1.glb" },
        { pos: new THREE.Vector3(16.44, 0.05, -21.36), type: "goblin", modelPath: "/src/animations/enemies/enemy1_1.glb" },
        { pos: new THREE.Vector3(34.17, 0.05, -20.8), type: "goblin", modelPath: "/src/animations/enemies/enemy1_1.glb" },
        { pos: new THREE.Vector3(81.69, 0.15, -29.49), type: "vampire", modelPath: "/src/animations/enemies/enemy2.glb" },
        { pos: new THREE.Vector3(71.34, 0.15, -35.88), type: "vampire", modelPath: "/src/animations/enemies/enemy2.glb" },
        { pos: new THREE.Vector3(101.23, 0.05, -80.53), type: "vampire", modelPath: "/src/animations/enemies/enemy2.glb" },
        { pos: new THREE.Vector3(97.82, 0.05, -105.39), type: "goblin", modelPath: "/src/animations/enemies/enemy1_1.glb" },
        { pos: new THREE.Vector3(89.03, 0.15, -151.41), type: "boss", modelPath: "/src/animations/enemies/boss.glb" },
        { pos: new THREE.Vector3(101.16, 0.15, -173.29), type: "boss", modelPath: "/src/animations/enemies/boss.glb" },
        { pos: new THREE.Vector3(121.08, 0.15, -159.28), type: "boss", modelPath: "/src/animations/enemies/boss.glb" },
        { pos: new THREE.Vector3(101.32, 0.15, -152.95), type: "boss", modelPath: "/src/animations/enemies/boss.glb" }
    ];

    const chestPositions = [
        new THREE.Vector3(43.36, 0.05, -13.49),
        new THREE.Vector3(57, 0.15, -36.07),
        new THREE.Vector3(77.44, 0.15, -23.59),
        new THREE.Vector3(2.88, 0.05, -32.44),
        new THREE.Vector3(71.65, 0.15, -21.71),
        new THREE.Vector3(103.63, 0.05, -108.81),
        new THREE.Vector3(89.75, 0.15, -140.17),
        new THREE.Vector3(87.41, 0.15, -167.99),
        new THREE.Vector3(116.86, 0.15, -168.79),
        new THREE.Vector3(114.62, 0.15, -140.53)
    ];

    const roomPosition = new THREE.Vector3(75, 0, -75);

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
                gltfAnimations.filter(a => a.name !== 'TPose').forEach(a => {
                    animationsMap.set(a.name, mixer.clipAction(a));
                });

                const thirdPersonCamera = new ThirdPersonCamera({
                    camera: camera,
                    target: model,
                    scene: scene
                });

                const characterControls = new CharacterControls(model, mixer, animationsMap, thirdPersonCamera, 'Idle', collidables);
                if (onPlayerLoaded) onPlayerLoaded({ model, mixer, animationsMap, characterControls, thirdPersonCamera, collidables });
                updateLoader();
                resolve();
            }
        );
    });

    //  Enemies
    const enemies = [];
    const enemyHealthBars = [];
    const enemiesLoadPromise = playerLoadPromise.then(async () => {
        const enemyLoadPromises = enemyConfigs.map(cfg =>
            new Promise(resolve => {
                const enemy = new EnemyMovement(scene, cfg.modelPath, cfg.pos, cfg.type, enemyModel => {
                    const enemyLight = new THREE.PointLight(0xff0000, 1, 4);
                    enemyLight.position.set(0, 0, 0);
                    enemyModel.add(enemyLight);

                    const bar = new EnemyHealthBar(enemyModel, scene, { maxHealth: 100 });
                    enemy.healthBar = bar;
                    enemyHealthBars.push(bar);
                    updateLoader();
                    resolve(enemy);
                }, collidables);
                enemies.push(enemy);
            })
        );

        await Promise.all(enemyLoadPromises);
        if (onEnemiesLoaded) onEnemiesLoaded({ enemies, enemyHealthBars, collidables });
    });

    //  Level Geometry
    const levelModelPromise = new Promise(resolve => {
        const levelLoader = new GLTFLoader();
        levelLoader.load(
            '/src/levels/level2/level2.glb',
            gltf => {
                const levelModel = gltf.scene;
                levelModel.position.copy(roomPosition);
                levelModel.traverse(obj => {
                    if (obj.isMesh) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;
                        obj.userData.staticCollision = true;
                        if (obj.geometry && obj.geometry.computeBoundsTree) {
                            deferComputeBoundsTree(obj.geometry);
                        }
                    }
                });
                scene.add(levelModel);
                levelModel.traverse(obj => {
                    if (obj.isMesh) collidables.push(obj);
                });
                updateLoader();
                resolve(levelModel);
            },
            undefined,
            err => {
                console.warn('Could not load level model:', err);
                updateLoader();
                resolve();
            }
        );
    });

    //  Key
    const keyPosition = new THREE.Vector3(100.37, 0.15, -169.24);
    const keyLoadPromise = addGlowingKey(scene, keyPosition).then(({ animator, key }) => {
        key.visible = true;
        if (onKeyLoaded) onKeyLoaded({ animator, key });
        updateLoader();
        return { animator, key };
    });

    //  Treasure Chests
    const chestLoader = new GLTFLoader();
    const chestPromises = chestPositions.map((position, index) =>
        new Promise(resolve => {
            chestLoader.load(
                '/src/models/treasure_chest.glb',
                gltf => {
                    const chest = gltf.scene.clone();
                    chest.position.copy(position);
                    chest.scale.set(1.0, 1.0, 1.0);
                    if (index === 1 || index === 3) chest.rotation.y = Math.PI;

                    chest.traverse(object => {
                        if (object.isMesh) {
                            object.castShadow = true;
                            object.receiveShadow = true;
                        }
                    });

                    chest.name = `treasure_chest_${index}`;
                    scene.add(chest);

                    const chestCollisionBox = new THREE.Mesh(
                        new THREE.BoxGeometry(2, 2, 2),
                        new THREE.MeshBasicMaterial({ visible: false })
                    );
                    chestCollisionBox.position.copy(position);
                    chestCollisionBox.position.y = 1;
                    chestCollisionBox.name = `chest_collision_${index}`;
                    chestCollisionBox.userData.staticCollision = true;
                    if (chestCollisionBox.geometry && chestCollisionBox.geometry.computeBoundsTree)
                        deferComputeBoundsTree(chestCollisionBox.geometry);
                    scene.add(chestCollisionBox);

                    collidables.push(chestCollisionBox);
                    console.log(`Treasure chest ${index + 1} added at position:`, position);
                    updateLoader();
                    resolve();
                },
                undefined,
                error => {
                    console.error('Error loading treasure chest:', error);
                    resolve();
                }
            );
        })
    );

    await Promise.all([playerLoadPromise, enemiesLoadPromise, keyLoadPromise, levelModelPromise, ...chestPromises]);
}

// Cleanup function to stop level music when leaving level
export function cleanupLevel2() {
    soundManager.stopCurrentMusic();
}

// Collision BVH helper
export function boxIntersectsMeshBVH(box, mesh) {
    const geometry = mesh.geometry;
    if (!geometry.boundsTree) return false;
    return geometry.boundsTree.intersectsBox(box, mesh.matrixWorld);
}