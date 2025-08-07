// Dungeon Generation System with Collision Detection and Progressive Portal System
// Grid-based procedural dungeon generation with solid walls, floors, and ceilings
// Simplified to use single consistent theme

class DungeonSystem {
    constructor(scene, player) {
        console.log('Initializing Unified Dungeon System...');
        
        this.scene = scene;
        this.player = player;
        
        // Current dungeon state
        this.currentFloor = 1;
        this.currentDungeon = null;
        
        // Progressive unlock system
        this.roomProgression = {
            center: { unlocked: true, enemiesDefeated: false },
            north: { unlocked: true, enemiesDefeated: false },    // Always unlocked first
            east: { unlocked: false, enemiesDefeated: false },
            west: { unlocked: false, enemiesDefeated: false },
            south: { unlocked: false, enemiesDefeated: false }
        };
        this.progressionOrder = ['north', 'east', 'west', 'south'];
        this.currentProgressionIndex = 0;
        
        // Grid-based floor planning
        this.gridSize = 2; // 2 units per grid cell
        this.dungeonWidth = 180; // Increased to 180 for cardinal rooms
        this.dungeonDepth = 180; // Increased to 180 for cardinal rooms
        this.gridWidth = Math.floor(this.dungeonWidth / this.gridSize);
        this.gridDepth = Math.floor(this.dungeonDepth / this.gridSize);
        
        // Room templates
        this.roomTemplates = {
            CENTER: { size: 13, type: 'center' },    // 26x26 units
            ORBITAL: { size: 10, type: 'orbital' },  // 20x20 units  
            CARDINAL: { size: 12, type: 'cardinal' } // 24x24 units
        };
        
        // Corridor width in grid cells
        this.corridorWidth = 3; // Increased from 2 to 3 for better connectivity
        
        // Collision and height data
        this.floorHeight = 0; // Base floor height
        this.ceilingHeight = 8; // Ceiling height from floor
        this.currentFloorMap = null; // For collision detection
        
        // Materials and lighting (single theme)
        this.textureLoader = new THREE.TextureLoader();
        this.materials = new Map();
        this.lightSources = [];
        this.billboardSprites = [];
        this.glowingPillars = []; // Track pillars for glow animation
        
        this.init();
    }
    
    init() {
        this.setupMaterials();
        this.setupBillboardSystem();
        
        // Connect player to this dungeon system for collision detection
        if (this.player) {
            this.player.setDungeonSystem(this);
        }
        
        console.log('Unified Dungeon System initialized with single theme');
    }
    
    // Progressive Unlock System
    resetProgression() {
        this.roomProgression = {
            center: { unlocked: true, enemiesDefeated: false },
            north: { unlocked: true, enemiesDefeated: false },
            east: { unlocked: false, enemiesDefeated: false },
            west: { unlocked: false, enemiesDefeated: false },
            south: { unlocked: false, enemiesDefeated: false }
        };
        this.currentProgressionIndex = 0;
        console.log('Room progression reset - only center and north rooms accessible');
    }
    
    defeatEnemiesInRoom(roomDirection) {
        console.log(`Attempting to defeat enemies in ${roomDirection} room...`);
        
        if (this.roomProgression[roomDirection]) {
            this.roomProgression[roomDirection].enemiesDefeated = true;
            console.log(`Enemies defeated in ${roomDirection} room`);
            
            // Check if this unlocks the next room
            this.checkProgressionUnlock();
        } else {
            console.error(`Room ${roomDirection} not found in progression!`);
        }
    }
    
    checkProgressionUnlock() {
        console.log('Checking progression unlock...');
        
        try {
            if (this.currentProgressionIndex >= this.progressionOrder.length) {
                console.log('Already at max progression');
                return;
            }
            
            const currentRoom = this.progressionOrder[this.currentProgressionIndex];
            console.log(`Checking if ${currentRoom} room is completed...`);
            
            if (this.roomProgression[currentRoom] && this.roomProgression[currentRoom].enemiesDefeated) {
                // Unlock next room in sequence
                this.currentProgressionIndex++;
                console.log(`Moving to progression index ${this.currentProgressionIndex}`);
                
                if (this.currentProgressionIndex < this.progressionOrder.length) {
                    const nextRoom = this.progressionOrder[this.currentProgressionIndex];
                    console.log(`Unlocking ${nextRoom} room...`);
                    
                    this.roomProgression[nextRoom].unlocked = true;
                    this.updateRoomPortals(nextRoom, true); // Open entrance to next room
                    console.log(`${nextRoom} room unlocked!`);
                } else {
                    // All orbital rooms completed - open exit portal
                    console.log('All orbital rooms completed!');
                    this.openExitPortal();
                    console.log('All rooms completed - exit portal opened!');
                }
            } else {
                console.log(`${currentRoom} room not yet completed`);
            }
        } catch (error) {
            console.error('Error in checkProgressionUnlock:', error);
        }
    }
    
    // For testing - cycles through the progression
    testProgressionAdvance() {
        const currentRoom = this.progressionOrder[this.currentProgressionIndex];
        this.defeatEnemiesInRoom(currentRoom);
    }
    
    // Collision Detection Methods
    isPositionWalkable(worldX, worldZ) {
        if (!this.currentFloorMap) return true;
        
        // Convert world coordinates to grid coordinates with symmetric rounding
        const gridX = Math.floor((worldX + this.dungeonWidth/2) / this.gridSize + 0.5);
        const gridZ = Math.floor((worldZ + this.dungeonDepth/2) / this.gridSize + 0.5);
        
        // Check bounds
        if (gridX < 0 || gridX >= this.gridWidth || gridZ < 0 || gridZ >= this.gridDepth) {
            return false; // Outside dungeon bounds
        }
        
        // Return walkable state from floor map
        return this.currentFloorMap[gridZ][gridX];
    }
    
    // More precise position checking for collision detection
    isPositionSolid(worldX, worldZ) {
        if (!this.currentFloorMap) return false;
        
        // Use symmetric coordinate conversion
        const gridX = Math.floor((worldX + this.dungeonWidth/2) / this.gridSize + 0.5);
        const gridZ = Math.floor((worldZ + this.dungeonDepth/2) / this.gridSize + 0.5);
        
        // Check bounds - treat out of bounds as solid
        if (gridX < 0 || gridX >= this.gridWidth || gridZ < 0 || gridZ >= this.gridDepth) {
            return true; // Outside dungeon bounds = solid
        }
        
        // Return solid state (inverse of walkable)
        return !this.currentFloorMap[gridZ][gridX];
    }
    
    getFloorHeight(worldX, worldZ) {
        return this.floorHeight;
    }
    
    getCeilingHeight(worldX, worldZ) {
        // Check if position is inside dungeon
        if (!this.isPositionWalkable(worldX, worldZ)) {
            return this.floorHeight; // No ceiling if not in walkable area
        }
        
        return this.floorHeight + this.ceilingHeight;
    }
    
    worldToGrid(worldX, worldZ) {
        return {
            x: Math.floor((worldX + this.dungeonWidth/2) / this.gridSize),
            z: Math.floor((worldZ + this.dungeonDepth/2) / this.gridSize)
        };
    }
    
    gridToWorld(gridX, gridZ) {
        return {
            x: (gridX - this.gridWidth/2) * this.gridSize,
            z: (gridZ - this.gridDepth/2) * this.gridSize
        };
    }
    
    setupMaterials() {
        // Single consistent theme - enhanced stone/fantasy dungeon
        this.createDungeonMaterials();
    }
    
    createDungeonMaterials() {
        // CENTER ROOM - Golden Byzantine Style
        const byzantineFloor = this.createPatternedFloor([
            '#D4AF37', '#FFD700', '#B8860B', '#DAA520',
            '#F0E68C', '#BDB76B', '#EEE8AA', '#F4E4BC'
        ], 32);
        this.materials.set('byzantine_floor', byzantineFloor);
        
        const byzantineWall = new THREE.MeshLambertMaterial({ 
            color: 0xC19A6B,
            emissive: 0x8B7355,
            emissiveIntensity: 0.1
        });
        this.materials.set('byzantine_wall', byzantineWall);
        
        const byzantineCeiling = new THREE.MeshLambertMaterial({ 
            color: 0xFFD700,
            emissive: 0xDAA520,
            emissiveIntensity: 0.2
        });
        this.materials.set('byzantine_ceiling', byzantineCeiling);
        
        const goldenPillar = new THREE.MeshLambertMaterial({
            color: 0xDAA520,
            emissive: 0xFFD700,
            emissiveIntensity: 0.3,
            metalness: 0.8,
            roughness: 0.2
        });
        this.materials.set('golden_pillar', goldenPillar);
        
        // ORBITAL ROOMS - Gothic Cathedral Style
        const gothicFloor = this.createPatternedFloor([
            '#2C3E50', '#34495E', '#1C2833', '#212F3D',
            '#283747', '#2E4053', '#1B2631', '#273746'
        ], 40);
        this.materials.set('gothic_floor', gothicFloor);
        
        const gothicWall = new THREE.MeshLambertMaterial({ 
            color: 0x3A3A3A,
            emissive: 0x1A1A2E,
            emissiveIntensity: 0.05
        });
        this.materials.set('gothic_wall', gothicWall);
        
        const gothicCeiling = new THREE.MeshLambertMaterial({ 
            color: 0x1F1F2E,
            emissive: 0x16213E,
            emissiveIntensity: 0.1
        });
        this.materials.set('gothic_ceiling', gothicCeiling);
        
        const silverPillar = new THREE.MeshLambertMaterial({
            color: 0x808080,
            emissive: 0xC0C0C0,
            emissiveIntensity: 0.2,
            metalness: 0.9,
            roughness: 0.3
        });
        this.materials.set('silver_pillar', silverPillar);
        
        // CARDINAL ROOMS - Celestial Chapel Style  
        const celestialFloor = this.createPatternedFloor([
            '#191970', '#000080', '#00008B', '#0000CD',
            '#4169E1', '#1E3A8A', '#1E40AF', '#1E3A5F'
        ], 36);
        this.materials.set('celestial_floor', celestialFloor);
        
        const celestialWall = new THREE.MeshLambertMaterial({ 
            color: 0x1E3A8A,
            emissive: 0x4169E1,
            emissiveIntensity: 0.15
        });
        this.materials.set('celestial_wall', celestialWall);
        
        const celestialCeiling = new THREE.MeshLambertMaterial({ 
            color: 0x000033,
            emissive: 0x191970,
            emissiveIntensity: 0.3
        });
        this.materials.set('celestial_ceiling', celestialCeiling);
        
        const starPillar = new THREE.MeshLambertMaterial({
            color: 0x4169E1,
            emissive: 0x87CEEB,
            emissiveIntensity: 0.4
        });
        this.materials.set('star_pillar', starPillar);
        
        // CORRIDOR MATERIALS - Neutral stone
        const corridorFloor = this.createPatternedFloor([
            '#696969', '#708090', '#778899', '#7F7F7F'
        ], 24);
        this.materials.set('corridor_floor', corridorFloor);
        
        const corridorWall = new THREE.MeshLambertMaterial({ 
            color: 0x5C5C5C,
            opacity: 0.95
        });
        this.materials.set('corridor_wall', corridorWall);
        
        const corridorCeiling = new THREE.MeshLambertMaterial({ 
            color: 0x4A4A4A,
            opacity: 0.9
        });
        this.materials.set('corridor_ceiling', corridorCeiling);
    }
    
    createPatternedFloor(colors, tileSize) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        for (let y = 0; y < canvas.height; y += tileSize) {
            for (let x = 0; x < canvas.width; x += tileSize) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillStyle = color;
                ctx.fillRect(x, y, tileSize - 2, tileSize - 2);
                
                // Add highlight
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(x, y, tileSize - 2, 3);
                
                // Add shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(x, y + tileSize - 5, tileSize - 2, 3);
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        return new THREE.MeshLambertMaterial({ 
            map: texture,
            transparent: true, 
            opacity: 0.95 
        });
    }
    
    setupBillboardSystem() {
        this.billboardGeometry = new THREE.PlaneGeometry(1, 1);
        this.createBillboardMaterials();
    }
    
    createBillboardMaterials() {
        // Consistent atmospheric elements
        const orbMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffaa44, 
            transparent: true, 
            opacity: 0.7, 
            side: THREE.DoubleSide, 
            blending: THREE.AdditiveBlending 
        });
        
        this.materials.set('orb_billboard', orbMaterial);
    }
    
    getCurrentTheme() {
        // Always return consistent theme
        return 'dungeon';
    }
    
    generateDungeon(floorNumber) {
        console.log(`Generating unified dungeon for floor ${floorNumber}...`);
        
        this.currentFloor = floorNumber;
        this.clearCurrentDungeon();
        
        // Reset progression for new floor
        this.resetProgression();
        
        console.log('Using consistent dungeon theme');
        
        // Phase 1: Plan room layout
        const roomLayout = this.planRoomLayout();
        
        // Phase 2: Create unified floor map
        const floorMap = this.createFloorMap(roomLayout);
        
        // Store floor map for collision detection
        this.currentFloorMap = floorMap;
        
        // Store dungeon data BEFORE generating geometry so it's available for room type checks
        this.currentDungeon = {
            floor: floorNumber,
            theme: 'dungeon',
            roomLayout: roomLayout,
            floorMap: floorMap
        };
        
        // Phase 3: Generate unified geometry (now with access to currentDungeon)
        this.generateUnifiedGeometry(floorMap, roomLayout);
        
        // Phase 4: Add lighting and atmosphere
        this.addDungeonLighting(roomLayout);
        this.addAtmosphericElements(roomLayout);
        
        // Phase 5: Add progressive portal system
        this.addProgressivePortals(roomLayout);
        
        console.log(`Unified dungeon floor ${floorNumber} generated with progressive portal system`);
        return this.currentDungeon;
    }
    
    planRoomLayout() {
        console.log('Planning room layout...');
        
        const layout = {
            rooms: {},
            connections: []
        };
        
        // Center room at origin
        layout.rooms.center = {
            id: 'center',
            type: 'center',
            gridX: Math.floor(this.gridWidth / 2),
            gridZ: Math.floor(this.gridDepth / 2),
            size: this.roomTemplates.CENTER.size
        };
        
        // Four orbital rooms in cardinal directions
        const orbitalDistance = 20; // Distance in grid cells
        const orbitals = [
            { id: 'orbital_north', dir: 'north', offsetX: 0, offsetZ: -orbitalDistance },
            { id: 'orbital_south', dir: 'south', offsetX: 0, offsetZ: orbitalDistance },
            { id: 'orbital_east', dir: 'east', offsetX: orbitalDistance, offsetZ: 0 },
            { id: 'orbital_west', dir: 'west', offsetX: -orbitalDistance, offsetZ: 0 }
        ];
        
        orbitals.forEach(orbital => {
            layout.rooms[orbital.id] = {
                id: orbital.id,
                type: 'orbital',
                direction: orbital.dir,
                gridX: layout.rooms.center.gridX + orbital.offsetX,
                gridZ: layout.rooms.center.gridZ + orbital.offsetZ,
                size: this.roomTemplates.ORBITAL.size
            };
            
            // Connect to center
            layout.connections.push({
                from: 'center',
                to: orbital.id,
                type: 'center_to_orbital'
            });
        });
        
        // Cardinal rooms (fixed positioning and bounds checking)
        const cardinalChance = Math.min(0.5 + (this.currentFloor * 0.02), 0.9); // Increased chance
        const cardinalDistance = 15; // Distance from orbital to cardinal
        
        orbitals.forEach(orbital => {
            if (Math.random() < cardinalChance) {
                const cardinalId = `cardinal_${orbital.dir}`;
                const orbitalRoom = layout.rooms[orbital.id];
                
                // Calculate cardinal room position relative to the ORBITAL room (not center)
                let cardinalGridX, cardinalGridZ;
                
                switch(orbital.dir) {
                    case 'north':
                        cardinalGridX = orbitalRoom.gridX;
                        cardinalGridZ = orbitalRoom.gridZ - cardinalDistance;
                        break;
                    case 'south':
                        cardinalGridX = orbitalRoom.gridX;
                        cardinalGridZ = orbitalRoom.gridZ + cardinalDistance;
                        break;
                    case 'east':
                        cardinalGridX = orbitalRoom.gridX + cardinalDistance;
                        cardinalGridZ = orbitalRoom.gridZ;
                        break;
                    case 'west':
                        cardinalGridX = orbitalRoom.gridX - cardinalDistance;
                        cardinalGridZ = orbitalRoom.gridZ;
                        break;
                }
                
                // Check if cardinal room position is within bounds
                const roomSize = this.roomTemplates.CARDINAL.size;
                const halfSize = Math.floor(roomSize / 2);
                const minX = cardinalGridX - halfSize;
                const maxX = cardinalGridX + halfSize;
                const minZ = cardinalGridZ - halfSize;
                const maxZ = cardinalGridZ + halfSize;
                
                // Ensure room fits within grid bounds with some margin
                if (minX >= 2 && maxX < this.gridWidth - 2 && 
                    minZ >= 2 && maxZ < this.gridDepth - 2) {
                    
                    layout.rooms[cardinalId] = {
                        id: cardinalId,
                        type: 'cardinal',
                        direction: orbital.dir,
                        gridX: cardinalGridX,
                        gridZ: cardinalGridZ,
                        size: roomSize
                    };
                    
                    // Connect to orbital
                    layout.connections.push({
                        from: orbital.id,
                        to: cardinalId,
                        type: 'orbital_to_cardinal'
                    });
                    
                    console.log(`Added cardinal room ${cardinalId} at grid (${cardinalGridX}, ${cardinalGridZ})`);
                } else {
                    console.log(`Skipped cardinal room ${cardinalId} - would be outside bounds`);
                }
            }
        });
        
        console.log(`Planned ${Object.keys(layout.rooms).length} rooms with ${layout.connections.length} connections`);
        return layout;
    }
    
    createFloorMap(roomLayout) {
        console.log('Creating unified floor map...');
        
        // Initialize grid (false = wall/solid, true = walkable)
        const floorMap = Array(this.gridDepth).fill().map(() => Array(this.gridWidth).fill(false));
        
        // Phase 1: Carve out room areas
        Object.values(roomLayout.rooms).forEach(room => {
            this.carveRoomArea(floorMap, room);
        });
        
        // Phase 2: Carve corridor paths with improved connection logic
        roomLayout.connections.forEach(connection => {
            this.carveImprovedCorridorPath(floorMap, roomLayout.rooms[connection.from], roomLayout.rooms[connection.to]);
        });
        
        console.log('Floor map created with carved rooms and corridors');
        return floorMap;
    }
    
    carveRoomArea(floorMap, room) {
        const halfSize = Math.floor(room.size / 2);
        
        for (let z = room.gridZ - halfSize; z <= room.gridZ + halfSize; z++) {
            for (let x = room.gridX - halfSize; x <= room.gridX + halfSize; x++) {
                if (this.isValidGridPos(x, z)) {
                    floorMap[z][x] = true; // Mark as walkable
                }
            }
        }
        
        console.log(`Carved ${room.type} room at grid (${room.gridX}, ${room.gridZ}) size ${room.size}`);
    }
    
    carveImprovedCorridorPath(floorMap, roomA, roomB) {
        console.log(`Carving improved corridor from ${roomA.id} to ${roomB.id}...`);
        
        // Calculate room edges for better connection points
        const roomAHalfSize = Math.floor(roomA.size / 2);
        const roomBHalfSize = Math.floor(roomB.size / 2);
        
        // Determine connection points at room edges rather than centers
        let startX = roomA.gridX;
        let startZ = roomA.gridZ;
        let endX = roomB.gridX;
        let endZ = roomB.gridZ;
        
        // Adjust start point to edge of room A
        if (endX > startX) startX += roomAHalfSize - 1; // Exit from east side
        else if (endX < startX) startX -= roomAHalfSize - 1; // Exit from west side
        
        if (endZ > startZ) startZ += roomAHalfSize - 1; // Exit from south side
        else if (endZ < startZ) startZ -= roomAHalfSize - 1; // Exit from north side
        
        // Adjust end point to edge of room B
        if (startX > endX) endX += roomBHalfSize - 1; // Enter from east side
        else if (startX < endX) endX -= roomBHalfSize - 1; // Enter from west side
        
        if (startZ > endZ) endZ += roomBHalfSize - 1; // Enter from south side
        else if (startZ < endZ) endZ -= roomBHalfSize - 1; // Enter from north side
        
        const corridorHalfWidth = Math.floor(this.corridorWidth / 2);
        
        // Create L-shaped corridor with both possible paths for redundancy
        // Path 1: Horizontal first, then vertical
        this.carveHorizontalCorridor(floorMap, startX, endX, startZ, corridorHalfWidth);
        this.carveVerticalCorridor(floorMap, endX, startZ, endZ, corridorHalfWidth);
        
        // Path 2: Vertical first, then horizontal (creates intersection for better connectivity)
        this.carveVerticalCorridor(floorMap, startX, startZ, endZ, corridorHalfWidth);
        this.carveHorizontalCorridor(floorMap, startX, endX, endZ, corridorHalfWidth);
        
        // Carve junction areas for smoother connections
        this.carveJunction(floorMap, endX, startZ, corridorHalfWidth + 1);
        this.carveJunction(floorMap, startX, endZ, corridorHalfWidth + 1);
        
        console.log(`Carved improved corridor between ${roomA.id} and ${roomB.id}`);
    }
    
    carveJunction(floorMap, centerX, centerZ, radius) {
        // Carve a circular junction area for smoother corridor intersections
        for (let z = centerZ - radius; z <= centerZ + radius; z++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (this.isValidGridPos(x, z)) {
                    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
                    if (dist <= radius) {
                        floorMap[z][x] = true;
                    }
                }
            }
        }
    }
    
    carveCorridorPath(floorMap, roomA, roomB) {
        // Improved L-shaped corridors with better connection points
        const startX = roomA.gridX;
        const startZ = roomA.gridZ;
        const endX = roomB.gridX;
        const endZ = roomB.gridZ;
        
        const corridorHalfWidth = Math.floor(this.corridorWidth / 2);
        
        console.log(`Carving corridor from ${roomA.id} (${startX},${startZ}) to ${roomB.id} (${endX},${endZ})`);
        
        // Method 1: Horizontal first, then vertical
        this.carveHorizontalCorridor(floorMap, startX, endX, startZ, corridorHalfWidth);
        this.carveVerticalCorridor(floorMap, endX, startZ, endZ, corridorHalfWidth);
        
        // Method 2: Also carve from the other direction to ensure connection
        this.carveVerticalCorridor(floorMap, startX, startZ, endZ, corridorHalfWidth);
        this.carveHorizontalCorridor(floorMap, startX, endX, endZ, corridorHalfWidth);
        
        console.log(`Carved enhanced corridor between ${roomA.id} and ${roomB.id}`);
    }
    
    carveHorizontalCorridor(floorMap, startX, endX, z, halfWidth) {
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        
        for (let x = minX; x <= maxX; x++) {
            for (let zOffset = -halfWidth; zOffset <= halfWidth; zOffset++) {
                const corridorZ = z + zOffset;
                if (this.isValidGridPos(x, corridorZ)) {
                    floorMap[corridorZ][x] = true;
                }
            }
        }
    }
    
    carveVerticalCorridor(floorMap, x, startZ, endZ, halfWidth) {
        const minZ = Math.min(startZ, endZ);
        const maxZ = Math.max(startZ, endZ);
        
        for (let z = minZ; z <= maxZ; z++) {
            for (let xOffset = -halfWidth; xOffset <= halfWidth; xOffset++) {
                const corridorX = x + xOffset;
                if (this.isValidGridPos(corridorX, z)) {
                    floorMap[z][corridorX] = true;
                }
            }
        }
    }
    
    isValidGridPos(x, z) {
        return x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth;
    }
    
    generateUnifiedGeometry(floorMap, roomLayout) {
        console.log('Generating unified geometry with themed rooms...');
        
        const dungeonGroup = new THREE.Group();
        dungeonGroup.name = 'unified_dungeon';
        
        // Generate floors with room-specific materials
        this.generateThemedFloors(dungeonGroup, floorMap, roomLayout);
        
        // Generate walls with room-specific materials
        this.generateThemedWalls(dungeonGroup, floorMap, roomLayout);
        
        // Generate ceilings with room-specific materials
        this.generateThemedCeilings(dungeonGroup, floorMap, roomLayout);
        
        this.scene.add(dungeonGroup);
        this.currentDungeonGroup = dungeonGroup;
    }
    
    getRoomTypeAtGrid(gridX, gridZ, roomLayout) {
        if (!roomLayout) {
            return 'corridor';
        }
        
        // Check each room to see if this grid position is inside it
        for (const room of Object.values(roomLayout.rooms)) {
            const halfSize = Math.floor(room.size / 2);
            if (gridX >= room.gridX - halfSize && gridX <= room.gridX + halfSize &&
                gridZ >= room.gridZ - halfSize && gridZ <= room.gridZ + halfSize) {
                return room.type; // 'center', 'orbital', or 'cardinal'
            }
        }
        
        return 'corridor'; // Default to corridor if not in any room
    }
    
    getMaterialsForRoomType(roomType) {
        switch(roomType) {
            case 'center':
                return {
                    floor: this.materials.get('byzantine_floor'),
                    wall: this.materials.get('byzantine_wall'),
                    ceiling: this.materials.get('byzantine_ceiling')
                };
            case 'orbital':
                return {
                    floor: this.materials.get('gothic_floor'),
                    wall: this.materials.get('gothic_wall'),
                    ceiling: this.materials.get('gothic_ceiling')
                };
            case 'cardinal':
                return {
                    floor: this.materials.get('celestial_floor'),
                    wall: this.materials.get('celestial_wall'),
                    ceiling: this.materials.get('celestial_ceiling')
                };
            default: // corridor
                return {
                    floor: this.materials.get('corridor_floor'),
                    wall: this.materials.get('corridor_wall'),
                    ceiling: this.materials.get('corridor_ceiling')
                };
        }
    }
    
    generateThemedFloors(dungeonGroup, floorMap, roomLayout) {
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) {
                    const roomType = this.getRoomTypeAtGrid(x, z, roomLayout);
                    const materials = this.getMaterialsForRoomType(roomType);
                    
                    const worldX = (x - this.gridWidth/2) * this.gridSize;
                    const worldZ = (z - this.gridDepth/2) * this.gridSize;
                    
                    const floorGeometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
                    const floorSegment = new THREE.Mesh(floorGeometry, materials.floor);
                    floorSegment.rotation.x = -Math.PI / 2;
                    floorSegment.position.set(worldX, this.floorHeight, worldZ);
                    floorSegment.receiveShadow = true;
                    
                    dungeonGroup.add(floorSegment);
                }
            }
        }
        
        console.log('Generated themed floor geometry');
    }
    
    generateThemedWalls(dungeonGroup, floorMap, roomLayout) {
        const wallHeight = this.ceilingHeight;
        
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) {
                    const roomType = this.getRoomTypeAtGrid(x, z, roomLayout);
                    const materials = this.getMaterialsForRoomType(roomType);
                    
                    const directions = [
                        { dx: 0, dz: -1, wallX: 0, wallZ: -this.gridSize/2, rotY: 0 },
                        { dx: 0, dz: 1, wallX: 0, wallZ: this.gridSize/2, rotY: 0 },
                        { dx: 1, dz: 0, wallX: this.gridSize/2, wallZ: 0, rotY: Math.PI/2 },
                        { dx: -1, dz: 0, wallX: -this.gridSize/2, wallZ: 0, rotY: Math.PI/2 }
                    ];
                    
                    directions.forEach(dir => {
                        const neighborX = x + dir.dx;
                        const neighborZ = z + dir.dz;
                        
                        if (!this.isValidGridPos(neighborX, neighborZ) || !floorMap[neighborZ][neighborX]) {
                            const worldX = (x - this.gridWidth/2) * this.gridSize + dir.wallX;
                            const worldZ = (z - this.gridDepth/2) * this.gridSize + dir.wallZ;
                            
                            // Add decorative elements for room walls
                            let wallGeometry;
                            if (roomType === 'center') {
                                // Byzantine arched walls
                                wallGeometry = new THREE.BoxGeometry(this.gridSize, wallHeight * 1.2, 0.5);
                            } else if (roomType === 'orbital') {
                                // Gothic pointed arch walls
                                wallGeometry = new THREE.BoxGeometry(this.gridSize, wallHeight * 1.4, 0.5);
                            } else if (roomType === 'cardinal') {
                                // Celestial rounded walls
                                wallGeometry = new THREE.BoxGeometry(this.gridSize, wallHeight * 1.1, 0.5);
                            } else {
                                // Standard corridor walls
                                wallGeometry = new THREE.BoxGeometry(this.gridSize, wallHeight, 0.5);
                            }
                            
                            const wall = new THREE.Mesh(wallGeometry, materials.wall);
                            wall.position.set(worldX, this.floorHeight + wallGeometry.parameters.height/2, worldZ);
                            wall.rotation.y = dir.rotY;
                            wall.castShadow = true;
                            wall.receiveShadow = true;
                            
                            dungeonGroup.add(wall);
                        }
                    });
                }
            }
        }
        
        console.log('Generated themed wall geometry');
    }
    
    generateThemedCeilings(dungeonGroup, floorMap, roomLayout) {
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) {
                    const roomType = this.getRoomTypeAtGrid(x, z, roomLayout);
                    const materials = this.getMaterialsForRoomType(roomType);
                    
                    const worldX = (x - this.gridWidth/2) * this.gridSize;
                    const worldZ = (z - this.gridDepth/2) * this.gridSize;
                    
                    // Variable ceiling heights based on room type
                    let ceilingHeight = this.ceilingHeight;
                    if (roomType === 'center') {
                        ceilingHeight = this.ceilingHeight * 1.2; // Byzantine dome effect
                    } else if (roomType === 'orbital') {
                        ceilingHeight = this.ceilingHeight * 1.4; // Gothic vaulted ceiling
                    } else if (roomType === 'cardinal') {
                        ceilingHeight = this.ceilingHeight * 1.1; // Celestial chapel height
                    }
                    
                    const ceilingGeometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
                    const ceilingSegment = new THREE.Mesh(ceilingGeometry, materials.ceiling);
                    ceilingSegment.rotation.x = Math.PI / 2;
                    ceilingSegment.position.set(worldX, this.floorHeight + ceilingHeight, worldZ);
                    ceilingSegment.receiveShadow = true;
                    
                    // Add stars to celestial ceilings
                    if (roomType === 'cardinal' && Math.random() < 0.3) {
                        this.addCeilingStars(dungeonGroup, worldX, worldZ, ceilingHeight);
                    }
                    
                    dungeonGroup.add(ceilingSegment);
                }
            }
        }
        
        console.log('Generated themed ceiling geometry');
    }
    
    addCeilingStars(dungeonGroup, x, z, height) {
        const starGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const starMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.8
        });
        
        for (let i = 0; i < 3; i++) {
            const star = new THREE.Mesh(starGeometry, starMaterial);
            star.position.set(
                x + (Math.random() - 0.5) * this.gridSize * 0.8,
                this.floorHeight + height - 0.1,
                z + (Math.random() - 0.5) * this.gridSize * 0.8
            );
            dungeonGroup.add(star);
        }
    }
    
    addDungeonLighting(roomLayout) {
        console.log('Adding atmospheric dungeon lighting...');
        
        // Add dimmed lighting to each room
        Object.values(roomLayout.rooms).forEach(room => {
            this.addRoomLighting(room);
        });
        
        // Add corridor lighting
        roomLayout.connections.forEach(connection => {
            this.addCorridorLighting(roomLayout.rooms[connection.from], roomLayout.rooms[connection.to]);
        });
    }
    
    addRoomLighting(room) {
        const worldX = (room.gridX - this.gridWidth/2) * this.gridSize;
        const worldZ = (room.gridZ - this.gridDepth/2) * this.gridSize;
        const roomSize = room.size * this.gridSize;
        
        // Room-type specific lighting
        if (room.type === 'center') {
            // Byzantine golden lighting
            const goldenLight = new THREE.PointLight(0xFFD700, 0.5, 60);
            goldenLight.position.set(worldX, this.floorHeight + this.ceilingHeight * 1.2 - 1, worldZ);
            this.currentDungeonGroup.add(goldenLight);
            this.lightSources.push(goldenLight);
            
            // Warm corner lights
            const cornerPositions = [
                [worldX - roomSize/3, this.floorHeight + this.ceilingHeight/2, worldZ - roomSize/3],
                [worldX + roomSize/3, this.floorHeight + this.ceilingHeight/2, worldZ - roomSize/3],
                [worldX - roomSize/3, this.floorHeight + this.ceilingHeight/2, worldZ + roomSize/3],
                [worldX + roomSize/3, this.floorHeight + this.ceilingHeight/2, worldZ + roomSize/3]
            ];
            
            cornerPositions.forEach(pos => {
                const warmLight = new THREE.PointLight(0xFFA500, 0.3, 30);
                warmLight.position.set(...pos);
                this.currentDungeonGroup.add(warmLight);
                this.lightSources.push(warmLight);
            });
            
        } else if (room.type === 'orbital') {
            // Gothic dramatic lighting with chandelier effect
            const chandelierLight = new THREE.PointLight(0xE6E6FA, 0.4, 50);
            chandelierLight.position.set(worldX, this.floorHeight + this.ceilingHeight * 1.4 - 2, worldZ);
            this.currentDungeonGroup.add(chandelierLight);
            this.lightSources.push(chandelierLight);
            
            // Cool silver accent lights
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const radius = roomSize * 0.4;
                const silverLight = new THREE.PointLight(0xC0C0C0, 0.2, 25);
                silverLight.position.set(
                    worldX + Math.cos(angle) * radius,
                    this.floorHeight + this.ceilingHeight * 0.7,
                    worldZ + Math.sin(angle) * radius
                );
                this.currentDungeonGroup.add(silverLight);
                this.lightSources.push(silverLight);
            }
            
        } else if (room.type === 'cardinal') {
            // Celestial mystical lighting
            const celestialLight = new THREE.PointLight(0x4169E1, 0.35, 45);
            celestialLight.position.set(worldX, this.floorHeight + this.ceilingHeight * 1.1 - 1, worldZ);
            this.currentDungeonGroup.add(celestialLight);
            this.lightSources.push(celestialLight);
            
            // Starlight effect
            for (let i = 0; i < 6; i++) {
                const starLight = new THREE.PointLight(0x87CEEB, 0.15, 20);
                starLight.position.set(
                    worldX + (Math.random() - 0.5) * roomSize * 0.8,
                    this.floorHeight + this.ceilingHeight * 1.1 - 0.5,
                    worldZ + (Math.random() - 0.5) * roomSize * 0.8
                );
                this.currentDungeonGroup.add(starLight);
                this.lightSources.push(starLight);
            }
        }
        
        console.log(`Added themed lighting to ${room.type} room at (${worldX}, ${worldZ})`);
    }
    
    addCorridorLighting(roomA, roomB) {
        const startWorldX = (roomA.gridX - this.gridWidth/2) * this.gridSize;
        const startWorldZ = (roomA.gridZ - this.gridDepth/2) * this.gridSize;
        const endWorldX = (roomB.gridX - this.gridWidth/2) * this.gridSize;
        const endWorldZ = (roomB.gridZ - this.gridDepth/2) * this.gridSize;
        
        // Dimmed light at corner of L-shaped corridor (reduced by 90%)
        const cornerLight = new THREE.PointLight(0xffffff, 0.25, 40); // Was 2.5, now 0.25
        cornerLight.position.set(endWorldX, this.floorHeight + 4, startWorldZ); // Corner position
        this.currentDungeonGroup.add(cornerLight);
        this.lightSources.push(cornerLight);
        
        // Additional dimmed lights along corridor path (reduced by 90%)
        const midWorldX = (startWorldX + endWorldX) / 2;
        const midWorldZ = (startWorldZ + endWorldZ) / 2;
        
        const midLight = new THREE.PointLight(0xffffff, 0.18, 25); // Was 1.8, now 0.18
        midLight.position.set(midWorldX, this.floorHeight + 3.5, midWorldZ);
        this.currentDungeonGroup.add(midLight);
        this.lightSources.push(midLight);
    }
    
    addAtmosphericElements(roomLayout) {
        console.log('Adding atmospheric elements...');
        
        Object.values(roomLayout.rooms).forEach(room => {
            this.addRoomAtmosphere(room);
        });
    }
    
    addRoomAtmosphere(room) {
        const worldX = (room.gridX - this.gridWidth/2) * this.gridSize;
        const worldZ = (room.gridZ - this.gridDepth/2) * this.gridSize;
        const roomSize = room.size * this.gridSize;
        
        // Add entry/exit portals to center room
        if (room.type === 'center') {
            this.addCenterRoomPortals(worldX, worldZ, roomSize);
        }
        
        // Add consistent atmospheric elements
        this.addDungeonAtmosphere(worldX, worldZ, roomSize, room.type);
        
        // Add floating orbs to all rooms
        this.addFloatingOrbs(worldX, worldZ, roomSize);
    }
    
    addDungeonAtmosphere(worldX, worldZ, roomSize, roomType) {
        // Consistent dungeon atmosphere - glowing pillars
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const radius = roomSize * 0.3;
            
            const pillarX = worldX + Math.cos(angle) * radius;
            const pillarZ = worldZ + Math.sin(angle) * radius;
            
            const pillarGeometry = new THREE.CylinderGeometry(0.6, 0.8, 4, 8);
            const pillarMaterial = this.materials.get('glowing_pillar').clone(); // Use glowing material
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(pillarX, this.floorHeight + 2, pillarZ);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            
            // Store reference for animated glow
            pillar.userData = {
                isPillar: true,
                glowPhase: Math.random() * Math.PI * 2, // Random starting phase
                glowSpeed: 0.5 + Math.random() * 1.0, // Random glow speed
                baseEmissiveIntensity: 0.3
            };
            
            this.currentDungeonGroup.add(pillar);
            this.glowingPillars.push(pillar);
            
            // Dimmed torch light on pillar (reduced by 90%)
            const torchLight = new THREE.PointLight(0xff6644, 0.08, 8); // Was 0.8, now 0.08
            torchLight.position.set(pillarX, this.floorHeight + 3.5, pillarZ);
            this.currentDungeonGroup.add(torchLight);
            this.lightSources.push(torchLight);
            
            // Add pillar glow light (blue-ish glow from the pillar itself)
            const pillarGlowLight = new THREE.PointLight(0x6080ff, 0.4, 10);
            pillarGlowLight.position.set(pillarX, this.floorHeight + 2, pillarZ);
            pillarGlowLight.userData = {
                isPillarGlow: true,
                pillar: pillar // Link to pillar for synchronized animation
            };
            this.currentDungeonGroup.add(pillarGlowLight);
            this.lightSources.push(pillarGlowLight);
        }
    }
    
    addProgressivePortals(roomLayout) {
        console.log('Adding progressive billboard portal system...');
        
        // Find center room position
        const centerRoom = roomLayout.rooms.center;
        const centerWorldX = (centerRoom.gridX - this.gridWidth/2) * this.gridSize;
        const centerWorldZ = (centerRoom.gridZ - this.gridDepth/2) * this.gridSize;
        const roomSize = centerRoom.size * this.gridSize;
        
        // Calculate portal positions for each direction (in the hallways leading to orbital rooms)
        const portalDistance = roomSize * 0.6; // Further from center, in the hallways
        const portalPositions = {
            // Only add portals for rooms that should be locked initially
            east: { x: centerWorldX + portalDistance, z: centerWorldZ, rotation: Math.PI/2 },
            west: { x: centerWorldX - portalDistance, z: centerWorldZ, rotation: -Math.PI/2 },
            south: { x: centerWorldX, z: centerWorldZ + portalDistance, rotation: Math.PI }
            // Note: No north portal since north is always unlocked
        };
        
        // Add room entrance portals (initially blocked except north)
        Object.entries(portalPositions).forEach(([direction, pos]) => {
            const isUnlocked = this.roomProgression[direction].unlocked;
            const portal = this.createBillboardPortal(direction, isUnlocked);
            portal.position.set(pos.x, this.floorHeight + 3, pos.z); // Higher up, in the hallway
            portal.name = `${direction}_room_portal`;
            this.currentDungeonGroup.add(portal);
            
            console.log(`Added ${direction} room portal at (${pos.x}, ${pos.z}) - ${isUnlocked ? 'UNLOCKED' : 'LOCKED'}`);
        });
    }
    
    createBillboardPortal(direction, isUnlocked) {
        const portalGroup = new THREE.Group();
        
        // Create simple geometric mask with opacity-based state
        const mask = this.createGeometricMask(isUnlocked);
        portalGroup.add(mask);
        
        // Add particle effects around the portal
        this.addPortalParticleEffects(portalGroup, isUnlocked);
        
        // Add portal data
        portalGroup.userData = {
            portalType: `room_entrance_${direction}`,
            direction: direction,
            isBlocking: !isUnlocked,
            originalY: this.floorHeight + 3,
            pulseSpeed: 0.5 + Math.random() * 0.5,
            pulseAmount: 0.1,
            maskMesh: mask // Store reference to the mask for opacity changes
        };
        
        console.log(`Created geometric portal for ${direction}, unlocked: ${isUnlocked}`);
        
        return portalGroup;
    }
    
    createGeometricMask(isUnlocked) {
        const maskGroup = new THREE.Group();
        
        // Main mask face (oval) - MADE LARGER
        const faceGeometry = new THREE.SphereGeometry(3, 16, 12); // Increased from 2 to 3
        faceGeometry.scale(1, 1.2, 0.3); // Make it more mask-like
        
        // Use a neutral dark color for the mask face with slight emissive glow
        const faceColor = 0x4a4a4a; // Slightly lighter gray for better visibility
        const faceOpacity = isUnlocked ? 0.2 : 0.95; // Transparent when unlocked, solid when locked
        
        const faceMaterial = new THREE.MeshLambertMaterial({ 
            color: faceColor,
            transparent: true,
            opacity: faceOpacity,
            emissive: faceColor,
            emissiveIntensity: 0.2 // Slight self-illumination so it's always visible
        });
        
        const face = new THREE.Mesh(faceGeometry, faceMaterial);
        maskGroup.add(face);
        
        // Add front-facing light to illuminate the mask
        const maskLight = new THREE.PointLight(0xffffff, 0.1, 8); // Dimmed by 90% (was 1.0, now 0.1)
        maskLight.position.set(0, 0, 4); // Position in front of the mask
        maskGroup.add(maskLight);
        
        // Eye sockets (black holes) - MADE LARGER
        const eyeGeometry = new THREE.SphereGeometry(0.45, 8, 8); // Increased from 0.3 to 0.45
        const eyeOpacity = isUnlocked ? 0.1 : 1.0;
        const eyeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: eyeOpacity
        });
        
        // Left eye socket
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.9, 0.45, 0.3); // Adjusted positions for larger scale
        leftEye.scale.set(1, 1.3, 0.8);
        maskGroup.add(leftEye);
        
        // Right eye socket  
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.9, 0.45, 0.3); // Adjusted positions for larger scale
        rightEye.scale.set(0.8, 1.1, 0.8);
        maskGroup.add(rightEye);
        
        // Glowing eyes - with opacity-based intensity - BRIGHTER
        const eyeColor = 0xaaaaff; // Neutral blue-white glow
        const eyeGlowGeometry = new THREE.SphereGeometry(0.25, 8, 8); // Increased from 0.15 to 0.25
        const eyeGlowOpacity = isUnlocked ? 0.3 : 1.0; // More visible when unlocked
        const eyeGlowMaterial = new THREE.MeshBasicMaterial({ 
            color: eyeColor,
            transparent: true,
            opacity: eyeGlowOpacity,
            emissive: eyeColor,
            emissiveIntensity: isUnlocked ? 0.5 : 1.5, // Brighter overall
            blending: THREE.AdditiveBlending // Makes the glow more prominent
        });
        
        // Left glowing eye
        const leftGlow = new THREE.Mesh(eyeGlowGeometry, eyeGlowMaterial);
        leftGlow.position.set(-0.9, 0.45, 0.35);
        maskGroup.add(leftGlow);
        
        // Right glowing eye
        const rightGlow = new THREE.Mesh(eyeGlowGeometry, eyeGlowMaterial.clone());
        rightGlow.position.set(0.9, 0.45, 0.35);
        rightGlow.scale.set(0.8, 0.8, 0.8);
        maskGroup.add(rightGlow);
        
        // Mouth (dark opening) - MADE LARGER
        const mouthGeometry = new THREE.SphereGeometry(0.6, 8, 8); // Increased from 0.4 to 0.6
        mouthGeometry.scale(1, 0.5, 0.8);
        const mouthOpacity = isUnlocked ? 0.1 : 1.0;
        const mouthMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: mouthOpacity
        });
        
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, -0.75, 0.2); // Adjusted for larger scale
        maskGroup.add(mouth);
        
        // Add some teeth - MADE LARGER AND BRIGHTER
        const toothGeometry = new THREE.BoxGeometry(0.08, 0.3, 0.08); // Increased size
        const toothOpacity = isUnlocked ? 0.3 : 0.95; // More visible
        const toothMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFACD,
            transparent: true,
            opacity: toothOpacity,
            emissive: 0xFFFACD,
            emissiveIntensity: 0.1 // Slight glow for visibility
        });
        
        for (let i = 0; i < 4; i++) {
            const tooth = new THREE.Mesh(toothGeometry, toothMaterial.clone());
            tooth.position.set(-0.22 + i * 0.15, -0.6, 0.3); // Adjusted for larger scale
            maskGroup.add(tooth);
        }
        
        // Add cracks/weathering marks - MADE LARGER
        const crackGeometry = new THREE.BoxGeometry(0.03, 1.2, 0.03); // Increased size
        const crackOpacity = isUnlocked ? 0.1 : 0.8;
        const crackMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x2a1a1a,
            transparent: true,
            opacity: crackOpacity
        });
        
        const crack1 = new THREE.Mesh(crackGeometry, crackMaterial);
        crack1.position.set(-1.2, 0, 0.35); // Adjusted for larger scale
        crack1.rotation.z = Math.PI / 6;
        maskGroup.add(crack1);
        
        const crack2 = new THREE.Mesh(crackGeometry, crackMaterial.clone());
        crack2.position.set(1.05, -0.45, 0.35); // Adjusted for larger scale
        crack2.rotation.z = -Math.PI / 4;
        crack2.scale.set(1, 0.6, 1);
        maskGroup.add(crack2);
        
        // Store references for opacity changes
        maskGroup.userData = {
            face: face,
            leftEye: leftEye,
            rightEye: rightEye,
            leftGlow: leftGlow,
            rightGlow: rightGlow,
            mouth: mouth,
            teeth: maskGroup.children.filter(child => child.geometry === toothGeometry),
            cracks: [crack1, crack2],
            isUnlocked: isUnlocked
        };
        
        return maskGroup;
    }
    
    addPortalParticleEffects(portalGroup, isUnlocked) {
        const particleCount = 12;
        const particleColor = 0x8888ff; // Neutral blue color for particles
        const particleOpacity = isUnlocked ? 0.2 : 0.7;
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 6, 6);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: particleColor,
                transparent: true,
                opacity: particleOpacity,
                emissive: particleColor,
                emissiveIntensity: isUnlocked ? 0.1 : 0.5
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position particles in a circle around the portal
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 3;
            particle.position.set(
                Math.cos(angle) * radius,
                -1 + Math.random() * 2,
                Math.sin(angle) * radius
            );
            
            // Add animation data
            particle.userData = {
                originalAngle: angle,
                originalRadius: radius,
                swirSpeed: 0.5 + Math.random() * 0.5,
                bobSpeed: 0.8 + Math.random() * 0.4,
                bobAmount: 0.3,
                particleMaterial: particleMaterial // Store reference for opacity updates
            };
            
            portalGroup.add(particle);
        }
    }
    
    addCenterRoomPortals(worldX, worldZ, roomSize) {
        console.log('Center room ready - entry/exit portals will be handled separately...');
        
        // For now, we're not adding entry/exit portals here
        // They will be added later when the system is refined
        // This just ensures the center room atmosphere is set up
    }
    
    updateRoomPortals(direction, shouldOpen) {
        if (!this.currentDungeonGroup) return;
        
        console.log(`Updating ${direction} portal to ${shouldOpen ? 'OPEN' : 'CLOSED'}`);
        
        this.currentDungeonGroup.traverse((child) => {
            if (child.userData.direction === direction) {
                console.log(`Found portal for ${direction}, updating...`);
                
                child.userData.isBlocking = !shouldOpen;
                
                // Update geometric mask opacity
                if (child.userData.maskMesh && child.userData.maskMesh.userData) {
                    const maskData = child.userData.maskMesh.userData;
                    
                    try {
                        // Update face opacity and emissive
                        const newOpacity = shouldOpen ? 0.2 : 0.95;
                        if (maskData.face && maskData.face.material) {
                            maskData.face.material.opacity = newOpacity;
                            maskData.face.material.emissiveIntensity = 0.2; // Keep slight glow
                        }
                        
                        // Update eye socket opacity
                        const eyeOpacity = shouldOpen ? 0.1 : 1.0;
                        if (maskData.leftEye && maskData.leftEye.material) {
                            maskData.leftEye.material.opacity = eyeOpacity;
                        }
                        if (maskData.rightEye && maskData.rightEye.material) {
                            maskData.rightEye.material.opacity = eyeOpacity;
                        }
                        
                        // Update eye glow opacity and intensity
                        const glowOpacity = shouldOpen ? 0.3 : 1.0; // More visible when unlocked
                        const glowIntensity = shouldOpen ? 0.5 : 1.5; // Brighter overall
                        if (maskData.leftGlow && maskData.leftGlow.material) {
                            maskData.leftGlow.material.opacity = glowOpacity;
                            maskData.leftGlow.material.emissiveIntensity = glowIntensity;
                        }
                        if (maskData.rightGlow && maskData.rightGlow.material) {
                            maskData.rightGlow.material.opacity = glowOpacity;
                            maskData.rightGlow.material.emissiveIntensity = glowIntensity;
                        }
                        
                        // Update mouth opacity
                        const mouthOpacity = shouldOpen ? 0.1 : 1.0;
                        if (maskData.mouth && maskData.mouth.material) {
                            maskData.mouth.material.opacity = mouthOpacity;
                        }
                        
                        // Update teeth opacity
                        const toothOpacity = shouldOpen ? 0.3 : 0.95; // More visible
                        if (maskData.teeth && maskData.teeth.length > 0) {
                            maskData.teeth.forEach(tooth => {
                                if (tooth.material) {
                                    tooth.material.opacity = toothOpacity;
                                    tooth.material.emissiveIntensity = 0.1; // Keep slight glow
                                }
                            });
                        }
                        
                        // Update cracks opacity
                        const crackOpacity = shouldOpen ? 0.1 : 0.8;
                        if (maskData.cracks && maskData.cracks.length > 0) {
                            maskData.cracks.forEach(crack => {
                                if (crack.material) {
                                    crack.material.opacity = crackOpacity;
                                }
                            });
                        }
                        
                        maskData.isUnlocked = shouldOpen;
                        console.log(`Updated mask opacity for ${direction}`);
                    } catch (error) {
                        console.error('Error updating mask opacity:', error);
                    }
                } else {
                    console.warn(`No maskMesh found for ${direction} portal`);
                }
                
                // Update particle opacity
                child.traverse((subChild) => {
                    if (subChild.userData.particleMaterial) {
                        try {
                            const newParticleOpacity = shouldOpen ? 0.2 : 0.7;
                            const newParticleIntensity = shouldOpen ? 0.1 : 0.5;
                            subChild.userData.particleMaterial.opacity = newParticleOpacity;
                            subChild.userData.particleMaterial.emissiveIntensity = newParticleIntensity;
                        } catch (error) {
                            console.error('Error updating particle opacity:', error);
                        }
                    }
                });
                
                console.log(`${direction} room portal ${shouldOpen ? 'opened (transparent)' : 'closed (solid)'}`);
            }
        });
    }
    
    // For testing - cycles through the progression
    testProgressionAdvance() {
        console.log('Testing progression advance...');
        
        try {
            if (this.currentProgressionIndex < this.progressionOrder.length) {
                const currentRoom = this.progressionOrder[this.currentProgressionIndex];
                console.log(`Defeating enemies in ${currentRoom} room...`);
                
                this.defeatEnemiesInRoom(currentRoom);
            } else {
                console.log('All rooms already completed!');
            }
        } catch (error) {
            console.error('Error in progression advance:', error);
        }
    }
    
    openExitPortal() {
        console.log('All rooms completed - adding exit portal!');
        
        // Find center room
        if (this.currentDungeon && this.currentDungeon.roomLayout.rooms.center) {
            const centerRoom = this.currentDungeon.roomLayout.rooms.center;
            const centerWorldX = (centerRoom.gridX - this.gridWidth/2) * this.gridSize;
            const centerWorldZ = (centerRoom.gridZ - this.gridDepth/2) * this.gridSize;
            const roomSize = centerRoom.size * this.gridSize;
            
            // Create and add exit portal using geometric approach - always transparent/passable
            const exitPortal = this.createBillboardPortal('exit', true);
            exitPortal.position.set(centerWorldX, this.floorHeight + 3, centerWorldZ + roomSize * 0.3);
            exitPortal.name = 'exit_portal';
            exitPortal.userData.isBlocking = false; // Exit is immediately usable
            exitPortal.userData.portalType = 'exit';
            exitPortal.userData.direction = 'exit';
            
            // Make exit portal extra transparent/ghostly
            if (exitPortal.userData.maskMesh && exitPortal.userData.maskMesh.userData) {
                const maskData = exitPortal.userData.maskMesh.userData;
                
                // Make it even more transparent than regular unlocked portals
                if (maskData.face && maskData.face.material) {
                    maskData.face.material.opacity = 0.1;
                    maskData.face.material.color.setHex(0x88ff88); // Greenish tint for exit
                }
                
                if (maskData.leftGlow && maskData.leftGlow.material) {
                    maskData.leftGlow.material.color.setHex(0x00ff00);
                    maskData.leftGlow.material.emissive.setHex(0x00ff00);
                }
                if (maskData.rightGlow && maskData.rightGlow.material) {
                    maskData.rightGlow.material.color.setHex(0x00ff00);
                    maskData.rightGlow.material.emissive.setHex(0x00ff00);
                }
            }
            
            this.currentDungeonGroup.add(exitPortal);
            console.log('Exit portal added and opened with transparent geometric design!');
        }
    }
    
    addFloatingOrbs(worldX, worldZ, roomSize) {
        const numOrbs = 2 + Math.floor(Math.random() * 3);
        const orbColor = 0xffaa44; // Consistent golden color
        
        for (let i = 0; i < numOrbs; i++) {
            const orbGeometry = new THREE.SphereGeometry(0.15, 12, 8);
            const orbMaterial = new THREE.MeshBasicMaterial({
                color: orbColor,
                transparent: true,
                opacity: 0.8,
                emissive: orbColor,
                emissiveIntensity: 0.5
            });
            
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);
            orb.position.set(
                worldX + (Math.random() - 0.5) * roomSize * 0.6,
                this.floorHeight + 4 + Math.random() * 2,
                worldZ + (Math.random() - 0.5) * roomSize * 0.6
            );
            
            // Add floating animation
            orb.userData = {
                originalY: orb.position.y,
                floatSpeed: 0.5 + Math.random() * 1.5,
                floatAmount: 0.3 + Math.random() * 0.4
            };
            
            this.currentDungeonGroup.add(orb);
            
            // Dimmed orb light (reduced by 90%)
            const orbLight = new THREE.PointLight(orbColor, 0.03, 5); // Was 0.3, now 0.03
            orbLight.position.copy(orb.position);
            this.currentDungeonGroup.add(orbLight);
            this.lightSources.push(orbLight);
        }
    }
    
    update(deltaTime) {
        // Update floating orbs and animated elements
        if (this.currentDungeonGroup) {
            this.currentDungeonGroup.traverse((child) => {
                if (child.userData.floatSpeed && child.userData.originalY !== undefined) {
                    child.position.y = child.userData.originalY + 
                        Math.sin(Date.now() * 0.001 * child.userData.floatSpeed) * child.userData.floatAmount;
                }
                
                // Rotate constellation stars
                if (child.userData.rotationSpeed) {
                    child.rotation.x += child.userData.rotationSpeed;
                    child.rotation.y += child.userData.rotationSpeed * 1.5;
                }
                
                // Update geometric portal animations
                if (child.userData.portalType && child.userData.portalType.includes('room_entrance')) {
                    this.updateBillboardPortalAnimations(child, deltaTime);
                }
                
                // Update portal particles
                if (child.userData.swirSpeed !== undefined) {
                    this.updatePortalParticles(child, deltaTime);
                }
                
                // RE-ENABLED: Make mask faces lock onto player
                if (child.userData.maskMesh && window.game && window.game.camera) {
                    child.userData.maskMesh.lookAt(window.game.camera.position);
                }
            });
        }
        
        // Update glowing pillars with room-specific effects
        this.glowingPillars.forEach(pillar => {
            if (pillar && pillar.userData.isPillar) {
                const time = Date.now() * 0.001;
                const glowIntensity = pillar.userData.baseEmissiveIntensity + 
                    Math.sin(time * pillar.userData.glowSpeed + pillar.userData.glowPhase) * 0.2;
                
                if (pillar.material) {
                    pillar.material.emissiveIntensity = Math.max(0.1, glowIntensity);
                }
                
                // Rotate crystal pillars
                if (pillar.userData.rotation) {
                    pillar.rotation.y += pillar.userData.rotation;
                }
            }
        });
        
        // Animate light intensities with more subtle flicker in dark dungeon
        this.lightSources.forEach(light => {
            if (light.userData.originalIntensity === undefined) {
                light.userData.originalIntensity = light.intensity;
                light.userData.flickerSpeed = 0.5 + Math.random() * 2;
            }
            
            // More subtle flicker for atmospheric effect
            const flicker = Math.sin(Date.now() * 0.001 * light.userData.flickerSpeed) * 0.05 + 1;
            light.intensity = light.userData.originalIntensity * flicker;
            
            // Sync pillar glow lights with their pillars
            if (light.userData.isPillarGlow && light.userData.pillar) {
                const pillar = light.userData.pillar;
                if (pillar.material) {
                    // Sync light intensity with pillar glow
                    light.intensity = light.userData.originalIntensity * (pillar.material.emissiveIntensity / pillar.userData.baseEmissiveIntensity);
                }
            }
        });
    }
    
    updateBillboardPortalAnimations(portalGroup, deltaTime) {
        const time = Date.now() * 0.001;
        
        // Gentle breathing/pulsing animation
        const pulseScale = 1 + Math.sin(time * portalGroup.userData.pulseSpeed) * portalGroup.userData.pulseAmount;
        
        // Apply pulse to the mask mesh specifically
        if (portalGroup.userData.maskMesh) {
            portalGroup.userData.maskMesh.scale.setScalar(pulseScale);
        }
        
        // Very subtle floating motion - keep it within bounds
        const originalY = portalGroup.userData.originalY;
        const floatOffset = Math.sin(time * 0.6) * 0.2; // Only 0.2 units up/down
        portalGroup.position.y = originalY + floatOffset;
        
        // Update particle effects around portal
        portalGroup.traverse((child) => {
            if (child.userData.swirSpeed !== undefined) {
                this.updatePortalParticles(child, deltaTime);
            }
        });
        
        // Subtle eye glow pulsing - only if mask data exists
        if (portalGroup.userData.maskMesh && portalGroup.userData.maskMesh.userData) {
            const maskData = portalGroup.userData.maskMesh.userData;
            const baseIntensity = maskData.isUnlocked ? 0.2 : 1.2;
            const glowIntensity = baseIntensity + Math.sin(time * 3) * 0.3;
            
            if (maskData.leftGlow && maskData.leftGlow.material) {
                maskData.leftGlow.material.emissiveIntensity = glowIntensity;
            }
            if (maskData.rightGlow && maskData.rightGlow.material) {
                maskData.rightGlow.material.emissiveIntensity = glowIntensity;
            }
        }
    }
    
    updatePortalParticles(particle, deltaTime) {
        const time = Date.now() * 0.001;
        
        // Swirling motion around portal
        if (particle.userData.originalAngle !== undefined) {
            particle.userData.originalAngle += particle.userData.swirSpeed * deltaTime;
            const angle = particle.userData.originalAngle;
            const radius = particle.userData.originalRadius || 3;
            
            particle.position.x = Math.cos(angle) * radius;
            particle.position.z = Math.sin(angle) * radius;
            
            // Gentle bobbing motion
            particle.position.y += Math.sin(time * particle.userData.bobSpeed) * particle.userData.bobAmount * deltaTime;
        }
    }
    
    clearCurrentDungeon() {
        if (this.currentDungeonGroup) {
            this.scene.remove(this.currentDungeonGroup);
        }
        
        this.lightSources.length = 0;
        this.billboardSprites.length = 0;
        this.glowingPillars.length = 0;
        this.currentFloorMap = null;
        
        console.log('Previous dungeon cleared');
    }
    
    // Portal Management Methods (for testing - will be replaced by enemy system)
    togglePortals() {
        // Test the progression system
        this.testProgressionAdvance();
    }
    
    getRoomAt(position) {
        if (!this.currentDungeon) return null;
        
        // Convert world position to grid position
        const gridX = Math.floor((position.x + this.dungeonWidth/2) / this.gridSize);
        const gridZ = Math.floor((position.z + this.dungeonDepth/2) / this.gridSize);
        
        // Find which room contains this grid position
        for (const room of Object.values(this.currentDungeon.roomLayout.rooms)) {
            const halfSize = Math.floor(room.size / 2);
            if (gridX >= room.gridX - halfSize && gridX <= room.gridX + halfSize &&
                gridZ >= room.gridZ - halfSize && gridZ <= room.gridZ + halfSize) {
                return room;
            }
        }
        
        return null;
    }
}

// Make DungeonSystem available globally
window.DungeonSystem = DungeonSystem;
