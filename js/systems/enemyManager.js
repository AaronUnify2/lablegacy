import { Enemy } from '../entities/enemy.js';

export class EnemyManager {
    constructor(scene, collisionManager, player) {
        this.scene = scene;
        this.collisionManager = collisionManager;
        this.player = player;
        
        // List of all enemies
        this.enemies = [];
        
        // Enemy spawn settings
        this.maxEnemies = 5;
        this.spawnDistance = {
            min: 10,
            max: 20
        };
        
        // Debug flag - set to true to get console logs about spawning
        this.debug = true;
        
        // Collision settings
        this.enableCollisions = true; // Master toggle for enemy collisions
        
        // Safety check interval - periodically check if enemies are in valid positions
        this.safetyCheckInterval = 5; // Check every 5 seconds
        this.timeSinceLastCheck = 0;
        
        // Force spawn test enemies after a short delay
        if (this.debug) console.log("Enemy Manager initialized - will spawn test enemies in a few seconds");
        
        // Spawn multiple enemies for testing
        this.spawnTestEnemies();
    }
    
    update(deltaTime, camera) {
        // Update all enemies with validated deltaTime
        const validDeltaTime = (deltaTime && deltaTime < 1) ? deltaTime : 0.016; // Use 16ms as fallback
        
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (enemy) {
                // Set collision status based on master toggle
                enemy.collisionEnabled = this.enableCollisions;
                
                // Update enemy
                enemy.update(validDeltaTime, camera);
            }
        }
        
        // Periodically run safety checks
        this.timeSinceLastCheck += validDeltaTime;
        if (this.timeSinceLastCheck >= this.safetyCheckInterval) {
            this.performSafetyChecks();
            this.timeSinceLastCheck = 0;
        }
    }
    
    performSafetyChecks() {
        if (this.debug) console.log("Performing enemy safety checks...");
        
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (!enemy) continue;
            
            // Check if enemy is in a valid position
            if (this.collisionManager) {
                // Check if enemy is stuck in a collision
                const collision = this.collisionManager.checkCollision(
                    enemy.group.position, 
                    enemy.collisionRadius
                );
                
                if (collision.collides) {
                    if (this.debug) console.log(`Enemy ${i} is stuck in collision, resetting position`);
                    enemy.resetToLastValidPosition();
                }
                
                // Check if enemy is floating (no ground beneath)
                const groundCheck = new THREE.Vector3(
                    enemy.group.position.x,
                    enemy.group.position.y - 1,
                    enemy.group.position.z
                );
                
                const groundHit = this.collisionManager.findFloorBelow(groundCheck, 5);
                if (!groundHit) {
                    if (this.debug) console.log(`Enemy ${i} is floating, resetting position`);
                    enemy.resetToLastValidPosition();
                }
            }
        }
    }
    
    spawnTestEnemies() {
        // Spawn first test enemy immediately
        setTimeout(() => this.forceSpawnTestEnemy(), 1000);
        
        // Spawn second enemy with a delay
        setTimeout(() => this.spawnEnemyNearPlayer(), 3000);
        
        // Spawn a few more enemies around the map
        setTimeout(() => {
            // Try to spawn in different locations
            this.spawnEnemyAtPosition(new THREE.Vector3(-10, 1, 10), 4, 0.4);
            this.spawnEnemyAtPosition(new THREE.Vector3(10, 1, -10), 6, 0.3);
        }, 5000);
    }
    
    forceSpawnTestEnemy() {
        if (this.debug) console.log("Attempting to spawn test enemy...");
        
        // Try to spawn at a fixed position relative to origin
        const testPosition = new THREE.Vector3(10, 1, 0); // 10 units to the right of origin
        
        // Try to find floor beneath
        if (this.collisionManager && typeof this.collisionManager.findFloorBelow === 'function') {
            const floorHit = this.collisionManager.findFloorBelow(testPosition, 10);
            if (floorHit && floorHit.point) {
                testPosition.y = floorHit.point.y + 0.9; // Just above floor
                if (this.debug) console.log("Found floor at y:", floorHit.point.y);
            }
        }
        
        // Check for collision at spawn point
        if (this.collisionManager) {
            const collision = this.collisionManager.checkCollision(testPosition, 0.5);
            if (collision.collides) {
                if (this.debug) console.log("Spawn point has collision, adjusting position");
                // Try to find a nearby valid position
                testPosition.x += 2;
                testPosition.z += 2;
            }
        }
        
        // Create enemy
        const enemy = new Enemy(this.scene, testPosition, this.collisionManager, this.player);
        this.enemies.push(enemy);
        
        // Show some visual effect
        this.showSimpleSpawnEffect(testPosition);
        
        if (this.debug) console.log(`Spawned test enemy at (${testPosition.x}, ${testPosition.y}, ${testPosition.z})`);
    }
    
    spawnEnemyNearPlayer() {
        if (this.debug) console.log("Attempting to spawn enemy near player...");
        
        // Get player position
        const playerPos = this.player.camera.position;
        
        // Spawn position a bit off from player
        const spawnPos = new THREE.Vector3(
            playerPos.x + 8, // 8 units to the right
            playerPos.y, // Same height as player
            playerPos.z + 8  // 8 units in front
        );
        
        // Try to find floor beneath
        if (this.collisionManager && typeof this.collisionManager.findFloorBelow === 'function') {
            const floorHit = this.collisionManager.findFloorBelow(spawnPos, 10);
            if (floorHit && floorHit.point) {
                spawnPos.y = floorHit.point.y + 0.9; // Just above floor
                if (this.debug) console.log("Found floor at y:", floorHit.point.y);
            }
        }
        
        // Check for collision at spawn point
        if (this.collisionManager) {
            const collision = this.collisionManager.checkCollision(spawnPos, 0.5);
            if (collision.collides) {
                if (this.debug) console.log("Spawn point has collision, adjusting position");
                // Try to find a nearby valid position
                spawnPos.x += 2;
                spawnPos.z += 2;
            }
        }
        
        // Create enemy
        const enemy = new Enemy(this.scene, spawnPos, this.collisionManager, this.player);
        
        // Set different patrol radius for this enemy
        enemy.patrolRadius = 5; // Larger patrol radius
        enemy.patrolSpeed = 0.7; // Faster patrol speed
        
        this.enemies.push(enemy);
        
        // Show some visual effect
        this.showSimpleSpawnEffect(spawnPos);
        
        if (this.debug) console.log(`Spawned enemy near player at (${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z})`);
    }
    
    spawnEnemyAtPosition(position, patrolRadius, patrolSpeed) {
        if (this.debug) console.log(`Attempting to spawn enemy at position: (${position.x}, ${position.y}, ${position.z})`);
        
        const spawnPos = position.clone();
        
        // Try to find floor beneath
        if (this.collisionManager && typeof this.collisionManager.findFloorBelow === 'function') {
            const floorHit = this.collisionManager.findFloorBelow(spawnPos, 10);
            if (floorHit && floorHit.point) {
                spawnPos.y = floorHit.point.y + 0.9; // Just above floor
                if (this.debug) console.log("Found floor at y:", floorHit.point.y);
            }
        }
        
        // Check for collision at spawn point
        if (this.collisionManager) {
            const collision = this.collisionManager.checkCollision(spawnPos, 0.5);
            if (collision.collides) {
                if (this.debug) console.log("Spawn point has collision, adjusting position");
                // Try to find a nearby valid position
                spawnPos.x += 2;
                spawnPos.z += 2;
            }
        }
        
        // Create enemy
        const enemy = new Enemy(this.scene, spawnPos, this.collisionManager, this.player);
        
        // Set patrol parameters if provided
        if (patrolRadius !== undefined) {
            enemy.patrolRadius = patrolRadius;
        }
        
        if (patrolSpeed !== undefined) {
            enemy.patrolSpeed = patrolSpeed;
        }
        
        this.enemies.push(enemy);
        
        // Show some visual effect
        this.showSimpleSpawnEffect(spawnPos);
        
        if (this.debug) console.log(`Spawned enemy at custom position (${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z})`);
        
        return enemy; // Return the enemy for further configuration
    }
    
    showSimpleSpawnEffect(position) {
        // Create a simple sphere that expands and fades out
        const effectGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const effectMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.7,
            wireframe: true
        });
        
        const effect = new THREE.Mesh(effectGeometry, effectMaterial);
        effect.position.copy(position);
        this.scene.add(effect);
        
        // Simple animation
        const duration = 1000; // 1 second
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale up
            const scale = 1 + progress * 3;
            effect.scale.set(scale, scale, scale);
            
            // Fade out
            effect.material.opacity = 0.7 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove when done
                this.scene.remove(effect);
                if (effect.material) {
                    effect.material.dispose();
                }
                if (effect.geometry) {
                    effect.geometry.dispose();
                }
            }
        };
        
        animate();
    }
    
    // Add a method to damage enemies in an area (for staff attacks)
    damageEnemiesInRadius(position, radius, damage) {
        let hitCount = 0;
        
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (enemy && enemy.state !== 'dead') {
                // Calculate distance to enemy
                const distance = position.distanceTo(enemy.group.position);
                
                // If within radius, apply damage
                if (distance <= radius) {
                    if (this.debug) console.log(`Enemy hit! Distance: ${distance.toFixed(2)}`);
                    
                    // We would apply damage here if we had a health system
                    // For now, just log and count the hit
                    hitCount++;
                    
                    // Visual feedback - make the enemy flash
                    if (enemy.bodyMesh && enemy.bodyMesh.material) {
                        const originalColor = enemy.bodyMesh.material.color.clone();
                        enemy.bodyMesh.material.color.set(0xffffff);
                        
                        // Reset after a short delay
                        setTimeout(() => {
                            if (enemy.bodyMesh && enemy.bodyMesh.material) {
                                enemy.bodyMesh.material.color.copy(originalColor);
                            }
                        }, 200);
                    }
                }
            }
        }
        
        return hitCount;
    }
    
    // Toggle collisions for all enemies
    toggleCollisions(enabled) {
        this.enableCollisions = enabled !== undefined ? enabled : !this.enableCollisions;
        
        if (this.debug) {
            console.log(`Enemy collisions ${this.enableCollisions ? 'enabled' : 'disabled'}`);
        }
        
        return this.enableCollisions;
    }
    
    // Clear all enemies
    clear() {
        // Remove all enemies from the scene
        for (const enemy of this.enemies) {
            if (enemy && enemy.group) {
                this.scene.remove(enemy.group);
            }
        }
        this.enemies = [];
        if (this.debug) console.log("Cleared all enemies");
    }
}
