// src/entities/player.js - Player character implementation
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
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.moveSpeed = 5;
        this.dashSpeed = 15;
        this.dashDuration = 0.2;
        this.dashCooldown = 1.0;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        
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
        
        // Current weapon
        this.currentWeapon = {
            type: 'sword',
            damage: 10,
            durability: 100,
            maxDurability: 100,
            range: 2,
            attackSpeed: 1.0
        };
        
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
        
        // Add weapon model
        this.createWeaponModel();
        
        // Create collider
        this.updateCollider();
    }
    
    // Create a visual representation of the player's weapon
    createWeaponModel() {
        // Simple sword model
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
        
        // Create weapon container
        this.weaponMesh = new THREE.Object3D();
        this.weaponMesh.add(blade);
        this.weaponMesh.add(handle);
        this.weaponMesh.add(guard);
        
        // Position weapon in player's hand
        this.weaponMesh.position.set(0.5, 0.3, 0.5);
        this.weaponMesh.rotation.z = -Math.PI / 4;
        
        this.object.add(this.weaponMesh);
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
                this.position.y,
                this.position.z - depth/2
            ),
            max: new THREE.Vector3(
                this.position.x + width/2,
                this.position.y + height,
                this.position.z + depth/2
            )
        };
    }
    
    // Update player state based on input
    update(deltaTime, input, dungeon) {
        // Handle movement
        this.updateMovement(deltaTime, input);
        
        // Handle attacking
        this.updateAttack(deltaTime, input);
        
        // Handle dash ability
        this.updateDash(deltaTime, input);
        
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
        // Reset velocity
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
            this.velocity.normalize().multiplyScalar(moveSpeed);
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
    
    // Handle player attack
    updateAttack(deltaTime, input) {
        // Update attack cooldown
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }
        
        // Start attack if input is pressed and not on cooldown
        if (input.attack && this.attackTimer <= 0 && !this.isAttacking) {
            this.startAttack();
        }
        
        // Update attack animation if currently attacking
        if (this.isAttacking) {
            this.updateAttackAnimation(deltaTime);
        }
    }
    
    // Start an attack
    startAttack() {
        this.isAttacking = true;
        this.attackTimer = this.attackCooldown;
        
        // Reduce weapon durability
        this.currentWeapon.durability -= 1;
        if (this.currentWeapon.durability <= 0) {
            // Weapon broke!
            console.log('Weapon broke!');
            // TODO: Handle weapon breaking
        }
        
        // Start attack animation
        this.attackAnimationTime = 0;
        this.attackAnimationDuration = 0.3;
        
        // Store original weapon rotation for animation
        this.weaponOrigRotation = this.weaponMesh.rotation.z;
    }
    
    // Update attack animation
    updateAttackAnimation(deltaTime) {
        this.attackAnimationTime += deltaTime;
        
        // Simple attack animation - swing the weapon
        const progress = this.attackAnimationTime / this.attackAnimationDuration;
        
        if (progress < 0.5) {
            // First half of animation - swing back
            const swingBackAmount = Math.PI / 2;
            this.weaponMesh.rotation.z = this.weaponOrigRotation + progress * 2 * swingBackAmount;
        } else if (progress < 1) {
            // Second half - swing forward
            const swingForwardAmount = Math.PI;
            this.weaponMesh.rotation.z = this.weaponOrigRotation + 
                Math.PI / 2 - (progress - 0.5) * 2 * swingForwardAmount;
        } else {
            // End animation
            this.weaponMesh.rotation.z = this.weaponOrigRotation;
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
        this.position.set(x, y, z);
        this.object.position.set(x, y, z);
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
}
