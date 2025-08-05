// Dungeon Generation System with Collision Detection
// Grid-based procedural dungeon generation with solid walls, floors, and ceilings

class DungeonSystem {
    constructor(scene, player) {
        console.log('Initializing Unified Dungeon System...');
        
        this.scene = scene;
        this.player = player;
        
        // Current dungeon state
        this.currentFloor = 1;
        this.currentDungeon = null;
        
        // Grid-based floor planning
        this.gridSize = 2; // 2 units per grid cell
        this.dungeonWidth = 120; // Total dungeon width in units
        this.dungeonDepth = 120; // Total dungeon depth in units
        this.gridWidth = Math.floor(this.dungeonWidth / this.gridSize);
        this.gridDepth = Math.floor(this.dungeonDepth / this.gridSize);
        
        // Room templates
        this.roomTemplates = {
            CENTER: { size: 13, type: 'center' },    // 26x26 units
            ORBITAL: { size: 10, type: 'orbital' },  // 20x20 units  
            CARDINAL: { size: 15, type: 'cardinal' } // 30x30 units
        };
        
        // Corridor width in grid cells
        this.corridorWidth = 2; // 4 units wide
        
        // Collision and height data
        this.floorHeight = 0; // Base floor height
        this.ceilingHeight = 8; // Ceiling height from floor
        this.currentFloorMap = null; // For collision detection
        
        // Theme progression
        this.themes = {
            STONE: { floors: [1, 10], name: 'stone' },
            CRYSTAL: { floors: [11, 20], name: 'crystal' },
            RUINS: { floors: [21, 30], name: 'ruins' },
            CRYPT: { floors: [31, 40], name: 'crypt' },
            FOREST: { floors: [41, 50], name: 'forest' }
        };
        
        // Materials and lighting
        this.textureLoader = new THREE.TextureLoader();
        this.materials = new Map();
        this.lightSources = [];
        this.billboardSprites = [];
        
        this.init();
    }
    
    init() {
        this.setupMaterials();
        this.setupBillboardSystem();
        
        // Connect player to this dungeon system for collision detection
        if (this.player) {
            this.player.setDungeonSystem(this);
        }
        
        console.log('Unified Dungeon System initialized with collision detection');
    }
    
    // Collision Detection Methods
    isPositionWalkable(worldX, worldZ) {
        if (!this.currentFloorMap) return true;
        
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor((worldX + this.dungeonWidth/2) / this.gridSize);
        const gridZ = Math.floor((worldZ + this.dungeonDepth/2) / this.gridSize);
        
        // Check bounds
        if (gridX < 0 || gridX >= this.gridWidth || gridZ < 0 || gridZ >= this.gridDepth) {
            return false; // Outside dungeon bounds
        }
        
        // Return walkable state from floor map
        return this.currentFloorMap[gridZ][gridX];
    }
    
    getFloorHeight(worldX, worldZ) {
        // For now, all floors are at the same height
        // In the future, this could vary for multi-level dungeons
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
        this.createStoneMaterials();
        this.createCrystalMaterials();
        this.createRuinsMaterials();
        this.createCryptMaterials();
        this.createForestMaterials();
    }
    
    createStoneMaterials() {
        // Create beautiful stained glass mosaic floor pattern
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Create mosaic tile pattern
        const tileSize = 32;
        const colors = ['#8B4513', '#CD853F', '#DAA520', '#B8860B', '#D2691E', '#A0522D'];
        
        for (let y = 0; y < canvas.height; y += tileSize) {
            for (let x = 0; x < canvas.width; x += tileSize) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillStyle = color;
                ctx.fillRect(x, y, tileSize - 2, tileSize - 2);
                
                // Add highlight
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(x, y, tileSize - 2, 4);
            }
        }
        
        const stoneFloorTexture = new THREE.CanvasTexture(canvas);
        stoneFloorTexture.wrapS = THREE.RepeatWrapping;
        stoneFloorTexture.wrapT = THREE.RepeatWrapping;
        stoneFloorTexture.repeat.set(4, 4);
        
        const stoneFloor = new THREE.MeshLambertMaterial({ 
            map: stoneFloorTexture,
            transparent: true, 
            opacity: 0.9 
        });
        
        const stoneWall = new THREE.MeshLambertMaterial({ color: 0x6a6a6a, transparent: true, opacity: 0.95 });
        const stoneCeiling = new THREE.MeshLambertMaterial({ color: 0x4a4a4a, transparent: true, opacity: 0.8 });
        
        this.materials.set('stone_floor', stoneFloor);
        this.materials.set('stone_wall', stoneWall);
        this.materials.set('stone_ceiling', stoneCeiling);
    }
    
    createCrystalMaterials() {
        // Create crystal mosaic floor pattern
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        const tileSize = 32;
        const colors = ['#4169E1', '#6495ED', '#7B68EE', '#9370DB', '#8A2BE2', '#4B0082'];
        
        for (let y = 0; y < canvas.height; y += tileSize) {
            for (let x = 0; x < canvas.width; x += tileSize) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillStyle = color;
                ctx.fillRect(x, y, tileSize - 2, tileSize - 2);
                
                // Add crystal shine
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.fillRect(x, y, tileSize - 2, 6);
            }
        }
        
        const crystalFloorTexture = new THREE.CanvasTexture(canvas);
        crystalFloorTexture.wrapS = THREE.RepeatWrapping;
        crystalFloorTexture.wrapT = THREE.RepeatWrapping;
        crystalFloorTexture.repeat.set(4, 4);
        
        const crystalFloor = new THREE.MeshPhongMaterial({ 
            map: crystalFloorTexture,
            transparent: true, 
            opacity: 0.9, 
            shininess: 30 
        });
        const crystalWall = new THREE.MeshPhongMaterial({ color: 0x7a7a9a, transparent: true, opacity: 0.95, shininess: 50 });
        const crystalCeiling = new THREE.MeshPhongMaterial({ color: 0x5a5a7a, transparent: true, opacity: 0.8, shininess: 20 });
        
        this.materials.set('crystal_floor', crystalFloor);
        this.materials.set('crystal_wall', crystalWall);
        this.materials.set('crystal_ceiling', crystalCeiling);
    }
    
    createRuinsMaterials() {
        // Create ruined mosaic floor pattern
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        const tileSize = 32;
        const colors = ['#8B008B', '#DA70D6', '#BA55D3', '#9932CC', '#8A2BE2', '#6A5ACD'];
        
        for (let y = 0; y < canvas.height; y += tileSize) {
            for (let x = 0; x < canvas.width; x += tileSize) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillStyle = color;
                
                // Some tiles are "broken" - irregular shapes
                if (Math.random() > 0.3) {
                    ctx.fillRect(x, y, tileSize - 2, tileSize - 2);
                } else {
                    ctx.fillRect(x + 4, y + 4, tileSize - 10, tileSize - 10);
                }
                
                // Add mystical glow
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillRect(x, y, tileSize - 2, 3);
            }
        }
        
        const ruinsFloorTexture = new THREE.CanvasTexture(canvas);
        ruinsFloorTexture.wrapS = THREE.RepeatWrapping;
        ruinsFloorTexture.wrapT = THREE.RepeatWrapping;
        ruinsFloorTexture.repeat.set(4, 4);
        
        const ruinsFloor = new THREE.MeshLambertMaterial({ map: ruinsFloorTexture, transparent: true, opacity: 0.85 });
        const ruinsWall = new THREE.MeshLambertMaterial({ color: 0x9a7a9a, transparent: true, opacity: 0.9 });
        const ruinsCeiling = new THREE.MeshLambertMaterial({ color: 0x7a5a7a, transparent: true, opacity: 0.7 });
        
        this.materials.set('ruins_floor', ruinsFloor);
        this.materials.set('ruins_wall', ruinsWall);
        this.materials.set('ruins_ceiling', ruinsCeiling);
    }
    
    createCryptMaterials() {
        // Create dark mosaic floor pattern
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        const tileSize = 32;
        const colors = ['#2F4F2F', '#556B2F', '#6B8E23', '#808000', '#9ACD32', '#32CD32'];
        
        for (let y = 0; y < canvas.height; y += tileSize) {
            for (let x = 0; x < canvas.width; x += tileSize) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillStyle = color;
                ctx.fillRect(x, y, tileSize - 2, tileSize - 2);
                
                // Add eerie glow
                ctx.fillStyle = 'rgba(0,255,0,0.2)';
                ctx.fillRect(x, y, tileSize - 2, 4);
            }
        }
        
        const cryptFloorTexture = new THREE.CanvasTexture(canvas);
        cryptFloorTexture.wrapS = THREE.RepeatWrapping;
        cryptFloorTexture.wrapT = THREE.RepeatWrapping;
        cryptFloorTexture.repeat.set(4, 4);
        
        const cryptFloor = new THREE.MeshLambertMaterial({ map: cryptFloorTexture, transparent: true, opacity: 0.9 });
        const cryptWall = new THREE.MeshLambertMaterial({ color: 0x6a6a5a, transparent: true, opacity: 0.95 });
        const cryptCeiling = new THREE.MeshLambertMaterial({ color: 0x4a4a3a, transparent: true, opacity: 0.6 });
        
        this.materials.set('crypt_floor', cryptFloor);
        this.materials.set('crypt_wall', cryptWall);
        this.materials.set('crypt_ceiling', cryptCeiling);
    }
    
    createForestMaterials() {
        // Create natural mosaic floor pattern
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        const tileSize = 32;
        const colors = ['#228B22', '#32CD32', '#7CFC00', '#ADFF2F', '#9ACD32', '#6B8E23'];
        
        for (let y = 0; y < canvas.height; y += tileSize) {
            for (let x = 0; x < canvas.width; x += tileSize) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillStyle = color;
                
                // Organic, leaf-like shapes
                ctx.beginPath();
                ctx.ellipse(x + tileSize/2, y + tileSize/2, tileSize/2 - 2, tileSize/3 - 1, Math.random() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
                
                // Add natural highlight
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(x, y, tileSize - 2, 3);
            }
        }
        
        const forestFloorTexture = new THREE.CanvasTexture(canvas);
        forestFloorTexture.wrapS = THREE.RepeatWrapping;
        forestFloorTexture.wrapT = THREE.RepeatWrapping;
        forestFloorTexture.repeat.set(4, 4);
        
        const forestFloor = new THREE.MeshLambertMaterial({ map: forestFloorTexture, transparent: true, opacity: 0.8 });
        const forestWall = new THREE.MeshLambertMaterial({ color: 0x5a7a5a, transparent: true, opacity: 0.7 });
        const forestCeiling = new THREE.MeshLambertMaterial({ color: 0x3a5a3a, transparent: true, opacity: 0.5 });
        
        this.materials.set('forest_floor', forestFloor);
        this.materials.set('forest_wall', forestWall);
        this.materials.set('forest_ceiling', forestCeiling);
    }
    
    setupBillboardSystem() {
        this.billboardGeometry = new THREE.PlaneGeometry(1, 1);
        this.createBillboardMaterials();
    }
    
    createBillboardMaterials() {
        const mushroomMaterial = new THREE.MeshBasicMaterial({ color: 0x4a8a4a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
        const crystalSpriteMaterial = new THREE.MeshBasicMaterial({ color: 0x6a4aaa, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
        const orbMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaa4a, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
        const runeMaterial = new THREE.MeshBasicMaterial({ color: 0x8a6a8a, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        const treeMaterial = new THREE.MeshBasicMaterial({ color: 0x4a6a8a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
        
        this.materials.set('mushroom_billboard', mushroomMaterial);
        this.materials.set('crystal_billboard', crystalSpriteMaterial);
        this.materials.set('orb_billboard', orbMaterial);
        this.materials.set('rune_billboard', runeMaterial);
        this.materials.set('tree_billboard', treeMaterial);
    }
    
    getCurrentTheme() {
        for (const [themeName, themeData] of Object.entries(this.themes)) {
            if (this.currentFloor >= themeData.floors[0] && this.currentFloor <= themeData.floors[1]) {
                return themeData.name;
            }
        }
        return 'forest';
    }
    
    generateDungeon(floorNumber) {
        console.log(`Generating unified dungeon for floor ${floorNumber}...`);
        
        this.currentFloor = floorNumber;
        this.clearCurrentDungeon();
        
        const theme = this.getCurrentTheme();
        console.log(`Using theme: ${theme}`);
        
        // Phase 1: Plan room layout
        const roomLayout = this.planRoomLayout();
        
        // Phase 2: Create unified floor map
        const floorMap = this.createFloorMap(roomLayout);
        
        // Store floor map for collision detection
        this.currentFloorMap = floorMap;
        
        // Phase 3: Generate unified geometry
        this.generateUnifiedGeometry(floorMap, theme);
        
        // Phase 4: Add lighting and atmosphere
        this.addDungeonLighting(roomLayout, theme);
        this.addAtmosphericElements(roomLayout, theme);
        
        // Store dungeon data
        this.currentDungeon = {
            floor: floorNumber,
            theme: theme,
            roomLayout: roomLayout,
            floorMap: floorMap
        };
        
        console.log(`Unified dungeon floor ${floorNumber} generated successfully with collision detection`);
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
        const orbitalDistance = 25; // Grid cells from center
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
        
        // Cardinal rooms (chance-based)
        const cardinalChance = Math.min(0.3 + (this.currentFloor * 0.02), 0.8);
        const cardinalDistance = 25; // Additional distance from orbital
        
        orbitals.forEach(orbital => {
            if (Math.random() < cardinalChance) {
                const cardinalId = `cardinal_${orbital.dir}`;
                
                layout.rooms[cardinalId] = {
                    id: cardinalId,
                    type: 'cardinal',
                    direction: orbital.dir,
                    gridX: layout.rooms.center.gridX + orbital.offsetX + (orbital.offsetX > 0 ? cardinalDistance : orbital.offsetX < 0 ? -cardinalDistance : 0),
                    gridZ: layout.rooms.center.gridZ + orbital.offsetZ + (orbital.offsetZ > 0 ? cardinalDistance : orbital.offsetZ < 0 ? -cardinalDistance : 0),
                    size: this.roomTemplates.CARDINAL.size
                };
                
                // Connect to orbital
                layout.connections.push({
                    from: orbital.id,
                    to: cardinalId,
                    type: 'orbital_to_cardinal'
                });
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
        
        // Phase 2: Carve corridor paths
        roomLayout.connections.forEach(connection => {
            this.carveCorridorPath(floorMap, roomLayout.rooms[connection.from], roomLayout.rooms[connection.to]);
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
    
    carveCorridorPath(floorMap, roomA, roomB) {
        // Use L-shaped corridors: go horizontal first, then vertical
        const startX = roomA.gridX;
        const startZ = roomA.gridZ;
        const endX = roomB.gridX;
        const endZ = roomB.gridZ;
        
        const corridorHalfWidth = Math.floor(this.corridorWidth / 2);
        
        // Horizontal segment
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        
        for (let x = minX; x <= maxX; x++) {
            for (let zOffset = -corridorHalfWidth; zOffset <= corridorHalfWidth; zOffset++) {
                const z = startZ + zOffset;
                if (this.isValidGridPos(x, z)) {
                    floorMap[z][x] = true;
                }
            }
        }
        
        // Vertical segment
        const minZ = Math.min(startZ, endZ);
        const maxZ = Math.max(startZ, endZ);
        
        for (let z = minZ; z <= maxZ; z++) {
            for (let xOffset = -corridorHalfWidth; xOffset <= corridorHalfWidth; xOffset++) {
                const x = endX + xOffset;
                if (this.isValidGridPos(x, z)) {
                    floorMap[z][x] = true;
                }
            }
        }
        
        console.log(`Carved L-shaped corridor from (${startX},${startZ}) to (${endX},${endZ})`);
    }
    
    isValidGridPos(x, z) {
        return x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth;
    }
    
    generateUnifiedGeometry(floorMap, theme) {
        console.log('Generating unified geometry with solid collision...');
        
        const dungeonGroup = new THREE.Group();
        dungeonGroup.name = 'unified_dungeon';
        
        // Generate unified floor
        this.generateUnifiedFloor(dungeonGroup, floorMap, theme);
        
        // Generate walls around walkable areas
        this.generateWallsFromMap(dungeonGroup, floorMap, theme);
        
        // Generate unified ceiling
        this.generateUnifiedCeiling(dungeonGroup, floorMap, theme);
        
        this.scene.add(dungeonGroup);
        this.currentDungeonGroup = dungeonGroup;
    }
    
    generateUnifiedFloor(dungeonGroup, floorMap, theme) {
        const floorMaterial = this.materials.get(`${theme}_floor`);
        const floorSegments = [];
        
        // Find connected floor regions and create efficient meshes
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) {
                    // Create floor segment
                    const worldX = (x - this.gridWidth/2) * this.gridSize;
                    const worldZ = (z - this.gridDepth/2) * this.gridSize;
                    
                    const floorGeometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
                    const floorSegment = new THREE.Mesh(floorGeometry, floorMaterial);
                    floorSegment.rotation.x = -Math.PI / 2;
                    floorSegment.position.set(worldX, this.floorHeight, worldZ);
                    floorSegment.receiveShadow = true;
                    
                    dungeonGroup.add(floorSegment);
                }
            }
        }
        
        console.log('Generated unified floor geometry with collision');
    }
    
    generateWallsFromMap(dungeonGroup, floorMap, theme) {
        const wallMaterial = this.materials.get(`${theme}_wall`);
        const wallHeight = this.ceilingHeight;
        
        // March around perimeter of walkable areas to create walls
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) {
                    // Check all 4 directions for wall placement
                    const directions = [
                        { dx: 0, dz: -1, wallX: 0, wallZ: -this.gridSize/2, rotY: 0 }, // North wall
                        { dx: 0, dz: 1, wallX: 0, wallZ: this.gridSize/2, rotY: 0 },  // South wall  
                        { dx: 1, dz: 0, wallX: this.gridSize/2, wallZ: 0, rotY: Math.PI/2 }, // East wall
                        { dx: -1, dz: 0, wallX: -this.gridSize/2, wallZ: 0, rotY: Math.PI/2 } // West wall
                    ];
                    
                    directions.forEach(dir => {
                        const neighborX = x + dir.dx;
                        const neighborZ = z + dir.dz;
                        
                        // Place wall if neighbor is solid or out of bounds
                        if (!this.isValidGridPos(neighborX, neighborZ) || !floorMap[neighborZ][neighborX]) {
                            const worldX = (x - this.gridWidth/2) * this.gridSize + dir.wallX;
                            const worldZ = (z - this.gridDepth/2) * this.gridSize + dir.wallZ;
                            
                            const wallGeometry = new THREE.BoxGeometry(this.gridSize, wallHeight, 0.5);
                            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                            wall.position.set(worldX, this.floorHeight + wallHeight/2, worldZ);
                            wall.rotation.y = dir.rotY;
                            wall.castShadow = true;
                            wall.receiveShadow = true;
                            
                            dungeonGroup.add(wall);
                        }
                    });
                }
            }
        }
        
        console.log('Generated unified wall geometry with collision');
    }
    
    generateUnifiedCeiling(dungeonGroup, floorMap, theme) {
        const ceilingMaterial = this.materials.get(`${theme}_ceiling`);
        
        // Create ceiling segments over walkable areas
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) {
                    const worldX = (x - this.gridWidth/2) * this.gridSize;
                    const worldZ = (z - this.gridDepth/2) * this.gridSize;
                    
                    const ceilingGeometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
                    const ceilingSegment = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
                    ceilingSegment.rotation.x = Math.PI / 2;
                    ceilingSegment.position.set(worldX, this.floorHeight + this.ceilingHeight, worldZ);
                    ceilingSegment.receiveShadow = true;
                    
                    dungeonGroup.add(ceilingSegment);
                }
            }
        }
        
        console.log('Generated unified ceiling geometry with collision');
    }
    
    addDungeonLighting(roomLayout, theme) {
        console.log('Adding dungeon lighting...');
        
        // Add bright test lighting to each room
        Object.values(roomLayout.rooms).forEach(room => {
            this.addRoomLighting(room, theme);
        });
        
        // Add corridor lighting
        roomLayout.connections.forEach(connection => {
            this.addCorridorLighting(roomLayout.rooms[connection.from], roomLayout.rooms[connection.to], theme);
        });
    }
    
    addRoomLighting(room, theme) {
        const worldX = (room.gridX - this.gridWidth/2) * this.gridSize;
        const worldZ = (room.gridZ - this.gridDepth/2) * this.gridSize;
        
        // Super bright overhead light
        const brightLight = new THREE.PointLight(0xffffff, 3.0, 50);
        brightLight.position.set(worldX, this.floorHeight + this.ceilingHeight - 1, worldZ);
        this.currentDungeonGroup.add(brightLight);
        this.lightSources.push(brightLight);
        
        // Corner lights for even coverage
        const roomSize = room.size * this.gridSize;
        const cornerPositions = [
            [worldX - roomSize/3, this.floorHeight + this.ceilingHeight/2, worldZ - roomSize/3],
            [worldX + roomSize/3, this.floorHeight + this.ceilingHeight/2, worldZ - roomSize/3],
            [worldX - roomSize/3, this.floorHeight + this.ceilingHeight/2, worldZ + roomSize/3],
            [worldX + roomSize/3, this.floorHeight + this.ceilingHeight/2, worldZ + roomSize/3]
        ];
        
        cornerPositions.forEach(pos => {
            const cornerLight = new THREE.PointLight(0xffffff, 2.0, 30);
            cornerLight.position.set(...pos);
            this.currentDungeonGroup.add(cornerLight);
            this.lightSources.push(cornerLight);
        });
        
        console.log(`Added bright lighting to ${room.type} room at (${worldX}, ${worldZ})`);
    }
    
    addCorridorLighting(roomA, roomB, theme) {
        const startWorldX = (roomA.gridX - this.gridWidth/2) * this.gridSize;
        const startWorldZ = (roomA.gridZ - this.gridDepth/2) * this.gridSize;
        const endWorldX = (roomB.gridX - this.gridWidth/2) * this.gridSize;
        const endWorldZ = (roomB.gridZ - this.gridDepth/2) * this.gridSize;
        
        // Light at corner of L-shaped corridor
        const cornerLight = new THREE.PointLight(0xffffff, 2.5, 40);
        cornerLight.position.set(endWorldX, this.floorHeight + 4, startWorldZ); // Corner position
        this.currentDungeonGroup.add(cornerLight);
        this.lightSources.push(cornerLight);
        
        // Additional lights along corridor path
        const midWorldX = (startWorldX + endWorldX) / 2;
        const midWorldZ = (startWorldZ + endWorldZ) / 2;
        
        const midLight = new THREE.PointLight(0xffffff, 1.8, 25);
        midLight.position.set(midWorldX, this.floorHeight + 3.5, midWorldZ);
        this.currentDungeonGroup.add(midLight);
        this.lightSources.push(midLight);
    }
    
    addAtmosphericElements(roomLayout, theme) {
        console.log('Adding atmospheric elements...');
        
        Object.values(roomLayout.rooms).forEach(room => {
            this.addRoomAtmosphere(room, theme);
        });
    }
    
    addRoomAtmosphere(room, theme) {
        const worldX = (room.gridX - this.gridWidth/2) * this.gridSize;
        const worldZ = (room.gridZ - this.gridDepth/2) * this.gridSize;
        const roomSize = room.size * this.gridSize;
        
        // Add theme-specific atmospheric elements
        switch (theme) {
            case 'stone':
                this.addStoneAtmosphere(worldX, worldZ, roomSize, room.type);
                break;
            case 'crystal':
                this.addCrystalAtmosphere(worldX, worldZ, roomSize, room.type);
                break;
            case 'ruins':
                this.addRuinsAtmosphere(worldX, worldZ, roomSize, room.type);
                break;
            case 'crypt':
                this.addCryptAtmosphere(worldX, worldZ, roomSize, room.type);
                break;
            case 'forest':
                this.addForestAtmosphere(worldX, worldZ, roomSize, room.type);
                break;
        }
        
        // Add floating orbs to all rooms
        this.addFloatingOrbs(worldX, worldZ, roomSize, theme);
    }
    
    addStoneAtmosphere(worldX, worldZ, roomSize, roomType) {
        // Stone pillars
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const radius = roomSize * 0.3;
            
            const pillarX = worldX + Math.cos(angle) * radius;
            const pillarZ = worldZ + Math.sin(angle) * radius;
            
            const pillarGeometry = new THREE.CylinderGeometry(0.6, 0.8, 4, 8);
            const pillarMaterial = this.materials.get('stone_wall');
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(pillarX, this.floorHeight + 2, pillarZ);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            this.currentDungeonGroup.add(pillar);
            
            // Torch light on pillar
            const torchLight = new THREE.PointLight(0xff6644, 0.8, 8);
            torchLight.position.set(pillarX, this.floorHeight + 3.5, pillarZ);
            this.currentDungeonGroup.add(torchLight);
            this.lightSources.push(torchLight);
        }
    }
    
    addCrystalAtmosphere(worldX, worldZ, roomSize, roomType) {
        // Crystal formations
        for (let i = 0; i < 6; i++) {
            const crystalX = worldX + (Math.random() - 0.5) * roomSize * 0.8;
            const crystalZ = worldZ + (Math.random() - 0.5) * roomSize * 0.8;
            
            const crystalGeometry = new THREE.ConeGeometry(0.4, 2.5, 6);
            const crystalMaterial = new THREE.MeshPhongMaterial({
                color: 0x6c5ce7,
                transparent: true,
                opacity: 0.8,
                emissive: 0x2d1b69,
                emissiveIntensity: 0.3
            });
            
            const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
            crystal.position.set(crystalX, this.floorHeight + 1.25, crystalZ);
            crystal.rotation.y = Math.random() * Math.PI * 2;
            this.currentDungeonGroup.add(crystal);
            
            // Crystal glow
            const crystalLight = new THREE.PointLight(0x8a6ae7, 0.6, 6);
            crystalLight.position.set(crystalX, this.floorHeight + 2, crystalZ);
            this.currentDungeonGroup.add(crystalLight);
            this.lightSources.push(crystalLight);
        }
    }
    
    addRuinsAtmosphere(worldX, worldZ, roomSize, roomType) {
        // Runed stones
        for (let i = 0; i < 4; i++) {
            const runeX = worldX + (Math.random() - 0.5) * roomSize * 0.6;
            const runeZ = worldZ + (Math.random() - 0.5) * roomSize * 0.6;
            
            const runeGeometry = new THREE.BoxGeometry(1, 2, 0.3);
            const runeMaterial = new THREE.MeshLambertMaterial({
                color: 0x7a5a7a,
                emissive: 0x3a1a3a,
                emissiveIntensity: 0.2
            });
            
            const runeStone = new THREE.Mesh(runeGeometry, runeMaterial);
            runeStone.position.set(runeX, this.floorHeight + 1, runeZ);
            runeStone.rotation.y = Math.random() * Math.PI * 2;
            this.currentDungeonGroup.add(runeStone);
            
            // Rune glow
            const runeLight = new THREE.PointLight(0xaa6aaa, 0.4, 5);
            runeLight.position.set(runeX, this.floorHeight + 1.5, runeZ);
            this.currentDungeonGroup.add(runeLight);
            this.lightSources.push(runeLight);
        }
    }
    
    addCryptAtmosphere(worldX, worldZ, roomSize, roomType) {
        // Ancient braziers
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const radius = roomSize * 0.4;
            
            const brazierX = worldX + Math.cos(angle) * radius;
            const brazierZ = worldZ + Math.sin(angle) * radius;
            
            // Brazier stand
            const brazierGeometry = new THREE.CylinderGeometry(0.5, 0.3, 1.5, 8);
            const brazierMaterial = this.materials.get('crypt_wall');
            const brazier = new THREE.Mesh(brazierGeometry, brazierMaterial);
            brazier.position.set(brazierX, this.floorHeight + 0.75, brazierZ);
            this.currentDungeonGroup.add(brazier);
            
            // Green flame light
            const brazierLight = new THREE.PointLight(0x44aa44, 0.8, 8);
            brazierLight.position.set(brazierX, this.floorHeight + 2.5, brazierZ);
            this.currentDungeonGroup.add(brazierLight);
            this.lightSources.push(brazierLight);
        }
    }
    
    addForestAtmosphere(worldX, worldZ, roomSize, roomType) {
        // Glowing mushroom clusters
        for (let i = 0; i < 8; i++) {
            const mushroomX = worldX + (Math.random() - 0.5) * roomSize * 0.8;
            const mushroomZ = worldZ + (Math.random() - 0.5) * roomSize * 0.8;
            
            const mushroomGeometry = new THREE.SphereGeometry(0.3, 8, 6);
            const mushroomMaterial = new THREE.MeshBasicMaterial({
                color: 0x4a8a4a,
                transparent: true,
                opacity: 0.7,
                emissive: 0x2a5a2a,
                emissiveIntensity: 0.4
            });
            
            const mushroom = new THREE.Mesh(mushroomGeometry, mushroomMaterial);
            mushroom.position.set(mushroomX, this.floorHeight + 0.3, mushroomZ);
            mushroom.scale.set(1 + Math.random() * 0.5, 1, 1 + Math.random() * 0.5);
            this.currentDungeonGroup.add(mushroom);
            
            // Mushroom glow
            const mushroomLight = new THREE.PointLight(0x6aaa6a, 0.5, 4);
            mushroomLight.position.set(mushroomX, this.floorHeight + 1, mushroomZ);
            this.currentDungeonGroup.add(mushroomLight);
            this.lightSources.push(mushroomLight);
        }
    }
    
    addFloatingOrbs(worldX, worldZ, roomSize, theme) {
        const numOrbs = 2 + Math.floor(Math.random() * 3);
        const themeColor = this.getThemeColor(theme);
        
        for (let i = 0; i < numOrbs; i++) {
            const orbGeometry = new THREE.SphereGeometry(0.15, 12, 8);
            const orbMaterial = new THREE.MeshBasicMaterial({
                color: themeColor,
                transparent: true,
                opacity: 0.8,
                emissive: themeColor,
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
            
            // Orb light
            const orbLight = new THREE.PointLight(themeColor, 0.3, 5);
            orbLight.position.copy(orb.position);
            this.currentDungeonGroup.add(orbLight);
            this.lightSources.push(orbLight);
        }
    }
    
    getThemeColor(theme) {
        const colors = {
            stone: 0xff6644,
            crystal: 0x8a6ae7,
            ruins: 0xaa6aaa,
            crypt: 0x44aa44,
            forest: 0x6aaa6a
        };
        return colors[theme] || 0xffffff;
    }
    
    update(deltaTime) {
        // Update floating orbs and animated elements
        if (this.currentDungeonGroup) {
            this.currentDungeonGroup.traverse((child) => {
                if (child.userData.floatSpeed && child.userData.originalY !== undefined) {
                    child.position.y = child.userData.originalY + 
                        Math.sin(Date.now() * 0.001 * child.userData.floatSpeed) * child.userData.floatAmount;
                }
            });
        }
        
        // Animate light intensities
        this.lightSources.forEach(light => {
            if (light.userData.originalIntensity === undefined) {
                light.userData.originalIntensity = light.intensity;
                light.userData.flickerSpeed = 0.5 + Math.random() * 2;
            }
            
            const flicker = Math.sin(Date.now() * 0.001 * light.userData.flickerSpeed) * 0.1 + 1;
            light.intensity = light.userData.originalIntensity * flicker;
        });
    }
    
    clearCurrentDungeon() {
        if (this.currentDungeonGroup) {
            this.scene.remove(this.currentDungeonGroup);
        }
        
        this.lightSources.length = 0;
        this.billboardSprites.length = 0;
        this.currentFloorMap = null;
        
        console.log('Previous dungeon cleared');
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
