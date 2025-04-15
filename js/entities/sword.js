export class Sword {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.sword = null;
        this.swordLength = 0.8; // Length of the sword
        this.swordWidth = 0.08; // Width of the blade
        this.handleLength = 0.2; // Length of the handle
        
        // Sword position offset relative to camera - positioned for right hand
        this.positionOffset = new THREE.Vector3(0.45, -0.65, -0.8);
        
        // Sword animation variables
        this.bobAmount = 0.02;
        this.swayAmount = 0.01;
        this.bobSpeed = 2;
        this.swaySpeed = 1.5;
        
        // Attack animation state
        this.isAttacking = false;
        this.attackAnimationTime = 0;
        this.attackDuration = 0.4; // Slightly longer duration for wind-up + slash
        this.windUpPortion = 0.25; // Wind-up takes 25% of the animation
        this.slashPortion = 0.5; // Slash takes 50% of the animation
        // Return takes remaining 25%
        
        // Create the sword parts and add to scene
        this.createSword();
        
        // Define the custom rotation we want for the sword
        // Values control the tilt and angle of the sword
        this.swordRotation = new THREE.Euler(
            Math.PI * 0.2,  // X rotation (forward/backward tilt)
            -Math.PI * 1.3, // Y rotation (left/right rotation)
            -Math.PI * 0.5  // Z rotation (clockwise/counterclockwise)
        );
        
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
            
            // Phase 1: Wind-up (raising the sword) - first 25% of animation
            if (attackProgress < this.windUpPortion) {
                const windUpProgress = attackProgress / this.windUpPortion; // Normalize to 0-1 for wind-up
                
                // Wind-up rotation (raising the sword up and to the right)
                const windUpRotation = this.swordRotation.clone();
                
                // Raise the sword up and slightly to the right
                windUpRotation.x += Math.PI * 0.3 * windUpProgress; // Rotate upward
                windUpRotation.y -= Math.PI * 0.15 * windUpProgress; // Rotate slightly right
                windUpRotation.z += Math.PI * 0.2 * windUpProgress; // Tilt for wind-up
                
                const windUpQuaternion = new THREE.Quaternion().setFromEuler(windUpRotation);
                this.sword.quaternion.copy(cameraQuaternion).multiply(windUpQuaternion);
                
                // Move sword up and slightly right during wind-up
                swordOffset.y += 0.25 * windUpProgress; // Raise upward
                swordOffset.x += 0.1 * windUpProgress; // Slight movement right
                swordOffset.z += 0.1 * windUpProgress; // Pull back slightly
            }
            // Phase 2: Slash (quick down-left diagonal) - middle 50% of animation
            else if (attackProgress < this.windUpPortion + this.slashPortion) {
                const slashProgress = (attackProgress - this.windUpPortion) / this.slashPortion; // Normalize to 0-1 for slash
                
                // Start from wound-up position and slash down diagonally to the left
                const slashRotation = this.swordRotation.clone();
                
                // Calculate positions representing transition from wound-up to slashed down-left
                const upwardComponent = Math.PI * 0.3 * (1 - slashProgress);
                const rightwardComponent = Math.PI * 0.15 * (1 - slashProgress);
                const windupTiltComponent = Math.PI * 0.2 * (1 - slashProgress);
                
                // Add downward-left slash components
                const downwardComponent = Math.PI * 0.4 * slashProgress;
                const leftwardComponent = Math.PI * 0.3 * slashProgress;
                const slashTiltComponent = Math.PI * 0.5 * slashProgress;
                
                // Combine the movements
                slashRotation.x += upwardComponent - downwardComponent; // From up to down
                slashRotation.y -= rightwardComponent + leftwardComponent; // From right to left
                slashRotation.z += windupTiltComponent - slashTiltComponent; // Tilting for slash
                
                const slashQuaternion = new THREE.Quaternion().setFromEuler(slashRotation);
                this.sword.quaternion.copy(cameraQuaternion).multiply(slashQuaternion);
                
                // Move sword in a diagonal down-left path - faster in middle of swing for natural acceleration
                const speedCurve = Math.sin(slashProgress * Math.PI); // Peaks at middle of swing
                
                // Initial position components (from wind-up)
                const upPosition = 0.25 * (1 - slashProgress);
                const rightPosition = 0.1 * (1 - slashProgress);
                const backPosition = 0.1 * (1 - slashProgress);
                
                // Final position components (diagonal down-left slash)
                const downPosition = 0.3 * slashProgress;
                const leftPosition = 0.35 * slashProgress;
                const forwardPosition = 0.2 * slashProgress;
                
                // Apply positions with acceleration curve
                swordOffset.y += upPosition - (downPosition * speedCurve); // From up to down
                swordOffset.x += rightPosition - (leftPosition * speedCurve); // From right to left
                swordOffset.z += backPosition - (forwardPosition * speedCurve); // From back to forward
            }
            // Phase 3: Return to neutral - remaining 25% of animation
            else {
                const returnProgress = (attackProgress - (this.windUpPortion + this.slashPortion)) / 
                                    (1 - this.windUpPortion - this.slashPortion); // Normalize to 0-1 for return
                
                // Return from slashed position to neutral
                const returnRotation = this.swordRotation.clone();
                
                // Apply return rotation (smoothly go back to neutral)
                const returnQuaternion = new THREE.Quaternion().setFromEuler(returnRotation);
                this.sword.quaternion.copy(cameraQuaternion).multiply(returnQuaternion);
                
                // Return position to neutral smoothly
                const finalDownComponent = 0.3 * (1 - returnProgress);
                const finalLeftComponent = 0.35 * (1 - returnProgress);
                const finalForwardComponent = 0.2 * (1 - returnProgress);
                
                swordOffset.y -= finalDownComponent; // Return from down
                swordOffset.x -= finalLeftComponent; // Return from left
                swordOffset.z -= finalForwardComponent; // Return from forward
            }
            
            // End of attack animation
            if (attackProgress >= 1) {
                this.isAttacking = false;
                this.attackAnimationTime = 0;
            }
        } else {
            // Normal idle animation when not attacking
            // Add subtle bobbing and swaying motion based on time
            swordOffset.y += Math.sin(time * this.bobSpeed) * this.bobAmount;
            swordOffset.x += Math.sin(time * this.swaySpeed) * this.swayAmount;
            
            // Apply camera orientation first, then our custom sword rotation
            const swordQuaternion = new THREE.Quaternion().setFromEuler(this.swordRotation);
            this.sword.quaternion.copy(cameraQuaternion).multiply(swordQuaternion);
        }
        
        // Apply the offset in camera's local space
        swordOffset.applyQuaternion(cameraQuaternion);
        
        // Position the sword relative to the camera
        this.sword.position.copy(cameraPosition).add(swordOffset);
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
