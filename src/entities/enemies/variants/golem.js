// src/entities/enemies/variants/golem.js - Golem mini-boss implementation
import * as THREE from 'three';
import { Enemy, EnemyType } from '../enemyBase.js';
import { AIState } from '../enemyAI.js';
import { AttackType, MeleeAttack, AreaAttack } from '../enemyAttacks.js';

// Create a golem enemy factory function
export function createGolemEnemy(options = {}) {
    // Set default golem properties
    const golemOptions = {
        name: options.name || 'Stone Golem',
        type: EnemyType.MINI_BOSS,
        level: options.level || 1,
        maxHealth: 120 + (options.level || 1) * 30,
        damage: 15 + (options.level || 1) * 3,
        moveSpeed: 2.0 + (options.level || 1) * 0.1, // Slower but hits harder
        primaryColor: options.color || 0x777777, // Gray stone color
        secondaryColor: 0x555555, // Darker stone color for joints
        position: options.position || new THREE.Vector3(0, 0, 0),
        damageVariance: 0.2,
        attackRange: 2.0,
        attackCooldown: 3.0,
        detectionRange: 15,
        aggroRange: 10,
        experienceValue: 50 + (options.level || 1) * 15,
        defense: 3 + Math.floor((options.level || 1) / 1), // Higher defense than mobs
        scale: 1.4, // Larger than regular enemies
        collisionRadius: 1.5,
        ...options
    };
    
    // Create the enemy instance
    const golem = new Enemy(golemOptions);
    
    // Override default mesh creation with golem-specific mesh
    golem.createDefaultMesh = function() {
        // Create golem body
        this.mesh = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(1.8, 2.0, 1.2);
        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: this.primaryColor,
            flatShading: true
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.2; // Position relative to ground
        this.mesh.add(body);
        
        // Head
        const headGeometry = new THREE.BoxGeometry(1.2, 1.0, 1.0);
        const headMaterial = new THREE.MeshLambertMaterial({
            color: this.primaryColor,
            flatShading: true
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.7; // Position on top of body
        this.mesh.add(head);
        
        // Eyes (glowing)
        const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            emissive: 0xff4400,
            emissiveIntensity: 1.0
        });
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.3, 2.8, 0.6);
        this.mesh.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.3, 2.8, 0.6);
        this.mesh.add(rightEye);
        
        // Create a light for the glowing eyes
        const eyeLight = new THREE.PointLight(0xff4400, 1, 3);
        eyeLight.position.set(0, 2.8, 0.6);
        this.mesh.add(eyeLight);
        
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.6, 2.0, 0.6);
        const armMaterial = new THREE.MeshLambertMaterial({
            color: this.secondaryColor,
            flatShading: true
        });
        
        // Left arm
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(1.2, 1.0, 0);
        this.mesh.add(leftArm);
        
        // Right arm
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(-1.2, 1.0, 0);
        this.mesh.add(rightArm);
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.7, 1.0, 0.7);
        const legMaterial = new THREE.MeshLambertMaterial({
            color: this.secondaryColor,
            flatShading: true
        });
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(0.5, 0.5, 0);
        this.mesh.add(leftLeg);
        
        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(-0.5, 0.5, 0);
        this.mesh.add(rightLeg);
        
        // Store parts for animation
        this.bodyPart = body;
        this.headPart = head;
        this.leftArm = leftArm;
        this.rightArm = rightArm;
        this.leftLeg = leftLeg;
        this.rightLeg = rightLeg;
        this.leftEye = leftEye;
        this.rightEye = rightEye;
        
        // Scale the entire mesh
        this.mesh.scale.set(this.scale, this.scale, this.scale);
    };
    
    // Create golem attack behaviors
    golem.normalAttackBehavior = new MeleeAttack(golem, {
        damage: golemOptions.damage,
        range: golemOptions.attackRange,
        knockbackForce: 3.0, // Strong knockback
        effectChance: 0.3,
        statusEffect: 'stun' // 30% chance to stun player
    });
    
    golem.groundSlamAttack = new AreaAttack(golem, {
        damage: golemOptions.damage * 1.5,
        range: golemOptions.attackRange * 2,
        chargeTime: 1.0,
        damageMultiplier: 1.5,
        knockbackForce: 5.0
    });
    
    // Give golem a special ability
    golem.specialAbility = 'groundSlam';
    golem.specialAbilityCooldown = 10.0;
    
    // Override animation update for golem-specific movements
    golem.updateAnimations = function(deltaTime) {
        // Call parent method
        Enemy.prototype.updateAnimations.call(this, deltaTime);
        
        // Skip if parts not created yet
        if (!this.bodyPart) return;
        
        // Walking animation
        if (this.velocity.length() > 0.1) {
            // Calculate walk cycle (0 to 1)
            const walkSpeed = 1.5;
            const walkCycle = (Date.now() * 0.001 * walkSpeed) % 1;
            const legSwing = Math.sin(walkCycle * Math.PI * 2) * 0.2;
            const armSwing = Math.sin(walkCycle * Math.PI * 2) * 0.1;
            const bodyBob = Math.abs(Math.sin(walkCycle * Math.PI * 2)) * 0.1;
            
            // Apply animations
            this.leftLeg.position.z = legSwing;
            this.rightLeg.position.z = -legSwing;
            this.leftArm.rotation.x = armSwing;
            this.rightArm.rotation.x = -armSwing;
            this.bodyPart.position.y = 1.2 - bodyBob;
            this.headPart.position.y = 2.7 - bodyBob;
            
            // Heavy footstep effect
            if (walkCycle < 0.05 || (walkCycle > 0.5 && walkCycle < 0.55)) {
                // Would add footstep sound here
                // Also add slight camera shake for heavy steps
            }
        } else {
            // Reset to idle pose
            this.leftLeg.position.z = 0;
            this.rightLeg.position.z = 0;
            this.leftArm.rotation.x = 0;
            this.rightArm.rotation.x = 0;
            this.bodyPart.position.y = 1.2;
            this.headPart.position.y = 2.7;
            
            // Idle breathing animation
            const breathRate = 0.5;
            const breathAmount = Math.sin(Date.now() * 0.001 * breathRate) * 0.05;
            this.bodyPart.position.y = 1.2 + breathAmount;
            this.headPart.position.y = 2.7 + breathAmount;
        }
        
        // Attack animation is handled separately in performAttack
    };
    
    // Override attack logic
    golem.performAttack = function(player) {
        if (this.attackTimer > 0 || this.isStunned) return false;
        
        // Start attack
        this.isAttacking = true;
        this.attackTimer = this.attackCooldown;
        
        // Determine if using special or normal attack
        const useSpecialAttack = this.specialAbilityTimer <= 0 && Math.random() < 0.3;
        
        if (useSpecialAttack) {
            // Ground slam attack animation
            this.performGroundSlam(player);
            this.specialAbilityTimer = this.specialAbilityCooldown;
            return true;
        } else {
            // Normal attack animation
            this.performPunchAttack(player);
            return this.normalAttackBehavior.update(0, player);
        }
    };
    
    // Normal punch attack
    golem.performPunchAttack = function(player) {
        // Use attack behavior
        this.normalAttackBehavior.start();
        
        // Animate the punch
        if (this.leftArm && this.rightArm) {
            // Determine which arm to use (alternate)
            const useLeftArm = Date.now() % 2000 < 1000;
            const arm = useLeftArm ? this.leftArm : this.rightArm;
            
            // Store original rotation
            const originalRotation = arm.rotation.x;
            
            // Animate punch
            const duration = 0.3; // seconds
            let startTime = Date.now();
            let phase = 'windup';
            
            const animate = () => {
                const elapsed = (Date.now() - startTime) / 1000;
                
                if (phase === 'windup') {
                    // Wind up punch (pull arm back)
                    const progress = Math.min(elapsed / (duration * 0.3), 1);
                    arm.rotation.x = originalRotation - progress * Math.PI * 0.3;
                    
                    if (progress >= 1) {
                        // Switch to punch phase
                        phase = 'punch';
                        startTime = Date.now();
                    }
                    
                    requestAnimationFrame(animate);
                } else if (phase === 'punch') {
                    // Throw punch
                    const progress = Math.min(elapsed / (duration * 0.2), 1);
                    arm.rotation.x = originalRotation - Math.PI * 0.3 + progress * Math.PI * 0.6;
                    
                    if (progress >= 1) {
                        // Switch to recoil phase
                        phase = 'recoil';
                        startTime = Date.now();
                    }
                    
                    requestAnimationFrame(animate);
                } else if (phase === 'recoil') {
                    // Return to neutral
                    const progress = Math.min(elapsed / (duration * 0.5), 1);
                    arm.rotation.x = originalRotation + Math.PI * 0.3 - progress * Math.PI * 0.3;
                    
                    if (progress >= 1) {
                        // Reset to original rotation
                        arm.rotation.x = originalRotation;
                    } else {
                        requestAnimationFrame(animate);
                    }
                }
            };
            
            // Start animation
            animate();
        }
    };
    
    // Ground slam special attack
    golem.performGroundSlam = function(player) {
        // Use ground slam attack behavior
        this.groundSlamAttack.start();
        
        // Animate the ground slam
        if (this.leftArm && this.rightArm) {
            // Store original rotations and positions
            const leftOrigRotation = this.leftArm.rotation.x;
            const rightOrigRotation = this.rightArm.rotation.x;
            const bodyOrigY = this.bodyPart.position.y;
            
            // Animate slam
            const duration = 1.5; // seconds (matches charge time)
            let startTime = Date.now();
            let phase = 'charge';
            
            const animate = () => {
                const elapsed = (Date.now() - startTime) / 1000;
                
                if (phase === 'charge') {
                    // Wind up slam (raise arms)
                    const progress = Math.min(elapsed / (duration * 0.7), 1);
                    
                    // Raise both arms
                    this.leftArm.rotation.x = leftOrigRotation - progress * Math.PI * 0.4;
                    this.rightArm.rotation.x = rightOrigRotation - progress * Math.PI * 0.4;
                    
                    // Slight body crouch
                    this.bodyPart.position.y = bodyOrigY - progress * 0.2;
                    
                    // Eyes glow stronger
                    if (this.leftEye && this.rightEye) {
                        const glowIntensity = 1.0 + progress * 1.0;
                        this.leftEye.material.emissiveIntensity = glowIntensity;
                        this.rightEye.material.emissiveIntensity = glowIntensity;
                    }
                    
                    if (progress >= 1) {
                        // Switch to slam phase
                        phase = 'slam';
                        startTime = Date.now();
                    }
                    
                    requestAnimationFrame(animate);
                } else if (phase === 'slam') {
                    // Slam down
                    const progress = Math.min(elapsed / (duration * 0.1), 1);
                    
                    // Slam arms down
                    this.leftArm.rotation.x = leftOrigRotation - Math.PI * 0.4 + progress * Math.PI * 0.8;
                    this.rightArm.rotation.x = rightOrigRotation - Math.PI * 0.4 + progress * Math.PI * 0.8;
                    
                    // Jump up and slam down
                    this.bodyPart.position.y = bodyOrigY - 0.2 + progress * 0.5;
                    
                    if (progress >= 1) {
                        // Switch to impact phase
                        phase = 'impact';
                        startTime = Date.now();
                        
                        // Create impact effect
                        this.createGroundImpactEffect();
                    }
                    
                    requestAnimationFrame(animate);
                } else if (phase === 'impact') {
                    // Return to normal over time
                    const progress = Math.min(elapsed / (duration * 0.2), 1);
                    
                    // Slowly return arms to neutral
                    this.leftArm.rotation.x = leftOrigRotation + Math.PI * 0.4 - progress * Math.PI * 0.4;
                    this.rightArm.rotation.x = rightOrigRotation + Math.PI * 0.4 - progress * Math.PI * 0.4;
                    
                    // Settle body position
                    this.bodyPart.position.y = bodyOrigY + 0.3 - progress * 0.3;
                    
                    // Return eye glow to normal
                    if (this.leftEye && this.rightEye) {
                        const glowIntensity = 2.0 - progress * 1.0;
                        this.leftEye.material.emissiveIntensity = glowIntensity;
                        this.rightEye.material.emissiveIntensity = glowIntensity;
                    }
                    
                    if (progress >= 1) {
                        // Reset to original positions and rotations
                        this.leftArm.rotation.x = leftOrigRotation;
                        this.rightArm.rotation.x = rightOrigRotation;
                        this.bodyPart.position.y = bodyOrigY;
                        
                        if (this.leftEye && this.rightEye) {
                            this.leftEye.material.emissiveIntensity = 1.0;
                            this.rightEye.material.emissiveIntensity = 1.0;
                        }
                    } else {
                        requestAnimationFrame(animate);
                    }
                }
            };
            
            // Start animation
            animate();
        }
    };
    
    // Create ground impact effect for slam attack
    golem.createGroundImpactEffect = function() {
        // Create a ripple wave on the ground
        const rippleGeometry = new THREE.RingGeometry(0.5, 5, 16);
        const rippleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
        ripple.rotation.x = Math.PI / 2; // Flat on ground
        ripple.position.set(
            this.position.x,
            0.1, // Just above ground
            this.position.z
        );
        
        // Add to scene
        if (this.object.parent) {
            this.object.parent.add(ripple);
        }
        
        // Animate expansion and fading
        const duration = 1.0; // second
        const startTime = Date.now();
        
        const animateRipple = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand ring
            ripple.scale.set(1 + progress * 4, 1 + progress * 4, 1);
            
            // Fade out
            ripple.material.opacity = 0.7 * (1 - progress);
            
            if (progress >= 1) {
                // Remove when done
                if (ripple.parent) {
                    ripple.parent.remove(ripple);
                }
                return;
            }
            
            requestAnimationFrame(animateRipple);
        };
        
        // Start animation
        animateRipple();
        
        // Add debris particles
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 1 + Math.random() * 3;
            const size = 0.2 + Math.random() * 0.3;
            
            // Create rock fragment
            const debrisGeometry = new THREE.BoxGeometry(size, size, size);
            const debrisMaterial = new THREE.MeshLambertMaterial({
                color: this.primaryColor,
                flatShading: true
            });
            const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
            
            // Position around golem
            debris.position.set(
                this.position.x + Math.cos(angle) * distance,
                0.1 + Math.random() * 1.5, // Start above ground
                this.position.z + Math.sin(angle) * distance
            );
            
            // Add to scene
            if (this.object.parent) {
                this.object.parent.add(debris);
            }
            
            // Set velocity and rotation for animation
            const velocity = {
                x: Math.cos(angle) * distance * 2,
                y: 3 + Math.random() * 4,
                z: Math.sin(angle) * distance * 2
            };
            
            const rotationSpeed = {
                x: Math.random() * 0.2 - 0.1,
                y: Math.random() * 0.2 - 0.1,
                z: Math.random() * 0.2 - 0.1
            };
            
            // Animate debris flight
            const animateDebris = () => {
                // Apply gravity
                velocity.y -= 9.8 * 0.016; // Approximate for 60fps
                
                // Move debris
                debris.position.x += velocity.x * 0.016;
                debris.position.y += velocity.y * 0.016;
                debris.position.z += velocity.z * 0.016;
                
                // Rotate debris
                debris.rotation.x += rotationSpeed.x;
                debris.rotation.y += rotationSpeed.y;
                debris.rotation.z += rotationSpeed.z;
                
                // Check floor collision
                if (debris.position.y < size / 2) {
                    debris.position.y = size / 2;
                    velocity.y = -velocity.y * 0.5; // Bounce with damping
                    
                    // Slow horizontal movement with friction
                    velocity.x *= 0.8;
                    velocity.z *= 0.8;
                    
                    // Stop if very slow
                    if (Math.abs(velocity.y) < 0.5 && 
                        Math.abs(velocity.x) < 0.2 && 
                        Math.abs(velocity.z) < 0.2) {
                        
                        // Fade out and remove after a moment
                        setTimeout(() => {
                            if (debris.parent) {
                                debris.parent.remove(debris);
                            }
                        }, 1000 + Math.random() * 2000);
                        
                        return;
                    }
                }
                
                // Continue animation
                requestAnimationFrame(animateDebris);
            };
            
            // Start animation
            animateDebris();
        }
    };
    
    // Apply stun status effect when attacking
    golem.normalAttackBehavior.applyStatusEffect = function(target) {
        // Apply stun effect to player
        if (target.applyStatusEffect) {
            target.applyStatusEffect('stun', 1.0); // Stun player for 1 second
        }
    };
    
    // Golem death effect
    golem.die = function() {
        // Call the parent method
        Enemy.prototype.die.call(this);
        
        // Add golem-specific death effect
        if (this.mesh) {
            this.createDeathEffect();
        }
    };
    
    // Create death effect for golem
    golem.createDeathEffect = function() {
        // Create rock explosion
        const fragments = [];
        const fragmentCount = 15 + Math.floor(Math.random() * 10);
        
        // Create fragments from all the body parts
        this.mesh.children.forEach(child => {
            // Skip if not a mesh
            if (!child.isMesh) return;
            
            // Get its world position
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);
            
            // Create several fragments at this position
            for (let i = 0; i < 2; i++) {
                const size = 0.3 + Math.random() * 0.3;
                
                // Create rock fragment
                const fragGeometry = new THREE.BoxGeometry(size, size, size);
                const fragMaterial = new THREE.MeshLambertMaterial({
                    color: child.material.color,
                    flatShading: true
                });
                const fragment = new THREE.Mesh(fragGeometry, fragMaterial);
                
                // Position at part's location with slight randomness
                fragment.position.set(
                    worldPos.x + (Math.random() * 0.6 - 0.3),
                    worldPos.y + (Math.random() * 0.6 - 0.3),
                    worldPos.z + (Math.random() * 0.6 - 0.3)
                );
                
                // Add to scene
                if (this.object.parent) {
                    this.object.parent.add(fragment);
                    fragments.push(fragment);
                }
            }
        });
        
        // Create additional generic fragments
        for (let i = 0; i < fragmentCount - fragments.length; i++) {
            const size = 0.2 + Math.random() * 0.3;
            
            // Create rock fragment
            const fragGeometry = new THREE.BoxGeometry(size, size, size);
            const fragMaterial = new THREE.MeshLambertMaterial({
                color: this.primaryColor,
                flatShading: true
            });
            const fragment = new THREE.Mesh(fragGeometry, fragMaterial);
            
            // Random position within golem's body
            fragment.position.set(
                this.position.x + (Math.random() * 2 - 1) * this.scale,
                this.position.y + (Math.random() * 3) * this.scale,
                this.position.z + (Math.random() * 2 - 1) * this.scale
            );
            
            // Add to scene
            if (this.object.parent) {
                this.object.parent.add(fragment);
                fragments.push(fragment);
            }
        }
        
        // Animate all fragments
        fragments.forEach(fragment => {
            // Random velocity in all directions
            const velocity = {
                x: (Math.random() * 4 - 2),
                y: 2 + Math.random() * 6,
                z: (Math.random() * 4 - 2)
            };
            
            // Random rotation speed
            const rotationSpeed = {
                x: Math.random() * 0.2 - 0.1,
                y: Math.random() * 0.2 - 0.1,
                z: Math.random() * 0.2 - 0.1
            };
            
            // Animate fragment
            const animateFragment = () => {
                // Apply gravity
                velocity.y -= 9.8 * 0.016; // Approximate for 60fps
                
                // Move fragment
                fragment.position.x += velocity.x * 0.016;
                fragment.position.y += velocity.y * 0.016;
                fragment.position.z += velocity.z * 0.016;
                
                // Rotate fragment
                fragment.rotation.x += rotationSpeed.x;
                fragment.rotation.y += rotationSpeed.y;
                fragment.rotation.z += rotationSpeed.z;
                
                // Check floor collision
                if (fragment.position.y < fragment.geometry.parameters.height / 2) {
                    fragment.position.y = fragment.geometry.parameters.height / 2;
                    velocity.y = -velocity.y * 0.3; // Bounce with high damping
                    
                    // Slow horizontal movement with friction
                    velocity.x *= 0.8;
                    velocity.z *= 0.8;
                    
                    // Stop if very slow
                    if (Math.abs(velocity.y) < 0.5 && 
                        Math.abs(velocity.x) < 0.2 && 
                        Math.abs(velocity.z) < 0.2) {
                        
                        // Fade out and remove after a delay
                        setTimeout(() => {
                            if (fragment.parent) {
                                // Start fade out
                                const fadeOut = () => {
                                    fragment.material.opacity -= 0.05;
                                    if (fragment.material.opacity <= 0) {
                                        fragment.parent.remove(fragment);
                                    } else {
                                        requestAnimationFrame(fadeOut);
                                    }
                                };
                                
                                // Make material transparent for fading
                                fragment.material.transparent = true;
                                fadeOut();
                            }
                        }, 2000 + Math.random() * 3000);
                        
                        return;
                    }
                }
                
                // Continue animation if still moving
                requestAnimationFrame(animateFragment);
            };
            
            // Start animation
            animateFragment();
        });
    };
    
    // Initialize the golem with the provided position
    golem.setPosition(golemOptions.position.x, golemOptions.position.y, golemOptions.position.z);
    
    return golem;
}

// Create a stone golem factory (for convenience)
export function createStoneGolem(options = {}) {
    return createGolemEnemy({
        color: 0x777777, // Gray stone
        ...options
    });
}

// Create a crystal golem factory (for convenience)
export function createCrystalGolem(options = {}) {
    return createGolemEnemy({
        name: 'Crystal Golem',
        color: 0x5599aa, // Blue-green crystal
        maxHealth: options.maxHealth || 150 + (options.level || 1) * 35,
        damage: options.damage || 18 + (options.level || 1) * 4,
        glowIntensity: 0.5,
        glowColor: 0x5599aa,
        ...options
    });
}

// Create a lava golem factory (for convenience)
export function createLavaGolem(options = {}) {
    return createGolemEnemy({
        name: 'Lava Golem',
        color: 0x993311, // Red-brown lava rock
        primaryColor: 0x993311,
        secondaryColor: 0xff5500, // Bright lava for joints
        maxHealth: options.maxHealth || 140 + (options.level || 1) * 30,
        damage: options.damage || 20 + (options.level || 1) * 5,
        attackCooldown: options.attackCooldown || 2.5, // Attacks more frequently
        glowIntensity: 1.0,
        glowColor: 0xff5500,
        ...options
    });
}
