// src/entities/enemies/enemyAttacks.js - Attack behaviors for enemies
import * as THREE from 'three';

// Attack types
export const AttackType = {
    MELEE: 'melee',
    RANGED: 'ranged',
    AREA: 'area',
    SPECIAL: 'special'
};

// Base class for all attack behaviors
export class AttackBehavior {
    constructor(enemy, options = {}) {
        this.enemy = enemy;
        this.damage = options.damage || enemy.baseDamage;
        this.damageVariance = options.damageVariance || enemy.damageVariance;
        this.cooldown = options.cooldown || enemy.attackCooldown;
        this.range = options.range || enemy.attackRange;
        this.type = AttackType.MELEE; // Default type
        this.effectChance = options.effectChance || 0;
        this.statusEffect = options.statusEffect || null;
        this.statusDuration = options.statusDuration || 2.0;
        
        // Animation properties
        this.animationDuration = options.animationDuration || 0.5;
        this.animationTimer = 0;
        this.isAnimating = false;
        
        // Attack state
        this.isActive = false;
        this.hitEntities = new Set(); // Track entities hit to prevent multi-hits
    }
    
    // Initialize attack (called when attack starts)
    start() {
        this.isActive = true;
        this.isAnimating = true;
        this.animationTimer = this.animationDuration;
        this.hitEntities.clear();
        return true;
    }
    
    // Update attack state (called each frame)
    update(deltaTime, player, projectiles) {
        if (!this.isActive) return false;
        
        // Update animation timer
        if (this.isAnimating) {
            this.animationTimer -= deltaTime;
            if (this.animationTimer <= 0) {
                this.isAnimating = false;
            }
        }
        
        // Check if attack is complete
        if (!this.isAnimating) {
            this.isActive = false;
            return false;
        }
        
        return true;
    }
    
    // Apply damage to a target
    applyDamage(target) {
        // Skip if already hit
        if (this.hitEntities.has(target.id)) return 0;
        
        // Calculate damage with variance
        const variance = this.damage * this.damageVariance;
        const actualDamage = this.damage + (Math.random() * variance * 2 - variance);
        
        // Apply damage to target
        const damageDealt = target.takeDamage(Math.round(actualDamage));
        
        // Mark as hit
        this.hitEntities.add(target.id);
        
        // Apply status effect if applicable
        if (this.statusEffect && Math.random() < this.effectChance) {
            this.applyStatusEffect(target);
        }
        
        return damageDealt;
    }
    
    // Apply status effect to target
    applyStatusEffect(target) {
        // To be implemented by specific attack types
    }
    
    // Check if entity is in attack range
    isInRange(entity) {
        const distance = this.enemy.distanceToEntity(entity);
        return distance <= this.range;
    }
    
    // Cancel the attack
    cancel() {
        this.isActive = false;
        this.isAnimating = false;
    }
}

// Melee attack implementation
export class MeleeAttack extends AttackBehavior {
    constructor(enemy, options = {}) {
        super(enemy, options);
        this.type = AttackType.MELEE;
        this.hitboxRadius = options.hitboxRadius || this.range;
        this.knockbackForce = options.knockbackForce || 2.0;
        this.angleRange = options.angleRange || Math.PI / 2; // Attack angle in front (90 degrees)
    }
    
    // Override update to implement melee attack logic
    update(deltaTime, player, projectiles) {
        // Call base update for animation handling
        if (!super.update(deltaTime, player, projectiles)) return false;
        
        // Check if player is in range
        if (this.isInMeleeRange(player)) {
            this.applyDamage(player);
            
            // Apply knockback
            if (this.knockbackForce > 0) {
                this.applyKnockback(player);
            }
        }
        
        return true;
    }
    
    // Check if entity is in melee range (considers angle)
    isInMeleeRange(entity) {
        // Check distance
        if (!this.isInRange(entity)) return false;
        
        // Check angle
        const angleToEntity = this.enemy.angleToEntity(entity);
        const angleDiff = Math.abs(normalizeAngle(angleToEntity - this.enemy.rotation));
        
        // Entity must be in front of the enemy within the angle range
        return angleDiff <= this.angleRange / 2;
    }
    
    // Apply knockback to player
    applyKnockback(player) {
        // Calculate knockback direction
        const direction = new THREE.Vector3(
            player.position.x - this.enemy.position.x,
            0,
            player.position.z - this.enemy.position.z
        ).normalize();
        
        // Apply knockback
        player.applyKnockback(direction, this.knockbackForce);
    }
}

// Ranged attack implementation
export class RangedAttack extends AttackBehavior {
    constructor(enemy, options = {}) {
        super(enemy, options);
        this.type = AttackType.RANGED;
        this.projectileSpeed = options.projectileSpeed || 8.0;
        this.projectileSize = options.projectileSize || 0.3;
        this.projectileColor = options.projectileColor || 0xff0000;
        this.projectileLifetime = options.projectileLifetime || 5.0;
        this.accuracy = options.accuracy || 0.9; // 0-1, higher is more accurate
        this.burstCount = options.burstCount || 1;
        this.burstDelay = options.burstDelay || 0.2;
        this.currentBurst = 0;
        this.burstTimer = 0;
    }
    
    // Override start to implement ranged attack logic
    start() {
        super.start();
        this.currentBurst = 0;
        this.burstTimer = 0;
        return true;
    }
    
    // Override update to implement ranged attack logic
    update(deltaTime, player, projectiles) {
        // Call base update for animation handling
        if (!super.update(deltaTime, player, projectiles)) return false;
        
        // Update burst timer
        if (this.currentBurst < this.burstCount) {
            this.burstTimer -= deltaTime;
            
            if (this.burstTimer <= 0) {
                // Fire next projectile in burst
                this.fireProjectile(player, projectiles);
                this.currentBurst++;
                
                // Reset burst timer if more projectiles to fire
                if (this.currentBurst < this.burstCount) {
                    this.burstTimer = this.burstDelay;
                }
            }
        }
        
        return true;
    }
    
    // Fire a projectile toward the target
    fireProjectile(player, projectiles) {
        // Calculate direction to player with accuracy variation
        const accuracy = this.accuracy;
        const accuracyVariance = (1 - accuracy) * Math.PI;
        const angle = this.enemy.angleToEntity(player) + (Math.random() * accuracyVariance * 2 - accuracyVariance);
        
        const direction = new THREE.Vector3(
            Math.sin(angle),
            0,
            Math.cos(angle)
        );
        
        // Create projectile starting position (slightly offset from enemy)
        const startPosition = this.enemy.position.clone().add(
            direction.clone().multiplyScalar(1.0)
        );
        startPosition.y += 1.0; // Adjust height
        
        // Create projectile
        const projectile = {
            position: startPosition,
            velocity: direction.multiplyScalar(this.projectileSpeed),
            size: this.projectileSize,
            color: this.projectileColor,
            lifetime: this.projectileLifetime,
            damage: this.calculateProjectileDamage(),
            owner: this.enemy
        };
        
        // Add to projectiles array
        projectiles.push(projectile);
        
        // Create projectile visual (if in a real implementation)
        // This would be handled by the game's projectile system
    }
    
    // Calculate projectile damage with variance
    calculateProjectileDamage() {
        const variance = this.damage * this.damageVariance;
        return Math.round(this.damage + (Math.random() * variance * 2 - variance));
    }
}

// Area attack implementation
export class AreaAttack extends AttackBehavior {
    constructor(enemy, options = {}) {
        super(enemy, options);
        this.type = AttackType.AREA;
        this.areaRadius = options.areaRadius || this.range;
        this.chargeTime = options.chargeTime || 1.0;
        this.isCharging = false;
        this.chargeTimer = 0;
        this.damageMultiplier = options.damageMultiplier || 1.5;
        this.visualEffect = options.visualEffect || null;
    }
    
    // Override start to implement area attack logic
    start() {
        super.start();
        this.isCharging = true;
        this.chargeTimer = this.chargeTime;
        return true;
    }
    
    // Override update to implement area attack logic
    update(deltaTime, player, projectiles) {
        // Call base update for animation handling
        if (!super.update(deltaTime, player, projectiles)) return false;
        
        // Update charge timer
        if (this.isCharging) {
            this.chargeTimer -= deltaTime;
            
            // Create charging effect (would be implemented in full version)
            
            if (this.chargeTimer <= 0) {
                this.isCharging = false;
                this.releaseAreaAttack(player);
            }
        }
        
        return true;
    }
    
    // Release the area attack
    releaseAreaAttack(player) {
        // Check if player is in area
        const distance = this.enemy.distanceToEntity(player);
        
        if (distance <= this.areaRadius) {
            // Apply damage with area multiplier
            const areaDamage = this.damage * this.damageMultiplier;
            this.damage = areaDamage; // Temporarily set damage higher
            this.applyDamage(player);
            this.damage = areaDamage / this.damageMultiplier; // Reset damage
        }
        
        // Create area effect visual (would be implemented in full version)
    }
}

// Special attack base class (to be extended for specific enemy types)
export class SpecialAttack extends AttackBehavior {
    constructor(enemy, options = {}) {
        super(enemy, options);
        this.type = AttackType.SPECIAL;
        this.specialCooldown = options.specialCooldown || 10.0;
    }
    
    // Override start to implement special attack logic
    start() {
        super.start();
        // Special attack implementation would go here
        return true;
    }
}

// Helper function to normalize angle to -PI to PI
function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

// Create an attack behavior for an enemy
export function createAttackBehavior(enemy, type, options = {}) {
    switch (type) {
        case AttackType.MELEE:
            return new MeleeAttack(enemy, options);
        case AttackType.RANGED:
            return new RangedAttack(enemy, options);
        case AttackType.AREA:
            return new AreaAttack(enemy, options);
        case AttackType.SPECIAL:
            return new SpecialAttack(enemy, options);
        default:
            return new MeleeAttack(enemy, options); // Default to melee
    }
}
