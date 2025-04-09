export class InputManager {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;
        
        // Camera controls
        this.lookSpeed = 0.1;
        this.moveSpeed = 10;
        this.zoomSpeed = 2;
        
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
                    this.moveUp = true;
                    break;
                case 'ShiftLeft':
                    this.moveDown = true;
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
                    this.moveUp = false;
                    break;
                case 'ShiftLeft':
                    this.moveDown = false;
                    break;
            }
        });
    }
    
    initMouseControls() {
        // Mouse down event
        this.domElement.addEventListener('mousedown', (event) => {
            this.mouseDragging = true;
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
        });
        
        // Mouse move event
        document.addEventListener('mousemove', (event) => {
            if (this.mouseDragging) {
                const moveX = event.clientX - this.mouseX;
                const moveY = event.clientY - this.mouseY;
                
                // Rotate camera based on mouse movement
                this.rotateCamera(-moveX * this.lookSpeed * 0.1, -moveY * this.lookSpeed * 0.1);
                
                this.mouseX = event.clientX;
                this.mouseY = event.clientY;
            }
        });
        
        // Mouse up event
        document.addEventListener('mouseup', () => {
            this.mouseDragging = false;
        });
        
        // Mouse leave event
        document.addEventListener('mouseleave', () => {
            this.mouseDragging = false;
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
            'jump': 'Bounce',
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
        
        // Check if buttons might overflow
        if (containerWidth > screenWidth * 0.95) {
            const buttons = document.querySelectorAll('.control-button');
            const screenRatio = Math.min(1, (screenWidth * 0.95) / containerWidth);
            
            buttons.forEach(button => {
                // Dynamically adjust button size based on screen width
                const newSize = Math.floor(parseInt(getComputedStyle(button).width) * screenRatio);
                button.style.width = newSize + 'px';
                button.style.height = newSize + 'px';
                
                // Adjust font size as well
                button.style.fontSize = Math.max(14, Math.floor(newSize * 0.4)) + 'px';
            });
        }
    }
    
    setupButtonEventListeners() {
        // Movement buttons
        this.setupButtonTouch('move-up', () => this.moveForward = true, () => this.moveForward = false);
        this.setupButtonTouch('move-down', () => this.moveBackward = true, () => this.moveBackward = false);
        this.setupButtonTouch('move-left', () => this.moveLeft = true, () => this.moveLeft = false);
        this.setupButtonTouch('move-right', () => this.moveRight = true, () => this.moveRight = false);
        
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
        
        // Zoom buttons
        this.setupButtonTouch('zoom-in', 
            () => this.zoomCamera(-this.zoomSpeed), 
            null, 
            true
        );
        this.setupButtonTouch('zoom-out', 
            () => this.zoomCamera(this.zoomSpeed), 
            null, 
            true
        );
        
        // Jump button
        if (this.buttons['jump']) {
            this.setupButtonTouch('jump', 
                () => console.log('Jump pressed (not implemented)'), 
                () => console.log('Jump released')
            );
        }
    }
    
    setupButtonTouch(buttonId, pressCallback, releaseCallback, continuousPress = false) {
        const button = this.buttons[buttonId];
        if (!button) return;
        
        let pressInterval;
        
        // Handle touch/mouse events
        const startPress = (e) => {
            if (e) e.preventDefault(); // Prevent default behavior
            button.classList.add('active');
            if (pressCallback) pressCallback();
            
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
        }
        
        // Normalize the quaternion to prevent accumulation errors
        this.camera.quaternion.normalize();
    }
    
    zoomCamera(amount) {
        // Simple zoom implementation - move camera forward/backward
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.camera.position.addScaledVector(forward, amount);
    }
    
    update(deltaTime) {
        // Get direction vectors from camera orientation
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0);
        
        // Calculate movement speed with delta time
        const speedPerFrame = this.moveSpeed * deltaTime;
        
        // Apply movements based on keyboard or touch input
        if (this.moveForward) {
            this.camera.position.addScaledVector(forward, speedPerFrame);
        }
        if (this.moveBackward) {
            this.camera.position.addScaledVector(forward, -speedPerFrame);
        }
        if (this.moveRight) {
            this.camera.position.addScaledVector(right, speedPerFrame);
        }
        if (this.moveLeft) {
            this.camera.position.addScaledVector(right, -speedPerFrame);
        }
        if (this.moveUp) {
            this.camera.position.addScaledVector(up, speedPerFrame);
        }
        if (this.moveDown) {
            this.camera.position.addScaledVector(up, -speedPerFrame);
        }
    }
}
