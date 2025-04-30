// src/entities/enemies/enemySpawner.js - System for spawning enemies in the dungeon

import * as THREE from 'three';
import { enemyRegistry } from './enemyRegistry.js';
import { applyAIController } from './enemyAI.js';

// Enemy spawner class
export class EnemySpawner {
    constructor() {
        this.enemies = [];
        this.isSpawning = false;
        this.currentFloor = 1;
        this.maxEnemiesPerRoom = 3; // Maximum enemies to spawn in a room
        this.spawnDelay = 3000; // 3 second delay as requested
    }
    
    // Initialize the spawner with the current floor
    init(floorNumber) {
        this.currentFloor = floorNumber;
        this.enemies = [];
        console.log(`Enemy spawner initialized for floor ${floorNumber}`);
    }
    
    // Spawn enemies in a dungeon
    spawnEnemiesInDungeon(dungeon, scene) {
        // If already spawning, don't spawn again
        if (this.isSpawning) return;
        
        // Mark as spawning to prevent multiple calls
        this.isSpawning = true;
        
        console.log(`Scheduling enemy spawning in ${this.spawnDelay/1000} seconds...`);
        
        // Wait for the specified delay before spawning
        setTimeout(() => {
            this.performSpawning(dungeon, scene);
            this.isSpawning = false;
        }, this.spawnDelay);
    }
    
    // Actually perform the spawning after delay
    performSpawning(dungeon, scene) {
        if (!dungeon || !scene) {
            console.error('Dungeon or scene not provided for enemy spawning');
            return;
        }
        
        console.log('Beginning enemy spawning...');
        
        // Get all rooms
        const rooms = dungeon.getRooms();
        
        // Separate rooms by type
        const centerRoom = rooms.find(room => room.isSpawnRoom);
        const radialRooms = rooms.filter(room => room.roomType === 'radial');
        const cardinalRooms = rooms.filter(room => room.roomType === 'cardinal');
        const corridors = dungeon.corridors || [];
        
        // Placeholder for availabe enemy tracking
        let availableEnemies = {};
        
        // Track which enemy types can spawn in which room types
        for (const roomType of ['spawnRoom', 'radial', 'cardinal', 'corridor']) {
            availableEnemies[roomType] = enemyRegistry.getEnemiesForSpawn(this.currentFloor, roomType);
            
            // If no specific enemies for this room type, use general floor enemies
            if (availableEnemies[roomType].length === 0) {
                availableEnemies[roomType] = enemyRegistry.getEnemiesForFloor(this.currentFloor);
            }
        }
        
        console.log(`Available enemy types for floor ${this.currentFloor}:`, availableEnemies);
        
        // Determine number of enemies based on floor
        const baseEnemyCount = 3 + Math.floor(this.currentFloor / 2);
        let remainingEnemies = baseEnemyCount;
        
        // Track which rooms already have enemies
        const roomsWithEnemies = new Set();
        
        // 1. Spawn in cardinal rooms first (center position)
        cardinalRooms.forEach(room => {
            if (remainingEnemies <= 0 || Math.random() > 0.7) return; // 70% chance to spawn
            
            // Spawn 1-2 enemies in center of cardinal rooms
            const count = Math.min(remainingEnemies, 1 + Math.floor(Math.random() * 2));
            this.spawnEnemiesInCardinalRoom(room, count, enemyTypes, scene);
            
            remainingEnemies -= count;
            roomsWithEnemies.add(room);
        });
        
        // 2. Spawn in radial rooms (random position)
        radialRooms.forEach(room => {
            if (remainingEnemies <= 0 || Math.random() > 0.6) return; // 60% chance to spawn
            
            // Spawn 1-3 enemies in radial rooms
            const count = Math.min(remainingEnemies, 1 + Math.floor(Math.random() * this.maxEnemiesPerRoom));
            this.spawnEnemiesInRoom(room, count, enemyTypes, scene);
            
            remainingEnemies -= count;
            roomsWithEnemies.add(room);
        });
        
        // 3. Maybe spawn in center room last (they'll be immediately active)
        if (centerRoom && remainingEnemies > 0 && Math.random() > 0.7) { // 30% chance to spawn in center
            // Spawn 1-2 enemies in center room
            const count = Math.min(remainingEnemies, 1 + Math.floor(Math.random() * 2));
            this.spawnEnemiesInRoom(centerRoom, count, enemyTypes, scene);
            
            remainingEnemies -= count;
            roomsWithEnemies.add(centerRoom);
        }
        
        // 4. Finally, maybe spawn a few in corridors
        if (remainingEnemies > 0 && corridors.length > 0) {
            // Only spawn in a few random corridors
            const randomCorridors = this.shuffleArray([...corridors])
                .slice(0, Math.min(corridors.length, 2));
            
            randomCorridors.forEach(corridor => {
                if (remainingEnemies <= 0 || Math.random() > 0.4) return; // 40% chance to spawn
                
                // Spawn 1 enemy per corridor
                const count = Math.min(remainingEnemies, 1);
                this.spawnEnemiesInRoom(corridor, count, enemyTypes, scene);
                
                remainingEnemies -= count;
            });
        }
        
        console.log(`Spawned ${baseEnemyCount - remainingEnemies} enemies on floor ${this.currentFloor}`);
    }
    
    // Spawn enemies in a regular room (random positions)
    spawnEnemiesInRoom(room, count, availableEnemies, scene) {
        // Determine the room type for enemy selection
        let roomType = 'corridor';
        if (room.isSpawnRoom) {
            roomType = 'spawnRoom';
        } else if (room.roomType === 'radial') {
            roomType = 'radial';
        } else if (room.roomType === 'cardinal') {
            roomType = 'cardinal';
        } else if (!room.isCorridor) {
            roomType = 'radial'; // Default for other room types
        }
        
        // Get the appropriate enemy types for this room
        const enemyTypes = availableEnemies[roomType] || availableEnemies['radial'];
        
        for (let i = 0; i < count; i++) {
            // Get random position in room (with margin from walls)
            const margin = 2;
            const x = room.x + margin + Math.random() * (room.width - margin * 2);
            const z = room.z + margin + Math.random() * (room.height - margin * 2);
            
            // Pick random enemy type
            const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            
            // Create and spawn enemy
            this.spawnEnemy(enemyType, x, room.floorHeight + 1, z, scene);
        }
    }
    
    // Spawn enemies in cardinal rooms (center position)
    spawnEnemiesInCardinalRoom(room, count, availableEnemies, scene) {
        // Get the appropriate enemy types for cardinal rooms
        const enemyTypes = availableEnemies['cardinal'] || availableEnemies['radial'];
        
        // Get center position
        const centerX = room.x + room.width / 2;
        const centerZ = room.z + room.height / 2;
        
        for (let i = 0; i < count; i++) {
            // Pick random enemy type
            const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            
            // For multiple enemies, add slight offset from center
            let x = centerX;
            let z = centerZ;
            
            if (count > 1) {
                // Small random offset if more than one enemy
                x += (Math.random() * 2 - 1) * (room.width / 6);
                z += (Math.random() * 2 - 1) * (room.height / 6);
            }
            
            // Create and spawn enemy
            this.spawnEnemy(enemyType, x, room.floorHeight + 1, z, scene);
        }
    }
    
    // Spawn a single enemy
    spawnEnemy(enemyType, x, y, z, scene) {
        try {
            // Create the enemy from registry
            const enemy = enemyRegistry.createEnemy(enemyType, x, y, z);
            
            if (!enemy) {
                console.error(`Failed to create enemy of type ${enemyType}`);
                return null;
            }
            
            // Apply AI controller
            applyAIController(enemy);
            
            // Add enemy to scene
            scene.add(enemy.getObject());
            
            // Add to enemies list
            this.enemies.push(enemy);
            
            console.log(`Spawned ${enemyType} enemy at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
            
            return enemy;
        } catch (error) {
            console.error(`Error spawning enemy of type ${enemyType}:`, error);
            return null;
        }
    }
    
    // Update all enemies
    update(deltaTime, player, dungeon) {
        // Update each enemy
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Skip destroyed enemies
            if (!enemy || enemy.state === 'removed') {
                this.enemies.splice(i, 1);
                continue;
            }
            
            // Update enemy
            enemy.update(deltaTime, player, dungeon);
            
            // Remove dead enemies after their death animation
            if (enemy.state === 'dead' && enemy.mesh && enemy.mesh.scale.y <= 0.1) {
                const enemyObject = enemy.getObject();
                if (enemyObject && enemyObject.parent) {
                    enemyObject.parent.remove(enemyObject);
                }
                
                this.enemies.splice(i, 1);
            }
        }
    }
    
    // Get all active enemies
    getEnemies() {
        return this.enemies;
    }
    
    // Get enemy count
    getEnemyCount() {
        return this.enemies.length;
    }
    
    // Clear all enemies
    clearEnemies(scene) {
        // Remove all enemies from scene
        for (const enemy of this.enemies) {
            if (enemy && enemy.getObject() && enemy.getObject().parent) {
                enemy.getObject().parent.remove(enemy.getObject());
            }
        }
        
        // Clear array
        this.enemies = [];
        console.log('All enemies cleared');
    }
    
    // Utility: Shuffle array (Fisher-Yates algorithm)
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

// Export singleton instance
export const enemySpawner = new EnemySpawner();
