// ============================================
// UNITS MODULE - Enhanced with Woodsman & Pathfinding
// ============================================

window.GameUnits = (function() {
    console.log('units.js loading...');
    
    // Get references lazily to avoid initialization order issues
    const getEngine = () => window.GameEngine;
    const getScene = () => window.GameEngine?.scene;
    const getGameState = () => window.GameEngine?.gameState;
    const getTHREE = () => window.GameEngine?.THREE || window.THREE;
    const getCONFIG = () => window.GameEngine?.CONFIG;
    const getCELL = () => window.GameEngine?.CELL;
    
    let lastTime = Date.now();
    let selectedUnit = null;
    let commandMode = null; // null, 'move', 'harvest_target'
    
    // Unit definitions
    const UNIT_TYPES = {
        knight: {
            id: 'knight',
            name: 'Knight',
            health: 100,
            damage: 15,
            speed: 0.04,
            attackRange: 2,
            attackSpeed: 1000,
            harvestSpeed: 0,
            carryCapacity: 0,
            canHarvest: false,
            scale: 1.0
        },
        woodsman: {
            id: 'woodsman',
            name: 'Woodsman',
            health: 60,
            damage: 8,
            speed: 0.035,
            attackRange: 1.5,
            attackSpeed: 1200,
            harvestSpeed: 3000, // ms to chop one tree (3 seconds)
            carryCapacity: 5, // trees before returning
            canHarvest: true,
            scale: 1.0
        },
        archer: {
            id: 'archer',
            name: 'Archer',
            health: 50,
            damage: 12,
            speed: 0.045,
            attackRange: 12,
            attackSpeed: 1500,
            harvestSpeed: 0,
            carryCapacity: 0,
            canHarvest: false,
            scale: 0.9
        },
        botanist: {
            id: 'botanist',
            name: 'Botanist',
            health: 45,
            damage: 5,
            speed: 0.03,
            attackRange: 8,
            attackSpeed: 2000,
            harvestSpeed: 0,
            carryCapacity: 0,
            canHarvest: false,
            scale: 0.9
        },
        dragonfly: {
            id: 'dragonfly',
            name: 'Dragonfly',
            health: 35,
            damage: 10,
            speed: 0.06,
            attackRange: 3,
            attackSpeed: 800,
            harvestSpeed: 0,
            carryCapacity: 0,
            canHarvest: false,
            canFly: true,
            scale: 0.85
        },
        mage: {
            id: 'mage',
            name: 'Mage',
            health: 40,
            damage: 25,
            speed: 0.025,
            attackRange: 10,
            attackSpeed: 2500,
            harvestSpeed: 0,
            carryCapacity: 0,
            canHarvest: false,
            scale: 1.0
        },
        planter: {
            id: 'planter',
            name: 'Planter',
            health: 50,
            damage: 5,
            speed: 0.03,
            attackRange: 1.5,
            attackSpeed: 1500,
            harvestSpeed: 0,
            carryCapacity: 0,
            canHarvest: false,
            canPlant: true,
            scale: 0.9
        }
    };
    
    // Woodsman upgrade definitions
    const WOODSMAN_UPGRADES = {
        path1: { // Harvest Speed
            name: 'Harvest Speed',
            levels: [
                { name: 'Sharp Axe', description: 'Harvest 25% faster', effect: { harvestSpeedMult: 0.75 } },
                { name: 'Rhythm', description: 'Each chop speeds up the next', effect: { rhythmBonus: true } },
                { name: 'Clear Cutter', description: 'Damages adjacent trees while harvesting', effect: { cleave: true } }
            ]
        },
        path2: { // Carry/Economy
            name: 'Carry/Economy',
            levels: [
                { name: 'Deep Pockets', description: 'Carry +50% more', effect: { carryMult: 1.5 } },
                { name: 'Efficient Routes', description: '+20% resource value on deposit', effect: { depositMult: 1.2 } },
                { name: 'Specialist', description: 'Purple trees yield double energy', effect: { energySpecialist: true } }
            ]
        },
        path3: { // Survival
            name: 'Survival',
            levels: [
                { name: 'Thick Hide', description: 'Health +50%', effect: { healthMult: 1.5 } },
                { name: 'Forester', description: 'Move through trees at half speed', effect: { forestWalk: true } },
                { name: 'Trapper', description: 'Places snare that roots first enemy', effect: { trapAbility: true } }
            ]
        }
    };
    
    // ============================================
    // A* PATHFINDING
    // ============================================
    
    class PriorityQueue {
        constructor() {
            this.elements = [];
        }
        
        enqueue(element, priority) {
            this.elements.push({ element, priority });
            this.elements.sort((a, b) => a.priority - b.priority);
        }
        
        dequeue() {
            return this.elements.shift()?.element;
        }
        
        isEmpty() {
            return this.elements.length === 0;
        }
    }
    
    function heuristic(a, b) {
        // Manhattan distance
        return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
    }
    
    function getNeighbors(x, z, canFly = false, canForestWalk = false) {
        const gameState = getGameState();
        const CONFIG = getCONFIG();
        const CELL = getCELL();
        const neighbors = [];
        
        const directions = [
            { dx: 1, dz: 0 }, { dx: -1, dz: 0 },
            { dx: 0, dz: 1 }, { dx: 0, dz: -1 },
            { dx: 1, dz: 1 }, { dx: -1, dz: 1 },
            { dx: 1, dz: -1 }, { dx: -1, dz: -1 }
        ];
        
        for (const dir of directions) {
            const nx = x + dir.dx;
            const nz = z + dir.dz;
            
            // Bounds check
            if (nx < 0 || nx >= CONFIG.GRID_WIDTH || nz < 0 || nz >= CONFIG.GRID_HEIGHT) {
                continue;
            }
            
            const cell = gameState.grid[nx]?.[nz];
            
            // Flying units ignore trees
            if (canFly) {
                neighbors.push({ x: nx, z: nz, cost: 1 });
                continue;
            }
            
            // Check if cell is walkable
            const isTree = cell === CELL.TREE_NORMAL || cell === CELL.TREE_HIGH_YIELD || cell === CELL.TREE_ENERGY;
            
            if (isTree) {
                if (canForestWalk) {
                    // Forester upgrade - can walk through trees at double cost
                    neighbors.push({ x: nx, z: nz, cost: 2 });
                }
                // Otherwise, trees block movement
                continue;
            }
            
            // Check for other units (soft collision)
            const hasUnit = gameState.units.some(u => 
                Math.floor(u.position.x) === nx && Math.floor(u.position.z) === nz
            );
            
            // Slightly penalize cells with units but don't block
            const cost = hasUnit ? 1.5 : 1;
            neighbors.push({ x: nx, z: nz, cost });
        }
        
        return neighbors;
    }
    
    function findPath(startX, startZ, endX, endZ, canFly = false, canForestWalk = false, maxIterations = 1000) {
        const start = { x: Math.floor(startX), z: Math.floor(startZ) };
        const end = { x: Math.floor(endX), z: Math.floor(endZ) };
        
        // If start equals end, no path needed
        if (start.x === end.x && start.z === end.z) {
            return [end];
        }
        
        const frontier = new PriorityQueue();
        frontier.enqueue(start, 0);
        
        const cameFrom = new Map();
        const costSoFar = new Map();
        
        const key = (p) => `${p.x},${p.z}`;
        cameFrom.set(key(start), null);
        costSoFar.set(key(start), 0);
        
        let iterations = 0;
        let closestPoint = start;
        let closestDistance = heuristic(start, end);
        
        while (!frontier.isEmpty() && iterations < maxIterations) {
            iterations++;
            const current = frontier.dequeue();
            
            // Track closest point in case we can't reach destination
            const currentDist = heuristic(current, end);
            if (currentDist < closestDistance) {
                closestDistance = currentDist;
                closestPoint = current;
            }
            
            // Reached goal
            if (current.x === end.x && current.z === end.z) {
                // Reconstruct path
                const path = [];
                let curr = current;
                while (curr) {
                    path.unshift(curr);
                    curr = cameFrom.get(key(curr));
                }
                return path;
            }
            
            const neighbors = getNeighbors(current.x, current.z, canFly, canForestWalk);
            
            for (const next of neighbors) {
                const newCost = costSoFar.get(key(current)) + next.cost;
                const nextKey = key(next);
                
                if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)) {
                    costSoFar.set(nextKey, newCost);
                    const priority = newCost + heuristic(next, end);
                    frontier.enqueue({ x: next.x, z: next.z }, priority);
                    cameFrom.set(nextKey, current);
                }
            }
        }
        
        // Couldn't reach destination - return path to closest reachable point
        if (closestPoint.x !== start.x || closestPoint.z !== start.z) {
            const path = [];
            let curr = closestPoint;
            while (curr) {
                path.unshift(curr);
                curr = cameFrom.get(key(curr));
            }
            return path;
        }
        
        return null; // No path at all
    }
    
    // ============================================
    // UNIT SPRITE CREATION
    // ============================================
    
    function createUnitMaterial(unitType) {
        const THREE = getTHREE();
        
        switch(unitType.id) {
            case 'woodsman':
                return createWoodsmanMaterial();
            case 'knight':
                return createKnightMaterial();
            case 'archer':
                return createArcherMaterial();
            default:
                return createKnightMaterial(); // Fallback
        }
    }
    
    function createKnightMaterial() {
        const THREE = getTHREE();
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 32, 48);
        
        // Helmet
        ctx.fillStyle = '#708090';
        ctx.beginPath();
        ctx.arc(16, 10, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Helmet visor
        ctx.fillStyle = '#2f4f4f';
        ctx.fillRect(10, 8, 12, 4);
        
        // Plume
        ctx.fillStyle = '#cc3333';
        ctx.beginPath();
        ctx.moveTo(16, 2);
        ctx.lineTo(20, 6);
        ctx.lineTo(16, 8);
        ctx.lineTo(12, 6);
        ctx.closePath();
        ctx.fill();
        
        // Body/armor
        ctx.fillStyle = '#4169e1';
        ctx.fillRect(10, 18, 12, 16);
        
        // Armor highlight
        ctx.fillStyle = '#6a8ae1';
        ctx.fillRect(12, 20, 4, 12);
        
        // Belt
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(10, 28, 12, 3);
        
        // Legs
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(10, 34, 5, 12);
        ctx.fillRect(17, 34, 5, 12);
        
        // Feet
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(8, 44, 7, 4);
        ctx.fillRect(17, 44, 7, 4);
        
        // Sword
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(22, 12, 3, 20);
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(21, 20, 5, 3);
        
        // Shield
        ctx.fillStyle = '#4169e1';
        ctx.beginPath();
        ctx.moveTo(4, 18);
        ctx.lineTo(10, 18);
        ctx.lineTo(10, 30);
        ctx.lineTo(7, 34);
        ctx.lineTo(4, 30);
        ctx.closePath();
        ctx.fill();
        
        // Shield emblem
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(6, 22, 2, 6);
        
        // Outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(16, 10, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeRect(10, 18, 12, 16);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        return new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
    }
    
    function createWoodsmanMaterial() {
        const THREE = getTHREE();
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 32, 48);
        
        // Head/face
        ctx.fillStyle = '#e8c4a0';
        ctx.beginPath();
        ctx.arc(16, 10, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Hat (brown cap)
        ctx.fillStyle = '#5a4020';
        ctx.beginPath();
        ctx.arc(16, 8, 8, Math.PI, 0, false);
        ctx.fill();
        ctx.fillRect(6, 7, 20, 3);
        
        // Hat brim
        ctx.fillStyle = '#4a3018';
        ctx.fillRect(4, 9, 24, 2);
        
        // Eyes
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(12, 9, 2, 2);
        ctx.fillRect(18, 9, 2, 2);
        
        // Beard
        ctx.fillStyle = '#5a4030';
        ctx.beginPath();
        ctx.arc(16, 14, 5, 0, Math.PI, false);
        ctx.fill();
        
        // Body (plaid shirt)
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(9, 18, 14, 14);
        
        // Plaid pattern
        ctx.fillStyle = '#aa2222';
        ctx.fillRect(9, 20, 14, 2);
        ctx.fillRect(9, 26, 14, 2);
        ctx.fillRect(12, 18, 2, 14);
        ctx.fillRect(18, 18, 2, 14);
        
        // Suspenders
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(11, 18, 2, 14);
        ctx.fillRect(19, 18, 2, 14);
        
        // Pants
        ctx.fillStyle = '#3a5a3a';
        ctx.fillRect(10, 32, 5, 12);
        ctx.fillRect(17, 32, 5, 12);
        
        // Boots
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(8, 42, 7, 6);
        ctx.fillRect(17, 42, 7, 6);
        
        // Axe handle
        ctx.fillStyle = '#6a4a2a';
        ctx.save();
        ctx.translate(24, 16);
        ctx.rotate(Math.PI / 6);
        ctx.fillRect(-1, 0, 3, 24);
        ctx.restore();
        
        // Axe head
        ctx.fillStyle = '#808080';
        ctx.beginPath();
        ctx.moveTo(26, 12);
        ctx.lineTo(30, 8);
        ctx.lineTo(32, 12);
        ctx.lineTo(28, 18);
        ctx.closePath();
        ctx.fill();
        
        // Axe highlight
        ctx.fillStyle = '#a0a0a0';
        ctx.beginPath();
        ctx.moveTo(27, 11);
        ctx.lineTo(29, 9);
        ctx.lineTo(30, 12);
        ctx.lineTo(28, 14);
        ctx.closePath();
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(9, 18, 14, 14);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        return new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
    }
    
    function createArcherMaterial() {
        const THREE = getTHREE();
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 32, 48);
        
        // Head
        ctx.fillStyle = '#e8c4a0';
        ctx.beginPath();
        ctx.arc(16, 10, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Hood
        ctx.fillStyle = '#2d5a1e';
        ctx.beginPath();
        ctx.arc(16, 9, 7, Math.PI * 1.2, Math.PI * 1.8, false);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(9, 8);
        ctx.lineTo(16, 2);
        ctx.lineTo(23, 8);
        ctx.closePath();
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(13, 9, 2, 2);
        ctx.fillRect(17, 9, 2, 2);
        
        // Body (green tunic)
        ctx.fillStyle = '#3d6a2e';
        ctx.fillRect(10, 16, 12, 14);
        
        // Belt
        ctx.fillStyle = '#5a4020';
        ctx.fillRect(10, 26, 12, 3);
        
        // Quiver strap
        ctx.fillStyle = '#5a4020';
        ctx.fillRect(8, 16, 2, 14);
        
        // Legs
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(11, 30, 4, 12);
        ctx.fillRect(17, 30, 4, 12);
        
        // Boots
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(10, 40, 5, 6);
        ctx.fillRect(17, 40, 5, 6);
        
        // Bow
        ctx.strokeStyle = '#6a4a2a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(4, 24, 14, -Math.PI/3, Math.PI/3, false);
        ctx.stroke();
        
        // Bow string
        ctx.strokeStyle = '#c0c0c0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(4, 10);
        ctx.lineTo(4, 38);
        ctx.stroke();
        
        // Arrow in hand
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(20, 18, 10, 2);
        ctx.fillStyle = '#808080';
        ctx.beginPath();
        ctx.moveTo(30, 19);
        ctx.lineTo(32, 17);
        ctx.lineTo(32, 21);
        ctx.closePath();
        ctx.fill();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        return new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
    }
    
    // ============================================
    // UNIT SPAWNING
    // ============================================
    
    function spawnUnit(unitTypeId, position, upgrades = { path1: 0, path2: 0, path3: 0 }) {
        const THREE = getTHREE();
        const scene = getScene();
        const gameState = getGameState();
        
        const unitType = UNIT_TYPES[unitTypeId];
        if (!unitType) {
            console.warn(`Unknown unit type: ${unitTypeId}`);
            return null;
        }
        
        const material = createUnitMaterial(unitType);
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(3 * unitType.scale, 4.5 * unitType.scale, 1);
        
        // Find valid spawn position (not on top of other units)
        let spawnX = position.x;
        let spawnZ = position.z + 3;
        
        // Adjust if position is occupied
        const minSpacing = 1.5;
        let attempts = 0;
        while (attempts < 20) {
            const occupied = gameState.units.some(u => {
                const dx = u.position.x - spawnX;
                const dz = u.position.z - spawnZ;
                return Math.sqrt(dx*dx + dz*dz) < minSpacing;
            });
            
            if (!occupied) break;
            
            // Try a different position in a spiral
            const angle = attempts * 0.5;
            const radius = 2 + attempts * 0.3;
            spawnX = position.x + Math.cos(angle) * radius;
            spawnZ = position.z + Math.sin(angle) * radius;
            attempts++;
        }
        
        sprite.position.set(spawnX, 2.25, spawnZ);
        scene.add(sprite);
        
        // Calculate stats with upgrades
        const stats = calculateStats(unitType, upgrades, unitTypeId);
        
        const unit = {
            id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: unitTypeId,
            typeData: unitType,
            sprite: sprite,
            position: { x: spawnX, z: spawnZ },
            target: null,
            targetPosition: null,
            path: null,
            pathIndex: 0,
            health: stats.health,
            maxHealth: stats.health,
            damage: stats.damage,
            speed: stats.speed,
            attackRange: stats.attackRange,
            attackSpeed: stats.attackSpeed,
            harvestSpeed: stats.harvestSpeed,
            carryCapacity: stats.carryCapacity,
            lastAttackTime: 0,
            state: 'idle', // idle, moving, harvesting, returning, attacking
            owner: 'player',
            upgrades: { ...upgrades },
            
            // Woodsman specific
            inventory: {
                wood: 0,
                energy: 0
            },
            targetTree: null,
            harvestProgress: 0,
            harvestMode: unitType.canHarvest ? 'nearby' : null, // 'nearby', 'laneway', 'pathway', 'manual'
            chopCount: 0, // For rhythm upgrade
            
            // Special abilities from upgrades
            hasForestWalk: stats.forestWalk || false,
            hasRhythm: stats.rhythm || false,
            hasCleave: stats.cleave || false,
            depositMult: stats.depositMult || 1,
            energySpecialist: stats.energySpecialist || false
        };
        
        // Create selection ring (hidden by default)
        const ringGeometry = new THREE.RingGeometry(1.2, 1.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
        selectionRing.rotation.x = -Math.PI / 2;
        selectionRing.position.set(spawnX, 0.1, spawnZ);
        selectionRing.visible = false;
        scene.add(selectionRing);
        unit.selectionRing = selectionRing;
        
        gameState.units.push(unit);
        console.log(`Spawned ${unitType.name} at (${spawnX.toFixed(1)}, ${spawnZ.toFixed(1)})`);
        
        // Auto-start harvesting if woodsman
        if (unitType.canHarvest) {
            unit.state = 'idle';
            startHarvesting(unit);
        }
        
        return unit;
    }
    
    function calculateStats(unitType, upgrades, unitTypeId) {
        let health = unitType.health;
        let damage = unitType.damage;
        let speed = unitType.speed;
        let attackRange = unitType.attackRange;
        let attackSpeed = unitType.attackSpeed;
        let harvestSpeed = unitType.harvestSpeed;
        let carryCapacity = unitType.carryCapacity;
        
        let forestWalk = false;
        let rhythm = false;
        let cleave = false;
        let depositMult = 1;
        let energySpecialist = false;
        
        if (unitTypeId === 'woodsman') {
            // Path 1: Harvest Speed
            if (upgrades.path1 >= 1) harvestSpeed *= 0.75; // Sharp Axe
            if (upgrades.path1 >= 2) rhythm = true; // Rhythm
            if (upgrades.path1 >= 3) cleave = true; // Clear Cutter
            
            // Path 2: Carry/Economy
            if (upgrades.path2 >= 1) carryCapacity = Math.floor(carryCapacity * 1.5); // Deep Pockets
            if (upgrades.path2 >= 2) depositMult = 1.2; // Efficient Routes
            if (upgrades.path2 >= 3) energySpecialist = true; // Specialist
            
            // Path 3: Survival
            if (upgrades.path3 >= 1) health *= 1.5; // Thick Hide
            if (upgrades.path3 >= 2) forestWalk = true; // Forester
            // Path 3 Level 3 (Trapper) handled separately
        } else if (unitTypeId === 'knight') {
            // Knight upgrades
            if (upgrades.path1 >= 1) damage *= 1.25;
            if (upgrades.path1 >= 2) damage *= 1.25;
            if (upgrades.path1 >= 3) damage *= 1.25;
            
            if (upgrades.path2 >= 1) health *= 1.4;
            if (upgrades.path2 >= 2) health *= 1.3;
            if (upgrades.path2 >= 3) health *= 1.2;
            
            if (upgrades.path3 >= 1) attackSpeed *= 0.9;
            if (upgrades.path3 >= 2) speed *= 1.15;
            if (upgrades.path3 >= 3) attackSpeed *= 0.85;
        }
        
        return { 
            health, damage, speed, attackRange, attackSpeed, 
            harvestSpeed, carryCapacity,
            forestWalk, rhythm, cleave, depositMult, energySpecialist
        };
    }
    
    // ============================================
    // HARVESTING SYSTEM
    // ============================================
    
    function findNearestTree(unit) {
        const gameState = getGameState();
        const CELL = getCELL();
        const CONFIG = getCONFIG();
        
        let nearestTree = null;
        let nearestDist = Infinity;
        
        const searchRadius = 30; // tiles
        const ux = Math.floor(unit.position.x);
        const uz = Math.floor(unit.position.z);
        
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            for (let dz = -searchRadius; dz <= searchRadius; dz++) {
                const x = ux + dx;
                const z = uz + dz;
                
                if (x < 0 || x >= CONFIG.GRID_WIDTH || z < 0 || z >= CONFIG.GRID_HEIGHT) continue;
                
                const cell = gameState.grid[x]?.[z];
                if (cell === CELL.TREE_NORMAL || cell === CELL.TREE_HIGH_YIELD || cell === CELL.TREE_ENERGY) {
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestTree = { x, z, type: cell };
                    }
                }
            }
        }
        
        return nearestTree;
    }
    
    function findNearestSawmill(unit) {
        const gameState = getGameState();
        
        let nearestSawmill = null;
        let nearestDist = Infinity;
        
        for (const building of gameState.buildings) {
            if (building.typeData?.id === 'sawmill') {
                const dx = building.position.x - unit.position.x;
                const dz = building.position.z - unit.position.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestSawmill = building;
                }
            }
        }
        
        return nearestSawmill;
    }
    
    function startHarvesting(unit) {
        if (!unit.typeData.canHarvest) return;
        
        // Check if inventory is full
        const totalCarried = unit.inventory.wood + unit.inventory.energy;
        if (totalCarried >= unit.carryCapacity) {
            // Need to return to sawmill
            returnToSawmill(unit);
            return;
        }
        
        // Find nearest tree
        const tree = findNearestTree(unit);
        if (!tree) {
            unit.state = 'idle';
            return;
        }
        
        // Path to tree
        unit.targetTree = tree;
        const path = findPath(
            unit.position.x, unit.position.z,
            tree.x, tree.z,
            false, unit.hasForestWalk
        );
        
        if (path && path.length > 0) {
            unit.path = path;
            unit.pathIndex = 0;
            unit.state = 'moving';
        } else {
            unit.state = 'idle';
        }
    }
    
    function harvestTree(unit, deltaTime) {
        const gameState = getGameState();
        const CELL = getCELL();
        
        if (!unit.targetTree) {
            startHarvesting(unit);
            return;
        }
        
        // Check if we're close enough to harvest
        const dx = unit.targetTree.x - unit.position.x;
        const dz = unit.targetTree.z - unit.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        
        if (dist > 2) {
            // Move closer
            unit.state = 'moving';
            const path = findPath(
                unit.position.x, unit.position.z,
                unit.targetTree.x, unit.targetTree.z,
                false, unit.hasForestWalk
            );
            if (path) {
                unit.path = path;
                unit.pathIndex = 0;
            }
            return;
        }
        
        // Harvesting
        unit.state = 'harvesting';
        
        // Apply rhythm bonus if applicable
        let effectiveHarvestSpeed = unit.harvestSpeed;
        if (unit.hasRhythm && unit.chopCount > 0) {
            // Each tree harvested speeds up by 5%, max 50%
            const speedBonus = Math.min(0.5, unit.chopCount * 0.05);
            effectiveHarvestSpeed *= (1 - speedBonus);
        }
        
        unit.harvestProgress += deltaTime;
        
        if (unit.harvestProgress >= effectiveHarvestSpeed) {
            // Tree harvested!
            unit.harvestProgress = 0;
            unit.chopCount++;
            
            const treeType = unit.targetTree.type;
            const treeX = unit.targetTree.x;
            const treeZ = unit.targetTree.z;
            
            // Determine resource yield
            let woodYield = 0;
            let energyYield = 0;
            
            if (treeType === CELL.TREE_NORMAL) {
                woodYield = 10;
            } else if (treeType === CELL.TREE_HIGH_YIELD) {
                woodYield = 25;
            } else if (treeType === CELL.TREE_ENERGY) {
                energyYield = 15;
                if (unit.energySpecialist) energyYield *= 2;
            }
            
            // Add to inventory
            unit.inventory.wood += woodYield;
            unit.inventory.energy += energyYield;
            
            // Remove tree from grid
            gameState.grid[treeX][treeZ] = CELL.EMPTY;
            
            // Remove tree sprite from scene
            const treeIndex = gameState.trees.findIndex(t => 
                Math.floor(t.position.x) === treeX && 
                Math.floor(t.position.z) === treeZ
            );
            if (treeIndex !== -1) {
                const treeSprite = gameState.trees[treeIndex];
                getScene().remove(treeSprite);
                gameState.trees.splice(treeIndex, 1);
            }
            
            // Clear Cutter upgrade - damage adjacent trees
            if (unit.hasCleave) {
                damageAdjacentTrees(treeX, treeZ);
            }
            
            // Update tree count display
            const treeCountEl = document.getElementById('tree-count');
            if (treeCountEl) {
                treeCountEl.textContent = gameState.trees.length;
            }
            
            // Check if inventory full
            const totalCarried = unit.inventory.wood + unit.inventory.energy;
            if (totalCarried >= unit.carryCapacity) {
                returnToSawmill(unit);
            } else {
                // Continue harvesting
                unit.targetTree = null;
                startHarvesting(unit);
            }
        }
    }
    
    function damageAdjacentTrees(x, z) {
        // Placeholder for Clear Cutter upgrade
        // Could partially damage adjacent trees or instant-kill them
        // For now, just log
        console.log('Clear Cutter activated at', x, z);
    }
    
    function returnToSawmill(unit) {
        const sawmill = findNearestSawmill(unit);
        
        if (!sawmill) {
            // No sawmill - just drop resources at base
            depositResources(unit);
            return;
        }
        
        // Path to sawmill
        const path = findPath(
            unit.position.x, unit.position.z,
            sawmill.position.x, sawmill.position.z,
            false, unit.hasForestWalk
        );
        
        if (path && path.length > 0) {
            unit.path = path;
            unit.pathIndex = 0;
            unit.state = 'returning';
            unit.targetBuilding = sawmill;
        } else {
            // Can't reach sawmill
            unit.state = 'idle';
        }
    }
    
    function depositResources(unit) {
        const gameState = getGameState();
        
        // Apply deposit multiplier
        const woodToDeposit = Math.floor(unit.inventory.wood * unit.depositMult);
        const energyToDeposit = Math.floor(unit.inventory.energy * unit.depositMult);
        
        gameState.resources.wood += woodToDeposit;
        gameState.resources.energy += energyToDeposit;
        
        console.log(`Deposited ${woodToDeposit} wood, ${energyToDeposit} energy`);
        
        // Clear inventory
        unit.inventory.wood = 0;
        unit.inventory.energy = 0;
        
        // Update UI
        if (window.GameUI) {
            GameUI.updateResources();
        }
        
        // Continue harvesting
        if (unit.harvestMode) {
            startHarvesting(unit);
        } else {
            unit.state = 'idle';
        }
    }
    
    // ============================================
    // MOVEMENT
    // ============================================
    
    function moveUnit(unit, deltaTime) {
        if (!unit.path || unit.pathIndex >= unit.path.length) {
            // Reached destination or no path
            unit.path = null;
            clearPathLine(unit);
            
            if (unit.state === 'returning' && unit.targetBuilding) {
                // Check if close to sawmill
                const dx = unit.targetBuilding.position.x - unit.position.x;
                const dz = unit.targetBuilding.position.z - unit.position.z;
                if (Math.sqrt(dx*dx + dz*dz) < 4) {
                    depositResources(unit);
                    unit.targetBuilding = null;
                }
            } else if (unit.state === 'moving' && unit.targetTree) {
                // Start harvesting
                harvestTree(unit, 0);
            } else if (unit.harvestMode === 'nearby' && unit.typeData.canHarvest) {
                // Auto-continue harvesting
                startHarvesting(unit);
            } else {
                unit.state = 'idle';
            }
            return;
        }
        
        const target = unit.path[unit.pathIndex];
        const dx = target.x + 0.5 - unit.position.x; // Center of tile
        const dz = target.z + 0.5 - unit.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 0.5) {
            // Reached this waypoint
            unit.pathIndex++;
            return;
        }
        
        // Calculate base movement
        const moveSpeed = unit.speed * deltaTime;
        let moveX = (dx / distance) * moveSpeed;
        let moveZ = (dz / distance) * moveSpeed;
        
        // Soft collision - push apart from other units instead of blocking
        const gameState = getGameState();
        const separationRadius = 1.2;
        const pushStrength = 0.02;
        
        for (const other of gameState.units) {
            if (other.id === unit.id) continue;
            
            const odx = unit.position.x - other.position.x;
            const odz = unit.position.z - other.position.z;
            const odist = Math.sqrt(odx * odx + odz * odz);
            
            if (odist < separationRadius && odist > 0.01) {
                // Push away from other unit
                const pushForce = (separationRadius - odist) * pushStrength * deltaTime;
                moveX += (odx / odist) * pushForce;
                moveZ += (odz / odist) * pushForce;
            }
        }
        
        // Apply movement
        unit.position.x += moveX;
        unit.position.z += moveZ;
        
        // Smoothly update sprite position (lerp for less flicker)
        const lerpFactor = 0.3;
        unit.sprite.position.x += (unit.position.x - unit.sprite.position.x) * lerpFactor;
        unit.sprite.position.z += (unit.position.z - unit.sprite.position.z) * lerpFactor;
        
        // Update selection ring
        if (unit.selectionRing) {
            unit.selectionRing.position.x = unit.sprite.position.x;
            unit.selectionRing.position.z = unit.sprite.position.z;
        }
    }
    
    // ============================================
    // PATH VISUALIZATION
    // ============================================
    
    function createPathLine(unit, path) {
        const THREE = getTHREE();
        const scene = getScene();
        
        // Clear existing path line
        clearPathLine(unit);
        
        if (!path || path.length < 2) return;
        
        // Create points for the line
        const points = [];
        points.push(new THREE.Vector3(unit.position.x, 0.2, unit.position.z));
        
        for (const point of path) {
            points.push(new THREE.Vector3(point.x + 0.5, 0.2, point.z + 0.5));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x7ddf64,
            transparent: true,
            opacity: 0.5,
            linewidth: 2
        });
        
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        unit.pathLine = line;
        
        // Create destination marker
        const lastPoint = path[path.length - 1];
        const markerGeometry = new THREE.RingGeometry(0.8, 1.0, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0x7ddf64,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(lastPoint.x + 0.5, 0.15, lastPoint.z + 0.5);
        scene.add(marker);
        unit.destinationMarker = marker;
    }
    
    function clearPathLine(unit) {
        const scene = getScene();
        
        if (unit.pathLine) {
            scene.remove(unit.pathLine);
            unit.pathLine.geometry.dispose();
            unit.pathLine.material.dispose();
            unit.pathLine = null;
        }
        
        if (unit.destinationMarker) {
            scene.remove(unit.destinationMarker);
            unit.destinationMarker.geometry.dispose();
            unit.destinationMarker.material.dispose();
            unit.destinationMarker = null;
        }
    }
    
    // ============================================
    // CLICK RIPPLE EFFECT
    // ============================================
    
    let ripples = [];
    
    function createRipple(x, z) {
        const THREE = getTHREE();
        const scene = getScene();
        
        const geometry = new THREE.RingGeometry(0.1, 0.3, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x7ddf64,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        
        const ripple = new THREE.Mesh(geometry, material);
        ripple.rotation.x = -Math.PI / 2;
        ripple.position.set(x, 0.2, z);
        scene.add(ripple);
        
        ripples.push({
            mesh: ripple,
            startTime: Date.now(),
            x: x,
            z: z
        });
    }
    
    function updateRipples() {
        const THREE = getTHREE();
        const scene = getScene();
        const now = Date.now();
        
        for (let i = ripples.length - 1; i >= 0; i--) {
            const ripple = ripples[i];
            const age = now - ripple.startTime;
            const maxAge = 600; // ms
            
            if (age >= maxAge) {
                scene.remove(ripple.mesh);
                ripple.mesh.geometry.dispose();
                ripple.mesh.material.dispose();
                ripples.splice(i, 1);
            } else {
                // Expand and fade
                const progress = age / maxAge;
                const scale = 1 + progress * 3;
                ripple.mesh.scale.set(scale, scale, 1);
                ripple.mesh.material.opacity = 0.8 * (1 - progress);
            }
        }
    }
    
    function commandMove(unit, targetX, targetZ) {
        const canFly = unit.typeData.canFly || false;
        
        // Create ripple at destination
        createRipple(targetX, targetZ);
        
        const path = findPath(
            unit.position.x, unit.position.z,
            targetX, targetZ,
            canFly, unit.hasForestWalk
        );
        
        if (path && path.length > 0) {
            unit.path = path;
            unit.pathIndex = 0;
            unit.state = 'moving';
            unit.harvestMode = null; // Cancel auto-harvest when manually moving
            unit.targetTree = null;
            unit.targetBuilding = null;
            
            // Show path visualization
            createPathLine(unit, path);
            
            console.log(`Moving ${unit.typeData.name} to (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);
        } else {
            console.log('No path found!');
        }
    }
    
    // ============================================
    // SELECTION
    // ============================================
    
    function selectUnit(unit) {
        // Deselect previous
        if (selectedUnit && selectedUnit.selectionRing) {
            selectedUnit.selectionRing.visible = false;
        }
        
        selectedUnit = unit;
        
        if (unit && unit.selectionRing) {
            unit.selectionRing.visible = true;
        }
        
        // Show unit menu
        if (window.GameUI && unit) {
            GameUI.showUnitMenu(unit);
        }
    }
    
    function deselectUnit() {
        if (selectedUnit && selectedUnit.selectionRing) {
            selectedUnit.selectionRing.visible = false;
        }
        selectedUnit = null;
        commandMode = null;
        
        if (window.GameUI) {
            GameUI.hideMenus();
        }
    }
    
    function getSelectedUnit() {
        return selectedUnit;
    }
    
    function setCommandMode(mode) {
        commandMode = mode;
    }
    
    function getCommandMode() {
        return commandMode;
    }
    
    // ============================================
    // UPDATE LOOP
    // ============================================
    
    function update() {
        const gameState = getGameState();
        if (!gameState) return;
        
        const now = Date.now();
        const deltaTime = now - lastTime;
        lastTime = now;
        
        // Update buildings production
        if (window.GameBuildings) {
            GameBuildings.updateProduction(deltaTime);
        }
        
        // Update units
        for (const unit of gameState.units) {
            switch (unit.state) {
                case 'moving':
                case 'returning':
                    moveUnit(unit, deltaTime);
                    break;
                case 'harvesting':
                    harvestTree(unit, deltaTime);
                    break;
                case 'idle':
                    // Auto-resume harvesting if in harvest mode
                    if (unit.harvestMode === 'nearby' && unit.typeData.canHarvest) {
                        startHarvesting(unit);
                    }
                    break;
            }
            
            // Idle animation - slight bob
            if (unit.sprite) {
                const baseY = 2.25;
                const bobAmount = unit.state === 'harvesting' ? 0.2 : 0.1;
                const bobSpeed = unit.state === 'harvesting' ? 0.01 : 0.003;
                unit.sprite.position.y = baseY + Math.sin(now * bobSpeed + unit.id.length) * bobAmount;
            }
            
            // Selection ring pulse
            if (unit.selectionRing && unit.selectionRing.visible) {
                unit.selectionRing.material.opacity = 0.5 + Math.sin(now * 0.005) * 0.2;
            }
            
            // Fade path line over time
            if (unit.pathLine && unit.pathLine.material) {
                unit.pathLine.material.opacity = Math.max(0.2, unit.pathLine.material.opacity - 0.001);
            }
            if (unit.destinationMarker && unit.destinationMarker.material) {
                // Pulse the destination marker
                unit.destinationMarker.material.opacity = 0.4 + Math.sin(now * 0.008) * 0.2;
                unit.destinationMarker.rotation.z += 0.02;
            }
        }
        
        // Update ripple effects
        updateRipples();
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    function init() {
        console.log('Units module initialized');
    }
    
    // Public API
    return {
        init,
        UNIT_TYPES,
        WOODSMAN_UPGRADES,
        spawnUnit,
        commandMove,
        update,
        selectUnit,
        deselectUnit,
        getSelectedUnit,
        setCommandMode,
        getCommandMode,
        startHarvesting,
        findPath,
        createRipple
    };
})();
