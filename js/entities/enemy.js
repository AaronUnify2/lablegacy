export class Enemy {
    constructor(scene, position, collisionManager, player) {
        this.scene = scene;
        this.collisionManager = collisionManager;
        this.player = player;
        
        // Enemy stats
        this.health = 100;
        this.maxHealth = 100;
        this.damage = 10;
        this.attackCooldown = 0;
        this.attackRange = 2; // Distance at which enemy can attack
        this.detectionRange = 15; // Distance at which enemy can detect player
        this.moveSpeed = 2.5; // Units per second
        
        // Movement state
        this.velocity = new THREE.Vector3();
        this.position = position.clone();
        this.targetPosition = position.clone();
        this.isMoving = false;
        this.movementCooldown = 0;
        
        // Enemy state machine
        this.state = 'idle'; // idle, wandering, chasing, attacking, stunned, dead
        this.stateTime = 0;
        
        // Physical properties
        this.radius = 0.5; // Collision radius
        this.height = 1.8; // Enemy height
        
        // Create the enemy mesh
        this.createMesh();
        
        // Add to scene
        this.scene.add(this.group);
        
        // Add collision for the enemy
        this.colliderIndex = this.collisionManager.addCollider(this.bodyMesh);
    }
    
    createMesh() {
        // Create a group to hold all enemy parts
        this.group = new THREE.Group();
        
        // Create the enemy body
        const bodyGeometry = new THREE.CylinderGeometry(
            this.radius, // top radius
            this.radius, // bottom radius
            this.height, // height
            8, // radial segments
            1, // height segments
            false // open-ended
        );
        
        // Create material with a more sinister look
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x332222, // Dark reddish color
            roughness: 0.7,
            metalness: 0.2,
            emissive: 0x220000, // Subtle red glow
            emissiveIntensity: 0.2
        });
        
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.bodyMesh.position.y = this.height / 2; // Center vertically
        
        // Add to group
        this.group.add(this.bodyMesh);
        
        // Create the head
        const headGeometry = new THREE.SphereGeometry(this.radius * 0.8, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x332222,
            roughness: 0.5,
            metalness: 0.3,
            emissive: 0x220000,
            emissiveIntensity: 0.3
        });
        
        this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
        this.headMesh.position.y = this.height + this.radius * 0.2; // Position on top of body
        this.headMesh.castShadow = true;
        
        // Add to group
        this.group.add(this.headMesh);
        
        // Create glowing eyes
        this.createEyes();
        
        // Create health bar
        this.createHealthBar();
        
        // Position the entire group
        this.group.position.copy(this.position);
    }
    
    createEyes() {
        // Create glowing eyes
        const eyeGeometry = new THREE.SphereGeometry(this.radius * 0.15, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3300, // Bright red-orange
            transparent: true,
            opacity: 0.9
        });
        
        // Left eye
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-this.radius * 0.4, this.height + this.radius * 0.25, -this.radius * 0.6);
        this.group.add(this.leftEye);
        
        // Right eye
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(this.radius * 0.4, this.height + this.radius * 0.25, -this.radius * 0.6);
        this.group.add(this.rightEye);
        
        // Add point lights for eyes
        const eyeLight = new THREE.PointLight(0xff3300, 0.5, 3);
        eyeLight.position.set(0, this.height + this.radius * 0.25, -this.radius * 0.3);
        this.group.add(eyeLight);
    }
    
    createHealthBar() {
        // Create a health bar that will always face the camera
        const healthBarWidth = 1;
        const healthBarHeight = 0.1;
        
        // Background (black)
        const bgGeometry = new THREE.PlaneGeometry(healthBarWidth, healthBarHeight);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.6,
            depthTest: false
        });
        
        this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
        this.healthBarBg.position.y = this.height + this.radius + 0.3;
        this.group.add(this.healthBarBg);
        
        // Foreground (red)
        const fgGeometry = new THREE.PlaneGeometry(healthBarWidth, healthBarHeight);
        const fgMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
            depthTest: false
        });
        
        this.healthBarFg = new THREE.Mesh(fgGeometry, fgMaterial);
        this.healthBarFg.position.y = this.height + this.radius + 0.3;
        this.healthBarFg.position.z = 0.01; // Slightly in front of background
        this.group.add(this.healthBarFg);
        
        // Initially hide health bar
        this.healthBarBg.visible = false;
        this.healthBarFg.visible = false;
    }
    
    update(deltaTime, camera) {
        // Skip update if enemy is dead
        if (this.state === 'dead') return;
        
        // Update attack and movement cooldowns
        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
        this.movementCooldown = Math.max(0, this.movementCooldown - deltaTime);
        
        // Update state time
        this.stateTime += deltaTime;
        
        // Calculate distance to player
        const distanceToPlayer = this.position.distanceTo(this.player.camera.position);
        
        // Face the health bar towards the camera
        this.updateHealthBar(camera);
        
        // State machine
        switch (this.state) {
            case 'idle':
                this.handleIdleState(deltaTime, distanceToPlayer);
                break;
                
            case 'wandering':
                this.handleWanderingState(deltaTime, distanceToPlayer);
                break;
                
            case 'chasing':
                this.handleChasingState(deltaTime, distanceToPlayer);
                break;
                
            case 'attacking':
                this.handleAttackingState(deltaTime, distanceToPlayer);
                break;
                
            case 'stunned':
                this.handleStunnedState(deltaTime, distanceToPlayer);
                break;
        }
        
        // Apply movement with collision detection
        this.updatePosition(deltaTime);
        
        // Animate eyes (pulsing effect)
        this.animateEyes(deltaTime);
    }
    
    updateHealthBar(camera) {
        // Get camera direction
        const cameraDir = new THREE.Vector3(0, 0, -1);
        cameraDir.applyQuaternion(camera.quaternion);
        
        // Make health bar face the camera
        this.healthBarBg.lookAt(
            this.healthBarBg.position.x + cameraDir.x,
            this.healthBarBg.position.y + cameraDir.y,
            this.healthBarBg.position.z + cameraDir.z
        );
        
        this.healthBarFg.lookAt(
            this.healthBarFg.position.x + cameraDir.x,
            this.healthBarFg.position.y + cameraDir.y,
            this.healthBarFg.position.z + cameraDir.z
        );
        
        // Update health bar scale based on current health
        const healthPercent = this.health / this.maxHealth;
        this.healthBarFg.scale.x = healthPercent;
        
        // Offset the health bar to align left side
        const offset = (1 - healthPercent) * 0.5;
        this.healthBarFg.position.x = -offset;
        
        // Show health bar only when damaged or when player is close
        const distanceToPlayer = this.position.distanceTo(this.player.camera.position);
        if (this.health < this.maxHealth || distanceToPlayer < this.detectionRange / 2) {
            this.healthBarBg.visible = true;
            this.healthBarFg.visible = true;
        } else {
            this.healthBarBg.visible = false;
            this.healthBarFg.visible = false;
        }
    }
    
    animateEyes(deltaTime) {
        // Pulsing glow effect for eyes
        const time = performance.now() * 0.001;
        const pulseIntensity = 0.7 + 0.3 * Math.sin(time * 2);
        
        if (this.leftEye.material) {
            this.leftEye.material.opacity = pulseIntensity * 0.9;
        }
        
        if (this.rightEye.material) {
            this.rightEye.material.opacity = pulseIntensity * 0.9;
        }
        
        // If in chasing or attacking state, make eyes pulse faster and brighter
        if (this.state === 'chasing' || this.state === 'attacking') {
            const aggroPulse = 0.8 + 0.4 * Math.sin(time * 5);
            
            if (this.leftEye.material) {
                this.leftEye.material.opacity = aggroPulse;
            }
            
            if (this.rightEye.material) {
                this.rightEye.material.opacity = aggroPulse;
            }
        }
    }
    
    handleIdleState(deltaTime, distanceToPlayer) {
        // Check if player is in detection range
        if (distanceToPlayer <= this.detectionRange) {
            // Check if we have line of sight to the player
            if (this.hasLineOfSightToPlayer()) {
                this.state = 'chasing';
                this.stateTime = 0;
                return;
            }
        }
        
        // Randomly decide to start wandering
        if (this.stateTime > 3 && Math.random() < deltaTime * 0.5) {
            this.state = 'wandering';
            this.stateTime = 0;
            
            // Choose a random target position nearby
            this.chooseRandomTargetPosition();
        }
    }
    
    handleWanderingState(deltaTime, distanceToPlayer) {
        // Check if player is in detection range
        if (distanceToPlayer <= this.detectionRange) {
            // Check if we have line of sight to the player
            if (this.hasLineOfSightToPlayer()) {
                this.state = 'chasing';
                this.stateTime = 0;
                return;
            }
        }
        
        // Move towards target position
        this.moveTowardsTarget(deltaTime, this.moveSpeed * 0.5);
        
        // Check if we've reached the target or been wandering too long
        const distanceToTarget = this.position.distanceTo(this.targetPosition);
        if (distanceToTarget < 0.5 || this.stateTime > 10) {
            this.state = 'idle';
            this.stateTime = 0;
        }
    }
    
    handleChasingState(deltaTime, distanceToPlayer) {
        // If player is too far, go back to idle
        if (distanceToPlayer > this.detectionRange * 1.5) {
            this.state = 'idle';
            this.stateTime = 0;
            return;
        }
        
        // If player is in attack range, start attacking
        if (distanceToPlayer <= this.attackRange) {
            this.state = 'attacking';
            this.stateTime = 0;
            this.attackCooldown = 0; // Allow immediate first attack
            return;
        }
        
        // Set target to player position and move towards it
        this.targetPosition.copy(this.player.camera.position);
        
        // Move towards player
        this.moveTowardsTarget(deltaTime, this.moveSpeed);
        
        // Periodically check if we still have line of sight
        if (this.stateTime > 1) {
            this.stateTime = 0;
            if (!this.hasLineOfSightToPlayer()) {
                // Lost sight of player, continue to last known position
                this.targetPosition.copy(this.player.camera.position);
            }
        }
    }
    
    handleAttackingState(deltaTime, distanceToPlayer) {
        // If player is out of attack range, go back to chasing
        if (distanceToPlayer > this.attackRange) {
            this.state = 'chasing';
            this.stateTime = 0;
            return;
        }
        
        // Perform attack if cooldown is over
        if (this.attackCooldown <= 0) {
            this.attackPlayer();
            this.attackCooldown = 1.5; // Set cooldown between attacks
        }
        
        // Face the player
        this.faceTarget(this.player.camera.position);
    }
    
    handleStunnedState(deltaTime, distanceToPlayer) {
        // Do nothing while stunned, just wait for stun time to expire
        if (this.stateTime >= 2) {
            // If player is close, go to chasing, otherwise go to idle
            if (distanceToPlayer <= this.detectionRange) {
                this.state = 'chasing';
            } else {
                this.state = 'idle';
            }
            this.stateTime = 0;
        }
    }
    
    moveTowardsTarget(deltaTime, speed) {
        // Calculate direction to target
        const direction = new THREE.Vector3();
        direction.subVectors(this.targetPosition, this.position).normalize();
        
        // Set velocity based on direction and speed
        this.velocity.x = direction.x * speed;
        this.velocity.z = direction.z * speed;
        
        // Don't modify vertical velocity - that's handled by gravity
        
        // Face the direction we're moving
        if (direction.length() > 0.1) {
            this.faceTarget(new THREE.Vector3(
                this.position.x + direction.x,
                this.position.y,
                this.position.z + direction.z
            ));
        }
    }
    
    faceTarget(target) {
        // Calculate direction to target on the horizontal plane
        const direction = new THREE.Vector3();
        direction.subVectors(target, this.position).normalize();
        direction.y = 0; // Keep on horizontal plane
        
        // If direction is negligible, don't rotate
        if (direction.length() < 0.1) return;
        
        // Set the rotation to face the direction
        const angle = Math.atan2(direction.x, direction.z);
        this.group.rotation.y = angle;
    }
    
    updatePosition(deltaTime) {
        // Apply gravity
        this.velocity.y -= 9.8 * deltaTime;
        
        // Calculate new position
        const newPosition = this.position.clone();
        newPosition.x += this.velocity.x * deltaTime;
        newPosition.y += this.velocity.y * deltaTime;
        newPosition.z += this.velocity.z * deltaTime;
        
        // Check for collisions
        const playerCollisionRadius = 0.5; // Avoid getting too close to player
        const playerPosition = this.player.camera.position.clone();
        playerPosition.y -= this.player.eyeLevel; // Adjust for eye height
        
        // Check if new position collides with player
        const playerDistance = newPosition.distanceTo(playerPosition);
        if (playerDistance < this.radius + playerCollisionRadius) {
            // Resolve collision by moving away from player
            const awayDirection = new THREE.Vector3();
            awayDirection.subVectors(newPosition, playerPosition).normalize();
            newPosition.copy(playerPosition).addScaledVector(
                awayDirection, 
                this.radius + playerCollisionRadius + 0.1
            );
        }
        
        // Check for collisions with environment
        const collisionResult = this.collisionManager.checkCollision(newPosition, this.radius);
        
        if (collisionResult.collides) {
            // Resolve collision using the collision manager
            newPosition.copy(
                this.collisionManager.resolveCollision(
                    newPosition, 
                    this.position, 
                    this.radius
                )
            );
            
            // Stop velocity in collision direction
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
        
        // Update position
        this.position.copy(newPosition);
        this.group.position.copy(this.position);
        
        // Update collider position
        this.collisionManager.updateCollider(this.colliderIndex);
        
        // Check if we're on the ground
        const groundCheck = this.position.clone();
        groundCheck.y -= 0.1;
        const groundCollision = this.collisionManager.checkCollision(groundCheck, this.radius);
        
        if (groundCollision.collides) {
            // We're on the ground, stop falling
            this.velocity.y = 0;
            
            // Set precise height
            if (groundCollision.collider) {
                const groundY = groundCollision.collider.box.max.y;
                this.position.y = groundY + 0.001; // Slightly above ground
                this.group.position.y = this.position.y;
            }
        }
    }
    
    chooseRandomTargetPosition() {
        // Choose a random target position near the current position
        const angle = Math.random() * Math.PI * 2;
        const distance = 5 + Math.random() * 5; // 5-10 units away
        
        this.targetPosition.set(
            this.position.x + Math.cos(angle) * distance,
            this.position.y,
            this.position.z + Math.sin(angle) * distance
        );
    }
    
    hasLineOfSightToPlayer() {
        // Check if we have a clear line of sight to the player
        const direction = new THREE.Vector3();
        const playerPos = this.player.camera.position.clone();
        playerPos.y -= this.player.height / 2; // Aim for player torso, not eyes
        
        direction.subVectors(playerPos, this.position).normalize();
        
        // Use the collision manager's raycast function
        const hit = this.collisionManager.raycast(
            this.position.clone().add(new THREE.Vector3(0, this.height / 2, 0)), // Start at enemy's head
            direction,
            this.detectionRange
        );
        
        // If there's no hit, or the hit is the player, we have line of sight
        if (!hit) return true;
        
        // Check the distance to the hit vs distance to player
        const distanceToHit = hit.distance;
        const distanceToPlayer = this.position.distanceTo(playerPos);
        
        // If the hit is further than the player, or within a small margin, we have line of sight
        return distanceToHit >= distanceToPlayer - 0.5;
    }
    
    attackPlayer() {
        // Calculate distance to player
        const distanceToPlayer = this.position.distanceTo(this.player.camera.position);
        
        // Only damage player if in range
        if (distanceToPlayer <= this.attackRange) {
            // Deal damage to player
            if (this.player.damage) {
                this.player.damage(this.damage);
            }
            
            // Visual feedback for attack
            this.performAttackAnimation();
        }
    }
    
    performAttackAnimation() {
        // Quick scale animation for attack
        const originalScale = this.bodyMesh.scale.clone();
        
        // Scale up quickly
        this.bodyMesh.scale.set(1.2, 0.9, 1.2);
        
        // Then return to original scale
        setTimeout(() => {
            if (this.bodyMesh) {
                this.bodyMesh.scale.copy(originalScale);
            }
        }, 200);
    }
    
    takeDamage(amount) {
        // Reduce health
        this.health = Math.max(0, this.health - amount);
        
        // Visual feedback for taking damage
        this.bodyMesh.material.emissive.setHex(0x550000);
        this.bodyMesh.material.emissiveIntensity = 0.5;
        
        // Reset emissive after a short time
        setTimeout(() => {
            if (this.bodyMesh && this.bodyMesh.material) {
                this.bodyMesh.material.emissive.setHex(0x220000);
                this.bodyMesh.material.emissiveIntensity = 0.2;
            }
        }, 200);
        
        // Check if we're dead
        if (this.health <= 0) {
            this.die();
        } else {
            // Enter stunned state when hit
            this.state = 'stunned';
            this.stateTime = 0;
        }
    }
    
    die() {
        // Set state to dead
        this.state = 'dead';
        
        // Play death animation
        this.playDeathAnimation();
        
        // Remove collider
        this.collisionManager.removeCollider(this.colliderIndex);
    }
    
    playDeathAnimation() {
        // Fade out and sink into the ground
        const duration = 2000; // 2 seconds
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Sink into ground
            this.group.position.y = this.position.y - (this.height * progress);
            
            // Fade out
            if (this.bodyMesh && this.bodyMesh.material) {
                this.bodyMesh.material.opacity = 1 - progress;
                this.bodyMesh.material.transparent = true;
            }
            
            if (this.headMesh && this.headMesh.material) {
                this.headMesh.material.opacity = 1 - progress;
                this.headMesh.material.transparent = true;
            }
            
            if (this.leftEye && this.leftEye.material) {
                this.leftEye.material.opacity = (1 - progress) * 0.9;
            }
            
            if (this.rightEye && this.rightEye.material) {
                this.rightEye.material.opacity = (1 - progress) * 0.9;
            }
            
            // Hide health bar immediately
            if (this.healthBarBg) this.healthBarBg.visible = false;
            if (this.healthBarFg) this.healthBarFg.visible = false;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove from scene when animation is complete
                if (this.group && this.scene) {
                    this.scene.remove(this.group);
                }
            }
        };
        
        animate();
    }
}
