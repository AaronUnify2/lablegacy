// Player Character System with Collision Detection

class Player {
    constructor(scene, camera) {
        console.log('Initializing Player...');
        
        this.scene = scene;
        this.camera = camera;
        
        // Stats
        this.health = 100;
        this.maxHealth = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.mana = 100;
        this.maxMana = 100;
        
        // Movement
        this.position = new THREE.Vector3(0, 1.8, 0);
        this.velocity = new THREE.Vector3();
        this.moveSpeed = 5;
        this.dashSpeed = 12;
        this.jumpPower = 8;
        this.isGrounded = true;
        this.isDashing = false;
        this.dashCooldown = 0;
        
        // Look controls
        this.pitch = 0;
        this.yaw = 0;
        this.mouseSensitivity = 0.002;
        this.maxPitch = Math.PI / 2 - 0.1;
        
        // Physics
        this.gravity = -20;
        this.groundY = 0; // Will be updated based on dungeon floor
        this.friction = 0.85;
        this.airFriction = 0.98;
        
        // Collision
        this.radius = 0.5; // Increased collision radius slightly for better wall detection
        this.height = 1.8; // Player height
        this.dungeonSystem = null; // Will be set by game engine
        
        // Portal interaction
        this.lastPortalMessage = null;
        
        // Regeneration
        this.staminaRegenRate = 50; // per second
        this.manaRegenRate = 30;    // per second
        this.dashStaminaCost = 30;
        this.jumpStaminaCost = 20;
        
        // Weapon system
        this.sword = null;
        this.swordGroup = null;
        this.isAttacking = false;
        this.attackCooldown = 0;
        
        this.init();
    }
    
    init() {
        this.camera.position.copy(this.position);
        this.createSword();
        console.log('Player initialized with sword');
    }
    
    setDungeonSystem(dungeonSystem) {
        this.dungeonSystem = dungeonSystem;
        console.log('Player connected to dungeon system for collision detection');
    }
    
    createSword() {
        // Create sword group to hold all sword components
        this.swordGroup = new THREE.Group();
        this.swordGroup.name = 'player_sword';
        
        // Sword blade - long and sleek
        const bladeGeometry = new THREE.BoxGeometry(0.08, 1.2, 0.02);
        const bladeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xC0C0C0,
            emissive: 0x222222,
            emissiveIntensity: 0.1
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(0, 0.6, 0);
        blade.castShadow = true;
        this.swordGroup.add(blade);
        
        // Sword crossguard
        const crossguardGeometry = new THREE.BoxGeometry(0.3, 0.04, 0.04);
        const crossguardMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513,
            emissive: 0x4A2C1A,
            emissiveIntensity: 0.1
        });
        const crossguard = new THREE.Mesh(crossguardGeometry, crossguardMaterial);
        crossguard.position.set(0, 0, 0);
        crossguard.castShadow = true;
        this.swordGroup.add(crossguard);
        
        // Sword handle
        const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
        const handleMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x654321,
            emissive: 0x2A1810,
            emissiveIntensity: 0.1
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0, -0.125, 0);
        handle.castShadow = true;
        this.swordGroup.add(handle);
        
        // Sword pommel
        const pommelGeometry = new THREE.SphereGeometry(0.04, 8, 6);
        const pommelMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xB8860B,
            emissive: 0x5C430A,
            emissiveIntensity: 0.2
        });
        const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
        pommel.position.set(0, -0.25, 0);
        pommel.castShadow = true;
        this.swordGroup.add(pommel);
        
        // Position sword relative to camera (right hand position)
        this.swordGroup.position.set(0.3, -0.3, -0.5);
        this.swordGroup.rotation.set(0, 0, Math.PI / 6); // Slight angle
        
        // Add sword to camera so it moves with player view
        this.camera.add(this.swordGroup);
        
        // Store reference to blade for future hit detection
        this.sword = blade;
        
        console.log('Sword created and attached to player');
    }
    
    update(deltaTime, input) {
        this.handleInput(input, deltaTime);
        this.updateMovement(deltaTime);
        this.updateRegeneration(deltaTime);
        this.updateCamera();
        this.updateCooldowns(deltaTime);
    }
    
    handleInput(input, deltaTime) {
        // Mouse look (for desktop with pointer lock, or mobile with swipe)
        if (input.mouse.deltaX || input.mouse.deltaY) {
            this.yaw -= input.mouse.deltaX * this.mouseSensitivity;
            this.pitch -= input.mouse.deltaY * this.mouseSensitivity;
            this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
        }
        
        // Movement input
        const moveVector = new THREE.Vector3();
        
        if (input.moveForward) moveVector.z -= 1;
        if (input.moveBackward) moveVector.z += 1;
        if (input.moveLeft) moveVector.x -= 1;
        if (input.moveRight) moveVector.x += 1;
        
        // For mobile, also consider analog stick input
        if (inputState.isMobile && (Math.abs(input.axes.leftStickX) > 0.1 || Math.abs(input.axes.leftStickY) > 0.1)) {
            moveVector.x += input.axes.leftStickX;
            moveVector.z += input.axes.leftStickY;
        }
        
        // Normalize diagonal movement
        if (moveVector.length() > 0) {
            moveVector.normalize();
            
            // Apply rotation based on camera yaw
            const rotatedMove = moveVector.clone();
            rotatedMove.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
            
            // Determine speed
            let currentSpeed = this.moveSpeed;
            if (this.isDashing) {
                currentSpeed = this.dashSpeed;
            }
            
            // Apply movement
            this.velocity.x += rotatedMove.x * currentSpeed * deltaTime * 10;
            this.velocity.z += rotatedMove.z * currentSpeed * deltaTime * 10;
        }
        
        // Dashing
        if (input.justPressed.dash && this.dashCooldown <= 0 && this.stamina >= this.dashStaminaCost) {
            this.isDashing = true;
            this.dashCooldown = 1.0; // 1 second cooldown
            this.stamina -= this.dashStaminaCost;
            
            // Add dash impulse
            const dashDirection = new THREE.Vector3();
            if (input.moveForward) dashDirection.z -= 1;
            if (input.moveBackward) dashDirection.z += 1;
            if (input.moveLeft) dashDirection.x -= 1;
            if (input.moveRight) dashDirection.x += 1;
            
            if (dashDirection.length() === 0) {
                // Dash forward if no input
                dashDirection.z = -1;
            }
            
            dashDirection.normalize();
            dashDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
            
            this.velocity.x += dashDirection.x * this.dashSpeed * 2;
            this.velocity.z += dashDirection.z * this.dashSpeed * 2;
        }
        
        // Jumping
        if (input.justPressed.jump && this.isGrounded && this.stamina >= this.jumpStaminaCost) {
            this.velocity.y = this.jumpPower;
            this.isGrounded = false;
            this.stamina -= this.jumpStaminaCost;
        }
        
        // Handle other actions
        if (input.justPressed.interact) {
            console.log("Interact pressed!");
        }
        
        // Sword attack
        if (input.justPressed.attack && this.attackCooldown <= 0) {
            this.performSwordAttack();
        }
        
        if (input.justPressed.chargeAttack) {
            console.log("Staff attack!");
        }
        
        if (input.justPressed.menu) {
            console.log("Menu opened!");
        }
    }
    
    updateMovement(deltaTime) {
        // End dash after short duration
        if (this.isDashing) {
            // Dash lasts for 0.2 seconds
            if (this.dashCooldown < 0.8) {
                this.isDashing = false;
            }
        }
        
        // Apply gravity
        if (!this.isGrounded) {
            this.velocity.y += this.gravity * deltaTime;
        }
        
        // Apply friction
        const frictionFactor = this.isGrounded ? this.friction : this.airFriction;
        this.velocity.x *= Math.pow(frictionFactor, deltaTime * 60);
        this.velocity.z *= Math.pow(frictionFactor, deltaTime * 60);
        
        // Calculate new position
        const newPosition = this.position.clone();
        const deltaMovement = this.velocity.clone().multiplyScalar(deltaTime);
        
        // Handle collision detection if dungeon system is available
        if (this.dungeonSystem) {
            this.handleCollisionMovement(newPosition, deltaMovement);
        } else {
            // Fallback: just add movement without collision
            newPosition.add(deltaMovement);
            this.position.copy(newPosition);
        }
        
        // Ground and ceiling collision
        this.handleVerticalCollision();
    }
    
    handleCollisionMovement(newPosition, deltaMovement) {
        // Try X movement first
        const testPositionX = newPosition.clone();
        testPositionX.x += deltaMovement.x;
        
        if (this.isPositionValid(testPositionX)) {
            newPosition.x = testPositionX.x;
        } else {
            this.velocity.x = 0; // Stop horizontal movement if hitting wall
        }
        
        // Try Z movement
        const testPositionZ = newPosition.clone();
        testPositionZ.z += deltaMovement.z;
        
        if (this.isPositionValid(testPositionZ)) {
            newPosition.z = testPositionZ.z;
        } else {
            this.velocity.z = 0; // Stop horizontal movement if hitting wall
        }
        
        // Apply Y movement (will be handled by vertical collision)
        newPosition.y += deltaMovement.y;
        
        this.position.copy(newPosition);
    }
    
    isPositionValid(position) {
        if (!this.dungeonSystem) return true;
        
        // Check portal blocking first
        if (this.isBlockedByPortal(position)) {
            return false;
        }
        
        // Use a more conservative collision approach with additional boundary checks
        const checkRadius = this.radius * 1.1; // Slightly larger than actual radius
        
        // Check more points around the player's circular collision shape
        const checkPoints = [
            // Center
            { x: position.x, z: position.z },
            // Four cardinal directions (full radius + margin)
            { x: position.x + checkRadius, z: position.z },     // East
            { x: position.x - checkRadius, z: position.z },     // West
            { x: position.x, z: position.z + checkRadius },     // South
            { x: position.x, z: position.z - checkRadius },     // North
            // Four diagonal directions
            { x: position.x + checkRadius * 0.7, z: position.z + checkRadius * 0.7 },   // SE
            { x: position.x - checkRadius * 0.7, z: position.z + checkRadius * 0.7 },   // SW
            { x: position.x + checkRadius * 0.7, z: position.z - checkRadius * 0.7 },   // NE
            { x: position.x - checkRadius * 0.7, z: position.z - checkRadius * 0.7 },   // NW
            // Extra edge points for problematic directions (South and West)
            { x: position.x - checkRadius * 0.9, z: position.z },     // West edge
            { x: position.x, z: position.z + checkRadius * 0.9 },     // South edge
            { x: position.x - checkRadius * 0.8, z: position.z + checkRadius * 0.8 },   // SW additional
            // Additional fine-grained points for South/West problem areas
            { x: position.x - checkRadius * 0.95, z: position.z + checkRadius * 0.3 },
            { x: position.x - checkRadius * 0.95, z: position.z - checkRadius * 0.3 },
            { x: position.x - checkRadius * 0.3, z: position.z + checkRadius * 0.95 },
            { x: position.x + checkRadius * 0.3, z: position.z + checkRadius * 0.95 },
        ];
        
        // All check points must be in walkable areas
        for (const point of checkPoints) {
            // Use both methods for extra safety
            if (!this.dungeonSystem.isPositionWalkable(point.x, point.z) || 
                this.dungeonSystem.isPositionSolid(point.x, point.z)) {
                return false;
            }
        }
        
        return true;
    }
    
    isBlockedByPortal(position) {
        if (!this.dungeonSystem || !this.dungeonSystem.currentDungeonGroup) {
            return false;
        }
        
        let blocked = false;
        let blockingPortalType = null;
        
        // Find portal masks in the scene
        this.dungeonSystem.currentDungeonGroup.traverse((child) => {
            if (child.userData.portalType && child.userData.isBlocking) {
                const portalPos = child.position;
                
                // Check multiple points around the player to prevent slipping past
                const checkPoints = [
                    // Center position
                    position,
                    // Cardinal directions around player
                    new THREE.Vector3(position.x + 1, position.y, position.z),     // East
                    new THREE.Vector3(position.x - 1, position.y, position.z),     // West  
                    new THREE.Vector3(position.x, position.y, position.z + 1),     // South
                    new THREE.Vector3(position.x, position.y, position.z - 1),     // North
                    // Diagonal directions
                    new THREE.Vector3(position.x + 0.7, position.y, position.z + 0.7),   // SE
                    new THREE.Vector3(position.x - 0.7, position.y, position.z + 0.7),   // SW
                    new THREE.Vector3(position.x + 0.7, position.y, position.z - 0.7),   // NE
                    new THREE.Vector3(position.x - 0.7, position.y, position.z - 0.7),   // NW
                ];
                
                // Check if ANY point is too close to portal
                for (const checkPoint of checkPoints) {
                    const distance = checkPoint.distanceTo(portalPos);
                    
                    if (distance < 5.0) { // Large blocking radius
                        blocked = true;
                        blockingPortalType = child.userData.portalType;
                        
                        // Show appropriate message when player approaches blocked portal
                        if (distance < 6.0 && !this.lastPortalMessage) {
                            let message = "";
                            
                            if (blockingPortalType === 'entry') {
                                message = "The ancient mask blocks your retreat...";
                            } else if (blockingPortalType === 'exit') {
                                message = "The exit remains sealed until all enemies are defeated...";
                            } else if (blockingPortalType.includes('room_entrance')) {
                                const direction = child.userData.direction;
                                if (direction === 'north') {
                                    message = "The path north is open...";
                                } else {
                                    message = `Defeat enemies in previous rooms to unlock the ${direction} path...`;
                                }
                            }
                            
                            console.log(message);
                            this.lastPortalMessage = Date.now();
                        }
                        break; // Exit loop if blocked
                    }
                }
                
                if (blocked) return; // Exit traverse if blocked
            }
        });
        
        // Reset message timer
        if (Date.now() - (this.lastPortalMessage || 0) > 3000) {
            this.lastPortalMessage = null;
        }
        
        return blocked;
    }
    
    handleVerticalCollision() {
        // Ground collision
        const floorY = this.dungeonSystem ? this.dungeonSystem.getFloorHeight(this.position.x, this.position.z) : 0;
        
        if (this.position.y <= floorY + this.height) {
            this.position.y = floorY + this.height;
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
                this.isGrounded = true;
            }
        } else {
            this.isGrounded = false;
        }
        
        // Ceiling collision
        const ceilingY = this.dungeonSystem ? this.dungeonSystem.getCeilingHeight(this.position.x, this.position.z) : 20;
        
        if (this.position.y >= ceilingY) {
            this.position.y = ceilingY;
            if (this.velocity.y > 0) {
                this.velocity.y = 0; // Stop upward movement when hitting ceiling
            }
        }
    }
    
    updateRegeneration(deltaTime) {
        // Stamina regeneration
        if (this.stamina < this.maxStamina && !this.isDashing) {
            this.stamina = Math.min(this.maxStamina, 
                this.stamina + this.staminaRegenRate * deltaTime);
        }
        
        // Mana regeneration
        if (this.mana < this.maxMana) {
            this.mana = Math.min(this.maxMana, 
                this.mana + this.manaRegenRate * deltaTime);
        }
    }
    
    updateCooldowns(deltaTime) {
        if (this.dashCooldown > 0) {
            this.dashCooldown -= deltaTime;
        }
        
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
    }
    
    performSwordAttack() {
        if (this.isAttacking) return;
        
        this.isAttacking = true;
        this.attackCooldown = 0.6; // 600ms attack cooldown
        
        console.log('🗡️ Sword attack performed!');
        
        // Start sword swing animation
        this.animateSwordSwing();
        
        // Reset attack state after animation
        setTimeout(() => {
            this.isAttacking = false;
        }, 300); // 300ms attack duration
    }
    
    animateSwordSwing() {
        if (!this.swordGroup) return;
        
        // Store original rotation for reset
        const originalRotation = {
            x: this.swordGroup.rotation.x,
            y: this.swordGroup.rotation.y,
            z: this.swordGroup.rotation.z
        };
        
        // Quick swing animation using rotation
        const swingDuration = 300; // milliseconds
        const swingAmount = Math.PI / 3; // 60 degree swing
        const startTime = Date.now();
        
        const animateSwing = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / swingDuration, 1);
            
            // Swing motion - quick out, slower back
            let swingProgress;
            if (progress < 0.4) {
                // Fast swing out
                swingProgress = progress / 0.4;
            } else {
                // Slower return
                swingProgress = 1 - ((progress - 0.4) / 0.6);
            }
            
            // Apply swing rotation
            this.swordGroup.rotation.z = originalRotation.z + (Math.sin(swingProgress * Math.PI) * swingAmount);
            this.swordGroup.rotation.x = originalRotation.x + (Math.sin(swingProgress * Math.PI) * 0.3);
            
            if (progress < 1) {
                requestAnimationFrame(animateSwing);
            } else {
                // Reset to original position
                this.swordGroup.rotation.set(originalRotation.x, originalRotation.y, originalRotation.z);
            }
        };
        
        animateSwing();
    }
    
    updateCamera() {
        // Update camera position
        this.camera.position.copy(this.position);
        
        // Update camera rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        return this.health <= 0;
    }
    
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    consumeMana(amount) {
        if (this.mana >= amount) {
            this.mana -= amount;
            return true;
        }
        return false;
    }
}

// Make Player available globally
window.Player = Player;
