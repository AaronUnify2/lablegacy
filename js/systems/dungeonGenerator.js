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
        const corridors = this.connectRoomsWithSimpleCorridors(centralRoom, radialRooms);
        
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
    
    // Simplified corridor connection approach - more reliable
    connectRoomsWithSimpleCorridors(centralRoom, radialRooms) {
        const corridors = [];
        
        // Get central room boundaries
        const centralRoomCenterX = centralRoom.x + centralRoom.width / 2;
        const centralRoomCenterY = centralRoom.y + centralRoom.height / 2;
        
        // Connect each radial room to the central room
        for (const radialRoom of radialRooms) {
            // Determine the angle between central room and radial room
            const angleRadians = Math.atan2(
                radialRoom.centerY - centralRoomCenterY,
                radialRoom.centerX - centralRoomCenterX
            );
            
            // Find the point where a ray from the center of the central room 
            // would intersect with the central room's wall
            const centralRoomExitPoint = this.findRoomWallIntersection(
                centralRoom, 
                centralRoomCenterX, 
                centralRoomCenterY,
                angleRadians
            );
            
            // Find the point where a ray from the center of the radial room
            // (going toward the central room) would intersect with the radial room's wall
            const oppositeAngleRadians = angleRadians + Math.PI; // Opposite direction
            const radialRoomEntryPoint = this.findRoomWallIntersection(
                radialRoom,
                radialRoom.centerX,
                radialRoom.centerY,
                oppositeAngleRadians
            );
            
            // Create a direct corridor between these two points
            const corridor = {
                x1: centralRoomExitPoint.x,
                y1: centralRoomExitPoint.y,
                x2: radialRoomEntryPoint.x,
                y2: radialRoomEntryPoint.y,
                width: this.settings.corridorWidth,
                isHorizontal: Math.abs(Math.cos(angleRadians)) > Math.abs(Math.sin(angleRadians)),
                angle: radialRoom.angle,
                startRoom: centralRoom,
                endRoom: radialRoom,
                // Add doorway info for corridor exits/entries
                exitWall: centralRoomExitPoint.wall,
                entryWall: radialRoomEntryPoint.wall
            };
            
            // Create doorways for both rooms at corridor connection points
            this.addDoorwayToRoom(centralRoom, corridor, true);
            this.addDoorwayToRoom(radialRoom, corridor, false);
            
            corridors.push(corridor);
            
            // Mark rooms as connected
            centralRoom.connections.push(radialRoom);
            radialRoom.connections.push(centralRoom);
        }
        
        return corridors;
    }
    
    // Find the point where a ray from the center intersects with the room's wall
    findRoomWallIntersection(room, startX, startY, angleRadians) {
        // Room boundaries
        const leftX = room.x;
        const rightX = room.x + room.width;
        const topY = room.y;
        const bottomY = room.y + room.height;
        
        // Direction vector from the angle
        const dx = Math.cos(angleRadians);
        const dy = Math.sin(angleRadians);
        
        // Find intersections with all four walls
        let intersections = [];
        
        // Check top wall (y = topY)
        if (dy < 0) {
            const t = (topY - startY) / dy;
            const x = startX + t * dx;
            if (x >= leftX && x <= rightX) {
                intersections.push({
                    x: x,
                    y: topY,
                    distance: t,
                    wall: 'north'
                });
            }
        }
        
        // Check bottom wall (y = bottomY)
        if (dy > 0) {
            const t = (bottomY - startY) / dy;
            const x = startX + t * dx;
            if (x >= leftX && x <= rightX) {
                intersections.push({
                    x: x,
                    y: bottomY,
                    distance: t,
                    wall: 'south'
                });
            }
        }
        
        // Check left wall (x = leftX)
        if (dx < 0) {
            const t = (leftX - startX) / dx;
            const y = startY + t * dy;
            if (y >= topY && y <= bottomY) {
                intersections.push({
                    x: leftX,
                    y: y,
                    distance: t,
                    wall: 'west'
                });
            }
        }
        
        // Check right wall (x = rightX)
        if (dx > 0) {
            const t = (rightX - startX) / dx;
            const y = startY + t * dy;
            if (y >= topY && y <= bottomY) {
                intersections.push({
                    x: rightX,
                    y: y,
                    distance: t,
                    wall: 'east'
                });
            }
        }
        
        // Find the closest intersection (should be only one valid one)
        if (intersections.length > 0) {
            // Sort by distance and return the closest one
            intersections.sort((a, b) => a.distance - b.distance);
            return intersections[0];
        }
        
        // Fallback (shouldn't happen)
        console.error("No wall intersection found!");
        return { x: startX, y: startY, wall: 'none' };
    }
    
    // Add a doorway to the room at the corridor connection point
    addDoorwayToRoom(room, corridor, isStart) {
        const wallSide = isStart ? corridor.exitWall : corridor.entryWall;
        const doorX = isStart ? corridor.x1 : corridor.x2;
        const doorY = isStart ? corridor.y1 : corridor.y2;
        
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
                doorwaySpec.x = doorX - this.settings.doorwayWidth / 2;
                doorwaySpec.y = room.y;
                break;
                
            case 'south':
                doorwaySpec.isNorthWall = false;
                doorwaySpec.width = this.settings.doorwayWidth;
                doorwaySpec.height = this.settings.gridSize;
                doorwaySpec.x = doorX - this.settings.doorwayWidth / 2;
                doorwaySpec.y = room.y + room.height - this.settings.gridSize;
                break;
                
            case 'east':
                doorwaySpec.isEastWall = true;
                doorwaySpec.width = this.settings.gridSize;
                doorwaySpec.height = this.settings.doorwayWidth;
                doorwaySpec.x = room.x + room.width - this.settings.gridSize;
                doorwaySpec.y = doorY - this.settings.doorwayWidth / 2;
                break;
                
            case 'west':
                doorwaySpec.isEastWall = false;
                doorwaySpec.width = this.settings.gridSize;
                doorwaySpec.height = this.settings.doorwayWidth;
                doorwaySpec.x = room.x;
                doorwaySpec.y = doorY - this.settings.doorwayWidth / 2;
                break;
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
        
        // Calculate the angle of the corridor
        const angle = Math.atan2(corridor.y2 - corridor.y1, corridor.x2 - corridor.x1);
        const length = Math.sqrt(
            Math.pow(corridor.x2 - corridor.x1, 2) + 
            Math.pow(corridor.y2 - corridor.y1, 2)
        );
        
        // Determine corridor dimensions based on orientation
        const isMoreHorizontal = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle));
        
        if (isMoreHorizontal) {
            // Corridor is more horizontal than vertical
            width = length;
            depth = corridor.width * this.settings.gridSize;
            x = Math.min(corridor.x1, corridor.x2);
            z = (corridor.y1 + corridor.y2) / 2 - depth / 2;
            
            if (corridor.x1 > corridor.x2) {
                // If corridor goes from right to left, adjust x
                x = corridor.x2;
            }
        } else {
            // Corridor is more vertical than horizontal
            width = corridor.width * this.settings.gridSize;
            depth = length;
            x = (corridor.x1 + corridor.x2) / 2 - width / 2;
            z = Math.min(corridor.y1, corridor.y2);
            
            if (corridor.y1 > corridor.y2) {
                // If corridor goes from bottom to top, adjust z
                z = corridor.y2;
            }
        }
        
        // Create corridor floor
        const corridorGeometry = new THREE.BoxGeometry(width, this.settings.floorHeight, depth);
        const corridorMesh = new THREE.Mesh(corridorGeometry, floorMaterial);
        
        // Position and rotate the corridor
        if (isMoreHorizontal) {
            // For horizontal-like corridors
            corridorMesh.position.set(
                x + width / 2,
                -this.settings.floorHeight / 2,
                z + depth / 2
            );
            
            if (Math.abs(angle) > 0.01) {
                // Only rotate if not perfectly horizontal
                corridorMesh.rotation.y = angle;
                // Adjust position to account for rotation
                corridorMesh.position.x = (corridor.x1 + corridor.x2) / 2;
                corridorMesh.position.z = (corridor.y1 + corridor.y2) / 2;
            }
        } else {
            // For vertical-like corridors
            corridorMesh.position.set(
                x + width / 2,
                -this.settings.floorHeight / 2,
                z + depth / 2
            );
            
            if (Math.abs(angle - Math.PI/2) > 0.01 && Math.abs(angle + Math.PI/2) > 0.01) {
                // Only rotate if not perfectly vertical
                corridorMesh.rotation.y = angle;
                // Adjust position to account for rotation
                corridorMesh.position.x = (corridor.x1 + corridor.x2) / 2;
                corridorMesh.position.z = (corridor.y1 + corridor.y2) / 2;
            }
        }
        
        corridorMesh.receiveShadow = true;
        group.colliderMeshes.push(corridorMesh);
        group.add(corridorMesh);
        
        // Add walls along the corridor sides
        this.addCorridorWalls(group, corridor, wallMaterial);
    }
    
    addCorridorWalls(group, corridor, wallMaterial) {
        // Add simple walls along a direct corridor
        const angle = Math.atan2(corridor.y2 - corridor.y1, corridor.x2 - corridor.x1);
        const length = Math.sqrt(
            Math.pow(corridor.x2 - corridor.x1, 2) + 
            Math.pow(corridor.y2 - corridor.y1, 2)
        );
        const halfWidth = corridor.width / 2;
        
        // Calculate perpendicular direction for wall offset
        const perpX = -Math.sin(angle);
        const perpY = Math.cos(angle);
        
        // Create walls on both sides of the corridor
        for (let side = -1; side <= 1; side += 2) {
            // Skip center position
            if (side === 0) continue;
            
            // Calculate wall position (offset from corridor center line)
            const offsetX = perpX * halfWidth * side;
            const offsetY = perpY * halfWidth * side;
            
            // Wall dimensions
            const wallLength = length;
            const wallHeight = this.settings.wallHeight;
            const wallWidth = this.settings.gridSize;
            
            // Position wall at center of its length
            const wallCenterX = (corridor.x1 + corridor.x2) / 2 + offsetX;
            const wallCenterY = (corridor.y1 + corridor.y2) / 2 + offsetY;
            
            // Create wall geometry and mesh
            const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallLength);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            
            // Position and rotate the wall
            wallMesh.position.set(
                wallCenterX,
                wallHeight / 2,
                wallCenterY
            );
            
            // Rotate wall to align with corridor
            wallMesh.rotation.y = angle + Math.PI / 2; // Perpendicular to corridor
            
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            
            group.add(wallMesh);
            group.colliderMeshes.push(wallMesh);
        }
    }
    
    createWall(group, x, y, width, height, depth, material) {
        const wallGeometry = new THREE.BoxGeometry(width, height, depth);
        const wallMesh = new THREE.Mesh(wallGeometry, material);
        
        wallMesh.position.set(x + width / 2,
            height / 2,
            y + depth / 2
        );
        
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        
        group.add(wallMesh);
        
        return wallMesh;
    }
}
