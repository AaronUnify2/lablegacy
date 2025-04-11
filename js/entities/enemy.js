export class Enemy {
    constructor(scene, position, collisionManager, player) {
        this.scene = scene;
        this.position = position.clone();
        this.state = 'idle'; // Changed to 'idle' from 'dead' to make enemies active
        this.collisionManager = collisionManager; // Store reference to collision manager
        this.player = player;
        
        // Add patrol properties
        this.patrolRadius = 3; // Radius of patrol circle in world units
        this.patrolSpeed = 0.5; // Speed of patrol movement (slow and steady)
        this.patrolAngle = 0; // Current angle in the patrol circle
        this.patrolCenter = position.clone(); // Center of patrol circle
        this.patrolActive = true; // Flag to enable/disable patrol
        
        // Collision properties
        this.collisionRadius = 0.5; // Enemy collision radius
        this.collisionEnabled = true; // Flag to enable/disable collision
        this.lastValidPosition = position.clone(); // Store last valid position
        
        // Height properties
        this.bodyHeight = 1.8; // Height of the enemy body
        this.groundOffset = 0; // Offset from the ground (will be set to 0)
        
        // Create a simple mesh for the enemy
        this.createMesh();
        
        // Ensure enemy is placed on the ground
        this.ensureOnGround();
        
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
            this.bodyHeight, // height
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
        // Position the mesh so its bottom is at y=0 of the group
        this.bodyMesh.position.y = this.bodyHeight / 2;
        
        // Save body dimensions for collision detection
        this.bodyWidth = 1.0; // Diameter
        
        // Add body to group
        this.group.add(this.bodyMesh);
        
        // Add simple eyes - to check if we can see the enemy
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00 // Bright yellow eyes
        });
        
        // Left eye - position relative to body height
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.2, this.bodyHeight * 0.85, -0.3);
        this.group.add(this.leftEye);
        
        // Right eye - position relative to body height
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.2, this.bodyHeight * 0.85, -0.3);
        this.group.add(this.rightEye);
        
        // Position the entire group at the initial position
        this.group.position.copy(this.position);
    }
    
    // Make sure enemy is properly placed on the ground
    ensureOnGround() {
        if (!this.collisionManager) return;
        
        // Create a ray starting from slightly above current position
        const rayStart = new THREE.Vector3(
            this.group.position.x,
            this.group.position.y + 2, // Start above current position to avoid self-intersection
            this.group.position.z
        );
        
        // Cast ray downward
        const floorHit = this.collisionManager.findFloorBelow(rayStart, 10);
        
        if (floorHit && floorHit.point) {
            // Position exactly on the ground (no offset)
            this.group.position.y = floorHit.point.y;
            // Store this as a valid position
            this.lastValidPosition.copy(this.group.position);
            this.patrolCenter.y = floorHit.point.y;
            
            console.log("Enemy placed on ground at Y:", floorHit.point.y);
        } else {
            console.warn("Could not find floor beneath enemy!");
        }
    }
    
    update(deltaTime, camera) {
        // Skip updates if enemy is inactive or deltaTime is invalid
        if (this.state === 'dead' || !deltaTime || deltaTime > 1) {
            return;
        }
        
        // Store current position as potentially valid position before movement
        this.lastValidPosition.copy(this.group.position);
        
        // Patrol in a circle if active
        if (this.patrolActive) {
            // Calculate new position on the circle
            this.patrolAngle += this.patrolSpeed * deltaTime;
            
            // Calculate new x and z positions (keeping y the same)
            const newX = this.patrolCenter.x + Math.cos(this.patrolAngle) * this.patrolRadius;
            const newZ = this.patrolCenter.z + Math.sin(this.patrolAngle) * this.patrolRadius;
            
            // Create a potential new position - maintaining current Y value
            const newPosition = new THREE.Vector3(
                newX,
                this.group.position.y,
                newZ
            );
            
            // Check for collisions before moving
            if (this.collisionEnabled && this.collisionManager) {
                const collision = this.collisionManager.checkCollision(newPosition, this.collisionRadius);
                
                // Only consider environmental collisions, not other enemies
                const isEnvironmentCollision = collision.collides && collision.collider && !collision.collider.isEnemy;
                
                if (isEnvironmentCollision) {
                    // Skip moving to this position
                    if (Math.random() < 0.1) { // Log occasionally to avoid spam
                        console.log("Enemy collision detected, changing direction");
                    }
                    
                    // Modify the patrol angle to try a different direction
                    this.patrolAngle += Math.PI / 4; // Add 45 degrees to try a different direction
                    
                    // Return without updating position
                    return;
                }
                
                // Also check for ground
                const groundCheck = new THREE.Vector3(newPosition.x, newPosition.y - 0.1, newPosition.z);
                const groundHit = this.collisionManager.findFloorBelow(groundCheck, 1);
                
                if (!groundHit) {
                    // No ground beneath, skip moving
                    if (Math.random() < 0.1) {
                        console.log("No ground beneath enemy, skipping movement");
                    }
                    return;
                }
                
                // Check for small height differences in the floor
                if (groundHit && groundHit.point) {
                    // Only adjust height for small changes (ramps, small steps)
                    const heightDifference = Math.abs(groundHit.point.y - this.group.position.y);
                    const maxStepHeight = 0.3; // Maximum step height enemy can handle
                    
                    if (heightDifference <= maxStepHeight) {
                        // Adjust to match ground height
                        newPosition.y = groundHit.point.y;
                    } else if (heightDifference > maxStepHeight) {
                        // Too big of a step, don't move in this direction
                        return;
                    }
                }
            }
            
            // No collision, update position
            this.group.position.copy(newPosition);
            
            // Make the enemy face the direction of movement
            const forward = new THREE.Vector3(-Math.sin(this.patrolAngle), 0, Math.cos(this.patrolAngle));
            
            // Only set lookAt if forward is a valid direction
            if (forward.lengthSq() > 0) {
                const lookAtPoint = new THREE.Vector3().addVectors(this.group.position, forward);
                this.group.lookAt(lookAtPoint);
            }
        }
        
        // Rotate the body slightly to show it's active even if not moving
        this.bodyMesh.rotation.y += deltaTime * 1.0;
        
        // Check if player is near and rotate to face them
        this.checkPlayerProximity();
    }
    
    // Check if player is nearby and rotate to face them if they are
    checkPlayerProximity() {
        if (!this.player || !this.player.camera) return;
        
        // Get player position
        const playerPos = this.player.camera.position;
        
        // Calculate distance to player
        const distanceToPlayer = this.group.position.distanceTo(playerPos);
        
        // If player is within awareness range
        const awarenessRange = 5; // Units
        
        if (distanceToPlayer < awarenessRange) {
            // Create a vector pointing toward the player
            const directionToPlayer = new THREE.Vector3()
                .subVectors(playerPos, this.group.position)
                .normalize();
            
            // Only consider horizontal direction (ignore y component)
            directionToPlayer.y = 0;
            
            // Only proceed if we have a valid direction
            if (directionToPlayer.lengthSq() > 0) {
                // Create a point to look at
                const lookTarget = new THREE.Vector3()
                    .addVectors(this.group.position, directionToPlayer);
                
                // Gradually rotate toward player
                // This creates a more natural following effect
                const currentRotation = new THREE.Quaternion().copy(this.group.quaternion);
                const targetRotation = new THREE.Quaternion();
                
                // Create a temporary object to get the target rotation
                const tempObj = new THREE.Object3D();
                tempObj.position.copy(this.group.position);
                tempObj.lookAt(lookTarget);
                targetRotation.copy(tempObj.quaternion);
                
                // Smoothly interpolate between current and target rotation
                const rotationSpeed = 0.05; // Adjust for faster/slower turning
                this.group.quaternion.slerp(targetRotation, rotationSpeed);
                
                // Make eyes glow brighter when player is spotted
                if (this.leftEye && this.leftEye.material) {
                    this.leftEye.material.color.set(0xffff44);
                }
                if (this.rightEye && this.rightEye.material) {
                    this.rightEye.material.color.set(0xffff44);
                }
            }
        } else {
            // Reset eye color when player is not in range
            if (this.leftEye && this.leftEye.material) {
                this.leftEye.material.color.set(0xffff00);
            }
            if (this.rightEye && this.rightEye.material) {
                this.rightEye.material.color.set(0xffff00);
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
            this.patrolSpeed = speed;
        }
    }
    
    // Set a new patrol center
    setPatrolCenter(newCenter) {
        if (newCenter) {
            this.patrolCenter.copy(newCenter);
        }
    }
}
