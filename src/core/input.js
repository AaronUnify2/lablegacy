// Input handling system with mobile controller support

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
    
    // Mouse data
    mouse: {
        x: 0,
        y: 0,
        deltaX: 0,
        deltaY: 0,
        leftButton: false,
        rightButton: false
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
    
    // Mobile-specific - track multiple touches
    isMobile: false,
    touchId: null,              // Joystick touch
    cameraSwipeId: null,        // Camera swipe touch
    lastCameraTouchX: null,
    lastCameraTouchY: null,
    activeTouches: new Map()    // Track all active touches
};

// Mobile controller elements
let joystickElement;
let joystickKnob;
let actionButtons;
let mobileControls;
let menuButton;

// Set up input event listeners
function setupInput() {
    console.log('Setting up input system...');
    
    // Detect if using mobile device
    inputState.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                          (window.innerWidth <= 800 && window.innerHeight <= 600);
    
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

// Set up mobile controls
function setupMobileControls() {
    // Get mobile controls container
    mobileControls = document.getElementById('mobile-controls');
    joystickElement = document.getElementById('joystick');
    joystickKnob = document.getElementById('joystick-knob');
    menuButton = document.getElementById('menu-button');
    
    // Show mobile controls
    if (mobileControls) {
        mobileControls.style.display = 'flex';
    }
    
    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
}

// Touch event handlers
function handleTouchStart(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const target = touch.target;
        const touchId = touch.identifier;
        
        // Store this touch in our active touches map
        inputState.activeTouches.set(touchId, {
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            target: target,
            type: 'unknown'
        });
        
        // Check if touch is on joystick
        if (target.id === 'joystick' || target.id === 'joystick-knob') {
            inputState.touchId = touchId;
            inputState.activeTouches.get(touchId).type = 'joystick';
            updateJoystickPosition(touch);
            console.log('Joystick touch started:', touchId);
            continue;
        }
        
        // Check if touch is on menu button
        if (target.id === 'menu-button' || target.closest('#menu-button')) {
            inputState.activeTouches.get(touchId).type = 'menu';
            handleButtonPress('menu', true);
            if (menuButton) menuButton.style.transform = 'scale(0.9)';
            continue;
        }
        
        // Check if touch is on action button
        if (target.classList && target.classList.contains('control-button') && target.id !== 'menu-button') {
            const action = target.dataset.action;
            inputState.activeTouches.get(touchId).type = 'button';
            inputState.activeTouches.get(touchId).action = action;
            target.style.transform = 'scale(0.9)';
            handleButtonPress(action, true);
            continue;
        }
        
        // Any other touch becomes camera swipe (if we don't already have one)
        if (!inputState.cameraSwipeId) {
            inputState.cameraSwipeId = touchId;
            inputState.lastCameraTouchX = touch.clientX;
            inputState.lastCameraTouchY = touch.clientY;
            inputState.activeTouches.get(touchId).type = 'camera';
            console.log('Camera swipe started:', touchId);
        }
    }
}

function handleTouchMove(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const touchId = touch.identifier;
        
        // Update our touch tracking
        if (inputState.activeTouches.has(touchId)) {
            const touchData = inputState.activeTouches.get(touchId);
            touchData.currentX = touch.clientX;
            touchData.currentY = touch.clientY;
        }
        
        // Handle joystick movement
        if (touchId === inputState.touchId) {
            updateJoystickPosition(touch);
        }
        
        // Handle camera swiping
        if (touchId === inputState.cameraSwipeId) {
            const deltaX = touch.clientX - inputState.lastCameraTouchX;
            const deltaY = touch.clientY - inputState.lastCameraTouchY;
            
            // Apply camera movement (increased sensitivity)
            inputState.mouse.deltaX = deltaX * 2.0;
            inputState.mouse.deltaY = deltaY * 2.0;
            
            // Update last positions
            inputState.lastCameraTouchX = touch.clientX;
            inputState.lastCameraTouchY = touch.clientY;
        }
    }
}

function handleTouchEnd(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const touchId = touch.identifier;
        
        // Get touch data before removing it
        const touchData = inputState.activeTouches.get(touchId);
        
        // Handle joystick touch end
        if (touchId === inputState.touchId) {
            resetJoystick();
            inputState.touchId = null;
            console.log('Joystick touch ended:', touchId);
        }
        
        // Handle camera swipe touch end
        if (touchId === inputState.cameraSwipeId) {
            inputState.cameraSwipeId = null;
            inputState.lastCameraTouchX = null;
            inputState.lastCameraTouchY = null;
            console.log('Camera swipe ended:', touchId);
        }
        
        // Handle button touch end
        if (touchData && touchData.type === 'menu') {
            if (menuButton) menuButton.style.transform = 'scale(1)';
            handleButtonPress('menu', false);
        }
        
        if (touchData && touchData.type === 'button') {
            const target = document.getElementById(touchData.target.id);
            if (target) target.style.transform = 'scale(1)';
            handleButtonPress(touchData.action, false);
        }
        
        // Remove from active touches
        inputState.activeTouches.delete(touchId);
    }
}

// Joystick helpers
function updateJoystickPosition(touch) {
    if (!joystickElement || !joystickKnob) return;
    
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
    
    // Convert joystick position to directional input
    inputState.moveLeft = Math.abs(normalizedX) > 0.3 && normalizedX < 0;
    inputState.moveRight = Math.abs(normalizedX) > 0.3 && normalizedX > 0;
    inputState.moveForward = Math.abs(normalizedY) > 0.3 && normalizedY < 0;
    inputState.moveBackward = Math.abs(normalizedY) > 0.3 && normalizedY > 0;
}

function resetJoystick() {
    if (joystickKnob) {
        joystickKnob.style.transform = 'translate(-50%, -50%)';
    }
    
    inputState.axes.leftStickX = 0;
    inputState.axes.leftStickY = 0;
    inputState.moveForward = false;
    inputState.moveBackward = false;
    inputState.moveLeft = false;
    inputState.moveRight = false;
}

function handleButtonPress(action, isPressed) {
    switch (action) {
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

// Desktop input handlers
function handleKeyDown(event) {
    updateInputState(event.code, true);
    
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
    }
}

function handleKeyUp(event) {
    updateInputState(event.code, false);
}

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

function handleMouseMove(event) {
    inputState.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    inputState.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function handleMouseDown(event) {
    switch (event.button) {
        case 0:
            inputState.mouse.leftButton = true;
            inputState.attack = true;
            break;
        case 2:
            inputState.mouse.rightButton = true;
            inputState.chargeAttack = true;
            break;
    }
}

function handleMouseUp(event) {
    switch (event.button) {
        case 0:
            inputState.mouse.leftButton = false;
            inputState.attack = false;
            break;
        case 2:
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
function getInput() {
    updateJustPressedStates();
    return { ...inputState };
}

// Make functions available globally
window.setupInput = setupInput;
window.getInput = getInput;
window.inputState = inputState;
