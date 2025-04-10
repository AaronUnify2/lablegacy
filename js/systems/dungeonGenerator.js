export class DungeonGenerator {
    constructor() {
        // Settings for dungeon generation
        this.settings = {
            // Room settings
            centralRoomSize: 40,
            minRoomSize: 25,
            maxRoomSize: 40,
            
            // Basic settings
            gridSize: 1,
            corridorWidth: 5,
            floorHeight: 0.2,
            wallHeight: 15, // 5x taller (was 3)
            doorwayWidth: 5,
            
            // Spacing settings
            minDistanceFromCenter: 20,
            maxDistanceFromCenter: 50,
            
            // Pillar settings
            pillarRadius: 2,
            pillarHeight: 15, // 5x taller (was 3)
            pillarChance: 0.5, // 50% chance of spawning a pillar
            
            // New lighting settings
            centralTorchColor: 0x3366ff,    // Blue torches
            cardinalTorchColor: 0xff3333,   // Red torches
            cornerTorchColor: 0x990099,     // Purple torches
            torchIntensity: 6,
            torchDistance: 40,
            torchHeight: 8,
            
            // Ambient shadow intensity
            shadowIntensity: 0.3,           // Heavy shadow effect
            
            // Fog settings
            fogColor: 0x000000,             // Black fog
            fogDensity: 0.015               // Moderate fog density
        };
        
        // Create texture loader
        this.textureLoader = new THREE.TextureLoader();
    }
    
    generateFloor(floorLevel) {
        console.log(`Generating floor level ${floorLevel}...`);
        
        // Step 1: Generate the central room
        const centralRoom = this.generateCentralRoom();
        
        // Step 2: Generate rooms in cardinal directions
        const cardinalRooms = this.generateCardinalRooms(centralRoom);
        
        // Step 3: Generate corner rooms with 50% chance each
        const cornerRooms = this.generateCornerRooms(cardinalRooms);
        
        // Combine all rooms
        const rooms = [centralRoom, ...cardinalRooms, ...cornerRooms];
        
        // Step 4: Connect cardinal rooms to central room
        const mainCorridors = this.connectRoomsWithCorridors(centralRoom, cardinalRooms);
        
        // Step 5: Connect corner rooms to their adjacent cardinal rooms
        const cornerCorridors = this.connectCornerRooms(cardinalRooms, cornerRooms);
        
        // Combine all corridors
        const corridors = [...mainCorridors, ...cornerCorridors];
        
        // Place the key in a random room (not the central one)
        // Include corner rooms as possible key locations
        const keyRooms = [...cardinalRooms, ...cornerRooms];
        const keyPosition = this.placeKey(keyRooms);
        
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
            type: 'central',
            alcoves: [],
            // Central room never has a pillar
            hasPillar: false
        };
    }
    
    generateCardinalRooms(centralRoom) {
        const cardinalRooms = [];
        const directions = ['north', 'east', 'south', 'west'];
        
        // Calculate the center position of the central room
        const centerX = centralRoom.x + centralRoom.width / 2;
        const centerY = centralRoom.y + centralRoom.height / 2;
        
        // For each cardinal direction, create a room
        for (const direction of directions) {
            // Randomize room size within constraints
            const roomWidth = Math.floor(Math.random() * 
                (this.settings.maxRoomSize - this.settings.minRoomSize + 1)) + 
                this.settings.minRoomSize;
            
            const roomHeight = Math.floor(Math.random() * 
                (this.settings.maxRoomSize - this.settings.minRoomSize + 1)) + 
                this.settings.minRoomSize;
            
            // Randomize distance from center within constraints
            const distance = this.settings.minDistanceFromCenter + 
                Math.random() * (this.settings.maxDistanceFromCenter - this.settings.minDistanceFromCenter);
            
            // Calculate room position based on direction
            let roomX, roomY;
            
            switch (direction) {
                case 'north':
                    // Ensure room width overlaps with central room width for straight corridor
                    const northOverlap = Math.min(roomWidth, centralRoom.width) - 10; // -10 to ensure some overlap
                    const northOffset = Math.floor(Math.random() * northOverlap);
                    roomX = centerX - roomWidth / 2 + northOffset;
                    roomY = centralRoom.y - roomHeight - distance;
                    break;
                
                case 'east':
                    // Ensure room height overlaps with central room height for straight corridor
                    const eastOverlap = Math.min(roomHeight, centralRoom.height) - 10;
                    const eastOffset = Math.floor(Math.random() * eastOverlap);
                    roomX = centralRoom.x + centralRoom.width + distance;
                    roomY = centerY - roomHeight / 2 + eastOffset;
                    break;
                
                case 'south':
                    // Ensure room width overlaps with central room width for straight corridor
                    const southOverlap = Math.min(roomWidth, centralRoom.width) - 10;
                    const southOffset = Math.floor(Math.random() * southOverlap);
                    roomX = centerX - roomWidth / 2 + southOffset;
                    roomY = centralRoom.y + centralRoom.height + distance;
                    break;
                
                case 'west':
                    // Ensure room height overlaps with central room height for straight corridor
                    const westOverlap = Math.min(roomHeight, centralRoom.height) - 10;
                    const westOffset = Math.floor(Math.random() * westOverlap);
                    roomX = centralRoom.x - roomWidth - distance;
                    roomY = centerY - roomHeight / 2 + westOffset;
                    break;
            }
            
            const room = {
                x: roomX,
                y: roomY,
                width: roomWidth,
                height: roomHeight,
                connections: [],
                doorways: [],
                type: direction,
                alcoves: [],
                // Add pillar flag - 50% chance
                hasPillar: Math.random() < this.settings.pillarChance
            };
            
            // Add alcoves to the room
            this.addAlcovesToRoom(room, direction);
            
            cardinalRooms.push(room);
        }
        
        return cardinalRooms;
    }
    
    // Add alcoves to the outer edges of rooms
    addAlcovesToRoom(room, roomDirection) {
        // Chance to add alcoves to each available wall
        const alcoveChance = 0.4; // 40% chance per wall
        
        // Potential alcove walls based on room direction
        // Only add alcoves to walls that face away from the central room
        const availableWalls = [];
        
        switch (roomDirection) {
            case 'north':
                availableWalls.push('north', 'east', 'west');
                break;
            case 'east':
                availableWalls.push('east', 'north', 'south');
                break;
            case 'south':
                availableWalls.push('south', 'east', 'west');
                break;
            case 'west':
                availableWalls.push('west', 'north', 'south');
                break;
            // For corner rooms, only add alcoves to the outer walls
            case 'northeast':
                availableWalls.push('north', 'east');
                break;
            case 'southeast':
                availableWalls.push('east', 'south');
                break;
            case 'southwest':
                availableWalls.push('south', 'west');
                break;
            case 'northwest':
                availableWalls.push('north', 'west');
                break;
            case 'central':
                return; // No alcoves for central room
        }
        
        // For each available wall, decide if we add an alcove
        for (const wall of availableWalls) {
            if (Math.random() < alcoveChance) {
                // Create an alcove
                const alcove = this.createAlcove(room, wall);
                if (alcove) {
                    room.alcoves.push(alcove);
                }
            }
        }
    }
    
    // Create an alcove extending from a specific wall of a room
    createAlcove(room, wall) {
        // Alcove size: 20-40% of room width/height
        const minSize = 0.2;
        const maxSize = 0.4;
        
        let alcoveX, alcoveY, alcoveWidth, alcoveHeight;
        
        switch (wall) {
            case 'north':
                // Alcove extends north (top) from the room
                alcoveWidth = Math.floor((minSize + Math.random() * (maxSize - minSize)) * room.width);
                alcoveHeight = Math.floor((minSize + Math.random() * (maxSize - minSize)) * room.height);
                
                // Position alcove randomly along the north wall
                alcoveX = room.x + Math.floor(Math.random() * (room.width - alcoveWidth));
                alcoveY = room.y - alcoveHeight;
                break;
                
            case 'east':
                // Alcove extends east (right) from the room
                alcoveWidth = Math.floor((minSize + Math.random() * (maxSize - minSize)) * room.width);
                alcoveHeight = Math.floor((minSize + Math.random() * (maxSize - minSize)) * room.height);
                
                // Position alcove randomly along the east wall
                alcoveX = room.x + room.width;
                alcoveY = room.y + Math.floor(Math.random() * (room.height - alcoveHeight));
                break;
                
            case 'south':
                // Alcove extends south (bottom) from the room
                alcoveWidth = Math.floor((minSize + Math.random() * (maxSize - minSize)) * room.width);
                alcoveHeight = Math.floor((minSize + Math.random() * (maxSize - minSize)) * room.height);
                
                // Position alcove randomly along the south wall
                alcoveX = room.x + Math.floor(Math.random() * (room.width - alcoveWidth));
                alcoveY = room.y + room.height;
                break;
                
            case 'west':
                // Alcove extends west (left) from the room
                alcoveWidth = Math.floor((minSize + Math.random() * (maxSize - minSize)) * room.width);
                alcoveHeight = Math.floor((minSize + Math.random() * (maxSize - minSize)) * room.height);
                
                // Position alcove randomly along the west wall
                alcoveX = room.x - alcoveWidth;
                alcoveY = room.y + Math.floor(Math.random() * (room.height - alcoveHeight));
                break;
                
            default:
                return null;
        }
        
        return {
            x: alcoveX,
            y: alcoveY,
            width: alcoveWidth,
            height: alcoveHeight,
            wall: wall,
            // Add pillar flag for alcoves - lower chance (20%)
            hasPillar: Math.random() < 0.2
        };
    }
    
    // Generate corner rooms with 50% chance of spawning each
    generateCornerRooms(cardinalRooms) {
        const cornerRooms = [];
        
        // Get reference to cardinal rooms by type
        const northRoom = cardinalRooms.find(room => room.type === 'north');
        const eastRoom = cardinalRooms.find(room => room.type === 'east');
        const southRoom = cardinalRooms.find(room => room.type === 'south');
        const westRoom = cardinalRooms.find(room => room.type === 'west');
        
        // Define corner positions and their parent cardinal rooms
        const cornerConfigs = [
            { type: 'northeast', cardinalRoom: northRoom, direction: 'east' },
            { type: 'southeast', cardinalRoom: eastRoom, direction: 'south' },
            { type: 'southwest', cardinalRoom: southRoom, direction: 'west' },
            { type: 'northwest', cardinalRoom: westRoom, direction: 'north' }
        ];
        
        // Generate each corner room with 50% chance
        for (const config of cornerConfigs) {
            // 50% chance to create this corner room
            if (Math.random() < 0.5) {
                const cornerRoom = this.createCornerRoom(config.cardinalRoom, config.direction, config.type);
                if (cornerRoom) {
                    cornerRooms.push(cornerRoom);
                }
            }
        }
        
        return cornerRooms;
    }
    
    // Create a corner room extending from a cardinal room
    createCornerRoom(cardinalRoom, direction, type) {
        if (!cardinalRoom) return null;
        
        // Room size should be smaller than cardinal rooms
        const size = Math.floor(Math.random() * 
            (this.settings.maxRoomSize - this.settings.minRoomSize) / 2 + 
            this.settings.minRoomSize / 1.5);
        
        // Distance from cardinal room
        const distance = this.settings.minDistanceFromCenter / 2 + 
            Math.random() * (this.settings.maxDistanceFromCenter - this.settings.minDistanceFromCenter) / 2;
        
        let roomX, roomY, roomWidth, roomHeight;
        
        switch (direction) {
            case 'east':
                // Room extends to the east of the cardinal room
                roomWidth = size;
                roomHeight = size;
                roomX = cardinalRoom.x + cardinalRoom.width + distance;
                roomY = cardinalRoom.y - roomHeight / 2 + cardinalRoom.height / 2;
                break;
                
            case 'south':
                // Room extends to the south of the cardinal room
                roomWidth = size;
                roomHeight = size;
                roomX = cardinalRoom.x - roomWidth / 2 + cardinalRoom.width / 2;
                roomY = cardinalRoom.y + cardinalRoom.height + distance;
                break;
                
            case 'west':
                // Room extends to the west of the cardinal room
                roomWidth = size;
                roomHeight = size;
                roomX = cardinalRoom.x - roomWidth - distance;
                roomY = cardinalRoom.y - roomHeight / 2 + cardinalRoom.height / 2;
                break;
                
            case 'north':
                // Room extends to the north of the cardinal room
                roomWidth = size;
                roomHeight = size;
                roomX = cardinalRoom.x - roomWidth / 2 + cardinalRoom.width / 2;
                roomY = cardinalRoom.y - roomHeight - distance;
                break;
                
            default:
                return null;
        }
        
        const room = {
            x: roomX,
            y: roomY,
            width: roomWidth,
            height: roomHeight,
            connections: [],
            doorways: [],
            type: type,
            parentRoom: cardinalRoom,
            alcoves: [],
            // Add pillar flag - 50% chance
            hasPillar: Math.random() < this.settings.pillarChance
        };
        
        // Add alcoves to the corner room
        this.addAlcovesToRoom(room, type);
        
        return room;
    }
    
    connectRoomsWithCorridors(centralRoom, cardinalRooms) {
        const corridors = [];
        
        // Calculate central room boundaries
        const centralLeft = centralRoom.x;
        const centralRight = centralRoom.x + centralRoom.width;
        const centralTop = centralRoom.y;
        const centralBottom = centralRoom.y + centralRoom.height;
        
        // For each cardinal room, create a straight corridor to the central room
        for (const room of cardinalRooms) {
            // Calculate room boundaries
            const roomLeft = room.x;
            const roomRight = room.x + room.width;
            const roomTop = room.y;
            const roomBottom = room.y + room.height;
            
            // Determine connection points and corridor properties based on room position
            let corridor;
            
            switch (room.type) {
                case 'north':
                    // Connect bottom of north room to top of central room
                    const northX = Math.max(
                        Math.min(roomLeft + room.width / 2, centralRight - this.settings.doorwayWidth),
                        centralLeft + this.settings.doorwayWidth
                    );
                    
                    corridor = {
                        type: 'vertical',
                        x: northX - this.settings.corridorWidth / 2,
                        y: roomBottom,
                        width: this.settings.corridorWidth,
                        height: centralTop - roomBottom,
                        startRoom: room,
                        endRoom: centralRoom,
                        startWall: 'south',
                        endWall: 'north'
                    };
                    break;
                
                case 'east':
                    // Connect left of east room to right of central room
                    const eastY = Math.max(
                        Math.min(roomTop + room.height / 2, centralBottom - this.settings.doorwayWidth),
                        centralTop + this.settings.doorwayWidth
                    );
                    
                    corridor = {
                        type: 'horizontal',
                        x: centralRight,
                        y: eastY - this.settings.corridorWidth / 2,
                        width: roomLeft - centralRight,
                        height: this.settings.corridorWidth,
                        startRoom: centralRoom,
                        endRoom: room,
                        startWall: 'east',
                        endWall: 'west'
                    };
                    break;
                
                case 'south':
                    // Connect top of south room to bottom of central room
                    const southX = Math.max(
                        Math.min(roomLeft + room.width / 2, centralRight - this.settings.doorwayWidth),
                        centralLeft + this.settings.doorwayWidth
                    );
                    
                    corridor = {
                        type: 'vertical',
                        x: southX - this.settings.corridorWidth / 2,
                        y: centralBottom,
                        width: this.settings.corridorWidth,
                        height: roomTop - centralBottom,
                        startRoom: centralRoom,
                        endRoom: room,
                        startWall: 'south',
                        endWall: 'north'
                    };
                    break;
                
                case 'west':
                    // Connect right of west room to left of central room
                    const westY = Math.max(
                        Math.min(roomTop + room.height / 2, centralBottom - this.settings.doorwayWidth),
                        centralTop + this.settings.doorwayWidth
                    );
                    
                    corridor = {
                        type: 'horizontal',
                        x: roomRight,
                        y: westY - this.settings.corridorWidth / 2,
                        width: centralLeft - roomRight,
                        height: this.settings.corridorWidth,
                        startRoom: room,
                        endRoom: centralRoom,
                        startWall: 'east',
                        endWall: 'west'
                    };
                    break;
            }
            
            // Create doorways for the corridor
            this.createDoorways(corridor);
            
            corridors.push(corridor);
            
            // Connect the rooms
            centralRoom.connections.push(room);
            room.connections.push(centralRoom);
        }
        
        return corridors;
    }
    
    // Connect corner rooms to their parent cardinal rooms
    connectCornerRooms(cardinalRooms, cornerRooms) {
        const corridors = [];
        
        for (const cornerRoom of cornerRooms) {
            // Find the parent cardinal room
            const parentRoom = cornerRoom.parentRoom;
            
            if (parentRoom) {
                // Create corridor between corner room and parent room
                // Determine corridor direction and position
                const corridorInfo = this.calculateCorridorBetweenRooms(cornerRoom, parentRoom);
                
                if (corridorInfo) {
                    // Create doorways for the corridor
                    this.createDoorways(corridorInfo);
                    
                    corridors.push(corridorInfo);
                    
                    // Update room connections
                    cornerRoom.connections.push(parentRoom);
                    parentRoom.connections.push(cornerRoom);
                }
            }
        }
        
        return corridors;
    }
    
    // Calculate corridor properties between two rooms
    calculateCorridorBetweenRooms(room1, room2) {
        // Calculate room boundaries
        const room1Left = room1.x;
        const room1Right = room1.x + room1.width;
        const room1Top = room1.y;
        const room1Bottom = room1.y + room1.height;
        
        const room2Left = room2.x;
        const room2Right = room2.x + room2.width;
        const room2Top = room2.y;
        const room2Bottom = room2.y + room2.height;
        
        // Determine if rooms are primarily aligned horizontally or vertically
        // Check if one room is clearly to the left/right of the other
        if (room1Right < room2Left || room1Left > room2Right) {
            // Horizontal alignment - connect with a horizontal corridor
            // Find the vertical overlap between rooms
            const overlapTop = Math.max(room1Top, room2Top);
            const overlapBottom = Math.min(room1Bottom, room2Bottom);
            
            if (overlapBottom > overlapTop) {
                // There is overlap, so we can create a horizontal corridor
                const yCenter = (overlapTop + overlapBottom) / 2;
                
                return {
                    type: 'horizontal',
                    width: Math.abs(
                        room1Right < room2Left ? room2Left - room1Right : room1Left - room2Right
                    ),
                    height: this.settings.corridorWidth,
                    x: room1Right < room2Left ? room1Right : room2Right,
                    y: yCenter - this.settings.corridorWidth / 2,
                    startRoom: room1Right < room2Left ? room1 : room2,
                    endRoom: room1Right < room2Left ? room2 : room1,
                    startWall: room1Right < room2Left ? 'east' : 'east',
                    endWall: room1Right < room2Left ? 'west' : 'west'
                };
            }
        }
        
        // Check if one room is clearly above/below the other
        if (room1Bottom < room2Top || room1Top > room2Bottom) {
            // Vertical alignment - connect with a vertical corridor
            // Find the horizontal overlap between rooms
            const overlapLeft = Math.max(room1Left, room2Left);
            const overlapRight = Math.min(room1Right, room2Right);
            
            if (overlapRight > overlapLeft) {
                // There is overlap, so we can create a vertical corridor
                const xCenter = (overlapLeft + overlapRight) / 2;
                
                return {
                    type: 'vertical',
                    width: this.settings.corridorWidth,
                    height: Math.abs(
                        room1Bottom < room2Top ? room2Top - room1Bottom : room1Top - room2Bottom
                    ),
                    x: xCenter - this.settings.corridorWidth / 2,
                    y: room1Bottom < room2Top ? room1Bottom : room2Bottom,
                    startRoom: room1Bottom < room2Top ? room1 : room2,
                    endRoom: room1Bottom < room2Top ? room2 : room1,
                    startWall: room1Bottom < room2Top ? 'south' : 'south',
                    endWall: room1Bottom < room2Top ? 'north' : 'north'
                };
            }
        }
        
        // If we reach here, the rooms don't have a clear alignment
        // In this case, create an L-shaped corridor (two connected corridors)
        // But for simplicity, we'll just use the center points of each room to determine a direct path
        const room1CenterX = room1.x + room1.width / 2;
        const room1CenterY = room1.y + room1.height / 2;
        const room2CenterX = room2.x + room2.width / 2;
        const room2CenterY = room2.y + room2.height / 2;
        
        // Determine the primary direction (horizontal or vertical)
        const dx = Math.abs(room2CenterX - room1CenterX);
        const dy = Math.abs(room2CenterY - room1CenterY);
        
        if (dx > dy) {
            // Primarily horizontal
            const direction = room1CenterX < room2CenterX ? 'east' : 'west';
            const startRoom = direction === 'east' ? room1 : room2;
            const endRoom = direction === 'east' ? room2 : room1;
            
            return {
                type: 'horizontal',
                width: dx - (room1.width + room2.width) / 2 + this.settings.gridSize * 2,
                height: this.settings.corridorWidth,
                x: direction === 'east' ? room1Right - this.settings.gridSize : room2Right - this.settings.gridSize,
                y: room1CenterY - this.settings.corridorWidth / 2,
                startRoom: startRoom,
                endRoom: endRoom,
                startWall: 'east',
                endWall: 'west'
            };
        } else {
            // Primarily vertical
            const direction = room1CenterY < room2CenterY ? 'south' : 'north';
            const startRoom = direction === 'south' ? room1 : room2;
            const endRoom = direction === 'south' ? room2 : room1;
            
            return {
                type: 'vertical',
                width: this.settings.corridorWidth,
                height: dy - (room1.height + room2.height) / 2 + this.settings.gridSize * 2,
                x: room1CenterX - this.settings.corridorWidth / 2,
                y: direction === 'south' ? room1Bottom - this.settings.gridSize : room2Bottom - this.settings.gridSize,
                startRoom: startRoom,
                endRoom: endRoom,
                startWall: 'south',
                endWall: 'north'
            };
        }
    }
    
    createDoorways(corridor) {
        const startRoom = corridor.startRoom;
        const endRoom = corridor.endRoom;
        
        // Create doorway specs based on corridor type and walls
        if (corridor.type === 'horizontal') {
            // For horizontal corridors
            if (corridor.startWall === 'east') {
                // Doorway on east wall of start room
                startRoom.doorways.push({
                    isEastWall: true,
                    isNorthWall: false,
                    x: startRoom.x + startRoom.width - this.settings.gridSize,
                    y: corridor.y,
                    width: this.settings.gridSize,
                    height: corridor.height
                });
            } else if (corridor.startWall === 'west') {
                // Doorway on west wall of start room
                startRoom.doorways.push({
                    isEastWall: false,
                    isNorthWall: false,
                    x: startRoom.x,
                    y: corridor.y,
                    width: this.settings.gridSize,
                    height: corridor.height
                });
            }
            
            if (corridor.endWall === 'east') {
                // Doorway on east wall of end room
                endRoom.doorways.push({
                    isEastWall: true,
                    isNorthWall: false,
                    x: endRoom.x + endRoom.width - this.settings.gridSize,
                    y: corridor.y,
                    width: this.settings.gridSize,
                    height: corridor.height
                });
            } else if (corridor.endWall === 'west') {
                // Doorway on west wall of end room
                endRoom.doorways.push({
                    isEastWall: false,
                    isNorthWall: false,
                    x: endRoom.x,
                    y: corridor.y,
                    width: this.settings.gridSize,
                    height: corridor.height
                });
            }
        } else if (corridor.type === 'vertical') {
            // For vertical corridors
            if (corridor.startWall === 'north') {
                // Doorway on north wall of start room
                startRoom.doorways.push({
                    isEastWall: false,
                    isNorthWall: true,
                    x: corridor.x,
                    y: startRoom.y,
                    width: corridor.width,
                    height: this.settings.gridSize
                });
            } else if (corridor.startWall === 'south') {
                // Doorway on south wall of start room
                startRoom.doorways.push({
                    isEastWall: false,
                    isNorthWall: false,
                    x: corridor.x,
                    y: startRoom.y + startRoom.height - this.settings.gridSize,
                    width: corridor.width,
                    height: this.settings.gridSize
                });
            }
            
            if (corridor.endWall === 'north') {
                // Doorway on north wall of end room
                endRoom.doorways.push({
                    isEastWall: false,
                    isNorthWall: true,
                    x: corridor.x,
                    y: endRoom.y,
                    width: corridor.width,
                    height: this.settings.gridSize
                });
            } else if (corridor.endWall === 'south') {
                // Doorway on south wall of end room
                endRoom.doorways.push({
                    isEastWall: false,
                    isNorthWall: false,
                    x: corridor.x,
                    y: endRoom.y + endRoom.height - this.settings.gridSize,
                    width: corridor.width,
                    height: this.settings.gridSize
                });
            }
        }
    }
    
    placeKey(rooms) {
        // Choose a random room to place the key in
        const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
        
        // Place key in the center of that room
        return {
            x: randomRoom.x + randomRoom.width / 2,
            y: randomRoom.y + randomRoom.height / 2
        };
    }
    
    // Modified createDungeonMesh method
    createDungeonMesh(rooms, corridors, keyPosition) {
        // Create a group to hold all dungeon meshes
        const dungeonGroup = new THREE.Group();
        
        // Set up textures
        this.setupTextures();
        
        // Create materials with textures
        const materials = this.createMaterials();
        
        // Add fog to the scene
        this.addFogToScene();
        
        // Array to store collider meshes
        dungeonGroup.colliderMeshes = [];
        
        // Create room meshes
        for (const room of rooms) {
            this.createRoomMesh(dungeonGroup, room, materials, room.type);
        }
        
        // Create corridor meshes
        for (const corridor of corridors) {
            this.createCorridorMesh(dungeonGroup, corridor, materials.corridor.floor, materials.corridor.wall);
        }
        
        // Create key
        const keyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const keyMesh = new THREE.Mesh(keyGeometry, materials.key);
        keyMesh.position.set(
            keyPosition.x,
            1, // Floating above the floor
            keyPosition.y
        );
        
        // Add a point light to the key to make it glow
        const keyLight = new THREE.PointLight(0xffcc00, 1.5, 10);
        keyLight.position.copy(keyMesh.position);
        dungeonGroup.add(keyLight);
        
        keyMesh.castShadow = true;
        dungeonGroup.add(keyMesh);
        
        // Add torch lighting to rooms
        this.addTorchLighting(dungeonGroup, rooms);
        
        // Add ceiling of darkness
        this.createDarkCeiling(dungeonGroup, rooms, corridors);
        
        return dungeonGroup;
    }
    
    // New method to set up textures
    setupTextures() {
        // We'll use procedural textures for now, but you could load image textures
        this.textures = {
            // Generate a sandstone texture procedurally
            sandstone: this.generateProceduralTexture(
                (ctx, width, height) => {
                    // Base sandstone color
                    ctx.fillStyle = '#d2b48c';
                    ctx.fillRect(0, 0, width, height);
                    
                    // Add grain and variation
                    for (let i = 0; i < 5000; i++) {
                        const x = Math.random() * width;
                        const y = Math.random() * height;
                        const size = Math.random() * 2 + 0.5;
                        const shade = Math.random() * 40 - 20;
                        
                        ctx.fillStyle = `rgb(${210 + shade}, ${180 + shade}, ${140 + shade})`;
                        ctx.fillRect(x, y, size, size);
                    }
                    
                    // Add some larger variations
                    for (let i = 0; i < 50; i++) {
                        const x = Math.random() * width;
                        const y = Math.random() * height;
                        const size = Math.random() * 20 + 5;
                        const shade = Math.random() * 20 - 10;
                        
                        ctx.fillStyle = `rgba(${200 + shade}, ${170 + shade}, ${130 + shade}, 0.3)`;
                        ctx.beginPath();
                        ctx.arc(x, y, size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            ),
            
            // Mosaic floor texture
            mosaicFloor: this.generateProceduralTexture(
                (ctx, width, height) => {
                    // Background
                    ctx.fillStyle = '#333333';
                    ctx.fillRect(0, 0, width, height);
                    
                    // Draw mosaic tiles
                    const tileSize = 20;
                    const colors = [
                        '#395A78', // Blue
                        '#5E3978', // Purple
                        '#78395A', // Magenta
                        '#604C2A', // Brown
                        '#2A604C', // Teal
                    ];
                    
                    for (let x = 0; x < width; x += tileSize) {
                        for (let y = 0; y < height; y += tileSize) {
                            const colorIndex = Math.floor(Math.random() * colors.length);
                            
                            // Add some variation to tile color
                            const baseColor = colors[colorIndex];
                            const r = parseInt(baseColor.substr(1, 2), 16);
                            const g = parseInt(baseColor.substr(3, 2), 16);
                            const b = parseInt(baseColor.substr(5, 2), 16);
                            
                            const variation = 15;
                            const newR = Math.max(0, Math.min(255, r + (Math.random() * variation * 2 - variation)));
                            const newG = Math.max(0, Math.min(255, g + (Math.random() * variation * 2 - variation)));
                            const newB = Math.max(0, Math.min(255, b + (Math.random() * variation * 2 - variation)));
                            
                            ctx.fillStyle = `rgb(${newR}, ${newG}, ${newB})`;
                            
                            // Draw tile with small gap
                            ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
                        }
                    }
                }
            ),
            
            // Corridor floor texture
            corridorFloor: this.generateProceduralTexture(
                (ctx, width, height) => {
                    // Dark base
                    ctx.fillStyle = '#222222';
                    ctx.fillRect(0, 0, width, height);
                    
                    // Add worn path effect down the middle
                    const gradient = ctx.createLinearGradient(0, 0, 0, height);
                    gradient.addColorStop(0, 'rgba(50, 50, 50, 0.8)');
                    gradient.addColorStop(0.5, 'rgba(60, 60, 60, 0.9)');
                    gradient.addColorStop(1, 'rgba(50, 50, 50, 0.8)');
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(width * 0.3, 0, width * 0.4, height);
                    
                    // Add some random scratches
                    ctx.strokeStyle = 'rgba(90, 90, 90, 0.3)';
                    for (let i = 0; i < 20; i++) {
                        ctx.beginPath();
                        const x1 = Math.random() * width;
                        const y1 = Math.random() * height;
                        const x2 = x1 + (Math.random() * 30 - 15);
                        const y2 = y1 + (Math.random() * 30 - 15);
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    }
                }
            ),
            
            // Pillar texture
            pillar: this.generateProceduralTexture(
                (ctx, width, height) => {
                    // Base stone color
                    ctx.fillStyle = '#444444';
                    ctx.fillRect(0, 0, width, height);
                    
                    // Add vertical striations
                    for (let x = 0; x < width; x += 2) {
                        const shade = Math.random() * 20 - 10;
                        ctx.fillStyle = `rgba(80, 80, 80, ${Math.random() * 0.2})`;
                        ctx.fillRect(x, 0, 2, height);
                    }
                    
                    // Add some horizontal cracks
                    ctx.strokeStyle = 'rgba(30, 30, 30, 0.5)';
                    ctx.lineWidth = 1;
                    for (let i = 0; i < 5; i++) {
                        const y = Math.random() * height;
                        ctx.beginPath();
                        ctx.moveTo(0, y);
                        
                        // Create a jagged line
                        let x = 0;
                        while (x < width) {
                            const stepX = Math.random() * 10 + 5;
                            const stepY = Math.random() * 6 - 3;
                            x += stepX;
                            ctx.lineTo(x, y + stepY);
                        }
                        
                        ctx.stroke();
                    }
                }
            )
        };
    }
    
    // Helper to generate procedural textures
    generateProceduralTexture(drawFunction, size = 512) {
        // Create a canvas
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Draw the texture
        drawFunction(ctx, size, size);
        
        // Create a texture from the canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    // Create materials with textures
    createMaterials() {
        return {
            central: {
                floor: new THREE.MeshStandardMaterial({ 
                    map: this.textures.mosaicFloor,
                    roughness: 0.7,
                    metalness: 0.2,
                    color: 0x666666,
                }),
                wall: new THREE.MeshStandardMaterial({ 
                    map: this.textures.sandstone,
                    roughness: 0.9,
                    metalness: 0.1,
                    color: 0xaaaaaa,
                }),
                pillar: new THREE.MeshStandardMaterial({
                    map: this.textures.pillar,
                    roughness: 0.8,
                    metalness: 0.3,
                    color: 0x888888,
                })
            },
            cardinal: {
                floor: new THREE.MeshStandardMaterial({ 
                    map: this.textures.mosaicFloor,
                    roughness: 0.7,
                    metalness: 0.2,
                    color: 0x442222, // Reddish tint
                }),
                wall: new THREE.MeshStandardMaterial({ 
                    map: this.textures.sandstone,
                    roughness: 0.9,
                    metalness: 0.1,
                    color: 0x884444, // Reddish tint
                }),
                pillar: new THREE.MeshStandardMaterial({
                    map: this.textures.pillar,
                    roughness: 0.8,
                    metalness: 0.3,
                    color: 0x664444, // Reddish tint
                })
            },
            corner: {
                floor: new THREE.MeshStandardMaterial({ 
                    map: this.textures.mosaicFloor,
                    roughness: 0.7,
                    metalness: 0.2,
                    color: 0x442244, // Purple tint
                }),
                wall: new THREE.MeshStandardMaterial({ 
                    map: this.textures.sandstone,
                    roughness: 0.9,
                    metalness: 0.1,
                    color: 0x664466, // Purple tint
                }),
                pillar: new THREE.MeshStandardMaterial({
                    map: this.textures.pillar,
                    roughness: 0.8,
                    metalness: 0.3,
                    color: 0x553355, // Purple tint
                })
            },
            corridor: {
                floor: new THREE.MeshStandardMaterial({ 
                    map: this.textures.corridorFloor,
                    roughness: 0.8,
                    metalness: 0.1,
                    color: 0x333333,
                }),
                wall: new THREE.MeshStandardMaterial({ 
                    map: this.textures.sandstone,
                    roughness: 0.9,
                    metalness: 0.1,
                    color: 0x555555,
                })
            },
            key: new THREE.MeshStandardMaterial({
                color: 0xffcc00,
                roughness: 0.3,
                metalness: 0.8,
                emissive: 0xffcc00,
                emissiveIntensity: 0.5
            })
        };
    }
    
    // Add fog to scene
    addFogToScene() {
        // This needs to be called outside this class - will be returned as part of
        // the dungeon generation result
        const scene = window.currentScene;
        if (scene) {
            scene.fog = new THREE.FogExp2(
                this.settings.fogColor, 
                this.settings.fogDensity
            );
        }
    }
    
    // Create room mesh with appropriate materials
    createRoomMesh(group, room, materials, roomType) {
        // Determine which material set to use based on room type
        let materialSet;
        
        if (room.type === 'central') {
            materialSet = materials.central;
        } else if (room.type === 'north' || room.type === 'east' || 
                  room.type === 'south' || room.type === 'west') {
            materialSet = materials.cardinal;
        } else {
            materialSet = materials.corner;
        }
        
        // Create main room floor
        const floorGeometry = new THREE.BoxGeometry(
            room.width * this.settings.gridSize,
            this.settings.floorHeight,
            room.height * this.settings.gridSize
        );
        
        const floorMesh = new THREE.Mesh(floorGeometry, materialSet.floor);
        floorMesh.position.set(
            room.x + (room.width * this.settings.gridSize) / 2,
            -this.settings.floorHeight / 2,
            room.y + (room.height * this.settings.gridSize) / 2
        );
        floorMesh.receiveShadow = true;
        
        // Add collision to floor - prevents falling through
        group.colliderMeshes.push(floorMesh);
        group.add(floorMesh);
        
        // Create walls with doorways for the main room
        this.createRoomWalls(group, room, materialSet.wall);
        
        // Create alcoves if the room has any
        if (room.alcoves && room.alcoves.length > 0) {
            this.createAlcoveMeshes(group, room, materialSet.floor, materialSet.wall, materialSet.pillar);
        }
        
        // Create pillar in room center if this room has a pillar
        if (room.hasPillar) {
            this.createRoomPillar(group, room, materialSet.pillar);
        }
    }
    
    // Add torch lighting to rooms
    addTorchLighting(group, rooms) {
        for (const room of rooms) {
            const centerX = room.x + room.width / 2;
            const centerY = room.y + room.height / 2;
            
            // Determine torch color based on room type
            let torchColor, intensity;
            
            if (room.type === 'central') {
                torchColor = this.settings.centralTorchColor;
                intensity = this.settings.torchIntensity * 0.7; // Dimmer blue torches
            } else if (room.type === 'north' || room.type === 'east' || 
                       room.type === 'south' || room.type === 'west') {
                torchColor = this.settings.cardinalTorchColor;
                intensity = this.settings.torchIntensity * 0.5; // Dull red light
            } else {
                torchColor = this.settings.cornerTorchColor;
                intensity = this.settings.torchIntensity * 0.6; // Deep purple light
            }
            
            // Create torch light
            const torch = new THREE.PointLight(
                torchColor,
                intensity,
                this.settings.torchDistance
            );
            
            torch.position.set(
                centerX,
                this.settings.torchHeight,
                centerY
            );
            
            // Add shadow casting
            torch.castShadow = true;
            torch.shadow.mapSize.width = 512;
            torch.shadow.mapSize.height = 512;
            torch.shadow.camera.near = 0.5;
            torch.shadow.camera.far = 25;
            
            group.add(torch);
            
            // Add torch holder (small mesh for visual reference)
            this.createTorchHolder(group, centerX, centerY, torchColor);
            
            // Add light flicker effect
            this.addFlickerEffect(torch);
        }
    }
    
    // Create torch holder mesh
    createTorchHolder(group, x, y, color) {
        // Torch base
        const holderGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.5, 8);
        const holderMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.6
        });
        
        const holder = new THREE.Mesh(holderGeometry, holderMaterial);
        holder.position.set(x, this.settings.torchHeight - 0.25, y);
        group.add(holder);
        
        // Flame effect
        const flameGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const flameMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
        });
        
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.set(x, this.settings.torchHeight + 0.3, y);
        flame.scale.y = 1.5;
        group.add(flame);
        
        // Add a subtle flicker to the flame
        this.addFlameAnimation(flame);
    }
    
    // Add flicker effect to a light
    addFlickerEffect(light) {
        const originalIntensity = light.intensity;
        
        // Store initial properties for animation
        light.userData.originalIntensity = originalIntensity;
        light.userData.flickerTime = 0;
        light.userData.flickerSpeed = 0.1 + Math.random() * 0.1;
        light.userData.flickerAmount = 0.1 + Math.random() * 0.1;
        
        // Add to the flicker array to be updated by an animation system
        if (!window.flickeringLights) {
            window.flickeringLights = [];
            
            // Set up the animation loop
            const animateFlicker = function() {
                const lights = window.flickeringLights;
                if (lights && lights.length > 0) {
                    const time = performance.now() * 0.001;
                    
                    for (const light of lights) {
                        const userData = light.userData;
                        const noise = Math.sin(time * userData.flickerSpeed) * 
                                     Math.sin(time * userData.flickerSpeed * 1.5) *
                                     Math.sin(time * userData.flickerSpeed * 0.5);
                                     
                        light.intensity = userData.originalIntensity * 
                                         (1 + noise * userData.flickerAmount);
                    }
                }
                
                requestAnimationFrame(animateFlicker);
            };
            
            animateFlicker();
        }
        
        window.flickeringLights.push(light);
    }
    
    // Add animation to flame mesh
    addFlameAnimation(flame) {
        // Similar to the light flicker system
        if (!window.animatedFlames) {
            window.animatedFlames = [];
            
            const animateFlames = function() {
                const flames = window.animatedFlames;
                if (flames && flames.length > 0) {
                    const time = performance.now() * 0.001;
                    
                    for (const flame of flames) {
                        const userData = flame.userData;
                        
                        // Randomly scale and shift the flame
                        const scaleNoise = Math.sin(time * userData.flickerSpeed) * 
                                         Math.sin(time * userData.flickerSpeed * 2.5);
                                         
                        flame.scale.x = userData.originalScale.x * 
                                       (1 + scaleNoise * 0.2);
                        flame.scale.z = userData.originalScale.z *
                                       (1 + scaleNoise * 0.2);
                        
                        // Random slight position shift
                        flame.position.x = userData.originalPosition.x + 
                                          Math.sin(time * userData.flickerSpeed * 0.7) * 0.05;
                        flame.position.z = userData.originalPosition.z + 
                                          Math.cos(time * userData.flickerSpeed * 0.5) * 0.05;
                    }
                }
                
                requestAnimationFrame(animateFlames);
            };
            
            animateFlames();
        }
        
        // Store original properties
        flame.userData.originalScale = flame.scale.clone();
        flame.userData.originalPosition = flame.position.clone();
        flame.userData.flickerSpeed = 2 + Math.random() * 3;
        
        window.animatedFlames.push(flame);
    }
    
    // Create a dark ceiling
    createDarkCeiling(group, rooms, corridors) {
        // Find the boundaries of the entire dungeon
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        
        // Check rooms
        for (const room of rooms) {
            minX = Math.min(minX, room.x);
            maxX = Math.max(maxX, room.x + room.width * this.settings.gridSize);
            minZ = Math.min(minZ, room.y); // Y in data corresponds to Z in 3D
            maxZ = Math.max(maxZ, room.y + room.height * this.settings.gridSize);
            
            // Also check alcoves
            if (room.alcoves) {
                for (const alcove of room.alcoves) {
                    minX = Math.min(minX, alcove.x);
                    maxX = Math.max(maxX, alcove.x + alcove.width * this.settings.gridSize);
                    minZ = Math.min(minZ, alcove.y);
                    maxZ = Math.max(maxZ, alcove.y + alcove.height * this.settings.gridSize);
                }
            }
        }
        
        // Check corridors
        for (const corridor of corridors) {
            minX = Math.min(minX, corridor.x);
            maxX = Math.max(maxX, corridor.x + corridor.width);
            minZ = Math.min(minZ, corridor.y);
            maxZ = Math.max(maxZ, corridor.y + corridor.height);
        }
        
        // Add some padding
        minX -= 10;
        maxX += 10;
        minZ -= 10;
        maxZ += 10;
        
        // Create a black ceiling
        const ceilingGeometry = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ);
        const ceilingMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            side: THREE.DoubleSide
        });
        
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2; // Rotate to be horizontal
        ceiling.position.set(
            minX + (maxX - minX) / 2,
            this.settings.wallHeight + 5, // Above the walls
            minZ + (maxZ - minZ) / 2
        );
        
        group.add(ceiling);
        
        // Add some hanging shadow/darkness elements
        this.addHangingShadows(group, rooms);
    }
    
    // Add hanging shadow elements from the ceiling
    addHangingShadows(group, rooms) {
        for (const room of rooms) {
            // Skip some rooms randomly
            if (Math.random() < 0.4) continue;
            
            const centerX = room.x + room.width / 2;
            const centerY = room.y + room.height / 2;
            
            // Create several dark tendrils/wisps hanging from ceiling
            const count = Math.floor(Math.random() * 3) + 1;
            
            for (let i = 0; i < count; i++) {
                // Random position within the room
                const offsetX = (Math.random() - 0.5) * room.width * 0.6;
                const offsetY = (Math.random() - 0.5) * room.height * 0.6;
                
                const shadowGeometry = new THREE.CylinderGeometry(
                    0.2 + Math.random() * 0.3, // top radius
                    0.5 + Math.random() * 1.0, // bottom radius (wider)
                    3 + Math.random() * 5,     // height
                    8,                         // segments
                    3,                         // height segments
                    true                       // open-ended
                );
                
                const shadowMaterial = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.4 + Math.random() * 0.3,
                    side: THREE.DoubleSide
                });
                
                const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
                
                // Position hanging from ceiling
                shadow.position.set(
                    centerX + offsetX,
                    this.settings.wallHeight - shadowGeometry.parameters.height / 2,
                    centerY + offsetY
                );
                
                group.add(shadow);
                
                // Add slow swaying animation
                this.addSwayingAnimation(shadow);
            }
        }
    }
    
    // Add swaying animation to an object
    addSwayingAnimation(object) {
        // Set up animated objects
        if (!window.swayingObjects) {
            window.swayingObjects = [];
            
            const animateSway = function() {
                const objects = window.swayingObjects;
                if (objects && objects.length > 0) {
                    const time = performance.now() * 0.001;
                    
                    for (const obj of objects) {
                        const userData = obj.userData;
                        
                        // Gentle swaying rotation
                        obj.rotation.x = Math.sin(time * userData.swaySpeed * 0.3) * userData.swayAmount * 0.5;
                        obj.rotation.z = Math.sin(time * userData.swaySpeed) * userData.swayAmount;
                        
                        // Subtle position shift
                        obj.position.x = userData.originalPosition.x + 
                                         Math.sin(time * userData.swaySpeed * 0.7) * 0.2;
                        obj.position.z = userData.originalPosition.z + 
                                         Math.cos(time * userData.swaySpeed * 0.5) * 0.2;
                    }
                }
                
                requestAnimationFrame(animateSway);
            };
            
            animateSway();
        }
        
        // Store original properties
        object.userData.originalPosition = object.position.clone();
        object.userData.swaySpeed = 0.2 + Math.random() * 0.3;
        object.userData.swayAmount = 0.1 + Math.random() * 0.15;
        
        window.swayingObjects.push(object);
    }
    
    // Create room walls with doorways and alcove openings
    createRoomWalls(group, room, wallMaterial) {
        // Get doorway info for this room
        const doorways = room.doorways || [];
        
        // Create north wall with possible doorway gaps and alcove openings
        this.createWallWithDoorwaysAndAlcoves(
            group,
            room.x,
            room.y,
            room.width * this.settings.gridSize,
            this.settings.wallHeight,
            this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => d.isNorthWall),
            room.alcoves ? room.alcoves.filter(a => a.wall === 'north') : [],
            false
        );
        
        // Create south wall with possible doorway gaps and alcove openings
        this.createWallWithDoorwaysAndAlcoves(
            group,
            room.x,
            room.y + room.height * this.settings.gridSize - this.settings.gridSize,
            room.width * this.settings.gridSize,
            this.settings.wallHeight,
            this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => !d.isNorthWall && !d.isEastWall),
            room.alcoves ? room.alcoves.filter(a => a.wall === 'south') : [],
            false
        );
        
        // Create west wall with possible doorway gaps and alcove openings
        this.createWallWithDoorwaysAndAlcoves(
            group,
            room.x,
            room.y,
            this.settings.gridSize,
            this.settings.wallHeight,
            room.height * this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => !d.isEastWall),
            room.alcoves ? room.alcoves.filter(a => a.wall === 'west') : [],
            true
        );
        
        // Create east wall with possible doorway gaps and alcove openings
        this.createWallWithDoorwaysAndAlcoves(
            group,
            room.x + room.width * this.settings.gridSize - this.settings.gridSize,
            room.y,
            this.settings.gridSize,
            this.settings.wallHeight,
            room.height * this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => d.isEastWall),
            room.alcoves ? room.alcoves.filter(a => a.wall === 'east') : [],
            true
        );
    }
    
    // Create meshes for all alcoves attached to a room
    createAlcoveMeshes(group, room, floorMaterial, wallMaterial, pillarMaterial) {
        for (const alcove of room.alcoves) {
            // Create alcove floor
            const alcoveFloorGeometry = new THREE.BoxGeometry(
                alcove.width * this.settings.gridSize,
                this.settings.floorHeight,
                alcove.height * this.settings.gridSize
            );
            
            const alcoveFloorMesh = new THREE.Mesh(alcoveFloorGeometry, floorMaterial);
            alcoveFloorMesh.position.set(
                alcove.x + (alcove.width * this.settings.gridSize) / 2,
                -this.settings.floorHeight / 2,
                alcove.y + (alcove.height * this.settings.gridSize) / 2
            );
            alcoveFloorMesh.receiveShadow = true;
            
            // Add collision to alcove floor
            group.colliderMeshes.push(alcoveFloorMesh);
            group.add(alcoveFloorMesh);
            
            // Create alcove walls
            this.createAlcoveWalls(group, room, alcove, wallMaterial);
            
            // If this alcove has a pillar, create it
            if (alcove.hasPillar) {
                // Calculate the center of the alcove
                const centerX = alcove.x + alcove.width / 2;
                const centerY = alcove.y + alcove.height / 2;
                
                // Create the pillar geometry (smaller than room pillars)
                const pillarGeometry = new THREE.CylinderGeometry(
                    this.settings.pillarRadius * 0.8,  // top radius (slightly smaller)
                    this.settings.pillarRadius * 0.8,  // bottom radius
                    this.settings.pillarHeight,        // height
                    12,                                // radial segments
                    1,                                 // height segments
                    false                              // open-ended
                );
                
                // Create the pillar mesh
                const pillarMesh = new THREE.Mesh(pillarGeometry, pillarMaterial);
                
                // Position the pillar in the center of the alcove
                pillarMesh.position.set(
                    centerX,
                    this.settings.pillarHeight / 2, // Center vertically
                    centerY
                );
                
                // Add shadow casting
                pillarMesh.castShadow = true;
                pillarMesh.receiveShadow = true;
                
                // Add the pillar to the collision meshes
                group.colliderMeshes.push(pillarMesh);
                group.add(pillarMesh);
            }
        }
    }
    
    // Create walls for an alcove
    createAlcoveWalls(group, room, alcove, wallMaterial) {
        const { x, y, width, height, wall } = alcove;
        
        // Create openings between room and alcove
        switch (wall) {
            case 'north':
                // North alcove: create east, west, and north walls
                // East wall
                const northAlcoveEastWall = this.createWall(
                    group,
                    x + width * this.settings.gridSize - this.settings.gridSize,
                    y,
                    this.settings.gridSize,
                    this.settings.wallHeight,
                    height * this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(northAlcoveEastWall);
                
                // West wall
                const northAlcoveWestWall = this.createWall(
                    group,
                    x,
                    y,
                    this.settings.gridSize,
                    this.settings.wallHeight,
                    height * this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(northAlcoveWestWall);
                
                // North wall
                const northAlcoveNorthWall = this.createWall(
                    group,
                    x,
                    y,
                    width * this.settings.gridSize,
                    this.settings.wallHeight,
                    this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(northAlcoveNorthWall);
                break;
                
            case 'east':
                // East alcove: create north, south, and east walls
                // North wall
                const eastAlcoveNorthWall = this.createWall(
                    group,
                    x,
                    y,
                    width * this.settings.gridSize,
                    this.settings.wallHeight,
                    this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(eastAlcoveNorthWall);
                
                // South wall
                const eastAlcoveSouthWall = this.createWall(
                    group,
                    x,
                    y + height * this.settings.gridSize - this.settings.gridSize,
                    width * this.settings.gridSize,
                    this.settings.wallHeight,
                    this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(eastAlcoveSouthWall);
                
                // East wall
                const eastAlcoveEastWall = this.createWall(
                    group,
                    x + width * this.settings.gridSize - this.settings.gridSize,
                    y,
                    this.settings.gridSize,
                    this.settings.wallHeight,
                    height * this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(eastAlcoveEastWall);
                break;
                
            case 'south':
                // South alcove: create east, west, and south walls
                // East wall
                const southAlcoveEastWall = this.createWall(
                    group,
                    x + width * this.settings.gridSize - this.settings.gridSize,
                    y,
                    this.settings.gridSize,
                    this.settings.wallHeight,
                    height * this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(southAlcoveEastWall);
                
                // West wall
                const southAlcoveWestWall = this.createWall(
                    group,
                    x,
                    y,
                    this.settings.gridSize,
                    this.settings.wallHeight,
                    height * this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(southAlcoveWestWall);
                
                // South wall
                const southAlcoveSouthWall = this.createWall(
                    group,
                    x,
                    y + height * this.settings.gridSize - this.settings.gridSize,
                    width * this.settings.gridSize,
                    this.settings.wallHeight,
                    this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(southAlcoveSouthWall);
                break;
                
            case 'west':
                // West alcove: create north, south, and west walls
                // North wall
                const westAlcoveNorthWall = this.createWall(
                    group,
                    x,
                    y,
                    width * this.settings.gridSize,
                    this.settings.wallHeight,
                    this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(westAlcoveNorthWall);
                
                // South wall
                const westAlcoveSouthWall = this.createWall(
                    group,
                    x,
                    y + height * this.settings.gridSize - this.settings.gridSize,
                    width * this.settings.gridSize,
                    this.settings.wallHeight,
                    this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(westAlcoveSouthWall);
                
                // West wall
                const westAlcoveWestWall = this.createWall(
                    group,
                    x,
                    y,
                    this.settings.gridSize,
                    this.settings.wallHeight,
                    height * this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(westAlcoveWestWall);
                break;
        }
    }
    
    // Create a cylindrical pillar in the center of a room
    createRoomPillar(group, room, pillarMaterial) {
        // Calculate the center position of the room
        const centerX = room.x + room.width / 2;
        const centerY = room.y + room.height / 2;
        
        // Create the pillar geometry
        const pillarGeometry = new THREE.CylinderGeometry(
            this.settings.pillarRadius,  // top radius
            this.settings.pillarRadius,  // bottom radius
            this.settings.pillarHeight,  // height
            16,                          // radial segments
            1,                           // height segments
            false                        // open-ended
        );
        
        // Create the pillar mesh
        const pillarMesh = new THREE.Mesh(pillarGeometry, pillarMaterial);
        
        // Position the pillar in the center of the room
        pillarMesh.position.set(
            centerX,
            this.settings.pillarHeight / 2, // Center vertically
            centerY
        );
        
        // Add shadow casting
        pillarMesh.castShadow = true;
        pillarMesh.receiveShadow = true;
        
        // Add the pillar to the collision meshes
        group.colliderMeshes.push(pillarMesh);
        group.add(pillarMesh);
        
        return pillarMesh;
    }
    
    createWallWithDoorwaysAndAlcoves(group, x, y, width, height, depth, material, doorways, alcoves, isVertical = false) {
        // If no doorways or alcoves, create a single wall
        if ((!doorways || doorways.length === 0) && (!alcoves || alcoves.length === 0)) {
            const wallMesh = this.createWall(group, x, y, width, height, depth, material);
            group.colliderMeshes.push(wallMesh);
            return;
        }
        
        // For walls with doorways or alcoves, create wall segments
        if (isVertical) {
            // Vertical wall (west or east wall)
            
            // Combine doorways and alcoves to find all gaps
            const gaps = [...doorways];
            
            // Add alcoves as gaps
            for (const alcove of alcoves) {
                gaps.push({
                    y: alcove.y,
                    height: alcove.height * this.settings.gridSize,
                    isAlcove: true
                });
            }
            
            // Sort gaps by Y position
            gaps.sort((a, b) => a.y - b.y);
            
            let currentY = y;
            
            for (const gap of gaps) {
                // Create wall segment from current position to gap
                if (gap.y > currentY) {
                    const segmentHeight = gap.y - currentY;
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
                
                // Skip the gap
                currentY = gap.y + (gap.isAlcove ? gap.height : gap.height);
            }
            
            // Create final wall segment after the last gap
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
            
            // Combine doorways and alcoves to find all gaps
            const gaps = [...doorways];
            
            // Add alcoves as gaps
            for (const alcove of alcoves) {
                gaps.push({
                    x: alcove.x,
                    width: alcove.width * this.settings.gridSize,
                    isAlcove: true
                });
            }
            
            // Sort gaps by X position
            gaps.sort((a, b) => a.x - b.x);
            
            let currentX = x;
            
            for (const gap of gaps) {
                // Create wall segment from current position to gap
                if (gap.x > currentX) {
                    const segmentWidth = gap.x - currentX;
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
                
                // Skip the gap
                currentX = gap.x + (gap.isAlcove ? gap.width : gap.width);
            }
            
            // Create final wall segment after the last gap
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
    
    createCorridorMesh(group, corridor, floorMaterial, wallMaterial) {
        // Create floor
        const floorGeometry = new THREE.BoxGeometry(
            corridor.width,
            this.settings.floorHeight,
            corridor.height
        );
        
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.set(
            corridor.x + corridor.width / 2,
            -this.settings.floorHeight / 2,
            corridor.y + corridor.height / 2
        );
        floorMesh.receiveShadow = true;
        
        // Add collision to floor - prevents falling through
        group.colliderMeshes.push(floorMesh);
        group.add(floorMesh);
        
        // Create walls
        if (corridor.type === 'horizontal') {
            // Create north and south walls for horizontal corridors
            // North wall
            const northWallMesh = this.createWall(
                group,
                corridor.x,
                corridor.y,
                corridor.width,
                this.settings.wallHeight,
                this.settings.gridSize,
                wallMaterial
            );
            group.colliderMeshes.push(northWallMesh);
            
            // South wall
            const southWallMesh = this.createWall(
                group,
                corridor.x,
                corridor.y + corridor.height - this.settings.gridSize,
                corridor.width,
                this.settings.wallHeight,
                this.settings.gridSize,
                wallMaterial
            );
            group.colliderMeshes.push(southWallMesh);
        } else if (corridor.type === 'vertical') {
            // Create east and west walls for vertical corridors
            // East wall
            const eastWallMesh = this.createWall(
                group,
                corridor.x + corridor.width - this.settings.gridSize,
                corridor.y,
                this.settings.gridSize,
                this.settings.wallHeight,
                corridor.height,
                wallMaterial
            );
            group.colliderMeshes.push(eastWallMesh);
            
            // West wall
            const westWallMesh = this.createWall(
                group,
                corridor.x,
                corridor.y,
                this.settings.gridSize,
                this.settings.wallHeight,
                corridor.height,
                wallMaterial
            );
            group.colliderMeshes.push(westWallMesh);
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
