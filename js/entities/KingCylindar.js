




import { Enemy } from './enemy.js';

export class KingCylindar extends Enemy {
    constructor(scene, position, collisionManager, player) {
        // Call parent constructor first
        super(scene, position, collisionManager, player);
        
        // Override key properties for King Cylindar
        this.health = 500; // 5x normal enemy health
        this.maxHealth = 500;
        this.detectionRange = 15; // Larger detection range
        this.chaseRange = 25; // Larger chase range
        this.attackRange = 2.5; // Slightly larger melee attack range
        this.attackDamage = 30; // Double damage
        
        // Ranged attack properties
        this.rangedAttackRange = 25; // Extended range
        this.rangedAttackCooldownTime = 5; // Longer cooldown (was 3)
        this.rangedAttackDamage = 15; // Higher damage per projectile
        this.shotgunProjectileCount = 8; // Number of projectiles in shotgun blast
        this.shotgunSpreadAngle = Math.PI / 4; // 45-degree spread
        
        // NEW: Mana drop properties - much more generous
        this.manaDrop = {
            min: 100,
            max: 200,
            dropped: false
        };
        
        // Movement speed adjustments - slower but more imposing
        this.moveSpeed = {
            patrol: 0.3, // Slower patrol speed
            chase: 1.0 // Slower chase speed too, but still faster than patrol
        };
        
        // King-sized patrol radius
        this.patrolRadius = 6; // Double standard radius
        
        // Create the mesh to replace the default one
        this.createMesh();
        
        console.log("King Cylindar created at position:", this.position);
    }
    
    // Override createMesh to make a much larger, blue glowing enemy
    createMesh() {
        // Remove existing mesh if it exists
        if (this.group) {
            this.scene.remove(this.group);
        }
        
        // Create a group to hold all enemy parts
        this.group = new THREE.Group();
        
        // Create a giant body - blue glowing cylinder
        const bodyGeometry = new THREE.CylinderGeometry(
            2.5, // top radius (5x larger)
            2.5, // bottom radius
            9.0, // height (5x larger)
            16,   // more radial segments for better quality
            3,    // height segments
            false // open-ended
        );
        
        // Blue glowing material
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366ff, // Blue color
            emissive: 0x0033aa, // Blue glow
            emissiveIntensity: 0.5, // Stronger glow
            roughness: 0.4,
            metalness: 0.6
        });
        
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.bodyMesh.position.y = 9.0 / 2; // Center vertically based on height
        
        // Save body dimensions for collision detection
        this.bodyWidth = 5.0; // Diameter
        this.bodyHeight = 9.0;
        
        // Add body to group
        this.group.add(this.bodyMesh);
        
        // Add giant glowing eyes - much larger and more intense
        const eyeGeometry = new THREE.SphereGeometry(0.5, 12, 12); // 5x larger eyes
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0x66ccff, // Bright blue eyes
            emissive: 0x66ccff,
            emissiveIntensity: 1.0
        });
        
        // Left eye
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-1.0, 7.5, -1.5); // Positioned on the giant cylinder
        this.group.add(this.leftEye);
        
        // Right eye
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(1.0, 7.5, -1.5);
        this.group.add(this.rightEye);
        
        // Add a glowing aura/halo effect
        const auraGeometry = new THREE.SphereGeometry(3.0, 16, 16);
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        
        this.aura = new THREE.Mesh(auraGeometry, auraMaterial);
        this.aura.position.y = 4.5; // Center of the body
        this.group.add(this.aura);
        
        // Add a point light to make it glow
        this.glowLight = new THREE.PointLight(0x3366ff, 1.0, 8);
        this.glowLight.position.y = 4.5;
        this.group.add(this.glowLight);
        
        // Position the entire group
        this.group.position.copy(this.position);
        
        // Add to scene
        this.scene.add(this.group);
        
        // Update collision radius for the larger entity
        this.collisionRadius = 2.5; // 3x larger collision radius
    }
    
    // Override update method to add pulsing glow effect
    update(deltaTime, camera) {
        // Call the parent update method first
        super.update(deltaTime, camera);
        
        // Add pulsing glow effect
        if (this.glowLight && this.aura) {
            const time = performance.now() * 0.001;
            const pulse = (Math.sin(time * 2) * 0.3) + 0.7; // Pulsing between 0.4 and 1.0
            
            this.glowLight.intensity = pulse * 1.5;
            this.aura.material.opacity = pulse * 0.2;
            
            // Also make the eyes pulse
            if (this.leftEye && this.leftEye.material && this.rightEye && this.rightEye.material) {
                const eyePulse = (Math.sin(time * 3) * 0.3) + 0.7;
                this.leftEye.material.emissiveIntensity = eyePulse;
                this.rightEye.material.emissiveIntensity = eyePulse;
            }
        }
    }
    
    // Override the performRangedAttack method to implement shotgun-style attack
    performRangedAttack() {
        if (!this.player || this.rangedAttackCooldown > 0) return;

        // Set cooldown
        this.rangedAttackCooldown = this.rangedAttackCooldownTime;
        
        // Get direction to player
        const playerPos = this.player.camera.position;
        const baseDirection = new THREE.Vector3()
            .subVectors(playerPos, this.group.position)
            .normalize();
        
        // Spawn position should be at the center of the cylinder, higher up
        const spawnPos = this.group.position.clone();
        spawnPos.y += this.bodyHeight * 0.7; // Higher spawn point
        
        // Create firing effect at the center point
        this.createEnhancedFiringEffect(spawnPos.clone());
        
        // Calculate the main direction vector to the player with some prediction
        // This helps the projectile lead the player a bit if they're moving
        const playerVelocity = this.player.velocity || new THREE.Vector3(0, 0, 0);
        const predictionTime = 0.8; // Predict where player will be in 0.8 seconds
        const predictedPlayerPos = playerPos.clone().add(
            playerVelocity.clone().multiplyScalar(predictionTime)
        );
        
        // Calculate direction to the predicted position
        const predictedDirection = new THREE.Vector3()
            .subVectors(predictedPlayerPos, spawnPos)
            .normalize();
        
        // Fire multiple projectiles in a spread pattern
        for (let i = 0; i < this.shotgunProjectileCount; i++) {
            // Skip a frame to prevent too many calculations at once
            setTimeout(() => {
                // Create a spread angle based on which projectile this is
                // We want to create a fan/arc of projectiles
                const angleOffset = this.shotgunSpreadAngle * (i / (this.shotgunProjectileCount - 1) - 0.5);
                
                // Create a quaternion for rotation around the Y axis (horizontal spread)
                const horizontalRot = new THREE.Quaternion().setFromAxisAngle(
                    new THREE.Vector3(0, 1, 0), 
                    angleOffset
                );
                
                // Apply the rotation to the base direction
                const spreadDirection = predictedDirection.clone().applyQuaternion(horizontalRot);
                
                // Add a small vertical spread too
                const verticalOffset = (Math.random() - 0.5) * 0.1;
                spreadDirection.y += verticalOffset;
                spreadDirection.normalize();
                
                // Create projectile mesh - larger and more impressive than standard
                const projectileGeometry = new THREE.SphereGeometry(0.4, 8, 8);
                const projectileMaterial = new THREE.MeshBasicMaterial({
                    color: 0x66ccff, // Brighter blue for King's projectiles
                    transparent: true,
                    opacity: 0.8
                });
                
                const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
                
                // Position at spawn point
                projectileMesh.position.copy(spawnPos);
                
                // Add glow effect
                const glowGeometry = new THREE.SphereGeometry(0.7, 8, 8);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: 0x66ccff,
                    transparent: true,
                    opacity: 0.4,
                    side: THREE.BackSide
                });
                
                const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                projectileMesh.add(glowMesh);
                
                // Add to scene
                this.scene.add(projectileMesh);
                
                // Calculate distance to player for consistent speed
                const distanceToPlayer = spawnPos.distanceTo(playerPos);
                const projectileSpeed = Math.max(distanceToPlayer / 2.0, 5); // Faster than standard enemy
                
                // Create projectile data
                const projectile = {
                    mesh: projectileMesh,
                    position: spawnPos.clone(),
                    velocity: spreadDirection.multiplyScalar(projectileSpeed * 0.016), // Scale for 60fps
                    lifetime: 5.0 // 5 seconds lifetime
                };
                
                // Add to projectiles array
                this.projectiles.push(projectile);
                
                // Create small firing effect at the exact spawn point of each projectile
                if (i === 0 || i === this.shotgunProjectileCount - 1) {
                    // Only create effects for the first and last projectiles to avoid too many effects
                    this.createProjectileFiringEffect(spawnPos.clone());
                }
            }, i * 30); // Small delay between each projectile for better visual effect
        }
        
        // Eye flash effect - more dramatic than standard enemy
        if (this.leftEye && this.leftEye.material) {
            this.leftEye.material.color.set(0x00ffff); // Cyan flash
            this.leftEye.material.emissiveIntensity = 2.5;
            
            // Reset after a short delay
            setTimeout(() => {
                if (this.leftEye && this.leftEye.material) {
                    this.leftEye.material.color.set(0x66ccff);
                    this.leftEye.material.emissiveIntensity = 1.0;
                }
            }, 400); // Longer flash duration
        }
        
        if (this.rightEye && this.rightEye.material) {
            this.rightEye.material.color.set(0x00ffff); // Cyan flash
            this.rightEye.material.emissiveIntensity = 2.5;
            
            // Reset after a short delay
            setTimeout(() => {
                if (this.rightEye && this.rightEye.material) {
                    this.rightEye.material.color.set(0x66ccff);
                    this.rightEye.material.emissiveIntensity = 1.0;
                }
            }, 400);
        }
        
        // Play ranged attack sound - louder and more imposing
        this.playEnhancedRangedAttackSound();
        
        console.log("King Cylindar fired shotgun attack!");
    }
    
    // New enhanced firing effect for the shotgun attack
    createEnhancedFiringEffect(position) {
        // Create a larger flash effect at the firing position
        const flashGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x66ccff,
            transparent: true,
            opacity: 0.8
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Create a point light for the flash
        const flashLight = new THREE.PointLight(0x66ccff, 3, 10);
        flashLight.position.copy(position);
        this.scene.add(flashLight);
        
        // Animate the flash
        const duration = 0.5; // 500ms
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade out
            const scale = 1 + progress * 4;
            flash.scale.set(scale, scale, scale);
            flash.material.opacity = 0.8 * (1 - progress);
            
            // Fade out light
            if (flashLight) {
                flashLight.intensity = 3 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove after animation completes
                this.scene.remove(flash);
                this.scene.remove(flashLight);
                if (flash.material) flash.material.dispose();
                if (flash.geometry) flash.geometry.dispose();
            }
        };
        
        animate();
    }
    
    // Enhanced ranged attack sound
    playEnhancedRangedAttackSound() {
        try {
            const attackSound = new Audio('sounds/enemy_ranged_attack.mp3');
            attackSound.volume = 0.6; // Louder than standard enemies
            attackSound.playbackRate = 0.7; // Deeper pitch for more imposing sound
            attackSound.play().catch(err => console.log('Could not play ranged attack sound', err));
        } catch (e) {
            console.log('Error playing ranged attack sound', e);
        }
    }
    
    // Override death method for a more dramatic death
    die() {
        if (this.state === 'dead') return; // Already dead
        
        console.log("King Cylindar died!");
        this.state = 'dead';
        
        // Clean up projectiles
        this.cleanupProjectiles();
        
        // Drop mana orb if not already dropped
        if (!this.manaDrop.dropped) {
            this.dropManaOrb();
            this.manaDrop.dropped = true;
        }
        
        // Create a more dramatic death explosion
        this.createDeathExplosion();
        
        // Screen shake effect
        this.triggerScreenShake();
        
        // Simple death animation - shrink and fade out
        const startScale = this.group.scale.clone();
        const startPosition = this.group.position.clone();
        
        const duration = 2.0; // Longer death animation duration
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale down with oscillation for more dramatic effect
            const oscillation = Math.sin(progress * Math.PI * 8) * (1 - progress) * 0.2;
            const scale = (1 - progress * 0.8) * (1 + oscillation);
            this.group.scale.set(scale, scale * 0.5, scale); // Flatten as it shrinks
            
            // Sink into ground
            this.group.position.y = startPosition.y - progress * 2.0;
            
            // Rotate slightly for added drama
            this.group.rotation.y += 0.02;
            
            // Fade materials
            if (this.bodyMesh && this.bodyMesh.material) {
                this.bodyMesh.material.opacity = 1 - progress;
                this.bodyMesh.material.transparent = true;
                // Increase emissive intensity before fading
                this.bodyMesh.material.emissiveIntensity = 0.5 * (1 + Math.sin(progress * Math.PI * 2) * (1 - progress) * 3);
            }
            
            if (this.leftEye && this.leftEye.material) {
                this.leftEye.material.opacity = 1 - progress;
                this.leftEye.material.emissiveIntensity = 1 + Math.sin(progress * Math.PI * 4) * (1 - progress) * 5;
            }
            
            if (this.rightEye && this.rightEye.material) {
                this.rightEye.material.opacity = 1 - progress;
                this.rightEye.material.emissiveIntensity = 1 + Math.sin(progress * Math.PI * 4) * (1 - progress) * 5;
            }
            
            if (this.aura && this.aura.material) {
                this.aura.material.opacity = 0.2 * (1 - progress);
            }
            
            // Update glow light
            if (this.glowLight) {
                this.glowLight.intensity = (1 - progress) * 2;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // After death animation completes, remove from scene
                this.group.visible = false;
                
                // Disable collisions for this enemy
                this.collisionEnabled = false;
            }
        };
        
        animate();
    }
    
    // New method for creating a dramatic death explosion
    createDeathExplosion() {
        // Position at the center of the enemy
        const position = this.group.position.clone();
        position.y += this.bodyHeight / 2;
        
        // Create multiple explosion particles
        const particleCount = 30;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Create particles with varying sizes
            const size = Math.random() * 0.8 + 0.4;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0x66ccff : 0x3366ff, // Alternate colors
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            // Random velocity in all directions
            const angle = Math.random() * Math.PI * 2;
            const height = Math.random() * Math.PI - Math.PI/2;
            const speed = 0.1 + Math.random() * 0.3;
            
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(height) * speed,
                Math.sin(height) * speed + 0.05, // Slight upward bias
                Math.sin(angle) * Math.cos(height) * speed
            );
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Create a flash of light
        const flashLight = new THREE.PointLight(0x66ccff, 5, 20);
        flashLight.position.copy(position);
        this.scene.add(flashLight);
        
        // Create shock wave effect
        const waveGeometry = new THREE.RingGeometry(0.5, 1.5, 32);
        const waveMaterial = new THREE.MeshBasicMaterial({
            color: 0x66ccff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        wave.position.copy(position);
        wave.rotation.x = Math.PI / 2; // Make it horizontal
        this.scene.add(wave);
        
        // Animate particles and effects
        const duration = 2.0; // Longer effect
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Update particles
            for (const particle of particles) {
                // Move particle
                particle.position.add(particle.velocity);
                
                // Apply gravity and slow down
                particle.velocity.y -= 0.003;
                particle.velocity.multiplyScalar(0.99);
                
                // Fade out gradually
                particle.material.opacity = 0.8 * (1 - progress);
                
                // Pulse size for more dynamic effect
                const pulse = 1 + Math.sin(elapsed * 5) * 0.2 * (1 - progress);
                particle.scale.set(pulse, pulse, pulse);
            }
            
            // Update shockwave
            if (wave) {
                const waveSize = 0.5 + progress * 15; // Expand to 15 units
                wave.scale.set(waveSize, waveSize, waveSize);
                wave.material.opacity = 0.7 * (1 - progress);
            }
            
            // Update flash light
            if (flashLight) {
                flashLight.intensity = 5 * (1 - progress);
                
                // Make it pulse during the explosion
                if (progress < 0.5) {
                    const pulse = 1 + Math.sin(elapsed * 20) * 0.5;
                    flashLight.intensity *= pulse;
                }
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                for (const particle of particles) {
                    this.scene.remove(particle);
                    if (particle.geometry) particle.geometry.dispose();
                    if (particle.material) particle.material.dispose();
                }
                
                this.scene.remove(wave);
                if (wave.geometry) wave.geometry.dispose();
                if (wave.material) wave.material.dispose();
                
                this.scene.remove(flashLight);
            }
        };
        
        animate();
    }
    
    // New method to trigger screen shake on death
    triggerScreenShake() {
        // Create a custom event that the game can listen for
        const event = new CustomEvent('screen-shake', { 
            detail: {
                intensity: 0.5,
                duration: 1.0
            }
        });
        document.dispatchEvent(event);
    }
    
    // Override the drop mana orb method for a more impressive orb
    dropManaOrb() {
        // Calculate mana amount - always high for King Cylindar
        const manaAmount = Math.floor(Math.random() * 
            (this.manaDrop.max - this.manaDrop.min + 1)) + this.manaDrop.min;
        
        // Create larger mana orb mesh
        const orbGeometry = new THREE.SphereGeometry(0.8, 16, 16); // Twice as large
        const orbMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366ff,
            emissive: 0x3366ff,
            emissiveIntensity: 0.8, // Brighter
            metalness: 0.7,
            roughness: 0.3,
            transparent: true,
            opacity: 0.9
        });
        
        const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
        
        // Position the orb at the enemy's death location, slightly elevated
        orbMesh.position.copy(this.group.position);
        orbMesh.position.y = 1.0; // Higher floating position
        
        // Add enhanced glow effect
        const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.4,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        orbMesh.add(glowMesh);
        
        // Add stronger point light to make it glow more
        const orbLight = new THREE.PointLight(0x3366ff, 2.5, 6);
        orbLight.position.set(0, 0, 0);
        orbMesh.add(orbLight);
        
        // Add userData to identify this as a mana orb and store mana amount
        orbMesh.userData = {
            isManaOrb: true,
            manaAmount: manaAmount,
            isKingOrb: true // Flag to identify this as a special orb
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
                this.collisionManager.colliders[colliderIndex].isKingOrb = true;
            }
        }
        
        // Add enhanced animation for the king's orb
        this.animateKingManaOrb(orbMesh);
        
        console.log(`Dropped king mana orb containing ${manaAmount} mana`);
    }
    
    // Enhanced animation for king's mana orb
    animateKingManaOrb(orbMesh) {
        // Make the orb bob up and down with more dramatic movement
        const startY = orbMesh.position.y;
        const floatHeight = 0.5; // More vertical movement
        const floatSpeed = 1.0; // Slower, more majestic movement
        
        // Make orb pulse
        const pulseSpeed = 1.5;
        
        // If we already have an animation system, use it
        if (!window.animatedKingOrbs) {
            window.animatedKingOrbs = [];
            
            const animateKingOrbs = () => {
                const orbs = window.animatedKingOrbs;
                if (orbs && orbs.length > 0) {
                    const time = performance.now() * 0.001;
                    
                    for (const orb of orbs) {
                        // Enhanced bobbing motion
                        orb.position.y = orb.userData.startY + 
                            Math.sin(time * orb.userData.floatSpeed) * orb.userData.floatHeight;
                        
                        // Rotate slowly with fluctuations
                        orb.rotation.y += 0.01 + Math.sin(time * 0.5) * 0.005;
                        orb.rotation.x = Math.sin(time * 0.3) * 0.1;
                        
                        // Pulse glow with composite wave for more interesting effect
                        if (orb.children && orb.children[0]) {
                            const glow = orb.children[0];
                            const pulseScale = 1 + (
                                Math.sin(time * orb.userData.pulseSpeed) * 0.2 + 
                                Math.sin(time * orb.userData.pulseSpeed * 1.3) * 0.1
                            );
                            glow.scale.set(pulseScale, pulseScale, pulseScale);
                        }
                        
                        // Pulse light with different pattern
                        if (orb.children && orb.children[1]) {
                            const light = orb.children[1];
                            light.intensity = 2.5 + 
                                Math.sin(time * orb.userData.pulseSpeed * 0.8) * 0.8 + 
                                Math.sin(time * orb.userData.pulseSpeed * 1.2) * 0.4;
                        }
                    }
                }
                
                requestAnimationFrame(animateKingOrbs);
            };
            
            animateKingOrbs();
        }
        
        // Store animation parameters with the orb
        orbMesh.userData.startY = startY;
        orbMesh.userData.floatHeight = floatHeight;
        orbMesh.userData.floatSpeed = floatSpeed;
        orbMesh.userData.pulseSpeed = pulseSpeed;
        
        // Add to animated king orbs
        window.animatedKingOrbs.push(orbMesh);
    }
}


            
