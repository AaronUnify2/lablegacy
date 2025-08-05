// Dungeon Generation System - src/systems/dungeon.js
// Comprehensive procedural dungeon generation with atmospheric lighting and billboard sprites

class DungeonSystem {
    constructor(scene, player) {
        console.log('Initializing Dungeon System...');
        
        this.scene = scene;
        this.player = player;
        
        // Current dungeon state
        this.currentFloor = 1;
        this.currentDungeon = null;
        this.rooms = new Map(); // roomId -> room data
        this.connections = new Map(); // connectionId -> hallway data
        
        // Room types and layout
        this.roomTypes = {
            CENTER: 'center',
            ORBITAL: 'orbital', 
            CARDINAL: 'cardinal'
        };
        
        // Theme progression based on floor depth
        this.themes = {
            STONE: { floors: [1, 10], name: 'stone' },
            CRYSTAL: { floors: [11, 20], name: 'crystal' },
            RUINS: { floors: [21, 30], name: 'ruins' },
            CRYPT: { floors: [31, 40], name: 'crypt' },
            FOREST: { floors: [41, 50], name: 'forest' }
        };
        
        // Texture management
        this.textureLoader = new THREE.TextureLoader();
        this.materials = new Map();
        this.billboardSprites = [];
        
        // Lighting system
        this.lightSources = [];
        this.ambientLightLevel = 0.1;
        
        // Room generation parameters
        this.roomSize = 20; // Base room size
        this.hallwayWidth = 4;
        this.ceilingHeight = 8;
        
        this.init();
    }
    
    init() {
        this.setupMaterials();
        this.setupBillboardSystem();
        console.log('Dungeon System initialized');
    }
    
    setupMaterials() {
        // Create materials for different themes and surfaces
        this.createStoneMaterials();
        this.createCrystalMaterials();
        this.createRuinsMaterials();
        this.createCryptMaterials();
        this.createForestMaterials();
    }
    
    createStoneMaterials() {
        // Stone dungeon materials (floors 1-10)
        const stoneFloor = new THREE.MeshLambertMaterial({
            color: 0x4a4a4a,
            transparent: true,
            opacity: 0.9
        });
        
        const stoneWall = new THREE.MeshLambertMaterial({
            color: 0x3a3a3a,
            transparent: true,
            opacity: 0.95
        });
        
        const stoneCeiling = new THREE.MeshLambertMaterial({
            color: 0x2a2a2a,
            transparent: true,
            opacity: 0.8
        });
        
        this.materials.set('stone_floor', stoneFloor);
        this.materials.set('stone_wall', stoneWall);
        this.materials.set('stone_ceiling', stoneCeiling);
    }
    
    createCrystalMaterials() {
        // Crystal cave materials (floors 11-20)
        const crystalFloor = new THREE.MeshPhongMaterial({
            color: 0x4a4a6a,
            transparent: true,
            opacity: 0.9,
            shininess: 30
        });
        
        const crystalWall = new THREE.MeshPhongMaterial({
            color: 0x5a5a7a,
            transparent: true,
            opacity: 0.95,
            shininess: 50
        });
        
        const crystalCeiling = new THREE.MeshPhongMaterial({
            color: 0x3a3a5a,
            transparent: true,
            opacity: 0.8,
            shininess: 20
        });
        
        this.materials.set('crystal_floor', crystalFloor);
        this.materials.set('crystal_wall', crystalWall);
        this.materials.set('crystal_ceiling', crystalCeiling);
    }
    
    createRuinsMaterials() {
        // Crystal ruins materials (floors 21-30)
        const ruinsFloor = new THREE.MeshLambertMaterial({
            color: 0x6a4a6a,
            transparent: true,
            opacity: 0.85
        });
        
        const ruinsWall = new THREE.MeshLambertMaterial({
            color: 0x7a5a7a,
            transparent: true,
            opacity: 0.9
        });
        
        const ruinsCeiling = new THREE.MeshLambertMaterial({
            color: 0x5a3a5a,
            transparent: true,
            opacity: 0.7
        });
        
        this.materials.set('ruins_floor', ruinsFloor);
        this.materials.set('ruins_wall', ruinsWall);
        this.materials.set('ruins_ceiling', ruinsCeiling);
    }
    
    createCryptMaterials() {
        // Crypt materials (floors 31-40) 
        const cryptFloor = new THREE.MeshLambertMaterial({
            color: 0x3a3a2a,
            transparent: true,
            opacity: 0.9
        });
        
        const cryptWall = new THREE.MeshLambertMaterial({
            color: 0x4a4a3a,
            transparent: true,
            opacity: 0.95
        });
        
        const cryptCeiling = new THREE.MeshLambertMaterial({
            color: 0x2a2a1a,
            transparent: true,
            opacity: 0.6
        });
        
        this.materials.set('crypt_floor', cryptFloor);
        this.materials.set('crypt_wall', cryptWall);
        this.materials.set('crypt_ceiling', cryptCeiling);
    }
    
    createForestMaterials() {
        // Psychic forest materials (floors 41-50)
        const forestFloor = new THREE.MeshLambertMaterial({
            color: 0x2a4a2a,
            transparent: true,
            opacity: 0.8
        });
        
        const forestWall = new THREE.MeshLambertMaterial({
            color: 0x3a5a3a,
            transparent: true,
            opacity: 0.7
        });
        
        const forestCeiling = new THREE.MeshLambertMaterial({
            color: 0x1a3a1a,
            transparent: true,
            opacity: 0.5
        });
        
        this.materials.set('forest_floor', forestFloor);
        this.materials.set('forest_wall', forestWall);
        this.materials.set('forest_ceiling', forestCeiling);
    }
    
    setupBillboardSystem() {
        // Create billboard sprite system for atmospheric elements
        this.billboardGeometry = new THREE.PlaneGeometry(1, 1);
        this.createBillboardMaterials();
    }
    
    createBillboardMaterials() {
        // Create materials for different billboard sprites
        
        // Glowing mushroom sprites
        const mushroomMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a8a4a,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        this.materials.set('mushroom_billboard', mushroomMaterial);
        
        // Crystal formation sprites
        const crystalSpriteMaterial = new THREE.MeshBasicMaterial({
            color: 0x6a4aaa,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        this.materials.set('crystal_billboard', crystalSpriteMaterial);
        
        // Floating orb sprites
        const orbMaterial = new THREE.MeshBasicMaterial({
            color: 0xaaaa4a,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        this.materials.set('orb_billboard', orbMaterial);
        
        // Rune stone sprites
        const runeMaterial = new THREE.MeshBasicMaterial({
            color: 0x8a6a8a,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.materials.set('rune_billboard', runeMaterial);
        
        // Psychic tree sprites
        const treeMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a6a8a,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        this.materials.set('tree_billboard', treeMaterial);
    }
    
    getCurrentTheme() {
        // Determine theme based on current floor
        for (const [themeName, themeData] of Object.entries(this.themes)) {
            if (this.currentFloor >= themeData.floors[0] && this.currentFloor <= themeData.floors[1]) {
                return themeData.name;
            }
        }
        return 'forest'; // Default to final theme for higher floors
    }
    
    generateDungeon(floorNumber) {
        console.log(`Generating dungeon for floor ${floorNumber}...`);
        
        this.currentFloor = floorNumber;
        this.clearCurrentDungeon();
        
        const theme = this.getCurrentTheme();
        console.log(`Using theme: ${theme}`);
        
        // Generate room layout
        const dungeonLayout = this.generateRoomLayout();
        
        // Create physical rooms
        this.createRooms(dungeonLayout, theme);
        
        // Create hallway connections
        this.createHallways(dungeonLayout, theme);
        
        // Add atmospheric lighting
        this.setupDungeonLighting(theme);
        
        // Place decorative elements
        this.placeAtmosphericElements(theme);
        
        // Store dungeon reference
        this.currentDungeon = {
            floor: floorNumber,
            theme: theme,
            layout: dungeonLayout,
            rooms: new Map(this.rooms),
            connections: new Map(this.connections)
        };
        
        console.log(`Dungeon floor ${floorNumber} generated successfully`);
        return this.currentDungeon;
    }
    
    generateRoomLayout() {
        // Create the center-orbital-cardinal room structure
        const layout = {
            center: { id: 'center', type: this.roomTypes.CENTER, position: { x: 0, z: 0 } },
            orbitals: {},
            cardinals: {}
        };
        
        // Create 4 orbital rooms (N, S, E, W)
        const orbitalPositions = [
            { dir: 'north', x: 0, z: -30 },
            { dir: 'south', x: 0, z: 30 },
            { dir: 'east', x: 30, z: 0 },
            { dir: 'west', x: -30, z: 0 }
        ];
        
        orbitalPositions.forEach(pos => {
            layout.orbitals[pos.dir] = {
                id: `orbital_${pos.dir}`,
                type: this.roomTypes.ORBITAL,
                position: { x: pos.x, z: pos.z },
                direction: pos.dir
            };
        });
        
        // Generate cardinal rooms (chance-based, connected to orbitals)
        const cardinalChance = Math.min(0.3 + (this.currentFloor * 0.02), 0.8); // Increases with floor
        
        Object.entries(layout.orbitals).forEach(([dir, orbital]) => {
            if (Math.random() < cardinalChance) {
                const cardinalPos = this.getCardinalPosition(orbital.position, dir);
                layout.cardinals[dir] = {
                    id: `cardinal_${dir}`,
                    type: this.roomTypes.CARDINAL,
                    position: cardinalPos,
                    direction: dir,
                    connectedTo: orbital.id
                };
            }
        });
        
        return layout;
    }
    
    getCardinalPosition(orbitalPos, direction) {
        // Position cardinal rooms further out from orbitals
        const distance = 50;
        const positions = {
            north: { x: orbitalPos.x, z: orbitalPos.z - distance },
            south: { x: orbitalPos.x, z: orbitalPos.z + distance },
            east: { x: orbitalPos.x + distance, z: orbitalPos.z },
            west: { x: orbitalPos.x - distance, z: orbitalPos.z }
        };
        return positions[direction];
    }
    
    createRooms(layout, theme) {
        // Create center room
        this.createRoom(layout.center, theme, true);
        
        // Create orbital rooms
        Object.values(layout.orbitals).forEach(room => {
            this.createRoom(room, theme, false);
        });
        
        // Create cardinal rooms
        Object.values(layout.cardinals).forEach(room => {
            this.createRoom(room, theme, false);
        });
    }
    
    createRoom(roomData, theme, isCenter = false) {
        const roomGroup = new THREE.Group();
        roomGroup.name = roomData.id;
        
        // Room dimensions based on type
        let roomWidth = this.roomSize;
        let roomDepth = this.roomSize;
        let roomHeight = this.ceilingHeight;
        
        if (roomData.type === this.roomTypes.CARDINAL) {
            // Cardinal rooms are larger
            roomWidth *= 1.5;
            roomDepth *= 1.5;
            roomHeight *= 1.2;
        } else if (isCenter) {
            // Center room is slightly larger
            roomWidth *= 1.3;
            roomDepth *= 1.3;
        }
        
        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = this.materials.get(`${theme}_floor`);
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(roomData.position.x, 0, roomData.position.z);
        floor.receiveShadow = true;
        roomGroup.add(floor);
        
        // Create walls
        this.createRoomWalls(roomGroup, roomData, theme, roomWidth, roomDepth, roomHeight);
        
        // Create ceiling
        const ceilingGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const ceilingMaterial = this.materials.get(`${theme}_ceiling`);
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(roomData.position.x, roomHeight, roomData.position.z);
        ceiling.receiveShadow = true;
        roomGroup.add(ceiling);
        
        // Add room-specific features
        if (isCenter) {
            this.addCenterRoomFeatures(roomGroup, roomData, theme);
        } else if (roomData.type === this.roomTypes.CARDINAL) {
            this.addCardinalRoomFeatures(roomGroup, roomData, theme);
        } else {
            this.addOrbitalRoomFeatures(roomGroup, roomData, theme);
        }
        
        this.scene.add(roomGroup);
        this.rooms.set(roomData.id, {
            ...roomData,
            group: roomGroup,
            dimensions: { width: roomWidth, depth: roomDepth, height: roomHeight }
        });
    }
    
    createRoomWalls(roomGroup, roomData, theme, width, depth, height) {
        const wallMaterial = this.materials.get(`${theme}_wall`);
        const wallThickness = 0.5;
        
        // Create 4 walls with doorway gaps
        const walls = [
            { pos: [roomData.position.x, height/2, roomData.position.z - depth/2], size: [width, height, wallThickness], dir: 'north' },
            { pos: [roomData.position.x, height/2, roomData.position.z + depth/2], size: [width, height, wallThickness], dir: 'south' },
            { pos: [roomData.position.x + width/2, height/2, roomData.position.z], size: [wallThickness, height, depth], dir: 'east' },
            { pos: [roomData.position.x - width/2, height/2, roomData.position.z], size: [wallThickness, height, depth], dir: 'west' }
        ];
        
        walls.forEach(wall => {
            // Check if this wall should have a doorway
            const hasDoorway = this.shouldHaveDoorway(roomData, wall.dir);
            
            if (!hasDoorway) {
                // Create solid wall
                const wallGeometry = new THREE.BoxGeometry(...wall.size);
                const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                wallMesh.position.set(...wall.pos);
                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;
                roomGroup.add(wallMesh);
            } else {
                // Create wall with doorway gap
                this.createWallWithDoorway(roomGroup, wall, wallMaterial);
            }
        });
    }
    
    shouldHaveDoorway(roomData, direction) {
        // Center room connects to all orbitals
        if (roomData.type === this.roomTypes.CENTER) {
            return true;
        }
        
        // Orbital rooms connect to center
        if (roomData.type === this.roomTypes.ORBITAL) {
            // Connect to center
            if ((direction === 'north' && roomData.direction === 'south') ||
                (direction === 'south' && roomData.direction === 'north') ||
                (direction === 'east' && roomData.direction === 'west') ||
                (direction === 'west' && roomData.direction === 'east')) {
                return true;
            }
            
            // Also check for cardinal room connections
            return this.hasCardinalConnection(roomData.id, direction);
        }
        
        // Cardinal rooms connect to their orbital
        if (roomData.type === this.roomTypes.CARDINAL) {
            return this.shouldCardinalConnectDirection(roomData, direction);
        }
        
        return false;
    }
    
    hasCardinalConnection(orbitalId, direction) {
        // Check if there's a cardinal room that connects in this direction
        for (const [_, cardinal] of Object.entries(this.currentDungeon?.layout?.cardinals || {})) {
            if (cardinal.connectedTo === orbitalId) {
                return this.getOppositeDirection(cardinal.direction) === direction;
            }
        }
        return false;
    }
    
    shouldCardinalConnectDirection(cardinalData, direction) {
        const oppositeOfCardinal = this.getOppositeDirection(cardinalData.direction);
        return direction === oppositeOfCardinal;
    }
    
    getOppositeDirection(direction) {
        const opposites = {
            north: 'south',
            south: 'north',
            east: 'west',
            west: 'east'
        };
        return opposites[direction];
    }
    
    createWallWithDoorway(roomGroup, wall, material) {
        // Create wall segments around doorway
        const doorwayWidth = 6;
        const doorwayHeight = 4;
        
        // Calculate wall segments
        const [x, y, z] = wall.pos;
        const [width, height, thickness] = wall.size;
        
        if (wall.dir === 'north' || wall.dir === 'south') {
            // Horizontal wall - create left and right segments
            const leftWidth = (width - doorwayWidth) / 2;
            const rightWidth = leftWidth;
            
            // Left segment
            const leftGeometry = new THREE.BoxGeometry(leftWidth, height, thickness);
            const leftMesh = new THREE.Mesh(leftGeometry, material);
            leftMesh.position.set(x - width/2 + leftWidth/2, y, z);
            leftMesh.castShadow = true;
            leftMesh.receiveShadow = true;
            roomGroup.add(leftMesh);
            
            // Right segment
            const rightGeometry = new THREE.BoxGeometry(rightWidth, height, thickness);
            const rightMesh = new THREE.Mesh(rightGeometry, material);
            rightMesh.position.set(x + width/2 - rightWidth/2, y, z);
            rightMesh.castShadow = true;
            rightMesh.receiveShadow = true;
            roomGroup.add(rightMesh);
            
            // Top segment over doorway
            const topGeometry = new THREE.BoxGeometry(doorwayWidth, height - doorwayHeight, thickness);
            const topMesh = new THREE.Mesh(topGeometry, material);
            topMesh.position.set(x, y + doorwayHeight/2, z);
            topMesh.castShadow = true;
            topMesh.receiveShadow = true;
            roomGroup.add(topMesh);
            
        } else {
            // Vertical wall - create front and back segments
            const frontDepth = (width - doorwayWidth) / 2;
            const backDepth = frontDepth;
            
            // Front segment
            const frontGeometry = new THREE.BoxGeometry(thickness, height, frontDepth);
            const frontMesh = new THREE.Mesh(frontGeometry, material);
            frontMesh.position.set(x, y, z - width/2 + frontDepth/2);
            frontMesh.castShadow = true;
            frontMesh.receiveShadow = true;
            roomGroup.add(frontMesh);
            
            // Back segment
            const backGeometry = new THREE.BoxGeometry(thickness, height, backDepth);
            const backMesh = new THREE.Mesh(backGeometry, material);
            backMesh.position.set(x, y, z + width/2 - backDepth/2);
            backMesh.castShadow = true;
            backMesh.receiveShadow = true;
            roomGroup.add(backMesh);
            
            // Top segment over doorway
            const topGeometry = new THREE.BoxGeometry(thickness, height - doorwayHeight, doorwayWidth);
            const topMesh = new THREE.Mesh(topGeometry, material);
            topMesh.position.set(x, y + doorwayHeight/2, z);
            topMesh.castShadow = true;
            topMesh.receiveShadow = true;
            roomGroup.add(topMesh);
        }
    }
    
    createHallways(layout, theme) {
        // Create hallways connecting center to orbitals
        Object.values(layout.orbitals).forEach(orbital => {
            this.createHallway(layout.center, orbital, theme);
        });
        
        // Create hallways connecting orbitals to cardinals
        Object.values(layout.cardinals).forEach(cardinal => {
            const connectedOrbital = layout.orbitals[cardinal.direction];
            if (connectedOrbital) {
                this.createHallway(connectedOrbital, cardinal, theme);
            }
        });
    }
    
    createHallway(roomA, roomB, theme) {
        const hallwayGroup = new THREE.Group();
        const connectionId = `${roomA.id}_to_${roomB.id}`;
        hallwayGroup.name = connectionId;
        
        // Calculate hallway path
        const start = roomA.position;
        const end = roomB.position;
        const distance = Math.sqrt((end.x - start.x) ** 2 + (end.z - start.z) ** 2);
        const midX = (start.x + end.x) / 2;
        const midZ = (start.z + end.z) / 2;
        
        // Create hallway geometry
        const hallwayWidth = this.hallwayWidth;
        const hallwayHeight = this.ceilingHeight * 0.8;
        
        // Determine if hallway is horizontal or vertical
        const isHorizontal = Math.abs(end.x - start.x) > Math.abs(end.z - start.z);
        
        let hallwayLength, hallwayRotation;
        if (isHorizontal) {
            hallwayLength = Math.abs(end.x - start.x);
            hallwayRotation = 0;
        } else {
            hallwayLength = Math.abs(end.z - start.z);
            hallwayRotation = Math.PI / 2;
        }
        
        // Create hallway floor
        const floorGeometry = new THREE.PlaneGeometry(hallwayLength, hallwayWidth);
        const floorMaterial = this.materials.get(`${theme}_floor`);
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.rotation.z = hallwayRotation;
        floor.position.set(midX, 0.01, midZ); // Slightly above room floors
        floor.receiveShadow = true;
        hallwayGroup.add(floor);
        
        // Create hallway walls
        this.createHallwayWalls(hallwayGroup, midX, midZ, hallwayLength, hallwayWidth, hallwayHeight, hallwayRotation, theme);
        
        // Create hallway ceiling
        const ceilingGeometry = new THREE.PlaneGeometry(hallwayLength, hallwayWidth);
        const ceilingMaterial = this.materials.get(`${theme}_ceiling`);
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.rotation.z = hallwayRotation;
        ceiling.position.set(midX, hallwayHeight, midZ);
        ceiling.receiveShadow = true;
        hallwayGroup.add(ceiling);
        
        // Add hallway lighting
        this.addHallwayLighting(hallwayGroup, midX, midZ, hallwayLength, theme);
        
        this.scene.add(hallwayGroup);
        this.connections.set(connectionId, {
            id: connectionId,
            roomA: roomA.id,
            roomB: roomB.id,
            group: hallwayGroup,
            path: { start, end, midX, midZ, distance }
        });
    }
    
    createHallwayWalls(group, centerX, centerZ, length, width, height, rotation, theme) {
        const wallMaterial = this.materials.get(`${theme}_wall`);
        const wallThickness = 0.3;
        
        // Create two parallel walls
        const wallGeometry = new THREE.BoxGeometry(length, height, wallThickness);
        
        // Calculate wall positions based on rotation
        const offset = width / 2;
        let wall1Pos, wall2Pos;
        
        if (rotation === 0) {
            // Horizontal hallway
            wall1Pos = [centerX, height/2, centerZ + offset];
            wall2Pos = [centerX, height/2, centerZ - offset];
        } else {
            // Vertical hallway
            wall1Pos = [centerX + offset, height/2, centerZ];
            wall2Pos = [centerX - offset, height/2, centerZ];
        }
        
        // Wall 1
        const wall1 = new THREE.Mesh(wallGeometry, wallMaterial);
        wall1.position.set(...wall1Pos);
        wall1.rotation.y = rotation;
        wall1.castShadow = true;
        wall1.receiveShadow = true;
        group.add(wall1);
        
        // Wall 2
        const wall2 = new THREE.Mesh(wallGeometry, wallMaterial);
        wall2.position.set(...wall2Pos);
        wall2.rotation.y = rotation;
        wall2.castShadow = true;
        wall2.receiveShadow = true;
        group.add(wall2);
    }
    
    addCenterRoomFeatures(roomGroup, roomData, theme) {
        // Add entrance portal (glowing exit back to hub)
        this.createEntrancePortal(roomGroup, roomData);
        
        // Add central light source
        this.addCentralLight(roomGroup, roomData, theme);
        
        // Add atmospheric elements specific to center
        this.addCenterAtmosphere(roomGroup, roomData, theme);
    }
    
    addOrbitalRoomFeatures(roomGroup, roomData, theme) {
        // Add key pedestals for progression
        this.createKeyPedestal(roomGroup, roomData, theme);
        
        // Add orbital-specific atmosphere
        this.addOrbitalAtmosphere(roomGroup, roomData, theme);
    }
    
    addCardinalRoomFeatures(roomGroup, roomData, theme) {
        // Add mini-boss arena features
        this.createBossArenaFeatures(roomGroup, roomData, theme);
        
        // Add cardinal-specific atmosphere
        this.addCardinalAtmosphere(roomGroup, roomData, theme);
    }
    
    createEntrancePortal(roomGroup, roomData) {
        // Create glowing portal back to hub
        const portalGeometry = new THREE.RingGeometry(1, 2, 16);
        const portalMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a8aff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        portal.position.set(roomData.position.x, 1, roomData.position.z);
        portal.rotation.x = -Math.PI / 2;
        roomGroup.add(portal);
        
        // Add portal light
        const portalLight = new THREE.PointLight(0x4a8aff, 1, 8);
        portalLight.position.set(roomData.position.x, 2, roomData.position.z);
        roomGroup.add(portalLight);
        this.lightSources.push(portalLight);
    }
    
    createKeyPedestal(roomGroup, roomData, theme) {
        // Create pedestal for key (visual placeholder)
        const pedestalGeometry = new THREE.CylinderGeometry(0.8, 1, 1.5, 8);
        const pedestalMaterial = this.materials.get(`${theme}_wall`);
        const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
        pedestal.position.set(roomData.position.x, 0.75, roomData.position.z + 5);
        pedestal.castShadow = true;
        pedestal.receiveShadow = true;
        roomGroup.add(pedestal);
        
        // Add pedestal light
        const pedestalLight = new THREE.PointLight(0xffaa44, 0.8, 6);
        pedestalLight.position.set(roomData.position.x, 3, roomData.position.z + 5);
        roomGroup.add(pedestalLight);
        this.lightSources.push(pedestalLight);
    }
    
    createBossArenaFeatures(roomGroup, roomData, theme) {
        // Create raised platform for boss encounters
        const platformGeometry = new THREE.CylinderGeometry(8, 8, 0.3, 16);
        const platformMaterial = this.materials.get(`${theme}_floor`);
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(roomData.position.x, 0.15, roomData.position.z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        roomGroup.add(platform);
        
        // Add dramatic lighting around platform
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = 10;
            const lightColor = this.getThemeColor(theme);
            
            const arenaLight = new THREE.PointLight(lightColor, 0.6, 12);
            arenaLight.position.set(
                roomData.position.x + Math.cos(angle) * radius,
                4,
                roomData.position.z + Math.sin(angle) * radius
            );
            roomGroup.add(arenaLight);
            this.lightSources.push(arenaLight);
        }
    }
    
    setupDungeonLighting(theme) {
        // Set ambient lighting based on theme
        this.scene.traverse((child) => {
            if (child.isAmbientLight) {
                child.intensity = this.getAmbientLightLevel(theme);
                child.color.setHex(this.getAmbientColor(theme));
            }
        });
    }
    
    addHallwayLighting(hallwayGroup, centerX, centerZ, length, theme) {
        // Add lights spilling from connected rooms
        const lightColor = this.getThemeColor(theme);
        const numLights = Math.max(2, Math.floor(length / 10));
        
        for (let i = 0; i < numLights; i++) {
            const progress = (i + 1) / (numLights + 1);
            const lightX = centerX;
            const lightZ = centerZ;
            
            const hallwayLight = new THREE.PointLight(lightColor, 0.4, 8);
            hallwayLight.position.set(lightX, 3, lightZ);
            hallwayGroup.add(hallwayLight);
            this.lightSources.push(hallwayLight);
        }
    }
    
    addCentralLight(roomGroup, roomData, theme) {
        // Add main light source for center room
        const lightColor = this.getThemeColor(theme);
        const centerLight = new THREE.PointLight(lightColor, 1.2, 15);
        centerLight.position.set(roomData.position.x, 6, roomData.position.z);
        roomGroup.add(centerLight);
        this.lightSources.push(centerLight);
    }
    
    placeAtmosphericElements(theme) {
        // Place billboard sprites and decorative elements throughout the dungeon
        this.rooms.forEach(room => {
            this.addRoomAtmosphere(room, theme);
        });
    }
    
    addRoomAtmosphere(room, theme) {
        const numElements = 3 + Math.floor(Math.random() * 4); // 3-6 elements per room
        
        for (let i = 0; i < numElements; i++) {
            this.placeBillboardSprite(room, theme);
        }
        
        // Add floating orbs
        this.addFloatingOrbs(room, theme);
    }
    
    addCenterAtmosphere(roomGroup, roomData, theme) {
        this.addThemeSpecificElements(roomGroup, roomData, theme, 'center');
    }
    
    addOrbitalAtmosphere(roomGroup, roomData, theme) {
        this.addThemeSpecificElements(roomGroup, roomData, theme, 'orbital');
    }
    
    addCardinalAtmosphere(roomGroup, roomData, theme) {
        this.addThemeSpecificElements(roomGroup, roomData, theme, 'cardinal');
    }
    
    addThemeSpecificElements(roomGroup, roomData, theme, roomType) {
        switch (theme) {
            case 'stone':
                this.addStoneElements(roomGroup, roomData, roomType);
                break;
            case 'crystal':
                this.addCrystalElements(roomGroup, roomData, roomType);
                break;
            case 'ruins':
                this.addRuinsElements(roomGroup, roomData, roomType);
                break;
            case 'crypt':
                this.addCryptElements(roomGroup, roomData, roomType);
                break;
            case 'forest':
                this.addForestElements(roomGroup, roomData, roomType);
                break;
        }
    }
    
    addStoneElements(roomGroup, roomData, roomType) {
        // Add stone-specific atmosphere: torches, stone formations
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
            const radius = 6 + Math.random() * 4;
            
            // Torch light
            const torchLight = new THREE.PointLight(0xff6644, 0.8, 6);
            torchLight.position.set(
                roomData.position.x + Math.cos(angle) * radius,
                2.5,
                roomData.position.z + Math.sin(angle) * radius
            );
            roomGroup.add(torchLight);
            this.lightSources.push(torchLight);
        }
    }
    
    addCrystalElements(roomGroup, roomData, roomType) {
        // Add crystal formations with glow
        for (let i = 0; i < 6; i++) {
            const x = roomData.position.x + (Math.random() - 0.5) * 15;
            const z = roomData.position.z + (Math.random() - 0.5) * 15;
            
            // Crystal formation
            const crystalGeometry = new THREE.ConeGeometry(0.4, 2.5, 6);
            const crystalMaterial = new THREE.MeshPhongMaterial({
                color: 0x6c5ce7,
                transparent: true,
                opacity: 0.8,
                emissive: 0x2d1b69,
                emissiveIntensity: 0.3
            });
            
            const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
            crystal.position.set(x, 1.25, z);
            crystal.rotation.y = Math.random() * Math.PI * 2;
            roomGroup.add(crystal);
            
            // Crystal glow light
            const crystalLight = new THREE.PointLight(0x8a6ae7, 0.6, 5);
            crystalLight.position.set(x, 2, z);
            roomGroup.add(crystalLight);
            this.lightSources.push(crystalLight);
        }
    }
    
    addRuinsElements(roomGroup, roomData, roomType) {
        // Add ruined crystal formations and mystical runes
        for (let i = 0; i < 4; i++) {
            const x = roomData.position.x + (Math.random() - 0.5) * 12;
            const z = roomData.position.z + (Math.random() - 0.5) * 12;
            
            // Runed stone
            const runeStoneGeometry = new THREE.BoxGeometry(1, 2, 0.3);
            const runeStoneMaterial = new THREE.MeshLambertMaterial({
                color: 0x7a5a7a,
                emissive: 0x3a1a3a,
                emissiveIntensity: 0.2
            });
            
            const runeStone = new THREE.Mesh(runeStoneGeometry, runeStoneMaterial);
            runeStone.position.set(x, 1, z);
            runeStone.rotation.y = Math.random() * Math.PI * 2;
            roomGroup.add(runeStone);
            
            // Rune glow
            const runeLight = new THREE.PointLight(0xaa6aaa, 0.4, 4);
            runeLight.position.set(x, 1.5, z);
            roomGroup.add(runeLight);
            this.lightSources.push(runeLight);
        }
    }
    
    addCryptElements(roomGroup, roomData, roomType) {
        // Add cryptic atmosphere: ancient braziers, bone piles
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Math.random() * 1;
            const radius = 8 + Math.random() * 3;
            
            // Brazier light (green flame)
            const brazierLight = new THREE.PointLight(0x44aa44, 0.7, 7);
            brazierLight.position.set(
                roomData.position.x + Math.cos(angle) * radius,
                3,
                roomData.position.z + Math.sin(angle) * radius
            );
            roomGroup.add(brazierLight);
            this.lightSources.push(brazierLight);
        }
    }
    
    addForestElements(roomGroup, roomData, roomType) {
        // Add psychic forest atmosphere: glowing mushrooms, spectral trees
        for (let i = 0; i < 8; i++) {
            const x = roomData.position.x + (Math.random() - 0.5) * 16;
            const z = roomData.position.z + (Math.random() - 0.5) * 16;
            
            // Glowing mushroom cluster
            const mushroomGeometry = new THREE.SphereGeometry(0.3, 8, 6);
            const mushroomMaterial = new THREE.MeshBasicMaterial({
                color: 0x4a8a4a,
                transparent: true,
                opacity: 0.7,
                emissive: 0x2a5a2a,
                emissiveIntensity: 0.4
            });
            
            const mushroom = new THREE.Mesh(mushroomGeometry, mushroomMaterial);
            mushroom.position.set(x, 0.3, z);
            mushroom.scale.set(1 + Math.random() * 0.5, 1, 1 + Math.random() * 0.5);
            roomGroup.add(mushroom);
            
            // Mushroom glow
            const mushroomLight = new THREE.PointLight(0x6aaa6a, 0.5, 3);
            mushroomLight.position.set(x, 1, z);
            roomGroup.add(mushroomLight);
            this.lightSources.push(mushroomLight);
        }
    }
    
    placeBillboardSprite(room, theme) {
        const spriteType = this.getBillboardType(theme);
        const material = this.materials.get(`${spriteType}_billboard`);
        
        if (!material) return;
        
        const sprite = new THREE.Mesh(this.billboardGeometry.clone(), material);
        
        // Random position within room bounds
        const roomSize = room.dimensions.width * 0.8; // Stay within room bounds
        sprite.position.set(
            room.position.x + (Math.random() - 0.5) * roomSize,
            1 + Math.random() * 3,
            room.position.z + (Math.random() - 0.5) * roomSize
        );
        
        // Random scale
        const scale = 0.5 + Math.random() * 1.5;
        sprite.scale.set(scale, scale, 1);
        
        // Add to room group
        room.group.add(sprite);
        this.billboardSprites.push(sprite);
    }
    
    addFloatingOrbs(room, theme) {
        const numOrbs = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numOrbs; i++) {
            const orbGeometry = new THREE.SphereGeometry(0.15, 12, 8);
            const orbMaterial = new THREE.MeshBasicMaterial({
                color: this.getThemeColor(theme),
                transparent: true,
                opacity: 0.8,
                emissive: this.getThemeColor(theme),
                emissiveIntensity: 0.5
            });
            
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);
            orb.position.set(
                room.position.x + (Math.random() - 0.5) * 10,
                4 + Math.random() * 2,
                room.position.z + (Math.random() - 0.5) * 10
            );
            
            // Add floating animation
            orb.userData = {
                originalY: orb.position.y,
                floatSpeed: 0.5 + Math.random() * 1.5,
                floatAmount: 0.3 + Math.random() * 0.4
            };
            
            room.group.add(orb);
            
            // Add orb light
            const orbLight = new THREE.PointLight(this.getThemeColor(theme), 0.3, 4);
            orbLight.position.copy(orb.position);
            room.group.add(orbLight);
            this.lightSources.push(orbLight);
        }
    }
    
    getBillboardType(theme) {
        const types = {
            stone: ['rune', 'orb'],
            crystal: ['crystal', 'orb'],
            ruins: ['rune', 'crystal'],
            crypt: ['rune', 'orb'],
            forest: ['mushroom', 'tree', 'orb']
        };
        
        const availableTypes = types[theme] || ['orb'];
        return availableTypes[Math.floor(Math.random() * availableTypes.length)];
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
    
    getAmbientLightLevel(theme) {
        const levels = {
            stone: 0.2,
            crystal: 0.25,
            ruins: 0.15,
            crypt: 0.1,
            forest: 0.3
        };
        return levels[theme] || 0.2;
    }
    
    getAmbientColor(theme) {
        const colors = {
            stone: 0x4a4a3a,
            crystal: 0x4a4a6a,
            ruins: 0x5a4a5a,
            crypt: 0x3a4a3a,
            forest: 0x4a5a4a
        };
        return colors[theme] || 0x404040;
    }
    
    update(deltaTime) {
        // Update floating orbs and other animated elements
        this.scene.traverse((child) => {
            if (child.userData.floatSpeed && child.userData.originalY !== undefined) {
                child.position.y = child.userData.originalY + 
                    Math.sin(Date.now() * 0.001 * child.userData.floatSpeed) * child.userData.floatAmount;
            }
        });
        
        // Update billboard sprites to face camera
        if (this.player && this.player.camera) {
            this.billboardSprites.forEach(sprite => {
                sprite.lookAt(this.player.camera.position);
            });
        }
        
        // Animate light intensities for atmospheric effect
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
        // Remove current dungeon from scene
        if (this.currentDungeon) {
            this.rooms.forEach(room => {
                if (room.group) {
                    this.scene.remove(room.group);
                }
            });
            
            this.connections.forEach(connection => {
                if (connection.group) {
                    this.scene.remove(connection.group);
                }
            });
        }
        
        // Clear data structures
        this.rooms.clear();
        this.connections.clear();
        this.lightSources.length = 0;
        this.billboardSprites.length = 0;
        
        console.log('Previous dungeon cleared');
    }
    
    getRoomAt(position) {
        // Find which room the player is currently in
        for (const [roomId, room] of this.rooms) {
            const distance = Math.sqrt(
                (position.x - room.position.x) ** 2 + 
                (position.z - room.position.z) ** 2
            );
            
            if (distance < room.dimensions.width / 2) {
                return room;
            }
        }
        return null;
    }
    
    getConnectedRooms(roomId) {
        // Get all rooms connected to the given room
        const connected = [];
        
        this.connections.forEach(connection => {
            if (connection.roomA === roomId) {
                connected.push(this.rooms.get(connection.roomB));
            } else if (connection.roomB === roomId) {
                connected.push(this.rooms.get(connection.roomA));
            }
        });
        
        return connected.filter(room => room !== undefined);
    }
}

// Make DungeonSystem available globally
window.DungeonSystem = DungeonSystem;
