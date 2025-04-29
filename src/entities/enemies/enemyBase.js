// src/entities/enemies/enemyBase.js - Base enemy class
import * as THREE from 'three';
import { EnemyAI, AIState } from './enemyAI.js';

// Enemy types
export const EnemyType = {
    MOB: 'mob',
    MINI_BOSS: 'miniBoss',
    BOSS: 'boss'
};

// Base Enemy class
export class Enemy {
    constructor(options = {}) {
        // Basic properties
        this.id = Math.random().toString(36).substring(2, 9); // Unique ID
        this.name = options.name || 'Unknown Enemy';
        this.type = options.type || EnemyType.MOB;
        this.level = options.level || 1;
        
        // Stats
        this.maxHealth = options.maxHealth || 30;
        this.health = this.maxHealth;
        this.baseDamage = options.damage || 10;
        this.damageVariance = options.damageVariance || 0.2; // ±20% damage variance
        this.experienceValue = options.experienceValue || 10;
        
        // Movement
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.moveSpeed = options.moveSpeed || 3;
        
        // Combat ranges
        this.detectionRange = options.detectionRange || 15;  // When enemy becomes aware of player
        this.aggroRange = options.aggroRange || 10;          // When enemy actively chases player
        this.attackRange = options.attackRange || 2;         // When enemy can attack player
        this.retreatRange = options.retreatRange || 0;       // When enemy should retreat (0 = never)
        
        // Attack properties
        this.attackType = options.attackType || 'melee';     // 'melee' or 'ranged'
        this.attackCooldown = options.attackCooldown || 1.5; // Seconds between attacks
        this.attackTimer = 0;
        this.isAttacking = false;
        this.attackDuration = options.attackDuration || 0.5; // How long an attack animation lasts
        this.attackSpeed = options.attackSpeed || 1.0;       // Speed multiplier for attacks
        this.attackHitbox = null;                            // Active attack hitbox
        
        // Defense & status
        this.defense = options.defense || 0;
        this.isDead = false;
        this.isStunned = false;
        this.stunDuration = 0;
        this.invulnerabilityTime = 0;
        
        // Visual properties
        this.primaryColor = options.primaryColor || 0x777777;
        this.secondaryColor = options.secondaryColor || 0x444444;
        this.scale = options.scale || 1.0;
        this.glowIntensity = options.glowIntensity || 0;
        this.glowColor = options.glowColor || 0xffffff;
        
        // 3D objects
        this.object = new THREE.Object3D(); // Container for all meshes
        this.mesh = null;                   // Main mesh
        this.hitboxMesh = null;             // Visual hitbox for debugging
        
        // AI System
        this.ai = new EnemyAI(this);
        this.currentState = AIState.IDLE;
        this.patrolPoints = options.patrolPoints || null;
        this.currentPatrolIndex = 0;
        this.targetPosition = null;         // Current movement target
        this.stateTimer = 0;                // Timer for state transitions
        
        // Path finding
        this.path = [];                     // Current path to target
        this.nextPathIndex = 0;             // Next point in path
        this.pathFindingCooldown = 0;       // Cooldown for path recalculation
        
        // Entity type for physics/collision
        this.type = 'enemy';
        this.collisionRadius = options.collisionRadius || 1.0;
        
        // Effect timers
        this.flashTimer = 0;                // For hit flash effect
        this.floatOffset = 0;               // For floating animation
        
        // Custom behavior overrides - allows for specialized behavior 
        this.customBehavior = options.customBehavior || null;
        
        // Special ability
        this.specialAbility = options.specialAbility || null;
        this.specialAbilityCooldown = options.specialAbilityCooldown || 10;
        this.specialAbilityTimer = this.specialAbilityCooldown;
    }
    
    // Initialize meshes and appearance
    init() {
        // Create default mesh if not overridden
        if (!this.mesh) {
            this.createDefaultMesh();
        }
        
        // Create hitbox visual (only visible in debug mode)
        this.createHitboxMesh();
        
        // Add meshes to object container
        this.object.add(this.mesh);
        
        // Set initial position
        this.object.position.copy(this.position);
        
        console.log(`${this.name} initialized at position: `, this.position);
        
        return this;
    }
    
    // Create default mesh - should be overridden by specific enemy types
    createDefaultMesh() {
        // Create a simple shape as fallback
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshLambertMaterial({ color: this.primaryColor });
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Position mesh so bottom is at y=0
        this.mesh.position.y = 1;
        
        // Add a small glow light if specified
        if (this.glowIntensity > 0) {
            const light = new THREE.PointLight(this.glowColor, this.glowIntensity, 5);
            light.position.set(0, 1, 0); // Position light at center of mesh
            this.mesh.add(light);
        }
    }
    
    // Create hitbox visualization for debugging
    createHitboxMesh() {
        const hitboxGeometry = new THREE.SphereGeometry(this.collisionRadius, 8, 8);
        const hitboxMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        
        this.hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        this.hitboxMesh.position.y = this.collisionRadius;
        this.hitboxMesh.visible = false; // Hidden by default
        
        this.object.add(this.hitboxMesh);
    }
    
    // Update enemy state
    update(deltaTime, player, dungeon) {
        // Skip update if dead
        if (this.isDead) return;
        
        // Update timers
        this.updateTimers(deltaTime);
        
        // Process AI state and behavior
        this.updateAI(deltaTime, player, dungeon);
        
        // Update movement based on AI decisions
        this.updateMovement(deltaTime, dungeon);
        
        // Update attack state
        this.updateAttack(deltaTime, player);
        
        // Update animation effects
        this.updateAnimations(deltaTime);
        
        // Update 3D object position and rotation
        this.object.position.copy(this.position);
        this.object.rotation.y = this.rotation;
    }
    
    // Update all timers
    updateTimers(deltaTime) {
        // Cooldown timers
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }
        
        if (this.specialAbilityTimer > 0) {
            this.specialAbilityTimer -= deltaTime;
        }
        
        if (this.pathFindingCooldown > 0) {
            this.pathFindingCooldown -= deltaTime;
        }
        
        // Status effect timers
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
        }
        
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
        }
        
        if (this.isStunned) {
            this.stunDuration -= deltaTime;
            if (this.stunDuration <= 0) {
                this.isStunned = false;
            }
        }
        
        // State timers
        this.stateTimer -= deltaTime;
    }
    
    // Update AI state and behavior
    updateAI(deltaTime, player, dungeon) {
        // Skip if stunned
        if (this.isStunned) return;
        
        // Let the AI system update the state
        this.ai.update(deltaTime, player, dungeon);
    }
    
    // Update enemy movement
    updateMovement(deltaTime, dungeon) {
        // Skip if stunned or attacking
        if (this.isStunned || this.isAttacking) {
            this.velocity.set(0, 0, 0);
            return;
        }
        
        // Apply movement from AI
        if (this.velocity.length() > 0) {
            // Move position
            const moveX = this.velocity.x * deltaTime;
            const moveZ = this.velocity.z * deltaTime;
            
            // Simple collision detection with dungeon walls
            const newX = this.position.x + moveX;
            const newZ = this.position.z + moveZ;
            
            // Check collisions using a simplified approach
            // In a real implementation, we would use the physics system
            let canMoveX = true;
            let canMoveZ = true;
            
            // For now, just apply the movement
            if (canMoveX) {
                this.position.x = newX;
            }
            
            if (canMoveZ) {
                this.position.z = newZ;
            }
            
            // Update rotation to face movement direction
            if (Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001) {
                const targetRotation = Math.atan2(moveX, moveZ);
                this.rotation = targetRotation;
            }
        }
    }
    
    // Update attack state and logic
    updateAttack(deltaTime, player) {
        // Skip if stunned
        if (this.isStunned) return;
        
        // If attacking, update attack animation
        if (this.isAttacking) {
            // For now, just count down the attack duration
            this.attackTimer -= deltaTime;
            
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.attackHitbox = null;
            }
        }
    }
    
    // Perform attack based on attack type
    performAttack(player) {
        if (this.attackTimer > 0 || this.isStunned) return false;
        
        // Start attack sequence
        this.isAttacking = true;
        this.attackTimer = this.attackCooldown;
        
        console.log(`${this.name} attacks!`);
        
        // Different attack handling based on type
        if (this.attackType === 'melee') {
            return this.performMeleeAttack(player);
        } else if (this.attackType === 'ranged') {
            return this.performRangedAttack(player);
        }
        
        return false;
    }
    
    // Perform a melee attack
    performMeleeAttack(player) {
        // Create attack hitbox
        this.attackHitbox = {
            position: this.position.clone(),
            radius: this.attackRange
        };
        
        // Check if player is in range
        const distanceToPlayer = this.distanceToEntity(player);
        
        if (distanceToPlayer <= this.attackRange) {
            // Calculate damage with variance
            const damageVariance = this.baseDamage * this.damageVariance;
            const actualDamage = this.baseDamage + 
                (Math.random() * damageVariance * 2 - damageVariance);
            
            // Apply damage to player
            player.takeDamage(Math.round(actualDamage));
            
            console.log(`${this.name} hit player for ${Math.round(actualDamage)} damage`);
            return true;
        }
        
        return false;
    }
    
    // Perform a ranged attack
    performRangedAttack(player) {
        // Create projectile (to be implemented)
        console.log(`${this.name} fires a projectile at player`);
        
        // Will be implemented in the full version
        return true;
    }
    
    // Use special ability if available
    useSpecialAbility(player, dungeon) {
        if (!this.specialAbility || this.specialAbilityTimer > 0) return false;
        
        // Reset cooldown
        this.specialAbilityTimer = this.specialAbilityCooldown;
        
        // Execute special ability (to be implemented by specific enemy types)
        console.log(`${this.name} uses special ability`);
        
        return true;
    }
    
    // Update animation effects
    updateAnimations(deltaTime) {
        // Flash effect when hit
        if (this.flashTimer > 0) {
            // Toggle visibility based on flash timer
            this.mesh.visible = Math.floor(this.flashTimer * 10) % 2 === 0;
        } else {
            this.mesh.visible = true;
        }
        
        // Float animation for certain enemies
        this.floatOffset = Math.sin(Date.now() * 0.002) * 0.2;
        
        // Update mesh position for floating effect if this enemy floats
        if (this.canFloat) {
            this.mesh.position.y = 1 + this.floatOffset;
        }
    }
    
    // Take damage from player or other sources
    takeDamage(amount) {
        // Check invulnerability
        if (this.invulnerabilityTime > 0) return 0;
        
        // Apply defense reduction
        const actualDamage = Math.max(1, amount - this.defense);
        
        // Reduce health
        this.health -= actualDamage;
        
        // Apply hit effects
        this.flashTimer = 0.2; // Flash for 0.2 seconds
        this.invulnerabilityTime = 0.1; // Short invulnerability after hit
        
        console.log(`${this.name} took ${actualDamage} damage, health: ${this.health}/${this.maxHealth}`);
        
        // Check for death
        if (this.health <= 0) {
            this.die();
        }
        
        return actualDamage;
    }
    
    // Handle enemy death
    die() {
        if (this.isDead) return;
        
        this.isDead = true;
        console.log(`${this.name} has been defeated!`);
        
        // Implement death effects, loot drops, etc.
        
        // Mark for removal from the game
        setTimeout(() => {
            if (this.object.parent) {
                this.object.parent.remove(this.object);
            }
        }, 1000); // Delay removal to allow for death animation
    }
    
    // Stun the enemy temporarily
    applyStun(duration) {
        this.isStunned = true;
        this.stunDuration = duration;
        this.velocity.set(0, 0, 0);
    }
    
    // Calculate distance to another entity
    distanceToEntity(entity) {
        return Math.sqrt(
            Math.pow(this.position.x - entity.position.x, 2) +
            Math.pow(this.position.z - entity.position.z, 2)
        );
    }
    
    // Calculate angle to another entity
    angleToEntity(entity) {
        return Math.atan2(
            entity.position.x - this.position.x,
            entity.position.z - this.position.z
        );
    }
    
    // Get enemy position
    getPosition() {
        return this.position.clone();
    }
    
    // Set enemy position
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.object.position.copy(this.position);
        return this;
    }
    
    // Get enemy rotation
    getRotation() {
        return this.rotation;
    }
    
    // Set enemy rotation
    setRotation(rotation) {
        this.rotation = rotation;
        this.object.rotation.y = rotation;
        return this;
    }
    
    // Get the main Three.js object
    getObject() {
        return this.object;
    }
    
    // Get collision data for physics
    getCollider() {
        return {
            min: new THREE.Vector3(
                this.position.x - this.collisionRadius,
                this.position.y,
                this.position.z - this.collisionRadius
            ),
            max: new THREE.Vector3(
                this.position.x + this.collisionRadius,
                this.position.y + this.collisionRadius * 2,
                this.position.z + this.collisionRadius
            )
        };
    }
    
    // Get the damage this enemy deals
    getDamage() {
        const variance = this.baseDamage * this.damageVariance;
        return this.baseDamage + (Math.random() * variance * 2 - variance);
    }
    
    // Check if enemy is dead
    isDead() {
        return this.isDead;
    }
    
    // Toggle debug visualization
    toggleDebug(enabled) {
        if (this.hitboxMesh) {
            this.hitboxMesh.visible = enabled;
        }
    }
}
