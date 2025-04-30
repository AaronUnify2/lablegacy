// src/entities/enemies/enemyAttacks.js - Basic attack types for enemies

import * as THREE from 'three';

// Attack type enum
export const AttackType = {
    MELEE: 'melee',
    RANGED: 'ranged',
    SLAM: 'slam',
};

// Main attack controller class
export class AttackSystem {
    constructor() {
        // Store active projectiles
        this.projectiles = [];
    }
    
    // Execute an attack based on type
    executeAttack(enemy, player, attackType, attackParams = {}) {
        switch(attackType) {
            case AttackType.MELEE:
                return this.executeMeleeAttack(enemy, player, attackParams);
            
            case AttackType.RANGED:
                return this.executeRangedAttack(enemy, player, attackParams);
                
            case AttackType.SLAM:
                return this.executeSlamAttack(enemy, player, attackParams);
                
            default:
                console.warn(`Unknown attack type: ${attackType}`);
                return false;
        }
    }
    
    // Execute a melee attack
    executeMeleeAttack(enemy, player, params = {}) {
        // Extract parameters with defaults
        const range = params.range || enemy.attackRange || 2;
        const damage = params.damage || enemy.baseDamage || 10;
        const variance = params.variance || enemy.damageVariance || 0.2;
        const knockback = params.knockback || 2;
        
        // Check if player is in range
        const distance = enemy.getDistanceToPlayer(player);
        if (distance > range) {
            return false; // Attack missed
        }
        
        // Calculate actual damage with variance
        const damageVariance = 1 + (Math.random() * variance * 2 - variance);
        const actualDamage = Math.round(damage * damageVariance);
        
        // Apply damage to player
        player.takeDamage(actualDamage);
        
        // Apply knockback to player
        const knockbackDirection = new THREE.Vector3(
            player.position.x - enemy.position.x,
            0,
            player.position.z - enemy.position.z
        ).normalize();
        
        player.applyKnockback(knockbackDirection, knockback);
        
        return true; // Attack hit
    }
    
    // Execute a ranged attack
    executeRangedAttack(enemy, player, params = {}) {
        // Extract parameters with defaults
        const projectileSpeed = params.projectileSpeed || enemy.projectileSpeed || 8;
        const damage = params.damage || enemy.baseDamage || 8;
        const variance = params.variance || enemy.damageVariance || 0.2;
        const lifetime = params.lifetime || enemy.projectileLifetime || 3;
        const projectileSize = params.projectileSize || 0.3;
        const projectileColor = params.projectileColor || enemy.color || 0xff0000;
        
        // Get direction to player
        const playerPos = player.getPosition();
        const direction = new THREE.Vector3(
            playerPos.x - enemy.position.x,
            0,
            playerPos.z - enemy.position.z
        ).normalize();
        
        // Adjust starting position to be in front of the enemy
        const startPosition = new THREE.Vector3(
            enemy.position.x + direction.x * (enemy.size / 2 + 0.2),
            enemy.position.y + enemy.size / 2,
            enemy.position.z + direction.z * (enemy.size / 2 + 0.2)
        );
        
        // Create projectile in the projectile system
        if (window.game && window.game.projectileSystem) {
            window.game.projectileSystem.createEnemyProjectile(
                startPosition,
                direction,
                projectileSpeed,
                damage,
                lifetime,
                projectileColor,
                projectileSize,
                variance
            );
            return true;
        } else {
            // Fallback: Create projectile directly
            this.createProjectile(
                startPosition,
                direction,
                projectileSpeed,
                damage,
                lifetime,
                projectileColor,
                projectileSize,
                variance
            );
            return true;
        }
    }
    
    // Execute a slam attack
    executeSlamAttack(enemy, player, params = {}) {
        // Extract parameters with defaults
        const range = params.range || enemy.attackRange * 1.5 || 3;
        const damage = params.damage || enemy.baseDamage * 1.5 || 15;
        const variance = params.variance || enemy.damageVariance || 0.2;
        const knockback = params.knockback || 4;
        const jumpHeight = params.jumpHeight || 3;
        const jumpDuration = params.jumpDuration || 0.5; // seconds
        
        // Save original position for animation
        const originalY = enemy.position.y;
        
        // Make enemy temporarily invulnerable during animation
        enemy.isInvulnerable = true;
        
        // Animation to jump up
        const startTime = Date.now();
        const jumpInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000; // convert to seconds
            const progress = Math.min(elapsed / jumpDuration, 1);
            
            // Parabolic jump - up then down
            const jumpOffset = Math.sin(progress * Math.PI) * jumpHeight;
            enemy.position.y = originalY + jumpOffset;
            
            if (progress >= 1) {
                clearInterval(jumpInterval);
                
                // Apply slam damage and knockback when landing
                this.applySlamEffect(enemy, player, range, damage, variance, knockback);
                
                // Reset position and vulnerability
                enemy.position.y = originalY;
                enemy.isInvulnerable = false;
            }
        }, 16); // ~60fps
        
        return true;
    }
    
    // Apply slam damage and effects when landing
    applySlamEffect(enemy, player, range, damage, variance, knockback) {
        // Check if player is in range
        const distance = enemy.getDistanceToPlayer(player);
        if (distance > range) {
            return false; // Slam missed
        }
        
        // Calculate damage based on distance (more damage closer to center)
        const damageMultiplier = 1 - (distance / range);
        const damageVariance = 1 + (Math.random() * variance * 2 - variance);
        const actualDamage = Math.round(damage * damageMultiplier * damageVariance);
        
        // Apply damage to player
        player.takeDamage(actualDamage);
        
        // Apply knockback away from slam center
        const knockbackDirection = new THREE.Vector3(
            player.position.x - enemy.position.x,
            0,
            player.position.z - enemy.position.z
        ).normalize();
        
        player.applyKnockback(knockbackDirection, knockback);
        
        // Visual effect for the slam (created in the scene)
        if (window.game && window.game.scene) {
            this.createSlamEffect(enemy.position, range, enemy.color);
        }
        
        return true;
    }
    
    // Create a visual effect for the slam attack
    createSlamEffect(position, radius, color) {
        // Create a ring geometry for the shockwave
        const segments = 32;
        const ringGeometry = new THREE.RingGeometry(0, radius, segments);
        
        // Shockwave material
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color || 0xff0000,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        // Create mesh
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        
        // Position at ground level
        ring.position.set(position.x, 0.1, position.z);
        ring.rotation.x = -Math.PI / 2; // Lay flat on ground
        
        // Add to scene
        window.game.scene.add(ring);
        
        // Animate the shockwave
        const duration = 0.5; // seconds
        const startTime = Date.now();
        
        const expandInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000; // convert to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand the ring
            ringGeometry.dispose(); // Clean up old geometry
            ring.geometry = new THREE.RingGeometry(
                progress * radius, 
                progress * radius + 0.3, 
                segments
            );
            
            // Fade out
            ringMaterial.opacity = 0.7 * (1 - progress);
            
            if (progress >= 1) {
                clearInterval(expandInterval);
                
                // Clean up
                window.game.scene.remove(ring);
                ringGeometry.dispose();
                ringMaterial.dispose();
            }
        }, 16); // ~60fps
    }
    
    // Create a projectile directly (fallback if projectileSystem isn't available)
    createProjectile(position, direction, speed, damage, lifetime, color, size, damageVariance) {
        // Create projectile geometry
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.5
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        
        // Create light
        const light = new THREE.PointLight(color, 1, 3);
        light.position.set(0, 0, 0);
        mesh.add(light);
        
        // Add to scene
        if (window.game && window.game.scene) {
            window.game.scene.add(mesh);
        }
        
        // Create projectile object
        const projectile = {
            mesh: mesh,
            direction: direction,
            speed: speed,
            damage: damage,
            damageVariance: damageVariance,
            timeAlive: 0,
            lifetime: lifetime,
            active: true
        };
        
        // Add to projectiles array
        this.projectiles.push(projectile);
        
        return projectile;
    }
    
    // Update all projectiles
    update(deltaTime, player) {
        // Update each projectile
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Skip inactive projectiles
            if (!projectile.active) {
                continue;
            }
            
            // Update position
            projectile.mesh.position.x += projectile.direction.x * projectile.speed * deltaTime;
            projectile.mesh.position.z += projectile.direction.z * projectile.speed * deltaTime;
            
            // Update lifetime
            projectile.timeAlive += deltaTime;
            if (projectile.timeAlive >= projectile.lifetime) {
                this.destroyProjectile(projectile);
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Check for collision with player
            const projectilePos = projectile.mesh.position;
            const playerPos = player.getPosition();
            const dx = projectilePos.x - playerPos.x;
            const dz = projectilePos.z - playerPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < player.collisionRadius + 0.3) {
                // Calculate damage with variance
                const variance = 1 + (Math.random() * projectile.damageVariance * 2 - projectile.damageVariance);
                const damage = Math.round(projectile.damage * variance);
                
                // Apply damage to player
                player.takeDamage(damage);
                
                // Apply knockback
                const knockbackDirection = new THREE.Vector3(dx, 0, dz).normalize();
                player.applyKnockback(knockbackDirection, 1);
                
                // Destroy projectile
                this.destroyProjectile(projectile);
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    // Destroy a projectile
    destroyProjectile(projectile) {
        projectile.active = false;
        
        if (projectile.mesh && projectile.mesh.parent) {
            projectile.mesh.parent.remove(projectile.mesh);
            
            // Dispose of resources
            if (projectile.mesh.geometry) {
                projectile.mesh.geometry.dispose();
            }
            
            if (projectile.mesh.material) {
                if (Array.isArray(projectile.mesh.material)) {
                    projectile.mesh.material.forEach(material => material.dispose());
                } else {
                    projectile.mesh.material.dispose();
                }
            }
        }
    }
    
    // Clean up all projectiles
    clear() {
        for (const projectile of this.projectiles) {
            this.destroyProjectile(projectile);
        }
        this.projectiles = [];
    }
}

// Helper functions to create attack configurations

// Create a melee attack configuration
export function createMeleeAttack(params = {}) {
    return {
        type: AttackType.MELEE,
        range: params.range || 2,
        damage: params.damage || 10,
        variance: params.variance || 0.2,
        knockback: params.knockback || 2,
        cooldown: params.cooldown || 1.5
    };
}

// Create a ranged attack configuration
export function createRangedAttack(params = {}) {
    return {
        type: AttackType.RANGED,
        projectileSpeed: params.projectileSpeed || 8,
        damage: params.damage || 8,
        variance: params.variance || 0.2,
        lifetime: params.lifetime || 3,
        projectileSize: params.projectileSize || 0.3,
        projectileColor: params.projectileColor || 0xff0000,
        cooldown: params.cooldown || 2
    };
}

// Create a slam attack configuration
export function createSlamAttack(params = {}) {
    return {
        type: AttackType.SLAM,
        range: params.range || 3,
        damage: params.damage || 15,
        variance: params.variance || 0.2,
        knockback: params.knockback || 4,
        jumpHeight: params.jumpHeight || 3,
        jumpDuration: params.jumpDuration || 0.5,
        cooldown: params.cooldown || 5
    };
}

// Export a singleton instance for global use
export const enemyAttacks = new AttackSystem();
