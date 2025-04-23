// src/main.js - Updated to initialize the new UI system and fix pause/unpause issues
import { setupRenderer, resizeRenderer } from './engine/renderer.js';
import { setupInput, getInput, resetInputState } from './engine/input.js';
import { Game } from './game/game.js';
import { initUI } from './game/ui.js';
import { initPauseMenu } from './game/pauseMenu.js';

// Main game instance
let game;

// Game state tracking
let isGamePaused = false;
let lastInputState = null;

// Initialize the game
function init() {
    console.log('Initializing Labyrinth Legacy...');
    
    // Setup essential engine components
    setupRenderer();
    setupInput();
    
    // Initialize UI with three status bars
    initUI();
    
    // Create and initialize the game
    game = new Game();
    game.init();
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Force-reset input state on blur to prevent stuck keys
    window.addEventListener('blur', function() {
        if (resetInputState) {
            resetInputState();
            console.log("Force reset inputs due to window blur");
        }
        
        if (game && game.player) {
            game.player.velocity.x = 0;
            game.player.velocity.z = 0;
            game.player.velocity.y = 0;
            game.player.isAttacking = false;
            game.player.chargeAttack = false;
            console.log("Force reset player velocity due to window blur");
        }
    });
}

// Main game loop
function gameLoop(timestamp) {
    // Get current input state
    const inputState = getInput();
    
    // Cache the input state for debugging
    lastInputState = {...inputState};
    
    // Update game state
    game.update(timestamp, inputState);
    
    // Check if game paused state changed
    const wasPaused = isGamePaused;
    isGamePaused = (game.state === 'paused' || game.state === 'PAUSED');
    
    // If we just unpaused, ensure a clean input state
    if (wasPaused && !isGamePaused) {
        console.log("Detected unpause - forcing input reset");
        if (resetInputState) {
            resetInputState();
        }
        
        // Also reset player velocity directly
        if (game && game.player) {
            setTimeout(() => {
                game.player.velocity.x = 0;
                game.player.velocity.z = 0;
                game.player.velocity.y = 0;
                game.player.isAttacking = false;
                game.player.chargeAttack = false;
                game.player.isJumping = false;
                game.player.isFalling = false;
                game.player.isDashing = false;
                console.log("Delayed reset of player state after unpause");
            }, 50);
        }
    }
    
    // Render the current frame
    game.render();
    
    // Continue the loop
    requestAnimationFrame(gameLoop);
}

// Handle window resize
function onWindowResize() {
    resizeRenderer();
    game.onResize();
}

// Add an emergency reset function that can be called from the console for debugging
window.emergencyResetControls = function() {
    console.log("Emergency reset triggered manually");
    
    // Reset input system
    if (resetInputState) {
        resetInputState();
    }
    
    // Reset player state
    if (game && game.player) {
        game.player.velocity.x = 0;
        game.player.velocity.z = 0;
        game.player.velocity.y = 0;
        game.player.isAttacking = false;
        game.player.chargeAttack = false;
        game.player.isJumping = false;
        game.player.isFalling = false;
        game.player.isDashing = false;
    }
    
    // Force game to playing state
    if (game) {
        game.state = 'playing';
        game.lastTimestamp = performance.now();
    }
    
    return "Controls reset attempted";
};

// Start the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Expose game to window for debugging purposes
window.game = game;
window.lastInputState = function() { return lastInputState; };
