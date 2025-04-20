// src/dungeon/generator.js - Procedural dungeon generation

import * as THREE from 'three';
import { Room } from './room.js';
import { Dungeon } from './floor.js';
import { getDungeonTheme } from './themes.js';

// Generate a dungeon floor
export function generateDungeon(floorNumber) {
    console.log(`Generating dungeon for floor ${floorNumber}...`);
    
    // Determine dungeon size based on floor number
    const size = determineDungeonSize(floorNumber);
    
    // Get theme for this floor
    const theme = getDungeonTheme(floorNumber);
    
    // Create empty dungeon
    const dungeon = new Dungeon(floorNumber, size, theme);
    
    // Generate rooms using our new radial pattern instead of BSP
    const centerRoom = generateRadialRooms(dungeon, size);
    
    // Set all rooms to a flat height of 0
    setFlatRoomHeights(dungeon);
    
    // Place key and exit
    placeKeyAndExit(dungeon);
    
    // Add decorative elements
    addDecorations(dungeon, theme);
    
    // Set player spawn in the center room
    const spawnPosition = centerRoom.getCenter();
    dungeon.setPlayerSpawnPosition(spawnPosition.x, 2, spawnPosition.z);
    
    // Build the dungeon mesh
    dungeon.buildMesh();
    
    return dungeon;
}

// Determine dungeon size based on floor number
function determineDungeonSize(floorNumber) {
    // Floor number influences dungeon size
    // Deeper floors tend to be larger
    if (floorNumber <= 3) {
        return {
            roomCount: 5 + Math.floor(Math.random() * 3), // 5-7 rooms
            width: 50,
            height: 50
        };
    } else if (floorNumber <= 7) {
        return {
            roomCount: 8 + Math.floor(Math.random() * 4), // 8-11 rooms
            width: 70,
            height: 70
        };
    } else {
        return {
            roomCount: 12 + Math.floor(Math.random() * 9), // 12-20 rooms
            width: 100,
            height: 100
        };
    }
}

// New function to replace the BSP room generation
// This creates a more predictable layout with a central room and radial/cardinal rooms
function generateRadialRooms(dungeon, size) {
    const centerX = size.width / 2;
    const centerZ = size.height / 2;
    
    // Room size ranges
    const centerRoomSize = {
        width: 12,
        height: 12
    };
    
    const radialRoomSize = {
        minWidth: 8,
        maxWidth: 12,
        minHeight: 8,
        maxHeight: 12
    };
    
    const cardinalRoomSize = {
        minWidth: 6,
        maxWidth: 10,
        minHeight: 6,
        maxHeight: 10
    };
    
    // Corridor sizes
    const corridorWidth = 3;
    
    // Spacing between rooms
    const roomSpacing = 6;
    
    // Create center room
    const centerRoom = new Room(
        centerX - centerRoomSize.width / 2,
        0, // Height is now always 0
        centerZ - centerRoomSize.height / 2,
        centerRoomSize.width,
        centerRoomSize.height
    );
    
    // Set this as the spawn room
    centerRoom.isSpawnRoom = true;
    dungeon.addRoom(centerRoom);
    
    // Define the positions for the radial rooms (N, S, E, W) and potential cardinal rooms (NW, NE, SW, SE)
    const roomPositions = {
        // Radial rooms
        north: {
            dirX: 0,
            dirZ: -1,
            angle: 0,
            isRadial: true,
            connected: false,
            room: null
        },
        east: {
            dirX: 1,
            dirZ: 0,
            angle: Math.PI / 2,
            isRadial: true,
            connected: false,
            room: null
        },
        south: {
            dirX: 0,
            dirZ: 1,
            angle: Math.PI,
            isRadial: true,
            connected: false,
            room: null
        },
        west: {
            dirX: -1,
            dirZ: 0,
            angle: Math.PI * 3 / 2,
            isRadial: true,
            connected: false,
            room: null
        },
        
        // Cardinal rooms
        northeast: {
            dirX: 1,
            dirZ: -1,
            angle: Math.PI / 4,
            isRadial: false,
            connectedTo: 'north', // This room connects to the north radial room
            connected: false,
            room: null
        },
        southeast: {
            dirX: 1,
            dirZ: 1,
            angle: Math.PI * 3 / 4,
            isRadial: false,
            connectedTo: 'east', // This room connects to the east radial room
            connected: false,
            room: null
        },
        southwest: {
            dirX: -1,
            dirZ: 1,
            angle: Math.PI * 5 / 4,
            isRadial: false,
            connectedTo: 'south', // This room connects to the south radial room
            connected: false,
            room: null
        },
        northwest: {
            dirX: -1,
            dirZ: -1,
            angle: Math.PI * 7 / 4,
            isRadial: false,
            connectedTo: 'west', // This room connects to the west radial room
            connected: false,
            room: null
        }
    };
    
    // Create and place rooms
    for (const [name, position] of Object.entries(roomPositions)) {
        // For radial rooms, 80% chance of spawning
        // For cardinal rooms, 50% chance of spawning if the connected radial room exists
        let shouldSpawn = false;
        
        if (position.isRadial) {
            shouldSpawn = Math.random() < 0.8; // 80% chance for radial rooms
        } else {
            // Check if the connected radial room exists
            const connectedRadialRoom = roomPositions[position.connectedTo].room;
            shouldSpawn = connectedRadialRoom && Math.random() < 0.5; // 50% chance if connected radial exists
        }
        
        if (!shouldSpawn) continue;
        
        // Determine room size
        const sizeTemplate = position.isRadial ? radialRoomSize : cardinalRoomSize;
        const roomWidth = Math.floor(sizeTemplate.minWidth + Math.random() * (sizeTemplate.maxWidth - sizeTemplate.minWidth));
        const roomHeight = Math.floor(sizeTemplate.minHeight + Math.random() * (sizeTemplate.maxHeight - sizeTemplate.minHeight));
        
        // Calculate room position based on direction and distance from center
        let roomDistance;
        if (position.isRadial) {
            roomDistance = centerRoomSize.width / 2 + roomSpacing + roomWidth / 2;
        } else {
            roomDistance = centerRoomSize.width / 2 + roomSpacing * 2 + roomWidth / 2;
        }
        
        const roomX = centerX + position.dirX * roomDistance - roomWidth / 2;
        const roomZ = centerZ + position.dirZ * roomDistance - roomHeight / 2;
        
        // Create room
        const room = new Room(roomX, 0, roomZ, roomWidth, roomHeight);
        room.roomType = position.isRadial ? 'radial' : 'cardinal';
        dungeon.addRoom(room);
        
        // Store room in position data
        position.room = room;
        
        // Connect room to center room or its connected radial room
        if (position.isRadial) {
            // Connect radial room to center room
            connectRoomsWithCorridor(dungeon, centerRoom, room);
            position.connected = true;
        } else {
            // Connect cardinal room to its radial room
            const connectedRadialRoom = roomPositions[position.connectedTo].room;
            if (connectedRadialRoom) {
                connectRoomsWithCorridor(dungeon, connectedRadialRoom, room);
                position.connected = true;
            }
        }
    }
    
    // Make sure we have at least one radial room
    const hasAnyRadialRoom = Object.values(roomPositions).some(p => p.isRadial && p.connected);
    
    if (!hasAnyRadialRoom) {
        // Force create a random radial room
        const radialPositions = ['north', 'east', 'south', 'west'];
        const randomRadial = radialPositions[Math.floor(Math.random() * radialPositions.length)];
        const position = roomPositions[randomRadial];
        
        // Determine room size
        const roomWidth = Math.floor(radialRoomSize.minWidth + Math.random() * (radialRoomSize.maxWidth - radialRoomSize.minWidth));
        const roomHeight = Math.floor(radialRoomSize.minHeight + Math.random() * (radialRoomSize.maxHeight - radialRoomSize.minHeight));
        
        // Calculate room position
        const roomDistance = centerRoomSize.width / 2 + roomSpacing + roomWidth / 2;
        const roomX = centerX + position.dirX * roomDistance - roomWidth / 2;
        const roomZ = centerZ + position.dirZ * roomDistance - roomHeight / 2;
        
        // Create room
        const room = new Room(roomX, 0, roomZ, roomWidth, roomHeight);
        room.roomType = 'radial';
        dungeon.addRoom(room);
        
        // Store room in position data
        position.room = room;
        
        // Connect room to center room
        connectRoomsWithCorridor(dungeon, centerRoom, room);
        position.connected = true;
    }
    
    // Return the center room for player spawn point
    return centerRoom;
}

// Helper function to connect two rooms with a corridor
function connectRoomsWithCorridor(dungeon, room1, room2) {
    // Get center points of rooms
    const center1 = {
        x: room1.x + room1.width / 2,
        z: room1.z + room1.height / 2
    };
    
    const center2 = {
        x: room2.x + room2.width / 2,
        z: room2.z + room2.height / 2
    };
    
    // All rooms have the same flat height of 0
    const floorHeight = 0;
    
    // Create a simple L-shaped corridor
    const corridorWidth = 3;
    
    // Decide if we go horizontally first or vertically first
    if (Math.random() < 0.5) {
        // Horizontal then vertical
        // Create horizontal corridor
        const minX = Math.min(center1.x, center2.x);
        const maxX = Math.max(center1.x, center2.x);
        
        const horizontalCorridor = new Room(
            minX - corridorWidth / 2,
            floorHeight,
            center1.z - corridorWidth / 2,
            maxX - minX + corridorWidth,
            corridorWidth
        );
        
        horizontalCorridor.isCorridor = true;
        horizontalCorridor.setFloorHeight(floorHeight);
        dungeon.addCorridor(horizontalCorridor);
        
        // Create vertical corridor
        const minZ = Math.min(center1.z, center2.z);
        const maxZ = Math.max(center1.z, center2.z);
        
        const verticalCorridor = new Room(
            center2.x - corridorWidth / 2,
            floorHeight,
            minZ - corridorWidth / 2,
            corridorWidth,
            maxZ - minZ + corridorWidth
        );
        
        verticalCorridor.isCorridor = true;
        verticalCorridor.setFloorHeight(floorHeight);
        dungeon.addCorridor(verticalCorridor);
    } else {
        // Vertical then horizontal
        // Create vertical corridor
        const minZ = Math.min(center1.z, center2.z);
        const maxZ = Math.max(center1.z, center2.z);
        
        const verticalCorridor = new Room(
            center1.x - corridorWidth / 2,
            floorHeight,
            minZ - corridorWidth / 2,
            corridorWidth,
            maxZ - minZ + corridorWidth
        );
        
        verticalCorridor.isCorridor = true;
        verticalCorridor.setFloorHeight(floorHeight);
        dungeon.addCorridor(verticalCorridor);
        
        // Create horizontal corridor
        const minX = Math.min(center1.x, center2.x);
        const maxX = Math.max(center1.x, center2.x);
        
        const horizontalCorridor = new Room(
            minX - corridorWidth / 2,
            floorHeight,
            center2.z - corridorWidth / 2,
            maxX - minX + corridorWidth,
            corridorWidth
        );
        
        horizontalCorridor.isCorridor = true;
        horizontalCorridor.setFloorHeight(floorHeight);
        dungeon.addCorridor(horizontalCorridor);
    }
}

// New function to set all rooms to a flat height
function setFlatRoomHeights(dungeon) {
    const rooms = dungeon.getRooms();
    const corridors = dungeon.corridors;
    
    // Set all rooms to a height of 0
    rooms.forEach(room => {
        room.setFloorHeight(0);
    });
    
    // Set all corridors to a height of 0
    corridors.forEach(corridor => {
        corridor.setFloorHeight(0);
        corridor.isSloped = false; // Make sure no corridors are sloped
    });
}

// Calculate distance between room centers
function calculateDistance(room1, room2) {
    const centerX1 = room1.x + room1.width / 2;
    const centerZ1 = room1.z + room1.height / 2;
    const centerX2 = room2.x + room2.width / 2;
    const centerZ2 = room2.z + room2.height / 2;
    
    return Math.sqrt(
        Math.pow(centerX2 - centerX1, 2) + 
        Math.pow(centerZ2 - centerZ1, 2)
    );
}

// Place the key and exit in the dungeon in a more strategic way
function placeKeyAndExit(dungeon) {
    const rooms = dungeon.getRooms();
    
    // Need at least 2 rooms
    if (rooms.length < 2) return;
    
    // Find spawn room (center room)
    const spawnRoom = rooms.find(room => room.isSpawnRoom);
    
    // Find rooms by type
    const radialRooms = rooms.filter(room => room.roomType === 'radial');
    const cardinalRooms = rooms.filter(room => room.roomType === 'cardinal');
    const normalRooms = rooms.filter(room => !room.roomType && !room.isSpawnRoom);
    
    let keyRoom, exitRoom;
    
    // Optimal placement strategy:
    // 1. If we have cardinal rooms, put key in a cardinal room and exit in the opposite side
    // 2. Otherwise, if we have radial rooms, put key in a radial room and exit in another
    // 3. As a fallback, find two rooms that are far apart
    
    if (cardinalRooms.length >= 1) {
        // Place key in a cardinal room
        keyRoom = cardinalRooms[Math.floor(Math.random() * cardinalRooms.length)];
        
        // Find another room as far as possible for exit (preferably another cardinal or radial)
        const potentialExitRooms = [...cardinalRooms, ...radialRooms].filter(room => room !== keyRoom);
        
        if (potentialExitRooms.length > 0) {
            // Find the room that's farthest from the key room
            exitRoom = findFarthestRoom(keyRoom, potentialExitRooms);
        } else if (normalRooms.length > 0) {
            // Fall back to normal rooms if no cardinal/radial options
            exitRoom = findFarthestRoom(keyRoom, normalRooms);
        } else {
            // If we have no other options, use another cardinal room or any other room
            const otherRooms = rooms.filter(room => room !== keyRoom && room !== spawnRoom);
            exitRoom = findFarthestRoom(keyRoom, otherRooms);
        }
    } else if (radialRooms.length >= 2) {
        // Try to place key and exit in opposite radial rooms
        const directions = radialRooms.map(room => {
            const centerX = spawnRoom ? spawnRoom.x + spawnRoom.width / 2 : dungeon.size.width / 2;
            const centerZ = spawnRoom ? spawnRoom.z + spawnRoom.height / 2 : dungeon.size.height / 2;
            const roomCenterX = room.x + room.width / 2;
            const roomCenterZ = room.z + room.height / 2;
            
            return {
                room,
                direction: Math.atan2(roomCenterZ - centerZ, roomCenterX - centerX)
            };
        });
        
        // Sort by direction angle
        directions.sort((a, b) => a.direction - b.direction);
        
        // Try to find opposite rooms
        if (directions.length >= 2) {
            // Place key in a random radial room
            const keyIndex = Math.floor(Math.random() * directions.length);
            keyRoom = directions[keyIndex].room;
            
            // Place exit in the most opposite room
            let maxAngleDiff = 0;
            let bestExitRoomIndex = 0;
            
            for (let i = 0; i < directions.length; i++) {
                if (i === keyIndex) continue;
                
                let angleDiff = Math.abs(directions[i].direction - directions[keyIndex].direction);
                // Normalize to [0, PI]
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                
                if (angleDiff > maxAngleDiff) {
                    maxAngleDiff = angleDiff;
                    bestExitRoomIndex = i;
                }
            }
            
            exitRoom = directions[bestExitRoomIndex].room;
        } else {
            // Shouldn't happen but just in case
            keyRoom = radialRooms[0];
            exitRoom = radialRooms[1];
        }
    } else {
        // Fall back to the original approach - find two rooms that are far apart
        let maxDistance = 0;
        let farthestRooms = [0, 1];
        
        for (let i = 0; i < rooms.length; i++) {
            // Skip spawn room
            if (rooms[i] === spawnRoom) continue;
            
            for (let j = i + 1; j < rooms.length; j++) {
                // Skip spawn room
                if (rooms[j] === spawnRoom) continue;
                
                const distance = calculateDistance(rooms[i], rooms[j]);
                
                if (distance > maxDistance) {
                    maxDistance = distance;
                    farthestRooms = [i, j];
                }
            }
        }
        
        keyRoom = rooms[farthestRooms[0]];
        exitRoom = rooms[farthestRooms[1]];
    }
    
    // Place key in center of key room
    dungeon.placeKey(
        keyRoom.x + keyRoom.width / 2,
        keyRoom.floorHeight + 1, // Float above floor
        keyRoom.z + keyRoom.height / 2
    );
    
    // Place exit in center of exit room
    dungeon.placeExit(
        exitRoom.x + exitRoom.width / 2,
        exitRoom.floorHeight, // At floor level
        exitRoom.z + exitRoom.height / 2
    );
    
    // If we don't have a designated spawn room, choose a random one
    if (!spawnRoom) {
        // Get any room that isn't key or exit room
        let spawnRoomOptions = rooms.filter(room => room !== keyRoom && room !== exitRoom);
        
        // If no other rooms, use a room anyway
        if (spawnRoomOptions.length === 0) {
            spawnRoomOptions = [keyRoom]; // Prefer key room over exit room
        }
        
        const spawnRoom = spawnRoomOptions[Math.floor(Math.random() * spawnRoomOptions.length)];
        
        dungeon.setPlayerSpawnPosition(
            spawnRoom.x + spawnRoom.width / 2,
            spawnRoom.floorHeight + 0.5, // Slightly above floor
            spawnRoom.z + spawnRoom.height / 2
        );
    }
}

// Helper function to find the farthest room from a source room
function findFarthestRoom(sourceRoom, roomOptions) {
    let maxDistance = 0;
    let farthestRoom = roomOptions[0];
    
    for (const room of roomOptions) {
        const distance = calculateDistance(sourceRoom, room);
        
        if (distance > maxDistance) {
            maxDistance = distance;
            farthestRoom = room;
        }
    }
    
    return farthestRoom;
}

// Add decorative elements to the dungeon
function addDecorations(dungeon, theme) {
    const rooms = dungeon.getRooms();
    
    // Add decorations to each room
    for (const room of rooms) {
        // Skip small rooms and corridors
        if (room.isCorridor || room.width < 8 || room.height < 8) continue;
        
        // Add more decorations to special room types
        const decorationMultiplier = getDecorationMultiplier(room);
        
        // Decide how many decorations to add based on room size and type
        const roomArea = room.width * room.height;
        const baseDecorationCount = Math.floor(roomArea / 40) + 1;
        const decorationCount = Math.floor(baseDecorationCount * decorationMultiplier);
        
        for (let i = 0; i < decorationCount; i++) {
            // Random position within the room (not too close to walls)
            const margin = 1.5;
            const x = room.x + margin + Math.random() * (room.width - margin * 2);
            const z = room.z + margin + Math.random() * (room.height - margin * 2);
            
            // Add decoration based on theme
            dungeon.addDecoration(x, room.floorHeight, z, theme);
        }
    }
}

// Get decoration multiplier based on room type
function getDecorationMultiplier(room) {
    if (room.isSpawnRoom) {
        return 1.5; // More decorations in spawn room
    } else if (room.roomType === 'radial') {
        return 1.2; // Slightly more in radial rooms
    } else if (room.roomType === 'cardinal') {
        return 1.0; // Normal amount in cardinal rooms
    } else {
        return 0.8; // Fewer in other rooms
    }
}
