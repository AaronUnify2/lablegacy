// Gothic Cathedral Dungeon Generation System
// Inspired by sacred architecture with deep blues, golds, and soaring spaces

class DungeonSystem {
    constructor(scene, player) {
        console.log('Initializing Gothic Cathedral Dungeon System...');
        
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
            CENTER: { size: 13, type: 'center' },    // 26x26 units - Main cathedral nave
            ORBITAL: { size: 10, type: 'orbital' },  // 20x20 units - Side chapels
            CARDINAL: { size: 12, type: 'cardinal' } // 24x24 units - Transepts
        };
        
        // Corridor width in grid cells
        this.corridorWidth = 3; // Gothic cloister corridors
        
        // Collision and height data
        this.floorHeight = 0; // Base floor height
        this.ceilingHeight = 12; // Much taller for cathedral effect
        this.currentFloorMap = null; // For collision detection
        
        // Materials and lighting (gothic cathedral theme)
        this.materials = new Map();
        this.lightSources = [];
        this.billboardSprites = [];
        this.glowingPillars = []; // Track pillars for glow animation
        this.architecturalElements = []; // Track gothic elements
        
        // Initialize synchronously now
        this.init();
    }
    
    init() {
        this.setupGothicMaterials();
        this.setupBillboardSystem();
        
        // Connect player to this dungeon system for collision detection
        if (this.player) {
            this.player.setDungeonSystem(this);
        }
        
        console.log('Gothic Cathedral Dungeon System initialized');
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
        
        // Variable ceiling heights for cathedral effect
        const room = this.getRoomAt({x: worldX, z: worldZ});
        if (room) {
            if (room.type === 'center') {
                return this.floorHeight + this.ceilingHeight * 1.5; // Soaring nave
            } else if (room.type === 'cardinal') {
                return this.floorHeight + this.ceilingHeight * 1.3; // High transepts
            } else if (room.type === 'orbital') {
                return this.floorHeight + this.ceilingHeight * 1.1; // Chapel vaults
            }
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
    
    setupGothicMaterials() {
        console.log('Setting up Gothic Cathedral materials...');
        
        // Gothic cathedral color palette inspired by the image
        this.createCathedralMaterials();
        
        console.log(`Gothic materials setup complete. Created ${this.materials.size} cathedral materials.`);
        console.log('Material types:', Array.from(this.materials.keys()));
    }
    
    createCathedralMaterials() {
        console.log('Creating Gothic Cathedral materials...');
        
        // MAIN CATHEDRAL NAVE (Center Room) - Deep blues with gold accents
        const naveFloor = new THREE.MeshLambertMaterial({ 
            color: 0x2C3E50  // Dark blue-grey stone floor
        });
        this.materials.set('nave_floor', naveFloor);
        
        const naveWall = new THREE.MeshLambertMaterial({ 
            color: 0x34495E  // Sophisticated blue-grey walls
        });
        this.materials.set('nave_wall', naveWall);
        
        const naveCeiling = new THREE.MeshLambertMaterial({ 
            color: 0x1B2631  // Darker blue for vaulted ceiling
        });
        this.materials.set('nave_ceiling', naveCeiling);
        
        // SIDE CHAPELS (Orbital Rooms) - Warmer stone tones
        const chapelFloor = new THREE.MeshLambertMaterial({ 
            color: 0x5D4E37  // Warm brown stone
        });
        this.materials.set('chapel_floor', chapelFloor);
        
        const chapelWall = new THREE.MeshLambertMaterial({ 
            color: 0x6B5B73  // Muted purple-grey
        });
        this.materials.set('chapel_wall', chapelWall);
        
        const chapelCeiling = new THREE.MeshLambertMaterial({ 
            color: 0x483D54  // Darker purple for intimate ceiling
        });
        this.materials.set('chapel_ceiling', chapelCeiling);
        
        // TRANSEPTS (Cardinal Rooms) - Celestial blue tones
        const transeptFloor = new THREE.MeshLambertMaterial({ 
            color: 0x1F3A93  // Deep royal blue
        });
        this.materials.set('transept_floor', transeptFloor);
        
        const transeptWall = new THREE.MeshLambertMaterial({ 
            color: 0x2E4BC6  // Rich blue walls
        });
        this.materials.set('transept_wall', transeptWall);
        
        const transeptCeiling = new THREE.MeshLambertMaterial({ 
            color: 0x1A237E  // Deep navy ceiling
        });
        this.materials.set('transept_ceiling', transeptCeiling);
        
        // CLOISTERS (Corridors) - Connecting walkways
        const cloisterFloor = new THREE.MeshLambertMaterial({ 
            color: 0x566573  // Medium grey stone
        });
        this.materials.set('cloister_floor', cloisterFloor);
        
        const cloisterWall = new THREE.MeshLambertMaterial({ 
            color: 0x626567  // Slightly lighter grey
        });
        this.materials.set('cloister_wall', cloisterWall);
        
        const cloisterCeiling = new THREE.MeshLambertMaterial({ 
            color: 0x455A64  // Darker grey ceiling
        });
        this.materials.set('cloister_ceiling', cloisterCeiling);
        
        // ARCHITECTURAL ELEMENTS - Gothic details
        const goldAccent = new THREE.MeshLambertMaterial({
            color: 0xD4AF37,  // Rich gold
            emissive: 0xD4AF37,
            emissiveIntensity: 0.2
        });
        this.materials.set('gold_accent', goldAccent);
        
        const silverAccent = new THREE.MeshLambertMaterial({
            color: 0xC0C0C0,  // Silver
            emissive: 0xC0C0C0,
            emissiveIntensity: 0.15
        });
        this.materials.set('silver_accent', silverAccent);
        
        const bronzeAccent = new THREE.MeshLambertMaterial({
            color: 0xCD7F32,  // Bronze
            emissive: 0xCD7F32,
            emissiveIntensity: 0.1
        });
        this.materials.set('bronze_accent', bronzeAccent);
        
        // STAINED GLASS COLORS - For window effects
        const stainedRed = new THREE.MeshBasicMaterial({
            color: 0xDC143C,
            transparent: true,
            opacity: 0.8,
            emissive: 0xDC143C,
            emissiveIntensity: 0.5
        });
        this.materials.set('stained_red', stainedRed);
        
        const stainedBlue = new THREE.MeshBasicMaterial({
            color: 0x0047AB,
            transparent: true,
            opacity: 0.8,
            emissive: 0x0047AB,
            emissiveIntensity: 0.5
        });
        this.materials.set('stained_blue', stainedBlue);
        
        const stainedGold = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.8,
            emissive: 0xFFD700,
            emissiveIntensity: 0.5
        });
        this.materials.set('stained_gold', stainedGold);
        
        const stainedPurple = new THREE.MeshBasicMaterial({
            color: 0x6A0DAD,
            transparent: true,
            opacity: 0.8,
            emissive: 0x6A0DAD,
            emissiveIntensity: 0.5
        });
        this.materials.set('stained_purple', stainedPurple);
        
        console.log(`Created ${this.materials.size} Gothic Cathedral materials!`);
    }
    
    setupBillboardSystem() {
        this.billboardGeometry = new THREE.PlaneGeometry(1, 1);
        this.createBillboardMaterials();
    }
    
    createBillboardMaterials() {
        // Sacred atmospheric elements
        const candleFlame = new THREE.MeshBasicMaterial({ 
            color: 0xFFE135, 
            transparent: true, 
            opacity: 0.8, 
            side: THREE.DoubleSide, 
            blending: THREE.AdditiveBlending,
            emissive: 0xFFE135,
            emissiveIntensity: 0.6
        });
        
        this.materials.set('candle_flame', candleFlame);
        
        const incenseSmoke = new THREE.MeshBasicMaterial({ 
            color: 0xF8F8FF, 
            transparent: true, 
            opacity: 0.4, 
            side: THREE.DoubleSide
        });
        
        this.materials.set('incense_smoke', incenseSmoke);
    }
    
    getCurrentTheme() {
        return 'gothic_cathedral';
    }
    
    generateDungeon(floorNumber) {
        console.log(`Generating Gothic Cathedral for floor ${floorNumber}...`);
        
        this.currentFloor = floorNumber;
        this.clearCurrentDungeon();
        
        // Reset progression for new floor
        this.resetProgression();
        
        console.log('Using Gothic Cathedral theme');
        
        // Phase 1: Plan room layout
        const roomLayout = this.planRoomLayout();
        
        // Phase 2: Create unified floor map
        const floorMap = this.createFloorMap(roomLayout);
        
        // Store floor map for collision detection
        this.currentFloorMap = floorMap;
        
        // Store dungeon data BEFORE generating geometry so it's available for room type checks
        this.currentDungeon = {
            floor: floorNumber,
            theme: 'gothic_cathedral',
            roomLayout: roomLayout,
            floorMap: floorMap
        };
        
        // Generate cathedral with short delay for atmosphere
        setTimeout(() => {
            try {
                // Phase 3: Generate Gothic architecture
                this.generateGothicArchitecture(floorMap, roomLayout);
                
                // Phase 4: Add cathedral lighting and atmosphere
                this.addCathedralLighting(roomLayout);
                this.addSacredAtmosphere(roomLayout);
                
                // Phase 5: Add progressive portal system
                this.addProgressivePortals(roomLayout);
                
                console.log(`Gothic Cathedral floor ${floorNumber} generated successfully!`);
            } catch (error) {
                console.error('Failed to generate cathedral:', error);
                // Try again after a short delay
                setTimeout(() => {
                    try {
                        this.generateGothicArchitecture(floorMap, roomLayout);
                        this.addCathedralLighting(roomLayout);
                        this.addSacredAtmosphere(roomLayout);
                        this.addProgressivePortals(roomLayout);
                        console.log(`Gothic Cathedral floor ${floorNumber} generated successfully on retry`);
                    } catch (retryError) {
                        console.error('Failed to generate cathedral on retry:', retryError);
                    }
                }, 500);
            }
        }, 200);
        
        return this.currentDungeon;
    }
    
    planRoomLayout() {
        console.log('Planning cathedral layout...');
        
        const layout = {
            rooms: {},
            connections: []
        };
        
        // Central nave at origin
        layout.rooms.center = {
            id: 'center',
            type: 'center',
            gridX: Math.floor(this.gridWidth / 2),
            gridZ: Math.floor(this.gridDepth / 2),
            size: this.roomTemplates.CENTER.size
        };
        
        // Four side chapels in cardinal directions
        const chapelDistance = 20; // Distance in grid cells
        const chapels = [
            { id: 'chapel_north', dir: 'north', offsetX: 0, offsetZ: -chapelDistance },
            { id: 'chapel_south', dir: 'south', offsetX: 0, offsetZ: chapelDistance },
            { id: 'chapel_east', dir: 'east', offsetX: chapelDistance, offsetZ: 0 },
            { id: 'chapel_west', dir: 'west', offsetX: -chapelDistance, offsetZ: 0 }
        ];
        
        chapels.forEach(chapel => {
            layout.rooms[chapel.id] = {
                id: chapel.id,
                type: 'orbital',
                direction: chapel.dir,
                gridX: layout.rooms.center.gridX + chapel.offsetX,
                gridZ: layout.rooms.center.gridZ + chapel.offsetZ,
                size: this.roomTemplates.ORBITAL.size
            };
            
            // Connect to center nave
            layout.connections.push({
                from: 'center',
                to: chapel.id,
                type: 'nave_to_chapel'
            });
        });
        
        // Transepts (cardinal rooms) extending from chapels
        const transeptChance = Math.min(0.6 + (this.currentFloor * 0.02), 0.95);
        const transeptDistance = 15;
        
        chapels.forEach(chapel => {
            if (Math.random() < transeptChance) {
                const transeptId = `transept_${chapel.dir}`;
                const chapelRoom = layout.rooms[chapel.id];
                
                // Calculate transept position relative to the chapel
                let transeptGridX, transeptGridZ;
                
                switch(chapel.dir) {
                    case 'north':
                        transeptGridX = chapelRoom.gridX;
                        transeptGridZ = chapelRoom.gridZ - transeptDistance;
                        break;
                    case 'south':
                        transeptGridX = chapelRoom.gridX;
                        transeptGridZ = chapelRoom.gridZ + transeptDistance;
                        break;
                    case 'east':
                        transeptGridX = chapelRoom.gridX + transeptDistance;
                        transeptGridZ = chapelRoom.gridZ;
                        break;
                    case 'west':
                        transeptGridX = chapelRoom.gridX - transeptDistance;
                        transeptGridZ = chapelRoom.gridZ;
                        break;
                }
                
                // Check bounds
                const roomSize = this.roomTemplates.CARDINAL.size;
                const halfSize = Math.floor(roomSize / 2);
                const minX = transeptGridX - halfSize;
                const maxX = transeptGridX + halfSize;
                const minZ = transeptGridZ - halfSize;
                const maxZ = transeptGridZ + halfSize;
                
                if (minX >= 2 && maxX < this.gridWidth - 2 && 
                    minZ >= 2 && maxZ < this.gridDepth - 2) {
                    
                    layout.rooms[transeptId] = {
                        id: transeptId,
                        type: 'cardinal',
                        direction: chapel.dir,
                        gridX: transeptGridX,
                        gridZ: transeptGridZ,
                        size: roomSize
                    };
                    
                    // Connect to chapel
                    layout.connections.push({
                        from: chapel.id,
                        to: transeptId,
                        type: 'chapel_to_transept'
                    });
                    
                    console.log(`Added transept ${transeptId} at grid (${transeptGridX}, ${transeptGridZ})`);
                } else {
                    console.log(`Skipped transept ${transeptId} - would be outside bounds`);
                }
            }
        });
        
        console.log(`Planned cathedral with ${Object.keys(layout.rooms).length} rooms and ${layout.connections.length} connections`);
        return layout;
    }
    
    createFloorMap(roomLayout) {
        console.log('Creating cathedral floor map...');
        
        // Initialize grid (false = wall/solid, true = walkable)
        const floorMap = Array(this.gridDepth).fill().map(() => Array(this.gridWidth).fill(false));
        
        // Phase 1: Carve out room areas
        Object.values(roomLayout.rooms).forEach(room => {
            this.carveRoomArea(floorMap, room);
        });
        
        // Phase 2: Carve cloister paths (corridors)
        roomLayout.connections.forEach(connection => {
            this.carveImprovedCorridorPath(floorMap, roomLayout.rooms[connection.from], roomLayout.rooms[connection.to]);
        });
        
        console.log('Cathedral floor map created');
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
        
        console.log(`Carved ${room.type} at grid (${room.gridX}, ${room.gridZ}) size ${room.size}`);
    }
    
    carveImprovedCorridorPath(floorMap, roomA, roomB) {
        console.log(`Carving cloister from ${roomA.id} to ${roomB.id}...`);
        
        // Calculate room edges for better connection points
        const roomAHalfSize = Math.floor(roomA.size / 2);
        const roomBHalfSize = Math.floor(roomB.size / 2);
        
        // Determine connection points at room edges
        let startX = roomA.gridX;
        let startZ = roomA.gridZ;
        let endX = roomB.gridX;
        let endZ = roomB.gridZ;
        
        // Adjust start point to edge of room A
        if (endX > startX) startX += roomAHalfSize - 1;
        else if (endX < startX) startX -= roomAHalfSize - 1;
        
        if (endZ > startZ) startZ += roomAHalfSize - 1;
        else if (endZ < startZ) startZ -= roomAHalfSize - 1;
        
        // Adjust end point to edge of room B
        if (startX > endX) endX += roomBHalfSize - 1;
        else if (startX < endX) endX -= roomBHalfSize - 1;
        
        if (startZ > endZ) endZ += roomBHalfSize - 1;
        else if (startZ < endZ) endZ -= roomBHalfSize - 1;
        
        const corridorHalfWidth = Math.floor(this.corridorWidth / 2);
        
        // Create L-shaped cloister paths
        this.carveHorizontalCorridor(floorMap, startX, endX, startZ, corridorHalfWidth);
        this.carveVerticalCorridor(floorMap, endX, startZ, endZ, corridorHalfWidth);
        
        // Additional path for redundancy
        this.carveVerticalCorridor(floorMap, startX, startZ, endZ, corridorHalfWidth);
        this.carveHorizontalCorridor(floorMap, startX, endX, endZ, corridorHalfWidth);
        
        // Carve junction areas
        this.carveJunction(floorMap, endX, startZ, corridorHalfWidth + 1);
        this.carveJunction(floorMap, startX, endZ, corridorHalfWidth + 1);
        
        console.log(`Carved cloister between ${roomA.id} and ${roomB.id}`);
    }
    
    carveJunction(floorMap, centerX, centerZ, radius) {
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
    
    generateGothicArchitecture(floorMap, roomLayout) {
        console.log('Generating Gothic Cathedral architecture...');
        
        const cathedralGroup = new THREE.Group();
        cathedralGroup.name = 'gothic_cathedral';
        
        // Generate cathedral floors
        this.generateCathedralFloors(cathedralGroup, floorMap, roomLayout);
        
        // Generate Gothic walls with arches
        this.generateGothicWalls(cathedralGroup, floorMap, roomLayout);
        
        // Generate ribbed vaulting (ceilings)
        this.generateRibbedVaulting(cathedralGroup, floorMap, roomLayout);
        
        // Add Gothic architectural details
        this.addGothicArchitecturalDetails(cathedralGroup, roomLayout);
        
        this.scene.add(cathedralGroup);
        this.currentDungeonGroup = cathedralGroup;
    }
    
    getRoomTypeAtGrid(gridX, gridZ, roomLayout) {
        if (!roomLayout) {
            return 'cloister'; // Corridor = cloister
        }
        
        // Check each room to see if this grid position is inside it
        for (const room of Object.values(roomLayout.rooms)) {
            const halfSize = Math.floor(room.size / 2);
            if (gridX >= room.gridX - halfSize && gridX <= room.gridX + halfSize &&
                gridZ >= room.gridZ - halfSize && gridZ <= room.gridZ + halfSize) {
                return room.type; // 'center', 'orbital', or 'cardinal'
            }
        }
        
        return 'cloister'; // Default to cloister if not in any room
    }
    
    getMaterialsForRoomType(roomType) {
        switch(roomType) {
            case 'center': // Main nave
                return {
                    floor: this.materials.get('nave_floor'),
                    wall: this.materials.get('nave_wall'),
                    ceiling: this.materials.get('nave_ceiling')
                };
            case 'orbital': // Side chapels
                return {
                    floor: this.materials.get('chapel_floor'),
                    wall: this.materials.get('chapel_wall'),
                    ceiling: this.materials.get('chapel_ceiling')
                };
            case 'cardinal': // Transepts
                return {
                    floor: this.materials.get('transept_floor'),
                    wall: this.materials.get('transept_wall'),
                    ceiling: this.materials.get('transept_ceiling')
                };
            default: // Cloisters
                return {
                    floor: this.materials.get('cloister_floor'),
                    wall: this.materials.get('cloister_wall'),
                    ceiling: this.materials.get('cloister_ceiling')
                };
        }
    }
    
    generateCathedralFloors(cathedralGroup, floorMap, roomLayout) {
        let floorCount = 0;
        
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
                    
                    // Add stone pattern with raised sections
                    if (roomType === 'center' && Math.random() < 0.3) {
                        const raisedStone = new THREE.Mesh(
                            new THREE.BoxGeometry(this.gridSize * 0.8, 0.1, this.gridSize * 0.8),
                            materials.floor
                        );
                        raisedStone.position.set(worldX, this.floorHeight + 0.05, worldZ);
                        cathedralGroup.add(raisedStone);
                    }
                    
                    cathedralGroup.add(floorSegment);
                    floorCount++;
                }
            }
        }
        
        console.log(`Generated ${floorCount} cathedral floor segments`);
    }
    
    generateGothicWalls(cathedralGroup, floorMap, roomLayout) {
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
                            
                            // Create Gothic wall with varying heights and arches
                            this.createGothicWall(cathedralGroup, worldX, worldZ, dir.rotY, roomType, materials);
                        }
                    });
                }
            }
        }
        
        console.log('Generated Gothic wall architecture');
    }
    
    createGothicWall(cathedralGroup, worldX, worldZ, rotY, roomType, materials) {
        let wallHeight = this.ceilingHeight;
        
        // Adjust wall height based on room type for cathedral effect
        if (roomType === 'center') {
            wallHeight = this.ceilingHeight * 1.5; // Soaring nave walls
        } else if (roomType === 'cardinal') {
            wallHeight = this.ceilingHeight * 1.3; // High transept walls
        } else if (roomType === 'orbital') {
            wallHeight = this.ceilingHeight * 1.1; // Chapel walls
        }
        
        // Main wall structure
        const wallGeometry = new THREE.BoxGeometry(this.gridSize, wallHeight, 0.5);
        const wall = new THREE.Mesh(wallGeometry, materials.wall);
        wall.position.set(worldX, this.floorHeight + wallHeight/2, worldZ);
        wall.rotation.y = rotY;
        wall.castShadow = true;
        wall.receiveShadow = true;
        cathedralGroup.add(wall);
        
        // Add Gothic architectural details based on room type
        if (roomType === 'center') {
            this.addNaveArchitecture(cathedralGroup, worldX, worldZ, rotY, wallHeight);
        } else if (roomType === 'orbital') {
            this.addChapelArchitecture(cathedralGroup, worldX, worldZ, rotY, wallHeight);
        } else if (roomType === 'cardinal') {
            this.addTranseptArchitecture(cathedralGroup, worldX, worldZ, rotY, wallHeight);
        }
    }
    
    addNaveArchitecture(cathedralGroup, worldX, worldZ, rotY, wallHeight) {
        // Gothic pointed arch details for the main nave
        if (Math.random() < 0.4) {
            const archGeometry = new THREE.RingGeometry(0.8, 1.2, 8, 1, 0, Math.PI);
            const archMaterial = this.materials.get('gold_accent');
            const arch = new THREE.Mesh(archGeometry, archMaterial);
            arch.position.set(worldX, this.floorHeight + wallHeight * 0.7, worldZ + 0.3);
            arch.rotation.y = rotY;
            arch.rotation.x = Math.PI / 2;
            cathedralGroup.add(arch);
        }
        
        // Buttress supports
        if (Math.random() < 0.3) {
            const buttressGeometry = new THREE.BoxGeometry(0.3, wallHeight * 0.8, 0.8);
            const buttress = new THREE.Mesh(buttressGeometry, this.materials.get('nave_wall'));
            buttress.position.set(worldX, this.floorHeight + wallHeight * 0.4, worldZ + 0.6);
            buttress.rotation.y = rotY;
            cathedralGroup.add(buttress);
        }
    }
    
    addChapelArchitecture(cathedralGroup, worldX, worldZ, rotY, wallHeight) {
        // Intimate chapel details
        if (Math.random() < 0.5) {
            const nicheGeometry = new THREE.BoxGeometry(0.6, 1.5, 0.3);
            const niche = new THREE.Mesh(nicheGeometry, this.materials.get('silver_accent'));
            niche.position.set(worldX, this.floorHeight + wallHeight * 0.5, worldZ + 0.2);
            niche.rotation.y = rotY;
            cathedralGroup.add(niche);
        }
    }
    
    addTranseptArchitecture(cathedralGroup, worldX, worldZ, rotY, wallHeight) {
        // Transept crossing details
        if (Math.random() < 0.4) {
            const crossGeometry = new THREE.BoxGeometry(0.2, 2, 0.2);
            const crossMaterial = this.materials.get('bronze_accent');
            const crossVertical = new THREE.Mesh(crossGeometry, crossMaterial);
            crossVertical.position.set(worldX, this.floorHeight + wallHeight * 0.6, worldZ + 0.3);
            crossVertical.rotation.y = rotY;
            cathedralGroup.add(crossVertical);
            
            const crossHorizontal = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 0.2, 0.2),
                crossMaterial
            );
            crossHorizontal.position.set(worldX, this.floorHeight + wallHeight * 0.6, worldZ + 0.3);
            crossHorizontal.rotation.y = rotY;
            cathedralGroup.add(crossHorizontal);
        }
    }
    
    generateRibbedVaulting(cathedralGroup, floorMap, roomLayout) {
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) {
                    const roomType = this.getRoomTypeAtGrid(x, z, roomLayout);
                    const materials = this.getMaterialsForRoomType(roomType);
                    
                    const worldX = (x - this.gridWidth/2) * this.gridSize;
                    const worldZ = (z - this.gridDepth/2) * this.gridSize;
                    
                    // Variable ceiling heights for cathedral effect
                    let ceilingHeight = this.ceilingHeight;
                    if (roomType === 'center') {
                        ceilingHeight = this.ceilingHeight * 1.5; // Soaring nave vault
                    } else if (roomType === 'cardinal') {
                        ceilingHeight = this.ceilingHeight * 1.3; // High transept vault
                    } else if (roomType === 'orbital') {
                        ceilingHeight = this.ceilingHeight * 1.1; // Chapel vault
                    }
                    
                    const ceilingGeometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
                    const ceilingSegment = new THREE.Mesh(ceilingGeometry, materials.ceiling);
                    ceilingSegment.rotation.x = Math.PI / 2;
                    ceilingSegment.position.set(worldX, this.floorHeight + ceilingHeight, worldZ);
                    ceilingSegment.receiveShadow = true;
                    
                    cathedralGroup.add(ceilingSegment);
                    
                    // Add ribbed vaulting details
                    if (roomType === 'center' && Math.random() < 0.2) {
                        this.addRibbedVaultDetails(cathedralGroup, worldX, worldZ, ceilingHeight);
                    }
                    
                    // Add stained glass window effects to transepts
                    if (roomType === 'cardinal' && Math.random() < 0.15) {
                        this.addStainedGlassWindow(cathedralGroup, worldX, worldZ, ceilingHeight);
                    }
                }
            }
        }
        
        console.log('Generated ribbed vaulting');
    }
    
    addRibbedVaultDetails(cathedralGroup, x, z, height) {
        // Add ribs to the vaulting
        const ribGeometry = new THREE.BoxGeometry(0.1, 0.2, this.gridSize);
        const ribMaterial = this.materials.get('gold_accent');
        
        const rib1 = new THREE.Mesh(ribGeometry, ribMaterial);
        rib1.position.set(x, this.floorHeight + height - 0.1, z);
        cathedralGroup.add(rib1);
        
        const rib2 = new THREE.Mesh(
            new THREE.BoxGeometry(this.gridSize, 0.2, 0.1),
            ribMaterial
        );
        rib2.position.set(x, this.floorHeight + height - 0.1, z);
        cathedralGroup.add(rib2);
    }
    
    addStainedGlassWindow(cathedralGroup, x, z, height) {
        // Create stained glass window effect with colored geometric shapes
        const windowHeight = height * 0.6;
        const colors = ['stained_red', 'stained_blue', 'stained_gold', 'stained_purple'];
        
        for (let i = 0; i < 4; i++) {
            const panelGeometry = new THREE.PlaneGeometry(0.4, 0.8);
            const panelMaterial = this.materials.get(colors[i % colors.length]);
            const panel = new THREE.Mesh(panelGeometry, panelMaterial);
            
            panel.position.set(
                x + (i - 1.5) * 0.5,
                this.floorHeight + windowHeight,
                z + 0.4
            );
            
            cathedralGroup.add(panel);
        }
    }
    
    addGothicArchitecturalDetails(cathedralGroup, roomLayout) {
        console.log('Adding Gothic architectural details...');
        
        Object.values(roomLayout.rooms).forEach(room => {
            this.addRoomSpecificDetails(cathedralGroup, room);
        });
    }
    
    addRoomSpecificDetails(cathedralGroup, room) {
        const worldX = (room.gridX - this.gridWidth/2) * this.gridSize;
        const worldZ = (room.gridZ - this.gridDepth/2) * this.gridSize;
        const roomSize = room.size * this.gridSize;
        
        if (room.type === 'center') {
            // Main nave altar and columns
            this.addMainAltar(cathedralGroup, worldX, worldZ);
            this.addNaveColumns(cathedralGroup, worldX, worldZ, roomSize);
        } else if (room.type === 'orbital') {
            // Chapel altar and pews
            this.addChapelAltar(cathedralGroup, worldX, worldZ);
            this.addChapelPews(cathedralGroup, worldX, worldZ, roomSize);
        } else if (room.type === 'cardinal') {
            // Transept crossing and rose window
            this.addTranseptCrossing(cathedralGroup, worldX, worldZ);
            this.addRoseWindow(cathedralGroup, worldX, worldZ, room.direction);
        }
    }
    
    addMainAltar(cathedralGroup, worldX, worldZ) {
        // Gothic altar in the center of the nave
        const altarGeometry = new THREE.BoxGeometry(3, 1.5, 1.5);
        const altar = new THREE.Mesh(altarGeometry, this.materials.get('gold_accent'));
        altar.position.set(worldX, this.floorHeight + 0.75, worldZ + 8);
        altar.castShadow = true;
        cathedralGroup.add(altar);
        
        // Altar cross
        const crossGeometry = new THREE.BoxGeometry(0.2, 2, 0.2);
        const cross = new THREE.Mesh(crossGeometry, this.materials.get('silver_accent'));
        cross.position.set(worldX, this.floorHeight + 2.5, worldZ + 8);
        cathedralGroup.add(cross);
        
        const crossbeam = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.2, 0.2),
            this.materials.get('silver_accent')
        );
        crossbeam.position.set(worldX, this.floorHeight + 2.8, worldZ + 8);
        cathedralGroup.add(crossbeam);
    }
    
    addNaveColumns(cathedralGroup, worldX, worldZ, roomSize) {
        // Gothic columns along the nave
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const radius = roomSize * 0.35;
            
            const columnX = worldX + Math.cos(angle) * radius;
            const columnZ = worldZ + Math.sin(angle) * radius;
            
            // Main column shaft
            const columnGeometry = new THREE.CylinderGeometry(0.8, 1.0, this.ceilingHeight * 1.4, 12);
            const column = new THREE.Mesh(columnGeometry, this.materials.get('nave_wall'));
            column.position.set(columnX, this.floorHeight + this.ceilingHeight * 0.7, columnZ);
            column.castShadow = true;
            column.receiveShadow = true;
            cathedralGroup.add(column);
            
            // Gothic capital
            const capitalGeometry = new THREE.CylinderGeometry(1.2, 0.8, 0.8, 8);
            const capital = new THREE.Mesh(capitalGeometry, this.materials.get('gold_accent'));
            capital.position.set(columnX, this.floorHeight + this.ceilingHeight * 1.35, columnZ);
            cathedralGroup.add(capital);
            
            // Base
            const baseGeometry = new THREE.CylinderGeometry(1.0, 1.3, 0.5, 8);
            const base = new THREE.Mesh(baseGeometry, this.materials.get('bronze_accent'));
            base.position.set(columnX, this.floorHeight + 0.25, columnZ);
            cathedralGroup.add(base);
            
            this.glowingPillars.push(column);
        }
    }
    
    addChapelAltar(cathedralGroup, worldX, worldZ) {
        // Small chapel altar
        const altarGeometry = new THREE.BoxGeometry(1.5, 1, 1);
        const altar = new THREE.Mesh(altarGeometry, this.materials.get('silver_accent'));
        altar.position.set(worldX, this.floorHeight + 0.5, worldZ + 3);
        cathedralGroup.add(altar);
    }
    
    addChapelPews(cathedralGroup, worldX, worldZ, roomSize) {
        // Simple pews for the chapel
        for (let i = 0; i < 3; i++) {
            const pewGeometry = new THREE.BoxGeometry(4, 0.8, 0.4);
            const pew = new THREE.Mesh(pewGeometry, this.materials.get('chapel_floor'));
            pew.position.set(worldX, this.floorHeight + 0.4, worldZ - 2 + i * 1.5);
            cathedralGroup.add(pew);
        }
    }
    
    addTranseptCrossing(cathedralGroup, worldX, worldZ) {
        // Crossing point decoration
        const crossingGeometry = new THREE.CylinderGeometry(2, 2, 0.2, 16);
        const crossing = new THREE.Mesh(crossingGeometry, this.materials.get('bronze_accent'));
        crossing.position.set(worldX, this.floorHeight + 0.1, worldZ);
        cathedralGroup.add(crossing);
    }
    
    addRoseWindow(cathedralGroup, worldX, worldZ, direction) {
        // Large rose window with stained glass effect
        const windowGeometry = new THREE.RingGeometry(1, 2.5, 12);
        const windowMaterial = this.materials.get('stained_blue');
        const roseWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        
        // Position based on direction
        let posX = worldX, posZ = worldZ;
        if (direction === 'north') posZ -= 8;
        else if (direction === 'south') posZ += 8;
        else if (direction === 'east') posX += 8;
        else if (direction === 'west') posX -= 8;
        
        roseWindow.position.set(posX, this.floorHeight + this.ceilingHeight, posZ);
        roseWindow.rotation.x = Math.PI / 2;
        cathedralGroup.add(roseWindow);
        
        // Add colored light for stained glass effect
        const stainedLight = new THREE.PointLight(0x4169E1, 0.8, 25);
        stainedLight.position.set(posX, this.floorHeight + this.ceilingHeight - 2, posZ);
        cathedralGroup.add(stainedLight);
        this.lightSources.push(stainedLight);
    }
    
    addCathedralLighting(roomLayout) {
        console.log('Adding cathedral lighting...');
        
        // Add sacred lighting to each room
        Object.values(roomLayout.rooms).forEach(room => {
            this.addSacredLighting(room);
        });
        
        // Add cloister lighting
        roomLayout.connections.forEach(connection => {
            this.addCloisterLighting(roomLayout.rooms[connection.from], roomLayout.rooms[connection.to]);
        });
    }
    
    addSacredLighting(room) {
        const worldX = (room.gridX - this.gridWidth/2) * this.gridSize;
        const worldZ = (room.gridZ - this.gridDepth/2) * this.gridSize;
        const roomSize = room.size * this.gridSize;
        
        if (room.type === 'center') {
            // Main nave lighting - warm golden light
            const naveLight = new THREE.PointLight(0xFFE135, 2.5, 100);
            naveLight.position.set(worldX, this.floorHeight + this.ceilingHeight * 1.4, worldZ);
            this.currentDungeonGroup.add(naveLight);
            this.lightSources.push(naveLight);
            
            // Altar lighting
            const altarLight = new THREE.SpotLight(0xFFD700, 1.5, 50, Math.PI/6, 0.2);
            altarLight.position.set(worldX, this.floorHeight + this.ceilingHeight, worldZ + 8);
            altarLight.target.position.set(worldX, this.floorHeight, worldZ + 8);
            this.currentDungeonGroup.add(altarLight);
            this.currentDungeonGroup.add(altarLight.target);
            this.lightSources.push(altarLight);
            
            // Candle lighting around nave
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const radius = roomSize * 0.4;
                const candleLight = new THREE.PointLight(0xFF6B35, 0.8, 15);
                candleLight.position.set(
                    worldX + Math.cos(angle) * radius,
                    this.floorHeight + 3,
                    worldZ + Math.sin(angle) * radius
                );
                this.currentDungeonGroup.add(candleLight);
                this.lightSources.push(candleLight);
            }
            
        } else if (room.type === 'orbital') {
            // Chapel lighting - intimate and warm
            const chapelLight = new THREE.PointLight(0xFFE4B5, 1.2, 60);
            chapelLight.position.set(worldX, this.floorHeight + this.ceilingHeight, worldZ);
            this.currentDungeonGroup.add(chapelLight);
            this.lightSources.push(chapelLight);
            
            // Prayer candles
            for (let i = 0; i < 4; i++) {
                const candleLight = new THREE.PointLight(0xFF4500, 0.6, 12);
                candleLight.position.set(
                    worldX + (i - 1.5) * 2,
                    this.floorHeight + 2,
                    worldZ + 4
                );
                this.currentDungeonGroup.add(candleLight);
                this.lightSources.push(candleLight);
            }
            
        } else if (room.type === 'cardinal') {
            // Transept lighting - mystical blue-white
            const transeptLight = new THREE.PointLight(0x87CEEB, 2.0, 80);
            transeptLight.position.set(worldX, this.floorHeight + this.ceilingHeight * 1.2, worldZ);
            this.currentDungeonGroup.add(transeptLight);
            this.lightSources.push(transeptLight);
            
            // Stained glass lighting effect
            const stainedColors = [0xFF0000, 0x0000FF, 0xFFD700, 0x8A2BE2];
            stainedColors.forEach((color, i) => {
                const stainedLight = new THREE.PointLight(color, 0.8, 30);
                const angle = (i / 4) * Math.PI * 2;
                const radius = roomSize * 0.3;
                stainedLight.position.set(
                    worldX + Math.cos(angle) * radius,
                    this.floorHeight + this.ceilingHeight,
                    worldZ + Math.sin(angle) * radius
                );
                this.currentDungeonGroup.add(stainedLight);
                this.lightSources.push(stainedLight);
            });
        }
        
        console.log(`Added sacred lighting to ${room.type} at (${worldX}, ${worldZ})`);
    }
    
    addCloisterLighting(roomA, roomB) {
        const startWorldX = (roomA.gridX - this.gridWidth/2) * this.gridSize;
        const startWorldZ = (roomA.gridZ - this.gridDepth/2) * this.gridSize;
        const endWorldX = (roomB.gridX - this.gridWidth/2) * this.gridSize;
        const endWorldZ = (roomB.gridZ - this.gridDepth/2) * this.gridSize;
        
        // Cloister path lighting - soft and guiding
        const pathLight = new THREE.PointLight(0xF0E68C, 1.0, 40);
        pathLight.position.set(endWorldX, this.floorHeight + 5, startWorldZ);
        this.currentDungeonGroup.add(pathLight);
        this.lightSources.push(pathLight);
        
        // Additional path markers
        const midWorldX = (startWorldX + endWorldX) / 2;
        const midWorldZ = (startWorldZ + endWorldZ) / 2;
        
        const midLight = new THREE.PointLight(0xDEB887, 0.7, 25);
        midLight.position.set(midWorldX, this.floorHeight + 4, midWorldZ);
        this.currentDungeonGroup.add(midLight);
        this.lightSources.push(midLight);
    }
    
    addSacredAtmosphere(roomLayout) {
        console.log('Adding sacred atmospheric elements...');
        
        Object.values(roomLayout.rooms).forEach(room => {
            this.addRoomAtmosphere(room);
        });
    }
    
    addRoomAtmosphere(room) {
        const worldX = (room.gridX - this.gridWidth/2) * this.gridSize;
        const worldZ = (room.gridZ - this.gridDepth/2) * this.gridSize;
        const roomSize = room.size * this.gridSize;
        
        // Add candles and incense
        this.addCandles(worldX, worldZ, roomSize, room.type);
        this.addFloatingIncense(worldX, worldZ, roomSize);
        
        // Entry/exit portals to center room
        if (room.type === 'center') {
            this.addCenterRoomPortals(worldX, worldZ, roomSize);
        }
    }
    
    addCandles(worldX, worldZ, roomSize, roomType) {
        const numCandles = roomType === 'center' ? 8 : 4;
        
        for (let i = 0; i < numCandles; i++) {
            const angle = (i / numCandles) * Math.PI * 2;
            const radius = roomSize * 0.25;
            
            const candleX = worldX + Math.cos(angle) * radius;
            const candleZ = worldZ + Math.sin(angle) * radius;
            
            // Candle base
            const candleGeometry = new THREE.CylinderGeometry(0.1, 0.12, 1.5, 8);
            const candleMaterial = this.materials.get('bronze_accent');
            const candle = new THREE.Mesh(candleGeometry, candleMaterial);
            candle.position.set(candleX, this.floorHeight + 0.75, candleZ);
            this.currentDungeonGroup.add(candle);
            
            // Flame effect
            const flameGeometry = new THREE.SphereGeometry(0.15, 6, 6);
            const flame = new THREE.Mesh(flameGeometry, this.materials.get('candle_flame'));
            flame.position.set(candleX, this.floorHeight + 1.6, candleZ);
            flame.scale.set(1, 1.5, 1);
            
            // Animate flame
            flame.userData = {
                originalY: flame.position.y,
                flickerSpeed: 4 + Math.random() * 2,
                flickerAmount: 0.1
            };
            
            this.currentDungeonGroup.add(flame);
        }
    }
    
    addFloatingIncense(worldX, worldZ, roomSize) {
        // Mystical floating incense smoke
        for (let i = 0; i < 3; i++) {
            const smokeGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const smoke = new THREE.Mesh(smokeGeometry, this.materials.get('incense_smoke'));
            smoke.position.set(
                worldX + (Math.random() - 0.5) * roomSize * 0.4,
                this.floorHeight + 3 + Math.random() * 2,
                worldZ + (Math.random() - 0.5) * roomSize * 0.4
            );
            
            // Add floating animation
            smoke.userData = {
                originalY: smoke.position.y,
                floatSpeed: 0.3 + Math.random() * 0.7,
                floatAmount: 0.5,
                driftX: (Math.random() - 0.5) * 0.01,
                driftZ: (Math.random() - 0.5) * 0.01
            };
            
            this.currentDungeonGroup.add(smoke);
        }
    }
    
    addProgressivePortals(roomLayout) {
        console.log('Adding progressive portal system...');
        
        // Find center room position
        const centerRoom = roomLayout.rooms.center;
        const centerWorldX = (centerRoom.gridX - this.gridWidth/2) * this.gridSize;
        const centerWorldZ = (centerRoom.gridZ - this.gridDepth/2) * this.gridSize;
        const roomSize = centerRoom.size * this.gridSize;
        
        // Calculate portal positions for each direction
        const portalDistance = roomSize * 0.6;
        const portalPositions = {
            east: { x: centerWorldX + portalDistance, z: centerWorldZ, rotation: Math.PI/2 },
            west: { x: centerWorldX - portalDistance, z: centerWorldZ, rotation: -Math.PI/2 },
            south: { x: centerWorldX, z: centerWorldZ + portalDistance, rotation: Math.PI }
        };
        
        // Add room entrance portals (initially blocked except north)
        Object.entries(portalPositions).forEach(([direction, pos]) => {
            const isUnlocked = this.roomProgression[direction].unlocked;
            const portal = this.createSacredPortal(direction, isUnlocked);
            portal.position.set(pos.x, this.floorHeight + 4, pos.z);
            portal.name = `${direction}_room_portal`;
            this.currentDungeonGroup.add(portal);
            
            console.log(`Added ${direction} sacred portal - ${isUnlocked ? 'OPEN' : 'SEALED'}`);
        });
    }
    
    createSacredPortal(direction, isUnlocked) {
        const portalGroup = new THREE.Group();
        
        // Create sacred archway
        const archway = this.createSacredArchway(isUnlocked);
        portalGroup.add(archway);
        
        // Add mystical effects
        this.addPortalMysticalEffects(portalGroup, isUnlocked);
        
        // Add portal data
        portalGroup.userData = {
            portalType: `room_entrance_${direction}`,
            direction: direction,
            isBlocking: !isUnlocked,
            originalY: this.floorHeight + 4,
            pulseSpeed: 0.3,
            pulseAmount: 0.05,
            archway: archway
        };
        
        return portalGroup;
    }
    
    createSacredArchway(isUnlocked) {
        const archGroup = new THREE.Group();
        
        // Gothic pointed arch frame
        const archGeometry = new THREE.RingGeometry(2, 2.5, 16, 1, 0, Math.PI);
        const archMaterial = isUnlocked ? 
            this.materials.get('gold_accent') : 
            this.materials.get('bronze_accent');
        
        const arch = new THREE.Mesh(archGeometry, archMaterial);
        arch.rotation.x = Math.PI / 2;
        archGroup.add(arch);
        
        // Mystical barrier (when locked)
        if (!isUnlocked) {
            const barrierGeometry = new THREE.PlaneGeometry(4, 5);
            const barrierMaterial = new THREE.MeshBasicMaterial({
                color: 0x4B0082,
                transparent: true,
                opacity: 0.6,
                emissive: 0x4B0082,
                emissiveIntensity: 0.3
            });
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrier.rotation.x = Math.PI / 2;
            archGroup.add(barrier);
            
            archGroup.userData.barrier = barrier;
        }
        
        // Pillars
        const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.4, 5, 8);
        const pillarMaterial = this.materials.get('silver_accent');
        
        const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        leftPillar.position.set(-2.5, -2.5, 0);
        archGroup.add(leftPillar);
        
        const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        rightPillar.position.set(2.5, -2.5, 0);
        archGroup.add(rightPillar);
        
        return archGroup;
    }
    
    addPortalMysticalEffects(portalGroup, isUnlocked) {
        const effectColor = isUnlocked ? 0xFFD700 : 0x8A2BE2;
        const effectCount = 8;
        
        for (let i = 0; i < effectCount; i++) {
            const effectGeometry = new THREE.SphereGeometry(0.08, 6, 6);
            const effectMaterial = new THREE.MeshBasicMaterial({
                color: effectColor,
                transparent: true,
                opacity: isUnlocked ? 0.7 : 0.9,
                emissive: effectColor,
                emissiveIntensity: 0.8
            });
            
            const effect = new THREE.Mesh(effectGeometry, effectMaterial);
            
            // Position effects in a circle around the portal
            const angle = (i / effectCount) * Math.PI * 2;
            const radius = 3;
            effect.position.set(
                Math.cos(angle) * radius,
                -1 + Math.random() * 2,
                Math.sin(angle) * radius
            );
            
            // Add animation data
            effect.userData = {
                originalAngle: angle,
                originalRadius: radius,
                swirSpeed: 0.3 + Math.random() * 0.3,
                bobSpeed: 0.5 + Math.random() * 0.3,
                bobAmount: 0.2,
                effectMaterial: effectMaterial
            };
            
            portalGroup.add(effect);
        }
    }
    
    addCenterRoomPortals(worldX, worldZ, roomSize) {
        console.log('Center nave ready for sacred portals...');
        // Entry/exit portals will be handled separately when needed
    }
    
    updateRoomPortals(direction, shouldOpen) {
        if (!this.currentDungeonGroup) return;
        
        console.log(`Updating ${direction} sacred portal to ${shouldOpen ? 'OPEN' : 'SEALED'}`);
        
        this.currentDungeonGroup.traverse((child) => {
            if (child.userData.direction === direction) {
                child.userData.isBlocking = !shouldOpen;
                
                // Update archway materials
                if (child.userData.archway) {
                    const newMaterial = shouldOpen ? 
                        this.materials.get('gold_accent') : 
                        this.materials.get('bronze_accent');
                    
                    child.userData.archway.traverse((archChild) => {
                        if (archChild.material && archChild.geometry.type === 'RingGeometry') {
                            archChild.material = newMaterial;
                        }
                    });
                    
                    // Handle barrier
                    if (child.userData.archway.userData.barrier) {
                        child.userData.archway.userData.barrier.visible = !shouldOpen;
                    }
                }
                
                // Update mystical effects
                child.traverse((subChild) => {
                    if (subChild.userData.effectMaterial) {
                        const newColor = shouldOpen ? 0xFFD700 : 0x8A2BE2;
                        const newOpacity = shouldOpen ? 0.7 : 0.9;
                        subChild.userData.effectMaterial.color.setHex(newColor);
                        subChild.userData.effectMaterial.emissive.setHex(newColor);
                        subChild.userData.effectMaterial.opacity = newOpacity;
                    }
                });
                
                console.log(`${direction} sacred portal ${shouldOpen ? 'opened' : 'sealed'}`);
            }
        });
    }
    
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
        console.log('All rooms completed - opening sacred exit portal!');
        
        if (this.currentDungeon && this.currentDungeon.roomLayout.rooms.center) {
            const centerRoom = this.currentDungeon.roomLayout.rooms.center;
            const centerWorldX = (centerRoom.gridX - this.gridWidth/2) * this.gridSize;
            const centerWorldZ = (centerRoom.gridZ - this.gridDepth/2) * this.gridSize;
            const roomSize = centerRoom.size * this.gridSize;
            
            // Create golden exit portal
            const exitPortal = this.createSacredPortal('exit', true);
            exitPortal.position.set(centerWorldX, this.floorHeight + 4, centerWorldZ + roomSize * 0.3);
            exitPortal.name = 'exit_portal';
            exitPortal.userData.isBlocking = false;
            exitPortal.userData.portalType = 'exit';
            exitPortal.userData.direction = 'exit';
            
            // Make it extra golden and radiant
            exitPortal.traverse((child) => {
                if (child.userData.effectMaterial) {
                    child.userData.effectMaterial.color.setHex(0xFFFFAA);
                    child.userData.effectMaterial.emissive.setHex(0xFFFFAA);
                    child.userData.effectMaterial.opacity = 0.9;
                }
            });
            
            this.currentDungeonGroup.add(exitPortal);
            console.log('Sacred exit portal opened with golden radiance!');
        }
    }
    
    update(deltaTime) {
        // Update atmospheric elements
        if (this.currentDungeonGroup) {
            this.currentDungeonGroup.traverse((child) => {
                // Floating incense and candle flames
                if (child.userData.floatSpeed && child.userData.originalY !== undefined) {
                    const time = Date.now() * 0.001;
                    child.position.y = child.userData.originalY + 
                        Math.sin(time * child.userData.floatSpeed) * child.userData.floatAmount;
                    
                    // Drift for incense
                    if (child.userData.driftX) {
                        child.position.x += child.userData.driftX;
                        child.position.z += child.userData.driftZ;
                    }
                }
                
                // Candle flame flicker
                if (child.userData.flickerSpeed) {
                    const time = Date.now() * 0.001;
                    child.position.y = child.userData.originalY + 
                        Math.sin(time * child.userData.flickerSpeed) * child.userData.flickerAmount;
                    child.scale.setScalar(1 + Math.sin(time * child.userData.flickerSpeed * 2) * 0.1);
                }
                
                // Portal animations
                if (child.userData.portalType && child.userData.portalType.includes('room_entrance')) {
                    this.updatePortalAnimations(child, deltaTime);
                }
                
                // Portal mystical effects
                if (child.userData.swirSpeed !== undefined) {
                    this.updateMysticalEffects(child, deltaTime);
                }
                
                // Look at camera for billboards
                if (child.userData.archway && window.game && window.game.camera) {
                    child.userData.archway.lookAt(window.game.camera.position);
                }
            });
        }
        
        // Update glowing architectural elements
        this.glowingPillars.forEach(element => {
            if (element && element.material) {
                const time = Date.now() * 0.001;
                const glowIntensity = 0.2 + Math.sin(time * 0.5) * 0.1;
                
                if (element.material.emissive) {
                    element.material.emissiveIntensity = glowIntensity;
                }
            }
        });
        
        // Animate sacred lighting with gentle flicker
        this.lightSources.forEach(light => {
            if (light.userData.originalIntensity === undefined) {
                light.userData.originalIntensity = light.intensity;
                light.userData.flickerSpeed = 0.3 + Math.random();
            }
            
            const time = Date.now() * 0.001;
            const flicker = Math.sin(time * light.userData.flickerSpeed) * 0.1 + 1;
            light.intensity = light.userData.originalIntensity * flicker;
        });
    }
    
    updatePortalAnimations(portalGroup, deltaTime) {
        const time = Date.now() * 0.001;
        
        // Gentle floating
        const originalY = portalGroup.userData.originalY;
        const floatOffset = Math.sin(time * portalGroup.userData.pulseSpeed) * portalGroup.userData.pulseAmount;
        portalGroup.position.y = originalY + floatOffset;
        
        // Subtle scale pulsing
        const pulseScale = 1 + Math.sin(time * portalGroup.userData.pulseSpeed * 2) * 0.02;
        if (portalGroup.userData.archway) {
            portalGroup.userData.archway.scale.setScalar(pulseScale);
        }
    }
    
    updateMysticalEffects(effect, deltaTime) {
        const time = Date.now() * 0.001;
        
        // Swirling motion
        if (effect.userData.originalAngle !== undefined) {
            effect.userData.originalAngle += effect.userData.swirSpeed * deltaTime;
            const angle = effect.userData.originalAngle;
            const radius = effect.userData.originalRadius || 3;
            
            effect.position.x = Math.cos(angle) * radius;
            effect.position.z = Math.sin(angle) * radius;
            
            // Gentle bobbing
            effect.position.y += Math.sin(time * effect.userData.bobSpeed) * effect.userData.bobAmount * deltaTime;
        }
    }
    
    clearCurrentDungeon() {
        if (this.currentDungeonGroup) {
            this.scene.remove(this.currentDungeonGroup);
        }
        
        this.lightSources.length = 0;
        this.billboardSprites.length = 0;
        this.glowingPillars.length = 0;
        this.architecturalElements.length = 0;
        this.currentFloorMap = null;
        
        console.log('Previous cathedral cleared');
    }
    
    // Portal Management Methods
    togglePortals() {
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
