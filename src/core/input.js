// Input handling system with dual-joystick mobile controls

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
    
    // For analog input (dual joysticks)
    axes: {
        leftStickX: 0,
        leftStickY: 0,
        rightStickX: 0,
        rightStickY: 0
    },
    
    // Mobile-specific
    isMobile: false,
    leftJoystickTouch: null,
    rightJoystickTouch: null,
    buttonTouches: new Map()
};

// Mobile controller elements
let leftJoystickElement;
let leftJoystickKnob;
let rightJoystickElement;
let rightJoystickKnob;
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
    
    console.log('Input system initialized', inputState.isMobile ? 'with mobile dual-joystick controls' : 'with desktop controls');
}

// Set up mobile controls
function setupMobileControls() {
    // Create the dual joystick UI
    createDualJoystickUI();
    
    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
}

function createDualJoystickUI() {
    // Get existing mobile controls
    mobileControls = document.getElementById('mobile-controls');
    if (!mobileControls) return;
    
    // Clear existing content and rebuild
    mobileControls.innerHTML = '';
    mobileControls.style.display = 'flex';
    
    // Left joystick (movement)
    const leftJoystickContainer = document.createElement('div');
    leftJoystickContainer.style.position = 'relative';
    
    leftJoystickElement = document.createElement('div');
    leftJoystickElement.id = 'left-joystick';
    leftJoystickElement.style.cssText = `
        position: relative;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 2px solid rgba(100, 149, 237, 0.8);
        background-color: rgba(65, 105, 225, 0.3);
        pointer-events: auto;
        box-shadow: 0 0 15px rgba(100, 149, 237, 0.8);
        margin-left: 20px;
    `;
    
    leftJoystickKnob = document.createElement('div');
    leftJoystickKnob.id = 'left-joystick-knob';
    leftJoystickKnob.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: rgba(65, 105, 225, 0.8);
        pointer-events: none;
    `;
    
    leftJoystickElement.appendChild(leftJoystickKnob);
    leftJoystickContainer.appendChild(leftJoystickElement);
    mobileControls.appendChild(leftJoystickContainer);
    
    // Menu button (center)
    menuButton = document.createElement('div');
    menuButton.id = 'menu-button';
    menuButton.className = 'control-button';
    menuButton.dataset.action = 'menu';
    menuButton.style.cssText = `
        width: 31px;
        height: 31px;
        border-radius: 50%;
        background-color: rgba(240, 240, 240, 0.8);
        border: 2px solid rgba(255, 255, 255, 1);
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        color: #333;
        font-family: Arial, sans-serif;
        font-weight: bold;
        font-size: 11px;
        user-select: none;
        pointer-events: auto;
        position: relative;
    `;
    menuButton.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="width: 12px; height: 2px; background-color: #333; border-radius: 1px;"></div>
            <div style="width: 12px; height: 2px; background-color: #333; border-radius: 1px;"></div>
            <div style="width: 12px; height: 2px; background-color: #333; border-radius: 1px;"></div>
        </div>
    `;
    mobileControls.appendChild(menuButton);
    
    // Right side container for camera joystick and action buttons
    const rightContainer = document.createElement('div');
    rightContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        margin-right: 20px;
    `;
    
    // Right joystick (camera)
    rightJoystickElement = document.createElement('div');
    rightJoystickElement.id = 'right-joystick';
    rightJoystickElement.style.cssText = `
        position: relative;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        border: 2px solid rgba(255, 140, 0, 0.8);
        background-color: rgba(255, 165, 0, 0.3);
        pointer-events: auto;
        box-shadow: 0 0 15px rgba(255, 140, 0, 0.8);
    `;
    
    rightJoystickKnob = document.createElement('div');
    rightJoystickKnob.id = 'right-joystick-knob';
    rightJoystickKnob.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: rgba(255, 140, 0, 0.8);
        pointer-events: none;
    `;
    
    rightJoystickElement.appendChild(rightJoystickKnob);
    rightContainer.appendChild(rightJoystickElement);
    
    // Action buttons
    const actionButtonsContainer = document.createElement('div');
    actionButtonsContainer.id = 'action-buttons';
    actionButtonsContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(2, 1fr);
        gap: 6px;
        pointer-events: auto;
    `;
    
    const buttons = [
        ['button-sword', 'attack', '⚔️', 'rgba(205, 133, 63, 0.8)', 1, 1],
        ['button-staff', 'chargeAttack', '🔮', 'rgba(186, 85, 211, 0.8)', 1, 2],
        ['button-jump', 'jump', '⬆️', 'rgba(60, 179, 113, 0.8)', 2, 1],
        ['button-dash', 'dash', '💨', 'rgba(255, 150, 50, 0.8)', 2, 2]
    ];
    
    buttons.forEach(([id, action, emoji, color, row, col]) => {
        const button = document.createElement('div');
        button.id = id;
        button.className = 'control-button';
        button.dataset.action = action;
        button.textContent = emoji;
        button.style.cssText = `
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: ${color};
            border: 2px solid ${color.replace('0.8', '1')};
            box-shadow: 0 0 10px ${color};
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: Arial, sans-serif;
            font-weight: bold;
            user-select: none;
            font-size: 16px;
            transition: transform 0.1s ease;
            grid-row: ${row};
            grid-column: ${col};
        `;
        actionButtonsContainer.appendChild(button);
    });
    
    rightContainer.appendChild(actionButtonsContainer);
    mobileControls.appendChild(rightContainer);
}

// Touch event handlers
function handleTouchStart(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const target = touch.target;
        const touchId = touch.identifier;
        
        // Left joystick (movement)
        if (target.id === 'left-joystick' || target.id === 'left-joystick-knob') {
            if (!inputState.leftJoystickTouch) {
                inputState.leftJoystickTouch = touchId;
                updateLeftJoystick(touch);
            }
            continue;
        }
        
        // Right joystick (camera)
        if (target.id === 'right-joystick' || target.id === 'right-joystick-knob') {
            if (!inputState.rightJoystickTouch) {
                inputState.rightJoystickTouch = touchId;
                updateRightJoystick(touch);
            }
            continue;
        }
        
        // Menu button
        if (target.id === 'menu-button' || target.closest('#menu-button')) {
            inputState.buttonTouches.set(touchId, { type: 'menu', target: target });
            handleButtonPress('menu', true);
            menuButton.style.transform = 'scale(0.9)';
            continue;
        }
        
        // Action buttons
        if (target.classList && target.classList.contains('control-button') && target.id !== 'menu-button') {
            const action = target.dataset.action;
            inputState.buttonTouches.set(touchId, { 
                type: 'button', 
                target: target,
                action: action 
            });
            target.style.transform = 'scale(0.9)';
            handleButtonPress(action, true);
            continue;
        }
    }
}

function handleTouchMove(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const touchId = touch.identifier;
        
        // Update left joystick
        if (inputState.leftJoystickTouch === touchId) {
            updateLeftJoystick(touch);
        }
        
        // Update right joystick
        if (inputState.rightJoystickTouch === touchId) {
            updateRightJoystick(touch);
        }
    }
}

function handleTouchEnd(event) {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const touchId = touch.identifier;
        
        // Left joystick end
        if (inputState.leftJoystickTouch === touchId) {
            resetLeftJoystick();
            inputState.leftJoystickTouch = null;
        }
        
        // Right joystick end
        if (inputState.rightJoystickTouch === touchId) {
            resetRightJoystick();
            inputState.rightJoystickTouch = null;
        }
        
        // Button end
        if (inputState.buttonTouches.has(touchId)) {
            const buttonData = inputState.buttonTouches.get(touchId);
            
            if (buttonData.type === 'menu') {
                menuButton.style.transform = 'scale(1)';
                handleButtonPress('menu', false);
            } else if (buttonData.type === 'button') {
                buttonData.target.style.transform = 'scale(1)';
                handleButtonPress(buttonData.action, false);
            }
            
            inputState.buttonTouches.delete(touchId);
        }
    }
}

// Joystick update functions
function updateLeftJoystick(touch) {
    if (!leftJoystickElement || !leftJoystickKnob) return;
    
    const rect = leftJoystickElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxRadius = rect.width / 2 - leftJoystickKnob.offsetWidth / 2;
    
    if (distance > maxRadius) {
        deltaX = deltaX * maxRadius / distance;
        deltaY = deltaY * maxRadius / distance;
    }
    
    leftJoystickKnob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    
    const normalizedX = deltaX / maxRadius;
    const normalizedY = deltaY / maxRadius;
    
    inputState.axes.leftStickX = normalizedX;
    inputState.axes.leftStickY = normalizedY;
    
    // Convert to movement input
    inputState.moveLeft = Math.abs(normalizedX) > 0.3 && normalizedX < 0;
    inputState.moveRight = Math.abs(normalizedX) > 0.3 && normalizedX > 0;
    inputState.moveForward = Math.abs(normalizedY) > 0.3 && normalizedY < 0;
    inputState.moveBackward = Math.abs(normalizedY) > 0.3 && normalizedY > 0;
}

function updateRightJoystick(touch) {
    if (!rightJoystickElement || !rightJoystickKnob) return;
    
    const rect = rightJoystickElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxRadius = rect.width / 2 - rightJoystickKnob.offsetWidth / 2;
    
    if (distance > maxRadius) {
        deltaX = deltaX * maxRadius / distance;
        deltaY = deltaY * maxRadius / distance;
    }
    
    rightJoystickKnob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    
    const normalizedX = deltaX / maxRadius;
    const normalizedY = deltaY / maxRadius;
    
    inputState.axes.rightStickX = normalizedX;
    inputState.axes.rightStickY = normalizedY;
    
    // Convert to camera input with sensitivity
    inputState.mouse.deltaX = normalizedX * 3.0;
    inputState.mouse.deltaY = normalizedY * 3.0;
}

function resetLeftJoystick() {
    if (leftJoystickKnob) {
        leftJoystickKnob.style.transform = 'translate(-50%, -50%)';
    }
    
    inputState.axes.leftStickX = 0;
    inputState.axes.leftStickY = 0;
    inputState.moveForward = false;
    inputState.moveBackward = false;
    inputState.moveLeft = false;
    inputState.moveRight = false;
}

function resetRightJoystick() {
    if (rightJoystickKnob) {
        rightJoystickKnob.style.transform = 'translate(-50%, -50%)';
    }
    
    inputState.axes.rightStickX = 0;
    inputState.axes.rightStickY = 0;
    inputState.mouse.deltaX = 0;
    inputState.mouse.deltaY = 0;
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

// Desktop input handlers (unchanged)
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
