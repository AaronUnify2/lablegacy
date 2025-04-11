import { Enemy } from '../entities/enemy.js';

export class EnemyManager {
    constructor(scene, collisionManager, player) {
        this.scene = scene;
        this.collisionManager = collisionManager;
        this.player = player;
        
        // List of all enemies
        this.enemies = [];
        
        // Enemy spawn settings - simplified
        this.maxEnemies = 5;
        this.spawnDistance = {
            min: 10,
            max: 20
        };
        
        // Enemy spawn timing
        this.timeSinceLastSpawn = 0;
        
        // Debug flag - set to true to get console logs about spawning
        this.debug = true;
        
        // Force spawn a test enemy after a short delay
        if (this.debug) console.log("Enemy Manager initialized - will spawn test enemy in 3 seconds");
        
        setTimeout(() => {
            this.forceSpawnTestEnemy();
        }, 3000);
    }
    
    update(deltaTime, camera) {
        // Update spawn timer and try to spawn new enemies
        this.timeSinceLastSpawn += deltaTime;
        
        // Try to spawn new enemies if we haven't reached the maximum
        if (this.enemies.length < this.maxEnemies && this.timeSinceLastSpawn >= 5) {
            this.trySpawnEnemyAroundPlayer();
            this.timeSinceLastSpawn = 0;
        }
        
        // Update all enemies
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime, camera);
        }
        
        // Debug info occasionally
        if (this.debug && Math.random() < 0.01) {
            console.log(`Active enemies: ${this.enemies.length}/${this.maxEnemies}`);
        }
    }
    
    forceSpawnTestEnemy() {
        if (this.debug) console.log("Attempting to spawn test enemy...");
        
        // Try to spawn at a fixed position first
        const testPosition = new THREE.Vector3(0, 1, -10); // 10 units in front of origin
        
        // Try to find floor beneath
        if (this.collisionManager && typeof this.collisionManager.findFloorBelow === 'function') {
            const floorHit = this.collisionManager.findFloorBelow(testPosition, 10);
            if (floorHit && floorHit.point) {
                testPosition.y = floorHit.point.y + 0.1; // Just above floor
            }
        }
        
        // Create enemy
        const enemy = new Enemy(this.scene, testPosition, this.collisionManager, this.player);
        this.enemies.push(enemy);
        
        // Show some visual effect
        this.showSimpleSpawnEffect(testPosition);
        
        if (this.debug) console.log(`Spawned test enemy at (${testPosition.x}, ${testPosition.y}, ${testPosition.z})`);
        
        // Spawn a second test enemy at player position + offset
        setTimeout(() => {
            this.spawnEnemyNearPlayer();
        }, 2000);
    }
    
    trySpawnEnemyAroundPlayer() {
        if (this.debug) console.log("Attempting to spawn enemy around player...");
        
        // Get a random position around the player
        const spawnPosition = this.findSpawnPosition();
        
        if (!spawnPosition) {
            if (this.debug) console.log("Failed to find valid spawn position");
            return false;
        }
        
        // Create enemy
        const enemy = new Enemy(this.scene, spawnPosition, this.collisionManager, this.player);
        this.enemies.push(enemy);
        
        // Show spawn effect
        this.showSimpleSpawnEffect(spawnPosition);
        
        if (this.debug) console.log(`Spawned enemy at (${spawnPosition.x.toFixed(1)}, ${spawnPosition.y.toFixed(1)}, ${spawnPosition.z.toFixed(1)})`);
        return true;
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
            if (this.collisionManager && typeof this.collisionManager.findFloorBelow === 'function') {
                try {
                    const hit = this.collisionManager.findFloorBelow(testPosition, 20);
                    
                    if (hit && hit.point) {
                        // Found a floor, set Y position slightly above it
                        testPosition.y = hit.point.y + 0.1;
                        
                        // Check if this position is clear (no collision)
                        const collisionTest = this.collisionManager.checkCollision(testPosition, 1);
                        
                        if (!collisionTest.collides) {
                            // Found a valid position
                            return testPosition;
                        }
                    }
                } catch (error) {
                    console.warn("Error finding spawn position:", error);
                }
            } else {
                // If we don't have a working floor detection, just use a fixed Y position
                testPosition.y = playerPos.y;
                return testPosition;
            }
        }
        
        // If we get here, we couldn't find a valid position
        // As a fallback, just use player position with an offset
        const playerPos = this.player.camera.position;
        return new THREE.Vector3(
            playerPos.x + (Math.random() * 10 - 5),
            playerPos.y,
            playerPos.z + (Math.random() * 10 - 5)
        );
    }
    
    spawnEnemyNearPlayer() {
        if (this.debug) console.log("Attempting to spawn enemy near player...");
        
        // Just use player position with an offset
        const playerPos = this.player.camera.position;
        const spawnPos = new THREE.Vector3(
            playerPos.x + 5, // 5 units to the right
            playerPos.y - 1, // Slightly below eye level
            playerPos.z - 5  // 5 units in front
        );
        
        // Try to find floor beneath
        if (this.collisionManager && typeof this.collisionManager.findFloorBelow === 'function') {
            try {
                const floorHit = this.collisionManager.findFloorBelow(spawnPos, 10);
                if (floorHit && floorHit.point) {
                    spawnPos.y = floorHit.point.y + 0.1; // Just above floor
                }
            } catch (error) {
                console.warn("Error finding floor below:", error);
            }
        }
        
        // Create enemy
        const enemy = new Enemy(this.scene, spawnPos, this.collisionManager, this.player);
        this.enemies.push(enemy);
        
        // Show some visual effect
        this.showSimpleSpawnEffect(spawnPos);
        
        if (this.debug) console.log(`Spawned enemy near player at (${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)}, ${spawnPos.z.toFixed(1)})`);
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
            }
        };
        
        animate();
    }
    
    // Additional simplified methods that might be called by the game
    clear() {
        // Remove all enemies from the scene
        for (const enemy of this.enemies) {
            if (enemy.group) {
                this.scene.remove(enemy.group);
            }
        }
        this.enemies = [];
        if (this.debug) console.log("Cleared all enemies");
    }
}
