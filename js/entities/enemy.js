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
            ATTACK: 'attack', // Melee attack state
            RANGED_ATTACK: 'ranged_attack' // New ranged attack state
        };
        
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
        
        // Ranged attack properties
        this.rangedAttackRange = 10; // Distance for ranged attack (longer than melee)
        this.rangedAttackCooldown = 0; // Separate cooldown for ranged attacks
        this.rangedAttackCooldownTime = 3; // Time between ranged attacks
        this.rangedAttackDamage = 10; // Damage for ranged attack
        this.rangedAttackDuration = 1.2; // Duration of ranged attack animation
        this.isRangedAttacking = false; // Flag to track if currently performing ranged attack
        this.rangedAttackSpeed = 15; // Speed of the projectile in units per second
        this.rangedAttackProjectile = null; // Reference to current projectile
        
        // Health and damage properties
        this.health = 100; // Max health for enemies
        this.maxHealth = 100; // Store max health
        this.isDamaged = false; // Flag for visual damage effect
        this.damageFlashTime = 0; // Timer for the damage flash effect
        this.isInvulnerable = false; // Invulnerability flag after taking damage
        this.invulnerabilityTime = 0; // Timer for invulnerability period
        
        // Create a simple mesh for the enemy
        this.createMesh();
        
        // Add to scene
        this.scene.add(this.group);
        
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
    
    update(deltaTime, camera) {
        // Skip updates if enemy is inactive or deltaTime is invalid
        if (this.state === 'dead' || !deltaTime || deltaTime > 1) {
            return;
        }
        
        // Store current position as potentially valid position before movement
        this.lastValidPosition.copy(this.group.position);
        
        // Update state time counter
        this.stateTime += deltaTime;
        if (this.stateCooldown > 0) {
            this.stateCooldown -= deltaTime;
        }
        
        // Decrease attack cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Decrease ranged attack cooldown
        if (this.rangedAttackCooldown > 0) {
            this.rangedAttackCooldown -= deltaTime;
        }
        
        // Update damage flash effect
        if (this.isDamaged) {
            this.damageFlashTime -= deltaTime;
            
            // Flash the enemy red
            if (this.bodyMesh && this.bodyMesh.material) {
                this.bodyMesh.material.emissive = new THREE.Color(0xff0000);
                this.bodyMesh.material.emissiveIntensity = Math.max(0, this.damageFlashTime * 5);
            }
            
            if (this.damageFlashTime <= 0) {
                this.isDamaged = false;
                // Reset emissive properties
                if (this.bodyMesh && this.bodyMesh.material) {
                    this.bodyMesh.material.emissive = new THREE.Color(0x330000);
                    this.bodyMesh.material.emissiveIntensity = 0.3; // Reset to original value
                }
            }
        }
        
        // Update invulnerability timer
        if (this.isInvulnerable) {
            this.invulnerabilityTime -= deltaTime;
            
            // Make the enemy flash by toggling visibility
            if (this.bodyMesh) {
                this.bodyMesh.visible = Math.floor(this.invulnerabilityTime * 10) % 2 === 0;
            }
            
            if (this.invulnerabilityTime <= 0) {
                this.isInvulnerable = false;
                // Ensure visibility is restored
                if (this.bodyMesh) {
                    this.bodyMesh.visible = true;
                }
            }
        }
        
        // Skip the rest of the update if enemy is dead
        if (this.state === 'dead') {
            return;
        }
        
        // Update ranged attack projectile if it exists
        if (this.rangedAttackProjectile && this.rangedAttackProjectile.active) {
            this.updateRangedProjectile(deltaTime);
        }
        
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
                
            case this.states.RANGED_ATTACK:
                this.executeRangedAttackBehavior(deltaTime);
                break;
        }
        
        // Rotate the body slightly to show it's active even if not moving
        this.bodyMesh.rotation.y += deltaTime * 1.0;
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
        
        // State transitions
        switch(this.state) {
            case this.states.PATROL:
            case this.states.IDLE:
            case this.states.RETURN:
                // If player is within detection range, transition to chase
                if (distanceToPlayer < this.detectionRange) {
                    this.changeState(this.states.CHASE);
                    this.playDetectionEffect();
                }
                break;
                
            case this.states.CHASE:
                // First check for ranged attack
                if (distanceToPlayer < this.rangedAttackRange && 
                    distanceToPlayer > this.attackRange && 
                    this.rangedAttackCooldown <= 0) {
                    this.changeState(this.states.RANGED_ATTACK);
                    this.performRangedAttack();
                }
                // Then check for melee attack if closer
                else if (distanceToPlayer < this.attackRange && this.attackCooldown <= 0) {
                    this.changeState(this.states.ATTACK);
                    this.performAttack();
                }
                // If player is beyond chase range, return to patrol
                else if (distanceToPlayer > this.chaseRange) {
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
    
    // Ranged attack state behavior
    executeRangedAttackBehavior(deltaTime) {
        // During ranged attack, keep facing the player but don't move
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
                
                // Use faster turning during ranged attack
                this.smoothLookAt(lookTarget, this.turnSpeed.chase * 1.5);
            }
        }
        
        // The actual ranged attack is handled by the performRangedAttack method
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
    
    // Perform a ranged attack (spear of light)
    performRangedAttack() {
        if (this.isRangedAttacking || !this.player) return; // Don't attack if already attacking
        
        this.isRangedAttacking = true;
        this.rangedAttackCooldown = this.rangedAttackCooldownTime;
        
        // Visual feedback - make eyes flash brighter during ranged attack
        if (this.leftEye && this.leftEye.material) {
            this.leftEye.material.emissiveIntensity = 2.5;
        }
        if (this.rightEye && this.rightEye.material) {
            this.rightEye.material.emissiveIntensity = 2.5;
        }
        
        // Create "charging" effect before launching projectile
        this.createRangedAttackChargingEffect();
        
        // Launch projectile after a short delay
        setTimeout(() => {
            this.launchRangedProjectile();
            
            // Reset attack state
            this.isRangedAttacking = false;
            
            // Reset eye glow
            if (this.leftEye && this.leftEye.material) {
                this.leftEye.material.emissiveIntensity = 1.0;
            }
            if (this.rightEye && this.rightEye.material) {
                this.rightEye.material.emissiveIntensity = 1.0;
            }
            
            // Return to chase state after attack
            this.changeState(this.states.CHASE);
        }, this.rangedAttackDuration * 1000);
    }
    
    // Create charging effect for ranged attack
    createRangedAttackChargingEffect() {
        if (!this.scene) return;
        
        // Get direction to player
        const directionToPlayer = new THREE.Vector3()
            .subVectors(this.lastKnownPlayerPos, this.group.position)
            .normalize();
        
        // Adjust direction to aim at player's eye level
        directionToPlayer.y = 0.5; // Aim slightly upward
        directionToPlayer.normalize();
        
        // Create a sphere for charging effect
        const chargeGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const chargeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffaa,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const chargeSphere = new THREE.Mesh(chargeGeometry, chargeMaterial);
        
        // Position the sphere in front of the enemy
        const chargePosition = this.group.position.clone();
        chargePosition.y += 1.5; // Position at eye level
        chargeSphere.position.copy(chargePosition);
        
        this.scene.add(chargeSphere);
        
        // Create a point light for the charge effect
        const chargeLight = new THREE.PointLight(0xffffaa, 1, 3);
        chargeLight.position.copy(chargePosition);
        this.scene.add(chargeLight);
        
        // Animate the charging effect
        const duration = this.rangedAttackDuration * 1000;
        const startTime = performance.now();
        
        const animateCharge = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Grow and pulse the sphere
            const size = 0.2 + progress * 0.4 + Math.sin(progress * Math.PI * 6) * 0.1;
            chargeSphere.scale.set(size, size, size);
            
            // Increase brightness as it charges
            chargeLight.intensity = 1 + progress * 3;
            
            // Make it spin faster as it charges
            chargeSphere.rotation.x += 0.05;
            chargeSphere.rotation.y += 0.08;
            
            // Update color to more intense as it charges
            const color = new THREE.Color().setHSL(0.12 - progress * 0.12, 1, 0.5 + progress * 0.5);
            chargeMaterial.color = color;
            chargeLight.color = color;
            
            if (progress < 1) {
                requestAnimationFrame(animateCharge);
            } else {
                // Remove the charging effect when done
                this.scene.remove(chargeSphere);
                this.scene.remove(chargeLight);
                
                // Clean up resources
                chargeMaterial.dispose();
                chargeGeometry.dispose();
            }
        };
        
        animateCharge();
        
        // Play charging sound
        this.playRangedAttackChargingSound();
    }
    
    // Launch the actual projectile
    launchRangedProjectile() {
        if (!this.scene || !this.player) return;
        
        // Get direction to player with slight prediction
        const playerPos = this.player.camera.position.clone();
        const directionToPlayer = new THREE.Vector3()
            .subVectors(playerPos, this.group.position)
            .normalize();
        
        // Create a spear-like projectile
        const projectileGroup = new THREE.Group();
        
        // Create spear shaft
        const shaftGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
        const shaftMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffaa,
            transparent: true,
            opacity: 0.9
        });
        
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.rotation.x = Math.PI / 2; // Rotate to point forward
        projectileGroup.add(shaft);
        
        // Create spear tip
        const tipGeometry = new THREE.ConeGeometry(0.15, 0.5, 8);
        const tipMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        
        const tip = new THREE.Mesh(tipGeometry, tipMaterial);
        tip.rotation.x = Math.PI / 2; // Rotate to point forward
        tip.position.z = -1.2; // Position at front of shaft
        projectileGroup.add(tip);
        
        // Add a point light for the glow effect
        const projectileLight = new THREE.PointLight(0xffffaa, 2, 4);
        projectileLight.position.set(0, 0, -1);
        projectileGroup.add(projectileLight);
        
        // Starting position (in front of enemy)
        const startPosition = this.group.position.clone();
        startPosition.y += 1.5; // At eye level
        
        // Move forward a bit to avoid self-collision
        const forwardOffset = directionToPlayer.clone().multiplyScalar(0.8);
        startPosition.add(forwardOffset);
        
        projectileGroup.position.copy(startPosition);
        
        // Make projectile face the direction of travel
        projectileGroup.lookAt(playerPos);
        
        // Add to scene
        this.scene.add(projectileGroup);
        
        // Create projectile data structure for tracking
        this.rangedAttackProjectile = {
            mesh: projectileGroup,
            direction: directionToPlayer.clone(),
            velocity: directionToPlayer.clone().multiplyScalar(this.rangedAttackSpeed),
            position: startPosition.clone(),
            active: true,
            lifeTime: 5, // Maximum life time in seconds
            currentLifeTime: 0,
            hasHitPlayer: false
        };
        
        // Play launch sound
        this.playRangedAttackLaunchSound();
    }
    
    // Update projectile position and check for collisions
    updateRangedProjectile(deltaTime) {
        if (!this.rangedAttackProjectile || !this.rangedAttackProjectile.active) return;
        
        const projectile = this.rangedAttackProjectile;
        
        // Update lifetime
        projectile.currentLifeTime += deltaTime;
        if (projectile.currentLifeTime >= projectile.lifeTime) {
            this.destroyRangedProjectile();
            return;
        }
        
        // Update position
        const movement = projectile.velocity.clone().multiplyScalar(deltaTime);
        projectile.position.add(movement);
        
        // Move the mesh
        if (projectile.mesh) {
            projectile.mesh.position.copy(projectile.position);
            
            // Add some rotation for visual interest
            projectile.mesh.rotateZ(deltaTime * 2);
        }
        
        // Check for collision with player
        if (!projectile.hasHitPlayer && this.player && this.player.camera) {
            const playerPos = this.player.camera.position;
            const distanceToPlayer = projectile.position.distanceTo(playerPos);
            
            // If close to player, check for hit
            if (distanceToPlayer < 1.2) { // Player hit radius
                // Player hit!
                console.log(`Ranged attack hit player for ${this.rangedAttackDamage} damage!`);
                
                // Apply damage
                if (this.player.damage) {
                    this.player.damage(this.rangedAttackDamage);
                }
                
                // Mark as hit and create impact effect
                projectile.hasHitPlayer = true;
                this.createRangedAttackImpactEffect(projectile.position.clone());
                
                // Destroy projectile
                this.destroyRangedProjectile();
                return;
            }
        }
        
        // Check for collision with environment using the collision manager
        if (this.collisionManager) {
            const collision = this.collisionManager.checkCollision(projectile.position, 0.2, true);
            
            // If hit environment (not enemy), destroy projectile
            if (collision.collides && !collision.isEnemy) {
                this.createRangedAttackImpactEffect(projectile.position.clone(), false);
                this.destroyRangedProjectile();
                return;
            }
        }
    }
    
    // Remove the projectile and clean up resources
    destroyRangedProjectile() {
        if (!this.rangedAttackProjectile) return;
        
        // Remove from scene
        if (this.rangedAttackProjectile.mesh) {
            this.scene.remove(this.rangedAttackProjectile.mesh);
            
            // Dispose of geometries and materials to free memory
            this.rangedAttackProjectile.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        
        // Clear projectile data
        this.rangedAttackProjectile.active = false;
        this.rangedAttackProjectile = null;
    }
    
    // Create impact effect for when projectile hits something
    createRangedAttackImpactEffect(position, hitPlayer = true) {
        // Create explosion geometry
        const explosionGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: hitPlayer ? 0xff6600 : 0xffffaa,
            transparent: true,
            opacity: 0.8
        });
        
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(position);
        this.scene.add(explosion);
        
        // Add an impact light
        const impactLight = new THREE.PointLight(
            hitPlayer ? 0xff6600 : 0xffffaa, 
            hitPlayer ? 3 : 1.5, 
            hitPlayer ? 5 : 3
        );
        impactLight.position.copy(position);
        this.scene.add(impactLight);
        
        // Animate the explosion
        const duration = 0.5; // 500ms
        const startTime = performance.now();
        
        const animateExplosion = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade out
            const scale = 1 + progress * (hitPlayer ? 5 : 3);
            explosion.scale.set(scale, scale, scale);
            
            // Fade out
            explosion.material.opacity = 0.8 * (1 - progress);
            impactLight.intensity = (hitPlayer ? 3 : 1.5) * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animateExplosion);
            } else {
                // Remove when animation completes
                this.scene.remove(explosion);
                this.scene.remove(impactLight);
                
                // Dispose resources
                explosion.geometry.dispose();
                explosion.material.dispose();
            }
        };
        
        animateExplosion();
        
        // Play sound
        if (hitPlayer) {
            this.playRangedAttackHitSound();
        } else {
            this.playRangedAttackMissSound();
        }
    }
    
    // Play charging sound for ranged attack
    playRangedAttackChargingSound() {
        try {
            const chargeSound = new Audio('sounds/ranged_charge.mp3');
            chargeSound.volume = 0.3;
            chargeSound.play().catch(err => console.log('Could not play ranged attack charging sound', err));
        } catch (e) {
            console.log('Error playing ranged attack charging sound', e);
        }
    }
    
    // Play launch sound for ranged attack
    playRangedAttackLaunchSound() {
        try {
            const launchSound = new Audio('sounds/ranged_launch.mp3');
            launchSound.volume = 0.4;
            launchSound.play().catch(err => console.log('Could not play ranged attack launch sound', err));
        } catch (e) {
            console.log('Error playing ranged attack launch sound', e);
        }
    }
    
    // Play hit sound for ranged attack
    playRangedAttackHitSound() {
        try {
            const hitSound = new Audio('sounds/ranged_hit.mp3');
            hitSound.volume = 0.5;
            hitSound.play().catch(err => console.log('Could not play ranged attack hit sound', err));
        } catch (e) {
            console.log('Error playing ranged attack hit sound', e);
        }
    }
    
    // Play miss sound for ranged attack
    playRangedAttackMissSound() {
        try {
            const missSound = new Audio('sounds/ranged_miss.mp3');
            missSound.volume = 0.2;
            missSound.play().catch(err => console.log('Could not play ranged attack miss sound', err));
        } catch (e) {
            console.log('Error playing ranged attack miss sound', e);
        }
    }
    
    // Take damage from player attacks
    takeDamage(amount) {
        // If enemy is invulnerable or already dead, ignore damage
        if (this.isInvulnerable || this.state === 'dead') {
            return false;
        }
        
        // Apply damage
        this.health = Math.max(0, this.health - amount);
        
        // Visual damage effect
        this.isDamaged = true;
        this.damageFlashTime = 0.2; // Flash duration in seconds
        
        // Make enemy briefly invulnerable to prevent multi-hits
        this.isInvulnerable = true;
        this.invulnerabilityTime = 0.5; // Invulnerability duration in seconds
        
        console.log(`Enemy took ${amount} damage, health: ${this.health}/${this.maxHealth}`);
        
        // Check for death
        if (this.health <= 0) {
            this.die();
            return true; // Enemy died
        }
        
        return false; // Enemy still alive
    }
    
    // Handle enemy death
    die() {
        if (this.state === 'dead') return; // Already dead
        
        console.log("Enemy died!");
        this.state = 'dead';
        
        // Destroy any active projectile
        if (this.rangedAttackProjectile) {
            this.destroyRangedProjectile();
        }
        
        // Simple death animation - shrink and fade out
        const startScale = this.group.scale.clone();
        const startPosition = this.group.position.clone();
        
        const duration = 1.0; // Death animation duration in seconds
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale down
            const scale = 1 - progress * 0.8;
            this.group.scale.set(scale, scale * 0.5, scale); // Flatten as it shrinks
            
            // Sink into ground
            this.group.position.y = startPosition.y - progress * 1.0;
            
            // Fade materials
            if (this.bodyMesh && this.bodyMesh.material) {
                this.bodyMesh.material.opacity = 1 - progress;
                this.bodyMesh.material.transparent = true;
            }
            
            if (this.leftEye && this.leftEye.material) {
                this.leftEye.material.opacity = 1 - progress;
                this.leftEye.material.transparent = true;
            }
            
            if (this.rightEye && this.rightEye.material) {
                this.rightEye.material.opacity = 1 - progress;
                this.rightEye.material.transparent = true;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // After death animation completes, remove from scene
                // Don't actually remove - just make invisible to avoid Three.js issues
                this.group.visible = false;
                
                // Disable collisions for this enemy
                this.collisionEnabled = false;
            }
        };
        
        animate();
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
            
            // Move forward slightly
            const newPosition = this.group.position.clone()
                .addScaledVector(directionToPlayer, 1.0 + progress * 0.5);
            newPosition.y = attackPosition.y;
            attackMesh.position.copy(newPosition);
            
            if (progress < 1) {
                requestAnimationFrame(animateAttack);
            } else {
                // Remove the attack mesh
                this.scene.remove(attackMesh);
                attackMesh.geometry.dispose();
                attackMesh.material.dispose();
            }
        };
        
        animateAttack();
        
        // Try to play attack sound
        this.playAttackSound();
    }
}
