// src/main.js - Entry point for Labyrinth Legacy

import { setupRenderer, resizeRenderer } from './engine/renderer.js';
import { setupInput, getInput } from './engine/input.js';
import { Game } from './game/game.js';

// Main game instance
let game;

// Initialize the game
function init() {
    console.log('Initializing Labyrinth Legacy...');
    
    // Setup essential engine components
    setupRenderer();
    setupInput();
    
    // Create and initialize the game
    game = new Game();
    game.init();
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

// Main game loop
function gameLoop(timestamp) {
    // Get current input state
    const inputState = getInput();
    
    // Update game state
    game.update(timestamp, inputState);
    
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

// Start the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Expose game to window for debugging purposes
window.game = game;
