export class Enemy {
    constructor(scene, position, collisionManager, player) {
        this.scene = scene;
        this.position = position.clone();
        this.state = 'idle'; // Changed to 'idle' from 'dead' to make enemies active
        this.collisionManager = collisionManager; // Store reference to collision manager
        
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
            if (this.collisionEnabled && this.collisionManager) {
                const collision = this.collisionManager.checkCollision(newPosition, this.collisionRadius);
                
                if (collision.collides) {
                    // Skip moving to this position
                    if (Math.random() < 0.1) { // Log occasionally to avoid spam
                        console.log("Enemy collision detected, skipping movement");
                    }
                    
                    // Option 1: Simply skip moving this frame
                    // Option 2: Modify the patrol angle to try a different direction
                    this.patrolAngle += Math.PI / 4; // Add 45 degrees to try a different direction
                    
                    // Return without updating position
                    return;
                }
                
                // Also check for ground
                const groundCheck = new THREE.Vector3(newPosition.x, newPosition.y - 1, newPosition.z);
                const groundHit = this.collisionManager.findFloorBelow(groundCheck, 2);
                
                if (!groundHit) {
                    // No ground beneath, skip moving
                    if (Math.random() < 0.1) {
                        console.log("No ground beneath enemy, skipping movement");
                    }
                    return;
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
