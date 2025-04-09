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
        
        // Step 3: Connect rooms with corridors
        const corridors = this.connectRoomsWithCorridors(centralRoom, radialRooms);
        
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
    
    // New improved corridor generation approach
    connectRoomsWithCorridors(centralRoom, radialRooms) {
        const corridors = [];
        
        // Calculate central room boundaries and center
        const centralRoomCenterX = centralRoom.x + centralRoom.width / 2;
        const centralRoomCenterY = centralRoom.y + centralRoom.height / 2;
        
        for (const radialRoom of radialRooms) {
            // Calculate radial room center
            const radialRoomCenterX = radialRoom.x + radialRoom.width / 2;
            const radialRoomCenterY = radialRoom.y + radialRoom.height / 2;
            
            // Determine if we need orthogonal corridors (L-shaped) or a straight corridor
            // Based on room positions, choose the most efficient approach
            
            // Calculate differences in coordinates
            const dx = radialRoomCenterX - centralRoomCenterX;
            const dy = radialRoomCenterY - centralRoomCenterY;
            
            // If rooms are approximately aligned, create a straight corridor
            const alignmentThreshold = 10; // Threshold for considering rooms aligned
            
            if (Math.abs(dx) < alignmentThreshold || Math.abs(dy) < alignmentThreshold) {
                // Create a straight corridor
                this.createStraightCorridor(centralRoom, radialRoom, corridors);
            } else {
                // Create an L-shaped corridor
                this.createLShapedCorridor(centralRoom, radialRoom, corridors);
            }
            
            // Mark rooms as connected
            centralRoom.connections.push(radialRoom);
            radialRoom.connections.push(centralRoom);
        }
        
        return corridors;
    }
    
    // Create a straight corridor between two rooms
    createStraightCorridor(room1, room2, corridorsList) {
        // Find the best connection points between rooms
        const connectionPoints = this.findOptimalConnectionPoints(room1, room2);
        
        // Create a corridor object
        const corridor = {
            type: 'straight',
            width: this.settings.corridorWidth,
            startRoom: room1,
            endRoom: room2,
            startWall: connectionPoints.wall1,
            endWall: connectionPoints.wall2,
            points: [
                { x: connectionPoints.point1.x, y: connectionPoints.point1.y },
                { x: connectionPoints.point2.x, y: connectionPoints.point2.y }
            ]
        };
        
        // Create doorways at the connection points
        this.createDoorway(room1, corridor, connectionPoints.wall1, true);
        this.createDoorway(room2, corridor, connectionPoints.wall2, false);
        
        corridorsList.push(corridor);
    }
    
    // Create an L-shaped corridor between two rooms
    createLShapedCorridor(room1, room2, corridorsList) {
        // Get room centers
        const room1CenterX = room1.x + room1.width / 2;
        const room1CenterY = room1.y + room1.height / 2;
        const room2CenterX = room2.x + room2.width / 2;
        const room2CenterY = room2.y + room2.height / 2;
        
        // Randomly choose whether to go horizontal first then vertical, or vice versa
        const horizontalFirst = Math.random() > 0.5;
        
        // Find connection points to the rooms
        const room1ConnectionPoints = this.findClosestWallPoint(room1, room2, horizontalFirst);
        const room2ConnectionPoints = this.findClosestWallPoint(room2, room1, !horizontalFirst);
        
        // Create the corner point (intersection of two segments)
        let cornerX, cornerY;
        
        if (horizontalFirst) {
            cornerX = room2ConnectionPoints.point.x;
            cornerY = room1ConnectionPoints.point.y;
        } else {
            cornerX = room1ConnectionPoints.point.x;
            cornerY = room2ConnectionPoints.point.y;
        }
        
        // Create corridor object
        const corridor = {
            type: 'L-shaped',
            width: this.settings.corridorWidth,
            startRoom: room1,
            endRoom: room2,
            startWall: room1ConnectionPoints.wall,
            endWall: room2ConnectionPoints.wall,
            points: [
                { x: room1ConnectionPoints.point.x, y: room1ConnectionPoints.point.y },
                { x: cornerX, y: cornerY },
                { x: room2ConnectionPoints.point.x, y: room2ConnectionPoints.point.y }
            ]
        };
        
        // Create doorways
        this.createDoorway(room1, corridor, room1ConnectionPoints.wall, true);
        this.createDoorway(room2, corridor, room2ConnectionPoints.wall, false);
        
        corridorsList.push(corridor);
    }
    
    // Find the best wall point based on direction preference
    findClosestWallPoint(room, targetRoom, preferHorizontal) {
        const roomCenterX = room.x + room.width / 2;
        const roomCenterY = room.y + room.height / 2;
        const targetCenterX = targetRoom.x + targetRoom.width / 2;
        const targetCenterY = targetRoom.y + targetRoom.height / 2;
        
        // Determine best wall to connect based on direction preference
        let wall, pointX, pointY;
        
        if (preferHorizontal) {
            // Prefer horizontal connection (east or west wall)
            if (targetCenterX > roomCenterX) {
                // Target is to the east, use east wall
                wall = 'east';
                pointX = room.x + room.width;
                pointY = this.clamp(targetCenterY, room.y + this.settings.doorwayWidth/2, 
                                    room.y + room.height - this.settings.doorwayWidth/2);
            } else {
                // Target is to the west, use west wall
                wall = 'west';
                pointX = room.x;
                pointY = this.clamp(targetCenterY, room.y + this.settings.doorwayWidth/2, 
                                    room.y + room.height - this.settings.doorwayWidth/2);
            }
        } else {
            // Prefer vertical connection (north or south wall)
            if (targetCenterY > roomCenterY) {
                // Target is to the south, use south wall
                wall = 'south';
                pointY = room.y + room.height;
                pointX = this.clamp(targetCenterX, room.x + this.settings.doorwayWidth/2, 
                                    room.x + room.width - this.settings.doorwayWidth/2);
            } else {
                // Target is to the north, use north wall
                wall = 'north';
                pointY = room.y;
                pointX = this.clamp(targetCenterX, room.x + this.settings.doorwayWidth/2, 
                                    room.x + room.width - this.settings.doorwayWidth/2);
            }
        }
        
        return {
            wall: wall,
            point: { x: pointX, y: pointY }
        };
    }
    
    // Helper function to clamp a value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    // Find optimal connection points between two rooms
    findOptimalConnectionPoints(room1, room2) {
        // Room centers
        const room1CenterX = room1.x + room1.width / 2;
        const room1CenterY = room1.y + room1.height / 2;
        const room2CenterX = room2.x + room2.width / 2;
        const room2CenterY = room2.y + room2.height / 2;
        
        // Determine primary direction based on room positions
        const dx = room2CenterX - room1CenterX;
        const dy = room2CenterY - room1CenterY;
        
        let wall1, wall2, point1, point2;
        
        // Determine which walls to connect based on primary direction
        if (Math.abs(dx) > Math.abs(dy)) {
            // Primarily horizontal connection
            if (dx > 0) {
                // Room2 is to the east of Room1
                wall1 = 'east';
                wall2 = 'west';
                point1 = { 
                    x: room1.x + room1.width,
                    y: this.clamp(room2CenterY, room1.y + this.settings.doorwayWidth/2, 
                                 room1.y + room1.height - this.settings.doorwayWidth/2)
                };
                point2 = {
                    x: room2.x,
                    y: this.clamp(room1CenterY, room2.y + this.settings.doorwayWidth/2,
                                 room2.y + room2.height - this.settings.doorwayWidth/2)
                };
            } else {
                // Room2 is to the west of Room1
                wall1 = 'west';
                wall2 = 'east';
                point1 = { 
                    x: room1.x,
                    y: this.clamp(room2CenterY, room1.y + this.settings.doorwayWidth/2, 
                                 room1.y + room1.height - this.settings.doorwayWidth/2)
                };
                point2 = {
                    x: room2.x + room2.width,
                    y: this.clamp(room1CenterY, room2.y + this.settings.doorwayWidth/2,
                                 room2.y + room2.height - this.settings.doorwayWidth/2)
                };
            }
        } else {
            // Primarily vertical connection
            if (dy > 0) {
                // Room2 is to the south of Room1
                wall1 = 'south';
                wall2 = 'north';
                point1 = { 
                    x: this.clamp(room2CenterX, room1.x + this.settings.doorwayWidth/2, 
                                 room1.x + room1.width - this.settings.doorwayWidth/2),
                    y: room1.y + room1.height
                };
                point2 = {
                    x: this.clamp(room1CenterX, room2.x + this.settings.doorwayWidth/2,
                                 room2.x + room2.width - this.settings.doorwayWidth/2),
                    y: room2.y
                };
            } else {
                // Room2 is to the north of Room1
                wall1 = 'north';
                wall2 = 'south';
                point1 = { 
                    x: this.clamp(room2CenterX, room1.x + this.settings.doorwayWidth/2, 
                                 room1.x + room1.width - this.settings.doorwayWidth/2),
                    y: room1.y
                };
                point2 = {
                    x: this.clamp(room1CenterX, room2.x + this.settings.doorwayWidth/2,
                                 room2.x + room2.width - this.settings.doorwayWidth/2),
                    y: room2.y + room2.height
                };
            }
        }
        
        return {
            point1: point1,
            point2: point2,
            wall1: wall1,
            wall2: wall2
        };
    }
    
    // Create a doorway in a room wall
    createDoorway(room, corridor, wallSide, isStart) {
        // Get the connection point based on corridor type and whether it's start or end
        let connectionPoint;
        if (corridor.type === 'straight') {
            connectionPoint = isStart ? corridor.points[0] : corridor.points[1];
        } else if (corridor.type === 'L-shaped') {
            connectionPoint = isStart ? corridor.points[0] : corridor.points[2];
        }
        
        const connectionX = connectionPoint.x;
        const connectionY = connectionPoint.y;
        
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
            if (corridor.type === 'straight') {
                this.createStraightCorridorMesh(dungeonGroup, corridor, floorMaterial, wallMaterial);
            } else if (corridor.type === 'L-shaped') {
                this.createLShapedCorridorMesh(dungeonGroup, corridor, floorMaterial, wallMaterial);
            }
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
    
    // Create a straight corridor mesh
    createStraightCorridorMesh(group, corridor, floorMaterial, wallMaterial) {
        const startPoint = corridor.points[0];
        const endPoint = corridor.points[1];
        
        // Calculate corridor dimensions
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Determine corridor orientation
        let width, depth, position, rotation;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal corridor
            width = length;
            depth = corridor.width;
            position = {
                x: (startPoint.x + endPoint.x) / 2,
                y: -this.settings.floorHeight / 2,
                z: startPoint.y
            };
            rotation = 0;
        } else {
            // Vertical corridor
            width = corridor.width;
            depth = length;
            position = {
                x: startPoint.x,
                y: -this.settings.floorHeight / 2,
                z: (startPoint.y + endPoint.y) / 2
            };
            rotation = Math.PI / 2; // 90 degrees
        }
        
        // Create floor
        const floorGeometry = new THREE.BoxGeometry(
            width,
            this.settings.floorHeight,
            depth
        );
        
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.set(position.x, position.y, position.z);
        floorMesh.rotation.y = rotation;
        floorMesh.receiveShadow = true;
        
        group.colliderMeshes.push(floorMesh);
        group.add(floorMesh);
        
        // Create walls
        this.createStraightCorridorWalls(group, corridor, wallMaterial);
    }
    
    // Create straight corridor walls
    createStraightCorridorWalls(group, corridor, wallMaterial) {
        const startPoint = corridor.points[0];
        const endPoint = corridor.points[1];
        const corridorWidth = corridor.width;
        
        // Calculate corridor properties
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const isHorizontal = Math.abs(dx) > Math.abs(dy);
        
        // Create walls based on corridor orientation
        if (isHorizontal) {
            // Horizontal corridor - create north and south walls
            const length = Math.abs(dx);
            const wallHeight = this.settings.wallHeight;
            const wallThickness = this.settings.gridSize;
            
            // North wall (lower in Z)
            const northWallGeometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
            const northWallMesh = new THREE.Mesh(northWallGeometry, wallMaterial);
            northWallMesh.position.set(
                (startPoint.x + endPoint.x) / 2,
                wallHeight / 2,
                startPoint.y - corridorWidth / 2
            );
            northWallMesh.castShadow = true;
            northWallMesh.receiveShadow = true;
            group.add(northWallMesh);
            group.colliderMeshes.push(northWallMesh);
            
            // South wall (higher in Z)
            const southWallGeometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
            const southWallMesh = new THREE.Mesh(southWallGeometry, wallMaterial);
            southWallMesh.position.set(
                (startPoint.x + endPoint.x) / 2,
                wallHeight / 2,
                startPoint.y + corridorWidth / 2
            );
            southWallMesh.castShadow = true;
            southWallMesh.receiveShadow = true;
            group.add(southWallMesh);
            group.colliderMeshes.push(southWallMesh);
        } else {
            // Vertical corridor - create east and west walls
            const length = Math.abs(dy);
            const wallHeight = this.settings.wallHeight;
            const wallThickness = this.settings.gridSize;
            
            // West wall (lower in X)
            const westWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, length);
            const westWallMesh = new THREE.Mesh(westWallGeometry, wallMaterial);
            westWallMesh.position.set(
                startPoint.x - corridorWidth / 2,
                wallHeight / 2,
                (startPoint.y + endPoint.y) / 2
            );
            westWallMesh.castShadow = true;
            westWallMesh.receiveShadow = true;
            group.add(westWallMesh);
            group.colliderMeshes.push(westWallMesh);
            
            // East wall (higher in X)
            const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, length);
            const eastWallMesh = new THREE.Mesh(eastWallGeometry, wallMaterial);
            eastWallMesh.position.set(
                startPoint.x + corridorWidth / 2,
                wallHeight / 2,
                (startPoint.y + endPoint.y) / 2
            );
            eastWallMesh.castShadow = true;
            eastWallMesh.receiveShadow = true;
            group.add(eastWallMesh);
            group.colliderMeshes.push(eastWallMesh);
        }
    }
    
    // Create an L-shaped corridor mesh
    createLShapedCorridorMesh(group, corridor, floorMaterial, wallMaterial) {
        const startPoint = corridor.points[0];
        const cornerPoint = corridor.points[1];
        const endPoint = corridor.points[2];
        
        // Create two straight segments for the L-shape
        // First segment: from start to corner
        const firstSegment = {
            type: 'straight',
            width: corridor.width,
            points: [
                { x: startPoint.x, y: startPoint.y },
                { x: cornerPoint.x, y: cornerPoint.y }
            ]
        };
        
        // Second segment: from corner to end
        const secondSegment = {
            type: 'straight',
            width: corridor.width,
            points: [
                { x: cornerPoint.x, y: cornerPoint.y },
                { x: endPoint.x, y: endPoint.y }
            ]
        };
        
        // Create the floor and walls for both segments
        this.createStraightCorridorMesh(group, firstSegment, floorMaterial, wallMaterial);
        this.createStraightCorridorMesh(group, secondSegment, floorMaterial, wallMaterial);
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
