// src/entities/enemies/enemyBase.js - Base class for all enemies
import * as THREE from 'three';

export class EnemyBase {
    constructor(params = {}) {
        // 1. Base identity properties
        this.id = params.id || 'enemy';
        this.name = params.name || 'Unknown Enemy';
        this.level = params.level || 1;
        this.type = 'enemy'; // Entity type for collision system
        
        // 2. Stats
        this.maxHealth = params.maxHealth || 50;
        this.health = this.maxHealth;
        this.baseDamage = params.baseDamage || 10;
        this.damageVariance = params.damageVariance || 0.2; // ±20% damage variance
        this.experienceValue = params.experienceValue || 20;
        this.healthOrbChance = params.healthOrbChance || 0.3; // 30% chance to drop health orb
        this.manaOrbChance = params.manaOrbChance || 0.2;     // 20% chance to drop mana orb
        
        // 3. Movement
        this.position = new THREE.Vector3(
            params.x || 0,
            params.y || 0,
            params.z || 0
        );
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.moveSpeed = params.moveSpeed || 3;
        this.rotationSpeed = params.rotationSpeed || 4;
        this.rotation = 0;
        this.isMoving = false;
        
        // 4. Detection ranges
        this.detectionRange = params.detectionRange || 15;
        this.attackRange = params.attackRange || 2;
        this.retreatRange = params.retreatRange || 1;
        
        // 5. Attack properties
        this.attackType = params.attackType || 'melee'; // melee, ranged, slam
        this.attackCooldown = params.attackCooldown || 2;
        this.attackTimer = 0;
        this.isAttacking = false;
        this.projectileSpeed = params.projectileSpeed || 8;
        this.projectileLifetime = params.projectileLifetime || 3;
        
        // 6. Defense stats
        this.defense = params.defense || 0;
        this.isStaggered = false;
        this.staggerDuration = 0;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0;
        
        // 7. Visuals
        this.color = params.color || 0xff0000;
        this.size = params.size || 1;
        this.object = null;
        this.mesh = null;
        
        // 8. AI state
        this.state = 'idle'; // idle, patrol, chase, attack, retreat, staggered, dead
        this.targetPosition = null;
        this.lastPlayerPosition = null;
        this.aggroTime = 0;
        this.maxAggroTime = params.maxAggroTime || 5;
        this.patrolPoints = params.patrolPoints || [];
        this.currentPatrolIndex = 0;
        this.waitTimer = 0;
        
        // 9. Pathfinding properties
        this.path = [];
        this.pathIndex = 0;
        this.recalculatePathTimer = 0;
        this.recalculatePathInterval = 1;
        
        // 10. Collision
        this.collider = null;
        this.collisionRadius = params.collisionRadius || this.size;
        
        // 11. Custom behavior override
        this.customBehavior = params.customBehavior || null;
        
        // Initialize the enemy
        this.init(params);
    }
    
    // Initialize the enemy
    init(params) {
        this.createMesh(params);
        this.updateCollider();
    }
    
    // Create mesh based on enemy type
    createMesh(params) {
        // Create a simple geometry for the base enemy
        const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
        const material = new THREE.MeshLambertMaterial({ color: this.color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Create container object for positioning
        this.object = new THREE.Object3D();
        this.object.position.copy(this.position);
        this.object.add(this.mesh);
        
        // Add a point light to make the enemy glow slightly
        const light = new THREE.PointLight(this.color, 0.5, 3);
        light.position.set(0, 0, 0);
        this.mesh.add(light);
    }
    
    // Update enemy state
    update(deltaTime, player, dungeon) {
        // Skip updates if dead
        if (this.state === 'dead') return;
        
        // Update timers
        this.updateTimers(deltaTime);
        
        // Run custom behavior if defined
        if (this.customBehavior && typeof this.customBehavior === 'function') {
            const shouldContinue = this.customBehavior(this, deltaTime, player, dungeon);
            if (!shouldContinue) return;
        }
        
        // Update state based on player position
        this.updateState(player);
        
        // Handle state-specific behavior
        this.handleCurrentState(deltaTime, player, dungeon);
        
        // Apply movement
        this.applyMovement(deltaTime, dungeon);
        
        // Update object position and rotation
        this.object.position.copy(this.position);
        this.object.rotation.y = this.rotation;
        
        // Update collider
        this.updateCollider();
        
        // Animate the enemy
        this.animate(deltaTime);
    }
    
    // Update all timers
    updateTimers(deltaTime) {
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }
        
        if (this.staggerDuration > 0) {
            this.staggerDuration -= deltaTime;
            if (this.staggerDuration <= 0) {
                this.isStaggered = false;
            }
        }
        
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
            if (this.invulnerabilityTime <= 0) {
                this.isInvulnerable = false;
                if (this.mesh) this.mesh.visible = true;
            } else {
                // Flash effect for invulnerability
                if (this.mesh) {
                    this.mesh.visible = Math.floor(this.invulnerabilityTime * 10) % 2 === 0;
                }
            }
        }
        
        if (this.aggroTime > 0) {
            this.aggroTime -= deltaTime;
        }
        
        if (this.waitTimer > 0) {
            this.waitTimer -= deltaTime;
        }
        
        if (this.recalculatePathTimer > 0) {
            this.recalculatePathTimer -= deltaTime;
        }
    }
    
    // Update enemy state based on player position
    updateState(player) {
        if (this.isStaggered) {
            this.state = 'staggered';
            return;
        }
        
        if (this.health <= 0) {
            this.state = 'dead';
            return;
        }
        
        // Skip state update if we're in the middle of an attack
        if (this.isAttacking) return;
        
        // Get distance to player
        const distanceToPlayer = this.getDistanceToPlayer(player);
        
        // If player is within detection range, chase or attack
        if (distanceToPlayer <= this.detectionRange) {
            // Store last known player position and refresh aggro time
            this.lastPlayerPosition = player.getPosition().clone();
            this.aggroTime = this.maxAggroTime;
            
            // If in attack range, attack
            if (distanceToPlayer <= this.attackRange) {
                if (distanceToPlayer <= this.retreatRange) {
                    this.state = 'retreat';
                } else {
                    this.state = 'attack';
                }
            } else {
                this.state = 'chase';
            }
        } 
        // If we've lost sight of player but still have aggro, move to last known position
        else if (this.lastPlayerPosition && this.aggroTime > 0) {
            this.state = 'chase';
        } 
        // Otherwise go back to patrolling or idle
        else {
            if (this.patrolPoints && this.patrolPoints.length > 0) {
                this.state = 'patrol';
            } else {
                this.state = 'idle';
            }
        }
    }
    
    // Handle behavior based on current state
    handleCurrentState(deltaTime, player, dungeon) {
        switch(this.state) {
            case 'idle':
                this.handleIdleState(deltaTime);
                break;
            case 'patrol':
                this.handlePatrolState(deltaTime);
                break;
            case 'chase':
                this.handleChaseState(deltaTime, player);
                break;
            case 'attack':
                this.handleAttackState(deltaTime, player);
                break;
            case 'retreat':
                this.handleRetreatState(deltaTime, player);
                break;
            case 'staggered':
                this.handleStaggeredState(deltaTime);
                break;
            case 'dead':
                this.handleDeadState(deltaTime);
                break;
        }
    }
    
    // Idle state behavior
    handleIdleState(deltaTime) {
        // In idle state, the enemy doesn't move
        this.velocity.set(0, 0, 0);
        this.isMoving = false;
        
        // Occasionally look around
        if (Math.random() < 0.01) {
            this.rotation = Math.random() * Math.PI * 2;
        }
    }
    
    // Patrol state behavior
    handlePatrolState(deltaTime) {
        // If no patrol points, go back to idle
        if (!this.patrolPoints || this.patrolPoints.length === 0) {
            this.state = 'idle';
            return;
        }
        
        // If waiting at a patrol point, decrement timer
        if (this.waitTimer > 0) {
            this.velocity.set(0, 0, 0);
            this.isMoving = false;
            return;
        }
        
        // Get current patrol point
        const targetPoint = this.patrolPoints[this.currentPatrolIndex];
        const targetPosition = new THREE.Vector3(targetPoint.x, 0, targetPoint.z);
        
        // Calculate distance to target
        const distance = this.position.distanceTo(targetPosition);
        
        // If we've reached the target, move to next patrol point
        if (distance < 1) {
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
            this.waitTimer = 1 + Math.random() * 2; // Wait 1-3 seconds at each point
            return;
        }
        
        // Move towards patrol point
        this.moveTowardsPosition(targetPosition, this.moveSpeed * 0.5); // Move at half speed while patrolling
    }
    
    // Chase state behavior
    handleChaseState(deltaTime, player) {
        // If we have a last known player position, move towards it
        if (this.lastPlayerPosition) {
            const distance = this.position.distanceTo(this.lastPlayerPosition);
            
            // If we've reached the last known position and lost the player
            if (distance < 1 && this.getDistanceToPlayer(player) > this.detectionRange) {
                this.lastPlayerPosition = null;
                this.aggroTime = 0;
                return;
            }
            
            // Move towards player position
            this.moveTowardsPosition(player.getPosition(), this.moveSpeed);
        } else {
            // If no last known position, go back to idle/patrol
            if (this.patrolPoints && this.patrolPoints.length > 0) {
                this.state = 'patrol';
            } else {
                this.state = 'idle';
            }
        }
    }
    
    // Attack state behavior
    handleAttackState(deltaTime, player) {
        // Face the player
        this.lookAtPosition(player.getPosition());
        
        // Stop moving while attacking
        this.velocity.set(0, 0, 0);
        this.isMoving = false;
        
        // Perform attack if cooldown is ready
        if (this.attackTimer <= 0 && !this.isAttacking) {
            this.performAttack(player);
        }
    }
    
    // Retreat state behavior
    handleRetreatState(deltaTime, player) {
        // Get direction away from player
        const playerPos = player.getPosition();
        const direction = new THREE.Vector3(
            this.position.x - playerPos.x,
            0,
            this.position.z - playerPos.z
        ).normalize();
        
        // Set velocity to move away
        this.velocity.x = direction.x * this.moveSpeed;
        this.velocity.z = direction.z * this.moveSpeed;
        this.isMoving = true;
        
        // Face the player while retreating
        this.lookAtPosition(playerPos);
        
        // Attack if we can
        if (this.attackTimer <= 0 && !this.isAttacking) {
            this.performAttack(player);
        }
    }
    
    // Staggered state behavior
    handleStaggeredState(deltaTime) {
        // Stop moving while staggered
        this.velocity.set(0, 0, 0);
        this.isMoving = false;
    }
    
    // Dead state behavior
    handleDeadState(deltaTime) {
        // Stop moving
        this.velocity.set(0, 0, 0);
        this.isMoving = false;
        
        // Scale down mesh to show death
        if (this.mesh) {
            this.mesh.scale.y = Math.max(0.1, this.mesh.scale.y - deltaTime * 2);
            
            // If fully scaled down, remove from scene
            if (this.mesh.scale.y <= 0.1) {
                this.remove();
            }
        }
    }
    
    // Apply movement and handle collisions with dungeon
    applyMovement(deltaTime, dungeon) {
        // Don't move if staggered, attacking or dead
        if (this.isStaggered || this.isAttacking || this.state === 'dead') {
            return;
        }
        
        // Apply movement
        const newPosition = new THREE.Vector3(
            this.position.x + this.velocity.x * deltaTime,
            this.position.y,
            this.position.z + this.velocity.z * deltaTime
        );
        
        // Simple collision detection with dungeon walls
        if (dungeon) {
            const colliders = dungeon.getColliders();
            let collision = false;
            
            // Create a test collider
            const testCollider = {
                min: new THREE.Vector3(
                    newPosition.x - this.collisionRadius,
                    newPosition.y,
                    newPosition.z - this.collisionRadius
                ),
                max: new THREE.Vector3(
                    newPosition.x + this.collisionRadius,
                    newPosition.y + this.size,
                    newPosition.z + this.collisionRadius
                )
            };
            
            // Check for collisions with dungeon walls
            for (const collider of colliders) {
                if (this.checkCollision(testCollider, collider)) {
                    collision = true;
                    break;
                }
            }
            
            // Only update position if no collision
            if (!collision) {
                this.position.copy(newPosition);
            } else {
                // On collision, stop movement and slightly adjust position
                this.velocity.set(0, 0, 0);
                
                // Try moving just X
                const xOnlyPosition = new THREE.Vector3(
                    this.position.x + this.velocity.x * deltaTime,
                    this.position.y,
                    this.position.z
                );
                
                const xOnlyCollider = {
                    min: new THREE.Vector3(
                        xOnlyPosition.x - this.collisionRadius,
                        xOnlyPosition.y,
                        xOnlyPosition.z - this.collisionRadius
                    ),
                    max: new THREE.Vector3(
                        xOnlyPosition.x + this.collisionRadius,
                        xOnlyPosition.y + this.size,
                        xOnlyPosition.z + this.collisionRadius
                    )
                };
                
                let xCollision = false;
                for (const collider of colliders) {
                    if (this.checkCollision(xOnlyCollider, collider)) {
                        xCollision = true;
                        break;
                    }
                }
                
                if (!xCollision) {
                    this.position.x = xOnlyPosition.x;
                }
                
                // Try moving just Z
                const zOnlyPosition = new THREE.Vector3(
                    this.position.x,
                    this.position.y,
                    this.position.z + this.velocity.z * deltaTime
                );
                
                const zOnlyCollider = {
                    min: new THREE.Vector3(
                        zOnlyPosition.x - this.collisionRadius,
                        zOnlyPosition.y,
                        zOnlyPosition.z - this.collisionRadius
                    ),
                    max: new THREE.Vector3(
                        zOnlyPosition.x + this.collisionRadius,
                        zOnlyPosition.y + this.size,
                        zOnlyPosition.z + this.collisionRadius
                    )
                };
                
                let zCollision = false;
                for (const collider of colliders) {
                    if (this.checkCollision(zOnlyCollider, collider)) {
                        zCollision = true;
                        break;
                    }
                }
                
                if (!zCollision) {
                    this.position.z = zOnlyPosition.z;
                }
            }
        } else {
            // No dungeon, just move
            this.position.copy(newPosition);
        }
    }
    
    // Simple collision check
    checkCollision(colliderA, colliderB) {
        return (
            colliderA.min.x <= colliderB.max.x &&
            colliderA.max.x >= colliderB.min.x &&
            colliderA.min.y <= colliderB.max.y &&
            colliderA.max.y >= colliderB.min.y &&
            colliderA.min.z <= colliderB.max.z &&
            colliderA.max.z >= colliderB.min.z
        );
    }
    
    // Move towards a position
    moveTowardsPosition(targetPosition, speed) {
        // Calculate direction to target
        const direction = new THREE.Vector3(
            targetPosition.x - this.position.x,
            0,
            targetPosition.z - this.position.z
        ).normalize();
        
        // Set velocity
        this.velocity.x = direction.x * speed;
        this.velocity.z = direction.z * speed;
        this.isMoving = true;
        
        // Update rotation to face movement direction
        this.lookAtPosition(targetPosition);
    }
    
    // Face towards a position
    lookAtPosition(targetPosition) {
        // Calculate angle to target
        const dx = targetPosition.x - this.position.x;
        const dz = targetPosition.z - this.position.z;
        const targetRotation = Math.atan2(dx, dz);
        
        // Smoothly rotate towards target
        const rotationDiff = targetRotation - this.rotation;
        
        // Handle rotation wrapping
        if (rotationDiff > Math.PI) {
            this.rotation += 2 * Math.PI;
        } else if (rotationDiff < -Math.PI) {
            this.rotation -= 2 * Math.PI;
        }
        
        // Linear interpolation for smooth rotation
        this.rotation = this.rotation + Math.sign(targetRotation - this.rotation) * 
                       Math.min(Math.abs(targetRotation - this.rotation), this.rotationSpeed * 0.1);
    }
    
    // Get distance to player
    getDistanceToPlayer(player) {
        const playerPos = player.getPosition();
        return this.position.distanceTo(playerPos);
    }
    
    // Perform attack
    performAttack(player) {
        if (this.attackTimer > 0 || this.isAttacking) return;
        
        this.isAttacking = true;
        
        // Set attack timer
        this.attackTimer = this.attackCooldown;
        
        // Different attack behavior based on attack type
        switch(this.attackType) {
            case 'melee':
                this.performMeleeAttack(player);
                break;
            case 'ranged':
                this.performRangedAttack(player);
                break;
            case 'slam':
                this.performSlamAttack(player);
                break;
        }
        
        // Attack animation will end the isAttacking state
        setTimeout(() => {
            this.isAttacking = false;
        }, 500); // Attack animation lasts 0.5 seconds
    }
    
    // Melee attack
    performMeleeAttack(player) {
        // Check if player is in attack range
        const distance = this.getDistanceToPlayer(player);
        if (distance <= this.attackRange) {
            // Calculate actual damage with variance
            const variance = 1 + (Math.random() * this.damageVariance * 2 - this.damageVariance);
            const damage = Math.round(this.baseDamage * variance);
            
            // Apply damage to player
            player.takeDamage(damage);
            
            // Apply knockback to player
            const knockbackDirection = new THREE.Vector3(
                player.position.x - this.position.x,
                0,
                player.position.z - this.position.z
            ).normalize();
            
            player.applyKnockback(knockbackDirection, 2);
        }
    }
    
    // Ranged attack
    performRangedAttack(player) {
        // Create a projectile in the direction of the player
        const playerPos = player.getPosition();
        const direction = new THREE.Vector3(
            playerPos.x - this.position.x,
            0,
            playerPos.z - this.position.z
        ).normalize();
        
        // Signal to the game that we're firing a projectile
        // This will be implemented in projectileSystem.js
        if (window.game && window.game.projectileSystem) {
            window.game.projectileSystem.createEnemyProjectile(
                this.position.clone(),
                direction,
                this.projectileSpeed,
                this.baseDamage,
                this.projectileLifetime,
                this.color
            );
        }
    }
    
    // Slam attack
    performSlamAttack(player) {
        // First jump up
        const jumpUp = () => {
            // Save original y position
            const originalY = this.position.y;
            
            // Animation to jump up
            const jumpHeight = 3;
            const jumpDuration = 500; // ms
            
            // Tween the position up
            const startTime = Date.now();
            
            const jumpInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / jumpDuration, 1);
                
                // Parabolic jump - up then down
                const jumpOffset = Math.sin(progress * Math.PI) * jumpHeight;
                this.position.y = originalY + jumpOffset;
                
                if (progress >= 1) {
                    clearInterval(jumpInterval);
                    slamDown(originalY);
                }
            }, 16); // ~60fps
        };
        
        // Then slam down
        const slamDown = (originalY) => {
            // Reset Y position
            this.position.y = originalY;
            
            // Create a shockwave effect
            const shockwaveRadius = this.attackRange * 1.5;
            
            // Check if player is in shockwave range
            const distance = this.getDistanceToPlayer(player);
            if (distance <= shockwaveRadius) {
                // Calculate damage based on distance (more damage closer to center)
                const damageMultiplier = 1 - (distance / shockwaveRadius);
                const damage = Math.round(this.baseDamage * damageMultiplier * 1.5); // 50% more damage for slam
                
                // Apply damage to player
                player.takeDamage(damage);
                
                // Apply knockback away from slam center
                const knockbackDirection = new THREE.Vector3(
                    player.position.x - this.position.x,
                    0,
                    player.position.z - this.position.z
                ).normalize();
                
                player.applyKnockback(knockbackDirection, 4); // Stronger knockback for slam
            }
        };
        
        // Start the slam attack sequence
        jumpUp();
    }
    
    // Animate the enemy
    animate(deltaTime) {
        // Simple bobbing animation when moving
        if (this.isMoving && this.mesh) {
            this.mesh.position.y = Math.sin(Date.now() * 0.01) * 0.1;
        }
        
        // Attack animation
        if (this.isAttacking && this.mesh) {
            // Different animation based on attack type
            switch(this.attackType) {
                case 'melee':
                    // Lunge forward animation
                    const attackProgress = 1 - (this.attackTimer / this.attackCooldown);
                    if (attackProgress < 0.5) {
                        // First half - lunge forward
                        this.mesh.position.z = attackProgress * 2 * 0.5;
                    } else {
                        // Second half - move back
                        this.mesh.position.z = (1 - (attackProgress - 0.5) * 2) * 0.5;
                    }
                    break;
                    
                case 'ranged':
                    // Pulse animation for ranged attack
                    const pulseProgress = 1 - (this.attackTimer / this.attackCooldown);
                    if (pulseProgress < 0.2) {
                        // Scale up quickly
                        this.mesh.scale.set(
                            1 + pulseProgress * 2,
                            1 + pulseProgress * 2,
                            1 + pulseProgress * 2
                        );
                    } else if (pulseProgress < 0.3) {
                        // Scale back down quickly
                        const scaleDown = 1 + (0.4 - (pulseProgress - 0.2) * 5) * 0.2;
                        this.mesh.scale.set(scaleDown, scaleDown, scaleDown);
                    } else {
                        // Reset scale
                        this.mesh.scale.set(1, 1, 1);
                    }
                    break;
                    
                case 'slam':
                    // Handled in performSlamAttack
                    break;
            }
        } else if (!this.isAttacking && this.mesh) {
            // Reset position when not attacking
            this.mesh.position.z = 0;
            this.mesh.scale.set(1, 1, 1);
        }
        
        // Stagger animation
        if (this.isStaggered && this.mesh) {
            this.mesh.rotation.z = Math.sin(Date.now() * 0.01 * 20) * 0.3;
        } else if (this.mesh) {
            this.mesh.rotation.z = 0;
        }
    }
    
    // Take damage
    takeDamage(amount) {
        // Don't take damage if invulnerable or already dead
        if (this.isInvulnerable || this.state === 'dead') return 0;
        
        // Apply defense reduction
        const actualDamage = Math.max(1, amount - this.defense);
        
        // Reduce health
        this.health -= actualDamage;
        
        // Apply invulnerability
        this.isInvulnerable = true;
        this.invulnerabilityTime = 0.2; // Short invulnerability after taking damage
        
        // Stagger if damage is high enough
        if (actualDamage > this.maxHealth * 0.2) { // Stagger if damage > 20% of max health
            this.isStaggered = true;
            this.staggerDuration = 0.5; // Staggered for 0.5 seconds
        }
        
        // Check for death
        if (this.health <= 0) {
            this.die();
        }
        
        // Return actual damage dealt
        return actualDamage;
    }
    
    // Die and drop loot
    die() {
        if (this.state === 'dead') return;
        
        this.state = 'dead';
        
        // Drop loot based on chance
        this.dropLoot();
        
        // Give experience to player
        if (window.game && window.game.player) {
            window.game.player.addExperience?.(this.experienceValue);
        }
    }
    
    // Drop loot on death
    dropLoot() {
        // Check for health orb drop
        if (Math.random() < this.healthOrbChance) {
            this.createHealthOrb();
        }
        
        // Check for mana orb drop
        if (Math.random() < this.manaOrbChance) {
            this.createManaOrb();
        }
    }
    
    // Create a health orb
    createHealthOrb() {
        // Implementation would be in a loot system
        console.log("Health orb dropped at", this.position);
    }
    
    // Create a mana orb
    createManaOrb() {
        // Implementation would be in a loot system
        console.log("Mana orb dropped at", this.position);
    }
    
    // Update the enemy's bounding box (collider)
    updateCollider() {
        this.collider = {
            min: new THREE.Vector3(
                this.position.x - this.collisionRadius,
                this.position.y,
                this.position.z - this.collisionRadius
            ),
            max: new THREE.Vector3(
                this.position.x + this.collisionRadius,
                this.position.y + this.size,
                this.position.z + this.collisionRadius
            )
        };
    }
    
    // Clean up and remove from scene
    remove() {
        if (this.object && this.object.parent) {
            this.object.parent.remove(this.object);
        }
    }
    
    // Get position
    getPosition() {
        return this.position.clone();
    }
    
    // Set position
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.object) {
            this.object.position.copy(this.position);
        }
        this.updateCollider();
    }
    
    // Get collider
    getCollider() {
        return this.collider;
    }
    
    // Get object for rendering
    getObject() {
        return this.object;
    }
    
    // Get damage
    getDamage() {
        const variance = 1 + (Math.random() * this.damageVariance * 2 - this.damageVariance);
        return Math.round(this.baseDamage * variance);
    }
    
    // Get the type of enemy (used for type checking)
    getType() {
        return 'enemy';
    }
    
    // Set a custom behavior function
    setCustomBehavior(behaviorFunction) {
        this.customBehavior = behaviorFunction;
    }
}
