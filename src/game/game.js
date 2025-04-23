// src/game/game.js - Main game class and loop
import * as THREE from 'three';

import { getRenderer, render, addToScene, removeFromScene } from '../engine/renderer.js';
import { generateDungeon } from '../dungeon/generator.js';
import { Player } from '../entities/player.js';
import { updateUI } from './ui.js';
import { Physics } from '../engine/physics.js';
import { initMinimap, updateMinimap } from './minimap.js'; // Add this import
import { initPauseMenu, togglePauseMenu } from './pauseMenu.js'; // Add pause menu import

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
        
        // Minimap context
        this.minimapContext = null;
        
        // Flag to track previous pause state for fixing the unpausing issue
        this.wasPaused = false;
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
        
        // Initialize pause menu
        initPauseMenu();
        
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
                this.updatePaused(cappedDeltaTime, inputState);
                break;
            case GameState.MENU:
                this.updateMenu(inputState);
                break;
            case GameState.GAME_OVER:
                this.updateGameOver(inputState);
                break;
        }
        
        // Track the last pause state to detect transitions
        this.wasPaused = (this.state === GameState.PAUSED);
    }
    
    // Update game while playing
    updatePlaying(deltaTime, inputState) {
        // Handle pause input
        if (inputState.justPressed.pause) {
            this.togglePause();
            return;
        }
        
        // Update player - pass scene to handle projectiles
        this.player.update(deltaTime, inputState, this.currentDungeon, this.scene);
        
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
    
    // Toggle between paused and playing states
    // Replace the togglePause method in your game.js file with this version

// Toggle between paused and playing states
togglePause() {
    const isPaused = togglePauseMenu();
    
    // Update game state based on pause menu state
    if (isPaused) {
        if (this.player) {
            // Mark the player as paused to store state
            if (typeof this.player.markPaused === 'function') {
                this.player.markPaused();
            }
        }
        
        this.state = GameState.PAUSED;
        console.log("Game paused", this.state);
    } else {
        // We're unpausing - reset everything!
        
        // 1. Reset input through global function
        if (typeof window.resetInputState === 'function') {
            window.resetInputState();
            console.log("Input state reset via global function");
        } else {
            console.warn("Global resetInputState function not found!");
        }
        
        // 2. Notify player they're being unpaused
        if (this.player) {
            if (typeof this.player.markUnpaused === 'function') {
                this.player.markUnpaused();
                console.log("Player marked as unpaused");
            } else {
                // Fallback - reset critical player properties directly
                console.log("Using fallback player reset");
                this.player.velocity.x = 0;
                this.player.velocity.z = 0;
                this.player.isAttacking = false;
                this.player.chargeAttack = false;
            }
        }
        
        // 3. Reset game state
        this.state = GameState.PLAYING;
        console.log("Game resumed", this.state);
        
        // 4. Reset timestamp to prevent huge delta on first frame after unpause
        this.lastTimestamp = performance.now();
        
        // 5. Schedule another reset for next frame as extra insurance
        setTimeout(() => {
            if (this.player && this.state === GameState.PLAYING) {
                this.player.velocity.x = 0;
                this.player.velocity.z = 0;
                console.log("Delayed velocity reset executed");
            }
        }, 50);
    }
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
    
    // Update game while paused
    updatePaused(deltaTime, inputState) {
        // Handle unpause input
        if (inputState.justPressed.pause) {
            this.togglePause();
            return;
        }
        
        // IMPORTANT CHANGE: Keep processing input state updates even while paused
        // This prevents controls from getting "stuck" when unpausing
        
        // We don't update the entire game state, but we DO process input
        // so that when we unpause, the input state is fresh
        
        // Just process small deltaTime to keep things gentle
        const minimalDelta = Math.min(deltaTime, 0.01); 
        
        // Update "just pressed" states from input system
        // but don't apply physics, movement, or other game logic
        
        // The player object isn't updated fully, but we can still
        // reset its controls based on the current inputState
        if (this.player) {
            // Manually sync control states directly from input
            this.player.velocity.x = 0;
            this.player.velocity.z = 0;
            
            // Don't change player position, but keep controls fresh
            if (inputState) {
                // Force controls to match current input state
                if (!inputState.moveForward) this.player.velocity.z = 0;
                if (!inputState.moveBackward) this.player.velocity.z = 0;
                if (!inputState.moveLeft) this.player.velocity.x = 0;
                if (!inputState.moveRight) this.player.velocity.x = 0;
                if (!inputState.attack) this.player.isAttacking = false;
                if (!inputState.chargeAttack) this.player.chargeAttack = false;
                if (!inputState.jump) this.player.isJumping = false;
            }
        }
        
        // While paused, we still render the scene but don't update other game logic
        // This allows the pause menu to be displayed over the mostly frozen game
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
