import { Renderer } from './engine/renderer.js';
import { InputManager } from './engine/input.js';
import { DungeonGenerator } from './systems/dungeonGenerator.js';

class Game {
    constructor() {
        // Initialize core components
        this.renderer = new Renderer();
        this.input = new InputManager(this.renderer.camera, this.renderer.domElement);
        this.dungeonGenerator = new DungeonGenerator();
        
        // Game state
        this.isRunning = false;
        this.lastTime = 0;
        this.fpsCounter = document.getElementById('fps-counter');
        this.positionInfo = document.getElementById('position-info');
        this.loadingScreen = document.getElementById('loading-screen');
        
        // Bind methods
        this.update = this.update.bind(this);
        this.init = this.init.bind(this);
    }
    
    async init() {
        console.log('Initializing game...');
        
        // Generate a test dungeon
        const dungeon = this.dungeonGenerator.generateFloor(1);
        
        // Add the dungeon to the scene
        this.renderer.scene.add(dungeon.mesh);
        
        // Hide loading screen
        this.loadingScreen.style.display = 'none';
        
        // Start the game loop
        this.isRunning = true;
        requestAnimationFrame(this.update);
        
        console.log('Game initialized!');
    }
    
    update(currentTime) {
        if (!this.isRunning) return;
        
        // Calculate delta time in seconds
        if (!this.lastTime) this.lastTime = currentTime;
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update FPS counter (every 500ms)
        if (currentTime % 500 < 16) {
            this.fpsCounter.textContent = `FPS: ${Math.round(1 / deltaTime)}`;
        }
        
        // Update position display
        const pos = this.renderer.camera.position;
        this.positionInfo.textContent = `Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
        
        // Update input and movement
        this.input.update(deltaTime);
        
        // Render the scene
        this.renderer.render();
        
        // Continue the game loop
        requestAnimationFrame(this.update);
    }
}

// Initialize and start the game when the window loads
window.addEventListener('load', () => {
    const game = new Game();
    game.init();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (game && game.renderer) {
        game.renderer.resize();
    }
});
