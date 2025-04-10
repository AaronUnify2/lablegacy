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
        
        // Custom game state
        this.gameState = {
            curseLevel: 0, // Increases as player progresses
            hasKey: false,
            curseEffects: []
        };
        
        // Bind methods
        this.update = this.update.bind(this);
        this.init = this.init.bind(this);
    }
    
    async init() {
        console.log('Initializing game...');
        
        // Update loading screen with lore
        this.showLoreText();
        
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
        
        // Add atmospheric sound
        this.setupAudio();
        
        // Hide loading screen with slight delay for dramatic effect
        setTimeout(() => {
            this.loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
                
                // Start the game loop
                this.isRunning = true;
                requestAnimationFrame(this.update);
                
                console.log('Game initialized!');
            }, 1000);
        }, 3000); // Show lore text for 3 seconds
    }
    
    showLoreText() {
        const loadingContent = document.querySelector('.loading-content');
        
        // Add lore text beneath the title
        const loreElement = document.createElement('div');
        loreElement.className = 'lore-text';
        loreElement.innerHTML = `
            <p>The ancient structure...</p>
            <p>Now consumed by darkness.</p>
            <p>You must discover the machine's purpose before the curse consumes you too.</p>
        `;
        
        // Insert after the title but before the spinner
        const spinner = loadingContent.querySelector('.spinner');
        loadingContent.insertBefore(loreElement, spinner);
        
        // Add a flickering effect to the loading text
        const loadingText = loadingContent.querySelector('p:last-child');
        loadingText.textContent = 'Entering the labyrinth...';
        loadingText.className = 'flicker-text';
    }
    
    setupAudio() {
        // Background ambient sound
        this.ambientSound = new Audio();
        this.ambientSound.src = 'sounds/ambient_curse.mp3'; // You'll need to add this file
        this.ambientSound.loop = true;
        this.ambientSound.volume = 0.4;
        
        // Play ambient sound on user interaction
        const playAudio = () => {
            this.ambientSound.play().catch(error => {
                console.log('Audio playback failed:', error);
            });
            
            // Remove event listeners once audio starts
            document.removeEventListener('click', playAudio);
            document.removeEventListener('keydown', playAudio);
        };
        
        document.addEventListener('click', playAudio);
        document.addEventListener('keydown', playAudio);
        
        // Additional sound effects
        this.sounds = {
            footsteps: new Audio('sounds/footsteps_stone.mp3'), // You'll need to add this file
            torchFlicker: new Audio('sounds/torch_flicker.mp3') // You'll need to add this file
        };
        
        // Prepare the footstep sound
        this.sounds.footsteps.loop = true;
        this.sounds.footsteps.volume = 0;
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
        
        // Update audio based on movement
        this.updateAudio(deltaTime);
        
        // Update any curse effects
        this.updateCurseEffects(currentTime, deltaTime);
        
        // Render the scene with time parameter for effects
        this.renderer.render(currentTime);
        
        // Continue the game loop
        requestAnimationFrame(this.update);
    }
    
    updateAudio(deltaTime) {
        // Handle footstep sounds based on movement
        const isMoving = this.input.moveForward || this.input.moveBackward || 
                         this.input.moveLeft || this.input.moveRight;
        
        if (isMoving) {
            // Gradually increase footstep volume
            this.sounds.footsteps.volume = Math.min(0.3, this.sounds.footsteps.volume + deltaTime * 2);
            
            if (this.sounds.footsteps.paused) {
                this.sounds.footsteps.play().catch(() => {});
            }
        } else {
            // Gradually decrease footstep volume
            this.sounds.footsteps.volume = Math.max(0, this.sounds.footsteps.volume - deltaTime * 4);
            
            if (this.sounds.footsteps.volume <= 0.01 && !this.sounds.footsteps.paused) {
                this.sounds.footsteps.pause();
            }
        }
        
        // Occasionally play torch flicker sound
        if (Math.random() < deltaTime * 0.2) {
            this.sounds.torchFlicker.currentTime = 0;
            this.sounds.torchFlicker.volume = Math.random() * 0.2 + 0.1;
            this.sounds.torchFlicker.play().catch(() => {});
        }
    }
    
    updateCurseEffects(currentTime, deltaTime) {
        // Subtle camera shake based on curse level
        if (this.gameState.curseLevel > 0) {
            const intensity = this.gameState.curseLevel * 0.0005;
            const shakeX = (Math.random() - 0.5) * intensity;
            const shakeY = (Math.random() - 0.5) * intensity;
            
            this.renderer.camera.position.x += shakeX;
            this.renderer.camera.position.y += shakeY;
        }
        
        // Pulse the fog density
        if (this.renderer.scene.fog) {
            const baseFog = 0.03;
            const pulseMagnitude = 0.01;
            const pulseSpeed = 0.5;
            
            this.renderer.scene.fog.density = baseFog + 
                Math.sin(currentTime * 0.001 * pulseSpeed) * pulseMagnitude;
        }
    }
}

// Initialize and start the game when the window loads
let game;
window.addEventListener('load', () => {
    game = new Game();
    game.init();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (game && game.renderer) {
        game.renderer.resize();
    }
});
