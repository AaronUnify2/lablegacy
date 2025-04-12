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
        this.enemyColliders = []; // Array to store enemy collider indices
        
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
                
                // Update enemy collider position in the collision manager
                this.updateEnemyCollider(i);
            }
        }
        
        // Periodically run safety checks
        this.timeSinceLastCheck += validDeltaTime;
        if (this.timeSinceLastCheck >= this.safetyCheckInterval) {
            this.performSafetyChecks();
            this.timeSinceLastCheck = 0;
        }
    }
    
    // Update the collider for an enemy
    updateEnemyCollider(index) {
        const enemy = this.enemies[index];
        if (!enemy || !enemy.group) return;
        
        // Enemy collider index might be different from the enemy index
        const colliderIndex = this.enemyColliders[index];
        if (colliderIndex !== undefined && this.collisionManager) {
            this.collisionManager.updateCollider(colliderIndex);
        }
    }
    
    performSafetyChecks() {
        if (this.debug) console.log("Performing enemy safety checks...");
        
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (!enemy) continue;
            
            // Check if enemy is in a valid position
            if (this.collisionManager) {
                // Check if enemy is stuck in a collision (with environment, not other enemies)
                const collision = this.collisionManager.checkCollision(
                    enemy.group.position, 
                    enemy.collisionRadius
                );
                
                // Ignore collisions with enemies themselves by checking object type
                const collidesWithEnvironment = 
                    collision.collides && 
                    collision.collider && 
                    !this.isEnemyCollider(collision.collider.object);
                
                if (collidesWithEnvironment) {
                    if (this.debug) console.log(`Enemy ${i} is stuck in collision, trying to adjust`);
                    // First try to adjust vertically
                    this.tryAdjustEnemyHeight(enemy);
                    
                    // If still colliding, reset to last valid position
                    const stillColliding = this.collisionManager.checkCollision(
                        enemy.group.position, 
                        enemy.collisionRadius
                    ).collides;
                    
                    if (stillColliding) {
                        enemy.resetToLastValidPosition();
                    }
                }
                
                // Check if enemy is floating or needs ground adjustment
                this.checkAndAdjustToGround(enemy);
            }
        }
    }
    
    // Try to adjust enemy height if stuck
    tryAdjustEnemyHeight(enemy) {
        if (!enemy || !this.collisionManager) return;
        
        // Try raising the enemy up by increments
        let attempts = 0;
        const stepSize = 0.1;
        const maxSteps = 5;
        
        while (attempts < maxSteps) {
            // Raise position
            enemy.group.position.y += stepSize;
            
            // Check if still colliding
            const stillColliding = this.collisionManager.checkCollision(
                enemy.group.position,
                enemy.collisionRadius
            ).collides;
            
            if (!stillColliding) {
                // Found valid position
                enemy.lastValidPosition.copy(enemy.group.position);
                if (this.debug) console.log(`Adjusted enemy to Y: ${enemy.group.position.y}`);
                return true;
            }
            
            attempts++;
        }
        
        return false;
    }
    
    // Check and adjust enemy to ground if needed
    checkAndAdjustToGround(enemy) {
        if (!enemy || !this.collisionManager) return;
        
        // Get position slightly below enemy feet
        const groundCheckPosition = enemy.group.position.clone();
        groundCheckPosition.y -= 0.2; // Check slightly below
        
        // Check for ground
        const groundHit = this.collisionManager.findFloorBelow(groundCheckPosition, 2);
        
        if (!groundHit || !groundHit.point) {
            // No ground beneath, try to find ground below
            const highCheck = enemy.group.position.clone();
            highCheck.y += 5; // Start high above
            
            const floorBelow = this.collisionManager.findFloorBelow(highCheck, 10);
            if (floorBelow && floorBelow.point) {
                // Found floor, place enemy on it
                enemy.group.position.y = floorBelow.point.y;
                enemy.lastValidPosition.copy(enemy.group.position);
                if (this.debug) console.log(`Enemy adjusted to floor at Y: ${floorBelow.point.y}`);
            } else {
                // No floor found, try to use a fallback height
                if (this.player && this.player.camera) {
                    const playerFootY = this.player.camera.position.y - 1.5;
                    enemy.group.position.y = playerFootY;
                    enemy.lastValidPosition.copy(enemy.group.position);
                    if (this.debug) console.log(`Enemy adjusted to player-based Y: ${playerFootY}`);
                }
            }
        } else {
            // Found ground, check if we need to adjust
            const currentY = enemy.group.position.y;
            const groundY = groundHit.point.y;
            const difference = Math.abs(currentY - groundY);
            
            // If enemy is floating more than a small amount, adjust to ground
            const floatThreshold = 0.2;
            if (difference > floatThreshold && currentY > groundY) {
                enemy.group.position.y = groundY;
                enemy.lastValidPosition.copy(enemy.group.position);
                if (this.debug) console.log(`Enemy adjusted from floating, now at Y: ${groundY}`);
            }
        }
    }
    
    // Helper to check if a collider belongs to an enemy
    isEnemyCollider(object) {
        for (const enemy of this.enemies) {
            if (enemy && enemy.group && (object === enemy.group || object.parent === enemy.group)) {
                return true;
            }
        }
        return false;
    }
    
    spawnTestEnemies() {
        // Spawn first test enemy immediately
        setTimeout(() => this.forceSpawnTestEnemy(), 1000);
        
        // Spawn second enemy with a delay
        setTimeout(() => this.spawnEnemyNearPlayer(), 3000);
        
        // Spawn a few more enemies around the map
        setTimeout(() => {
            // Try to spawn in different locations
            this.spawnEnemyAtPosition(new THREE.Vector3(-10, 1.5, 10), 4, 0.4);
            this.spawnEnemyAtPosition(new THREE.Vector3(10, 1.5, -10), 6, 0.3);
        }, 5000);
    }
    
    forceSpawnTestEnemy() {
        if (this.debug) console.log("Attempting to spawn test enemy...");
        
        // Start position slightly above ground - enemy handles finding floor
        let testPosition = new THREE.Vector3(10, 1.5, 0); // Default position
        
        // Try to find player Y position if available as a reference
        if (this.player && this.player.camera) {
            // Use player's height as reference for more reliable spawning
            testPosition.y = this.player.camera.position.y - 1.1; // Bit below player eye level
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
        const enemyIndex = this.enemies.push(enemy) - 1; // Add to enemies array and get index
        
        // Add enemy to collision system
        this.addEnemyToCollisionSystem(enemy, enemyIndex);
        
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
            playerPos.y - 1.1, // Just below player eye level
            playerPos.z + 8  // 8 units in front
        );
        
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
        
        const enemyIndex = this.enemies.push(enemy) - 1; // Add to enemies array and get index
        
        // Add enemy to collision system
        this.addEnemyToCollisionSystem(enemy, enemyIndex);
        
        // Show some visual effect
        this.showSimpleSpawnEffect(spawnPos);
        
        if (this.debug) console.log(`Spawned enemy near player at (${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z})`);
    }
    
    spawnEnemyAtPosition(position, patrolRadius, patrolSpeed) {
        if (this.debug) console.log(`Attempting to spawn enemy at position: (${position.x}, ${position.y}, ${position.z})`);
        
        const spawnPos = position.clone();
        
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
        
        const enemyIndex = this.enemies.push(enemy) - 1; // Add to enemies array and get index
        
        // Add enemy to collision system
        this.addEnemyToCollisionSystem(enemy, enemyIndex);
        
        // Show some visual effect
        this.showSimpleSpawnEffect(spawnPos);
        
        if (this.debug) console.log(`Spawned enemy at custom position (${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z})`);
        
        return enemy; // Return the enemy for further configuration
    }
    
    // Add an enemy to the collision system
    addEnemyToCollisionSystem(enemy, enemyIndex) {
        if (!this.collisionManager || !enemy || !enemy.group) return;
        
        // Create a box for this enemy's body
        const colliderIndex = this.collisionManager.addCollider(enemy.group, 'cylinder');
        
        // Store the collider index
        this.enemyColliders[enemyIndex] = colliderIndex;
        
        // Tag the collider as an enemy for special handling
        if (this.collisionManager.colliders[colliderIndex]) {
            this.collisionManager.colliders[colliderIndex].isEnemy = true;
            
            // Add userData tag to the object
            enemy.group.userData = enemy.group.userData || {};
            enemy.group.userData.isEnemy = true;
        }
        
        return colliderIndex;
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
        // Remove colliders from collision system first
        if (this.collisionManager) {
            for (let i = 0; i < this.enemyColliders.length; i++) {
                const colliderIndex = this.enemyColliders[i];
                if (colliderIndex !== undefined) {
                    this.collisionManager.removeCollider(colliderIndex);
                }
            }
        }
        
        // Clear collider indices
        this.enemyColliders = [];
        
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
                
