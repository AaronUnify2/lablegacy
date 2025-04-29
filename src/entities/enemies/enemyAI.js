// src/entities/enemies/enemyAI.js - Enemy AI state machine
import * as THREE from 'three';

// AI States
export const AIState = {
    IDLE: 'idle',
    PATROL: 'patrol',
    CHASE: 'chase',
    ATTACK: 'attack',
    RETREAT: 'retreat',
    STUNNED: 'stunned',
    SPECIAL: 'special'
};

// Enemy AI system using a state machine
export class EnemyAI {
    constructor(enemy) {
        this.enemy = enemy;
        this.currentState = AIState.IDLE;
        this.previousState = null;
        this.stateTimer = 0;
        this.targetPosition = null;
        this.playerLastSeen = null;
        this.searchTimer = 0;
        
        // Configuration
        this.idleDuration = 2 + Math.random() * 3; // 2-5 seconds of idling
        this.searchDuration = 3 + Math.random() * 2; // 3-5 seconds of searching
        this.maxPatrolDistance = 20; // Maximum distance to patrol
        this.pathUpdateInterval = 0.5; // How often to recalculate path (seconds)
        this.pathfindingTimer = 0;
        
        // State transition probabilities
        this.chanceToIdle = 0.2; // 20% chance to idle after finishing patrol
        
        // Debugging
        this.debug = false;
    }
    
    // Update AI based on current state
    update(deltaTime, player, dungeon) {
        // Skip if the enemy is stunned
        if (this.enemy.isStunned) {
            this.currentState = AIState.STUNNED;
            return;
        }
        
        // Update state timer
        this.stateTimer -= deltaTime;
        
        // Update pathfinding timer
        this.pathfindingTimer -= deltaTime;
        
        // Calculate distance to player
        const distanceToPlayer = this.enemy.distanceToEntity(player);
        
        // Check for state transitions first
        this.checkStateTransitions(distanceToPlayer, player);
        
        // Execute current state behavior
        switch (this.currentState) {
            case AIState.IDLE:
                this.executeIdleState(deltaTime);
                break;
            case AIState.PATROL:
                this.executePatrolState(deltaTime, dungeon);
                break;
            case AIState.CHASE:
                this.executeChaseState(deltaTime, player, dungeon);
                break;
            case AIState.ATTACK:
                this.executeAttackState(deltaTime, player);
                break;
            case AIState.RETREAT:
                this.executeRetreatState(deltaTime, player, dungeon);
                break;
            case AIState.SPECIAL:
                this.executeSpecialState(deltaTime, player, dungeon);
                break;
            case AIState.STUNNED:
                // No action needed, handled by the enemy class
                break;
        }
        
        if (this.debug) {
            console.log(`[${this.enemy.name}] State: ${this.currentState}, Distance to player: ${distanceToPlayer.toFixed(2)}`);
        }
    }
    
    // Check for state transitions
    checkStateTransitions(distanceToPlayer, player) {
        // Store previous state before changing it
        this.previousState = this.currentState;
        
        switch (this.currentState) {
            case AIState.IDLE:
                // Transition to patrol when idle timer expires
                if (this.stateTimer <= 0) {
                    this.changeState(AIState.PATROL);
                }
                
                // Detect player
                if (distanceToPlayer <= this.enemy.detectionRange) {
                    this.changeState(AIState.CHASE);
                }
                break;
                
            case AIState.PATROL:
                // Detect player
                if (distanceToPlayer <= this.enemy.detectionRange) {
                    this.changeState(AIState.CHASE);
                }
                break;
                
            case AIState.CHASE:
                // Transition to attack if close enough
                if (distanceToPlayer <= this.enemy.attackRange) {
                    this.changeState(AIState.ATTACK);
                }
                
                // Lose track of player if too far
                if (distanceToPlayer > this.enemy.detectionRange * 1.5) {
                    // Start searching where player was last seen
                    this.playerLastSeen = player.getPosition().clone();
                    this.searchTimer = this.searchDuration;
                    this.changeState(AIState.PATROL);
                }
                
                // If retreat behavior is enabled, check retreat conditions
                if (this.enemy.retreatRange > 0 && this.enemy.health < this.enemy.maxHealth * 0.3) {
                    this.changeState(AIState.RETREAT);
                }
                break;
                
            case AIState.ATTACK:
                // Move back to chase if player moves out of attack range
                if (distanceToPlayer > this.enemy.attackRange) {
                    this.changeState(AIState.CHASE);
                }
                
                // If retreat behavior is enabled, check retreat conditions
                if (this.enemy.retreatRange > 0 && this.enemy.health < this.enemy.maxHealth * 0.3) {
                    this.changeState(AIState.RETREAT);
                }
                break;
                
            case AIState.RETREAT:
                // Return to chase if health is restored or player is far enough
                if (this.enemy.health > this.enemy.maxHealth * 0.5 || 
                    distanceToPlayer > this.enemy.detectionRange) {
                    this.changeState(AIState.IDLE);
                }
                break;
                
            case AIState.SPECIAL:
                // Return to previous state when special ability is complete
                if (this.stateTimer <= 0) {
                    // Default back to chase if player is in range
                    if (distanceToPlayer <= this.enemy.detectionRange) {
                        this.changeState(AIState.CHASE);
                    } else {
                        this.changeState(AIState.IDLE);
                    }
                }
                break;
                
            case AIState.STUNNED:
                // Check if stun has worn off
                if (!this.enemy.isStunned) {
                    if (distanceToPlayer <= this.enemy.attackRange) {
                        this.changeState(AIState.ATTACK);
                    } else if (distanceToPlayer <= this.enemy.detectionRange) {
                        this.changeState(AIState.CHASE);
                    } else {
                        this.changeState(AIState.IDLE);
                    }
                }
                break;
        }
        
        // Special ability check for any state except special or stunned
        if (this.currentState !== AIState.SPECIAL && 
            this.currentState !== AIState.STUNNED && 
            this.enemy.specialAbility && 
            this.enemy.specialAbilityTimer <= 0 &&
            distanceToPlayer <= this.enemy.detectionRange) {
            
            // Random chance to use special ability if not already using it
            if (Math.random() < 0.1) { // 10% chance per update
                this.changeState(AIState.SPECIAL);
                this.stateTimer = 2.0; // 2 seconds in special state
            }
        }
    }
    
    // Change state with proper initialization
    changeState(newState) {
        // Skip if state is the same
        if (newState === this.currentState) return;
        
        // Set new state
        this.previousState = this.currentState;
        this.currentState = newState;
        
        // Initialize new state
        switch (newState) {
            case AIState.IDLE:
                this.stateTimer = this.idleDuration;
                this.enemy.velocity.set(0, 0, 0);
                break;
                
            case AIState.PATROL:
                this.setupPatrolPoint();
                break;
                
            case AIState.CHASE:
                // Start with a short pathfinding delay
                this.pathfindingTimer = 0.1;
                break;
                
            case AIState.ATTACK:
                // Set timer based on attack cooldown
                this.stateTimer = this.enemy.attackCooldown;
                // Stop movement
                this.enemy.velocity.set(0, 0, 0);
                break;
                
            case AIState.RETREAT:
                // Find a retreat position
                this.findRetreatPosition();
                break;
                
            case AIState.SPECIAL:
                // Stop movement and prepare for special ability
                this.enemy.velocity.set(0, 0, 0);
                // Timer for special ability duration
                this.stateTimer = 2.0;
                break;
        }
        
        if (this.debug) {
            console.log(`[${this.enemy.name}] State changed: ${this.previousState} -> ${this.currentState}`);
        }
    }
    
    // Execute idle state logic
    executeIdleState(deltaTime) {
        // In idle state, the enemy just stands still
        this.enemy.velocity.set(0, 0, 0);
        
        // Occasionally look around
        if (Math.random() < 0.05) {
            this.enemy.rotation = Math.random() * Math.PI * 2;
        }
    }
    
    // Execute patrol state logic
    executePatrolState(deltaTime, dungeon) {
        // If no target position, set up a new patrol point
        if (!this.targetPosition) {
            this.setupPatrolPoint();
        }
        
        // Move toward target position
        if (this.targetPosition) {
            this.moveTowardTarget(this.targetPosition, this.enemy.moveSpeed * 0.7);
            
            // Check if reached target
            const distanceToTarget = this.distanceToPoint(this.targetPosition);
            if (distanceToTarget < 1.0) {
                // Target reached
                if (this.searchTimer > 0) {
                    // If searching, continue for the search duration
                    this.searchTimer -= deltaTime;
                    
                    // Look around more frequently while searching
                    if (Math.random() < 0.2) {
                        this.enemy.rotation = Math.random() * Math.PI * 2;
                    }
                    
                    if (this.searchTimer <= 0) {
                        // Reset search and go back to normal patrol
                        this.playerLastSeen = null;
                    }
                }
                
                // Set up a new patrol point
                this.setupPatrolPoint();
            }
        }
    }
    
    // Execute chase state logic
    executeChaseState(deltaTime, player, dungeon) {
        // Update pathfinding periodically
        if (this.pathfindingTimer <= 0) {
            this.updatePathToPlayer(player, dungeon);
            this.pathfindingTimer = this.pathUpdateInterval;
        }
        
        // Get player position
        const playerPos = player.getPosition();
        
        // Move toward player
        this.moveTowardTarget(playerPos, this.enemy.moveSpeed);
    }
    
    // Execute attack state logic
    executeAttackState(deltaTime, player) {
        // Face the player
        const playerPos = player.getPosition();
        this.enemy.rotation = Math.atan2(
            playerPos.x - this.enemy.position.x,
            playerPos.z - this.enemy.position.z
        );
        
        // Perform attack if cooldown is ready
        if (!this.enemy.isAttacking && this.enemy.attackTimer <= 0) {
            this.enemy.performAttack(player);
        }
    }
    
    // Execute retreat state logic
    executeRetreatState(deltaTime, player, dungeon) {
        // If no retreat position set, find one
        if (!this.targetPosition) {
            this.findRetreatPosition(player);
        }
        
        // Move toward retreat position
        if (this.targetPosition) {
            this.moveTowardTarget(this.targetPosition, this.enemy.moveSpeed * 1.2);
            
            // Check if reached target
            const distanceToTarget = this.distanceToPoint(this.targetPosition);
            if (distanceToTarget < 1.0) {
                // Find a new retreat position
                this.findRetreatPosition(player);
            }
        }
    }
    
    // Execute special ability state logic
    executeSpecialState(deltaTime, player, dungeon) {
        // Face the player
        const playerPos = player.getPosition();
        this.enemy.rotation = Math.atan2(
            playerPos.x - this.enemy.position.x,
            playerPos.z - this.enemy.position.z
        );
        
        // Use special ability if not already used
        if (this.enemy.specialAbilityTimer <= 0) {
            this.enemy.useSpecialAbility(player, dungeon);
        }
    }
    
    // Set up a patrol point for the enemy
    setupPatrolPoint() {
        // If searching for player, move toward last seen position
        if (this.playerLastSeen) {
            this.targetPosition = this.playerLastSeen.clone();
            return;
        }
        
        // If patrol points are specified, use those
        if (this.enemy.patrolPoints && this.enemy.patrolPoints.length > 0) {
            // Move to next patrol point
            this.enemy.currentPatrolIndex = (this.enemy.currentPatrolIndex + 1) % this.enemy.patrolPoints.length;
            this.targetPosition = this.enemy.patrolPoints[this.enemy.currentPatrolIndex].clone();
            return;
        }
        
        // Otherwise, generate a random point around current position
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.maxPatrolDistance;
        
        this.targetPosition = new THREE.Vector3(
            this.enemy.position.x + Math.sin(angle) * distance,
            this.enemy.position.y,
            this.enemy.position.z + Math.cos(angle) * distance
        );
        
        // Check if there's a chance to idle
        if (Math.random() < this.chanceToIdle) {
            this.changeState(AIState.IDLE);
        }
    }
    
    // Update path to player (for now just direct line, would use proper pathfinding in full implementation)
    updatePathToPlayer(player, dungeon) {
        // Get player position
        const playerPos = player.getPosition();
        
        // For now, we'll just set the target directly to the player's position
        // In a full implementation, this would use A* pathfinding
        this.targetPosition = playerPos.clone();
    }
    
    // Find a position to retreat to
    findRetreatPosition(player) {
        // Get direction away from player
        const playerPos = player.getPosition();
        const directionAwayFromPlayer = new THREE.Vector3(
            this.enemy.position.x - playerPos.x,
            0,
            this.enemy.position.z - playerPos.z
        ).normalize();
        
        // Set target position in that direction
        const retreatDistance = this.enemy.retreatRange + Math.random() * 5; // Add some randomness
        this.targetPosition = new THREE.Vector3(
            this.enemy.position.x + directionAwayFromPlayer.x * retreatDistance,
            this.enemy.position.y,
            this.enemy.position.z + directionAwayFromPlayer.z * retreatDistance
        );
    }
    
    // Move toward a target position
    moveTowardTarget(target, speed) {
        // Calculate direction to target
        const direction = new THREE.Vector3(
            target.x - this.enemy.position.x,
            0,
            target.z - this.enemy.position.z
        ).normalize();
        
        // Set velocity
        this.enemy.velocity.set(
            direction.x * speed,
            0,
            direction.z * speed
        );
        
        // Update rotation
        if (direction.length() > 0.001) {
            this.enemy.rotation = Math.atan2(direction.x, direction.z);
        }
    }
    
    // Calculate distance to a point
    distanceToPoint(point) {
        return Math.sqrt(
            Math.pow(this.enemy.position.x - point.x, 2) +
            Math.pow(this.enemy.position.z - point.z, 2)
        );
    }
    
    // Enable/disable debug output
    setDebug(enabled) {
        this.debug = enabled;
    }
}
