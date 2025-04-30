// src/entities/enemies/enemyAI.js - Enhanced AI behaviors for enemies

import * as THREE from 'three';

// AI States
export const AIState = {
    IDLE: 'idle',
    PATROL: 'patrol', 
    CHASE: 'chase',
    ATTACK: 'attack',
    RETREAT: 'retreat',
};

// Main AI controller class
export class EnemyAI {
    constructor(enemy) {
        // Reference to the enemy this AI controls
        this.enemy = enemy;
        
        // Internal AI state tracking
        this.currentState = AIState.IDLE;
        this.previousState = AIState.IDLE;
        this.stateTimer = 0;
        
        // Patrol behavior settings
        this.patrolDirection = new THREE.Vector3(
            Math.random() * 2 - 1, 
            0, 
            Math.random() * 2 - 1
        ).normalize();
        this.patrolTimer = 0;
        this.patrolDuration = 2 + Math.random() * 3; // 2-5 seconds in one direction
        
        // Chase behavior settings
        this.chaseTimer = 0;
        this.maxChaseTime = 5; // Give up chase after 5 seconds
        this.lastKnownPlayerPosition = null;
        
        // Retreat behavior settings
        this.retreatTimer = 0;
        this.retreatDuration = 5; // Retreat for 5 seconds
        this.healthRetreatThreshold = 0.1; // Retreat when below 10% health
        
        // Thinking settings
        this.decisionCooldown = 0;
        this.decisionInterval = 0.5; // Make decisions every 0.5 seconds
    }
    
    // Main update function called every frame
    update(deltaTime, player, dungeon) {
        // Skip AI if enemy is dead or staggered
        if (this.enemy.state === 'dead' || this.enemy.isStaggered) {
            return;
        }
        
        // Update timers
        this.updateTimers(deltaTime);
        
        // Only make decisions when decision cooldown is ready
        if (this.decisionCooldown <= 0) {
            this.makeDecisions(player, dungeon);
            this.decisionCooldown = this.decisionInterval;
        }
        
        // Execute behavior for current state
        this.executeBehavior(deltaTime, player, dungeon);
    }
    
    // Update all timers
    updateTimers(deltaTime) {
        this.decisionCooldown -= deltaTime;
        this.stateTimer += deltaTime;
        
        if (this.currentState === AIState.PATROL) {
            this.patrolTimer += deltaTime;
        } else if (this.currentState === AIState.CHASE) {
            this.chaseTimer += deltaTime;
        } else if (this.currentState === AIState.RETREAT) {
            this.retreatTimer += deltaTime;
        }
    }
    
    // Make decisions about state transitions
    makeDecisions(player, dungeon) {
        // Get current enemy stats
        const distanceToPlayer = this.enemy.getDistanceToPlayer(player);
        const healthPercentage = this.enemy.health / this.enemy.maxHealth;
        
        // Get important thresholds
        const detectionRange = this.enemy.detectionRange;
        const attackRange = this.enemy.attackRange;
        
        // Check for retreat condition first (priority behavior)
        if (healthPercentage < this.healthRetreatThreshold && 
            distanceToPlayer < detectionRange && 
            this.currentState !== AIState.RETREAT) {
            this.changeState(AIState.RETREAT);
            this.retreatTimer = 0;
            return;
        }
        
        // Handle state-specific transitions
        switch (this.currentState) {
            case AIState.IDLE:
                // From idle, either detect player or start patrolling
                if (distanceToPlayer <= detectionRange) {
                    this.lastKnownPlayerPosition = player.getPosition().clone();
                    this.changeState(AIState.CHASE);
                } else if (this.stateTimer >= 2 + Math.random() * 3) {
                    // After 2-5 seconds of idle, start patrolling
                    this.changeState(AIState.PATROL);
                }
                break;
                
            case AIState.PATROL:
                // From patrol, either detect player or change direction
                if (distanceToPlayer <= detectionRange) {
                    this.lastKnownPlayerPosition = player.getPosition().clone();
                    this.changeState(AIState.CHASE);
                } else if (this.patrolTimer >= this.patrolDuration) {
                    // Change patrol direction
                    this.patrolDirection = new THREE.Vector3(
                        Math.random() * 2 - 1, 
                        0, 
                        Math.random() * 2 - 1
                    ).normalize();
                    this.patrolTimer = 0;
                    this.patrolDuration = 2 + Math.random() * 3;
                }
                break;
                
            case AIState.CHASE:
                // From chase, either attack, lose track, or update position
                if (distanceToPlayer <= attackRange) {
                    this.changeState(AIState.ATTACK);
                } else if (this.chaseTimer >= this.maxChaseTime && distanceToPlayer > detectionRange) {
                    // Give up chase after max time and return to patrol
                    this.changeState(AIState.PATROL);
                } else if (distanceToPlayer <= detectionRange) {
                    // Update last known position if we still see the player
                    this.lastKnownPlayerPosition = player.getPosition().clone();
                    this.chaseTimer = 0; // Reset the give-up timer
                }
                break;
                
            case AIState.ATTACK:
                // From attack, either go back to chase if player moves away
                if (distanceToPlayer > attackRange) {
                    if (distanceToPlayer <= detectionRange) {
                        this.lastKnownPlayerPosition = player.getPosition().clone();
                        this.changeState(AIState.CHASE);
                    } else {
                        this.changeState(AIState.PATROL);
                    }
                }
                break;
                
            case AIState.RETREAT:
                // From retreat, go back to attack/chase if timer is up
                if (this.retreatTimer >= this.retreatDuration) {
                    if (distanceToPlayer <= attackRange) {
                        this.changeState(AIState.ATTACK);
                    } else if (distanceToPlayer <= detectionRange) {
                        this.lastKnownPlayerPosition = player.getPosition().clone();
                        this.changeState(AIState.CHASE);
                    } else {
                        this.changeState(AIState.PATROL);
                    }
                }
                break;
        }
    }
    
    // Execute the behavior for the current state
    executeBehavior(deltaTime, player, dungeon) {
        switch (this.currentState) {
            case AIState.IDLE:
                this.executeIdleBehavior(deltaTime);
                break;
                
            case AIState.PATROL:
                this.executePatrolBehavior(deltaTime, dungeon);
                break;
                
            case AIState.CHASE:
                this.executeChaseBehavior(deltaTime, player, dungeon);
                break;
                
            case AIState.ATTACK:
                this.executeAttackBehavior(deltaTime, player);
                break;
                
            case AIState.RETREAT:
                this.executeRetreatBehavior(deltaTime, player, dungeon);
                break;
        }
    }
    
    // Idle behavior - stay still but look around occasionally
    executeIdleBehavior(deltaTime) {
        // Stop movement
        this.enemy.velocity.set(0, 0, 0);
        this.enemy.isMoving = false;
        
        // Occasionally turn to a random direction
        if (Math.random() < 0.02) {
            this.enemy.rotation = Math.random() * Math.PI * 2;
        }
    }
    
    // Patrol behavior - walk in random directions
    executePatrolBehavior(deltaTime, dungeon) {
        // Set velocity based on patrol direction
        this.enemy.velocity.x = this.patrolDirection.x * (this.enemy.moveSpeed * 0.6); // Slower patrol
        this.enemy.velocity.z = this.patrolDirection.z * (this.enemy.moveSpeed * 0.6);
        this.enemy.isMoving = true;
        
        // Make the enemy face the direction it's moving
        if (this.enemy.velocity.x !== 0 || this.enemy.velocity.z !== 0) {
            const targetRotation = Math.atan2(this.enemy.velocity.x, this.enemy.velocity.z);
            this.enemy.rotation = this.lerpAngle(this.enemy.rotation, targetRotation, deltaTime * 5);
        }
        
        // Check for obstacles and update direction if needed
        if (dungeon && Math.random() < 0.1) { // Occasionally check for obstacles
            const newPosition = new THREE.Vector3(
                this.enemy.position.x + this.enemy.velocity.x * deltaTime * 2, // Look a bit ahead
                this.enemy.position.y,
                this.enemy.position.z + this.enemy.velocity.z * deltaTime * 2
            );
            
            // Create a test collider
            const testCollider = {
                min: new THREE.Vector3(
                    newPosition.x - this.enemy.collisionRadius,
                    newPosition.y,
                    newPosition.z - this.enemy.collisionRadius
                ),
                max: new THREE.Vector3(
                    newPosition.x + this.enemy.collisionRadius,
                    newPosition.y + this.enemy.size,
                    newPosition.z + this.enemy.collisionRadius
                )
            };
            
            // Check for collisions with dungeon walls
            let collision = false;
            const colliders = dungeon.getColliders();
            for (const collider of colliders) {
                if (this.enemy.checkCollision(testCollider, collider)) {
                    collision = true;
                    break;
                }
            }
            
            // If collision detected, change direction
            if (collision) {
                this.patrolDirection = new THREE.Vector3(
                    Math.random() * 2 - 1, 
                    0, 
                    Math.random() * 2 - 1
                ).normalize();
                this.patrolTimer = 0;
                this.patrolDuration = 1 + Math.random() * 2; // Shorter duration after collision
            }
        }
    }
    
    // Chase behavior - move toward player's last known position
    executeChaseBehavior(deltaTime, player, dungeon) {
        if (!this.lastKnownPlayerPosition) {
            // If we somehow don't have a position, go back to patrol
            this.changeState(AIState.PATROL);
            return;
        }
        
        // Get direction to last known player position
        const direction = new THREE.Vector3(
            this.lastKnownPlayerPosition.x - this.enemy.position.x,
            0,
            this.lastKnownPlayerPosition.z - this.enemy.position.z
        );
        
        // If we're close to the last known position, update our goal
        const distanceToTarget = direction.length();
        if (distanceToTarget < 1) {
            // If we can see the player, update position
            const distanceToPlayer = this.enemy.getDistanceToPlayer(player);
            if (distanceToPlayer <= this.enemy.detectionRange) {
                this.lastKnownPlayerPosition = player.getPosition().clone();
            } else {
                // Look around briefly before giving up
                // Stop moving and just look around
                this.enemy.velocity.set(0, 0, 0);
                this.enemy.isMoving = false;
                
                // Rotate to look around
                this.enemy.rotation += deltaTime * 2;
                return;
            }
        }
        
        // Normalize direction and apply movement
        direction.normalize();
        this.enemy.velocity.x = direction.x * this.enemy.moveSpeed;
        this.enemy.velocity.z = direction.z * this.enemy.moveSpeed;
        this.enemy.isMoving = true;
        
        // Make the enemy face the direction it's moving
        const targetRotation = Math.atan2(direction.x, direction.z);
        this.enemy.rotation = this.lerpAngle(this.enemy.rotation, targetRotation, deltaTime * 6);
    }
    
    // Attack behavior - stop and attack the player
    executeAttackBehavior(deltaTime, player) {
        // Stop moving during attack
        this.enemy.velocity.set(0, 0, 0);
        this.enemy.isMoving = false;
        
        // Face the player
        const playerPos = player.getPosition();
        const direction = new THREE.Vector3(
            playerPos.x - this.enemy.position.x,
            0,
            playerPos.z - this.enemy.position.z
        );
        
        // Calculate desired rotation
        const targetRotation = Math.atan2(direction.x, direction.z);
        this.enemy.rotation = this.lerpAngle(this.enemy.rotation, targetRotation, deltaTime * 8);
        
        // Attack when ready
        if (!this.enemy.isAttacking && this.enemy.attackTimer <= 0) {
            this.enemy.performAttack(player);
        }
    }
    
    // Retreat behavior - move away from player
    executeRetreatBehavior(deltaTime, player, dungeon) {
        // Get direction away from player
        const playerPos = player.getPosition();
        const direction = new THREE.Vector3(
            this.enemy.position.x - playerPos.x,
            0,
            this.enemy.position.z - playerPos.z
        );
        
        // Normalize and apply movement
        direction.normalize();
        this.enemy.velocity.x = direction.x * (this.enemy.moveSpeed * 1.2); // Faster retreat
        this.enemy.velocity.z = direction.z * (this.enemy.moveSpeed * 1.2);
        this.enemy.isMoving = true;
        
        // Look back at the player while retreating
        const retreatLookDirection = new THREE.Vector3(
            playerPos.x - this.enemy.position.x,
            0,
            playerPos.z - this.enemy.position.z
        );
        
        const targetRotation = Math.atan2(retreatLookDirection.x, retreatLookDirection.z);
        this.enemy.rotation = this.lerpAngle(this.enemy.rotation, targetRotation, deltaTime * 7);
        
        // Still attack if possible while retreating
        if (!this.enemy.isAttacking && this.enemy.attackTimer <= 0 && 
            this.enemy.getDistanceToPlayer(player) <= this.enemy.attackRange) {
            this.enemy.performAttack(player);
        }
        
        // Check for obstacles and update direction if needed
        if (dungeon && Math.random() < 0.1) { // Occasionally check for obstacles
            const newPosition = new THREE.Vector3(
                this.enemy.position.x + this.enemy.velocity.x * deltaTime * 2, // Look ahead
                this.enemy.position.y,
                this.enemy.position.z + this.enemy.velocity.z * deltaTime * 2
            );
            
            // Create a test collider
            const testCollider = {
                min: new THREE.Vector3(
                    newPosition.x - this.enemy.collisionRadius,
                    newPosition.y,
                    newPosition.z - this.enemy.collisionRadius
                ),
                max: new THREE.Vector3(
                    newPosition.x + this.enemy.collisionRadius,
                    newPosition.y + this.enemy.size,
                    newPosition.z + this.enemy.collisionRadius
                )
            };
            
            // Check for collisions with dungeon walls
            let collision = false;
            const colliders = dungeon.getColliders();
            for (const collider of colliders) {
                if (this.enemy.checkCollision(testCollider, collider)) {
                    collision = true;
                    break;
                }
            }
            
            // If collision detected, adjust direction
            if (collision) {
                // Add some perpendicular component to avoid getting stuck
                const perpendicularDirection = new THREE.Vector3(-direction.z, 0, direction.x);
                direction.add(perpendicularDirection.multiplyScalar(0.5));
                direction.normalize();
                
                this.enemy.velocity.x = direction.x * (this.enemy.moveSpeed * 1.2);
                this.enemy.velocity.z = direction.z * (this.enemy.moveSpeed * 1.2);
            }
        }
    }
    
    // Change AI state with proper transitions
    changeState(newState) {
        // Store previous state
        this.previousState = this.currentState;
        
        // Set new state
        this.currentState = newState;
        
        // Reset state timer
        this.stateTimer = 0;
        
        // Handle specific state entry actions
        switch (newState) {
            case AIState.IDLE:
                this.enemy.velocity.set(0, 0, 0);
                this.enemy.isMoving = false;
                break;
                
            case AIState.PATROL:
                this.patrolTimer = 0;
                this.patrolDuration = 2 + Math.random() * 3;
                this.patrolDirection = new THREE.Vector3(
                    Math.random() * 2 - 1, 
                    0, 
                    Math.random() * 2 - 1
                ).normalize();
                break;
                
            case AIState.CHASE:
                this.chaseTimer = 0;
                break;
                
            case AIState.RETREAT:
                this.retreatTimer = 0;
                break;
        }
        
        // Debug logging
        // console.log(`Enemy ${this.enemy.id} changed state: ${this.previousState} -> ${this.currentState}`);
    }
    
    // Helper for angle interpolation
    lerpAngle(a, b, t) {
        // Ensure the angles are within the same range to avoid spinning the wrong way
        let delta = b - a;
        
        // Normalize delta to [-PI, PI]
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        
        // Apply interpolation
        let result = a + delta * t;
        
        // Normalize result to [0, 2*PI]
        while (result > Math.PI * 2) result -= Math.PI * 2;
        while (result < 0) result += Math.PI * 2;
        
        return result;
    }
    
    // Get current AI state
    getState() {
        return this.currentState;
    }
    
    // Force a specific state
    forceState(state) {
        this.changeState(state);
    }
}

// Export helper functions for common AI behaviors

// Create a random patrol path around a center point
export function createRandomPatrolPath(centerX, centerZ, radius, pointCount = 4) {
    const points = [];
    
    for (let i = 0; i < pointCount; i++) {
        const angle = (i / pointCount) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const z = centerZ + Math.sin(angle) * radius;
        
        points.push({ x, y: 0, z });
    }
    
    return points;
}

// Create a patrol path between fixed points
export function createFixedPatrolPath(...points) {
    return points.map(point => ({
        x: point.x || 0,
        y: point.y || 0,
        z: point.z || 0
    }));
}

// Apply an AI controller to an enemy
export function applyAIController(enemy) {
    const ai = new EnemyAI(enemy);
    
    // Add the AI controller to the enemy
    enemy.ai = ai;
    
    // Override the enemy's update method to also update the AI
    const originalUpdate = enemy.update;
    enemy.update = function(deltaTime, player, dungeon) {
        // Call the original update method
        originalUpdate.call(this, deltaTime, player, dungeon);
        
        // Update the AI
        ai.update(deltaTime, player, dungeon);
    };
    
    return ai;
}
