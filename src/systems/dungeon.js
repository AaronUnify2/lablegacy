// Castle Labyrinth Dungeon Generation System

class DungeonSystem {
    constructor(scene, player) {
        console.log('Initializing DungeonSystem...');
        
        this.scene = scene;
        this.player = player;
        
        // Connect player to this dungeon system for collision
        if (this.player && this.player.setDungeonSystem) {
            this.player.setDungeonSystem(this);
        }
        
        // Dungeon state
        this.currentFloor = 1;
        this.currentDungeonGroup = null;
        this.dungeonSize = 60; // Total dungeon area size
        this.roomSize = 25; // Size of each room
        this.wallHeight = 6;
        this.currentTheme = 'stone';
        
        // Collision grid for pathfinding (higher resolution)
        this.gridSize = 120; // 2x dungeon size for better precision
        this.cellSize = this.dungeonSize / this.gridSize;
        this.collisionGrid = [];
        
        // Room progression system
        this.roomProgression = {
            north: { unlocked: true, enemiesDefeated: false },
            east: { unlocked: false, enemiesDefeated: false },
            west: { unlocked: false, enemiesDefeated: false },
            south: { unlocked: false, enemiesDefeated: false }
        };
        
        // Portal management
        this.portals = [];
        this.portalMasks = [];
        
        // Materials cache
        this.materials = {};
        this.geometries = {};
        
        // Theme definitions
        this.themes = {
            stone: {
                name: 'Stone Castle',
                wallColor: 0x8B7355,
                floorColor: 0x696969,
                ceilingColor: 0x2F4F4F,
                ambientColor: 0x404040,
                lightColor: 0xFFE4B5,
                lightIntensity: 0.8,
                fogColor: 0x1a1a2e,
                decorations: ['torch', 'banner', 'pillar']
            },
            dark: {
                name: 'Dark Fortress',
                wallColor: 0x2F2F2F,
                floorColor: 0x1C1C1C,
                ceilingColor: 0x0F0F0F,
                ambientColor: 0x1a1a1a,
                lightColor: 0x8B0000,
                lightIntensity: 0.6,
                fogColor: 0x0f0f1f,
                decorations: ['skull', 'chain', 'darkPillar']
            },
            cursed: {
                name: 'Cursed Depths',
                wallColor: 0x4B0082,
                floorColor: 0x301934,
                ceilingColor: 0x191919,
                ambientColor: 0x2d1b3d,
                lightColor: 0x9370DB,
                lightIntensity: 0.7,
                fogColor: 0x2a1a3e,
                decorations: ['crystal', 'rune', 'cursedPillar']
            },
            infernal: {
                name: 'Infernal Sanctum',
                wallColor: 0x8B0000,
                floorColor: 0x2F0000,
                ceilingColor: 0x1a0000,
                ambientColor: 0x330000,
                lightColor: 0xFF4500,
                lightIntensity: 0.9,
                fogColor: 0x1f0808,
                decorations: ['flame', 'lava', 'infernalPillar']
            },
            celestial: {
                name: 'Celestial Sanctum',
                wallColor: 0xF0F8FF,
                floorColor: 0xE6E6FA,
                ceilingColor: 0xB0C4DE,
                ambientColor: 0xF5F5F5,
                lightColor: 0xFFFFE0,
                lightIntensity: 1.2,
                fogColor: 0xe8e8f0,
                decorations: ['star', 'light', 'celestialPillar']
            }
        };
        
        this.initializeMaterials();
        console.log('DungeonSystem initialized');
    }
    
    initializeMaterials() {
        // Initialize basic geometries
        this.geometries.wall = new THREE.BoxGeometry(1, this.wallHeight, 1);
        this.geometries.floor = new THREE.BoxGeometry(1, 0.2, 1);
        this.geometries.ceiling = new THREE.BoxGeometry(1, 0.2, 1);
        this.geometries.pillar = new THREE.BoxGeometry(1, this.wallHeight, 1);
        this.geometries.decoration = new THREE.BoxGeometry(0.5, 1, 0.5);
        
        // Initialize materials for all themes
        Object.keys(this.themes).forEach(themeName => {
            this.createThemeMaterials(themeName);
        });
        
        console.log('Materials and geometries initialized');
    }
    
    createThemeMaterials(themeName) {
        const theme = this.themes[themeName];
        
        this.materials[themeName] = {
            wall: new THREE.MeshLambertMaterial({ 
                color: theme.wallColor,
                transparent: false
            }),
            floor: new THREE.MeshLambertMaterial({ 
                color: theme.floorColor,
                transparent: false
            }),
            ceiling: new THREE.MeshLambertMaterial({ 
                color: theme.ceilingColor,
                transparent: false
            }),
            pillar: new THREE.MeshLambertMaterial({ 
                color: theme.wallColor * 0.8,
                transparent: false
            }),
            decoration: new THREE.MeshLambertMaterial({ 
                color: theme.lightColor,
                transparent: false
            }),
            portal: new THREE.MeshLambertMaterial({
                color: 0x000033,
                transparent: true,
                opacity: 0.8
            }),
            portalMask: new THREE.MeshLambertMaterial({
                color: 0x8B0000,
                transparent: true,
                opacity: 0.9
            })
        };
    }
    
    generateDungeon(floorNumber) {
        console.log(`Generating dungeon for floor ${floorNumber}`);
        
        this.currentFloor = floorNumber;
        this.currentTheme = this.determineTheme(floorNumber);
        
        // Clear existing dungeon
        this.clearDungeon();
        
        // Reset room progression
        this.resetRoomProgression();
        
        // Initialize collision grid
        this.initializeCollisionGrid();
        
        // Create new dungeon group
        this.currentDungeonGroup = new THREE.Group();
        this.currentDungeonGroup.name = `Dungeon_Floor_${floorNumber}`;
        
        // Generate the castle layout
        this.generateCastleLayout();
        
        // Add atmospheric elements
        this.addAtmosphere();
        
        // Add the dungeon to the scene
        this.scene.add(this.currentDungeonGroup);
        
        console.log(`✓ Dungeon floor ${floorNumber} generated with ${this.currentTheme} theme`);
    }
    
    determineTheme(floorNumber) {
        const themeNames = Object.keys(this.themes);
        const themeIndex = Math.min(Math.floor((floorNumber - 1) / 5), themeNames.length - 1);
        return themeNames[themeIndex];
    }
    
    clearDungeon() {
        if (this.currentDungeonGroup) {
            // Dispose of geometries and materials
            this.currentDungeonGroup.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            
            this.scene.remove(this.currentDungeonGroup);
            this.currentDungeonGroup = null;
        }
        
        this.portals = [];
        this.portalMasks = [];
    }
    
    resetRoomProgression() {
        this.roomProgression = {
            north: { unlocked: true, enemiesDefeated: false },
            east: { unlocked: false, enemiesDefeated: false },
            west: { unlocked: false, enemiesDefeated: false },
            south: { unlocked: false, enemiesDefeated: false }
        };
    }
    
    initializeCollisionGrid() {
        this.collisionGrid = [];
        for (let x = 0; x < this.gridSize; x++) {
            this.collisionGrid[x] = [];
            for (let z = 0; z < this.gridSize; z++) {
                this.collisionGrid[x][z] = 0; // 0 = walkable, 1 = wall
            }
        }
    }
    
    generateCastleLayout() {
        const halfSize = this.dungeonSize / 2;
        const halfRoom = this.roomSize / 2;
        
        // Generate central hub room (starting room)
        this.generateRoom(0, 0, 'center');
        
        // Generate directional rooms
        this.generateRoom(0, -halfRoom, 'north');   // North room
        this.generateRoom(halfRoom, 0, 'east');     // East room  
        this.generateRoom(-halfRoom, 0, 'west');    // West room
        this.generateRoom(0, halfRoom, 'south');    // South room
        
        // Create connecting corridors
        this.createCorridor(0, 0, 0, -halfRoom, 'north');   // Center to North
        this.createCorridor(0, 0, halfRoom, 0, 'east');     // Center to East
        this.createCorridor(0, 0, -halfRoom, 0, 'west');    // Center to West
        this.createCorridor(0, 0, 0, halfRoom, 'south');    // Center to South
        
        // Add outer boundary walls
        this.createOuterWalls();
        
        // Place portals with blocking masks
        this.placePortals();
    }
    
    generateRoom(centerX, centerZ, roomType) {
        const roomHalf = this.roomSize / 2;
        const wallThickness = 1;
        
        // Create floor
        this.createFloorSection(
            centerX - roomHalf, centerZ - roomHalf, 
            this.roomSize, this.roomSize
        );
        
        // Create walls around the room perimeter
        const walls = [
            // North wall
            { x: centerX, z: centerZ - roomHalf, width: this.roomSize, depth: wallThickness },
            // South wall  
            { x: centerX, z: centerZ + roomHalf, width: this.roomSize, depth: wallThickness },
            // East wall
            { x: centerX + roomHalf, z: centerZ, width: wallThickness, depth: this.roomSize },
            // West wall
            { x: centerX - roomHalf, z: centerZ, width: wallThickness, depth: this.roomSize }
        ];
        
        walls.forEach(wall => {
            this.createWallSection(wall.x, wall.z, wall.width, wall.depth);
        });
        
        // Add decorations based on room type and theme
        this.addRoomDecorations(centerX, centerZ, roomType);
        
        // Add enemy spawn points for non-center rooms
        if (roomType !== 'center') {
            this.addEnemySpawnPoints(centerX, centerZ, roomType);
        }
    }
    
    createCorridor(startX, startZ, endX, endZ, direction) {
        const corridorWidth = 6;
        const wallThickness = 1;
        
        // Determine corridor orientation
        const isVertical = Math.abs(endZ - startZ) > Math.abs(endX - startX);
        
        if (isVertical) {
            // Vertical corridor
            const length = Math.abs(endZ - startZ);
            const centerX = (startX + endX) / 2;
            const centerZ = (startZ + endZ) / 2;
            
            // Create floor
            this.createFloorSection(centerX - corridorWidth/2, centerZ - length/2, corridorWidth, length);
            
            // Create side walls
            this.createWallSection(centerX - corridorWidth/2, centerZ, wallThickness, length);
            this.createWallSection(centerX + corridorWidth/2, centerZ, wallThickness, length);
            
        } else {
            // Horizontal corridor
            const length = Math.abs(endX - startX);
            const centerX = (startX + endX) / 2;
            const centerZ = (startZ + endZ) / 2;
            
            // Create floor
            this.createFloorSection(centerX - length/2, centerZ - corridorWidth/2, length, corridorWidth);
            
            // Create side walls
            this.createWallSection(centerX, centerZ - corridorWidth/2, length, wallThickness);
            this.createWallSection(centerX, centerZ + corridorWidth/2, length, wallThickness);
        }
        
        // Create corridor openings in room walls
        this.createCorridorOpenings(startX, startZ, endX, endZ, direction);
    }
    
    createCorridorOpenings(startX, startZ, endX, endZ, direction) {
        // Remove wall sections where corridors connect to rooms
        const openingWidth = 5;
        const positions = [
            { x: startX, z: startZ },
            { x: endX, z: endZ }
        ];
        
        positions.forEach(pos => {
            this.removeWallsInArea(pos.x - openingWidth/2, pos.z - openingWidth/2, openingWidth, openingWidth);
        });
    }
    
    createOuterWalls() {
        const halfSize = this.dungeonSize / 2;
        const wallThickness = 2;
        
        // Create massive outer boundary walls
        const outerWalls = [
            // North boundary
            { x: 0, z: -halfSize, width: this.dungeonSize, depth: wallThickness },
            // South boundary
            { x: 0, z: halfSize, width: this.dungeonSize, depth: wallThickness },
            // East boundary
            { x: halfSize, z: 0, width: wallThickness, depth: this.dungeonSize },
            // West boundary
            { x: -halfSize, z: 0, width: wallThickness, depth: this.dungeonSize }
        ];
        
        outerWalls.forEach(wall => {
            this.createWallSection(wall.x, wall.z, wall.width, wall.depth);
        });
    }
    
    createFloorSection(x, z, width, depth) {
        const floorMesh = new THREE.Mesh(
            new THREE.BoxGeometry(width, 0.2, depth),
            this.materials[this.currentTheme].floor
        );
        
        floorMesh.position.set(x, -0.1, z);
        floorMesh.receiveShadow = true;
        floorMesh.userData.type = 'floor';
        
        this.currentDungeonGroup.add(floorMesh);
        
        // Mark as walkable in collision grid
        this.markCollisionArea(x - width/2, z - depth/2, width, depth, 0);
    }
    
    createWallSection(x, z, width, depth) {
        const wallMesh = new THREE.Mesh(
            new THREE.BoxGeometry(width, this.wallHeight, depth),
            this.materials[this.currentTheme].wall
        );
        
        wallMesh.position.set(x, this.wallHeight/2, z);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        wallMesh.userData.type = 'wall';
        
        this.currentDungeonGroup.add(wallMesh);
        
        // Mark as solid in collision grid
        this.markCollisionArea(x - width/2, z - depth/2, width, depth, 1);
    }
    
    removeWallsInArea(x, z, width, depth) {
        // Remove walls from the collision grid in this area
        this.markCollisionArea(x, z, width, depth, 0);
        
        // Remove wall meshes that intersect with this area
        const wallsToRemove = [];
        this.currentDungeonGroup.traverse((child) => {
            if (child.userData.type === 'wall') {
                const wallPos = child.position;
                if (wallPos.x >= x && wallPos.x <= x + width &&
                    wallPos.z >= z && wallPos.z <= z + depth) {
                    wallsToRemove.push(child);
                }
            }
        });
        
        wallsToRemove.forEach(wall => {
            this.currentDungeonGroup.remove(wall);
            if (wall.geometry) wall.geometry.dispose();
            if (wall.material) wall.material.dispose();
        });
    }
    
    markCollisionArea(x, z, width, depth, value) {
        const startX = Math.max(0, Math.floor((x + this.dungeonSize/2) / this.cellSize));
        const endX = Math.min(this.gridSize - 1, Math.floor((x + width + this.dungeonSize/2) / this.cellSize));
        const startZ = Math.max(0, Math.floor((z + this.dungeonSize/2) / this.cellSize));
        const endZ = Math.min(this.gridSize - 1, Math.floor((z + depth + this.dungeonSize/2) / this.cellSize));
        
        for (let gx = startX; gx <= endX; gx++) {
            for (let gz = startZ; gz <= endZ; gz++) {
                this.collisionGrid[gx][gz] = value;
            }
        }
    }
    
    placePortals() {
        const portalPositions = [
            { x: 0, z: -18, direction: 'north', type: 'room_entrance' },
            { x: 18, z: 0, direction: 'east', type: 'room_entrance' },
            { x: -18, z: 0, direction: 'west', type: 'room_entrance' },
            { x: 0, z: 18, direction: 'south', type: 'room_entrance' },
            { x: 0, z: -35, direction: 'north', type: 'exit' }, // North room exit
            { x: 35, z: 0, direction: 'east', type: 'exit' },   // East room exit
            { x: -35, z: 0, direction: 'west', type: 'exit' },  // West room exit
            { x: 0, z: 35, direction: 'south', type: 'exit' }   // South room exit
        ];
        
        portalPositions.forEach(portalData => {
            this.createPortal(portalData.x, portalData.z, portalData.direction, portalData.type);
        });
    }
    
    createPortal(x, z, direction, type) {
        // Create portal frame
        const portalFrame = new THREE.Mesh(
            new THREE.BoxGeometry(4, 5, 0.5),
            this.materials[this.currentTheme].portal
        );
        portalFrame.position.set(x, 2.5, z);
        
        // Create blocking mask (visible when room is locked)
        const maskGeometry = new THREE.BoxGeometry(3, 4, 0.3);
        const maskMaterial = this.materials[this.currentTheme].portalMask.clone();
        
        const portalMask = new THREE.Mesh(maskGeometry, maskMaterial);
        portalMask.position.set(x, 2, z);
        
        // Add eerie face texture to the mask
        this.addMaskTexture(portalMask, direction);
        
        // Set portal data
        portalFrame.userData = {
            portalType: type,
            direction: direction,
            isBlocking: this.shouldPortalBlock(direction, type)
        };
        
        portalMask.userData = {
            portalType: type,
            direction: direction,
            isBlocking: this.shouldPortalBlock(direction, type),
            isMask: true
        };
        
        this.currentDungeonGroup.add(portalFrame);
        this.currentDungeonGroup.add(portalMask);
        
        this.portals.push(portalFrame);
        this.portalMasks.push(portalMask);
        
        // Update mask visibility
        this.updatePortalMaskVisibility(portalMask, direction, type);
    }
    
    shouldPortalBlock(direction, type) {
        if (type === 'room_entrance') {
            return !this.roomProgression[direction].unlocked;
        } else if (type === 'exit') {
            return !this.roomProgression[direction].enemiesDefeated;
        }
        return false;
    }
    
    updatePortalMaskVisibility(mask, direction, type) {
        const shouldBlock = this.shouldPortalBlock(direction, type);
        mask.visible = shouldBlock;
        mask.userData.isBlocking = shouldBlock;
        
        // Update mask color based on room status
        if (this.roomProgression[direction].enemiesDefeated) {
            mask.material.color.setHex(0x00ff00); // Green for completed
        } else if (this.roomProgression[direction].unlocked) {
            mask.material.color.setHex(0xffff00); // Yellow for accessible
        } else {
            mask.material.color.setHex(0xff0000); // Red for locked
        }
    }
    
    addMaskTexture(mask, direction) {
        // Create a simple face pattern on the mask material
        const faceEmojis = {
            north: '😤',
            east: '😠', 
            west: '😡',
            south: '👹'
        };
        
        // For now, just change the color slightly to differentiate
        const colors = {
            north: 0x660000,
            east: 0x006600,
            west: 0x000066,
            south: 0x660066
        };
        
        mask.material.color.setHex(colors[direction] || 0x660000);
    }
    
    addRoomDecorations(centerX, centerZ, roomType) {
        const theme = this.themes[this.currentTheme];
        const decorations = theme.decorations;
        
        // Add corner pillars
        const pillarPositions = [
            { x: centerX - 10, z: centerZ - 10 },
            { x: centerX + 10, z: centerZ - 10 },
            { x: centerX - 10, z: centerZ + 10 },
            { x: centerX + 10, z: centerZ + 10 }
        ];
        
        pillarPositions.forEach(pos => {
            this.createPillar(pos.x, pos.z);
        });
        
        // Add themed decorations
        if (roomType !== 'center') {
            this.addThemedDecorations(centerX, centerZ, decorations);
        }
    }
    
    createPillar(x, z) {
        const pillar = new THREE.Mesh(
            this.geometries.pillar,
            this.materials[this.currentTheme].pillar
        );
        
        pillar.position.set(x, this.wallHeight/2, z);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        pillar.userData.type = 'pillar';
        
        this.currentDungeonGroup.add(pillar);
        
        // Mark pillar area as solid
        this.markCollisionArea(x - 0.5, z - 0.5, 1, 1, 1);
    }
    
    addThemedDecorations(centerX, centerZ, decorations) {
        // Add random decorations around the room
        const decorationCount = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < decorationCount; i++) {
            const angle = (i / decorationCount) * Math.PI * 2;
            const radius = 5 + Math.random() * 8;
            
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;
            
            if (this.isPositionWalkable(x, z)) {
                this.createDecoration(x, z, decorations[Math.floor(Math.random() * decorations.length)]);
            }
        }
    }
    
    createDecoration(x, z, decorationType) {
        const decoration = new THREE.Mesh(
            this.geometries.decoration,
            this.materials[this.currentTheme].decoration
        );
        
        decoration.position.set(x, 0.5, z);
        decoration.userData.type = 'decoration';
        decoration.userData.decorationType = decorationType;
        
        this.currentDungeonGroup.add(decoration);
    }
    
    addEnemySpawnPoints(centerX, centerZ, roomType) {
        // Add invisible enemy spawn markers
        const spawnCount = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < spawnCount; i++) {
            const angle = (i / spawnCount) * Math.PI * 2;
            const radius = 3 + Math.random() * 5;
            
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;
            
            if (this.isPositionWalkable(x, z)) {
                // Create invisible spawn point marker
                const spawnMarker = new THREE.Object3D();
                spawnMarker.position.set(x, 0, z);
                spawnMarker.userData = {
                    type: 'enemySpawn',
                    roomType: roomType,
                    spawned: false
                };
                
                this.currentDungeonGroup.add(spawnMarker);
            }
        }
    }
    
    addAtmosphere() {
        const theme = this.themes[this.currentTheme];
        
        // Update scene fog
        this.scene.fog.color.setHex(theme.fogColor);
        this.scene.fog.density = 0.015 + (this.currentFloor * 0.002);
        
        // Add atmospheric lighting
        this.addAtmosphericLights(theme);
    }
    
    addAtmosphericLights(theme) {
        // Add point lights around the dungeon
        const lightPositions = [
            { x: 0, y: 4, z: 0 },      // Center
            { x: 0, y: 4, z: -25 },    // North room
            { x: 25, y: 4, z: 0 },     // East room
            { x: -25, y: 4, z: 0 },    // West room
            { x: 0, y: 4, z: 25 }      // South room
        ];
        
        lightPositions.forEach(pos => {
            const light = new THREE.PointLight(theme.lightColor, theme.lightIntensity, 20);
            light.position.set(pos.x, pos.y, pos.z);
            light.castShadow = true;
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            
            this.currentDungeonGroup.add(light);
        });
    }
    
    // Collision detection methods
    isPositionWalkable(x, z) {
        const gridX = Math.floor((x + this.dungeonSize/2) / this.cellSize);
        const gridZ = Math.floor((z + this.dungeonSize/2) / this.cellSize);
        
        if (gridX < 0 || gridX >= this.gridSize || gridZ < 0 || gridZ >= this.gridSize) {
            return false; // Outside bounds
        }
        
        return this.collisionGrid[gridX][gridZ] === 0;
    }
    
    isPositionSolid(x, z) {
        return !this.isPositionWalkable(x, z);
    }
    
    getFloorHeight(x, z) {
        // All floors are at Y = 0 in this castle system
        return 0;
    }
    
    getCeilingHeight(x, z) {
        // Ceiling height is consistent throughout the castle
        return this.wallHeight + 1;
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    // Room progression methods
    togglePortals() {
        // Simulate enemy defeat and room progression
        const directions = ['north', 'east', 'west', 'south'];
        
        // Find next room to unlock
        let nextToUnlock = null;
        let nextToComplete = null;
        
        for (const dir of directions) {
            if (!this.roomProgression[dir].unlocked) {
                nextToUnlock = dir;
                break;
            } else if (!this.roomProgression[dir].enemiesDefeated) {
                nextToComplete = dir;
                break;
            }
        }
        
        if (nextToComplete) {
            // Complete current room
            this.roomProgression[nextToComplete].enemiesDefeated = true;
            console.log(`${nextToComplete} room completed! Enemies defeated.`);
            
            // Update all portal masks
            this.updateAllPortalMasks();
            
        } else if (nextToUnlock) {
            // Unlock next room
            this.roomProgression[nextToUnlock].unlocked = true;
            console.log(`${nextToUnlock} room unlocked! You can now enter.`);
            
            // Update all portal masks
            this.updateAllPortalMasks();
        } else {
            console.log('All rooms completed! Floor finished.');
        }
    }
    
    updateAllPortalMasks() {
        this.portalMasks.forEach(mask => {
            const direction = mask.userData.direction;
            const type = mask.userData.portalType;
            this.updatePortalMaskVisibility(mask, direction, type);
        });
    }
    
    update(deltaTime) {
        // Update any animated elements
        if (this.currentDungeonGroup) {
            // Rotate decorative elements slightly
            this.currentDungeonGroup.traverse((child) => {
                if (child.userData.type === 'decoration') {
                    child.rotation.y += deltaTime * 0.5;
                }
            });
            
            // Pulse portal masks
            this.portalMasks.forEach(mask => {
                if (mask.visible) {
                    const pulseFactor = Math.sin(Date.now() * 0.003) * 0.1 + 0.9;
                    mask.scale.setScalar(pulseFactor);
                    
                    // Update transparency based on room status
                    const direction = mask.userData.direction;
                    if (this.roomProgression[direction].unlocked) {
                        mask.material.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
                    } else {
                        mask.material.opacity = 0.8 + Math.sin(Date.now() * 0.002) * 0.1;
                    }
                }
            });
        }
    }
}

// Make DungeonSystem available globally
window.DungeonSystem = DungeonSystem;
