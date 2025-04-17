import { Enemy } from './enemy.js';

export class KingCylindar extends Enemy {
    constructor(scene, position, collisionManager, player) {
        // Call parent Enemy constructor
        super(scene, position, collisionManager, player);
        
        // Override default enemy settings
        this.health = 300;
        this.maxHealth = 300;
        this.moveSpeed = 0.5;
        this.turnSpeed = 1.0;
        this.attackDamage = 25;
        this.attackRange = 3;
        this.detectionRange = 25;
        this.collisionRadius = 1.5;
        this.isRangedAttacker = true;
        
        // Special King Cylindar properties
        this.isBoss = true;
        this.hasDroppedOrb = false;
        this.orbValue = 25; // Mana value when collected
        
        // State tracking
        this.state = 'idle';
        this.stateTime = 0;
        this.attackCooldown = 0;
        this.attackCooldownTime = 3; // Seconds between attacks
        this.phaseChangeHealth = 150; // Health threshold for phase 2
        this.currentPhase = 1;
        
        // Targeting properties
        this.lastKnownPlayerPosition = new THREE.Vector3();
        this.targetRotation = new THREE.Euler();
        
        // Create the 3D model
        this.createModel();
        
        // Initialize animations
        this.setupAnimations();
        
        // Set initial position
        this.group.position.copy(position);
        
        // For debugging
        this.debug = true;
        if (this.debug) console.log("King Cylindar spawned at", position);
    }
    
    createModel() {
        // Create main group to hold all meshes
        this.group = new THREE.Group();
        
        // Create material loader
        this.textureLoader = new THREE.TextureLoader();
        
        // Create geometries and materials
        this.createMainBody();
        this.createOrbRing();
        this.createEyes();
        
        // Add shadow casting
        this.setShadowProperties(this.bodyMesh);
        
        // Add to scene
        this.scene.add(this.group);
    }
    
    createMainBody() {
        // Main cylindrical body
        const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.5, 9, 32, 8);
        
        // Simpler material
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x885533, 
            metalness: 0.3,
            roughness: 0.7,
            emissive: 0x331100,
            emissiveIntensity: 0.2,
        });
        
        // Create the main body mesh
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.position.y = 4.5; // Offset to make bottom at y=0
        this.group.add(this.bodyMesh);
        
        // Add metal bands around the cylinder
        this.addMetalBands();
    }
    
    addMetalBands() {
        // Create metal band material
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xaa8866,
            metalness: 0.8,
            roughness: 0.3,
        });
        
        // Add several metal bands at different heights
        const bandHeights = [1, 3.5, 6, 8];
        const bandWidth = 0.3;
        
        bandHeights.forEach(height => {
            const bandGeometry = new THREE.TorusGeometry(1.55, bandWidth, 16, 32);
            const band = new THREE.Mesh(bandGeometry, metalMaterial);
            band.rotation.x = Math.PI / 2; // Rotate to wrap around cylinder
            band.position.y = height;
            this.bodyMesh.add(band);
            
            // Add rivets to bands
            this.addRivetsToBand(band, bandWidth);
        });
    }
    
    addRivetsToBand(band, bandWidth) {
        const rivetMaterial = new THREE.MeshStandardMaterial({
            color: 0xccbbaa,
            metalness: 0.9,
            roughness: 0.3
        });
        
        // Add rivets around the band
        const rivetCount = 8; // Reduced count
        const rivetRadius = bandWidth * 0.4;
        
        for (let i = 0; i < rivetCount; i++) {
            const angle = (i / rivetCount) * Math.PI * 2;
            const rivetGeometry = new THREE.SphereGeometry(rivetRadius, 8, 8);
            const rivet = new THREE.Mesh(rivetGeometry, rivetMaterial);
            
            // Position rivets on the band
            rivet.position.x = Math.cos(angle) * 1.55;
            rivet.position.z = Math.sin(angle) * 1.55;
            rivet.position.y = 0;
            
            band.add(rivet);
        }
    }
    
    createOrbRing() {
        // Create a ring of orbs around the center - simplified version
        const orbCount = 6; // Reduced count
        this.orbs = [];
        this.orbGroup = new THREE.Group();
        this.bodyMesh.add(this.orbGroup);
        
        // Position the orb group
        this.orbGroup.position.y = 4; // Middle of the body
        
        for (let i = 0; i < orbCount; i++) {
            const angle = (i / orbCount) * Math.PI * 2;
            
            // Create orb geometry
            const orbGeometry = new THREE.SphereGeometry(0.35, 16, 16);
            
            // Generate color based on position
            const hue = (i / orbCount) * 360;
            const color = new THREE.Color(`hsl(${hue}, 100%, 60%)`);
            
            // Create orb material
            const orbMaterial = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.8,
            });
            
            // Create orb mesh
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);
            
            // Position around in a circle
            const orbDistance = 2.2;
            orb.position.x = Math.cos(angle) * orbDistance;
            orb.position.z = Math.sin(angle) * orbDistance;
            
            // Store orb data for animation
            orb.userData.baseAngle = angle;
            
            // Add to group
            this.orbGroup.add(orb);
            this.orbs.push(orb);
            
            // Add a point light to each orb - using fewer lights for performance
            if (i % 2 === 0) {
                const orbLight = new THREE.PointLight(color, 1, 3);
                orbLight.position.copy(orb.position);
                orb.userData.light = orbLight;
                this.orbGroup.add(orbLight);
            }
        }
    }
    
    createEyes() {
        // Create eye group to hold all eye components
        this.eyeGroup = new THREE.Group();
        this.bodyMesh.add(this.eyeGroup);
        
        // Position eyes near the top of the cylinder
        this.eyeGroup.position.y = 7.5;
        
        // Create materials
        const eyeSocketMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.7,
            roughness: 0.2,
        });
        
        const eyeballMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.3
        });
        
        const irisMaterial = new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: 0xff0000,
            emissiveIntensity: 0.8
        });
        
        // Create left eye
        this.leftEyeSocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16),
            eyeSocketMaterial
        );
        this.leftEyeSocket.rotation.x = Math.PI / 2;
        this.leftEyeSocket.position.set(-0.8, 0, 1.3);
        this.eyeGroup.add(this.leftEyeSocket);
        
        this.leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            eyeballMaterial
        );
        this.leftEye.position.z = 0.1;
        this.leftEyeSocket.add(this.leftEye);
        
        this.leftIris = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            irisMaterial
        );
        this.leftIris.position.z = 0.2;
        this.leftEye.add(this.leftIris);
        
        // Create right eye
        this.rightEyeSocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16),
            eyeSocketMaterial
        );
        this.rightEyeSocket.rotation.x = Math.PI / 2;
        this.rightEyeSocket.position.set(0.8, 0, 1.3);
        this.eyeGroup.add(this.rightEyeSocket);
        
        this.rightEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            eyeballMaterial
        );
        this.rightEye.position.z = 0.1;
        this.rightEyeSocket.add(this.rightEye);
        
        this.rightIris = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            irisMaterial
        );
        this.rightIris.position.z = 0.2;
        this.rightEye.add(this.rightIris);
    }
    
    setupAnimations() {
        // Set up animation parameters for various parts - greatly simplified
        
        // Set up orb ring animation
        this.orbAnimParams = {
            rotationSpeed: 0.2,
        };
        
        // Set up eye animation
        this.eyeAnimParams = {
            blinkInterval: 5, // seconds between blinks
            blinkTime: 0, // current blink timer
            blinkDuration: 0.2, // how long a blink lasts
            isBlinking: false,
            lookSpeed: 0.5, // how fast eyes track player
            lookRange: 0.15 // how far eyes can rotate
        };
        
        // Attack animation parameters
        this.attackAnimParams = {
            chargeTime: 1.0, // seconds to charge attack
            fireTime: 0.5, // seconds for attack animation
            cooldownTime: 2.0, // seconds after attack before next one
            currentState: 'idle',
            timer: 0
        };
    }
    
    update(deltaTime, camera) {
        if (!this.group) return;
        
        // Update the parent class behavior
        super.update(deltaTime, camera);
        
        // Update animations
        this.updateAnimations(deltaTime);
        
        // Update AI state
        this.updateState(deltaTime);
        
        // Check for phase change
        this.checkPhaseChange();
    }
    
    updateAnimations(deltaTime) {
        // Update orb ring
        this.updateOrbRing(deltaTime);
        
        // Update eyes
        this.updateEyes(deltaTime);
    }
    
    updateOrbRing(deltaTime) {
        if (!this.orbGroup || !this.orbs) return;
        
        // Rotate the entire orb ring - simplified
        this.orbGroup.rotation.y += this.orbAnimParams.rotationSpeed * deltaTime;
    }
    
    updateEyes(deltaTime) {
        if (!this.leftEye || !this.rightEye) return;
        
        // Handle blinking
        this.eyeAnimParams.blinkTime += deltaTime;
        
        if (!this.eyeAnimParams.isBlinking && 
            this.eyeAnimParams.blinkTime >= this.eyeAnimParams.blinkInterval) {
            // Start a blink
            this.eyeAnimParams.isBlinking = true;
            this.eyeAnimParams.blinkTime = 0;
            
            // Scale eyes to simulate blink
            this.leftEye.scale.y = 0.1;
            this.rightEye.scale.y = 0.1;
        } else if (this.eyeAnimParams.isBlinking && 
                  this.eyeAnimParams.blinkTime >= this.eyeAnimParams.blinkDuration) {
            // End blink
            this.eyeAnimParams.isBlinking = false;
            
            // Reset eye scale
            this.leftEye.scale.y = 1;
            this.rightEye.scale.y = 1;
        }
        
        // Eye tracking - look at player if detected
        if (this.playerDetected && this.player) {
            // Calculate direction to player
            const toPlayer = new THREE.Vector3().subVectors(
                this.player.camera.position,
                this.group.position
            ).normalize();
            
            // Transform to local space
            const localToPlayer = toPlayer.clone().applyMatrix4(
                new THREE.Matrix4().copy(this.group.matrixWorld).invert()
            );
            
            // Calculate target eye rotation
            const targetEyeX = THREE.MathUtils.clamp(localToPlayer.y * 0.3, -this.eyeAnimParams.lookRange, this.eyeAnimParams.lookRange);
            const targetEyeY = THREE.MathUtils.clamp(localToPlayer.x * 0.3, -this.eyeAnimParams.lookRange, this.eyeAnimParams.lookRange);
            
            // Smoothly rotate eyes toward player
            this.leftEye.rotation.x += (targetEyeX - this.leftEye.rotation.x) * this.eyeAnimParams.lookSpeed * deltaTime;
            this.leftEye.rotation.y += (targetEyeY - this.leftEye.rotation.y) * this.eyeAnimParams.lookSpeed * deltaTime;
            
            this.rightEye.rotation.x += (targetEyeX - this.rightEye.rotation.x) * this.eyeAnimParams.lookSpeed * deltaTime;
            this.rightEye.rotation.y += (targetEyeY - this.rightEye.rotation.y) * this.eyeAnimParams.lookSpeed * deltaTime;
        } else {
            // Random idle eye movement
            const time = performance.now() * 0.001;
            
            this.leftEye.rotation.x = Math.sin(time * 0.5) * this.eyeAnimParams.lookRange * 0.3;
            this.leftEye.rotation.y = Math.cos(time * 0.7) * this.eyeAnimParams.lookRange * 0.3;
            
            this.rightEye.rotation.x = Math.sin(time * 0.5) * this.eyeAnimParams.lookRange * 0.3;
            this.rightEye.rotation.y = Math.cos(time * 0.7) * this.eyeAnimParams.lookRange * 0.3;
        }
    }
    
    updateState(deltaTime) {
        // Update state time
        this.stateTime += deltaTime;
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Process current state
        switch (this.state) {
            case 'idle':
                this.checkForPlayer();
                break;
                
            case 'patrol':
                this.patrolBehavior(deltaTime);
                this.checkForPlayer();
                break;
                
            case 'chase':
                this.chaseBehavior(deltaTime);
                this.tryAttack();
                break;
                
            case 'attack':
                this.attackBehavior(deltaTime);
                break;
                
            case 'stunned':
                if (this.stateTime > 3) {
                    this.state = 'chase';
                    this.stateTime = 0;
                }
                break;
                
            case 'dying':
                this.dyingBehavior(deltaTime);
                break;
                
            case 'dead':
                // Do nothing when dead
                break;
        }
    }
    
    checkForPlayer() {
        // Check if player is in detection range
        if (this.player && this.player.camera) {
            const distanceToPlayer = this.group.position.distanceTo(this.player.camera.position);
            
            // Player is within detection range
            if (distanceToPlayer < this.detectionRange) {
                // Check if we have line of sight
                if (this.hasLineOfSightToPlayer()) {
                    // Player detected, chase them
                    this.playerDetected = true;
                    this.lastKnownPlayerPosition.copy(this.player.camera.position);
                    
                    if (this.state !== 'chase' && this.state !== 'attack') {
                        this.state = 'chase';
                        this.stateTime = 0;
                    }
                    
                    return true;
                }
            }
            
            // Player not detected
            this.playerDetected = false;
            
            // If we were chasing but lost the player, patrol for a while
            if (this.state === 'chase') {
                this.state = 'patrol';
                this.stateTime = 0;
            }
        }
        
        return false;
    }
    
    hasLineOfSightToPlayer() {
        if (!this.player || !this.player.camera || !this.collisionManager) return false;
        
        // Calculate direction to player
        const playerPos = this.player.camera.position.clone();
        const cylindarPos = new THREE.Vector3(
            this.group.position.x,
            this.group.position.y + 4.5, // Eye level
            this.group.position.z
        );
        const direction = new THREE.Vector3().subVectors(playerPos, cylindarPos).normalize();
        
        // Set up raycaster
        const raycaster = new THREE.Raycaster(cylindarPos, direction);
        
        // Get all scene colliders except the enemy's own colliders
        const colliders = this.collisionManager.getColliderObjects().filter(obj => {
            return obj !== this.bodyMesh && obj.parent !== this.group;
        });
        
        // Cast ray
        const intersects = raycaster.intersectObjects(colliders, true);
        
        if (intersects.length > 0) {
            // Check if player is closer than the first hit
            const distanceToPlayer = cylindarPos.distanceTo(playerPos);
            const distanceToObstacle = intersects[0].distance;
            
            // Player is visible if they're closer than any obstacle
            return distanceToPlayer < distanceToObstacle;
        }
        
        // No obstacles between us and the player
        return true;
    }
    
    patrolBehavior(deltaTime) {
        // Simple patrol behavior
        // Move in a circle around the spawn point
        const patrolRadius = 5;
        const patrolSpeed = 0.5;
        
        // Calculate target position in patrol circle
        const angle = this.stateTime * patrolSpeed;
        const targetX = this.spawnPosition.x + Math.cos(angle) * patrolRadius;
        const targetZ = this.spawnPosition.z + Math.sin(angle) * patrolRadius;
        
        const targetPosition = new THREE.Vector3(targetX, this.group.position.y, targetZ);
        
        // Move toward target
        this.moveTowardPosition(targetPosition, deltaTime);
    }
    
    chaseBehavior(deltaTime) {
        // Chase the player
        if (this.playerDetected && this.player && this.player.camera) {
            // Update last known position
            this.lastKnownPlayerPosition.copy(this.player.camera.position);
        }
        
        // Move toward last known player position
        this.moveTowardPosition(this.lastKnownPlayerPosition, deltaTime);
        
        // If we're close enough, try to attack
        const distanceToTarget = this.group.position.distanceTo(this.lastKnownPlayerPosition);
        
        if (distanceToTarget <= this.attackRange) {
            // In range, try to attack if cooldown is ready
            if (this.attackCooldown <= 0) {
                this.state = 'attack';
                this.stateTime = 0;
                this.attackAnimParams.currentState = 'charging';
            }
        }
    }
    
    moveTowardPosition(position, deltaTime) {
        // Calculate direction to target
        const direction = new THREE.Vector3().subVectors(
            position,
            this.group.position
        ).normalize();
        
        // Calculate target rotation based on direction
        this.targetRotation = new THREE.Euler(0, Math.atan2(direction.x, direction.z), 0);
        
        // Smoothly rotate toward target
        this.smoothRotate(deltaTime);
        
        // Move forward based on current rotation
        const moveSpeed = this.moveSpeed * deltaTime;
        const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.group.rotation);
        
        // Apply movement
        const newPosition = this.group.position.clone().addScaledVector(forward, moveSpeed);
        
        // Check for collision before moving
        if (this.collisionManager) {
            const collision = this.collisionManager.checkCollision(
                newPosition, 
                this.collisionRadius
            );
            
            if (!collision.collides) {
                // Move to new position if no collision
                this.group.position.copy(newPosition);
            }
        } else {
            // No collision manager, just move
            this.group.position.copy(newPosition);
        }
    }
    
    smoothRotate(deltaTime) {
        // Smoothly interpolate current rotation toward target rotation
        const step = this.turnSpeed * deltaTime;
        
        // Get current y rotation
        const currentY = this.group.rotation.y;
        let targetY = this.targetRotation.y;
        
        // Handle the discontinuity at +/-PI
        if (Math.abs(targetY - currentY) > Math.PI) {
            if (targetY > currentY) {
                targetY -= Math.PI * 2;
            } else {
                targetY += Math.PI * 2;
            }
        }
        
        // Interpolate
        const newY = currentY + THREE.MathUtils.clamp(targetY - currentY, -step, step);

        // Apply rotation
        this.group.rotation.y = newY;
    }
    
    tryAttack() {
        // Try to attack the player if in range and cooldown is ready
        if (this.attackCooldown <= 0 && this.playerDetected) {
            const distanceToPlayer = this.group.position.distanceTo(this.player.camera.position);
            
            if (distanceToPlayer <= this.attackRange) {
                this.state = 'attack';
                this.stateTime = 0;
                this.attackAnimParams.currentState = 'charging';
            }
        }
    }
    
    attackBehavior(deltaTime) {
        // Handle attack sequence
        switch (this.attackAnimParams.currentState) {
            case 'charging':
                // Charging attack
                if (this.stateTime >= this.attackAnimParams.chargeTime) {
                    // Fire attack
                    this.attackAnimParams.currentState = 'firing';
                    this.stateTime = 0;
                    this.fireAttack();
                }
                break;
                
            case 'firing':
                // Attack is firing
                if (this.stateTime >= this.attackAnimParams.fireTime) {
                    // Attack finished, go to cooldown
                    this.attackAnimParams.currentState = 'cooldown';
                    this.stateTime = 0;
                }
                break;
                
            case 'cooldown':
                // Cooldown after attack
                if (this.stateTime >= this.attackAnimParams.cooldownTime) {
                    // Cooldown finished, go back to chase
                    this.state = 'chase';
                    this.stateTime = 0;
                    this.attackCooldown = this.attackCooldownTime;
                }
                break;
        }
    }
    
    fireAttack() {
        // Fire the charged attack
        if (!this.player || !this.player.camera) return;
        
        // Get the attack target position - the player's current position
        const targetPosition = this.player.camera.position.clone();
        
        // Calculate direction to target
        const startPosition = new THREE.Vector3();
        this.bodyMesh.getWorldPosition(startPosition);
        startPosition.y += 4.5; // Eye level
        
        // Create simple attack visual
        this.createSimpleAttackEffect(startPosition, targetPosition);
        
        // Apply damage to player if in range
        const distanceToPlayer = startPosition.distanceTo(targetPosition);
        
        if (distanceToPlayer <= this.attackRange * 1.5) { // Slightly generous range
            // Deal damage to player
            if (this.player.takeDamage) {
                this.player.takeDamage(this.attackDamage);
            }
        }
    }
    
    createSimpleAttackEffect(start, end) {
        // Create simplified beam effect
        const distance = start.distanceTo(end);
        const beamGeometry = new THREE.CylinderGeometry(0.2, 0.5, distance, 8, 1);
        
        // Rotate to point from start to end
        beamGeometry.rotateX(Math.PI / 2);
        
        // Create beam material
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.7
        });
        
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        
        // Position beam
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        beam.position.copy(midpoint);
        
        // Orient beam
        beam.lookAt(end);
        
        // Add to scene
        this.scene.add(beam);
        
        // Simple fade out animation
        const duration = 0.5;
        const startTime = performance.now() * 0.001;
        
        const animate = () => {
            const currentTime = performance.now() * 0.001;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Fade out
            beam.material.opacity = 0.7 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove beam
                this.scene.remove(beam);
                beam.material.dispose();
                beam.geometry.dispose();
            }
        };
        
        animate();
    }
    
    checkPhaseChange() {
        // Check for phase transition based on health
        if (this.currentPhase === 1 && this.health <= this.phaseChangeHealth) {
            this.currentPhase = 2;
            this.transitionToPhaseTwo();
        }
    }
    
    transitionToPhaseTwo() {
        // Transition to more aggressive second phase
        if (this.debug) console.log("King Cylindar transitioning to phase two!");
        
        // Increase attributes
        this.moveSpeed *= 1.3;
        this.attackRange *= 1.2;
        this.attackDamage *= 1.25;
        this.attackCooldownTime *= 0.7; // Faster attacks
        
        // Visual changes
        this.applyPhaseTwoVisuals();
        
        // Force attack after phase change
        this.state = 'attack';
        this.stateTime = 0;
        this.attackAnimParams.currentState = 'charging';
    }
    
    applyPhaseTwoVisuals() {
        // Change eye color to red
        if (this.leftIris && this.rightIris) {
            this.leftIris.material.color.setHex(0xff0000);
            this.leftIris.material.emissive.setHex(0xff0000);
            this.rightIris.material.color.setHex(0xff0000);
            this.rightIris.material.emissive.setHex(0xff0000);
        }
        
        // Change orb colors to more intense
        if (this.orbs) {
            this.orbs.forEach(orb => {
                // Get current HSL
                const color = orb.material.color;
                const hsl = {};
                color.getHSL(hsl);
                
                // Increase saturation and brightness
                color.setHSL(hsl.h, 1.0, 0.7);
                
                // Update color for light too
                if (orb.userData.light) {
                    orb.userData.light.color = color.clone();
                }
            });
        }
    }
    
    // Called when the enemy is damaged
    takeDamage(amount) {
        if (this.state === 'dead') return false;
        
        // Apply damage
        this.health -= amount;
        
        // Check for death
        if (this.health <= 0) {
            this.health = 0;
            this.state = 'dying';
            this.stateTime = 0;
            if (this.debug) console.log("King Cylindar killed!");
            return true;
        }
        
        // Apply simple hit effect
        this.createSimpleHitEffect();
        
        // Check for phase change
        this.checkPhaseChange();
        
        return false; // Not killed
    }
    
    createSimpleHitEffect() {
        // Visual effect for taking damage
        
        // Flash the whole body
        if (this.bodyMesh && this.bodyMesh.material) {
            const originalColor = this.bodyMesh.material.color.clone();
            const originalEmissive = this.bodyMesh.material.emissive.clone();
            // Flash white
            this.bodyMesh.material.color.setHex(0xffffff);
            this.bodyMesh.material.emissive.setHex(0xffffff);
            this.bodyMesh.material.emissiveIntensity = 0.5;
            
            // Return to original after short delay
            setTimeout(() => {
                if (this.bodyMesh && this.bodyMesh.material) {
                    this.bodyMesh.material.color.copy(originalColor);
                    this.bodyMesh.material.emissive.copy(originalEmissive);
                    this.bodyMesh.material.emissiveIntensity = 0.2;
                }
            }, 100);
        }
    }
    
    dyingBehavior(deltaTime) {
        // Handle death animation - simplified
        if (this.stateTime > 3) {
            // After 3 seconds, transition to dead state
            this.state = 'dead';
            
            // Drop orb if not already dropped
            if (!this.hasDroppedOrb) {
                this.dropOrb();
            }
            
            // Remove from scene after some time
            setTimeout(() => {
                if (this.scene && this.group) {
                    this.scene.remove(this.group);
                }
            }, 5000);
            
            return;
        }
        
        // Simple death animation
        // Make cylinder wobble/shake
        this.group.position.x += (Math.random() - 0.5) * 0.1;
        this.group.position.z += (Math.random() - 0.5) * 0.1;
    }
    
    dropOrb() {
        if (this.hasDroppedOrb) return;
        this.hasDroppedOrb = true;
        
        // Create a collectible orb
        const orbGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const orbMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366ff,
            emissive: 0x3366ff,
            emissiveIntensity: 1.0,
            metalness: 0.3,
            roughness: 0.4
        });
        
        this.droppedOrb = new THREE.Mesh(orbGeometry, orbMaterial);
        
        // Position at center of body
        const centerPosition = new THREE.Vector3();
        this.bodyMesh.getWorldPosition(centerPosition);
        
        this.droppedOrb.position.copy(centerPosition);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.droppedOrb.add(glow);
        
        // Add light
        const orbLight = new THREE.PointLight(0x3366ff, 1.5, 5);
        this.droppedOrb.add(orbLight);
        
        // Add to scene
        this.scene.add(this.droppedOrb);
        
        // Store orb data
        this.droppedOrb.userData = {
            type: 'manaOrb',
            value: this.orbValue,
            floatHeight: 0,
            floatSpeed: 1.0,
            rotationSpeed: 0.5,
            glowPulseSpeed: 0.7
        };
        
        // Make orb float with simple animation
        const startTime = performance.now() * 0.001;
        
        const animateOrb = () => {
            if (!this.droppedOrb) return;
            
            const time = performance.now() * 0.001;
            const elapsed = time - startTime;
            
            // Float up and down
            this.droppedOrb.position.y = centerPosition.y + Math.sin(elapsed * this.droppedOrb.userData.floatSpeed) * 0.3 + 0.5;
            
            // Rotate
            this.droppedOrb.rotation.y += this.droppedOrb.userData.rotationSpeed * 0.01;
            
            requestAnimationFrame(animateOrb);
        };
        
        animateOrb();
    }
    
    // Helper method to set shadow properties for a mesh
    setShadowProperties(mesh) {
        if (!mesh) return;
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Also apply to children
        mesh.children.forEach(child => {
            child.castShadow = true;
            child.receiveShadow = true;
        });
    }
}
