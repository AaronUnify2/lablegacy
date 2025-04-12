export class CollisionManager {
    constructor() {
        this.colliders = [];
    }
    
    addCollider(object, type = 'box') {
        // Extract position and size from the mesh
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        const collider = {
            object,
            type,
            box,
            size,
            minX: box.min.x,
            maxX: box.max.x,
            minY: box.min.y,
            maxY: box.max.y,
            minZ: box.min.z,
            maxZ: box.max.z,
            // Add flag to identify enemy colliders
            isEnemy: object.userData ? object.userData.isEnemy : false
        };
        
        this.colliders.push(collider);
        return this.colliders.length - 1; // Return the index for reference
    }
    
    updateCollider(index) {
        if (index >= 0 && index < this.colliders.length) {
            const collider = this.colliders[index];
            const box = new THREE.Box3().setFromObject(collider.object);
            const size = new THREE.Vector3();
            box.getSize(size);
            
            collider.box = box;
            collider.size = size;
            collider.minX = box.min.x;
            collider.maxX = box.max.x;
            collider.minY = box.min.y;
            collider.maxY = box.max.y;
            collider.minZ = box.min.z;
            collider.maxZ = box.max.z;
        }
    }
    
    removeCollider(index) {
        if (index >= 0 && index < this.colliders.length) {
            this.colliders.splice(index, 1);
            return true;
        }
        return false;
    }
    
    // Check collision with option to ignore enemy colliders
    checkCollision(position, radius = 0.5, ignoreEnemies = false) {
        // Simple sphere-box collision check
        for (const collider of this.colliders) {
            // Skip enemy colliders if specified
            if (ignoreEnemies && collider.isEnemy) {
                continue;
            }
            
            // Special handling for cylinder-type colliders (enemies)
            if (collider.type === 'cylinder' && collider.isEnemy) {
                // For enemy cylinders, use improved cylinder-cylinder collision
                // Get the center of the enemy cylinder
                const cylinderCenter = new THREE.Vector3(
                    (collider.minX + collider.maxX) / 2,
                    (collider.minY + collider.maxY) / 2,
                    (collider.minZ + collider.maxZ) / 2
                );
                
                // Calculate horizontal distance (ignoring Y axis)
                const dx = position.x - cylinderCenter.x;
                const dz = position.z - cylinderCenter.z;
                const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
                
                // Calculate cylinder radii - using larger enemy radius to prevent player going under
                const enemyRadius = 0.8; // Increased from 0.5 to 0.8
                
                // If horizontal distance is less than sum of radii, we have a potential collision
                if (horizontalDistance < (radius + enemyRadius)) {
                    // Improved vertical check - use a more restrictive vertical collision area
                    // Player height is ~2.0 units, enemy height is ~1.8 units
                    
                    // Make vertical collision area larger than the actual models
                    const playerBottom = position.y - radius * 1.2; // Extend player collision area down
                    const playerTop = position.y + radius * 1.2; // Extend player collision area up
                    const enemyBottom = collider.minY - 0.2; // Extend enemy collision area down
                    const enemyTop = collider.maxY + 0.3; // Extend enemy collision area up more
                    
                    // Check for vertical overlap with the extended areas
                    if (!(playerBottom > enemyTop || playerTop < enemyBottom)) {
                        return {
                            collides: true,
                            collider: collider,
                            isEnemy: true
                        };
                    }
                }
            } else {
                // Regular box collision check for environment
                // Expand the box by the radius of the player's collision sphere
                const expandedMinX = collider.minX - radius;
                const expandedMaxX = collider.maxX + radius;
                const expandedMinY = collider.minY - radius;
                const expandedMaxY = collider.maxY + radius;
                const expandedMinZ = collider.minZ - radius;
                const expandedMaxZ = collider.maxZ + radius;
                
                // Check if position is inside the expanded box
                if (position.x >= expandedMinX && position.x <= expandedMaxX &&
                    position.y >= expandedMinY && position.y <= expandedMaxY &&
                    position.z >= expandedMinZ && position.z <= expandedMaxZ) {
                    return {
                        collides: true,
                        collider: collider,
                        isEnemy: false
                    };
                }
            }
        }
        
        return {
            collides: false,
            collider: null,
            isEnemy: false
        };
    }
    
    // Enhanced collision resolution for first-person mode
    resolveCollision(position, previousPosition, radius = 0.5) {
        const collision = this.checkCollision(position, radius);
        
        if (collision.collides) {
            // Special handling for enemy collisions
            if (collision.isEnemy) {
                // Calculate direction from enemy to player
                const enemyCenter = new THREE.Vector3(
                    (collision.collider.minX + collision.collider.maxX) / 2,
                    (collision.collider.minY + collision.collider.maxY) / 2,
                    (collision.collider.minZ + collision.collider.maxZ) / 2
                );
                
                // Get direction away from enemy
                const pushDirection = new THREE.Vector3()
                    .subVectors(position, enemyCenter)
                    .normalize();
                
                // Keep the y-component very small to prevent vertical pushing
                pushDirection.y = Math.min(Math.abs(pushDirection.y), 0.1) * Math.sign(pushDirection.y);
                pushDirection.normalize(); // Re-normalize after adjusting y
                
                // Create a position that's pushed away from the enemy
                // Use a stronger push to ensure the player doesn't get stuck
                const pushDistance = radius + 1.0; // Increased from 0.6 to 1.0 for stronger push
                const resolvedPosition = new THREE.Vector3()
                    .addVectors(enemyCenter, pushDirection.multiplyScalar(pushDistance));
                
                // Keep the Y coordinate closer to the original position
                // This is crucial to prevent pushing player through floor or up too high
                resolvedPosition.y = position.y * 0.9 + previousPosition.y * 0.1;
                
                // Add ground check to prevent pushing through floor
                // If we're too close to the ground, maintain minimum height
                const groundCheck = this.findFloorBelow(resolvedPosition, 2);
                if (groundCheck && groundCheck.point) {
                    const minHeightAboveGround = 1.0; // Minimum height to maintain above ground
                    if (resolvedPosition.y - groundCheck.point.y < minHeightAboveGround) {
                        resolvedPosition.y = groundCheck.point.y + minHeightAboveGround;
                    }
                }
                
                // NEW: Incremental collision checking to prevent going through walls
                // We'll test the new position in smaller steps to ensure we don't clip through walls
                const steps = 5; // Number of steps for testing
                let validPosition = previousPosition.clone();
                
                for (let i = 1; i <= steps; i++) {
                    // Interpolate between previous position and resolved position
                    const testPosition = new THREE.Vector3().lerpVectors(
                        previousPosition,
                        resolvedPosition,
                        i / steps
                    );
                    
                    // Check if this intermediate position collides with environment
                    // Important: We pass true to ignoreEnemies - we only care about walls here
                    const envCollision = this.checkCollision(testPosition, radius, true);
                    
                    if (!envCollision.collides) {
                        // This position is valid, update our best valid position
                        validPosition.copy(testPosition);
                    } else {
                        // We hit a wall, stop here and use the last valid position
                        console.log("Would clip through wall - using last valid position");
                        break;
                    }
                }
                
                // NEW: Final safety check - ensure we're not too close to any wall
                const wallSafetyDistance = radius * 1.1; // Slightly larger than player radius
                const directions = [
                    new THREE.Vector3(1, 0, 0),   // +X
                    new THREE.Vector3(-1, 0, 0),  // -X
                    new THREE.Vector3(0, 0, 1),   // +Z
                    new THREE.Vector3(0, 0, -1),  // -Z
                ];
                
                // Check in multiple directions to ensure we're not too close to any wall
                for (const dir of directions) {
                    const checkPoint = validPosition.clone().addScaledVector(dir, wallSafetyDistance);
                    const wallCheck = this.checkCollision(checkPoint, 0.1, true);
                    
                    if (wallCheck.collides) {
                        // We're too close to a wall in this direction, adjust position
                        const adjustment = dir.clone().multiplyScalar(-0.2); // Move away from wall slightly
                        validPosition.add(adjustment);
                    }
                }
                
                return validPosition;
            }
            
            // Calculate penetration depth along each axis
            const collider = collision.collider;
            
            // Find the smallest penetration and its axis
            const penetrations = [
                { axis: 'x+', value: collider.maxX + radius - position.x },
                { axis: 'x-', value: position.x - (collider.minX - radius) },
                { axis: 'y+', value: collider.maxY + radius - position.y },
                { axis: 'y-', value: position.y - (collider.minY - radius) },
                { axis: 'z+', value: collider.maxZ + radius - position.z },
                { axis: 'z-', value: position.z - (collider.minZ - radius) }
            ];
            
            // Filter out negative penetrations (no collision on that axis/direction)
            const validPenetrations = penetrations.filter(p => p.value >= 0);
            
            // Find the smallest penetration (easiest way to resolve the collision)
            const minPenetration = validPenetrations.reduce(
                (min, p) => p.value < min.value ? p : min, 
                { axis: 'none', value: Infinity }
            );
            
            // Create the resolved position
            const resolvedPosition = position.clone();
            
            // Resolve along the axis with smallest penetration
            switch (minPenetration.axis) {
                case 'x+':
                    resolvedPosition.x = collider.maxX + radius;
                    break;
                case 'x-':
                    resolvedPosition.x = collider.minX - radius;
                    break;
                case 'y+':
                    resolvedPosition.y = collider.maxY + radius;
                    break;
                case 'y-':
                    resolvedPosition.y = collider.minY - radius;
                    break;
                case 'z+':
                    resolvedPosition.z = collider.maxZ + radius;
                    break;
                case 'z-':
                    resolvedPosition.z = collider.minZ - radius;
                    break;
                default:
                    // Fallback to the previous position if something went wrong
                    return previousPosition;
            }
            
            // Check if the resolved position is still colliding
            if (this.checkCollision(resolvedPosition, radius).collides) {
                // If still colliding, use the previous position as a fallback
                return previousPosition;
            }
            
            return resolvedPosition;
        }
        
        // No collision, return the original position
        return position;
    }
    
    // Check if a ray intersects with any collider
    raycast(origin, direction, maxDistance = Infinity) {
        let closestHit = null;
        let closestDistance = maxDistance;
        
        // Create a ray for intersection testing
        const ray = new THREE.Ray(origin, direction.clone().normalize());
        
        for (const collider of this.colliders) {
            // Create a box from the collider for ray intersection
            const box = new THREE.Box3(
                new THREE.Vector3(collider.minX, collider.minY, collider.minZ),
                new THREE.Vector3(collider.maxX, collider.maxY, collider.maxZ)
            );
            
            // Test intersection
            const intersectionPoint = new THREE.Vector3();
            if (ray.intersectBox(box, intersectionPoint)) {
                // Calculate distance to intersection
                const distance = origin.distanceTo(intersectionPoint);
                
                // Check if this is the closest hit so far
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestHit = {
                        distance,
                        point: intersectionPoint.clone(),
                        collider
                    };
                }
            }
        }
        
        return closestHit;
    }
    
    // Find the floor beneath a position
    findFloorBelow(position, maxDistance = 50) {
        // Cast a ray downward to find the floor
        const origin = position.clone();
        const direction = new THREE.Vector3(0, -1, 0);
        
        return this.raycast(origin, direction, maxDistance);
    }
}
