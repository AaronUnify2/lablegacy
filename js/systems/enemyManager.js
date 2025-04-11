import { Enemy } from '../entities/enemy.js';

export class EnemyManager {
    constructor(scene, collisionManager, player) {
        this.scene = scene;
        this.collisionManager = collisionManager;
        this.player = player;
        
        // List of all enemies
        this.enemies = [];
        
        // Enemy spawn settings
        this.maxEnemies = 5; // Maximum number of enemies at once
        this.spawnDistance = {
            min: 10, // Minimum spawn distance from player
            max: 30  // Maximum spawn distance from player
        };
        
        // Enemy spawn timing
        this.timeSinceLastSpawn = 0;
        this.spawnCooldown = 15; // Seconds between spawn attempts
    }
    
    update(deltaTime, camera) {
        // Update spawn timer
        this.timeSinceLastSpawn += deltaTime;
        
        // Spawn new enemies if needed
        this.trySpawnEnemy(deltaTime);
        
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
    
    trySpawnEnemy(deltaTime) {
        // Don't spawn if we've reached max enemies
        if (this.enemies.length >= this.maxEnemies) {
            return;
        }
        
        // Check if we should attempt to spawn
        if (this.timeSinceLastSpawn < this.spawnCooldown) {
            return;
        }
        
        // Reset timer
        this.timeSinceLastSpawn = 0;
        
        // Find a valid spawn position
        const spawnPosition = this.findSpawnPosition();
        if (!spawnPosition) {
            // If no valid position found, try again soon but not immediately
            this.timeSinceLastSpawn = this.spawnCooldown * 0.8;
            return;
        }
        
        // Create a new enemy
        const enemy = new Enemy(this.scene, spawnPosition, this.collisionManager, this.player);
        this.enemies.push(enemy);
        
        // Show spawn effect
        this.showSpawnEffect(spawnPosition);
        
        console.log(`Spawned enemy at (${spawnPosition.x.toFixed(2)}, ${spawnPosition.y.toFixed(2)}, ${spawnPosition.z.toFixed(2)})`);
    }
    
    findSpawnPosition() {
        // Try multiple positions to find a valid spawn point
        const maxAttempts = 10;
        
        for (let i = 0; i < maxAttempts; i++) {
            // Get a random direction from the player
            const angle = Math.random() * Math.PI * 2;
            const distance = this.spawnDistance.min + 
                Math.random() * (this.spawnDistance.max - this.spawnDistance.min);
            
            // Calculate spawn position
            const playerPos = this.player.camera.position;
            const spawnX = playerPos.x + Math.cos(angle) * distance;
            const spawnZ = playerPos.z + Math.sin(angle) * distance;
            
            // Start from above ground to find a valid Y position
            const testPosition = new THREE.Vector3(spawnX, playerPos.y + 10, spawnZ);
            
            // Find floor beneath this position
            const hit = this.collisionManager.findFloorBelow(testPosition, 20);
            
            if (hit && hit.collider) {
                // Found a floor, set Y position slightly above it
                testPosition.y = hit.point.y + 0.1;
                
                // Check if this position is clear (no collision)
                const collisionTest = this.collisionManager.checkCollision(testPosition, 1);
                
                if (!collisionTest.collides) {
                    // Found a valid position
                    return testPosition;
                }
            }
        }
        
        // If we get here, we couldn't find a valid position
        return null;
    }
    
    showSpawnEffect(position) {
        // Create portal effect
        const portalGeometry = new THREE.RingGeometry(0, 1.5, 20, 1);
        const portalMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        portal.position.copy(position);
        portal.position.y += 0.1; // Slightly above ground
        portal.rotation.x = Math.PI / 2; // Horizontal ring
        
        this.scene.add(portal);
        
        // Create light flash
        const light = new THREE.PointLight(0xff3300, 3, 10);
        light.position.copy(position);
        light.position.y += 1;
        
        this.scene.add(light);
        
        // Animate portal
        const duration = 1000; // 1 second
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale up
            portal.scale.set(1 + progress, 1 + progress, 1 + progress);
            
            // Fade out
            portal.material.opacity = 0.7 * (1 - progress);
            
            // Animate light
            if (light) {
                light.intensity = 3 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove portal and light when animation is complete
                this.scene.remove(portal);
                this.scene.remove(light);
            }
        };
        
        animate();
    }
    
    // Get the closest enemy to a position within a certain range
    getClosestEnemy(position, maxRange = Infinity) {
        let closest = null;
        let closestDistance = maxRange;
        
        for (const enemy of this.enemies) {
            // Skip dead enemies
            if (enemy.state === 'dead') continue;
            
            const distance = enemy.position.distanceTo(position);
            if (distance < closestDistance) {
                closest = enemy;
                closestDistance = distance;
            }
        }
        
        return closest;
    }
    
    // Damage enemies within a radius of a position
    damageEnemiesInRadius(position, radius, damage) {
        let hitCount = 0;
        
        for (const enemy of this.enemies) {
            // Skip dead enemies
            if (enemy.state === 'dead') continue;
            
            const distance = enemy.position.distanceTo(position);
            if (distance <= radius) {
                enemy.takeDamage(damage);
                hitCount++;
            }
        }
        
        return hitCount;
    }
    
    // Clean up all enemies (e.g., when changing levels)
    clear() {
        for (const enemy of this.enemies) {
            if (enemy.colliderIndex !== undefined) {
                this.collisionManager.removeCollider(enemy.colliderIndex);
            }
            
            if (enemy.group && this.scene) {
                this.scene.remove(enemy.group);
            }
        }
        
        this.enemies = [];
    }
}
