// src/dungeon/walls.js - Fixed wall generation with proper corridor and room wall handling
import * as THREE from 'three';

export class WallBuilder {
    constructor(dungeon) {
        this.dungeon = dungeon;
        this.theme = dungeon.theme;
        this.wallMeshes = [];
        this.wallColliders = [];
        this.wallHeight = 3; // Standard wall height
        this.wallThickness = 0.5; // Standard wall thickness
        
        // Keep track of built walls to avoid duplicates
        this.builtWallSegments = new Map();
    }
    
    // Build all walls for the dungeon
    buildWalls() {
        console.log("Building walls for dungeon...");
        
        // Clear any previous walls
        this.wallMeshes = [];
        this.wallColliders = [];
        this.builtWallSegments.clear();
        
        // First, build exterior walls around the entire dungeon
        this.buildExteriorWalls();
        
        // Then, process rooms - but with improved logic
        this.dungeon.rooms.forEach(room => {
            this.buildRoomWalls(room);
        });
        
        // Finally, process corridors with special corridor logic
        this.dungeon.corridors.forEach(corridor => {
            this.buildCorridorWalls(corridor);
        });
        
        console.log(`Built ${this.wallMeshes.length} wall segments`);
        
        return {
            meshes: this.wallMeshes,
            colliders: this.wallColliders
        };
    }
    
    // Build exterior walls around the entire dungeon area
    buildExteriorWalls() {
        const size = this.dungeon.size;
        if (!size) return;
        
        const wallMaterial = new THREE.MeshLambertMaterial({
            color: this.theme.wallColor || 0x333333,
            map: this.theme.wallTexture
        });
        
        const wallY = this.wallHeight / 2;
        
        // North boundary wall
        this.buildWall(
            size.width / 2, wallY, -this.wallThickness / 2,
            size.width + this.wallThickness, this.wallHeight, this.wallThickness,
            wallMaterial, true, 'exterior-north'
        );
        
        // South boundary wall
        this.buildWall(
            size.width / 2, wallY, size.height + this.wallThickness / 2,
            size.width + this.wallThickness, this.wallHeight, this.wallThickness,
            wallMaterial, true, 'exterior-south'
        );
        
        // East boundary wall
        this.buildWall(
            size.width + this.wallThickness / 2, wallY, size.height / 2,
            this.wallThickness, this.wallHeight, size.height + this.wallThickness,
            wallMaterial, false, 'exterior-east'
        );
        
        // West boundary wall
        this.buildWall(
            -this.wallThickness / 2, wallY, size.height / 2,
            this.wallThickness, this.wallHeight, size.height + this.wallThickness,
            wallMaterial, false, 'exterior-west'
        );
    }
    
    // Build walls for a single room with improved passage detection
    buildRoomWalls(room) {
        if (room.isCorridor) return; // Skip corridors here, handle them separately
        
        const wallColor = this.theme.wallColor || 0x333333;
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: wallColor,
            map: this.theme.wallTexture 
        });
        
        const floorHeight = room.floorHeight || 0;
        const wallY = floorHeight + this.wallHeight / 2;
        
        // For each side of the room, check if there's a direct corridor connection
        const sides = [
            { name: 'north', x: room.x + room.width / 2, z: room.z, width: room.width, height: this.wallThickness },
            { name: 'south', x: room.x + room.width / 2, z: room.z + room.height, width: room.width, height: this.wallThickness },
            { name: 'east', x: room.x + room.width, z: room.z + room.height / 2, width: this.wallThickness, height: room.height },
            { name: 'west', x: room.x, z: room.z + room.height / 2, width: this.wallThickness, height: room.height }
        ];
        
        sides.forEach(side => {
            const hasConnection = this.hasDirectConnection(room, side.name);
            
            if (!hasConnection) {
                const wallId = `room-${side.name}-${room.x}-${room.z}-${room.width}-${room.height}`;
                
                if (!this.builtWallSegments.has(wallId)) {
                    // Adjust wall position based on side
                    let wallX = side.x;
                    let wallZ = side.z;
                    
                    if (side.name === 'north') wallZ -= this.wallThickness / 2;
                    if (side.name === 'south') wallZ -= this.wallThickness / 2;
                    if (side.name === 'east') wallX -= this.wallThickness / 2;
                    if (side.name === 'west') wallX += this.wallThickness / 2;
                    
                    this.buildWall(
                        wallX, wallY, wallZ,
                        side.width, this.wallHeight, side.height,
                        wallMaterial, side.name === 'north' || side.name === 'south', wallId
                    );
                    this.builtWallSegments.set(wallId, true);
                }
            }
        });
    }
    
    // Build walls for corridors with special logic
    buildCorridorWalls(corridor) {
        const wallColor = this.theme.wallColor || 0x333333;
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: wallColor,
            map: this.theme.wallTexture 
        });
        
        const floorHeight = corridor.floorHeight || 0;
        const wallY = floorHeight + this.wallHeight / 2;
        
        // Determine corridor orientation
        const isHorizontal = corridor.width > corridor.height;
        
        if (isHorizontal) {
            // Horizontal corridor - build north and south walls
            // North wall
            const northWallId = `corridor-north-${corridor.x}-${corridor.z}`;
            if (!this.builtWallSegments.has(northWallId)) {
                this.buildWall(
                    corridor.x + corridor.width / 2,
                    wallY,
                    corridor.z - this.wallThickness / 2,
                    corridor.width,
                    this.wallHeight,
                    this.wallThickness,
                    wallMaterial, true, northWallId
                );
                this.builtWallSegments.set(northWallId, true);
            }
            
            // South wall
            const southWallId = `corridor-south-${corridor.x}-${corridor.z}`;
            if (!this.builtWallSegments.has(southWallId)) {
                this.buildWall(
                    corridor.x + corridor.width / 2,
                    wallY,
                    corridor.z + corridor.height + this.wallThickness / 2,
                    corridor.width,
                    this.wallHeight,
                    this.wallThickness,
                    wallMaterial, true, southWallId
                );
                this.builtWallSegments.set(southWallId, true);
            }
        } else {
            // Vertical corridor - build east and west walls
            // East wall
            const eastWallId = `corridor-east-${corridor.x}-${corridor.z}`;
            if (!this.builtWallSegments.has(eastWallId)) {
                this.buildWall(
                    corridor.x + corridor.width + this.wallThickness / 2,
                    wallY,
                    corridor.z + corridor.height / 2,
                    this.wallThickness,
                    this.wallHeight,
                    corridor.height,
                    wallMaterial, false, eastWallId
                );
                this.builtWallSegments.set(eastWallId, true);
            }
            
            // West wall
            const westWallId = `corridor-west-${corridor.x}-${corridor.z}`;
            if (!this.builtWallSegments.has(westWallId)) {
                this.buildWall(
                    corridor.x - this.wallThickness / 2,
                    wallY,
                    corridor.z + corridor.height / 2,
                    this.wallThickness,
                    this.wallHeight,
                    corridor.height,
                    wallMaterial, false, westWallId
                );
                this.builtWallSegments.set(westWallId, true);
            }
        }
    }
    
    // Improved connection detection - check for direct corridor connections
    hasDirectConnection(room, direction) {
        const connectionTolerance = 2; // How close corridors need to be to count as connected
        
        for (const corridor of this.dungeon.corridors) {
            if (!corridor) continue;
            
            // Check if corridor directly connects to this side of the room
            switch (direction) {
                case 'north':
                    // Corridor should be above (north of) the room and overlap horizontally
                    if (corridor.z + corridor.height >= room.z - connectionTolerance &&
                        corridor.z + corridor.height <= room.z + connectionTolerance &&
                        corridor.x < room.x + room.width + connectionTolerance &&
                        corridor.x + corridor.width > room.x - connectionTolerance) {
                        return true;
                    }
                    break;
                    
                case 'south':
                    // Corridor should be below (south of) the room and overlap horizontally
                    if (corridor.z >= room.z + room.height - connectionTolerance &&
                        corridor.z <= room.z + room.height + connectionTolerance &&
                        corridor.x < room.x + room.width + connectionTolerance &&
                        corridor.x + corridor.width > room.x - connectionTolerance) {
                        return true;
                    }
                    break;
                    
                case 'east':
                    // Corridor should be to the right (east of) the room and overlap vertically
                    if (corridor.x >= room.x + room.width - connectionTolerance &&
                        corridor.x <= room.x + room.width + connectionTolerance &&
                        corridor.z < room.z + room.height + connectionTolerance &&
                        corridor.z + corridor.height > room.z - connectionTolerance) {
                        return true;
                    }
                    break;
                    
                case 'west':
                    // Corridor should be to the left (west of) the room and overlap vertically
                    if (corridor.x + corridor.width >= room.x - connectionTolerance &&
                        corridor.x + corridor.width <= room.x + connectionTolerance &&
                        corridor.z < room.z + room.height + connectionTolerance &&
                        corridor.z + corridor.height > room.z - connectionTolerance) {
                        return true;
                    }
                    break;
            }
        }
        
        // Also check for connections to other rooms (for alcoves, etc.)
        for (const otherRoom of this.dungeon.rooms) {
            if (otherRoom === room || otherRoom.isCorridor) continue;
            
            switch (direction) {
                case 'north':
                    if (otherRoom.z + otherRoom.height >= room.z - connectionTolerance &&
                        otherRoom.z + otherRoom.height <= room.z + connectionTolerance &&
                        otherRoom.x < room.x + room.width + connectionTolerance &&
                        otherRoom.x + otherRoom.width > room.x - connectionTolerance) {
                        return true;
                    }
                    break;
                    
                case 'south':
                    if (otherRoom.z >= room.z + room.height - connectionTolerance &&
                        otherRoom.z <= room.z + room.height + connectionTolerance &&
                        otherRoom.x < room.x + room.width + connectionTolerance &&
                        otherRoom.x + otherRoom.width > room.x - connectionTolerance) {
                        return true;
                    }
                    break;
                    
                case 'east':
                    if (otherRoom.x >= room.x + room.width - connectionTolerance &&
                        otherRoom.x <= room.x + room.width + connectionTolerance &&
                        otherRoom.z < room.z + room.height + connectionTolerance &&
                        otherRoom.z + otherRoom.height > room.z - connectionTolerance) {
                        return true;
                    }
                    break;
                    
                case 'west':
                    if (otherRoom.x + otherRoom.width >= room.x - connectionTolerance &&
                        otherRoom.x + otherRoom.width <= room.x + connectionTolerance &&
                        otherRoom.z < room.z + room.height + connectionTolerance &&
                        otherRoom.z + otherRoom.height > room.z - connectionTolerance) {
                        return true;
                    }
                    break;
            }
        }
        
        return false;
    }
    
    // Helper for building a single wall segment
    buildWall(x, y, z, width, height, depth, material, isHorizontal, wallId = null) {
        const wallGeometry = new THREE.BoxGeometry(width, height, depth);
        const wall = new THREE.Mesh(wallGeometry, material);
        
        wall.position.set(x, y, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        
        // Store wall ID for later reference
        if (wallId) {
            wall.userData.wallId = wallId;
        }
        
        this.wallMeshes.push(wall);
        
        // Add collider for the wall
        const collider = {
            min: new THREE.Vector3(
                x - width / 2,
                y - height / 2,
                z - depth / 2
            ),
            max: new THREE.Vector3(
                x + width / 2,
                y + height / 2,
                z + depth / 2
            ),
            wallId: wallId
        };
        
        this.wallColliders.push(collider);
        
        return wall;
    }
}
