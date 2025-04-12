export class Enemy {
    constructor(scene, position, collisionManager, player) {
        this.scene = scene;
        this.position = position.clone();
        this.state = 'patrol'; // Change default state to 'patrol' instead of 'idle'
        this.collisionManager = collisionManager;
        this.player = player;
        
        // AI States
        this.states = {
            PATROL: 'patrol',
            CHASE: 'chase',
            RETURN: 'return',
            IDLE: 'idle',
            ATTACK: 'attack', // Add attack state
            DAMAGED: 'damaged', // New state when taking damage
            DEAD: 'dead' // New state for dead enemies
        };
        
        // Health properties
        this.health = 100;
        this.maxHealth = 100;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0.5; // Time in seconds enemy is invulnerable after taking damage
        this.invulnerabilityTimer = 0;
        this.damageTintTime = 0;
        
        // AI Configuration
        this.detectionRange = 8; // Distance at which enemy detects player
        this.chaseRange = 12; // Distance at which enemy gives up chase
        this.moveSpeed = {
            patrol: 0.5, // Slower patrol speed
            chase: 1.5 // Faster chase speed
        };
        this.turnSpeed = {
            patrol: 0.05, // Slower turning during patrol
            chase: 0.15 // Faster turning during chase
        };
        
        // Add patrol properties
        this.patrolRadius = 3; // Radius of patrol circle in world units
        this.patrolSpeed = this.moveSpeed.patrol; // Use patrol speed from AI config
        this.patrolAngle = 0; // Current angle in the patrol circle
        this.patrolCenter = position.clone(); // Center of patrol circle
        this.patrolActive = true; // Flag to enable/disable patrol
        
        // Track last known player position for chase behavior
        this.lastKnownPlayerPos = new THREE.Vector3();
        
        // Track time in current state for state transitions
        this.stateTime = 0;
        this.stateCooldown = 0;
        
        // Collision properties
        this.collisionRadius = 0.8; // Increased from 0.5 to 0.8 for stronger collision
        this.collisionEnabled = true; // Flag to enable/disable collision
        this.lastValidPosition = position.clone(); // Store last valid position
        
        // Attack properties
        this.attackRange = 1.5; // Distance at which enemy can attack player
        this.attackCooldown = 0; // Current cooldown timer
        this.attackCooldownTime = 2; // Time between attacks in seconds
        this.attackDamage = 15; // Damage per attack
        this.attackDuration = 0.5; // Duration of attack animation in seconds
        this.isAttacking = false; // Flag to track if currently attacking
        
        // Create a simple mesh for the enemy
        this.createMesh();
        
        // Add to scene
        this.scene.add(this.group);
        
        // Create a health bar for the enemy
        this.createHealthBar();
        
        console.log("Enemy created at position:", this.position);
    }
    
    createMesh() {
        // Create a group to hold all enemy parts
        this.group = new THREE.Group();
        
        // Create a simple body - just a red cylinder
        const bodyGeometry = new THREE.CylinderGeometry(
            0.5, // top radius
            0.5, // bottom radius
            1.8, // height
            8    // radial segments
        );
        
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000, // Bright red for visibility
            emissive: 0x330000,
            emissiveIntensity: 0.3
        });
        
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.bodyMesh.position.y = 1.8 / 2; // Center vertically
        
        // Store original material color for damage flashing
        this.originalBodyColor = bodyMaterial.color.clone();
        this.originalEmissiveIntensity = bodyMaterial.emissiveIntensity;
        
        // Save body dimensions for collision detection
        this.bodyWidth = 1.0; // Diameter
        this.bodyHeight = 1.8;
        
        // Add body to group
        this.group.add(this.bodyMesh);
        
        // Add simple eyes - to check if we can see the enemy
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00 // Bright yellow eyes
        });
        
        // Left eye
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.2, 1.5, -0.3);
        this.group.add(this.leftEye);
        
        // Right eye
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.2, 1.5, -0.3);
        this.group.add(this.rightEye);
        
        // Position the entire group
        this.group.position.copy(this.position);
        
        // Add an invisible collision cylinder for debug visualization (optional)
        const DEBUG_COLLISION_VISUALIZATION = false; // Set to true to see collision cylinder
        if (DEBUG_COLLISION_VISUALIZATION) {
            const collisionGeometry = new THREE.CylinderGeometry(
                this.collisionRadius,
                this.collisionRadius,
                this.bodyHeight + 0.3, // Add some extra height to collision
                8
            );
            
            const collisionMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.3,
                wireframe: true
            });
            
            this.collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
            this.collisionMesh.position.y = this.bodyHeight / 2;
            this.group.add(this.collisionMesh);
        }
    }
    
    createHealthBar() {
        // Create a simple health bar that follows the enemy
        const healthBarWidth = 1;
        const healthBarHeight = 0.1;
        
        // Container for the health bar
        this.healthBarGroup = new THREE.Group();
        this.healthBarGroup.position.set(0, 2.2, 0); // Position above the enemy
        this.group.add(this.healthBarGroup);
        
        // Health bar background
        const backgroundGeometry = new THREE.PlaneGeometry(healthBarWidth, healthBarHeight);
        const backgroundMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.6
        });
        
        this.healthBarBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        this.healthBarGroup.add(this.healthBarBackground);
        
        // Health bar foreground (the actual health indicator)
        const foregroundGeometry = new THREE.PlaneGeometry(healthBarWidth, healthBarHeight);
        const foregroundMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.8
        });
        
        this.healthBarForeground = new THREE.Mesh(foregroundGeometry, foregroundMaterial);
        this.healthBarForeground.position.z = 0.01; // Slightly in front of background
        this.healthBarGroup.add(this.healthBarForeground);
        
        // Make health bar always face the camera
        this.healthBarGroup.lookAt(0, 0, 0); // Will be updated in update method
        
        // Hide health bar initially, show when damaged
        this.healthBarGroup.visible = false;
    }
    
    update(deltaTime, camera) {
        // Skip updates if enemy is inactive or deltaTime is invalid
        if (this.state === this.states.DEAD || !deltaTime || deltaTime > 1) {
            return;
        }
        
        // Store current position as potentially valid position before movement
        this.lastValidPosition.copy(this.group.position);
        
        // Update state time counter
        this.stateTime += deltaTime;
        if (this.stateCooldown > 0) {
            this.stateCooldown -= deltaTime;
        }
        
        // Update invulnerability timer
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                
                // Reset damage tint if not in damaged state
                if (this.state !== this.states.DAMAGED && this.bodyMesh && this.bodyMesh.material) {
                    this.bodyMesh.material.color.copy(this.originalBodyColor);
                    this.bodyMesh.material.emissiveIntensity = this.originalEmissiveIntensity;
                }
            }
        }
        
        // Update damage tint time
        if (this.damageTintTime > 0) {
            this.damageTintTime -= deltaTime;
            if (this.damageTintTime <= 0 && this.bodyMesh && this.bodyMesh.material) {
                this.bodyMesh.material.color.copy(this.originalBodyColor);
                this.bodyMesh.material.emissiveIntensity = this.originalEmissiveIntensity;
                
                // If in damaged state, return to previous state
                if (this.state === this.states.DAMAGED) {
                    this.changeState(this.states.CHASE);
                }
            }
        }
        
        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Update health bar
        this.updateHealthBar(camera);
        
        // Check player proximity to determine state transitions
        this.checkPlayerProximity();
        
        // Execute behavior based on current state
        switch(this.state) {
            case this.states.PATROL:
                this.executePatrolBehavior(deltaTime);
                break;
                
            case this.states.CHASE:
                this.executeChaseBehavior(deltaTime);
                break;
                
            case this.states.RETURN:
                this.executeReturnBehavior(deltaTime);
                break;
                
            case this.states.IDLE:
                this.executeIdleBehavior(deltaTime);
                break;
                
            case this.states.ATTACK:
                this.executeAttackBehavior(deltaTime);
                break;
                
            case this.states.DAMAGED:
                this.executeDamagedBehavior(deltaTime);
                break;
        }
        
        // Rotate the body slightly to show it's active even if not moving
        this.bodyMesh.rotation.y += deltaTime * 1.0;
    }
    
    updateHealthBar(camera) {
        // Make health bar always face the camera
        if (camera && this.healthBarGroup) {
            this.healthBarGroup.lookAt(camera.position);
        }
        
        // Update health bar width based on current health percentage
        if (this.healthBarForeground) {
            const healthPercent = this.health / this.maxHealth;
            this.healthBarForeground.scale.x = Math.max(0.001, healthPercent);
            
            // Center the health bar
            this.healthBarForeground.position.x = (healthPercent - 1) * 0.5;
            
            // Change color based on health percentage
            if (this.healthBarForeground.material) {
                if (healthPercent < 0.3) {
                    this.healthBarForeground.material.color.set(0xff0000); // Red when low health
                } else if (healthPercent < 0.6) {
                    this.healthBarForeground.material.color.set(0xffaa00); // Orange when medium health
                } else {
                    this.healthBarForeground.material.color.set(0xff3333); // Default red color
                }
            }
            
            // Show health bar for a few seconds when damaged or when health is low
            const lowHealth = this.health < this.maxHealth * 0.5;
            if (this.damageTintTime > 0 || lowHealth) {
                this.healthBarGroup.visible = true;
            } else {
                // Hide health bar when not needed
                this.healthBarGroup.visible = false;
            }
        }
    }
    
    // New method to handle taking damage
    takeDamage(amount) {
        // Check if enemy can take damage
        if (this.isInvulnerable || this.state === this.states.DEAD) {
            return false;
        }
        
        // Apply damage
        this.health = Math.max(0, this.health - amount);
        
        // Set invulnerability timer
        this.isInvulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityTime;
        
        // Visual feedback - damage tint
        this.showDamageTint();
        
        // Play damage sound
        this.playDamageSound();
        
        // Show health bar
        if (this.healthBarGroup) {
            this.healthBarGroup.visible = true;
        }
        
        // Check if enemy is dead
        if (this.health <= 0) {
            this.die();
            return true;
        }
        
        // Enter damaged state temporarily if not already attacking
        if (this.state !== this.states.ATTACK) {
            this.changeState(this.states.DAMAGED);
        }
        
        return true;
    }
    
    // Show damage tint effect
    showDamageTint() {
        if (this.bodyMesh && this.bodyMesh.material) {
            // Turn body bright white-red
            this.bodyMesh.material.color.set(0xffffff);
            this.bodyMesh.material.emissiveIntensity = 1.0;
            
            // Reset tint after a short delay
            this.damageTintTime = 0.3; // 300ms
        }
    }
    
    // Play damage sound effect
    playDamageSound() {
        try {
            const damageSound = new Audio('sounds/enemy_damage.mp3');
            damageSound.volume = 0.3;
            damageSound.play().catch(err => console.log('Could not play damage sound', err));
        } catch (e) {
            console.log('Error playing damage sound', e);
        }
    }
    
    // Handle death
    die() {
        console.log("Enemy killed!");
        
        // Change state to dead
        this.state = this.states.DEAD;
        
        // Make body fall over
        this.playDeathAnimation();
        
        // Disable collision
        this.collisionEnabled = false;
        
        // Hide health bar
        if (this.healthBarGroup) {
            this.healthBarGroup.visible = false;
        }
        
        // Remove from scene after a delay
        setTimeout(() => {
            if (this.scene && this.group) {
                this.scene.remove(this.group);
            }
        }, 3000); // Remove after 3 seconds
    }
    
    // Play death animation
    playDeathAnimation() {
        if (!this.bodyMesh) return;
        
        // Change material to indicate death
        if (this.bodyMesh.material) {
            this.bodyMesh.material.color.set(0x333333); // Gray color
            this.bodyMesh.material.emissive.set(0x000000); // No glow
            this.bodyMesh.material.emissiveIntensity = 0;
            this.bodyMesh.material.transparent = true;
            this.bodyMesh.material.opacity = 0.8;
        }
        
        // Make eyes dim
        if (this.leftEye && this.leftEye.material) {
            this.leftEye.material.color.set(0x333333);
        }
        
        if (this.rightEye && this.rightEye.material) {
            this.rightEye.material.color.set(0x333333);
        }
        
        // Topple over animation
        const fallDirection = new THREE.Vector3(
            Math.random() - 0.5,
            0,
            Math.random() - 0.5
        ).normalize();
        
        // Create animation
        const startRotation = this.group.quaternion.clone();
        const fallRotation = new THREE.Quaternion();
        const fallAxis = new THREE.Vector3(-fallDirection.z, 0, fallDirection.x).normalize();
        fallRotation.setFromAxisAngle(fallAxis, Math.PI / 2); // 90 degrees
        
        // Animate falling and fading
        const duration = 1000; // 1 second
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Interpolate rotation
            this.group.quaternion.slerpQuaternions(
                startRotation,
                fallRotation,
                progress
            );
            
            // Sink into the ground slightly
            this.group.position.y = Math.max(0, this.lastValidPosition.y - progress * 0.5);
            
            // Fade out slightly
            if (this.bodyMesh && this.bodyMesh.material) {
                this.bodyMesh.material.opacity = 0.8 - progress * 0.3;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
        
        // Play death sound
        this.playDeathSound();
    }
    
    // Play death sound
    playDeathSound() {
        try {
            const deathSound = new Audio('sounds/enemy_death.mp3');
            deathSound.volume = 0.4;
            deathSound.play().catch(err => console.log('Could not play death sound', err));
        } catch (e) {
            console.log('Error playing death sound', e);
        }
    }
    
    // New behavior for damaged state
    executeDamagedBehavior(deltaTime) {
        // Briefly stop and face the player
        if (this.player && this.player.camera) {
            // Get direction to player
            const directionToPlayer = new THREE.Vector3()
                .subVectors(this.player.camera.position, this.group.position)
                .normalize();
                
            // Make the enemy face the player
            directionToPlayer.y = 0; // Keep rotation on horizontal plane
            if (directionToPlayer.lengthSq() > 0) {
                const lookTarget = new THREE.Vector3()
                    .addVectors(this.group.position, directionToPlayer);
                    
                // Use faster turning when damaged
                this.smoothLookAt(lookTarget, this.turnSpeed.chase * 2);
            }
        }
        
        // Return to chase state after a short delay or when damage tint ends
        if (this.stateTime > 0.5) {
            this.changeState(this.states.CHASE);
        }
    }
    
    // State transition handler - checks proximity to player and changes state
    checkPlayerProximity() {
        if (!this.player || !this.player.camera) return;
        
        // Get player position
        const playerPos = this.player.camera.position;
        
        // Calculate distance to player
        const distanceToPlayer = this.group.position.distanceTo(playerPos);
        
        // Store the player position for use in chase behavior
        this.lastKnownPlayerPos.copy(playerPos);
        
        // Check for attack range if in chase state
        if (distanceToPlayer < this.attackRange && this.attackCooldown <= 0) {
            // Only attack if we're in the chase state
            if (this.state === this.states.CHASE) {
                this.changeState(this.states.ATTACK);
                this.performAttack();
            }
        }
        
        // State transitions
        switch(this.state) {
            case this.states.PATROL:
            case this.states.IDLE:
            case this.states.RETURN:
            case this.states.DAMAGED: // Can detect player while damaged
                // If player is within detection range, transition to chase
                if (distanceToPlayer < this.detectionRange) {
                    this.changeState(this.states.CHASE);
                    this.playDetectionEffect();
                }
                break;
                
            case this.states.CHASE:
                // If player is beyond chase range, return to patrol
                if (distanceToPlayer > this.chaseRange) {
                    this.changeState(this.states.RETURN);
                }
                break;
        }
        
        // Visual feedback - eyes glow based on state
        this.updateEyeAppearance(distanceToPlayer);
    }
    
    // Handle state changes and reset timers
    changeState(newState) {
        // Only change if the state is different
        if (this.state !== newState) {
            console.log(`Enemy state changed: ${this.state} -> ${newState}`);
            this.state = newState;
            this.stateTime = 0;
            
            // Update movement speed based on state
            if (newState === this.states.CHASE) {
                this.patrolSpeed = this.moveSpeed.chase;
            } else {
                this.patrolSpeed = this.moveSpeed.patrol;
            }
        }
    }
    
    // Patrol state behavior
    executePatrolBehavior(deltaTime) {
        if (!this.patrolActive) return;
        
        // Calculate new position on the circle
        this.patrolAngle += this.patrolSpeed * deltaTime;
        
        // Calculate new x and z positions
        const newX = this.patrolCenter.x + Math.cos(this.patrolAngle) * this.patrolRadius;
        const newZ = this.patrolCenter.z + Math.sin(this.patrolAngle) * this.patrolRadius;
        
        // Create a potential new position
        const newPosition = new THREE.Vector3(
            newX,
            this.group.position.y,
            newZ
        );
        
        // Check for collisions before moving
        this.moveWithCollisionCheck(newPosition);
        
        // Make the enemy face the direction of movement
        const forward = new THREE.Vector3(-Math.sin(this.patrolAngle), 0, Math.cos(this.patrolAngle));
        
        // Only set lookAt if forward is a valid direction
        if (forward.lengthSq() > 0) {
            const lookAtPoint = new THREE.Vector3().addVectors(this.group.position, forward);
            this.group.lookAt(lookAtPoint);
        }
    }
    
    // Chase state behavior
    executeChaseBehavior(deltaTime) {
        if (!this.player || !this.player.camera) return;
        
        // Get direction to player
        const directionToPlayer = new THREE.Vector3()
            .subVectors(this.lastKnownPlayerPos, this.group.position)
            .normalize();
        
        // Only consider horizontal movement (ignore y component)
        directionToPlayer.y = 0;
        if (directionToPlayer.lengthSq() === 0) return;
        
        // Calculate new position towards player
        const moveDistance = this.patrolSpeed * deltaTime;
        const newPosition = this.group.position.clone().addScaledVector(directionToPlayer, moveDistance);
        
        // Check for collisions before moving
        this.moveWithCollisionCheck(newPosition);
        
        // Make the enemy face the player
        const lookTarget = new THREE.Vector3()
            .addVectors(this.group.position, directionToPlayer);
        
        // Smoothly rotate toward player
        this.smoothLookAt(lookTarget, this.turnSpeed.chase);
    }
    
    // Return to patrol state behavior
    executeReturnBehavior(deltaTime) {
        // Calculate direction to patrol center
        const directionToCenter = new THREE.Vector3()
            .subVectors(this.patrolCenter, this.group.position)
            .normalize();
        
        // Only consider horizontal movement
        directionToCenter.y = 0;
        
        // If we're very close to the center, go back to patrol
        const distanceToCenter = this.group.position.distanceTo(this.patrolCenter);
        if (distanceToCenter < 0.5) {
            this.changeState(this.states.PATROL);
            return;
        }
        
        // Calculate new position towards center
        const moveDistance = this.patrolSpeed * deltaTime;
        const newPosition = this.group.position.clone().addScaledVector(directionToCenter, moveDistance);
        
        // Check for collisions before moving
        this.moveWithCollisionCheck(newPosition);
        
        // Make the enemy face the direction of movement
        const lookTarget = new THREE.Vector3()
            .addVectors(this.group.position, directionToCenter);
            
        // Smoothly rotate toward center
        this.smoothLookAt(lookTarget, this.turnSpeed.patrol);
    }
    
    // Idle state behavior
    executeIdleBehavior(deltaTime) {
        // Just rotate in place
        this.group.rotation.y += deltaTime * 0.5;
        
        // Occasionally transition back to patrol
        if (this.stateTime > 5 && Math.random() < 0.01) {
            this.changeState(this.states.PATROL);
        }
    }
    
    // Attack state behavior
    executeAttackBehavior(deltaTime) {
        // During attack, keep facing the player but don't move
        if (this.player && this.player.camera) {
            // Get direction to player
            const directionToPlayer = new THREE.Vector3()
                .subVectors(this.player.camera.position, this.group.position)
                .normalize();
            
            // Make the enemy face the player
            directionToPlayer.y = 0; // Keep rotation on horizontal plane
            if (directionToPlayer.lengthSq() > 0) {
                const lookTarget = new THREE.Vector3()
                    .addVectors(this.group.position, directionToPlayer);
                
                // Use faster turning during attack
                this.smoothLookAt(lookTarget, this.turnSpeed.chase * 1.5);
            }
        }
        
        // The actual attack is handled by the performAttack method
    }
    
    // Perform an attack on the player
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
        
        // Create attack effect
        this.createAttackEffect();
        
        // Deal damage to player after a short delay (matching the animation)
        setTimeout(() => {
            // Check if still in range before applying damage
            if (this.player && this.player.camera) {
                const currentDistanceToPlayer = this.group.position.distanceTo(this.player.camera.position);
                if (currentDistanceToPlayer <= this.attackRange) {
                    console.log(`Enemy hit player for ${this.attackDamage} damage!`);
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
    
    // Create a visual effect for the attack
    createAttackEffect() {
        if (!this.scene) return;
        
        // Get direction to player
        const directionToPlayer = new THREE.Vector3()
            .subVectors(this.lastKnownPlayerPos, this.group.position)
            .normalize();
        
        // Adjust to be horizontal only
        directionToPlayer.y = 0;
        directionToPlayer.normalize();
        
        // Create a cone geometry pointing in the attack direction
        const attackGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const attackMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.6
        });
        
        const attackMesh = new THREE.Mesh(attackGeometry, attackMaterial);
        
        // Position the cone in front of the enemy
        const attackPosition = this.group.position.clone().addScaledVector(directionToPlayer, 1.0);
        attackPosition.y += 0.9; // Position at eye level
        attackMesh.position.copy(attackPosition);
        
        // Rotate cone to point toward player
        attackMesh.lookAt(this.lastKnownPlayerPos);
        attackMesh.rotateX(Math.PI / 2); // Adjust rotation to point forward
        
        this.scene.add(attackMesh);
        
        // Animate the attack effect
        const duration = this.attackDuration * 1000;
        const startTime = performance.now();
        
        const animateAttack = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade out
            const scale = 1 + progress;
            attackMesh.scale.set(scale, 1, scale);
            attackMesh.material.opacity = 0.6 * (1 - progress);
