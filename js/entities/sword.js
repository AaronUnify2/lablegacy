export class Sword {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.sword = null;
        this.swordLength = 0.8; // Length of the sword
        this.swordWidth = 0.08; // Width of the blade
        this.handleLength = 0.2; // Length of the handle
        
        // Sword position offset relative to camera - adjusted for right hand dual wielding
        this.positionOffset = new THREE.Vector3(1, -0.35, -3);
        
        // Sword animation variables
        this.bobAmount = 0.02;
        this.swayAmount = 0.01;
        this.bobSpeed = 2;
        this.swaySpeed = 1.5;
        
        // Attack animation state
        this.isAttacking = false;
        this.attackAnimationTime = 0;
        this.attackDuration = 0.3; // Duration of attack animation in seconds
        
        // Create and add to scene
        this.createSword();
        
        // Store original positions for animation
        this.originalPosition = this.positionOffset.clone();
        this.originalRotation = new THREE.Euler(Math.PI * 0.25, 0, 0);
        
        // Start the animation
        this.setupAnimations();
    }
    

    createSword() {
        // Create the sword group to hold sword components
        this.sword = new THREE.Group();
        
        // Create the blade
        const bladeGeometry = new THREE.BoxGeometry(
            this.swordWidth, // width
            this.swordLength, // height/length
            this.swordWidth / 3 // depth (thin)
        );
        
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xCCCCCC, // Silver/steel color
            roughness: 0.3,
            metalness: 0.8
        });
        
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = this.handleLength / 2; // Position above the handle
        this.blade = blade; // Store reference for attack animation
        
        // Create the handle/hilt
        const handleGeometry = new THREE.CylinderGeometry(
            this.swordWidth / 2, // top radius
            this.swordWidth / 2.5, // bottom radius
            this.handleLength, // height
            8, // radial segments
            1, // height segments
            false // open-ended
        );
        
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x664400, // Brown for handle
            roughness: 0.9,
            metalness: 0.1
        });
        
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -this.swordLength / 2 + this.handleLength / 2; // Position below the blade
        handle.rotation.x = Math.PI / 2; // Rotate to align with blade
        
        // Create the guard (crosspiece)
        const guardGeometry = new THREE.BoxGeometry(
            this.swordWidth * 3, // width (wider than blade)
            this.swordWidth / 2, // height (short)
            this.swordWidth // depth
        );
        
        const guardMaterial = new THREE.MeshStandardMaterial({
            color: 0xAA8855, // Bronze-ish guard
            roughness: 0.5,
            metalness: 0.6
        });
        
        const guard = new THREE.Mesh(guardGeometry, guardMaterial);
        guard.position.y = -this.swordLength / 2 + this.handleLength; // Position between blade and handle
        
        // Add components to the sword group
        this.sword.add(blade);
        this.sword.add(handle);
        this.sword.add(guard);
        
        // Rotate the sword to appear in a resting position
        this.sword.rotation.set(Math.PI * 0.25, 0, 0); // Angled slightly downward
        
        // Add the sword to the scene
        this.scene.add(this.sword);
    }
    
    setupAnimations() {
        // If we already have an animation loop for other items,
        // we'll add our sword to that list
        if (!window.animatedItems) {
            window.animatedItems = [];
            
            const animateItems = () => {
                const items = window.animatedItems;
                if (items && items.length > 0) {
                    const time = performance.now() * 0.001;
                    
                    for (const item of items) {
                        if (item.update) {
                            item.update(time);
                        }
                    }
                }
                
                requestAnimationFrame(animateItems);
            };
            
            animateItems();
        }
        
        // Add our sword to the animation items
        window.animatedItems.push(this);
    }
    
    update(time) {
        if (!this.camera || !this.sword) return;
        
        // Get the camera's world position and direction
        const cameraPosition = this.camera.position.clone();
        const cameraQuaternion = this.camera.quaternion.clone();
        
        // Create an offset vector for sword
        const swordOffset = this.positionOffset.clone();
        
        if (this.isAttacking) {
            // When attacking, update the animation based on attack time progress
            const attackProgress = Math.min(1, this.attackAnimationTime / this.attackDuration);
            
            // Update the attack animation timer
            this.attackAnimationTime += 0.016; // Assume ~60fps
            
            if (attackProgress < 0.5) {
                // Forward slash motion (0-0.5 of animation)
                const slashProgress = attackProgress * 2; // Normalize to 0-1 for first half
                
                // Adjust rotation for forward slash
                this.sword.rotation.set(
                    this.originalRotation.x - Math.PI * 0.4 * slashProgress, // Rotate upward
                    this.originalRotation.y,
                    this.originalRotation.z - Math.PI * 0.3 * slashProgress  // Rotate outward
                );
                
                // Push the sword a bit forward during slash
                swordOffset.z -= 0.2 * slashProgress;
            } else {
                // Return motion (0.5-1 of animation)
                const returnProgress = (attackProgress - 0.5) * 2; // Normalize to 0-1 for second half
                
                // Return to original rotation
                this.sword.rotation.set(
                    this.originalRotation.x - Math.PI * 0.4 * (1 - returnProgress), // Return from upward
                    this.originalRotation.y,
                    this.originalRotation.z - Math.PI * 0.3 * (1 - returnProgress)  // Return from outward
                );
                
                // Return from forward push
                swordOffset.z -= 0.2 * (1 - returnProgress);
            }
            
            // End of attack animation
            if (attackProgress >= 1) {
                this.isAttacking = false;
                this.attackAnimationTime = 0;
                
                // Ensure sword returns to exactly the original position
                this.sword.rotation.copy(this.originalRotation);
            }
        } else {
            // Normal idle animation when not attacking
            // Add subtle bobbing and swaying motion based on time
            swordOffset.y += Math.sin(time * this.bobSpeed) * this.bobAmount;
            swordOffset.x += Math.sin(time * this.swaySpeed) * this.swayAmount;
            
            // Reset rotation to original when not attacking
            this.sword.rotation.copy(this.originalRotation);
        }
        
        // Apply the offset in camera's local space
        swordOffset.applyQuaternion(cameraQuaternion);
        
        // Position the sword relative to the camera
        this.sword.position.copy(cameraPosition).add(swordOffset);
        
        // Keep the sword oriented with the camera
        const baseQuaternion = new THREE.Quaternion().copy(cameraQuaternion);
        this.sword.quaternion.copy(baseQuaternion);
    }
    
    // Perform sword attack animation
    attack() {
        if (this.isAttacking) return false; // Don't start a new attack if one is in progress
        
        this.isAttacking = true;
        this.attackAnimationTime = 0;
        
        return true;
    }
    
    // Show or hide the sword
    setVisible(visible) {
        if (this.sword) {
            this.sword.visible = visible;
        }
    }
}
