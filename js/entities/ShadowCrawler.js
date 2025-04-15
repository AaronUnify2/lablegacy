import { Enemy } from './enemy.js';

export class ShadowCrawler extends Enemy {
    constructor(scene, position, collisionManager, player) {
        // Call parent constructor first
        super(scene, position, collisionManager, player);
        
        // Override key properties for Shadow Crawler
        this.health = 70;
        this.maxHealth = 70;
        this.detectionRange = 10;
        this.chaseRange = 15;
        this.attackRange = 2.0;
        this.attackDamage = 10;
        
        // Simplified movement speed
        this.moveSpeed = {
            patrol: 1.0,
            chase: 2.2
        };
        
        // Completely disable ranged attacks
        this.useRangedAttack = false;
        
        // Create a simple mesh - just a black sphere
        this.createMesh();
        
        console.log("Shadow Crawler created at position:", this.position);
    }
    
    // Simplified mesh creation - just a black sphere
    createMesh() {
        // Remove existing mesh if it exists
        if (this.group) {
            this.scene.remove(this.group);
        }
        
        // Create a group to hold all enemy parts
        this.group = new THREE.Group();
        
        // Create a simple sphere body
        const bodyGeometry = new THREE.SphereGeometry(2.0, 16, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: 0x000000,
            emissiveIntensity: 0.5,
            roughness: 0.9,
            metalness: 0.2
        });
        
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        
        // Add body to group
        this.group.add(this.bodyMesh);
        
        // Add glowing eyes for visibility
        const eyeGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 2.0
        });
        
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.5, 0.5, 1.5);
        this.group.add(this.leftEye);
        
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.5, 0.5, 1.5);
        this.group.add(this.rightEye);
        
        // Position the entire group
        this.group.position.copy(this.position);
        
        // Add to scene
        this.scene.add(this.group);
        
        // Set collision radius to match visual size
        this.collisionRadius = 2.0;
    }
    
    // Override update method to add a simple hovering effect
    update(deltaTime, camera) {
        // Call the parent update method first
        super.update(deltaTime, camera);
        
        // Add a simple hover effect
        if (this.group) {
            const time = performance.now() * 0.001;
            this.group.position.y += Math.sin(time * 2) * 0.01;
        }
    }
    
    // Override the attack behavior for a simpler version
    performAttack() {
        if (this.isAttacking || !this.player) return;
        
        this.isAttacking = true;
        this.attackCooldown = this.attackCooldownTime;
        
        // Make eyes flash during attack
        if (this.leftEye && this.leftEye.material) {
            this.leftEye.material.color.set(0xffff00);
            this.leftEye.material.emissiveIntensity = 3.0;
        }
        if (this.rightEye && this.rightEye.material) {
            this.rightEye.material.color.set(0xffff00);
            this.rightEye.material.emissiveIntensity = 3.0;
        }
        
        // Deal damage to player after a short delay
        setTimeout(() => {
            // Check if still in range before applying damage
            if (this.player && this.player.camera) {
                const currentDistanceToPlayer = this.group.position.distanceTo(this.player.camera.position);
                if (currentDistanceToPlayer <= this.attackRange) {
                    console.log(`Shadow Crawler hit player for ${this.attackDamage} damage!`);
                    // Call the player's damage function
                    if (this.player.damage) {
                        this.player.damage(this.attackDamage);
                    }
                }
            }
            
            // Reset attack state
            this.isAttacking = false;
            
            // Reset eye color
            if (this.leftEye && this.leftEye.material) {
                this.leftEye.material.color.set(0xff0000);
                this.leftEye.material.emissiveIntensity = 2.0;
            }
            if (this.rightEye && this.rightEye.material) {
                this.rightEye.material.color.set(0xff0000);
                this.rightEye.material.emissiveIntensity = 2.0;
            }
            
            // Return to chase state after attack
            this.changeState(this.states.CHASE);
        }, this.attackDuration * 1000);
    }
    
    // Simplified death method
    die() {
        if (this.state === 'dead') return; // Already dead
        
        console.log("Shadow Crawler died!");
        this.state = 'dead';
        
        // Drop mana orb if not already dropped
        if (!this.manaDrop.dropped) {
            this.dropManaOrb();
            this.manaDrop.dropped = true;
        }
        
        // Create a simple death effect
        this.createSimpleDeathEffect();
        
        // Disable collisions
        this.collisionEnabled = false;
    }
    
    // Create a simple death effect
    createSimpleDeathEffect() {
        // Create a simple flash
        const flashGeometry = new THREE.SphereGeometry(3.0, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.7
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(this.group.position);
        this.scene.add(flash);
        
        // Create a light
        const light = new THREE.PointLight(0xff0000, 2.0, 10);
        light.position.copy(this.group.position);
        this.scene.add(light);
        
        // Hide the original mesh
        this.group.visible = false;
        
        // Animate the flash
        const duration = 1.0;
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade
            flash.scale.set(1 + progress, 1 + progress, 1 + progress);
            flash.material.opacity = 0.7 * (1 - progress);
            
            // Fade light
            if (light) {
                light.intensity = 2.0 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(flash);
                this.scene.remove(light);
                if (flash.geometry) flash.geometry.dispose();
                if (flash.material) flash.material.dispose();
                
                // Remove the original mesh
                this.scene.remove(this.group);
            }
        };
        
        animate();
    }
    
    // Simplified mana orb drop
    dropManaOrb() {
        // Calculate mana amount
        const manaAmount = Math.floor(Math.random() * 
            (this.manaDrop.max - this.manaDrop.min + 1)) + this.manaDrop.min;
        
        // Create mana orb mesh
        const orbGeometry = new THREE.SphereGeometry(0.6, 12, 12);
        const orbMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00, // Green for clarity
            emissive: 0x00ff00,
            emissiveIntensity: 1.0,
            metalness: 0.7,
            roughness: 0.3,
            transparent: true,
            opacity: 0.9
        });
        
        const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
        
        // Position the orb at the enemy's death location
        orbMesh.position.copy(this.group.position);
        orbMesh.position.y = 1.0; // Float above the ground
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.9, 12, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.4,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        orbMesh.add(glowMesh);
        
        // Add point light
        const orbLight = new THREE.PointLight(0x00ff00, 2.0, 5);
        orbLight.position.set(0, 0, 0);
        orbMesh.add(orbLight);
        
        // Add userData for orb identification
        orbMesh.userData = {
            isManaOrb: true,
            manaAmount: manaAmount
        };
        
        // Add to scene
        this.scene.add(orbMesh);
        
        // Add a collider for the orb
        if (this.collisionManager) {
            const colliderIndex = this.collisionManager.addCollider(orbMesh);
            
            // Tag this collider as a mana orb
            if (this.collisionManager.colliders[colliderIndex]) {
                this.collisionManager.colliders[colliderIndex].isManaOrb = true;
                this.collisionManager.colliders[colliderIndex].manaAmount = manaAmount;
            }
        }
        
        // Simple animation for the orb
        orbMesh.userData.startY = orbMesh.position.y;
        
        // Add to animation system if it exists
        if (window.animatedOrbs) {
            window.animatedOrbs.push(orbMesh);
        }
        
        console.log(`Dropped mana orb containing ${manaAmount} mana`);
    }
}
