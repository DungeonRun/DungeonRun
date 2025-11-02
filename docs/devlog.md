# Devlog Documentation

This document outlines the individuals involved in the "DungeonRun" project and the feature explanation files they have changed, along with additional details.

## People and Contributions

### 1. Favour Mtshali
- **Feature Files Changed**:
  - `index.js` - Added initial Three.js scene setup to correspond to the avatar movement i wanted to create.
  - `index.html` - Configured canvas and script imports.
- `enemyMovement.js` - added this file that ensures that the cubes detect the avatar through raycasting and moves towards the player
- `utils.js` - has all the keyboard keys assigned to different actions,holds some logic for key as well as character movement
- `keyGlow` - Takes in the glb key model and adds a glow to and makes it float above ground added some animation to it,
- **Notes**: Added index.js and utils as well as models folder where i downloaded a three js model and inserted it in the code,the avatar can walk and run when the shift button is actually pressed added the default animation that i was given on the model,the controls that control the movements are the key arrows depicting all directions .KeyGlow is a model that renders a key that animates and glows connected to some files ive wriiten grabbing distance is 0.5.test
- 
- **Additional Info**: sourced code from yt :https://youtu.be/C3s0UHpwlf8?si=TtpLCdtNmBIQl0qE for credits.
- Used chat for fine tuning the codes for raycasting movement and all . yt:https://youtu.be/Mpd1MFr8HoE?si=AQsYCRLaewkZcedp
- I have implemented key-based animation triggers where pressing Space makes the avatar jump, F performs a punch, E swings a sword, R triggers a pickup action, T plays the open animation, G performs a push, and X plays the death animation (which will later be automated upon death).
- I have deleted the previous models for enemies and added new ones
- Enemy avatars can follow you and attack you
- Added better animations based on the Main screen login ui across Credits,Instructions and settings and across game center
- Added gameover sound within the game and plays when the game over page loads
- 

### 2. Niel Grobler
- **Features Developed**: 
  - added health, damage, and the player being able to attack with punching, swords or spells (with a custom shader for projectiles)
  - implemented level loading functionality and loading screen, game overs, and collision(?)
  - large codebase refactoring and fixing bugs in other's features
  - bunch of commits i can't name, check commit logs
  
- **Notes**: 
- **Additional Info**: 

### 3. Ntokozo Skosana
## Features Developed
- **Enemy Design** for Project Beta submission  
- **Ground Collision Detection**  
- **Sound Integration** for Main Menu and Button Clicks  
- **Pause Menu Implementation**  
- **GameOver UI with Consistent Color Scheme**  
- **Loading Screen Animation and UI**

## Initial Implementation

### Enemy Design
For the beta build, I designed **three enemy models** sourced from Sketchfab — **MonsterEye**, **Mutant**, and **ScaryMonster**.  
Each model was imported and optimized in Three.js using the `GLTFLoader`. The initial implementation focused on creating basic AI movement patterns through `enemyMovement.js`, where enemies patrol fixed paths and react to player proximity. **Note:** Although the designs were functional, the team later decided to change the enemy models for the final submission to better align with the game’s art style and theme.

---

### Ground Collision Detection
Previously, both the **player** and **enemy characters** occasionally fell through the floor due to missing or inconsistent collision checks.  
To fix this, I implemented **ground collision detection** in `characterControl.js` and `enemyMovement.js` using **raycasting** from each entity’s position downward.  

The logic checks for intersections with the ground mesh:
1. A downward ray (`THREE.Raycaster`) is cast from the entity’s position.
2. If a hit is detected, the Y-position of the character is clamped to the hit point.
3. If no hit is found (e.g., stepping off a platform), gravity is applied normally.

This ensures smooth walking on uneven terrain and prevents objects from sinking or floating.

---

### Sound Integration
I downloaded **MP3 sound effects** from **Pixabay** — specifically background music for the main menu and button click sounds for UI interactions.  
These were integrated into `index.js` using the Three.js `AudioListener` and `Audio` objects.

A known limitation (browser restriction) is that **sound won’t play until the user interacts with the screen**, which was resolved by triggering the `play()` call after the first user click.

---

### Pause Menu
I implemented a **Pause Menu UI** in the `view/` folder (`pauseMenuUI.js`) and integrated into `index.js`.  
The menu can be toggled by pressing **M**:
- Press **M** → Pauses the game (scene updates halted)
- Press **M** again → Resumes gameplay

The Pause Menu includes:
- **Continue** button (resumes gameplay)
- **Restart** button (reloads the current level)

---

### GameOver UI
The **GameOver UI** received a visual overhaul for color consistency.  
I replaced the previous color overlay with a **red-orange gradient**, matching the dungeon’s warm color scheme.  
Text styling, button hover effects, and background opacity were refined to create a cleaner transition between gameplay and the game-over state.

---

### Loading Screen Animation and UI
I added a **procedural spider-web animation** as the background for the loading screen in `load.js`.  
Each web is **procedurally drawn** on a canvas:
- Uses **radial spokes** and **concentric rings** with small random irregularities.
- **Slow rotation and drift** create a sense of motion and depth.
- **Soft orange rim glow** maintains palette consistency with the main game UI.
- **Performance optimized:** limited number of webs and automatic cleanup when the loader hides.

This animation is responsive and lightweight, setting the mood before gameplay begins.

---

## Team Feedback Received

| Feedback Area | Team Response |
|----------------|----------------|
| **Enemy Models** | The team did not like the appearance of the enemies and suggested replacing them for the final submission to improve visual cohesion. |
| **Ground Collision** | Highly praised — the avatar and enemies no longer disappeared through the floor, which improved overall polish and playability. |
| **Sound System** | The team enjoyed the music and click effects, though noted the initial bug where sound only plays after user interaction (browser autoplay restriction). |
| **Pause Menu** | Widely appreciated — functional **restart** and **continue** buttons, smooth transitions, and convenient **M key** toggle were user-friendly. |
| **Loading Screen** | The animated background was a favorite fitting perfectly with the dungeon’s aesthetic. |

---
## Files Updated
- `load.js` → Added animated background and consistent color scheme  
- `enemyMovement.js` → Implemented patrol logic and ground collision  
- `characterControl.js` → Added ground detection 
- `index.js` → Integrated sounds, pause system, and event handling  
- `GameOverUI.js` → Updated color scheme and text layout  
- `pauseMenuUI.js` → Created and styled the pause menu interface  

---



### 4. Risuna 
- **Features Developed**:
  - Third-person camera system implementation
  - Removed OrbitControls and replaced with smooth following camera
  - Fixed texture loading paths for sand floor
  
- **Initial Implementation**: 
  - Implemented third-person camera based on YouTube tutorial: https://youtu.be/UuNPHOJ_V5o?si=cgUkKepd6sHty8dP
  - Camera smoothly follows avatar with fixed offset behind and above player
  - Uses lerp interpolation for smooth movement transitions
  - Fixed texture issue - floor was previously blue due to incorrect texture paths, now displays proper sand texture
  - Created `thirdPersonCamera.js` class with configurable offsets
  - Updated `characterControls.js` to work with new camera system
  - Modified `index.js` to integrate third-person camera

- **Team Feedback Received**:
  The team tested the camera and reported several issues:
  - Main issue was that the camera appeared to be positioned at the front of the avatar instead of behind
  - Camera should be positioned behind the avatar with the avatar slightly left of center (Fortnite style)
  - Camera should be able to orbit independently without turning the player - using mouse to look around
  - When moving, the character should move in the direction of the camera to avoid the weird locked effect
  - Camera should be zoomed in a bit closer to the avatar
  - Camera should look in the same direction as what the player needs to pay attention to for attacks
  - Movement was hard to distinguish - it felt like the surface was moving instead of the avatar moving

- **Updates Made Based on Feedback**:
  Due to the team's feedback, I completely rewrote the camera system and made the following changes:
  
  1. Repositioned camera to be truly behind the avatar with over-the-shoulder view (slightly right of center)
  2. Implemented camera pivot system so camera can orbit around player using mouse without rotating the player
  3. Added pointer lock API - click to lock mouse for camera control, ESC to unlock
  4. Changed movement system so character moves in the direction the camera is facing (W always moves forward from camera's perspective)
  5. Fixed character rotation so they face the direction they're moving (no more backward movement)
  6. Adjusted to Fortnite-style closer positioning - 7 units behind, 4.5 units up, 1.5 units right
  7. Camera now looks slightly ahead of player for better forward visibility
  8. Increased movement speeds (run: 6, walk: 3) and made camera more responsive for clearer movement distinction
  9. Increased character rotation speed to 0.3 for fluid, responsive direction changes
  
- **Files Updated**:
  - `thirdPersonCamera.js` - Complete rewrite with camera pivot, mouse controls, player rotation tracking, and Fortnite-style positioning
  - `characterControls.js` - Rewrote movement system to be camera-relative, fixed character facing direction to match movement
  - `index.js` - Updated to pass scene parameter to camera constructor
  
- **Additional Info**: 
  - Camera offset: (1.5, 4.5, -7) for over-the-shoulder view
  - Look-ahead offset: (0, 1.8, 2) for better visibility
  - Supports mouse sensitivity adjustment and rotation limits
  - Balanced smoothing (0.02) for responsive but smooth following
  
 - **Chest Open/Close Logic**:
   - Renamed the chest model's lid-related mesh parts so they can be targeted in code.
   - Implemented `ChestController` to handle open/close interactions.
   - Used rotation angles verified in Blender to animate the lid so it opens and closes correctly.
   - Ensured the lid returns to a proper closed position and re-opens smoothly using the same hinge reference and angles.
   - Files involved: `src/ChestController.js`, `src/ChestControllerClean.js`, and level integration via `src/levels/demoLevel.js`.
 
 - **Chest Potions and Pickup**:
   - Placed a potion artifact inside every chest when spawning in `src/levels/demoLevel.js`.
   - Open/close chest with T (hold) or C (toggle) near a chest.
   - Press R near an open chest to pick up the potion: it disappears and heals +10 HP.
   - Uses the same R key as the floating key pickup for consistency.
  

### 5. Naledi Mogomotsi
- **Features Developed**:
  - Treasure chest implementation and placement
  - Chest collision system integration
  - Chest scaling and rotation adjustments
  
- **Files Changed**:
  - `src/levels/demoLevel.js` - Added treasure chest loading, positioning, scaling, collision detection, and rotation logic
  
- **Implementation Details**:
  - **Initial Setup**: Added 4 treasure chests positioned at room corners using the existing `treasure_chest.glb` model
  - **Positioning**: Chests placed at coordinates (-8,0,-8), (8,0,-8), (-8,0,8), and (8,0,8) for corner placement
  - **Scaling**: Initially scaled chests to 1.5x size, later adjusted to 1.0x for better proportions
  - **Collision System**: Implemented invisible collision boxes (2x2x2 units) for each chest with BVH integration
  - **Collision Integration**: Added chest collision boxes to the `collidables` array for both player and enemy collision detection
  - **Rotation**: Added 180-degree Y-axis rotation for right-side chests to face away from walls instead of toward them
  - **Shadow Support**: Enabled proper shadow casting and receiving for all chest meshes
  - **Error Handling**: Added progress tracking and error handling for model loading
  
- **Technical Features**:
  - Uses GLTFLoader for model loading with proper cloning for multiple instances
  - Integrates with existing BVH collision system used by walls and other obstacles
  - Maintains unique naming convention for each chest and collision box
  - Provides console logging for debugging and progress tracking
  
- **Gameplay Impact**:
  - Chests now act as solid obstacles that both player and enemies must navigate around
  - Adds strategic elements to level design by creating navigation challenges
  - Chests are properly scaled and positioned for visual appeal and gameplay balance
  
- **Notes**: Successfully integrated treasure chests into the existing game architecture without breaking existing collision or movement systems. All chests are fully functional with proper collision detection for both player and enemy entities.
  
- **Additional Info**: Implementation follows the same patterns as existing models (enemies, player, key) and integrates seamlessly with the current game architecture. Chests use the same collision detection system as walls and other obstacles for consistent gameplay behavior. 

### 6. Hulisani
- **Features Developed**:
  - 
- **Notes**: 
- **Additional Info**: 

## Additional Notes
- index.js is our main file where the three.js will be housed not the main.js
- models please insert built or downloaded models in the model files for easy exportation
- textures was meant to show the floor but it failed me ,and its not my job after all.

## Additional concerns
- 
