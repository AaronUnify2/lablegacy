export class DungeonGenerator {
    constructor() {
        // Updated settings for dungeon generation
        this.settings = {
            minRooms: 5,
            maxRooms: 15,
            roomSizeMin: 20, // 5x larger (was 4)
            roomSizeMax: 50, // 5x larger (was 10)
            corridorWidth: 4, // 2x wider (was 2)
            floorHeight: 0.2,
            wallHeight: 3,
            gridSize: 1, // Size of each grid cell
            doorwayWidth: 3 // Width of doorways between rooms
        };
    }
    
    generateFloor(floorLevel) {
        console.log(`Generating floor level ${floorLevel}...`);
        
        // Adjust settings based on floor level if desired
        // For example, higher floors could have more rooms
        const numRooms = Math.min(
            this.settings.minRooms + Math.floor(floorLevel / 2),
            this.settings.maxRooms
        );
        
        // Generate rooms
        const rooms = this.generateRooms(numRooms);
        
        // Connect rooms with corridors
        const corridors = this.connectRooms(rooms);
        
        // Add doorways to rooms
        this.createDoorways(rooms, corridors);
        
        // Place the key
        const keyPosition = this.placeKey(rooms);
        
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
    
    generateRooms(numRooms) {
        const rooms = [];
        const gridSize = this.settings.gridSize;
        
        // For this basic implementation, we'll create a simple grid of rooms
        // A more sophisticated approach would use proper procedural generation
        
        // Create a basic maze with rooms in a grid pattern for testing
        const gridWidth = Math.ceil(Math.sqrt(numRooms));
        const gridHeight = Math.ceil(numRooms / gridWidth);
        
        // Calculate spacing between room centers to accommodate larger rooms
        const roomSpacingX = Math.max(this.settings.roomSizeMax + 25, 80) * gridSize;
        const roomSpacingY = Math.max(this.settings.roomSizeMax + 25, 80) * gridSize;
        
        for (let i = 0; i < numRooms; i++) {
            const gridX = i % gridWidth;
            const gridY = Math.floor(i / gridWidth);
            
            const roomWidth = Math.floor(Math.random() * 
                (this.settings.roomSizeMax - this.settings.roomSizeMin + 1)) + 
                this.settings.roomSizeMin;
            
            const roomHeight = Math.floor(Math.random() * 
                (this.settings.roomSizeMax - this.settings.roomSizeMin + 1)) + 
                this.settings.roomSizeMin;
            
            // Add some randomness to the position within the grid cell
            const roomX = gridX * roomSpacingX + 
                (Math.random() * 10 - 5) * gridSize;
            
            const roomY = gridY * roomSpacingY + 
                (Math.random() * 10 - 5) * gridSize;
            
            rooms.push({
                x: roomX,
                y: roomY,
                width: roomWidth,
                height: roomHeight,
                connections: [],
                doorways: [] // Will store doorway information
            });
        }
        
        return rooms;
    }
    
    connectRooms(rooms) {
        const corridors = [];
        
        // Simple approach: connect each room to the next one
        for (let i = 0; i < rooms.length - 1; i++) {
            const startRoom = rooms[i];
            const endRoom = rooms[i + 1];
            
            const startX = startRoom.x + startRoom.width / 2;
            const startY = startRoom.y + startRoom.height / 2;
            const endX = endRoom.x + endRoom.width / 2;
            const endY = endRoom.y + endRoom.height / 2;
            
            // Create an L-shaped corridor
            const corridorX = {
                x1: startX,
                y1: startY,
                x2: endX,
                y2: startY,
                width: this.settings.corridorWidth,
                isHorizontal: true,
                startRoom: startRoom,
                endRoom: null // Will be connected to vertical corridor
            };
            
            const corridorY = {
                x1: endX,
                y1: startY,
                x2: endX,
                y2: endY,
                width: this.settings.corridorWidth,
                isHorizontal: false,
                startRoom: null, // Connected from horizontal corridor
                endRoom: endRoom
            };
            
            corridors.push(corridorX);
            corridors.push(corridorY);
            
            // Mark rooms as connected
            startRoom.connections.push(endRoom);
            endRoom.connections.push(startRoom);
        }
        
        // Optionally add some random connections for more interesting layouts
        if (rooms.length > 3) {
            const numExtraConnections = Math.floor(rooms.length / 3);
            
            for (let i = 0; i < numExtraConnections; i++) {
                const roomIndex1 = Math.floor(Math.random() * rooms.length);
                let roomIndex2 = Math.floor(Math.random() * rooms.length);
                
                // Ensure we're connecting different rooms
                while (roomIndex2 === roomIndex1 || 
                       rooms[roomIndex1].connections.includes(rooms[roomIndex2])) {
                    roomIndex2 = Math.floor(Math.random() * rooms.length);
                }
                
                const startRoom = rooms[roomIndex1];
                const endRoom = rooms[roomIndex2];
                
                const startX = startRoom.x + startRoom.width / 2;
                const startY = startRoom.y + startRoom.height / 2;
                const endX = endRoom.x + endRoom.width / 2;
                const endY = endRoom.y + endRoom.height / 2;
                
                // Create an L-shaped corridor
                const corridorX = {
                    x1: startX,
                    y1: startY,
                    x2: endX,
                    y2: startY,
                    width: this.settings.corridorWidth,
                    isHorizontal: true,
                    startRoom: startRoom,
                    endRoom: null
                };
                
                const corridorY = {
                    x1: endX,
                    y1: startY,
                    x2: endX,
                    y2: endY,
                    width: this.settings.corridorWidth,
                    isHorizontal: false,
                    startRoom: null,
                    endRoom: endRoom
                };
                
                corridors.push(corridorX);
                corridors.push(corridorY);
                
                // Mark rooms as connected
                startRoom.connections.push(endRoom);
                endRoom.connections.push(startRoom);
            }
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
                    
                    doorY = corridor.y1 - this.settings.doorwayWidth / 2;
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
                    
                    doorX = corridor.x1 - this.settings.doorwayWidth / 2;
                    
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
    
    placeKey(rooms) {
        // Place the key in the last room for simplicity
        // In a more sophisticated system, this could be more strategic
        const keyRoom = rooms[rooms.length - 1];
        
        return {
            x: keyRoom.x + keyRoom.width / 2,
            y: keyRoom.y + keyRoom.height / 2
        };
    }
    
    createDungeonMesh(rooms, corridors, keyPosition) {
        // Create a group to hold all dungeon meshes
        const dungeonGroup = new THREE.Group();
        
        // Create floor materials
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
            // Create floor
            const floorGeometry = new THREE.BoxGeometry(
                room.width * this.settings.gridSize,
                this.settings.floorHeight,
                room.height * this.settings.gridSize
            );
            
            const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
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
