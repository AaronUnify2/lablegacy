import { Enemy } from '../entities/enemy.js';

export class EnemyManager {
    constructor(scene, collisionManager, player) {
        this.scene = scene;
        this.collisionManager = collisionManager;
        this.player = player;
        
        // List of all enemies
        this.enemies = [];
        
        // Modified spawn settings
        this.maxEnemies = 100; // Increased from 5
        this.spawnDistance = {
            min: 10,
            max: 50 // Increased max spawn distance
        };
        
        // Spawn timing
        this.timeSinceStart = 0;
        this.initialSpawnTriggered = false;
        
        console.log("Enemy Manager initialized");
    }
    
    update(deltaTime, camera) {
        // Track time since game start
        this.timeSinceStart += deltaTime;
        
        // Trigger massive spawn at 20 seconds
        if (!this.initialSpawnTriggered && this.timeSinceStart >= 20) {
            this.massSpawnEnemies(20);
            this.initialSpawnTriggered = true;
        }
        
        // Update all enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Update enemy
            enemy.update(deltaTime, camera);
            
            // Remove dead enemies that have completed their death animation
            if (enemy.state === 'dead' && enemy.group.position.y < -10) {
                this.enemies.splice(i, 1);
            }
        }
    }
    
    massSpawnEnemies(count) {
        console.log(`Spawning ${count} enemies simultaneously...`);
        
        for (let i = 0; i < count; i++) {
            const spawnPosition = this.findSpawnPosition();
            
            if (spawnPosition) {
                const enemy = new Enemy(
                    this.scene, 
                    spawnPosition, 
                    this.collisionManager, 
                    this.player
                );
                this.enemies.push(enemy);
                
                // Optional: Add a staggered spawn effect
                setTimeout(() => {
                    this.showSpawnEffect(spawnPosition);
                }, i * 100); // Small delay between spawn effects
            } else {
                console.warn(`Could not find spawn position for enemy ${i + 1}`);
            }
        }
        
        console.log(`Total enemies spawned: ${this.enemies.length}`);
    }
    
    // Rest of the methods remain the same as in the original implementation
    findSpawnPosition() {
        const maxAttempts = 20; // Increased attempts for more spawn locations
        
        for (let i = 0; i < maxAttempts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = this.spawnDistance.min + 
                Math.random() * (this.spawnDistance.max - this.spawnDistance.min);
            
            const playerPos = this.player.camera.position;
            const spawnX = playerPos.x + Math.cos(angle) * distance;
            const spawnZ = playerPos.z + Math.sin(angle) * distance;
            
            const testPosition = new THREE.Vector3(spawnX, playerPos.y + 10, spawnZ);
            
            const hit = this.collisionManager.findFloorBelow(testPosition, 20);
            
            if (hit && hit.collider) {
                testPosition.y = hit.point.y + 0.1;
                
                const collisionTest = this.collisionManager.checkCollision(testPosition, 1);
                
                if (!collisionTest.collides) {
                    return testPosition;
                }
            }
        }
        
        return null;
    }
}
