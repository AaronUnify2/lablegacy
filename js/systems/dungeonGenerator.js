export class DungeonGenerator {
    constructor() {
        // Settings for dungeon generation
        this.settings = {
            minRooms: 5,
            maxRooms: 15,
            roomSizeMin: 20,
            roomSizeMax: 50,
            corridorWidth: 5,
            floorHeight: 0.2,
            wallHeight: 3,
            gridSize: 1,
            doorwayWidth: 5
        };
    }
    
    generateFloor(floorLevel) {
        console.log(`Generating floor level ${floorLevel}...`);
        
        // Adjust settings based on floor level if desired
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
        
        // First, we'll create a minimum spanning tree to ensure connectivity
        // Connect each room to the nearest room that isn't already connected
        const connectedRooms = [0]; // Start with the first room
        const unconnectedRooms = rooms.slice(1).map((_, index) => index + 1);
        
        while (unconnectedRooms.length > 0) {
            let minDistance = Infinity;
            let bestConnection = null;
            
            // Find the closest pair of rooms between connected and unconnected sets
            for (const connectedIndex of connectedRooms) {
                const connectedRoom = rooms[connectedIndex];
                
                for (const unconnectedIndex of unconnectedRooms) {
                    const unconnectedRoom = rooms[unconnectedIndex];
                    
                    // Find the closest points between the two rooms (at the edges)
                    const connection = this.findBestConnectionPoints(connectedRoom, unconnectedRoom);
                    const distance = connection.distance;
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestConnection = {
                            startRoom: connectedRoom,
                            endRoom: unconnectedRoom,
                            startIndex: connectedIndex,
                            endIndex: unconnectedIndex,
                            startPoint: connection.startPoint,
                            endPoint: connection.endPoint
                        };
                    }
                }
            }
            
            if (bestConnection) {
                // Create corridor between these rooms
                const corridor = this.createCorridor(
                    bestConnection.startPoint, 
                    bestConnection.endPoint,
                    bestConnection.startRoom,
                    bestConnection.endRoom
                );
                
                corridors.push(corridor);
                
                // Mark rooms as connected
                bestConnection.startRoom.connections.push(bestConnection.endRoom);
                bestConnection.endRoom.connections.push(bestConnection.startRoom);
                
                // Move the connected room to the connected set
                connectedRooms.push(bestConnection.endIndex);
                const indexToRemove = unconnectedRooms.indexOf(bestConnection.endIndex);
                if (indexToRemove !== -1) {
                    unconnectedRooms.splice(indexToRemove, 1);
                }
            }
        }
        
        // Optionally add some random connections for more interesting layouts (cycles)
        if (rooms.length > 3) {
            const numExtraConnections = Math.floor(rooms.length / 3);
            let extraConnectionsAdded = 0;
            
            // Try several times to add extra connections
            for (let attempts = 0; attempts < numExtraConnections * 3 && extraConnectionsAdded < numExtraConnections; attempts++) {
                const roomIndex1 = Math.floor(Math.random() * rooms.length);
                let roomIndex2 = Math.floor(Math.random() * rooms.length);
                
                // Ensure we're connecting different rooms that aren't already connected
                if (roomIndex2 === roomIndex1 || 
                    rooms[roomIndex1].connections.includes(rooms[roomIndex2])) {
                    continue;
                }
                
                const startRoom = rooms[roomIndex1];
                const endRoom = rooms[roomIndex2];
                
                // Find the best connection points between these rooms
                const connection = this.findBestConnectionPoints(startRoom, endRoom);
                
                // Only add the connection if the rooms are reasonably close
                // This prevents very long corridors
                if (connection.distance < 100) {
                    const corridor = this.createCorridor(
                        connection.startPoint, 
                        connection.endPoint,
                        startRoom,
                        endRoom
                    );
                    
                    corridors.push(corridor);
                    
                    // Mark rooms as connected
                    startRoom.connections.push(endRoom);
                    endRoom.connections.push(startRoom);
                    
                    extraConnectionsAdded++;
                }
            }
        }
        
        return corridors;
    }
    
    // Helper to find the best connection points between two rooms
    findBestConnectionPoints(roomA, roomB) {
        // Define the edges of each room
        const edgesA = [
            { // North edge (top)
                start: { x: roomA.x, y: roomA.y },
                end: { x: roomA.x + roomA.width, y: roomA.y },
                dir: 'north'
            },
            { // South edge (bottom)
                start: { x: roomA.x, y: roomA.y + roomA.height },
                end: { x: roomA.x + roomA.width, y: roomA.y + roomA.height },
                dir: 'south'
            },
            { // West edge (left)
                start: { x: roomA.x, y: roomA.y },
                end: { x: roomA.x, y: roomA.y + roomA.height },
                dir: 'west'
            },
            { // East edge (right)
                start: { x: roomA.x + roomA.width, y: roomA.y },
                end: { x: roomA.x + roomA.width, y: roomA.y + roomA.height },
                dir: 'east'
            }
        ];
        
        const edgesB = [
            { // North edge (top)
                start: { x: roomB.x, y: roomB.y },
                end: { x: roomB.x + roomB.width, y: roomB.y },
                dir: 'north'
            },
            { // South edge (bottom)
                start: { x: roomB.x, y: roomB.y + roomB.height },
                end: { x: roomB.x + roomB.width, y: roomB.y + roomB.height },
                dir: 'south'
            },
            { // West edge (left)
                start: { x: roomB.x, y: roomB.y },
                end: { x: roomB.x, y: roomB.y + roomB.height },
                dir: 'west'
            },
            { // East edge (right)
                start: { x: roomB.x + roomB.width, y: roomB.y },
                end: { x: roomB.x + roomB.width, y: roomB.y + roomB.height },
                dir: 'east'
            }
        ];
        
        let minDistance = Infinity;
        let bestStartPoint = null;
        let bestEndPoint = null;
        let bestEdgeA = null;
        let bestEdgeB = null;
        
        // Try all edge combinations to find the closest points
        for (const edgeA of edgesA) {
            for (const edgeB of edgesB) {
                // Skip incompatible edge pairs (facing the same direction)
                if ((edgeA.dir === 'north' && edgeB.dir === 'north') ||
                    (edgeA.dir === 'south' && edgeB.dir === 'south') ||
                    (edgeA.dir === 'east' && edgeB.dir === 'east') ||
                    (edgeA.dir === 'west' && edgeB.dir === 'west')) {
                    continue;
                }
                
                // Find the best points on these edges
                let startPoint, endPoint, distance;
                
                // Horizontal edge to vertical edge
                if ((edgeA.dir === 'north' || edgeA.dir === 'south') && 
                    (edgeB.dir === 'east' || edgeB.dir === 'west')) {
                    
                    // Clamp x-position to edge A's range
                    const xPos = Math.min(Math.max(edgeB.start.x, edgeA.start.x), edgeA.end.x);
                    startPoint = { x: xPos, y: edgeA.start.y };
                    endPoint = { x: edgeB.start.x, y: Math.min(Math.max(startPoint.y, edgeB.start.y), edgeB.end.y) };
                    
                } 
                // Vertical edge to horizontal edge
                else if ((edgeA.dir === 'east' || edgeA.dir === 'west') && 
                         (edgeB.dir === 'north' || edgeB.dir === 'south')) {
                    
                    // Clamp y-position to edge A's range
                    const yPos = Math.min(Math.max(edgeB.start.y, edgeA.start.y), edgeA.end.y);
                    startPoint = { x: edgeA.start.x, y: yPos };
                    endPoint = { x: Math.min(Math.max(startPoint.x, edgeB.start.x), edgeB.end.x), y: edgeB.start.y };
                    
                }
                // Horizontal edge to horizontal edge
                else if ((edgeA.dir === 'north' || edgeA.dir === 'south') && 
                         (edgeB.dir === 'north' || edgeB.dir === 'south')) {
                    
                    // Find overlapping x-range
                    const maxStartX = Math.max(edgeA.start.x, edgeB.start.x);
                    const minEndX = Math.min(edgeA.end.x, edgeB.end.x);
                    
                    if (maxStartX <= minEndX) {
                        // There is an overlap
                        const midX = (maxStartX + minEndX) / 2;
                        startPoint = { x: midX, y: edgeA.start.y };
                        endPoint = { x: midX, y: edgeB.start.y };
                    } else {
                        // No overlap, use closest endpoints
                        if (edgeA.end.x < edgeB.start.x) {
                            startPoint = { x: edgeA.end.x, y: edgeA.start.y };
                            endPoint = { x: edgeB.start.x, y: edgeB.start.y };
                        } else {
                            startPoint = { x: edgeA.start.x, y: edgeA.start.y };
                            endPoint = { x: edgeB.end.x, y: edgeB.start.y };
                        }
                    }
                }
                // Vertical edge to vertical edge
                else if ((edgeA.dir === 'east' || edgeA.dir === 'west') && 
                         (edgeB.dir === 'east' || edgeB.dir === 'west')) {
                    
                    // Find overlapping y-range
                    const maxStartY = Math.max(edgeA.start.y, edgeB.start.y);
                    const minEndY = Math.min(edgeA.end.y, edgeB.end.y);
                    
                    if (maxStartY <= minEndY) {
                        // There is an overlap
                        const midY = (maxStartY + minEndY) / 2;
                        startPoint = { x: edgeA.start.x, y: midY };
                        endPoint = { x: edgeB.start.x, y: midY };
                    } else {
                        // No overlap, use closest endpoints
                        if (edgeA.end.y < edgeB.start.y) {
                            startPoint = { x: edgeA.start.x, y: edgeA.end.y };
                            endPoint = { x: edgeB.start.x, y: edgeB.start.y };
                        } else {
                            startPoint = { x: edgeA.start.x, y: edgeA.start.y };
                            endPoint = { x: edgeB.start.x, y: edgeB.end.y };
                        }
                    }
                }
                
                // Calculate Manhattan distance
                distance = Math.abs(startPoint.x - endPoint.x) + Math.abs(startPoint.y - endPoint.y);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    bestStartPoint = startPoint;
                    bestEndPoint = endPoint;
                    bestEdgeA = edgeA;
                    bestEdgeB = edgeB;
                }
            }
        }
        
        // Return the best connection points
        return {
            startPoint: bestStartPoint,
            endPoint: bestEndPoint,
            distance: minDistance,
            startEdge: bestEdgeA,
            endEdge: bestEdgeB
        };
    }
    
    // Create a corridor between two points
    createCorridor(startPoint, endPoint, startRoom, endRoom) {
        // Determine if we need an L-shaped or straight corridor
        const isHorizontalFirst = Math.random() > 0.5;
        
        if (isHorizontalFirst) {
            // First horizontal, then vertical
            return {
                points: [
                    { x: startPoint.x, y: startPoint.y },
                    { x: endPoint.x, y: startPoint.y },
                    { x: endPoint.x, y: endPoint.y }
                ],
                width: this.settings.corridorWidth,
                startRoom: startRoom,
                endRoom: endRoom
            };
        } else {
            // First vertical, then horizontal
            return {
                points: [
                    { x: startPoint.x, y: startPoint.y },
                    { x: startPoint.x, y: endPoint.y },
                    { x: endPoint.x, y: endPoint.y }
                ],
                width: this.settings.corridorWidth,
                startRoom: startRoom,
                endRoom: endRoom
            };
        }
    }
    
    createDoorways(rooms, corridors) {
        // For each corridor, create doorways where it meets rooms
        for (const corridor of corridors) {
            const startRoom = corridor.startRoom;
            const endRoom = corridor.endRoom;
            const points = corridor.points;
            
            // Create doorway at the start point
            this.createDoorwayForRoom(startRoom, points[0], points[1]);
            
            // Create doorway at the end point
            this.createDoorwayForRoom(endRoom, points[points.length - 1], points[points.length - 2]);
        }
    }
    
    createDoorwayForRoom(room, doorPoint, corridorPoint) {
        // Determine which wall the doorway is on
        let wallType;
        
        // Check if doorway is on the north wall
        if (Math.abs(doorPoint.y - room.y) < 0.1) {
            wallType = 'north';
        }
        // Check if doorway is on the south wall
        else if (Math.abs(doorPoint.y - (room.y + room.height)) < 0.1) {
            wallType = 'south';
        }
        // Check if doorway is on the west wall
        else if (Math.abs(doorPoint.x - room.x) < 0.1) {
            wallType = 'west';
        }
        // Check if doorway is on the east wall
        else if (Math.abs(doorPoint.x - (room.x + room.width)) < 0.1) {
            wallType = 'east';
        }
        
        // Create the doorway object
        const doorway = {
            x: doorPoint.x - this.settings.doorwayWidth / 2,
            y: doorPoint.y - this.settings.doorwayWidth / 2,
            width: wallType === 'north' || wallType === 'south' ? 
                  this.settings.doorwayWidth : this.settings.gridSize,
            height: wallType === 'east' || wallType === 'west' ? 
                   this.settings.doorwayWidth : this.settings.gridSize,
            isEastWall: wallType === 'east',
            isNorthWall: wallType === 'north'
        };
        
        // Add doorway to the room
        room.doorways.push(doorway);
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
            this.createCorridorSegments(dungeonGroup, corridor, floorMaterial, wallMaterial);
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
    
    createCorridorSegments(group, corridor, floorMaterial, wallMaterial) {
        const points = corridor.points;
        
        // Create segments between each pair of points
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Determine corridor orientation and dimensions
            let width, depth, x, z;
            const isHorizontal = Math.abs(p1.y - p2.y) < 0.1;
            
            if (isHorizontal) {
                // Horizontal corridor
                width = Math.abs(p2.x - p1.x);
                depth = corridor.width;
                x = Math.min(p1.x, p2.x);
                z = p1.y - depth / 2;
            } else {
                // Vertical corridor
                width = corridor.width;
                depth = Math.abs(p2.y - p1.y);
                x = p1.x - width / 2;
                z = Math.min(p1.y, p2.y);
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
            if (isHorizontal) {
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
