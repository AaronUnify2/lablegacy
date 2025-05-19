// src/game/game.js - Refactored with DungeonLoader for stable generation
import * as THREE from 'three';

import { getRenderer, render, addToScene, removeFromScene } from '../engine/renderer.js';
import { Player } from '../entities/player.js';
import { updateUI } from './ui.js';
import { Physics } from '../engine/physics.js';
import { initMinimap, updateMinimap } from './minimap.js'; 
import { toggleMenu } from './pauseMenu.js';
import { loadingScreen } from './loadingScreen.js';

// Added enemy-related imports
import { enemyRegistry } from '../entities/enemies/enemyRegistry.js';
import { enemySpawner } from '../entities/enemies/enemySpawner.js';
import { projectileSystem } from '../entities/enemies/projectileSystem.js';

// Import DungeonLoader
import { DungeonLoader } from '../dungeon/dungeonLoader.js';

// Game states
export const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    TRANSITIONING: 'transitioning',
    GAME_OVER: 'gameOver'
};

// Main Game class
export class Game {
    constructor() {
        // Game state
        this.state = GameState.LOADING;
        this.currentFloor = 1;
        this.lastTimestamp = 0;
        
        // Make GameState available to other components
        this.GameState = GameState;
        
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
        
        // Create new dungeon loader for stable generation
        this.dungeonLoader = null;
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
        
        // Initialize dungeon loader
        this.dungeonLoader = new DungeonLoader(this);
        
        // Generate first dungeon floor with loading screen
        this.generateNewFloor(this.currentFloor);
        
        console.log('Game initialized!');
    }
    
    // Generate a new dungeon floor using the DungeonLoader
    generateNewFloor(floorNumber) {
        // Set game state to transitioning
        this.state = GameState.TRANSITIONING;
        
        // Use the dungeon loader to generate the floor
        this.dungeonLoader.generateDungeon(floorNumber);
        
        // Return immediately - the dungeon loader will handle the loading screen
        // and state transitions asynchronously
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
                        const count = Math.min(remainingEnemies, 1 + Math.floor(Math.random() * (this.maxEnemiesPerRoom || 3)));
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
    
    
    // Update method
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
        // In src/game/game.js - Update the game update method

// Update method with improved projectile collision handling
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
        // FIXED: Pass the scene to checkProjectileCollisions for hit effects
        this.player.checkProjectileCollisions(this.entities, this.scene);
    } catch (error) {
        console.error('Error handling entities:', error);
    }
    
    // Update UI
    updateUI(this.player, this.currentFloor);
    
    // Update minimap
    if (this.minimapContext) {
        updateMinimap(this.minimapContext, this.currentDungeon, this.player);
    }
    
    // Check for floor progression
    if (this.currentDungeon.isKeyCollected() && this.currentDungeon.isPlayerAtExit(this.player.getPosition())) {
        // Increment floor number
        this.currentFloor++;
        
        // Generate new floor using the stable DungeonLoader
        this.generateNewFloor(this.currentFloor);
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
