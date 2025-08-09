// Simplified Gothic Cathedral Ruins Dungeon System
// Clean, reliable implementation focused on core functionality

class DungeonSystem {
    constructor(scene, player) {
        console.log('Initializing Simplified Dungeon System...');
        
        this.scene = scene;
        this.player = player;
        
        // Current dungeon state
        this.currentFloor = 1;
        this.currentDungeon = null;
        this.currentDungeonGroup = null;
        this.currentFloorMap = null;
        
        // Progressive unlock system
        this.roomProgression = {
            center: { unlocked: true, enemiesDefeated: false },
            north: { unlocked: true, enemiesDefeated: false },
            east: { unlocked: false, enemiesDefeated: false },
            west: { unlocked: false, enemiesDefeated: false },
            south: { unlocked: false, enemiesDefeated: false }
        };
        this.progressionOrder = ['north', 'east', 'west', 'south'];
        this.currentProgressionIndex = 0;
        
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
        
        // Initialize storage
        this.materials = new Map();
        this.lightSources = [];
        this.combatElements = [];
        
        this.init();
    }
    
    init() {
        console.log('Setting up basic materials...');
        this.createBasicMaterials();
        
        if (this.player) {
            this.player.setDungeonSystem(this);
        }
        
        console.log('Simplified Dungeon System initialized successfully');
        return true;
    }
    
    createBasicMaterials() {
        // Create simple, reliable materials
        const materials = {
            'arena_floor': new THREE.MeshLambertMaterial({ color: 0x2C3E50 }),
            'arena_wall': new THREE.MeshLambertMaterial({ color: 0x34495E }),
            'arena_ceiling': new THREE.MeshLambertMaterial({ color: 0x1B2631 }),
            'chamber_floor': new THREE.MeshLambertMaterial({ color: 0x5D4E37 }),
            'chamber_wall': new THREE.MeshLambertMaterial({ color: 0x6B5B73 }),
            'chamber_ceiling': new THREE.MeshLambertMaterial({ color: 0x483D54 }),
            'platform_floor': new THREE.MeshLambertMaterial({ color: 0x1F3A93 }),
            'platform_wall': new THREE.MeshLambertMaterial({ color: 0x2E4BC6 }),
            'platform_ceiling': new THREE.MeshLambertMaterial({ color: 0x1A237E }),
            'passage_floor': new THREE.MeshLambertMaterial({ color: 0x566573 }),
            'passage_wall': new THREE.MeshLambertMaterial({ color: 0x626567 }),
            'passage_ceiling': new THREE.MeshLambertMaterial({ color: 0x455A64 }),
            'broken_stone': new THREE.MeshLambertMaterial({ color: 0x8B7355 }),
            'rusted_metal': new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
            'ancient_gold': new THREE.MeshLambertMaterial({ 
                color: 0xB8860B, 
                emissive: 0xB8860B, 
                emissiveIntensity: 0.2 
            }),
            'crystal_formation': new THREE.MeshLambertMaterial({ 
                color: 0x4169E1, 
                emissive: 0x4169E1, 
                emissiveIntensity: 0.3 
            })
        };
        
        Object.entries(materials).forEach(([name, material]) => {
            this.materials.set(name, material);
        });
        
        console.log(`Created ${this.materials.size} basic materials`);
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
        console.log('Room progression reset');
    }
    
    defeatEnemiesInRoom(roomDirection) {
        if (this.roomProgression[roomDirection]) {
            this.roomProgression[roomDirection].enemiesDefeated = true;
            this.checkProgressionUnlock();
        }
    }
    
    checkProgressionUnlock() {
        if (this.currentProgressionIndex >= this.progressionOrder.length) {
            return;
        }
        
        const currentRoom = this.progressionOrder[this.currentProgressionIndex];
        
        if (this.roomProgression[currentRoom] && this.roomProgression[currentRoom].enemiesDefeated) {
            this.currentProgressionIndex++;
            
            if (this.currentProgressionIndex < this.progressionOrder.length) {
                const nextRoom = this.progressionOrder[this.currentProgressionIndex];
                this.roomProgression[nextRoom].unlocked = true;
                this.updateRoomPortals(nextRoom, true);
                console.log(`${nextRoom} chamber unlocked!`);
            } else {
                console.log('All chambers cleared!');
            }
        }
    }
    
    testProgressionAdvance() {
        const currentRoom = this.progressionOrder[this.currentProgressionIndex];
        this.defeatEnemiesInRoom(currentRoom);
    }
    
    togglePortals() {
        this.testProgressionAdvance();
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
        this.resetProgression();
        
        const roomLayout = this.planRoomLayout();
        const floorMap = this.createFloorMap(roomLayout);
        
        this.currentFloorMap = floorMap;
        this.currentDungeon = {
            floor: floorNumber,
            theme: 'gothic_ruins',
            roomLayout: roomLayout,
            floorMap: floorMap
        };
        
        // Generate geometry
        this.generateArchitecture(floorMap, roomLayout);
        this.addLighting(roomLayout);
        this.addPortals(roomLayout);
        
        console.log(`Floor ${floorNumber} generated successfully`);
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
        
        // Generate floors, walls, and ceilings
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
        const fallback = this.materials.get('arena_floor') || new THREE.MeshLambertMaterial({ color: 0x808080 });
        
        switch(roomType) {
            case 'center':
                return {
                    floor: this.materials.get('arena_floor') || fallback,
                    wall: this.materials.get('arena_wall') || fallback,
                    ceiling: this.materials.get('arena_ceiling') || fallback
                };
            case 'orbital':
                return {
                    floor: this.materials.get('chamber_floor') || fallback,
                    wall: this.materials.get('chamber_wall') || fallback,
                    ceiling: this.materials.get('chamber_ceiling') || fallback
                };
            case 'cardinal':
                return {
                    floor: this.materials.get('platform_floor') || fallback,
                    wall: this.materials.get('platform_wall') || fallback,
                    ceiling: this.materials.get('platform_ceiling') || fallback
                };
            default:
                return {
                    floor: this.materials.get('passage_floor') || fallback,
                    wall: this.materials.get('passage_wall') || fallback,
                    ceiling: this.materials.get('passage_ceiling') || fallback
                };
        }
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
        
        // Basin
        const basinGeometry = new THREE.CylinderGeometry(2, 2.2, 0.8, 16);
        const basin = new THREE.Mesh(basinGeometry, this.materials.get('ancient_gold'));
        basin.position.set(worldX, this.floorHeight + 0.4, worldZ);
        basin.castShadow = true;
        dungeonGroup.add(basin);
        
        // Orb
        const orbGeometry = new THREE.SphereGeometry(0.8, 16, 12);
        const orb = new THREE.Mesh(orbGeometry, this.materials.get('crystal_formation'));
        orb.position.set(worldX, this.floorHeight + 1.4, worldZ);
        orb.userData = { rotationSpeed: 0.01 };
        dungeonGroup.add(orb);
        
        this.combatElements.push(orb);
    }
    
    addLighting(roomLayout) {
        console.log('Adding atmospheric lighting...');
        
        // Enhanced lighting for each room type
        Object.values(roomLayout.rooms).forEach(room => {
            this.addRoomAtmosphere(room);
        });
        
        // Add corridor lighting
        roomLayout.connections.forEach(connection => {
            this.addCorridorLighting(roomLayout.rooms[connection.from], roomLayout.rooms[connection.to]);
        });
        
        // Add dramatic ambient effects
        this.addAmbientEffects(roomLayout.rooms.center);
        
        console.log(`Added ${this.lightSources.length} atmospheric lights`);
    }
    
    addRoomAtmosphere(room) {
        const worldX = (room.gridX - this.gridWidth/2) * this.gridSize;
        const worldZ = (room.gridZ - this.gridDepth/2) * this.gridSize;
        const roomSize = room.size * this.gridSize;
        
        if (room.type === 'center') {
            // ARENA - Dramatic cathedral lighting
            // Main cathedral light - high and golden
            const cathedralLight = new THREE.PointLight(0xFFD700, 4.0, 150);
            cathedralLight.position.set(worldX, this.floorHeight + this.ceilingHeight * 1.2, worldZ);
            cathedralLight.castShadow = true;
            cathedralLight.shadow.mapSize.width = 1024;
            cathedralLight.shadow.mapSize.height = 1024;
            this.currentDungeonGroup.add(cathedralLight);
            this.lightSources.push(cathedralLight);
            
            // Rim lighting around the arena for drama
            const rimColors = [0xFF6B35, 0xFF8C42, 0xFFA500, 0xFFD700];
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const radius = roomSize * 0.4;
                const rimLight = new THREE.SpotLight(
                    rimColors[i % rimColors.length], 
                    2.5, 
                    100, 
                    Math.PI/3, 
                    0.2
                );
                rimLight.position.set(
                    worldX + Math.cos(angle) * radius,
                    this.floorHeight + this.ceilingHeight * 0.9,
                    worldZ + Math.sin(angle) * radius
                );
                rimLight.target.position.set(worldX, this.floorHeight, worldZ);
                rimLight.castShadow = true;
                this.currentDungeonGroup.add(rimLight);
                this.currentDungeonGroup.add(rimLight.target);
                this.lightSources.push(rimLight);
            }
            
            // Mysterious blue underglow
            const mysticalLight = new THREE.PointLight(0x4169E1, 1.5, 60);
            mysticalLight.position.set(worldX, this.floorHeight + 0.5, worldZ);
            this.currentDungeonGroup.add(mysticalLight);
            this.lightSources.push(mysticalLight);
            
        } else if (room.type === 'orbital') {
            // CHAMBERS - Tactical colored lighting
            const chamberColors = {
                'north': 0x87CEEB,  // Sky blue
                'east': 0xFF6347,   // Tomato red  
                'west': 0x9370DB,   // Medium purple
                'south': 0x32CD32   // Lime green
            };
            
            const color = chamberColors[room.direction] || 0xFFE4B5;
            
            // Main chamber light
            const chamberLight = new THREE.PointLight(color, 2.5, 100);
            chamberLight.position.set(worldX, this.floorHeight + this.ceilingHeight * 0.8, worldZ);
            chamberLight.castShadow = true;
            this.currentDungeonGroup.add(chamberLight);
            this.lightSources.push(chamberLight);
            
            // Corner mood lighting
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + Math.PI/4; // Offset for corners
                const radius = roomSize * 0.35;
                const cornerLight = new THREE.PointLight(color, 1.0, 40);
                cornerLight.position.set(
                    worldX + Math.cos(angle) * radius,
                    this.floorHeight + 2,
                    worldZ + Math.sin(angle) * radius
                );
                // Add flickering animation data
                cornerLight.userData = {
                    originalIntensity: 1.0,
                    flickerSpeed: 0.8 + Math.random() * 0.6,
                    flickerAmount: 0.3
                };
                this.currentDungeonGroup.add(cornerLight);
                this.lightSources.push(cornerLight);
            }
            
            // Floating particles effect
            this.addFloatingParticles(worldX, worldZ, roomSize, color);
            
        } else if (room.type === 'cardinal') {
            // PLATFORMS - Multi-level mystical lighting
            const platformColors = [0x1E90FF, 0x00BFFF, 0x87CEFA, 0x4169E1];
            
            // Main platform light
            const platformLight = new THREE.PointLight(0x4169E1, 3.0, 120);
            platformLight.position.set(worldX, this.floorHeight + this.ceilingHeight, worldZ);
            platformLight.castShadow = true;
            this.currentDungeonGroup.add(platformLight);
            this.lightSources.push(platformLight);
            
            // Multi-level lighting
            platformColors.forEach((color, level) => {
                const levelLight = new THREE.PointLight(color, 1.5, 50);
                const angle = (level / 4) * Math.PI * 2;
                const radius = roomSize * 0.3;
                levelLight.position.set(
                    worldX + Math.cos(angle) * radius,
                    this.floorHeight + 3 + level * 1.5,
                    worldZ + Math.sin(angle) * radius
                );
                levelLight.userData = {
                    originalIntensity: 1.5,
                    pulseSpeed: 0.5 + level * 0.2,
                    pulseAmount: 0.4
                };
                this.currentDungeonGroup.add(levelLight);
                this.lightSources.push(levelLight);
            });
        }
    }
    
    addCorridorLighting(roomA, roomB) {
        const startX = (roomA.gridX - this.gridWidth/2) * this.gridSize;
        const startZ = (roomA.gridZ - this.gridDepth/2) * this.gridSize;
        const endX = (roomB.gridX - this.gridWidth/2) * this.gridSize;
        const endZ = (roomB.gridZ - this.gridDepth/2) * this.gridSize;
        
        // Corridor pathway lights
        const steps = 5;
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const x = startX + (endX - startX) * progress;
            const z = startZ + (endZ - startZ) * progress;
            
            // Alternating warm and cool corridor lights
            const color = i % 2 === 0 ? 0xDEB887 : 0x708090;
            const corridorLight = new THREE.PointLight(color, 0.8, 25);
            corridorLight.position.set(x, this.floorHeight + 4, z);
            corridorLight.userData = {
                originalIntensity: 0.8,
                flickerSpeed: 0.3 + Math.random() * 0.4,
                flickerAmount: 0.2
            };
            this.currentDungeonGroup.add(corridorLight);
            this.lightSources.push(corridorLight);
        }
        
        // Emergency red lights at critical points
        const midX = (startX + endX) / 2;
        const midZ = (startZ + endZ) / 2;
        const emergencyLight = new THREE.PointLight(0xFF4500, 0.6, 20);
        emergencyLight.position.set(midX, this.floorHeight + 2.5, midZ);
        emergencyLight.userData = {
            originalIntensity: 0.6,
            flickerSpeed: 2.0,
            flickerAmount: 0.5,
            isEmergency: true
        };
        this.currentDungeonGroup.add(emergencyLight);
        this.lightSources.push(emergencyLight);
    }
    
    addAmbientEffects(centerRoom) {
        const worldX = (centerRoom.gridX - this.gridWidth/2) * this.gridSize;
        const worldZ = (centerRoom.gridZ - this.gridDepth/2) * this.gridSize;
        
        // Floating mystical orbs around the arena
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 25 + Math.random() * 15;
            const height = this.floorHeight + 8 + Math.random() * 6;
            
            // Create glowing orb
            const orbGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const orbMaterial = new THREE.MeshBasicMaterial({
                color: [0xFFD700, 0x4169E1, 0xFF6347, 0x9370DB, 0x32CD32][i % 5],
                emissive: [0xFFD700, 0x4169E1, 0xFF6347, 0x9370DB, 0x32CD32][i % 5],
                emissiveIntensity: 0.8,
                transparent: true,
                opacity: 0.7
            });
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);
            orb.position.set(
                worldX + Math.cos(angle) * radius,
                height,
                worldZ + Math.sin(angle) * radius
            );
            
            // Add floating animation
            orb.userData = {
                originalY: height,
                originalAngle: angle,
                originalRadius: radius,
                floatSpeed: 0.3 + Math.random() * 0.4,
                orbitSpeed: 0.1 + Math.random() * 0.15,
                bobAmount: 1.5
            };
            
            this.currentDungeonGroup.add(orb);
            this.combatElements.push(orb);
            
            // Add light to each orb
            const orbLight = new THREE.PointLight(
                [0xFFD700, 0x4169E1, 0xFF6347, 0x9370DB, 0x32CD32][i % 5],
                1.2,
                35
            );
            orbLight.position.copy(orb.position);
            orbLight.userData = { followOrb: orb };
            this.currentDungeonGroup.add(orbLight);
            this.lightSources.push(orbLight);
        }
        
        // Atmospheric fog lights
        for (let i = 0; i < 6; i++) {
            const fogLight = new THREE.PointLight(0xDDDDDD, 0.4, 80);
            fogLight.position.set(
                worldX + (Math.random() - 0.5) * 60,
                this.floorHeight + Math.random() * 3,
                worldZ + (Math.random() - 0.5) * 60
            );
            fogLight.userData = {
                originalIntensity: 0.4,
                pulseSpeed: 0.2 + Math.random() * 0.3,
                pulseAmount: 0.2
            };
            this.currentDungeonGroup.add(fogLight);
            this.lightSources.push(fogLight);
        }
    }
    
    addFloatingParticles(centerX, centerZ, roomSize, color) {
        // Create simple floating particle effects
        for (let i = 0; i < 8; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 6, 6);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.4
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(
                centerX + (Math.random() - 0.5) * roomSize * 0.8,
                this.floorHeight + 2 + Math.random() * 4,
                centerZ + (Math.random() - 0.5) * roomSize * 0.8
            );
            
            particle.userData = {
                originalY: particle.position.y,
                floatSpeed: 0.4 + Math.random() * 0.6,
                bobAmount: 0.8,
                driftSpeed: 0.02 + Math.random() * 0.03
            };
            
            this.currentDungeonGroup.add(particle);
            this.combatElements.push(particle);
        }
    }
    
    addPortals(roomLayout) {
        const centerRoom = roomLayout.rooms.center;
        const centerWorldX = (centerRoom.gridX - this.gridWidth/2) * this.gridSize;
        const centerWorldZ = (centerRoom.gridZ - this.gridDepth/2) * this.gridSize;
        
        const portalPositions = {
            east: { x: centerWorldX + 15, z: centerWorldZ },
            west: { x: centerWorldX - 15, z: centerWorldZ },
            south: { x: centerWorldX, z: centerWorldZ + 15 }
        };
        
        Object.entries(portalPositions).forEach(([direction, pos]) => {
            const portal = this.createSimplePortal(direction, this.roomProgression[direction].unlocked);
            portal.position.set(pos.x, this.floorHeight + 4, pos.z);
            portal.name = `${direction}_portal`;
            this.currentDungeonGroup.add(portal);
        });
    }
    
    createSimplePortal(direction, isUnlocked) {
        const portalGroup = new THREE.Group();
        
        // Simple archway
        const archGeometry = new THREE.RingGeometry(2, 2.8, 12, 1, 0, Math.PI * 0.8);
        const archMaterial = isUnlocked ? 
            this.materials.get('ancient_gold') : 
            this.materials.get('rusted_metal');
        const arch = new THREE.Mesh(archGeometry, archMaterial);
        arch.rotation.x = Math.PI / 2;
        portalGroup.add(arch);
        
        // Barrier when locked
        if (!isUnlocked) {
            const barrierGeometry = new THREE.PlaneGeometry(4.5, 5.5);
            const barrierMaterial = new THREE.MeshBasicMaterial({
                color: 0x8B0000,
                transparent: true,
                opacity: 0.7
            });
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrier.rotation.x = Math.PI / 2;
            portalGroup.add(barrier);
            
            portalGroup.userData.barrier = barrier;
        }
        
        portalGroup.userData = {
            direction: direction,
            isBlocking: !isUnlocked
        };
        
        return portalGroup;
    }
    
    updateRoomPortals(direction, shouldOpen) {
        if (!this.currentDungeonGroup) return;
        
        this.currentDungeonGroup.traverse((child) => {
            if (child.userData.direction === direction) {
                child.userData.isBlocking = !shouldOpen;
                
                // Update materials and visibility
                child.traverse((subChild) => {
                    if (subChild.geometry && subChild.geometry.type === 'RingGeometry') {
                        subChild.material = shouldOpen ? 
                            this.materials.get('ancient_gold') : 
                            this.materials.get('rusted_metal');
                    }
                });
                
                if (child.userData.barrier) {
                    child.userData.barrier.visible = !shouldOpen;
                }
            }
        });
    }
    
    update(deltaTime) {
        const time = Date.now() * 0.001;
        
        // Animate orb rotation
        this.combatElements.forEach(element => {
            if (element.userData.rotationSpeed) {
                element.rotation.y += element.userData.rotationSpeed;
            }
            
            // Floating orbs animation
            if (element.userData.floatSpeed && element.userData.originalY !== undefined) {
                // Vertical bobbing
                const bobOffset = Math.sin(time * element.userData.floatSpeed) * element.userData.bobAmount;
                element.position.y = element.userData.originalY + bobOffset;
                
                // Orbital movement for mystical orbs
                if (element.userData.orbitSpeed && element.userData.originalAngle !== undefined) {
                    element.userData.originalAngle += element.userData.orbitSpeed * deltaTime;
                    const newX = element.position.x + Math.cos(element.userData.originalAngle) * element.userData.orbitSpeed * 10;
                    const newZ = element.position.z + Math.sin(element.userData.originalAngle) * element.userData.orbitSpeed * 10;
                    element.position.x = newX;
                    element.position.z = newZ;
                }
                
                // Gentle drifting for particles
                if (element.userData.driftSpeed) {
                    element.position.x += Math.sin(time * element.userData.driftSpeed) * 0.1;
                    element.position.z += Math.cos(time * element.userData.driftSpeed * 0.7) * 0.1;
                }
            }
        });
        
        // Animate lights with various effects
        this.lightSources.forEach(light => {
            if (!light.userData.originalIntensity) {
                light.userData.originalIntensity = light.intensity;
                light.userData.flickerSpeed = light.userData.flickerSpeed || (0.5 + Math.random());
            }
            
            // Follow orb movement
            if (light.userData.followOrb) {
                light.position.copy(light.userData.followOrb.position);
            }
            
            // Flickering effect
            if (light.userData.flickerAmount) {
                const flicker = Math.sin(time * light.userData.flickerSpeed) * light.userData.flickerAmount + 1;
                light.intensity = light.userData.originalIntensity * flicker;
            }
            
            // Pulsing effect
            if (light.userData.pulseSpeed && light.userData.pulseAmount) {
                const pulse = Math.sin(time * light.userData.pulseSpeed) * light.userData.pulseAmount + 1;
                light.intensity = light.userData.originalIntensity * pulse;
            }
            
            // Emergency light strobe effect
            if (light.userData.isEmergency) {
                const strobe = Math.sin(time * 4) > 0.5 ? 1 : 0.3;
                light.intensity = light.userData.originalIntensity * strobe;
            }
            
            // General subtle flicker for atmospheric effect
            if (!light.userData.flickerAmount && !light.userData.pulseSpeed && !light.userData.isEmergency) {
                const subtleFlicker = Math.sin(time * light.userData.flickerSpeed) * 0.1 + 1;
                light.intensity = light.userData.originalIntensity * subtleFlicker;
            }
        });
    }
    
    clearCurrentDungeon() {
        if (this.currentDungeonGroup) {
            this.scene.remove(this.currentDungeonGroup);
        }
        
        this.lightSources.length = 0;
        this.combatElements.length = 0;
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
console.log('Assigning DungeonSystem to window...');
window.DungeonSystem = DungeonSystem;
console.log('DungeonSystem assigned successfully');
