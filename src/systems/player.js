// Multi-Level Player Character System

class Player {
    constructor(scene, camera) {
        console.log('Initializing Multi-Level Player...');
        
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
        
        // Multi-level tracking
        this.currentLevel = 'TOP';
        this.dungeonSystem = null; // Will be set by game engine
        
        // Look controls
        this.pitch = 0;
        this.yaw = 0;
        this.mouseSensitivity = 0.002;
        this.maxPitch = Math.PI / 2 - 0.1;
        
        // Physics
        this.gravity = -20;
        this.groundY = 1.8;
        this.friction = 0.85;
        this.airFriction = 0.98;
        
        // Regeneration
        this.staminaRegenRate = 50; // per second
        this.manaRegenRate = 30;    // per second
        this.dashStaminaCost = 30;
        this.jumpStaminaCost = 20;
        
        // Interaction
        this.interactionRange = 3;
        
        // Level transition
        this.isFalling = false;
        this.fallTarget = null;
        
        this.init();
    }
    
    init() {
        this.camera.position.copy(this.position);
        console.log('Multi-Level Player initialized');
    }
    
    setDungeonSystem(dungeonSystem) {
        this.dungeonSystem = dungeonSystem;
        console.log('Player connected to dungeon system');
    }
    
    update(deltaTime, input) {
        this.handleInput(input, deltaTime);
        this.updateMovement(deltaTime);
        this.updateRegeneration(deltaTime);
        this.updateCamera();
        this.updateCooldowns(deltaTime);
        this.checkInteractions(input);
        this.checkLevelTransitions();
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
        if (input.justPressed.dash && this.dashCooldown <= 0 && this.stamina >= this.dashStaminaCost && this.isGrounded) {
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
        if (input.justPressed.attack) {
            console.log("Sword attack!");
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
        
        // Store previous position for collision rollback
        const previousPosition = this.position.clone();
        
        // Apply gravity
        if (!this.isGrounded && !this.isFalling) {
            this.velocity.y += this.gravity * deltaTime;
        }
        
        // Apply friction
        const frictionFactor = this.isGrounded ? this.friction : this.airFriction;
        this.velocity.x *= Math.pow(frictionFactor, deltaTime * 60);
        this.velocity.z *= Math.pow(frictionFactor, deltaTime * 60);
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Collision detection with dungeon
        if (this.dungeonSystem) {
            const collisionResult = this.dungeonSystem.checkCollision(this.position, this.velocity);
            
            if (collisionResult.collision) {
                // Push player away from walls
                this.position.copy(collisionResult.correctedPosition);
            }
            
            // Handle ground collision
            if (collisionResult.groundY !== null) {
                if (this.position.y <= collisionResult.groundY) {
                    this.position.y = collisionResult.groundY;
                    this.velocity.y = 0;
                    this.isGrounded = true;
                    this.isFalling = false;
                    
                    // Update current level
                    if (collisionResult.level !== this.currentLevel) {
                        this.currentLevel = collisionResult.level;
                        console.log(`Player moved to level: ${this.currentLevel}`);
                    }
                } else {
                    this.isGrounded = false;
                }
            } else {
                // No floor detected - might be falling through a hole
                this.isGrounded = false;
            }
        } else {
            // Fallback ground collision (for when dungeon system isn't available)
            if (this.position.y <= this.groundY) {
                this.position.y = this.groundY;
                this.velocity.y = 0;
                this.isGrounded = true;
                this.isFalling = false;
            } else {
                this.isGrounded = false;
            }
        }
        
        // Basic boundary collision (keep player in test area during development)
        const maxDistance = 60; // Larger boundary for multi-level dungeon
        if (this.position.x > maxDistance) {
            this.position.x = maxDistance;
            this.velocity.x = 0;
        }
        if (this.position.x < -maxDistance) {
            this.position.x = -maxDistance;
            this.velocity.x = 0;
        }
        if (this.position.z > maxDistance) {
            this.position.z = maxDistance;
            this.velocity.z = 0;
        }
        if (this.position.z < -maxDistance) {
            this.position.z = -maxDistance;
            this.velocity.z = 0;
        }
    }
    
    checkInteractions(input) {
        if (input.justPressed.interact && this.dungeonSystem) {
            const currentRoom = this.dungeonSystem.getRoomAt(this.position);
            
            if (currentRoom) {
                console.log(`Player interacting in room: ${currentRoom.id} on level: ${currentRoom.level || this.currentLevel}`);
                
                // Try to open holes in current room
                if (this.dungeonSystem.openLevelHole(currentRoom.id)) {
                    console.log(`Opened hole in room ${currentRoom.id}!`);
                } else {
                    console.log(`No holes to open in room ${currentRoom.id}`);
                }
            }
        }
    }
    
    checkLevelTransitions() {
        if (!this.dungeonSystem) return;
        
        const transition = this.dungeonSystem.checkLevelTransitions(this.position);
        
        if (transition) {
            if (transition.type === 'hole') {
                // Fall through hole to next level
                console.log(`Falling to level: ${transition.targetLevel}`);
                this.isFalling = true;
                this.fallTarget = transition.targetY;
                this.currentLevel = transition.targetLevel;
                
                // Add downward velocity for dramatic fall
                this.velocity.y = -15;
                
            } else if (transition.type === 'exit') {
                // Reached final exit
                console.log('Player reached final exit!');
                if (transition.nextFloor && window.game) {
                    window.game.advanceToNextFloor();
                }
            }
        }
        
        // Handle falling transition
        if (this.isFalling && this.fallTarget !== null) {
            if (this.position.y <= this.fallTarget) {
                this.position.y = this.fallTarget;
                this.velocity.y = 0;
                this.isGrounded = true;
                this.isFalling = false;
                this.fallTarget = null;
                console.log(`Landed on level: ${this.currentLevel}`);
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
    
    // Multi-level specific methods
    getCurrentLevel() {
        return this.currentLevel;
    }
    
    teleportToLevel(levelName, position = null) {
        if (!this.dungeonSystem || !this.dungeonSystem.levels[levelName]) {
            console.warn(`Invalid level: ${levelName}`);
            return false;
        }
        
        this.currentLevel = levelName;
        const levelY = this.dungeonSystem.levels[levelName].y;
        
        if (position) {
            this.position.copy(position);
            this.position.y = levelY + 1.8;
        } else {
            // Teleport to center of level
            this.position.set(0, levelY + 1.8, 0);
        }
        
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.isFalling = false;
        
        console.log(`Player teleported to level ${levelName} at Y=${levelY}`);
        return true;
    }
    
    isPlayerInRoom(roomId) {
        if (!this.dungeonSystem) return false;
        
        const currentRoom = this.dungeonSystem.getRoomAt(this.position);
        return currentRoom && currentRoom.id === roomId;
    }
    
    getDistanceToPoint(point) {
        return this.position.distanceTo(point);
    }
}

// Make Player available globally
window.Player = Player;
