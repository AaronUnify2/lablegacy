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
            wallHeight: 3,
            doorwayWidth: 5,
            
            // Spacing settings
            minDistanceFromCenter: 20,
            maxDistanceFromCenter: 50
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
        
        // Create room meshes
        for (const room of rooms) {
            this.createRoomMesh(dungeonGroup, room, 
                                room.type === 'central' ? centralRoomFloorMaterial : floorMaterial, 
                                wallMaterial);
        }
        
        // Create corridor meshes
        for (const corridor of corridors) {
            this.createCorridorMesh(dungeonGroup, corridor, floorMaterial, wallMaterial);
        }
        
        // Create key
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
    
    // Create meshes for all alcoves attached to a room
    createAlcoveMeshes(group, room, floorMaterial, wallMaterial) {
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
    
    createRoomMesh(group, room, floorMaterial, wallMaterial) {
        // Create main room floor
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
        group.colliderMeshes.push(floorMesh);
        group.add(floorMesh);
        
        // Create walls with doorways for the main room
        this.createRoomWalls(group, room, wallMaterial);
        
        // Create alcoves if the room has any
        if (room.alcoves && room.alcoves.length > 0) {
            this.createAlcoveMeshes(group, room, floorMaterial, wallMaterial);
        }
        
        // Create pillars if the room has any
        if (room.pillars && room.pillars.length > 0) {
            this.createPillarMeshes(group, room, room.pillars, wallMaterial);
        }
    };
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
        
        // Generate pillars for each room
        for (const room of rooms) {
            room.pillars = this.generateRoomPillars(room);
        }
        
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
            pillars: []
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
                pillars: []
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
    
    // Generate pillars for a room
    generateRoomPillars(room) {
        // Skip pillar generation for small rooms or central room
        if (room.type === 'central' || 
            room.width < this.settings.minRoomSize * 1.5 || 
            room.height < this.settings.minRoomSize * 1.5) {
            return [];
        }
        
        const pillars = [];
        const minDistanceFromEdge = Math.max(room.width, room.height) * 0.2;
        const minDistanceBetweenPillars = Math.max(room.width, room.height) * 0.15;
        
        // Available pillar types
        const pillarTypes = [
            { type: 'large', chance: 0.25, size: 2.5, height: 5 },
            { type: 'medium', chance: 0.33, size: 1.8, height: 4 },
            { type: 'small', chance: 0.33, size: 1.2, height: 3.5 }
        ];
        
        // Randomly select 2 out of 3 pillar types for this room
        const shuffledTypes = [...pillarTypes].sort(() => Math.random() - 0.5);
        const selectedTypes = shuffledTypes.slice(0, 2);
        
        // Calculate the available area for placing pillars
        const availableArea = {
            minX: room.x + minDistanceFromEdge,
            maxX: room.x + room.width - minDistanceFromEdge,
            minY: room.y + minDistanceFromEdge,
            maxY: room.y + room.height - minDistanceFromEdge
        };
        
        // Calculate how many pillars could reasonably fit based on room size
        const areaWidth = availableArea.maxX - availableArea.minX;
        const areaHeight = availableArea.maxY - availableArea.minY;
        const maxPillars = Math.floor(Math.sqrt((areaWidth * areaHeight) / 
                          (Math.PI * Math.pow(minDistanceBetweenPillars, 2))));
        
        // Random number of pillars (1 to maxPillars, but typically 2-4)
        const numPillars = Math.max(1, Math.min(
            Math.floor(Math.random() * maxPillars) + 1, 
            4  // Cap at 4 pillars regardless of room size
        ));
        
        // Try to place the pillars
        for (let attempts = 0; attempts < numPillars * 5; attempts++) {
            if (pillars.length >= numPillars) break;
            
            // Select a random pillar type from the available types for this room
            // Account for different probabilities
            const rand = Math.random();
            let cumulativeProbability = 0;
            let selectedType = null;
            
            for (const type of selectedTypes) {
                cumulativeProbability += type.chance;
                if (rand <= cumulativeProbability) {
                    selectedType = type;
                    break;
                }
            }
            
            if (!selectedType) selectedType = selectedTypes[0];
            
            // Generate a random position for the pillar
            const pillarX = availableArea.minX + Math.random() * (availableArea.maxX - availableArea.minX);
            const pillarY = availableArea.minY + Math.random() * (availableArea.maxY - availableArea.minY);
            const pillarSize = selectedType.size;
            
            // Check if the pillar overlaps with existing pillars
            let overlaps = false;
            for (const existingPillar of pillars) {
                const distance = Math.sqrt(
                    Math.pow(pillarX - existingPillar.x, 2) + 
                    Math.pow(pillarY - existingPillar.y, 2)
                );
                
                if (distance < (pillarSize + existingPillar.size) / 2 + minDistanceBetweenPillars) {
                    overlaps = true;
                    break;
                }
            }
            
            // If no overlap, add the pillar
            if (!overlaps) {
                pillars.push({
                    x: pillarX,
                    y: pillarY,
                    size: pillarSize,
                    height: selectedType.height,
                    type: selectedType.type
                });
            }
        }
        
        return pillars;
    }
    
    // Create pillar meshes for a room
    createPillarMeshes(group, room, pillars, material) {
        if (!pillars || pillars.length === 0) return;
        
        // Create material variants for different pillar types
        const largePillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x7a6c5d,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const mediumPillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x8a7c6d,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const smallPillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x9a8c7d,
            roughness: 0.6,
            metalness: 0.3
        });
        
        // Create meshes for each pillar
        for (const pillar of pillars) {
            let pillarMaterial;
            
            // Select material based on pillar type
            switch (pillar.type) {
                case 'large':
                    pillarMaterial = largePillarMaterial;
                    break;
                case 'medium':
                    pillarMaterial = mediumPillarMaterial;
                    break;
                case 'small':
                    pillarMaterial = smallPillarMaterial;
                    break;
                default:
                    pillarMaterial = material;
            }
            
            // Create pillar geometry
            const pillarGeometry = new THREE.CylinderGeometry(
                pillar.size / 2,
                pillar.size / 2,
                pillar.height,
                8  // Octagonal pillars
            );
            
            const pillarMesh = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillarMesh.position.set(
                pillar.x,
                pillar.height / 2,
                pillar.y
            );
            
            pillarMesh.castShadow = true;
            pillarMesh.receiveShadow = true;
            
            group.add(pillarMesh);
            
            // Add pillar to collision meshes
            group.colliderMeshes.push(pillarMesh);
            
            // Add a subtle point light near the top of large and medium pillars
            if (pillar.type === 'large' || pillar.type === 'medium') {
                const lightColor = pillar.type === 'large' ? 0xffa95c : 0xd8c7a5;
                const lightIntensity = pillar.type === 'large' ? 0.8 : 0.5;
                const lightDistance = pillar.type === 'large' ? 15 : 10;
                
                const pillarLight = new THREE.PointLight(lightColor, lightIntensity, lightDistance);
                pillarLight.position.set(
                    pillar.x,
                    pillar.height * 0.8,
                    pillar.y
                );
                
                // Add subtle shadows for the light
                if (pillar.type === 'large') {
                    pillarLight.castShadow = true;
                    pillarLight.shadow.mapSize.width = 512;
                    pillarLight.shadow.mapSize.height = 512;
                    pillarLight.shadow.camera.near = 0.5;
                    pillarLight.shadow.camera.far = 15;
                }
                
                group.add(pillarLight);
            }
            
            // Add decorative elements based on pillar type
            if (pillar.type === 'large') {
                // Ornate capital (top) for large pillars
                const capitalGeometry = new THREE.CylinderGeometry(
                    pillar.size / 1.3,
                    pillar.size / 2,
                    pillar.size / 1.5,
                    8
                );
                
                const capitalMaterial = new THREE.MeshStandardMaterial({
                    color: 0x8a7c6d,
                    roughness: 0.6,
                    metalness: 0.3
                });
                
                const capitalMesh = new THREE.Mesh(capitalGeometry, capitalMaterial);
                capitalMesh.position.set(
                    pillar.x,
                    pillar.height + pillar.size / 3,
                    pillar.y
                );
                
                capitalMesh.castShadow = true;
                capitalMesh.receiveShadow = true;
                
                group.add(capitalMesh);
                
                // Base for large pillars
                const baseGeometry = new THREE.CylinderGeometry(
                    pillar.size / 1.7,
                    pillar.size / 1.5,
                    pillar.size / 2,
                    8
                );
                
                const baseMesh = new THREE.Mesh(baseGeometry, capitalMaterial);
                baseMesh.position.set(
                    pillar.x,
                    pillar.size / 4,
                    pillar.y
                );
                
                baseMesh.castShadow = true;
                baseMesh.receiveShadow = true;
                
                group.add(baseMesh);
            } 
            else if (pillar.type === 'medium') {
                // Simpler top for medium pillars
                const topGeometry = new THREE.CylinderGeometry(
                    pillar.size / 1.5,
                    pillar.size / 2,
                    pillar.size / 2,
                    8
                );
                
                const topMesh = new THREE.Mesh(topGeometry, pillarMaterial);
                topMesh.position.set(
                    pillar.x,
                    pillar.height + pillar.size / 4,
                    pillar.y
                );
                
                topMesh.castShadow = true;
                topMesh.receiveShadow = true;
                
                group.add(topMesh);
                
                // Simple base for medium pillars
                const baseGeometry = new THREE.CylinderGeometry(
                    pillar.size / 1.8,
                    pillar.size / 1.5,
                    pillar.size / 3,
                    8
                );
                
                const baseMesh = new THREE.Mesh(baseGeometry, pillarMaterial);
                baseMesh.position.set(
                    pillar.x,
                    pillar.size / 6,
                    pillar.y
                );
                
                baseMesh.castShadow = true;
                baseMesh.receiveShadow = true;
                
                group.add(baseMesh);
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
            wall: wall
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
            pillars: []
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
