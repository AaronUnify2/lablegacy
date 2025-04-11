// Updated createTouchButtons method to properly set the light icon
export class InputManager {
    constructor(camera, domElement) {
        // Other constructor code remains the same
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
        this.gravityForce = 25;
        this.jumpForce = 10;
        this.isGrounded = false;
        this.playerHeight = 2;
        this.jumpCooldown = 0;
        
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
        
        // Initialize event listeners
        this.initKeyboardControls();
        this.initMouseControls();
        this.initTouchControls();
        
        // For detecting if we're on a touch device
        this.checkTouchDevice();
    }
    
    // Other methods remain unchanged

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
            'move-center': '💡', // Light bulb icon for toggle
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
                    
                    // Set the light button to light-on class by default
                    if (buttonId === 'move-center') {
                        button.className += ' light-on';
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
    
    // Updated setupButtonEventListeners with the single press toggle
    setupButtonEventListeners() {
        // Movement buttons
        this.setupButtonTouch('move-up', () => this.moveForward = true, () => this.moveForward = false);
        this.setupButtonTouch('move-down', () => this.moveBackward = true, () => this.moveBackward = false);
        this.setupButtonTouch('move-left', () => this.moveLeft = true, () => this.moveLeft = false);
        this.setupButtonTouch('move-right', () => this.moveRight = true, () => this.moveRight = false);
        
        // Center button for toggling light
        this.setupButtonTouch('move-center', 
            () => {
                // Toggle the light-on class on the button itself
                const button = document.getElementById('move-center');
                if (button) {
                    button.classList.toggle('light-on');
                }
                
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

    // Keep the rest of the class as is
}
