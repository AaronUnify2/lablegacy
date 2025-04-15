import { Enemy } from '../entities/enemy.js';
import { KingCylindar } from '../entities/KingCylindar.js';
import { ShadowCrawler } from '../entities/ShadowCrawler.js';

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
                    
                    // Apply damage to the enemy
                    const killed = enemy.takeDamage(damage);
                    hitCount++;
                    
                    if (killed && this.debug) {
                        console.log("Enemy was killed by this hit!");
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
    
    //=============================================================================
    // KING CYLINDAR METHODS
    //=============================================================================
    
    // Method to spawn a King Cylindar in a specific room
    spawnKingCylindarInRoom(room) {
        if (this.debug) console.log(`Attempting to spawn King Cylindar in ${room.type} room`);
        
        // Calculate spawn position in the center of the room
        const spawnPos = new THREE.Vector3(
            room.x + room.width / 2,
            1.0, // Start slightly above ground level
            room.y + room.height / 2
        );
        
        // Try to find floor beneath
        if (this.collisionManager && typeof this.collisionManager.findFloorBelow === 'function') {
            const floorHit = this.collisionManager.findFloorBelow(spawnPos, 10);
            if (floorHit && floorHit.point) {
                spawnPos.y = floorHit.point.y + 4.5; // Position at half height of King Cylindar
                if (this.debug) console.log("Found floor at y:", floorHit.point.y);
            }
        }
        
        // Create King Cylindar instance
        const kingCylindar = new KingCylindar(this.scene, spawnPos, this.collisionManager, this.player);
        
        // Set room-specific parameters if needed
        kingCylindar.patrolCenter = spawnPos.clone();
        kingCylindar.patrolRadius = room.width / 4; // Patrol within a quarter of the room width
        
        const enemyIndex = this.enemies.push(kingCylindar) - 1; // Add to enemies array and get index
        
        // Add enemy to collision system
        this.addEnemyToCollisionSystem(kingCylindar, enemyIndex);
        
        // Show dramatic spawn effect
        this.showKingCylindarSpawnEffect(spawnPos);
        
        if (this.debug) console.log(`Spawned King Cylindar in ${room.type} room at (${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z})`);
        
        return kingCylindar;
    }
    
    // Create a dramatic spawn effect for King Cylindar
    showKingCylindarSpawnEffect(position) {
        // Create a dramatic energy gathering effect
        const particleCount = 20;
        const particles = [];
        
        // Create converging particles that flow into the spawn point
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * 10;
            const height = Math.random() * 10 - 5;
            
            // Position in a circle around spawn point
            const particlePos = new THREE.Vector3(
                position.x + Math.cos(angle) * radius,
                position.y + height,
                position.z + Math.sin(angle) * radius
            );
            
            // Create particle
            const geometry = new THREE.SphereGeometry(0.3, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0x3366ff,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(particlePos);
            
            // Calculate direction to spawn point
            const direction = new THREE.Vector3().subVectors(position, particlePos).normalize();
            
            // Random speed
            const speed = 0.05 + Math.random() * 0.1;
            particle.velocity = direction.multiplyScalar(speed);
            
            // Set lifetime
            particle.lifetime = 1 + Math.random() * 2;
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Create central energy ball that grows then explodes
        const coreGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0x66ccff,
            transparent: true,
            opacity: 0.9
        });
        
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.copy(position);
        this.scene.add(core);
        
        // Add a light at the spawn point
        const light = new THREE.PointLight(0x3366ff, 2, 20);
        light.position.copy(position);
        this.scene.add(light);
        
        // Animate the spawn effect
        const duration = 4.0; // 4 seconds
        const explosionTime = 3.0; // When the explosion happens
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            
            // Pre-explosion phase
            if (elapsed < explosionTime) {
                const progress = elapsed / explosionTime;
                
                // Particles converge on the spawn point
                for (let i = particles.length - 1; i >= 0; i--) {
                    const particle = particles[i];
                    
                    // Move particle towards center
                    particle.position.add(particle.velocity);
                    
                    // Decrease lifetime
                    particle.lifetime -= 0.016;
                    
                    // Remove if it reached center or lifetime expired
                    if (particle.lifetime <= 0 || particle.position.distanceTo(position) < 0.5) {
                        // Make core grow as particles are absorbed
                        if (core) {
                            const currentScale = core.scale.x;
                            core.scale.set(currentScale + 0.03, currentScale + 0.03, currentScale + 0.03);
                        }
                        
                        // Remove particle
                        this.scene.remove(particle);
                        particles.splice(i, 1);
                    }
                }
                
                // Core grows and pulses
                if (core) {
                    // Base growth
                    const baseScale = 1 + progress * 5;
                    // Pulsing effect increases as we approach explosion
                    const pulseIntensity = 0.2 + progress * 0.8;
                    const pulseFrequency = 5 + progress * 10;
                    const pulse = 1 + Math.sin(elapsed * pulseFrequency) * pulseIntensity;
                    
                    core.scale.set(baseScale * pulse, baseScale * pulse, baseScale * pulse);
                    core.material.opacity = 0.9 * (1 - Math.pow(progress, 2) * 0.5);
                }
                
                // Light pulses more intensely approaching explosion
                if (light) {
                    const baseLightIntensity = 2 + progress * 3;
                    const pulseFactor = 1 + Math.sin(elapsed * 8) * progress;
                    light.intensity = baseLightIntensity * pulseFactor;
                }
            } 
            // Explosion phase
            else if (elapsed < duration) {
                const postExplosionProgress = (elapsed - explosionTime) / (duration - explosionTime);
                
                // Expand core rapidly then fade
                if (core) {
                    const explosionScale = 6 + postExplosionProgress * 10;
                    core.scale.set(explosionScale, explosionScale, explosionScale);
                    core.material.opacity = 0.9 * (1 - postExplosionProgress);
                }
                
                // Light flashes then fades
                if (light) {
                    if (postExplosionProgress < 0.1) {
                        // Initial flash
                        light.intensity = 10;
                    } else {
                        // Fade out
                        light.intensity = 10 * (1 - postExplosionProgress);
                    }
                }
            } else {
                // Clean up
                for (const particle of particles) {
                    this.scene.remove(particle);
                }
                
                this.scene.remove(core);
                this.scene.remove(light);
                
                return; // Stop animation
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    // Add a method to spawn kings in all cardinal rooms
    spawnKingCylindarsInCardinalRooms(rooms) {
        // Find all cardinal rooms
        const cardinalRooms = rooms.filter(room => 
            room.type === 'north' || 
            room.type === 'east' || 
            room.type === 'south' || 
            room.type === 'west'
        );
        
        // Spawn a King Cylindar in each cardinal room
        for (const room of cardinalRooms) {
            this.spawnKingCylindarInRoom(room);
        }
        
        if (this.debug) {
            console.log(`Spawned King Cylindars in ${cardinalRooms.length} cardinal rooms`);
        }
    }
    
    //=============================================================================
    // SHADOW CRAWLER METHODS
    //=============================================================================
    
    // Method to spawn Shadow Crawlers in a room
    spawnShadowCrawlersInRoom(room, count = 5) {
        if (this.debug) console.log(`Spawning ${count} Shadow Crawlers in ${room.type} room`);
        
        const spawned = [];
        
        // Calculate room center
        const roomCenterX = room.x + room.width / 2;
        const roomCenterZ = room.y + room.height / 2;
        
        // Spawn Shadow Crawlers in a pattern around the room
        for (let i = 0; i < count; i++) {
            // Calculate spawn position
            // Use different positions based on the index to spread them out
            let spawnX, spawnZ;
            
            // For first crawler, use room center
            if (i === 0) {
                spawnX = roomCenterX;
                spawnZ = roomCenterZ;
            } 
            // For others, distribute around the room
            else {
                // Calculate angle for circular distribution
                const angle = (i / count) * Math.PI * 2;
                
                // Distance from center (60% of the way to the walls)
                const distance = Math.min(room.width, room.height) * 0.3;
                
                // Calculate position
                spawnX = roomCenterX + Math.cos(angle) * distance;
                spawnZ = roomCenterZ + Math.sin(angle) * distance;
            }
            
            // Create spawn position
            const spawnPos = new THREE.Vector3(spawnX, 0.2, spawnZ); // Start just above the floor
            
            // Find floor beneath the position
            if (this.collisionManager) {
                const floorHit = this.collisionManager.findFloorBelow(spawnPos, 10);
                if (floorHit && floorHit.point) {
                    spawnPos.y = floorHit.point.y + 0.2; // Position just above floor
                }
            }
            
            // Check for collision at spawn point
            let validPosition = true;
            if (this.collisionManager) {
                const collision = this.collisionManager.checkCollision(spawnPos, 0.6);
                if (collision.collides) {
                    // Try adjusting the position
                    spawnPos.x += (Math.random() - 0.5) * 2;
                    spawnPos.z += (Math.random() - 0.5) * 2;
                    
                    // Check again
                    const newCollision = this.collisionManager.checkCollision(spawnPos, 0.6);
                    if (newCollision.collides) {
                        validPosition = false;
                        if (this.debug) console.log(`Could not find valid position for Shadow Crawler ${i}`);
                    }
                }
            }
            
            // Only spawn if position is valid
            if (validPosition) {
                // Create the Shadow Crawler
                const crawler = new ShadowCrawler(this.scene, spawnPos, this.collisionManager, this.player);
                
                // Set different patrol radius for each crawler
                crawler.patrolRadius = 2 + Math.random() * 3; // Random patrol radius between 2-5
                
                // Add to enemies array
                const enemyIndex = this.enemies.push(crawler) - 1;
                
                // Add to collision system
                this.addEnemyToCollisionSystem(crawler, enemyIndex);
                
                // Add to spawned array
                spawned.push(crawler);
                
                // Set patrol center
                crawler.patrolCenter = spawnPos.clone();
            }
        }
        
        if (this.debug) {
            console.log(`Successfully spawned ${spawned.length} Shadow Crawlers in ${room.type} room`);
        }
        
        return spawned;
    }
    
    // Method to spawn Shadow Crawlers in all cardinal rooms
    spawnShadowCrawlersInCardinalRooms(rooms, countPerRoom = 5) {
        // Find all cardinal rooms
        const cardinalRooms = rooms.filter(room => 
            room.type === 'north' || 
            room.type === 'east' || 
            room.type === 'south' || 
            room.type === 'west'
        );
        
        // Total crawlers spawned
        let totalSpawned = 0;
        
        // Spawn Shadow Crawlers in each cardinal room
        for (const room of cardinalRooms) {
            const spawned = this.spawnShadowCrawlersInRoom(room, countPerRoom);
            totalSpawned += spawned.length;
        }
        
        if (this.debug) {
            console.log(`Spawned a total of ${totalSpawned} Shadow Crawlers across ${cardinalRooms.length} cardinal rooms`);
        }
        
        return totalSpawned;

    }

// Method to spawn Shadow Crawlers in the central room
spawnShadowCrawlersInCentralRoom(rooms, count = 5) {
    // Find the central room
    const centralRoom = rooms.find(room => room.type === 'central');
    
    if (!centralRoom) {
        console.log("No central room found!");
        return [];
    }
    
    if (this.debug) console.log(`Spawning ${count} Shadow Crawlers in central room at ${new Date().toISOString()}`);
    
    const spawned = [];
    
    // Calculate room center
    const roomCenterX = centralRoom.x + centralRoom.width / 2;
    const roomCenterZ = centralRoom.y + centralRoom.height / 2;
    
    // Spawn Shadow Crawlers in a pattern around the central room
    for (let i = 0; i < count; i++) {
        // Calculate spawn position
        let spawnX, spawnZ;
        
        // For first crawler, use room center
        if (i === 0) {
            spawnX = roomCenterX;
            spawnZ = roomCenterZ;
        } 
        // For others, distribute around the room
        else {
            // Calculate angle for circular distribution
            const angle = (i / count) * Math.PI * 2;
            
            // Distance from center (50% of the way to the walls)
            const distance = Math.min(centralRoom.width, centralRoom.height) * 0.25;
            
            // Calculate position
            spawnX = roomCenterX + Math.cos(angle) * distance;
            spawnZ = roomCenterZ + Math.sin(angle) * distance;
        }
        
        // Create spawn position - Start much higher for visibility
        const spawnPos = new THREE.Vector3(spawnX, 3.0, spawnZ);
        
        // Find floor beneath the position
        if (this.collisionManager) {
            const floorHit = this.collisionManager.findFloorBelow(spawnPos, 10);
            if (floorHit && floorHit.point) {
                spawnPos.y = floorHit.point.y + 2.0; // Position higher above floor
                if (this.debug) console.log(`Found floor at y: ${floorHit.point.y}, positioning at ${spawnPos.y}`);
            }
        }
        
        // Always ensure minimum height
        spawnPos.y = Math.max(spawnPos.y, 2.0);
        
        // Ensure position is valid
        let validPosition = true;
        if (this.collisionManager) {
            const collision = this.collisionManager.checkCollision(spawnPos, 2.0);
            if (collision.collides) {
                // If collision, try raising the position
                spawnPos.y += 2.0;
                
                // Check again
                const newCollision = this.collisionManager.checkCollision(spawnPos, 2.0);
                if (newCollision.collides) {
                    validPosition = false;
                    if (this.debug) console.log(`Could not find valid position for Shadow Crawler ${i}`);
                }
            }
        }
        
        // Only spawn if position is valid
        if (validPosition) {
            if (this.debug) console.log(`Creating Shadow Crawler at position: ${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z}`);
            
            try {
                // Create the Shadow Crawler
                const crawler = new ShadowCrawler(this.scene, spawnPos, this.collisionManager, this.player);
                
                // Set different patrol radius for each crawler
                crawler.patrolRadius = 2 + Math.random() * 3; // Random patrol radius between 2-5
                
                // Add to enemies array
                const enemyIndex = this.enemies.push(crawler) - 1;
                
                // Add to collision system
                this.addEnemyToCollisionSystem(crawler, enemyIndex);
                
                // Add to spawned array
                spawned.push(crawler);
                
                // Set patrol center
                crawler.patrolCenter = spawnPos.clone();
                
                if (this.debug) console.log(`Successfully created Shadow Crawler ${i}`);
            } catch (error) {
                console.error(`Error creating Shadow Crawler: ${error}`);
            }
        }
    }
    
    if (this.debug) {
        console.log(`Successfully spawned ${spawned.length} Shadow Crawlers in central room`);
    }
    
    return spawned;
}


}
