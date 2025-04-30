// src/main.js - Updated with loading screen integration
import { setupRenderer, resizeRenderer } from './engine/renderer.js';
import { setupInput, getInput } from './engine/input.js';
import { Game } from './game/game.js';
import { initUI, showMessage } from './game/ui.js';
import { initMenu } from './game/pauseMenu.js';
import { loadingScreen } from './game/loadingScreen.js'; // Import loading screen
import { ItemDatabase, ItemType } from './entities/items/inventory.js';

// Main game instance
let game;

// Initialize the game
function init() {
    console.log('Initializing Labyrinth Legacy...');
    
    // Initialize loading screen first
    loadingScreen.init();
    loadingScreen.show('Initializing Game...');
    loadingScreen.updateProgress(10);
    
    // Setup essential engine components
    setupRenderer();
    setupInput();
    
    loadingScreen.updateProgress(30);
    
    // Initialize UI with three status bars
    initUI();
    
    // Initialize menu system
    initMenu();
    
    loadingScreen.updateProgress(50);
    
    // Create and initialize the game
    game = new Game();
    
    // Start initialization - the game will handle its own loading screen updates
    game.init();
    
    // Setup global references
    window.game = game;
    
    // Expose necessary functions globally
    window.showMessage = showMessage;
    window.ItemDatabase = ItemDatabase;
    window.ItemType = ItemType;
    
    // Start the game loop - this will run even while the loading screen is showing
    requestAnimationFrame(gameLoop);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Loading screen will finish in game.init()
}

// Main game loop
function gameLoop(timestamp) {
    // Get current input state
    const inputState = getInput();
    
    // Skip game updates if in loading screen but still render
    if (game && loadingScreen.isShowing()) {
        // Just render the scene
        game.render();
    } else if (game) {
        // Normal update when not loading
        game.update(timestamp, inputState);
        game.render();
    }
    
    // Continue the loop
    requestAnimationFrame(gameLoop);
}

// Handle window resize
function onWindowResize() {
    resizeRenderer();
    if (game) game.onResize();
}

// Start the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

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

// Make chest spawner functions globally available for use in game.js
import { spawnChestsInDungeon } from './entities/items/chestSpawner.js';
window.spawnChestsInDungeon = spawnChestsInDungeon;
