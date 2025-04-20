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
    
    // Generate rooms using BSP (Binary Space Partitioning)
    generateRoomsBSP(dungeon, size);
    
    // Assign heights to rooms
    assignRoomHeights(dungeon, floorNumber);
    
    // Create corridors to connect rooms
    connectRooms(dungeon);
    
    // Place key and exit
    placeKeyAndExit(dungeon);
    
    // Add decorative elements
    addDecorations(dungeon, theme);
    
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

// Generate rooms using Binary Space Partitioning algorithm
function generateRoomsBSP(dungeon, size) {
    // Start with a single area covering the entire dungeon
    const areas = [{
        x: 0,
        z: 0,
        width: size.width,
        height: size.height
    }];
    
    // Split areas until we have enough for our rooms
    while (areas.length < size.roomCount) {
        // Find the largest area to split
        let largestAreaIndex = 0;
        let largestSize = 0;
        
        for (let i = 0; i < areas.length; i++) {
            const area = areas[i];
            const areaSize = area.width * area.height;
            
            if (areaSize > largestSize) {
                largestSize = areaSize;
                largestAreaIndex = i;
            }
        }
        
        const areaToSplit = areas[largestAreaIndex];
        
        // Decide whether to split horizontally or vertically
        const splitHorizontally = areaToSplit.width >= areaToSplit.height;
        
        // Determine split position (with some randomness)
        let splitPosition;
        
        if (splitHorizontally) {
            // Split along x-axis
            const minSplit = Math.max(areaToSplit.width * 0.3, 10);
            const maxSplit = Math.min(areaToSplit.width * 0.7, areaToSplit.width - 10);
            splitPosition = Math.floor(areaToSplit.x + minSplit + Math.random() * (maxSplit - minSplit));
            
            // Create two new areas
            const area1 = {
                x: areaToSplit.x,
                z: areaToSplit.z,
                width: splitPosition - areaToSplit.x,
                height: areaToSplit.height
            };
            
            const area2 = {
                x: splitPosition,
                z: areaToSplit.z,
                width: areaToSplit.width - (splitPosition - areaToSplit.x),
                height: areaToSplit.height
            };
            
            // Replace the split area with the two new ones
            areas.splice(largestAreaIndex, 1, area1, area2);
        } else {
            // Split along z-axis
            const minSplit = Math.max(areaToSplit.height * 0.3, 10);
            const maxSplit = Math.min(areaToSplit.height * 0.7, areaToSplit.height - 10);
            splitPosition = Math.floor(areaToSplit.z + minSplit + Math.random() * (maxSplit - minSplit));
            
            // Create two new areas
            const area1 = {
                x: areaToSplit.x,
                z: areaToSplit.z,
                width: areaToSplit.width,
                height: splitPosition - areaToSplit.z
            };
            
            const area2 = {
                x: areaToSplit.x,
                z: splitPosition,
                width: areaToSplit.width,
                height: areaToSplit.height - (splitPosition - areaToSplit.z)
            };
            
            // Replace the split area with the two new ones
            areas.splice(largestAreaIndex, 1, area1, area2);
        }
    }
    
    // Create rooms within each area (smaller than the area to create walls)
    areas.forEach(area => {
        // Room is slightly smaller than the area to ensure walls between rooms
        const padding = 2;
        const minRoomSize = 6;
        
        // Ensure room isn't too small
        if (area.width < minRoomSize + padding * 2 || area.height < minRoomSize + padding * 2) {
            return;
        }
        
        // Determine random room dimensions within the area
        const roomWidth = Math.max(minRoomSize, Math.floor(area.width * (0.6 + Math.random() * 0.3)));
        const roomHeight = Math.max(minRoomSize, Math.floor(area.height * (0.6 + Math.random() * 0.3)));
        
        // Determine room position within the area
        const roomX = area.x + Math.floor((area.width - roomWidth) * 0.5);
        const roomZ = area.z + Math.floor((area.height - roomHeight) * 0.5);
        
        // Create room
        const room = new Room(roomX, 0, roomZ, roomWidth, roomHeight);
        dungeon.addRoom(room);
    });
}

// Assign different heights to rooms for vertical variety
function assignRoomHeights(dungeon, floorNumber) {
    const rooms = dungeon.getRooms();
    
    // Determine if this floor should have height variations
    // More complex height variations on deeper floors
    const maxHeightVariation = Math.min(3, Math.floor(floorNumber / 2));
    
    if (maxHeightVariation <= 0) {
        // No height variation on early floors
        return;
    }
    
    // Create a height map to cluster rooms at similar heights
    const heightMap = {};
    
    // Assign each room to a "region" based on its position
    const regionSize = 20; // Size of each region
    
    rooms.forEach((room, index) => {
        // Get center of room
        const centerX = Math.floor((room.x + room.width / 2) / regionSize);
        const centerZ = Math.floor((room.z + room.height / 2) / regionSize);
        const regionKey = `${centerX},${centerZ}`;
        
        // Create region if it doesn't exist
        if (!heightMap[regionKey]) {
            // Random height offset for this region
            const heightOffset = Math.floor(Math.random() * (maxHeightVariation + 1)) * 3;
            heightMap[regionKey] = heightOffset;
        }
        
        // Assign height to room based on region
        room.setFloorHeight(heightMap[regionKey]);
    });
    
    // Make sure at least one path exists through the dungeon without excessive height changes
    smoothHeightTransitions(dungeon, rooms);
}

// Smooth out height transitions to avoid inaccessible areas
function smoothHeightTransitions(dungeon, rooms) {
    // Create a graph of room connections based on proximity
    const roomGraph = {};
    
    // Initialize graph
    rooms.forEach((room, index) => {
        roomGraph[index] = [];
    });
    
    // Connect nearby rooms in the graph
    for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
            const distance = calculateDistance(rooms[i], rooms[j]);
            
            // Connect rooms that are close enough to be connected by a corridor
            if (distance < 30) {
                roomGraph[i].push({ roomIndex: j, distance });
                roomGraph[j].push({ roomIndex: i, distance });
            }
        }
    }
    
    // Find paths through the dungeon
    // We'll ensure that height differences between connected rooms are manageable
    for (let i = 0; i < rooms.length; i++) {
        for (const connection of roomGraph[i]) {
            const j = connection.roomIndex;
            
            // Get height difference between rooms
            const heightDiff = Math.abs(rooms[i].floorHeight - rooms[j].floorHeight);
            
            // If height difference is too large, add intermediate steps
            if (heightDiff > 3) {
                // Adjust the higher room's height to be at most 3 units higher
                if (rooms[i].floorHeight > rooms[j].floorHeight) {
                    rooms[i].setFloorHeight(rooms[j].floorHeight + 3);
                } else {
                    rooms[j].setFloorHeight(rooms[i].floorHeight + 3);
                }
            }
        }
    }
}

// Connect rooms with corridors
function connectRooms(dungeon) {
    const rooms = dungeon.getRooms();
    
    // If no rooms, return early
    if (rooms.length === 0) return;
    
    // First, create a minimum spanning tree to ensure all rooms are connected
    // We'll use Prim's algorithm
    
    // Start with first room
    const connectedRooms = [rooms[0]];
    const unconnectedRooms = rooms.slice(1);
    
    // Connect all rooms
    while (unconnectedRooms.length > 0) {
        let shortestDistance = Infinity;
        let bestConnection = null;
        
        // Find the closest unconnected room to any connected room
        for (const connectedRoom of connectedRooms) {
            for (let i = 0; i < unconnectedRooms.length; i++) {
                const unconnectedRoom = unconnectedRooms[i];
                const distance = calculateDistance(connectedRoom, unconnectedRoom);
                
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    bestConnection = {
                        from: connectedRoom,
                        to: unconnectedRoom,
                        index: i
                    };
                }
            }
        }
        
        // Connect the rooms with a corridor
        if (bestConnection) {
            createCorridor(dungeon, bestConnection.from, bestConnection.to);
            
            // Move the room from unconnected to connected
            connectedRooms.push(bestConnection.to);
            unconnectedRooms.splice(bestConnection.index, 1);
        } else {
            // Something went wrong, break to avoid infinite loop
            console.error("Could not connect all rooms");
            break;
        }
    }
    
    // Add a few additional connections for loops (about 20% of the number of rooms)
    const additionalConnections = Math.max(1, Math.floor(rooms.length * 0.2));
    
    for (let i = 0; i < additionalConnections; i++) {
        // Pick two random rooms
        const roomIndex1 = Math.floor(Math.random() * rooms.length);
        let roomIndex2 = Math.floor(Math.random() * rooms.length);
        
        // Make sure they're different rooms
        while (roomIndex2 === roomIndex1) {
            roomIndex2 = Math.floor(Math.random() * rooms.length);
        }
        
        createCorridor(dungeon, rooms[roomIndex1], rooms[roomIndex2]);
    }
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

// Create a corridor between two rooms
function createCorridor(dungeon, room1, room2) {
    // Get center points of rooms
    const centerX1 = room1.x + room1.width / 2;
    const centerZ1 = room1.z + room1.height / 2;
    const centerX2 = room2.x + room2.width / 2;
    const centerZ2 = room2.z + room2.height / 2;
    
    // Check if rooms are at different heights
    const heightDifference = room2.floorHeight - room1.floorHeight;
    const hasDifferentHeights = Math.abs(heightDifference) > 0.1;
    
    // Decide if we go horizontally first or vertically first
    // This creates an L-shaped corridor
    if (Math.random() < 0.5) {
        // Horizontal then vertical
        const horizontalCorridor = createHorizontalCorridor(dungeon, centerX1, centerX2, centerZ1, room1.floorHeight, hasDifferentHeights);
        
        // If heights differ, we need a sloped corridor for the vertical section
        if (hasDifferentHeights) {
            createSlopedVerticalCorridor(dungeon, centerZ1, centerZ2, centerX2, room1.floorHeight, room2.floorHeight);
        } else {
            createVerticalCorridor(dungeon, centerZ1, centerZ2, centerX2, room1.floorHeight);
        }
    } else {
        // Vertical then horizontal
        // If heights differ, we need a sloped corridor for the vertical section
        if (hasDifferentHeights) {
            createSlopedVerticalCorridor(dungeon, centerZ1, centerZ2, centerX1, room1.floorHeight, room2.floorHeight);
        } else {
            createVerticalCorridor(dungeon, centerZ1, centerZ2, centerX1, room1.floorHeight);
        }
        
        createHorizontalCorridor(dungeon, centerX1, centerX2, centerZ2, room2.floorHeight, false);
    }
}

// Create a horizontal corridor segment
function createHorizontalCorridor(dungeon, startX, endX, z, floorHeight, willConnect) {
    const corridorWidth = 3; // Width of the corridor
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    
    // Create a room to represent the corridor
    const corridor = new Room(
        minX - corridorWidth / 2,
        floorHeight,
        z - corridorWidth / 2,
        maxX - minX + corridorWidth,
        corridorWidth
    );
    
    corridor.isCorridor = true;
    corridor.setFloorHeight(floorHeight);
    dungeon.addCorridor(corridor);
    
    return corridor;
}

// Create a vertical corridor segment
function createVerticalCorridor(dungeon, startZ, endZ, x, floorHeight) {
    const corridorWidth = 3; // Width of the corridor
    const minZ = Math.min(startZ, endZ);
    const maxZ = Math.max(startZ, endZ);
    
    // Create a room to represent the corridor
    const corridor = new Room(
        x - corridorWidth / 2,
        floorHeight,
        minZ - corridorWidth / 2,
        corridorWidth,
        maxZ - minZ + corridorWidth
    );
    
    corridor.isCorridor = true;
    corridor.setFloorHeight(floorHeight);
    dungeon.addCorridor(corridor);
    
    return corridor;
}

// Create a sloped corridor to connect rooms at different heights
function createSlopedVerticalCorridor(dungeon, startZ, endZ, x, startHeight, endHeight) {
    const corridorWidth = 3; // Width of the corridor
    const minZ = Math.min(startZ, endZ);
    const maxZ = Math.max(startZ, endZ);
    
    // Create a room to represent the corridor
    const corridor = new Room(
        x - corridorWidth / 2,
        Math.min(startHeight, endHeight), // Start at lower floor height
        minZ - corridorWidth / 2,
        corridorWidth,
        maxZ - minZ + corridorWidth
    );
    
    corridor.isCorridor = true;
    corridor.isSloped = true; // Mark as a sloped corridor
    
    // Store height information for proper rendering
    corridor.startHeight = startHeight;
    corridor.endHeight = endHeight;
    
    if (startZ > endZ) {
        // If we're going from south to north, swap heights
        corridor.startHeight = endHeight;
        corridor.endHeight = startHeight;
    }
    
    corridor.setFloorHeight(Math.min(startHeight, endHeight));
    dungeon.addCorridor(corridor);
    
    return corridor;
}

// Place the key and exit in the dungeon
function placeKeyAndExit(dungeon) {
    const rooms = dungeon.getRooms();
    
    // Need at least 2 rooms
    if (rooms.length < 2) return;
    
    // Find two rooms that are far apart
    let maxDistance = 0;
    let farthestRooms = [0, 1];
    
    for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
            const distance = calculateDistance(rooms[i], rooms[j]);
            
            if (distance > maxDistance) {
                maxDistance = distance;
                farthestRooms = [i, j];
            }
        }
    }
    
    // Place key in one room and exit in the other
    const keyRoom = rooms[farthestRooms[0]];
    const exitRoom = rooms[farthestRooms[1]];
    
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
    
    // Mark spawn point as the center of a random room (not key or exit room)
    let spawnRoomIndex;
    do {
        spawnRoomIndex = Math.floor(Math.random() * rooms.length);
    } while (spawnRoomIndex === farthestRooms[0] || spawnRoomIndex === farthestRooms[1]);
    
    const spawnRoom = rooms[spawnRoomIndex];
    
    dungeon.setPlayerSpawnPosition(
        spawnRoom.x + spawnRoom.width / 2,
        spawnRoom.floorHeight + 0.5, // Slightly above floor
        spawnRoom.z + spawnRoom.height / 2
    );
}

// Add decorative elements to the dungeon
function addDecorations(dungeon, theme) {
    const rooms = dungeon.getRooms();
    
    // Add decorations to each room
    for (const room of rooms) {
        // Skip small rooms and corridors
        if (room.isCorridor || room.width < 8 || room.height < 8) continue;
        
        // Decide how many decorations to add based on room size
        const roomArea = room.width * room.height;
        const decorationCount = Math.floor(roomArea / 40) + 1;
        
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
