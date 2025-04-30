// src/game/game.js - Visual debugging version
import * as THREE from 'three';

import { getRenderer, render, addToScene, removeFromScene } from '../engine/renderer.js';
import { generateDungeon } from '../dungeon/generator.js';
import { Player } from '../entities/player.js';
import { updateUI } from './ui.js';
import { Physics } from '../engine/physics.js';
import { initMinimap, updateMinimap } from './minimap.js'; 
import { toggleMenu } from './pauseMenu.js';

// Minimal enemy imports
import { enemyRegistry } from '../entities/enemies/enemyRegistry.js';
import { enemySpawner } from '../entities/enemies/enemySpawner.js';
import { projectileSystem } from '../entities/enemies/projectileSystem.js';

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
        this.debugObjects = []; // Store debug objects
        
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
        
        // Enemy systems
        this.enemySpawner = enemySpawner;
        this.projectileSystem = projectileSystem;
    }
    
    // Initialize the game
    init() {
        window.alert("Game initializing. We'll test enemy spawning with simple colored boxes");
        
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
        
        // Initialize projectile system for enemies
        this.projectileSystem.init(this.scene);
        
        // Make game instance globally available for enemy systems
        window.game = this;
        
        // Generate first dungeon floor
        this.generateNewFloor(this.currentFloor);
        
        // Set initial camera position
        camera.position.copy(this.player.getPosition());
        camera.position.y += 8; // Position camera above player
        camera.position.z += 10; // Position camera behind player
        camera.lookAt(this.player.getPosition());
        
        // Set game state to playing
        this.state = GameState.PLAYING;
    }

    // Generate a new dungeon floor
    generateNewFloor(floorNumber) {
        window.alert(`Generating floor ${floorNumber}. Will attempt to spawn test objects.`);
        
        // Remove old dungeon if it exists
        if (this.currentDungeon) {
            this.currentDungeon.dispose();
            removeFromScene(this.currentDungeon.getObject());
        }
        
        // Clear previous debug objects
        this.clearDebugObjects();
        
        // Clean up projectiles
        this.projectileSystem.clear();
        
        // Clean up player projectiles
        if (this.player) {
            this.player.cleanupProjectiles(this.scene);
        }
        
        // Clear enemies
        this.enemySpawner.clearEnemies(this.scene);
        
        // Clear entities list
        this.entities = [];
        
        // Generate new dungeon
        this.currentDungeon = generateDungeon(floorNumber);
        addToScene(this.currentDungeon.getObject());
        
        // Get player spawn position from dungeon
        const spawnPosition = this.currentDungeon.getPlayerSpawnPosition();
        this.player.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);
        
        // Add visual debug objects instead of enemies
        this.spawnDebugObjects();
        
        // Try spawning a sphere enemy too
        this.attemptToSpawnSphere();
        
        // Update UI
        document.getElementById('floor-number').textContent = floorNumber;
        
        // Show floor transition message
        window.showMessage?.(`Entered Floor ${floorNumber}`, 3000);
    }
    
    // Clear all debug objects
    clearDebugObjects() {
        for (const obj of this.debugObjects) {
            if (obj && obj.parent) {
                obj.parent.remove(obj);
            }
        }
        this.debugObjects = [];
    }
    
    // Spawn simple colored boxes for debugging
    spawnDebugObjects() {
        try {
            // Get rooms
            const rooms = this.currentDungeon.getRooms();
            
            // Check if rooms exist
            if (!rooms || rooms.length === 0) {
                window.alert("ERROR: No rooms found in dungeon!");
                return;
            }
            
            // Go through each room and place a debug box
            for (let i = 0; i < Math.min(3, rooms.length); i++) {
                const room = rooms[i];
                
                // Create a colored box
                const colors = [0xff0000, 0x00ff00, 0x0000ff];
                this.createDebugBox(
                    room.x + room.width / 2,  // Center X
                    room.floorHeight + 1.5,    // Y above floor
                    room.z + room.height / 2,  // Center Z
                    colors[i % colors.length]
                );
            }
            
            window.alert(`Created ${Math.min(3, rooms.length)} debug boxes in rooms`);
        } catch (error) {
            window.alert(`Error creating debug boxes: ${error.message}`);
        }
    }
    
    // Create a simple colored box at the given position
    createDebugBox(x, y, z, color) {
        try {
            // Create a box geometry
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ color: color });
            const box = new THREE.Mesh(geometry, material);
            
            // Position it
            box.position.set(x, y, z);
            
            // Add it to the scene
            this.scene.add(box);
            
            // Store it for cleanup later
            this.debugObjects.push(box);
            
            return box;
        } catch (error) {
            window.alert(`Error creating debug box: ${error.message}`);
            return null;
        }
    }
    
    // Attempt to spawn a sphere enemy directly
    attemptToSpawnSphere() {
        try {
            window.alert("Attempting to spawn a sphere enemy...");
            
            // Get a room
            const rooms = this.currentDungeon.getRooms();
            if (!rooms || rooms.length === 0) return;
            
            // Get a non-spawn room
            const targetRoom = rooms.find(room => !room.isSpawnRoom) || rooms[0];
            
            // Calculate spawn position
            const x = targetRoom.x + targetRoom.width / 2;
            const y = targetRoom.floorHeight + 1;
            const z = targetRoom.z + targetRoom.height / 2;
            
            // Create a direct reference to the Sphere class to bypass registry
            try {
                // Try to directly import Sphere
                import('../entities/enemies/variants/Sphere.js')
                    .then(module => {
                        const Sphere = module.Sphere;
                        if (Sphere) {
                            // Create sphere directly
                            const sphereEnemy = Sphere.create(x, y, z);
                            if (sphereEnemy) {
                                // Add to scene
                                this.scene.add(sphereEnemy.getObject());
                                // Add to enemies list
                                this.enemySpawner.enemies.push(sphereEnemy);
                                window.alert("Sphere enemy created successfully!");
                            } else {
                                window.alert("Failed to create sphere enemy");
                            }
                        } else {
                            window.alert("Sphere class not found in module");
                        }
                    })
                    .catch(error => {
                        window.alert(`Error importing Sphere: ${error.message}`);
                    });
            } catch (error) {
                window.alert(`Error with dynamic import: ${error.message}`);
            }
            
        } catch (error) {
            window.alert(`Error attempting to spawn sphere: ${error.message}`);
        }
    }
    
    // Update method
    update(timestamp, inputState) {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        
        // Cap delta time to prevent huge jumps after tab switch or similar
        const cappedDeltaTime = Math.min(deltaTime, 0.1);
        
        // Handle menu toggling
        if (inputState.justPressed.menu) {
            this.toggleMenu();
        }
        
        // Update player - game always runs now
        this.player.update(cappedDeltaTime, inputState, this.currentDungeon, this.scene);
        
        // Check for interactions with chests
        if (inputState.justPressed.interact) {
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
        this.enemySpawner.update(cappedDeltaTime, this.player, this.currentDungeon);
        
        // Animate debug objects (rotate them to make them visible)
        for (const box of this.debugObjects) {
            if (box) {
                box.rotation.x += cappedDeltaTime;
                box.rotation.y += cappedDeltaTime * 0.5;
            }
        }
        
        // Update camera to follow player
        this.updateCamera(cappedDeltaTime);
        
        // Update physics
        this.physics.update(cappedDeltaTime);
        
        // Update all entities
        this.entities = [...this.enemySpawner.getEnemies()];
        for (const entity of this.entities) {
            if (entity && typeof entity.update === 'function') {
                try {
                    entity.update(cappedDeltaTime, this.player, this.currentDungeon);
                } catch (error) {
                    // Silently handle errors during updates
                }
            }
        }
        
        // Check for collisions
        this.physics.checkCollisions(this.player, this.entities, this.currentDungeon);
        
        // Check for projectile collisions with enemies
        this.player.checkProjectileCollisions(this.entities);
        
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
    
    // Toggle menu overlay without pausing the game
    toggleMenu() {
        this.isMenuVisible = toggleMenu();
        
        // The game continues to run - we just show/hide the menu
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
    
    // Render the current frame
    render() {
        render();
    }
    
    // Handle window resize
    onResize() {
        // Any additional resize handling can go here
    }
}
