// src/engine/input.js - Input handling system with first-person mouse look

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
    jump: false,
    
    // UI controls
    inventory: false,
    map: false,
    menu: false,
    
    // Mouse data for first-person look
    mouse: {
        x: 0,
        y: 0,
        deltaX: 0,
        deltaY: 0,
        leftButton: false,
        rightButton: false,
        sensitivity: 0.002, // Mouse sensitivity for first-person look
        locked: false
    },
    
    // For actions that should only trigger once per press
    justPressed: {
        attack: false,
        interact: false,
        inventory: false,
        map: false,
        menu: false,
        dash: false,
        jump: false
    },
    
    // Keep track of keys that were down in the previous frame
    previouslyPressed: {
        attack: false,
        interact: false,
        inventory: false,
        map: false,
        menu: false,
        dash: false,
        jump: false
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
let menuButton;

// Set up input event listeners
export function setupInput() {
    // Detect if using mobile device
    inputState.isMobile = isMobileDevice();
    
    // Keyboard events (for desktop)
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Mouse events (for desktop first-person)
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Pointer lock events for first-person view
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    
    // Click to enable pointer lock (first-person mode)
    document.addEventListener('click', requestPointerLock);
    
    // If mobile, set up touch controls
    if (inputState.isMobile) {
        setupMobileControls();
    }
    
    console.log('Input system initialized for first-person view', inputState.isMobile ? 'with mobile controls' : 'with desktop controls');
}

// Request pointer lock for first-person mouse look
function requestPointerLock() {
    if (inputState.isMobile) return; // Skip on mobile
    
    const canvas = document.getElementById('game-canvas');
    if (canvas && !inputState.mouse.locked) {
        canvas.requestPointerLock = canvas.requestPointerLock || 
                                   canvas.mozRequestPointerLock ||
                                   canvas.webkitRequestPointerLock;
        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    }
}

// Handle pointer lock state changes
function handlePointerLockChange() {
    const canvas = document.getElementById('game-canvas');
    if (document.pointerLockElement === canvas ||
        document.mozPointerLockElement === canvas ||
        document.webkitPointerLockElement === canvas) {
        inputState.mouse.locked = true;
        console.log('Pointer locked - first-person mode active');
    } else {
        inputState.mouse.locked = false;
        console.log('Pointer unlocked - first-person mode inactive');
    }
}

// Handle pointer lock errors
function handlePointerLockError() {
    console.error('Pointer lock failed');
    inputState.mouse.locked = false;
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
    mobileControls.style.pointerEvents = 'none';
    mobileControls.style.display = 'flex';
    mobileControls.style.alignItems = 'center';
    mobileControls.style.justifyContent = 'space-between';
    mobileControls.style.padding = '0';
    document.body.appendChild(mobileControls);
    
    // Create joystick
    createJoystick();
    
    // Create menu button
    createMenuButton();
    
    // Create action buttons
    createActionButtons();
    
    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Add touch look controls for mobile first-person
    createTouchLookArea();
}

// Create touch look area for mobile first-person view
function createTouchLookArea() {
    const lookArea = document.createElement('div');
    lookArea.id = 'touch-look-area';
    lookArea.style.position = 'absolute';
    lookArea.style.top = '0';
    lookArea.style.left = '0';
    lookArea.style.width = '100%';
    lookArea.style.height = '60%'; // Upper 60% of screen for looking
    lookArea.style.zIndex = '999';
    lookArea.style.pointerEvents = 'auto';
    lookArea.style.touchAction = 'none';
    
    let lastTouchX = 0;
    let lastTouchY = 0;
    let isLooking = false;
    
    lookArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            isLooking = true;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    });
    
    lookArea.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isLooking && e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = (touch.clientX - lastTouchX) * 0.005; // Sensitivity
            const deltaY = (touch.clientY - lastTouchY) * 0.005;
            
            inputState.mouse.deltaX = deltaX;
            inputState.mouse.deltaY = deltaY;
            
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        }
    });
    
    lookArea.addEventListener('touchend', (e) => {
        e.preventDefault();
        isLooking = false;
        inputState.mouse.deltaX = 0;
        inputState.mouse.deltaY = 0;
    });
    
    document.body.appendChild(lookArea);
}

// Create joystick control
function createJoystick() {
    // Joystick container
    joystickElement = document.createElement('div');
    joystickElement.id = 'joystick';
    joystickElement.style.position = 'relative';
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

// Create menu button in the middle
function createMenuButton() {
    menuButton = document.createElement('div');
    menuButton.id = 'menu-button';
    menuButton.className = 'control-button';
    menuButton.dataset.action = 'menu';
    
    menuButton.style.width = '45px';
    menuButton.style.height = '45px';
    menuButton.style.marginLeft = '30px';
    menuButton.style.marginRight = '-40px';
    menuButton.style.borderRadius = '50%';
    menuButton.style.backgroundColor = 'rgba(240, 240, 240, 0.8)';
    menuButton.style.border = '2px solid rgba(255, 255, 255, 1)';
    menuButton.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.7)';
    menuButton.style.display = 'flex';
    menuButton.style.justifyContent = 'center';
    menuButton.style.alignItems = 'center';
    menuButton.style.color = '#333';
    menuButton.style.fontFamily = 'Arial, sans-serif';
    menuButton.style.fontWeight = 'bold';
    menuButton.style.fontSize = '14px';
    menuButton.style.userSelect = 'none';
    menuButton.style.pointerEvents = 'auto';
    menuButton.style.position = 'relative';
    
    // Create menu icon (three horizontal lines/hamburger menu)
    const menuIcon = document.createElement('div');
    menuIcon.style.display = 'flex';
    menuIcon.style.flexDirection = 'column';
    menuIcon.style.gap = '4px';
    
    // Create three bars for hamburger menu icon
    for (let i = 0; i < 3; i++) {
        const bar = document.createElement('div');
        bar.style.width = '16px';
        bar.style.height = '3px';
        bar.style.backgroundColor = '#333';
        bar.style.borderRadius = '2px';
        menuIcon.appendChild(bar);
    }
    
    menuButton.appendChild(menuIcon);
    mobileControls.appendChild(menuButton);
}

// Create action buttons
function createActionButtons() {
    // Button container for right side
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'action-buttons';
    buttonContainer.style.position = 'relative';
    buttonContainer.style.display = 'grid';
    buttonContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
    buttonContainer.style.gridTemplateRows = 'repeat(3, 1fr)';
    buttonContainer.style.gap = '7px';
    buttonContainer.style.pointerEvents = 'auto';
    buttonContainer.style.transform = 'scale(0.6)';
    buttonContainer.style.transformOrigin = 'right center';
    buttonContainer.style.marginRight = '40px';
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
            inputState.touchId = touch.identifier;
            updateJoystickPosition(touch);
        }
        
        // Check if touch is on menu button
        if (target.id === 'menu-button' || target.parentElement === menuButton) {
            handleButtonPress('menu', true);
            menuButton.style.transform = 'scale(0.9)';
        }
        
        // Check if touch is on action button
        if (target.classList && target.classList.contains('control-button') && target.id !== 'menu-button') {
            const action = target.dataset.action;
            target.style.transform = 'scale(0.9)';
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
            resetJoystick();
            inputState.touchId = null;
        }
        
        // Find if touch was on an action button
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Check for menu button
        if (target && (target.id === 'menu-button' || target.parentElement === menuButton)) {
            menuButton.style.transform = 'scale(1)';
            handleButtonPress('menu', false);
        }
        
        // Check for other buttons
        if (target && target.classList && target.classList.contains('control-button') && target.id !== 'menu-button') {
            const action = target.dataset.action;
            target.style.transform = 'scale(1)';
            handleButtonPress(action, false);
        }
    }
}

// Update joystick position and input values
function updateJoystickPosition(touch) {
    const joystickRect = joystickElement.getBoundingClientRect();
    const centerX = joystickRect.left + joystickRect.width / 2;
    const centerY = joystickRect.top + joystickRect.height / 2;
    
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxRadius = joystickRect.width / 2 - joystickKnob.offsetWidth / 2;
    
    if (distance > maxRadius) {
        deltaX = deltaX * maxRadius / distance;
        deltaY = deltaY * maxRadius / distance;
    }
    
    joystickKnob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    
    const normalizedX = deltaX / maxRadius;
    const normalizedY = deltaY / maxRadius;
    
    inputState.axes.leftStickX = normalizedX;
    inputState.axes.leftStickY = normalizedY;
    
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
        case 'chargeAttack':
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
        case 'menu':
            inputState.menu = isPressed;
            break;
    }
}

// Handle keydown events (for desktop)
function handleKeyDown(event) {
    updateInputState(event.code, true);
    
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
        case 'Space':
            inputState.jump = isPressed;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
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
            inputState.menu = isPressed;
            break;
    }
}

// Handle mouse movement for first-person look (desktop)
function handleMouseMove(event) {
    if (inputState.mouse.locked && !inputState.isMobile) {
        // Use movementX/Y for pointer-locked first-person look
        inputState.mouse.deltaX = event.movementX * inputState.mouse.sensitivity;
        inputState.mouse.deltaY = event.movementY * inputState.mouse.sensitivity;
    } else {
        // Fallback for when pointer is not locked
        inputState.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        inputState.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        inputState.mouse.deltaX = 0;
        inputState.mouse.deltaY = 0;
    }
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
    const keysToCheck = ['attack', 'interact', 'inventory', 'map', 'menu', 'dash', 'jump'];
    
    keysToCheck.forEach(key => {
        inputState.justPressed[key] = inputState[key] && !inputState.previouslyPressed[key];
        inputState.previouslyPressed[key] = inputState[key];
    });
}

// Get current input state (called each frame)
export function getInput() {
    updateJustPressedStates();
    return { ...inputState };
}

// Lock/unlock cursor for gameplay
export function setCursorLock(locked) {
    if (inputState.isMobile) return;
    
    if (locked) {
        requestPointerLock();
    } else {
        document.exitPointerLock = document.exitPointerLock || 
                                   document.mozExitPointerLock ||
                                   document.webkitExitPointerLock;
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }
}

// Show/hide mobile controls
export function toggleMobileControls(show) {
    if (mobileControls) {
        mobileControls.style.display = show ? 'flex' : 'none';
    }
}

// Reset all input states
export function resetInputState() {
    inputState.moveForward = false;
    inputState.moveBackward = false;
    inputState.moveLeft = false;
    inputState.moveRight = false;
    
    inputState.attack = false;
    inputState.chargeAttack = false;
    inputState.interact = false;
    inputState.dash = false;
    inputState.jump = false;
    
    inputState.inventory = false;
    inputState.map = false;
    inputState.menu = false;
    
    inputState.mouse.leftButton = false;
    inputState.mouse.rightButton = false;
    inputState.mouse.deltaX = 0;
    inputState.mouse.deltaY = 0;
    
    for (const key in inputState.justPressed) {
        inputState.justPressed[key] = false;
    }
    
    for (const key in inputState.previouslyPressed) {
        inputState.previouslyPressed[key] = false;
    }
    
    inputState.axes.leftStickX = 0;
    inputState.axes.leftStickY = 0;
    inputState.axes.rightStickX = 0;
    inputState.axes.rightStickY = 0;
    
    console.log("Input state has been reset");
}

window.resetInputState = resetInputState;
