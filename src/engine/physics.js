// src/engine/physics.js - Simple physics and collision detection system
import * as THREE from 'three';

export class Physics {
    constructor() {
        this.gravity = -9.8; // Gravity constant
        this.colliders = []; // List of all colliders in the scene
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
    
    // Check if player is colliding with dungeon walls
    checkPlayerDungeonCollision(player, dungeon) {
        if (!dungeon) return;
        
        const playerCollider = player.getCollider();
        const dungeonColliders = dungeon.getColliders();
        
        // First determine the ground level beneath the player
        this.determineGroundLevel(player, dungeon);
        
        // Set a minimum ground level to ensure the player doesn't fall through floors
        const minGroundLevel = 1.0; // Raised minimum ground level
        if (player.getGroundLevel() < minGroundLevel) {
            player.setGroundLevel(minGroundLevel);
        }
        
        // Check for collisions with all dungeon colliders
        for (const wallCollider of dungeonColliders) {
            if (this.checkCollision(playerCollider, wallCollider)) {
                // Resolve collision by pushing player away from wall
                this.resolveCollision(player, wallCollider);
            }
        }
        
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
    
    // Determine the ground level for the player based on what room they're in
    determineGroundLevel(player, dungeon) {
        const playerPos = player.getPosition();
        const rooms = dungeon.getRooms();
        const corridors = dungeon.corridors || [];
        
        // For flat dungeon, always use ground level 2.0 as minimum
        let groundLevel = 0.01;
        
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
        player.setGroundLevel(Math.max(groundLevel, 2.0));
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
    
    // Resolve collision by adjusting player position
    resolveCollision(player, wallCollider) {
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
        
        // Resolve along the axis with the smallest penetration
        if (minOverlap === overlapX) {
            // Resolve X-axis collision
            if (playerPosition.x < wallCollider.min.x + (wallCollider.max.x - wallCollider.min.x) / 2) {
                // Player is to the left of the wall
                playerPosition.x = wallCollider.min.x - playerCollider.max.x + playerPosition.x;
            } else {
                // Player is to the right of the wall
                playerPosition.x = wallCollider.max.x - playerCollider.min.x + playerPosition.x;
            }
            // Stop velocity in X direction
            playerVelocity.x = 0;
        } else if (minOverlap === overlapY && !player.isJumping) {
            // Only resolve Y-axis when not in the middle of a jump
            if (playerPosition.y < wallCollider.min.y + (wallCollider.max.y - wallCollider.min.y) / 2) {
                // Player is below the wall (ceiling collision)
                playerPosition.y = wallCollider.min.y - (playerCollider.max.y - playerCollider.min.y);
                
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
        } else if (minOverlap === overlapZ) {
            // Resolve Z-axis collision
            if (playerPosition.z < wallCollider.min.z + (wallCollider.max.z - wallCollider.min.z) / 2) {
                // Player is in front of the wall
                playerPosition.z = wallCollider.min.z - playerCollider.max.z + playerPosition.z;
            } else {
                // Player is behind the wall
                playerPosition.z = wallCollider.max.z - playerCollider.min.z + playerPosition.z;
            }
            // Stop velocity in Z direction
            playerVelocity.z = 0;
        }
        
        // Update player position
        player.setPosition(playerPosition.x, playerPosition.y, playerPosition.z);
    }
    
    // Handle collision with enemy
    handleEnemyCollision(player, enemy) {
        // If player is attacking, damage enemy
        if (player.isAttacking()) {
            enemy.takeDamage(player.getAttackDamage());
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
        
        player.applyKnockback(direction, 2); // Knockback force of 2
    }
    
    // Handle collision with item
    handleItemCollision(player, item) {
        // Collect the item
        player.collectItem(item);
        
        // Remove item from the game
        item.collect();
    }
    
    // Cast a ray and check for intersection
    raycast(origin, direction, maxDistance, objects) {
        const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
        const intersects = raycaster.intersectObjects(objects, true);
        
        if (intersects.length > 0) {
            return {
                hit: true,
                point: intersects[0].point,
                distance: intersects[0].distance,
                object: intersects[0].object
            };
        }
        
        return { hit: false };
    }
}
