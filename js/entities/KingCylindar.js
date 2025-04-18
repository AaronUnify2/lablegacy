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
        
        // NEW: King-specific movement properties
        this.kingMovement = {
            active: true,
            currentAngle: Math.random() * Math.PI * 2, // Random starting angle
            angleSpeed: 0.2, // How fast it rotates around its center
            radius: 6, // Patrol radius
            timeInPlace: 0, // Time spent hovering in one spot
            maxTimeInPlace: 5, // Max time to hover before moving again
            movingState: 'patrol', // 'patrol' or 'hover'
            hoverHeight: 0, // Current hover height variation
            hoverDirection: 1, // Up or down
            hoverSpeed: 0.5, // Speed of hover movement
            lastMoveTime: performance.now()
        };
        
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
        
        // Initialize power core (hidden by default)
        this.createPowerCore();
        
        console.log("King Cylindar created at position:", this.position);
    }
    
    // Override createMesh to make a more visually interesting boss
    createMesh() {
        // Remove existing mesh if it exists
        if (this.group) {
            this.scene.remove(this.group);
        }
        
        // Create a group to hold all enemy parts
        this.group = new THREE.Group();
        
        // Create main body - blue cylinder but with more details
        const bodyGeometry = new THREE.CylinderGeometry(
            2.5, // top radius
            2.5, // bottom radius
            9.0, // height
            16,  // radial segments
            3,   // height segments
            false // open-ended
        );
        
        // Main body material - blue with patterns
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366ff, // Base blue color
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
        const eyeGeometry = new THREE.SphereGeometry(0.5, 12, 12); // Large eyes
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
        
        // NEW: Add decorative rings that orbit the body
        this.rings = [];
        this.createOrbitalRings();
        
        // NEW: Add decorative patterns on the body
        this.createBodyPatterns();
        
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
    
    // NEW: Create orbital rings
    createOrbitalRings() {
        // Different colored rings
        const ringColors = [
            0x66ccff, // Light blue
            0xff3366, // Pink
            0x33ff66  // Green
        ];
        
        for (let i = 0; i < ringColors.length; i++) {
            // Create ring geometry
            const ringGeometry = new THREE.TorusGeometry(
                2.8 + i * 0.4, // Radius gets larger with each ring
                0.1,           // Tube radius (thickness)
                16,            // Tubular segments
                32             // Radial segments
            );
            
            // Create emissive material
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: ringColors[i],
                transparent: true,
                opacity: 0.7
            });
            
            // Create ring mesh
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            
            // Create a container for the ring to enable separate rotation
            const ringContainer = new THREE.Object3D();
            ringContainer.add(ring);
            
            // Position in the middle of the body
            ringContainer.position.y = 4.5;
            
            // Rotate the ring container to a different starting angle
            ringContainer.rotation.x = Math.PI/2; // Make it horizontal
            ringContainer.rotation.y = i * (Math.PI / 3); // Spread starting angles
            
            // Add the ring to our rings array and to the group
            this.rings.push({
                container: ringContainer,
                mesh: ring,
                rotationSpeed: 0.2 + i * 0.1, // Different speeds
                wobblePhase: Math.random() * Math.PI * 2, // Random phase
                wobbleSpeed: 0.5 + Math.random() * 0.5   // Random wobble speed
            });
            
            this.group.add(ringContainer);
        }
    }
    
    // NEW: Create body patterns/details
    createBodyPatterns() {
        // Add glowing lines/panels to the body
        const addBodyDetail = (height, angle, width, color) => {
            const panelGeometry = new THREE.PlaneGeometry(width, 0.4);
            const panelMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            
            const panel = new THREE.Mesh(panelGeometry, panelMaterial);
            
            // Position the panel on the body surface
            const radius = 2.5; // Body radius
            panel.position.set(
                Math.sin(angle) * radius,
                height,
                Math.cos(angle) * radius
            );
            
            // Rotate to face outward
            panel.lookAt(
                panel.position.x * 2,
                panel.position.y,
                panel.position.z * 2
            );
            
            return panel;
        };
        
        // Add various details around the body
        const bodyDetails = [];
        
        // Create vertical stripes/lines
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const color = i % 2 === 0 ? 0x66ccff : 0x3366ff; // Alternate colors
            
            for (let h = 1; h < 9; h += 2) {
                const detail = addBodyDetail(h, angle, 0.5, color);
                this.bodyMesh.add(detail);
                bodyDetails.push(detail);
            }
        }
        
        // Create horizontal rings around body
        for (let h = 2; h < 9; h += 3) {
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const detail = addBodyDetail(h, angle, 0.7, 0xff3366); // Pink
                this.bodyMesh.add(detail);
                bodyDetails.push(detail);
            }
        }
        
        // Store details for animation
        this.bodyDetails = bodyDetails;
    }
    
    // NEW: Create power core that becomes visible when damaged
    createPowerCore() {
        // Core geometry
        const coreGeometry = new THREE.SphereGeometry(1.0, 16, 16);
        
        // Core material - will pulse when visible
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffcc00, // Yellow/gold energy
            transparent: true,
            opacity: 0.0 // Start invisible
        });
        
        // Create core mesh
        this.powerCore = new THREE.Mesh(coreGeometry, coreMaterial);
        this.powerCore.position.y = 4.5; // Center of cylinder
        
        // Add to group
        this.group.add(this.powerCore);
        
        // Core light
        this.coreLight = new THREE.PointLight(0xffcc00, 0, 5); // Start with 0 intensity
        this.coreLight.position.copy(this.powerCore.position);
        this.group.add(this.coreLight);
    }
    
    // Override update method to add custom king movement and animations
    update(deltaTime, camera) {
        // Skip if dead
        if (this.state === 'dead') return;
        
        // Calculate movement based on state
        if (this.state === 'patrol') {
            // Use custom king movement instead of standard patrol
            this.updateKingMovement(deltaTime);
        } else {
            // For other states, use parent class behavior
            super.update(deltaTime, camera);
        }
        
        // Animation effects
        this.updateVisualEffects(deltaTime);
    }
    
    // NEW: Custom movement pattern for King Cylindar
    updateKingMovement(deltaTime) {
        if (!this.kingMovement.active) return;
        
        const now = performance.now();
        const timeSinceLastMove = (now - this.kingMovement.lastMoveTime) / 1000;
        this.kingMovement.lastMoveTime = now;
        
        // If in hover state, stay in place and bob up and down
        if (this.kingMovement.movingState === 'hover') {
            // Increment time in place
            this.kingMovement.timeInPlace += deltaTime;
            
            // Update hover height
            this.kingMovement.hoverHeight += this.kingMovement.hoverDirection * this.kingMovement.hoverSpeed * deltaTime;
            
            // Reverse direction if reached limits
            if (Math.abs(this.kingMovement.hoverHeight) > 1) {
                this.kingMovement.hoverDirection *= -1;
            }
            
            // Apply hover height
            this.group.position.y += this.kingMovement.hoverDirection * this.kingMovement.hoverSpeed * deltaTime;
            
            // Change to patrol state if hovered long enough
            if (this.kingMovement.timeInPlace > this.kingMovement.maxTimeInPlace) {
                this.kingMovement.movingState = 'patrol';
                this.kingMovement.timeInPlace = 0;
            }
        } 
        // If in patrol state, move in a circle around patrol center
        else if (this.kingMovement.movingState === 'patrol') {
            // Update angle
            this.kingMovement.currentAngle += this.kingMovement.angleSpeed * deltaTime;
            
            // Calculate new position
            const newX = this.patrolCenter.x + Math.cos(this.kingMovement.currentAngle) * this.kingMovement.radius;
            const newZ = this.patrolCenter.z + Math.sin(this.kingMovement.currentAngle) * this.kingMovement.radius;
            
            // Get current position
            const currentPos = this.group.position.clone();
            
            // Create movement vector
            const moveVector = new THREE.Vector3(newX - currentPos.x, 0, newZ - currentPos.z);
            
            // Normalize and scale by speed
            if (moveVector.lengthSq() > 0) {
                moveVector.normalize().multiplyScalar(this.moveSpeed.patrol);
            }
            
            // Calculate new position
            const newPosition = currentPos.clone().add(moveVector);
            
            // Move with collision checking
            if (this.collisionManager) {
                // Check if new position has collision
                const collision = this.collisionManager.checkCollision(newPosition, this.collisionRadius);
                
                if (!collision.collides) {
                    // No collision, update position
                    this.group.position.x = newPosition.x;
                    this.group.position.z = newPosition.z;
                }
            } else {
                // No collision manager, just move
                this.group.position.x = newPosition.x;
                this.group.position.z = newPosition.z;
            }
            
            // Make the king face the direction of movement
            if (moveVector.lengthSq() > 0.0001) {
                // Calculate target rotation
                const targetRotation = Math.atan2(moveVector.x, moveVector.z);
                
                // Smoothly rotate toward target
                let currentRotation = this.group.rotation.y;
                const rotationDifference = targetRotation - currentRotation;
                
                // Normalize difference to be between -PI and PI
                let normalizedDifference = rotationDifference;
                while (normalizedDifference > Math.PI) normalizedDifference -= Math.PI * 2;
                while (normalizedDifference < -Math.PI) normalizedDifference += Math.PI * 2;
                
                // Apply rotation with smoothing
                this.group.rotation.y += normalizedDifference * 0.1;
            }
            
            // Occasionally change to hover state
            if (Math.random() < 0.005) {
                this.kingMovement.movingState = 'hover';
                this.kingMovement.timeInPlace = 0;
            }
        }
    }
    
    // NEW: Update visual effects
    updateVisualEffects(deltaTime) {
        const time = performance.now() * 0.001;
        
        // Animate rings
        if (this.rings) {
            for (const ring of this.rings) {
                // Rotate around its own axis
                ring.mesh.rotation.z += ring.rotationSpeed * deltaTime;
                
                // Wobble the container
                const wobble = Math.sin(time * ring.wobbleSpeed + ring.wobblePhase) * 0.1;
                ring.container.rotation.x = Math.PI/2 + wobble;
                ring.container.rotation.z = wobble * 0.5;
            }
        }
        
        // Animate body details
        if (this.bodyDetails) {
            for (let i = 0; i < this.bodyDetails.length; i++) {
                const detail = this.bodyDetails[i];
                // Pulse opacity based on position
                const pulse = 0.5 + Math.sin(time * 2 + i * 0.2) * 0.3;
                if (detail.material) {
                    detail.material.opacity = pulse;
                }
            }
        }
        
        // Pulse eyes
        if (this.leftEye && this.leftEye.material) {
            const eyePulse = 0.7 + Math.sin(time * 3) * 0.3;
            this.leftEye.material.emissiveIntensity = eyePulse;
        }
        
        if (this.rightEye && this.rightEye.material) {
            const eyePulse = 0.7 + Math.sin(time * 3 + 0.5) * 0.3;
            this.rightEye.material.emissiveIntensity = eyePulse;
        }
        
        // Animate power core if visible
        if (this.powerCore && this.powerCore.material.opacity > 0) {
            // Pulse core
            const corePulse = 0.5 + Math.sin(time * 5) * 0.3;
            this.powerCore.material.opacity = this.coreVisibility * corePulse;
            
            // Pulse core light
            if (this.coreLight) {
                this.coreLight.intensity = this.coreVisibility * 2 * corePulse;
            }
        }
        
        // Pulse main glow light
        if (this.glowLight) {
            const glowPulse = 0.7 + Math.sin(time * 1.5) * 0.3;
            this.glowLight.intensity = glowPulse;
        }
    }
    
    // Override takeDamage to reveal power core when damaged
    takeDamage(amount) {
        // Call parent method first
        const died = super.takeDamage(amount);
        
        // Calculate health percentage
        const healthPercent = this.health / this.maxHealth;
        
        // Set visibility of power core based on damage
        // The more damaged, the more visible
        this.coreVisibility = 1 - healthPercent;
        
        // Update power core visibility
        if (this.powerCore && this.powerCore.material) {
            this.powerCore.material.opacity = this.coreVisibility * 0.7; // Base opacity
            
            // Update core light
            if (this.coreLight) {
                this.coreLight.intensity = this.coreVisibility * 2;
            }
        }
        
        // Make body material more transparent as damage increases
        if (this.bodyMesh && this.bodyMesh.material) {
            // Make body semi-transparent when very damaged
            if (healthPercent < 0.3) {
                this.bodyMesh.material.transparent = true;
                this.bodyMesh.material.opacity = 0.3 + healthPercent * 0.7;
            }
        }
        
        return died;
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
    
    // Create a simple firing effect for individual projectiles
    createProjectileFiringEffect(position) {
        // Simple effect to avoid creating too many objects
        const flashGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x66ccff,
            transparent: true,
            opacity: 0.6
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Simple animation
        const duration = 0.2; // 200ms
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade
            const scale = 1 + progress * 2;
            flash.scale.set(scale, scale, scale);
            flash.material.opacity = 0.6 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(flash);
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
            
            // Update power core - make it pulse faster before exploding
            if (this.powerCore && this.powerCore.material) {
                const corePulse = 1 + Math.sin(progress * Math.PI * 20) * (1 - progress) * 0.5;
                this.powerCore.material.opacity = (1 - progress * 0.5) * corePulse;
            }
            
            if (this.coreLight) {
                const coreLightPulse = 2 + Math.sin(progress * Math.PI * 20) * (1 - progress);
                this.coreLight.intensity = (1 - progress * 0.7) * coreLightPulse;
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
