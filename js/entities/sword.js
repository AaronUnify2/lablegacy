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
        this.attackDuration = 0.6; // Increased overall duration for more follow-through
        this.windUpPortion = 0.35; // Slightly reduced wind-up portion
        this.slashPortion = 0.35; // New portion for the main slash
        // Remaining 0.3 (30%) is follow-through
        
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
            
            // Create a modified rotation for the attack animation based on the base sword rotation
            const attackRotation = this.swordRotation.clone();
            
            if (attackProgress < this.windUpPortion) {
                // PHASE 1: Wind-up phase - EXTREME raise of the sword up and back
                const windUpProgress = attackProgress / this.windUpPortion; // Normalize to 0-1 for wind-up
                
                // Dramatic raise sword high up and far back - like a madman
                attackRotation.x += Math.PI * 0.7 * windUpProgress; // Extreme upward raise
                attackRotation.y -= Math.PI * 0.25 * windUpProgress; // Strong rightward rotation 
                attackRotation.z += Math.PI * 0.4 * windUpProgress; // Extreme tilt for wind-up position
                
                // Add a slight wobble to the wind-up for a berserker feel
                const wobbleAmount = 0.1;
                const wobbleSpeed = 15;
                attackRotation.x += Math.sin(time * wobbleSpeed) * wobbleAmount * windUpProgress;
                attackRotation.z += Math.cos(time * wobbleSpeed) * wobbleAmount * windUpProgress;
                
                // Create quaternion from wind-up rotation
                const windUpQuaternion = new THREE.Quaternion().setFromEuler(attackRotation);
                
                // Set the sword's quaternion
                this.sword.quaternion.copy(cameraQuaternion).multiply(windUpQuaternion);
                
                // Dramatically raise the sword high up and far back during wind-up
                swordOffset.y += 0.35 * windUpProgress; // Much higher upward movement
                swordOffset.z += 0.3 * windUpProgress;  // Pull far back
                swordOffset.x += 0.15 * windUpProgress; // Pull slightly right for dramatic wind-up
            } 
            else if (attackProgress < (this.windUpPortion + this.slashPortion)) {
                // PHASE 2: Main slash phase - FEROCIOUS diagonal down-left motion
                const slashProgress = (attackProgress - this.windUpPortion) / this.slashPortion; // Normalize to 0-1 for slash
                
                // Easing function for a more explosive start to the slash
                const easedSlashProgress = Math.pow(slashProgress, 0.6); // Front-loaded easing
                
                // Start from the extreme wound-up position
                attackRotation.x += Math.PI * 0.7 * (1 - slashProgress); // Start from high raised position
                attackRotation.y -= Math.PI * 0.25 * (1 - slashProgress); // Start from right-rotated position
                attackRotation.z += Math.PI * 0.4 * (1 - slashProgress); // Start from extreme tilted position
                
                // Add the violent slash motion - moving down and to the left with extreme force
                attackRotation.x -= Math.PI * 0.9 * easedSlashProgress; // Very sharp downward rotation
                attackRotation.y += Math.PI * 0.5 * easedSlashProgress; // Strong rotate toward left
                attackRotation.z -= Math.PI * 0.7 * easedSlashProgress; // Extreme rotation for diagonal
                
                // Add a slight blur-like effect by oscillating very quickly during the slash
                if (slashProgress < 0.7) { // Only during the main part of the slash
                    const blurFrequency = 40;
                    const blurAmount = 0.08 * (1 - slashProgress); // Diminishing over time
                    attackRotation.y += Math.sin(time * blurFrequency) * blurAmount;
                    attackRotation.z += Math.cos(time * blurFrequency) * blurAmount;
                }
                
                // Create quaternion from slash rotation
                const slashQuaternion = new THREE.Quaternion().setFromEuler(attackRotation);
                
                // Set the sword's quaternion
                this.sword.quaternion.copy(cameraQuaternion).multiply(slashQuaternion);
                
                // Start position offsets from the extreme wound-up position
                swordOffset.y += 0.35 * (1 - slashProgress); // Start from high raised position
                swordOffset.z += 0.3 * (1 - slashProgress);  // Start from pulled back position
                swordOffset.x += 0.15 * (1 - slashProgress); // Start from right position
                
                // Add the ferocious diagonal down-left cutting motion
                swordOffset.y -= 0.45 * easedSlashProgress;  // Extreme downward movement
                swordOffset.x -= 0.5 * easedSlashProgress;   // Extreme leftward movement
                swordOffset.z -= 0.3 * easedSlashProgress;   // Strong forward movement for the slash
            }
            else {
                // PHASE 3: Follow-through phase - extend the slash and add weight to it
                const followThroughProgress = (attackProgress - (this.windUpPortion + this.slashPortion)) / (1 - this.windUpPortion - this.slashPortion);
                
                // Easing function for realistic deceleration in follow-through
                const easedFollowThrough = 1 - Math.pow(1 - followThroughProgress, 2); // Ease-out quad
                
                // Start from the end position of the main slash
                const endSlashRotation = {
                    x: this.swordRotation.x - Math.PI * 0.9,
                    y: this.swordRotation.y + Math.PI * 0.5,
                    z: this.swordRotation.z - Math.PI * 0.7
                };
                
                // Continue the motion downward but with gradually decreasing speed
                attackRotation.x = endSlashRotation.x - Math.PI * 0.2 * easedFollowThrough; // Continue downward
                attackRotation.y = endSlashRotation.y + Math.PI * 0.15 * easedFollowThrough; // Continue leftward
                attackRotation.z = endSlashRotation.z - Math.PI * 0.1 * easedFollowThrough; // Continue rotation
                
                // Add a slight oscillation to simulate the impact and weight of the sword
                const impactFrequency = 20;
                const impactAmount = 0.05 * (1 - easedFollowThrough); // Diminishing over time
                attackRotation.x += Math.sin(time * impactFrequency) * impactAmount;
                
                // Create quaternion from follow-through rotation
                const followThroughQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                    attackRotation.x, 
                    attackRotation.y, 
                    attackRotation.z
                ));
                
                // Set the sword's quaternion
                this.sword.quaternion.copy(cameraQuaternion).multiply(followThroughQuaternion);
                
                // Start position offsets from the end of main slash
                const endSlashPosition = {
                    y: this.positionOffset.y - 0.45,
                    x: this.positionOffset.x - 0.5,
                    z: this.positionOffset.z - 0.3
                };
                
                // Continue the motion and add slight bounce/recoil at the end
                swordOffset.y = endSlashPosition.y - 0.15 * easedFollowThrough; // Continue downward
                swordOffset.x = endSlashPosition.x - 0.1 * easedFollowThrough;  // Continue leftward
                swordOffset.z = endSlashPosition.z + 0.05 * easedFollowThrough; // Slight pullback after slash
                
                // Add a slight vibration to simulate impact
                if (followThroughProgress < 0.6) {
                    const vibrationAmount = 0.02 * (1 - followThroughProgress / 0.6);
                    swordOffset.y += Math.sin(time * 30) * vibrationAmount;
                    swordOffset.x += Math.cos(time * 30) * vibrationAmount;
                }
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
