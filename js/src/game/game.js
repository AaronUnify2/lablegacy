// src/game/game.js - Main game class and loop

import { getRenderer, render, addToScene, removeFromScene } from '../engine/renderer.js';
import { generateDungeon } from '../dungeon/generator.js';
import { Player } from '../entities/player.js';
import { updateUI } from './ui.js';
import { Physics } from '../engine/physics.js';

// Game states
const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
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
    
    // Main update loop
    update(timestamp, inputState) {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        
        // Cap delta time to prevent huge jumps after tab switch or similar
        const cappedDeltaTime = Math.min(deltaTime, 0.1);
        
        // Update based on current game state
        switch (this.state) {
            case GameState.PLAYING:
                this.updatePlaying(cappedDeltaTime, inputState);
                break;
            case GameState.PAUSED:
                this.updatePaused(inputState);
                break;
            case GameState.MENU:
                this.updateMenu(inputState);
                break;
            case GameState.GAME_OVER:
                this.updateGameOver(inputState);
                break;
        }
    }
    
    // Update game while playing
    updatePlaying(deltaTime, inputState) {
        // Handle pause input
        if (inputState.justPressed.pause) {
            this.state = GameState.PAUSED;
            return;
        }
        
        // Update player
        this.player.update(deltaTime, inputState, this.currentDungeon);
        
        // Update camera to follow player
        this.updateCamera(deltaTime);
        
        // Update physics
        this.physics.update(deltaTime);
        
        // Update all entities
        for (const entity of this.entities) {
            entity.update(deltaTime, this.player);
        }
        
        // Check for collisions
        this.physics.checkCollisions(this.player, this.entities, this.currentDungeon);
        
        // Update UI
        updateUI(this.player, this.currentFloor);
        
        // Check for floor progression
        if (this.currentDungeon.isKeyCollected() && this.currentDungeon.isPlayerAtExit(this.player.getPosition())) {
            this.currentFloor++;
            this.generateNewFloor(this.currentFloor);
        }
    }
    
    // Update camera position to follow player
    updateCamera(deltaTime) {
        const playerPosition = this.player.getPosition();
        
        // Calculate target camera position
        const targetPosition = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + 8, // Camera height above player
            playerPosition.z + 10 // Camera distance behind player
        );
        
        // Smoothly move camera to target position
        this.camera.position.lerp(targetPosition, 5 * deltaTime);
        
        // Look at player
        this.camera.lookAt(playerPosition);
    }
    
    // Update game while paused
    updatePaused(inputState) {
        // Handle unpause input
        if (inputState.justPressed.pause) {
            this.state = GameState.PLAYING;
        }
    }
    
    // Update menu state
    updateMenu(inputState) {
        // Menu logic will go here
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
