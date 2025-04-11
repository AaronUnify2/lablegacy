export class Enemy {
    constructor(scene, position, collisionManager, player) {
        this.scene = scene;
        this.position = position.clone();
        this.state = 'idle'; // Changed to 'idle' from 'dead' to make enemies active
        
        // Add patrol properties
        this.patrolRadius = 3; // Radius of patrol circle in world units
        this.patrolSpeed = 0.5; // Speed of patrol movement (slow and steady)
        this.patrolAngle = 0; // Current angle in the patrol circle
        this.patrolCenter = position.clone(); // Center of patrol circle
        this.patrolActive = true; // Flag to enable/disable patrol
        
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
        
        // Add simple debug to monitor updates
        if (Math.random() < 0.01) { // Only log occasionally to prevent console spam
            console.log("Enemy update at position:", this.group.position);
        }
        
        // Patrol in a circle if active
        if (this.patrolActive) {
            // Calculate new position on the circle
            this.patrolAngle += this.patrolSpeed * deltaTime;
            
            // Calculate new x and z positions
            const newX = this.patrolCenter.x + Math.cos(this.patrolAngle) * this.patrolRadius;
            const newZ = this.patrolCenter.z + Math.sin(this.patrolAngle) * this.patrolRadius;
            
            // Update group position (keeping y the same)
            this.group.position.x = newX;
            this.group.position.z = newZ;
            
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
}
