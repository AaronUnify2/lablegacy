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
            ATTACK: 'attack' // Add attack state
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
        
        // NEW: Mana drop properties
        this.manaDrop = {
            min: 20,
            max: 50,
            dropped: false
        };
        
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
        this.rangedAttackRange = 15; // Distance at which enemy can use ranged attack
        this.rangedAttackCooldown = 0; // Current cooldown timer
        this.rangedAttackCooldownTime = 3; // Time between ranged attacks in seconds
        this.rangedAttackDamage = 10; // Damage per ranged attack
        this.rangedAttackSpeed = 5; // Speed of projectile
        this.useRangedAttack = true; // Flag to enable/disable ranged attacks
        this.projectiles = []; // Array to store active projectiles
        
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
        
        // Decrease attack cooldown
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
        }
        
        // Rotate the body slightly to show it's active even if not moving
        this.bodyMesh.rotation.y += deltaTime * 1.0;
        
        // Update projectiles
        const projectilesToRemove = [];
        for (let i = 0; i < this.projectiles.length; i++) {
            const projectile = this.projectiles[i];
            
            // Update projectile position
            projectile.position.add(projectile.velocity);
            projectile.mesh.position.copy(projectile.position);
            
            // Check for collisions with player
            if (this.player && this.player.camera) {
                const playerPos = this.player.camera.position;
                const distance = projectile.position.distanceTo(playerPos);
                
                // If projectile hits player (using a simple radius check)
                if (distance < 1.0) {
                    // Call player damage function
                    if (this.player.damage) {
                        this.player.damage(this.rangedAttackDamage);
                        console.log(`Projectile hit player for ${this.rangedAttackDamage} damage!`);
                    }
                    
                    // Remove projectile
                    this.scene.remove(projectile.mesh);
                    projectilesToRemove.push(i);
                    
                    // Create hit effect
                    this.createProjectileHitEffect(projectile.position);
                    continue;
                }
            }
            
            // Check for environment collisions
            if (this.collisionManager) {
                const collision = this.collisionManager.checkCollision(projectile.position, 0.3);
                if (collision.collides && (!collision.collider || !collision.collider.isEnemy)) {
                    // Hit environment, remove projectile
                    this.scene.remove(projectile.mesh);
                    projectilesToRemove.push(i);
                    
                    // Create hit effect
                    this.createProjectileHitEffect(projectile.position);
                    continue;
                }
            }
            
            // Check for lifetime
            projectile.lifetime -= deltaTime;
            if (projectile.lifetime <= 0) {
                this.scene.remove(projectile.mesh);
                projectilesToRemove.push(i);
                continue;
            }
            
            // Update visual effect (pulsing)
            const pulse = Math.sin(performance.now() * 0.01) * 0.2 + 0.8;
            projectile.mesh.scale.set(pulse, pulse, pulse);
        }
        
        // Remove projectiles marked for deletion (in reverse order to avoid index problems)
        for (let i = projectilesToRemove.length - 1; i >= 0; i--) {
            this.projectiles.splice(projectilesToRemove[i], 1);
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
        
        // Check if player is in ranged attack range but outside melee range
        if (this.useRangedAttack && 
            distanceToPlayer < this.rangedAttackRange && 
            distanceToPlayer > this.attackRange + 3 && // Keep some distance from melee range
            this.rangedAttackCooldown <= 0) {
            
            // Only use ranged attack in chase state
            if (this.state === this.states.CHASE) {
                this.performRangedAttack();
            }
        }
        
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
    
    // Perform a ranged attack - shoots a projectile at the player
    performRangedAttack() {
        if (!this.player || this.rangedAttackCooldown > 0) return;

        // Set cooldown
        this.rangedAttackCooldown = this.rangedAttackCooldownTime;
        
        // Get direction to player
        const playerPos = this.player.camera.position;
        const direction = new THREE.Vector3()
            .subVectors(playerPos, this.group.position)
            .normalize();
        
        // Slightly adjust aim for difficulty balance (less perfect aim)
        const aimError = 0.2; // Higher values = less accurate
        direction.x += (Math.random() - 0.5) * aimError;
        direction.z += (Math.random() - 0.5) * aimError;
        direction.normalize();
        
        // Create projectile mesh
        const projectileGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const projectileMaterial = new THREE.MeshBasicMaterial({
            color: 0x33ff33, // Green energy
            transparent: true,
            opacity: 0.8
        });
        
        const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
        
        // Position at enemy "hands" level - FIX 1: Use direction vector to spawn in front
        const spawnPos = this.group.position.clone();
        spawnPos.y += 1.2; // Roughly at the "chest" level of the enemy
        
        // Offset the spawn position to be in front of the enemy based on its facing direction
        // The enemy is already facing the player during chase, so we can use the direction vector
        spawnPos.add(direction.clone().multiplyScalar(0.8)); // Spawn 0.8 units in front of the enemy
        
        projectileMesh.position.copy(spawnPos);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x33ff33,
            transparent: true,
            opacity: 0.4,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        projectileMesh.add(glowMesh);
        
        // Add to scene
        this.scene.add(projectileMesh);
        
        // Calculate where the player will be after some time (prediction)
        // This helps the projectile lead the player a bit if they're moving
        const playerVelocity = this.player.velocity || new THREE.Vector3(0, 0, 0);
        const predictionTime = 0.5; // Predict where player will be in 0.5 seconds
        const predictedPlayerPos = playerPos.clone().add(
            playerVelocity.clone().multiplyScalar(predictionTime)
        );
        
        // Calculate direction to the predicted position
        const predictedDirection = new THREE.Vector3()
            .subVectors(predictedPlayerPos, spawnPos)
            .normalize();
        
        // FIX 2: Calculate velocity based on distance to make projectile take ~2.5 seconds to reach player
        const distanceToPlayer = spawnPos.distanceTo(playerPos);
        const projectileSpeed = Math.max(distanceToPlayer / 2.5, 3); // At least 3 units per second, adjusted for distance
        
        // Create projectile data
        const projectile = {
            mesh: projectileMesh,
            position: spawnPos.clone(),
            velocity: predictedDirection.multiplyScalar(projectileSpeed * 0.016), // Scale for 60fps (0.016s per frame)
            lifetime: 5.0 // Increased lifetime to 5 seconds
        };
        
        // Add to projectiles array
        this.projectiles.push(projectile);
        
        // Create firing effect
        this.createProjectileFiringEffect(spawnPos);
        
        // Eye flash effect
        if (this.leftEye && this.leftEye.material) {
            this.leftEye.material.color.set(0x33ff33); // Green flash
            this.leftEye.material.emissiveIntensity = 2.0;
            
            // Reset after a short delay
            setTimeout(() => {
                if (this.leftEye && this.leftEye.material) {
                    this.leftEye.material.color.set(0xffff00);
                    this.leftEye.material.emissiveIntensity = 1.0;
                }
            }, 200);
        }
        
        if (this.rightEye && this.rightEye.material) {
            this.rightEye.material.color.set(0x33ff33); // Green flash
            this.rightEye.material.emissiveIntensity = 2.0;
            
            // Reset after a short delay
            setTimeout(() => {
                if (this.rightEye && this.rightEye.material) {
                    this.rightEye.material.color.set(0xffff00);
                    this.rightEye.material.emissiveIntensity = 1.0;
                }
            }, 200);
        }
        
        // Play ranged attack sound
        this.playRangedAttackSound();
        
        console.log("Enemy fired ranged attack!");
    }
    
    // Create visual effect for firing projectile
    createProjectileFiringEffect(position) {
        // Create a flash effect at the firing position
        const flashGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x33ff33,
            transparent: true,
            opacity: 0.8
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Animate the flash
        const duration = 0.3; // 300ms
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade out
            const scale = 1 + progress * 2;
            flash.scale.set(scale, scale, scale);
            flash.material.opacity = 0.8 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove after animation completes
                this.scene.remove(flash);
                if (flash.material) flash.material.dispose();
                if (flash.geometry) flash.geometry.dispose();
            }
        };
        
        animate();
    }
    
    // Create effect for projectile hitting something
    createProjectileHitEffect(position) {
        // Create burst effect at hit location
        const burstGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const burstMaterial = new THREE.MeshBasicMaterial({
            color: 0x33ff33,
            transparent: true,
            opacity: 0.8
        });
        
        const burst = new THREE.Mesh(burstGeometry, burstMaterial);
        burst.position.copy(position);
        this.scene.add(burst);
        
        // Create particles for the hit effect
        const particles = [];
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            // Create small particle spheres
            const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0x33ff33,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Random direction for particle
            const angle = Math.random() * Math.PI * 2;
            const height = Math.random() * Math.PI - Math.PI/2;
            const speed = 0.05 + Math.random() * 0.1;
            
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(height) * speed,
                Math.sin(height) * speed,
                Math.sin(angle) * Math.cos(height) * speed
            );
            
            this.scene.add(particle);
            particles.push(particle);
        }

        // Animate the burst and particles
        const duration = 0.5; // 500ms
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade burst
            const scale = 1 + progress * 3;
            burst.scale.set(scale, scale, scale);
            burst.material.opacity = 0.8 * (1 - progress);
            
            // Move and fade particles
            for (const particle of particles) {
                particle.position.add(particle.velocity);
                
                // Add gravity effect
                particle.velocity.y -= 0.002;
                
                // Fade out
                particle.material.opacity = 0.8 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Clean up meshes
                this.scene.remove(burst);
                if (burst.material) burst.material.dispose();
                if (burst.geometry) burst.geometry.dispose();
                
                for (const particle of particles) {
                    this.scene.remove(particle);
                    if (particle.material) particle.material.dispose();
                    if (particle.geometry) particle.geometry.dispose();
                }
            }
        };
        
        animate();
    }
    
    // Play ranged attack sound
    playRangedAttackSound() {
        try {
            const attackSound = new Audio('sounds/enemy_ranged_attack.mp3');
            attackSound.volume = 0.3;
            attackSound.play().catch(err => console.log('Could not play ranged attack sound', err));
        } catch (e) {
            console.log('Error playing ranged attack sound', e);
        }
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
        
        // Rotate cylinder to point in the right direction
        attackGeometry.rotateX(Math.PI / 2);
        
        // Create material with glow
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
    
    // Play an attack sound
    playAttackSound() {
        try {
            const attackSound = new Audio('sounds/enemy_attack.mp3');
            attackSound.volume = 0.3;
            attackSound.play().catch(err => console.log('Could not play attack sound', err));
        } catch (e) {
            console.log('Error playing attack sound', e);
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
        
        // Clean up projectiles
        this.cleanupProjectiles();
        
        // Drop mana orb if not already dropped
        if (!this.manaDrop.dropped) {
            this.dropManaOrb();
            this.manaDrop.dropped = true;
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
    
    // NEW METHOD: Drop mana orb when enemy dies
    dropManaOrb() {
        // Calculate random mana amount to drop
        const manaAmount = Math.floor(Math.random() * 
            (this.manaDrop.max - this.manaDrop.min + 1)) + this.manaDrop.min;
        
        // Create mana orb mesh
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
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.6, 12, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
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
        
        // Add animation for the orb
        this.animateManaOrb(orbMesh);
        
        console.log(`Dropped mana orb containing ${manaAmount} mana`);
    }
    
    // NEW METHOD: Animate mana orb
    animateManaOrb(orbMesh) {
        // Make the orb bob up and down
        const startY = orbMesh.position.y;
        const floatHeight = 0.3;
        const floatSpeed = 1.5;
        
        // Make orb pulse
        const pulseSpeed = 2;
        
        // If we already have an animation system, use it
        if (!window.animatedOrbs) {
            window.animatedOrbs = [];
            
            const animateOrbs = () => {
                const orbs = window.animatedOrbs;
                if (orbs && orbs.length > 0) {
                    const time = performance.now() * 0.001;
                    
                    for (const orb of orbs) {
                        // Bob up and down
                        orb.position.y = orb.userData.startY + 
                            Math.sin(time * orb.userData.floatSpeed) * orb.userData.floatHeight;
                        
                        // Rotate slowly
                        orb.rotation.y += 0.01;
                        
                        // Pulse glow
                        if (orb.children && orb.children[0]) {
                            const glow = orb.children[0];
                            const pulseScale = 1 + Math.sin(time * orb.userData.pulseSpeed) * 0.2;
                            glow.scale.set(pulseScale, pulseScale, pulseScale);
                        }
                        
                        // Pulse light
                        if (orb.children && orb.children[1]) {
                            const light = orb.children[1];
                            light.intensity = 1 + Math.sin(time * orb.userData.pulseSpeed) * 0.5;
                        }
                    }
                }
                
                requestAnimationFrame(animateOrbs);
            };
            
            animateOrbs();
        }
        
        // Store animation parameters with the orb
        orbMesh.userData.startY = startY;
        orbMesh.userData.floatHeight = floatHeight;
        orbMesh.userData.floatSpeed = floatSpeed;
        orbMesh.userData.pulseSpeed = pulseSpeed;
        
        // Add to animated orbs
        window.animatedOrbs.push(orbMesh);
    }
    
    // Clean up projectiles when enemy is removed or killed
    cleanupProjectiles() {
        // Remove all projectiles from the scene
        for (const projectile of this.projectiles) {
            if (projectile.mesh) {
                this.scene.remove(projectile.mesh);
                if (projectile.mesh.material) projectile.mesh.material.dispose();
                if (projectile.mesh.geometry) projectile.mesh.geometry.dispose();
            }
        }
        
        // Clear projectiles array
        this.projectiles = [];
    }
    
    // Move with collision prevention
    moveWithCollisionCheck(newPosition) {
        if (!this.collisionEnabled || !this.collisionManager) {
            // If collision is disabled, just move
            this.group.position.copy(newPosition);
            return true;
        }
        
        // Check for environmental collisions
        const collision = this.collisionManager.checkCollision(newPosition, this.collisionRadius);
            
        // Only consider environmental collisions, not other enemies
        const isEnvironmentCollision = collision.collides && collision.collider && !collision.collider.isEnemy;
            
        if (isEnvironmentCollision) {
            // Skip moving to this position
            if (Math.random() < 0.05) { // Log occasionally to avoid spam
                console.log("Enemy collision detected, can't move to new position");
            }
            return false;
        }
            
        // Also check for ground
        const groundCheck = new THREE.Vector3(newPosition.x, newPosition.y - 1, newPosition.z);
        const groundHit = this.collisionManager.findFloorBelow(groundCheck, 2);
            
        if (!groundHit) {
            // No ground beneath, skip moving
            if (Math.random() < 0.05) {
                console.log("No ground beneath enemy, can't move to new position");
            }
            return false;
        }
            
        // No collision, update position
        this.group.position.copy(newPosition);
        return true;
    }
    
    // Smoothly rotate to face a target
    smoothLookAt(target, speed) {
        // Create a quaternion for current rotation
        const currentRotation = new THREE.Quaternion().copy(this.group.quaternion);
        
        // Create a quaternion for target rotation
        const targetRotation = new THREE.Quaternion();
        
        // Create a temporary object to get the target rotation
        const tempObj = new THREE.Object3D();
        tempObj.position.copy(this.group.position);
        tempObj.lookAt(target);
        targetRotation.copy(tempObj.quaternion);
        
        // Smoothly interpolate between current and target rotation
        this.group.quaternion.slerp(targetRotation, speed);
        
        // Normalize to prevent accumulation errors
        this.group.quaternion.normalize();
    }
    
    // Update eye appearance based on state and player distance
    updateEyeAppearance(distanceToPlayer) {
        // Base color for eyes
        let eyeColor;
        let intensity = 0;
        
        // Set color based on state
        switch(this.state) {
            case this.states.CHASE:
                eyeColor = 0xff0000; // Red when chasing
                intensity = 1.0;
                break;
                
            case this.states.PATROL:
                eyeColor = 0xffff00; // Yellow during patrol
                intensity = 0.7;
                break;
                
            case this.states.RETURN:
                eyeColor = 0xff8800; // Orange when returning
                intensity = 0.8;
                break;
                
            case this.states.IDLE:
                eyeColor = 0x88ff88; // Green when idle
                intensity = 0.5;
                break;
                
            case this.states.ATTACK:
                eyeColor = 0xff0000; // Bright red when attacking
                intensity = 1.5;
                break;
        }
        
        // If player is close, increase intensity
        if (distanceToPlayer < this.detectionRange * 1.5) {
            intensity = Math.min(1.0, intensity + (1.0 - distanceToPlayer / this.detectionRange) * 0.5);
        }
        
        // Update eye materials
        if (this.leftEye && this.leftEye.material) {
            this.leftEye.material.color.set(eyeColor);
            this.leftEye.material.emissiveIntensity = intensity;
        }
        
        if (this.rightEye && this.rightEye.material) {
            this.rightEye.material.color.set(eyeColor);
            this.rightEye.material.emissiveIntensity = intensity;
        }
    }
    
    // Play effect when detecting player
    playDetectionEffect() {
        // Make eyes flash brightly
        if (this.leftEye && this.leftEye.material) {
            const originalColor = this.leftEye.material.color.clone();
            this.leftEye.material.color.set(0xff0000);
            
            // Reset after a short delay
            setTimeout(() => {
                if (this.leftEye && this.leftEye.material) {
                    this.leftEye.material.color.copy(originalColor);
                }
            }, 200);
        }
        
        if (this.rightEye && this.rightEye.material) {
            const originalColor = this.rightEye.material.color.clone();
            this.rightEye.material.color.set(0xff0000);
            
            // Reset after a short delay
            setTimeout(() => {
                if (this.rightEye && this.rightEye.material) {
                    this.rightEye.material.color.copy(originalColor);
                }
            }, 200);
        }
        
        // Play alert sound (if available)
        if (this.scene && typeof Audio !== 'undefined') {
            try {
                const alertSound = new Audio('sounds/enemy_alert.mp3');
                alertSound.volume = 0.3;
                alertSound.play().catch(err => console.log('Could not play alert sound', err));
            } catch (e) {
                console.log('Error playing sound', e);
            }
        }
    }
    
    // Reset position if stuck or in an invalid location
    resetToLastValidPosition() {
        if (this.lastValidPosition) {
            this.group.position.copy(this.lastValidPosition);
            console.log("Enemy reset to last valid position");
        }
    }
    
    // Change patrol radius or speed
    setPatrolParameters(radius, speed) {
        if (radius !== undefined) {
            this.patrolRadius = radius;
        }
        
        if (speed !== undefined) {
            this.moveSpeed.patrol = speed;
            if (this.state !== this.states.CHASE) {
                this.patrolSpeed = speed;
            }
        }
    }
    
    // Set a new patrol center
    setPatrolCenter(newCenter) {
        if (newCenter) {
            this.patrolCenter.copy(newCenter);
        }
    }
}
