export class DungeonGenerator {
    constructor() {
        // Settings for dungeon generation
        this.settings = {
            // Room settings
            centralRoomSize: 40,
            minRoomSize: 25,
            maxRoomSize: 40,
            numRadialRooms: 5,
            
            // Basic settings
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
        console.log(`Generating floor level ${floorLevel}...`);
        
        // Step 1: Generate the central room
        const centralRoom = this.generateCentralRoom();
        
        // Step 2: Generate radial rooms around the central room
        const radialRooms = this.generateRadialRooms(centralRoom);
        
        // Combine all rooms
        const rooms = [centralRoom, ...radialRooms];
        
        // Step 3 & 4: Connect rooms with direct corridors
        const corridors = this.connectRoomsWithDirectCorridors(centralRoom, radialRooms);
        
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
    
    // Steps 3, 4, & 5: Find shortest path, connect with hallway, and create openings
    connectRoomsWithDirectCorridors(centralRoom, radialRooms) {
        const corridors = [];
        
        // Get central room center and boundaries
        const centralRoomCenterX = centralRoom.x + centralRoom.width / 2;
        const centralRoomCenterY = centralRoom.y + centralRoom.height / 2;
        
        // For each radial room, create a direct connection to the central room
        for (const radialRoom of radialRooms) {
            // Find the closest points between the central room and this radial room
            const connectionPoints = this.findClosestPointsBetweenRooms(centralRoom, radialRoom);
            
            // Create a corridor between these points
            const corridor = {
                // Start point (on central room)
                x1: connectionPoints.point1.x,
                y1: connectionPoints.point1.y,
                // End point (on radial room)
                x2: connectionPoints.point2.x,
                y2: connectionPoints.point2.y,
                // Corridor properties
                width: this.settings.corridorWidth,
                startRoom: centralRoom,
                endRoom: radialRoom,
                // Wall information for doorway creation
                startWall: connectionPoints.wall1,
                endWall: connectionPoints.wall2
            };
            
            // Create doorways at the connection points
            this.createDoorway(centralRoom, corridor, connectionPoints.wall1, true);
            this.createDoorway(radialRoom, corridor, connectionPoints.wall2, false);
            
            corridors.push(corridor);
            
            // Mark rooms as connected
            centralRoom.connections.push(radialRoom);
            radialRoom.connections.push(centralRoom);
        }
        
        return corridors;
    }
    
    // Find the closest points between two rooms
    findClosestPointsBetweenRooms(room1, room2) {
        // Room boundaries
        const room1Left = room1.x;
        const room1Right = room1.x + room1.width;
        const room1Top = room1.y;
        const room1Bottom = room1.y + room1.height;
        
        const room2Left = room2.x;
        const room2Right = room2.x + room2.width;
        const room2Top = room2.y;
        const room2Bottom = room2.y + room2.height;
        
        // Find the closest points and which walls they are on
        let minDistance = Infinity;
        let closestPoint1 = null;
        let closestPoint2 = null;
        let wall1 = '';
        let wall2 = '';
        
        // Check every possible wall pair combination between the two rooms
        
        // Room1 left wall to Room2 right wall
        if (room1Left > room2Right) {
            // Room2 is to the left of Room1
            const yOverlap = this.findVerticalOverlap(room1Top, room1Bottom, room2Top, room2Bottom);
            if (yOverlap) {
                const distance = room1Left - room2Right;
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint1 = { x: room1Left, y: yOverlap.center };
                    closestPoint2 = { x: room2Right, y: yOverlap.center };
                    wall1 = 'west';
                    wall2 = 'east';
                }
            }
        }
        
        // Room1 right wall to Room2 left wall
        if (room1Right < room2Left) {
            // Room2 is to the right of Room1
            const yOverlap = this.findVerticalOverlap(room1Top, room1Bottom, room2Top, room2Bottom);
            if (yOverlap) {
                const distance = room2Left - room1Right;
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint1 = { x: room1Right, y: yOverlap.center };
                    closestPoint2 = { x: room2Left, y: yOverlap.center };
                    wall1 = 'east';
                    wall2 = 'west';
                }
            }
        }
        
        // Room1 top wall to Room2 bottom wall
        if (room1Top > room2Bottom) {
            // Room2 is above Room1
            const xOverlap = this.findHorizontalOverlap(room1Left, room1Right, room2Left, room2Right);
            if (xOverlap) {
                const distance = room1Top - room2Bottom;
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint1 = { x: xOverlap.center, y: room1Top };
                    closestPoint2 = { x: xOverlap.center, y: room2Bottom };
                    wall1 = 'north';
                    wall2 = 'south';
                }
            }
        }
        
        // Room1 bottom wall to Room2 top wall
        if (room1Bottom < room2Top) {
            // Room2 is below Room1
            const xOverlap = this.findHorizontalOverlap(room1Left, room1Right, room2Left, room2Right);
            if (xOverlap) {
                const distance = room2Top - room1Bottom;
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint1 = { x: xOverlap.center, y: room1Bottom };
                    closestPoint2 = { x: xOverlap.center, y: room2Top };
                    wall1 = 'south';
                    wall2 = 'north';
                }
            }
        }
        
        // If no direct wall-to-wall path is found (e.g., rooms are diagonal to each other)
        if (!closestPoint1 || !closestPoint2) {
            // Find the closest corners as a fallback
            let minCornerDistance = Infinity;
            
            // Check each corner of room1 against each corner of room2
            const corners1 = [
                { x: room1Left, y: room1Top, wallX: 'west', wallY: 'north' },
                { x: room1Right, y: room1Top, wallX: 'east', wallY: 'north' },
                { x: room1Left, y: room1Bottom, wallX: 'west', wallY: 'south' },
                { x: room1Right, y: room1Bottom, wallX: 'east', wallY: 'south' }
            ];
            
            const corners2 = [
                { x: room2Left, y: room2Top, wallX: 'west', wallY: 'north' },
                { x: room2Right, y: room2Top, wallX: 'east', wallY: 'north' },
                { x: room2Left, y: room2Bottom, wallX: 'west', wallY: 'south' },
                { x: room2Right, y: room2Bottom, wallX: 'east', wallY: 'south' }
            ];
            
            for (const corner1 of corners1) {
                for (const corner2 of corners2) {
                    const distance = this.calculateDistance(corner1.x, corner1.y, corner2.x, corner2.y);
                    if (distance < minCornerDistance) {
                        minCornerDistance = distance;
                        
                        // If rooms are diagonal to each other, use the corners for connection
                        closestPoint1 = { x: corner1.x, y: corner1.y };
                        closestPoint2 = { x: corner2.x, y: corner2.y };
                        
                        // Select the wall based on which direction is more prominent
                        const dx = Math.abs(corner2.x - corner1.x);
                        const dy = Math.abs(corner2.y - corner1.y);
                        
                        // Choose the wall based on the more significant dimension
                        if (dx > dy) {
                            wall1 = corner1.wallX;
                            wall2 = corner2.wallX;
                        } else {
                            wall1 = corner1.wallY;
                            wall2 = corner2.wallY;
                        }
                    }
                }
            }
        }
        
        // Final fallback - use centers of rooms if all else fails
        if (!closestPoint1 || !closestPoint2) {
            closestPoint1 = { x: room1.x + room1.width / 2, y: room1.y + room1.height / 2 };
            closestPoint2 = { x: room2.x + room2.width / 2, y: room2.y + room2.height / 2 };
            wall1 = 'center';
            wall2 = 'center';
        }
        
        return {
            point1: closestPoint1,
            point2: closestPoint2,
            wall1: wall1,
            wall2: wall2
        };
    }
    
    // Find vertical overlap between two intervals
    findVerticalOverlap(top1, bottom1, top2, bottom2) {
        const overlapStart = Math.max(top1, top2);
        const overlapEnd = Math.min(bottom1, bottom2);
        
        if (overlapStart < overlapEnd) {
            return {
                start: overlapStart,
                end: overlapEnd,
                center: (overlapStart + overlapEnd) / 2
            };
        }
        
        return null; // No overlap
    }
    
    // Find horizontal overlap between two intervals
    findHorizontalOverlap(left1, right1, left2, right2) {
        const overlapStart = Math.max(left1, left2);
        const overlapEnd = Math.min(right1, right2);
        
        if (overlapStart < overlapEnd) {
            return {
                start: overlapStart,
                end: overlapEnd,
                center: (overlapStart + overlapEnd) / 2
            };
        }
        
        return null; // No overlap
    }
    
    // Calculate distance between two points
    calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    // Create a doorway in a room wall
    createDoorway(room, corridor, wallSide, isStart) {
        // Point where corridor meets the room
        const connectionX = isStart ? corridor.x1 : corridor.x2;
        const connectionY = isStart ? corridor.y1 : corridor.y2;
        
        // Create doorway based on which wall the corridor connects to
        let doorwaySpec = {
            isEastWall: false,
            isNorthWall: false,
            width: 0,
            height: 0,
            x: 0,
            y: 0
        };
        
        // Configure doorway based on which wall it's on
        switch (wallSide) {
            case 'north':
                doorwaySpec.isNorthWall = true;
                doorwaySpec.width = this.settings.doorwayWidth;
                doorwaySpec.height = this.settings.gridSize;
                doorwaySpec.x = connectionX - this.settings.doorwayWidth / 2;
                doorwaySpec.y = room.y;
                break;
                
            case 'south':
                doorwaySpec.isNorthWall = false;
                doorwaySpec.width = this.settings.doorwayWidth;
                doorwaySpec.height = this.settings.gridSize;
                doorwaySpec.x = connectionX - this.settings.doorwayWidth / 2;
                doorwaySpec.y = room.y + room.height - this.settings.gridSize;
                break;
                
            case 'east':
                doorwaySpec.isEastWall = true;
                doorwaySpec.width = this.settings.gridSize;
                doorwaySpec.height = this.settings.doorwayWidth;
                doorwaySpec.x = room.x + room.width - this.settings.gridSize;
                doorwaySpec.y = connectionY - this.settings.doorwayWidth / 2;
                break;
                
            case 'west':
                doorwaySpec.isEastWall = false;
                doorwaySpec.width = this.settings.gridSize;
                doorwaySpec.height = this.settings.doorwayWidth;
                doorwaySpec.x = room.x;
                doorwaySpec.y = connectionY - this.settings.doorwayWidth / 2;
                break;
                
            default:
                // If the wall was 'center' or undefined, don't create a doorway
                return;
        }
        
        // Add the doorway to the room
        room.doorways.push(doorwaySpec);
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
            this.createStraightCorridor(dungeonGroup, corridor, floorMaterial, wallMaterial);
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
    
    createStraightCorridor(group, corridor, floorMaterial, wallMaterial) {
        // Calculate corridor length and angle
        const dx = corridor.x2 - corridor.x1;
        const dy = corridor.y2 - corridor.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Create corridor floor
        const floorGeometry = new THREE.BoxGeometry(
            length,
            this.settings.floorHeight,
            corridor.width
        );
        
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        
        // Position at center of corridor
        floorMesh.position.set(
            (corridor.x1 + corridor.x2) / 2,
            -this.settings.floorHeight / 2,
            (corridor.y1 + corridor.y2) / 2
        );
        
        // Rotate to align with the corridor angle
        floorMesh.rotation.y = angle;
        
        floorMesh.receiveShadow = true;
        group.colliderMeshes.push(floorMesh);
        group.add(floorMesh);
        
        // Create corridor walls
        this.createCorridorWalls(group, corridor, length, angle, wallMaterial);
    }
    
    createCorridorWalls(group, corridor, length, angle, wallMaterial) {
        const halfWidth = corridor.width / 2;
        const wallHeight = this.settings.wallHeight;
        const wallThickness = this.settings.gridSize;
        
        // Create walls on both sides of corridor
        for (let side = -1; side <= 1; side += 2) {
            // Skip center
            if (side === 0) continue;
            
            // Calculate offset perpendicular to corridor direction
            const offsetX = -Math.sin(angle) * halfWidth * side;
            const offsetY = Math.cos(angle) * halfWidth * side;
            
            // Create wall geometry
            const wallGeometry = new THREE.BoxGeometry(
                length, 
                wallHeight, 
                wallThickness
            );
            
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            
            // Position at center of the wall
            wallMesh.position.set(
                (corridor.x1 + corridor.x2) / 2 + offsetX,
                wallHeight / 2,
                (corridor.y1 + corridor.y2) / 2 + offsetY
            );
            
            // Rotate to align with corridor
            wallMesh.rotation.y = angle;
            
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            
            group.add(wallMesh);
            group.colliderMeshes.push(wallMesh);
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
