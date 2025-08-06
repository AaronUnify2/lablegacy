// Dungeon Generation System with Collision Detection and Progressive Portal System
// Grid-based procedural dungeon generation with solid walls, floors, and ceilings

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
        this.maskMaterials = new Map(); // Enhanced mask materials
        this.lightSources = [];
        this.billboardSprites = [];
        
        this.init();
    }
    
    init() {
        this.setupMaterials();
        this.setupEnhancedMaskMaterials();
        this.setupBillboardSystem();
        
        // Connect player to this dungeon system for collision detection
        if (this.player) {
            this.player.setDungeonSystem(this);
        }
        
        console.log('Unified Dungeon System initialized with enhanced stone/porcelain masks');
    }
    
    setupEnhancedMaskMaterials() {
        console.log('Creating enhanced stone and porcelain mask materials...');
        
        // Create stone mask texture
        const stoneMaskTexture = this.createStoneMaskTexture();
        const stoneMaskNormal = this.createStoneNormalMap();
        
        const stoneMaskMaterial = new THREE.MeshStandardMaterial({
            map: stoneMaskTexture,
            normalMap: stoneMaskNormal,
            normalScale: new THREE.Vector2(1.5, 1.5),
            color: 0x8a7a6a,
            roughness: 0.8,
            metalness: 0.1,
            emissive: 0x2a1a1a,
            emissiveIntensity: 0.1,
            transparent: true,
            opacity: 0.95
        });
        
        // Create porcelain mask texture  
        const porcelainMaskTexture = this.createPorcelainMaskTexture();
        const porcelainMaskNormal = this.createPorcelainNormalMap();
        
        const porcelainMaskMaterial = new THREE.MeshStandardMaterial({
            map: porcelainMaskTexture,
            normalMap: porcelainMaskNormal,
            normalScale: new THREE.Vector2(0.8, 0.8),
            color: 0xf5f5dc,
            roughness: 0.3,
            metalness: 0.0,
            emissive: 0x1a1a2a,
            emissiveIntensity: 0.05,
            transparent: true,
            opacity: 0.92
        });
        
        // Weathered stone variation
        const weatheredStoneTexture = this.createWeatheredStoneTexture();
        const weatheredStoneNormal = this.createWeatheredStoneNormalMap();
        
        const weatheredStoneMaterial = new THREE.MeshStandardMaterial({
            map: weatheredStoneTexture,
            normalMap: weatheredStoneNormal,
            normalScale: new THREE.Vector2(2.0, 2.0),
            color: 0x6a5a4a,
            roughness: 0.9,
            metalness: 0.05,
            emissive: 0x3a2a1a,
            emissiveIntensity: 0.15,
            transparent: true,
            opacity: 0.9
        });
        
        // Store enhanced materials
        this.maskMaterials.set('stone_locked', stoneMaskMaterial);
        this.maskMaterials.set('stone_unlocked', stoneMaskMaterial.clone());
        this.maskMaterials.set('porcelain_locked', porcelainMaskMaterial);
        this.maskMaterials.set('porcelain_unlocked', porcelainMaskMaterial.clone());
        this.maskMaterials.set('weathered_locked', weatheredStoneMaterial);
        this.maskMaterials.set('weathered_unlocked', weatheredStoneMaterial.clone());
        
        // Adjust unlocked versions to be slightly different
        this.maskMaterials.get('stone_unlocked').emissive.setHex(0x1a3a1a);
        this.maskMaterials.get('porcelain_unlocked').emissive.setHex(0x1a2a1a);
        this.maskMaterials.get('weathered_unlocked').emissive.setHex(0x2a3a1a);
        
        console.log('Enhanced mask materials created');
    }
    
    createStoneMaskTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base stone color with variations
        const baseColors = ['#8a7a6a', '#7a6a5a', '#9a8a7a', '#6a5a4a', '#aa9a8a'];
        
        // Fill with base color gradient
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 300);
        gradient.addColorStop(0, '#9a8a7a');
        gradient.addColorStop(0.6, '#8a7a6a');
        gradient.addColorStop(1, '#6a5a4a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add stone grain texture
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 3 + 1;
            const opacity = Math.random() * 0.6 + 0.2;
            
            ctx.fillStyle = `rgba(${70 + Math.random() * 60}, ${60 + Math.random() * 50}, ${50 + Math.random() * 40}, ${opacity})`;
            ctx.fillRect(x, y, size, size);
        }
        
        // Add weathering stains
        for (let i = 0; i < 150; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 25 + 5;
            
            const stainGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            stainGradient.addColorStop(0, 'rgba(50, 40, 30, 0.4)');
            stainGradient.addColorStop(1, 'rgba(50, 40, 30, 0)');
            
            ctx.fillStyle = stainGradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add cracks
        ctx.strokeStyle = 'rgba(40, 30, 20, 0.8)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, Math.random() * 512);
            
            const steps = 5 + Math.random() * 10;
            for (let j = 0; j < steps; j++) {
                const currentX = Math.random() * 512;
                const currentY = Math.random() * 512;
                ctx.lineTo(currentX, currentY);
            }
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;
        
        return texture;
    }
    
    createStoneNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Fill with neutral normal color
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, 512, 512);
        
        // Add bumps and depressions for stone texture
        for (let i = 0; i < 800; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 8 + 2;
            const intensity = Math.random() * 0.8 + 0.2;
            
            const normalGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            
            if (Math.random() > 0.5) {
                // Bump
                normalGradient.addColorStop(0, `rgba(${128 + intensity * 60}, ${128 + intensity * 60}, ${255}, 1)`);
                normalGradient.addColorStop(1, `rgba(128, 128, 255, 1)`);
            } else {
                // Depression
                normalGradient.addColorStop(0, `rgba(${128 - intensity * 60}, ${128 - intensity * 60}, ${200}, 1)`);
                normalGradient.addColorStop(1, `rgba(128, 128, 255, 1)`);
            }
            
            ctx.fillStyle = normalGradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;
        
        return texture;
    }
    
    createPorcelainMaskTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base porcelain color - creamy white
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 300);
        gradient.addColorStop(0, '#faf8f5');
        gradient.addColorStop(0.7, '#f5f3f0');
        gradient.addColorStop(1, '#e8e6e3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add subtle porcelain imperfections
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 2 + 0.5;
            const opacity = Math.random() * 0.3 + 0.1;
            
            ctx.fillStyle = `rgba(${220 + Math.random() * 20}, ${215 + Math.random() * 20}, ${210 + Math.random() * 20}, ${opacity})`;
            ctx.fillRect(x, y, size, size);
        }
        
        // Add age stains (subtle yellowing)
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 30 + 8;
            
            const stainGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            stainGradient.addColorStop(0, 'rgba(240, 230, 200, 0.3)');
            stainGradient.addColorStop(1, 'rgba(240, 230, 200, 0)');
            
            ctx.fillStyle = stainGradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add hairline cracks in porcelain
        ctx.strokeStyle = 'rgba(180, 170, 160, 0.6)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, Math.random() * 512);
            
            const steps = 3 + Math.random() * 8;
            for (let j = 0; j < steps; j++) {
                const currentX = Math.random() * 512;
                const currentY = Math.random() * 512;
                ctx.lineTo(currentX, currentY);
            }
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;
        
        return texture;
    }
    
    createPorcelainNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Fill with neutral normal color
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, 512, 512);
        
        // Add subtle surface variations for porcelain
        for (let i = 0; i < 400; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 6 + 1;
            const intensity = Math.random() * 0.4 + 0.1;
            
            const normalGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            normalGradient.addColorStop(0, `rgba(${128 + intensity * 30}, ${128 + intensity * 30}, ${255}, 1)`);
            normalGradient.addColorStop(1, `rgba(128, 128, 255, 1)`);
            
            ctx.fillStyle = normalGradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;
        
        return texture;
    }
    
    createWeatheredStoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base weathered stone - darker, more worn
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 350);
        gradient.addColorStop(0, '#6a5a4a');
        gradient.addColorStop(0.5, '#5a4a3a');
        gradient.addColorStop(1, '#4a3a2a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Heavy weathering texture
        for (let i = 0; i < 3000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 4 + 1;
            const opacity = Math.random() * 0.8 + 0.3;
            
            ctx.fillStyle = `rgba(${40 + Math.random() * 80}, ${30 + Math.random() * 60}, ${20 + Math.random() * 50}, ${opacity})`;
            ctx.fillRect(x, y, size, size);
        }
        
        // Moss and lichen stains
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 35 + 10;
            
            const mossGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            mossGradient.addColorStop(0, 'rgba(60, 80, 40, 0.5)');
            mossGradient.addColorStop(0.6, 'rgba(40, 60, 30, 0.3)');
            mossGradient.addColorStop(1, 'rgba(40, 60, 30, 0)');
            
            ctx.fillStyle = mossGradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Deep cracks and erosion
        ctx.strokeStyle = 'rgba(20, 15, 10, 0.9)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 30; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, Math.random() * 512);
            
            const steps = 8 + Math.random() * 15;
            for (let j = 0; j < steps; j++) {
                const currentX = Math.random() * 512;
                const currentY = Math.random() * 512;
                ctx.lineTo(currentX, currentY);
            }
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;
        
        return texture;
    }
    
    createWeatheredStoneNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Fill with neutral normal color
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, 512, 512);
        
        // Add deep weathering bumps and crevices
        for (let i = 0; i < 1200; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 10 + 2;
            const intensity = Math.random() * 1.0 + 0.3;
            
            const normalGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            
            if (Math.random() > 0.3) {
                // Deep depression (weathering)
                normalGradient.addColorStop(0, `rgba(${128 - intensity * 80}, ${128 - intensity * 80}, ${180}, 1)`);
                normalGradient.addColorStop(1, `rgba(128, 128, 255, 1)`);
            } else {
                // Raised area
                normalGradient.addColorStop(0, `rgba(${128 + intensity * 50}, ${128 + intensity * 50}, ${255}, 1)`);
                normalGradient.addColorStop(1, `rgba(128, 128, 255, 1)`);
            }
            
            ctx.fillStyle = normalGradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;
        
        return texture;
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
        
        // Reset progression for new floor
        this.resetProgression();
        
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
        
        // Phase 5: Add progressive portal system with enhanced masks
        this.addProgressivePortals(roomLayout, theme);
        
        // Store dungeon data
        this.currentDungeon = {
            floor: floorNumber,
            theme: theme,
            roomLayout: roomLayout,
            floorMap: floorMap
        };
        
        console.log(`Unified dungeon floor ${floorNumber} generated with enhanced stone/porcelain portal masks`);
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
        
        // Add entry/exit portals to center room
        if (room.type === 'center') {
            this.addCenterRoomPortals(worldX, worldZ, roomSize, theme);
        }
        
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
    
    addProgressivePortals(roomLayout, theme) {
        console.log('Adding progressive portal system with enhanced stone/porcelain masks...');
        
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
            const portal = this.createEnhancedBillboardPortal(direction, theme, isUnlocked);
            portal.position.set(pos.x, this.floorHeight + 3, pos.z); // Higher up, in the hallway
            portal.name = `${direction}_room_portal`;
            this.currentDungeonGroup.add(portal);
            
            console.log(`Added enhanced ${direction} room portal at (${pos.x}, ${pos.z}) - ${isUnlocked ? 'UNLOCKED' : 'LOCKED'}`);
        });
    }
    
    createEnhancedBillboardPortal(direction, theme, isUnlocked) {
        const portalGroup = new THREE.Group();
        
        // Create enhanced stone/porcelain mask instead of simple geometric one
        const mask = this.createEnhancedGeometricMask(theme, isUnlocked);
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
            maskMesh: mask // Store reference to the mask for color changes
        };
        
        console.log(`Created enhanced ${theme} mask portal for ${direction}, unlocked: ${isUnlocked}`);
        
        return portalGroup;
    }
    
    createEnhancedGeometricMask(theme, isUnlocked) {
        const maskGroup = new THREE.Group();
        
        // Determine mask material based on theme and floor number
        let maskMaterial;
        const materialKey = isUnlocked ? 'unlocked' : 'locked';
        
        if (this.currentFloor <= 10) {
            // Stone theme floors - use weathered stone for more character
            maskMaterial = this.maskMaterials.get(`weathered_${materialKey}`);
        } else if (this.currentFloor <= 30) {
            // Crystal/Ruins themes - use porcelain for elegance
            maskMaterial = this.maskMaterials.get(`porcelain_${materialKey}`);
        } else {
            // Higher floors - use regular stone
            maskMaterial = this.maskMaterials.get(`stone_${materialKey}`);
        }
        
        // Main mask face (oval) - ENHANCED WITH REALISTIC MATERIALS
        const faceGeometry = new THREE.SphereGeometry(3, 32, 24); // Higher detail
        faceGeometry.scale(1, 1.2, 0.3); // Make it more mask-like
        
        const face = new THREE.Mesh(faceGeometry, maskMaterial);
        maskGroup.add(face);
        
        // Eye sockets (black holes) - ENHANCED
        const eyeGeometry = new THREE.SphereGeometry(0.45, 16, 12); // Higher detail
        const eyeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.95
        });
        
        // Left eye socket
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.9, 0.45, 0.3);
        leftEye.scale.set(1, 1.3, 0.8);
        maskGroup.add(leftEye);
        
        // Right eye socket  
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.9, 0.45, 0.3);
        rightEye.scale.set(0.8, 1.1, 0.8);
        maskGroup.add(rightEye);
        
        // Glowing eyes - ENHANCED WITH BETTER MATERIALS
        const eyeColor = isUnlocked ? 0x00ff00 : 0xff0000;
        const eyeGlowGeometry = new THREE.SphereGeometry(0.25, 16, 12);
        const eyeGlowMaterial = new THREE.MeshStandardMaterial({ 
            color: eyeColor,
            transparent: true,
            opacity: 1.0,
            emissive: eyeColor,
            emissiveIntensity: 2.0, // Brighter glow
            roughness: 0.1,
            metalness: 0.1
        });
        
        // Left glowing eye
        const leftGlow = new THREE.Mesh(eyeGlowGeometry, eyeGlowMaterial);
        leftGlow.position.set(-0.9, 0.45, 0.35);
        maskGroup.add(leftGlow);
        
        // Right glowing eye
        const rightGlow = new THREE.Mesh(eyeGlowGeometry, eyeGlowMaterial);
        rightGlow.position.set(0.9, 0.45, 0.35);
        rightGlow.scale.set(0.8, 0.8, 0.8);
        maskGroup.add(rightGlow);
        
        // Mouth (dark opening) - ENHANCED
        const mouthGeometry = new THREE.SphereGeometry(0.6, 16, 12);
        mouthGeometry.scale(1, 0.5, 0.8);
        const mouthMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.9
        });
        
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, -0.75, 0.2);
        maskGroup.add(mouth);
        
        // Enhanced teeth with better materials
        const toothGeometry = new THREE.BoxGeometry(0.08, 0.3, 0.08);
        const toothMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFACD,
            roughness: 0.3,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9
        });
        
        for (let i = 0; i < 4; i++) {
            const tooth = new THREE.Mesh(toothGeometry, toothMaterial);
            tooth.position.set(-0.22 + i * 0.15, -0.6, 0.3);
            maskGroup.add(tooth);
        }
        
        // Enhanced cracks/weathering marks using mask material
        const crackGeometry = new THREE.BoxGeometry(0.03, 1.2, 0.03);
        const crackMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a1a1a,
            transparent: true,
            opacity: 0.8,
            roughness: 0.9,
            metalness: 0.0
        });
        
        const crack1 = new THREE.Mesh(crackGeometry, crackMaterial);
        crack1.position.set(-1.2, 0, 0.35);
        crack1.rotation.z = Math.PI / 6;
        maskGroup.add(crack1);
        
        const crack2 = new THREE.Mesh(crackGeometry, crackMaterial);
        crack2.position.set(1.05, -0.45, 0.35);
        crack2.rotation.z = -Math.PI / 4;
        crack2.scale.set(1, 0.6, 1);
        maskGroup.add(crack2);
        
        // Add additional weathering details for stone masks
        if (maskMaterial === this.maskMaterials.get('weathered_locked') || 
            maskMaterial === this.maskMaterials.get('weathered_unlocked')) {
            this.addWeatheringDetails(maskGroup);
        }
        
        // Store references for color changes
        maskGroup.userData = {
            face: face,
            leftGlow: leftGlow,
            rightGlow: rightGlow,
            isUnlocked: isUnlocked,
            theme: theme
        };
        
        return maskGroup;
    }
    
    addWeatheringDetails(maskGroup) {
        // Add moss patches for weathered stone masks
        const mossGeometry = new THREE.SphereGeometry(0.2, 8, 6);
        const mossMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a6a3a,
            roughness: 0.9,
            metalness: 0.0,
            transparent: true,
            opacity: 0.7
        });
        
        // Random moss patches
        for (let i = 0; i < 3; i++) {
            const moss = new THREE.Mesh(mossGeometry, mossMaterial);
            moss.position.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                0.3 + Math.random() * 0.2
            );
            moss.scale.setScalar(0.5 + Math.random() * 0.5);
            maskGroup.add(moss);
        }
        
        // Add chipped edges
        const chipGeometry = new THREE.SphereGeometry(0.1, 6, 4);
        const chipMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a2a1a,
            roughness: 1.0,
            metalness: 0.0,
            transparent: true,
            opacity: 0.8
        });
        
        for (let i = 0; i < 4; i++) {
            const chip = new THREE.Mesh(chipGeometry, chipMaterial);
            const angle = (i / 4) * Math.PI * 2;
            chip.position.set(
                Math.cos(angle) * 2.8,
                Math.sin(angle) * 2.8,
                0.1 + Math.random() * 0.2
            );
            maskGroup.add(chip);
        }
    }
    
    addPortalParticleEffects(portalGroup, isUnlocked) {
        const particleCount = 12;
        const particleColor = isUnlocked ? 0x44ff44 : 0xff4444;
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 8, 6);
            const particleMaterial = new THREE.MeshStandardMaterial({
                color: particleColor,
                transparent: true,
                opacity: 0.7,
                emissive: particleColor,
                emissiveIntensity: 1.0,
                roughness: 0.3,
                metalness: 0.1
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
                bobAmount: 0.3
            };
            
            portalGroup.add(particle);
        }
    }
    
    addCenterRoomPortals(worldX, worldZ, roomSize, theme) {
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
                
                // Update enhanced mask materials and colors
                if (child.userData.maskMesh && child.userData.maskMesh.userData) {
                    const maskData = child.userData.maskMesh.userData;
                    
                    try {
                        // Update eye glow colors and materials
                        const newEyeColor = shouldOpen ? 0x00ff00 : 0xff0000;
                        if (maskData.leftGlow && maskData.leftGlow.material) {
                            maskData.leftGlow.material.color.setHex(newEyeColor);
                            maskData.leftGlow.material.emissive.setHex(newEyeColor);
                            maskData.leftGlow.material.emissiveIntensity = shouldOpen ? 2.5 : 2.0;
                        }
                        if (maskData.rightGlow && maskData.rightGlow.material) {
                            maskData.rightGlow.material.color.setHex(newEyeColor);
                            maskData.rightGlow.material.emissive.setHex(newEyeColor);
                            maskData.rightGlow.material.emissiveIntensity = shouldOpen ? 2.5 : 2.0;
                        }
                        
                        // Update face material if needed
                        if (maskData.face && maskData.face.material) {
                            const currentTheme = maskData.theme || 'stone';
                            const materialKey = shouldOpen ? 'unlocked' : 'locked';
                            let newMaterial;
                            
                            if (this.currentFloor <= 10) {
                                newMaterial = this.maskMaterials.get(`weathered_${materialKey}`);
                            } else if (this.currentFloor <= 30) {
                                newMaterial = this.maskMaterials.get(`porcelain_${materialKey}`);
                            } else {
                                newMaterial = this.maskMaterials.get(`stone_${materialKey}`);
                            }
                            
                            if (newMaterial) {
                                maskData.face.material = newMaterial;
                            }
                        }
                        
                        maskData.isUnlocked = shouldOpen;
                        console.log(`Updated enhanced mask materials for ${direction}`);
                    } catch (error) {
                        console.error('Error updating enhanced mask materials:', error);
                    }
                }
                
                // Update particle colors with enhanced materials
                child.traverse((subChild) => {
                    if (subChild.material && subChild.material.color && subChild.userData.swirSpeed !== undefined) {
                        try {
                            const newColor = shouldOpen ? 0x44ff44 : 0xff4444;
                            subChild.material.color.setHex(newColor);
                            if (subChild.material.emissive) {
                                subChild.material.emissive.setHex(newColor);
                                subChild.material.emissiveIntensity = shouldOpen ? 1.2 : 1.0;
                            }
                        } catch (error) {
                            console.error('Error updating particle color:', error);
                        }
                    }
                });
                
                console.log(`Enhanced ${direction} room portal ${shouldOpen ? 'opened' : 'closed'}`);
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
        console.log('All rooms completed - adding enhanced exit portal!');
        
        // Find center room
        if (this.currentDungeon && this.currentDungeon.roomLayout.rooms.center) {
            const centerRoom = this.currentDungeon.roomLayout.rooms.center;
            const centerWorldX = (centerRoom.gridX - this.gridWidth/2) * this.gridSize;
            const centerWorldZ = (centerRoom.gridZ - this.gridDepth/2) * this.gridSize;
            const roomSize = centerRoom.size * this.gridSize;
            
            // Create and add exit portal using enhanced materials
            const exitPortal = this.createEnhancedBillboardPortal('exit', this.getCurrentTheme(), true);
            exitPortal.position.set(centerWorldX, this.floorHeight + 3, centerWorldZ + roomSize * 0.3);
            exitPortal.name = 'exit_portal';
            exitPortal.userData.isBlocking = false; // Exit is immediately usable
            exitPortal.userData.portalType = 'exit';
            exitPortal.userData.direction = 'exit';
            
            this.currentDungeonGroup.add(exitPortal);
            console.log('Enhanced exit portal added and opened with realistic stone/porcelain materials!');
        }
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
                
                // Update enhanced portal animations
                if (child.userData.portalType && child.userData.portalType.includes('room_entrance')) {
                    this.updateEnhancedPortalAnimations(child, deltaTime);
                }
                
                // Update portal particles
                if (child.userData.swirSpeed !== undefined) {
                    this.updatePortalParticles(child, deltaTime);
                }
                
                // Make mask faces lock onto player for extra creepiness
                if (child.userData.maskMesh && window.game && window.game.camera) {
                    child.userData.maskMesh.lookAt(window.game.camera.position);
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
    
    updateEnhancedPortalAnimations(portalGroup, deltaTime) {
        const time = Date.now() * 0.001;
        
        // Enhanced breathing/pulsing animation
        const pulseScale = 1 + Math.sin(time * portalGroup.userData.pulseSpeed) * portalGroup.userData.pulseAmount;
        
        // Apply pulse to the mask mesh specifically
        if (portalGroup.userData.maskMesh) {
            portalGroup.userData.maskMesh.scale.setScalar(pulseScale);
        }
        
        // Subtle floating motion - keep it within bounds
        const originalY = portalGroup.userData.originalY;
        const floatOffset = Math.sin(time * 0.6) * 0.2; // Only 0.2 units up/down
        portalGroup.position.y = originalY + floatOffset;
        
        // Enhanced eye glow pulsing with material variations
        if (portalGroup.userData.maskMesh && portalGroup.userData.maskMesh.userData) {
            const maskData = portalGroup.userData.maskMesh.userData;
            const glowIntensity = 1.5 + Math.sin(time * 3) * 0.8; // More dramatic pulsing
            
            if (maskData.leftGlow && maskData.leftGlow.material) {
                maskData.leftGlow.material.emissiveIntensity = glowIntensity;
                // Add subtle color temperature variation
                const tempShift = Math.sin(time * 2) * 0.1;
                if (maskData.isUnlocked) {
                    maskData.leftGlow.material.emissive.setRGB(0, 1, tempShift);
                } else {
                    maskData.leftGlow.material.emissive.setRGB(1, tempShift, 0);
                }
            }
            if (maskData.rightGlow && maskData.rightGlow.material) {
                maskData.rightGlow.material.emissiveIntensity = glowIntensity * 0.9; // Slightly different timing
                const tempShift = Math.sin(time * 2.3) * 0.1;
                if (maskData.isUnlocked) {
                    maskData.rightGlow.material.emissive.setRGB(0, 1, tempShift);
                } else {
                    maskData.rightGlow.material.emissive.setRGB(1, tempShift, 0);
                }
            }
        }
        
        // Update particle effects around portal
        portalGroup.traverse((child) => {
            if (child.userData.swirSpeed !== undefined) {
                this.updatePortalParticles(child, deltaTime);
            }
        });
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
        
        // Enhanced particle glow pulsing
        if (particle.material && particle.material.emissiveIntensity !== undefined) {
            const pulseFactor = 0.8 + Math.sin(time * 4 + particle.userData.originalAngle) * 0.4;
            particle.material.emissiveIntensity = pulseFactor;
        }
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
