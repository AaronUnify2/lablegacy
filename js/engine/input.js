export class InputManager {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.jump = false;
        
        // Joystick state
        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            deltaX: 0,
            deltaY: 0,
            angle: 0,
            distance: 0,
            maxDistance: 40, // Maximum distance the joystick can move
            movementVector: new THREE.Vector2(0, 0),
            touchId: null // Store the touch ID to track the specific touch point
        };
        
        // Physics properties
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.gravityForce = 25; // Strength of gravity
        this.jumpForce = 10; // Strength of jump
        this.isGrounded = false; // Whether player is on the ground
        this.playerHeight = 2; // Height of player from ground
        this.jumpCooldown = 0; // Cooldown timer for jumping
        
        // Camera controls
        this.lookSpeed = 0.03;
        this.moveSpeed = 10;
        
        // Mouse state
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDragging = false;
        
        // Touch controls
        this.touchEnabled = false;
        this.buttons = {};
        this.activeTouches = {}; // Track all active touches by ID
        
        // Button sizing
        this.originalButtonSizes = {};
        this.hasAdjustedButtons = false;
        
        // Swipe camera controls - improved properties
        this.cameraSwipe = {
            active: false,
            startX: 0,
            startY: 0,
            lastX: 0,
            lastY: 0,
            touchId: null,
            sensitivity: 0.02 // Adjust this to control swipe sensitivity
        };
        
        // Initialize event listeners
        this.initKeyboardControls();
        this.initMouseControls();
        this.initTouchControls();
        
        // For detecting if we're on a touch device
        this.checkTouchDevice();
    }
    
    checkTouchDevice() {
        this.touchEnabled = ('ontouchstart' in window) || 
                           (navigator.maxTouchPoints > 0) || 
                           (navigator.msMaxTouchPoints > 0);
        
        // Show touch controls if on a touch device
        if (this.touchEnabled) {
            document.getElementById('touch-controls').style.display = 'block';
        }
    }
    
    initKeyboardControls() {
        // Keyboard down event
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'Space':
                    this.jump = true;
                    break;
            }
        });
        
        // Keyboard up event
        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'KeyD':
                    this.moveRight = false;
                    break;
                case 'Space':
                    this.jump = false;
                    break;
            }
        });
    }
    
    initMouseControls() {
        // Lock mouse pointer for first-person controls
        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
        });
        
        // Mouse move event with pointer lock
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === this.domElement) {
                // Use movementX/Y which is more reliable for pointer lock controls
                const moveX = event.movementX || 0;
                const moveY = event.movementY || 0;
                
                // Rotate camera based on mouse movement
                this.rotateCamera(-moveX * this.lookSpeed * 0.003, -moveY * this.lookSpeed * 0.003);
            }
        });
        
        // Handle pointer lock change
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement !== this.domElement) {
                // Pointer is no longer locked
                this.mouseDragging = false;
            }
        });
    }
    
    initTouchControls() {
        // Create the control buttons
        this.createTouchButtons();
        
        // Add event listeners for button touches
        this.setupButtonEventListeners();
        
        // Add swipe camera controls - improved implementation
        this.initSwipeCameraControls();
    }
    
    // Improved method for swipe camera controls
    initSwipeCameraControls() {
        // Get the game container for swipe controls
        const gameContainer = document.getElementById('game-container');
        
        // Get the controls area to determine the swipe area
        const touchControls = document.getElementById('touch-controls');
        
        // Handle touch start
        gameContainer.addEventListener('touchstart', (e) => {
            // Process each new touch
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                
                // Store this touch for tracking
                this.activeTouches[touch.identifier] = {
                    startX: touch.clientX,
                    startY: touch.clientY,
                    currentX: touch.clientX,
                    currentY: touch.clientY,
                    element: this.getTouchedElement(touch)
                };
                
                // Handle joystick touch
                const joystickBase = document.getElementById('joystick-base');
                if (joystickBase && this.isTouchOverElement(touch, joystickBase)) {
                    // This is a joystick touch
                    this.joystick.active = true;
                    this.joystick.touchId = touch.identifier;
                    this.handleJoystickMove(touch.clientX, touch.clientY);
                    continue;
                }
                
                // Check if touch is in control buttons area
                if (this.isTouchInControlsArea(touch, touchControls)) {
                    // Check for specific button touches
                    this.handleButtonTouch(touch);
                    continue;
                }
                
                // If touch is in the main game area and we don't have an active swipe yet
                if (!this.cameraSwipe.active && !this.isTouchInControlsArea(touch, touchControls)) {
                    // Start camera swipe
                    this.cameraSwipe.active = true;
                    this.cameraSwipe.touchId = touch.identifier;
                    this.cameraSwipe.startX = touch.clientX;
                    this.cameraSwipe.startY = touch.clientY;
                    this.cameraSwipe.lastX = touch.clientX;
                    this.cameraSwipe.lastY = touch.clientY;
                }
            }
            
            // Prevent default behavior to avoid scrolling
            if (e.target === gameContainer || e.target === this.domElement) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Handle touch move
        gameContainer.addEventListener('touchmove', (e) => {
            // Process each moved touch
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const touchId = touch.identifier;
                
                // Update the stored touch position
                if (this.activeTouches[touchId]) {
                    this.activeTouches[touchId].currentX = touch.clientX;
                    this.activeTouches[touchId].currentY = touch.clientY;
                }
                
                // Check if this is the joystick touch
                if (this.joystick.active && touchId === this.joystick.touchId) {
                    this.handleJoystickMove(touch.clientX, touch.clientY);
                }
                
                // Check if this is the camera swipe touch
                if (this.cameraSwipe.active && touchId === this.cameraSwipe.touchId) {
                    // Calculate the movement
                    const moveX = touch.clientX - this.cameraSwipe.lastX;
                    const moveY = touch.clientY - this.cameraSwipe.lastY;
                    
                    // Update last position
                    this.cameraSwipe.lastX = touch.clientX;
                    this.cameraSwipe.lastY = touch.clientY;
                    
                    // Apply camera rotation - smoother movement
                    this.rotateCamera(-moveX * this.cameraSwipe.sensitivity, -moveY * this.cameraSwipe.sensitivity);
                }
            }
            
            // Prevent default behavior to avoid scrolling only for relevant elements
            if (e.target === gameContainer || e.target === this.domElement || 
                e.target.closest('#touch-controls') || 
                this.joystick.active || this.cameraSwipe.active) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Handle touch end and cancel
        const endTouchHandler = (e) => {
            // Process each ended touch
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const touchId = touch.identifier;
                
                // Check if this is the joystick touch
                if (this.joystick.active && touchId === this.joystick.touchId) {
                    this.resetJoystick();
                }
                
                // Check if this is the camera swipe touch
                if (this.cameraSwipe.active && touchId === this.cameraSwipe.touchId) {
                    this.cameraSwipe.active = false;
                    this.cameraSwipe.touchId = null;
                }
                
                // Release any pressed buttons for this touch
                this.handleButtonRelease(touch);
                
                // Remove this touch from tracking
                delete this.activeTouches[touchId];
            }
        };
        
        gameContainer.addEventListener('touchend', endTouchHandler);
        gameContainer.addEventListener('touchcancel', endTouchHandler);
    }
    
    // New helper method to get the element at a touch point
    getTouchedElement(touch) {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        return element;
    }
    
    // New helper to handle button touches
    handleButtonTouch(touch) {
        const element = this.getTouchedElement(touch);
        if (!element) return;
        
        // Check if the element is one of our buttons
        const buttonId = element.id;
        if (this.buttons[buttonId]) {
            // Store the touch ID with the button for tracking
            this.buttons[buttonId].touchId = touch.identifier;
            
            // Trigger the button's press action using stored handler if available
            if (element._startPressHandler) {
                element._startPressHandler();
            } else {
                // Fallback to event dispatch
                const pressEvent = new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                element.dispatchEvent(pressEvent);
            }
        }
    }
    
    // New helper to handle button release
    handleButtonRelease(touch) {
        // Check all buttons to see if this touch was pressing any of them
        for (const buttonId in this.buttons) {
            if (this.buttons[buttonId].touchId === touch.identifier) {
                const element = this.buttons[buttonId];
                
                // Clear the touch ID
                element.touchId = null;
                
                // Trigger the button's release action using stored handler if available
                if (element._endPressHandler) {
                    element._endPressHandler();
                } else {
                    // Fallback to event dispatch
                    const releaseEvent = new MouseEvent('mouseup', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    element.dispatchEvent(releaseEvent);
                }
            }
        }
    }
    
    // Helper to check if touch is over a specific element
    isTouchOverElement(touch, element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom
        );
    }
    
    // Helper to check if touch is in the controls area
    isTouchInControlsArea(touch, controlsElement) {
        if (!controlsElement) return false;
        
        // Get the controls area bounds
        const controlsRect = controlsElement.getBoundingClientRect();
        
        // Consider controls area to start slightly above the actual element
        // This gives a larger area for camera swiping
        const controlsTop = controlsRect.top - 50; // 50px buffer above controls
        
        // Check if touch is in controls area
        return (
            touch.clientX >= controlsRect.left &&
            touch.clientX <= controlsRect.right &&
            touch.clientY >= controlsTop &&
            touch.clientY <= controlsRect.bottom
        );
    }

    createTouchButtons() {
        const touchControls = document.getElementById('touch-controls');
        
        // Clear existing content
        touchControls.innerHTML = '';
        
        // Create the container for both joystick and control grid
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        touchControls.appendChild(controlsContainer);
        
        // Create the joystick container
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'joystick-container';
        joystickContainer.className = 'joystick-container';
        
        // Create the joystick base (static circle)
        const joystickBase = document.createElement('div');
        joystickBase.id = 'joystick-base';
        joystickBase.className = 'joystick-base';
        
        // Create the joystick handle (movable part)
        const joystickHandle = document.createElement('div');
        joystickHandle.id = 'joystick-handle';
        joystickHandle.className = 'joystick-handle';
        
        // Assemble the joystick
        joystickBase.appendChild(joystickHandle);
        joystickContainer.appendChild(joystickBase);
        controlsContainer.appendChild(joystickContainer);
        
        // Create the grid container for buttons
        const gridContainer = document.createElement('div');
        gridContainer.className = 'control-grid';
        controlsContainer.appendChild(gridContainer);
        
        // Define the button layout using a 3x3 grid
        const buttonLayout = [
            ['toggle-light', 'camera-up', 'attack'],
            ['camera-left', 'jump', 'camera-right'],
            ['zoom-out', 'camera-down', '']  // Empty string for no button
        ];
        
        // Define button icons
        const buttonIcons = {
            'camera-up': '↑',
            'camera-left': '←',
            'camera-right': '→',
            'jump': 'Jump',
            'zoom-out': '-',
            'toggle-light': 'L',
            'camera-down': '↓',
            'attack': 'Atk'
        };
        
        // Create buttons according to layout
        for (let row = 0; row < buttonLayout.length; row++) {
            for (let col = 0; col < buttonLayout[row].length; col++) {
                const buttonId = buttonLayout[row][col];
                if (buttonId !== '') {
                    const button = document.createElement('div');
                    button.id = buttonId;
                    button.className = 'control-button';
                    
                    // Add special class for the jump button
                    if (buttonId === 'jump') {
                        button.className += ' jump-button';
                    }
                    
                    button.textContent = buttonIcons[buttonId];
                    
                    // Position the button in the grid
                    button.style.gridRow = row + 1;
                    button.style.gridColumn = col + 1;
                    
                    gridContainer.appendChild(button);
                    
                    // Store button reference
                    this.buttons[buttonId] = button;
                }
            }
        }
        
        // Set up joystick event handlers
        this.setupJoystickControls();
        
        // Adjust layout based on screen size
        this.adjustButtonSizes();
        window.addEventListener('resize', this.adjustButtonSizes.bind(this));
    }
    
    // Improved method to set up joystick controls
    setupJoystickControls() {
        const joystickBase = document.getElementById('joystick-base');
        const joystickHandle = document.getElementById('joystick-handle');
        
        if (!joystickBase || !joystickHandle) return;
        
        // Reset joystick method made more accessible
        this.resetJoystick = () => {
            this.joystick.active = false;
            this.joystick.touchId = null;
            joystickHandle.style.transform = 'translate(0px, 0px)';
            this.joystick.movementVector.set(0, 0);
            this.resetMovement();
        };
    }
    
    // Improved handler for joystick movement
    handleJoystickMove(clientX, clientY) {
        if (!this.joystick.active) return;
        
        const joystickBase = document.getElementById('joystick-base');
        const joystickHandle = document.getElementById('joystick-handle');
        
        if (!joystickBase || !joystickHandle) return;
        
        // Get joystick base position and size
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate the distance from center
        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX);
        
        // Limit the joystick movement to maxDistance
        const limitedDistance = Math.min(distance, this.joystick.maxDistance);
        
        // Calculate the joystick handle position
        const moveX = Math.cos(angle) * limitedDistance;
        const moveY = Math.sin(angle) * limitedDistance;
        
        // Position the joystick handle
        joystickHandle.style.transform = `translate(${moveX}px, ${moveY}px)`;
        
        // Update joystick state
        this.joystick.deltaX = deltaX;
        this.joystick.deltaY = deltaY;
        this.joystick.angle = angle;
        this.joystick.distance = limitedDistance;
        
        // Calculate movement vector (normalized)
        const normalizedDistance = limitedDistance / this.joystick.maxDistance;
        this.joystick.movementVector.x = Math.cos(angle) * normalizedDistance;
        this.joystick.movementVector.y = Math.sin(angle) * normalizedDistance;
        
        // Convert joystick position to movement direction
        this.updateMovementFromJoystick();
    }
    
    // Convert joystick input to movement direction
    updateMovementFromJoystick() {
        // Reset movement states
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        const deadzone = 0.2; // Minimum movement threshold
        
        // Calculate movement based on joystick vector
        if (Math.abs(this.joystick.movementVector.y) > deadzone) {
            if (this.joystick.movementVector.y < 0) {
                this.moveForward = true;
            } else {
                this.moveBackward = true;
            }
        }
        
        if (Math.abs(this.joystick.movementVector.x) > deadzone) {
            if (this.joystick.movementVector.x > 0) {
                this.moveRight = true;
            } else {
                this.moveLeft = true;
            }
        }
    }
    
    // Reset all movement states
    resetMovement() {
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
    }
    
    adjustButtonSizes() {
        const screenWidth = window.innerWidth;
        const containerWidth = document.getElementById('touch-controls').offsetWidth;
        
        // Get all buttons
        const buttons = document.querySelectorAll('.control-button');
        
        // Store original sizes on first call
        if (!this.hasAdjustedButtons) {
            buttons.forEach(button => {
                const id = button.id;
                this.originalButtonSizes[id] = {
                    width: parseInt(getComputedStyle(button).width),
                    fontSize: parseInt(getComputedStyle(button).fontSize)
                };
            });
            this.hasAdjustedButtons = true;
        }
        
        // Check if buttons might overflow
        if (containerWidth > screenWidth * 0.95) {
            const screenRatio = Math.min(1, (screenWidth * 0.95) / containerWidth);
            
            buttons.forEach(button => {
                const id = button.id;
                if (this.originalButtonSizes[id]) {
                    // Calculate from original size, not current size
                    const originalWidth = this.originalButtonSizes[id].width;
                    const originalFontSize = this.originalButtonSizes[id].fontSize;
                    
                    const newSize = Math.floor(originalWidth * screenRatio);
                    button.style.width = newSize + 'px';
                    button.style.height = newSize + 'px';
                    
                    // Adjust font size based on original size
                    button.style.fontSize = 
                        Math.max(14, Math.floor(originalFontSize * screenRatio)) + 'px';
                }
            });
        } else {
            // Reset to original sizes if there's enough screen space
            buttons.forEach(button => {
                const id = button.id;
                if (this.originalButtonSizes[id]) {
                    button.style.width = this.originalButtonSizes[id].width + 'px';
                    button.style.height = this.originalButtonSizes[id].width + 'px';
                    button.style.fontSize = this.originalButtonSizes[id].fontSize + 'px';
                }
            });
        }
    }
    
    setupButtonEventListeners() {
        // Light toggle button
        this.setupButtonTouch('toggle-light', 
            () => {
                // Dispatch a custom event that the game can listen for
                const event = new CustomEvent('toggle-staff-light');
                document.dispatchEvent(event);
            }, 
            null,
            false,
            true // Single press (don't repeat)
        );
        
        // Camera rotation buttons
        this.setupButtonTouch('camera-up', 
            () => this.rotateCamera(0, -0.05), 
            () => {}, // Empty release callback 
            true // Continuous press
        );
        
        this.setupButtonTouch('camera-down', 
            () => this.rotateCamera(0, 0.05), 
            () => {}, // Empty release callback
            true // Continuous press
        );
        
        this.setupButtonTouch('camera-left', 
            () => this.rotateCamera(0.05, 0), 
            () => {}, // Empty release callback
            true // Continuous press
        );
        
        // Camera-right button
        this.setupButtonTouch('camera-right', 
            () => this.rotateCamera(-0.05, 0), 
            () => {}, // Empty release callback
            true // Continuous press
        );
        
        // Jump button
        if (this.buttons['jump']) {
            this.setupButtonTouch('jump', 
                () => this.jump = true, 
                () => this.jump = false
            );
        }
        
        // Attack button
        this.setupButtonTouch('attack', 
            () => {
                // Dispatch a custom event that the game can listen for
                const event = new CustomEvent('player-attack');
                document.dispatchEvent(event);
            }, 
            null,
            false,
            true // Single press (don't repeat)
        );
        
        // Zoom out button
        this.setupButtonTouch('zoom-out',
            () => {
                // Add zoom out functionality here
                // For example, increase the camera's FOV
                const event = new CustomEvent('zoom-out');
                document.dispatchEvent(event);
            },
            null,
            true // Continuous press
        );
    }
    
    setupButtonTouch(buttonId, pressCallback, releaseCallback, continuousPress = false, singlePress = false) {
        const button = this.buttons[buttonId];
        if (!button) return;
        
        let pressInterval;
        let buttonPressed = false; // Track if button has been pressed (for single press)
        
        // Create bound handlers that we can reference for removal
        const startPress = (e) => {
            if (e) {
                e.preventDefault(); // Prevent default behavior
                e.stopPropagation(); // Stop event propagation - THIS IS IMPORTANT
            }
            
            // For single press buttons, only trigger once per press
            if (singlePress && buttonPressed) return;
            
            button.classList.add('active');
            
            if (pressCallback) {
                // Call the specific callback for this button
                pressCallback();
                
                // For single press, mark as pressed after callback
                if (singlePress) {
                    buttonPressed = true;
                }
            }
            
            if (continuousPress) {
                // For continuous actions like camera rotation, run the callback repeatedly
                if (pressInterval) clearInterval(pressInterval); // Clear any existing interval
                
                pressInterval = setInterval(() => {
                    if (pressCallback) pressCallback();
                }, 16); // roughly 60fps
            }
        };
        
        const endPress = (e) => {
            if (e) {
                e.preventDefault(); // Prevent default behavior
                e.stopPropagation(); // Stop event propagation - THIS IS IMPORTANT
            }
            
            button.classList.remove('active');
            
            // Reset button pressed state
            if (singlePress) {
                buttonPressed = false;
            }
            
            if (releaseCallback) releaseCallback();
            
            if (pressInterval) {
                clearInterval(pressInterval);
                pressInterval = null;
            }
        };
        
        // Remove any existing event listeners to prevent duplicates
        button.removeEventListener('mousedown', button._startPressHandler);
        button.removeEventListener('mouseup', button._endPressHandler);
        button.removeEventListener('mouseleave', button._endPressHandler);
        
        // Store handlers on the button for later removal
        button._startPressHandler = startPress;
        button._endPressHandler = endPress;
        
        // Add new event listeners
        button.addEventListener('mousedown', startPress);
        button.addEventListener('mouseup', endPress);
        button.addEventListener('mouseleave', endPress);
    }
    
    rotateCamera(deltaX, deltaY) {
        // Create a temporary quaternion to handle the rotation
        const quaternion = new THREE.Quaternion();
        
        // Rotate around the world up vector (Y-axis) for left/right rotations
        if (deltaX !== 0) {
            quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaX);
            this.camera.quaternion.premultiply(quaternion);
        }
        
        // Get the camera's right vector for up/down rotations
        if (deltaY !== 0) {
            const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            
            // Rotate around the camera's right vector for up/down rotations
            quaternion.setFromAxisAngle(rightVector, deltaY);
            this.camera.quaternion.premultiply(quaternion);
            
            // Constrain up/down rotation to prevent flipping
            // This is a simple way to limit vertical rotation
            const lookDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            const verticalAngle = Math.asin(lookDirection.y);
            
            // If we're looking too far up or down, adjust the quaternion
            const maxAngle = Math.PI * 0.45; // About 80 degrees
            if (Math.abs(verticalAngle) > maxAngle) {
                // Reset the vertical component by rotating back
                const correctionAngle = verticalAngle > 0 ? 
                    verticalAngle - maxAngle : 
                    verticalAngle + maxAngle;
                    
                quaternion.setFromAxisAngle(rightVector, -correctionAngle);
                this.camera.quaternion.premultiply(quaternion);
            }
        }
        
        // Normalize the quaternion to prevent accumulation errors
        this.camera.quaternion.normalize();
    }
    
    update(deltaTime, collisionManager) {
        // Store the previous position for collision resolution
        const previousPosition = this.camera.position.clone();
        
        // Apply gravity to velocity with a limit to prevent excessive speeds when falling
        this.velocity.y = Math.max(this.velocity.y - this.gravityForce * deltaTime, -25); // Cap falling speed
        
        // Get direction vectors from camera orientation (normalized)
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
        forward.y = 0; // Keep movement horizontal on XZ plane
        forward.normalize(); // Re-normalize after zeroing Y component
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion).normalize();
        right.y = 0; // Keep movement horizontal
        right.normalize(); // Re-normalize
        
        // Calculate base movement speed with delta time
        const speedPerFrame = this.moveSpeed * deltaTime;
        
        // Calculate horizontal movement vector based on input
        const movementVector = new THREE.Vector3(0, 0, 0);
        
        if (this.joystick.active && this.joystick.movementVector.lengthSq() > 0) {
            // Use analog joystick input for smoother control
            // The Y axis of the joystick is inverted (up is negative in screen coordinates)
            movementVector.add(forward.clone().multiplyScalar(-this.joystick.movementVector.y));
            movementVector.add(right.clone().multiplyScalar(this.joystick.movementVector.x));
            
            // Apply movement proportional to joystick displacement
            const magnitude = Math.min(1, this.joystick.movementVector.length());
            movementVector.normalize().multiplyScalar(speedPerFrame * magnitude);
        } else {
            // Fallback to keyboard controls
            if (this.moveForward) {
                movementVector.add(forward);
            }
            if (this.moveBackward) {
                movementVector.add(forward.clone().multiplyScalar(-1));
            }
            if (this.moveRight) {
                movementVector.add(right);
            }
            if (this.moveLeft) {
                movementVector.add(right.clone().multiplyScalar(-1));
            }
            
            // Normalize the horizontal movement vector if it's not zero
            if (movementVector.lengthSq() > 0) {
                movementVector.normalize();
                movementVector.multiplyScalar(speedPerFrame);
            }
        }
        
        // Apply horizontal movement to velocity with some smoothing
        this.velocity.x = movementVector.x;
        this.velocity.z = movementVector.z;
        
        // Handle jumping
        this.jumpCooldown -= deltaTime;
        
        // Initialize ground check flag
        let wasGroundedBefore = this.isGrounded;
        this.isGrounded = false;
        
        // Perform multiple ground checks for more reliable detection
        const groundCheckRadius = 0.45; // Slightly smaller than player radius for better fit
        
        // Check multiple points around the player's feet to ensure we don't miss the ground
        const groundCheckPoints = [
            // Center point
            new THREE.Vector3(
                this.camera.position.x,
                this.camera.position.y - this.playerHeight / 2 - 0.1,
                this.camera.position.z
            ),
            // Forward point
            new THREE.Vector3(
                this.camera.position.x + forward.x * groundCheckRadius * 0.8,
                this.camera.position.y - this.playerHeight / 2 - 0.1,
                this.camera.position.z + forward.z * groundCheckRadius * 0.8
            ),
            // Backward point
            new THREE.Vector3(
                this.camera.position.x - forward.x * groundCheckRadius * 0.8,
                this.camera.position.y - this.playerHeight / 2 - 0.1,
                this.camera.position.z - forward.z * groundCheckRadius * 0.8
            ),
            // Right point
            new THREE.Vector3(
                this.camera.position.x + right.x * groundCheckRadius * 0.8,
                this.camera.position.y - this.playerHeight / 2 - 0.1,
                this.camera.position.z + right.z * groundCheckRadius * 0.8
            ),
            // Left point
            new THREE.Vector3(
                this.camera.position.x - right.x * groundCheckRadius * 0.8,
                this.camera.position.y - this.playerHeight / 2 - 0.1,
                this.camera.position.z - right.z * groundCheckRadius * 0.8
            )
        ];
        
        // Check all points for ground contact
        for (const checkPos of groundCheckPoints) {
            // When checking for ground, ignore enemy collisions
            const groundCollision = collisionManager.checkCollision(checkPos, groundCheckRadius, true);
            if (groundCollision.collides) {
                this.isGrounded = true;
                break;
            }
        }
        
        // Handle ground collision state change
        if (this.isGrounded) {
            // If we've just landed, play landing sound or effect here
            if (!wasGroundedBefore && this.velocity.y < -4) {
                // Heavy landing effect could go here
                // For example: this.playLandingSound(Math.abs(this.velocity.y));
            }
            
            // Reset vertical velocity when on the ground to prevent buildup
            this.velocity.y = Math.max(this.velocity.y, 0);
            
            // Process jump input
            if (this.jump && this.jumpCooldown <= 0) {
                this.velocity.y = this.jumpForce;
                this.jumpCooldown = 0.3; // Prevent jump spamming
                this.isGrounded = false;
            }
        }
        
        // Apply velocity to position
        const newPosition = this.camera.position.clone().add(
            new THREE.Vector3(
                this.velocity.x,
                this.velocity.y * deltaTime, // Scale vertical movement by delta time
                this.velocity.z
            )
        );
        
        // Handle collisions with walls and enemies
        if (collisionManager) {
            // Smaller player radius for easier navigation
            const playerRadius = 0.45; // Reduced from 0.5 for better fit in tight spaces
            
            // Try horizontal movement first (X and Z)
            const horizontalPosition = previousPosition.clone();
            horizontalPosition.x = newPosition.x;
            horizontalPosition.z = newPosition.z;
            
            // Check for collisions during horizontal movement, don't ignore enemies here
            const horizontalCollision = collisionManager.checkCollision(horizontalPosition, playerRadius, false);
            
            if (horizontalCollision.collides) {
                // If we hit an enemy, use special resolution
                if (horizontalCollision.isEnemy) {
                    // Get resolved position from the collision manager
                    const resolvedPosition = collisionManager.resolveCollision(horizontalPosition, previousPosition, playerRadius);
                    this.camera.position.x = resolvedPosition.x;
                    this.camera.position.z = resolvedPosition.z;
                } else {
                    // Handle wall sliding by trying X and Z separately
                    const xOnlyPosition = previousPosition.clone();
                    xOnlyPosition.x = newPosition.x;
                    
                    const zOnlyPosition = previousPosition.clone();
                    zOnlyPosition.z = newPosition.z;
                    
                    // Try X movement
                    if (!collisionManager.checkCollision(xOnlyPosition, playerRadius).collides) {
                        this.camera.position.x = xOnlyPosition.x;
                    }
                    
                    // Try Z movement
                    if (!collisionManager.checkCollision(zOnlyPosition, playerRadius).collides) {
                        this.camera.position.z = zOnlyPosition.z;
                    }
                }
            } else {
                // No horizontal collision, apply full horizontal movement
                this.camera.position.x = horizontalPosition.x;
                this.camera.position.z = horizontalPosition.z;
            }
            
            // Now handle vertical movement (Y) with collisions
            const verticalPosition = this.camera.position.clone();
            verticalPosition.y = newPosition.y;
            
            // Check for head collision (ceiling)
            const headPosition = verticalPosition.clone();
            headPosition.y += this.playerHeight / 2; // Check at head level
            
            const headCollision = collisionManager.checkCollision(headPosition, playerRadius);
            
            if (headCollision.collides) {
                // Hit our head on the ceiling
                this.velocity.y = Math.min(0, this.velocity.y); // Stop upward velocity
                
                // Position camera just below the ceiling collision
                const ceilingHeight = headCollision.collider.box.min.y - this.playerHeight / 2;
                if (ceilingHeight < verticalPosition.y) {
                    verticalPosition.y = ceilingHeight - 0.1; // Small gap to prevent stuck
                }
            }
            
            // Check for feet collision (floor)
            const feetPosition = verticalPosition.clone();
            feetPosition.y -= this.playerHeight / 2; // Check at feet level
            
            // Use a smaller radius for floor checks to prevent getting stuck on edges
            const feetCheckRadius = playerRadius * 0.9;
            
            // Ignore enemy collisions for floor checks to prevent false positives
            const feetCollision = collisionManager.checkCollision(feetPosition, feetCheckRadius, true);
            
            if (feetCollision.collides) {
                // We're standing on ground
                this.isGrounded = true;
                this.velocity.y = Math.max(0, this.velocity.y); // Stop downward velocity
                
                // Position camera just above the floor collision
                const floorHeight = feetCollision.collider.box.max.y + this.playerHeight / 2;
                if (floorHeight > verticalPosition.y) {
                    verticalPosition.y = floorHeight + 0.1; // Small gap to prevent stuck
                }
            }
            
            // Do an additional raycast check directly down to accurately find floor height
            // This helps prevent "walking on air" bugs
            if (this.isGrounded) {
                const rayOrigin = this.camera.position.clone();
                rayOrigin.y -= this.playerHeight / 2 - 0.1;  // Just above feet level
                
                const floorHit = collisionManager.findFloorBelow(rayOrigin, 1.0);
                if (floorHit) {
                    // Position precisely above the hit point
                    const exactFloorHeight = floorHit.point.y + this.playerHeight / 2;
                    // Only adjust if we're slightly floating above the ground
                    if (exactFloorHeight > verticalPosition.y && 
                        exactFloorHeight - verticalPosition.y < 0.5) {
                        verticalPosition.y = exactFloorHeight;
                    }
                }
            }
            
            // Check for enemy collisions at the new vertical position
            const bodyPosition = verticalPosition.clone();
            const bodyCollision = collisionManager.checkCollision(bodyPosition, playerRadius, false);
            
            if (bodyCollision.collides && bodyCollision.isEnemy) {
                // Use the collision manager to resolve the collision
                const resolvedPosition = collisionManager.resolveCollision(bodyPosition, previousPosition, playerRadius);
                
                // Apply the resolved position, but preserve our calculated Y if it's better
                // This prevents enemy collisions from pushing player through floor
                if (resolvedPosition.y >= previousPosition.y) {
                    verticalPosition.y = resolvedPosition.y;
                }
            }
            
            // Apply vertical position
            this.camera.position.y = verticalPosition.y;
            
            // Final check - if we've somehow ended up in an enemy, push away horizontally
            const finalCollision = collisionManager.checkCollision(this.camera.position, playerRadius);
            if (finalCollision.collides && finalCollision.isEnemy) {
                const resolvedFinal = collisionManager.resolveCollision(this.camera.position, previousPosition, playerRadius);
                this.camera.position.copy(resolvedFinal);
            }
        } else {
            // No collision manager, simply apply position
            this.camera.position.copy(newPosition);
        }
    }
}
