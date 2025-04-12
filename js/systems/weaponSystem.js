export class WeaponSystem {
    constructor(scene, player, enemyManager) {
        this.scene = scene;
        this.player = player;
        this.enemyManager = enemyManager;
        
        // Weapon state
        this.currentWeapon = null;
        this.attackCooldown = 0;
        this.isAttacking = false;
        
        // Staff attack properties
        this.staffAttackRange = 5;
        this.staffAttackRadius = 2;
        this.staffAttackDamage = 25;
        this.staffAttackCooldown = 0.8; // 800ms between attacks
        
        // For combo attacks
        this.comboCount = 0;
        this.comboResetTimer = 0;
        this.comboTimeWindow = 1.5; // 1.5 seconds to continue combo
        
        // Bind methods
        this.update = this.update.bind(this);
        this.staffAttack = this.staffAttack.bind(this);
    }
    
    update(deltaTime) {
        // Update cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
            if (this.attackCooldown < 0) {
                this.attackCooldown = 0;
            }
        }
        
        // Update combo timer
        if (this.comboCount > 0) {
            this.comboResetTimer -= deltaTime;
            if (this.comboResetTimer <= 0) {
                // Reset combo if player hasn't attacked again within the window
                this.comboCount = 0;
            }
        }
    }
    
    staffAttack() {
        // Check if attack is on cooldown
        if (this.attackCooldown > 0 || this.isAttacking) return false;
        
        // Set cooldown and attack state
        this.attackCooldown = this.staffAttackCooldown;
        this.isAttacking = true;
        
        // Increment combo counter and reset timer
        this.comboCount++;
        this.comboResetTimer = this.comboTimeWindow;
        
        // Adjust attack properties based on combo
        let attackDamage = this.staffAttackDamage;
        let attackRadius = this.staffAttackRadius;
        let attackColor = 0x3366ff; // Default blue
        
        // Enhanced attack based on combo count
        if (this.comboCount >= 3) {
            // Strong attack (3rd+ hit in combo)
            attackDamage *= 1.5;
            attackRadius *= 1.2;
            attackColor = 0xff3300; // Orange-red for powerful combo
            
            // Reset combo after a powerful hit
            if (this.comboCount >= 4) {
                this.comboCount = 0;
            }
        } else if (this.comboCount === 2) {
            // Medium attack (2nd hit in combo)
            attackDamage *= 1.2;
            attackRadius *= 1.1;
            attackColor = 0x66aaff; // Brighter blue for combo
        }
        
        // Get staff position and forward direction
        const staffPosition = new THREE.Vector3();
        this.player.magicStaff.orb.getWorldPosition(staffPosition);
        
        // Get camera forward direction
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.player.camera.quaternion);
        
        // Create attack endpoint
        const attackEnd = staffPosition.clone().addScaledVector(forward, this.staffAttackRange);
        
        // Find any enemies in range and damage them
        const hitCount = this.enemyManager.damageEnemiesInRadius(attackEnd, attackRadius, attackDamage);
        
        // Visual feedback
        this.showAttackEffect(staffPosition, attackEnd, attackRadius, hitCount > 0, attackColor);
        
        // Play attack sound
        this.playAttackSound(hitCount > 0, this.comboCount);
        
        // Perform attack animation on the staff
        this.animateStaffAttack(this.comboCount);
        
        // Reset attack state after a short delay
        setTimeout(() => {
            this.isAttacking = false;
        }, 300);
        
        return hitCount > 0;
    }
    
    showAttackEffect(start, end, radius, hitTarget, color = 0x3366ff) {
        // Create a beam effect for the attack
        const beamGeometry = new THREE.CylinderGeometry(0.05, 0.2, start.distanceTo(end), 8, 1, false);
        
        // Rotate cylinder to point in the right direction
        beamGeometry.rotateX(Math.PI / 2);
        
        // Create material with glow
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: hitTarget ? color : 0x3366ff,
            transparent: true,
            opacity: 0.7
        });
        
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        
        // Calculate midpoint between start and end for positioning
        const midpoint = new THREE.Vector3().addVectors(
            start, 
            end
        ).multiplyScalar(0.5);
        
        beam.position.copy(midpoint);
        
        // Orient beam to point in the attack direction
        beam.lookAt(end);
        
        // Add to scene
        this.scene.add(beam);
        
        // If we hit something, add impact effect
        if (hitTarget) {
            this.createImpactEffect(end, radius, color);
        }
        
        // Animate the beam
        const duration = 400; // 400ms
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Fade out
            beam.material.opacity = 0.7 * (1 - progress);
            
            // Scale effect
            const scale = hitTarget ? 
                1 + progress * 0.5 : // Expand slightly if hit
                1 - progress * 0.5;  // Contract if missed
                
            beam.scale.set(scale, 1, scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove after animation completes
                this.scene.remove(beam);
                beam.geometry.dispose();
                beam.material.dispose();
            }
        };
        
        animate();
    }
    
    createImpactEffect(position, radius, color = 0xff6600) {
        // Create impact sphere
        const impactGeometry = new THREE.SphereGeometry(radius * 0.5, 16, 16);
        const impactMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            wireframe: true
        });
        
        const impact = new THREE.Mesh(impactGeometry, impactMaterial);
        impact.position.copy(position);
        
        this.scene.add(impact);
        
        // Add a point light for the impact flash
        const impactLight = new THREE.PointLight(color, 3, radius * 2);
        impactLight.position.copy(position);
        this.scene.add(impactLight);
        
        // Animate the impact
        const duration = 500; // 500ms
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand sphere and fade out
            impact.scale.set(1 + progress * 2, 1 + progress * 2, 1 + progress * 2);
            impact.material.opacity = 0.5 * (1 - progress);
            
            // Fade out light
            if (impactLight) {
                impactLight.intensity = 3 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove after animation completes
                this.scene.remove(impact);
                this.scene.remove(impactLight);
                impact.geometry.dispose();
                impact.material.dispose();
            }
        };
        
        animate();
    }
    
    playAttackSound(hitTarget, comboCount = 0) {
        // Create attack sound based on combo count and hit
        let soundFile = 'sounds/staff_attack_miss.mp3';
        
        if (hitTarget) {
            if (comboCount >= 3) {
                soundFile = 'sounds/staff_attack_hit_strong.mp3';
            } else if (comboCount === 2) {
                soundFile = 'sounds/staff_attack_hit_medium.mp3';
            } else {
                soundFile = 'sounds/staff_attack_hit.mp3';
            }
        }
        
        // Create and play sound
        const attackSound = new Audio();
        attackSound.src = soundFile;
        attackSound.volume = hitTarget ? 0.4 : 0.2;
        
        // Play attack sound
        attackSound.play().catch(error => {
            console.log('Audio playback failed:', error);
        });
    }
    
    animateStaffAttack(comboCount = 0) {
        // Don't animate if staff doesn't exist
        if (!this.player.magicStaff) return;
        
        // Get original position and rotation
        const originalOrbPosition = this.player.magicStaff.orbOffset.clone();
        
        // Different animations based on combo count
        if (comboCount >= 3) {
            // Big spin attack for 3+ combo
            this.animateSpinAttack(originalOrbPosition);
        } else if (comboCount === 2) {
            // Side swipe for 2nd combo
            this.animateSideSwipe(originalOrbPosition);
        } else {
            // Basic forward thrust for 1st hit
            this.animateForwardThrust(originalOrbPosition);
        }
    }
    
    // Basic forward thrust animation
    animateForwardThrust(originalOrbPosition) {
        // Create a forward vector based on camera
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.player.camera.quaternion);
        
        // Move the orb forward slightly
        this.player.magicStaff.orbOffset.copy(originalOrbPosition);
        this.player.magicStaff.orbOffset.addScaledVector(forward, 0.3);
        
        // Increase staff glow
        if (this.player.magicStaff.orbMesh && this.player.magicStaff.orbMesh.material) {
            this.player.magicStaff.orbMesh.material.emissiveIntensity *= 2;
        }
        
        // Return to original position after delay
        setTimeout(() => {
            // Reset position over time
            const duration = 300; // 300ms
            const startTime = performance.now();
            
            const resetAnimation = () => {
                const now = performance.now();
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Interpolate back to original position
                this.player.magicStaff.orbOffset.lerpVectors(
                    this.player.magicStaff.orbOffset, 
                    originalOrbPosition, 
                    progress
                );
                
                // Reset glow
                if (this.player.magicStaff.orbMesh && this.player.magicStaff.orbMesh.material) {
                    const originalIntensity = this.player.magicStaff.isLightOn ? 6.0 : 1.0;
                    this.player.magicStaff.orbMesh.material.emissiveIntensity = 
                        originalIntensity * 2 * (1 - progress) + originalIntensity * progress;
                }
                
                if (progress < 1) {
                    requestAnimationFrame(resetAnimation);
                } else {
                    // Ensure we're exactly at the original position at the end
                    this.player.magicStaff.orbOffset.copy(originalOrbPosition);
                }
            };
            
            resetAnimation();
        }, 100);
    }
    
    // Side swipe animation for 2nd combo hit
    animateSideSwipe(originalOrbPosition) {
        // Get camera directions
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.player.camera.quaternion);
        
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.player.camera.quaternion);
        
        // Start position - slightly to the left
        this.player.magicStaff.orbOffset.copy(originalOrbPosition);
        this.player.magicStaff.orbOffset.addScaledVector(right, -0.3);
        
        // Increase staff glow with blue tint
        if (this.player.magicStaff.orbMesh && this.player.magicStaff.orbMesh.material) {
            this.player.magicStaff.orbMesh.material.emissiveIntensity *= 2.5;
            this.player.magicStaff.orbMesh.material.emissive.set(0x66aaff);
        }
        
        // Animate the swipe
        const duration = 300; // 300ms
        const startTime = performance.now();
        
        const swipeAnimation = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Move from left to right
            const swipeOffset = originalOrbPosition.clone();
            swipeOffset.addScaledVector(right, -0.3 + progress * 0.6); // -0.3 to +0.3
            
            // Add a slight forward push at the middle of the swing
            const forwardPush = Math.sin(progress * Math.PI) * 0.2;
            swipeOffset.addScaledVector(forward, forwardPush);
            
            // Update position
            this.player.magicStaff.orbOffset.copy(swipeOffset);
            
            if (progress < 1) {
                requestAnimationFrame(swipeAnimation);
            } else {
                // Return to original position after swipe
                setTimeout(() => {
                    const resetDuration = 200;
                    const resetStart = performance.now();
                    
                    const resetAnimation = () => {
                        const now = performance.now();
                        const elapsed = now - resetStart;
                        const progress = Math.min(elapsed / resetDuration, 1);
                        
                        // Interpolate back to original position
                        this.player.magicStaff.orbOffset.lerpVectors(
                            this.player.magicStaff.orbOffset,
                            originalOrbPosition,
                            progress
                        );
                        
                        // Reset glow
                        if (this.player.magicStaff.orbMesh && this.player.magicStaff.orbMesh.material) {
                            const originalIntensity = this.player.magicStaff.isLightOn ? 6.0 : 1.0;
                            this.player.magicStaff.orbMesh.material.emissiveIntensity = 
                                originalIntensity * 2.5 * (1 - progress) + originalIntensity * progress;
                                
                            // Reset emissive color
                            const originalColor = new THREE.Color(0x3366ff);
                            const currentColor = this.player.magicStaff.orbMesh.material.emissive;
                            currentColor.lerp(originalColor, progress);
                        }
                        
                        if (progress < 1) {
                            requestAnimationFrame(resetAnimation);
                        } else {
                            // Ensure we're exactly at the original position at the end
                            this.player.magicStaff.orbOffset.copy(originalOrbPosition);
                            
                            // Reset emissive color completely
                            if (this.player.magicStaff.orbMesh && this.player.magicStaff.orbMesh.material) {
                                this.player.magicStaff.orbMesh.material.emissive.set(0x3366ff);
                            }
                        }
                    };
                    
                    resetAnimation();
                }, 50);
            }
        };
        
        swipeAnimation();
    }
    
    // Spin attack animation for 3+ combo
    animateSpinAttack(originalOrbPosition) {
        // Create a forward vector based on camera
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.player.camera.quaternion);
        
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.player.camera.quaternion);
        
        // Super-charge the orb
        if (this.player.magicStaff.orbMesh && this.player.magicStaff.orbMesh.material) {
            this.player.magicStaff.orbMesh.material.emissiveIntensity *= 3;
            this.player.magicStaff.orbMesh.material.emissive.set(0xff3300); // Orange-red
        }
        
        // Start the spin animation
        const spinDuration = 500; // 500ms
        const startTime = performance.now();
        const spinRadius = 0.5; // Radius of the spin circle
        
        const spinAnimation = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / spinDuration, 1);
            
            // Calculate position on a circle
            const angle = progress * Math.PI * 2; // Full 360 degree spin
            const spinOffset = originalOrbPosition.clone();
            
            // Add circular motion
            spinOffset.addScaledVector(right, Math.cos(angle) * spinRadius);
            spinOffset.addScaledVector(forward, Math.sin(angle) * spinRadius * 0.5); // Elliptical path
            
            // Add some height variation
            spinOffset.y += Math.sin(angle * 2) * 0.2;
            
            // Update position
            this.player.magicStaff.orbOffset.copy(spinOffset);
            
            if (progress < 1) {
                requestAnimationFrame(spinAnimation);
            } else {
                // Return to original position with a flourish
                const finishDuration = 300;
                const finishStart = performance.now();
                
                const finishAnimation = () => {
                    const now = performance.now();
                    const elapsed = now - finishStart;
                    const progress = Math.min(elapsed / finishDuration, 1);
                    
                    // Add a small bounce effect
                    const bounce = Math.sin(progress * Math.PI) * 0.2;
                    const finishOffset = originalOrbPosition.clone();
                    finishOffset.addScaledVector(forward, bounce);
                    
                    // Update position
                    this.player.magicStaff.orbOffset.lerpVectors(
                        this.player.magicStaff.orbOffset,
                        finishOffset,
                        progress
                    );
                    
                    // Reset glow
                    if (this.player.magicStaff.orbMesh && this.player.magicStaff.orbMesh.material) {
                        const originalIntensity = this.player.magicStaff.isLightOn ? 6.0 : 1.0;
                        this.player.magicStaff.orbMesh.material.emissiveIntensity = 
                            originalIntensity * 3 * (1 - progress) + originalIntensity * progress;
                            
                        // Reset emissive color
                        const originalColor = new THREE.Color(0x3366ff);
                        const currentColor = this.player.magicStaff.orbMesh.material.emissive;
                        currentColor.lerp(originalColor, progress);
                    }
                    
                    if (progress < 1) {
                        requestAnimationFrame(finishAnimation);
                    } else {
                        // Final reset to original position
                        setTimeout(() => {
                            this.player.magicStaff.orbOffset.copy(originalOrbPosition);
                            
                            // Reset emissive color completely
                            if (this.player.magicStaff.orbMesh && this.player.magicStaff.orbMesh.material) {
                                this.player.magicStaff.orbMesh.material.emissive.set(0x3366ff);
                            }
                        }, 50);
                    }
                };
                
                finishAnimation();
            }
        };
        
        spinAnimation();
    }
