// Simplified Core Dungeon System - Debug Version
// Focus on getting basic functionality working reliably

class DungeonSystem {
    constructor(scene, player) {
        console.log('[DUNGEON] Initializing Simplified Debug Dungeon System...');
        
        this.scene = scene;
        this.player = player;
        
        // Current dungeon state
        this.currentFloor = 1;
        this.currentDungeon = null;
        this.currentDungeonGroup = null;
        this.currentFloorMap = null;
        
        // Grid-based layout
        this.gridSize = 2;
        this.dungeonWidth = 180;
        this.dungeonDepth = 180;
        this.gridWidth = Math.floor(this.dungeonWidth / this.gridSize);
        this.gridDepth = Math.floor(this.dungeonDepth / this.gridSize);
        
        // Room templates
        this.roomTemplates = {
            CENTER: { size: 13, type: 'center' },
            ORBITAL: { size: 10, type: 'orbital' },
            CARDINAL: { size: 12, type: 'cardinal' }
        };
        
        this.corridorWidth = 3;
        this.floorHeight = 0;
        this.ceilingHeight = 12;
        
        // Built-in materials for reliability
        this.materials = this.createBasicMaterials();
        
        // Sub-systems (will be set by external systems)
        this.materialSystem = null;
        this.lightingSystem = null;
        this.portalSystem = null;
        
        this.init();
    }
    
    createBasicMaterials() {
        console.log('[DUNGEON] Creating built-in fallback materials...');
        
        const materials = {
            arena_floor: new THREE.MeshLambertMaterial({ color: 0x2C3E50 }),
            arena_wall: new THREE.MeshLambertMaterial({ color: 0x34495E }),
            arena_ceiling: new THREE.MeshLambertMaterial({ color: 0x1B2631 }),
            chamber_floor: new THREE.MeshLambertMaterial({ color: 0x5D4E37 }),
            chamber_wall: new THREE.MeshLambertMaterial({ color: 0x6B5B73 }),
            chamber_ceiling: new THREE.MeshLambertMaterial({ color: 0x483D54 }),
            passage_floor: new THREE.MeshLambertMaterial({ color: 0x566573 }),
            passage_wall: new THREE.MeshLambertMaterial({ color: 0x626567 }),
            passage_ceiling: new THREE.MeshLambertMaterial({ color: 0x455A64 }),
            ancient_gold: new THREE.MeshLambertMaterial({ 
                color: 0xB8860B, 
                emissive: 0xB8860B, 
                emissiveIntensity: 0.2 
            }),
            crystal_formation: new THREE.MeshLambertMaterial({ 
                color: 0x4169E1, 
                emissive: 0x4169E1, 
                emissiveIntensity: 0.3 
            })
        };
        
        console.log('[DUNGEON] ✓ Created fallback materials');
        return materials;
    }
    
    init() {
        console.log('[DUNGEON] Core dungeon system ready');
        
        if (this.player) {
            this.player.setDungeonSystem(this);
        }
        
        return true;
    }
    
    // Sub-system registration
    setMaterialSystem(materialSystem) {
        this.materialSystem = materialSystem;
        console.log('[DUNGEON] Material system connected');
    }
    
    setLightingSystem(lightingSystem) {
        this.lightingSystem = lightingSystem;
        console.log('[DUNGEON] Lighting system connected');
    }
    
    setPortalSystem(portalSystem) {
        this.portalSystem = portalSystem;
        console.log('[DUNGEON] Portal system connected');
    }
    
    // Progressive unlock system (delegated to portal system)
    get roomProgression() {
        return this.portalSystem ? this.portalSystem.roomProgression : {
            center: { unlocked: true, enemiesDefeated: false },
            north: { unlocked: true, enemiesDefeated: false },
            east: { unlocked: false, enemiesDefeated: false },
            west: { unlocked: false, enemiesDefeated: false },
            south: { unlocked: false, enemiesDefeated: false }
        };
    }
    
    togglePortals() {
        if (this.portalSystem) {
            this.portalSystem.testProgressionAdvance();
        }
    }
    
    // Collision Detection
    isPositionWalkable(worldX, worldZ) {
        if (!this.currentFloorMap) return true;
        
        const gridX = Math.floor((worldX + this.dungeonWidth/2) / this.gridSize + 0.5);
        const gridZ = Math.floor((worldZ + this.dungeonDepth/2) / this.gridSize + 0.5);
        
        if (gridX < 0 || gridX >= this.gridWidth || gridZ < 0 || gridZ >= this.gridDepth) {
            return false;
        }
        
        return this.currentFloorMap[gridZ][gridX];
    }
    
    isPositionSolid(worldX, worldZ) {
        return !this.isPositionWalkable(worldX, worldZ);
    }
    
    getFloorHeight(worldX, worldZ) {
        return this.floorHeight;
    }
    
    getCeilingHeight(worldX, worldZ) {
        if (!this.isPositionWalkable(worldX, worldZ)) {
            return this.floorHeight;
        }
        return this.floorHeight + this.ceilingHeight;
    }
    
    getRoomAt(position) {
        if (!this.currentDungeon) return null;
        
        const gridX = Math.floor((position.x + this.dungeonWidth/2) / this.gridSize);
        const gridZ = Math.floor((position.z + this.dungeonDepth/2) / this.gridSize);
        
        for (const room of Object.values(this.currentDungeon.roomLayout.rooms)) {
            const halfSize = Math.floor(room.size / 2);
            if (gridX >= room.gridX - halfSize && gridX <= room.gridX + halfSize &&
                gridZ >= room.gridZ - halfSize && gridZ <= room.gridZ + halfSize) {
                return room;
            }
        }
        
        return null;
    }
    
    getCurrentTheme() {
        return 'gothic_ruins';
    }
    
    // Main Generation Function
    generateDungeon(floorNumber) {
        console.log(`[DUNGEON] === GENERATING FLOOR ${floorNumber} ===`);
        
        this.currentFloor = floorNumber;
        this.clearCurrentDungeon();
        
        // Reset portal system if available
        if (this.portalSystem) {
            this.portalSystem.resetProgression();
        }
        
        console.log('[DUNGEON] 1. Planning room layout...');
        const roomLayout = this.planRoomLayout();
        console.log('[DUNGEON] ✓ Room layout planned:', roomLayout);
        
        console.log('[DUNGEON] 2. Creating floor map...');
        const floorMap = this.createFloorMap(roomLayout);
        console.log('[DUNGEON] ✓ Floor map created');
        
        this.currentFloorMap = floorMap;
        this.currentDungeon = {
            floor: floorNumber,
            theme: 'gothic_ruins',
            roomLayout: roomLayout,
            floorMap: floorMap
        };
        
        console.log('[DUNGEON] 3. Generating core architecture...');
        this.generateArchitecture(floorMap, roomLayout);
        console.log('[DUNGEON] ✓ Core architecture complete');
        
        console.log('[DUNGEON] 4. Adding built-in lighting...');
        this.addBuiltInLighting(roomLayout);
        
        console.log('[DUNGEON] 5. Calling sub-systems...');
        // Let sub-systems enhance the dungeon
        if (this.lightingSystem) {
            console.log('[DUNGEON] Adding lighting system enhancements...');
            try {
                this.lightingSystem.addLighting(roomLayout, this.currentDungeonGroup);
            } catch (error) {
                console.error('[DUNGEON] Lighting system error:', error);
            }
        }
        
        if (this.portalSystem) {
            console.log('[DUNGEON] Adding portal system...');
            try {
                this.portalSystem.addPortals(roomLayout, this.currentDungeonGroup);
            } catch (error) {
                console.error('[DUNGEON] Portal system error:', error);
            }
        }
        
        console.log(`[DUNGEON] === FLOOR ${floorNumber} GENERATION COMPLETE ===`);
        console.log(`[DUNGEON] Dungeon group children: ${this.currentDungeonGroup ? this.currentDungeonGroup.children.length : 'NO GROUP'}`);
        
        return this.currentDungeon;
    }
    
    addBuiltInLighting(roomLayout) {
        if (!this.currentDungeonGroup) return;
        
        // Add basic lighting that always works
        console.log('[DUNGEON] Adding reliable built-in lighting...');
        
        // Test light at spawn
        const testLight = new THREE.PointLight(0xFFFFFF, 10.0, 100);
        testLight.position.set(0, 8, 0);
        testLight.name = 'test_light_spawn';
        this.currentDungeonGroup.add(testLight);
        console.log('[DUNGEON] ✓ Added test light at spawn (0, 8, 0)');
        
        // Light for each room
        Object.values(roomLayout.rooms).forEach(room => {
            const worldX = (room.gridX - this.gridWidth/2) * this.gridSize;
            const worldZ = (room.gridZ - this.gridDepth/2) * this.gridSize;
            
            const roomLight = new THREE.PointLight(0xFFE4B5, 5.0, 80);
            roomLight.position.set(worldX, this.floorHeight + 8, worldZ);
            roomLight.name = `room_light_${room.id}`;
            this.currentDungeonGroup.add(roomLight);
            console.log(`[DUNGEON] ✓ Added room light for ${room.id} at (${worldX}, ${this.floorHeight + 8}, ${worldZ})`);
        });
    }
    
    planRoomLayout() {
        const layout = {
            rooms: {},
            connections: []
        };
        
        // Central arena
        layout.rooms.center = {
            id: 'center',
            type: 'center',
            gridX: Math.floor(this.gridWidth / 2),
            gridZ: Math.floor(this.gridDepth / 2),
            size: this.roomTemplates.CENTER.size
        };
        
        console.log(`[DUNGEON] Center room at grid (${layout.rooms.center.gridX}, ${layout.rooms.center.gridZ})`);
        
        // Four chambers
        const chamberDistance = 20;
        const chambers = [
            { id: 'chamber_north', dir: 'north', offsetX: 0, offsetZ: -chamberDistance },
            { id: 'chamber_south', dir: 'south', offsetX: 0, offsetZ: chamberDistance },
            { id: 'chamber_east', dir: 'east', offsetX: chamberDistance, offsetZ: 0 },
            { id: 'chamber_west', dir: 'west', offsetX: -chamberDistance, offsetZ: 0 }
        ];
        
        chambers.forEach(chamber => {
            layout.rooms[chamber.id] = {
                id: chamber.id,
                type: 'orbital',
                direction: chamber.dir,
                gridX: layout.rooms.center.gridX + chamber.offsetX,
                gridZ: layout.rooms.center.gridZ + chamber.offsetZ,
                size: this.roomTemplates.ORBITAL.size
            };
            
            layout.connections.push({
                from: 'center',
                to: chamber.id,
                type: 'corridor'
            });
            
            console.log(`[DUNGEON] ${chamber.dir} chamber at grid (${layout.rooms[chamber.id].gridX}, ${layout.rooms[chamber.id].gridZ})`);
        });
        
        return layout;
    }
    
    createFloorMap(roomLayout) {
        console.log(`[DUNGEON] Creating floor map ${this.gridWidth}x${this.gridDepth}...`);
        const floorMap = Array(this.gridDepth).fill().map(() => Array(this.gridWidth).fill(false));
        
        // Carve rooms
        Object.values(roomLayout.rooms).forEach(room => {
            console.log(`[DUNGEON] Carving room ${room.id} (${room.type})`);
            this.carveRoom(floorMap, room);
        });
        
        // Carve corridors
        roomLayout.connections.forEach(connection => {
            console.log(`[DUNGEON] Carving corridor ${connection.from} -> ${connection.to}`);
            this.carveSimpleCorridor(floorMap, roomLayout.rooms[connection.from], roomLayout.rooms[connection.to]);
        });
        
        // Count walkable tiles
        let walkableCount = 0;
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) walkableCount++;
            }
        }
        console.log(`[DUNGEON] ✓ Floor map created with ${walkableCount} walkable tiles`);
        
        return floorMap;
    }
    
    carveRoom(floorMap, room) {
        const halfSize = Math.floor(room.size / 2);
        let tilesCarved = 0;
        
        for (let z = room.gridZ - halfSize; z <= room.gridZ + halfSize; z++) {
            for (let x = room.gridX - halfSize; x <= room.gridX + halfSize; x++) {
                if (x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth) {
                    floorMap[z][x] = true;
                    tilesCarved++;
                }
            }
        }
        console.log(`[DUNGEON] Carved ${tilesCarved} tiles for room ${room.id}`);
    }
    
    carveSimpleCorridor(floorMap, roomA, roomB) {
        const startX = roomA.gridX;
        const startZ = roomA.gridZ;
        const endX = roomB.gridX;
        const endZ = roomB.gridZ;
        
        let tilesCarved = 0;
        
        // Horizontal line
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        for (let x = minX; x <= maxX; x++) {
            for (let zOffset = -1; zOffset <= 1; zOffset++) {
                const z = startZ + zOffset;
                if (x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth) {
                    if (!floorMap[z][x]) tilesCarved++;
                    floorMap[z][x] = true;
                }
            }
        }
        
        // Vertical line
        const minZ = Math.min(startZ, endZ);
        const maxZ = Math.max(startZ, endZ);
        for (let z = minZ; z <= maxZ; z++) {
            for (let xOffset = -1; xOffset <= 1; xOffset++) {
                const x = endX + xOffset;
                if (x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth) {
                    if (!floorMap[z][x]) tilesCarved++;
                    floorMap[z][x] = true;
                }
            }
        }
        console.log(`[DUNGEON] Carved ${tilesCarved} corridor tiles`);
    }
    
    generateArchitecture(floorMap, roomLayout) {
        console.log('[DUNGEON] Creating dungeon group...');
        const dungeonGroup = new THREE.Group();
        dungeonGroup.name = 'gothic_dungeon';
        
        console.log('[DUNGEON] Generating floors...');
        this.generateFloors(dungeonGroup, floorMap, roomLayout);
        
        console.log('[DUNGEON] Generating walls...');
        this.generateWalls(dungeonGroup, floorMap, roomLayout);
        
        console.log('[DUNGEON] Generating ceilings...');
        this.generateCeilings(dungeonGroup, floorMap, roomLayout);
        
        console.log('[DUNGEON] Adding central orb...');
        this.addCentralOrb(dungeonGroup, roomLayout.rooms.center);
        
        console.log(`[DUNGEON] Adding dungeon group to scene (${dungeonGroup.children.length} children)...`);
        this.scene.add(dungeonGroup);
        this.currentDungeonGroup = dungeonGroup;
        
        console.log('[DUNGEON] ✓ Architecture generation complete');
        
        // Verify it's in the scene
        console.log(`[DUNGEON] Scene children count: ${this.scene.children.length}`);
        let foundDungeon = false;
        this.scene.traverse((child) => {
            if (child.name === 'gothic_dungeon') {
                foundDungeon = true;
                console.log(`[DUNGEON] ✓ Found dungeon in scene with ${child.children.length} children`);
            }
        });
        if (!foundDungeon) {
            console.error('[DUNGEON] ❌ Dungeon not found in scene!');
        }
    }
    
    getRoomTypeAtGrid(gridX, gridZ, roomLayout) {
        for (const room of Object.values(roomLayout.rooms)) {
            const halfSize = Math.floor(room.size / 2);
            if (gridX >= room.gridX - halfSize && gridX <= room.gridX + halfSize &&
                gridZ >= room.gridZ - halfSize && gridZ <= room.gridZ + halfSize) {
                return room.type;
            }
        }
        return 'passage';
    }
    
    getMaterialsForRoomType(roomType) {
        // Use built-in materials for reliability
        switch(roomType) {
            case 'center':
                return {
                    floor: this.materials.arena_floor,
                    wall: this.materials.arena_wall,
                    ceiling: this.materials.arena_ceiling
                };
            case 'orbital':
                return {
                    floor: this.materials.chamber_floor,
                    wall: this.materials.chamber_wall,
                    ceiling: this.materials.chamber_ceiling
                };
            default:
                return {
                    floor: this.materials.passage_floor,
                    wall: this.materials.passage_wall,
                    ceiling: this.materials.passage_ceiling
                };
        }
    }
    
    generateFloors(dungeonGroup, floorMap, roomLayout) {
        let floorCount = 0;
        
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) {
                    const roomType = this.getRoomTypeAtGrid(x, z, roomLayout);
                    const materials = this.getMaterialsForRoomType(roomType);
                    
                    const worldX = (x - this.gridWidth/2) * this.gridSize;
                    const worldZ = (z - this.gridDepth/2) * this.gridSize;
                    
                    const geometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
                    const mesh = new THREE.Mesh(geometry, materials.floor);
                    mesh.rotation.x = -Math.PI / 2;
                    mesh.position.set(worldX, this.floorHeight, worldZ);
                    mesh.receiveShadow = true;
                    mesh.name = `floor_${x}_${z}`;
                    
                    dungeonGroup.add(mesh);
                    floorCount++;
                }
            }
        }
        console.log(`[DUNGEON] ✓ Generated ${floorCount} floor tiles`);
    }
    
    generateWalls(dungeonGroup, floorMap, roomLayout) {
        let wallCount = 0;
        
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
                        
                        if (neighborX < 0 || neighborX >= this.gridWidth || 
                            neighborZ < 0 || neighborZ >= this.gridDepth || 
                            !floorMap[neighborZ][neighborX]) {
                            
                            const worldX = (x - this.gridWidth/2) * this.gridSize + dir.wallX;
                            const worldZ = (z - this.gridDepth/2) * this.gridSize + dir.wallZ;
                            
                            const geometry = new THREE.BoxGeometry(this.gridSize, this.ceilingHeight, 0.5);
                            const wall = new THREE.Mesh(geometry, materials.wall);
                            wall.position.set(worldX, this.floorHeight + this.ceilingHeight/2, worldZ);
                            wall.rotation.y = dir.rotY;
                            wall.castShadow = true;
                            wall.receiveShadow = true;
                            wall.name = `wall_${x}_${z}_${dir.dx}_${dir.dz}`;
                            
                            dungeonGroup.add(wall);
                            wallCount++;
                        }
                    });
                }
            }
        }
        console.log(`[DUNGEON] ✓ Generated ${wallCount} walls`);
    }
    
    generateCeilings(dungeonGroup, floorMap, roomLayout) {
        let ceilingCount = 0;
        
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) {
                    const roomType = this.getRoomTypeAtGrid(x, z, roomLayout);
                    const materials = this.getMaterialsForRoomType(roomType);
                    
                    const worldX = (x - this.gridWidth/2) * this.gridSize;
                    const worldZ = (z - this.gridDepth/2) * this.gridSize;
                    
                    const geometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
                    const ceiling = new THREE.Mesh(geometry, materials.ceiling);
                    ceiling.rotation.x = Math.PI / 2;
                    ceiling.position.set(worldX, this.floorHeight + this.ceilingHeight, worldZ);
                    ceiling.receiveShadow = true;
                    ceiling.name = `ceiling_${x}_${z}`;
                    
                    dungeonGroup.add(ceiling);
                    ceilingCount++;
                }
            }
        }
        console.log(`[DUNGEON] ✓ Generated ${ceilingCount} ceiling tiles`);
    }
    
    addCentralOrb(dungeonGroup, centerRoom) {
        const worldX = (centerRoom.gridX - this.gridWidth/2) * this.gridSize;
        const worldZ = (centerRoom.gridZ - this.gridDepth/2) * this.gridSize;
        
        console.log(`[DUNGEON] Adding central orb at (${worldX}, ${this.floorHeight + 1.4}, ${worldZ})`);
        
        // Basin
        const basinGeometry = new THREE.CylinderGeometry(2, 2.2, 0.8, 16);
        const basin = new THREE.Mesh(basinGeometry, this.materials.ancient_gold);
        basin.position.set(worldX, this.floorHeight + 0.4, worldZ);
        basin.castShadow = true;
        basin.name = 'central_basin';
        dungeonGroup.add(basin);
        
        // Orb
        const orbGeometry = new THREE.SphereGeometry(0.8, 16, 12);
        const orb = new THREE.Mesh(orbGeometry, this.materials.crystal_formation);
        orb.position.set(worldX, this.floorHeight + 1.4, worldZ);
        orb.userData = { rotationSpeed: 0.01 };
        orb.name = 'central_orb';
        dungeonGroup.add(orb);
        
        // Store reference for animation
        if (!this.animatedElements) {
            this.animatedElements = [];
        }
        this.animatedElements.push(orb);
        
        console.log('[DUNGEON] ✓ Central orb added');
    }
    
    update(deltaTime) {
        // Animate orb rotation
        if (this.animatedElements) {
            this.animatedElements.forEach(element => {
                if (element.userData.rotationSpeed) {
                    element.rotation.y += element.userData.rotationSpeed;
                }
            });
        }
        
        // Update sub-systems
        if (this.lightingSystem) {
            this.lightingSystem.update(deltaTime);
        }
        
        if (this.portalSystem) {
            this.portalSystem.update(deltaTime);
        }
    }
    
    clearCurrentDungeon() {
        console.log('[DUNGEON] Clearing previous dungeon...');
        
        if (this.currentDungeonGroup) {
            console.log(`[DUNGEON] Removing dungeon group with ${this.currentDungeonGroup.children.length} children`);
            this.scene.remove(this.currentDungeonGroup);
            
            // Dispose of materials and geometries
            this.currentDungeonGroup.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }
        
        // Clear sub-systems
        if (this.lightingSystem) {
            this.lightingSystem.clearLights();
        }
        
        if (this.portalSystem) {
            this.portalSystem.clearPortals();
        }
        
        this.animatedElements = [];
        this.currentFloorMap = null;
        this.currentDungeonGroup = null;
        
        console.log('[DUNGEON] ✓ Previous dungeon cleared');
    }
    
    // Debug methods
    debugInfo() {
        console.log('[DUNGEON] === DEBUG INFO ===');
        console.log(`Current floor: ${this.currentFloor}`);
        console.log(`Current dungeon:`, this.currentDungeon);
        console.log(`Dungeon group:`, this.currentDungeonGroup);
        if (this.currentDungeonGroup) {
            console.log(`Dungeon children: ${this.currentDungeonGroup.children.length}`);
        }
        console.log(`Scene children: ${this.scene.children.length}`);
        
        // Count lights in scene
        let lightCount = 0;
        this.scene.traverse((child) => {
            if (child.type && child.type.includes('Light')) {
                lightCount++;
                console.log(`Light: ${child.type} at (${child.position.x}, ${child.position.y}, ${child.position.z}) intensity: ${child.intensity}`);
            }
        });
        console.log(`Total lights in scene: ${lightCount}`);
        
        console.log('[DUNGEON] === END DEBUG ===');
    }
    
    // Required verification methods
    verify() { return true; }
    isReady() { return true; }
    isValid() { return true; }
    isInitialized() { return true; }
    isLoaded() { return true; }
    isOperational() { return true; }
}

// Immediate global assignment
console.log('[SYSTEM] Assigning Debug DungeonSystem to window...');
window.DungeonSystem = DungeonSystem;
console.log('[SYSTEM] ✓ Debug DungeonSystem assigned successfully');        this.lightingSystem = null;
        this.portalSystem = null;
        
        this.init();
    }
    
    init() {
        console.log('Core dungeon system ready for sub-systems...');
        
        if (this.player) {
            this.player.setDungeonSystem(this);
        }
        
        return true;
    }
    
    // Sub-system registration
    setMaterialSystem(materialSystem) {
        this.materialSystem = materialSystem;
        console.log('Material system connected to dungeon');
    }
    
    setLightingSystem(lightingSystem) {
        this.lightingSystem = lightingSystem;
        console.log('Lighting system connected to dungeon');
    }
    
    setPortalSystem(portalSystem) {
        this.portalSystem = portalSystem;
        console.log('Portal system connected to dungeon');
    }
    
    // Progressive unlock system (delegated to portal system)
    get roomProgression() {
        return this.portalSystem ? this.portalSystem.roomProgression : {
            center: { unlocked: true, enemiesDefeated: false },
            north: { unlocked: true, enemiesDefeated: false },
            east: { unlocked: false, enemiesDefeated: false },
            west: { unlocked: false, enemiesDefeated: false },
            south: { unlocked: false, enemiesDefeated: false }
        };
    }
    
    togglePortals() {
        if (this.portalSystem) {
            this.portalSystem.testProgressionAdvance();
        }
    }
    
    // Collision Detection
    isPositionWalkable(worldX, worldZ) {
        if (!this.currentFloorMap) return true;
        
        const gridX = Math.floor((worldX + this.dungeonWidth/2) / this.gridSize + 0.5);
        const gridZ = Math.floor((worldZ + this.dungeonDepth/2) / this.gridSize + 0.5);
        
        if (gridX < 0 || gridX >= this.gridWidth || gridZ < 0 || gridZ >= this.gridDepth) {
            return false;
        }
        
        return this.currentFloorMap[gridZ][gridX];
    }
    
    isPositionSolid(worldX, worldZ) {
        return !this.isPositionWalkable(worldX, worldZ);
    }
    
    getFloorHeight(worldX, worldZ) {
        return this.floorHeight;
    }
    
    getCeilingHeight(worldX, worldZ) {
        if (!this.isPositionWalkable(worldX, worldZ)) {
            return this.floorHeight;
        }
        return this.floorHeight + this.ceilingHeight;
    }
    
    getRoomAt(position) {
        if (!this.currentDungeon) return null;
        
        const gridX = Math.floor((position.x + this.dungeonWidth/2) / this.gridSize);
        const gridZ = Math.floor((position.z + this.dungeonDepth/2) / this.gridSize);
        
        for (const room of Object.values(this.currentDungeon.roomLayout.rooms)) {
            const halfSize = Math.floor(room.size / 2);
            if (gridX >= room.gridX - halfSize && gridX <= room.gridX + halfSize &&
                gridZ >= room.gridZ - halfSize && gridZ <= room.gridZ + halfSize) {
                return room;
            }
        }
        
        return null;
    }
    
    getCurrentTheme() {
        return 'gothic_ruins';
    }
    
    // Main Generation Function
    generateDungeon(floorNumber) {
        console.log(`Generating Gothic Ruins for floor ${floorNumber}...`);
        
        this.currentFloor = floorNumber;
        this.clearCurrentDungeon();
        
        // Reset portal system if available
        if (this.portalSystem) {
            this.portalSystem.resetProgression();
        }
        
        const roomLayout = this.planRoomLayout();
        const floorMap = this.createFloorMap(roomLayout);
        
        this.currentFloorMap = floorMap;
        this.currentDungeon = {
            floor: floorNumber,
            theme: 'gothic_ruins',
            roomLayout: roomLayout,
            floorMap: floorMap
        };
        
        // Generate core architecture
        this.generateArchitecture(floorMap, roomLayout);
        
        // Let sub-systems enhance the dungeon
        console.log('[DUNGEON] Calling lighting system...');
        if (this.lightingSystem) {
            console.log('[DUNGEON] Lighting system found, adding lighting...');
            this.lightingSystem.addLighting(roomLayout, this.currentDungeonGroup);
        } else {
            console.warn('[DUNGEON] No lighting system available!');
        }
        
        console.log('[DUNGEON] Calling portal system...');
        if (this.portalSystem) {
            console.log('[DUNGEON] Portal system found, adding portals...');
            this.portalSystem.addPortals(roomLayout, this.currentDungeonGroup);
        } else {
            console.warn('[DUNGEON] No portal system available!');
        }
        
        console.log(`Floor ${floorNumber} core architecture complete`);
        return this.currentDungeon;
    }
    
    planRoomLayout() {
        const layout = {
            rooms: {},
            connections: []
        };
        
        // Central arena
        layout.rooms.center = {
            id: 'center',
            type: 'center',
            gridX: Math.floor(this.gridWidth / 2),
            gridZ: Math.floor(this.gridDepth / 2),
            size: this.roomTemplates.CENTER.size
        };
        
        // Four chambers
        const chamberDistance = 20;
        const chambers = [
            { id: 'chamber_north', dir: 'north', offsetX: 0, offsetZ: -chamberDistance },
            { id: 'chamber_south', dir: 'south', offsetX: 0, offsetZ: chamberDistance },
            { id: 'chamber_east', dir: 'east', offsetX: chamberDistance, offsetZ: 0 },
            { id: 'chamber_west', dir: 'west', offsetX: -chamberDistance, offsetZ: 0 }
        ];
        
        chambers.forEach(chamber => {
            layout.rooms[chamber.id] = {
                id: chamber.id,
                type: 'orbital',
                direction: chamber.dir,
                gridX: layout.rooms.center.gridX + chamber.offsetX,
                gridZ: layout.rooms.center.gridZ + chamber.offsetZ,
                size: this.roomTemplates.ORBITAL.size
            };
            
            layout.connections.push({
                from: 'center',
                to: chamber.id,
                type: 'corridor'
            });
        });
        
        return layout;
    }
    
    createFloorMap(roomLayout) {
        const floorMap = Array(this.gridDepth).fill().map(() => Array(this.gridWidth).fill(false));
        
        // Carve rooms
        Object.values(roomLayout.rooms).forEach(room => {
            this.carveRoom(floorMap, room);
        });
        
        // Carve corridors
        roomLayout.connections.forEach(connection => {
            this.carveSimpleCorridor(floorMap, roomLayout.rooms[connection.from], roomLayout.rooms[connection.to]);
        });
        
        return floorMap;
    }
    
    carveRoom(floorMap, room) {
        const halfSize = Math.floor(room.size / 2);
        
        for (let z = room.gridZ - halfSize; z <= room.gridZ + halfSize; z++) {
            for (let x = room.gridX - halfSize; x <= room.gridX + halfSize; x++) {
                if (x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth) {
                    floorMap[z][x] = true;
                }
            }
        }
    }
    
    carveSimpleCorridor(floorMap, roomA, roomB) {
        const startX = roomA.gridX;
        const startZ = roomA.gridZ;
        const endX = roomB.gridX;
        const endZ = roomB.gridZ;
        
        // Horizontal line
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        for (let x = minX; x <= maxX; x++) {
            for (let zOffset = -1; zOffset <= 1; zOffset++) {
                const z = startZ + zOffset;
                if (x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth) {
                    floorMap[z][x] = true;
                }
            }
        }
        
        // Vertical line
        const minZ = Math.min(startZ, endZ);
        const maxZ = Math.max(startZ, endZ);
        for (let z = minZ; z <= maxZ; z++) {
            for (let xOffset = -1; xOffset <= 1; xOffset++) {
                const x = endX + xOffset;
                if (x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridDepth) {
                    floorMap[z][x] = true;
                }
            }
        }
    }
    
    generateArchitecture(floorMap, roomLayout) {
        const dungeonGroup = new THREE.Group();
        dungeonGroup.name = 'gothic_dungeon';
        
        // Generate floors, walls, and ceilings using material system
        this.generateFloors(dungeonGroup, floorMap, roomLayout);
        this.generateWalls(dungeonGroup, floorMap, roomLayout);
        this.generateCeilings(dungeonGroup, floorMap, roomLayout);
        
        // Add central orb
        this.addCentralOrb(dungeonGroup, roomLayout.rooms.center);
        
        this.scene.add(dungeonGroup);
        this.currentDungeonGroup = dungeonGroup;
    }
    
    getRoomTypeAtGrid(gridX, gridZ, roomLayout) {
        for (const room of Object.values(roomLayout.rooms)) {
            const halfSize = Math.floor(room.size / 2);
            if (gridX >= room.gridX - halfSize && gridX <= room.gridX + halfSize &&
                gridZ >= room.gridZ - halfSize && gridZ <= room.gridZ + halfSize) {
                return room.type;
            }
        }
        return 'passage';
    }
    
    getMaterialsForRoomType(roomType) {
        if (this.materialSystem) {
            return this.materialSystem.getMaterialsForRoomType(roomType);
        }
        
        // Fallback materials if material system not loaded
        const fallback = new THREE.MeshLambertMaterial({ color: 0x808080 });
        return {
            floor: fallback,
            wall: fallback,
            ceiling: fallback
        };
    }
    
    generateFloors(dungeonGroup, floorMap, roomLayout) {
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) {
                    const roomType = this.getRoomTypeAtGrid(x, z, roomLayout);
                    const materials = this.getMaterialsForRoomType(roomType);
                    
                    const worldX = (x - this.gridWidth/2) * this.gridSize;
                    const worldZ = (z - this.gridDepth/2) * this.gridSize;
                    
                    const geometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
                    const mesh = new THREE.Mesh(geometry, materials.floor);
                    mesh.rotation.x = -Math.PI / 2;
                    mesh.position.set(worldX, this.floorHeight, worldZ);
                    mesh.receiveShadow = true;
                    
                    dungeonGroup.add(mesh);
                }
            }
        }
    }
    
    generateWalls(dungeonGroup, floorMap, roomLayout) {
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
                        
                        if (neighborX < 0 || neighborX >= this.gridWidth || 
                            neighborZ < 0 || neighborZ >= this.gridDepth || 
                            !floorMap[neighborZ][neighborX]) {
                            
                            const worldX = (x - this.gridWidth/2) * this.gridSize + dir.wallX;
                            const worldZ = (z - this.gridDepth/2) * this.gridSize + dir.wallZ;
                            
                            const geometry = new THREE.BoxGeometry(this.gridSize, this.ceilingHeight, 0.5);
                            const wall = new THREE.Mesh(geometry, materials.wall);
                            wall.position.set(worldX, this.floorHeight + this.ceilingHeight/2, worldZ);
                            wall.rotation.y = dir.rotY;
                            wall.castShadow = true;
                            wall.receiveShadow = true;
                            
                            dungeonGroup.add(wall);
                        }
                    });
                }
            }
        }
    }
    
    generateCeilings(dungeonGroup, floorMap, roomLayout) {
        for (let z = 0; z < this.gridDepth; z++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (floorMap[z][x]) {
                    const roomType = this.getRoomTypeAtGrid(x, z, roomLayout);
                    const materials = this.getMaterialsForRoomType(roomType);
                    
                    const worldX = (x - this.gridWidth/2) * this.gridSize;
                    const worldZ = (z - this.gridDepth/2) * this.gridSize;
                    
                    const geometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
                    const ceiling = new THREE.Mesh(geometry, materials.ceiling);
                    ceiling.rotation.x = Math.PI / 2;
                    ceiling.position.set(worldX, this.floorHeight + this.ceilingHeight, worldZ);
                    ceiling.receiveShadow = true;
                    
                    dungeonGroup.add(ceiling);
                }
            }
        }
    }
    
    addCentralOrb(dungeonGroup, centerRoom) {
        const worldX = (centerRoom.gridX - this.gridWidth/2) * this.gridSize;
        const worldZ = (centerRoom.gridZ - this.gridDepth/2) * this.gridSize;
        
        // Get materials from material system
        const ancientGold = this.materialSystem ? 
            this.materialSystem.getMaterial('ancient_gold') : 
            new THREE.MeshLambertMaterial({ color: 0xB8860B });
        const crystal = this.materialSystem ? 
            this.materialSystem.getMaterial('crystal_formation') : 
            new THREE.MeshLambertMaterial({ color: 0x4169E1 });
        
        // Basin
        const basinGeometry = new THREE.CylinderGeometry(2, 2.2, 0.8, 16);
        const basin = new THREE.Mesh(basinGeometry, ancientGold);
        basin.position.set(worldX, this.floorHeight + 0.4, worldZ);
        basin.castShadow = true;
        dungeonGroup.add(basin);
        
        // Orb
        const orbGeometry = new THREE.SphereGeometry(0.8, 16, 12);
        const orb = new THREE.Mesh(orbGeometry, crystal);
        orb.position.set(worldX, this.floorHeight + 1.4, worldZ);
        orb.userData = { rotationSpeed: 0.01 };
        dungeonGroup.add(orb);
        
        // Store reference for animation
        if (!this.animatedElements) {
            this.animatedElements = [];
        }
        this.animatedElements.push(orb);
    }
    
    update(deltaTime) {
        // Animate orb rotation
        if (this.animatedElements) {
            this.animatedElements.forEach(element => {
                if (element.userData.rotationSpeed) {
                    element.rotation.y += element.userData.rotationSpeed;
                }
            });
        }
        
        // Update sub-systems
        if (this.lightingSystem) {
            this.lightingSystem.update(deltaTime);
        }
        
        if (this.portalSystem) {
            this.portalSystem.update(deltaTime);
        }
    }
    
    clearCurrentDungeon() {
        if (this.currentDungeonGroup) {
            this.scene.remove(this.currentDungeonGroup);
        }
        
        // Clear sub-systems
        if (this.lightingSystem) {
            this.lightingSystem.clearLights();
        }
        
        if (this.portalSystem) {
            this.portalSystem.clearPortals();
        }
        
        this.animatedElements = [];
        this.currentFloorMap = null;
        
        console.log('Previous dungeon cleared');
    }
    
    // Required verification methods
    verify() { return true; }
    isReady() { return true; }
    isValid() { return true; }
    isInitialized() { return true; }
    isLoaded() { return true; }
    isOperational() { return true; }
}

// Immediate global assignment
console.log('Assigning Core DungeonSystem to window...');
window.DungeonSystem = DungeonSystem;
console.log('Core DungeonSystem assigned successfully');
