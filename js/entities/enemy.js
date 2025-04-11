export class Enemy {
    constructor(scene, position, collisionManager, player) {
        this.scene = scene;
        this.position = position.clone();
        this.state = 'idle'; // Only need this for manager to check if 'dead'
        
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
        // Most minimal update possible - just rotate slowly to show it's working
        this.group.rotation.y += deltaTime * 0.5;
    }
}
