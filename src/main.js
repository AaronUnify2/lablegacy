// src/main.js - Updated for always-running game with menu overlay and inventory fixes
import { setupRenderer, resizeRenderer } from './engine/renderer.js';
import { setupInput, getInput } from './engine/input.js';
import { Game } from './game/game.js';
import { initUI, showMessage } from './game/ui.js';
import { initMenu } from './game/pauseMenu.js'; // Using initMenu from pauseMenu.js
import { ItemDatabase, ItemType } from './entities/items/inventory.js';

// Main game instance
let game;

// Initialize the game
function init() {
    console.log('Initializing Labyrinth Legacy...');
    
    // Setup essential engine components
    setupRenderer();
    setupInput();
    
    // Initialize UI with three status bars
    initUI();
    
    // Initialize menu system
    initMenu();
    
    // Create and initialize the game
    game = new Game();
    game.init();
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Expose necessary functions globally
    window.showMessage = showMessage;
    window.ItemDatabase = ItemDatabase;
    window.ItemType = ItemType;
    
    // Display welcome message
    showMessage('Welcome to Labyrinth Legacy!', 5000);
    showMessage('Press ESC for menu, WASD to move', 5000);
}

// Main game loop
function gameLoop(timestamp) {
    // Get current input state
    const inputState = getInput();
    
    // Update game state - game always runs now, no pausing
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

// Handle errors by displaying a message
window.addEventListener('error', function(event) {
    console.error('Error caught:', event.error);
    if (window.showMessage) {
        showMessage('An error occurred: ' + event.error.message, 5000);
    }
});

// Helper function to format strings with variables
window.formatString = function(str, vars) {
    return str.replace(/{(\w+)}/g, function(_, key) {
        return vars[key] !== undefined ? vars[key] : '';
    });
};

// Utility function to get a readable name for item types
window.getItemTypeName = function(type) {
    switch(type) {
        case ItemType.HEALTH_POTION:
        case 'healthPotion':
            return 'Health Potion';
        case ItemType.STAMINA_POTION:
        case 'staminaPotion':
            return 'Stamina Potion';
        case ItemType.STAFF_CRYSTAL:
        case 'staffCrystal':
            return 'Staff Crystal';
        case ItemType.KEY:
        case 'key':
            return 'Key';
        case ItemType.SCROLL:
        case 'scroll':
            return 'Scroll';
        default:
            return type;
    }
};
