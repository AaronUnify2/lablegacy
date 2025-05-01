// src/main.js - Updated with loading screen integration and error handling
import { setupRenderer, resizeRenderer } from './engine/renderer.js';
import { setupInput, getInput } from './engine/input.js';
import { Game } from './game/game.js';
import { initUI, showMessage } from './game/ui.js';
import { initMenu } from './game/pauseMenu.js';
import { loadingScreen } from './game/loadingScreen.js'; // Import loading screen
import { ItemDatabase, ItemType } from './entities/items/inventory.js';
import { spawnChestsInDungeon } from './entities/items/chestSpawner.js'; // Import chest spawner here

// Main game instance
let game;

// Initialize the game with improved error handling
function init() {
    console.log('Initializing Labyrinth Legacy...');
    
    try {
        // Initialize loading screen first
        loadingScreen.init();
        loadingScreen.show('Initializing Game...');
        loadingScreen.updateProgress(10);
        
        // Setup essential engine components with error handling
        try {
            setupRenderer();
        } catch (rendererError) {
            console.error("Error setting up renderer:", rendererError);
            // Show an alert as this is critical
            alert("Failed to initialize graphics renderer. The game cannot start.");
            return;
        }
        
        try {
            setupInput();
        } catch (inputError) {
            console.error("Error setting up input:", inputError);
        }
        
        loadingScreen.updateProgress(30);
        
        // Initialize UI with three status bars
        try {
            initUI();
        } catch (uiError) {
            console.error("Error initializing UI:", uiError);
        }
        
        // Initialize menu system
        try {
            initMenu();
        } catch (menuError) {
            console.error("Error initializing menu:", menuError);
        }
        
        loadingScreen.updateProgress(50);
        
        // Create and initialize the game
        game = new Game();
        
        // Add error handling for game initialization
        try {
            // Start initialization - the game will handle its own loading screen updates
            game.init();
        } catch (gameInitError) {
            console.error("Error initializing game:", gameInitError);
            loadingScreen.setMessage("Error starting game. Please refresh.");
            return;
        }
        
        // Setup global references
        window.game = game;
        
        // Expose necessary functions globally
        window.showMessage = showMessage;
        window.spawnChestsInDungeon = spawnChestsInDungeon; // Make chest spawner available globally
        if (typeof ItemDatabase !== 'undefined') window.ItemDatabase = ItemDatabase;
        if (typeof ItemType !== 'undefined') window.ItemType = ItemType;
        
        // Start the game loop - this will run even while the loading screen is showing
        requestAnimationFrame(gameLoop);
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        // Add recovery handler for potential Three.js WebGL context loss
        if (renderer && renderer.domElement) {
            renderer.domElement.addEventListener('webglcontextlost', function(event) {
                console.error("WebGL context lost:", event);
                // Prevent default behavior
                event.preventDefault();
                // Show message
                if (window.showMessage) {
                    showMessage('Graphics context lost. Attempting to recover...', 5000);
                }
                // Try to restart renderer after a delay
                setTimeout(() => {
                    try {
                        setupRenderer();
                        // After renderer is recreated, reinitialize scene
                        if (game) {
                            game.scene = scene;
                            game.camera = camera;
                            game.renderer = renderer;
                        }
                    } catch (e) {
                        console.error("Failed to recover from context loss:", e);
                    }
                }, 2000);
            });
        }
        
        // Loading screen will finish in game.init()
    } catch (error) {
        console.error("Critical initialization error:", error);
        loadingScreen.setMessage("Fatal error. Please refresh your browser.");
        alert("A critical error occurred during game initialization. Please refresh your browser.");
    }
}

// Game loop function with error handling
function gameLoop(timestamp) {
    try {
        // Get current input state
        const inputState = getInput();
        
        // Skip game updates if in loading screen but still render
        if (game && loadingScreen.isShowing()) {
            // Just render the scene safely
            try {
                game.render();
            } catch (renderError) {
                console.error("Error during loading screen render:", renderError);
                // Don't re-throw to keep the game loop running
            }
        } else if (game) {
            // Normal update when not loading
            try {
                game.update(timestamp, inputState);
                game.render();
            } catch (gameError) {
                console.error("Error during game update or render:", gameError);
                // Show error message to user
                if (window.showMessage) {
                    showMessage('Game error: ' + gameError.message, 5000);
                }
                // Don't re-throw to keep the game loop running
            }
        }
        
        // Continue the loop
        requestAnimationFrame(gameLoop);
    } catch (criticalError) {
        console.error("Critical error in game loop:", criticalError);
        // Try to recover by restarting the loop
        if (window.showMessage) {
            showMessage('Critical error occurred. Attempting to recover...', 5000);
        }
        setTimeout(() => requestAnimationFrame(gameLoop), 1000);
    }
}

// Handle window resize
function onWindowResize() {
    resizeRenderer();
    if (game) game.onResize();
}

// Start the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Add a global error handler for Three.js specific errors
window.addEventListener('error', function(event) {
    // Check if this is a Three.js related error
    const errorMessage = event.message || '';
    if (errorMessage.includes('THREE') || 
        errorMessage.includes('WebGL') || 
        errorMessage.includes('GL_') || 
        errorMessage.includes('shader')) {
        
        console.error('Graphics error caught:', event.error);
        
        // Try to recover the renderer
        if (window.game && window.game.renderer) {
            try {
                // Force renderer reset
                window.game.renderer.dispose();
                setupRenderer();
                window.game.renderer = renderer;
                
                // Show recovery message
                if (window.showMessage) {
                    showMessage('Graphics system recovered after error', 3000);
                }
            } catch (e) {
                console.error("Failed to recover renderer:", e);
            }
        }
    } else {
        // Handle other errors
        console.error('Error caught:', event.error);
        if (window.showMessage) {
            showMessage('An error occurred: ' + event.error.message, 5000);
        }
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
