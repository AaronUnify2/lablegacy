// src/game/game.js - Main game class and loop with enemy system integration
import * as THREE from 'three';

import { getRenderer, render, addToScene, removeFromScene } from '../engine/renderer.js';
import { generateDungeon } from '../dungeon/generator.js';
import { Player } from '../entities/player.js';
import { updateUI, showMessage } from './ui.js';
import { Physics } from '../engine/physics.js';
import { initMinimap, updateMinimap } from './minimap.js'; 
import { toggleMenu } from './pauseMenu.js';

// Import enemy system components
import { enemySpawner } from '../entities/enemies/enemySpawner.js';
import { EnemyRegistry, registerInitialEnemies } from '../entities/enemies/enemyRegistry.js';
import { getProjectileSystem, resetProjectileSystem } from '../entities/projectiles/projectileSystem.js';

// Game states
const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

// Main Game class
export class Game {
    constructor() {
        // Game state
        this.state = GameState.LOADING;
        this.currentFloor = 1;
        this.lastTimestamp = 0;
        
        // Game objects
        this.player = null;
        this.currentDungeon = null;
        this.entities = [];
        
        // Enemy system
        this.projectiles = [];
        this.activeEnemies = [];
        
        // Physics system
        this.physics = null;
        
        // References to Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Minimap context
        this.minimapContext = null;
        
        // Menu visibility tracking
        this.isMenuVisible = false;
        
        // Performance tracking
        this.fps = 0;
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
        
        // Debug mode
        this.debug = false;
    }
    
    // Initialize the game
    init() {
        console.log('Initializing game...');
        
        // Get references to Three.js objects
        const { scene, camera, renderer } = getRenderer();
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // Initialize physics
        this.physics = new Physics();
        
        // Initialize minimap
        this.minimapContext = initMinimap();
        
        // Create player
        this.player = new Player();
        this.player.init();
        addToScene(this.player.getObject());
        
        // Initialize enemy registry (register all enemy types)
        registerInitialEnemies();
        
        // Initialize projectile system
        const projectileSystem = getProjectileSystem(this.scene);
        
        // Generate first dungeon floor
        this.generateNewFloor(this.currentFloor);
        
        // Set initial camera position
        camera.position.copy(this.player.getPosition());
        camera.position.y += 8; // Position camera above player
        camera.position.z += 10; // Position camera behind player
        camera.lookAt(this.player.getPosition());
        
        // Set game state to playing
        this.state = GameState.PLAYING;
        
        // Show welcome message
        showMessage(`Welcome to Labyrinth Legacy - Floor ${this.currentFloor}`, 3000);
        
        console.log('Game initialized!');
    }

    // Generate a new dungeon floor
    generateNewFloor(floorNumber) {
        console.log(`Generating floor ${floorNumber}...`);
        
        // Remove old dungeon if it exists
        if (this.currentDungeon) {
            this.currentDungeon.dispose();
            removeFromScene(this.currentDungeon.getObject());
        }
        
        // Clean up player projectiles
        if (this.player) {
            this.player.cleanupProjectiles(this.scene);
        }
        
        // Clean up enemies from previous floor
        enemySpawner.onFloorChange();
        
        // Reset projectile system
        resetProjectileSystem();
        
        // Clear entities list
        this.entities = [];
        this.activeEnemies = [];
        
        // Generate new dungeon
        this.currentDungeon = generateDungeon(floorNumber);
        addToScene(this.currentDungeon.getObject());
        
        // Get player spawn position from dungeon
        const spawnPosition = this.currentDungeon.getPlayerSpawnPosition();
        this.player.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);
        
        // Generate spawn points for enemies in the new floor
        enemySpawner.generateSpawnPoints(this.currentDungeon, floorNumber);
        
        // Update UI
        document.getElementById('floor-number').textContent = floorNumber;
        
        // Show floor transition message
        showMessage(`Entered Floor ${floorNumber}`, 3000);
        
        // Debug: Log the number of chests created
        console.log(`Floor ${floorNumber} generated with ${this.currentDungeon.chests?.length || 0} chests`);
        
        console.log(`Floor ${floorNumber} generated`);
    }
    
    // Main update method - called every frame
    update(timestamp, inputState) {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        
        // Cap delta time to prevent huge jumps after tab switch or similar
        const cappedDeltaTime = Math.min(deltaTime, 0.1);
        
        // Update FPS counter
        this.updateFPS(deltaTime);
        
        // Handle menu toggling
        if (inputState.justPressed.menu) {
            this.toggleMenu();
        }
        
        // Update player - game always runs now
        this.player.update(cappedDeltaTime, inputState, this.currentDungeon, this.scene);
        
        // Check for interactions with chests
        if (inputState.justPressed.interact) {
            // Find a chest to interact with
            const interactableChest = this.currentDungeon.findInteractableChest(this.player.getPosition());
            if (interactableChest) {
                this.player.interactWithChest(interactableChest);
            }
        }
        
        // Update dungeon (includes chest animations)
        if (this.currentDungeon) {
            this.currentDungeon.update(cappedDeltaTime);
        }
        
        // Update enemies
        enemySpawner.update(cappedDeltaTime, this.player, this.scene, this.currentDungeon);
        
        // Update all active enemies
        const activeEnemies = enemySpawner.getActiveEnemies();
        for (const enemy of activeEnemies) {
            enemy.update(cappedDeltaTime, this.player, this.currentDungeon);
        }
        
        // Update projectiles
        this.updateProjectiles(cappedDeltaTime);
        
        // Get projectile system and update projectiles
        const projectileSystem = getProjectileSystem(this.scene);
        if (projectileSystem) {
            projectileSystem.update(
                cappedDeltaTime, 
                this.player, 
                enemySpawner.getActiveEnemies(), 
                this.currentDungeon
            );
        }
        
        // Update camera to follow player
        this.updateCamera(cappedDeltaTime);
        
        // Update physics
        this.physics.update(cappedDeltaTime);
        
        // Update all entities
        for (const entity of this.entities) {
            entity.update(cappedDeltaTime, this.player);
        }
        
        // Check for collisions (include enemies from spawner)
        this.physics.checkCollisions(
            this.player, 
            [...this.entities, ...enemySpawner.getActiveEnemies()], 
            this.currentDungeon
        );
        
        // Check for projectile collisions with enemies
        this.player.checkProjectileCollisions(activeEnemies);
        
        // Update UI
        updateUI(this.player, this.currentFloor);
        
        // Update minimap
        if (this.minimapContext) {
            updateMinimap(this.minimapContext, this.currentDungeon, this.player);
        }
        
        // Check for floor progression
        if (this.currentDungeon.isKeyCollected() && this.currentDungeon.isPlayerAtExit(this.player.getPosition())) {
            this.currentFloor++;
            this.generateNewFloor(this.currentFloor);
        }
    }
    
    // Update projectiles
    updateProjectiles(deltaTime) {
        // Update existing projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Move projectile
            projectile.position.x += projectile.velocity.x * deltaTime;
            projectile.position.y += projectile.velocity.y * deltaTime;
            projectile.position.z += projectile.velocity.z * deltaTime;
            
            // Update lifetime
            projectile.lifetime -= deltaTime;
            
            // Remove if expired
            if (projectile.lifetime <= 0) {
                // Remove from scene
                if (projectile.mesh && projectile.mesh.parent) {
                    projectile.mesh.parent.remove(projectile.mesh);
                }
                
                // Remove from array
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Check collisions with enemies if player's projectile
            if (projectile.owner === this.player) {
                const activeEnemies = enemySpawner.getActiveEnemies();
                for (const enemy of activeEnemies) {
                    // Skip dead enemies
                    if (enemy.isDead) continue;
                    
                    // Simple distance check
                    const dx = enemy.position.x - projectile.position.x;
                    const dy = enemy.position.y - projectile.position.y;
                    const dz = enemy.position.z - projectile.position.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    
                    if (distance < enemy.collisionRadius + projectile.size) {
                        // Hit enemy
                        enemy.takeDamage(projectile.damage);
                        
                        // Remove projectile
                        if (projectile.mesh && projectile.mesh.parent) {
                            projectile.mesh.parent.remove(projectile.mesh);
                        }
                        
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
            }
            // Check collisions with player if enemy's projectile
            else if (projectile.owner !== this.player) {
                // Simple distance check
                const dx = this.player.position.x - projectile.position.x;
                const dy = this.player.position.y - projectile.position.y;
                const dz = this.player.position.z - projectile.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (distance < 1.0 + projectile.size) { // Assuming player radius is about 1.0
                    // Hit player
                    this.player.takeDamage(projectile.damage);
                    
                    // Remove projectile
                    if (projectile.mesh && projectile.mesh.parent) {
                        projectile.mesh.parent.remove(projectile.mesh);
                    }
                    
                    this.projectiles.splice(i, 1);
                }
            }
        }
    }
    
    // Toggle menu overlay without pausing the game
    toggleMenu() {
        this.isMenuVisible = toggleMenu(); // Using toggleMenu instead of togglePauseMenu
        
        // The game continues to run - we just show/hide the menu
        console.log(this.isMenuVisible ? "Menu opened" : "Menu closed");
        
        // Return visibility state in case other code needs to know
        return this.isMenuVisible;
    }
    
    // Update camera position to follow player
    updateCamera(deltaTime) {
        const playerPosition = this.player.getPosition();
        const isPlayerInAir = this.player.isInAir();
        
        // Calculate target camera position
        // Adjust camera height based on whether player is jumping
        const cameraHeight = isPlayerInAir ? 
            playerPosition.y + 9 : // Higher camera when jumping
            playerPosition.y + 8;  // Normal camera height
        
        const targetPosition = new THREE.Vector3(
            playerPosition.x,
            cameraHeight,
            playerPosition.z + 10 // Camera distance behind player
        );
        
        // Smoothly move camera to target position
        // Use faster lerp when player is jumping for more responsive camera
        const lerpFactor = isPlayerInAir ? 8 * deltaTime : 5 * deltaTime;
        this.camera.position.lerp(targetPosition, lerpFactor);
        
        // Look at player
        this.camera.lookAt(playerPosition);
    }
    
    // Update game over state
    updateGameOver(inputState) {
        // Game over logic will go here
        // Could show a score screen, restart options, etc.
    }
    
    // Render the current frame
    render() {
        render();
    }
    
    // Handle window resize
    onResize() {
        // Any additional resize handling can go here
    }
    
    // Update FPS counter
    updateFPS(deltaTime) {
        this.frameCount++;
        this.fpsUpdateTime += deltaTime;
        
        // Update FPS every second
        if (this.fpsUpdateTime >= 1.0) {
            this.fps = Math.round(this.frameCount / this.fpsUpdateTime);
            this.frameCount = 0;
            this.fpsUpdateTime = 0;
            
            // Update FPS display if in debug mode
            if (this.debug) {
                const fpsElement = document.getElementById('fps-counter');
                if (fpsElement) {
                    fpsElement.textContent = `FPS: ${this.fps}`;
                } else {
                    // Create FPS counter if it doesn't exist
                    const fpsCounter = document.createElement('div');
                    fpsCounter.id = 'fps-counter';
                    fpsCounter.style.position = 'absolute';
                    fpsCounter.style.top = '10px';
                    fpsCounter.style.right = '10px';
                    fpsCounter.style.color = 'white';
                    fpsCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    fpsCounter.style.padding = '5px';
                    fpsCounter.style.borderRadius = '5px';
                    fpsCounter.style.fontFamily = 'monospace';
                    fpsCounter.style.zIndex = '1000';
                    fpsCounter.textContent = `FPS: ${this.fps}`;
                    document.body.appendChild(fpsCounter);
                }
            }
        }
    }
    
    // Toggle debug mode
    toggleDebug() {
        this.debug = !this.debug;
        
        // Toggle debug visuals
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) {
            fpsElement.style.display = this.debug ? 'block' : 'none';
        }
        
        // Toggle debug mode in enemy spawner
        enemySpawner.setDebug(this.debug);
        
        // Toggle hitbox visualization on enemies
        const activeEnemies = enemySpawner.getActiveEnemies();
        for (const enemy of activeEnemies) {
            enemy.toggleDebug(this.debug);
        }
        
        console.log(`Debug mode ${this.debug ? 'enabled' : 'disabled'}`);
    }
    
    // Get current game state
    getState() {
        return this.state;
    }
    
    // Set new game state
    setState(newState) {
        this.state = newState;
    }
    
    // Get current floor number
    getCurrentFloor() {
        return this.currentFloor;
    }
    
    // Spawn a test enemy (for debugging)
    spawnTestEnemy(type, x, y, z) {
        if (!EnemyRegistry.hasEnemy(type)) {
            console.error(`Enemy type '${type}' not registered`);
            return null;
        }
        
        // Create enemy
        const enemy = EnemyRegistry.createEnemy(type, {
            position: new THREE.Vector3(x, y, z),
            level: this.currentFloor
        });
        
        // Initialize and add to scene
        enemy.init();
        this.scene.add(enemy.getObject());
        
        // Add to active enemies
        this.activeEnemies.push(enemy);
        
        console.log(`Test enemy '${type}' spawned at (${x}, ${y}, ${z})`);
        return enemy;
    }
    
    // Clear all enemies (for testing)
    clearAllEnemies() {
        // Remove all enemies via spawner
        enemySpawner.onFloorChange();
        console.log("All enemies cleared");
    }
}
