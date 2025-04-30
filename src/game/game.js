// src/game/game.js - Main game class with fixed enemy-player interaction
import * as THREE from 'three';

import { getRenderer, render, addToScene, removeFromScene } from '../engine/renderer.js';
import { generateDungeon } from '../dungeon/generator.js';
import { Player } from '../entities/player.js';
import { updateUI } from './ui.js';
import { Physics } from '../engine/physics.js';
import { initMinimap, updateMinimap } from './minimap.js'; 
import { toggleMenu } from './pauseMenu.js';

// Enemy-related imports
import { enemyRegistry } from '../entities/enemies/enemyRegistry.js';
import { enemySpawner } from '../entities/enemies/enemySpawner.js';
import { projectileSystem } from '../entities/enemies/projectileSystem.js';

// Game states
const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
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
    }
    
    // Initialize the game
    init() {
        console.log('Initializing game...');
        
        // Get references to Three.js objects
        const { scene, camera, renderer } = getRenderer();
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // Initialize physics
        this.physics = new Physics();
        
        // Initialize minimap
        this.minimapContext = initMinimap();
        
        // Create player
        this.player = new Player();
        this.player.init();
        
        // Add missing player function that enemies are trying to use
        // This is our fix for the "PlayerIsAttacking" error
        if (!this.player.isAttacking) {
            this.player.isAttacking = function() {
                // Return false by default or check actual attack state if available
                return this.attackTimer > 0 || false;
            };
        }
        
        addToScene(this.player.getObject());
        
        // Initialize projectile system for enemies
        this.projectileSystem.init(this.scene);
        
        // Make game instance globally available for enemy systems
        window.game = this;
        
        // Generate first dungeon floor
        this.generateNewFloor(this.currentFloor);
        
        // Set initial camera position
        camera.position.copy(this.player.getPosition());
        camera.position.y += 8; // Position camera above player
        camera.position.z += 10; // Position camera behind player
        camera.lookAt(this.player.getPosition());
        
        // Set game state to playing
        this.state = GameState.PLAYING;
        
        console.log('Game initialized!');
    }

    // Generate a new dungeon floor
    generateNewFloor(floorNumber) {
        console.log(`Generating floor ${floorNumber}...`);
        
        // Remove old dungeon if it exists
        if (this.currentDungeon) {
            this.currentDungeon.dispose();
            removeFromScene(this.currentDungeon.getObject());
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
        
        // Generate new dungeon
        this.currentDungeon = generateDungeon(floorNumber);
        addToScene(this.currentDungeon.getObject());
        
        // Get player spawn position from dungeon
        const spawnPosition = this.currentDungeon.getPlayerSpawnPosition();
        this.player.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);
        
        // Initialize enemy spawner with current floor
        this.enemySpawner.init(floorNumber);
        
        // Add a wrapper with error handling for the enemy spawning
        try {
            // First just try to spawn sphere enemies initially
            this.spawnOnlySpheres();
            
            /* Once spheres work, we can try the full spawner:
            this.enemySpawner.spawnEnemiesInDungeon(this.currentDungeon, this.scene);
            */
        } catch (error) {
            console.error('Error during enemy spawning:', error);
        }
        
        // Update UI
        document.getElementById('floor-number').textContent = floorNumber;
        
        // Show floor transition message
        window.showMessage?.(`Entered Floor ${floorNumber}`, 3000);
        
        console.log(`Floor ${floorNumber} generated`);
    }
    
    // Custom function to spawn only sphere enemies for safety
    spawnOnlySpheres() {
        // Get all rooms except the spawn room
        const rooms = this.currentDungeon.getRooms();
        if (!rooms || rooms.length === 0) return;
        
        // Find non-spawn rooms
        const nonSpawnRooms = rooms.filter(room => !room.isSpawnRoom);
        if (nonSpawnRooms.length === 0) return;
        
        // Spawn 2 spheres in random rooms
        for (let i = 0; i < Math.min(2, nonSpawnRooms.length); i++) {
            const room = nonSpawnRooms[i];
            
            // Calculate spawn position in room
            const x = room.x + room.width / 2;
            const y = room.floorHeight + 1;
            const z = room.z + room.height / 2;
            
            // Create and spawn a sphere enemy
            try {
                const sphereEnemy = enemyRegistry.createEnemy('sphere', x, y, z);
                if (sphereEnemy) {
                    // Apply AI to enemy
                    const { applyAIController } = require('../entities/enemies/enemyAI.js');
                    applyAIController(sphereEnemy);
                    
                    // Add to scene
                    this.scene.add(sphereEnemy.getObject());
                    
                    // Add to enemies list
                    this.enemySpawner.enemies.push(sphereEnemy);
                }
            } catch (error) {
                console.error('Error spawning sphere:', error);
            }
        }
    }
    
    // Update method
    update(timestamp, inputState) {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        
        // Cap delta time to prevent huge jumps after tab switch or similar
        const cappedDeltaTime = Math.min(deltaTime, 0.1);
        
        // Handle menu toggling
        if (inputState.justPressed.menu) {
            this.toggleMenu();
        }
        
        // Update player - game always runs now
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
        
        // Update enemy projectiles with error handling
        try {
            this.projectileSystem.update(cappedDeltaTime, this.player);
        } catch (error) {
            console.error('Error updating projectiles:', error);
        }
        
        // Update camera to follow player
        this.updateCamera(cappedDeltaTime);
        
        // Update physics
        this.physics.update(cappedDeltaTime);
        
        // Update all entities with error handling
        try {
            this.entities = [...this.enemySpawner.getEnemies()];
            for (const entity of this.entities) {
                if (entity && typeof entity.update === 'function') {
                    try {
                        entity.update(cappedDeltaTime, this.player, this.currentDungeon);
                    } catch (error) {
                        console.error('Error updating entity:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error handling entities:', error);
        }
        
        // Check for collisions with error handling
        try {
            this.physics.checkCollisions(this.player, this.entities, this.currentDungeon);
        } catch (error) {
            console.error('Error checking collisions:', error);
        }
        
        // Check for projectile collisions with enemies
        try {
            this.player.checkProjectileCollisions(this.entities);
        } catch (error) {
            console.error('Error checking projectile collisions:', error);
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
