import { Renderer } from './engine/renderer.js';
import { InputManager } from './engine/input.js';
import { DungeonGenerator } from './systems/dungeonGenerator.js';
import { CollisionManager } from './engine/collision.js';
import { MagicStaff } from './entities/magicStaff.js';
import { Sword } from './entities/sword.js';
import { EnemyManager } from './systems/enemyManager.js';
import { WeaponSystem } from './systems/weaponSystem.js';

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
            sword: null, // Add the sword property
            height: 2.0, // Player height in meters
            eyeLevel: 1.7, // Eye level height in meters (for camera)
            walkingSpeed: 5.0, // Walking speed in meters per second
            runningSpeed: 8.0, // Running speed in meters per second
            isRunning: false, // Whether the player is currently running
            canInteract: true, // Whether the player can interact with objects
            inventory: [], // Player's inventory
            health: 100,
            maxHealth: 100,
            camera: this.renderer.camera, // Reference to camera for enemies
            
            // Damage function for the player
            damage: (amount) => {
                this.playerTakeDamage(amount);
            }
        };
        
        // Fall safety values
        this.fallSafetyEnabled = true;
        this.lastValidPosition = null;
        this.groundCheckInterval = null;
        
        // Bind methods
        this.update = this.update.bind(this);
        this.init = this.init.bind(this);
        this.checkForGround = this.checkForGround.bind(this);
        this.findSafeSpawnPosition = this.findSafeSpawnPosition.bind(this);
        this.playerTakeDamage = this.playerTakeDamage.bind(this);
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
            
            // Instead of directly setting position, find a safe spawn point
            const safePosition = this.findSafeSpawnPosition(dungeon.rooms);
            this.renderer.camera.position.copy(safePosition);
            
            // Store this as a valid position in case we need to reset
            this.lastValidPosition = safePosition.clone();
            
            // Create magic staff AFTER confirming the player is in a safe position
            this.player.magicStaff = new MagicStaff(this.renderer.scene, this.renderer.camera);
            this.player.magicStaff.setVisible(true); // Always visible in dual wield mode
            
            // Create sword
            this.player.sword = new Sword(this.renderer.scene, this.renderer.camera);
            this.player.sword.setVisible(true); // Always visible in dual wield mode
            
            // Create enemy manager
            this.enemyManager = new EnemyManager(this.renderer.scene, this.collisionManager, this.player);
            
            // NEW: Spawn King Cylindars in cardinal rooms
            this.enemyManager.spawnKingCylindarsInCardinalRooms(dungeon.rooms);

// IMPORTANT: Use our new method to spawn shadow crawlers in the CENTRAL room
console.log("About to spawn Shadow Crawlers in central room...");
this.enemyManager.spawnShadowCrawlersInCentralRoom(dungeon.rooms, 3);
console.log("Called method to spawn Shadow Crawlers in central room");

// Additional debugging
setTimeout(() => {
    console.log("Checking enemy count after 3 seconds:");
    console.log(`Total enemies: ${this.enemyManager.enemies.length}`);
    
    // Count Shadow Crawlers
    const crawlerCount = this.enemyManager.enemies.filter(
        e => e && e.constructor && e.constructor.name === "ShadowCrawler"
    ).length;
    
    console.log(`Shadow Crawlers: ${crawlerCount}`);
}, 3000);

            
            // Create weapon system
            this.weaponSystem = new WeaponSystem(this.renderer.scene, this.player, this.enemyManager);
            
            // Add atmospheric sound
            this.setupAudio();
            
            // Set first-person mode controls
            this.setupFirstPersonMode();
            
            // Create health display
            this.createHealthDisplay();
            
            // Create mana display
            this.createManaDisplay();
            
            // Start regular ground checks to prevent falling through terrain
            this.enableFallSafety();
            
            // NEW: Set up screen shake effect for King Cylindar deaths
            this.setupScreenShakeEffect();
            
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
    
    // NEW: Setup Screen Shake Effect for King Cylindar deaths
    setupScreenShakeEffect() {
        // Listen for screen shake events
        document.addEventListener('screen-shake', (event) => {
            const intensity = event.detail?.intensity || 0.3;
            const duration = event.detail?.duration || 0.5;
            
            this.applyScreenShake(intensity, duration);
        });
    }
    
    // NEW: Apply Screen Shake Effect
    applyScreenShake(intensity, duration) {
        const camera = this.renderer.camera;
        const originalPosition = camera.position.clone();
        
        const startTime = performance.now();
        
        const shakeAnimation = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Decreasing intensity as the shake progresses
            const currentIntensity = intensity * (1 - progress);
            
            // Apply random offsets to camera position
            const offsetX = (Math.random() * 2 - 1) * currentIntensity;
            const offsetY = (Math.random() * 2 - 1) * currentIntensity;
            const offsetZ = (Math.random() * 2 - 1) * currentIntensity * 0.5; // Less Z-axis movement
            
            camera.position.set(
                originalPosition.x + offsetX,
                originalPosition.y + offsetY,
                originalPosition.z + offsetZ
            );
            
            if (progress < 1) {
                requestAnimationFrame(shakeAnimation);
            } else {
                // Reset to original position when done
                camera.position.copy(originalPosition);
            }
        };
        
        // Start shake animation
        shakeAnimation();
    }
    
    createHealthDisplay() {
        // Create a health display container
        this.healthDisplay = document.createElement('div');
        this.healthDisplay.id = 'health-display';
        
        // Create the health bar background
        this.healthBar = document.createElement('div');
        this.healthBar.id = 'health-bar';
        
        // Create the health bar fill
        this.healthBarFill = document.createElement('div');
        this.healthBarFill.id = 'health-bar-fill';
        
        // Add health bar fill to health bar
        this.healthBar.appendChild(this.healthBarFill);
        
        // Create health text
        this.healthText = document.createElement('div');
        this.healthText.id = 'health-text';
        this.healthText.textContent = '100/100';
        
        // Add health bar and text to health display
        this.healthDisplay.appendChild(this.healthBar);
        this.healthDisplay.appendChild(this.healthText);
        
        // Add health display to game container
        document.getElementById('game-container').appendChild(this.healthDisplay);
        
        // Update health display
        this.updateHealthDisplay();
    }
    
    createManaDisplay() {
        // Create mana display container
        this.manaDisplay = document.createElement('div');
        this.manaDisplay.id = 'mana-display';
        
        // Create mana bar background
        this.manaBar = document.createElement('div');
        this.manaBar.id = 'mana-bar';
        
        // Create mana bar fill
        this.manaBarFill = document.createElement('div');
        this.manaBarFill.id = 'mana-bar-fill';
        
        // Add mana bar fill to mana bar
        this.manaBar.appendChild(this.manaBarFill);
        
        // Create mana text
        this.manaText = document.createElement('div');
        this.manaText.id = 'mana-text';
        this.manaText.textContent = '0/100';
        
        // Add mana bar and text to mana display
        this.manaDisplay.appendChild(this.manaBar);
        this.manaDisplay.appendChild(this.manaText);
        
        // Add mana display to game container
        document.getElementById('game-container').appendChild(this.manaDisplay);
    }
    
    updateHealthDisplay() {
        // Update health bar fill width
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        this.healthBarFill.style.width = `${healthPercent}%`;
        
        // Update health text
        this.healthText.textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;
        
        // Change color based on health
        if (healthPercent < 25) {
            this.healthBarFill.style.background = 'linear-gradient(to right, #ff0000, #ff3333)';
        } else if (healthPercent < 50) {
            this.healthBarFill.style.background = 'linear-gradient(to right, #ff3300, #ff6633)';
        } else {
            this.healthBarFill.style.background = 'linear-gradient(to right, #ff3333, #ff6666)';
        }
        
        // Pulse effect when health is low
        if (healthPercent < 25) {
            this.healthBar.style.animation = 'pulse 1s infinite alternate';
        } else {
            this.healthBar.style.animation = 'none';
        }
    }
    
    playerTakeDamage(amount) {
        // Reduce player health
        this.player.health = Math.max(0, this.player.health - amount);
        
        // Update health display
        this.updateHealthDisplay();
        
        // Visual damage effect
        this.showDamageEffect();
        
        // Play damage sound
        this.playDamageSound();
        
        // Check if player is dead
        if (this.player.health <= 0) {
            this.playerDeath();
        }
        
        console.log(`Player took ${amount} damage. Health: ${this.player.health}/${this.player.maxHealth}`);
    }
    
    showDamageEffect() {
        // Create a red flash overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '9';
        overlay.style.opacity = '0.8';
        overlay.style.transition = 'opacity 0.5s ease';
        
        // Add to DOM
        document.getElementById('game-container').appendChild(overlay);
        
        // Fade out and remove
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 500);
        }, 100);
    }
    
    playDamageSound() {
        // Create and play a damage sound
        const damageSound = new Audio();
        damageSound.src = 'sounds/player_damage.mp3'; // Add this sound file
        damageSound.volume = 0.3;
        damageSound.play().catch(error => {
            console.log('Audio playback failed:', error);
        });
    }
    
    playerDeath() {
        // Handle player death
        console.log('Player died!');
        
        // Stop the game
        this.isRunning = false;
        
        // Show death screen
        this.showDeathScreen();
    }
    
    showDeathScreen() {
        // Create death screen
        const deathScreen = document.createElement('div');
        deathScreen.id = 'death-screen';
        deathScreen.style.position = 'absolute';
        deathScreen.style.top = '0';
        deathScreen.style.left = '0';
        deathScreen.style.width = '100%';
        deathScreen.style.height = '100%';
        deathScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        deathScreen.style.display = 'flex';
        deathScreen.style.flexDirection = 'column';
        deathScreen.style.justifyContent = 'center';
        deathScreen.style.alignItems = 'center';
        deathScreen.style.zIndex = '1000';
        deathScreen.style.opacity = '0';
        deathScreen.style.transition = 'opacity 2s ease';
        
        // Death message
        const deathMessage = document.createElement('h1');
        deathMessage.textContent = 'You have perished in the labyrinth...';
        deathMessage.style.color = '#ff3333';
        deathMessage.style.fontFamily = 'Cinzel, serif';
        deathMessage.style.fontSize = '3rem';
        deathMessage.style.marginBottom = '2rem';
        deathMessage.style.textShadow = '0 0 10px #ff0000';
        deathScreen.appendChild(deathMessage);
        
        // Retry button
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Try Again';
        retryButton.style.backgroundColor = '#333';
        retryButton.style.color = '#fff';
        retryButton.style.border = '2px solid #ff3333';
        retryButton.style.padding = '1rem 2rem';
        retryButton.style.fontSize = '1.5rem';
        retryButton.style.fontFamily = 'Cinzel, serif';
        retryButton.style.cursor = 'pointer';
        retryButton.style.margin = '1rem';
        retryButton.style.borderRadius = '5px';
        retryButton.addEventListener('click', () => {
            window.location.reload();
        });
        deathScreen.appendChild(retryButton);
        
        // Add to DOM
        document.getElementById('game-container').appendChild(deathScreen);
        
        // Fade in
        setTimeout(() => {
            deathScreen.style.opacity = '1';
        }, 100);
    }
    
    // Find a safe position to spawn the player
    findSafeSpawnPosition(rooms) {
        // Start with the first room as a fallback
        const firstRoom = rooms[0];
        const position = new THREE.Vector3(
            firstRoom.x + firstRoom.width / 2,
            this.player.eyeLevel, 
            firstRoom.y + firstRoom.height / 2
        );
        
        // Try multiple potential spawn points to find one with solid ground
        const potentialSpawns = [
            // Center of first room
            {
                x: firstRoom.x + firstRoom.width / 2,
                y: this.player.eyeLevel,
                z: firstRoom.y + firstRoom.height / 2
            },
            // Quarter into the first room
            {
                x: firstRoom.x + firstRoom.width / 4,
                y: this.player.eyeLevel,
                z: firstRoom.y + firstRoom.height / 4
            },
            // Three quarters into the first room
            {
                x: firstRoom.x + (firstRoom.width * 3) / 4,
                y: this.player.eyeLevel,
                z: firstRoom.y + (firstRoom.height * 3) / 4
            }
        ];
        
        // Add centers of other rooms as potential spawns
        for (let i = 1; i < Math.min(rooms.length, 5); i++) {
            const room = rooms[i];
            potentialSpawns.push({
                x: room.x + room.width / 2,
                y: this.player.eyeLevel,
                z: room.y + room.height / 2
            });
        }
        
        // Try each potential spawn position
        for (const spawn of potentialSpawns) {
            const testPosition = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
            
            // Check if there's ground below this position
            const hasGround = this.checkForGround(testPosition);
            
            if (hasGround) {
                console.log('Found safe spawn position:', testPosition);
                return testPosition;
            }
        }
        
        // If all else fails, add a significant height buffer to avoid falling
        position.y = this.player.eyeLevel + 5;
        console.log('Using fallback spawn with height buffer:', position);
        return position;
    }
    
    // Check if there's ground below a position - Updated to return a boolean
    checkForGround(position) {
        // Create a ray pointing downward from the position
        const checkPosition = position.clone();
        checkPosition.y -= 0.1; // Start slightly below position to avoid self-collision
        
        // Check within a safe range (player height + a bit more)
        const range = this.player.height + 2;
        
        // Find any floor beneath this position
        const floorRaycast = this.collisionManager.findFloorBelow(checkPosition, range);
        
        if (floorRaycast && floorRaycast.collider) {
            // If found a floor, calculate proper height and return true
            const floorY = floorRaycast.point.y;
            position.y = floorY + this.player.eyeLevel;
            return true;
        }
        
        return false;
    }
    
    // Enable fall safety system
    enableFallSafety() {
        this.fallSafetyEnabled = true;
        
        // Set up regular ground checks
        this.groundCheckInterval = setInterval(() => {
            if (!this.isRunning) return;
            
            // Get current position
            const currentPosition = this.renderer.camera.position.clone();
            
            // If falling too quickly or below the world bounds, reset position
            if (currentPosition.y < -20 || this.input.velocity.y < -30) {
                console.log('Fall detected! Applying damage and resetting to last valid position.');
                this.resetToLastValidPosition();
                return;
            }
            
            // Check if we're on solid ground
            const isGrounded = this.input.isGrounded;
            
            // If we're grounded, remember this as a safe position
            if (isGrounded) {
                this.lastValidPosition = currentPosition.clone();
            }
        }, 500); // Check every half second
    }
    
    // Disable fall safety system
    disableFallSafety() {
        this.fallSafetyEnabled = false;
        
        if (this.groundCheckInterval) {
            clearInterval(this.groundCheckInterval);
            this.groundCheckInterval = null;
        }
    }
    
    // Reset player to last valid position - Updated to include damage
    resetToLastValidPosition() {
        if (this.lastValidPosition) {
            // Apply fall damage (20 points)
            this.playerTakeDamage(20);
            
            // Show a more severe message
            this.showMessage(' ');
            
            // Create a flash effect for the fall
            this.showFallEffect();
            
            // Reset position
            this.renderer.camera.position.copy(this.lastValidPosition);
            
            // Reset velocity to prevent continued falling
            this.input.velocity.set(0, 0, 0);
        }
    }
    
    // Add a new method for the fall effect
    showFallEffect() {
        // Create a stronger flash effect than the damage effect
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; // Black flash for falling
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '9';
        overlay.style.opacity = '1';
        overlay.style.transition = 'opacity 1.0s ease'; // Slower fade for dramatic effect
        
        // Add to DOM
        document.getElementById('game-container').appendChild(overlay);
        
        // Play fall sound
        try {
            const fallSound = new Audio('sounds/player_fall.mp3');
            fallSound.volume = 0.5;
            fallSound.play().catch(error => {
                console.log('Audio playback failed:', error);
            });
        } catch (e) {
            console.log('Error playing fall sound', e);
        }
        
        // Fade out and remove
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 1000);
        }, 200);
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
        
        // DUAL WIELDING: Add separate mouse button controls for staff and sword
        document.addEventListener('mousedown', (event) => {
            if (this.weaponSystem) {
                if (event.button === 0) { // Left mouse button for staff
                    this.weaponSystem.staffAttack();
                } else if (event.button === 2) { // Right mouse button for sword
                    this.weaponSystem.swordAttack();
                    
                    // Prevent context menu when right-clicking for sword attack
                    event.preventDefault();
                }
            }
        });
        
        // Prevent context menu to allow right-click for sword attacks
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // DUAL WIELDING: Make both weapons visible since we're dual wielding
        if (this.player.magicStaff) {
            this.player.magicStaff.setVisible(true);
        }
        if (this.player.sword) {
            this.player.sword.setVisible(true);
        }

        // Listen for attack button from touch controls for staff
        document.addEventListener('player-attack', () => {
            if (this.weaponSystem) {
                this.weaponSystem.staffAttack();
            }
        });
        
        // Listen for sword-specific attack from the "sword" button
        document.addEventListener('zoom-out', () => {
            if (this.weaponSystem) {
                this.weaponSystem.swordAttack();
            }
        });
        
        // DUAL WIELDING: Show a message about dual wielding controls at game start
        setTimeout(() => {
            this.showMessage("");
        }, 5000);
        
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
            staffHum: new Audio('sounds/staff_hum.mp3'), // New sound for the magic staff
            enemyAlert: new Audio('sounds/enemy_alert.mp3'), // Sound for when enemies detect player
            staffAttack: new Audio('sounds/staff_attack.mp3'), // Sound for staff attack
            swordSwing: new Audio('sounds/sword_swing.mp3') // Sound for sword attack
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
        
        // Update enemy manager
        if (this.enemyManager) {
            this.enemyManager.update(deltaTime, this.renderer.camera);
        }
        
        // Update weapon system
        if (this.weaponSystem) {
            this.weaponSystem.update(deltaTime);
        }
        
        // Update audio based on movement
        this.updateAudio(deltaTime);
        
        // Update any curse effects
        this.updateCurseEffects(currentTime, deltaTime);
        
        // If we're grounded, remember this as a valid position
        if (this.input.isGrounded && this.fallSafetyEnabled) {
            this.lastValidPosition = this.renderer.camera.position.clone();
        }
        
        // If we're falling too quickly or go below the world bounds, reset
        if (pos.y < -20 || this.input.velocity.y < -30) {
            console.log("Fall detected! Applying damage and resetting position.");
            this.resetToLastValidPosition();
        }
        
        // Gradually heal player over time (very slow)
        if (this.player.health < this.player.maxHealth) {
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 0.5 * deltaTime);
            this.updateHealthDisplay();
        }
        
        // Check for mana orb collisions
        this.checkManaOrbCollisions();
        
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
    
    // New method for handling mana orb collisions
    checkManaOrbCollisions() {
        if (!this.collisionManager) return;
        
        // Get player position
        const playerPos = this.renderer.camera.position;
        
        // Check all colliders
        for (let i = 0; i < this.collisionManager.colliders.length; i++) {
            const collider = this.collisionManager.colliders[i];
            
            // Skip if not a mana orb
            if (!collider || !collider.isManaOrb) continue;
            
            // Calculate distance to player
            const orbPos = collider.object.position;
            const distance = playerPos.distanceTo(orbPos);
            
            // Collect orb if player is close enough
            if (distance < 2.0) { // 2-meter pickup radius
                // Get mana amount
                const manaAmount = collider.manaAmount || 30; // Default to 30 if not specified
                
                // Add mana to player
                this.collectManaOrb(collider.object, manaAmount);
                
                // Remove collider
                this.collisionManager.removeCollider(i);
                
                // We've processed this orb, no need to check others this frame
                break;
            }
        }
    }

    // Fixed version of collectManaOrb method
    collectManaOrb(orbMesh, manaAmount) {
        // Add mana to player's weapon system
        if (this.weaponSystem) {
            // Add mana, capped at max
            this.weaponSystem.manaSystem.current = Math.min(
                this.weaponSystem.manaSystem.max,
                this.weaponSystem.manaSystem.current + manaAmount
            );
            
            // Update display
            this.weaponSystem.updateManaDisplay();
            
            // Show message
            this.showMessage(`+${manaAmount} Mana`);
        }
        
        // Try-catch for possible audio errors
        try {
            // Simple beep sound if mana_collect.mp3 doesn't exist
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
            
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            console.log('Audio system error:', e);
        }
        
        // Safer collection effect without particles
        const flashLight = new THREE.PointLight(0x3366ff, 3, 5);
        flashLight.position.copy(orbMesh.position);
        this.renderer.scene.add(flashLight);
        
        // Simple fade animation for the light
        setTimeout(() => {
            this.renderer.scene.remove(flashLight);
        }, 300);
        
        // Safely remove orb from scene
        this.renderer.scene.remove(orbMesh);
        
        // Safer way to remove from animation system
        if (window.animatedOrbs) {
            const index = window.animatedOrbs.indexOf(orbMesh);
            if (index !== -1) {
                window.animatedOrbs.splice(index, 1);
            }
        }
        
        // Check for King Cylindar orbs (special larger orbs)
        if (orbMesh.userData && orbMesh.userData.isKingOrb) {
            // Display special message for king orb collection
            this.showMessage(`Collected a King's Mana Orb: +${manaAmount} Mana!`);
            
            // Remove from king orb animation system too
            if (window.animatedKingOrbs) {
                const kingIndex = window.animatedKingOrbs.indexOf(orbMesh);
                if (kingIndex !== -1) {
                    window.animatedKingOrbs.splice(kingIndex, 1);
                }
            }
        }
        
        console.log(`Collected mana orb: +${manaAmount} mana`);
    }
    
    // New method for mana collect sound
    playManaCollectSound() {
        try {
            const collectSound = new Audio('sounds/mana_collect.mp3');
            collectSound.volume = 0.3;
            collectSound.play().catch(error => {
                console.log('Audio playback failed:', error);
            });
        } catch (e) {
            console.log('Error playing mana collect sound', e);
        }
    }
    
    // New method for mana collection effect
    showManaCollectEffect(position) {
        // Create particles for collection effect
        const particleCount = 10;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0x3366ff,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            // Random velocity outward
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.05 + Math.random() * 0.1;
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                0.1 + Math.random() * 0.2,
                Math.sin(angle) * speed
            );
            
            this.renderer.scene.add(particle);
            particles.push(particle);
        }
        
        // Create a flash effect
        const flash = new THREE.PointLight(0x3366ff, 3, 5);
        flash.position.copy(position);
        this.renderer.scene.add(flash);
        
        // Animate the particles
        const duration = 0.8; // seconds
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Update particles
            for (const particle of particles) {
                // Move particle
                particle.position.add(particle.velocity);
                
                // Apply gravity
                particle.velocity.y -= 0.01;
                
                // Shrink and fade
                const scale = 1 - progress;
                particle.scale.set(scale, scale, scale);
                
                if (particle.material) {
                    particle.material.opacity = 0.7 * (1 - progress);
                }
            }
            
            // Fade flash
            if (flash) {
                flash.intensity = 3 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                for (const particle of particles) {
                    this.renderer.scene.remove(particle);
                    if (particle.material) particle.material.dispose();
                    if (particle.geometry) particle.geometry.dispose();
                }
                
                this.renderer.scene.remove(flash);
            }
        };
        
        animate();
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
