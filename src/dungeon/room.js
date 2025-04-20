// src/dungeon/room.js - Room class for dungeon floor

import * as THREE from 'three';

export class Room {
    constructor(x, y, z, width, height) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.width = width;
        this.height = height;
        this.isCorridor = false;
        this.isSloped = false;
        this.isSpecial = false;
        this.roomType = 'normal'; // normal, treasure, boss, challenge
        this.entities = [];
        this.items = [];
        this.decorations = [];
        
        // For varying floor heights and elevation
        this.floorHeight = y;
        this.startHeight = y;
        this.endHeight = y;
    }
    
    // Check if a point is inside the room
    containsPoint(x, z) {
        return (
            x >= this.x && x < this.x + this.width &&
            z >= this.z && z < this.z + this.height
        );
    }
    
    // Check if this room overlaps with another
    overlaps(room) {
        return !(
            this.x + this.width < room.x ||
            this.x > room.x + room.width ||
            this.z + this.height < room.z ||
            this.z > room.z + room.height
        );
    }
    
    // Calculate the center of the room
    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.floorHeight,
            z: this.z + this.height / 2
        };
    }
    
    // Set the floor height of the room
    setFloorHeight(height) {
        this.floorHeight = height;
        this.y = height;
        this.startHeight = height;
        this.endHeight = height;
    }
    
    // Add an entity to the room
    addEntity(entity) {
        this.entities.push(entity);
    }
    
    // Add an item to the room
    addItem(item) {
        this.items.push(item);
    }
    
    // Add a decoration to the room
    addDecoration(decoration) {
        this.decorations.push(decoration);
    }
    
    // Set room as a special type
    setRoomType(type) {
        this.roomType = type;
        this.isSpecial = type !== 'normal';
    }
    
    // Create a collider for the room's walls
    getWallColliders() {
        // Create four wall colliders (north, south, east, west)
        const wallThickness = 1;
        
        return [
            // North wall
            {
                min: new THREE.Vector3(this.x, this.floorHeight, this.z),
                max: new THREE.Vector3(this.x + this.width, this.floorHeight + 3, this.z + wallThickness)
            },
            // South wall
            {
                min: new THREE.Vector3(this.x, this.floorHeight, this.z + this.height - wallThickness),
                max: new THREE.Vector3(this.x + this.width, this.floorHeight + 3, this.z + this.height)
            },
            // East wall
            {
                min: new THREE.Vector3(this.x + this.width - wallThickness, this.floorHeight, this.z),
                max: new THREE.Vector3(this.x + this.width, this.floorHeight + 3, this.z + this.height)
            },
            // West wall
            {
                min: new THREE.Vector3(this.x, this.floorHeight, this.z),
                max: new THREE.Vector3(this.x + wallThickness, this.floorHeight + 3, this.z + this.height)
            }
        ];
    }
    
    // Get floor collider
    getFloorCollider() {
        return {
            min: new THREE.Vector3(this.x, this.floorHeight - 0.1, this.z),
            max: new THREE.Vector3(this.x + this.width, this.floorHeight, this.z + this.height)
        };
    }
    
    // Get all colliders for this room
    getColliders() {
        return [...this.getWallColliders(), this.getFloorCollider()];
    }
}
