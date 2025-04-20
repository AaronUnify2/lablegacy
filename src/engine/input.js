// src/engine/input.js - Input handling system

// Input state object
const inputState = {
    // Movement
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    
    // Actions
    attack: false,
    chargeAttack: false,
    interact: false,
    dash: false,
    
    // UI controls
    inventory: false,
    map: false,
    pause: false,
    
    // Mouse data
    mouse: {
        x: 0,
        y: 0,
        leftButton: false,
        rightButton: false
    },
    
    // For actions that should only trigger once per press
    justPressed: {
        attack: false,
        interact: false,
        inventory: false,
        map: false,
        pause: false,
        dash: false
    },
    
    // Keep track of keys that were down in the previous frame
    previouslyPressed: {
        attack: false,
        interact: false,
        inventory: false,
        map: false,
        pause: false,
        dash: false
    },
    
    // For analog input (gamepad)
    axes: {
        leftStickX: 0,
        leftStickY: 0,
        rightStickX: 0,
        rightStickY: 0
    }
};

// Set up input event listeners
export function setupInput() {
    // Keyboard events
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Mouse events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Add gamepad support later
    // window.addEventListener('gamepadconnected', handleGamepadConnected);
    // window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);
    
    console.log('Input system initialized');
}

// Handle keydown events
function handleKeyDown(event) {
    updateInputState(event.code, true);
    
    // Prevent default actions for game control keys
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
    }
}

// Handle keyup events
function handleKeyUp(event) {
    updateInputState(event.code, false);
}

// Update input state based on key code
function updateInputState(code, isPressed) {
    switch (code) {
        // Movement
        case 'KeyW':
        case 'ArrowUp':
            inputState.moveForward = isPressed;
            break;
        case 'KeyS':
        case 'ArrowDown':
            inputState.moveBackward = isPressed;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            inputState.moveLeft = isPressed;
            break;
        case 'KeyD':
        case 'ArrowRight':
            inputState.moveRight = isPressed;
            break;
            
        // Actions
        case 'Space':
            inputState.dash = isPressed;
            break;
        case 'KeyE':
            inputState.interact = isPressed;
            break;
        case 'KeyI':
            inputState.inventory = isPressed;
            break;
        case 'KeyM':
            inputState.map = isPressed;
            break;
        case 'Escape':
            inputState.pause = isPressed;
            break;
    }
}

// Handle mouse movement
function handleMouseMove(event) {
    inputState.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    inputState.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Handle mouse button down
function handleMouseDown(event) {
    switch (event.button) {
        case 0: // Left button
            inputState.mouse.leftButton = true;
            inputState.attack = true;
            break;
        case 2: // Right button
            inputState.mouse.rightButton = true;
            inputState.chargeAttack = true;
            break;
    }
}

// Handle mouse button up
function handleMouseUp(event) {
    switch (event.button) {
        case 0: // Left button
            inputState.mouse.leftButton = false;
            inputState.attack = false;
            break;
        case 2: // Right button
            inputState.mouse.rightButton = false;
            inputState.chargeAttack = false;
            break;
    }
}

// Update "just pressed" states for single-press actions
function updateJustPressedStates() {
    // List of keys to check for "just pressed" state
    const keysToCheck = ['attack', 'interact', 'inventory', 'map', 'pause', 'dash'];
    
    keysToCheck.forEach(key => {
        // A key is "just pressed" if it's currently down but wasn't in the previous frame
        inputState.justPressed[key] = inputState[key] && !inputState.previouslyPressed[key];
        
        // Update the previously pressed state for the next frame
        inputState.previouslyPressed[key] = inputState[key];
    });
}

// Get current input state (called each frame)
export function getInput() {
    // Update "just pressed" states before returning the input state
    updateJustPressedStates();
    
    // Return a copy of the input state to prevent external modifications
    return { ...inputState };
}

// Lock/unlock cursor for gameplay (called when entering/exiting game)
export function setCursorLock(locked) {
    if (locked) {
        document.body.requestPointerLock = document.body.requestPointerLock || 
                                           document.body.mozRequestPointerLock ||
                                           document.body.webkitRequestPointerLock;
        document.body.requestPointerLock();
    } else {
        document.exitPointerLock = document.exitPointerLock || 
                                   document.mozExitPointerLock ||
                                   document.webkitExitPointerLock;
        document.exitPointerLock();
    }
}
