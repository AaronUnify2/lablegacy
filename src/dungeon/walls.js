// src/dungeon/walls.js - Fixed wall generation with proper corridor and room wall handling
import * as THREE from 'three';

export class WallBuilder {
    constructor(dungeon) {
        this.dungeon = dungeon;
        this.theme = dungeon.theme;
        this.wallMeshes = [];
        this.wallColliders = [];
        this.wallHeight = 3.0; // Increased wall height for better visibility
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
    
    // Build exterior walls around the actual dungeon bounds
    buildExteriorWalls() {
        // Calculate the actual bounds of all rooms and corridors
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        
        // Check all rooms and corridors to find actual bounds
        const allSpaces = [...this.dungeon.rooms, ...this.dungeon.corridors];
        
        if (allSpaces.length === 0) return; // No spaces to enclose
        
        allSpaces.forEach(space => {
            if (!space) return;
            minX = Math.min(minX, space.x);
            maxX = Math.max(maxX, space.x + space.width);
            minZ = Math.min(minZ, space.z);
            maxZ = Math.max(maxZ, space.z + space.height);
        });
        
        // Add some padding around the bounds
        const padding = 5;
        minX -= padding;
        maxX += padding;
        minZ -= padding;
        maxZ += padding;
        
        const wallMaterial = new THREE.MeshLambertMaterial({
            color: this.theme.wallColor || 0x333333,
            map: this.theme.wallTexture
        });
        
        const wallY = this.wallHeight / 2;
        const boundWidth = maxX - minX;
        const boundHeight = maxZ - minZ;
        
        // North boundary wall
        this.buildWall(
            minX + boundWidth / 2, wallY, minZ - this.wallThickness / 2,
            boundWidth + this.wallThickness, this.wallHeight, this.wallThickness,
            wallMaterial, true, 'exterior-north'
        );
        
        // South boundary wall
        this.buildWall(
            minX + boundWidth / 2, wallY, maxZ + this.wallThickness / 2,
            boundWidth + this.wallThickness, this.wallHeight, this.wallThickness,
            wallMaterial, true, 'exterior-south'
        );
        
        // East boundary wall
        this.buildWall(
            maxX + this.wallThickness / 2, wallY, minZ + boundHeight / 2,
            this.wallThickness, this.wallHeight, boundHeight + this.wallThickness,
            wallMaterial, false, 'exterior-east'
        );
        
        // West boundary wall
        this.buildWall(
            minX - this.wallThickness / 2, wallY, minZ + boundHeight / 2,
            this.wallThickness, this.wallHeight, boundHeight + this.wallThickness,
            wallMaterial, false, 'exterior-west'
        );
        
        console.log(`Built exterior walls - bounds: X(${minX.toFixed(1)} to ${maxX.toFixed(1)}), Z(${minZ.toFixed(1)} to ${maxZ.toFixed(1)})`);
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
        
        // Build walls for each side of the room if no connection exists
        this.buildRoomSideWall(room, 'north', wallMaterial, wallY);
        this.buildRoomSideWall(room, 'south', wallMaterial, wallY);
        this.buildRoomSideWall(room, 'east', wallMaterial, wallY);
        this.buildRoomSideWall(room, 'west', wallMaterial, wallY);
    }
    
    // Build a wall on a specific side of a room if no connection exists
    buildRoomSideWall(room, side, wallMaterial, wallY) {
        const hasConnection = this.hasDirectConnection(room, side);
        
        if (!hasConnection) {
            const wallId = `room-${side}-${room.x.toFixed(1)}-${room.z.toFixed(1)}-${room.width}-${room.height}`;
            
            if (!this.builtWallSegments.has(wallId)) {
                let wallX, wallZ, wallWidth, wallDepth;
                
                switch (side) {
                    case 'north':
                        wallX = room.x + room.width / 2;
                        wallZ = room.z - this.wallThickness / 2;
                        wallWidth = room.width;
                        wallDepth = this.wallThickness;
                        break;
                    case 'south':
                        wallX = room.x + room.width / 2;
                        wallZ = room.z + room.height + this.wallThickness / 2;
                        wallWidth = room.width;
                        wallDepth = this.wallThickness;
                        break;
                    case 'east':
                        wallX = room.x + room.width + this.wallThickness / 2;
                        wallZ = room.z + room.height / 2;
                        wallWidth = this.wallThickness;
                        wallDepth = room.height;
                        break;
                    case 'west':
                        wallX = room.x - this.wallThickness / 2;
                        wallZ = room.z + room.height / 2;
                        wallWidth = this.wallThickness;
                        wallDepth = room.height;
                        break;
                }
                
                this.buildWall(
                    wallX, wallY, wallZ,
                    wallWidth, this.wallHeight, wallDepth,
                    wallMaterial, side === 'north' || side === 'south', wallId
                );
                this.builtWallSegments.set(wallId, true);
            }
        }
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
            const northWallId = `corridor-north-${corridor.x.toFixed(1)}-${corridor.z.toFixed(1)}`;
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
            const southWallId = `corridor-south-${corridor.x.toFixed(1)}-${corridor.z.toFixed(1)}`;
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
            const eastWallId = `corridor-east-${corridor.x.toFixed(1)}-${corridor.z.toFixed(1)}`;
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
            const westWallId = `corridor-west-${corridor.x.toFixed(1)}-${corridor.z.toFixed(1)}`;
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
        const connectionTolerance = 3; // Increased tolerance for better connection detection
        
        // Check connections to corridors
        for (const corridor of this.dungeon.corridors) {
            if (!corridor) continue;
            
            if (this.roomConnectsToCorridorOnSide(room, corridor, direction, connectionTolerance)) {
                return true;
            }
        }
        
        // Check connections to other rooms (for alcoves, etc.)
        for (const otherRoom of this.dungeon.rooms) {
            if (otherRoom === room || otherRoom.isCorridor) continue;
            
            if (this.roomConnectsToRoomOnSide(room, otherRoom, direction, connectionTolerance)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Check if a room connects to a corridor on a specific side
    roomConnectsToCorridorOnSide(room, corridor, direction, tolerance) {
        switch (direction) {
            case 'north':
                // Corridor should be north of the room and overlap horizontally
                return (corridor.z + corridor.height >= room.z - tolerance &&
                        corridor.z <= room.z + tolerance &&
                        corridor.x + corridor.width > room.x - tolerance &&
                        corridor.x < room.x + room.width + tolerance);
                
            case 'south':
                // Corridor should be south of the room and overlap horizontally
                return (corridor.z >= room.z + room.height - tolerance &&
                        corridor.z <= room.z + room.height + tolerance &&
                        corridor.x + corridor.width > room.x - tolerance &&
                        corridor.x < room.x + room.width + tolerance);
                
            case 'east':
                // Corridor should be east of the room and overlap vertically
                return (corridor.x >= room.x + room.width - tolerance &&
                        corridor.x <= room.x + room.width + tolerance &&
                        corridor.z + corridor.height > room.z - tolerance &&
                        corridor.z < room.z + room.height + tolerance);
                
            case 'west':
                // Corridor should be west of the room and overlap vertically
                return (corridor.x + corridor.width >= room.x - tolerance &&
                        corridor.x + corridor.width <= room.x + tolerance &&
                        corridor.z + corridor.height > room.z - tolerance &&
                        corridor.z < room.z + room.height + tolerance);
        }
        
        return false;
    }
    
    // Check if a room connects to another room on a specific side
    roomConnectsToRoomOnSide(room, otherRoom, direction, tolerance) {
        switch (direction) {
            case 'north':
                return (otherRoom.z + otherRoom.height >= room.z - tolerance &&
                        otherRoom.z + otherRoom.height <= room.z + tolerance &&
                        otherRoom.x + otherRoom.width > room.x - tolerance &&
                        otherRoom.x < room.x + room.width + tolerance);
                
            case 'south':
                return (otherRoom.z >= room.z + room.height - tolerance &&
                        otherRoom.z <= room.z + room.height + tolerance &&
                        otherRoom.x + otherRoom.width > room.x - tolerance &&
                        otherRoom.x < room.x + room.width + tolerance);
                
            case 'east':
                return (otherRoom.x >= room.x + room.width - tolerance &&
                        otherRoom.x <= room.x + room.width + tolerance &&
                        otherRoom.z + otherRoom.height > room.z - tolerance &&
                        otherRoom.z < room.z + room.height + tolerance);
                
            case 'west':
                return (otherRoom.x + otherRoom.width >= room.x - tolerance &&
                        otherRoom.x + otherRoom.width <= room.x + tolerance &&
                        otherRoom.z + otherRoom.height > room.z - tolerance &&
                        otherRoom.z < room.z + room.height + tolerance);
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
