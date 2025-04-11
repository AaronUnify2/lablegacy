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
            maxZ: box.max.z
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
    
    checkCollision(position, radius = 0.5) {
        // Simple sphere-box collision check
        for (const collider of this.colliders) {
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
                    collider: collider
                };
            }
        }
        
        return {
            collides: false,
            collider: null
        };
    }
    
    // Enhanced collision resolution for first-person mode
    resolveCollision(position, previousPosition, radius = 0.5) {
        const collision = this.checkCollision(position, radius);
        
        if (collision.collides) {
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
