// src/engine/physics.js - Enhanced physics system for first-person view
import * as THREE from 'three';

export class Physics {
    constructor() {
        this.gravity = -9.8; // Gravity constant
        this.colliders = []; // List of all colliders in the scene
        
        // First-person specific physics settings
        this.playerEyeHeight = 1.7; // Eye height above feet for first-person camera
        this.stepHeight = 0.3; // Maximum height player can step over
        this.slopeLimit = 45; // Maximum slope angle player can walk on (degrees)
        this.groundCheckDistance = 0.1; // Distance to check for ground below player
    }
    
    // Add a collider to the physics system
    addCollider(collider) {
        this.colliders.push(collider);
    }
    
    // Remove a collider from the physics system
    removeCollider(collider) {
        const index = this.colliders.indexOf(collider);
        if (index !== -1) {
            this.colliders.splice(index, 1);
        }
    }
    
    // Update physics (apply gravity, etc.)
    update(deltaTime) {
        // This is a simplified physics system - we'll primarily use it for collision detection
    }
    
    // Check for collisions between entities
    checkCollisions(player, entities, dungeon) {
        // Check player collision with dungeon walls and floors
        this.checkPlayerDungeonCollision(player, dungeon);
        
        // Check player collision with entities
        for (const entity of entities) {
            if (this.checkCollision(player.getCollider(), entity.getCollider())) {
                // Handle collision based on entity type
                if (entity.type === 'enemy') {
                    this.handleEnemyCollision(player, entity);
                } else if (entity.type === 'item') {
                    this.handleItemCollision(player, entity);
                }
            }
        }
    }
    
    // Enhanced player-dungeon collision detection for first-person view
    checkPlayerDungeonCollision(player, dungeon) {
        if (!dungeon) return;
        
        const playerCollider = player.getCollider();
        const dungeonColliders = dungeon.getColliders();
        
        // First determine the ground level beneath the player
        this.determineGroundLevel(player, dungeon);
        
        // Set a minimum ground level to ensure the player doesn't fall through floors
        const minGroundLevel = 0.02; // Raised minimum ground level
        if (player.getGroundLevel() < minGroundLevel) {
            player.setGroundLevel(minGroundLevel);
        }
        
        // Enhanced collision detection for first-person movement feel
        this.checkWallCollisions(player, dungeonColliders);
        this.checkStepCollisions(player, dungeonColliders);
        
        // Check if player is at exit
        const exitCollider = dungeon.getExitCollider();
        if (exitCollider && this.checkCollision(playerCollider, exitCollider)) {
            // Player is at exit, will be handled by Game class
        }
        
        // Check if player collects key
        const keyCollider = dungeon.getKeyCollider();
        if (keyCollider && !dungeon.isKeyCollected() && this.checkCollision(playerCollider, keyCollider)) {
            dungeon.collectKey();
        }
    }
    
    // Enhanced wall collision detection for first-person movement
    checkWallCollisions(player, dungeonColliders) {
        const playerCollider = player.getCollider();
        
        for (const wallCollider of dungeonColliders) {
            if (this.checkCollision(playerCollider, wallCollider)) {
                // Resolve collision with enhanced first-person feel
                this.resolveWallCollision(player, wallCollider);
            }
        }
    }
    
    // Check for step-able surfaces (stairs, small ledges)
    checkStepCollisions(player, dungeonColliders) {
        const playerPos = player.getPosition();
        const playerVel = player.getVelocity();
        
        // Only check for steps when moving horizontally
        if (Math.abs(playerVel.x) < 0.1 && Math.abs(playerVel.z) < 0.1) {
            return;
        }
        
        // Cast a ray forward to check for step-able obstacles
        const moveDirection = new THREE.Vector3(playerVel.x, 0, playerVel.z).normalize();
        const stepCheckOrigin = new THREE.Vector3(
            playerPos.x,
            playerPos.y + this.stepHeight,
            playerPos.z
        );
        
        // Check if there's a small obstacle we can step over
        for (const collider of dungeonColliders) {
            if (this.isSteppableCollision(stepCheckOrigin, moveDirection, collider)) {
                // Boost player slightly upward to step over obstacle
                player.position.y += this.stepHeight;
                break;
            }
        }
    }
    
    // Check if a collision is small enough to step over
    isSteppableCollision(origin, direction, collider) {
        // Simple check: if the obstacle is below step height, it's steppable
        const heightDiff = collider.max.y - origin.y;
        return heightDiff > 0 && heightDiff <= this.stepHeight;
    }
    
    // Determine the ground level for the player based on what room they're in
    determineGroundLevel(player, dungeon) {
        const playerPos = player.getPosition();
        const rooms = dungeon.getRooms();
        const corridors = dungeon.corridors || [];
        
        // For flat dungeon, always use ground level 2.0 as minimum
        let groundLevel = 0.02;
        
        // Check all rooms and corridors to find which one contains the player
        for (const space of [...rooms, ...corridors]) {
            if (playerPos.x >= space.x && playerPos.x <= space.x + space.width &&
                playerPos.z >= space.z && playerPos.z <= space.z + space.height) {
                
                // Found the room/corridor player is in - use a higher floor level
                groundLevel = Math.max(space.floorHeight + 2.0, 2.0);
                break;
            }
        }
        
        // Ensure the ground level is at least 2.0
        player.setGroundLevel(Math.max(groundLevel, 0.02));
    }
    
    // Check collision between two box colliders
    checkCollision(colliderA, colliderB) {
        // Simple AABB collision detection
        return (
            colliderA.min.x <= colliderB.max.x &&
            colliderA.max.x >= colliderB.min.x &&
            colliderA.min.y <= colliderB.max.y &&
            colliderA.max.y >= colliderB.min.y &&
            colliderA.min.z <= colliderB.max.z &&
            colliderA.max.z >= colliderB.min.z
        );
    }
    
    // Enhanced wall collision resolution for first-person movement
    resolveWallCollision(player, wallCollider) {
        const playerCollider = player.getCollider();
        const playerPosition = player.getPosition();
        const playerVelocity = player.getVelocity();
        
        // Calculate penetration depth in each axis
        const overlapX = Math.min(
            playerCollider.max.x - wallCollider.min.x,
            wallCollider.max.x - playerCollider.min.x
        );
        
        const overlapY = Math.min(
            playerCollider.max.y - wallCollider.min.y,
            wallCollider.max.y - playerCollider.min.y
        );
        
        const overlapZ = Math.min(
            playerCollider.max.z - wallCollider.min.z,
            wallCollider.max.z - playerCollider.min.z
        );
        
        // Find the minimum overlap
        const minOverlap = Math.min(overlapX, overlapY, overlapZ);
        
        // Enhanced resolution for first-person feel
        if (minOverlap === overlapX) {
            // Resolve X-axis collision with sliding
            this.resolveHorizontalCollision(player, wallCollider, 'x', overlapX);
        } else if (minOverlap === overlapY && !player.isJumping) {
            // Only resolve Y-axis when not in the middle of a jump
            this.resolveVerticalCollision(player, wallCollider, overlapY);
        } else if (minOverlap === overlapZ) {
            // Resolve Z-axis collision with sliding
            this.resolveHorizontalCollision(player, wallCollider, 'z', overlapZ);
        }
        
        // Update player position
        player.setPosition(playerPosition.x, playerPosition.y, playerPosition.z);
    }
    
    // Resolve horizontal collision with wall sliding for first-person movement
    resolveHorizontalCollision(player, wallCollider, axis, overlap) {
        const playerPosition = player.getPosition();
        const playerVelocity = player.getVelocity();
        const wallCenter = (wallCollider.min[axis] + wallCollider.max[axis]) / 2;
        
        // Determine which side of the wall the player is on
        if (playerPosition[axis] < wallCenter) {
            // Player is on the min side of the wall
            playerPosition[axis] = wallCollider.min[axis] - (playerPosition[axis] - playerPosition[axis] + overlap);
        } else {
            // Player is on the max side of the wall
            playerPosition[axis] = wallCollider.max[axis] + (playerPosition[axis] - playerPosition[axis] + overlap);
        }
        
        // Stop velocity in collision direction but allow sliding along the wall
        if (axis === 'x') {
            playerVelocity.x = 0;
            // Allow sliding along Z-axis for smooth wall sliding
            if (Math.abs(playerVelocity.z) > 0.1) {
                playerVelocity.z *= 0.8; // Slight friction but maintain some momentum
            }
        } else if (axis === 'z') {
            playerVelocity.z = 0;
            // Allow sliding along X-axis for smooth wall sliding
            if (Math.abs(playerVelocity.x) > 0.1) {
                playerVelocity.x *= 0.8; // Slight friction but maintain some momentum
            }
        }
    }
    
    // Resolve vertical collision (ceiling/floor)
    resolveVerticalCollision(player, wallCollider, overlap) {
        const playerPosition = player.getPosition();
        const playerVelocity = player.getVelocity();
        const wallCenterY = (wallCollider.min.y + wallCollider.max.y) / 2;
        
        if (playerPosition.y < wallCenterY) {
            // Player is below the wall (ceiling collision)
            playerPosition.y = wallCollider.min.y - (playerPosition.y - playerPosition.y + overlap);
            
            // If player was jumping, stop the jump
            if (player.isJumping || player.isFalling) {
                player.isFalling = true;
                playerVelocity.y = -0.1; // Start falling
            }
        } else {
            // Player is above the wall (floor collision)
            playerPosition.y = wallCollider.max.y;
            
            // If player was falling, they've landed
            if (player.isFalling) {
                player.isFalling = false;
                playerVelocity.y = 0;
                player.setGroundLevel(Math.max(playerPosition.y, 2.0)); // Ensure ground level is at least 2.0
            }
        }
    }
    
    // Handle collision with enemy (enhanced for first-person)
    handleEnemyCollision(player, enemy) {
        // If player is attacking, damage enemy
        if (player.isAttacking()) {
            enemy.takeDamage(player.getAttackDamage());
            
            // Show hit marker for first-person feedback
            if (window.showHitMarker) {
                window.showHitMarker();
            }
        } else {
            // Otherwise, player takes damage (with cooldown)
            player.takeDamage(enemy.getDamage());
        }
        
        // Push player away from enemy slightly (knockback)
        const playerPos = player.getPosition();
        const enemyPos = enemy.getPosition();
        
        const direction = new THREE.Vector3(
            playerPos.x - enemyPos.x,
            0,
            playerPos.z - enemyPos.z
        ).normalize();
        
        // Enhanced knockback for first-person feel
        player.applyKnockback(direction, 2.5); // Slightly stronger knockback for better feedback
    }
    
    // Handle collision with item
    handleItemCollision(player, item) {
        // Collect the item
        player.collectItem(item);
        
        // Remove item from the game
        item.collect();
    }
    
    // Enhanced raycast for first-person interaction
    raycast(origin, direction, maxDistance, objects) {
        const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
        const intersects = raycaster.intersectObjects(objects, true);
        
        if (intersects.length > 0) {
            return {
                hit: true,
                point: intersects[0].point,
                distance: intersects[0].distance,
                object: intersects[0].object,
                normal: intersects[0].face ? intersects[0].face.normal : new THREE.Vector3(0, 1, 0)
            };
        }
        
        return { hit: false };
    }
    
    // First-person specific: Check what the player is looking at
    checkPlayerLookTarget(player, camera, maxDistance = 10) {
        // Get camera world position and direction
        const cameraPosition = new THREE.Vector3();
        const cameraDirection = new THREE.Vector3();
        
        camera.getWorldPosition(cameraPosition);
        camera.getWorldDirection(cameraDirection);
        
        // Raycast from camera position in look direction
        const raycastResult = this.raycast(
            cameraPosition,
            cameraDirection,
            maxDistance,
            [] // Would be populated with interactable objects
        );
        
        return raycastResult;
    }
    
    // Check if player can interact with something they're looking at
    checkInteractionTarget(player, camera, interactables, maxDistance = 3) {
        const lookTarget = this.checkPlayerLookTarget(player, camera, maxDistance);
        
        if (lookTarget.hit) {
            // Check if the hit object is interactable
            for (const interactable of interactables) {
                if (interactable.mesh === lookTarget.object || 
                    interactable.mesh.children.includes(lookTarget.object)) {
                    return {
                        canInteract: true,
                        target: interactable,
                        distance: lookTarget.distance
                    };
                }
            }
        }
        
        return { canInteract: false };
    }
    
    // Enhanced ground check for first-person movement
    isGrounded(player, groundCheckDistance = null) {
        const checkDistance = groundCheckDistance || this.groundCheckDistance;
        const playerPos = player.getPosition();
        
        // Cast ray downward from player position
        const rayOrigin = new THREE.Vector3(playerPos.x, playerPos.y + 0.1, playerPos.z);
        const rayDirection = new THREE.Vector3(0, -1, 0);
        
        const groundCheck = this.raycast(rayOrigin, rayDirection, checkDistance + 0.2, []);
        
        return groundCheck.hit && groundCheck.distance <= checkDistance;
    }
    
    // Check if player can jump (enhanced for first-person)
    canJump(player) {
        return this.isGrounded(player) && !player.isJumping && !player.isFalling;
    }
    
    // Apply impulse force to player (for knockback, explosions, etc.)
    applyImpulse(player, force, direction) {
        const impulse = direction.clone().multiplyScalar(force);
        const velocity = player.getVelocity();
        
        velocity.add(impulse);
        
        // Cap maximum velocity to prevent physics breaking
        const maxVelocity = 20;
        velocity.clampLength(0, maxVelocity);
    }
    
    // Smooth camera bob effect for first-person walking
    calculateCameraBob(player, time, intensity = 0.02) {
        const velocity = player.getVelocity();
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        if (speed > 0.1 && this.isGrounded(player)) {
            // Walking bob effect
            const bobFrequency = speed * 0.5;
            const bobY = Math.sin(time * bobFrequency) * intensity;
            const bobX = Math.cos(time * bobFrequency * 0.5) * intensity * 0.3;
            
            return new THREE.Vector3(bobX, bobY, 0);
        }
        
        return new THREE.Vector3(0, 0, 0);
    }
    
    // Calculate landing impact for first-person camera shake
    calculateLandingImpact(player, previousY) {
        const currentY = player.getPosition().y;
        const fallDistance = previousY - currentY;
        
        if (fallDistance > 1.0 && this.isGrounded(player)) {
            // Calculate impact based on fall distance
            const impact = Math.min(fallDistance / 10, 1.0); // Normalize to 0-1
            return impact;
        }
        
        return 0;
    }
}
