// ============================================
// UNITS MODULE - Phase 1 v2
// Fixes:
//   - Pathing now targets adjacent walkable cell, not the tree itself
//   - Mobile-friendly tap-then-confirm corridor preview
//   - Soft collision removed (units can overlap)
//   - Melee combat: auto-attack enemies in range, red splotch on death
// ============================================

window.GameUnits = (function() {
    console.log('units.js loading...');

    // Lazy refs to avoid init order issues
    const getEngine = () => window.GameEngine;
    const getScene = () => window.GameEngine?.scene;
    const getGameState = () => window.GameEngine?.gameState;
    const getTHREE = () => window.GameEngine?.THREE || window.THREE;
    const getCONFIG = () => window.GameEngine?.CONFIG;
    const getCELL = () => window.GameEngine?.CELL;

    let lastTime = Date.now();
    let selectedUnits = [];
    let commandMode = null; // null, 'move', 'cutPath', 'cutLane'

    // Tree claim system - prevents two woodsmen targeting the same tree
    const claimedTrees = new Map(); // "x,z" -> unit.id

    // Corridor preview state
    let corridorPreviewMarkers = [];
    let corridorPreviewLines = [];
    let pendingCorridorCommand = null; // { startX, startZ, targetX, targetZ, width }

    // Ripple effects
    const ripples = [];

    // ============================================
    // UNIT TYPE DEFINITIONS
    // ============================================
    const UNIT_TYPES = {
        knight: {
            id: 'knight', name: 'Knight',
            health: 100, damage: 15, speed: 0.04,
            attackRange: 2, attackSpeed: 1000,
            harvestSpeed: 0, carryCapacity: 0,
            canHarvest: false, scale: 1.0
        },
        woodsman: {
            id: 'woodsman', name: 'Woodsman',
            health: 60, damage: 8, speed: 0.035,
            attackRange: 1.5, attackSpeed: 1200,
            harvestSpeed: 3000, carryCapacity: 5,
            canHarvest: true, scale: 1.0
        },
        archer: {
            id: 'archer', name: 'Archer',
            health: 50, damage: 12, speed: 0.045,
            attackRange: 12, attackSpeed: 1500,
            harvestSpeed: 0, carryCapacity: 0,
            canHarvest: false, scale: 0.9
        },
        botanist: {
            id: 'botanist', name: 'Botanist',
            health: 45, damage: 5, speed: 0.03,
            attackRange: 8, attackSpeed: 2000,
            harvestSpeed: 0, carryCapacity: 0,
            canHarvest: false, scale: 0.9
        },
        dragonfly: {
            id: 'dragonfly', name: 'Dragonfly',
            health: 35, damage: 10, speed: 0.06,
            attackRange: 3, attackSpeed: 800,
            harvestSpeed: 0, carryCapacity: 0,
            canHarvest: false, canFly: true, scale: 0.85
        },
        mage: {
            id: 'mage', name: 'Mage',
            health: 40, damage: 25, speed: 0.025,
            attackRange: 10, attackSpeed: 2500,
            harvestSpeed: 0, carryCapacity: 0,
            canHarvest: false, scale: 1.0
        },
        planter: {
            id: 'planter', name: 'Planter',
            health: 50, damage: 5, speed: 0.03,
            attackRange: 1.5, attackSpeed: 1500,
            harvestSpeed: 0, carryCapacity: 0,
            canHarvest: false, canPlant: true, scale: 0.9
        }
    };

    const WOODSMAN_UPGRADES = {
        path1: {
            name: 'Harvest Speed',
            levels: [
                { name: 'Sharp Axe', description: 'Harvest 25% faster', effect: { harvestSpeedMult: 0.75 } },
                { name: 'Rhythm', description: 'Each chop speeds up the next', effect: { rhythmBonus: true } },
                { name: 'Clear Cutter', description: 'Damages adjacent trees while harvesting', effect: { cleave: true } }
            ]
        },
        path2: {
            name: 'Carry/Economy',
            levels: [
                { name: 'Deep Pockets', description: 'Carry +50% more', effect: { carryMult: 1.5 } },
                { name: 'Efficient Routes', description: '+20% resource value on deposit', effect: { depositMult: 1.2 } },
                { name: 'Specialist', description: 'Purple trees yield double energy', effect: { energySpecialist: true } }
            ]
        },
        path3: {
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
        constructor() { this.elements = []; }
        enqueue(element, priority) {
            this.elements.push({ element, priority });
            this.elements.sort((a, b) => a.priority - b.priority);
        }
        dequeue() { return this.elements.shift()?.element; }
        isEmpty() { return this.elements.length === 0; }
    }

    function heuristic(a, b) {
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

            if (nx < 0 || nx >= CONFIG.GRID_WIDTH || nz < 0 || nz >= CONFIG.GRID_HEIGHT) continue;

            const cell = gameState.grid[nx]?.[nz];

            if (canFly) {
                neighbors.push({ x: nx, z: nz, cost: 1 });
                continue;
            }

            const isTree = cell === CELL.TREE_NORMAL || cell === CELL.TREE_HIGH_YIELD || cell === CELL.TREE_ENERGY;
            if (isTree) {
                if (canForestWalk) {
                    neighbors.push({ x: nx, z: nz, cost: 2 });
                }
                continue;
            }

            neighbors.push({ x: nx, z: nz, cost: 1 });
        }

        return neighbors;
    }

    function findPath(startX, startZ, endX, endZ, canFly = false, canForestWalk = false, maxIterations = 1000) {
        const start = { x: Math.floor(startX), z: Math.floor(startZ) };
        const end = { x: Math.floor(endX), z: Math.floor(endZ) };

        if (start.x === end.x && start.z === end.z) return [end];

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

            const currentDist = heuristic(current, end);
            if (currentDist < closestDistance) {
                closestDistance = currentDist;
                closestPoint = current;
            }

            if (current.x === end.x && current.z === end.z) {
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

        return null;
    }

    // KEY FIX: Path to a walkable cell adjacent to the tree, not the tree's blocked cell
    function findAdjacentCellToTree(treeX, treeZ, fromX, fromZ) {
        const gameState = getGameState();
        const CELL = getCELL();
        const CONFIG = getCONFIG();
        const directions = [
            { dx: 1, dz: 0 }, { dx: -1, dz: 0 },
            { dx: 0, dz: 1 }, { dx: 0, dz: -1 },
            { dx: 1, dz: 1 }, { dx: -1, dz: 1 },
            { dx: 1, dz: -1 }, { dx: -1, dz: -1 }
        ];

        let bestCell = null;
        let bestDist = Infinity;

        for (const dir of directions) {
            const nx = treeX + dir.dx;
            const nz = treeZ + dir.dz;
            if (nx < 0 || nx >= CONFIG.GRID_WIDTH || nz < 0 || nz >= CONFIG.GRID_HEIGHT) continue;

            const cell = gameState.grid[nx]?.[nz];
            const isTree = cell === CELL.TREE_NORMAL || cell === CELL.TREE_HIGH_YIELD || cell === CELL.TREE_ENERGY;
            if (!isTree) {
                const dist = Math.sqrt(Math.pow(nx - fromX, 2) + Math.pow(nz - fromZ, 2));
                if (dist < bestDist) {
                    bestDist = dist;
                    bestCell = { x: nx, z: nz };
                }
            }
        }

        return bestCell;
    }

    function isTreeReachable(treeX, treeZ) {
        const gameState = getGameState();
        const CELL = getCELL();
        const CONFIG = getCONFIG();
        const directions = [
            { dx: 1, dz: 0 }, { dx: -1, dz: 0 },
            { dx: 0, dz: 1 }, { dx: 0, dz: -1 },
            { dx: 1, dz: 1 }, { dx: -1, dz: 1 },
            { dx: 1, dz: -1 }, { dx: -1, dz: -1 }
        ];

        for (const dir of directions) {
            const nx = treeX + dir.dx;
            const nz = treeZ + dir.dz;
            if (nx < 0 || nx >= CONFIG.GRID_WIDTH || nz < 0 || nz >= CONFIG.GRID_HEIGHT) continue;

            const cell = gameState.grid[nx]?.[nz];
            const isTree = cell === CELL.TREE_NORMAL || cell === CELL.TREE_HIGH_YIELD || cell === CELL.TREE_ENERGY;
            if (!isTree) return true;
        }

        return false;
    }

    // ============================================
    // UNIT SPRITE CREATION
    // ============================================

    function createUnitMaterial(unitType) {
        switch (unitType.id) {
            case 'woodsman': return createWoodsmanMaterial();
            case 'knight': return createKnightMaterial();
            case 'archer': return createArcherMaterial();
            default: return createKnightMaterial();
        }
    }

    function createKnightMaterial() {
        const THREE = getTHREE();
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 48;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 32, 48);
        ctx.fillStyle = '#708090';
        ctx.beginPath(); ctx.arc(16, 10, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2f4f4f'; ctx.fillRect(10, 8, 12, 4);
        ctx.fillStyle = '#cc3333';
        ctx.beginPath();
        ctx.moveTo(16, 2); ctx.lineTo(20, 6); ctx.lineTo(16, 8); ctx.lineTo(12, 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4169e1'; ctx.fillRect(10, 18, 12, 16);
        ctx.fillStyle = '#6a8ae1'; ctx.fillRect(12, 20, 4, 12);
        ctx.fillStyle = '#8b4513'; ctx.fillRect(10, 28, 12, 3);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(10, 34, 5, 12); ctx.fillRect(17, 34, 5, 12);
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(8, 44, 7, 4); ctx.fillRect(17, 44, 7, 4);
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(22, 12, 3, 20);
        ctx.fillStyle = '#8b4513'; ctx.fillRect(21, 20, 5, 3);
        ctx.fillStyle = '#4169e1';
        ctx.beginPath();
        ctx.moveTo(4, 18); ctx.lineTo(10, 18); ctx.lineTo(10, 30);
        ctx.lineTo(7, 34); ctx.lineTo(4, 30); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd700'; ctx.fillRect(6, 22, 2, 6);
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(16, 10, 8, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeRect(10, 18, 12, 16);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return new THREE.SpriteMaterial({ map: texture, transparent: true });
    }

    function createWoodsmanMaterial() {
        const THREE = getTHREE();
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 48;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 32, 48);
        ctx.fillStyle = '#e8c4a0';
        ctx.beginPath(); ctx.arc(16, 10, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5a4020';
        ctx.beginPath(); ctx.arc(16, 8, 8, Math.PI, 0, false); ctx.fill();
        ctx.fillRect(6, 7, 20, 3);
        ctx.fillStyle = '#4a3018'; ctx.fillRect(4, 9, 24, 2);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(12, 9, 2, 2); ctx.fillRect(18, 9, 2, 2);
        ctx.fillStyle = '#5a4030';
        ctx.beginPath(); ctx.arc(16, 14, 5, 0, Math.PI, false); ctx.fill();
        ctx.fillStyle = '#cc4444'; ctx.fillRect(9, 18, 14, 14);
        ctx.fillStyle = '#aa2222';
        ctx.fillRect(9, 20, 14, 2); ctx.fillRect(9, 26, 14, 2);
        ctx.fillRect(12, 18, 2, 14); ctx.fillRect(18, 18, 2, 14);
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(11, 18, 2, 14); ctx.fillRect(19, 18, 2, 14);
        ctx.fillStyle = '#3a5a3a';
        ctx.fillRect(10, 32, 5, 12); ctx.fillRect(17, 32, 5, 12);
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(8, 42, 7, 6); ctx.fillRect(17, 42, 7, 6);
        ctx.fillStyle = '#6a4a2a';
        ctx.save(); ctx.translate(24, 16); ctx.rotate(Math.PI / 6);
        ctx.fillRect(-1, 0, 3, 24); ctx.restore();
        ctx.fillStyle = '#808080';
        ctx.beginPath();
        ctx.moveTo(26, 12); ctx.lineTo(30, 8); ctx.lineTo(32, 12); ctx.lineTo(28, 18);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#a0a0a0';
        ctx.beginPath();
        ctx.moveTo(27, 11); ctx.lineTo(29, 9); ctx.lineTo(30, 12); ctx.lineTo(28, 14);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
        ctx.strokeRect(9, 18, 14, 14);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return new THREE.SpriteMaterial({ map: texture, transparent: true });
    }

    function createArcherMaterial() {
        const THREE = getTHREE();
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 48;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 32, 48);
        ctx.fillStyle = '#e8c4a0';
        ctx.beginPath(); ctx.arc(16, 10, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2d5a1e';
        ctx.beginPath(); ctx.arc(16, 9, 7, Math.PI * 1.2, Math.PI * 1.8, false); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(9, 8); ctx.lineTo(16, 2); ctx.lineTo(23, 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(13, 9, 2, 2); ctx.fillRect(17, 9, 2, 2);
        ctx.fillStyle = '#3d6a2e'; ctx.fillRect(10, 16, 12, 14);
        ctx.fillStyle = '#5a4020';
        ctx.fillRect(10, 26, 12, 3); ctx.fillRect(8, 16, 2, 14);
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(11, 30, 4, 12); ctx.fillRect(17, 30, 4, 12);
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(10, 40, 5, 6); ctx.fillRect(17, 40, 5, 6);
        ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(4, 24, 14, -Math.PI / 3, Math.PI / 3, false); ctx.stroke();
        ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(4, 10); ctx.lineTo(4, 38); ctx.stroke();
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(20, 18, 10, 2);
        ctx.fillStyle = '#808080';
        ctx.beginPath();
        ctx.moveTo(30, 19); ctx.lineTo(32, 17); ctx.lineTo(32, 21); ctx.closePath(); ctx.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return new THREE.SpriteMaterial({ map: texture, transparent: true });
    }

    // ============================================
    // UNIT SPAWNING
    // ============================================

    function spawnUnit(unitTypeId, position, upgrades = { path1: 0, path2: 0, path3: 0 }, owner = 'player') {
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

        // Find spawn spot - just offset slightly so they don't all stack at exact same coordinate
        let spawnX = position.x;
        let spawnZ = position.z + 3;
        let attempts = 0;
        const minSpacing = 1.0; // Looser - we allow overlap now
        while (attempts < 12) {
            const tooClose = gameState.units.some(u => {
                const dx = u.position.x - spawnX;
                const dz = u.position.z - spawnZ;
                return Math.sqrt(dx * dx + dz * dz) < minSpacing;
            });
            if (!tooClose) break;
            const angle = attempts * 0.7;
            const radius = 1.5 + attempts * 0.3;
            spawnX = position.x + Math.cos(angle) * radius;
            spawnZ = position.z + Math.sin(angle) * radius;
            attempts++;
        }

        sprite.position.set(spawnX, 2.25, spawnZ);
        scene.add(sprite);

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
            state: 'idle',
            owner: owner,
            upgrades: { ...upgrades },
            inventory: { wood: 0, energy: 0 },
            targetTree: null,
            harvestProgress: 0,
            harvestMode: unitType.canHarvest ? 'nearby' : null,
            chopCount: 0,
            corridorTarget: null,
            corridorWidth: 0,
            pathId: null,             // ID of assigned loop path (for cutLoop mode)
            attackTarget: null,
            hasForestWalk: stats.forestWalk || false,
            hasRhythm: stats.rhythm || false,
            hasCleave: stats.cleave || false,
            depositMult: stats.depositMult || 1,
            energySpecialist: stats.energySpecialist || false
        };

        // Selection ring
        const ringGeometry = new THREE.RingGeometry(1.2, 1.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: owner === 'player' ? 0x00ff00 : 0xff0000,
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
        console.log(`Spawned ${unitType.name} (${owner}) at (${spawnX.toFixed(1)}, ${spawnZ.toFixed(1)})`);

        if (unitType.canHarvest && owner === 'player') {
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

        let forestWalk = false, rhythm = false, cleave = false;
        let depositMult = 1, energySpecialist = false;

        if (unitTypeId === 'woodsman') {
            if (upgrades.path1 >= 1) harvestSpeed *= 0.75;
            if (upgrades.path1 >= 2) rhythm = true;
            if (upgrades.path1 >= 3) cleave = true;
            if (upgrades.path2 >= 1) carryCapacity = Math.floor(carryCapacity * 1.5);
            if (upgrades.path2 >= 2) depositMult = 1.2;
            if (upgrades.path2 >= 3) energySpecialist = true;
            if (upgrades.path3 >= 1) health *= 1.5;
            if (upgrades.path3 >= 2) forestWalk = true;
        } else if (unitTypeId === 'knight') {
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
    // COMBAT (auto-attack enemies in range)
    // ============================================

    function findNearestEnemy(unit) {
        const gameState = getGameState();
        let nearestEnemy = null;
        let nearestDist = Infinity;

        for (const other of gameState.units) {
            if (other.owner === unit.owner) continue;
            if (other.health <= 0) continue;
            const dx = other.position.x - unit.position.x;
            const dz = other.position.z - unit.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = other;
            }
        }

        return { enemy: nearestEnemy, distance: nearestDist };
    }

    function updateCombat(unit, deltaTime) {
        const now = Date.now();
        const { enemy, distance } = findNearestEnemy(unit);

        if (!enemy || distance > unit.attackRange) {
            unit.attackTarget = null;
            return false;
        }

        unit.attackTarget = enemy;
        unit.state = 'attacking';

        if (now - unit.lastAttackTime >= unit.attackSpeed) {
            unit.lastAttackTime = now;
            enemy.health -= unit.damage;
            console.log(`${unit.type} dealt ${unit.damage} damage to ${enemy.type}. Enemy HP: ${enemy.health.toFixed(0)}`);
            if (enemy.health <= 0) {
                killUnit(enemy);
                unit.attackTarget = null;
                return false;
            }
        }

        return true;
    }

    function killUnit(unit) {
        const gameState = getGameState();
        const scene = getScene();
        const THREE = getTHREE();

        console.log(`${unit.type} (${unit.owner}) was killed!`);

        // Red splotch that fades over 3 seconds
        const splotchGeometry = new THREE.CircleGeometry(1.5, 16);
        const splotchMaterial = new THREE.MeshBasicMaterial({
            color: 0x8b0000,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const splotch = new THREE.Mesh(splotchGeometry, splotchMaterial);
        splotch.rotation.x = -Math.PI / 2;
        splotch.position.set(unit.position.x, 0.05, unit.position.z);
        scene.add(splotch);

        const fadeStart = Date.now();
        const fadeDuration = 3000;
        function fadeSplotch() {
            const elapsed = Date.now() - fadeStart;
            const progress = elapsed / fadeDuration;
            if (progress >= 1) {
                scene.remove(splotch);
                splotchGeometry.dispose();
                splotchMaterial.dispose();
                return;
            }
            splotchMaterial.opacity = 0.7 * (1 - progress);
            requestAnimationFrame(fadeSplotch);
        }
        fadeSplotch();

        // Remove unit objects from scene
        scene.remove(unit.sprite);
        if (unit.selectionRing) scene.remove(unit.selectionRing);
        if (unit.pathLine) scene.remove(unit.pathLine);
        if (unit.destinationMarker) scene.remove(unit.destinationMarker);

        // Remove from selected units
        const selectedIndex = selectedUnits.indexOf(unit);
        if (selectedIndex !== -1) selectedUnits.splice(selectedIndex, 1);

        releaseTreeClaim(unit);

        const unitIndex = gameState.units.indexOf(unit);
        if (unitIndex !== -1) gameState.units.splice(unitIndex, 1);
    }

    // ============================================
    // HARVESTING
    // ============================================

    function findNearestTree(unit, excludeClaimed = true) {
        const gameState = getGameState();
        const CELL = getCELL();
        const CONFIG = getCONFIG();
        let nearestTree = null;
        let nearestDist = Infinity;

        const searchRadius = 30;
        const ux = Math.floor(unit.position.x);
        const uz = Math.floor(unit.position.z);

        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            for (let dz = -searchRadius; dz <= searchRadius; dz++) {
                const x = ux + dx;
                const z = uz + dz;
                if (x < 0 || x >= CONFIG.GRID_WIDTH || z < 0 || z >= CONFIG.GRID_HEIGHT) continue;

                const cell = gameState.grid[x]?.[z];
                if (cell !== CELL.TREE_NORMAL && cell !== CELL.TREE_HIGH_YIELD && cell !== CELL.TREE_ENERGY) continue;

                if (excludeClaimed) {
                    const treeKey = `${x},${z}`;
                    const claimedBy = claimedTrees.get(treeKey);
                    if (claimedBy && claimedBy !== unit.id) continue;
                }

                if (!isTreeReachable(x, z)) continue;

                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestTree = { x, z, type: cell };
                }
            }
        }

        return nearestTree;
    }

    function claimTree(unit, tree) {
        if (tree) {
            const treeKey = `${tree.x},${tree.z}`;
            claimedTrees.set(treeKey, unit.id);
        }
    }

    function releaseTreeClaim(unit) {
        for (const [key, claimerId] of claimedTrees.entries()) {
            if (claimerId === unit.id) claimedTrees.delete(key);
        }
    }

    function findNearestSawmill(unit) {
        const gameState = getGameState();
        let nearestSawmill = null;
        let nearestDist = Infinity;
        for (const building of gameState.buildings) {
            if (building.typeData?.id === 'sawmill') {
                const dx = building.position.x - unit.position.x;
                const dz = building.position.z - unit.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
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
        releaseTreeClaim(unit);

        const totalCarried = unit.inventory.wood + unit.inventory.energy;
        if (totalCarried >= unit.carryCapacity) {
            returnToSawmill(unit);
            return;
        }

        const tree = findNearestTree(unit, true);
        if (!tree) {
            unit.state = 'idle';
            return;
        }

        claimTree(unit, tree);
        unit.targetTree = tree;

        // KEY FIX: Path to walkable cell adjacent to tree, not the tree itself
        const adjacentCell = findAdjacentCellToTree(tree.x, tree.z, unit.position.x, unit.position.z);
        if (!adjacentCell) {
            releaseTreeClaim(unit);
            unit.state = 'idle';
            return;
        }

        const path = findPath(
            unit.position.x, unit.position.z,
            adjacentCell.x, adjacentCell.z,
            false, unit.hasForestWalk
        );

        if (path && path.length > 0) {
            unit.path = path;
            unit.pathIndex = 0;
            unit.state = 'moving';
            createPathLine(unit, path);
        } else {
            releaseTreeClaim(unit);
            unit.state = 'idle';
        }
    }

    // ============================================
    // CUT PATH / LANE
    // ============================================

    function startCuttingCorridor(unit, targetX, targetZ, width) {
        if (!unit.typeData.canHarvest) return;

        unit.corridorTarget = { x: targetX, z: targetZ };
        unit.corridorWidth = width;
        unit.harvestMode = width === 2 ? 'cutPath' : 'cutLane';

        releaseTreeClaim(unit);
        continueCuttingCorridor(unit);

        console.log(`${unit.typeData.name} starting to cut ${width === 2 ? 'path' : 'lane'} to (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);
    }

    function continueCuttingCorridor(unit) {
        if (!unit.corridorTarget) {
            unit.harvestMode = 'nearby';
            startHarvesting(unit);
            return;
        }

        const totalCarried = unit.inventory.wood + unit.inventory.energy;
        if (totalCarried >= unit.carryCapacity) {
            returnToSawmill(unit);
            return;
        }

        const distToTarget = Math.sqrt(
            Math.pow(unit.position.x - unit.corridorTarget.x, 2) +
            Math.pow(unit.position.z - unit.corridorTarget.z, 2)
        );

        if (distToTarget < 2) {
            console.log(`${unit.typeData.name} reached corridor destination, switching to nearby harvest`);
            unit.corridorTarget = null;
            unit.harvestMode = 'nearby';
            startHarvesting(unit);
            return;
        }

        // Find next REACHABLE tree in corridor (works from edge inward)
        const blockingTree = findNextReachableCorridorTree(unit);

        if (blockingTree) {
            claimTree(unit, blockingTree);
            unit.targetTree = blockingTree;

            const adjacentCell = findAdjacentCellToTree(
                blockingTree.x, blockingTree.z,
                unit.position.x, unit.position.z
            );

            if (adjacentCell) {
                const path = findPath(
                    unit.position.x, unit.position.z,
                    adjacentCell.x, adjacentCell.z,
                    false, unit.hasForestWalk
                );

                if (path && path.length > 0) {
                    unit.path = path;
                    unit.pathIndex = 0;
                    unit.state = 'moving';
                    createPathLine(unit, path);
                    return;
                }
            }

            releaseTreeClaim(unit);
            unit.state = 'idle';
        } else {
            // No blocking trees - try to walk closer to target
            const path = findPath(
                unit.position.x, unit.position.z,
                unit.corridorTarget.x, unit.corridorTarget.z,
                false, unit.hasForestWalk
            );

            if (path && path.length > 0) {
                unit.path = path;
                unit.pathIndex = 0;
                unit.state = 'moving';
                unit.targetTree = null;
                createPathLine(unit, path);
            } else {
                unit.state = 'idle';
            }
        }
    }

    function findNextReachableCorridorTree(unit) {
        const gameState = getGameState();
        const CELL = getCELL();
        const CONFIG = getCONFIG();
        if (!unit.corridorTarget) return null;

        const startX = unit.position.x;
        const startZ = unit.position.z;
        const endX = unit.corridorTarget.x;
        const endZ = unit.corridorTarget.z;
        const width = unit.corridorWidth;

        const dx = endX - startX;
        const dz = endZ - startZ;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1) return null;

        const dirX = dx / length;
        const dirZ = dz / length;
        const perpX = -dirZ;
        const perpZ = dirX;

        let nearestTree = null;
        let nearestDist = Infinity;
        const halfWidth = width / 2;
        const seen = new Set();

        for (let along = 0; along <= length; along += 0.5) {
            for (let across = -halfWidth; across <= halfWidth; across += 0.5) {
                const checkX = Math.floor(startX + dirX * along + perpX * across);
                const checkZ = Math.floor(startZ + dirZ * along + perpZ * across);

                const key = `${checkX},${checkZ}`;
                if (seen.has(key)) continue;
                seen.add(key);

                if (checkX < 0 || checkX >= CONFIG.GRID_WIDTH || checkZ < 0 || checkZ >= CONFIG.GRID_HEIGHT) continue;

                const cell = gameState.grid[checkX]?.[checkZ];
                if (cell !== CELL.TREE_NORMAL && cell !== CELL.TREE_HIGH_YIELD && cell !== CELL.TREE_ENERGY) continue;

                const treeKey = `${checkX},${checkZ}`;
                const claimedBy = claimedTrees.get(treeKey);
                if (claimedBy && claimedBy !== unit.id) continue;

                if (!isTreeReachable(checkX, checkZ)) continue;

                const treeDx = checkX - unit.position.x;
                const treeDz = checkZ - unit.position.z;
                const dist = Math.sqrt(treeDx * treeDx + treeDz * treeDz);

                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestTree = { x: checkX, z: checkZ, type: cell };
                }
            }
        }

        return nearestTree;
    }

    // For preview: returns ALL trees in corridor (regardless of reachability)
    function getCorridorTrees(startX, startZ, endX, endZ, width) {
        const gameState = getGameState();
        const CELL = getCELL();
        const CONFIG = getCONFIG();

        const dx = endX - startX;
        const dz = endZ - startZ;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1) return [];

        const dirX = dx / length;
        const dirZ = dz / length;
        const perpX = -dirZ;
        const perpZ = dirX;
        const halfWidth = width / 2;

        const trees = [];
        const seen = new Set();

        for (let along = 0; along <= length; along += 0.5) {
            for (let across = -halfWidth; across <= halfWidth; across += 0.5) {
                const checkX = Math.floor(startX + dirX * along + perpX * across);
                const checkZ = Math.floor(startZ + dirZ * along + perpZ * across);

                const key = `${checkX},${checkZ}`;
                if (seen.has(key)) continue;
                seen.add(key);

                if (checkX < 0 || checkX >= CONFIG.GRID_WIDTH || checkZ < 0 || checkZ >= CONFIG.GRID_HEIGHT) continue;

                const cell = gameState.grid[checkX]?.[checkZ];
                if (cell === CELL.TREE_NORMAL || cell === CELL.TREE_HIGH_YIELD || cell === CELL.TREE_ENERGY) {
                    trees.push({ x: checkX, z: checkZ, type: cell });
                }
            }
        }

        return trees;
    }

    // ============================================
    // CORRIDOR PREVIEW (mobile-friendly tap-then-confirm)
    // ============================================

    function showCorridorPreview(startX, startZ, endX, endZ, width) {
        const THREE = getTHREE();
        const scene = getScene();
        // Clear ONLY the visual markers - not pendingCorridorCommand, which
        // previewCorridorCommand has just set and we still need.
        clearCorridorVisuals();

        const dx = endX - startX;
        const dz = endZ - startZ;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1) return;

        const dirX = dx / length;
        const dirZ = dz / length;
        const perpX = -dirZ;
        const perpZ = dirX;
        const halfWidth = width / 2;

        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.85,
            linewidth: 3
        });

        // Left edge
        const leftPoints = [
            new THREE.Vector3(startX + perpX * halfWidth, 0.3, startZ + perpZ * halfWidth),
            new THREE.Vector3(endX + perpX * halfWidth, 0.3, endZ + perpZ * halfWidth)
        ];
        const leftLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(leftPoints),
            lineMaterial.clone()
        );
        scene.add(leftLine);
        corridorPreviewLines.push(leftLine);

        // Right edge
        const rightPoints = [
            new THREE.Vector3(startX - perpX * halfWidth, 0.3, startZ - perpZ * halfWidth),
            new THREE.Vector3(endX - perpX * halfWidth, 0.3, endZ - perpZ * halfWidth)
        ];
        const rightLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(rightPoints),
            lineMaterial.clone()
        );
        scene.add(rightLine);
        corridorPreviewLines.push(rightLine);

        // Center line
        const centerLineMaterial = new THREE.LineBasicMaterial({
            color: 0xffdd00,
            transparent: true,
            opacity: 0.5
        });
        const centerLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(startX, 0.25, startZ),
                new THREE.Vector3(endX, 0.25, endZ)
            ]),
            centerLineMaterial
        );
        scene.add(centerLine);
        corridorPreviewLines.push(centerLine);

        // Tree markers
        const trees = getCorridorTrees(startX, startZ, endX, endZ, width);
        for (const tree of trees) {
            const markerGeometry = new THREE.CircleGeometry(0.5, 8);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: 0xff6600,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.rotation.x = -Math.PI / 2;
            marker.position.set(tree.x + 0.5, 0.35, tree.z + 0.5);
            scene.add(marker);
            corridorPreviewMarkers.push(marker);
        }

        // Destination ring
        const destGeometry = new THREE.RingGeometry(1.0, 1.5, 16);
        const destMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const destMarker = new THREE.Mesh(destGeometry, destMaterial);
        destMarker.rotation.x = -Math.PI / 2;
        destMarker.position.set(endX, 0.2, endZ);
        scene.add(destMarker);
        corridorPreviewMarkers.push(destMarker);
    }

    // Visual-only cleanup. Used internally by showCorridorPreview when it
    // wants to wipe the existing markers but keep the pending command state.
    function clearCorridorVisuals() {
        const scene = getScene();
        for (const marker of corridorPreviewMarkers) {
            scene.remove(marker);
            if (marker.geometry) marker.geometry.dispose();
            if (marker.material) marker.material.dispose();
        }
        corridorPreviewMarkers = [];
        for (const line of corridorPreviewLines) {
            scene.remove(line);
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
        }
        corridorPreviewLines = [];
    }

    // Full cleanup. Wipes visuals AND clears the pending command state.
    // Use this when ending the corridor command flow (cancel, deselect,
    // change command mode).
    function clearCorridorPreview() {
        clearCorridorVisuals();
        pendingCorridorCommand = null;
    }

    // Step 1: User tapped destination while in cut mode - show preview
    function previewCorridorCommand(targetX, targetZ, width) {
        if (selectedUnits.length === 0) return;

        const unit = selectedUnits[0];
        pendingCorridorCommand = {
            startX: unit.position.x,
            startZ: unit.position.z,
            targetX: targetX,
            targetZ: targetZ,
            width: width
        };

        // Ripple at the tapped point so user sees their tap registered
        createRipple(targetX, targetZ);

        showCorridorPreview(unit.position.x, unit.position.z, targetX, targetZ, width);

        if (window.GameUI) {
            GameUI.showCorridorConfirm(width);
        }
    }

    // Step 2a: User confirmed - execute the command
    function confirmCorridorCommand() {
        if (!pendingCorridorCommand || selectedUnits.length === 0) {
            clearCorridorPreview();
            return;
        }

        const { targetX, targetZ, width } = pendingCorridorCommand;
        clearCorridorPreview();
        executeCutCorridor(selectedUnits, targetX, targetZ, width);

        commandMode = null;
        if (window.GameUI) {
            GameUI.hideCommandIndicator();
            GameUI.showUnitMenu(selectedUnits);
        }
    }

    // Step 2b: User cancelled - clear and return to unit menu
    function cancelCorridorCommand() {
        clearCorridorPreview();
        commandMode = null;
        if (window.GameUI) {
            GameUI.hideCommandIndicator();
            if (selectedUnits.length > 0) {
                GameUI.showUnitMenu(selectedUnits);
            }
        }
    }

    function executeCutCorridor(units, targetX, targetZ, width) {
        if (!Array.isArray(units)) units = [units];

        createRipple(targetX, targetZ);

        if (units.length === 1) {
            startCuttingCorridor(units[0], targetX, targetZ, width);
        } else {
            const dx = targetX - units[0].position.x;
            const dz = targetZ - units[0].position.z;
            const length = Math.sqrt(dx * dx + dz * dz);

            if (length > 0) {
                const perpX = -dz / length;
                const perpZ = dx / length;
                const spacing = width / Math.max(1, units.length - 1);
                const halfWidth = width / 2;

                units.forEach((unit, index) => {
                    const offset = units.length === 1 ? 0 : -halfWidth + (index * spacing);
                    const unitTargetX = targetX + perpX * offset;
                    const unitTargetZ = targetZ + perpZ * offset;
                    startCuttingCorridor(unit, unitTargetX, unitTargetZ, width);
                });
            } else {
                units.forEach(unit => {
                    unit.harvestMode = 'nearby';
                    startHarvesting(unit);
                });
            }
        }

        console.log(`${units.length} unit(s) cutting ${width === 2 ? 'path' : 'lane'} to (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);
    }

    // Public entry point - now routes through preview-then-confirm
    function commandCutCorridor(units, targetX, targetZ, width) {
        previewCorridorCommand(targetX, targetZ, width);
    }

    // ============================================
    // LOOP PATHS - persistent multi-waypoint paths (polygons)
    //   - Player taps to add waypoints. Polygon is drawn closed (last
    //     waypoint always connects back to first).
    //   - Confirm assigns selected woodsmen to cut along all polygon edges.
    //   - Path stays in gameState.paths as a yellow polygon while being cut,
    //     turns purple when all corridor trees on its edges are gone.
    //   - Each path object: { id, waypoints, width, state, owner, lineMeshes }
    //     state = 'draft' | 'under-construction' | 'complete'
    // ============================================

    let nextPathId = 1;
    let draftLoopPath = null;  // path being built up by tap-tap-tap input

    function createLoopPath(waypoints, width, owner = 'player') {
        const gameState = getGameState();
        if (!gameState.paths) gameState.paths = [];

        const path = {
            id: `path_${nextPathId++}`,
            waypoints: waypoints.map(p => ({ x: p.x, z: p.z })),
            width: width,
            state: 'draft',
            owner: owner,
            lineMeshes: [],          // THREE.Line objects rendering the polygon
            closed: true             // loops are always closed (last → first)
        };

        gameState.paths.push(path);
        renderPath(path);
        return path;
    }

    // Returns array of segment objects: { startX, startZ, endX, endZ, width }
    // For a closed polygon with N waypoints, that's N segments.
    function getPathSegments(path) {
        const segments = [];
        const n = path.waypoints.length;
        if (n < 2) return segments;

        for (let i = 0; i < n; i++) {
            const a = path.waypoints[i];
            const b = path.waypoints[(i + 1) % n];
            segments.push({
                startX: a.x, startZ: a.z,
                endX: b.x, endZ: b.z,
                width: path.width
            });
        }
        return segments;
    }

    // Find the closest reachable, unclaimed tree across all segments of `path`,
    // measured from the unit's current position. This is what makes multiple
    // woodsmen distribute work across the loop naturally.
    function findNextReachablePathTree(unit, path) {
        const gameState = getGameState();
        const CELL = getCELL();
        const CONFIG = getCONFIG();
        const segments = getPathSegments(path);

        let nearestTree = null;
        let nearestDist = Infinity;
        const seen = new Set();

        for (const seg of segments) {
            const dx = seg.endX - seg.startX;
            const dz = seg.endZ - seg.startZ;
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length < 1) continue;

            const dirX = dx / length;
            const dirZ = dz / length;
            const perpX = -dirZ;
            const perpZ = dirX;
            const halfWidth = seg.width / 2;

            for (let along = 0; along <= length; along += 0.5) {
                for (let across = -halfWidth; across <= halfWidth; across += 0.5) {
                    const checkX = Math.floor(seg.startX + dirX * along + perpX * across);
                    const checkZ = Math.floor(seg.startZ + dirZ * along + perpZ * across);
                    const key = `${checkX},${checkZ}`;
                    if (seen.has(key)) continue;
                    seen.add(key);

                    if (checkX < 0 || checkX >= CONFIG.GRID_WIDTH || checkZ < 0 || checkZ >= CONFIG.GRID_HEIGHT) continue;

                    const cell = gameState.grid[checkX]?.[checkZ];
                    if (cell !== CELL.TREE_NORMAL && cell !== CELL.TREE_HIGH_YIELD && cell !== CELL.TREE_ENERGY) continue;

                    const claimedBy = claimedTrees.get(key);
                    if (claimedBy && claimedBy !== unit.id) continue;

                    if (!isTreeReachable(checkX, checkZ)) continue;

                    const treeDx = checkX - unit.position.x;
                    const treeDz = checkZ - unit.position.z;
                    const dist = Math.sqrt(treeDx * treeDx + treeDz * treeDz);

                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestTree = { x: checkX, z: checkZ, type: cell };
                    }
                }
            }
        }

        return nearestTree;
    }

    // Same logic but returns ALL trees on the path (for visualization / completion check)
    function getAllPathTrees(path) {
        const gameState = getGameState();
        const CELL = getCELL();
        const CONFIG = getCONFIG();
        const segments = getPathSegments(path);

        const trees = [];
        const seen = new Set();

        for (const seg of segments) {
            const dx = seg.endX - seg.startX;
            const dz = seg.endZ - seg.startZ;
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length < 1) continue;

            const dirX = dx / length;
            const dirZ = dz / length;
            const perpX = -dirZ;
            const perpZ = dirX;
            const halfWidth = seg.width / 2;

            for (let along = 0; along <= length; along += 0.5) {
                for (let across = -halfWidth; across <= halfWidth; across += 0.5) {
                    const checkX = Math.floor(seg.startX + dirX * along + perpX * across);
                    const checkZ = Math.floor(seg.startZ + dirZ * along + perpZ * across);
                    const key = `${checkX},${checkZ}`;
                    if (seen.has(key)) continue;
                    seen.add(key);

                    if (checkX < 0 || checkX >= CONFIG.GRID_WIDTH || checkZ < 0 || checkZ >= CONFIG.GRID_HEIGHT) continue;

                    const cell = gameState.grid[checkX]?.[checkZ];
                    if (cell === CELL.TREE_NORMAL || cell === CELL.TREE_HIGH_YIELD || cell === CELL.TREE_ENERGY) {
                        trees.push({ x: checkX, z: checkZ, type: cell });
                    }
                }
            }
        }

        return trees;
    }

    // Render the polygon as line segments. Color depends on state.
    //   draft / under-construction → yellow
    //   complete → purple
    function renderPath(path) {
        const THREE = getTHREE();
        const scene = getScene();
        clearPathRender(path);

        if (path.waypoints.length < 1) return;

        const color = path.state === 'complete' ? 0xb060e0 : 0xffd040;
        const opacity = path.state === 'complete' ? 0.85 : 0.75;

        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
            linewidth: 3
        });

        const n = path.waypoints.length;

        // Render each segment as its own line so we can see edges clearly.
        // For a single waypoint, just draw a small marker.
        if (n === 1) {
            const p = path.waypoints[0];
            const ringGeo = new THREE.RingGeometry(0.6, 0.9, 16);
            const ringMat = new THREE.MeshBasicMaterial({
                color: color, transparent: true, opacity: 0.8, side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(p.x, 0.3, p.z);
            scene.add(ring);
            path.lineMeshes.push(ring);
        } else {
            for (let i = 0; i < n; i++) {
                const a = path.waypoints[i];
                const b = path.waypoints[(i + 1) % n];
                // For draft polygons with 2 waypoints, the closing edge is the
                // same as the forward edge - skip the duplicate.
                if (n === 2 && i === 1) continue;

                const points = [
                    new THREE.Vector3(a.x, 0.3, a.z),
                    new THREE.Vector3(b.x, 0.3, b.z)
                ];
                const geom = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geom, material.clone());
                scene.add(line);
                path.lineMeshes.push(line);
            }
        }

        // Waypoint dots so the player can see the corners they tapped
        for (const wp of path.waypoints) {
            const dotGeo = new THREE.CircleGeometry(0.4, 12);
            const dotMat = new THREE.MeshBasicMaterial({
                color: color, transparent: true, opacity: 0.9, side: THREE.DoubleSide
            });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.rotation.x = -Math.PI / 2;
            dot.position.set(wp.x, 0.32, wp.z);
            scene.add(dot);
            path.lineMeshes.push(dot);
        }
    }

    function clearPathRender(path) {
        const scene = getScene();
        for (const mesh of path.lineMeshes) {
            scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        path.lineMeshes = [];
    }

    function destroyPath(path) {
        const gameState = getGameState();
        clearPathRender(path);
        if (gameState.paths) {
            const idx = gameState.paths.indexOf(path);
            if (idx !== -1) gameState.paths.splice(idx, 1);
        }
    }

    function findPathById(pathId) {
        const gameState = getGameState();
        if (!gameState.paths) return null;
        return gameState.paths.find(p => p.id === pathId) || null;
    }

    // ----- Multi-waypoint input flow -----

    // Each tap while in cutLoop mode adds a waypoint to the draft path.
    function addLoopWaypoint(targetX, targetZ, width) {
        if (selectedUnits.length === 0) return;

        if (!draftLoopPath) {
            // First tap - create the path
            draftLoopPath = createLoopPath([{ x: targetX, z: targetZ }], width);
            createRipple(targetX, targetZ);
            if (window.GameUI) GameUI.showLoopConfirm(width);
        } else {
            // Append a waypoint and re-render
            draftLoopPath.waypoints.push({ x: targetX, z: targetZ });
            createRipple(targetX, targetZ);
            renderPath(draftLoopPath);
        }
    }

    // User hit Confirm - assign units, transition draft → under-construction.
    function confirmLoopCommand() {
        if (!draftLoopPath || selectedUnits.length === 0) {
            cancelLoopCommand();
            return;
        }

        if (draftLoopPath.waypoints.length < 2) {
            // Not enough waypoints to form a path - cancel
            cancelLoopCommand();
            return;
        }

        draftLoopPath.state = 'under-construction';
        renderPath(draftLoopPath);  // re-render with under-construction style

        const pathRef = draftLoopPath;
        for (const unit of selectedUnits) {
            assignUnitToPath(unit, pathRef);
        }

        draftLoopPath = null;
        commandMode = null;

        if (window.GameUI) {
            GameUI.hideCommandIndicator();
            GameUI.hideLoopConfirm();
            GameUI.showUnitMenu(selectedUnits);
        }
    }

    function cancelLoopCommand() {
        if (draftLoopPath) {
            destroyPath(draftLoopPath);
            draftLoopPath = null;
        }
        commandMode = null;

        if (window.GameUI) {
            GameUI.hideCommandIndicator();
            GameUI.hideLoopConfirm();
            if (selectedUnits.length > 0) {
                GameUI.showUnitMenu(selectedUnits);
            }
        }
    }

    function hasDraftLoopPath() {
        return draftLoopPath !== null;
    }

    // ----- Unit cutting behavior on a path -----

    function assignUnitToPath(unit, path) {
        if (!unit.typeData.canHarvest) return;

        unit.pathId = path.id;
        unit.harvestMode = 'cutLoop';
        unit.corridorTarget = null;  // clear any old corridor target
        releaseTreeClaim(unit);

        continueCuttingPath(unit);
    }

    function continueCuttingPath(unit) {
        const path = findPathById(unit.pathId);
        if (!path) {
            // Path was destroyed - fall back to nearby
            unit.pathId = null;
            unit.harvestMode = 'nearby';
            startHarvesting(unit);
            return;
        }

        // Inventory full?
        const totalCarried = unit.inventory.wood + unit.inventory.energy;
        if (totalCarried >= unit.carryCapacity) {
            returnToSawmill(unit);
            return;
        }

        // Find next reachable tree on any segment of the path
        const blockingTree = findNextReachablePathTree(unit, path);

        if (blockingTree) {
            claimTree(unit, blockingTree);
            unit.targetTree = blockingTree;

            const adjacentCell = findAdjacentCellToTree(
                blockingTree.x, blockingTree.z,
                unit.position.x, unit.position.z
            );

            if (adjacentCell) {
                const newPath = findPath(
                    unit.position.x, unit.position.z,
                    adjacentCell.x, adjacentCell.z,
                    false, unit.hasForestWalk
                );
                if (newPath && newPath.length > 0) {
                    unit.path = newPath;
                    unit.pathIndex = 0;
                    unit.state = 'moving';
                    createPathLine(unit, newPath);
                    return;
                }
            }

            releaseTreeClaim(unit);
            unit.state = 'idle';
        } else {
            // No more trees on this path - it's done!
            // Mark path complete (will be checked in updatePaths too, but do it now)
            if (path.state !== 'complete') {
                path.state = 'complete';
                renderPath(path);
                console.log(`Path ${path.id} complete - now patrollable`);
            }

            // Unit done with this path - revert to nearby harvest
            unit.pathId = null;
            unit.harvestMode = 'nearby';
            startHarvesting(unit);
        }
    }

    // Run periodically to check if any under-construction paths are done
    // (covers the case where ALL trees on a path get cut by means other
    // than assigned woodsmen, e.g. a cleave upgrade or hero blasts).
    function updatePaths() {
        const gameState = getGameState();
        if (!gameState.paths) return;

        for (const path of gameState.paths) {
            if (path.state !== 'under-construction') continue;
            const remaining = getAllPathTrees(path);
            if (remaining.length === 0) {
                path.state = 'complete';
                renderPath(path);
                console.log(`Path ${path.id} complete (auto-detected)`);
            }
        }
    }

    // ============================================
    // HARVESTING TREE (the chopping action)
    // ============================================

    function harvestTree(unit, deltaTime) {
        const gameState = getGameState();
        const CELL = getCELL();

        if (!unit.targetTree) {
            if (unit.harvestMode === 'cutPath' || unit.harvestMode === 'cutLane') {
                continueCuttingCorridor(unit);
            } else if (unit.harvestMode === 'cutLoop') {
                continueCuttingPath(unit);
            } else {
                startHarvesting(unit);
            }
            return;
        }

        const dx = unit.targetTree.x + 0.5 - unit.position.x;
        const dz = unit.targetTree.z + 0.5 - unit.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 2.5) {
            // Need to move closer - find adjacent walkable cell
            const adjacentCell = findAdjacentCellToTree(
                unit.targetTree.x, unit.targetTree.z,
                unit.position.x, unit.position.z
            );

            if (adjacentCell) {
                const path = findPath(
                    unit.position.x, unit.position.z,
                    adjacentCell.x, adjacentCell.z,
                    false, unit.hasForestWalk
                );
                if (path && path.length > 0) {
                    unit.path = path;
                    unit.pathIndex = 0;
                    unit.state = 'moving';
                    createPathLine(unit, path);
                    return;
                }
            }

            releaseTreeClaim(unit);
            unit.targetTree = null;
            unit.state = 'idle';
            return;
        }

        unit.state = 'harvesting';

        let effectiveHarvestSpeed = unit.harvestSpeed;
        if (unit.hasRhythm && unit.chopCount > 0) {
            const speedBonus = Math.min(0.5, unit.chopCount * 0.05);
            effectiveHarvestSpeed *= (1 - speedBonus);
        }

        unit.harvestProgress += deltaTime;

        if (unit.harvestProgress >= effectiveHarvestSpeed) {
            unit.harvestProgress = 0;
            unit.chopCount++;

            const treeType = unit.targetTree.type;
            const treeX = unit.targetTree.x;
            const treeZ = unit.targetTree.z;

            releaseTreeClaim(unit);

            let woodYield = 0, energyYield = 0;
            if (treeType === CELL.TREE_NORMAL) woodYield = 10;
            else if (treeType === CELL.TREE_HIGH_YIELD) woodYield = 25;
            else if (treeType === CELL.TREE_ENERGY) {
                energyYield = 15;
                if (unit.energySpecialist) energyYield *= 2;
            }

            unit.inventory.wood += woodYield;
            unit.inventory.energy += energyYield;

            gameState.grid[treeX][treeZ] = CELL.EMPTY;

            const treeIndex = gameState.trees.findIndex(t =>
                t.userData.gridX === treeX && t.userData.gridZ === treeZ
            );
            if (treeIndex !== -1) {
                getScene().remove(gameState.trees[treeIndex]);
                gameState.trees.splice(treeIndex, 1);
            }

            if (unit.hasCleave) {
                console.log('Clear Cutter activated at', treeX, treeZ);
            }

            const treeCountEl = document.getElementById('tree-count');
            if (treeCountEl) treeCountEl.textContent = gameState.trees.length;

            const totalCarried = unit.inventory.wood + unit.inventory.energy;
            if (totalCarried >= unit.carryCapacity) {
                returnToSawmill(unit);
            } else if (unit.harvestMode === 'cutPath' || unit.harvestMode === 'cutLane') {
                unit.targetTree = null;
                continueCuttingCorridor(unit);
            } else if (unit.harvestMode === 'cutLoop') {
                unit.targetTree = null;
                continueCuttingPath(unit);
            } else {
                unit.targetTree = null;
                startHarvesting(unit);
            }
        }
    }

    function returnToSawmill(unit) {
        releaseTreeClaim(unit);
        const sawmill = findNearestSawmill(unit);
        if (!sawmill) {
            depositResources(unit);
            return;
        }

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
            createPathLine(unit, path);
        } else {
            unit.state = 'idle';
        }
    }

    function depositResources(unit) {
        const gameState = getGameState();
        const woodToDeposit = Math.floor(unit.inventory.wood * unit.depositMult);
        const energyToDeposit = Math.floor(unit.inventory.energy * unit.depositMult);
        gameState.resources.wood += woodToDeposit;
        gameState.resources.energy += energyToDeposit;
        console.log(`Deposited ${woodToDeposit} wood, ${energyToDeposit} energy`);
        unit.inventory.wood = 0;
        unit.inventory.energy = 0;

        if (window.GameUI) GameUI.updateResources();

        if (unit.harvestMode === 'cutPath' || unit.harvestMode === 'cutLane') {
            continueCuttingCorridor(unit);
        } else if (unit.harvestMode === 'cutLoop') {
            continueCuttingPath(unit);
        } else if (unit.harvestMode) {
            startHarvesting(unit);
        } else {
            unit.state = 'idle';
        }
    }

    // ============================================
    // MOVEMENT (no soft-collision push - units can overlap)
    // Smooth movement: carries leftover distance across waypoints in a
    // single frame so the unit doesn't stall every time it reaches one.
    // ============================================

    // Maximum allowed deltaTime per frame in ms. Prevents huge jumps after
    // tab-switches, debugger pauses, or a slow first frame after init.
    const MAX_DELTA_MS = 50;

    function moveUnit(unit, deltaTime) {
        if (!unit.path || unit.pathIndex >= unit.path.length) {
            unit.path = null;
            clearPathLine(unit);

            if (unit.state === 'returning' && unit.targetBuilding) {
                const dx = unit.targetBuilding.position.x - unit.position.x;
                const dz = unit.targetBuilding.position.z - unit.position.z;
                if (Math.sqrt(dx * dx + dz * dz) < 4) {
                    depositResources(unit);
                    unit.targetBuilding = null;
                }
            } else if (unit.state === 'moving' && unit.targetTree) {
                harvestTree(unit, 0);
            } else if ((unit.harvestMode === 'cutPath' || unit.harvestMode === 'cutLane') && unit.typeData.canHarvest) {
                continueCuttingCorridor(unit);
            } else if (unit.harvestMode === 'cutLoop' && unit.typeData.canHarvest) {
                continueCuttingPath(unit);
            } else if (unit.harvestMode === 'nearby' && unit.typeData.canHarvest) {
                startHarvesting(unit);
            } else {
                unit.state = 'idle';
            }
            return;
        }

        // deltaTime is already clamped to MAX_DELTA_MS in update().
        let remainingMove = unit.speed * deltaTime;

        // Walk through waypoints, consuming the full frame's movement budget.
        // If we reach a waypoint mid-frame, snap to it and continue toward
        // the next one with the leftover distance. This is what gives the
        // motion its smoothness - no per-waypoint stalls.
        while (remainingMove > 0 && unit.pathIndex < unit.path.length) {
            const target = unit.path[unit.pathIndex];
            const targetX = target.x + 0.5;
            const targetZ = target.z + 0.5;
            const dx = targetX - unit.position.x;
            const dz = targetZ - unit.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < 0.001) {
                // Already at this waypoint (degenerate first node)
                unit.pathIndex++;
                continue;
            }

            if (distance <= remainingMove) {
                // We can reach this waypoint this frame - snap to it,
                // spend the distance, advance to the next one.
                unit.position.x = targetX;
                unit.position.z = targetZ;
                remainingMove -= distance;
                unit.pathIndex++;
            } else {
                // Not enough movement to reach this waypoint - partial move.
                const t = remainingMove / distance;
                unit.position.x += dx * t;
                unit.position.z += dz * t;
                remainingMove = 0;
            }
        }

        // Sync visuals
        unit.sprite.position.x = unit.position.x;
        unit.sprite.position.z = unit.position.z;

        if (unit.selectionRing) {
            unit.selectionRing.position.x = unit.position.x;
            unit.selectionRing.position.z = unit.position.z;
        }
    }

    // ============================================
    // PATH VISUALIZATION
    // ============================================

    function createPathLine(unit, path) {
        const THREE = getTHREE();
        const scene = getScene();
        clearPathLine(unit);
        if (!path || path.length < 2) return;

        const points = [new THREE.Vector3(unit.position.x, 0.2, unit.position.z)];
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
    // RIPPLE EFFECT
    // ============================================

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
        ripples.push({ mesh: ripple, startTime: Date.now(), x, z });
    }

    function updateRipples() {
        const scene = getScene();
        const now = Date.now();
        for (let i = ripples.length - 1; i >= 0; i--) {
            const ripple = ripples[i];
            const age = now - ripple.startTime;
            const maxAge = 600;
            if (age >= maxAge) {
                scene.remove(ripple.mesh);
                ripple.mesh.geometry.dispose();
                ripple.mesh.material.dispose();
                ripples.splice(i, 1);
            } else {
                const progress = age / maxAge;
                const scale = 1 + progress * 3;
                ripple.mesh.scale.set(scale, scale, 1);
                ripple.mesh.material.opacity = 0.8 * (1 - progress);
            }
        }
    }

    // ============================================
    // MOVE COMMANDS
    // ============================================

    function commandMove(unit, targetX, targetZ) {
        const canFly = unit.typeData.canFly || false;
        createRipple(targetX, targetZ);
        releaseTreeClaim(unit);

        const path = findPath(
            unit.position.x, unit.position.z,
            targetX, targetZ,
            canFly, unit.hasForestWalk
        );

        if (path && path.length > 0) {
            unit.path = path;
            unit.pathIndex = 0;
            unit.state = 'moving';
            unit.harvestMode = null;
            unit.corridorTarget = null;
            unit.pathId = null;
            unit.targetTree = null;
            unit.targetBuilding = null;
            createPathLine(unit, path);
            console.log(`Moving ${unit.typeData.name} to (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);
        } else {
            console.log('No path found!');
        }
    }

    function commandMoveMultiple(units, targetX, targetZ) {
        if (units.length === 0) return;
        if (units.length === 1) {
            commandMove(units[0], targetX, targetZ);
            return;
        }

        const spacing = 2.0;
        const unitsPerRow = Math.ceil(Math.sqrt(units.length));
        createRipple(targetX, targetZ);

        units.forEach((unit, index) => {
            const row = Math.floor(index / unitsPerRow);
            const col = index % unitsPerRow;
            const offsetX = (col - (unitsPerRow - 1) / 2) * spacing;
            const offsetZ = (row - (Math.ceil(units.length / unitsPerRow) - 1) / 2) * spacing;
            const unitTargetX = targetX + offsetX;
            const unitTargetZ = targetZ + offsetZ;
            const canFly = unit.typeData.canFly || false;

            releaseTreeClaim(unit);
            const path = findPath(
                unit.position.x, unit.position.z,
                unitTargetX, unitTargetZ,
                canFly, unit.hasForestWalk
            );

            if (path && path.length > 0) {
                unit.path = path;
                unit.pathIndex = 0;
                unit.state = 'moving';
                unit.harvestMode = null;
                unit.corridorTarget = null;
                unit.pathId = null;
                unit.targetTree = null;
                unit.targetBuilding = null;
                createPathLine(unit, path);
            }
        });

        console.log(`Moving ${units.length} units in formation around (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);
    }

    // ============================================
    // SELECTION
    // ============================================

    function selectUnit(unit) {
        if (selectedUnits.length > 0 && selectedUnits[0].type !== unit.type) {
            deselectAllUnits();
        }

        if (selectedUnits.includes(unit)) {
            if (window.GameUI) GameUI.showUnitMenu(selectedUnits);
            return;
        }

        deselectAllUnits();
        selectedUnits = [unit];

        if (unit.selectionRing) unit.selectionRing.visible = true;
        if (window.GameUI) GameUI.showUnitMenu(selectedUnits);
    }

    function selectAllVisibleOfType(unitType) {
        const gameState = getGameState();
        const camera = window.GameEngine?.camera;
        const THREE = getTHREE();
        if (!camera || !gameState) return;

        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projScreenMatrix);

        const visibleUnits = gameState.units.filter(u => {
            if (u.type !== unitType) return false;
            if (u.owner !== 'player') return false;
            return frustum.containsPoint(u.sprite.position);
        });

        if (visibleUnits.length === 0) return;

        deselectAllUnits();
        selectedUnits = visibleUnits;
        selectedUnits.forEach(unit => {
            if (unit.selectionRing) unit.selectionRing.visible = true;
        });

        console.log(`Selected ${selectedUnits.length} ${unitType}(s)`);
        if (window.GameUI) GameUI.showUnitMenu(selectedUnits);
    }

    function deselectUnit() { deselectAllUnits(); }

    function deselectAllUnits() {
        selectedUnits.forEach(unit => {
            if (unit.selectionRing) unit.selectionRing.visible = false;
        });
        selectedUnits = [];
        commandMode = null;
        clearCorridorPreview();
        // Discard any in-progress loop draft - the user is no longer
        // engaged with the woodsman that started it.
        if (draftLoopPath) {
            destroyPath(draftLoopPath);
            draftLoopPath = null;
            if (window.GameUI) GameUI.hideLoopConfirm();
        }
        if (window.GameUI) GameUI.hideMenus();
    }

    function getSelectedUnit() {
        return selectedUnits.length > 0 ? selectedUnits[0] : null;
    }

    function getSelectedUnits() { return selectedUnits; }

    function setCommandMode(mode) {
        commandMode = mode;
        if (mode !== 'cutPath' && mode !== 'cutLane') {
            clearCorridorPreview();
        }
        // Leaving cutLoop mode without committing → drop the draft.
        if (mode !== 'cutLoop' && draftLoopPath) {
            destroyPath(draftLoopPath);
            draftLoopPath = null;
            if (window.GameUI) GameUI.hideLoopConfirm();
        }
    }

    function getCommandMode() { return commandMode; }

    function hasPendingCorridorCommand() {
        return pendingCorridorCommand !== null;
    }

    // ============================================
    // UPDATE LOOP
    // ============================================

    function update() {
        const gameState = getGameState();
        if (!gameState) return;

        const now = Date.now();
        // Clamp deltaTime - protects against huge jumps after tab backgrounding,
        // debugger pauses, or a slow first frame. Without this, units can teleport
        // and harvest progress can leap forward unrealistically.
        const deltaTime = Math.min(now - lastTime, MAX_DELTA_MS);
        lastTime = now;

        if (window.GameBuildings) GameBuildings.updateProduction(deltaTime);

        // Clean up tree claims for dead units
        for (const [key, unitId] of claimedTrees.entries()) {
            const unitExists = gameState.units.some(u => u.id === unitId);
            if (!unitExists) claimedTrees.delete(key);
        }

        for (const unit of gameState.units) {
            // Combat takes priority over everything else
            const inCombat = updateCombat(unit, deltaTime);
            if (inCombat) continue;

            switch (unit.state) {
                case 'moving':
                case 'returning':
                    moveUnit(unit, deltaTime);
                    break;
                case 'harvesting':
                    harvestTree(unit, deltaTime);
                    break;
                case 'attacking':
                    // No longer in combat - resume previous activity
                    if (unit.harvestMode && unit.typeData.canHarvest) {
                        if (unit.harvestMode === 'cutPath' || unit.harvestMode === 'cutLane') {
                            continueCuttingCorridor(unit);
                        } else if (unit.harvestMode === 'cutLoop') {
                            continueCuttingPath(unit);
                        } else {
                            startHarvesting(unit);
                        }
                    } else {
                        unit.state = 'idle';
                    }
                    break;
                case 'idle':
                    if (unit.harvestMode === 'nearby' && unit.typeData.canHarvest) {
                        startHarvesting(unit);
                    } else if ((unit.harvestMode === 'cutPath' || unit.harvestMode === 'cutLane') && unit.typeData.canHarvest) {
                        continueCuttingCorridor(unit);
                    } else if (unit.harvestMode === 'cutLoop' && unit.typeData.canHarvest) {
                        continueCuttingPath(unit);
                    }
                    break;
            }

            // Idle bob animation
            if (unit.sprite) {
                const baseY = 2.25;
                const bobAmount = unit.state === 'harvesting' ? 0.2 :
                    unit.state === 'attacking' ? 0.3 : 0.1;
                const bobSpeed = unit.state === 'harvesting' ? 0.01 :
                    unit.state === 'attacking' ? 0.015 : 0.003;
                unit.sprite.position.y = baseY + Math.sin(now * bobSpeed + unit.id.length) * bobAmount;
            }

            // Selection ring pulse
            if (unit.selectionRing && unit.selectionRing.visible) {
                unit.selectionRing.material.opacity = 0.5 + Math.sin(now * 0.005) * 0.2;
            }

            // Path line fade
            if (unit.pathLine && unit.pathLine.material) {
                unit.pathLine.material.opacity = Math.max(0.2, unit.pathLine.material.opacity - 0.001);
            }
            if (unit.destinationMarker && unit.destinationMarker.material) {
                unit.destinationMarker.material.opacity = 0.4 + Math.sin(now * 0.008) * 0.2;
                unit.destinationMarker.rotation.z += 0.02;
            }
        }

        updateRipples();

        // Pulse corridor preview markers
        for (const marker of corridorPreviewMarkers) {
            if (marker.material) {
                marker.material.opacity = 0.5 + Math.sin(now * 0.006) * 0.3;
            }
        }

        // Auto-detect path completion (e.g. trees on a path were cut by
        // some other means than assigned units).
        updatePaths();
    }

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
        commandMoveMultiple,
        commandCutCorridor,
        update,
        selectUnit,
        selectAllVisibleOfType,
        deselectUnit,
        deselectAllUnits,
        getSelectedUnit,
        getSelectedUnits,
        setCommandMode,
        getCommandMode,
        startHarvesting,
        findPath,
        createRipple,
        clearCorridorPreview,
        previewCorridorCommand,
        confirmCorridorCommand,
        cancelCorridorCommand,
        hasPendingCorridorCommand,
        // Loop paths
        addLoopWaypoint,
        confirmLoopCommand,
        cancelLoopCommand,
        hasDraftLoopPath,
        killUnit
    };
})();
