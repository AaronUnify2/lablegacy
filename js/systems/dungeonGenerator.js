export class DungeonGenerator {
    constructor() {
        // Settings for dungeon generation
        this.settings = {
            // Room settings
            centralRoomSize: 40,
            minRoomSize: 25,
            maxRoomSize: 40,
            numRadialRooms: 5,
            
            // Basic settings from original implementation
            gridSize: 1,
            corridorWidth: 5,
            floorHeight: 0.2,
            wallHeight: 3,
            doorwayWidth: 5,
            
            // Spacing settings
            minDistanceFromCenter: 60,
            maxDistanceFromCenter: 100,
            minAngleBetweenRooms: 30
        };
    }
    
    generateFloor(floorLevel) {
        console.log(`Generating floor level ${floorLevel} with hub-and-spoke layout...`);
        
        // Generate the central room
        const centralRoom = this.generateCentralRoom();
        
        // Generate radial rooms around the central room
        const radialRooms = this.generateRadialRooms(centralRoom);
        
        // Combine all rooms
        const rooms = [centralRoom, ...radialRooms];
        
        // Connect rooms with corridors - using direct connections to walls
        const corridors = this.connectRoomsToCenter(centralRoom, radialRooms);
        
        // Create doorways where corridors meet rooms
        this.createDoorways(rooms, corridors);
        
        // Place the key in the furthest room from center
        const keyPosition = this.placeKey(radialRooms);
        
        // Create the dungeon mesh
        const dungeonMesh = this.createDungeonMesh(rooms, corridors, keyPosition);
        
        // Return the generated dungeon data
        return {
            level: floorLevel,
            rooms: rooms,
            corridors: corridors,
            keyPosition: keyPosition,
            mesh: dungeonMesh
        };
    }
    
    generateCentralRoom() {
        // Create a central room at the origin
        const size = this.settings.centralRoomSize;
        
        return {
            x: -size / 2,
            y: -size / 2,
            width: size,
            height: size,
            connections: [],
            doorways: [],
            isCentral: true
        };
    }
    
    generateRadialRooms(centralRoom) {
        const radialRooms = [];
        const numRooms = this.settings.numRadialRooms;
        
        // Calculate the center position of the central room
        const centerX = centralRoom.x + centralRoom.width / 2;
        const centerY = centralRoom.y + centralRoom.height / 2;
        
        // Calculate angular separation for even distribution
        const angleStep = 360 / numRooms;
        
        for (let i = 0; i < numRooms; i++) {
            // Add some randomness to the angle within safe bounds
            const baseAngle = i * angleStep;
            const angleVariance = (angleStep - this.settings.minAngleBetweenRooms) / 2;
            const angle = baseAngle + (Math.random() * angleVariance * 2 - angleVariance);
            
            // Convert angle to radians
            const radians = angle * (Math.PI / 180);
            
            // Randomize the distance from center within bounds
            const distance = this.settings.minDistanceFromCenter + 
                Math.random() * (this.settings.maxDistanceFromCenter - this.settings.minDistanceFromCenter);
            
            // Calculate the room center position using polar coordinates
            const roomCenterX = centerX + Math.cos(radians) * distance;
            const roomCenterY = centerY + Math.sin(radians) * distance;
            
            // Randomize room size
            const roomWidth = Math.floor(Math.random() * 
                (this.settings.maxRoomSize - this.settings.minRoomSize + 1)) + 
                this.settings.minRoomSize;
            
            const roomHeight = Math.floor(Math.random() * 
                (this.settings.maxRoomSize - this.settings.minRoomSize + 1)) + 
                this.settings.minRoomSize;
            
            // Calculate top-left corner of room
            const roomX = roomCenterX - roomWidth / 2;
            const roomY = roomCenterY - roomHeight / 2;
            
            // Store the room with its angle from center for corridor calculation
            radialRooms.push({
                x: roomX,
                y: roomY,
                width: roomWidth,
                height: roomHeight,
                connections: [],
                doorways: [],
                angle: angle,
                distanceFromCenter: distance,
                centerX: roomCenterX,
                centerY: roomCenterY
            });
        }
        
        // Make sure rooms don't overlap by checking and adjusting if needed
        let placementAttempts = 0;
        const maxAttempts = 100;
        
        while (this.hasOverlappingRooms(radialRooms, centralRoom) && placementAttempts < maxAttempts) {
            // Try to resolve overlapping by moving rooms
            this.resolveRoomOverlaps(radialRooms, centralRoom);
            placementAttempts++;
        }
        
        return radialRooms;
    }
    
    hasOverlappingRooms(rooms, centralRoom) {
        // Check if any rooms overlap with each other or the central room
        
        // First check if any radial room overlaps with the central room
        for (const room of rooms) {
            if (this.roomsOverlap(room, centralRoom)) {
                return true;
            }
        }
        
        // Then check if any radial rooms overlap with each other
        for (let i = 0; i < rooms.length; i++) {
            for (let j = i + 1; j < rooms.length; j++) {
                if (this.roomsOverlap(rooms[i], rooms[j])) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    roomsOverlap(room1, room2) {
        // Check if two rooms overlap
        // Add a small buffer zone around rooms
        const buffer = 5;
        
        return !(
            room1.x + room1.width + buffer < room2.x ||
            room2.x + room2.width + buffer < room1.x ||
            room1.y + room1.height + buffer < room2.y ||
            room2.y + room2.height + buffer < room1.y
        );
    }
    
    resolveRoomOverlaps(rooms, centralRoom) {
        // Calculate the center position of the central room
        const centerX = centralRoom.x + centralRoom.width / 2;
        const centerY = centralRoom.y + centralRoom.height / 2;
        
        // Try to resolve overlaps by adjusting room positions
        for (const room of rooms) {
            // If this room overlaps with the central room or any other room
            if (this.roomsOverlap(room, centralRoom) || 
                rooms.some(r => r !== room && this.roomsOverlap(r, room))) {
                
                // Move the room further away from center
                const angle = room.angle * (Math.PI / 180);
                const newDistance = room.distanceFromCenter + 10; // Move 10 units further
                
                // Calculate new center position
                const newCenterX = centerX + Math.cos(angle) * newDistance;
                const newCenterY = centerY + Math.sin(angle) * newDistance;
                
                // Update room position and distance
                room.x = newCenterX - room.width / 2;
                room.y = newCenterY - room.height / 2;
                room.centerX = newCenterX;
                room.centerY = newCenterY;
                room.distanceFromCenter = newDistance;
            }
        }
    }
    
    connectRoomsToCenter(centralRoom, radialRooms) {
        const corridors = [];
        
        // Calculate the center of the central room
        const centralX = centralRoom.x + centralRoom.width / 2;
        const centralY = centralRoom.y + centralRoom.height / 2;
        
        // Calculate central room boundaries
        const centralLeft = centralRoom.x;
        const centralRight = centralRoom.x + centralRoom.width;
        const centralTop = centralRoom.y;
        const centralBottom = centralRoom.y + centralRoom.height;
        
        // Connect each radial room to the central room
        for (const room of radialRooms) {
            // Calculate the angle to determine which wall of the central room to connect from
            const angleRad = room.angle * (Math.PI / 180);
            
            // Determine exit point from central room
            let exitX, exitY;
            
            // Determine which quadrant the radial room is in relative to central room
            if (Math.abs(Math.cos(angleRad)) > Math.abs(Math.sin(angleRad))) {
                // Room is more along the x-axis (east or west)
                if (Math.cos(angleRad) > 0) {
                    // Room is to the east of central room
                    exitX = centralRight;
                    exitY = centralY;
                } else {
                    // Room is to the west of central room
                    exitX = centralLeft;
                    exitY = centralY;
                }
            } else {
                // Room is more along the y-axis (north or south)
                if (Math.sin(angleRad) > 0) {
                    // Room is to the south of central room
                    exitX = centralX;
                    exitY = centralBottom;
                } else {
                    // Room is to the north of central room
                    exitX = centralX;
                    exitY = centralTop;
                }
            }
            
            // Calculate radial room boundaries
            const roomLeft = room.x;
            const roomRight = room.x + room.width;
            const roomTop = room.y;
            const roomBottom = room.y + room.height;
            
            // Determine entry point to radial room
            let entryX, entryY;
            
            // Determine which side of the radial room should have the entry
            if (Math.abs(Math.cos(angleRad)) > Math.abs(Math.sin(angleRad))) {
                // Connect horizontally
                if (Math.cos(angleRad) > 0) {
                    // Room is to the east, enter from west wall
                    entryX = roomLeft;
                    entryY = room.centerY;
                } else {
                    // Room is to the west, enter from east wall
                    entryX = roomRight;
                    entryY = room.centerY;
                }
            } else {
                // Connect vertically
                if (Math.sin(angleRad) > 0) {
                    // Room is to the south, enter from north wall
                    entryX = room.centerX;
                    entryY = roomTop;
                } else {
                    // Room is to the north, enter from south wall
                    entryX = room.centerX;
                    entryY = roomBottom;
                }
            }
            
            // Determine if corridor is more horizontal or vertical
            if (Math.abs(exitX - centralX) > 0 || Math.abs(entryX - room.centerX) > 0) {
                // Corridor has horizontal components
                
                // Check if exit and entry are in line (roughly same Y)
                const margin = this.settings.corridorWidth * 2;
                if (Math.abs(exitY - entryY) <= margin) {
                    // Direct horizontal corridor
                    corridors.push({
                        x1: exitX,
                        y1: exitY,
                        x2: entryX,
                        y2: entryY,
                        width: this.settings.corridorWidth,
                        isHorizontal: true,
                        isStraight: true,
                        angle: room.angle,
                        startRoom: centralRoom,
                        endRoom: room
                    });
                } else {
                    // L-shaped corridor
                    // First segment (from central room)
                    corridors.push({
                        x1: exitX,
                        y1: exitY,
                        x2: entryX,
                        y2: exitY,
                        width: this.settings.corridorWidth,
                        isHorizontal: true,
                        isStraight: false,
                        angle: room.angle,
                        startRoom: centralRoom,
                        endRoom: null
                    });
                    
                    // Second segment (to radial room)
                    corridors.push({
                        x1: entryX,
                        y1: exitY,
                        x2: entryX,
                        y2: entryY,
                        width: this.settings.corridorWidth,
                        isHorizontal: false,
                        isStraight: false,
                        angle: room.angle,
                        startRoom: null,
                        endRoom: room
                    });
                }
            } else {
                // Corridor has vertical components
                
                // Check if exit and entry are in line (roughly same X)
                const margin = this.settings.corridorWidth * 2;
                if (Math.abs(exitX - entryX) <= margin) {
                    // Direct vertical corridor
                    corridors.push({
                        x1: exitX,
                        y1: exitY,
                        x2: entryX,
                        y2: entryY,
                        width: this.settings.corridorWidth,
                        isHorizontal: false,
                        isStraight: true,
                        angle: room.angle,
                        startRoom: centralRoom,
                        endRoom: room
                    });
                } else {
                    // L-shaped corridor
                    // First segment (from central room)
                    corridors.push({
                        x1: exitX,
                        y1: exitY,
                        x2: exitX,
                        y2: entryY,
                        width: this.settings.corridorWidth,
                        isHorizontal: false,
                        isStraight: false,
                        angle: room.angle,
                        startRoom: centralRoom,
                        endRoom: null
                    });
                    
                    // Second segment (to radial room)
                    corridors.push({
                        x1: exitX,
                        y1: entryY,
                        x2: entryX,
                        y2: entryY,
                        width: this.settings.corridorWidth,
                        isHorizontal: true,
                        isStraight: false,
                        angle: room.angle,
                        startRoom: null,
                        endRoom: room
                    });
                }
            }
            
            // Mark rooms as connected
            centralRoom.connections.push(room);
            room.connections.push(centralRoom);
        }
        
        return corridors;
    }
    
    createDoorways(rooms, corridors) {
        // Process each corridor to create doorways in the rooms they connect
        for (const corridor of corridors) {
            if (corridor.startRoom) {
                const room = corridor.startRoom;
                
                if (corridor.isHorizontal) {
                    // Horizontal corridor, doorway on east/west wall
                    let doorX, doorY, doorWidth, doorHeight, isEastWall;
                    
                    if (corridor.x1 < corridor.x2) {
                        // Corridor goes east from room
                        doorX = room.x + room.width;
                        isEastWall = true;
                    } else {
                        // Corridor goes west from room
                        doorX = room.x;
                        isEastWall = false;
                    }
                    
                    doorY = corridor.y1 - this.settings.doorwayWidth / 2;
                    doorWidth = this.settings.gridSize; // Door thickness is one grid cell
                    doorHeight = this.settings.doorwayWidth;
                    
                    room.doorways.push({
                        x: doorX,
                        y: doorY,
                        width: doorWidth,
                        height: doorHeight,
                        isEastWall: isEastWall,
                        isNorthWall: false
                    });
                } else {
                    // Vertical corridor, doorway on north/south wall
                    let doorX, doorY, doorWidth, doorHeight, isNorthWall;
                    
                    doorX = corridor.x1 - this.settings.doorwayWidth / 2;
                    
                    if (corridor.y1 < corridor.y2) {
                        // Corridor goes south from room
                        doorY = room.y + room.height;
                        isNorthWall = false;
                    } else {
                        // Corridor goes north from room
                        doorY = room.y;
                        isNorthWall = true;
                    }
                    
                    doorWidth = this.settings.doorwayWidth;
                    doorHeight = this.settings.gridSize; // Door thickness is one grid cell
                    
                    room.doorways.push({
                        x: doorX,
                        y: doorY,
                        width: doorWidth,
                        height: doorHeight,
                        isEastWall: false,
                        isNorthWall: isNorthWall
                    });
                }
            }
            
            if (corridor.endRoom) {
                const room = corridor.endRoom;
                
                if (corridor.isHorizontal) {
                    // Horizontal corridor, doorway on east/west wall
                    let doorX, doorY, doorWidth, doorHeight, isEastWall;
                    
                    if (corridor.x1 < corridor.x2) {
                        // Corridor goes east to room
                        doorX = room.x;
                        isEastWall = false;
                    } else {
                        // Corridor goes west to room
                        doorX = room.x + room.width;
                        isEastWall = true;
                    }
                    
                    doorY = corridor.y2 - this.settings.doorwayWidth / 2;
                    doorWidth = this.settings.gridSize;
                    doorHeight = this.settings.doorwayWidth;
                    
                    room.doorways.push({
                        x: doorX,
                        y: doorY,
                        width: doorWidth,
                        height: doorHeight,
                        isEastWall: isEastWall,
                        isNorthWall: false
                    });
                } else {
                    // Vertical corridor, doorway on north/south wall
                    let doorX, doorY, doorWidth, doorHeight, isNorthWall;
                    
                    doorX = corridor.x2 - this.settings.doorwayWidth / 2;
                    
                    if (corridor.y1 < corridor.y2) {
                        // Corridor goes south to room
                        doorY = room.y;
                        isNorthWall = true;
                    } else {
                        // Corridor goes north to room
                        doorY = room.y + room.height;
                        isNorthWall = false;
                    }
                    
                    doorWidth = this.settings.doorwayWidth;
                    doorHeight = this.settings.gridSize;
                    
                    room.doorways.push({
                        x: doorX,
                        y: doorY,
                        width: doorWidth,
                        height: doorHeight,
                        isEastWall: false,
                        isNorthWall: isNorthWall
                    });
                }
            }
        }
    }
    
    placeKey(radialRooms) {
        // Find the room furthest from center
        const furthestRoom = radialRooms.reduce((prev, current) => 
            (current.distanceFromCenter > prev.distanceFromCenter) ? current : prev
        );
        
        // Place key in the center of that room
        return {
            x: furthestRoom.x + furthestRoom.width / 2,
            y: furthestRoom.y + furthestRoom.height / 2
        };
    }
    
    createDungeonMesh(rooms, corridors, keyPosition) {
        // Create a group to hold all dungeon meshes
        const dungeonGroup = new THREE.Group();
        
        // Create materials
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x666666,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444444,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const centralRoomFloorMaterial = new THREE.MeshStandardMaterial({
            color: 0x8a9c8f,
            roughness: 0.5,
            metalness: 0.3
        });
        
        const keyMaterial = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0xffcc00,
            emissiveIntensity: 0.5
        });
        
        // Array to store collider meshes
        dungeonGroup.colliderMeshes = [];
        
        // Add room floors and walls
        for (const room of rooms) {
            // Choose material based on room type
            const roomFloorMaterial = room.isCentral ? centralRoomFloorMaterial : floorMaterial;
            
            // Create floor
            const floorGeometry = new THREE.BoxGeometry(
                room.width * this.settings.gridSize,
                this.settings.floorHeight,
                room.height * this.settings.gridSize
            );
            
            const floorMesh = new THREE.Mesh(floorGeometry, roomFloorMaterial);
            floorMesh.position.set(
                room.x + (room.width * this.settings.gridSize) / 2,
                -this.settings.floorHeight / 2,
                room.y + (room.height * this.settings.gridSize) / 2
            );
            floorMesh.receiveShadow = true;
            
            // Add collision to floor - prevents falling through
            dungeonGroup.colliderMeshes.push(floorMesh);
            dungeonGroup.add(floorMesh);
            
            // Create walls with doorways
            this.createRoomWalls(dungeonGroup, room, wallMaterial);
        }
        
        // Add corridor floors and walls
        for (const corridor of corridors) {
            this.createCorridorWithWalls(dungeonGroup, corridor, floorMaterial, wallMaterial);
        }
        
        // Add key
        const keyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const keyMesh = new THREE.Mesh(keyGeometry, keyMaterial);
        keyMesh.position.set(
            keyPosition.x,
            1, // Floating above the floor
            keyPosition.y
        );
        
        // Add a point light to the key to make it glow
        const keyLight = new THREE.PointLight(0xffcc00, 1, 10);
        keyLight.position.copy(keyMesh.position);
        dungeonGroup.add(keyLight);
        
        keyMesh.castShadow = true;
        dungeonGroup.add(keyMesh);
        
        return dungeonGroup;
    }
    
    createRoomWalls(group, room, wallMaterial) {
        // Get doorway info for this room
        const doorways = room.doorways || [];
        
        // Create north wall with possible doorway gaps
        this.createWallWithDoorways(
            group,
            room.x,
            room.y,
            room.width * this.settings.gridSize,
            this.settings.wallHeight,
            this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => d.isNorthWall)
        );
        
        // Create south wall with possible doorway gaps
        this.createWallWithDoorways(
            group,
            room.x,
            room.y + room.height * this.settings.gridSize - this.settings.gridSize,
            room.width * this.settings.gridSize,
            this.settings.wallHeight,
            this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => !d.isNorthWall && !d.isEastWall)
        );
        
        // Create west wall with possible doorway gaps
        this.createWallWithDoorways(
            group,
            room.x,
            room.y,
            this.settings.gridSize,
            this.settings.wallHeight,
            room.height * this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => !d.isEastWall),
            true
        );
        
        // Create east wall with possible doorway gaps
        this.createWallWithDoorways(
            group,
            room.x + room.width * this.settings.gridSize - this.settings.gridSize,
            room.y,
            this.settings.gridSize,
            this.settings.wallHeight,
            room.height * this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => d.isEastWall),
            true
        );
    }
    
    createWallWithDoorways(group, x, y, width, height, depth, material, doorways, isVertical = false) {
        // If no doorways, create a single wall
        if (!doorways || doorways.length === 0) {
            const wallMesh = this.createWall(group, x, y, width, height, depth, material);
            group.colliderMeshes.push(wallMesh);
            return;
        }
        
        // For walls with doorways, create wall segments
        if (isVertical) {
            // Vertical wall (west or east wall)
            // Sort doorways by Y position
            doorways.sort((a, b) => a.y - b.y);
            
            let currentY = y;
            
            for (const doorway of doorways) {
                // Create wall segment from current position to doorway
                if (doorway.y > currentY) {
                    const segmentHeight = doorway.y - currentY;
                    const wallMesh = this.createWall(
                        group, 
                        x, 
                        currentY, 
                        width, 
                        height, 
                        segmentHeight, 
                        material
                    );
                    group.colliderMeshes.push(wallMesh);
                }
                
                // Skip the doorway
                currentY = doorway.y + doorway.height;
            }
            
            // Create final wall segment after the last doorway
            const endY = y + depth;
            if (currentY < endY) {
                const segmentHeight = endY - currentY;
                const wallMesh = this.createWall(
                    group, 
                    x, 
                    currentY, 
                    width, 
                    height, 
                    segmentHeight, 
                    material
                );
                group.colliderMeshes.push(wallMesh);
            }
        } else {
            // Horizontal wall (north or south wall)
            // Sort doorways by X position
            doorways.sort((a, b) => a.x - b.x);
            
            let currentX = x;
            
            for (const doorway of doorways) {
                // Create wall segment from current position to doorway
                if (doorway.x > currentX) {
                    const segmentWidth = doorway.x - currentX;
                    const wallMesh = this.createWall(
                        group, 
                        currentX, 
                        y, 
                        segmentWidth, 
                        height, 
                        depth, 
                        material
                    );
                    group.colliderMeshes.push(wallMesh);
                }
                
                // Skip the doorway
                currentX = doorway.x + doorway.width;
            }
            
            // Create final wall segment after the last doorway
            const endX = x + width;
            if (currentX < endX) {
                const segmentWidth = endX - currentX;
                const wallMesh = this.createWall(
                    group, 
                    currentX, 
                    y, 
                    segmentWidth, 
                    height, 
                    depth, 
                    material
                );
                group.colliderMeshes.push(wallMesh);
            }
        }
    }
    
    createCorridorWithWalls(group, corridor, floorMaterial, wallMaterial) {
        // Determine corridor orientation and dimensions
        let width, depth, x, z;
        
        if (corridor.isHorizontal) {
            // Horizontal corridor
            width = Math.abs(corridor.x2 - corridor.x1);
            depth = corridor.width * this.settings.gridSize;
            x = Math.min(corridor.x1, corridor.x2);
            z = corridor.y1 - depth / 2;
        } else {
            // Vertical corridor
            width = corridor.width * this.settings.gridSize;
            depth = Math.abs(corridor.y2 - corridor.y1);
            x = corridor.x1 - width / 2;
            z = Math.min(corridor.y1, corridor.y2);
        }
        
        // Create corridor floor
        const corridorGeometry = new THREE.BoxGeometry(width, this.settings.floorHeight, depth);
        const corridorMesh = new THREE.Mesh(corridorGeometry, floorMaterial);
        
        corridorMesh.position.set(
            x + width / 2,
            -this.settings.floorHeight / 2,
            z + depth / 2
        );
        
        corridorMesh.receiveShadow = true;
        group.colliderMeshes.push(corridorMesh);
        group.add(corridorMesh);
        
        // Add walls along the corridor
        if (corridor.isHorizontal) {
            // Add north and south walls for horizontal corridors
            
            // North wall
            const northWall = this.createWall(
                group,
                x,
                z,
                width,
                this.settings.wallHeight,
                this.settings.gridSize,
                wallMaterial
            );
            group.colliderMeshes.push(northWall);
            
            // South wall
            const southWall = this.createWall(
                group,
                x,
                z + depth - this.settings.gridSize,
                width,
                this.settings.wallHeight,
                this.settings.gridSize,
                wallMaterial
            );
            group.colliderMeshes.push(southWall);
        } else {
            // Add east and west walls for vertical corridors
            
            // West wall
            const westWall = this.createWall(
                group,
                x,
                z,
                this.settings.gridSize,
                this.settings.wallHeight,
                depth,
                wallMaterial
            );
            group.colliderMeshes.push(westWall);
            
            // East wall
            const eastWall = this.createWall(
                group,
                x + width - this.settings.gridSize,
                z,
                this.settings.gridSize,
                this.settings.wallHeight,
                depth,
                wallMaterial
            );
            group.colliderMeshes.push(eastWall);
        }
    }
    
    createWall(group, x, y, width, height, depth, material) {
        const wallGeometry = new THREE.BoxGeometry(width, height, depth);
        const wallMesh = new THREE.Mesh(wallGeometry, material);
        
        wallMesh.position.set(
            x + width / 2,
            height / 2,
            y + depth / 2
        );
        
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        
        group.add(wallMesh);
        
        return wallMesh;
    }
}
