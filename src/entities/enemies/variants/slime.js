// src/entities/enemies/variants/slime.js - Slime enemy implementation
import * as THREE from 'three';
import { Enemy, EnemyType } from '../enemyBase.js';
import { AIState } from '../enemyAI.js';
import { AttackType, MeleeAttack } from '../enemyAttacks.js';

// Create a slime enemy factory function
export function createSlimeEnemy(options = {}) {
    // Set default slime properties
    const slimeOptions = {
        name: options.name || 'Slime',
        type: EnemyType.MOB,
        level: options.level || 1,
        maxHealth: 30 + (options.level || 1) * 10,
        damage: 8 + (options.level || 1) * 2,
        moveSpeed: 3.0 + (options.level || 1) * 0.2, // Slightly faster at higher levels
        primaryColor: options.color || 0x44aa44, // Default green color
        position: options.position || new THREE.Vector3(0, 0, 0),
        damageVariance: 0.3,
        attackRange: 1.5,
        attackCooldown: 2.0,
        detectionRange: 12,
        aggroRange: 8,
        experienceValue: 10 + (options.level || 1) * 5,
        defense: Math.floor((options.level || 1) / 2), // Gain defense every 2 levels
        retreatRange: 0, // Slimes don't retreat
        ...options
    };
    
    // Create the enemy instance
    const slime = new Enemy(slimeOptions);
    
    // Override default mesh creation with slime-specific mesh
    slime.createDefaultMesh = function() {
        // Create slime body (squished sphere)
        const bodyGeometry = new THREE.SphereGeometry(1, 16, 12);
        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: this.primaryColor,
            transparent: true,
            opacity: 0.85
        });
        
        // Create main mesh
        this.mesh = new THREE.Group();
        
        // Create body mesh and scale it to be squished
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.scale.set(1, 0.7, 1);
        bodyMesh.position.y = 0.7; // Position relative to ground
        this.mesh.add(bodyMesh);
        
        // Create eyes
        const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.3, 1.1, 0.6);
        this.mesh.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.3, 1.1, 0.6);
        this.mesh.add(rightEye);
        
        // Add small glow
        const light = new THREE.PointLight(this.primaryColor, 0.5, 3);
        light.position.set(0, 0.7, 0);
        this.mesh.add(light);
        
        // Store body mesh for hop animation
        this.bodyMesh = bodyMesh;
        
        // Store eyes for animation
        this.leftEye = leftEye;
        this.rightEye = rightEye;
        
        // Enable floating for slimes
        this.canFloat = true;
    };
    
    // Override update animations for slime-specific animations
    slime.updateAnimations = function(deltaTime) {
        // Call original method
        Enemy.prototype.updateAnimations.call(this, deltaTime);
        
        // Skip if mesh components not created yet
        if (!this.bodyMesh) return;
        
        // Squish and stretch animation for hopping
        if (this.velocity.length() > 0.1) {
            // Hop cycle based on time
            const hopFrequency = 1.5; // Hops per second
            const hopPhase = (Date.now() * 0.001 * hopFrequency) % 1;
            
            // Calculate hop height - higher during middle of hop
            const hopHeight = Math.sin(hopPhase * Math.PI) * 0.4;
            
            // Apply squish and stretch
            const stretchFactor = 1 - hopHeight * 0.5; // Squish horizontally when stretching vertically
            
            // Update body mesh
            this.bodyMesh.position.y = 0.7 + hopHeight; // Base height plus hop
            this.bodyMesh.scale.y = 0.7 + hopHeight * 0.5; // Stretch vertically during hop
            this.bodyMesh.scale.x = stretchFactor; // Squish horizontally
            this.bodyMesh.scale.z = stretchFactor; // Squish horizontally
            
            // Move eyes along with body
            if (this.leftEye && this.rightEye) {
                this.leftEye.position.y = 1.1 + hopHeight * 0.7;
                this.rightEye.position.y = 1.1 + hopHeight * 0.7;
            }
        } else {
            // Idle animation - subtle pulsing
            const pulseAmount = Math.sin(Date.now() * 0.002) * 0.1;
            
            // Apply subtle pulsing to scale
            this.bodyMesh.scale.x = 1 + pulseAmount;
            this.bodyMesh.scale.y = 0.7 - pulseAmount * 0.5;
            this.bodyMesh.scale.z = 1 + pulseAmount;
            
            // Reset position
            this.bodyMesh.position.y = 0.7;
            
            // Reset eyes
            if (this.leftEye && this.rightEye) {
                this.leftEye.position.y = 1.1;
                this.rightEye.position.y = 1.1;
            }
        }
        
        // Blink animation
        if (Math.random() < 0.005 && this.leftEye && this.rightEye) {
            // Start blink
            this.leftEye.scale.y = 0.1;
            this.rightEye.scale.y = 0.1;
            
            // Reset after a short time
            setTimeout(() => {
                if (this.leftEye && this.rightEye) {
                    this.leftEye.scale.y = 1;
                    this.rightEye.scale.y = 1;
                }
            }, 100);
        }
    };
    
    // Create slime-specific attack
    slime.attackBehavior = new MeleeAttack(slime, {
        damage: slimeOptions.damage,
        range: slimeOptions.attackRange,
        knockbackForce: 1.0,
        effectChance: 0.2,
        statusEffect: 'slow' // 20% chance to slow player
    });
    
    // Override perform attack to use the attack behavior
    slime.performAttack = function(player) {
        if (this.attackTimer > 0 || this.isStunned) return false;
        
        // Start attack
        this.isAttacking = true;
        this.attackTimer = this.attackCooldown;
        
        // Use attack behavior
        this.attackBehavior.start();
        
        // Jump toward player for attack
        const jumpHeight = 1.5;
        if (this.bodyMesh) {
            // Jump animation
            const duration = 0.3; // seconds
            let startTime = Date.now();
            
            const animate = () => {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(elapsed / duration, 1);
                
                // Interpolate using quadratic ease out
                const jumpProgress = 1 - (1 - progress) * (1 - progress);
                
                // Apply jump height with a parabolic path
                const currentHeight = jumpHeight * (1 - Math.pow(2 * jumpProgress - 1, 2));
                
                // Update mesh
                if (this.bodyMesh) {
                    this.bodyMesh.position.y = 0.7 + currentHeight;
                    
                    // Squash and stretch
                    const stretchFactor = 1 + currentHeight * 0.2;
                    this.bodyMesh.scale.y = 0.7 * stretchFactor;
                    this.bodyMesh.scale.x = 1 / Math.sqrt(stretchFactor);
                    this.bodyMesh.scale.z = 1 / Math.sqrt(stretchFactor);
                    
                    // Move eyes along with body
                    if (this.leftEye && this.rightEye) {
                        this.leftEye.position.y = 1.1 + currentHeight * 0.8;
                        this.rightEye.position.y = 1.1 + currentHeight * 0.8;
                    }
                }
                
                // Continue animation if not complete
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Land with a squish
                    if (this.bodyMesh) {
                        this.bodyMesh.position.y = 0.7;
                        this.bodyMesh.scale.y = 0.5; // Extra squished on landing
                        this.bodyMesh.scale.x = 1.3;
                        this.bodyMesh.scale.z = 1.3;
                        
                        // Reset after a short delay
                        setTimeout(() => {
                            if (this.bodyMesh) {
                                this.bodyMesh.scale.y = 0.7;
                                this.bodyMesh.scale.x = 1;
                                this.bodyMesh.scale.z = 1;
                            }
                        }, 200);
                    }
                }
            };
            
            // Start animation
            animate();
        }
        
        // Check if the attack hits using the behavior
        return this.attackBehavior.update(0, player);
    };
    
    // Override update attack to use the attack behavior
    slime.updateAttack = function(deltaTime, player) {
        // Skip if stunned
        if (this.isStunned) return;
        
        // Update attack cooldown
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }
        
        // If attacking, update the attack behavior
        if (this.isAttacking) {
            // Update attack behavior
            const attackActive = this.attackBehavior.update(deltaTime, player);
            
            // End attack if behavior returns false
            if (!attackActive) {
                this.isAttacking = false;
            }
        }
    };
    
    // Apply slime specific status effect when attacking
    slime.attackBehavior.applyStatusEffect = function(target) {
        // Apply slow effect to player
        if (target.applyStatusEffect) {
            target.applyStatusEffect('slow', 2.0, 0.5); // Slow player to 50% speed for 2 seconds
        }
    };
    
    // Slimes make a sound when they die
    slime.die = function() {
        // Call the parent method
        Enemy.prototype.die.call(this);
        
        // Add slime-specific death effect
        if (this.mesh) {
            // Split into smaller slimes (visual effect only)
            this.createDeathEffect();
        }
    };
    
    // Create slime death effect
    slime.createDeathEffect = function() {
        // Create 3-5 small slime particles
        const particleCount = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < particleCount; i++) {
            // Create small sphere
            const particleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const particleMaterial = new THREE.MeshLambertMaterial({
                color: this.primaryColor,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position slightly randomly
            particle.position.set(
                this.position.x + (Math.random() * 2 - 1) * 0.5,
                this.position.y + Math.random() * 0.5,
                this.position.z + (Math.random() * 2 - 1) * 0.5
            );
            
            // Add to scene
            if (this.object.parent) {
                this.object.parent.add(particle);
            }
            
            // Animate particle
            const animateParticle = () => {
                // Gravity
                particle.position.y -= 0.05;
                
                // Bounce if hit ground
                if (particle.position.y < 0.3) {
                    particle.position.y = 0.3;
                }
                
                // Shrink
                particle.scale.multiplyScalar(0.95);
                
                // Fade out
                if (particle.material.opacity > 0) {
                    particle.material.opacity -= 0.02;
                }
                
                // Remove when tiny or invisible
                if (particle.scale.x < 0.1 || particle.material.opacity <= 0) {
                    if (particle.parent) {
                        particle.parent.remove(particle);
                    }
                    return;
                }
                
                // Continue animation
                requestAnimationFrame(animateParticle);
            };
            
            // Start animation
            animateParticle();
        }
    };
    
    // Initialize the slime with the provided position
    slime.setPosition(slimeOptions.position.x, slimeOptions.position.y, slimeOptions.position.z);
    
    return slime;
}

// Create a green slime factory (for convenience)
export function createGreenSlime(options = {}) {
    return createSlimeEnemy({
        color: 0x44aa44, // Green
        ...options
    });
}

// Create a blue slime factory (for convenience)
export function createBlueSlime(options = {}) {
    return createSlimeEnemy({
        name: 'Blue Slime',
        color: 0x4477aa, // Blue
        maxHealth: options.maxHealth || 40 + (options.level || 1) * 15,
        damage: options.damage || 10 + (options.level || 1) * 3,
        moveSpeed: options.moveSpeed || 3.5 + (options.level || 1) * 0.2,
        ...options
    });
}

// Create a red slime factory (for convenience)
export function createRedSlime(options = {}) {
    return createSlimeEnemy({
        name: 'Red Slime',
        color: 0xaa4444, // Red
        maxHealth: options.maxHealth || 35 + (options.level || 1) * 12,
        damage: options.damage || 12 + (options.level || 1) * 4,
        attackCooldown: options.attackCooldown || 1.5, // Attacks more frequently
        ...options
    });
}
