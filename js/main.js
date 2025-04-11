import { Renderer } from './engine/renderer.js';
import { InputManager } from './engine/input.js';
import { DungeonGenerator } from './systems/dungeonGenerator.js';
import { CollisionManager } from './engine/collision.js';
import { MagicStaff } from './entities/magicStaff.js';

class Game {
    constructor() {
        // Initialize core components
        this.renderer = new Renderer();
        this.input = new InputManager(this.renderer.camera, this.renderer.domElement);
        this.dungeonGenerator = new DungeonGenerator();
        this.collisionManager = new CollisionManager();
        
        // Game state
        this.isRunning = false;
        this.lastTime = 0;
        this.fpsCounter = document.getElementById('fps-counter');
        this.positionInfo = document.getElementById('position-info');
        this.loadingScreen = document.getElementById('loading-screen');
        
        // Custom game state
        this.gameState = {
            curseLevel: 0, // Increases as player progresses
            hasKey: false,
            curseEffects: []
        };
        
        // Player properties
        this.player = {
            magicStaff: null,
            height: 2.0, // Player height in meters
            eyeLevel: 1.7, // Eye level height in meters (for camera)
            walkingSpeed: 5.0, // Walking speed in meters per second
            runningSpeed: 8.0, // Running speed in meters per second
            isRunning: false, // Whether the player is currently running
            canInteract: true, // Whether the player can interact with objects
            inventory: [] // Player's inventory
        };
        
        // Bind methods
        this.update = this.update.bind(this);
        this.init = this.init.bind(this);
    }
    
    async init() {
        console.log('Initializing game...');
        
        // Update loading screen with lore
        this.showLoreText();
        
        try {
            // Generate a test dungeon
            const dungeon = await this.dungeonGenerator.generateFloor(1);
            
            // Add the dungeon to the scene
            this.renderer.scene.add(dungeon.mesh);
            
            // Register dungeon colliders
            if (dungeon.mesh.colliderMeshes) {
                console.log(`Registering ${dungeon.mesh.colliderMeshes.length} colliders...`);
                for (const mesh of dungeon.mesh.colliderMeshes) {
                    this.collisionManager.addCollider(mesh);
                }
            }
            
            // Start the player in a safe position above the first room
            const firstRoom = dungeon.rooms[0];
            this.renderer.camera.position.set(
                firstRoom.x + firstRoom.width / 2,
                this.player.eyeLevel + 1, // Position camera at eye level plus a safety margin
                firstRoom.y + firstRoom.height / 2
            );
            
            // Make sure we have valid collisions before proceeding
            const checkPosition = this.renderer.camera.position.clone();
            checkPosition.y -= this.player.height / 2 + 0.1; // Check below feet
            
            const groundCheck = this.collisionManager.checkCollision(checkPosition, 0.5);
            console.log('Initial ground check:', groundCheck);
            
            if (!groundCheck.collides) {
                // If no ground is detected, force the player to a safe height
                console.log('No ground detected, adjusting height...');
                this.renderer.camera.position.y = this.player.eyeLevel + 2;
            }
            
            // Create magic staff AFTER we've confirmed the player is in a safe position
            this.player.magicStaff = new MagicStaff(this.renderer.scene, this.renderer.camera);
            
            // Add atmospheric sound
            this.setupAudio();
            
            // Set first-person mode controls
            this.setupFirstPersonMode();
            
            // Hide loading screen with slight delay for dramatic effect
            setTimeout(() => {
                this.loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    this.loadingScreen.style.display = 'none';
                    
                    // Start the game loop
                    this.isRunning = true;
                    requestAnimationFrame(this.update);
                    
                    console.log('Game initialized!');
                }, 1000);
            }, 3000); // Show lore text for 3 seconds
            
        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }
    
    setupFirstPersonMode() {
        // Adjust camera properties for first-person
        this.renderer.camera.fov = 75; // Wider FOV for better immersion
        this.renderer.camera.near = 0.1; // Closer near plane
        this.renderer.camera.updateProjectionMatrix();
        
        // Set input manager to use first-person settings
        this.input.moveSpeed = this.player.walkingSpeed;
        this.input.playerHeight = this.player.height;
        
        // Add running capability
        document.addEventListener('keydown', (event) => {
            if (event.code === 'ShiftLeft') {
                this.player.isRunning = true;
                this.input.moveSpeed = this.player.runningSpeed;
            }
        });
        
        document.addEventListener('keyup', (event) => {
            if (event.code === 'ShiftLeft') {
                this.player.isRunning = false;
                this.input.moveSpeed = this.player.walkingSpeed;
            }
        });
        
        // Add interaction key (E)
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyE' && this.player.canInteract) {
                this.tryInteract();
            }
        });
        
        // Ensure the camera stays at eye level
        this.renderer.camera.position.y = this.player.eyeLevel;
    }
    
    tryInteract() {
        // Cast a ray forward to find interactive objects
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.renderer.camera.quaternion);
        const origin = this.renderer.camera.position.clone();
        
        // Maximum interaction distance
        const interactionRange = 2.5;
        
        // Raycast against objects
        const hit = this.collisionManager.raycast(origin, forward, interactionRange);
        
        if (hit) {
            console.log('Interacting with object:', hit.collider.object);
            
            // Check if it's the key
            if (hit.collider.object.userData && hit.collider.object.userData.isKey) {
                this.collectKey(hit.collider.object);
            }
            
            // Check if it's a door
            if (hit.collider.object.userData && hit.collider.object.userData.isDoor) {
                this.interactWithDoor(hit.collider.object);
            }
        }
    }
    
    collectKey(keyObject) {
        console.log('Collected key!');
        this.gameState.hasKey = true;
        
        // Add key to inventory
        this.player.inventory.push('key');
        
        // Remove key from scene
        this.renderer.scene.remove(keyObject);
        
        // Remove key collider
        const colliderIndex = this.collisionManager.colliders.findIndex(c => c.object === keyObject);
        if (colliderIndex !== -1) {
            this.collisionManager.removeCollider(colliderIndex);
        }
        
        // Show message to player
        this.showMessage('You found an ancient key!');
    }
    
    interactWithDoor(doorObject) {
        if (this.gameState.hasKey) {
            console.log('Unlocking door!');
            // Implement door animation/opening logic here
            
            // Remove door from scene or replace with open door model
            this.renderer.scene.remove(doorObject);
            
            // Remove door collider
            const colliderIndex = this.collisionManager.colliders.findIndex(c => c.object === doorObject);
            if (colliderIndex !== -1) {
                this.collisionManager.removeCollider(colliderIndex);
            }
            
            // Show message to player
            this.showMessage('The door unlocks and opens...');
        } else {
            // Show message to player
            this.showMessage('This door appears to be locked. You need a key.');
        }
    }
    
    showMessage(text) {
        // Create or get message container
        let messageContainer = document.getElementById('message-container');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'message-container';
            messageContainer.style.position = 'absolute';
            messageContainer.style.bottom = '20%';
            messageContainer.style.left = '0';
            messageContainer.style.width = '100%';
            messageContainer.style.textAlign = 'center';
            messageContainer.style.color = 'white';
            messageContainer.style.fontFamily = 'Cinzel, serif';
            messageContainer.style.fontSize = '1.5rem';
            messageContainer.style.textShadow = '0 0 5px rgba(0, 0, 0, 0.7)';
            messageContainer.style.zIndex = '100';
            messageContainer.style.pointerEvents = 'none';
            document.getElementById('game-container').appendChild(messageContainer);
        }
        
        // Create message element
        const message = document.createElement('div');
        message.textContent = text;
        message.style.opacity = '0';
        message.style.transition = 'opacity 0.5s ease-in, transform 0.5s ease-out';
        message.style.transform = 'translateY(20px)';
        message.style.padding = '10px';
        messageContainer.appendChild(message);
        
        // Animate message in
        setTimeout(() => {
            message.style.opacity = '1';
            message.style.transform = 'translateY(0)';
        }, 100);
        
        // Remove message after delay
        setTimeout(() => {
            message.style.opacity = '0';
            message.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                messageContainer.removeChild(message);
            }, 500);
        }, 4000);
    }
    
    showLoreText() {
        const loadingContent = document.querySelector('.loading-content');
        
        // Add lore text beneath the title
        const loreElement = document.createElement('div');
        loreElement.className = 'lore-text';
        loreElement.innerHTML = `
            <p>The ancient structure...</p>
            <p>Now consumed by darkness.</p>
            <p>You must discover the machine's purpose before the curse consumes you too.</p>
            <p>Your magical staff will light the way, but beware what lurks in the shadows...</p>
        `;
        
        // Insert after the title but before the spinner
        const spinner = loadingContent.querySelector('.spinner');
        loadingContent.insertBefore(loreElement, spinner);
        
        // Add a flickering effect to the loading text
        const loadingText = loadingContent.querySelector('p:last-child');
        loadingText.textContent = 'Entering the labyrinth...';
        loadingText.className = 'flicker-text';
    }
    
    setupAudio() {
        // Background ambient sound
        this.ambientSound = new Audio();
        this.ambientSound.src = 'sounds/ambient_curse.mp3'; // You'll need to add this file
        this.ambientSound.loop = true;
        this.ambientSound.volume = 0.4;
        
        // Play ambient sound on user interaction
        const playAudio = () => {
            this.ambientSound.play().catch(error => {
                console.log('Audio playback failed:', error);
            });
            
            // Remove event listeners once audio starts
            document.removeEventListener('click', playAudio);
            document.removeEventListener('keydown', playAudio);
        };
        
        document.addEventListener('click', playAudio);
        document.addEventListener('keydown', playAudio);
        
        // Additional sound effects
        this.sounds = {
            footsteps: new Audio('sounds/footsteps_stone.mp3'), // You'll need to add this file
            torchFlicker: new Audio('sounds/torch_flicker.mp3'), // You'll need to add this file
            staffHum: new Audio('sounds/staff_hum.mp3') // New sound for the magic staff
        };
        
        // Prepare the footstep sound
        this.sounds.footsteps.loop = true;
        this.sounds.footsteps.volume = 0;
        
        // Prepare the staff humming sound
        if (this.sounds.staffHum) {
            this.sounds.staffHum.loop = true;
            this.sounds.staffHum.volume = 0.2;
            this.sounds.staffHum.play().catch(() => {});
        }
    }
    
    update(currentTime) {
        if (!this.isRunning) return;
        
        // Calculate delta time in seconds
        if (!this.lastTime) this.lastTime = currentTime;
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update FPS counter (every 500ms)
        if (currentTime % 500 < 16) {
            this.fpsCounter.textContent = `FPS: ${Math.round(1 / deltaTime)}`;
        }
        
        // Update position display
        const pos = this.renderer.camera.position;
        this.positionInfo.textContent = `Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
        
        // Update input and movement with collision detection
        this.input.update(deltaTime, this.collisionManager);
        
        // Update audio based on movement
        this.updateAudio(deltaTime);
        
        // Update any curse effects
        this.updateCurseEffects(currentTime, deltaTime);
        
        // Render the scene with time parameter for effects
        this.renderer.render(currentTime);
        
        // Continue the game loop
        requestAnimationFrame(this.update);
    }
    
    updateAudio(deltaTime) {
        // Handle footstep sounds based on movement
        const isMoving = this.input.moveForward || this.input.moveBackward || 
                         this.input.moveLeft || this.input.moveRight;
        
        if (isMoving) {
            // Gradually increase footstep volume
            const targetVolume = this.player.isRunning ? 0.4 : 0.3;
            const rampSpeed = this.player.isRunning ? 3 : 2;
            
            this.sounds.footsteps.volume = Math.min(targetVolume, this.sounds.footsteps.volume + deltaTime * rampSpeed);
            
            // Adjust footstep playback rate based on running/walking
            this.sounds.footsteps.playbackRate = this.player.isRunning ? 1.5 : 1.0;
            
            if (this.sounds.footsteps.paused) {
                this.sounds.footsteps.play().catch(() => {});
            }
        } else {
            // Gradually decrease footstep volume
            this.sounds.footsteps.volume = Math.max(0, this.sounds.footsteps.volume - deltaTime * 4);
            
            if (this.sounds.footsteps.volume <= 0.01 && !this.sounds.footsteps.paused) {
                this.sounds.footsteps.pause();
            }
        }
        
        // Occasionally play torch flicker sound
        if (Math.random() < deltaTime * 0.2) {
            this.sounds.torchFlicker.currentTime = 0;
            this.sounds.torchFlicker.volume = Math.random() * 0.2 + 0.1;
            this.sounds.torchFlicker.play().catch(() => {});
        }
    }
    
    updateCurseEffects(currentTime, deltaTime) {
        // Subtle camera shake based on curse level
        if (this.gameState.curseLevel > 0) {
            const intensity = this.gameState.curseLevel * 0.0005;
            const shakeX = (Math.random() - 0.5) * intensity;
            const shakeY = (Math.random() - 0.5) * intensity;
            
            this.renderer.camera.position.x += shakeX;
            this.renderer.camera.position.y += shakeY;
        }
        
        // Pulse the fog density
        if (this.renderer.scene.fog) {
            const baseFog = 0.03;
            const pulseMagnitude = 0.01;
            const pulseSpeed = 0.5;
            
            this.renderer.scene.fog.density = baseFog + 
                Math.sin(currentTime * 0.001 * pulseSpeed) * pulseMagnitude;
        }
        
        // Adjust staff light based on curse level
        if (this.player.magicStaff) {
            // As curse increases, staff light may flicker or dim
            const curseEffect = Math.max(0, 1 - (this.gameState.curseLevel * 0.1));
            const flickerIntensity = Math.sin(currentTime * 0.002) * (this.gameState.curseLevel * 0.1);
            
            this.player.magicStaff.setLightIntensity(2.5 * curseEffect + flickerIntensity);
        }
    }
}

// Initialize and start the game when the window loads
let game;
window.addEventListener('load', () => {
    game = new Game();
    game.init();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (game && game.renderer) {
        game.renderer.resize();
    }
});
