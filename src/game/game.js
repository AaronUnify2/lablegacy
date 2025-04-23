// src/game/game.js - Main game class and loop with non-pausing menu
import * as THREE from 'three';

import { getRenderer, render, addToScene, removeFromScene } from '../engine/renderer.js';
import { generateDungeon } from '../dungeon/generator.js';
import { Player } from '../entities/player.js';
import { updateUI } from './ui.js';
import { Physics } from '../engine/physics.js';
import { initMinimap, updateMinimap } from './minimap.js'; 
import { togglePauseMenu } from './pauseMenu.js'; // Keeping name for compatibility

// Game states - removed PAUSED state since we don't pause anymore
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
        addToScene(this.player.getObject());
        
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
        
        // Clean up player projectiles
        if (this.player) {
            this.player.cleanupProjectiles(this.scene);
        }
        
        // Clear entities list
        this.entities = [];
        
        // Generate new dungeon
        this.currentDungeon = generateDungeon(floorNumber);
        addToScene(this.currentDungeon.getObject());
        
        // Get player spawn position from dungeon
        const spawnPosition = this.currentDungeon.getPlayerSpawnPosition();
        this.player.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);
        
        // Update UI
        document.getElementById('floor-number').textContent = floorNumber;
        
        // TODO: Spawn enemies
        // TODO: Place items and treasures
        
        console.log(`Floor ${floorNumber} generated`);
    }
    
    // Main update loop - game always runs now regardless of menu state
    update(timestamp, inputState) {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        
        // Cap delta time to prevent huge jumps after tab switch or similar
        const cappedDeltaTime = Math.min(deltaTime, 0.1);
        
        // Handle menu toggling (previously pause)
        if (inputState.justPressed.menu) { // Renamed from justPressed.pause
            this.toggleMenu(); // Renamed from togglePause
        }
        
        // Update player - game always runs now
        this.player.update(cappedDeltaTime, inputState, this.currentDungeon, this.scene);
        
        // Update camera to follow player
        this.updateCamera(cappedDeltaTime);
        
        // Update physics
        this.physics.update(cappedDeltaTime);
        
        // Update all entities
        for (const entity of this.entities) {
            entity.update(cappedDeltaTime, this.player);
        }
        
        // Check for collisions
        this.physics.checkCollisions(this.player, this.entities, this.currentDungeon);
        
        // Check for projectile collisions with enemies
        this.player.checkProjectileCollisions(this.entities);
        
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
        this.isMenuVisible = togglePauseMenu(); // Using existing function for compatibility
        
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
    
    // Update menu state - no longer needed, game always runs
    // updateMenu(inputState) {
    //     // Menu logic removed since menus don't pause the game
    // }
    
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
