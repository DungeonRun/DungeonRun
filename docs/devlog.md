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

### 2. Niel Grobler
- **Features Developed**: 
  - Added Health
  - Refactored for level loading
  - Added Cube
  
- **Notes**: 
- **Additional Info**: 

### 3. Ntokozo Skosana
- **Features Developed**:
  - 
- **Notes**: .
- **Additional Info**: 

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
  

### 5. Naledi Mogomotsi
- **Features Developed**:
  - 
- **Notes**: 
- **Additional Info**: 

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
