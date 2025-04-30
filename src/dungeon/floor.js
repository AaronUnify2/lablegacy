// src/dungeon/floor.js - Updated with fully enclosed walls

import * as THREE from 'three';

export class Dungeon {
    constructor(floorNumber, size, theme) {
        this.floorNumber = floorNumber;
        this.size = size;
        this.theme = theme;
        
        this.rooms = [];
        this.corridors = [];
        this.decorations = [];
        this.chests = []; // Array to hold treasure chests
        
        this.keyPosition = null;
        this.exitPosition = null;
        this.playerSpawnPosition = null;
        
        this.keyCollected = false;
        
        // Three.js representation of the dungeon
        this.object = new THREE.Object3D();
        this.meshes = [];
        
        // Colliders for physics
        this.colliders = [];
        
        // Map to track doorways
        this.doorways = [];
    }
    
    // Add a room to the dungeon
    addRoom(room) {
        this.rooms.push(room);
    }
    
    // Add a corridor to the dungeon
    addCorridor(corridor) {
        this.corridors.push(corridor);
    }
    
    // Add a decoration to the dungeon
    addDecoration(x, y, z, theme) {
        // Get a random decoration type based on theme
        const decorationType = this.getRandomDecoration(theme);
        
        this.decorations.push({
            type: decorationType,
            x: x,
            y: y,
            z: z
        });
    }
    
    // Get a random decoration type based on theme
    getRandomDecoration(theme) {
        const decorations = theme.decorations || ['rock', 'torch', 'barrel', 'crate'];
        return decorations[Math.floor(Math.random() * decorations.length)];
    }
    
    // Add a chest to the dungeon with improved error handling
    addChest(chest) {
        if (!chest) {
            console.error("Cannot add null or undefined chest to dungeon");
            return null;
        }
        
        // Add to the chest collection
        this.chests.push(chest);
        
        // Debug log
        console.log(`Adding chest to dungeon at position:`, chest.position);
        
        // Ensure the dungeon's main object exists
        if (!this.object) {
            console.error("Dungeon object is not initialized! Creating a new one.");
            this.object = new THREE.Object3D();
        }
        
        // Add chest object to dungeon's main object container
        const chestObject = chest.getObject();
        if (chestObject) {
            try {
                this.object.add(chestObject);
                console.log(`Successfully added chest object to dungeon`);
                
                // Add additional logging for debugging
                console.log(`Chest position relative to dungeon:`, 
                            chestObject.position.x, 
                            chestObject.position.y, 
                            chestObject.position.z);
                
                // Check if the chest is visible and properly positioned
                if (chestObject.visible === false) {
                    console.warn("Chest is set to invisible! Setting to visible.");
                    chestObject.visible = true;
                }
                
                // Add chest to global scene as a redundant safety measure
                if (window.game && window.game.scene) {
                    try {
                        const globalChest = chest.getObject().clone();
                        // Store reference to the original chest on the clone
                        globalChest.userData.originalChest = chest;
                        window.game.scene.add(globalChest);
                        console.log("Also added chest directly to main scene as a fallback");
                    } catch (e) {
                        console.error("Failed to add chest to main scene:", e);
                    }
                }
            } catch (e) {
                console.error(`Error adding chest to dungeon:`, e);
                
                // Attempt recovery by adding directly to scene
                if (window.game && window.game.scene) {
                    try {
                        window.game.scene.add(chestObject);
                        console.log("Recovery: Added chest directly to main scene instead");
                    } catch (recoveryError) {
                        console.error("Fatal: Could not recover chest addition:", recoveryError);
                    }
                }
            }
        } else {
            console.error(`Failed to get chest object - chest may be invalid`);
            return null;
        }
        
        return chest; // Return chest for chaining
    }
    
    // Get all chests in the dungeon
    getChests() {
        return this.chests;
    }
    
    // Find an interactable chest near the player
    findInteractableChest(playerPosition) {
        for (const chest of this.chests) {
            if (chest.canInteract(playerPosition)) {
                return chest;
            }
        }
        return null;
    }
    
    // Place the key in the dungeon
    placeKey(x, y, z) {
        this.keyPosition = { x, y, z };
    }
    
    // Place the exit in the dungeon
    placeExit(x, y, z) {
        this.exitPosition = { x, y, z };
    }
    
    // Set player spawn position
    setPlayerSpawnPosition(x, y, z) {
        this.playerSpawnPosition = { x, y, z };
    }
    
    // Get all rooms
    getRooms() {
        return this.rooms;
    }
    
    // Check if the key is collected
    isKeyCollected() {
        return this.keyCollected;
    }
    
    // Mark key as collected
    collectKey() {
        this.keyCollected = true;
        
        // Remove key model from scene
        if (this.keyMesh) {
            this.object.remove(this.keyMesh);
        }
        
        // Return true to indicate success
        return true;
    }
    
    // Check if player is at the exit
    isPlayerAtExit(playerPosition) {
        if (!this.exitPosition) return false;
        
        const distance = Math.sqrt(
            Math.pow(playerPosition.x - this.exitPosition.x, 2) +
            Math.pow(playerPosition.z - this.exitPosition.z, 2)
        );
        
        // Player is at exit if within 2 units
        return distance < 2;
    }
    
    // Get player spawn position
    getPlayerSpawnPosition() {
        return this.playerSpawnPosition ? this.playerSpawnPosition : { x: 0, y: 1.0, z: 0 }; // Raised from 0.5 to 1.0
    }
    
    // Get colliders for all walls
    getColliders() {
        return this.colliders;
    }
    
    // Get exit collider
    getExitCollider() {
        if (!this.exitPosition) return null;
        
        return {
            min: new THREE.Vector3(
                this.exitPosition.x - 1,
                this.exitPosition.y,
                this.exitPosition.z - 1
            ),
            max: new THREE.Vector3(
                this.exitPosition.x + 1,
                this.exitPosition.y + 2,
                this.exitPosition.z + 1
            )
        };
    }
    
    // Get key collider
    getKeyCollider() {
        if (!this.keyPosition || this.keyCollected) return null;
        
        return {
            min: new THREE.Vector3(
                this.keyPosition.x - 0.5,
                this.keyPosition.y,
                this.keyPosition.z - 0.5
            ),
            max: new THREE.Vector3(
                this.keyPosition.x + 0.5,
                this.keyPosition.y + 1,
                this.keyPosition.z + 0.5
            )
        };
    }
    
    // Build the 3D mesh representation of the dungeon
    buildMesh() {
        // Create object to hold all dungeon meshes
        this.object = new THREE.Object3D();
        
        // Create floor
        this.buildFloors();
        
        // First find and register all doorways
        this.findDoorways();
        
        // Create walls
        this.buildWalls();
        
        // Create doorways
        this.buildDoorways();
        
        // Create ceilings
        this.buildCeilings();
        
        // Create decorations
        this.buildDecorations();
        
        // Create key and exit
        this.buildKeyAndExit();
    }
    
    // Build ceiling meshes
    buildCeilings() {
        // For each room and corridor, create a ceiling
        [...this.rooms, ...this.corridors].forEach(room => {
            // Create ceiling geometry
            const ceilingGeometry = new THREE.BoxGeometry(room.width, 0.2, room.height);
            const ceilingMaterial = new THREE.MeshLambertMaterial({ 
                color: this.theme.ceilingColor || 0x222222,
                map: this.theme.ceilingTexture
            });
            
            const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
            ceiling.position.set(
                room.x + room.width / 2,
                3.0, // Position ceiling 3 units above floor (matches wall height)
                room.z + room.height / 2
            );
            
            ceiling.receiveShadow = true;
            ceiling.castShadow = true;
            this.object.add(ceiling);
            this.meshes.push(ceiling);
            
            // Add ceiling collider
            this.colliders.push({
                min: new THREE.Vector3(
                    room.x,
                    2.9, // Just below ceiling surface
                    room.z
                ),
                max: new THREE.Vector3(
                    room.x + room.width,
                    3.1, // Slightly above ceiling surface
                    room.z + room.height
                )
            });
        });
    }
    
    // Build floor meshes
    buildFloors() {
        // For each room and corridor, create a floor
        [...this.rooms, ...this.corridors].forEach(room => {
            // Create floor geometry
            const floorGeometry = new THREE.BoxGeometry(room.width, 0.2, room.height);
            const floorMaterial = new THREE.MeshLambertMaterial({ 
                color: this.theme.floorColor || 0x555555,
                map: this.theme.floorTexture
            });
            
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.position.set(
                room.x + room.width / 2,
                -0.1, // Slightly below zero to avoid z-fighting
                room.z + room.height / 2
            );
            
            floor.receiveShadow = true;
            this.object.add(floor);
            this.meshes.push(floor);
            
            // Add floor collider
            this.colliders.push({
                min: new THREE.Vector3(
                    room.x,
                    -0.2, // Below floor level to ensure solid collision
                    room.z
                ),
                max: new THREE.Vector3(
                    room.x + room.width,
                    0.01, // Slightly above floor level
                    room.z + room.height
                )
            });
        });
    }
    
    // Find all doorways where corridors connect to rooms
    findDoorways() {
        this.doorways = [];
        
        // Check each corridor against all rooms to find connections
        for (const corridor of this.corridors) {
            // Get corridor bounds
            const corridorLeft = corridor.x;
            const corridorRight = corridor.x + corridor.width;
            const corridorTop = corridor.z;
            const corridorBottom = corridor.z + corridor.height;
            
            // Check against each room
            for (const room of this.rooms) {
                // Skip if the room is marked as a corridor
                if (room.isCorridor) continue;
                
                // Get room bounds
                const roomLeft = room.x;
                const roomRight = room.x + room.width;
                const roomTop = room.z;
                const roomBottom = room.z + room.height;
                
                // Check for overlap
                // Doorway on North wall of room
                if (corridorBottom >= roomTop && corridorBottom <= roomTop + 1 &&
                    corridorRight > roomLeft && corridorLeft < roomRight) {
                    // Corridor connects to North wall of room
                    const doorwayLeft = Math.max(corridorLeft, roomLeft);
                    const doorwayRight = Math.min(corridorRight, roomRight);
                    
                    this.doorways.push({
                        x1: doorwayLeft,
                        z1: roomTop,
                        x2: doorwayRight,
                        z2: roomTop,
                        direction: 'north',
                        room: room,
                        corridor: corridor
                    });
                }
                
                // Doorway on South wall of room
                if (corridorTop <= roomBottom && corridorTop >= roomBottom - 1 &&
                    corridorRight > roomLeft && corridorLeft < roomRight) {
                    // Corridor connects to South wall of room
                    const doorwayLeft = Math.max(corridorLeft, roomLeft);
                    const doorwayRight = Math.min(corridorRight, roomRight);
                    
                    this.doorways.push({
                        x1: doorwayLeft,
                        z1: roomBottom,
                        x2: doorwayRight,
                        z2: roomBottom,
                        direction: 'south',
                        room: room,
                        corridor: corridor
                    });
                }
                
                // Doorway on East wall of room
                if (corridorLeft <= roomRight && corridorLeft >= roomRight - 1 &&
                    corridorBottom > roomTop && corridorTop < roomBottom) {
                    // Corridor connects to East wall of room
                    const doorwayTop = Math.max(corridorTop, roomTop);
                    const doorwayBottom = Math.min(corridorBottom, roomBottom);
                    
                    this.doorways.push({
                        x1: roomRight,
                        z1: doorwayTop,
                        x2: roomRight,
                        z2: doorwayBottom,
                        direction: 'east',
                        room: room,
                        corridor: corridor
                    });
                }
                
                // Doorway on West wall of room
                if (corridorRight >= roomLeft && corridorRight <= roomLeft + 1 &&
                    corridorBottom > roomTop && corridorTop < roomBottom) {
                    // Corridor connects to West wall of room
                    const doorwayTop = Math.max(corridorTop, roomTop);
                    const doorwayBottom = Math.min(corridorBottom, roomBottom);
                    
                    this.doorways.push({
                        x1: roomLeft,
                        z1: doorwayTop,
                        x2: roomLeft,
                        z2: doorwayBottom,
                        direction: 'west',
                        room: room,
                        corridor: corridor
                    });
                }
            }
            
            // Also check corridor-to-corridor connections
            for (const otherCorridor of this.corridors) {
                // Skip self comparison
                if (corridor === otherCorridor) continue;
                
                // Get other corridor bounds
                const otherLeft = otherCorridor.x;
                const otherRight = otherCorridor.x + otherCorridor.width;
                const otherTop = otherCorridor.z;
                const otherBottom = otherCorridor.z + otherCorridor.height;
                
                // Check for corridor-to-corridor connections
                // These are treated as doorways too to prevent wall overlaps
                
                // Corridor connects to North of other corridor
                if (corridorBottom >= otherTop && corridorBottom <= otherTop + 1 &&
                    corridorRight > otherLeft && corridorLeft < otherRight) {
                    // Corridor connects to North side of other corridor
                    const doorwayLeft = Math.max(corridorLeft, otherLeft);
                    const doorwayRight = Math.min(corridorRight, otherRight);
                    
                    this.doorways.push({
                        x1: doorwayLeft,
                        z1: otherTop,
                        x2: doorwayRight,
                        z2: otherTop,
                        direction: 'north',
                        room: otherCorridor,
                        corridor: corridor
                    });
                }
                
                // Similar checks for south, east, west connections...
                // South
                if (corridorTop <= otherBottom && corridorTop >= otherBottom - 1 &&
                    corridorRight > otherLeft && corridorLeft < otherRight) {
                    const doorwayLeft = Math.max(corridorLeft, otherLeft);
                    const doorwayRight = Math.min(corridorRight, otherRight);
                    
                    this.doorways.push({
                        x1: doorwayLeft,
                        z1: otherBottom,
                        x2: doorwayRight,
                        z2: otherBottom,
                        direction: 'south',
                        room: otherCorridor,
                        corridor: corridor
                    });
                }
                
                // East
                if (corridorLeft <= otherRight && corridorLeft >= otherRight - 1 &&
                    corridorBottom > otherTop && corridorTop < otherBottom) {
                    const doorwayTop = Math.max(corridorTop, otherTop);
                    const doorwayBottom = Math.min(corridorBottom, otherBottom);
                    
                    this.doorways.push({
                        x1: otherRight,
                        z1: doorwayTop,
                        x2: otherRight,
                        z2: doorwayBottom,
                        direction: 'east',
                        room: otherCorridor,
                        corridor: corridor
                    });
                }
                
                // West
                if (corridorRight >= otherLeft && corridorRight <= otherLeft + 1 &&
                    corridorBottom > otherTop && corridorTop < otherBottom) {
                    const doorwayTop = Math.max(corridorTop, otherTop);
                    const doorwayBottom = Math.min(corridorBottom, otherBottom);
                    
                    this.doorways.push({
                        x1: otherLeft,
                        z1: doorwayTop,
                        x2: otherLeft,
                        z2: doorwayBottom,
                        direction: 'west',
                        room: otherCorridor,
                        corridor: corridor
                    });
                }
            }
        }
    }
    
    // Build doorways
    buildDoorways() {
        // Create visual doorframe arches for each doorway
        const doorwayMaterial = new THREE.MeshLambertMaterial({
            color: this.theme.wallColor || 0x333333,
            map: this.theme.wallTexture
        });
        
        for (const doorway of this.doorways) {
            const wallHeight = 3;
            const doorwayHeight = 2.5; // Slightly lower than wall height
            const thickness = 0.3; // Thickness of doorway arch
            
            // Position and dimensions depend on doorway direction
            if (doorway.direction === 'north' || doorway.direction === 'south') {
                // Horizontal doorway (north-south)
                const doorwayWidth = doorway.x2 - doorway.x1;
                const doorwayCenter = (doorway.x1 + doorway.x2) / 2;
                const zPos = doorway.z1;
                
                // Create top arch of doorway
                const archGeometry = new THREE.BoxGeometry(doorwayWidth, wallHeight - doorwayHeight, thickness);
                const arch = new THREE.Mesh(archGeometry, doorwayMaterial);
                
                arch.position.set(
                    doorwayCenter,
                    doorwayHeight + (wallHeight - doorwayHeight) / 2, // Top of doorway
                    zPos
                );
                
                arch.castShadow = true;
                arch.receiveShadow = true;
                
                this.object.add(arch);
                this.meshes.push(arch);
                
                // Add collider for the arch
                this.colliders.push({
                    min: new THREE.Vector3(
                        doorwayCenter - doorwayWidth / 2,
                        doorwayHeight,
                        zPos - thickness / 2
                    ),
                    max: new THREE.Vector3(
                        doorwayCenter + doorwayWidth / 2,
                        wallHeight,
                        zPos + thickness / 2
                    )
                });
                
                // Create side posts (optional - only for wider doorways)
                if (doorwayWidth > 3) {
                    // Left post
                    const leftPostGeometry = new THREE.BoxGeometry(thickness, doorwayHeight, thickness);
                    const leftPost = new THREE.Mesh(leftPostGeometry, doorwayMaterial);
                    leftPost.position.set(
                        doorway.x1 + thickness / 2,
                        doorwayHeight / 2,
                        zPos
                    );
                    leftPost.castShadow = true;
                    leftPost.receiveShadow = true;
                    this.object.add(leftPost);
                    this.meshes.push(leftPost);
                    
                    // Right post
                    const rightPostGeometry = new THREE.BoxGeometry(thickness, doorwayHeight, thickness);
                    const rightPost = new THREE.Mesh(rightPostGeometry, doorwayMaterial);
                    rightPost.position.set(
                        doorway.x2 - thickness / 2,
                        doorwayHeight / 2,
                        zPos
                    );
                    rightPost.castShadow = true;
                    rightPost.receiveShadow = true;
                    this.object.add(rightPost);
                    this.meshes.push(rightPost);
                    
                    // Add colliders for posts
                    this.colliders.push({
                        min: new THREE.Vector3(
                            doorway.x1,
                            0,
                            zPos - thickness / 2
                        ),
                        max: new THREE.Vector3(
                            doorway.x1 + thickness,
                            doorwayHeight,
                            zPos + thickness / 2
                        )
                    });
                    
                    this.colliders.push({
                        min: new THREE.Vector3(
                            doorway.x2 - thickness,
                            0,
                            zPos - thickness / 2
                        ),
                        max: new THREE.Vector3(
                            doorway.x2,
                            doorwayHeight,
                            zPos + thickness / 2
                        )
                    });
                }
            } else {
                // Vertical doorway (east-west)
                const doorwayHeight = doorway.z2 - doorway.z1;
                const doorwayCenter = (doorway.z1 + doorway.z2) / 2;
                const xPos = doorway.x1;
                
                // Create top arch of doorway
                const archGeometry = new THREE.BoxGeometry(thickness, wallHeight - doorwayHeight, doorwayHeight);
                const arch = new THREE.Mesh(archGeometry, doorwayMaterial);
                
                arch.position.set(
                    xPos,
                    doorwayHeight + (wallHeight - doorwayHeight) / 2, // Top of doorway
                    doorwayCenter
                );
                
                arch.castShadow = true;
                arch.receiveShadow = true;
                
                this.object.add(arch);
                this.meshes.push(arch);
                
                // Add collider for the arch
                this.colliders.push({
                    min: new THREE.Vector3(
                        xPos - thickness / 2,
                        doorwayHeight,
                        doorwayCenter - doorwayHeight / 2
                    ),
                    max: new THREE.Vector3(
                        xPos + thickness / 2,
                        wallHeight,
                        doorwayCenter + doorwayHeight / 2
                    )
                });
                
                // Create side posts (optional - only for taller doorways)
                if (doorwayHeight > 3) {
                    // Top post
                    const topPostGeometry = new THREE.BoxGeometry(thickness, doorwayHeight, thickness);
                    const topPost = new THREE.Mesh(topPostGeometry, doorwayMaterial);
                    topPost.position.set(
                        xPos,
                        doorwayHeight / 2,
                        doorway.z1 + thickness / 2
                    );
                    topPost.castShadow = true;
                    topPost.receiveShadow = true;
                    this.object.add(topPost);
                    this.meshes.push(topPost);
                    
                    // Bottom post
                    const bottomPostGeometry = new THREE.BoxGeometry(thickness, doorwayHeight, thickness);
                    const bottomPost = new THREE.Mesh(bottomPostGeometry, doorwayMaterial);
                    bottomPost.position.set(
                        xPos,
                        doorwayHeight / 2,
                        doorway.z2 - thickness / 2
                    );
                    bottomPost.castShadow = true;
                    bottomPost.receiveShadow = true;
                    this.object.add(bottomPost);
                    this.meshes.push(bottomPost);
                    
                    // Add colliders for posts
                    this.colliders.push({
                        min: new THREE.Vector3(
                            xPos - thickness / 2,
                            0,
                            doorway.z1
                        ),
                        max: new THREE.Vector3(
                            xPos + thickness / 2,
                            doorwayHeight,
                            doorway.z1 + thickness
                        )
                    });
                    
                    this.colliders.push({
                        min: new THREE.Vector3(
                            xPos - thickness / 2,
                            0,
                            doorway.z2 - thickness
                        ),
                        max: new THREE.Vector3(
                            xPos + thickness / 2,
                            doorwayHeight,
                            doorway.z2
                        )
                    });
                }
            }
        }
    }
    
    // Check if a point is part of a doorway
    isPartOfDoorway(x, z, direction, roomType) {
        // Margin for doorway detection
        const margin = 0.5;
        
        // Check each doorway
        for (const doorway of this.doorways) {
            // Only check doorways in the correct direction and with matching room type
            if (doorway.direction !== direction) continue;
            
            // For horizontal doorways (north/south)
            if (direction === 'north' || direction === 'south') {
                // Check if point is within the doorway's horizontal span (with small margin)
                if (x >= doorway.x1 - margin && x <= doorway.x2 + margin && 
                    Math.abs(z - doorway.z1) < margin) {
                    return true;
                }
            }
            // For vertical doorways (east/west)
            else if (direction === 'east' || direction === 'west') {
                // Check if point is within the doorway's vertical span (with small margin)
                if (Math.abs(x - doorway.x1) < margin && 
                    z >= doorway.z1 - margin && z <= doorway.z2 + margin) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Build wall meshes with continuous walls and doorways
    buildWalls() {
        // Wall standard properties
        const wallHeight = 3; // Standard wall height
        const wallColor = this.theme.wallColor || 0x333333;
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: wallColor,
            map: this.theme.wallTexture 
        });
        const wallThickness = 0.5;
        
        // Function to build a wall segment
        const buildWallSegment = (x, y, z, width, height, depth) => {
            const wallGeometry = new THREE.BoxGeometry(width, height, depth);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            
            wall.position.set(x, y, z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            
            this.object.add(wall);
            this.meshes.push(wall);
            
            // Add collider for the wall
            this.colliders.push({
                min: new THREE.Vector3(
                    x - width / 2,
                    y - height / 2,
                    z - depth / 2
                ),
                max: new THREE.Vector3(
                    x + width / 2,
                    y + height / 2,
                    z + depth / 2
                )
            });
        };
        
        // Create walls for each room and corridor
        for (const space of [...this.rooms, ...this.corridors]) {
            // Calculate wall positions - y is always half of wall height
            const floorHeight = space.floorHeight || 0;
            const wallY = floorHeight + wallHeight / 2;
            
            // Define wall segments based on doorways
            // For each edge of the room, check if we need doorways
            
            // North Wall (top edge)
            const northDoorways = this.doorways.filter(d => 
                d.direction === 'north' && d.room === space);
            
            if (northDoorways.length === 0) {
                // No doorways, build continuous wall
                buildWallSegment(
                    space.x + space.width / 2, // Center of wall
                    wallY, 
                    space.z - wallThickness / 2, // Align with north edge of room
                    space.width + wallThickness, // Extend slightly beyond room
                    wallHeight,
                    wallThickness
                );
            } else {
                // Build wall segments between doorways
                let segments = this.getWallSegmentsBetweenDoorways(
                    space.x, space.x + space.width, northDoorways, 'horizontal');
                
                for (const segment of segments) {
                    const segmentWidth = segment[1] - segment[0];
                    if (segmentWidth > 0.1) { // Minimum wall width
                        buildWallSegment(
                            segment[0] + segmentWidth / 2,
                            wallY,
                            space.z - wallThickness / 2,
                            segmentWidth + wallThickness,
                            wallHeight,
                            wallThickness
                        );
                    }
                }
            }
            
            // South Wall (bottom edge)
            const southDoorways = this.doorways.filter(d => 
                d.direction === 'south' && d.room === space);
            
            if (southDoorways.length === 0) {
                // No doorways, build continuous wall
                buildWallSegment(
                    space.x + space.width / 2,
                    wallY,
                    space.z + space.height + wallThickness / 2,
                    space.width + wallThickness,
                    wallHeight,
                    wallThickness
                );
            } else {
                // Build wall segments between doorways
                let segments = this.getWallSegmentsBetweenDoorways(
                    space.x, space.x + space.width, southDoorways, 'horizontal');
                
                for (const segment of segments) {
                    const segmentWidth = segment[1] - segment[0];
                    if (segmentWidth > 0.1) {
                        buildWallSegment(
                            segment[0] + segmentWidth / 2,
                            wallY,
                            space.z + space.height + wallThickness / 2,
                            segmentWidth + wallThickness,
                            wallHeight,
                            wallThickness
                        );
                    }
                }
            }
            
            // East Wall (right edge)
            const eastDoorways = this.doorways.filter(d => 
                d.direction === 'east' && d.room === space);
            
            if (eastDoorways.length === 0) {
                // No doorways, build continuous wall
                buildWallSegment(
                    space.x + space.width + wallThickness / 2,
                    wallY,
                    space.z + space.height / 2,
                    wallThickness,
                    wallHeight,
                    space.height + wallThickness
                );
            } else {
                // Build wall segments between doorways
                let segments = this.getWallSegmentsBetweenDoorways(
                    space.z, space.z + space.height, eastDoorways, 'vertical');
                
                for (const segment of segments) {
                    const segmentHeight = segment[1] - segment[0];
                    if (segmentHeight > 0.1) {
                        buildWallSegment(
                            space.x + space.width + wallThickness / 2,
                            wallY,
                            segment[0] + segmentHeight / 2,
                            wallThickness,
                            wallHeight,
                            segmentHeight + wallThickness
                        );
                    }
                }
            }
            
            // West Wall (left edge)
            const westDoorways = this.doorways.filter(d => 
                d.direction === 'west' && d.room === space);
            
            if (westDoorways.length === 0) {
                // No doorways, build continuous wall
                buildWallSegment(
                    space.x - wallThickness / 2,
                    wallY,
                    space.z + space.height / 2,
                    wallThickness,
                    wallHeight,
                    space.height + wallThickness
                );
            } else {
                // Build wall segments between doorways
                let segments = this.getWallSegmentsBetweenDoorways(
                    space.z, space.z + space.height, westDoorways, 'vertical');
                
                for (const segment of segments) {
                    const segmentHeight = segment[1] - segment[0];
                    if (segmentHeight > 0.1) {
                        buildWallSegment(
                            space.x - wallThickness / 2,
                            wallY,
                            segment[0] + segmentHeight / 2,
                            wallThickness,
                            wallHeight,
                            segmentHeight + wallThickness
                        );
                    }
                }
            }
            
            // Build wall corners to fully enclose the space
            this.buildCornerPillars(space, wallY, wallHeight, wallThickness, wallMaterial);
        }
    }
    
    // Build corner pillars to ensure full enclosure
    buildCornerPillars(space, wallY, wallHeight, thickness, material) {
        // Create pillars at each corner to ensure walls connect properly
        // This creates a more polished look and fills in any gaps
        
        const cornerPositions = [
            // NW corner
            { x: space.x - thickness/2, z: space.z - thickness/2 },
            // NE corner
            { x: space.x + space.width + thickness/2, z: space.z - thickness/2 },
            // SW corner
            { x: space.x - thickness/2, z: space.z + space.height + thickness/2 },
            // SE corner
            { x: space.x + space.width + thickness/2, z: space.z + space.height + thickness/2 }
        ];
        
        // Check each corner to see if it needs a pillar
        for (const corner of cornerPositions) {
            // Only add corner pillars if this corner isn't part of a doorway
            const isNearDoorway = this.doorways.some(d => {
                const margin = thickness * 1.5;
                
                // For horizontal doorways (north/south)
                if (d.direction === 'north' || d.direction === 'south') {
                    return (corner.x >= d.x1 - margin && corner.x <= d.x2 + margin &&
                            Math.abs(corner.z - d.z1) < margin);
                } 
                // For vertical doorways (east/west)
                else if (d.direction === 'east' || d.direction === 'west') {
                    return (Math.abs(corner.x - d.x1) < margin &&
                            corner.z >= d.z1 - margin && corner.z <= d.z2 + margin);
                }
                return false;
            });
            
            if (!isNearDoorway) {
                // Add a corner pillar
                const pillarGeometry = new THREE.BoxGeometry(thickness, wallHeight, thickness);
                const pillar = new THREE.Mesh(pillarGeometry, material);
                pillar.position.set(corner.x, wallY, corner.z);
                pillar.castShadow = true;
                pillar.receiveShadow = true;
                
                this.object.add(pillar);
                this.meshes.push(pillar);
                
                // Add collider for the pillar
                this.colliders.push({
                    min: new THREE.Vector3(
                        corner.x - thickness/2,
                        wallY - wallHeight/2,
                        corner.z - thickness/2
                    ),
                    max: new THREE.Vector3(
                        corner.x + thickness/2,
                        wallY + wallHeight/2,
                        corner.z + thickness/2
                    )
                });
            }
        }
    }
    
    // Helper to calculate wall segments between doorways
    getWallSegmentsBetweenDoorways(start, end, doorways, orientation) {
        // Sort doorways by position
        let sortedDoorways;
        if (orientation === 'horizontal') {
            sortedDoorways = doorways.sort((a, b) => a.x1 - b.x1);
        } else {
            sortedDoorways = doorways.sort((a, b) => a.z1 - b.z1);
        }
        
        // Create segments
        let segments = [];
        let currentPos = start;
        
        // Add segment before first doorway
        if (sortedDoorways.length > 0) {
            const firstDoorway = sortedDoorways[0];
            const firstDoorStart = orientation === 'horizontal' ? firstDoorway.x1 : firstDoorway.z1;
            
            if (firstDoorStart > start + 0.1) {
                segments.push([start, firstDoorStart]);
            }
            
            // Add segments between doorways
            for (let i = 0; i < sortedDoorways.length; i++) {
                const currentDoorway = sortedDoorways[i];
                const currentDoorEnd = orientation === 'horizontal' ? currentDoorway.x2 : currentDoorway.z2;
                
                // Update current position
                currentPos = currentDoorEnd;
                
                // Add segment to next doorway or end
                if (i < sortedDoorways.length - 1) {
                    const nextDoorway = sortedDoorways[i + 1];
                    const nextDoorStart = orientation === 'horizontal' ? nextDoorway.x1 : nextDoorway.z1;
                    
                    if (nextDoorStart > currentPos + 0.1) {
                        segments.push([currentPos, nextDoorStart]);
                    }
                }
                
                // Add segment after last doorway
                if (i === sortedDoorways.length - 1) {
                    if (end > currentPos + 0.1) {
                        segments.push([currentPos, end]);
                    }
                }
            }
