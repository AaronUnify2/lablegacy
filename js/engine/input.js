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
        
        // Physics properties
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.gravityForce = 25; // Strength of gravity
        this.jumpForce = 10; // Strength of jump
        this.isGrounded = false; // Whether player is on the ground
        this.playerHeight = 2; // Height of player from ground
        this.jumpCooldown = 0; // Cooldown timer for jumping
        
        // Camera controls
        this.lookSpeed = 0.1;
        this.moveSpeed = 10;
        
        // Mouse state
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDragging = false;
        
        // Touch controls
        this.touchEnabled = false;
        this.buttons = {};
        
        // Button sizing
        this.originalButtonSizes = {};
        this.hasAdjustedButtons = false;
        
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
    }
    
    createTouchButtons() {
        const touchControls = document.getElementById('touch-controls');
        
        // Clear existing content
        touchControls.innerHTML = '';
        
        // Create the grid container
        const gridContainer = document.createElement('div');
        gridContainer.className = 'control-grid';
        touchControls.appendChild(gridContainer);
        
        // Define the button layout using a 6x3 grid
        const buttonLayout = [
            ['move-up-left', 'move-up', 'move-up-right', 'zoom-in', 'camera-up', ''],
            ['move-left', 'move-center', 'move-right', 'camera-left', 'jump', 'camera-right'],
            ['move-down-left', 'move-down', 'move-down-right', 'zoom-out', 'camera-down', '']
        ];
        
        // Define button icons
        const buttonIcons = {
            'move-up-left': '↖',
            'move-up': '↑',
            'move-up-right': '↗',
            'move-left': '←',
            'move-center': '',
            'move-right': '→',
            'move-down-left': '↙',
            'move-down': '↓',
            'move-down-right': '↘',
            'camera-up': '↑',
            'camera-left': '←',
            'camera-right': '→',
            'jump': 'Jump',
            'zoom-in': '+',
            'zoom-out': '-',
            'camera-down': '↓'
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
        
        // Adjust layout based on screen size
        this.adjustButtonSizes();
        window.addEventListener('resize', this.adjustButtonSizes.bind(this));
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
        // Movement buttons
        this.setupButtonTouch('move-up', () => this.moveForward = true, () => this.moveForward = false);
        this.setupButtonTouch('move-down', () => this.moveBackward = true, () => this.moveBackward = false);
        this.setupButtonTouch('move-left', () => this.moveLeft = true, () => this.moveLeft = false);
        this.setupButtonTouch('move-right', () => this.moveRight = true, () => this.moveRight = false);
        
        // Center button for toggling light
        this.setupButtonTouch('move-center', 
            () => {
                // Dispatch a custom event that the game can listen for
                const event = new CustomEvent('toggle-staff-light');
                document.dispatchEvent(event);
            }, 
            null,
            false,
            true // Single press (don't repeat)
        );
        
        // Diagonal movement buttons
        this.setupButtonTouch('move-up-left', 
            () => { this.moveForward = true; this.moveLeft = true; }, 
            () => { this.moveForward = false; this.moveLeft = false; }
        );
        this.setupButtonTouch('move-up-right', 
            () => { this.moveForward = true; this.moveRight = true; }, 
            () => { this.moveForward = false; this.moveRight = false; }
        );
        this.setupButtonTouch('move-down-left', 
            () => { this.moveBackward = true; this.moveLeft = true; }, 
            () => { this.moveBackward = false; this.moveLeft = false; }
        );
        this.setupButtonTouch('move-down-right', 
            () => { this.moveBackward = true; this.moveRight = true; }, 
            () => { this.moveBackward = false; this.moveRight = false; }
        );
        
        // Camera rotation buttons
        this.setupButtonTouch('camera-up', 
            () => this.rotateCamera(0, -0.05), 
            null, 
            true
        );
        this.setupButtonTouch('camera-down', 
            () => this.rotateCamera(0, 0.05), 
            null, 
            true
        );
        this.setupButtonTouch('camera-left', 
            () => this.rotateCamera(0.05, 0), 
            null, 
            true
        );
        
        // Camera-right button
        this.setupButtonTouch('camera-right', 
            () => this.rotateCamera(-0.05, 0), 
            null, 
            true
        );
        
        // Jump button
        if (this.buttons['jump']) {
            this.setupButtonTouch('jump', 
                () => this.jump = true, 
                () => this.jump = false
            );
        }
    }
    
    setupButtonTouch(buttonId, pressCallback, releaseCallback, continuousPress = false, singlePress = false) {
        const button = this.buttons[buttonId];
        if (!button) return;
        
        let pressInterval;
        let buttonPressed = false; // Track if button has been pressed (for single press)
        
        // Handle touch/mouse events
        const startPress = (e) => {
            if (e) e.preventDefault(); // Prevent default behavior
            
            // For single press buttons, only trigger once per press
            if (singlePress && buttonPressed) return;
            
            button.classList.add('active');
            
            if (pressCallback) {
                pressCallback();
                
                // For single press, mark as pressed after callback
                if (singlePress) {
                    buttonPressed = true;
                }
            }
            
            if (continuousPress) {
                // For continuous actions like camera rotation, run the callback repeatedly
                pressInterval = setInterval(() => {
                    if (pressCallback) pressCallback();
                }, 16); // roughly 60fps
            }
        };
        
        const endPress = (e) => {
            if (e) e.preventDefault(); // Prevent default behavior
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
        
        // Mouse events
        button.addEventListener('mousedown', startPress);
        button.addEventListener('mouseup', endPress);
        button.addEventListener('mouseleave', endPress);
        
        // Touch events
        button.addEventListener('touchstart', startPress);
        button.addEventListener('touchend', endPress);
        button.addEventListener('touchcancel', endPress);
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
        
        // Apply gravity to velocity
        this.velocity.y -= this.gravityForce * deltaTime;
        
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
        
        // Apply horizontal movement to velocity with some smoothing
        this.velocity.x = movementVector.x;
        this.velocity.z = movementVector.z;
        
        // Handle jumping
        this.jumpCooldown -= deltaTime;
        
        // Check ground collision for jump and gravity
        const groundCheckPos = this.camera.position.clone();
        groundCheckPos.y -= this.playerHeight / 2 + 0.1; // Check slightly below our feet
        
        const groundCollision = collisionManager.checkCollision(groundCheckPos, 0.5);
        this.isGrounded = groundCollision.collides;
        
        // Allow jumping only when grounded and cooldown is ready
        if (this.isGrounded) {
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
        
        // Handle collisions with walls
        if (collisionManager) {
            // Smaller player radius for easier navigation
            const playerRadius = 0.5;
            
            // Try horizontal movement first (X and Z)
            const horizontalPosition = previousPosition.clone();
            horizontalPosition.x = newPosition.x;
            horizontalPosition.z = newPosition.z;
            
            // Check horizontal collision
            const horizontalCollision = collisionManager.checkCollision(horizontalPosition, playerRadius);
            
            if (horizontalCollision.collides) {
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
            
            const feetCollision = collisionManager.checkCollision(feetPosition, playerRadius);
            
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
            
            // Apply vertical position
            this.camera.position.y = verticalPosition.y;
        } else {
            // No collision manager, simply apply position
            this.camera.position.copy(newPosition);
        }
    }
}
