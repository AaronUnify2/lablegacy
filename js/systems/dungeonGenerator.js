// Import THREE.js
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class DungeonGenerator {
    constructor() {
        // Settings for dungeon generation
        this.settings = {
            // Room settings
            centralRoomSize: 40,
            minRoomSize: 25,
            maxRoomSize: 40,
            numRadialRooms: 5,
            gridSize: 1,
            
            // Corridor settings
            corridorWidth: 5,
            
            // Architectural settings
            floorHeight: 0.2,
            wallHeight: 3,
            doorwayWidth: 5,
            
            // Spacing settings
            minDistanceFromCenter: 60,  // Minimum distance of radial rooms from center
            maxDistanceFromCenter: 100, // Maximum distance of radial rooms from center
            minAngleBetweenRooms: 30    // Minimum angle between radial rooms in degrees
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
        
        // Connect the central room to each radial room with corridors
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
            x: -size / 2,          // Center the room at origin
            y: -size / 2,
            width: size,
            height: size,
            connections: [],        // Will store connected rooms
            doorways: [],          // Will store doorway information
            isCentral: true        // Flag to identify the central room
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
                angle: angle,            // Store the angle for corridor alignment
                distanceFromCenter: distance,  // Store distance for key placement
                centerX: roomCenterX,    // Store room center
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
        
        // Connect each radial room to the central room
        for (const room of radialRooms) {
            // Calculate the center of the radial room
            const roomCenterX = room.centerX;
            const roomCenterY = room.centerY;
            
            // Create a straight corridor from center to the radial room
            corridors.push({
                x1: centralX,
                y1: centralY,
                x2: roomCenterX,
                y2: roomCenterY,
                width: this.settings.corridorWidth,
                isStraight: true,  // Flag for straight corridors
                angle: room.angle, // Store the angle for alignment
                startRoom: centralRoom,
                endRoom: room
            });
            
            // Mark rooms as connected
            centralRoom.connections.push(room);
            room.connections.push(centralRoom);
        }
        
        return corridors;
    }
    
    createDoorways(rooms, corridors) {
        // For each corridor, create doorways where it meets rooms
        for (const corridor of corridors) {
            if (corridor.startRoom && corridor.endRoom) {
                // Calculate the corridor angle in radians
                const angleRad = corridor.angle * (Math.PI / 180);
                
                // Calculate unit vector along corridor direction
                const dirX = Math.cos(angleRad);
                const dirY = Math.sin(angleRad);
                
                // Create doorway for the start room (central room)
                this.createDoorwayForRoom(corridor.startRoom, corridor, true, dirX, dirY);
                
                // Create doorway for the end room (radial room)
                this.createDoorwayForRoom(corridor.endRoom, corridor, false, dirX, dirY);
            }
        }
    }
    
    createDoorwayForRoom(room, corridor, isStartRoom, dirX, dirY) {
        // Find where the corridor intersects with the room walls
        
        // Room boundaries
        const roomLeft = room.x;
        const roomRight = room.x + room.width;
        const roomTop = room.y;
        const roomBottom = room.y + room.height;
        
        // Corridor line parameters
        let startX, startY, endX, endY;
        
        if (isStartRoom) {
            // For start room, line goes from room center outward
            startX = room.x + room.width / 2;
            startY = room.y + room.height / 2;
            // Extend line far enough to ensure it crosses room boundary
            endX = startX + dirX * room.width * 2;
            endY = startY + dirY * room.height * 2;
        } else {
            // For end room, line goes from outside toward room center
            endX = room.x + room.width / 2;
            endY = room.y + room.height / 2;
            // Start line far enough to ensure it crosses room boundary
            startX = endX - dirX * room.width * 2;
            startY = endY - dirY * room.height * 2;
        }
        
        // Find intersection with room walls
        let intersectionX = null;
        let intersectionY = null;
        let isEastWall = false;
        let isNorthWall = false;
        
        // Helper function to check line segment intersection
        const lineIntersection = (x1, y1, x2, y2, x3, y3, x4, y4) => {
            const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
            
            // Lines are parallel
            if (denominator === 0) return null;
            
            const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
            const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
            
            // Check if intersection is on both line segments
            if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return null;
            
            const x = x1 + ua * (x2 - x1);
            const y = y1 + ua * (y2 - y1);
            
            return { x, y };
        };
        
        // Check intersection with left wall
        const leftIntersection = lineIntersection(
            startX, startY, endX, endY,
            roomLeft, roomTop, roomLeft, roomBottom
        );
        
        // Check intersection with right wall
        const rightIntersection = lineIntersection(
            startX, startY, endX, endY,
            roomRight, roomTop, roomRight, roomBottom
        );
        
        // Check intersection with top wall
        const topIntersection = lineIntersection(
            startX, startY, endX, endY,
            roomLeft, roomTop, roomRight, roomTop
        );
        
        // Check intersection with bottom wall
        const bottomIntersection = lineIntersection(
            startX, startY, endX, endY,
            roomLeft, roomBottom, roomRight, roomBottom
        );
        
        // Find the valid intersection closest to the appropriate point
        const distanceSq = (x1, y1, x2, y2) => {
            return Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
        };
        
        let minDistance = Infinity;
        let bestIntersection = null;
        
        if (leftIntersection) {
            const dist = isStartRoom ? 
                distanceSq(startX, startY, leftIntersection.x, leftIntersection.y) :
                distanceSq(endX, endY, leftIntersection.x, leftIntersection.y);
                
            if (dist < minDistance) {
                minDistance = dist;
                bestIntersection = leftIntersection;
                isEastWall = false;
                isNorthWall = false;
            }
        }
        
        if (rightIntersection) {
            const dist = isStartRoom ? 
                distanceSq(startX, startY, rightIntersection.x, rightIntersection.y) :
                distanceSq(endX, endY, rightIntersection.x, rightIntersection.y);
                
            if (dist < minDistance) {
                minDistance = dist;
                bestIntersection = rightIntersection;
                isEastWall = true;
                isNorthWall = false;
            }
        }
        
        if (topIntersection) {
            const dist = isStartRoom ? 
                distanceSq(startX, startY, topIntersection.x, topIntersection.y) :
                distanceSq(endX, endY, topIntersection.x, topIntersection.y);
                
            if (dist < minDistance) {
                minDistance = dist;
                bestIntersection = topIntersection;
                isEastWall = false;
                isNorthWall = true;
            }
        }
        
        if (bottomIntersection) {
            const dist = isStartRoom ? 
                distanceSq(startX, startY, bottomIntersection.x, bottomIntersection.y) :
                distanceSq(endX, endY, bottomIntersection.x, bottomIntersection.y);
                
            if (dist < minDistance) {
                minDistance = dist;
                bestIntersection = bottomIntersection;
                isEastWall = false;
                isNorthWall = false;
            }
        }
        
        // If we found an intersection, create a doorway
        if (bestIntersection) {
            intersectionX = bestIntersection.x;
            intersectionY = bestIntersection.y;
            
            // Calculate doorway dimensions and position
            let doorX, doorY, doorWidth, doorHeight;
            
            if (isEastWall || (!isEastWall && !isNorthWall && Math.abs(dirX) > Math.abs(dirY))) {
                // Doorway on east or west wall (vertical wall)
                doorX = isEastWall ? roomRight - 1 : roomLeft;
                doorY = intersectionY - this.settings.doorwayWidth / 2;
                doorWidth = 1;
                doorHeight = this.settings.doorwayWidth;
            } else {
                // Doorway on north or south wall (horizontal wall)
                doorX = intersectionX - this.settings.doorwayWidth / 2;
                doorY = isNorthWall ? roomTop : roomBottom - 1;
                doorWidth = this.settings.doorwayWidth;
                doorHeight = 1;
            }
            
            // Add doorway to room
            room.doorways.push({
                x: doorX,
                y: doorY,
                width: doorWidth,
                height: doorHeight,
                isEastWall: isEastWall,
                isNorthWall: isNorthWall
            });
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
        
        // Add corridors
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
        // For straight corridors from center to rooms
        
        // Calculate the direction vector
        const dx = corridor.x2 - corridor.x1;
        const dy = corridor.y2 - corridor.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate perpendicular direction vector
        const perpX = -dy / length;
        const perpY = dx / length;
        
        // Half width of the corridor
        const halfWidth = this.settings.corridorWidth / 2;
        
        // Calculate corridor corners
        const corners = [
            { x: corridor.x1 + perpX * halfWidth, y: corridor.y1 + perpY * halfWidth },
            { x: corridor.x1 - perpX * halfWidth, y: corridor.y1 - perpY * halfWidth },
            { x: corridor.x2 - perpX * halfWidth, y: corridor.y2 - perpY * halfWidth },
            { x: corridor.x2 + perpX * halfWidth, y: corridor.y2 + perpY * halfWidth }
        ];
        
        // Create corridor floor using standard geometry instead of shape extrusion
        // This is simpler and less error-prone
        
        // First, create a SimpleCorridorGeometry for floor
        const floorMesh = this.createSimpleCorridorFloor(corridor, halfWidth, floorMaterial);
        floorMesh.receiveShadow = true;
        group.add(floorMesh);
        group.colliderMeshes.push(floorMesh);
        
        // Create walls using simple boxes
        this.createSimpleCorridorWalls(group, corridor, halfWidth, this.settings.wallHeight, wallMaterial);
    }
    
    createSimpleCorridorFloor(corridor, halfWidth, material) {
        // Calculate direction vectors
        const dx = corridor.x2 - corridor.x1;
        const dy = corridor.y2 - corridor.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Create floor geometry
        const corridorWidth = halfWidth * 2;
        const floorGeometry = new THREE.BoxGeometry(length, this.settings.floorHeight, corridorWidth);
        const floorMesh = new THREE.Mesh(floorGeometry, material);
        
        // Position and rotate the floor
        // Calculate angle to rotate
        const angle = Math.atan2(dy, dx);
        floorMesh.rotation.y = angle;
        
        // Position at center of corridor
        floorMesh.position.set(
            corridor.x1 + dx/2,
            -this.settings.floorHeight/2,
            corridor.y1 + dy/2
        );
        
        return floorMesh;
    }
    
    createSimpleCorridorWalls(group, corridor, halfWidth, wallHeight, material) {
        const dx = corridor.x2 - corridor.x1;
        const dy = corridor.y2 - corridor.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Create two walls along the corridor
        const wallGeometry = new THREE.BoxGeometry(length, wallHeight, 1);
        
        // First wall
        const wall1 = new THREE.Mesh(wallGeometry, material);
        wall1.rotation.y = angle;
        wall1.position.set(
            corridor.x1 + dx/2,
            wallHeight/2,
            corridor.y1 + dy/2 + halfWidth
        );
        wall1.castShadow = true;
        wall1.receiveShadow = true;
        group.add(wall1);
        group.colliderMeshes.push(wall1);
        
        // Second wall
        const wall2 = new THREE.Mesh(wallGeometry, material);
        wall2.rotation.y = angle;
        wall2.position.set(
            corridor.x1 + dx/2,
            wallHeight/2,
            corridor.y1 + dy/2 - halfWidth
        );
        wall2.castShadow = true;
        wall2.receiveShadow = true;
        group.add(wall2);
        group.colliderMeshes.push(wall2);
    }
