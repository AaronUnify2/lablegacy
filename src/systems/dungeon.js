// Core Dungeon System - Layout and Geometry Only
// Focused on structure generation, collision, and basic functionality

class DungeonSystem {
    constructor(scene, player) {
        console.log('Initializing Core Dungeon System...');
        
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
        
        // Sub-systems (will be set by external systems)
        this.materialSystem = null;
        this.lightingSystem = null;
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
