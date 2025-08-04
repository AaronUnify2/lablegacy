// Player Character System

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
        this.groundY = 1.8;
        this.friction = 0.85;
        this.airFriction = 0.98;
        
        // Regeneration
        this.staminaRegenRate = 50; // per second
        this.manaRegenRate = 30;    // per second
        this.dashStaminaCost = 30;
        this.jumpStaminaCost = 20;
        
        this.init();
    }
    
    init() {
        this.camera.position.copy(this.position);
        console.log('Player initialized');
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
        
        // Apply gravity
        if (!this.isGrounded) {
            this.velocity.y += this.gravity * deltaTime;
        }
        
        // Apply friction
        const frictionFactor = this.isGrounded ? this.friction : this.airFriction;
        this.velocity.x *= Math.pow(frictionFactor, deltaTime * 60);
        this.velocity.z *= Math.pow(frictionFactor, deltaTime * 60);
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Ground collision (simple)
        if (this.position.y <= this.groundY) {
            this.position.y = this.groundY;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
        
        // Basic boundary collision (keep player in test area)
        const maxDistance = 60;
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
}

// Make Player available globally
window.Player = Player;
