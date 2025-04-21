// src/engine/input.js - Input handling system with mobile controller support and added pause button

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
    jump: false,  // Add jump input
    
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
        dash: false,
        jump: false  // Add jump to justPressed tracking
    },
    
    // Keep track of keys that were down in the previous frame
    previouslyPressed: {
        attack: false,
        interact: false,
        inventory: false,
        map: false,
        pause: false,
        dash: false,
        jump: false  // Add jump to previouslyPressed tracking
    },
    
    // For analog input (gamepad or touch joystick)
    axes: {
        leftStickX: 0,
        leftStickY: 0,
        rightStickX: 0,
        rightStickY: 0
    },
    
    // Mobile-specific
    isMobile: false,
    touchId: null
};

// Mobile controller elements
let joystickElement;
let joystickKnob;
let actionButtons;
let mobileControls;
let pauseButton; // Added pause button element

// Set up input event listeners
export function setupInput() {
    // Detect if using mobile device
    inputState.isMobile = isMobileDevice();
    
    // Keyboard events (for desktop)
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Mouse events (for desktop)
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // If mobile, set up touch controls
    if (inputState.isMobile) {
        setupMobileControls();
    }
    
    console.log('Input system initialized', inputState.isMobile ? 'with mobile controls' : 'with desktop controls');
}

// Detect if using a mobile device
function isMobileDevice() {
    return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.innerWidth <= 800 && window.innerHeight <= 600)
    );
}

// Set up mobile controls
function setupMobileControls() {
    // Create container for mobile controls
    mobileControls = document.createElement('div');
    mobileControls.id = 'mobile-controls';
    mobileControls.style.position = 'absolute';
    mobileControls.style.left = '0';
    mobileControls.style.bottom = '0';
    mobileControls.style.width = '100%';
    mobileControls.style.height = '40%';
    mobileControls.style.zIndex = '1000';
    mobileControls.style.pointerEvents = 'none'; // Allow clicks to pass through by default
    mobileControls.style.display = 'flex';
    mobileControls.style.alignItems = 'center';
    mobileControls.style.justifyContent = 'space-between';
    mobileControls.style.padding = '0';
    document.body.appendChild(mobileControls);
    
    // Create joystick
    createJoystick();
    
    // Create pause button
    createPauseButton();
    
    // Create action buttons
    createActionButtons();
    
    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
}

// Create joystick control
function createJoystick() {
    // Joystick container
    joystickElement = document.createElement('div');
    joystickElement.id = 'joystick';
    joystickElement.style.position = 'relative'; // Changed from absolute to relative
    joystickElement.style.width = '120px';
    joystickElement.style.height = '120px';
    joystickElement.style.borderRadius = '50%';
    joystickElement.style.border = '2px solid rgba(100, 149, 237, 0.8)';
    joystickElement.style.backgroundColor = 'rgba(65, 105, 225, 0.3)';
    joystickElement.style.pointerEvents = 'auto';
    joystickElement.style.boxShadow = '0 0 15px rgba(100, 149, 237, 0.8)';
    mobileControls.appendChild(joystickElement);
    
    // Joystick knob
    joystickKnob = document.createElement('div');
    joystickKnob.id = 'joystick-knob';
    joystickKnob.style.position = 'absolute';
    joystickKnob.style.left = '50%';
    joystickKnob.style.top = '50%';
    joystickKnob.style.transform = 'translate(-50%, -50%)';
    joystickKnob.style.width = '60px';
    joystickKnob.style.height = '60px';
    joystickKnob.style.borderRadius = '50%';
    joystickKnob.style.backgroundColor = 'rgba(65, 105, 225, 0.8)';
    joystickKnob.style.pointerEvents = 'none';
    joystickElement.appendChild(joystickKnob);
}

// Create pause button in the middle
function createPauseButton() {
    pauseButton = document.createElement('div');
    pauseButton.id = 'pause-button';
    pauseButton.className = 'control-button';
    pauseButton.dataset.action = 'pause';
    
    pauseButton.style.width = '45px'; // Smaller button
    pauseButton.style.height = '45px'; // Smaller button
    pauseButton.style.marginLeft = '30px'; // Add space on left side
    pauseButton.style.marginRight = '-40px'; // Shift left by reducing right margin
    pauseButton.style.borderRadius = '50%';
    pauseButton.style.backgroundColor = 'rgba(240, 240, 240, 0.8)';
    pauseButton.style.border = '2px solid rgba(255, 255, 255, 1)';
    pauseButton.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.7)';
    pauseButton.style.display = 'flex';
    pauseButton.style.justifyContent = 'center';
    pauseButton.style.alignItems = 'center';
    pauseButton.style.color = '#333';
    pauseButton.style.fontFamily = 'Arial, sans-serif';
    pauseButton.style.fontWeight = 'bold';
    pauseButton.style.fontSize = '14px';
    pauseButton.style.userSelect = 'none';
    pauseButton.style.pointerEvents = 'auto';
    pauseButton.style.position = 'relative';
    
    // Create pause icon (two vertical bars)
    const pauseIcon = document.createElement('div');
    pauseIcon.style.display = 'flex';
    pauseIcon.style.gap = '4px'; // Slightly narrower gap
    
    const bar1 = document.createElement('div');
    bar1.style.width = '6px'; // Slightly narrower bars
    bar1.style.height = '16px'; // Slightly shorter bars
    bar1.style.backgroundColor = '#333';
    bar1.style.borderRadius = '2px';
    
    const bar2 = document.createElement('div');
    bar2.style.width = '6px'; // Slightly narrower bars
    bar2.style.height = '16px'; // Slightly shorter bars
    bar2.style.backgroundColor = '#333';
    bar2.style.borderRadius = '2px';
    
    pauseIcon.appendChild(bar1);
    pauseIcon.appendChild(bar2);
    pauseButton.appendChild(pauseIcon);
    
    mobileControls.appendChild(pauseButton);
}

// Create action buttons
function createActionButtons() {
    // Button container for right side
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'action-buttons';
    buttonContainer.style.position = 'relative'; // Changed from absolute to relative
    buttonContainer.style.display = 'grid';
    buttonContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
    buttonContainer.style.gridTemplateRows = 'repeat(3, 1fr)';
    buttonContainer.style.gap = '7px'; // Reduced gap from 10px to 7px
    buttonContainer.style.pointerEvents = 'auto';
    buttonContainer.style.transform = 'scale(0.6)'; // Shrink by 40%
    buttonContainer.style.transformOrigin = 'right center'; // Scale from right side
    buttonContainer.style.marginRight = '40px'; // Add right margin to shift left
    mobileControls.appendChild(buttonContainer);
    
    // Button definitions: [id, label, color, row, col, action]
    const buttons = [
        ['button-interact', 'L', 'rgba(100, 149, 237, 0.8)', 0, 0, 'interact'],
        ['button-up', '↑', 'rgba(220, 20, 60, 0.8)', 0, 1, 'moveForward'],
        ['button-staff', 'Staff', 'rgba(186, 85, 211, 0.8)', 0, 2, 'chargeAttack'], 
        ['button-left', '←', 'rgba(220, 20, 60, 0.8)', 1, 0, 'moveLeft'],
        ['button-jump', 'JUMP', 'rgba(60, 179, 113, 0.8)', 1, 1, 'jump'],  
        ['button-right', '→', 'rgba(220, 20, 60, 0.8)', 1, 2, 'moveRight'],
        ['button-attack', 'Sword', 'rgba(205, 133, 63, 0.8)', 2, 0, 'attack'],
        ['button-down', '↓', 'rgba(220, 20, 60, 0.8)', 2, 1, 'moveBackward'],
        ['button-dash', 'DASH', 'rgba(255, 150, 50, 0.8)', 2, 2, 'dash']
    ];
    
    // Create each button
    actionButtons = {};
    buttons.forEach(([id, label, color, row, col, action]) => {
        const button = document.createElement('div');
        button.id = id;
        button.className = 'control-button';
        button.dataset.action = action;
        
        button.style.width = '60px';
        button.style.height = '60px';
        button.style.borderRadius = '50%';
        button.style.backgroundColor = color;
        button.style.border = `2px solid ${color.replace('0.8', '1')}`;
        button.style.boxShadow = `0 0 10px ${color}`;
        button.style.display = 'flex';
        button.style.justifyContent = 'center';
        button.style.alignItems = 'center';
        button.style.color = 'white';
        button.style.fontFamily = 'Arial, sans-serif';
        button.style.fontWeight = 'bold';
        button.style.userSelect = 'none';
        button.style.gridRow = row + 1;
        button.style.gridColumn = col + 1;
        
        button.textContent = label;
        
        buttonContainer.appendChild(button);
        actionButtons[id] = button;
    });
}

// Handle touch start for mobile controls
function handleTouchStart(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const target = touch.target;
        
        // Check if touch is on joystick
        if (target.id === 'joystick' || target.id === 'joystick-knob') {
            // Save touch identifier for tracking this touch
            inputState.touchId = touch.identifier;
            updateJoystickPosition(touch);
        }
        
        // Check if touch is on pause button
        if (target.id === 'pause-button' || target.parentElement === pauseButton) {
            // Handle pause button press
            handleButtonPress('pause', true);
            // Visual feedback
            pauseButton.style.transform = 'scale(0.9)';
        }
        
        // Check if touch is on action button
        if (target.classList && target.classList.contains('control-button') && target.id !== 'pause-button') {
            const action = target.dataset.action;
            
            // Highlight button
            target.style.transform = 'scale(0.9)';
            
            // Set input state
            handleButtonPress(action, true);
        }
    }
}

// Handle touch move for mobile controls
function handleTouchMove(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        
        // Check if this is the joystick touch
        if (touch.identifier === inputState.touchId) {
            updateJoystickPosition(touch);
        }
    }
}

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
        
        // Check for pause button
        if (target && (target.id === 'pause-button' || target.parentElement === pauseButton)) {
            // Reset button appearance
            pauseButton.style.transform = 'scale(1)';
            // Reset input state (but keep the "just pressed" state for one frame)
            handleButtonPress('pause', false);
        }
        
        // Check for other buttons
        if (target && target.classList && target.classList.contains('control-button') && target.id !== 'pause-button') {
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
        case 'chargeAttack': // This handles the staff attack
            inputState.chargeAttack = isPressed;
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
        case 'pause':
            inputState.pause = isPressed;
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
        mobileControls.style.display = show ? 'flex' : 'none';
    }
}
