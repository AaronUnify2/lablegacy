// ============================================
// BUILDINGS MODULE
// ============================================

window.GameBuildings = (function() {
    console.log('buildings.js loading...');
    
    // Get references lazily to avoid initialization order issues
    const getEngine = () => window.GameEngine;
    const getScene = () => window.GameEngine?.scene;
    const getGameState = () => window.GameEngine?.gameState;
    const getTHREE = () => window.GameEngine?.THREE || window.THREE;
    
    // Building definitions
    const BUILDING_TYPES = {
        BARRACKS: {
            id: 'barracks',
            name: 'Barracks',
            cost: { wood: 50, energy: 20 },
            unitType: 'knight',
            unitCost: { energy: 15 },
            productionTime: 3000,
            description: 'Trains Knights',
            category: 'military'
        },
        LODGE: {
            id: 'lodge',
            name: 'Lodge',
            cost: { wood: 30, energy: 10 },
            unitType: 'woodsman',
            unitCost: { energy: 10 },
            productionTime: 2000,
            description: 'Trains Woodsmen to harvest trees',
            category: 'economy'
        },
        FARM: {
            id: 'farm',
            name: 'Farm',
            cost: { wood: 40, energy: 15 },
            unitType: 'planter',
            unitCost: { energy: 12 },
            productionTime: 2500,
            description: 'Trains Planters to grow trees',
            category: 'economy'
        },
        ARROW_TOWER: {
            id: 'arrow_tower',
            name: 'Arrow Tower',
            cost: { wood: 60, energy: 25 },
            unitType: 'archer',
            unitCost: { energy: 12 },
            productionTime: 2500,
            description: 'Trains Archers. Spawns 3 on destruction',
            category: 'military',
            onDestroy: { spawnUnit: 'archer', count: 3 }
        },
        SAWMILL: {
            id: 'sawmill',
            name: 'Sawmill',
            cost: { wood: 40, energy: 15 },
            unitType: null,
            unitCost: null,
            productionTime: null,
            description: 'Woodsmen deposit wood here',
            category: 'economy',
            isDepot: true,
            resourceType: 'wood'
        },
        GREENHOUSE: {
            id: 'greenhouse',
            name: 'Alchemist Hut',
            cost: { wood: 55, energy: 30 },
            unitType: 'botanist',
            unitCost: { energy: 18 },
            productionTime: 3500,
            description: 'Trains Botanists to grow magical plants',
            category: 'support'
        },
        HIVE: {
            id: 'hive',
            name: 'Hive',
            cost: { wood: 65, energy: 35 },
            unitType: 'dragonfly',
            unitCost: { energy: 20 },
            productionTime: 4000,
            description: 'Breeds Dragonflies that fly over trees',
            category: 'military'
        },
        MAGE_TOWER: {
            id: 'mage_tower',
            name: 'Mage Tower',
            cost: { wood: 70, energy: 40 },
            unitType: 'mage',
            unitCost: { energy: 25 },
            productionTime: 4000,
            description: 'Trains Mages with powerful attacks',
            category: 'military'
        },
        FURNACE: {
            id: 'furnace',
            name: 'Furnace',
            cost: { wood: 45, energy: 20 },
            unitType: null,
            unitCost: null,
            productionTime: null,
            description: 'Burns wood to generate energy (10:1)',
            category: 'economy',
            isConverter: true,
            conversionRate: { input: 'wood', output: 'energy', ratio: 10 }
        },
        ROYAL_TENT: {
            id: 'royal_tent',
            name: 'Royal Tent',
            cost: { wood: 100, energy: 50 },
            unitType: 'random',
            unitCost: { wood: 20, energy: 20 },
            productionTime: 180000, // 3 minutes
            description: 'WIN CONDITION. Trains random upgraded units',
            category: 'special',
            isWinCondition: true
        }
    };
    
    // Create building sprite material
    function createBuildingMaterial(buildingType) {
        const THREE = getTHREE();
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 64, 64);
        
        // Draw different buildings based on type
        switch(buildingType.id) {
            case 'barracks':
                drawBarracks(ctx);
                break;
            case 'lodge':
                drawLodge(ctx);
                break;
            case 'farm':
                drawFarm(ctx);
                break;
            case 'arrow_tower':
                drawArrowTower(ctx);
                break;
            case 'sawmill':
                drawSawmill(ctx);
                break;
            case 'greenhouse':
                drawGreenhouse(ctx);
                break;
            case 'hive':
                drawHive(ctx);
                break;
            case 'mage_tower':
                drawMageTower(ctx);
                break;
            case 'furnace':
                drawFurnace(ctx);
                break;
            case 'royal_tent':
                drawRoyalTent(ctx);
                break;
            default:
                drawBarracks(ctx);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        return new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
    }
    
    function drawBarracks(ctx) {
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(4, 52, 56, 12);
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(8, 24, 48, 32);
        ctx.fillStyle = '#6b3510';
        ctx.fillRect(8, 24, 12, 32);
        ctx.fillStyle = '#4a2810';
        ctx.beginPath();
        ctx.moveTo(4, 24);
        ctx.lineTo(32, 4);
        ctx.lineTo(60, 24);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(26, 38, 12, 18);
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(12, 30, 8, 8);
        ctx.fillRect(44, 30, 8, 8);
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(32, 0, 2, 8);
        ctx.beginPath();
        ctx.moveTo(34, 0);
        ctx.lineTo(44, 4);
        ctx.lineTo(34, 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 24, 48, 32);
    }
    
    function drawLodge(ctx) {
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(6, 50, 52, 14);
        ctx.fillStyle = '#8B6914';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(8, 28 + i * 5, 48, 4);
            ctx.fillStyle = i % 2 === 0 ? '#7a5a10' : '#8B6914';
        }
        ctx.fillStyle = '#5a4a3a';
        ctx.beginPath();
        ctx.moveTo(2, 28);
        ctx.lineTo(32, 8);
        ctx.lineTo(62, 28);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(24, 36, 16, 18);
        ctx.fillStyle = '#6a5040';
        ctx.fillRect(26, 38, 5, 14);
        ctx.fillRect(33, 38, 5, 14);
        ctx.fillStyle = '#6a5a4a';
        ctx.fillRect(44, 4, 8, 14);
        ctx.fillStyle = 'rgba(150,150,150,0.5)';
        ctx.beginPath();
        ctx.arc(48, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 28, 48, 26);
    }
    
    function drawFarm(ctx) {
        ctx.fillStyle = '#4a4a3a';
        ctx.fillRect(8, 52, 48, 12);
        ctx.fillStyle = '#a03030';
        ctx.fillRect(10, 26, 44, 30);
        ctx.fillStyle = '#802020';
        ctx.fillRect(10, 26, 10, 30);
        ctx.fillStyle = '#5a3a2a';
        ctx.beginPath();
        ctx.moveTo(6, 26);
        ctx.lineTo(32, 6);
        ctx.lineTo(58, 26);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#6a4a3a';
        ctx.fillRect(20, 36, 24, 20);
        ctx.fillStyle = '#5a3a2a';
        ctx.fillRect(31, 36, 2, 20);
        ctx.strokeStyle = '#4a2a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(22, 38);
        ctx.lineTo(30, 54);
        ctx.moveTo(30, 38);
        ctx.lineTo(22, 54);
        ctx.stroke();
        ctx.fillStyle = '#2a1a0a';
        ctx.beginPath();
        ctx.moveTo(32, 12);
        ctx.lineTo(26, 22);
        ctx.lineTo(38, 22);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3a8a3a';
        ctx.fillRect(2, 56, 6, 8);
        ctx.fillRect(56, 56, 6, 8);
    }
    
    function drawArrowTower(ctx) {
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(16, 50, 32, 14);
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(18, 16, 28, 38);
        ctx.fillStyle = '#6a6a6a';
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 3; x++) {
                if ((x + y) % 2 === 0) {
                    ctx.fillRect(20 + x * 9, 18 + y * 6, 8, 5);
                }
            }
        }
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(14, 10, 8, 10);
        ctx.fillRect(28, 10, 8, 10);
        ctx.fillRect(42, 10, 8, 10);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(30, 24, 4, 10);
        ctx.fillRect(30, 40, 4, 8);
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(32, 0, 2, 12);
        ctx.beginPath();
        ctx.moveTo(34, 0);
        ctx.lineTo(46, 4);
        ctx.lineTo(34, 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(18, 16, 28, 38);
    }
    
    function drawSawmill(ctx) {
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(4, 52, 56, 12);
        ctx.fillStyle = '#8a7a6a';
        ctx.fillRect(8, 28, 48, 28);
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(4, 22, 56, 8);
        ctx.fillStyle = '#6a5a4a';
        ctx.beginPath();
        ctx.arc(58, 44, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a4a3a';
        ctx.beginPath();
        ctx.arc(58, 44, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a3a2a';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(58, 44);
            ctx.lineTo(58 + Math.cos(angle) * 10, 44 + Math.sin(angle) * 10);
            ctx.stroke();
        }
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(12, 52, 8, 6);
        ctx.fillRect(22, 50, 8, 8);
        ctx.fillRect(32, 52, 8, 6);
        ctx.fillStyle = '#aaaaaa';
        ctx.beginPath();
        ctx.arc(32, 38, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(32, 38, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(14, 40, 10, 16);
    }
    
    function drawGreenhouse(ctx) {
        // Alchemist's Hut - mystical cottage with potions and vines
        // Foundation with moss
        ctx.fillStyle = '#3a4a3a';
        ctx.fillRect(8, 52, 48, 12);
        ctx.fillStyle = '#2a5a2a';
        ctx.fillRect(10, 54, 8, 4);
        ctx.fillRect(46, 55, 6, 3);
        
        // Main hut body - old wood
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(12, 26, 40, 30);
        
        // Wood grain/planks
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(12, 32, 40, 2);
        ctx.fillRect(12, 42, 40, 2);
        
        // Crooked thatched roof
        ctx.fillStyle = '#6a5a2a';
        ctx.beginPath();
        ctx.moveTo(6, 28);
        ctx.lineTo(28, 4);
        ctx.lineTo(34, 6);
        ctx.lineTo(58, 28);
        ctx.closePath();
        ctx.fill();
        
        // Roof thatch texture
        ctx.fillStyle = '#5a4a1a';
        ctx.fillRect(14, 16, 4, 8);
        ctx.fillRect(24, 12, 4, 10);
        ctx.fillRect(38, 14, 4, 10);
        ctx.fillRect(46, 18, 4, 8);
        
        // Round door
        ctx.fillStyle = '#3a2a1a';
        ctx.beginPath();
        ctx.arc(32, 48, 8, Math.PI, 0, true);
        ctx.fillRect(24, 48, 16, 8);
        ctx.fill();
        
        // Door handle
        ctx.fillStyle = '#8a7a4a';
        ctx.fillRect(36, 48, 2, 4);
        
        // Round window with potion glow
        ctx.fillStyle = '#2a4a2a';
        ctx.beginPath();
        ctx.arc(20, 36, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4aea4a';
        ctx.beginPath();
        ctx.arc(20, 36, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Bubbling cauldron outside
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.arc(54, 52, 6, 0, Math.PI, true);
        ctx.fill();
        ctx.fillStyle = '#4a2a6a';
        ctx.beginPath();
        ctx.arc(54, 52, 4, 0, Math.PI, true);
        ctx.fill();
        
        // Bubbles
        ctx.fillStyle = '#8a4aca';
        ctx.beginPath();
        ctx.arc(52, 48, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(56, 46, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(54, 44, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Vines growing on building
        ctx.fillStyle = '#2a6a2a';
        ctx.fillRect(10, 30, 3, 26);
        ctx.fillRect(8, 38, 3, 3);
        ctx.fillRect(6, 44, 3, 3);
        ctx.fillRect(50, 34, 3, 22);
        ctx.fillRect(52, 40, 3, 3);
        
        // Vine leaves
        ctx.fillStyle = '#3a8a3a';
        ctx.beginPath();
        ctx.arc(9, 34, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(7, 42, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(53, 38, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Chimney with colored smoke
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(42, 2, 6, 12);
        ctx.fillStyle = 'rgba(100, 50, 150, 0.5)';
        ctx.beginPath();
        ctx.arc(45, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(50, 150, 100, 0.4)';
        ctx.beginPath();
        ctx.arc(48, -2, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    function drawHive(ctx) {
        // Giant beehive structure
        // Ground/base
        ctx.fillStyle = '#4a4a3a';
        ctx.fillRect(16, 56, 32, 8);
        
        // Main hive body - layered dome shape
        ctx.fillStyle = '#c9a227';
        ctx.beginPath();
        ctx.ellipse(32, 50, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#d4aa30';
        ctx.beginPath();
        ctx.ellipse(32, 40, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#deb838';
        ctx.beginPath();
        ctx.ellipse(32, 30, 17, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#e8c240';
        ctx.beginPath();
        ctx.ellipse(32, 22, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Top point
        ctx.fillStyle = '#d4aa30';
        ctx.beginPath();
        ctx.moveTo(26, 14);
        ctx.lineTo(32, 4);
        ctx.lineTo(38, 14);
        ctx.closePath();
        ctx.fill();
        
        // Honeycomb pattern (hexagons)
        ctx.fillStyle = '#b8942a';
        // Row 1
        drawHexagon(ctx, 26, 32, 4);
        drawHexagon(ctx, 34, 32, 4);
        // Row 2
        drawHexagon(ctx, 22, 40, 4);
        drawHexagon(ctx, 30, 40, 4);
        drawHexagon(ctx, 38, 40, 4);
        // Row 3
        drawHexagon(ctx, 26, 48, 4);
        drawHexagon(ctx, 34, 48, 4);
        
        // Entrance hole
        ctx.fillStyle = '#4a3a1a';
        ctx.beginPath();
        ctx.ellipse(32, 52, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Flying dragonflies around hive
        drawDragonfly(ctx, 8, 20, 0.6);
        drawDragonfly(ctx, 52, 28, 0.5);
        drawDragonfly(ctx, 56, 12, 0.7);
        
        // Outline/texture lines
        ctx.strokeStyle = '#a08020';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(32, 50, 22, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(32, 40, 20, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(32, 30, 17, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    function drawHexagon(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const px = x + Math.cos(angle) * size;
            const py = y + Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }
    
    function drawDragonfly(ctx, x, y, scale) {
        // Body
        ctx.fillStyle = '#30a0d0';
        ctx.fillRect(x, y, 8 * scale, 3 * scale);
        
        // Wings
        ctx.fillStyle = 'rgba(200, 230, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(x + 2 * scale, y - 1 * scale, 4 * scale, 2 * scale, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 2 * scale, y + 4 * scale, 4 * scale, 2 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.fillStyle = '#40b0e0';
        ctx.beginPath();
        ctx.arc(x + 8 * scale, y + 1.5 * scale, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
    }
    
    function drawMageTower(ctx) {
        ctx.fillStyle = '#4a4a5a';
        ctx.fillRect(18, 52, 28, 12);
        ctx.fillStyle = '#6a6a7a';
        ctx.beginPath();
        ctx.moveTo(16, 54);
        ctx.lineTo(22, 18);
        ctx.lineTo(42, 18);
        ctx.lineTo(48, 54);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5a5a6a';
        for (let y = 0; y < 5; y++) {
            ctx.fillRect(22 + y, 22 + y * 7, 20 - y * 2, 5);
        }
        ctx.fillStyle = '#4a2a6a';
        ctx.beginPath();
        ctx.moveTo(32, 0);
        ctx.lineTo(18, 20);
        ctx.lineTo(46, 20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#aa66ff';
        ctx.beginPath();
        ctx.arc(32, 32, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cc99ff';
        ctx.beginPath();
        ctx.arc(32, 32, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9933ff';
        ctx.beginPath();
        ctx.arc(32, 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cc66ff';
        ctx.beginPath();
        ctx.arc(31, 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(24, 26, 2, 2);
        ctx.fillRect(38, 38, 2, 2);
        ctx.fillRect(28, 44, 2, 2);
        ctx.strokeStyle = '#2a1a4a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(16, 54);
        ctx.lineTo(22, 18);
        ctx.lineTo(42, 18);
        ctx.lineTo(48, 54);
        ctx.stroke();
    }
    
    function drawFurnace(ctx) {
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(8, 52, 48, 12);
        ctx.fillStyle = '#8a4a3a';
        ctx.fillRect(12, 28, 40, 28);
        ctx.fillStyle = '#7a3a2a';
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                const offset = y % 2 === 0 ? 0 : 5;
                ctx.fillRect(14 + x * 10 + offset, 30 + y * 7, 8, 5);
            }
        }
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(24, 42, 16, 14);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(26, 44, 12, 10);
        ctx.fillStyle = '#ffdd00';
        ctx.fillRect(28, 46, 8, 6);
        ctx.fillStyle = '#5a4a4a';
        ctx.fillRect(40, 8, 12, 24);
        ctx.fillStyle = 'rgba(80,80,80,0.6)';
        ctx.beginPath();
        ctx.arc(46, 4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(50, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(12, 28, 40, 3);
        ctx.fillRect(12, 40, 40, 2);
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.arc(8, 58, 6, 0, Math.PI, true);
        ctx.fill();
    }
    
    function drawRoyalTent(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(32, 60, 28, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#daa520';
        ctx.beginPath();
        ctx.moveTo(32, 6);
        ctx.lineTo(4, 56);
        ctx.lineTo(60, 56);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#b8860b';
        ctx.beginPath();
        ctx.moveTo(32, 6);
        ctx.lineTo(18, 56);
        ctx.lineTo(10, 56);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(32, 6);
        ctx.lineTo(46, 56);
        ctx.lineTo(54, 56);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#4a2a1a';
        ctx.beginPath();
        ctx.moveTo(32, 26);
        ctx.lineTo(22, 56);
        ctx.lineTo(42, 56);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.moveTo(32, 32);
        ctx.lineTo(26, 38);
        ctx.lineTo(26, 46);
        ctx.lineTo(32, 50);
        ctx.lineTo(38, 46);
        ctx.lineTo(38, 38);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(28, 36, 8, 4);
        ctx.fillRect(27, 34, 2, 3);
        ctx.fillRect(31, 33, 2, 4);
        ctx.fillRect(35, 34, 2, 3);
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(31, 0, 2, 10);
        ctx.fillStyle = '#4169e1';
        ctx.fillRect(33, 0, 12, 8);
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(39, 4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(32, 6);
        ctx.lineTo(4, 56);
        ctx.lineTo(60, 56);
        ctx.closePath();
        ctx.stroke();
    }
    
    // Place a building on a site
    function placeBuilding(site, buildingTypeId) {
        const THREE = getTHREE();
        const scene = getScene();
        const gameState = getGameState();
        
        const buildingType = BUILDING_TYPES[buildingTypeId];
        if (!buildingType) return null;
        
        // Check resources
        if (gameState.resources.wood < buildingType.cost.wood ||
            gameState.resources.energy < buildingType.cost.energy) {
            console.log('Not enough resources!');
            return null;
        }
        
        // Deduct resources
        gameState.resources.wood -= buildingType.cost.wood;
        gameState.resources.energy -= buildingType.cost.energy;
        
        // Create building sprite
        const material = createBuildingMaterial(buildingType);
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(8, 8, 1);
        sprite.position.set(
            site.position.x,
            4,
            site.position.z
        );
        
        scene.add(sprite);
        
        // Create building data
        const building = {
            id: `building_${Date.now()}`,
            type: buildingTypeId,
            typeData: buildingType,
            sprite: sprite,
            site: site,
            position: { x: site.position.x, z: site.position.z },
            productionQueue: [],
            isProducing: false,
            productionProgress: 0,
            upgrades: {
                path1: 0,
                path2: 0,
                path3: 0
            }
        };
        
        // Link building to site
        site.userData.building = building;
        
        // Change site appearance
        site.material.color.setHex(0x4a6a4a);
        site.material.opacity = 0.3;
        
        gameState.buildings.push(building);
        
        // Update UI
        updateResourceDisplay();
        
        return building;
    }
    
    // Queue unit production
    function queueUnit(building) {
        const gameState = getGameState();
        const unitCost = building.typeData.unitCost;
        
        if (gameState.resources.energy < unitCost.energy) {
            console.log('Not enough energy!');
            return false;
        }
        
        gameState.resources.energy -= unitCost.energy;
        building.productionQueue.push({
            unitType: building.typeData.unitType,
            startTime: null
        });
        
        updateResourceDisplay();
        return true;
    }
    
    // Update building production
    function updateProduction(deltaTime) {
        const gameState = getGameState();
        gameState.buildings.forEach(building => {
            if (building.productionQueue.length > 0 && !building.isProducing) {
                // Start producing
                building.isProducing = true;
                building.productionProgress = 0;
                building.productionQueue[0].startTime = Date.now();
            }
            
            if (building.isProducing) {
                building.productionProgress += deltaTime;
                
                if (building.productionProgress >= building.typeData.productionTime) {
                    // Unit complete
                    const unitData = building.productionQueue.shift();
                    building.isProducing = false;
                    building.productionProgress = 0;
                    
                    // Spawn unit
                    if (window.GameUnits) {
                        GameUnits.spawnUnit(unitData.unitType, building.position, building.upgrades);
                    }
                }
            }
        });
    }
    
    // Update resource display
    function updateResourceDisplay() {
        // Will be handled by UI module
        if (window.GameUI) {
            GameUI.updateResources();
        }
    }
    
    // Initialize
    function init() {
        console.log('Buildings module initialized');
    }
    
    // Public API
    return {
        init,
        BUILDING_TYPES,
        placeBuilding,
        queueUnit,
        updateProduction,
        createBuildingMaterial
    };
})();
