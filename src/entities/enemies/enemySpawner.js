// src/entities/enemies/enemySpawner.js - Enemy spawning system
import * as THREE from 'three';
import { EnemyType } from './enemyBase.js';
import { EnemyRegistry } from './enemyRegistry.js';

// Spawn point types
export const SpawnPointType = {
    STANDARD: 'standard',    // Regular spawn point that respawns enemies
    FIXED: 'fixed',          // One-time spawn that doesn't respawn
    BOSS: 'boss',            // Special boss spawn point
    SPECIAL: 'special'       // Special event spawn point
};

// Spawn manager class
export class EnemySpawner {
    constructor() {
        this.spawnPoints = [];
        this.activeEnemies = [];
        this.maxEnemiesPerFloor = 15; // Maximum enemies active at once
        this.respawnTime = 30; // Seconds before respawning enemies
        this.debug = false;
        
        // Configuration
        this.spawnDistributionByFloor = [
            // Floor 1-3
            {
                [EnemyType.MOB]: 1.0,
                [EnemyType.MINI_BOSS]: 0.0,
                [EnemyType.BOSS]: 0.0
            },
            // Floor 4-7
            {
                [EnemyType.MOB]: 0.8,
                [EnemyType.MINI_BOSS]: 0.2,
                [EnemyType.BOSS]: 0.0
            },
            // Floor 8+
            {
                [EnemyType.MOB]: 0.7,
                [EnemyType.MINI_BOSS]: 0.25,
                [EnemyType.BOSS]: 0.05
            }
        ];
    }
    
    // Generate spawn points for a dungeon floor
    generateSpawnPoints(dungeon, floorNumber) {
        this.spawnPoints = [];
        this.activeEnemies = [];
        
        // Create a container for the enemies in the scene
        this.enemyContainer = new THREE.Object3D();
        this.enemyContainer.name = "Enemies";
        dungeon.getObject().add(this.enemyContainer);
        
        const rooms = dungeon.getRooms();
        
        // Track how many spawn points we've created
        let spawnPointCount = 0;
        let mobCount = 0;
        let miniBossCount = 0;
        let bossCount = 0;
        
        // Determine maximum counts based on floor number
        const maxSpawnPoints = Math.min(10 + Math.floor(floorNumber * 1.5), 25);
        const maxMiniBosses = Math.floor(floorNumber / 3);
        const maxBosses = floorNumber >= 8 ? 1 : 0;
        
        console.log(`Generating up to ${maxSpawnPoints} spawn points for floor ${floorNumber}`);
        
        // Place enemies in appropriate rooms based on room type
        rooms.forEach(room => {
            // Skip corridors and very small rooms
            if (room.isCorridor || room.width < 8 || room.height < 8) return;
            
            // Get room center
            const roomCenter = {
                x: room.x + room.width / 2,
                z: room.z + room.height / 2
            };
            
            // Determine number of enemies based on room size and type
            let spawnCount = 0;
            let shouldSpawnMiniBoss = false;
            let shouldSpawnBoss = false;
            
            if (room.isSpawnRoom) {
                // No enemies in spawn room
                return;
            } else if (room.roomType === 'radial') {
                // Radial rooms have mobs and maybe mini-bosses
                spawnCount = 2 + Math.floor(Math.random() * 2);
                shouldSpawnMiniBoss = miniBossCount < maxMiniBosses && Math.random() < 0.4;
            } else if (room.roomType === 'cardinal') {
                // Cardinal rooms often have mini-bosses
                spawnCount = 1 + Math.floor(Math.random() * 2);
                shouldSpawnMiniBoss = miniBossCount < maxMiniBosses && Math.random() < 0.7;
            } else if (room.roomType === 'cardinalPlus') {
                // Cardinal+ rooms can have bosses or mini-bosses
                spawnCount = 1;
                shouldSpawnBoss = bossCount < maxBosses && Math.random() < 0.8;
                shouldSpawnMiniBoss = !shouldSpawnBoss && miniBossCount < maxMiniBosses;
            } else if (room.roomType === 'alcove') {
                // Alcoves have fewer enemies
                spawnCount = Math.random() < 0.5 ? 1 : 0;
            } else {
                // Normal rooms
                const roomArea = room.width * room.height;
                spawnCount = Math.floor(roomArea / 100) + Math.floor(Math.random() * 2);
            }
            
            // Cap total spawn points
            spawnCount = Math.min(spawnCount, maxSpawnPoints - spawnPointCount);
            
            // Create boss spawn if needed
            if (shouldSpawnBoss && bossCount < maxBosses) {
                this.createSpawnPoint({
                    position: new THREE.Vector3(roomCenter.x, room.floorHeight, roomCenter.z),
                    type: SpawnPointType.BOSS,
                    enemyType: EnemyType.BOSS,
                    respawn: false,
                    floorNumber: floorNumber
                });
                
                spawnPointCount++;
                bossCount++;
                
                // Reduce regular spawn count in boss rooms
                spawnCount = Math.max(0, spawnCount - 2);
            }
            
            // Create mini-boss spawn if needed
            if (shouldSpawnMiniBoss && miniBossCount < maxMiniBosses) {
                // Find a suitable position near the room center
                const miniBossPos = this.findSpawnPosition(room, roomCenter);
                
                this.createSpawnPoint({
                    position: new THREE.Vector3(miniBossPos.x, room.floorHeight, miniBossPos.z),
                    type: SpawnPointType.FIXED,
                    enemyType: EnemyType.MINI_BOSS,
                    respawn: false,
                    floorNumber: floorNumber
                });
                
                spawnPointCount++;
                miniBossCount++;
                
                // Reduce regular spawn count in mini-boss rooms
                spawnCount = Math.max(0, spawnCount - 1);
            }
            
            // Create regular spawn points
            for (let i = 0; i < spawnCount; i++) {
                // Find a suitable position
                const spawnPos = this.findSpawnPosition(room, roomCenter);
                
                this.createSpawnPoint({
                    position: new THREE.Vector3(spawnPos.x, room.floorHeight, spawnPos.z),
                    type: SpawnPointType.STANDARD,
                    enemyType: EnemyType.MOB,
                    respawn: true,
                    floorNumber: floorNumber
                });
                
                spawnPointCount++;
                mobCount++;
                
                // Stop if we've reached the maximum
                if (spawnPointCount >= maxSpawnPoints) break;
            }
        });
        
        console.log(`Generated ${spawnPointCount} spawn points: ${mobCount} mobs, ${miniBossCount} mini-bosses, ${bossCount} bosses`);
        
        return this.spawnPoints;
    }
    
    // Find a suitable spawn position in a room
    findSpawnPosition(room, roomCenter) {
        const margin = 2; // Distance from walls
        
        // Start with a position near the center
        const centerWeight = 0.3; // How much to weight toward center vs random
        
        // Calculate random position with center weighting
        const randomX = room.x + margin + Math.random() * (room.width - margin * 2);
        const randomZ = room.z + margin + Math.random() * (room.height - margin * 2);
        
        return {
            x: randomX * (1 - centerWeight) + roomCenter.x * centerWeight,
            z: randomZ * (1 - centerWeight) + roomCenter.z * centerWeight
        };
    }
    
    // Create a spawn point
    createSpawnPoint(options) {
        const spawnPoint = {
            position: options.position || new THREE.Vector3(),
            type: options.type || SpawnPointType.STANDARD,
            enemyType: options.enemyType || EnemyType.MOB,
            respawn: options.respawn !== undefined ? options.respawn : true,
            respawnTime: options.respawnTime || this.respawnTime,
            respawnTimer: 0,
            hasSpawned: false,
            enemy: null,
            floorNumber: options.floorNumber || 1,
            active: true
        };
        
        this.spawnPoints.push(spawnPoint);
        return spawnPoint;
    }
    
    // Spawn enemies based on player position
    update(deltaTime, player, scene, dungeon) {
        const playerPos = player.getPosition();
        
        // Update each spawn point
        this.spawnPoints.forEach(spawnPoint => {
            // Skip inactive spawn points
            if (!spawnPoint.active) return;
            
            // If spawn point has an enemy, check if it's still alive
            if (spawnPoint.enemy) {
                if (spawnPoint.enemy.isDead) {
                    // Clear reference to dead enemy
                    spawnPoint.enemy = null;
                    
                    // Start respawn timer if this point respawns
                    if (spawnPoint.respawn) {
                        spawnPoint.respawnTimer = spawnPoint.respawnTime;
                    } else {
                        // Deactivate non-respawning points
                        spawnPoint.active = false;
                    }
                }
            } else {
                // No active enemy, check if we should spawn one
                
                // If it's already spawned once and doesn't respawn, skip
                if (spawnPoint.hasSpawned && !spawnPoint.respawn) return;
                
                // If respawn timer is active, count it down
                if (spawnPoint.respawnTimer > 0) {
                    spawnPoint.respawnTimer -= deltaTime;
                    return;
                }
                
                // Check if we're under the enemy limit
                if (this.activeEnemies.length >= this.maxEnemiesPerFloor) return;
                
                // Check player distance for spawning
                const distToPlayer = this.distanceTo(playerPos, spawnPoint.position);
                
                // Only spawn if player is in a reasonable range (not too close or too far)
                const minSpawnDistance = 10; // Minimum distance to spawn enemies
                const maxSpawnDistance = 50; // Maximum distance to consider spawning
                
                if (distToPlayer > minSpawnDistance && distToPlayer < maxSpawnDistance) {
                    // Chance to spawn based on distance (more likely when further from spawn point)
                    const spawnChance = 0.1 + ((distToPlayer - minSpawnDistance) / (maxSpawnDistance - minSpawnDistance)) * 0.9;
                    
                    if (Math.random() < spawnChance * deltaTime * 2) { // Adjust for framerate
                        this.spawnEnemy(spawnPoint, scene);
                    }
                }
            }
        });
        
        // Clean up any dead enemies from the array
        this.activeEnemies = this.activeEnemies.filter(enemy => !enemy.isDead);
    }
    
    // Spawn an enemy at a spawn point
    spawnEnemy(spawnPoint, scene) {
        // Determine which enemy to spawn
        let enemyId = "";
        
        // Get available enemies based on enemy type and floor
        const availableEnemies = EnemyRegistry.getEnemiesByType(
            spawnPoint.enemyType,
            spawnPoint.floorNumber
        );
        
        if (availableEnemies.length === 0) {
            console.warn(`No ${spawnPoint.enemyType} enemies available for floor ${spawnPoint.floorNumber}`);
            return null;
        }
        
        // Choose a random enemy from the available ones
        enemyId = availableEnemies[Math.floor(Math.random() * availableEnemies.length)].id;
        
        // Create the enemy
        const enemy = EnemyRegistry.createEnemy(enemyId, {
            level: spawnPoint.floorNumber,
            position: spawnPoint.position.clone()
        });
        
        if (!enemy) {
            console.error(`Failed to create enemy ${enemyId}`);
            return null;
        }
        
        // Initialize enemy
        enemy.init();
        
        // Add to scene
        if (this.enemyContainer) {
            this.enemyContainer.add(enemy.getObject());
        } else {
            scene.add(enemy.getObject());
        }
        
        // Update spawn point
        spawnPoint.enemy = enemy;
        spawnPoint.hasSpawned = true;
        
        // Add to active enemies
        this.activeEnemies.push(enemy);
        
        if (this.debug) {
            console.log(`Spawned ${enemy.name} at position:`, spawnPoint.position);
        }
        
        return enemy;
    }
    
    // Handle floor transition - clean up all enemies
    onFloorChange() {
        // Remove all enemies
        this.activeEnemies.forEach(enemy => {
            if (enemy.getObject().parent) {
                enemy.getObject().parent.remove(enemy.getObject());
            }
        });
        
        // Clear arrays
        this.activeEnemies = [];
        this.spawnPoints = [];
        
        if (this.enemyContainer && this.enemyContainer.parent) {
            this.enemyContainer.parent.remove(this.enemyContainer);
            this.enemyContainer = null;
        }
    }
    
    // Get all active enemies
    getActiveEnemies() {
        return this.activeEnemies;
    }
    
    // Calculate distance between points
    distanceTo(pointA, pointB) {
        return Math.sqrt(
            Math.pow(pointA.x - pointB.x, 2) +
            Math.pow(pointA.z - pointB.z, 2)
        );
    }
    
    // Toggle debug mode
    setDebug(enabled) {
        this.debug = enabled;
    }
}

// Create a singleton instance
export const enemySpawner = new EnemySpawner();
