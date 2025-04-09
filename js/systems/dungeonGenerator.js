export class DungeonGenerator {
    constructor() {
        // Settings for dungeon generation
        this.settings = {
            // Room sizes
            hubRoomSize: 50, // Size of the central hub
            outerRoomSizeMin: 30,
            outerRoomSizeMax: 45,
            
            // Room counts and probabilities
            numOuterRooms: 5, // Number of main rooms around the hub
            
            // Features
            pillarSize: 6, // Size of the central pillar
            roomPillarChance: 0.4, // Chance for a room to have a pillar
            alcoveChance: 0.7, // Chance to add alcoves to room edges
            alcoveSizeMin: 5,
            alcoveSizeMax: 15,
            alcoveDepthMin: 5,
            alcoveDepthMax: 10,
            
            // Construction
            corridorWidth: 5,
            floorHeight: 0.2,
            wallHeight: 3,
            gridSize: 1,
            doorwayWidth: 5,
            
            // Spacing
            minRoomSpacing: 20, // Minimum distance between rooms
            hubDistanceMultiplier: 1.8 // Controls how far rooms are from the hub
        };
    }
    
    generateFloor(floorLevel) {
        console.log(`Generating hub-based dungeon level ${floorLevel}...`);
        
        // Generate the central hub room
        const hubRoom = this.generateHubRoom();
        
        // Generate outer rooms around the hub
        const outerRooms = this.generateOuterRooms(hubRoom);
        
        // Combine all rooms into a single array
        const allRooms = [hubRoom, ...outerRooms];
        
        // Connect rooms with corridors - simplified to hub-spoke model
        const corridors = this.connectRooms(hubRoom, outerRooms);
        
        // Add features to rooms (pillars, alcoves)
        this.addRoomFeatures(allRooms);
        
        // Add doorways to rooms where corridors connect
        this.createDoorways(allRooms, corridors);
        
        // Place the key in a random outer room
        const keyPosition = this.placeKey(outerRooms);
        
        // Create the dungeon mesh
        const dungeonMesh = this.createDungeonMesh(allRooms, corridors, keyPosition);
        
        // Return the generated dungeon data
        return {
            level: floorLevel,
            rooms: allRooms,
            corridors: corridors,
            keyPosition: keyPosition,
            mesh: dungeonMesh
        };
    }
    
    generateHubRoom() {
        const size = this.settings.hubRoomSize;
        
        // Create a central hub room
        const hubRoom = {
            x: -size / 2, // Center the room at the origin
            y: -size / 2,
            width: size,
            height: size,
            isHub: true,
            connections: [],
            doorways: [],
            features: [],
            type: 'hub'
        };
        
        // Add a central pillar
        const pillarSize = this.settings.pillarSize;
        hubRoom.features.push({
            type: 'pillar',
            shape: 'circle',
            x: 0 - pillarSize / 2, // Center of the room
            y: 0 - pillarSize / 2,
            width: pillarSize,
            height: pillarSize
        });
        
        return hubRoom;
    }
    
    generateOuterRooms(hubRoom) {
        const outerRooms = [];
        const numRooms = this.settings.numOuterRooms;
        const hubRadius = (this.settings.hubRoomSize / 2);
        
        // Calculate base distance to ensure rooms don't overlap with the hub
        // Use the diagonal of the hub room and add minimum spacing
        const hubDiagonal = Math.sqrt(Math.pow(hubRoom.width, 2) + Math.pow(hubRoom.height, 2));
        const baseDistance = (hubDiagonal / 2) * this.settings.hubDistanceMultiplier;
        
        // Place rooms in a circle around the hub
        for (let i = 0; i < numRooms; i++) {
            // Calculate position on the circle
            const angle = (i / numRooms) * Math.PI * 2;
            const roomWidth = Math.floor(Math.random() * 
                (this.settings.outerRoomSizeMax - this.settings.outerRoomSizeMin + 1)) + 
                this.settings.outerRoomSizeMin;
            const roomHeight = Math.floor(Math.random() * 
                (this.settings.outerRoomSizeMax - this.settings.outerRoomSizeMin + 1)) + 
                this.settings.outerRoomSizeMin;
            
            // Distance from hub center to outer room center
            // Add room size to base distance to ensure edge rooms don't overlap
            const distanceFromHub = baseDistance + Math.max(roomWidth, roomHeight) / 2;
            
            // Position is at center of room
            const centerX = Math.cos(angle) * distanceFromHub;
            const centerY = Math.sin(angle) * distanceFromHub;
            
            // Adjust to get the top-left corner
            const roomX = centerX - roomWidth / 2;
            const roomY = centerY - roomHeight / 2;
            
            // Create the room
            const room = {
                x: roomX,
                y: roomY,
                width: roomWidth,
                height: roomHeight,
                angle: angle, // Store the angle for corridor connection
                connections: [],
                doorways: [],
                features: [],
                type: 'outer',
                index: i
            };
            
            // Check if this room overlaps with any existing outer room
            let overlaps = false;
            for (const existingRoom of outerRooms) {
                if (this.roomsOverlap(room, existingRoom, this.settings.minRoomSpacing)) {
                    overlaps = true;
                    break;
                }
            }
            
            // If no overlap, add the room
            if (!overlaps) {
                outerRooms.push(room);
            } else {
                // If overlap, adjust the angle slightly and try again
                i--; // Retry this room
            }
        }
        
        return outerRooms;
    }
    
    roomsOverlap(roomA, roomB, spacing = 0) {
        // Add spacing to room dimensions
        const aLeft = roomA.x - spacing;
        const aRight = roomA.x + roomA.width + spacing;
        const aTop = roomA.y - spacing;
        const aBottom = roomA.y + roomA.height + spacing;
        
        const bLeft = roomB.x - spacing;
        const bRight = roomB.x + roomB.width + spacing;
        const bTop = roomB.y - spacing;
        const bBottom = roomB.y + roomB.height + spacing;
        
        // Check for overlap
        return !(
            aRight < bLeft ||
            aLeft > bRight ||
            aBottom < bTop ||
            aTop > bBottom
        );
    }
    
    // Helper to determine which edge to connect to based on angle
    getEdgeForAngle(angle) {
        // Normalize angle to 0-2π
        const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        
        // Determine which edge to use based on the angle
        // East: -π/4 to π/4
        // North: π/4 to 3π/4
        // West: 3π/4 to 5π/4
        // South: 5π/4 to 7π/4
        
        if (normalizedAngle < Math.PI / 4 || normalizedAngle >= Math.PI * 7 / 4) {
            return 'east';
        } else if (normalizedAngle < Math.PI * 3 / 4) {
            return 'north';
        } else if (normalizedAngle < Math.PI * 5 / 4) {
            return 'west';
        } else {
            return 'south';
        }
    }
    
    // Helper to find the center point of a room's edge based on edge type
    getEdgeAttachPoint(room, edge) {
        let point = {x: 0, y: 0};
        
        switch(edge) {
            case 'north':
                point.x = room.x + room.width / 2;
                point.y = room.y;
                break;
            case 'south':
                point.x = room.x + room.width / 2;
                point.y = room.y + room.height;
                break;
            case 'east':
                point.x = room.x + room.width;
                point.y = room.y + room.height / 2;
                break;
            case 'west':
                point.x = room.x;
                point.y = room.y + room.height / 2;
                break;
        }
        
        return point;
    }
    
    // Get the opposite edge
    getOppositeEdge(edge) {
        switch(edge) {
            case 'north': return 'south';
            case 'south': return 'north';
            case 'east': return 'west';
            case 'west': return 'east';
            default: return 'north';
        }
    }
    
    connectRooms(hubRoom, outerRooms) {
        const corridors = [];
        
        // Connect hub to each outer room with a direct corridor
        for (const outerRoom of outerRooms) {
            // Calculate hub connection info
            const outerRoomCenter = {
                x: outerRoom.x + outerRoom.width / 2,
                y: outerRoom.y + outerRoom.height / 2
            };
            
            const hubCenter = {
                x: hubRoom.x + hubRoom.width / 2,
                y: hubRoom.y + hubRoom.height / 2
            };
            
            // Calculate angle from hub to outer room
            const angle = Math.atan2(
                outerRoomCenter.y - hubCenter.y,
                outerRoomCenter.x - hubCenter.x
            );
            
            // Determine which hub edge to connect from
            const hubEdge = this.getEdgeForAngle(angle);
            const hubPoint = this.getEdgeAttachPoint(hubRoom, hubEdge);
            
            // Determine which outer room edge to connect to
            const outerEdge = this.getOppositeEdge(hubEdge);
            const outerPoint = this.getEdgeAttachPoint(outerRoom, outerEdge);
            
            // Create a simple straight corridor
            const corridor = {
                points: [hubPoint, outerPoint],
                width: this.settings.corridorWidth,
                startRoom: hubRoom,
                endRoom: outerRoom,
                startEdge: hubEdge,
                endEdge: outerEdge
            };
            
            corridors.push(corridor);
            
            // Store the connection
            hubRoom.connections.push(outerRoom);
            outerRoom.connections.push(hubRoom);
        }
        
        return corridors;
    }
    
    addRoomFeatures(allRooms) {
        // Skip the hub room as we already added a central pillar
        for (const room of allRooms) {
            if (room.isHub) continue;
            
            // Chance to add a pillar to the room
            if (Math.random() < this.settings.roomPillarChance) {
                const pillarShapes = ['square', 'triangle', 'circle'];
                const randomShape = pillarShapes[Math.floor(Math.random() * pillarShapes.length)];
                const pillarSize = this.settings.pillarSize;
                
                // Place in center of room
                const pillarX = room.x + room.width / 2 - pillarSize / 2;
                const pillarY = room.y + room.height / 2 - pillarSize / 2;
                
                room.features.push({
                    type: 'pillar',
                    shape: randomShape,
                    x: pillarX,
                    y: pillarY,
                    width: pillarSize,
                    height: pillarSize
                });
            }
            
            // Add alcoves to some edges without doorways
            this.addAlcovesToRoom(room);
        }
    }
    
    addAlcovesToRoom(room) {
        // Check each edge of the room
        const edges = ['north', 'south', 'east', 'west'];
        
        for (const edge of edges) {
            // Skip if there's already a connection on this edge (check room.connections)
            let hasConnectionOnEdge = false;
            for (const connectedRoom of room.connections) {
                // Find the corridor that connects these rooms
                const corridorToHub = room.type === 'outer' && connectedRoom.isHub;
                if (corridorToHub) {
                    // Skip edges that already have a doorway to the hub
                    if ((edge === 'north' && room.y > connectedRoom.y) ||
                        (edge === 'south' && room.y < connectedRoom.y) ||
                        (edge === 'east' && room.x < connectedRoom.x) ||
                        (edge === 'west' && room.x > connectedRoom.x)) {
                        hasConnectionOnEdge = true;
                        break;
                    }
                }
            }
            
            // If no connection and we pass the random check, add an alcove
            if (!hasConnectionOnEdge && Math.random() < this.settings.alcoveChance) {
                const alcoveWidth = Math.floor(Math.random() * 
                    (this.settings.alcoveSizeMax - this.settings.alcoveSizeMin + 1)) + 
                    this.settings.alcoveSizeMin;
                
                const alcoveDepth = Math.floor(Math.random() * 
                    (this.settings.alcoveDepthMax - this.settings.alcoveDepthMin + 1)) + 
                    this.settings.alcoveDepthMin;
                
                let alcoveX, alcoveY, alcoveW, alcoveH;
                
                // Position the alcove based on the edge
                if (edge === 'north') {
                    alcoveX = room.x + Math.random() * (room.width - alcoveWidth);
                    alcoveY = room.y - alcoveDepth;
                    alcoveW = alcoveWidth;
                    alcoveH = alcoveDepth;
                } else if (edge === 'south') {
                    alcoveX = room.x + Math.random() * (room.width - alcoveWidth);
                    alcoveY = room.y + room.height;
                    alcoveW = alcoveWidth;
                    alcoveH = alcoveDepth;
                } else if (edge === 'east') {
                    alcoveX = room.x + room.width;
                    alcoveY = room.y + Math.random() * (room.height - alcoveWidth);
                    alcoveW = alcoveDepth;
                    alcoveH = alcoveWidth;
                } else if (edge === 'west') {
                    alcoveX = room.x - alcoveDepth;
                    alcoveY = room.y + Math.random() * (room.height - alcoveWidth);
                    alcoveW = alcoveDepth;
                    alcoveH = alcoveWidth;
                }
                
                room.features.push({
                    type: 'alcove',
                    edge: edge,
                    x: alcoveX,
                    y: alcoveY,
                    width: alcoveW,
                    height: alcoveH
                });
                
                // Add a doorway for the alcove
                this.addDoorwayForAlcove(room, edge, alcoveX, alcoveY, alcoveW, alcoveH);
            }
        }
    }
    
    // Add a doorway to connect the alcove to the room
    addDoorwayForAlcove(room, edge, alcoveX, alcoveY, alcoveWidth, alcoveHeight) {
        let doorX, doorY, doorWidth, doorHeight;
        
        // Position doorway based on which edge the alcove is on
        if (edge === 'north') {
            doorX = alcoveX + (alcoveWidth - this.settings.doorwayWidth) / 2;
            doorY = room.y - this.settings.gridSize;
            doorWidth = this.settings.doorwayWidth;
            doorHeight = this.settings.gridSize;
        } else if (edge === 'south') {
            doorX = alcoveX + (alcoveWidth - this.settings.doorwayWidth) / 2;
            doorY = room.y + room.height;
            doorWidth = this.settings.doorwayWidth;
            doorHeight = this.settings.gridSize;
        } else if (edge === 'east') {
            doorX = room.x + room.width;
            doorY = alcoveY + (alcoveHeight - this.settings.doorwayWidth) / 2;
            doorWidth = this.settings.gridSize;
            doorHeight = this.settings.doorwayWidth;
        } else if (edge === 'west') {
            doorX = room.x - this.settings.gridSize;
            doorY = alcoveY + (alcoveHeight - this.settings.doorwayWidth) / 2;
            doorWidth = this.settings.gridSize;
            doorHeight = this.settings.doorwayWidth;
        }
        
        room.doorways.push({
            x: doorX,
            y: doorY,
            width: doorWidth,
            height: doorHeight,
            isEastWall: edge === 'east',
            isNorthWall: edge === 'north'
        });
    }
    
    createDoorways(rooms, corridors) {
        // For each corridor, create doorways where it meets rooms
        for (const corridor of corridors) {
            const startRoom = corridor.startRoom;
            const endRoom = corridor.endRoom;
            const points = corridor.points;
            
            // Create doorway at the start point
            this.createDoorwayForRoom(startRoom, points[0], points[1], corridor.startEdge);
            
            // Create doorway at the end point
            this.createDoorwayForRoom(endRoom, points[points.length - 1], points[points.length - 2], corridor.endEdge);
        }
    }
    
    createDoorwayForRoom(room, doorPoint, corridorPoint, edgeDir) {
        // Determine which wall the doorway is on if not provided
        let wallType = edgeDir;
        
        if (!wallType) {
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
        }
        
        let doorX, doorY, doorWidth, doorHeight;
        
        // Position doorway based on the wall type
        if (wallType === 'north') {
            doorX = doorPoint.x - this.settings.doorwayWidth / 2;
            doorY = room.y - this.settings.gridSize;
            doorWidth = this.settings.doorwayWidth;
            doorHeight = this.settings.gridSize;
        } else if (wallType === 'south') {
            doorX = doorPoint.x - this.settings.doorwayWidth / 2;
            doorY = room.y + room.height;
            doorWidth = this.settings.doorwayWidth;
            doorHeight = this.settings.gridSize;
        } else if (wallType === 'east') {
            doorX = room.x + room.width;
            doorY = doorPoint.y - this.settings.doorwayWidth / 2;
            doorWidth = this.settings.gridSize;
            doorHeight = this.settings.doorwayWidth;
        } else if (wallType === 'west') {
            doorX = room.x - this.settings.gridSize;
            doorY = doorPoint.y - this.settings.doorwayWidth / 2;
            doorWidth = this.settings.gridSize;
            doorHeight = this.settings.doorwayWidth;
        }
        
        // Create the doorway object
        const doorway = {
            x: doorX,
            y: doorY,
            width: doorWidth,
            height: doorHeight,
            isEastWall: wallType === 'east',
            isNorthWall: wallType === 'north'
        };
        
        // Add doorway to the room
        room.doorways.push(doorway);
    }
    
    placeKey(outerRooms) {
        // Choose a random outer room for the key
        const keyRoom = outerRooms[Math.floor(Math.random() * outerRooms.length)];
        
        return {
            x: keyRoom.x + keyRoom.width / 2,
            y: keyRoom.y + keyRoom.height / 2
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
        
        const keyMaterial = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0xffcc00,
            emissiveIntensity: 0.5
        });
        
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.5,
            metalness: 0.3
        });
        
        // Array to store collider meshes
        dungeonGroup.colliderMeshes = [];
        
        // Add room floors, walls, and features
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
            
            // Add room features (pillars, alcoves)
            for (const feature of room.features) {
                if (feature.type === 'pillar') {
                    this.createPillar(dungeonGroup, feature, pillarMaterial);
                } else if (feature.type === 'alcove') {
                    this.createAlcove(dungeonGroup, room, feature, floorMaterial, wallMaterial);
                }
            }
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
        
        // For each pair of points, create a corridor segment
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
                    wallMaterial,
                    true
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
                    wallMaterial,
                    true
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
            const wallMesh = this.createWall(group, x, y, width, height, depth, material, isVertical);
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
                        material,
                        isVertical
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
                    material,
                    isVertical
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
                        material,
                        isVertical
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
                    material,
                    isVertical
                );
                group.colliderMeshes.push(wallMesh);
            }
        }
    }
    
    createWall(group, x, y, width, height, depth, material, isVertical = false) {
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
    
    createPillar(group, pillarInfo, material) {
        let pillarGeometry;
        const pillarHeight = this.settings.wallHeight * 1.5; // Make pillars a bit taller
        
        // Create different shaped pillars
        if (pillarInfo.shape === 'square') {
            pillarGeometry = new THREE.BoxGeometry(
                pillarInfo.width, 
                pillarHeight, 
                pillarInfo.height
            );
        } else if (pillarInfo.shape === 'circle') {
            const radius = pillarInfo.width / 2;
            pillarGeometry = new THREE.CylinderGeometry(
                radius, // top radius
                radius, // bottom radius
                pillarHeight, // height
                16 // segments
            );
            // Rotate to stand upright
            pillarGeometry.rotateX(Math.PI / 2);
        } else if (pillarInfo.shape === 'triangle') {
            // Create a triangular prism
            const shape = new THREE.Shape();
            const size = pillarInfo.width;
            
            shape.moveTo(0, 0);
            shape.lineTo(size, 0);
            shape.lineTo(size / 2, size);
            shape.lineTo(0, 0);
            
            const extrudeSettings = {
                steps: 1,
                depth: pillarHeight,
                bevelEnabled: false
            };
            
            pillarGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            // Rotate to stand upright
            pillarGeometry.rotateX(Math.PI / 2);
        }
        
        const pillarMesh = new THREE.Mesh(pillarGeometry, material);
        
        // Position the pillar
        if (pillarInfo.shape === 'square' || pillarInfo.shape === 'circle') {
            pillarMesh.position.set(
                pillarInfo.x + pillarInfo.width / 2,
                pillarHeight / 2, // Position on the floor
                pillarInfo.y + pillarInfo.height / 2
            );
        } else if (pillarInfo.shape === 'triangle') {
            pillarMesh.position.set(
                pillarInfo.x,
                0, // Position on the floor
                pillarInfo.y
            );
        }
        
        pillarMesh.castShadow = true;
        pillarMesh.receiveShadow = true;
        
        // Add collision to the pillar
        group.colliderMeshes.push(pillarMesh);
        group.add(pillarMesh);
    }
    
    createAlcove(group, room, alcoveInfo, floorMaterial, wallMaterial) {
        // Create the alcove floor
        const floorGeometry = new THREE.BoxGeometry(
            alcoveInfo.width * this.settings.gridSize,
            this.settings.floorHeight,
            alcoveInfo.height * this.settings.gridSize
        );
        
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.set(
            alcoveInfo.x + (alcoveInfo.width * this.settings.gridSize) / 2,
            -this.settings.floorHeight / 2,
            alcoveInfo.y + (alcoveInfo.height * this.settings.gridSize) / 2
        );
        floorMesh.receiveShadow = true;
        
        // Add collision to floor
        group.colliderMeshes.push(floorMesh);
        group.add(floorMesh);
        
        // Create walls for the alcove
        // Based on which edge the alcove is connected to, we'll skip that wall
        const skipEdge = alcoveInfo.edge;
        
        // Create north wall if not connected to the room's north
        if (skipEdge !== 'north') {
            const wallMesh = this.createWall(
                group,
                alcoveInfo.x,
                alcoveInfo.y,
                alcoveInfo.width * this.settings.gridSize,
                this.settings.wallHeight,
                this.settings.gridSize,
                wallMaterial
            );
            group.colliderMeshes.push(wallMesh);
        }
        
        // Create south wall if not connected to the room's south
        if (skipEdge !== 'south') {
            const wallMesh = this.createWall(
                group,
                alcoveInfo.x,
                alcoveInfo.y + alcoveInfo.height * this.settings.gridSize - this.settings.gridSize,
                alcoveInfo.width * this.settings.gridSize,
                this.settings.wallHeight,
                this.settings.gridSize,
                wallMaterial
            );
            group.colliderMeshes.push(wallMesh);
        }
        
        // Create west wall if not connected to the room's west
        if (skipEdge !== 'west') {
            const wallMesh = this.createWall(
                group,
                alcoveInfo.x,
                alcoveInfo.y,
                this.settings.gridSize,
                this.settings.wallHeight,
                alcoveInfo.height * this.settings.gridSize,
                wallMaterial,
                true
            );
            group.colliderMeshes.push(wallMesh);
        }
        
        // Create east wall if not connected to the room's east
        if (skipEdge !== 'east') {
            const wallMesh = this.createWall(
                group,
                alcoveInfo.x + alcoveInfo.width * this.settings.gridSize - this.settings.gridSize,
                alcoveInfo.y,
                this.settings.gridSize,
                this.settings.wallHeight,
                alcoveInfo.height * this.settings.gridSize,
                wallMaterial,
                true
            );
            group.colliderMeshes.push(wallMesh);
        }
    }
