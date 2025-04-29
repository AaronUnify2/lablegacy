// src/entities/projectiles/projectileSystem.js - Handles all projectiles in the game
import * as THREE from 'three';

// Projectile types
export const ProjectileType = {
    PLAYER_MAGIC: 'playerMagic',
    ENEMY_MAGIC: 'enemyMagic',
    ARROW: 'arrow',
    BULLET: 'bullet',
    FIREBALL: 'fireball',
    ICE_SHARD: 'iceShard',
    ENERGY: 'energy'
};

// Projectile effects
export const ProjectileEffect = {
    NONE: 'none',
    FIRE: 'fire',      // DoT damage
    ICE: 'ice',        // Slows
    LIGHTNING: 'lightning', // Chains to nearby enemies
    POISON: 'poison',  // DoT damage
    EXPLOSIVE: 'explosive', // Area damage
    STUN: 'stun'       // Stuns enemies
};

// Projectile system class
export class ProjectileSystem {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = [];
        this.templates = new Map(); // Cached projectile templates
        
        // Configuration
        this.maxProjectiles = 100; // Limit for performance
        this.cleanupInterval = 5000; // Cleanup dead projectiles every 5 seconds
        
        // Start cleanup timer
        this.setupCleanupTimer();
    }
    
    // Set up timer to clean up old/dead projectiles
    setupCleanupTimer() {
        setInterval(() => {
            this.cleanupDeadProjectiles();
        }, this.cleanupInterval);
    }
    
    // Create a new projectile
    createProjectile(options = {}) {
        // Check if at projectile limit
        if (this.projectiles.length >= this.maxProjectiles) {
            // Remove oldest projectile if at limit
            this.removeOldestProjectile();
        }
        
        // Set up default options
        const projectileOptions = {
            type: options.type || ProjectileType.PLAYER_MAGIC,
            position: options.position || new THREE.Vector3(0, 1, 0),
            direction: options.direction || new THREE.Vector3(0, 0, -1),
            speed: options.speed || 15,
            damage: options.damage || 10,
            size: options.size || 0.3,
            lifetime: options.lifetime || 3.0,
            color: options.color || 0x4040ff,
            effect: options.effect || ProjectileEffect.NONE,
            effectValue: options.effectValue || 0,
            effectDuration: options.effectDuration || 0,
            owner: options.owner || null,
            hitRadius: options.hitRadius || 0.3,
            hitMultiple: options.hitMultiple || false,
            gravity: options.gravity || false,
            bounces: options.bounces || 0,
            piercing: options.piercing || false,
            homing: options.homing || false,
            homingTarget: options.homingTarget || null,
            homingStrength: options.homingStrength || 0.1,
            trailEffect: options.trailEffect || false,
            lightIntensity: options.lightIntensity || 1.0,
            lightRadius: options.lightRadius || 3.0,
            lightColor: options.lightColor || null,
            ...options
        };
        
        // Normalize direction
        projectileOptions.direction.normalize();
        
        // Create mesh for projectile
        const mesh = this.createProjectileMesh(projectileOptions);
        mesh.position.copy(projectileOptions.position);
        
        // Create collision objects
        const collider = {
            min: new THREE.Vector3().subScalar(projectileOptions.hitRadius),
            max: new THREE.Vector3().addScalar(projectileOptions.hitRadius)
        };
        
        // Create projectile object
        const projectile = {
            id: Math.random().toString(36).substring(2, 15),
            mesh: mesh,
            position: mesh.position,
            velocity: projectileOptions.direction.clone().multiplyScalar(projectileOptions.speed),
            collider: collider,
            size: projectileOptions.size,
            hitRadius: projectileOptions.hitRadius,
            damage: projectileOptions.damage,
            lifetime: projectileOptions.lifetime,
            timeAlive: 0,
            type: projectileOptions.type,
            effect: projectileOptions.effect,
            effectValue: projectileOptions.effectValue,
            effectDuration: projectileOptions.effectDuration,
            owner: projectileOptions.owner,
            hitMultiple: projectileOptions.hitMultiple,
            hitEntities: new Set(), // Track which entities have been hit
            gravity: projectileOptions.gravity,
            bounces: projectileOptions.bounces,
            bouncesRemaining: projectileOptions.bounces,
            piercing: projectileOptions.piercing,
            homing: projectileOptions.homing,
            homingTarget: projectileOptions.homingTarget,
            homingStrength: projectileOptions.homingStrength,
            trailEffect: projectileOptions.trailEffect,
            trailParticles: [],
            color: projectileOptions.color,
            light: null,
            
            // Functions
            update: this.updateProjectile.bind(this),
            checkCollision: this.checkProjectileCollision.bind(this),
            onHit: this.handleProjectileHit.bind(this),
            remove: () => this.removeProjectile(projectile)
        };
        
        // Add light to projectile if specified
        if (projectileOptions.lightIntensity > 0) {
            const lightColor = projectileOptions.lightColor || projectileOptions.color;
            const light = new THREE.PointLight(lightColor, projectileOptions.lightIntensity, projectileOptions.lightRadius);
            mesh.add(light);
            projectile.light = light;
        }
        
        // Add to scene
        this.scene.add(mesh);
        
        // Add to array
        this.projectiles.push(projectile);
        
        return projectile;
    }
    
    // Create mesh for a projectile based on type
    createProjectileMesh(options) {
        // Check if we have a template cached
        const templateKey = `${options.type}_${options.size}_${options.color}`;
        
        if (this.templates.has(templateKey)) {
            return this.templates.get(templateKey).clone();
        }
        
        // Create new mesh based on projectile type
        let geometry, material, mesh;
        
        switch (options.type) {
            case ProjectileType.PLAYER_MAGIC:
                // Magic orb for player
                geometry = new THREE.SphereGeometry(options.size, 8, 8);
                material = new THREE.MeshBasicMaterial({
                    color: options.color,
                    transparent: true,
                    opacity: 0.8
                });
                mesh = new THREE.Mesh(geometry, material);
                
                // Add a small inner core
                const coreGeometry = new THREE.SphereGeometry(options.size * 0.6, 8, 8);
                const coreMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.9
                });
                const core = new THREE.Mesh(coreGeometry, coreMaterial);
                mesh.add(core);
                break;
                
            case ProjectileType.ENEMY_MAGIC:
                // Dark magic for enemies
                geometry = new THREE.SphereGeometry(options.size, 8, 8);
                material = new THREE.MeshBasicMaterial({
                    color: options.color,
                    transparent: true,
                    opacity: 0.7
                });
                mesh = new THREE.Mesh(geometry, material);
                break;
                
            case ProjectileType.FIREBALL:
                // Fire projectile
                geometry = new THREE.SphereGeometry(options.size, 8, 8);
                material = new THREE.MeshBasicMaterial({
                    color: 0xff5500,
                    transparent: true,
                    opacity: 0.8
                });
                mesh = new THREE.Mesh(geometry, material);
                
                // Add a light for glow effect
                const fireLight = new THREE.PointLight(0xff5500, 1, 5);
                mesh.add(fireLight);
                break;
                
            case ProjectileType.ICE_SHARD:
                // Ice projectile
                geometry = new THREE.ConeGeometry(options.size * 0.7, options.size * 2, 8);
                material = new THREE.MeshBasicMaterial({
                    color: 0x88ccff,
                    transparent: true,
                    opacity: 0.7
                });
                mesh = new THREE.Mesh(geometry, material);
                
                // Rotate to point forward
                mesh.rotation.x = Math.PI / 2;
                break;
                
            case ProjectileType.ARROW:
                // Arrow projectile
                mesh = new THREE.Group();
                
                // Arrow shaft
                const shaftGeometry = new THREE.CylinderGeometry(0.03, 0.03, options.size * 2, 8);
                const shaftMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
                shaft.rotation.z = Math.PI / 2;
                mesh.add(shaft);
                
                // Arrow head
                const headGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
                const headMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
                const head = new THREE.Mesh(headGeometry, headMaterial);
                head.rotation.z = Math.PI / 2;
                head.position.x = options.size;
                mesh.add(head);
                
                // Arrow fletching
                const fletchGeometry = new THREE.BoxGeometry(0.3, 0.02, 0.1);
                const fletchMaterial = new THREE.MeshLambertMaterial({ color: 0xdd0000 });
                const fletch = new THREE.Mesh(fletchGeometry, fletchMaterial);
                fletch.position.x = -options.size + 0.1;
                fletch.position.y = 0;
                mesh.add(fletch);
                break;
                
            case ProjectileType.ENERGY:
                // Energy beam
                geometry = new THREE.CylinderGeometry(options.size * 0.5, options.size * 0.5, options.size * 2, 8);
                material = new THREE.MeshBasicMaterial({
                    color: options.color,
                    transparent: true,
                    opacity: 0.7
                });
                mesh = new THREE.Mesh(geometry, material);
                
                // Rotate to point forward
                mesh.rotation.z = Math.PI / 2;
                break;
                
            default:
                // Default sphere for any other type
                geometry = new THREE.SphereGeometry(options.size, 8, 8);
                material = new THREE.MeshBasicMaterial({ color: options.color });
                mesh = new THREE.Mesh(geometry, material);
        }
        
        // Cache the template
        this.templates.set(templateKey, mesh.clone());
        
        return mesh;
    }
    
    // Update all projectiles
    update(deltaTime, player, enemies, dungeon) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Update projectile
            projectile.update(deltaTime, player, enemies, dungeon);
            
            // Remove expired projectiles
            if (projectile.timeAlive >= projectile.lifetime) {
                this.removeProjectile(projectile);
            }
        }
    }
    
    // Update a single projectile
    updateProjectile(deltaTime, player, enemies, dungeon) {
        // Increment time alive
        this.timeAlive += deltaTime;
        
        // Apply gravity if enabled
        if (this.gravity) {
            this.velocity.y -= 9.8 * deltaTime;
        }
        
        // Apply homing behavior if enabled
        if (this.homing && this.homingTarget) {
            let targetPosition;
            
            // Get target position based on target type
            if (this.homingTarget === player) {
                targetPosition = player.position;
            } else if (typeof this.homingTarget === 'function') {
                // Target function returns the current target position
                targetPosition = this.homingTarget();
            } else if (this.homingTarget.position) {
                targetPosition = this.homingTarget.position;
            }
            
            if (targetPosition) {
                // Calculate direction to target
                const direction = new THREE.Vector3()
                    .subVectors(targetPosition, this.position)
                    .normalize();
                
                // Interpolate velocity direction toward target direction
                this.velocity.lerp(
                    direction.multiplyScalar(this.velocity.length()),
                    this.homingStrength * deltaTime * 10
                );
            }
        }
        
        // Move projectile based on velocity
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // Update rotation to match velocity
        if (this.mesh) {
            // Calculate rotation from velocity
            this.mesh.lookAt(
                this.position.x + this.velocity.x,
                this.position.y + this.velocity.y,
                this.position.z + this.velocity.z
            );
            
            // Additional rotation for certain projectile types
            if (this.type === ProjectileType.FIREBALL || this.type === ProjectileType.PLAYER_MAGIC) {
                // Rotate around axis for swirling effect
                this.mesh.rotation.z += deltaTime * 5;
            }
        }
        
        // Add trail effect if enabled
        if (this.trailEffect) {
            this.createTrailParticle();
        }
        
        // Check for collisions with walls
        if (dungeon) {
            this.checkCollisionWithDungeon(dungeon);
        }
        
        // Check for collisions with enemies/player
        if (this.owner === player) {
            // Player projectile hits enemies
            for (let i = 0; i < enemies.length; i++) {
                const enemy = enemies[i];
                
                // Skip dead enemies
                if (enemy.isDead) continue;
                
                // Skip already hit enemies unless piercing
                if (this.hitEntities.has(enemy.id) && !this.piercing) continue;
                
                if (this.checkCollision(enemy)) {
                    // Hit enemy
                    this.onHit(enemy);
                    
                    // Track hit entity
                    this.hitEntities.add(enemy.id);
                    
                    // Remove projectile unless it can hit multiple targets
                    if (!this.hitMultiple && !this.piercing) {
                        this.remove();
                        break;
                    }
                }
            }
        } else {
            // Enemy projectile hits player
            if (this.checkCollision(player)) {
                // Hit player
                this.onHit(player);
                
                // Remove projectile
                this.remove();
            }
        }
    }
    
    // Check collision with an entity
    checkProjectileCollision(entity) {
        if (!entity) return false;
        
        let entityCollider;
        
        // Get entity collider
        if (entity.getCollider) {
            entityCollider = entity.getCollider();
        } else if (entity.collider) {
            entityCollider = entity.collider;
        } else {
            // Fallback to simple circle collision
            const distance = new THREE.Vector3()
                .subVectors(this.position, entity.position)
                .length();
            
            return distance < this.hitRadius + (entity.collisionRadius || 1.0);
        }
        
        // Check collision with entity collider
        if (entityCollider) {
            // Update projectile collider position
            const collider = {
                min: new THREE.Vector3(
                    this.position.x - this.hitRadius,
                    this.position.y - this.hitRadius,
                    this.position.z - this.hitRadius
                ),
                max: new THREE.Vector3(
                    this.position.x + this.hitRadius,
                    this.position.y + this.hitRadius,
                    this.position.z + this.hitRadius
                )
            };
            
            // Check for AABB collision
            return !(
                collider.max.x < entityCollider.min.x ||
                collider.min.x > entityCollider.max.x ||
                collider.max.y < entityCollider.min.y ||
                collider.min.y > entityCollider.max.y ||
                collider.max.z < entityCollider.min.z ||
                collider.min.z > entityCollider.max.z
            );
        }
        
        return false;
    }
    
    // Handle projectile hit
    handleProjectileHit(target) {
        // Apply damage
        if (target.takeDamage) {
            target.takeDamage(this.damage);
        }
        
        // Apply effect based on projectile type
        if (this.effect !== ProjectileEffect.NONE && target.applyStatusEffect) {
            target.applyStatusEffect(this.effect, this.effectDuration, this.effectValue);
        }
        
        // Create hit effect
        this.createHitEffect(target);
    }
    
    // Check collision with dungeon walls
    checkCollisionWithDungeon(dungeon) {
        if (!dungeon || !dungeon.getColliders) return;
        
        const colliders = dungeon.getColliders();
        
        for (const collider of colliders) {
            // Simple sphere-AABB collision
            const closestPoint = new THREE.Vector3(
                Math.max(collider.min.x, Math.min(this.position.x, collider.max.x)),
                Math.max(collider.min.y, Math.min(this.position.y, collider.max.y)),
                Math.max(collider.min.z, Math.min(this.position.z, collider.max.z))
            );
            
            const distance = new THREE.Vector3()
                .subVectors(this.position, closestPoint)
                .length();
            
            if (distance < this.hitRadius) {
                // Hit wall
                if (this.bouncesRemaining > 0) {
                    // Calculate normal for bounce
                    const normal = new THREE.Vector3();
                    
                    // Determine which face was hit
                    if (Math.abs(closestPoint.x - collider.min.x) < 0.01) normal.set(-1, 0, 0);
                    else if (Math.abs(closestPoint.x - collider.max.x) < 0.01) normal.set(1, 0, 0);
                    else if (Math.abs(closestPoint.y - collider.min.y) < 0.01) normal.set(0, -1, 0);
                    else if (Math.abs(closestPoint.y - collider.max.y) < 0.01) normal.set(0, 1, 0);
                    else if (Math.abs(closestPoint.z - collider.min.z) < 0.01) normal.set(0, 0, -1);
                    else if (Math.abs(closestPoint.z - collider.max.z) < 0.01) normal.set(0, 0, 1);
                    
                    // Calculate reflection vector
                    const dot = this.velocity.dot(normal);
                    this.velocity.sub(normal.multiplyScalar(2 * dot));
                    
                    // Apply bounce dampening
                    this.velocity.multiplyScalar(0.7);
                    
                    // Decrement bounce counter
                    this.bouncesRemaining--;
                    
                    // Move slightly away from wall to prevent repeated collisions
                    this.position.add(normal.normalize().multiplyScalar(this.hitRadius * 1.1));
                } else {
                    // No bounces left, destroy projectile
                    this.remove();
                }
                
                return true;
            }
        }
        
        return false;
    }
    
    // Create a trail particle effect
    createTrailParticle() {
        // Create particle
        const particleGeometry = new THREE.SphereGeometry(this.size * 0.6, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position at current projectile position
        particle.position.copy(this.position);
        
        // Add to scene
        if (this.mesh.parent) {
            this.mesh.parent.add(particle);
            this.trailParticles.push(particle);
        }
        
        // Animate fade out and shrink
        const startTime = Date.now();
        const duration = 0.5; // seconds
        
        const animateParticle = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Fade out
            particle.material.opacity = 0.7 * (1 - progress);
            
            // Shrink
            particle.scale.set(
                1 - progress * 0.7,
                1 - progress * 0.7,
                1 - progress * 0.7
            );
            
            if (progress >= 1) {
                // Remove when done
                if (particle.parent) {
                    particle.parent.remove(particle);
                }
                
                // Remove from array
                const index = this.trailParticles.indexOf(particle);
                if (index !== -1) {
                    this.trailParticles.splice(index, 1);
                }
                
                return;
            }
            
            requestAnimationFrame(animateParticle);
        };
        
        // Start animation
        animateParticle();
    }
    
    // Create hit effect when projectile hits a target
    createHitEffect(target) {
        // Position at impact point
        const position = this.position.clone();
        
        // Create effect based on projectile type
        switch (this.effect) {
            case ProjectileEffect.FIRE:
                this.createFireHitEffect(position);
                break;
            case ProjectileEffect.ICE:
                this.createIceHitEffect(position);
                break;
            case ProjectileEffect.LIGHTNING:
                this.createLightningHitEffect(position);
                break;
            case ProjectileEffect.EXPLOSIVE:
                this.createExplosionEffect(position);
                break;
            default:
                this.createDefaultHitEffect(position);
                break;
        }
    }
    
    // Create default hit effect
    createDefaultHitEffect(position) {
        // Create flash effect
        const flashGeometry = new THREE.SphereGeometry(this.size * 1.5, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.7
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        
        // Add to scene
        if (this.mesh.parent) {
            this.mesh.parent.add(flash);
        }
        
        // Animate flash
        const startTime = Date.now();
        const duration = 0.3; // seconds
        
        const animateFlash = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade
            flash.scale.set(
                1 + progress * 0.5,
                1 + progress * 0.5,
                1 + progress * 0.5
            );
            
            flash.material.opacity = 0.7 * (1 - progress);
            
            if (progress >= 1) {
                // Remove when done
                if (flash.parent) {
                    flash.parent.remove(flash);
                }
                return;
            }
            
            requestAnimationFrame(animateFlash);
        };
        
        // Start animation
        animateFlash();
    }
    
    // Create fire hit effect
    createFireHitEffect(position) {
        // Create multiple flame particles
        for (let i = 0; i < 8; i++) {
            const size = this.size * (0.5 + Math.random() * 0.5);
            
            // Create flame
            const flameGeometry = new THREE.SphereGeometry(size, 6, 6);
            const flameMaterial = new THREE.MeshBasicMaterial({
                color: Math.random() < 0.5 ? 0xff5500 : 0xff8800,
                transparent: true,
                opacity: 0.7
            });
            
            const flame = new THREE.Mesh(flameGeometry, flameMaterial);
            
            // Position with slight random offset
            flame.position.set(
                position.x + (Math.random() * 2 - 1) * this.size,
                position.y + (Math.random() * 2 - 1) * this.size + this.size * 0.5,
                position.z + (Math.random() * 2 - 1) * this.size
            );
            
            // Add to scene
            if (this.mesh.parent) {
                this.mesh.parent.add(flame);
            }
            
            // Set velocity for animation
            const velocity = {
                x: (Math.random() * 2 - 1) * 2,
                y: 1 + Math.random() * 2,
                z: (Math.random() * 2 - 1) * 2
            };
            
            // Animate flame
            const startTime = Date.now();
            const duration = 0.5 + Math.random() * 0.5; // 0.5-1.0 seconds
            
            const animateFlame = () => {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(elapsed / duration, 1);
                
                // Move upward and outward
                flame.position.x += velocity.x * 0.016;
                flame.position.y += velocity.y * 0.016;
                flame.position.z += velocity.z * 0.016;
                
                // Slow down
                velocity.x *= 0.95;
                velocity.y *= 0.95;
                velocity.z *= 0.95;
                
                // Fade out
                flame.material.opacity = 0.7 * (1 - progress);
                
                if (progress >= 1) {
                    // Remove when done
                    if (flame.parent) {
                        flame.parent.remove(flame);
                    }
                    return;
                }
                
                requestAnimationFrame(animateFlame);
            };
            
            // Start animation
            animateFlame();
        }
    }
    
    // Create ice hit effect
    createIceHitEffect(position) {
        // Create ice shards
        for (let i = 0; i < 10; i++) {
            const size = this.size * (0.2 + Math.random() * 0.3);
            
            // Create shard
            const shardGeometry = new THREE.TetrahedronGeometry(size, 0);
            const shardMaterial = new THREE.MeshBasicMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.7
            });
            
            const shard = new THREE.Mesh(shardGeometry, shardMaterial);
            
            // Position with slight random offset
            shard.position.copy(position);
            
            // Random rotation
            shard.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            // Add to scene
            if (this.mesh.parent) {
                this.mesh.parent.add(shard);
            }
            
            // Set velocity for animation
            const velocity = {
                x: (Math.random() * 2 - 1) * 3,
                y: (Math.random() * 2 - 1) * 3,
                z: (Math.random() * 2 - 1) * 3
            };
            
            // Random rotation speed
            const rotationSpeed = {
                x: Math.random() * 5 - 2.5,
                y: Math.random() * 5 - 2.5,
                z: Math.random() * 5 - 2.5
            };
            
            // Animate shard
            const startTime = Date.now();
            const duration = 0.7 + Math.random() * 0.3; // 0.7-1.0 seconds
            
            const animateShard = () => {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(elapsed / duration, 1);
                
                // Move
                shard.position.x += velocity.x * 0.016;
                shard.position.y += velocity.y * 0.016;
                shard.position.z += velocity.z * 0.016;
                
                // Slow down
                velocity.x *= 0.95;
                velocity.y *= 0.95;
                velocity.z *= 0.95;
                
                // Rotate
                shard.rotation.x += rotationSpeed.x * 0.016;
                shard.rotation.y += rotationSpeed.y * 0.016;
                shard.rotation.z += rotationSpeed.z * 0.016;
                
                // Fade out
                shard.material.opacity = 0.7 * (1 - progress);
                
                if (progress >= 1) {
                    // Remove when done
                    if (shard.parent) {
                        shard.parent.remove(shard);
                    }
                    return;
                }
                
                requestAnimationFrame(animateShard);
            };
            
            // Start animation
            animateShard();
        }
    }
    
    // Create lightning hit effect
    createLightningHitEffect(position) {
        // Create lightning bolts
        for (let i = 0; i < 4; i++) {
            // Create lightning bolt
            const bolt = new THREE.Group();
            bolt.position.copy(position);
            
            // Create lightning segments
            const numSegments = 5 + Math.floor(Math.random() * 3);
            let prevPoint = new THREE.Vector3(0, 0, 0);
            
            for (let j = 0; j < numSegments; j++) {
                // Calculate next point with random deviation
                const nextPoint = new THREE.Vector3(
                    prevPoint.x + (Math.random() * 0.4 - 0.2) * this.size,
                    prevPoint.y + this.size * 0.5 / numSegments,
                    prevPoint.z + (Math.random() * 0.4 - 0.2) * this.size
                );
                
                // Create cylinder for this segment
                const segmentGeometry = new THREE.CylinderGeometry(0.03, 0.03, nextPoint.distanceTo(prevPoint), 4);
                const segmentMaterial = new THREE.MeshBasicMaterial({
                    color: 0x40a0ff,
                    transparent: true,
                    opacity: 0.8
                });
                
                const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
                
                // Position and rotate segment
                segment.position.copy(prevPoint);
                segment.position.lerp(nextPoint, 0.5);
                
                // Point cylinder toward next point
                segment.lookAt(nextPoint);
                segment.rotateX(Math.PI / 2);
                
                bolt.add(segment);
                
                // Update for next segment
                prevPoint = nextPoint;
            }
            
            // Add to scene
            if (this.mesh.parent) {
                this.mesh.parent.add(bolt);
            }
            
            // Animate bolt
            const startTime = Date.now();
            const duration = 0.2 + Math.random() * 0.2; // 0.2-0.4 seconds
            
            const animateBolt = () => {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(elapsed / duration, 1);
                
                // Fade out
                bolt.children.forEach(segment => {
                    segment.material.opacity = 0.8 * (1 - progress);
                });
                
                if (progress >= 1) {
                    // Remove when done
                    if (bolt.parent) {
                        bolt.parent.remove(bolt);
                    }
                    return;
                }
                
                requestAnimationFrame(animateBolt);
            };
            
            // Start animation
            animateBolt();
        }
    }
    
    // Create explosion effect
    createExplosionEffect(position) {
        // Create explosion flash
        const flashGeometry = new THREE.SphereGeometry(this.size * 3, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xff8800,
            transparent: true,
            opacity: 0.8
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        
        // Add to scene
        if (this.mesh.parent) {
            this.mesh.parent.add(flash);
        }
        
        // Add a light for glow
        const light = new THREE.PointLight(0xff5500, 2, 8);
        light.position.copy(position);
        flash.add(light);
        
        // Animate flash
        const startTime = Date.now();
        const duration = 0.3; // seconds
        
        const animateFlash = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade
            flash.scale.set(
                1 + progress * 2,
                1 + progress * 2,
                1 + progress * 2
            );
            
            flash.material.opacity = 0.8 * (1 - progress);
            
            // Fade light
            if (light) {
                light.intensity = 2 * (1 - progress);
            }
            
            if (progress >= 1) {
                // Remove when done
                if (flash.parent) {
                    flash.parent.remove(flash);
                }
                return;
            }
            
            requestAnimationFrame(animateFlash);
        };
        
        // Start animation
        animateFlash();
        
        // Create debris
        for (let i = 0; i < 15; i++) {
            const size = this.size * (0.1 + Math.random() * 0.2);
            
            // Create debris
            const debrisGeometry = new THREE.SphereGeometry(size, 4, 4);
            const debrisMaterial = new THREE.MeshBasicMaterial({
                color: Math.random() < 0.5 ? 0x333333 : 0x555555,
                transparent: true,
                opacity: 0.8
            });
            
            const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
            debris.position.copy(position);
            
            // Add to scene
            if (this.mesh.parent) {
                this.mesh.parent.add(debris);
            }
            
            // Set velocity for animation
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            const velocity = {
                x: Math.cos(angle) * speed,
                y: 1 + Math.random() * 5,
                z: Math.sin(angle) * speed
            };
            
            // Animate debris
            const debrisStartTime = Date.now();
            const debrisDuration = 0.8 + Math.random() * 0.4; // seconds
            
            const animateDebris = () => {
                const elapsed = (Date.now() - debrisStartTime) / 1000;
                const progress = Math.min(elapsed / debrisDuration, 1);
                
                // Apply gravity
                velocity.y -= 9.8 * 0.016;
                
                // Move debris
                debris.position.x += velocity.x * 0.016;
                debris.position.y += velocity.y * 0.016;
                debris.position.z += velocity.z * 0.016;
                
                // Fade out
                debris.material.opacity = 0.8 * (1 - progress);
                
                // Check if hit ground
                if (debris.position.y < size) {
                    debris.position.y = size;
                    velocity.y = -velocity.y * 0.4; // Bounce with dampening
                    velocity.x *= 0.8; // Friction
                    velocity.z *= 0.8; // Friction
                }
                
                if (progress >= 1) {
                    // Remove when done
                    if (debris.parent) {
                        debris.parent.remove(debris);
                    }
                    return;
                }
                
                requestAnimationFrame(animateDebris);
            };
            
            // Start animation
            animateDebris();
        }
        
        // Create smoke
        for (let i = 0; i < 8; i++) {
            const smokeSize = this.size * (1 + Math.random() * 1);
            
            // Create smoke
            const smokeGeometry = new THREE.SphereGeometry(smokeSize, 8, 8);
            const smokeMaterial = new THREE.MeshBasicMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.4
            });
            
            const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
            
            // Position with slight random offset
            smoke.position.copy(position);
            smoke.position.y += smokeSize * 0.5;
            
            // Add to scene
            if (this.mesh.parent) {
                this.mesh.parent.add(smoke);
            }
            
            // Set velocity for animation
            const velocity = {
                x: (Math.random() * 2 - 1) * 0.5,
                y: 0.5 + Math.random() * 1,
                z: (Math.random() * 2 - 1) * 0.5
            };
            
            // Animate smoke
            const smokeStartTime = Date.now();
            const smokeDuration = 1.5 + Math.random() * 1; // seconds
            
            const animateSmoke = () => {
                const elapsed = (Date.now() - smokeStartTime) / 1000;
                const progress = Math.min(elapsed / smokeDuration, 1);
                
                // Move upward and outward
                smoke.position.x += velocity.x * 0.016;
                smoke.position.y += velocity.y * 0.016;
                smoke.position.z += velocity.z * 0.016;
                
                // Expand and fade
                smoke.scale.set(
                    1 + progress * 2,
                    1 + progress,
                    1 + progress * 2
                );
                
                smoke.material.opacity = 0.4 * (1 - progress);
                
                if (progress >= 1) {
                    // Remove when done
                    if (smoke.parent) {
                        smoke.parent.remove(smoke);
                    }
                    return;
                }
                
                requestAnimationFrame(animateSmoke);
            };
            
            // Start animation
            animateSmoke();
        }
    }
    
    // Remove a projectile
    removeProjectile(projectile) {
        // Remove from array
        const index = this.projectiles.indexOf(projectile);
        if (index !== -1) {
            this.projectiles.splice(index, 1);
        }
        
        // Remove mesh from scene
        if (projectile.mesh && projectile.mesh.parent) {
            projectile.mesh.parent.remove(projectile.mesh);
        }
        
        // Remove trail particles
        if (projectile.trailParticles) {
            for (const particle of projectile.trailParticles) {
                if (particle.parent) {
                    particle.parent.remove(particle);
                }
            }
        }
    }
    
    // Remove oldest projectile (used when at max limit)
    removeOldestProjectile() {
        if (this.projectiles.length === 0) return;
        
        // Find projectile with highest timeAlive
        let oldestIndex = 0;
        let highestTime = this.projectiles[0].timeAlive;
        
        for (let i = 1; i < this.projectiles.length; i++) {
            if (this.projectiles[i].timeAlive > highestTime) {
                highestTime = this.projectiles[i].timeAlive;
                oldestIndex = i;
            }
        }
        
        // Remove the oldest projectile
        this.removeProjectile(this.projectiles[oldestIndex]);
    }
    
    // Clean up dead projectiles (those with timeAlive > lifetime)
    cleanupDeadProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (this.projectiles[i].timeAlive >= this.projectiles[i].lifetime) {
                this.removeProjectile(this.projectiles[i]);
            }
        }
    }
    
    // Get all projectiles
    getProjectiles() {
        return this.projectiles;
    }
    
    // Clear all projectiles
    clearAllProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.removeProjectile(this.projectiles[i]);
        }
    }
}

// Create a singleton instance
let projectileSystem = null;

// Get the projectile system (creates one if it doesn't exist)
export function getProjectileSystem(scene) {
    if (!projectileSystem && scene) {
        projectileSystem = new ProjectileSystem(scene);
    }
    return projectileSystem;
}

// Reset the projectile system (for floor transitions, etc.)
export function resetProjectileSystem() {
    if (projectileSystem) {
        projectileSystem.clearAllProjectiles();
    }
}
