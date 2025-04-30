// src/game/game.js - Modified with loading screen transitions
import * as THREE from 'three';

import { getRenderer, render, addToScene, removeFromScene } from '../engine/renderer.js';
import { generateDungeon } from '../dungeon/generator.js';
import { Player } from '../entities/player.js';
import { updateUI } from './ui.js';
import { Physics } from '../engine/physics.js';
import { initMinimap, updateMinimap } from './minimap.js'; 
import { toggleMenu } from './pauseMenu.js';
import { loadingScreen } from './loadingScreen.js'; // Import loading screen

// Added enemy-related imports
import { enemyRegistry } from '../entities/enemies/enemyRegistry.js';
import { enemySpawner } from '../entities/enemies/enemySpawner.js';
import { projectileSystem } from '../entities/enemies/projectileSystem.js';

// Game states
const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    TRANSITIONING: 'transitioning', // New state for floor transitions
    GAME_OVER: 'gameOver'
};

// Main Game class
export class Game {
    constructor() {
        // Game state
        this.state = GameState.LOADING;
        this.currentFloor = 1;
        this.lastTimestamp = 0;
        
        // Game objects
        this.player = null;
        this.currentDungeon = null;
        this.entities = [];
        
        // Physics system
        this.physics = null;
        
        // References to Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Minimap context
        this.minimapContext = null;
        
        // Menu visibility tracking
        this.isMenuVisible = false;
        
        // Added reference to enemy systems
        this.enemySpawner = enemySpawner;
        this.projectileSystem = projectileSystem;
        
        // Floor transition timers and flags
        this.transitionDelay = {
            dungeonBuild: 1000,    // Time to build dungeon mesh
            chestSpawn: 1500,      // Time to wait before spawning chests
            enemySpawn: 3000       // Time to wait before spawning enemies
        };
    }
    
    // Initialize the game
    init() {
        console.log('Initializing game...');
        
        // Initialize loading screen
        loadingScreen.init();
        
        // Show loading screen for initial load
        loadingScreen.show('Initializing Game...');
        loadingScreen.updateProgress(10);
        
        // Get references to Three.js objects
        const { scene, camera, renderer } = getRenderer();
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        loadingScreen.updateProgress(30);
        
        // Initialize physics
        this.physics = new Physics();
        
        // Initialize minimap
        this.minimapContext = initMinimap();
        
        loadingScreen.updateProgress(50);
        
        // Create player
        this.player = new Player();
        this.player.init();
        
        // Add compatibility for enemy system
        this.addPlayerCompatibilityLayer();
        
        addToScene(this.player.getObject());
        
        loadingScreen.updateProgress(70);
        
        // Initialize projectile system for enemies
        this.projectileSystem.init(this.scene);
        
        // Make game instance globally available for enemy systems
        window.game = this;
        
        // Apply enemy spawner patches
        this.patchEnemySpawner();
        
        loadingScreen.updateProgress(80);
        
        // Generate first dungeon floor with loading screen
        this.generateNewFloorWithLoading(this.currentFloor);
        
        // Loading screen will complete after dungeon is generated
        
        console.log('Game initialized!');
    }
    
    // Add compatibility layer to handle differences between player and enemy systems
    addPlayerCompatibilityLayer() {
        // Add properties the enemy system expects to find
        if (typeof this.player.playerIsAttacking === 'undefined') {
            Object.defineProperty(this.player, 'playerIsAttacking', {
                get: function() {
                    return this.isAttacking; // Return the property that player.js does have
                }
            });
        }
    }
    
    // Apply patches to the enemy spawner
    patchEnemySpawner() {
        // Override the spawning methods to include safety checks
        
        // First, save the original methods
        const originalSpawnInRoom = this.enemySpawner.spawnEnemiesInRoom;
        const originalSpawnInCardinalRoom = this.enemySpawner.spawnEnemiesInCardinalRoom;
        
        // Override spawnEnemiesInRoom with a safer version
        this.enemySpawner.spawnEnemiesInRoom = function(room, count, availableEnemies, scene) {
            try {
                // Determine the room type for enemy selection
                let roomType = 'corridor';
                if (room.isSpawnRoom) {
                    roomType = 'spawnRoom';
                } else if (room.roomType === 'radial') {
                    roomType = 'radial';
                } else if (room.roomType === 'cardinal') {
                    roomType = 'cardinal';
                } else if (!room.isCorridor) {
                    roomType = 'radial'; // Default for other room types
                }
                
                // Get the appropriate enemy types for this room
                // FIXED: Check if availableEnemies exists and has the room type
                const enemyTypes = (availableEnemies && availableEnemies[roomType]) 
                    ? availableEnemies[roomType] 
                    : (availableEnemies && availableEnemies['radial']) 
                        ? availableEnemies['radial']
                        : ['sphere']; // Default to sphere if no enemies available
                
                console.log(`Spawning in ${roomType} room, enemy types:`, enemyTypes);
                
                for (let i = 0; i < count; i++) {
                    // Get random position in room (with margin from walls)
                    const margin = 2;
                    const x = room.x + margin + Math.random() * (room.width - margin * 2);
                    const z = room.z + margin + Math.random() * (room.height - margin * 2);
                    const y = room.floorHeight !== undefined ? room.floorHeight + 1 : 1;
                    
                    // Pick random enemy type
                    const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                    
                    // Create and spawn enemy
                    try {
                        this.spawnEnemy(enemyType, x, y, z, scene);
                    } catch (error) {
                        console.error(`Error spawning ${enemyType} in room:`, error);
                        // Try spawning a sphere as fallback
                        if (enemyType !== 'sphere') {
                            try {
                                console.log('Trying fallback sphere enemy');
                                this.spawnEnemy('sphere', x, y, z, scene);
                            } catch (fallbackError) {
                                console.error('Even fallback sphere failed:', fallbackError);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error in spawnEnemiesInRoom:", error);
            }
        };
        
        // Override spawnEnemiesInCardinalRoom with a safer version
        this.enemySpawner.spawnEnemiesInCardinalRoom = function(room, count, availableEnemies, scene) {
            try {
                // Get the appropriate enemy types for cardinal rooms
                // FIXED: Check if availableEnemies exists and has the room type
                const enemyTypes = (availableEnemies && availableEnemies['cardinal']) 
                    ? availableEnemies['cardinal'] 
                    : (availableEnemies && availableEnemies['radial']) 
                        ? availableEnemies['radial']
                        : ['sphere']; // Default to sphere if no enemies available
                
                console.log('Enemy types for cardinal room:', enemyTypes);
                
                // Get center position
                const centerX = room.x + room.width / 2;
                const centerZ = room.z + room.height / 2;
                const y = room.floorHeight !== undefined ? room.floorHeight + 1 : 1;
                
                for (let i = 0; i < count; i++) {
                    // Pick random enemy type
                    const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                    
                    // For multiple enemies, add slight offset from center
                    let x = centerX;
                    let z = centerZ;
                    
                    if (count > 1) {
                        // Small random offset if more than one enemy
                        x += (Math.random() * 2 - 1) * (room.width / 6);
                        z += (Math.random() * 2 - 1) * (room.height / 6);
                    }
                    
                    // Create and spawn enemy
                    try {
                        this.spawnEnemy(enemyType, x, y, z, scene);
                    } catch (error) {
                        console.error(`Error spawning ${enemyType} in cardinal room:`, error);
                        // Try spawning a sphere as fallback
                        if (enemyType !== 'sphere') {
                            try {
                                console.log('Trying fallback sphere enemy');
                                this.spawnEnemy('sphere', x, y, z, scene);
                            } catch (fallbackError) {
                                console.error('Even fallback sphere failed:', fallbackError);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error in spawnEnemiesInCardinalRoom:", error);
            }
        };
        
        // Also patch the performSpawning method
        const originalPerformSpawning = this.enemySpawner.performSpawning;
        this.enemySpawner.performSpawning = function(dungeon, scene) {
            try {
                if (!dungeon || !scene) {
                    console.error('Dungeon or scene not provided for enemy spawning');
                    return;
                }
                
                console.log('Beginning enemy spawning...');
                
                // Get all rooms
                const rooms = dungeon.getRooms();
                if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
                    console.error('No rooms available in dungeon');
                    return;
                }
                
                // Separate rooms by type
                const centerRoom = rooms.find(room => room.isSpawnRoom);
                const radialRooms = rooms.filter(room => room.roomType === 'radial');
                const cardinalRooms = rooms.filter(room => room.roomType === 'cardinal');
                const corridors = dungeon.corridors || [];
                
                // Track which enemy types can spawn in which room types
                const availableEnemies = {};
                
                // Ensure we have defaults for all room types
                availableEnemies['spawnRoom'] = ['sphere'];
                availableEnemies['radial'] = ['sphere'];
                availableEnemies['cardinal'] = ['sphere'];
                availableEnemies['corridor'] = ['sphere'];
                
                try {
                    // Try to get specific enemies for each room type
                    for (const roomType of ['spawnRoom', 'radial', 'cardinal', 'corridor']) {
                        const enemiesForRoom = enemyRegistry.getEnemiesForSpawn(this.currentFloor, roomType);
                        
                        if (enemiesForRoom && enemiesForRoom.length > 0) {
                            availableEnemies[roomType] = enemiesForRoom;
                        } else {
                            // Try to get general floor enemies
                            const floorEnemies = enemyRegistry.getEnemiesForFloor(this.currentFloor);
                            if (floorEnemies && floorEnemies.length > 0) {
                                availableEnemies[roomType] = floorEnemies;
                            }
                            // Otherwise, keep the defaults set above
                        }
                    }
                } catch (error) {
                    console.error('Error getting available enemies:', error);
                    // We'll use our defaults from above
                }
                
                // Determine number of enemies based on floor
                const baseEnemyCount = 10 + Math.floor(this.currentFloor / 2);
                let remainingEnemies = baseEnemyCount;
                
                // Track which rooms already have enemies
                const roomsWithEnemies = new Set();
                
                // The rest of the spawning logic - using the safer overridden methods
                // ... (original code for spawning in different room types)
                
                // 1. Spawn in cardinal rooms first (center position)
                if (cardinalRooms.length > 0) {
                    cardinalRooms.forEach(room => {
                        if (remainingEnemies <= 0 || Math.random() > 0.7) return; // 70% chance to spawn
                        
                        // Spawn 1-2 enemies in center of cardinal rooms
                        const count = Math.min(remainingEnemies, 1 + Math.floor(Math.random() * 2));
                        try {
                            this.spawnEnemiesInCardinalRoom(room, count, availableEnemies, scene);
                            remainingEnemies -= count;
                            roomsWithEnemies.add(room);
                        } catch (error) {
                            console.error('Error spawning in cardinal room:', error);
                        }
                    });
                }
                
                // 2. Spawn in radial rooms (random position)
                if (radialRooms.length > 0) {
                    radialRooms.forEach(room => {
                        if (remainingEnemies <= 0 || Math.random() > 0.6) return; // 60% chance to spawn
                        
                        // Spawn 1-3 enemies in radial rooms
                        const count = Math.min(remainingEnemies, 1 + Math.floor(Math.random() * this.maxEnemiesPerRoom));
                        try {
                            this.spawnEnemiesInRoom(room, count, availableEnemies, scene);
                            remainingEnemies -= count;
                            roomsWithEnemies.add(room);
                        } catch (error) {
                            console.error('Error spawning in radial room:', error);
                        }
                    });
                }
                
                // 3. Maybe spawn in center room last (they'll be immediately active)
                if (centerRoom && remainingEnemies > 0 && Math.random() > 0.7) { // 30% chance to spawn in center
                    // Spawn 1-2 enemies in center room
                    const count = Math.min(remainingEnemies, 1 + Math.floor(Math.random() * 2));
                    try {
                        this.spawnEnemiesInRoom(centerRoom, count, availableEnemies, scene);
                        remainingEnemies -= count;
                        roomsWithEnemies.add(centerRoom);
                    } catch (error) {
                        console.error('Error spawning in center room:', error);
                    }
                }
                
                console.log(`Spawned ${baseEnemyCount - remainingEnemies} enemies on floor ${this.currentFloor}`);
            } catch (error) {
                console.error('Error in performSpawning:', error);
            }
        };
    }

    // Generate a new dungeon floor with loading screen
    generateNewFloorWithLoading(floorNumber) {
        // Set game state to transitioning
        this.state = GameState.TRANSITIONING;
        
        // Show loading screen
        loadingScreen.show(`Preparing Floor ${floorNumber}...`);
        loadingScreen.updateProgress(10);
        
        // Function to continue after loading screen is ready
        const continueGeneration = () => {
            console.log(`Generating floor ${floorNumber} with loading...`);
            
            // Remove old dungeon if it exists
            if (this.currentDungeon) {
                this.currentDungeon.dispose();
                removeFromScene(this.currentDungeon.getObject());
                loadingScreen.updateProgress(20);
            } else {
                loadingScreen.updateProgress(20);
            }
            
            // Clean up projectiles
            this.projectileSystem.clear();
            
            // Clean up player projectiles
            if (this.player) {
                this.player.cleanupProjectiles(this.scene);
            }
            
            // Clear enemies
            this.enemySpawner.clearEnemies(this.scene);
            
            // Clear entities list
            this.entities = [];
            
            loadingScreen.updateProgress(40);
            loadingScreen.setMessage(`Generating Floor ${floorNumber}...`);
            
            // Generate new dungeon
            this.currentDungeon = generateDungeon(floorNumber);
            addToScene(this.currentDungeon.getObject());
            
            loadingScreen.updateProgress(60);
            
            // Get player spawn position from dungeon
            const spawnPosition = this.currentDungeon.getPlayerSpawnPosition();
            this.player.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);
            
            // Initialize enemy spawner with current floor
            this.enemySpawner.init(floorNumber);
            
            loadingScreen.updateProgress(70);
            loadingScreen.setMessage(`Building Floor ${floorNumber}...`);
            
            // Update UI
            document.getElementById('floor-number').textContent = floorNumber;
            
            // Update camera to focus on player's new position
            this.camera.position.copy(this.player.getPosition());
            this.camera.position.y += 8;
            this.camera.position.z += 10;
            this.camera.lookAt(this.player.getPosition());
            
            // Sequence the spawning of items using setTimeout for proper sequencing
            setTimeout(() => {
                loadingScreen.updateProgress(80);
                loadingScreen.setMessage(`Adding Treasure to Floor ${floorNumber}...`);
                
                // Try to add chests with delayed spawning
                try {
                    // Use our standalone chest spawner from chestSpawner.js
                    // It already has a built-in delay mechanism
                    if (window.spawnChestsInDungeon) {
                        window.spawnChestsInDungeon(this.currentDungeon);
                    } else {
                        // Fallback to the imported function if global isn't available
                        const { spawnChestsInDungeon } = require('../entities/items/chestSpawner.js');
                        spawnChestsInDungeon(this.currentDungeon);
                    }
                } catch (error) {
                    console.error('Error spawning chests:', error);
                }
                
                // Spawn enemies after another delay
                setTimeout(() => {
                    loadingScreen.updateProgress(90);
                    loadingScreen.setMessage(`Spawning Enemies on Floor ${floorNumber}...`);
                    
                    try {
                        // Spawn enemies with a delay
                        this.enemySpawner.spawnEnemiesInDungeon(this.currentDungeon, this.scene);
                    } catch (error) {
                        console.error('Error spawning enemies:', error);
                    }
                    
                    // Complete loading
                    setTimeout(() => {
                        loadingScreen.updateProgress(100);
                        
                        // Add callback to reset game state after loading screen is hidden
                        loadingScreen.addCallback(() => {
                            // Show floor transition message
                            window.showMessage?.(`Entered Floor ${floorNumber}`, 3000);
                            
                            // Set game state back to playing
                            this.state = GameState.PLAYING;
                            console.log(`Floor ${floorNumber} fully loaded and ready`);
                        });
                    }, 500);
                }, this.transitionDelay.enemySpawn - this.transitionDelay.chestSpawn);
            }, this.transitionDelay.chestSpawn);
        };
        
        // Start the generation process after a short delay
        setTimeout(continueGeneration, 200);
    }
    
    // Update method - modified to handle transitioning state
    update(timestamp, inputState) {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        
        // Cap delta time to prevent huge jumps after tab switch or similar
        const cappedDeltaTime = Math.min(deltaTime, 0.1);
        
        // Skip updates if we're in transitioning state
        if (this.state === GameState.TRANSITIONING) {
            // Only render the scene, don't update gameplay
            return;
        }
        
        // Handle menu toggling
        if (inputState.justPressed.menu) {
            this.toggleMenu();
        }
        
        // Update player - game always runs now
        this.player.update(cappedDeltaTime, inputState, this.currentDungeon, this.scene);
        
        // Check for interactions with chests
        if (inputState.justPressed.interact) {
            // Find a chest to interact with
            const interactableChest = this.currentDungeon.findInteractableChest(this.player.getPosition());
            if (interactableChest) {
                this.player.interactWithChest(interactableChest);
            }
        }
        
        // Update dungeon (includes chest animations)
        if (this.currentDungeon) {
            this.currentDungeon.update(cappedDeltaTime);
        }
        
        // Update enemies with error handling
        try {
            this.enemySpawner.update(cappedDeltaTime, this.player, this.currentDungeon);
        } catch (error) {
            console.error('Error updating enemies:', error);
        }
        
        // Update enemy projectiles
        try {
            this.projectileSystem.update(cappedDeltaTime, this.player);
        } catch (error) {
            console.error('Error updating projectiles:', error);
        }
        
        // Update camera to follow player
        this.updateCamera(cappedDeltaTime);
        
        // Update physics
        this.physics.update(cappedDeltaTime);
        
        // Update all entities (merged with enemySpawner.enemies)
        try {
            this.entities = [...this.enemySpawner.getEnemies()];
            for (const entity of this.entities) {
                if (entity && typeof entity.update === 'function') {
                    entity.update(cappedDeltaTime, this.player, this.currentDungeon);
                }
            }
        
            // Check for collisions
            this.physics.checkCollisions(this.player, this.entities, this.currentDungeon);
        
            // Check for projectile collisions with enemies
            this.player.checkProjectileCollisions(this.entities);
        } catch (error) {
            console.error('Error handling entities:', error);
        }
        
        // Update UI
        updateUI(this.player, this.currentFloor);
        
        // Update minimap
        if (this.minimapContext) {
            updateMinimap(this.minimapContext, this.currentDungeon, this.player);
        }
        
        // Check for floor progression - updated to use loading screen
        if (this.currentDungeon.isKeyCollected() && this.currentDungeon.isPlayerAtExit(this.player.getPosition())) {
            // Increment floor number
            this.currentFloor++;
            
            // Generate new floor with loading screen
            this.generateNewFloorWithLoading(this.currentFloor);
        }
    }
    
    // Toggle menu overlay without pausing the game
    toggleMenu() {
        this.isMenuVisible = toggleMenu();
        
        // The game continues to run - we just show/hide the menu
        console.log(this.isMenuVisible ? "Menu opened" : "Menu closed");
        
        // Return visibility state in case other code needs to know
        return this.isMenuVisible;
    }
    
    // Update camera position to follow player
    updateCamera(deltaTime) {
        // Skip camera updates during transitions
        if (this.state === GameState.TRANSITIONING) return;
        
        const playerPosition = this.player.getPosition();
        const isPlayerInAir = this.player.isInAir();
        
        // Calculate target camera position
        // Adjust camera height based on whether player is jumping
        const cameraHeight = isPlayerInAir ? 
            playerPosition.y + 9 : // Higher camera when jumping
            playerPosition.y + 8;  // Normal camera height
        
        const targetPosition = new THREE.Vector3(
            playerPosition.x,
            cameraHeight,
            playerPosition.z + 10 // Camera distance behind player
        );
        
        // Smoothly move camera to target position
        // Use faster lerp when player is jumping for more responsive camera
        const lerpFactor = isPlayerInAir ? 8 * deltaTime : 5 * deltaTime;
        this.camera.position.lerp(targetPosition, lerpFactor);
        
        // Look at player
        this.camera.lookAt(playerPosition);
    }
    
    // Update game over state
    updateGameOver(inputState) {
        // Game over logic will go here
    }
    
    // Render the current frame
    render() {
        render();
    }
    
    // Handle window resize
    onResize() {
        // Any additional resize handling can go here
    }
}
