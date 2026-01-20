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
            productionTime: 3000, // ms
            color: 0x8b4513,
            description: 'Trains Knights'
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
        
        // Base building shape - simple medieval barracks
        // Foundation
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(4, 52, 56, 12);
        
        // Main building body
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(8, 24, 48, 32);
        
        // Darker side for depth
        ctx.fillStyle = '#6b3510';
        ctx.fillRect(8, 24, 12, 32);
        
        // Roof
        ctx.fillStyle = '#4a2810';
        ctx.beginPath();
        ctx.moveTo(4, 24);
        ctx.lineTo(32, 4);
        ctx.lineTo(60, 24);
        ctx.closePath();
        ctx.fill();
        
        // Roof highlight
        ctx.fillStyle = '#5a3815';
        ctx.beginPath();
        ctx.moveTo(32, 4);
        ctx.lineTo(60, 24);
        ctx.lineTo(32, 18);
        ctx.closePath();
        ctx.fill();
        
        // Door
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(26, 38, 12, 18);
        
        // Door frame
        ctx.fillStyle = '#5a4030';
        ctx.fillRect(24, 36, 2, 20);
        ctx.fillRect(38, 36, 2, 20);
        ctx.fillRect(24, 36, 16, 2);
        
        // Windows
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(12, 30, 8, 8);
        ctx.fillRect(44, 30, 8, 8);
        
        // Window frames
        ctx.fillStyle = '#5a4030';
        ctx.fillRect(15, 30, 2, 8);
        ctx.fillRect(47, 30, 2, 8);
        ctx.fillRect(12, 33, 8, 2);
        ctx.fillRect(44, 33, 8, 2);
        
        // Banner/flag
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(32, 0, 2, 8);
        ctx.beginPath();
        ctx.moveTo(34, 0);
        ctx.lineTo(44, 4);
        ctx.lineTo(34, 8);
        ctx.closePath();
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 24, 48, 32);
        ctx.beginPath();
        ctx.moveTo(4, 24);
        ctx.lineTo(32, 4);
        ctx.lineTo(60, 24);
        ctx.closePath();
        ctx.stroke();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        return new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
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
