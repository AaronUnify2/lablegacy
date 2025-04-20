// src/engine/input.js - Input handling system with mobile controller support (Continued)

// Handle touch end for mobile controls
function handleTouchEnd(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        
        // Check if joystick touch ended
        if (touch.identifier === inputState.touchId) {
            // Reset joystick position and input state
            resetJoystick();
            inputState.touchId = null;
        }
        
        // Find if touch was on an action button
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.classList && target.classList.contains('control-button')) {
            const action = target.dataset.action;
            
            // Reset button appearance
            target.style.transform = 'scale(1)';
            
            // Reset input state
            handleButtonPress(action, false);
        }
    }
}

// Update joystick position and input values
function updateJoystickPosition(touch) {
    const joystickRect = joystickElement.getBoundingClientRect();
    const centerX = joystickRect.left + joystickRect.width / 2;
    const centerY = joystickRect.top + joystickRect.height / 2;
    
    // Calculate distance from center
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    
    // Calculate distance from center
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Limit to joystick radius
    const maxRadius = joystickRect.width / 2 - joystickKnob.offsetWidth / 2;
    if (distance > maxRadius) {
        deltaX = deltaX * maxRadius / distance;
        deltaY = deltaY * maxRadius / distance;
    }
    
    // Move joystick knob
    joystickKnob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    
    // Update input state with normalized values (-1 to 1)
    const normalizedX = deltaX / maxRadius;
    const normalizedY = deltaY / maxRadius;
    
    inputState.axes.leftStickX = normalizedX;
    inputState.axes.leftStickY = normalizedY;
    
    // Convert joystick position to directional input
    if (Math.abs(normalizedX) > 0.5) {
        inputState.moveLeft = normalizedX < 0;
        inputState.moveRight = normalizedX > 0;
    } else {
        inputState.moveLeft = false;
        inputState.moveRight = false;
    }
    
    if (Math.abs(normalizedY) > 0.5) {
        inputState.moveForward = normalizedY < 0;
        inputState.moveBackward = normalizedY > 0;
    } else {
        inputState.moveForward = false;
        inputState.moveBackward = false;
    }
}

// Reset joystick position and related input states
function resetJoystick() {
    joystickKnob.style.transform = 'translate(-50%, -50%)';
    
    inputState.axes.leftStickX = 0;
    inputState.axes.leftStickY = 0;
    
    inputState.moveForward = false;
    inputState.moveBackward = false;
    inputState.moveLeft = false;
    inputState.moveRight = false;
}

// Handle button press/release
function handleButtonPress(action, isPressed) {
    switch (action) {
        case 'moveForward':
            inputState.moveForward = isPressed;
            break;
        case 'moveBackward':
            inputState.moveBackward = isPressed;
            break;
        case 'moveLeft':
            inputState.moveLeft = isPressed;
            break;
        case 'moveRight':
            inputState.moveRight = isPressed;
            break;
        case 'attack':
            inputState.attack = isPressed;
            break;
        case 'dash':
            inputState.dash = isPressed;
            break;
        case 'jump':
            inputState.jump = isPressed;
            break;
        case 'interact':
            inputState.interact = isPressed;
            break;
        case 'inventory':
            inputState.inventory = isPressed;
            break;
        case 'switchWeapon':
            // This would need to be implemented in your game logic
            if (isPressed) {
                console.log("Switch weapon pressed");
            }
            break;
    }
}

// Handle keydown events (for desktop)
function handleKeyDown(event) {
    updateInputState(event.code, true);
    
    // Prevent default actions for game control keys
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
    }
}

// Handle keyup events (for desktop)
function handleKeyUp(event) {
    updateInputState(event.code, false);
}

// Update input state based on key code (for desktop)
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
            inputState.jump = isPressed;  // Change dash to jump
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            inputState.dash = isPressed;  // Move dash to Shift key
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

// Handle mouse movement (for desktop)
function handleMouseMove(event) {
    inputState.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    inputState.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Handle mouse button down (for desktop)
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

// Handle mouse button up (for desktop)
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
    const keysToCheck = ['attack', 'interact', 'inventory', 'map', 'pause', 'dash', 'jump'];
    
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
    if (inputState.isMobile) {
        // No cursor lock needed for mobile
        return;
    }
    
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

// Show/hide mobile controls
export function toggleMobileControls(show) {
    if (mobileControls) {
        mobileControls.style.display = show ? 'block' : 'none';
    }
}
