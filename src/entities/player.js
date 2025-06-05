// src/entities/player.js - Player character implementation with first-person support
import * as THREE from 'three';

export class Player {
    constructor() {
        // Player stats
        this.maxHealth = 100;
        this.health = 100;
        this.level = 1;
        this.experience = 0;
        this.experienceToNextLevel = 100;
        
        // Movement and position
        this.position = new THREE.Vector3(0, 1.0, 0); // Raised starting position
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.moveSpeed = 5;
        this.dashSpeed = 15;
        this.dashDuration = 0.2;
        this.dashCooldown = 1.0;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        
        // Jump mechanics
        this.isJumping = false;
        this.isFalling = false;
        this.jumpVelocity = 8;      // Initial upward velocity
        this.jumpHeight = 2;        // Maximum jump height
        this.jumpTimer = 0;
        this.jumpDuration = 0.5;    // Time to reach peak of jump
        this.jumpCooldown = 0.05;   // Cooldown between jumps
        this.jumpCooldownTimer = 0;
        this.gravity = 15;          // Gravity force pulling player down
        this.groundLevel = 2.0;     // Current ground level, raised to 1.0
        
        // Rotation
        this.rotation = 0;
        this.rotationSpeed = 10;
        
        // Combat
        this.attackDamage = 10;
        this.attackCooldown = 0.5;
        this.attackTimer = 0;
        this.isAttacking = false;
        this.attackHitbox = null;
        this.invulnerabilityTime = 0;
        
        // First-person view settings
        this.isFirstPerson = true;
        this.bodyVisible = false;  // Hide player body in first-person
        
        // Weapons
        this.weapons = {
            sword: {
                type: 'sword',
                damage: 10,
                range: 2,
                attackSpeed: 1.0,
                mesh: null
            },
            staff: {
                type: 'staff',
                damage: 8,
                range: 15,
                attackSpeed: 0.8,
                cooldown: 0.7,
                cooldownTimer: 0,
                projectileSpeed: 15,
                mesh: null
            }
        };
        
        // Player light - positioned for first-person
        this.playerLight = null;
        this.lightIntensity = 2.0;      
        this.lightRadius = 15;          
        this.lightColor = 0xf8e0a7;     
        this.lightHeight = 0.5;         // Lower light position for first-person
        
        // Ranged attack properties
        this.projectiles = [];
        this.maxProjectiles = 10; // Maximum number of projectiles active at once
        
        // Inventory
        this.inventory = [];
        this.maxInventorySize = 20;
        
        // Add some starting items for testing - using the proper item structure
        this.inventory.push({
            id: 'smallHealthPotion',
            name: 'Small Health Potion',
            type: 'healthPotion', // Using string type to match CSS classes
            description: 'Restores 20 health points.',
            healAmount: 20,
            stackable: true,
            count: 3,
            iconClass: 'healthPotion'
        });

        this.inventory.push({
            id: 'smallStaminaPotion',
            name: 'Small Stamina Potion',
            type: 'staminaPotion', // Using string type to match CSS classes
            description: 'Instantly recharges dash ability.',
            duration: 5,
            stackable: true,
            count: 2,
            iconClass: 'staminaPotion'
        });
        
        // Pause state tracking
        this._wasUnpaused = false;
        this._prePauseState = null;
    }
    
    // Initialize player's 3D model and physics
    init() {
        // Create player mesh (invisible in first-person)
        const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x00aaff,
            transparent: true,
            opacity: this.bodyVisible ? 1.0 : 0.0  // Invisible in first-person
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.visible = this.bodyVisible;
        
        // Create player container to handle rotations better
        this.object = new THREE.Object3D();
        this.object.position.set(this.position.x, this.position.y, this.position.z);
        this.object.add(this.mesh);
        
        // Add weapon models
        this.createWeaponModels();
        
        // Create collider
        this.updateCollider();
        
        // Create player light
        this.recreatePlayerLight();
        
        // Initialize inventory in UI if the global function exists
        if (window.updatePauseMenuInventory) {
            window.updatePauseMenuInventory(this.inventory);
            console.log("Player inventory synchronized with menu system");
        }
        
        console.log("Player initialized for first-person view");
    }
    
    // Create visual representations of the player's weapons (positioned for first-person)
    createWeaponModels() {
        // Create sword model for right side of screen
        const swordGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        const handleGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.15);
        const guardGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.1);
        
        const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const guardMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        
        const blade = new THREE.Mesh(swordGeometry, bladeMaterial);
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        const guard = new THREE.Mesh(guardGeometry, guardMaterial);
        
        // Position parts
        blade.position.set(0, 0.4, 0);
        handle.position.set(0, -0.2, 0);
        guard.position.set(0, 0, 0);
        
        // Create sword container
        this.weapons.sword.mesh = new THREE.Object3D();
        this.weapons.sword.mesh.add(blade);
        this.weapons.sword.mesh.add(handle);
        this.weapons.sword.mesh.add(guard);
        
        // Position sword for first-person view (right side, slightly forward)
        this.weapons.sword.mesh.position.set(1.2, -0.5, 0.8);
        this.weapons.sword.mesh.rotation.set(-0.3, 0, -0.2);
        
        this.object.add(this.weapons.sword.mesh);
        
        // Create staff model for left side of screen
        const staffPoleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8);
        const staffTopGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        
        const staffPoleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const staffTopMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4040ff,
            emissive: 0x0000ff,
            emissiveIntensity: 0.5
        });
        
        const staffPole = new THREE.Mesh(staffPoleGeometry, staffPoleMaterial);
        const staffTop = new THREE.Mesh(staffTopGeometry, staffTopMaterial);
        
        // Position parts
        staffPole.position.set(0, 0, 0);
        staffTop.position.set(0, 0.65, 0);
        
        // Create staff container
        this.weapons.staff.mesh = new THREE.Object3D();
        this.weapons.staff.mesh.add(staffPole);
        this.weapons.staff.mesh.add(staffTop);
        
        // Position staff for first-person view (left side, slightly forward)
        this.weapons.staff.mesh.position.set(-1.2, -0.3, 0.6);
        this.weapons.staff.mesh.rotation.set(-0.2, 0, 0.1);
        
        // Add a small light to the staff top
        const staffLight = new THREE.PointLight(0x4040ff, 0.5, 3);
        staffLight.position.set(0, 0.65, 0);
        this.weapons.staff.mesh.add(staffLight);
        
        this.object.add(this.weapons.staff.mesh);
    }
    
    // Create a magic projectile from the staff
    createProjectile() {
        // Create projectile geometry and material
        const projectileGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const projectileMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x4040ff,
            emissive: 0x0000ff,
            emissiveIntensity: 1.0
        });
        
        // Create projectile mesh
        const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
        
        // Create a light for the projectile
        const projectileLight = new THREE.PointLight(0x4040ff, 1, 5);
        projectileLight.position.set(0, 0, 0);
        projectileMesh.add(projectileLight);
        
        // Add a trail effect to projectiles
        const trailGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0x4040ff,
            transparent: true,
            opacity: 0.6
        });
        
        // Create trail mesh and set it behind the projectile
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        projectileMesh.add(trail);
        trail.position.z = -0.4; // Position it behind the projectile
        
        // Get staff position in world coordinates
        const staffWorldPosition = new THREE.Vector3();
        this.weapons.staff.mesh.getWorldPosition(staffWorldPosition);
        
        // Create direction vector for first-person - use camera/player rotation
        let direction = new THREE.Vector3();
        
        // In first-person, use the player's facing direction (rotation)
        const angleRadians = this.rotation;
        direction.x = Math.sin(angleRadians);
        direction.z = Math.cos(angleRadians);
        direction.y = 0; // Keep projectiles horizontal for now
        
        // Set initial position in front of the player at staff height
        const startPosition = new THREE.Vector3(
            this.position.x + direction.x * 1.5,
            this.position.y + 1.2, // Staff height in first-person
            this.position.z + direction.z * 1.5
        );
        
        projectileMesh.position.copy(startPosition);
        
        // Create projectile object with necessary properties
        const projectile = {
            mesh: projectileMesh,
            direction: direction,
            speed: this.weapons.staff.projectileSpeed,
            damage: this.weapons.staff.damage,
            lifeTime: 3.0, // Seconds before projectile disappears
            timeAlive: 0
        };
        
        this.projectiles.push(projectile);
        
        // Add projectile to scene
        return projectileMesh;
    }

    // Update projectiles
    updateProjectiles(deltaTime, scene) {
        // Process each projectile
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Move projectile in its direction
            projectile.mesh.position.x += projectile.direction.x * projectile.speed * deltaTime;
            projectile.mesh.position.z += projectile.direction.z * projectile.speed * deltaTime;
            
            // Update lifetime
            projectile.timeAlive += deltaTime;
            
            // Remove projectile if it's existed too long
            if (projectile.timeAlive >= projectile.lifeTime) {
                scene.remove(projectile.mesh);
                
                // Properly dispose of Three.js resources
                if (projectile.mesh) {
                    // Dispose of geometries and materials
                    if (projectile.mesh.geometry) {
                        projectile.mesh.geometry.dispose();
                    }
                    
                    if (projectile.mesh.material) {
                        if (Array.isArray(projectile.mesh.material)) {
                            projectile.mesh.material.forEach(mat => mat.dispose());
                        } else {
                            projectile.mesh.material.dispose();
                        }
                    }
                }
                
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    // Check projectile collisions with enemies
    checkProjectileCollisions(enemies, scene) {
        let hitDetected = false;
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            const projectilePos = projectile.mesh.position;
            
            // Check collision with each enemy
            for (const enemy of enemies) {
                // Skip if enemy is dead or doesn't have a position method
                if (!enemy || enemy.state === 'dead' || !enemy.getPosition) continue;
                
                const enemyPos = enemy.getPosition();
                // Skip if enemy position is invalid
                if (!enemyPos) continue;
                
                const distance = Math.sqrt(
                    Math.pow(projectilePos.x - enemyPos.x, 2) +
                    Math.pow(projectilePos.z - enemyPos.z, 2)
                );
                
                // Calculate enemy collision radius - if not defined, use 1.0 as default
                const enemyRadius = enemy.collisionRadius || 1.0;
                
                // If collision detected
                if (distance < enemyRadius + 0.3) { // 0.3 is projectile approximate radius
                    // Damage the enemy
                    if (enemy.takeDamage) {
                        enemy.takeDamage(projectile.damage);
                    }
                    
                    // Remove the projectile from scene
                    if (projectile.mesh && projectile.mesh.parent) {
                        projectile.mesh.parent.remove(projectile.mesh);
                    }
                    
                    // Properly dispose of Three.js resources
                    if (projectile.mesh) {
                        // Dispose of geometries and materials
                        if (projectile.mesh.geometry) {
                            projectile.mesh.geometry.dispose();
                        }
                        
                        if (projectile.mesh.material) {
                            if (Array.isArray(projectile.mesh.material)) {
                                projectile.mesh.material.forEach(mat => mat.dispose());
                            } else {
                                projectile.mesh.material.dispose();
                            }
                        }
                    }
                    
                    // Remove from projectiles array
                    this.projectiles.splice(i, 1);
                    
                    // Create hit effect
                    this.createHitEffect(projectilePos.clone(), scene);
                    
                    hitDetected = true;
                    break; // Once we've hit an enemy, no need to check others for this projectile
                }
            }
        }
        
        return hitDetected;
    }
    
    // Create a hit effect when a projectile hits an enemy
    createHitEffect(position, scene) {
        // Skip if scene is not provided
        if (!scene) return;
        
        // Create a flash of light at the impact point
        const impactLight = new THREE.PointLight(0x4040ff, 2, 4);
        impactLight.position.copy(position);
        scene.add(impactLight);
        
        // Remove the light after a short delay
        setTimeout(() => {
            scene.remove(impactLight);
        }, 200);
        
        // Create particle effect for visual splash
        const particleCount = 8;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Create particle geometry
            const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x4080ff,
                transparent: true,
                opacity: 0.8
            });
            
            // Create mesh
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Add to scene
            scene.add(particle);
            particles.push(particle);
            
            // Give random direction
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 3 + Math.random() * 2;
            
            // Store direction and speed on particle
            particle.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.random() * 3,  // Some upward velocity
                Math.sin(angle) * speed
            );
            
            // Make particles fade out and shrink
            particle.userData.fadeSpeed = 3 + Math.random() * 2;
        }
        
        // Animate particles
        const startTime = Date.now();
        const duration = 0.4; // seconds
        
        const animateParticles = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            
            if (elapsed > duration) {
                // Clean up particles
                particles.forEach(particle => {
                    if (particle.parent) {
                        scene.remove(particle);
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
                particle.userData.velocity.multiplyScalar(0.92);
                
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
    
    // Update the player's bounding box (collider)
    updateCollider() {
        // Create a box collider based on player position and size
        const width = 0.8;
        const height = 1.8;
        const depth = 0.8;
        
        this.collider = {
            min: new THREE.Vector3(
                this.position.x - width/2,
                this.position.y, // Bottom of player is at position.y
                this.position.z - depth/2
            ),
            max: new THREE.Vector3(
                this.position.x + width/2,
                this.position.y + height, // Top of player
                this.position.z + depth/2
            )
        };
    }
    
    // Update player state based on input
    update(deltaTime, input, dungeon, scene) {
        // Emergency reset check - if we're coming back from pause, make sure controls are clean
        if (this._wasUnpaused) {
            console.log("Applying post-unpause cleanup");
            this.velocity.x = 0;
            this.velocity.z = 0;
            this.velocity.y = 0;
            this.isAttacking = false;
            this.isDashing = false;
            this.isJumping = false;
            this._wasUnpaused = false;
        }
        
        // Handle movement
        this.updateMovement(deltaTime, input);
        
        // Handle jumping and gravity
        this.updateJumping(deltaTime, input);
        
        // Handle attacking
        this.updateAttack(deltaTime, input, scene);
        
        // Handle dash ability
        this.updateDash(deltaTime, input);
        
        // Update projectiles
        this.updateProjectiles(deltaTime, scene);
        
        // Update cooldown timers
        if (this.weapons.staff.cooldownTimer > 0) {
            this.weapons.staff.cooldownTimer -= deltaTime;
        }
        
        // Update invulnerability timer
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
            
            // Flash effect for invulnerability (only affects visible body parts)
            if (this.bodyVisible) {
                this.mesh.visible = Math.floor(this.invulnerabilityTime * 10) % 2 === 0;
            }
        } else {
            if (this.bodyVisible) {
                this.mesh.visible = true;
            }
        }
        
        // Update 3D object position and rotation
        this.object.position.copy(this.position);
        
        // Update collider
        this.updateCollider();
        
        // Update player light for first-person view
        if (this.playerLight) {
            // Apply subtle flicker/breathing effect to light
            const flickerAmount = Math.sin(Date.now() * 0.002) * 0.1; // Subtle oscillation
            this.playerLight.intensity = this.lightIntensity + flickerAmount;
            
            // Make light brighter when dashing or jumping
            if (this.isDashing) {
                this.playerLight.intensity = this.lightIntensity + 0.4;
                this.playerLight.distance = this.lightRadius + 3;
            } else if (this.isJumping || this.isFalling) {
                this.playerLight.intensity = this.lightIntensity + 0.2;
                this.playerLight.distance = this.lightRadius + 1;
            } else {
                this.playerLight.distance = this.lightRadius;
            }
            
            // Change light color slightly if player is attacking
            if (this.isAttacking) {
                this.playerLight.color.setHex(0xffe0bd); // Slightly warmer during attack
            } else {
                this.playerLight.color.setHex(this.lightColor);
            }
        }
    }
    
    // Mark player as paused to store current state
    markPaused() {
        // Store current movement state
        this._prePauseState = {
            velocity: { ...this.velocity },
            isJumping: this.isJumping,
            isFalling: this.isFalling,
            isDashing: this.isDashing,
            isAttacking: this.isAttacking
        };
        
        // Freeze all movement
        this.velocity.x = 0;
        this.velocity.z = 0;
    }
    
    // Mark player as unpaused to clean up on next update
    markUnpaused() {
        // Set flag for next update to ensure clean state
        this._wasUnpaused = true;
        
        // Force reset all movement state
        this.velocity.x = 0;
        this.velocity.z = 0;
        this.velocity.y = 0;
        this.isAttacking = false;
        this.isDashing = false;
        // Note: we don't reset jumping state immediately to prevent falling through floors
    }
    
    // Handle player movement
    updateMovement(deltaTime, input) {
        // Reset horizontal velocity
        this.velocity.x = 0;
        this.velocity.z = 0;
        
        // Calculate movement based on input
        const moveSpeed = this.isDashing ? this.dashSpeed : this.moveSpeed;
        
        if (input.moveForward) {
            this.velocity.z -= moveSpeed;
        }
        if (input.moveBackward) {
            this.velocity.z += moveSpeed;
        }
        if (input.moveLeft) {
            this.velocity.x -= moveSpeed;
        }
        if (input.moveRight) {
            this.velocity.x += moveSpeed;
        }
        
        // Normalize velocity for consistent diagonal movement
        if (this.velocity.x !== 0 && this.velocity.z !== 0) {
            const normalized = new THREE.Vector2(this.velocity.x, this.velocity.z).normalize();
            this.velocity.x = normalized.x * moveSpeed;
            this.velocity.z = normalized.y * moveSpeed;
        }
        
        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // In first-person, rotation is handled by the camera system in game.js
        // We still update the player's rotation for projectile direction
        if (this.velocity.x !== 0 || this.velocity.z !== 0) {
            const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
            
            // Smoothly rotate towards movement direction
            const rotationDiff = targetRotation - this.rotation;
            
            // Handle rotation wrapping
            if (rotationDiff > Math.PI) {
                this.rotation += 2 * Math.PI;
            } else if (rotationDiff < -Math.PI) {
                this.rotation -= 2 * Math.PI;
            }
            
            this.rotation = THREE.MathUtils.lerp(
                this.rotation,
                targetRotation,
                this.rotationSpeed * deltaTime
            );
        }
    }
    
    // Handle jumping and gravity
    updateJumping(deltaTime, input) {
        // Update jump cooldown
        if (this.jumpCooldownTimer > 0) {
            this.jumpCooldownTimer -= deltaTime;
        }
        
        // Check if we should start a jump
        if (input.justPressed.jump && !this.isJumping && !this.isFalling && this.jumpCooldownTimer <= 0) {
            this.isJumping = true;
            this.jumpTimer = 0;
            // Play jump sound or animation here if needed
        }
        
        // Apply gravity when in air
        if (this.isJumping || this.isFalling) {
            if (this.isJumping) {
                // In jump phase - going upward
                this.jumpTimer += deltaTime;
                
                // Calculate jump height based on jump curve
                const jumpProgress = this.jumpTimer / this.jumpDuration;
                
                if (jumpProgress < 1.0) {
                    // Still in jump phase
                    // Using a simple ease-out function for jump height
                    const jumpFactor = 1 - Math.pow(1 - jumpProgress, 2);
                    this.position.y = this.groundLevel + (this.jumpHeight * jumpFactor);
                } else {
                    // Reached peak of jump, start falling
                    this.isJumping = false;
                    this.isFalling = true;
                    this.velocity.y = 0;
                }
            } else {
                // In falling phase
                this.velocity.y -= this.gravity * deltaTime;
                this.position.y += this.velocity.y * deltaTime;
                
                // Check if we've landed
                if (this.position.y <= this.groundLevel) {
                    this.position.y = Math.max(this.groundLevel, 0); // Ensure we don't go below ground
                    this.isFalling = false;
                    this.velocity.y = 0;
                    this.jumpCooldownTimer = this.jumpCooldown;
                    // Play landing sound or animation here if needed
                }
            }
        } else if (this.position.y < this.groundLevel) {
            // Safety check - if we're somehow below ground level but not falling, correct it
            this.position.y = Math.max(this.groundLevel, 0);
        }
    }
    
    // Handle player attack
    updateAttack(deltaTime, input, scene) {
        // Update attack cooldown
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }
        
        // Handle melee attack (left mouse button)
        if (input.attack && this.attackTimer <= 0 && !this.isAttacking) {
            this.startMeleeAttack();
        }
        
        // Handle ranged attack (right mouse button)
        if (input.chargeAttack && this.weapons.staff.cooldownTimer <= 0) {
            this.fireStaffProjectile(scene);
        }
        
        // Update attack animation if currently attacking
        if (this.isAttacking) {
            this.updateAttackAnimation(deltaTime);
        }
    }
    
    // Start a melee attack with the sword (enhanced for first-person)
    startMeleeAttack() {
        this.isAttacking = true;
        this.attackTimer = this.attackCooldown;
        
        // Start attack animation
        this.attackAnimationTime = 0;
        this.attackAnimationDuration = 0.3;
        
        // Store original weapon position for animation
        this.swordOrigPosition = this.weapons.sword.mesh.position.clone();
        this.swordOrigRotation = this.weapons.sword.mesh.rotation.clone();
    }
    
    // Fire a projectile from the staff
    fireStaffProjectile(scene) {
        // Set cooldown
        this.weapons.staff.cooldownTimer = this.weapons.staff.cooldown;
        
        // Create projectile
        const projectileMesh = this.createProjectile();
        
        // Add projectile to scene
        scene.add(projectileMesh);
        
        // Do staff animation
        this.animateStaffCast();
    }
    
    // Animate staff casting (enhanced for first-person)
    animateStaffCast() {
        // More dramatic animation for first-person view
        const staffTop = this.weapons.staff.mesh.children[1]; // The glowing orb at top of staff
        const originalScale = staffTop.scale.clone();
        const originalPosition = this.weapons.staff.mesh.position.clone();
        
        // Scale up and move forward quickly
        staffTop.scale.set(1.8, 1.8, 1.8);
        this.weapons.staff.mesh.position.z += 0.3;
        
        // Then return to normal
        setTimeout(() => {
            staffTop.scale.copy(originalScale);
            this.weapons.staff.mesh.position.copy(originalPosition);
        }, 150);
    }
    
    // Update attack animation (enhanced for first-person)
    updateAttackAnimation(deltaTime) {
        this.attackAnimationTime += deltaTime;
        
        // More dramatic sword animation for first-person view
        const progress = this.attackAnimationTime / this.attackAnimationDuration;
        
        if (progress < 0.3) {
            // First phase - pull back
            const pullBackAmount = progress / 0.3;
            this.weapons.sword.mesh.position.x = this.swordOrigPosition.x - pullBackAmount * 0.3;
            this.weapons.sword.mesh.position.z = this.swordOrigPosition.z - pullBackAmount * 0.2;
        } else if (progress < 0.7) {
            // Second phase - swing forward
            const swingAmount = (progress - 0.3) / 0.4;
            this.weapons.sword.mesh.position.x = this.swordOrigPosition.x - 0.3 + swingAmount * 0.6;
            this.weapons.sword.mesh.position.z = this.swordOrigPosition.z - 0.2 + swingAmount * 0.4;
            this.weapons.sword.mesh.rotation.y = this.swordOrigRotation.y + swingAmount * Math.PI / 4;
        } else {
            // Final phase - return to normal
            const returnAmount = (progress - 0.7) / 0.3;
            this.weapons.sword.mesh.position.x = this.swordOrigPosition.x + 0.3 - returnAmount * 0.3;
            this.weapons.sword.mesh.position.z = this.swordOrigPosition.z + 0.2 - returnAmount * 0.2;
            this.weapons.sword.mesh.rotation.y = this.swordOrigRotation.y + (1 - returnAmount) * Math.PI / 4;
        }
        
        if (progress >= 1.0) {
            // End animation - restore original position
            this.weapons.sword.mesh.position.copy(this.swordOrigPosition);
            this.weapons.sword.mesh.rotation.copy(this.swordOrigRotation);
            this.isAttacking = false;
        }
    }
    
    // Handle dash ability
    updateDash(deltaTime, input) {
        // Update dash cooldown
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= deltaTime;
        }
        
        // If dash is on cooldown, you can't dash
        if (this.dashCooldownTimer > 0) {
            return;
        }
        
        // Start dash if input is pressed and not already dashing
        if (input.justPressed.dash && !this.isDashing) {
            this.isDashing = true;
            this.dashTimer = this.dashDuration;
        }
        
        // Update dash state
        if (this.isDashing) {
            this.dashTimer -= deltaTime;
            
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.dashCooldownTimer = this.dashCooldown;
            }
        }
    }
    
    // Clean up all projectiles without removing player light
    cleanupProjectiles(scene) {
        for (const projectile of this.projectiles) {
            // Make sure to remove from scene
            scene.remove(projectile.mesh);
            
            // Proper cleanup of Three.js resources
            if (projectile.mesh) {
                // Dispose of geometries and materials to prevent memory leaks
                if (projectile.mesh.geometry) {
                    projectile.mesh.geometry.dispose();
                }
                
                if (projectile.mesh.material) {
                    if (Array.isArray(projectile.mesh.material)) {
                        projectile.mesh.material.forEach(mat => mat.dispose());
                    } else {
                        projectile.mesh.material.dispose();
                    }
                }
                
                // Remove any lights from the projectile
                projectile.mesh.children.forEach(child => {
                    if (child.isLight) {
                        projectile.mesh.remove(child);
                    }
                });
            }
        }
        
        // Clear projectile array
        this.projectiles = [];
        console.log("Projectiles cleaned up successfully");
    }
    
    // Clean up player light if needed
    cleanupPlayerLight() {
        if (this.playerLight) {
            this.object.remove(this.playerLight);
            if (this.glowMesh) {
                this.playerLight.remove(this.glowMesh);
                this.glowMesh.material.dispose();
                this.glowMesh.geometry.dispose();
                this.glowMesh = null;
            }
            this.playerLight = null;
        }
    }
    
    // Recreate player light for first-person view
    recreatePlayerLight() {
        // Only create a new light if it doesn't exist
        if (!this.playerLight) {
            // Create player light positioned lower for first-person
            this.playerLight = new THREE.PointLight(this.lightColor, this.lightIntensity, this.lightRadius);
            this.playerLight.position.set(0, this.lightHeight, 0); // Lower position for first-person
            this.playerLight.castShadow = true;

            // Configure shadows for better quality
            this.playerLight.shadow.mapSize.width = 512;
            this.playerLight.shadow.mapSize.height = 512;
            this.playerLight.shadow.camera.near = 0.5;
            this.playerLight.shadow.camera.far = 15;

            // Add a subtle ambient glow sphere around the player (smaller for first-person)
            const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: this.lightColor,
                transparent: true,
                opacity: 0.3
            });
            this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
            this.glowMesh.position.set(0, this.lightHeight, 0);
            this.playerLight.add(this.glowMesh); // Add glow as child of light

            // Add light to player object
            this.object.add(this.playerLight);
            
            console.log("Player light created for first-person view");
        }
    }
    
    // Set player light properties
    setLightProperties(intensity, radius, color) {
        if (!this.playerLight) {
            this.recreatePlayerLight();
        }
        
        if (intensity !== undefined) this.lightIntensity = intensity;
        if (radius !== undefined) this.lightRadius = radius;
        if (color !== undefined) this.lightColor = color;
        
        this.playerLight.intensity = this.lightIntensity;
        this.playerLight.distance = this.lightRadius;
        this.playerLight.color.setHex(this.lightColor);
        
        // Update glow color too
        if (this.glowMesh) {
            this.glowMesh.material.color.setHex(this.lightColor);
        }
    }

    // Toggle player light on/off
    toggleLight(enabled) {
        if (!this.playerLight) {
            if (enabled) {
                this.recreatePlayerLight();
            }
            return;
        }
        
        this.playerLight.visible = enabled;
    }
    
    // Toggle between first-person and third-person view
    toggleViewMode() {
        this.isFirstPerson = !this.isFirstPerson;
        this.bodyVisible = !this.isFirstPerson;
        
        if (this.mesh) {
            this.mesh.visible = this.bodyVisible;
            this.mesh.material.opacity = this.bodyVisible ? 1.0 : 0.0;
        }
        
        // Adjust weapon positions based on view mode
        if (this.isFirstPerson) {
            // Position weapons for first-person view
            this.weapons.sword.mesh.position.set(1.2, -0.5, 0.8);
            this.weapons.sword.mesh.rotation.set(-0.3, 0, -0.2);
            
            this.weapons.staff.mesh.position.set(-1.2, -0.3, 0.6);
            this.weapons.staff.mesh.rotation.set(-0.2, 0, 0.1);
            
            // Lower light position
            this.lightHeight = 0.5;
        } else {
            // Position weapons for third-person view
            this.weapons.sword.mesh.position.set(0.5, 0.3, 0.5);
            this.weapons.sword.mesh.rotation.set(0, 0, -Math.PI / 4);
            
            this.weapons.staff.mesh.position.set(-0.5, 0.3, 0.5);
            this.weapons.staff.mesh.rotation.set(0, 0, Math.PI / 10);
            
            // Higher light position
            this.lightHeight = 2.0;
        }
        
        // Update light position
        if (this.playerLight) {
            this.playerLight.position.y = this.lightHeight;
            if (this.glowMesh) {
                this.glowMesh.position.y = this.lightHeight;
            }
        }
        
        console.log(`Switched to ${this.isFirstPerson ? 'first' : 'third'}-person view`);
    }
    
    // Set the ground level for the player
    setGroundLevel(level) {
        this.groundLevel = Math.max(level, 0); // Ensure ground level is never below 0
        
        // If not jumping or falling, snap to ground
        if (!this.isJumping && !this.isFalling) {
            this.position.y = this.groundLevel;
        }
    }
    
    // Get the current ground level
    getGroundLevel() {
        return this.groundLevel;
    }
    
    // Apply knockback to player (used when taking damage)
    applyKnockback(direction, force) {
        this.position.x += direction.x * force;
        this.position.z += direction.z * force;
    }
    
    // Take damage
    takeDamage(amount) {
        // If player is invulnerable, don't take damage
        if (this.invulnerabilityTime > 0) {
            return;
        }
        
        this.health -= amount;
        
        // Cap health at 0
        if (this.health < 0) {
            this.health = 0;
        }

        // Set invulnerability time after taking damage
        this.invulnerabilityTime = 1.0;
        
        // Update UI
        document.getElementById('health-fill').style.width = `${(this.health / this.maxHealth) * 100}%`;
        
        // Check for death
        if (this.health <= 0) {
            this.die();
        }
    }
    
    // Player death
    die() {
        console.log('Player died!');
        // TODO: Handle player death
    }
    
    // Collect an item
    collectItem(item) {
        // Check if we have room in inventory
        if (this.inventory.length < this.maxInventorySize) {
            // Get item data for inventory
            const itemData = item.getItemData();
            
            // Add to inventory
            this.addToInventory(itemData);
            
            // Mark item as collected
            item.collect();
            
            // Notify player
            console.log(`Collected item: ${itemData.name}`);
            
            return true;
        }
        return false;
    }
    
    // Add item to inventory
    addToInventory(itemData) {
        // Check if similar item already exists and is stackable
        const existingItem = this.inventory.find(i => i.id === itemData.id && i.stackable);
        
        if (existingItem) {
            // Increase stack count
            existingItem.count += itemData.count || 1;
        } else {
            // Add as new item
            this.inventory.push({
                ...itemData,
                count: itemData.count || 1
            });
        }
        
        // Update pause menu inventory if it exists
        if (window.updatePauseMenuInventory) {
            window.updatePauseMenuInventory(this.inventory);
        }
        
        return true;
    }
    
    // Get entire inventory
    getInventory() {
        return [...this.inventory];
    }
    
    // Use an item from inventory
    useItem(itemIndex) {
        if (itemIndex < 0 || itemIndex >= this.inventory.length) return false;
        
        const item = this.inventory[itemIndex];
        
        // Apply item effects based on type
        switch (item.type) {
            case 'healthPotion':
            case ItemType.HEALTH_POTION:
                // Only use if not at full health
                if (this.health < this.maxHealth) {
                    const healAmount = item.healAmount || 20; // Default to 20 if missing
                    this.health = Math.min(this.maxHealth, this.health + healAmount);
                    
                    // Remove item or reduce count
                    this.removeFromInventory(itemIndex);
                    
                    // Update UI
                    document.getElementById('health-fill').style.width = `${(this.health / this.maxHealth) * 100}%`;
                    
                    return true;
                }
                return false;
                
            case 'staminaPotion':
            case ItemType.STAMINA_POTION:
                // Reset dash cooldown
                this.dashCooldownTimer = 0;
                
                // If duration is specified, apply special effects
                if (item.duration) {
                    // Could implement continuous jumping here
                    console.log(`Applied stamina boost for ${item.duration} seconds`);
                }
                
                // Remove item or reduce count
                this.removeFromInventory(itemIndex);
                return true;
                
            case 'staffCrystal':
            case ItemType.STAFF_CRYSTAL:
                // Apply staff crystal for new abilities
                const abilityType = item.abilityType || 'generic';
                console.log(`Unlocked staff ability: ${abilityType}`);
                
                // Here we would implement the actual ability unlock
                // For now just show a message
                window.showMessage?.(`Unlocked ${abilityType} staff ability!`, 5000);
                
                // Remove the item (not stackable)
                this.removeFromInventory(itemIndex);
                return true;
                
            default:
                console.log(`No handler for item type: ${item.type}`);
                return false;
        }
    }
    
    // Remove item from inventory
    removeFromInventory(index) {
        if (index < 0 || index >= this.inventory.length) return false;
        
        const item = this.inventory[index];
        
        if (item.count > 1) {
            // Reduce count
            item.count--;
        } else {
            // Remove entirely
            this.inventory.splice(index, 1);
        }
        
        // Update pause menu inventory if it exists
        if (window.updatePauseMenuInventory) {
            window.updatePauseMenuInventory(this.inventory);
        }
        
        return true;
    }
    
    // Get player object (for Three.js)
    getObject() {
        return this.object;
    }
    
    // Get player position
    getPosition() {
        return this.position;
    }
    
    // Set player position
    setPosition(x, y, z) {
        this.position.set(x, Math.max(y, 0), z); // Ensure y is never below 0
        this.object.position.set(x, Math.max(y, 0), z);
    }
    
    // Get player velocity
    getVelocity() {
        return this.velocity;
    }
    
    // Get player collider
    getCollider() {
        return this.collider;
    }
    
    // Get player attack state
    isAttacking() {
        return this.isAttacking;
    }
    
    // Get player attack damage
    getAttackDamage() {
        return this.attackDamage;
    }
    
    // Check if player is in air (jumping or falling)
    isInAir() {
        return this.isJumping || this.isFalling;
    }
    
    // Apply stamina boost effect (for stamina potions)
    applyStaminaBoost(duration) {
        // Reset dash cooldown
        this.dashCooldownTimer = 0;
        
        // TODO: Implement continuous jumping effect for duration
        console.log(`Applied stamina boost for ${duration} seconds`);
        
        return true;
    }
    
    // Unlock new staff ability
    unlockStaffAbility(abilityType) {
        // TODO: Implement staff abilities
        console.log(`Unlocked staff ability: ${abilityType}`);
        
        return true;
    }
    
    // Interaction with chests
    interactWithChest(chest) {
        if (!chest || !chest.canInteract(this.position)) return false;
        
        // Open the chest
        const items = chest.open();
        if (!items) return false;
        
        console.log(`Player opened a ${chest.getTier()} chest and found:`, items);
        
        // Show message to the player
        const tierName = chest.getTier().charAt(0).toUpperCase() + chest.getTier().slice(1);
        window.showMessage?.(`${tierName} Chest: Found ${items.length} items!`);
        
        // Add items to player's inventory
        let itemsAdded = 0;
        for (const item of items) {
            if (this.addToInventory(item)) {
                itemsAdded++;
            }
        }
        
        // Show another message with items added
        if (itemsAdded > 0) {
            window.showMessage?.(`Added ${itemsAdded} items to your inventory`);
        }
        
        return true;
    }
}
