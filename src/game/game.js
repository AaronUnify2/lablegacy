// src/game/game.js - Game with first-person camera system (FIXED)
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
        
        // First-person camera properties
        this.cameraRotation = {
            yaw: 0,   // Horizontal rotation (left/right)
            pitch: 0  // Vertical rotation (up/down)
        };
        this.maxPitch = Math.PI / 3; // Limit vertical look (60 degrees up/down)
        
        // Added reference to enemy systems
        this.enemySpawner = enemySpawner;
        this.projectileSystem = projectileSystem;
        
        // Create new dungeon loader for stable generation
        this.dungeonLoader = null;
    }
    
    // Initialize the game
    init() {
        console.log('Initializing game with first-person view...');
        
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
        
        // Add compatibility for enemy system - FIXED VERSION
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
        
        // Show crosshair for first-person view
        this.showCrosshair();
        
        // Generate first dungeon floor with loading screen
        this.generateNewFloor(this.currentFloor);
        
        console.log('Game initialized with first-person controls!');
    }
    
    // Show crosshair for first-person view
    showCrosshair() {
        const crosshair = document.getElementById('crosshair');
        if (crosshair) {
            crosshair.style.display = 'block';
        }
    }
    
    // Generate a new dungeon floor using the DungeonLoader
    generateNewFloor(floorNumber) {
        // Set game state to transitioning
        this.state = GameState.TRANSITIONING;
        
        // Use the dungeon loader to generate the floor
        this.dungeonLoader.generateDungeon(floorNumber);
    }
    
    // FIXED: Add compatibility layer to handle differences between player and enemy systems
    addPlayerCompatibilityLayer() {
        // Fix the isAttacking compatibility - it's a method, not a property
        if (typeof this.player.playerIsAttacking === 'undefined') {
            Object.defineProperty(this.player, 'playerIsAttacking', {
                get: function() {
                    return this.isAttacking(); // FIXED: Call the method with parentheses
                }
            });
        }
        
        // Also add a direct method alias for safety
        if (typeof this.player.getIsAttacking === 'undefined') {
            this.player.getIsAttacking = function() {
                return this.isAttacking();
            };
        }
        
        console.log('Player compatibility layer added successfully');
    }
    
    // Apply patches to the enemy spawner
    patchEnemySpawner() {
        const originalSpawnInRoom = this.enemySpawner.spawnEnemiesInRoom;
        const originalSpawnInCardinalRoom = this.enemySpawner.spawnEnemiesInCardinalRoom;
        
        this.enemySpawner.spawnEnemiesInRoom = function(room, count, availableEnemies, scene) {
            try {
                let roomType = 'corridor';
                if (room.isSpawnRoom) {
                    roomType = 'spawnRoom';
                } else if (room.roomType === 'radial') {
                    roomType = 'radial';
                } else if (room.roomType === 'cardinal') {
                    roomType = 'cardinal';
                } else if (!room.isCorridor) {
                    roomType = 'radial';
                }
                
                const enemyTypes = (availableEnemies && availableEnemies[roomType]) 
                    ? availableEnemies[roomType] 
                    : (availableEnemies && availableEnemies['radial']) 
                        ? availableEnemies['radial']
                        : ['sphere'];
                
                console.log(`Spawning in ${roomType} room, enemy types:`, enemyTypes);
                
                for (let i = 0; i < count; i++) {
                    const margin = 2;
                    const x = room.x + margin + Math.random() * (room.width - margin * 2);
                    const z = room.z + margin + Math.random() * (room.height - margin * 2);
                    const y = room.floorHeight !== undefined ? room.floorHeight + 1 : 1;
                    
                    const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                    
                    try {
                        this.spawnEnemy(enemyType, x, y, z, scene);
                    } catch (error) {
                        console.error(`Error spawning ${enemyType} in room:`, error);
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
        
        this.enemySpawner.spawnEnemiesInCardinalRoom = function(room, count, availableEnemies, scene) {
            try {
                const enemyTypes = (availableEnemies && availableEnemies['cardinal']) 
                    ? availableEnemies['cardinal'] 
                    : (availableEnemies && availableEnemies['radial']) 
                        ? availableEnemies['radial']
                        : ['sphere'];
                
                console.log('Enemy types for cardinal room:', enemyTypes);
                
                const centerX = room.x + room.width / 2;
                const centerZ = room.z + room.height / 2;
                const y = room.floorHeight !== undefined ? room.floorHeight + 1 : 1;
                
                for (let i = 0; i < count; i++) {
                    const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                    
                    let x = centerX;
                    let z = centerZ;
                    
                    if (count > 1) {
                        x += (Math.random() * 2 - 1) * (room.width / 6);
                        z += (Math.random() * 2 - 1) * (room.height / 6);
                    }
                    
                    try {
                        this.spawnEnemy(enemyType, x, y, z, scene);
                    } catch (error) {
                        console.error(`Error spawning ${enemyType} in cardinal room:`, error);
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
        
        const originalPerformSpawning = this.enemySpawner.performSpawning;
        this.enemySpawner.performSpawning = function(dungeon, scene) {
            try {
                if (!dungeon || !scene) {
                    console.error('Dungeon or scene not provided for enemy spawning');
                    return;
                }
                
                console.log('Beginning enemy spawning...');
                
                const rooms = dungeon.getRooms();
                if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
                    console.error('No rooms available in dungeon');
                    return;
                }
                
                const centerRoom = rooms.find(room => room.isSpawnRoom);
                const radialRooms = rooms.filter(room => room.roomType === 'radial');
                const cardinalRooms = rooms.filter(room => room.roomType === 'cardinal');
                const corridors = dungeon.corridors || [];
                
                const availableEnemies = {};
                
                availableEnemies['spawnRoom'] = ['sphere'];
                availableEnemies['radial'] = ['sphere'];
                availableEnemies['cardinal'] = ['sphere'];
                availableEnemies['corridor'] = ['sphere'];
                
                try {
                    for (const roomType of ['spawnRoom', 'radial', 'cardinal', 'corridor']) {
                        const enemiesForRoom = enemyRegistry.getEnemiesForSpawn(this.currentFloor, roomType);
                        
                        if (enemiesForRoom && enemiesForRoom.length > 0) {
                            availableEnemies[roomType] = enemiesForRoom;
                        } else {
                            const floorEnemies = enemyRegistry.getEnemiesForFloor(this.currentFloor);
                            if (floorEnemies && floorEnemies.length > 0) {
                                availableEnemies[roomType] = floorEnemies;
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error getting available enemies:', error);
                }
                
                const baseEnemyCount = 10 + Math.floor(this.currentFloor / 2);
                let remainingEnemies = baseEnemyCount;
                
                const roomsWithEnemies = new Set();
                
                if (cardinalRooms.length > 0) {
                    cardinalRooms.forEach(room => {
                        if (remainingEnemies <= 0 || Math.random() > 0.7) return;
                        
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
                
                if (radialRooms.length > 0) {
                    radialRooms.forEach(room => {
                        if (remainingEnemies <= 0 || Math.random() > 0.6) return;
                        
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
                
                if (centerRoom && remainingEnemies > 0 && Math.random() > 0.7) {
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
    
    // Update method with first-person camera controls
    update(timestamp, inputState) {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        
        // Cap delta time to prevent huge jumps after tab switch or similar
        const cappedDeltaTime = Math.min(deltaTime, 0.1);
        
        // Skip updates if we're in transitioning state
        if (this.state === GameState.TRANSITIONING) {
            return;
        }
        
        // Handle menu toggling
        if (inputState.justPressed.menu) {
            this.toggleMenu();
        }
        
        // Update first-person camera rotation based on mouse input
        this.updateFirstPersonCamera(inputState);
        
        // Update player
        this.player.update(cappedDeltaTime, inputState, this.currentDungeon, this.scene);
        
        // Check for interactions with chests
        if (inputState.justPressed.interact) {
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
        
        // Update camera position to follow player in first-person
        this.updateCameraPosition(cappedDeltaTime);
        
        // Update physics
        this.physics.update(cappedDeltaTime);
        
        // Update all entities
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
        
        // Check for floor progression
        if (this.currentDungeon.isKeyCollected() && this.currentDungeon.isPlayerAtExit(this.player.getPosition())) {
            this.currentFloor++;
            this.generateNewFloor(this.currentFloor);
        }
    }
    
    // Update first-person camera rotation based on mouse input
    updateFirstPersonCamera(inputState) {
        // Only update if we have mouse delta values
        if (inputState.mouse.deltaX !== 0 || inputState.mouse.deltaY !== 0) {
            // Update yaw (horizontal rotation) - unlimited
            this.cameraRotation.yaw -= inputState.mouse.deltaX;
            
            // Update pitch (vertical rotation) - limited
            this.cameraRotation.pitch -= inputState.mouse.deltaY;
            this.cameraRotation.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.cameraRotation.pitch));
            
            // Apply rotation to camera
            this.camera.rotation.order = 'YXZ'; // Ensure proper rotation order
            this.camera.rotation.y = this.cameraRotation.yaw;
            this.camera.rotation.x = this.cameraRotation.pitch;
            
            // Update player rotation to match camera yaw for movement direction
            this.player.rotation = this.cameraRotation.yaw;
            if (this.player.object) {
                this.player.object.rotation.y = this.cameraRotation.yaw;
            }
        }
    }
    
    // Update camera position to stay at player's eye level
    updateCameraPosition(deltaTime) {
        if (this.state === GameState.TRANSITIONING) return;
        
        const playerPosition = this.player.getPosition();
        
        // Position camera at player's eye level (first-person view)
        const eyeHeight = 1.7; // Eye height above player's feet
        
        this.camera.position.set(
            playerPosition.x,
            playerPosition.y + eyeHeight,
            playerPosition.z
        );
        
        // The camera rotation is handled in updateFirstPersonCamera()
        // So we don't need to call lookAt() here
    }
    
    // Toggle menu overlay without pausing the game
    toggleMenu() {
        this.isMenuVisible = toggleMenu();
        console.log(this.isMenuVisible ? "Menu opened" : "Menu closed");
        return this.isMenuVisible;
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
