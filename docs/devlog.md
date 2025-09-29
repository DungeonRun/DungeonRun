# Devlog Documentation

This document outlines the individuals involved in the "DungeonRun" project and the feature explanation files they have changed, along with additional details.

## People and Contributions

### 1. Favour Mtshali
- **Feature Files Changed**:
  - `index.js` - Added initial Three.js scene setup to correspond to the avatar movement i wanted to create.
  - `index.html` - Configured canvas and script imports.
- enemyMovement.js - added this file that ensures that the cubes detect the avatar through raycasting and moves towards the player
- **Notes**: Added index.js and utils as well as models folder where i downloaded a three js model and inserted it in the code,the avatar can walk and run when the shift button is actually pressed added the default animation that i was given on the model,the controls that control the movements are the key arrows depicting all directions .
- **Additional Info**: sourced code from yt :https://youtu.be/C3s0UHpwlf8?si=TtpLCdtNmBIQl0qE for credits.
- Used chat for fine tuning the codes for raycasting movement and all . yt:https://youtu.be/Mpd1MFr8HoE?si=AQsYCRLaewkZcedp

### 2. Niel Grobler
- **Features Developed**:
  
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
- **Notes**: 
  - Implemented third-person camera based on YouTube tutorial: https://youtu.be/UuNPHOJ_V5o?si=cgUkKepd6sHty8dP
  - Camera now smoothly follows avatar with fixed offset behind and above player
  - Uses lerp interpolation for smooth movement transitions
  - Fixed texture issue - floor was previously blue due to incorrect texture paths, now displays proper sand texture
  - Camera maintains correct relative position when avatar rotates
- **Additional Info**: 
  - Created `thirdPersonCamera.js` class with configurable offsets
  - Updated `characterControls.js` to work with new camera system
  - Modified `index.js` to integrate third-person camera
  - Will continue implementation once dungeon structure is available for collision detection 

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
