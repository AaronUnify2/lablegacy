// src/entities/player.js - Player character implementation with dual weapons
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
        
        // Weapons
        this.weapons = {
            sword: {
                type: 'sword',
                damage: 10,
                durability: 100,
                maxDurability: 100,
                range: 2,
                attackSpeed: 1.0,
                mesh: null
            },
            staff: {
                type: 'staff',
                damage: 8,
                durability: 100,
                maxDurability: 100,
                range: 15,
                attackSpeed: 0.8,
                cooldown: 0.7,
                cooldownTimer: 0,
                projectileSpeed: 15,
                mesh: null
            }
        };
        
        // Ranged attack properties
        this.projectiles = [];
        this.maxProjectiles = 10; // Maximum number of projectiles active at once
        
        // Inventory
        this.inventory = [];
        this.maxInventorySize = 20;
        
        // Three.js objects
        this.object = null;
        this.collider = null;
        this.mesh = null;
    }
    
    // Initialize player's 3D model and physics
    init() {
        // Create simple player mesh
        const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const material = new THREE.MeshLambertMaterial({ color: 0x00aaff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Create player container to handle rotations better
        this.object = new THREE.Object3D();
        this.object.position.set(this.position.x, this.position.y, this.position.z);
        this.object.add(this.mesh);
        
        // Add weapon models
        this.createWeaponModels();
        
        // Create collider
        this.updateCollider();
    }
    
    // Create visual representations of the player's weapons
    createWeaponModels() {
        // Create sword model for right hand
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
        
        // Position sword in player's right hand
        this.weapons.sword.mesh.position.set(0.5, 0.3, 0.5);
        this.weapons.sword.mesh.rotation.z = -Math.PI / 4;
        
        this.object.add(this.weapons.sword.mesh);
        
        // Create staff model for left hand
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
        
        // Position staff in player's left hand
        this.weapons.staff.mesh.position.set(-0.5, 0.3, 0.5);
        this.weapons.staff.mesh.rotation.z = Math.PI / 10;
        
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
        
        // Get staff position and player facing direction
        const staffWorldPosition = new THREE.Vector3();
        this.weapons.staff.mesh.getWorldPosition(staffWorldPosition);
        
        // Set direction to match the player's facing direction (FIXED: reversed direction)
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
        
        // Set initial position slightly in front of the staff
        const startPosition = new THREE.Vector3(
            staffWorldPosition.x + direction.x * 0.7,
            staffWorldPosition.y + 0.65, // Position at the staff top
            staffWorldPosition.z + direction.z * 0.7
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
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    // Check projectile collisions with enemies
    checkProjectileCollisions(enemies) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            const projectilePos = projectile.mesh.position;
            
            // Check collision with each enemy
            for (const enemy of enemies) {
                const enemyPos = enemy.getPosition();
                const distance = Math.sqrt(
                    Math.pow(projectilePos.x - enemyPos.x, 2) +
                    Math.pow(projectilePos.z - enemyPos.z, 2)
                );
                
                // If collision detected
                if (distance < 1.0) { // Assuming enemy has ~1 unit radius
                    // Damage the enemy
                    enemy.takeDamage(projectile.damage);
                    
                    // Remove the projectile
                    this.projectiles.splice(i, 1);
                    
                    // Return true to indicate a hit
                    return true;
                }
            }
        }
        
        return false;
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
            
            // Flash effect for invulnerability
            this.mesh.visible = Math.floor(this.invulnerabilityTime * 10) % 2 === 0;
        } else {
            this.mesh.visible = true;
        }
        
        // Update 3D object position and rotation
        this.object.position.copy(this.position);
        
        // Update collider
        this.updateCollider();
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
        
        // Update rotation based on movement direction
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
            
            this.object.rotation.y = this.rotation;
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
    
    // Start a melee attack with the sword
    startMeleeAttack() {
        this.isAttacking = true;
        this.attackTimer = this.attackCooldown;
        
        // Reduce weapon durability
        this.weapons.sword.durability -= 1;
        if (this.weapons.sword.durability <= 0) {
            // Weapon broke!
            console.log('Sword broke!');
            // TODO: Handle weapon breaking
        }
        
        // Start attack animation
        this.attackAnimationTime = 0;
        this.attackAnimationDuration = 0.3;
        
        // Store original weapon rotation for animation
        this.swordOrigRotation = this.weapons.sword.mesh.rotation.z;
    }
    
    // Fire a projectile from the staff
    fireStaffProjectile(scene) {
        // Set cooldown
        this.weapons.staff.cooldownTimer = this.weapons.staff.cooldown;
        
        // Create projectile
        const projectileMesh = this.createProjectile();
        
        // Add projectile to scene
        scene.add(projectileMesh);
        
        // Reduce staff durability
        this.weapons.staff.durability -= 0.5; // Less durability use than sword
        
        // Do staff animation
        this.animateStaffCast();
    }
    
    // Animate staff casting
    animateStaffCast() {
        // Quick pulse animation for staff
        const staffTop = this.weapons.staff.mesh.children[1]; // The glowing orb at top of staff
        const originalScale = staffTop.scale.clone();
        
        // Scale up quickly
        staffTop.scale.set(1.5, 1.5, 1.5);
        
        // Then return to normal scale
        setTimeout(() => {
            staffTop.scale.copy(originalScale);
        }, 150);
    }
    
    // Update attack animation
    updateAttackAnimation(deltaTime) {
        this.attackAnimationTime += deltaTime;
        
        // Simple attack animation - swing the sword
        const progress = this.attackAnimationTime / this.attackAnimationDuration;
        
        if (progress < 0.5) {
            // First half of animation - swing back
            const swingBackAmount = Math.PI / 2;
            this.weapons.sword.mesh.rotation.z = this.swordOrigRotation + progress * 2 * swingBackAmount;
        } else if (progress < 1) {
            // Second half - swing forward
            const swingForwardAmount = Math.PI;
            this.weapons.sword.mesh.rotation.z = this.swordOrigRotation + 
                Math.PI / 2 - (progress - 0.5) * 2 * swingForwardAmount;
        } else {
            // End animation
            this.weapons.sword.mesh.rotation.z = this.swordOrigRotation;
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
    
    // Clean up all projectiles
    cleanupProjectiles(scene) {
        for (const projectile of this.projectiles) {
            scene.remove(projectile.mesh);
        }
        this.projectiles = [];
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
        if (this.inventory.length < this.maxInventorySize) {
            this.inventory.push(item);
            return true;
        }
        return false;
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
}
