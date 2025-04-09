export class CollisionManager {
    constructor() {
        this.colliders = [];
    }
    
    addCollider(object, type = 'box') {
        // Extract position and size from the mesh
        // For basic box colliders
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        this.colliders.push({
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
        });
        
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
    
    resolveCollision(position, previousPosition, radius = 0.5) {
        // Simple collision resolution - push back to previous valid position
        const collision = this.checkCollision(position, radius);
        
        if (collision.collides) {
            // Calculate the collision normal and position adjustment
            return previousPosition;
        }
        
        return position;
    }
}
