export class DungeonGenerator {
    constructor() {
        // Default settings for dungeon generation
        this.settings = {
            minRooms: 5,
            maxRooms: 15,
            roomSizeMin: 4,
            roomSizeMax: 10,
            corridorWidth: 2,
            floorHeight: 0.2,
            wallHeight: 3,
            gridSize: 1 // Size of each grid cell
        };
    }
    
    generateFloor(floorLevel) {
        console.log(`Generating floor level ${floorLevel}...`);
        
        // Adjust settings based on floor level if desired
        // For example, higher floors could have more rooms
        const numRooms = Math.min(
            this.settings.minRooms + Math.floor(floorLevel / 2),
            this.settings.maxRooms
        );
        
        // Generate rooms
        const rooms = this.generateRooms(numRooms);
        
        // Connect rooms with corridors
        const corridors = this.connectRooms(rooms);
        
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
        
        // For this basic implementation, we'll create a simple grid of rooms
        // A more sophisticated approach would use proper procedural generation
        
        // Create a basic maze with rooms in a grid pattern for testing
        const gridWidth = Math.ceil(Math.sqrt(numRooms));
        const gridHeight = Math.ceil(numRooms / gridWidth);
        
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
            const roomX = gridX * (this.settings.roomSizeMax + 5) * gridSize + 
                (Math.random() * 3 - 1.5) * gridSize;
            
            const roomY = gridY * (this.settings.roomSizeMax + 5) * gridSize + 
                (Math.random() * 3 - 1.5) * gridSize;
            
            rooms.push({
                x: roomX,
                y: roomY,
                width: roomWidth,
                height: roomHeight,
                connections: []
            });
        }
        
        return rooms;
    }
    
    connectRooms(rooms) {
        const corridors = [];
        
        // Simple approach: connect each room to the next one
        for (let i = 0; i < rooms.length - 1; i++) {
            const startRoom = rooms[i];
            const endRoom = rooms[i + 1];
            
            const startX = startRoom.x + startRoom.width / 2;
            const startY = startRoom.y + startRoom.height / 2;
            const endX = endRoom.x + endRoom.width / 2;
            const endY = endRoom.y + endRoom.height / 2;
            
            // Create an L-shaped corridor
            const corridorX = {
                x1: startX,
                y1: startY,
                x2: endX,
                y2: startY,
                width: this.settings.corridorWidth
            };
            
            const corridorY = {
                x1: endX,
                y1: startY,
                x2: endX,
                y2: endY,
                width: this.settings.corridorWidth
            };
            
            corridors.push(corridorX);
            corridors.push(corridorY);
            
            // Mark rooms as connected
            startRoom.connections.push(endRoom);
            endRoom.connections.push(startRoom);
        }
        
        // Optionally add some random connections for more interesting layouts
        if (rooms.length > 3) {
            const numExtraConnections = Math.floor(rooms.length / 3);
            
            for (let i = 0; i < numExtraConnections; i++) {
                const roomIndex1 = Math.floor(Math.random() * rooms.length);
                let roomIndex2 = Math.floor(Math.random() * rooms.length);
                
                // Ensure we're connecting different rooms
                while (roomIndex2 === roomIndex1 || 
                       rooms[roomIndex1].connections.includes(rooms[roomIndex2])) {
                    roomIndex2 = Math.floor(Math.random() * rooms.length);
                }
                
                const startRoom = rooms[roomIndex1];
                const endRoom = rooms[roomIndex2];
                
                const startX = startRoom.x + startRoom.width / 2;
                const startY = startRoom.y + startRoom.height / 2;
                const endX = endRoom.x + endRoom.width / 2;
                const endY = endRoom.y + endRoom.height / 2;
                
                // Create an L-shaped corridor
                const corridorX = {
                    x1: startX,
                    y1: startY,
                    x2: endX,
                    y2: startY,
                    width: this.settings.corridorWidth
                };
                
                const corridorY = {
                    x1: endX,
                    y1: startY,
                    x2: endX,
                    y2: endY,
                    width: this.settings.corridorWidth
                };
                
                corridors.push(corridorX);
                corridors.push(corridorY);
                
                // Mark rooms as connected
                startRoom.connections.push(endRoom);
                endRoom.connections.push(startRoom);
            }
        }
        
        return corridors;
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
            dungeonGroup.add(floorMesh);
            
            // Create walls
            // North wall
            this.createWall(
                dungeonGroup,
                room.x,
                room.y,
                room.width * this.settings.gridSize,
                this.settings.wallHeight,
                this.settings.gridSize,
                wallMaterial
            );
            
            // South wall
            this.createWall(
                dungeonGroup,
                room.x,
                room.y + room.height * this.settings.gridSize - this.settings.gridSize,
                room.width * this.settings.gridSize,
                this.settings.wallHeight,
                this.settings.gridSize,
                wallMaterial
            );
            
            // West wall
            this.createWall(
                dungeonGroup,
                room.x,
                room.y,
                this.settings.gridSize,
                this.settings.wallHeight,
                room.height * this.settings.gridSize,
                wallMaterial
            );
            
            // East wall
            this.createWall(
                dungeonGroup,
                room.x + room.width * this.settings.gridSize - this.settings.gridSize,
                room.y,
                this.settings.gridSize,
                this.settings.wallHeight,
                room.height * this.settings.gridSize,
                wallMaterial
            );
        }
        
        // Add corridor floors
        for (const corridor of corridors) {
            // Determine corridor orientation and dimensions
            let width, depth;
            if (corridor.x1 === corridor.x2) {
                // Vertical corridor
                width = corridor.width * this.settings.gridSize;
                depth = Math.abs(corridor.y2 - corridor.y1);
            } else {
                // Horizontal corridor
                width = Math.abs(corridor.x2 - corridor.x1);
                depth = corridor.width * this.settings.gridSize;
            }
            
            const corridorGeometry = new THREE.BoxGeometry(
                width,
                this.settings.floorHeight,
                depth
            );
            
            const corridorMesh = new THREE.Mesh(corridorGeometry, floorMaterial);
            
            // Position corridor
            corridorMesh.position.set(
                Math.min(corridor.x1, corridor.x2) + width / 2,
                -this.settings.floorHeight / 2,
                Math.min(corridor.y1, corridor.y2) + depth / 2
            );
            
            corridorMesh.receiveShadow = true;
            dungeonGroup.add(corridorMesh);
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
