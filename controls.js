// ============================================
// ECHOES OF THE OBELISK - Controls System
// Mobile touch input + camera management
// ============================================

import * as THREE from 'three';
import { getPlayer } from './entities.js';
import { getDungeonScene, getTownScene } from './dungeon.js';

// ============================================
// STATE
// ============================================

let camera;
let controlsEnabled = true;
let currentScene = null;

// Input state
const inputState = {
    moveX: 0,
    moveZ: 0,
    jump: false,
    attack: false,
    ability1: false,
    ability2: false,
    ability3: false,
    interact: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
    camera: null
};

// Touch tracking
const touches = {
    joystick: null,
    look: null,
    lookLastX: null,
    lookLastY: null
};

// Joystick
const joystick = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    maxDistance: 50
};

// Camera settings - positioned behind player
const cameraSettings = {
    distance: 10,
    height: 6,
    targetDistance: 10,
    targetHeight: 6,
    angle: Math.PI, // Start behind player (player faces -Z, camera at +Z)
    targetAngle: Math.PI, // Target angle for smooth following
    pitch: 0.3,
    smoothing: 5,
    angleSmoothing: 3, // How fast camera rotates to follow player
    isTown: false,
    autoFollowEnabled: true, // Camera follows behind player when moving
    manualControlTimer: 0 // Timer after manual camera control
};

// Raycaster for camera collision
const raycaster = new THREE.Raycaster();
const cameraCollisionLayers = [];

// ============================================
// INITIALIZATION
// ============================================

export async function initControls(renderer) {
    // Create camera
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    
    inputState.camera = camera;
    
    // Set up event listeners
    setupTouchControls();
    setupKeyboardControls();
    setupButtonControls();
    
    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
    
    return Promise.resolve();
}

// ============================================
// TOUCH CONTROLS
// ============================================

function setupTouchControls() {
    const joystickZone = document.getElementById('joystick-zone');
    const gameContainer = document.getElementById('game-container');
    
    // Joystick touch
    joystickZone.addEventListener('touchstart', handleJoystickStart, { passive: false });
    joystickZone.addEventListener('touchmove', handleJoystickMove, { passive: false });
    joystickZone.addEventListener('touchend', handleJoystickEnd, { passive: false });
    joystickZone.addEventListener('touchcancel', handleJoystickEnd, { passive: false });
    
    // GLOBAL touch end handler to catch when finger leaves the joystick zone
    // This fixes the stuck joystick issue
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: false });
    
    // Look swipe (right side of screen)
    gameContainer.addEventListener('touchstart', handleLookStart, { passive: false });
    gameContainer.addEventListener('touchmove', handleLookMove, { passive: false });
    gameContainer.addEventListener('touchend', handleLookEnd, { passive: false });
    gameContainer.addEventListener('touchcancel', handleLookEnd, { passive: false });
}

function handleJoystickStart(e) {
    if (!controlsEnabled) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    touches.joystick = touch.identifier;
    
    const rect = e.target.getBoundingClientRect();
    joystick.active = true;
    joystick.startX = rect.left + rect.width / 2;
    joystick.startY = rect.top + rect.height / 2;
    joystick.currentX = touch.clientX;
    joystick.currentY = touch.clientY;
    
    updateJoystickVisual();
}

function handleJoystickMove(e) {
    if (!controlsEnabled || !joystick.active) return;
    e.preventDefault();
    
    for (const touch of e.touches) {
        if (touch.identifier === touches.joystick) {
            joystick.currentX = touch.clientX;
            joystick.currentY = touch.clientY;
            updateJoystickVisual();
            updateMovementInput();
            break;
        }
    }
}

function handleJoystickEnd(e) {
    for (const touch of e.changedTouches) {
        if (touch.identifier === touches.joystick) {
            resetJoystick();
            break;
        }
    }
}

// Global handler to catch touch ends anywhere - fixes stuck joystick
function handleGlobalTouchEnd(e) {
    if (touches.joystick === null) return;
    
    // Check if the joystick touch is still active
    let joystickTouchStillActive = false;
    for (const touch of e.touches) {
        if (touch.identifier === touches.joystick) {
            joystickTouchStillActive = true;
            break;
        }
    }
    
    // If joystick touch is no longer in the active touches, reset it
    if (!joystickTouchStillActive) {
        resetJoystick();
    }
}

function resetJoystick() {
    joystick.active = false;
    touches.joystick = null;
    inputState.moveX = 0;
    inputState.moveZ = 0;
    resetJoystickVisual();
}

function updateJoystickVisual() {
    const stick = document.getElementById('joystick-stick');
    if (!stick) return;
    
    let dx = joystick.currentX - joystick.startX;
    let dy = joystick.currentY - joystick.startY;
    
    // Clamp to max distance
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > joystick.maxDistance) {
        dx = (dx / dist) * joystick.maxDistance;
        dy = (dy / dist) * joystick.maxDistance;
    }
    
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
}

function resetJoystickVisual() {
    const stick = document.getElementById('joystick-stick');
    if (stick) {
        stick.style.transform = 'translate(0, 0)';
    }
}

function updateMovementInput() {
    let dx = joystick.currentX - joystick.startX;
    let dy = joystick.currentY - joystick.startY;
    
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > joystick.maxDistance) {
        dx = (dx / dist) * joystick.maxDistance;
        dy = (dy / dist) * joystick.maxDistance;
    }
    
    // Normalize to -1 to 1
    const rawX = dx / joystick.maxDistance;
    const rawZ = dy / joystick.maxDistance;
    
    // Transform based on camera angle
    const angle = cameraSettings.angle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    inputState.moveX = rawX * cos - rawZ * sin;
    inputState.moveZ = rawX * sin + rawZ * cos;
}

function handleLookStart(e) {
    if (!controlsEnabled) return;
    
    // Only handle touches on right side of screen (not on UI)
    for (const touch of e.touches) {
        if (touch.identifier === touches.joystick) continue;
        if (touch.clientX < window.innerWidth / 2) continue;
        
        // Check if touching a button
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && (target.classList.contains('action-btn') || 
                       target.classList.contains('ability-btn') ||
                       target.id === 'btn-pause')) {
            continue;
        }
        
        touches.look = touch.identifier;
        touches.lookLastX = touch.clientX;
        touches.lookLastY = touch.clientY;
        
        // Manual camera control - disable auto-follow temporarily
        cameraSettings.manualControlTimer = 1.5; // 1.5 seconds before auto-follow resumes
        break;
    }
}

function handleLookMove(e) {
    if (!controlsEnabled || touches.look === null) return;
    
    for (const touch of e.changedTouches) {
        if (touch.identifier === touches.look) {
            // Use touch movement for camera rotation
            inputState.lookDeltaX = (touch.clientX - (touches.lookLastX || touch.clientX)) * 0.01;
            inputState.lookDeltaY = (touch.clientY - (touches.lookLastY || touch.clientY)) * 0.01;
            
            touches.lookLastX = touch.clientX;
            touches.lookLastY = touch.clientY;
            
            // Apply to camera angle
            cameraSettings.angle -= inputState.lookDeltaX;
            cameraSettings.targetAngle = cameraSettings.angle; // Sync target when manually controlling
            cameraSettings.pitch = Math.max(-0.5, Math.min(0.8, cameraSettings.pitch + inputState.lookDeltaY));
            
            // Reset auto-follow timer on manual control
            cameraSettings.manualControlTimer = 1.5;
            
            break;
        }
    }
}

function handleLookEnd(e) {
    for (const touch of e.changedTouches) {
        if (touch.identifier === touches.look) {
            touches.look = null;
            touches.lookLastX = null;
            touches.lookLastY = null;
            inputState.lookDeltaX = 0;
            inputState.lookDeltaY = 0;
            break;
        }
    }
}

// ============================================
// BUTTON CONTROLS
// ============================================

function setupButtonControls() {
    // Jump button
    const jumpBtn = document.getElementById('btn-jump');
    if (jumpBtn) {
        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (controlsEnabled) inputState.jump = true;
        });
        jumpBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            inputState.jump = false;
        });
    }
    
    // Attack button
    const attackBtn = document.getElementById('btn-attack');
    if (attackBtn) {
        attackBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (controlsEnabled) inputState.attack = true;
        });
        attackBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            inputState.attack = false;
        });
    }
    
    // Ability buttons
    const spreadBtn = document.getElementById('btn-spread');
    if (spreadBtn) {
        spreadBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (controlsEnabled) inputState.ability1 = true;
        });
        spreadBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            inputState.ability1 = false;
        });
    }
    
    const burstBtn = document.getElementById('btn-burst');
    if (burstBtn) {
        burstBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (controlsEnabled) inputState.ability2 = true;
        });
        burstBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            inputState.ability2 = false;
        });
    }
    
    const megaBtn = document.getElementById('btn-mega');
    if (megaBtn) {
        megaBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (controlsEnabled) inputState.ability3 = true;
        });
        megaBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            inputState.ability3 = false;
        });
    }
}

// ============================================
// KEYBOARD CONTROLS (Desktop testing)
// ============================================

function setupKeyboardControls() {
    const keys = {};
    
    window.addEventListener('keydown', (e) => {
        if (!controlsEnabled) return;
        keys[e.code] = true;
        updateKeyboardInput(keys);
        
        // One-shot inputs
        if (e.code === 'Space') inputState.jump = true;
        if (e.code === 'KeyE') inputState.interact = true;
        if (e.code === 'Digit1') inputState.ability1 = true;
        if (e.code === 'Digit2') inputState.ability2 = true;
        if (e.code === 'Digit3') inputState.ability3 = true;
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
        updateKeyboardInput(keys);
        
        if (e.code === 'Space') inputState.jump = false;
        if (e.code === 'KeyE') inputState.interact = false;
        if (e.code === 'Digit1') inputState.ability1 = false;
        if (e.code === 'Digit2') inputState.ability2 = false;
        if (e.code === 'Digit3') inputState.ability3 = false;
    });
    
    // Mouse for camera rotation
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    window.addEventListener('mousedown', (e) => {
        if (e.button === 2 || e.button === 1) { // Right or middle click
            isMouseDown = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            cameraSettings.manualControlTimer = 1.5;
        }
    });
    
    window.addEventListener('mouseup', (e) => {
        if (e.button === 2 || e.button === 1) {
            isMouseDown = false;
        }
    });
    
    window.addEventListener('mousemove', (e) => {
        if (isMouseDown && controlsEnabled) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            
            cameraSettings.angle -= dx * 0.005;
            cameraSettings.targetAngle = cameraSettings.angle;
            cameraSettings.pitch = Math.max(-0.5, Math.min(0.8, cameraSettings.pitch + dy * 0.005));
            
            cameraSettings.manualControlTimer = 1.5;
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });
    
    // Prevent context menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Mouse click for attack
    window.addEventListener('click', (e) => {
        if (controlsEnabled && e.button === 0) {
            inputState.attack = true;
            setTimeout(() => inputState.attack = false, 50);
        }
    });
}

function updateKeyboardInput(keys) {
    let moveX = 0;
    let moveZ = 0;
    
    if (keys['KeyW'] || keys['ArrowUp']) moveZ = -1;
    if (keys['KeyS'] || keys['ArrowDown']) moveZ = 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX = -1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX = 1;
    
    // Transform based on camera angle
    const angle = cameraSettings.angle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    inputState.moveX = moveX * cos - moveZ * sin;
    inputState.moveZ = moveX * sin + moveZ * cos;
}

// ============================================
// CAMERA UPDATE
// ============================================

export function updateControls(delta, scene, isTown = false) {
    if (!camera) return;
    
    const player = getPlayer();
    if (!player) return;
    
    currentScene = scene;
    cameraSettings.isTown = isTown;
    
    // Adjust camera distance for town vs dungeon
    if (isTown) {
        cameraSettings.targetDistance = 12;
        cameraSettings.targetHeight = 8;
    } else {
        cameraSettings.targetDistance = 10;
        cameraSettings.targetHeight = 6;
    }
    
    // Smooth camera distance
    cameraSettings.distance += (cameraSettings.targetDistance - cameraSettings.distance) * delta * 2;
    cameraSettings.height += (cameraSettings.targetHeight - cameraSettings.height) * delta * 2;
    
    // Update manual control timer
    if (cameraSettings.manualControlTimer > 0) {
        cameraSettings.manualControlTimer -= delta;
    }
    
    // Auto-follow camera: swing behind player when walking
    if (cameraSettings.autoFollowEnabled && cameraSettings.manualControlTimer <= 0) {
        const isMoving = Math.abs(inputState.moveX) > 0.1 || Math.abs(inputState.moveZ) > 0.1;
        
        if (isMoving) {
            // Calculate the angle the player is facing (based on movement direction)
            // We want camera BEHIND player, so add PI
            const playerFacingAngle = Math.atan2(inputState.moveX, inputState.moveZ);
            cameraSettings.targetAngle = playerFacingAngle + Math.PI;
        }
        
        // Smoothly interpolate camera angle towards target
        let angleDiff = cameraSettings.targetAngle - cameraSettings.angle;
        
        // Normalize angle difference to -PI to PI for shortest rotation
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        cameraSettings.angle += angleDiff * delta * cameraSettings.angleSmoothing;
    }
    
    // Calculate desired camera position
    const targetPos = player.position.clone();
    
    let camX = targetPos.x + Math.sin(cameraSettings.angle) * cameraSettings.distance;
    let camZ = targetPos.z + Math.cos(cameraSettings.angle) * cameraSettings.distance;
    let camY = targetPos.y + cameraSettings.height + cameraSettings.pitch * 5;
    
    // Camera wall collision detection
    if (scene && !isTown) {
        const desiredPos = new THREE.Vector3(camX, camY, camZ);
        const adjustedPos = checkCameraCollision(targetPos, desiredPos, scene);
        camX = adjustedPos.x;
        camY = adjustedPos.y;
        camZ = adjustedPos.z;
    }
    
    // Smooth camera movement
    camera.position.lerp(
        new THREE.Vector3(camX, camY, camZ),
        delta * cameraSettings.smoothing
    );
    
    // Look at player
    const lookTarget = targetPos.clone();
    lookTarget.y += 1; // Look at player's center
    camera.lookAt(lookTarget);
}

// ============================================
// CAMERA COLLISION
// ============================================

function checkCameraCollision(playerPos, desiredCamPos, scene) {
    // Raycast from player to desired camera position
    const direction = new THREE.Vector3().subVectors(desiredCamPos, playerPos);
    const distance = direction.length();
    direction.normalize();
    
    // Start ray slightly above player
    const rayOrigin = playerPos.clone();
    rayOrigin.y += 1;
    
    raycaster.set(rayOrigin, direction);
    raycaster.far = distance;
    
    // Get all meshes in scene that could block camera
    const collidables = [];
    scene.traverse((obj) => {
        if (obj.isMesh && obj.geometry) {
            // Skip small objects, transparent objects, and the player
            if (obj.parent && obj.parent.name === 'player') return;
            if (obj.material && obj.material.transparent && obj.material.opacity < 0.5) return;
            
            // Only collide with walls, floors, ceilings (larger objects)
            const bbox = new THREE.Box3().setFromObject(obj);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            
            // Only include objects large enough to be walls/floors
            if (size.x > 1 || size.y > 1 || size.z > 1) {
                collidables.push(obj);
            }
        }
    });
    
    const intersects = raycaster.intersectObjects(collidables, false);
    
    if (intersects.length > 0) {
        // Camera would clip through something - move it closer
        const hitDistance = intersects[0].distance;
        const safeDistance = Math.max(hitDistance - 0.5, 1); // Keep at least 1 unit from player
        
        // Calculate new camera position at safe distance
        const newPos = rayOrigin.clone().add(direction.multiplyScalar(safeDistance));
        return newPos;
    }
    
    return desiredCamPos;
}

// ============================================
// CAMERA ZOOM (for boss fights)
// ============================================

export function setCameraZoom(distance, height) {
    cameraSettings.targetDistance = distance;
    cameraSettings.targetHeight = height;
}

export function resetCameraZoom() {
    cameraSettings.targetDistance = cameraSettings.isTown ? 12 : 10;
    cameraSettings.targetHeight = cameraSettings.isTown ? 8 : 6;
}

// ============================================
// PUBLIC FUNCTIONS
// ============================================

export function getInputState() {
    return inputState;
}

export function enableControls() {
    controlsEnabled = true;
}

export function disableControls() {
    controlsEnabled = false;
    inputState.moveX = 0;
    inputState.moveZ = 0;
    inputState.jump = false;
    inputState.attack = false;
    inputState.ability1 = false;
    inputState.ability2 = false;
    inputState.ability3 = false;
    
    // Also reset joystick
    resetJoystick();
}

export function resetCamera(isTown = false) {
    cameraSettings.angle = Math.PI; // Behind player
    cameraSettings.targetAngle = Math.PI;
    cameraSettings.pitch = 0.3;
    cameraSettings.isTown = isTown;
    cameraSettings.targetDistance = isTown ? 12 : 10;
    cameraSettings.targetHeight = isTown ? 8 : 6;
    cameraSettings.distance = cameraSettings.targetDistance;
    cameraSettings.height = cameraSettings.targetHeight;
    cameraSettings.manualControlTimer = 0;
    
    // Immediately position camera behind player
    const player = getPlayer();
    if (player && camera) {
        const targetPos = player.position.clone();
        camera.position.set(
            targetPos.x + Math.sin(cameraSettings.angle) * cameraSettings.distance,
            targetPos.y + cameraSettings.height,
            targetPos.z + Math.cos(cameraSettings.angle) * cameraSettings.distance
        );
        camera.lookAt(targetPos.x, targetPos.y + 1, targetPos.z);
    }
}

export function disposeControls() {
    // Remove event listeners if needed
    controlsEnabled = false;
}
