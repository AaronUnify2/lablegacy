import { Enemy } from './enemy.js';

export class ShadowCrawler extends Enemy {
    constructor(scene, position, collisionManager, player) {
        // Call parent constructor first
        super(scene, position, collisionManager, player);
        
        // Override key properties for Shadow Crawler
        this.health = 70; // Less health than regular enemies
        this.maxHealth = 70;
        this.detectionRange = 10; // Slightly increased detection range
        this.chaseRange = 15; // Larger chase range
        this.attackRange = 2.0; // Slightly larger attack range
        this.attackDamage = 10; // Less damage per hit
        
        // Unique Shadow Crawler properties
        this.moveSpeed = {
            patrol: 1.0, // Faster patrol speed
            chase: 2.2 // Much faster chase speed
        };
        
        // Wall climbing properties
        this.isOnWall = false;
        this.canClimb = true;
        this.wallClimbCooldown = 0;
        this.wallClimbCooldownTime = 3; // Seconds between wall climbs
        this.wallClimbDuration = 0;
        this.wallClimbMaxDuration = 4; // Max seconds on a wall
        this.currentWallNormal = new THREE.Vector3(); // Normal of wall being climbed
        
        // Attack properties
        this.attackCooldownTime = 1.0; // Faster attacks (was 2.0 in base enemy)
        this.spikeExtended = false;
        this.spikeExtendTime = 0;
        this.spikeRetractTime = 0.3; // Time to retract spike after attack
        
        // Neon highlight colors for different states
        this.highlightColors = {
            patrol: 0x66ff99, // Green in patrol state
            chase: 0xff3366, // Red in chase state
            attack: 0xff00ff, // Purple when attacking
            wallClimb: 0xffff00 // Yellow when wall climbing
        };
        this.currentHighlightColor = this.highlightColors.patrol;
        
        // Completely disable ranged attacks
        this.useRangedAttack = false;
        
        // Create the mesh to replace the default one
        this.createMesh();
        
        console.log("Shadow Crawler created at position:", this.position);
    }
    
    // Override createMesh to create a shadowy, low-profile crawler
    createMesh() {
        // Remove existing mesh if it exists
        if (this.group) {
            this.scene.remove(this.group);
        }
        
        // Create a group to hold all enemy parts
        this.group = new THREE.Group();
        
        // Create a flat, wide body - like a shadow on the ground
        const bodyGeometry = new THREE.BoxGeometry(
            1.2, // width - wider than tall
            0.4, // height - very flat
            1.8  // depth - longer than wide, like a bug
        );
        
        // Dark material with slight transparency for shadowy look
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111, // Very dark base color
            emissive: 0x111111,
            emissiveIntensity: 0.2,
            roughness: 0.9,
            metalness: 0.2,
            transparent: true,
            opacity: 0.9
        });
        
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        
        // Save body dimensions for collision detection
        this.bodyWidth = 1.2;
        this.bodyHeight = 0.4;
        
        // Add body to group
        this.group.add(this.bodyMesh);
        
        // Create neon highlight edges
        this.createHighlightEdges();
        
        // Create glowing eyes - smaller and more insect-like
        const eyeGeometry = new THREE.SphereGeometry(0.07, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: this.currentHighlightColor,
            emissive: this.currentHighlightColor,
            emissiveIntensity: 1.0
        });
        
        // Position eyes closer together and more forward
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.15, 0.2, 0.7); // Positioned near the front
        this.group.add(this.leftEye);
        
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.15, 0.2, 0.7);
        this.group.add(this.rightEye);
        
        // Create extending spike for attacks
        this.createSpikeAttack();
        
        // Create legs
        this.createLegs();
        
        // Position the entire group
        this.group.position.copy(this.position);
        
        // Add to scene
        this.scene.add(this.group);
        
        // Update collision radius - smaller for the crawler
        this.collisionRadius = 0.6;
    }
    
    // Create highlight edges to give the crawler a neon effect
    createHighlightEdges() {
        // Create edge geometry for the body
        const edgeGeometry = new THREE.EdgesGeometry(
            new THREE.BoxGeometry(1.2, 0.4, 1.8)
        );
        
        // Neon material that will change color based on state
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: this.currentHighlightColor,
            linewidth: 1
        });
        
        this.highlightEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        this.highlightEdges.position.copy(this.bodyMesh.position);
        this.group.add(this.highlightEdges);
    }
    
    // Create extending spike for attacks
    createSpikeAttack() {
        // Create retracted spike (hidden initially)
        const spikeGeometry = new THREE.ConeGeometry(0.1, 0.8, 8);
        const spikeMaterial = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            emissive: this.highlightColors.attack,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });
        
        // Rotate spike to point forward
        spikeGeometry.rotateX(Math.PI / 2);
        
        this.spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        this.spike.position.set(0, 0.1, 0.9); // Position at front of body
        this.spike.scale.set(1, 0.01, 1); // Initially retracted (almost invisible)
        this.group.add(this.spike);
    }
    
    // Create legs for the crawler
    createLegs() {
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.02, 0.5, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.9
        });
        
        // Position for 6 legs (3 on each side)
        const legPositions = [
            // Left side
            { x: -0.6, y: 0, z: 0.6 },  // Front left
            { x: -0.6, y: 0, z: 0 },    // Middle left
            { x: -0.6, y: 0, z: -0.6 }, // Back left
            
            // Right side
            { x: 0.6, y: 0, z: 0.6 },   // Front right
            { x: 0.6, y: 0, z: 0 },     // Middle right
            { x: 0.6, y: 0, z: -0.6 }   // Back right
        ];
        
        this.legs = [];
        
        for (const pos of legPositions) {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            
            // Rotate to be horizontal
            leg.rotation.z = Math.PI / 2;
            
            // Position by the body, sticking out to the sides
            leg.position.set(pos.x, pos.y, pos.z);
            
            this.group.add(leg);
            this.legs.push(leg);
        }
    }
    
    // Override update method to handle wall climbing and animations
    update(deltaTime, camera) {
        // Call the parent update method first
        super.update(deltaTime, camera);
        
        // Update wall climbing behavior
        this.updateWallClimbing(deltaTime);
        
        // Update neon highlight colors based on state
        this.updateHighlightColors();
        
        // Update leg animations
        this.animateLegs(deltaTime);
        
        // Update spike attack animation
        this.updateSpikeAnimation(deltaTime);
    }
    
    // Update the neon highlight colors based on current state
    updateHighlightColors() {
        let targetColor;
        
        if (this.isOnWall) {
            targetColor = this.highlightColors.wallClimb;
        } else if (this.state === 'attack') {
            targetColor = this.highlightColors.attack;
        } else if (this.state === 'chase') {
            targetColor = this.highlightColors.chase;
        } else {
            targetColor = this.highlightColors.patrol;
        }
        
        // Only update if the color changed
        if (targetColor !== this.currentHighlightColor) {
            this.currentHighlightColor = targetColor;
            
            // Update highlight edges
            if (this.highlightEdges && this.highlightEdges.material) {
                this.highlightEdges.material.color.set(this.currentHighlightColor);
            }
            
            // Update eyes
            if (this.leftEye && this.leftEye.material) {
                this.leftEye.material.color.set(this.currentHighlightColor);
                this.leftEye.material.emissive.set(this.currentHighlightColor);
            }
            
            if (this.rightEye && this.rightEye.material) {
                this.rightEye.material.color.set(this.currentHighlightColor);
                this.rightEye.material.emissive.set(this.currentHighlightColor);
            }
            
            // Update spike if in attack state
            if (this.state === 'attack' && this.spike && this.spike.material) {
                this.spike.material.emissive.set(this.highlightColors.attack);
            }
        }
    }
    
    // Animate the legs based on movement
    animateLegs(deltaTime) {
        if (!this.legs || this.legs.length === 0) return;
        
        const time = performance.now() * 0.001;
        const isMoving = this.state === 'chase' || this.state === 'patrol';
        
        // Move legs differently based on wall climbing or ground movement
        if (this.isOnWall) {
            // Crawling on wall animation
            for (let i = 0; i < this.legs.length; i++) {
                const leg = this.legs[i];
                // More rapid and smaller movements on wall
                const phase = i * Math.PI / 3; // Distribute phases for six legs
                const speed = this.state === 'chase' ? 15 : 10;
                const amplitude = 0.2;
                
                // Angle the legs based on which wall we're on
                // This is a simplified version; ideally we'd orient based on wall normal
                leg.rotation.z = Math.PI / 2;
                
                // Use a sine wave to animate the leg position
                if (isMoving) {
                    leg.position.y = 0.1 + Math.sin(time * speed + phase) * amplitude;
                }
            }
        } else {
            // Regular ground movement
            for (let i = 0; i < this.legs.length; i++) {
                const leg = this.legs[i];
                const phase = i * Math.PI / 3; // Distribute phases for six legs
                const speed = this.state === 'chase' ? 12 : 8;
                const amplitude = 0.15;
                
                // Reset rotation for ground movement
                leg.rotation.z = Math.PI / 2;
                
                // Use a sine wave to animate the leg position
                if (isMoving) {
                    leg.position.y = Math.abs(Math.sin(time * speed + phase) * amplitude);
                }
            }
        }
    }
    
    // Update the extending spike animation
    updateSpikeAnimation(deltaTime) {
        if (!this.spike) return;
        
        // Extend the spike during attack
        if (this.spikeExtended) {
            this.spikeExtendTime -= deltaTime;
            
            if (this.spikeExtendTime <= 0) {
                // Retract the spike
                this.spikeExtended = false;
                
                // Animate retraction
                const retractDuration = 0.2; // seconds
                const startScale = this.spike.scale.y;
                const startTime = performance.now();
                
                const retractSpike = () => {
                    const elapsed = (performance.now() - startTime) / 1000;
                    const progress = Math.min(elapsed / retractDuration, 1);
                    
                    // Scale down on Y-axis to retract
                    this.spike.scale.y = startScale * (1 - progress);
                    
                    if (progress < 1) {
                        requestAnimationFrame(retractSpike);
                    } else {
                        // Fully retracted
                        this.spike.scale.y = 0.01;
                    }
                };
                
                retractSpike();
            }
        }
    }
    
    // Wall climbing behavior
    updateWallClimbing(deltaTime) {
        // Update cooldowns
        if (this.wallClimbCooldown > 0) {
            this.wallClimbCooldown -= deltaTime;
        }
        
        // If we're on a wall, count the duration
        if (this.isOnWall) {
            this.wallClimbDuration += deltaTime;
            
            // If we've been on the wall too long, come down
            if (this.wallClimbDuration >= this.wallClimbMaxDuration) {
                this.detachFromWall();
            }
            
            // Rotate the crawler to face the wall
            if (this.currentWallNormal.lengthSq() > 0) {
                // Create a quaternion to rotate toward the wall
                const targetQuaternion = new THREE.Quaternion();
                const upVector = new THREE.Vector3(0, 1, 0);
                
                // Adjust rotation based on which wall we're on
                if (Math.abs(this.currentWallNormal.x) > Math.abs(this.currentWallNormal.z)) {
                    // Side wall (east/west)
                    const rotationAxis = new THREE.Vector3(0, 0, -Math.sign(this.currentWallNormal.x));
                    const rotationAngle = Math.PI / 2;
                    targetQuaternion.setFromAxisAngle(rotationAxis, rotationAngle);
                } else {
                    // Front/back wall (north/south)
                    const rotationAxis = new THREE.Vector3(Math.sign(this.currentWallNormal.z), 0, 0);
                    const rotationAngle = Math.PI / 2;
                    targetQuaternion.setFromAxisAngle(rotationAxis, rotationAngle);
                }
                
                // Smoothly rotate toward the wall
                this.group.quaternion.slerp(targetQuaternion, 5 * deltaTime);
            }
        } else {
            // Reset wall climbing duration when not on a wall
            this.wallClimbDuration = 0;
        }
    }
    
    // Attempt to climb a wall
    attemptWallClimb(wall) {
        if (!this.canClimb || this.wallClimbCooldown > 0 || this.isOnWall) {
            return false;
        }
        
        // Store the wall normal for orientation
        this.currentWallNormal.copy(wall.normal);
        
        // Set flag for wall climbing
        this.isOnWall = true;
        this.wallClimbDuration = 0;
        
        // Adjust position to be on the wall
        const wallOffset = 0.3; // Distance from the wall
        
        // Adjust position based on wall normal
        this.group.position.addScaledVector(wall.normal, -wallOffset);
        
        return true;
    }
    
    // Detach from the wall
    detachFromWall() {
        if (!this.isOnWall) return;
        
        // Detach from wall
        this.isOnWall = false;
        
        // Set cooldown before can climb again
        this.wallClimbCooldown = this.wallClimbCooldownTime;
        
        // Reset orientation
        this.group.rotation.set(0, 0, 0);
    }
    
    // Override move with collision check to handle wall climbing
    moveWithCollisionCheck(newPosition) {
        if (!this.collisionEnabled || !this.collisionManager) {
            // If collision is disabled, just move
            this.group.position.copy(newPosition);
            return true;
        }
        
        // Check for collisions
        const collision = this.collisionManager.checkCollision(newPosition, this.collisionRadius);
        
        // Only consider environmental collisions, not other enemies
        if (collision.collides && collision.collider && !collision.collider.isEnemy) {
            // If we're in chase mode and can climb, try to climb the wall
            if (this.state === 'chase' && this.canClimb && !this.isOnWall && this.wallClimbCooldown <= 0) {
                // Get the collision normal (which way the wall is facing)
                const wallNormal = new THREE.Vector3();
                
                // Determine the normal based on which face we hit
                if (collision.collider.minX <= newPosition.x && newPosition.x <= collision.collider.maxX) {
                    // We hit the north or south face
                    if (newPosition.z < collision.collider.minZ) {
                        wallNormal.set(0, 0, -1); // North face
                    } else {
                        wallNormal.set(0, 0, 1); // South face
                    }
                } else {
                    // We hit the east or west face
                    if (newPosition.x < collision.collider.minX) {
                        wallNormal.set(-1, 0, 0); // West face
                    } else {
                        wallNormal.set(1, 0, 0); // East face
                    }
                }
                
                // Attempt to climb the wall
                const climbed = this.attemptWallClimb({ normal: wallNormal });
                
                if (climbed) {
                    console.log("Shadow Crawler climbed a wall!");
                    return true;
                }
            }
            
            // If we couldn't climb the wall, try to avoid the collision
            const adjustedPosition = this.findAlternativePath(newPosition, collision);
            
            if (adjustedPosition) {
                this.group.position.copy(adjustedPosition);
                return true;
            }
            
            return false;
        }
        
        // Check for ground beneath us
        const groundCheck = new THREE.Vector3(newPosition.x, newPosition.y - 0.5, newPosition.z);
        const groundHit = this.collisionManager.findFloorBelow(groundCheck, 2);
        
        if (!groundHit && !this.isOnWall) {
            // No ground beneath, skip moving if not on a wall
            if (Math.random() < 0.05) { // Log occasionally
                console.log("No ground beneath Shadow Crawler, can't move");
            }
            return false;
        }
        
        // No collision, update position
        this.group.position.copy(newPosition);
        return true;
    }
    
    // Find an alternative path around obstacles
    findAlternativePath(desiredPosition, collision) {
        // If we're on a wall, we need a special movement strategy
        if (this.isOnWall) {
            // On a wall, movement should be along the wall plane
            // This is a simplified implementation - could be enhanced for better wall climbing
            
            // Get direction to player but project it onto the wall plane
            const dirToPlayer = new THREE.Vector3()
                .subVectors(this.player.camera.position, this.group.position)
                .normalize();
            
            // Project direction onto the wall plane
            const projectedDir = new THREE.Vector3().copy(dirToPlayer);
            projectedDir.sub(
                this.currentWallNormal.clone().multiplyScalar(
                    projectedDir.dot(this.currentWallNormal)
                )
            ).normalize();
            
            // Create new position along the wall
            const moveSpeed = this.state === 'chase' ? this.moveSpeed.chase * 0.7 : this.moveSpeed.patrol * 0.7;
            const wallMovePosition = this.group.position.clone()
                .add(projectedDir.multiplyScalar(moveSpeed * 0.016)); // Scale for ~60fps
                
            return wallMovePosition;
        }
        
        // Standard obstacle avoidance for ground movement
        // Try moving only on X axis
        const xOnlyPosition = this.group.position.clone();
        xOnlyPosition.x = desiredPosition.x;
        
        if (!this.collisionManager.checkCollision(xOnlyPosition, this.collisionRadius).collides) {
            return xOnlyPosition;
        }
        
        // Try moving only on Z axis
        const zOnlyPosition = this.group.position.clone();
        zOnlyPosition.z = desiredPosition.z;
        
        if (!this.collisionManager.checkCollision(zOnlyPosition, this.collisionRadius).collides) {
            return zOnlyPosition;
        }
        
        // If both fail, try a different direction
        const randomAngle = Math.random() * Math.PI * 2;
        const alternativePosition = this.group.position.clone().add(
            new THREE.Vector3(
                Math.cos(randomAngle) * 0.5,
                0,
                Math.sin(randomAngle) * 0.5
            )
        );
        
        if (!this.collisionManager.checkCollision(alternativePosition, this.collisionRadius).collides) {
            return alternativePosition;
        }
        
        // If all else fails, stay put
        return null;
    }
    
    // Override the attack behavior to use the spike
    performAttack() {
        if (this.isAttacking || !this.player) return; // Don't attack if already attacking
        
        this.isAttacking = true;
        this.attackCooldown = this.attackCooldownTime;
        
        // Visual feedback - make eyes flash brighter during attack
        if (this.leftEye && this.leftEye.material) {
            this.leftEye.material.emissiveIntensity = 2.0;
        }
        if (this.rightEye && this.rightEye.material) {
            this.rightEye.material.emissiveIntensity = 2.0;
        }
        
        // Extend the spike for the attack
        this.extendSpike();
        
        // Deal damage to player after a short delay (matching the animation)
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
            
            // Reset eye glow
            if (this.leftEye && this.leftEye.material) {
                this.leftEye.material.emissiveIntensity = 1.0;
            }
            if (this.rightEye && this.rightEye.material) {
                this.rightEye.material.emissiveIntensity = 1.0;
            }
            
            // Return to chase state after attack
            this.changeState(this.states.CHASE);
        }, this.attackDuration * 1000);
    }
    
    // Extend the spike for attacks
    extendSpike() {
        if (!this.spike) return;
        
        // Set flag
        this.spikeExtended = true;
        this.spikeExtendTime = this.spikeRetractTime;
        
        // Animate extension
        const extendDuration = 0.15; // faster than retraction
        const startTime = performance.now();
        
        const extendSpike = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const progress = Math.min(elapsed / extendDuration, 1);
            
            // Scale up on Y-axis to extend
            this.spike.scale.y = progress;
            
            if (progress < 1) {
                requestAnimationFrame(extendSpike);
            } else {
                // Fully extended
                this.spike.scale.y = 1;
                
                // Add glow effect for the attack
                if (this.spike.material) {
                    this.spike.material.emissiveIntensity = 1.0;
                    
                    // Create a quick flash of light at the spike tip
                    const flashLight = new THREE.PointLight(this.highlightColors.attack, 1.0, 2.0);
                    const tipPosition = new THREE.Vector3(0, 0, 1.3); // Position at spike tip
                    tipPosition.applyMatrix4(this.spike.matrixWorld);
                    flashLight.position.copy(tipPosition);
                    
                    this.scene.add(flashLight);
                    
                    // Remove the light after a short duration
                    setTimeout(() => {
                        this.scene.remove(flashLight);
                    }, 150);
                }
            }
        };
        
        extendSpike();
        
        // Play stabbing sound effect
        this.playStabSound();
    }
    
    // Play stab sound effect
    playStabSound() {
        try {
            const stabSound = new Audio('sounds/shadow_stab.mp3');
            stabSound.volume = 0.3;
            stabSound.playbackRate = 1.5; // Higher pitch for faster stab
            stabSound.play().catch(err => console.log('Could not play stab sound', err));
        } catch (e) {
            console.log('Error playing stab sound', e);
            
            // Fallback audio synthesis if sound file not available
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create oscillator for stab sound
                const oscillator = audioCtx.createOscillator();
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);
                
                // Create gain node for volume control
                const gainNode = audioCtx.createGain();
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                
                // Connect nodes
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                // Play and stop
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.2);
            } catch (audioError) {
                console.log('Audio synthesis also failed', audioError);
            }
        }
    }
    
    // Override death method for a shadow dissipation effect
    die() {
        if (this.state === 'dead') return; // Already dead
        
        console.log("Shadow Crawler died!");
        this.state = 'dead';
        
        // Drop mana orb if not already dropped
        if (!this.manaDrop.dropped) {
            this.dropManaOrb();
            this.manaDrop.dropped = true;
        }
        
        // Create a shadow dissipation death effect
        this.createShadowDissipationEffect();
        
        // Disable collisions
        this.collisionEnabled = false;
    }
    
    // Create a shadow dissipation effect on death
    createShadowDissipationEffect() {
        // Create particles that scatter from the body
        const particleCount = 20;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Create small shadow fragments
            const size = Math.random() * 0.2 + 0.1;
            const geometry = new THREE.BoxGeometry(size, size * 0.3, size);
            const material = new THREE.MeshBasicMaterial({
                color: 0x111111,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Position randomly within the body
            particle.position.copy(this.group.position);
            particle.position.x += (Math.random() - 0.5) * this.bodyWidth;
            particle.position.z += (Math.random() - 0.5) * 1.8; // Body length
            
            // Add random velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.05 + Math.random() * 0.1;
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.random() * 0.1, // Small upward component
                Math.sin(angle) * speed
            );
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Create a flash of highlight color
        const flashGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: this.currentHighlightColor,
            transparent: true,
            opacity: 0.7
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(this.group.position);
        this.scene.add(flash);
        
        // Create a fading light effect
        const light = new THREE.PointLight(this.currentHighlightColor, 1.0, 5);
        light.position.copy(this.group.position);
        this.scene.add(light);
        
        // Hide the original mesh
        this.group.visible = false;
        
        // Animate the particles and effects
        const duration = 1.5; // 1.5 seconds
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
                particle.velocity.y -= 0.001;
                particle.velocity.multiplyScalar(0.98);
                
                // Fade out
                particle.material.opacity = 0.7 * (1 - progress);
                
                // Flatten as they dissipate
                const flattenProgress = Math.min(progress * 2, 1);
                particle.scale.y = Math.max(0.1, 1 - flattenProgress);
            }
            
            // Flash effect - expand and fade
            if (flash) {
                flash.scale.set(1 + progress * 2, 0.5 * (1 - progress), 1 + progress * 2);
                flash.material.opacity = 0.7 * (1 - progress);
            }
            
            // Light effect - fade out
            if (light) {
                light.intensity = 1.0 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                particles.forEach(particle => {
                    this.scene.remove(particle);
                    if (particle.geometry) particle.geometry.dispose();
                    if (particle.material) particle.material.dispose();
                });
                
                this.scene.remove(flash);
                this.scene.remove(light);
                if (flash.geometry) flash.geometry.dispose();
                if (flash.material) flash.material.dispose();
                
                // Remove the original mesh from the scene
                this.scene.remove(this.group);
            }
        };
        
        animate();
    }
    
    // Override dropManaOrb to create a shadow-themed mana orb
    dropManaOrb() {
        // Calculate random mana amount to drop
        const manaAmount = Math.floor(Math.random() * 
            (this.manaDrop.max - this.manaDrop.min + 1)) + this.manaDrop.min;
        
        // Create shadow-themed mana orb mesh
        const orbGeometry = new THREE.SphereGeometry(0.4, 12, 12);
        const orbMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366ff,
            emissive: 0x3366ff,
            emissiveIntensity: 0.5,
            metalness: 0.7,
            roughness: 0.3,
            transparent: true,
            opacity: 0.9
        });
        
        const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
        
        // Position the orb at the enemy's death location
        orbMesh.position.copy(this.group.position);
        orbMesh.position.y = 0.5; // Float slightly above the ground
        
        // Add shadow wisp effect around orb
        const glowGeometry = new THREE.SphereGeometry(0.6, 12, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.currentHighlightColor, // Use current highlight color
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        orbMesh.add(glowMesh);
        
        // Add point light to make it glow
        const orbLight = new THREE.PointLight(0x3366ff, 1.5, 3);
        orbLight.position.set(0, 0, 0);
        orbMesh.add(orbLight);
        
        // Add userData to identify this as a mana orb and store mana amount
        orbMesh.userData = {
            isManaOrb: true,
            manaAmount: manaAmount,
            isShadowOrb: true // Tag as shadow orb for special effects
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
                this.collisionManager.colliders[colliderIndex].isShadowOrb = true;
            }
        }
        
        // Add animation for the orb with shadow effect
        this.animateShadowManaOrb(orbMesh);
        
        console.log(`Dropped shadow mana orb containing ${manaAmount} mana`);
    }
    
    // Animate shadow mana orb with crawling shadow tendrils
    animateShadowManaOrb(orbMesh) {
        // Make the orb bob up and down
        const startY = orbMesh.position.y;
        const floatHeight = 0.3;
        const floatSpeed = 1.5;
        
        // Make orb pulse with shadow effect
        const pulseSpeed = 2;
        
        // If we already have an animation system, use it
        if (!window.animatedShadowOrbs) {
            window.animatedShadowOrbs = [];
            
            const animateShadowOrbs = function() {
                const orbs = window.animatedShadowOrbs;
                if (orbs && orbs.length > 0) {
                    const time = performance.now() * 0.001;
                    
                    for (const orb of orbs) {
                        const userData = orb.userData;
                        
                        // Bob up and down
                        orb.position.y = userData.startY + 
                            Math.sin(time * userData.floatSpeed) * userData.floatHeight;
                        
                        // Rotate slowly with sinusoidal variation
                        orb.rotation.y += 0.01 + Math.sin(time * 0.5) * 0.005;
                        
                        // Pulse glow with unsettling pattern
                        if (orb.children && orb.children[0]) {
                            const glow = orb.children[0];
                            // Use multiple sine waves with different frequencies for more organic feel
                            const pulseScale = 1 + 
                                Math.sin(time * userData.pulseSpeed) * 0.15 + 
                                Math.sin(time * userData.pulseSpeed * 1.3) * 0.1;
                            glow.scale.set(pulseScale, pulseScale, pulseScale);
                            
                            // Slowly shift glow color between blue and highlight color
                            const colorShift = (Math.sin(time * 0.5) + 1) * 0.5; // 0 to 1
                            if (glow.material) {
                                // Interpolate between blue and highlight color
                                const blue = new THREE.Color(0x3366ff);
                                const highlight = new THREE.Color(userData.highlightColor);
                                glow.material.color.copy(blue).lerp(highlight, colorShift);
                            }
                        }
                        
                        // Pulse light
                        if (orb.children && orb.children[1]) {
                            const light = orb.children[1];
                            light.intensity = 1 + Math.sin(time * userData.pulseSpeed) * 0.5;
                        }
                    }
                }
                
                requestAnimationFrame(animateShadowOrbs);
            };
            
            animateShadowOrbs();
        }
        
        // Store animation parameters with the orb
        orbMesh.userData.startY = startY;
        orbMesh.userData.floatHeight = floatHeight;
        orbMesh.userData.floatSpeed = floatSpeed;
        orbMesh.userData.pulseSpeed = pulseSpeed;
        orbMesh.userData.highlightColor = this.currentHighlightColor;
        
        // Add to animated shadow orbs
        window.animatedShadowOrbs.push(orbMesh);
    }
}
