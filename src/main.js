// src/main.js - Updated with improved error handling and integration with DungeonLoader
import { setupRenderer, resizeRenderer } from './engine/renderer.js';
import { setupInput, getInput } from './engine/input.js';
import { Game } from './game/game.js';
import { initUI, showMessage } from './game/ui.js';
import { initMenu } from './game/pauseMenu.js';
import { loadingScreen } from './game/loadingScreen.js';
import { spawnChestsInDungeon, getSpawnedChests, clearSpawnedChests } from './entities/items/chestSpawner.js';

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
            showFatalError("Failed to initialize graphics renderer. The game cannot start.");
            return;
        }
        
        try {
            setupInput();
        } catch (inputError) {
            console.error("Error setting up input:", inputError);
            showWarning("Input system initialization failed. Controls may not work correctly.");
        }
        
        loadingScreen.updateProgress(30);
        
        // Initialize UI with three status bars
        try {
            initUI();
        } catch (uiError) {
            console.error("Error initializing UI:", uiError);
            showWarning("UI initialization failed. Game interface may not display correctly.");
        }
        
        // Initialize menu system
        try {
            initMenu();
        } catch (menuError) {
            console.error("Error initializing menu:", menuError);
            showWarning("Menu system initialization failed. In-game menu may not function correctly.");
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
            showFatalError("Error starting game: " + gameInitError.message);
            return;
        }
        
        // Setup global references
        window.game = game;
        
        // Expose necessary functions globally
        window.showMessage = showMessage;
        window.spawnChestsInDungeon = spawnChestsInDungeon;
        window.getSpawnedChests = getSpawnedChests;
        window.clearSpawnedChests = clearSpawnedChests;
        
        // Start the game loop
        requestAnimationFrame(gameLoop);
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        // Add recovery handler for potential Three.js WebGL context loss
        if (renderer && renderer.domElement) {
            renderer.domElement.addEventListener('webglcontextlost', handleWebGLContextLost);
        }
        
    } catch (error) {
        console.error("Critical initialization error:", error);
        showFatalError("A critical error occurred during game initialization: " + error.message);
    }
}

// Game loop function with improved error handling
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
                showWarning('Game error: ' + gameError.message);
                // Don't re-throw to keep the game loop running
            }
        }
        
        // Continue the loop
        requestAnimationFrame(gameLoop);
    } catch (criticalError) {
        console.error("Critical error in game loop:", criticalError);
        // Try to recover by restarting the loop
        showWarning('Critical error occurred. Attempting to recover...');
        setTimeout(() => requestAnimationFrame(gameLoop), 1000);
    }
}

// Handle window resize
function onWindowResize() {
    resizeRenderer();
    if (game) game.onResize();
}

// WebGL context loss handler
function handleWebGLContextLost(event) {
    console.error("WebGL context lost:", event);
    // Prevent default behavior
    event.preventDefault();
    // Show message
    showWarning('Graphics context lost. Attempting to recover...');
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
            showMessage('Graphics system recovered', 3000);
        } catch (e) {
            console.error("Failed to recover from context loss:", e);
            showFatalError("Failed to recover graphics context. Please refresh the page.");
        }
    }, 2000);
}

// Show a fatal error with alert and loading screen
function showFatalError(message) {
    loadingScreen.setMessage("Fatal error! Please refresh your browser.");
    alert(message);
}

// Show a warning but allow the game to continue
function showWarning(message) {
    if (window.showMessage) {
        window.showMessage(message, 5000);
    } else {
        console.warn(message);
    }
}

// Start the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Add a global error handler
window.addEventListener('error', function(event) {
    // Check if this is a Three.js related error
    const errorMessage = event.message || '';
    if (errorMessage.includes('THREE') || 
        errorMessage.includes('WebGL') || 
        errorMessage.includes('GL_') || 
        errorMessage.includes('shader')) {
        
        console.error('Graphics error caught:', event.error);
        showWarning('A graphics error occurred. The game will attempt to recover.');
        
        // Try to recover the renderer
        if (window.game && window.game.renderer) {
            try {
                // Force renderer reset
                window.game.renderer.dispose();
                setupRenderer();
                window.game.renderer = renderer;
                
                // Show recovery message
                showMessage('Graphics system recovered after error', 3000);
            } catch (e) {
                console.error("Failed to recover renderer:", e);
                showFatalError("Failed to recover from graphics error. Please refresh the page.");
            }
        }
    } else {
        // Handle other errors
        console.error('Error caught:', event.error);
        showWarning('An error occurred: ' + event.error.message);
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
        case 'healthPotion':
            return 'Health Potion';
        case 'staminaPotion':
            return 'Stamina Potion';
        case 'staffCrystal':
            return 'Staff Crystal';
        case 'key':
            return 'Key';
        case 'scroll':
            return 'Scroll';
        default:
            return type;
    }
};
