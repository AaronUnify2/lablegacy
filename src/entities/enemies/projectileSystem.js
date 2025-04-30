// src/entities/enemies/projectileSystem.js - System for handling enemy projectiles in the game

import * as THREE from 'three';

// Main projectile system class for enemy projectiles
export class ProjectileSystem {
    constructor() {
        // Array of active projectiles
        this.projectiles = [];
        
        // Object pooling for performance
        this.projectilePool = {
            active: new Set(),
            inactive: []
        };
        
        // Maximum number of projectiles allowed at once
        this.maxProjectiles = 100;
    }
    
    // Initialize the system
    init(scene) {
        this.scene = scene;
        console.log('Enemy projectile system initialized');
    }
    
    // Create an enemy projectile
    createEnemyProjectile(position, direction, speed, damage, lifetime, color = 0xff0000, size = 0.3, damageVariance = 0.2) {
        // Check if we've hit the limit
        if (this.projectiles.length >= this.maxProjectiles) {
            // Remove oldest projectile if we're at the limit
            const oldest = this.projectiles.shift();
            this.destroyProjectile(oldest);
        }
        
        // Try to reuse a projectile from the pool
        let projectile = null;
        
        if (this.projectilePool.inactive.length > 0) {
            // Reuse an inactive projectile
            projectile = this.projectilePool.inactive.pop();
            
            // Reset properties
            projectile.position.copy(position);
            projectile.direction.copy(direction);
            projectile.speed = speed;
            projectile.damage = damage;
            projectile.damageVariance = damageVariance;
            projectile.lifetime = lifetime;
            projectile.timeAlive = 0;
            projectile.active = true;
            
            // Reset mesh position
            projectile.mesh.position.copy(position);
            
            // Update material color if different
            if (projectile.mesh.material.color.getHex() !== color) {
                projectile.mesh.material.color.setHex(color);
                projectile.mesh.material.emissive.setHex(color);
                
                // Update light color
                if (projectile.mesh.children[0] && projectile.mesh.children[0].isLight) {
                    projectile.mesh.children[0].color.setHex(color);
                }
            }
            
            // Update mesh scale if different
            if (projectile.mesh.geometry.parameters.radius !== size) {
                projectile.mesh.scale.set(size / 0.3, size / 0.3, size / 0.3);
            }
            
            // Set to visible
            projectile.mesh.visible = true;
            
            // Add back to scene if needed
            if (!projectile.mesh.parent) {
                this.scene.add(projectile.mesh);
            }
        } else {
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
            if (this.scene) {
                this.scene.add(mesh);
            }
            
            // Create projectile object
            projectile = {
                mesh: mesh,
                position: position.clone(),
                direction: direction.clone(),
                speed: speed,
                damage: damage,
                damageVariance: damageVariance,
                timeAlive: 0,
                lifetime: lifetime,
                active: true
            };
        }
        
        // Add to active projectiles
        this.projectiles.push(projectile);
        this.projectilePool.active.add(projectile);
        
        return projectile;
    }
    
    // Update all projectiles
    update(deltaTime, player) {
        // Skip if no scene
        if (!this.scene) return;
        
        // Update each projectile
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Skip inactive projectiles
            if (!projectile.active) {
                continue;
            }
            
            // Update position
            projectile.position.x += projectile.direction.x * projectile.speed * deltaTime;
            projectile.position.y += projectile.direction.y * projectile.speed * deltaTime; // Allow vertical movement
            projectile.position.z += projectile.direction.z * projectile.speed * deltaTime;
            
            // Update mesh position
            projectile.mesh.position.copy(projectile.position);
            
            // Add slight rotation for visual interest
            projectile.mesh.rotation.x += deltaTime * 2;
            projectile.mesh.rotation.z += deltaTime * 3;
            
            // Update lifetime
            projectile.timeAlive += deltaTime;
            if (projectile.timeAlive >= projectile.lifetime) {
                this.recycleProjectile(projectile, i);
                continue;
            }
            
            // Check for collision with player
            this.checkPlayerCollision(projectile, player, i);
        }
    }
    
    // Check for collision with player
    checkPlayerCollision(projectile, player, index) {
        // Skip if player is invulnerable or projectile is inactive
        if (!projectile.active || !player || player.invulnerabilityTime > 0) {
            return false;
        }
        
        const playerPos = player.getPosition();
        const collisionRadius = player.collisionRadius || 0.8;
        
        // Calculate distance
        const dx = projectile.position.x - playerPos.x;
        const dy = projectile.position.y - playerPos.y;
        const dz = projectile.position.z - playerPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz); // Only check XZ plane for gameplay simplicity
        
        // Check if within collision radius
        if (distance < collisionRadius + 0.3) {
            // Calculate damage with variance
            const variance = 1 + (Math.random() * projectile.damageVariance * 2 - projectile.damageVariance);
            const damage = Math.round(projectile.damage * variance);
            
            // Apply damage to player
            player.takeDamage(damage);
            
            // Apply knockback
            const knockbackDirection = new THREE.Vector3(dx, 0, dz).normalize();
            player.applyKnockback(knockbackDirection, 1);
            
            // Recycle projectile
            this.recycleProjectile(projectile, index);
            
            // Create hit effect
            this.createHitEffect(projectile.position.clone(), 0xffff00, 0.5);
            
            return true;
        }
        
        return false;
    }
    
    // Create a hit effect at the impact point
    createHitEffect(position, color = 0xffff00, size = 0.5) {
        // Create a simple particle burst
        const particleCount = 8;
        const particles = [];
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            // Create particle geometry
            const particleGeometry = new THREE.SphereGeometry(size * 0.2, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.8
            });
            
            // Create mesh
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Add to scene
            this.scene.add(particle);
            particles.push(particle);
            
            // Give random direction
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            
            // Store direction and speed on particle
            particle.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.random() * 2,  // Some upward velocity
                Math.sin(angle) * speed
            );
            
            // Make particles fade out and shrink
            particle.userData.fadeSpeed = 3 + Math.random() * 2;
        }
        
        // Animate particles
        const startTime = Date.now();
        const duration = 0.5; // seconds
        
        const animateParticles = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            
            if (elapsed > duration) {
                // Clean up particles
                particles.forEach(particle => {
                    if (particle.parent) {
                        this.scene.remove(particle);
                    }
                    if (particle.geometry) {
                        particle.geometry.dispose();
                    }
                    if (particle.material) {
                        particle.material.dispose();
                    }
                });
                
                // Stop animation
                return;
            }
            
            // Update particles
            const progress = elapsed / duration;
            
            particles.forEach(particle => {
                // Move particle
                particle.position.x += particle.userData.velocity.x * 0.016;
                particle.position.y += particle.userData.velocity.y * 0.016;
                particle.position.z += particle.userData.velocity.z * 0.016;
                
                // Slow down
                particle.userData.velocity.multiplyScalar(0.95);
                
                // Fade out
                particle.material.opacity = 0.8 * (1 - progress);
                
                // Shrink
                const scale = 1 - progress;
                particle.scale.set(scale, scale, scale);
            });
            
            // Continue animation
            requestAnimationFrame(animateParticles);
        };
        
        // Start animation
        animateParticles();
    }
    
    // Recycle a projectile
    recycleProjectile(projectile, index) {
        // Set as inactive
        projectile.active = false;
        
        // Remove from active array
        if (index !== undefined) {
            this.projectiles.splice(index, 1);
        } else {
            const projectileIndex = this.projectiles.indexOf(projectile);
            if (projectileIndex !== -1) {
                this.projectiles.splice(projectileIndex, 1);
            }
        }
        
        // Remove from active set
        this.projectilePool.active.delete(projectile);
        
        // Hide mesh
        projectile.mesh.visible = false;
        
        // Add to inactive pool
        this.projectilePool.inactive.push(projectile);
    }
    
    // Destroy a projectile completely
    destroyProjectile(projectile) {
        if (!projectile) return;
        
        // Remove from active set
        this.projectilePool.active.delete(projectile);
        
        // Remove from inactive array
        const inactiveIndex = this.projectilePool.inactive.indexOf(projectile);
        if (inactiveIndex !== -1) {
            this.projectilePool.inactive.splice(inactiveIndex, 1);
        }
        
        // Remove from scene
        if (projectile.mesh && projectile.mesh.parent) {
            projectile.mesh.parent.remove(projectile.mesh);
        }
        
        // Dispose of resources
        if (projectile.mesh) {
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
    
    // Clear all projectiles
    clear() {
        // Destroy all active projectiles
        this.projectiles.forEach(projectile => {
            this.destroyProjectile(projectile);
        });
        
        // Destroy all inactive projectiles
        this.projectilePool.inactive.forEach(projectile => {
            this.destroyProjectile(projectile);
        });
        
        // Reset arrays
        this.projectiles = [];
        this.projectilePool.active.clear();
        this.projectilePool.inactive = [];
    }
}

// Export a singleton instance
export const projectileSystem = new ProjectileSystem();
