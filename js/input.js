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
        
        // Mouse state
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDragging = false;
        
        // Touch controls
        this.leftJoystick = null;
        this.rightJoystick = null;
        this.touchEnabled = false;
        
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
        if (typeof nipplejs === 'undefined') {
            console.error('NippleJS library not loaded!');
            return;
        }
        
        // Create left joystick for movement
        this.leftJoystick = nipplejs.create({
            zone: document.getElementById('left-joystick'),
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'white',
            size: 120
        });
        
        // Create right joystick for camera rotation
        this.rightJoystick = nipplejs.create({
            zone: document.getElementById('right-joystick'),
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'white',
            size: 120
        });
        
        // Set up left joystick events for movement
        this.leftJoystick.on('move', (event, data) => {
            const force = Math.min(data.force, 1);
            const angle = data.angle.radian;
            
            // Reset movement flags
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;
            
            // Set movement based on joystick direction
            if (angle >= 0 && angle < Math.PI / 2) {
                // Forward-right quadrant
                this.moveForward = true;
                this.moveRight = true;
                this.forwardIntensity = Math.cos(angle) * force;
                this.rightIntensity = Math.sin(angle) * force;
            } else if (angle >= Math.PI / 2 && angle < Math.PI) {
                // Backward-right quadrant
                this.moveBackward = true;
                this.moveRight = true;
                this.backwardIntensity = Math.cos(angle - Math.PI) * force * -1;
                this.rightIntensity = Math.sin(angle - Math.PI) * force * -1;
            } else if (angle >= Math.PI && angle < 3 * Math.PI / 2) {
                // Backward-left quadrant
                this.moveBackward = true;
                this.moveLeft = true;
                this.backwardIntensity = Math.cos(angle - Math.PI) * force;
                this.leftIntensity = Math.sin(angle - Math.PI) * force;
            } else {
                // Forward-left quadrant
                this.moveForward = true;
                this.moveLeft = true;
                this.forwardIntensity = Math.cos(angle) * force;
                this.leftIntensity = Math.sin(angle - 2 * Math.PI) * force * -1;
            }
        });
        
        // Reset movement when joystick is released
        this.leftJoystick.on('end', () => {
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;
            this.forwardIntensity = 0;
            this.backwardIntensity = 0;
            this.leftIntensity = 0;
            this.rightIntensity = 0;
        });
        
        // Set up right joystick events for camera rotation
        this.rightJoystick.on('move', (event, data) => {
            const force = Math.min(data.force, 1);
            const angle = data.angle.radian;
            
            // Rotate camera based on joystick input
            const rotateX = Math.cos(angle) * force * this.lookSpeed;
            const rotateY = Math.sin(angle) * force * this.lookSpeed;
            
            this.rotateCamera(rotateX, rotateY);
        });
    }
    
    rotateCamera(deltaX, deltaY) {
        // Create a temporary quaternion to handle the rotation
        const quaternion = new THREE.Quaternion();
        
        // Rotate around the world up vector (Y-axis) for left/right rotations
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaX);
        this.camera.quaternion.premultiply(quaternion);
        
        // Get the camera's right vector for up/down rotations
        const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        
        // Rotate around the camera's right vector for up/down rotations
        quaternion.setFromAxisAngle(rightVector, deltaY);
        this.camera.quaternion.premultiply(quaternion);
        
        // Normalize the quaternion to prevent accumulation errors
        this.camera.quaternion.normalize();
    }
    
    update(deltaTime) {
        // Get direction vectors from camera orientation
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0);
        
        // Calculate movement speed with delta time
        const speedPerFrame = this.moveSpeed * deltaTime;
        
        // Apply movements based on keyboard input
        if (this.moveForward) {
            const intensity = this.touchEnabled ? this.forwardIntensity || 1 : 1;
            this.camera.position.addScaledVector(forward, speedPerFrame * intensity);
        }
        if (this.moveBackward) {
            const intensity = this.touchEnabled ? this.backwardIntensity || 1 : 1;
            this.camera.position.addScaledVector(forward, -speedPerFrame * intensity);
        }
        if (this.moveRight) {
            const intensity = this.touchEnabled ? this.rightIntensity || 1 : 1;
            this.camera.position.addScaledVector(right, speedPerFrame * intensity);
        }
        if (this.moveLeft) {
            const intensity = this.touchEnabled ? this.leftIntensity || 1 : 1;
            this.camera.position.addScaledVector(right, -speedPerFrame * intensity);
        }
        if (this.moveUp) {
            this.camera.position.addScaledVector(up, speedPerFrame);
        }
        if (this.moveDown) {
            this.camera.position.addScaledVector(up, -speedPerFrame);
        }
    }
}