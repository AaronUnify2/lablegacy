// src/dungeon/walls.js - Wall generation and management for dungeon rooms
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
        
        // First, process rooms
        this.dungeon.rooms.forEach(room => {
            this.buildRoomWalls(room, false);
        });
        
        // Then, process corridors (they may need special treatment)
        this.dungeon.corridors.forEach(corridor => {
            this.buildRoomWalls(corridor, true);
            
            // Add additional corridor-specific walls if needed
            this.buildCorridorEntrances(corridor);
        });
        
        // Resolve any overlapping wall segments
        this.resolveWallOverlaps();
        
        console.log(`Built ${this.wallMeshes.length} wall segments`);
        
        return {
            meshes: this.wallMeshes,
            colliders: this.wallColliders
        };
    }
    
    // Build walls for a single room or corridor
    buildRoomWalls(room, isCorridor) {
        // Skip corridors if they are marked as sloped (shouldn't happen anymore, but just in case)
        if (room.isSloped) return;
        
        const wallColor = this.theme.wallColor || 0x333333;
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: wallColor,
            map: this.theme.wallTexture 
        });
        
        // Check if there's a corridor or connected room in each direction
        const hasNorthPassage = this.dungeon.hasPassageAt(room, 'north');
        const hasSouthPassage = this.dungeon.hasPassageAt(room, 'south');
        const hasEastPassage = this.dungeon.hasPassageAt(room, 'east');
        const hasWestPassage = this.dungeon.hasPassageAt(room, 'west');
        
        // Calculate wall positions - y is always at floor height
        const floorHeight = room.floorHeight || 0;
        const northWallZ = room.z;
        const southWallZ = room.z + room.height;
        const westWallX = room.x;
        const eastWallX = room.x + room.width;
        const wallY = floorHeight + this.wallHeight / 2;
        
        const roomId = `${room.x},${room.z},${room.width},${room.height}`;
        console.log(`Building walls for ${isCorridor ? 'corridor' : 'room'}: ${roomId}`);
        
        // Build walls where there's no passage
        // North wall
        if (!hasNorthPassage) {
            // Create a unique ID for this wall segment
            const wallId = `north:${room.x},${room.z},${room.width}`;
            
            // Only build if we haven't already built this wall
            if (!this.builtWallSegments.has(wallId)) {
                this.buildWall(
                    room.x + room.width / 2, // Center of wall
                    wallY,
                    northWallZ + this.wallThickness / 2,
                    room.width + this.wallThickness, // Extend slightly beyond room
                    this.wallHeight,
                    this.wallThickness,
                    wallMaterial,
                    true,
                    wallId
                );
                this.builtWallSegments.set(wallId, true);
            }
        }
        
        // South wall
        if (!hasSouthPassage) {
            const wallId = `south:${room.x},${room.z + room.height},${room.width}`;
            
            if (!this.builtWallSegments.has(wallId)) {
                this.buildWall(
                    room.x + room.width / 2,
                    wallY,
                    southWallZ - this.wallThickness / 2,
                    room.width + this.wallThickness,
                    this.wallHeight,
                    this.wallThickness,
                    wallMaterial,
                    true,
                    wallId
                );
                this.builtWallSegments.set(wallId, true);
            }
        }
        
        // East wall
        if (!hasEastPassage) {
            const wallId = `east:${room.x + room.width},${room.z},${room.height}`;
            
            if (!this.builtWallSegments.has(wallId)) {
                this.buildWall(
                    eastWallX - this.wallThickness / 2,
                    wallY,
                    room.z + room.height / 2,
                    this.wallThickness,
                    this.wallHeight,
                    room.height + this.wallThickness,
                    wallMaterial,
                    false,
                    wallId
                );
                this.builtWallSegments.set(wallId, true);
            }
        }
        
        // West wall
        if (!hasWestPassage) {
            const wallId = `west:${room.x},${room.z},${room.height}`;
            
            if (!this.builtWallSegments.has(wallId)) {
                this.buildWall(
                    westWallX + this.wallThickness / 2,
                    wallY,
                    room.z + room.height / 2,
                    this.wallThickness,
                    this.wallHeight,
                    room.height + this.wallThickness,
                    wallMaterial,
                    false,
                    wallId
                );
                this.builtWallSegments.set(wallId, true);
            }
        }
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
    
    // Build corridor entrances - add walls at the junction points where corridors meet rooms
    buildCorridorEntrances(corridor) {
        // Find rooms connected to this corridor
        const connectedRooms = this.dungeon.findConnectedRooms(corridor);
        
        // For each connected room, build walls on the sides of the connection
        for (const room of connectedRooms) {
            // Determine intersection area
            const overlapX = Math.max(0, Math.min(room.x + room.width, corridor.x + corridor.width) - Math.max(room.x, corridor.x));
            const overlapZ = Math.max(0, Math.min(room.z + room.height, corridor.z + corridor.height) - Math.max(room.z, corridor.z));
            
            // Skip if there's no substantial overlap
            if (overlapX < 1 && overlapZ < 1) continue;
            
            const wallMaterial = new THREE.MeshLambertMaterial({ 
                color: this.theme.wallColor || 0x333333,
                map: this.theme.wallTexture 
            });
            
            const floorHeight = corridor.floorHeight || 0;
            const wallY = floorHeight + this.wallHeight / 2;
            
            // Determine if this is a horizontal or vertical corridor connection
            if (overlapX > overlapZ) {
                // Horizontal connection (corridor connects east-west)
                const minX = Math.max(room.x, corridor.x);
                const maxX = Math.min(room.x + room.width, corridor.x + corridor.width);
                const center = (minX + maxX) / 2;
                
                // Check if corridor is north or south of the room
                if (corridor.z < room.z) {
                    // Corridor is north of room - build walls on east and west sides of connection
                    
                    // Build west side wall
                    if (minX > room.x + this.wallThickness && minX > corridor.x + this.wallThickness) {
                        const wallId = `junction:west:${minX},${room.z},${corridor.height}`;
                        if (!this.builtWallSegments.has(wallId)) {
                            this.buildWall(
                                minX - this.wallThickness / 2,
                                wallY,
                                room.z - corridor.height / 2,
                                this.wallThickness,
                                this.wallHeight,
                                corridor.height,
                                wallMaterial,
                                false,
                                wallId
                            );
                            this.builtWallSegments.set(wallId, true);
                        }
                    }
                    
                    // Build east side wall
                    if (maxX < room.x + room.width - this.wallThickness && maxX < corridor.x + corridor.width - this.wallThickness) {
                        const wallId = `junction:east:${maxX},${room.z},${corridor.height}`;
                        if (!this.builtWallSegments.has(wallId)) {
                            this.buildWall(
                                maxX + this.wallThickness / 2,
                                wallY,
                                room.z - corridor.height / 2,
                                this.wallThickness,
                                this.wallHeight,
                                corridor.height,
                                wallMaterial,
                                false,
                                wallId
                            );
                            this.builtWallSegments.set(wallId, true);
                        }
                    }
                } else if (corridor.z > room.z) {
                    // Corridor is south of room - build walls on east and west sides of connection
                    
                    // Build west side wall
                    if (minX > room.x + this.wallThickness && minX > corridor.x + this.wallThickness) {
                        const wallId = `junction:west:${minX},${room.z + room.height},${corridor.height}`;
                        if (!this.builtWallSegments.has(wallId)) {
                            this.buildWall(
                                minX - this.wallThickness / 2,
                                wallY,
                                room.z + room.height + corridor.height / 2,
                                this.wallThickness,
                                this.wallHeight,
                                corridor.height,
                                wallMaterial,
                                false,
                                wallId
                            );
                            this.builtWallSegments.set(wallId, true);
                        }
                    }
                    
                    // Build east side wall
                    if (maxX < room.x + room.width - this.wallThickness && maxX < corridor.x + corridor.width - this.wallThickness) {
                        const wallId = `junction:east:${maxX},${room.z + room.height},${corridor.height}`;
                        if (!this.builtWallSegments.has(wallId)) {
                            this.buildWall(
                                maxX + this.wallThickness / 2,
                                wallY,
                                room.z + room.height + corridor.height / 2,
                                this.wallThickness,
                                this.wallHeight,
                                corridor.height,
                                wallMaterial,
                                false,
                                wallId
                            );
                            this.builtWallSegments.set(wallId, true);
                        }
                    }
                }
            } else {
                // Vertical connection (corridor connects north-south)
                const minZ = Math.max(room.z, corridor.z);
                const maxZ = Math.min(room.z + room.height, corridor.z + corridor.height);
                const center = (minZ + maxZ) / 2;
                
                // Check if corridor is east or west of the room
                if (corridor.x < room.x) {
                    // Corridor is west of room - build walls on north and south sides of connection
                    
                    // Build north side wall
                    if (minZ > room.z + this.wallThickness && minZ > corridor.z + this.wallThickness) {
                        const wallId = `junction:north:${room.x},${minZ},${corridor.width}`;
                        if (!this.builtWallSegments.has(wallId)) {
                            this.buildWall(
                                room.x - corridor.width / 2,
                                wallY,
                                minZ - this.wallThickness / 2,
                                corridor.width,
                                this.wallHeight,
                                this.wallThickness,
                                wallMaterial,
                                true,
                                wallId
                            );
                            this.builtWallSegments.set(wallId, true);
                        }
                    }
                    
                    // Build south side wall
                    if (maxZ < room.z + room.height - this.wallThickness && maxZ < corridor.z + corridor.height - this.wallThickness) {
                        const wallId = `junction:south:${room.x},${maxZ},${corridor.width}`;
                        if (!this.builtWallSegments.has(wallId)) {
                            this.buildWall(
                                room.x - corridor.width / 2,
                                wallY,
                                maxZ + this.wallThickness / 2,
                                corridor.width,
                                this.wallHeight,
                                this.wallThickness,
                                wallMaterial,
                                true,
                                wallId
                            );
                            this.builtWallSegments.set(wallId, true);
                        }
                    }
                } else if (corridor.x > room.x) {
                    // Corridor is east of room - build walls on north and south sides of connection
                    
                    // Build north side wall
                    if (minZ > room.z + this.wallThickness && minZ > corridor.z + this.wallThickness) {
                        const wallId = `junction:north:${room.x + room.width},${minZ},${corridor.width}`;
                        if (!this.builtWallSegments.has(wallId)) {
                            this.buildWall(
                                room.x + room.width + corridor.width / 2,
                                wallY,
                                minZ - this.wallThickness / 2,
                                corridor.width,
                                this.wallHeight,
                                this.wallThickness,
                                wallMaterial,
                                true,
                                wallId
                            );
                            this.builtWallSegments.set(wallId, true);
                        }
                    }
                    
                    // Build south side wall
                    if (maxZ < room.z + room.height - this.wallThickness && maxZ < corridor.z + corridor.height - this.wallThickness) {
                        const wallId = `junction:south:${room.x + room.width},${maxZ},${corridor.width}`;
                        if (!this.builtWallSegments.has(wallId)) {
                            this.buildWall(
                                room.x + room.width + corridor.width / 2,
                                wallY,
                                maxZ + this.wallThickness / 2,
                                corridor.width,
                                this.wallHeight,
                                this.wallThickness,
                                wallMaterial,
                                true,
                                wallId
                            );
                            this.builtWallSegments.set(wallId, true);
                        }
                    }
                }
            }
        }
    }
    
    // Handle wall intersections and resolve overlapping sections
    resolveWallOverlaps() {
        // Create a map to track unique wall segments by their position
        const wallPositionMap = new Map();
        const wallsToKeep = [];
        
        for (const wall of this.wallMeshes) {
            // Create a unique position key for this wall
            const posKey = `${wall.position.x.toFixed(2)},${wall.position.y.toFixed(2)},${wall.position.z.toFixed(2)}`;
            
            // If we haven't seen this position before, keep the wall
            if (!wallPositionMap.has(posKey)) {
                wallPositionMap.set(posKey, true);
                wallsToKeep.push(wall);
            }
        }
        
        // Update the wall meshes and colliders arrays
        this.wallMeshes = wallsToKeep;
        
        // Also clean up colliders to match
        const collidersToKeep = [];
        const colliderPositionMap = new Map();
        
        for (const collider of this.wallColliders) {
            const minKey = `${collider.min.x.toFixed(2)},${collider.min.y.toFixed(2)},${collider.min.z.toFixed(2)}`;
            const maxKey = `${collider.max.x.toFixed(2)},${collider.max.y.toFixed(2)},${collider.max.z.toFixed(2)}`;
            const colliderKey = minKey + '|' + maxKey;
            
            if (!colliderPositionMap.has(colliderKey)) {
                colliderPositionMap.set(colliderKey, true);
                collidersToKeep.push(collider);
            }
        }
        
        this.wallColliders = collidersToKeep;
        
        console.log(`Wall overlap resolution complete: ${this.wallMeshes.length} walls remaining`);
    }
}
