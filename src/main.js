// src/main.js - Updated with first-person view support and improved error handling
import { setupRenderer, resizeRenderer, getRenderer } from './engine/renderer.js';
import { setupInput, getInput } from './engine/input.js';
import { Game } from './game/game.js';
import { initUI, showMessage, setFirstPersonMode, showHitMarker } from './game/ui.js';
import { initMenu } from './game/pauseMenu.js';
import { loadingScreen } from './game/loadingScreen.js';
import { spawnChestsInDungeon, getSpawnedChests, clearSpawnedChests } from './entities/items/chestSpawner.js';

// Main game instance
let game;

// Initialize the game with first-person support and improved error handling
function init() {
    console.log('Initializing Labyrinth Legacy with First-Person View...');
    
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
        
        // Initialize UI with first-person support
        try {
            initUI();
            // Set first-person mode from the start
            setFirstPersonMode(true);
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
        window.showHitMarker = showHitMarker;
        window.spawnChestsInDungeon = spawnChestsInDungeon;
        window.getSpawnedChests = getSpawnedChests;
        window.clearSpawnedChests = clearSpawnedChests;
        
        // Start the game loop
        requestAnimationFrame(gameLoop);
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        // Add recovery handler for potential Three.js WebGL context loss
        const { renderer } = getRenderer();
        if (renderer && renderer.domElement) {
            renderer.domElement.addEventListener('webglcontextlost', handleWebGLContextLost);
        }
        
        // Add pointer lock change handler for first-person mode
        document.addEventListener('pointerlockchange', handlePointerLockChange);
        document.addEventListener('pointerlockerror', handlePointerLockError);
        
        // Show first-person instructions
        setTimeout(() => {
            if (window.showMessage) {
                showMessage('Click to enable mouse look. Use WASD to move, mouse to look around.', 5000);
            }
        }, 2000);
        
    } catch (error) {
        console.error("Critical initialization error:", error);
        showFatalError("A critical error occurred during game initialization: " + error.message);
    }
}

// Handle pointer lock changes for first-person view
function handlePointerLockChange() {
    const isLocked = document.pointerLockElement === document.getElementById('game-canvas');
    
    if (isLocked) {
        console.log('Mouse locked - first-person controls active');
        // Could show a subtle indicator that mouse look is active
    } else {
        console.log('Mouse unlocked - first-person controls inactive');
    }
}

// Handle pointer lock errors
function handlePointerLockError() {
    console.error('Pointer lock failed');
    showWarning('Mouse lock failed. Click the game area to enable first-person mouse look.');
}

// Game loop function with improved error handling for first-person
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
                
                // Update first-person specific features
                updateFirstPersonFeatures(game, inputState);
                
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

// Update first-person specific features
function updateFirstPersonFeatures(game, inputState) {
    try {
        // Check for projectile hits and show hit markers
        if (game.player && game.player.projectiles) {
            // This would be called when a projectile hits an enemy
            // The hit detection is already handled in player.js
            
            // Future: Add more first-person specific updates here
            // - Weapon sway based on movement
            // - Breathing effect on camera
            // - Dynamic crosshair behavior
        }
        
        // Handle ESC key to release pointer lock
        if (inputState.justPressed.menu) {
            // Menu is already handled in game.js, but we could add
            // pointer lock release here if needed
        }
        
    } catch (error) {
        console.error("Error updating first-person features:", error);
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
                const { scene, camera, renderer } = getRenderer();
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
                const { renderer } = getRenderer();
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

// Add keyboard shortcuts for first-person mode
document.addEventListener('keydown', function(event) {
    // F key to toggle flashlight (future feature)
    if (event.code === 'KeyF' && game && game.player) {
        // Future: Toggle player light
        console.log('Flashlight toggle (future feature)');
    }
    
    // V key to toggle view mode (if we want to support both first and third person)
    if (event.code === 'KeyV' && game && game.player && game.player.toggleViewMode) {
        game.player.toggleViewMode();
        setFirstPersonMode(game.player.isFirstPerson);
        showMessage(game.player.isFirstPerson ? 'First-Person View' : 'Third-Person View', 2000);
    }
    
    // Tab key to toggle UI visibility (for immersive screenshots)
    if (event.code === 'Tab') {
        event.preventDefault();
        const uiContainer = document.getElementById('ui-container');
        const minimapContainer = document.getElementById('minimap-container');
        
        if (uiContainer && minimapContainer) {
            const isHidden = uiContainer.style.display === 'none';
            uiContainer.style.display = isHidden ? 'block' : 'none';
            minimapContainer.style.display = isHidden ? 'block' : 'none';
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

// Add first-person specific utility functions
window.toggleFirstPersonMode = function() {
    if (game && game.player && game.player.toggleViewMode) {
        game.player.toggleViewMode();
        setFirstPersonMode(game.player.isFirstPerson);
        return game.player.isFirstPerson;
    }
    return true; // Default to first-person
};

// Helper to request pointer lock manually
window.requestMouseLock = function() {
    const canvas = document.getElementById('game-canvas');
    if (canvas && canvas.requestPointerLock) {
        canvas.requestPointerLock();
    }
};

// Helper to exit pointer lock
window.exitMouseLock = function() {
    if (document.exitPointerLock) {
        document.exitPointerLock();
    }
};
