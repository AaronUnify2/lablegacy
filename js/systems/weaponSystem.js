export class WeaponSystem {
    constructor(scene, player, enemyManager) {
        this.scene = scene;
        this.player = player;
        this.enemyManager = enemyManager;
        
        // Both weapons are active in dual wield mode
        this.dualWieldMode = true;
        
        // Track last used weapon for animation cooldowns
        this.lastUsedWeapon = "staff";
        this.attackCooldown = {
            staff: 0,
            sword: 0
        };
        
        // Set cooldown times for each weapon type
        this.cooldownTimes = {
            staff: 0.8, // 800ms between staff attacks
            sword: 0.4  // 400ms between sword attacks (faster than staff)
        };
        
        // Set damage values for each weapon
        this.damageValues = {
            staff: 25, // Staff damage (ranged)
            sword: 40  // Sword damage (melee, but higher)
        };
        
        // Set attack ranges
        this.attackRanges = {
            staff: 15, // Staff has longer range
            sword: 2.5 // Sword has much shorter range
        };
        
        // Add crosshair properties
        this.targetingRange = 30; // How far to check for targets (raycasting distance)
        this.currentTarget = null; // Currently targeted enemy
        
        // Create crosshair element
        this.createCrosshair();
        
        // Bind methods
        this.update = this.update.bind(this);
        this.staffAttack = this.staffAttack.bind(this);
        this.swordAttack = this.swordAttack.bind(this);
        this.updateCrosshair = this.updateCrosshair.bind(this);
    }
    
    update(deltaTime) {
        // Update cooldowns for both weapons
        if (this.attackCooldown.staff > 0) {
            this.attackCooldown.staff -= deltaTime;
        }
        
        if (this.attackCooldown.sword > 0) {
            this.attackCooldown.sword -= deltaTime;
        }
        
        // Update the crosshair targeting
        this.updateCrosshair();
    }
    
    // Create crosshair DOM element
    createCrosshair() {
        // Create main crosshair container
        this.crosshair = document.createElement('div');
        this.crosshair.className = 'crosshair';
        
        // Create circle part
        const circle = document.createElement('div');
        circle.className = 'crosshair-circle';
        this.crosshair.appendChild(circle);
        
        // Create center dot
        const dot = document.createElement('div');
        dot.className = 'crosshair-dot';
        this.crosshair.appendChild(dot);
        
        // Add to game container
        document.getElementById('game-container').appendChild(this.crosshair);
    }
    
    // Modified for dual wielding - update crosshair appearance based on weapon ranges
    updateCrosshair() {
        if (!this.player || !this.player.camera) return;
        
        // Get camera direction
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(this.player.camera.quaternion);
        
        // Create raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.set(this.player.camera.position, cameraDirection);
        
        // Check if we're targeting an enemy
        this.currentTarget = this.checkTargetInCrosshair(raycaster);
        
        // Update crosshair appearance - show if target is acquired
        if (this.currentTarget) {
            // Calculate distance to determine if any weapon is in range
            const distanceToTarget = this.player.camera.position.distanceTo(this.currentTarget.group.position);
            
            // In range of either weapon
            if (distanceToTarget <= this.attackRanges.sword) {
                // In range of sword (and staff)
                this.crosshair.classList.add('target-acquired', 'dual-target');
            } else if (distanceToTarget <= this.attackRanges.staff) {
                // Only in range of staff
                this.crosshair.classList.add('target-acquired', 'staff-target');
                this.crosshair.classList.remove('dual-target');
            } else {
                // Target acquired but out of range
                this.crosshair.classList.remove('target-acquired', 'staff-target', 'dual-target');
            }
        } else {
            this.crosshair.classList.remove('target-acquired', 'staff-target', 'dual-target');
        }
    }
    
    // Check if there's a target in the crosshair
    checkTargetInCrosshair(raycaster) {
        // If we don't have enemies, return null
        if (!this.enemyManager || !this.enemyManager.enemies) return null;
        
        // Create array of meshes to check
        const targetableMeshes = [];
        
        // Add enemy meshes to the check
        for (const enemy of this.enemyManager.enemies) {
            if (enemy && enemy.group && enemy.state !== 'dead') {
                // Add the main enemy body
                if (enemy.bodyMesh) {
                    targetableMeshes.push(enemy.bodyMesh);
                    enemy.bodyMesh.userData.enemyIndex = this.enemyManager.enemies.indexOf(enemy);
                }
                
                // Add other enemy parts if they exist
                if (enemy.leftEye) {
                    targetableMeshes.push(enemy.leftEye);
                    enemy.leftEye.userData.enemyIndex = this.enemyManager.enemies.indexOf(enemy);
                }
                
                if (enemy.rightEye) {
                    targetableMeshes.push(enemy.rightEye);
                    enemy.rightEye.userData.enemyIndex = this.enemyManager.enemies.indexOf(enemy);
                }
            }
        }
        
        // If no targetable meshes, return null
        if (targetableMeshes.length === 0) return null;
        
        // Check for intersections
        const intersects = raycaster.intersectObjects(targetableMeshes, false);
        
        // If we hit something
        if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Get the distance to the target
            const distance = hit.distance;
            
            // Check against the maximum range of any weapon plus some buffer
            const maxRangeCheck = Math.max(this.attackRanges.staff, this.attackRanges.sword) + 5;
            
            // Get enemy index from userData
            const enemyIndex = hit.object.userData.enemyIndex;
            
            // Check if this is a valid enemy and within max checking range
            if (enemyIndex !== undefined && distance <= maxRangeCheck) {
                return this.enemyManager.enemies[enemyIndex];
            }
        }
        
        return null;
    }
    
    staffAttack() {
        // Check if attack is on cooldown
        if (this.attackCooldown.staff > 0) return false;
        
        // Set cooldown for staff - only staff cooldown, sword remains independent
        this.attackCooldown.staff = this.cooldownTimes.staff;
        this.lastUsedWeapon = "staff";
        
        // Get staff position and forward direction
        const staffPosition = new THREE.Vector3();
        if (this.player.magicStaff && this.player.magicStaff.orb) {
            this.player.magicStaff.orb.getWorldPosition(staffPosition);
        } else {
            // Fallback to camera position if staff is not available
            staffPosition.copy(this.player.camera.position);
        }
        
        // Get camera forward direction
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.player.camera.quaternion);
        
        // Attack parameters
        const attackRange = this.attackRanges.staff;
        const attackRadius = 2;
        const attackDamage = this.damageValues.staff;
        
        // Create attack endpoint based on targeting
        let attackEnd, hitEnemy = false;
        
        // First priority: use targeted enemy if available
        if (this.currentTarget) {
            // Get position of targeted enemy
            attackEnd = this.currentTarget.group.position.clone();
            
            // Check if enemy is within staff range
            const distanceToTarget = staffPosition.distanceTo(attackEnd);
            
            if (distanceToTarget <= attackRange) {
                // Apply damage directly to the targeted enemy
                const killed = this.currentTarget.takeDamage(attackDamage);
                hitEnemy = true;
                
                if (this.enemyManager.debug && killed) {
                    console.log("Enemy was killed by direct staff hit!");
                }
            } else {
                // Target too far away, use max range
                attackEnd = staffPosition.clone().addScaledVector(forward, attackRange);
            }
        } else {
            // Fallback to old behavior: ray in front of player
            attackEnd = staffPosition.clone().addScaledVector(forward, attackRange);
            
            // Check for enemies in radius around endpoint
            hitEnemy = this.enemyManager.damageEnemiesInRadius(attackEnd, attackRadius, attackDamage) > 0;
        }
        
        // Visual feedback
        this.showStaffAttackEffect(staffPosition, attackEnd, attackRadius, hitEnemy);
        
        // Play attack sound
        this.playAttackSound(hitEnemy, "staff");
        
        // Perform attack animation on the staff
        this.animateStaffAttack();
        
        // Add a stronger effect for hits
        if (hitEnemy) {
            this.showHitImpactEffect(attackEnd);
        }
        
        return hitEnemy;
    }
    
    swordAttack() {
        // Check if attack is on cooldown
        if (this.attackCooldown.sword > 0) return false;
        
        // Set cooldown for sword - only sword cooldown, staff remains independent
        this.attackCooldown.sword = this.cooldownTimes.sword;
        this.lastUsedWeapon = "sword";
        
        // Get sword position
        const swordPosition = new THREE.Vector3();
        if (this.player.sword && this.player.sword.sword) {
            // Try to get the blade position for better hit location
            if (this.player.sword.blade) {
                this.player.sword.blade.getWorldPosition(swordPosition);
            } else {
                this.player.sword.sword.getWorldPosition(swordPosition);
            }
        } else {
            // Fallback to camera position
            swordPosition.copy(this.player.camera.position);
        }
        
        // Get camera forward direction
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.player.camera.quaternion);
        
        // Attack parameters
        const attackRange = this.attackRanges.sword;
        const attackRadius = 1.2; // Smaller radius than staff
        const attackDamage = this.damageValues.sword;
        
        // Calculate the sword strike endpoint
        let attackEnd = swordPosition.clone().addScaledVector(forward, attackRange);
        let hitEnemy = false;
        
        // First priority: use targeted enemy if available
        if (this.currentTarget) {
            // Get position of targeted enemy
            const targetPosition = this.currentTarget.group.position.clone();
            
            // Check if enemy is within sword range
            const distanceToTarget = swordPosition.distanceTo(targetPosition);
            
            if (distanceToTarget <= attackRange) {
                // Apply damage directly to the targeted enemy
                const killed = this.currentTarget.takeDamage(attackDamage);
                hitEnemy = true;
                attackEnd = targetPosition;
                
                if (this.enemyManager.debug && killed) {
                    console.log("Enemy was killed by direct sword hit!");
                }
            }
        }
        
        // If no direct hit, check for enemies in sword swing arc
        if (!hitEnemy) {
            hitEnemy = this.enemyManager.damageEnemiesInRadius(attackEnd, attackRadius, attackDamage) > 0;
        }
        
        // Animate the sword strike
        if (this.player.sword) {
            this.player.sword.attack();
        }
        
        // Visual feedback - sword swing effect
        this.showSwordAttackEffect(swordPosition, attackEnd, hitEnemy);
        
        // Play attack sound
        this.playAttackSound(hitEnemy, "sword");
        
        // Add hit impact effect if we hit an enemy
        if (hitEnemy) {
            this.showSwordHitEffect(attackEnd);
        }
        
        return hitEnemy;
    }
    
    showStaffAttackEffect(start, end, radius, hitTarget) {
        // Create a beam effect for the attack
        const beamGeometry = new THREE.CylinderGeometry(0.05, 0.2, start.distanceTo(end), 8, 1, false);
        
        // Rotate cylinder to point in the right direction
        beamGeometry.rotateX(Math.PI / 2);
        
        // Create material with glow
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: hitTarget ? 0xff3300 : 0x3366ff,
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
            this.createImpactEffect(end, radius);
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
            }
        };
        
        animate();
    }
    
    showSwordAttackEffect(start, end, hitTarget) {
        // Create a simple sword swing trail effect
        const swingGeometry = new THREE.PlaneGeometry(1, 0.3);
        
        // Create material with glow
        const swingMaterial = new THREE.MeshBasicMaterial({
            color: hitTarget ? 0xff6600 : 0xcccccc,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const swingTrail = new THREE.Mesh(swingGeometry, swingMaterial);
        
        // Get direction to end point
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        
        // Calculate position for swing trail (slightly offset from player position)
        const swingPosition = new THREE.Vector3().addVectors(
            start,
            direction.clone().multiplyScalar(0.7)
        );
        
        swingTrail.position.copy(swingPosition);
        
        // Orient the swing trail
        swingTrail.lookAt(end);
        // Rotate it 90 degrees to make it vertical
        swingTrail.rotateX(Math.PI / 2);
        
        // Add to scene
        this.scene.add(swingTrail);
        
        // Animate the swing trail
        const duration = 300; // 300ms for sword (faster than staff)
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Fade out and stretch the swing trail
            swingTrail.material.opacity = 0.6 * (1 - progress);
            swingTrail.scale.set(1 + progress, 1 + progress * 2, 1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove after animation completes
                this.scene.remove(swingTrail);
            }
        };
        
        animate();
    }
    
    createImpactEffect(position, radius) {
        // Create impact sphere
        const impactGeometry = new THREE.SphereGeometry(radius * 0.5, 16, 16);
        const impactMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.5,
            wireframe: true
        });
        
        const impact = new THREE.Mesh(impactGeometry, impactMaterial);
        impact.position.copy(position);
        
        this.scene.add(impact);
        
        // Add a point light for the impact flash
        const impactLight = new THREE.PointLight(0xff6600, 3, radius * 2);
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
            }
        };
        
        animate();
    }
    
    showSwordHitEffect(position) {
        // Create a simple hit effect for sword (sparks and impact)
        const particleCount = 10;
        const particles = [];
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            const size = Math.random() * 0.1 + 0.05;
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshBasicMaterial({
                color: Math.random() < 0.7 ? 0xffcc00 : 0xff6600,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Position at impact point
            particle.position.copy(position);
            
            // Add random velocity - more horizontal spread for sword
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 2,
                (Math.random() - 0.5) * 4
            );
            
            // Add to scene and array
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Add a flash light
        const flashLight = new THREE.PointLight(0xffcc00, 3, 3);
        flashLight.position.copy(position);
        this.scene.add(flashLight);
        
        // Animate the effect
        const duration = 0.5; // seconds
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Update each particle
            particles.forEach(particle => {
                // Apply velocity
                particle.position.x += particle.velocity.x * 0.016;
                particle.position.y += particle.velocity.y * 0.016;
                particle.position.z += particle.velocity.z * 0.016;
                
                // Apply gravity
                particle.velocity.y -= 9.8 * 0.016;
                
                // Fade out
                if (particle.material) {
                    particle.material.opacity = 0.8 * (1 - progress);
                }
                
                // Slow down particles
                particle.velocity.multiplyScalar(0.95);
            });
            
            // Fade light
            if (flashLight) {
                flashLight.intensity = 3 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                particles.forEach(particle => {
                    this.scene.remove(particle);
                    if (particle.geometry) particle.geometry.dispose();
                    if (particle.material) particle.material.dispose();
                });
                
                this.scene.remove(flashLight);
            }
        };
        
        animate();
    }
    
    // Add this new method for stronger hit effects
    showHitImpactEffect(position) {
        // Create a stronger impact effect when hitting enemies
        const particles = [];
        const particleCount = 15; // Number of particles to create
        
        // Create particle geometry and material
        for (let i = 0; i < particleCount; i++) {
            const size = Math.random() * 0.2 + 0.1;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(Math.random() < 0.7 ? 0xff6600 : 0xffcc00),
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Position at impact point
            particle.position.copy(position);
            
            // Add random velocity
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 5
            );
            
            // Add to scene
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Create a flash light at impact point
        const flashLight = new THREE.PointLight(0xff6600, 5, 4);
        flashLight.position.copy(position);
        this.scene.add(flashLight);
        
        // Animate particles and light
        const duration = 0.8; // seconds
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Update each particle
            particles.forEach(particle => {
                // Apply velocity with simulated gravity
                particle.position.x += particle.velocity.x * 0.016; // assume ~60fps
                particle.position.y += particle.velocity.y * 0.016;
                particle.position.z += particle.velocity.z * 0.016;
                
                // Apply gravity effect
                particle.velocity.y -= 9.8 * 0.016;
                
                // Fade out
                if (particle.material) {
                    particle.material.opacity = 0.8 * (1 - progress);
                }
                
                // Slow down particles over time (air resistance)
                particle.velocity.multiplyScalar(0.98);
            });
            
            // Fade out light
            if (flashLight) {
                flashLight.intensity = 5 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                particles.forEach(particle => {
                    this.scene.remove(particle);
                    if (particle.geometry) particle.geometry.dispose();
                    if (particle.material) particle.material.dispose();
                });
                
                this.scene.remove(flashLight);
            }
        };
        
        animate();
    }
    
    playAttackSound(hitTarget, weaponType) {
        // Create attack sound
        const attackSound = new Audio();
        
        // Different sounds for staff vs sword
        if (weaponType === "staff") {
            attackSound.src = hitTarget ? 
                'sounds/staff_attack_hit.mp3' : // Sound for hitting target
                'sounds/staff_attack_miss.mp3'; // Sound for missing
        } else if (weaponType === "sword") {
            attackSound.src = hitTarget ? 
                'sounds/sword_hit.mp3' : // Sound for sword hit
                'sounds/sword_swing.mp3'; // Sound for sword swing
        }
        
        attackSound.volume = 0.3;
        
        // Play attack sound
        attackSound.play().catch(error => {
            console.log('Audio playback failed:', error);
        });
    }
    
    animateStaffAttack() {
        // Don't animate if staff doesn't exist
        if (!this.player.magicStaff) return;
        
        // Get original position and rotation
        const originalOrbPosition = this.player.magicStaff.orbOffset.clone();
        
        // Forward thrust animation for the staff orb
        const thrust = () => {
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
        };
        
        // Start the animation
        thrust();
    }
    
    // Method to check if a weapon is ready
    isWeaponReady(weaponType) {
        if (weaponType === "staff") {
            return this.attackCooldown.staff <= 0;
        } else if (weaponType === "sword") {
            return this.attackCooldown.sword <= 0;
        }
        return false;
    }
}
