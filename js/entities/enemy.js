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
