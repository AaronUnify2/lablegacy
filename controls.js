// ============================================
// ECHOES OF THE OBELISK - Controls System
// Mobile touch input + camera management
// ============================================

import * as THREE from 'three';
import { getPlayer } from './entities.js';

// ============================================
// STATE
// ============================================

let camera;
let controlsEnabled = true;

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
    look: null
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

// Camera settings
const cameraSettings = {
    distance: 10,
    height: 6,
    targetDistance: 10,
    targetHeight: 6,
    angle: 0,
    pitch: 0.3,
    smoothing: 5,
    isTown: false
};

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
            joystick.active = false;
            touches.joystick = null;
            inputState.moveX = 0;
            inputState.moveZ = 0;
            resetJoystickVisual();
            break;
        }
    }
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
    inputState.moveX = dx / joystick.maxDistance;
    inputState.moveZ = dy / joystick.maxDistance;
    
    // Transform based on camera angle
    const angle = cameraSettings.angle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    const worldX = inputState.moveX * cos - inputState.moveZ * sin;
    const worldZ = inputState.moveX * sin + inputState.moveZ * cos;
    
    inputState.moveX = worldX;
    inputState.moveZ = worldZ;
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
        break;
    }
}

function handleLookMove(e) {
    if (!controlsEnabled || touches.look === null) return;
    
    for (const touch of e.changedTouches) {
        if (touch.identifier === touches.look) {
            // Calculate delta from movement
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;
            
            // Use touch movement for camera rotation
            inputState.lookDeltaX = (touch.clientX - (touches.lookLastX || touch.clientX)) * 0.01;
            inputState.lookDeltaY = (touch.clientY - (touches.lookLastY || touch.clientY)) * 0.01;
            
            touches.lookLastX = touch.clientX;
            touches.lookLastY = touch.clientY;
            
            // Apply to camera angle
            cameraSettings.angle -= inputState.lookDeltaX;
            cameraSettings.pitch = Math.max(-0.5, Math.min(0.8, cameraSettings.pitch + inputState.lookDeltaY));
            
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
            cameraSettings.pitch = Math.max(-0.5, Math.min(0.8, cameraSettings.pitch + dy * 0.005));
            
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
    
    // Calculate camera position
    const targetPos = player.position.clone();
    
    const camX = targetPos.x + Math.sin(cameraSettings.angle) * cameraSettings.distance;
    const camZ = targetPos.z + Math.cos(cameraSettings.angle) * cameraSettings.distance;
    const camY = targetPos.y + cameraSettings.height + cameraSettings.pitch * 5;
    
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
}

export function resetCamera(isTown = false) {
    cameraSettings.angle = 0;
    cameraSettings.pitch = 0.3;
    cameraSettings.isTown = isTown;
    cameraSettings.targetDistance = isTown ? 12 : 10;
    cameraSettings.targetHeight = isTown ? 8 : 6;
    cameraSettings.distance = cameraSettings.targetDistance;
    cameraSettings.height = cameraSettings.targetHeight;
    
    // Immediately position camera
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
