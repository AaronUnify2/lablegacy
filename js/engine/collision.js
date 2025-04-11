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
                // For enemy cylinders, use cylinder-cylinder collision
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
                
                // Calculate cylinder radii - assuming enemy radius is 0.5
                const enemyRadius = 0.5;
                
                // If horizontal distance is less than sum of radii, we have a collision
                if (horizontalDistance < (radius + enemyRadius)) {
                    // Vertical check - player height is ~2.0 units, enemy height is ~1.8 units
                    // Only register collision if vertical positions overlap
                    const playerBottom = position.y - radius;
                    const playerTop = position.y + radius;
                    const enemyBottom = collider.minY;
                    const enemyTop = collider.maxY;
                    
                    // Check for vertical overlap
                    if (!(playerBottom > enemyTop || playerTop < enemyBottom)) {
                        return {
                            collides: true,
                            collider: collider,
                            isEnemy: true,
                            enemyCenter: cylinderCenter,
                            horizontalDistance: horizontalDistance
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
                // For enemy collisions, push the player back horizontally only
                // Calculate direction from enemy to player (horizontal only)
                const enemyCenter = collision.enemyCenter;
                
                // Create a horizontal push direction (ignore Y to prevent pushing through floor)
                const pushDirection = new THREE.Vector3(
                    position.x - enemyCenter.x,
                    0,  // Important: No vertical component
                    position.z - enemyCenter.z
                );
                
                // Normalize the direction vector
                if (pushDirection.lengthSq() === 0) {
                    // If directly on top of the enemy, push in a random direction
                    pushDirection.x = Math.random() - 0.5;
                    pushDirection.z = Math.random() - 0.5;
                }
                pushDirection.normalize();
                
                // Create a position that's pushed away from the enemy
                // Use a stronger push to ensure the player doesn't get stuck
                const pushDistance = radius + 0.7; // Extra margin to avoid getting stuck
                const resolvedPosition = new THREE.Vector3();
                
                // Calculate the push position - only X and Z components
                resolvedPosition.x = enemyCenter.x + pushDirection.x * pushDistance;
                resolvedPosition.y = position.y; // Keep the Y coordinate from original position
                resolvedPosition.z = enemyCenter.z + pushDirection.z * pushDistance;
                
                // Check if the resolved position would cause another collision
                const secondaryCollision = this.checkCollision(resolvedPosition, radius);
                if (secondaryCollision.collides) {
                    if (secondaryCollision.isEnemy) {
                        // If hitting another enemy, try an alternative direction
                        pushDirection.x = -pushDirection.x;
                        pushDirection.z = -pushDirection.z;
                        
                        resolvedPosition.x = enemyCenter.x + pushDirection.x * pushDistance;
                        resolvedPosition.z = enemyCenter.z + pushDirection.z * pushDistance;
                        
                        // Check one more time
                        if (this.checkCollision(resolvedPosition, radius).collides) {
                            // If still colliding, use the previous position as fallback
                            return previousPosition;
                        }
                    } else {
                        // If we hit a wall or other environment object
                        // Just use the previous position as fallback
                        return previousPosition;
                    }
                }
                
                return resolvedPosition;
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
