import { Renderer } from './engine/renderer.js';
import { InputManager } from './engine/input.js';
import { DungeonGenerator } from './systems/dungeonGenerator.js';
import { CollisionManager } from './engine/collision.js';

class Game {
    constructor() {
        // Initialize core components
        this.renderer = new Renderer();
        this.input = new InputManager(this.renderer.camera, this.renderer.domElement);
        this.dungeonGenerator = new DungeonGenerator();
        this.collisionManager = new CollisionManager();
        
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
        
        // Register dungeon colliders
        if (dungeon.mesh.colliderMeshes) {
            console.log(`Registering ${dungeon.mesh.colliderMeshes.length} colliders...`);
            for (const mesh of dungeon.mesh.colliderMeshes) {
                this.collisionManager.addCollider(mesh);
            }
        }
        
        // Start the player in a safe position above the first room
        const firstRoom = dungeon.rooms[0];
        this.renderer.camera.position.set(
            firstRoom.x + firstRoom.width / 2,
            2, // Start slightly above the floor
            firstRoom.y + firstRoom.height / 2
        );
        
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
        
        // Update input and movement with collision detection
        this.input.update(deltaTime, this.collisionManager);
        
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
