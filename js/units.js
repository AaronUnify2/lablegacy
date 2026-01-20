// ============================================
// UNITS MODULE
// ============================================

window.GameUnits = (function() {
    // Get references lazily to avoid initialization order issues
    const getEngine = () => window.GameEngine;
    const getScene = () => window.GameEngine.scene;
    const getGameState = () => window.GameEngine.gameState;
    const getTHREE = () => window.GameEngine.THREE;
    
    let lastTime = Date.now();
    
    // Unit definitions
    const UNIT_TYPES = {
        knight: {
            id: 'knight',
            name: 'Knight',
            health: 100,
            damage: 15,
            speed: 0.05,
            attackRange: 2,
            attackSpeed: 1000, // ms between attacks
            color: 0x4169e1,
            scale: 1.0
        }
    };
    
    // Create unit sprite material
    function createUnitMaterial(unitType) {
        const THREE = getTHREE();
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 32, 48);
        
        // Simple knight sprite
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
    
    // Spawn a unit from a building
    function spawnUnit(unitTypeId, position, upgrades) {
        const THREE = getTHREE();
        const scene = getScene();
        const gameState = getGameState();
        
        const unitType = UNIT_TYPES[unitTypeId];
        if (!unitType) return null;
        
        const material = createUnitMaterial(unitType);
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(3 * unitType.scale, 4.5 * unitType.scale, 1);
        
        // Spawn slightly in front of building
        const spawnX = position.x;
        const spawnZ = position.z + 5;
        
        sprite.position.set(spawnX, 2.25, spawnZ);
        scene.add(sprite);
        
        // Calculate stats with upgrades
        const stats = calculateStats(unitType, upgrades);
        
        const unit = {
            id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: unitTypeId,
            typeData: unitType,
            sprite: sprite,
            position: { x: spawnX, z: spawnZ },
            target: null,
            targetPosition: null,
            health: stats.health,
            maxHealth: stats.health,
            damage: stats.damage,
            speed: stats.speed,
            attackRange: stats.attackRange,
            attackSpeed: stats.attackSpeed,
            lastAttackTime: 0,
            state: 'idle', // idle, moving, attacking
            owner: 'player',
            upgrades: { ...upgrades }
        };
        
        gameState.units.push(unit);
        console.log(`Spawned ${unitType.name} at (${spawnX.toFixed(1)}, ${spawnZ.toFixed(1)})`);
        
        return unit;
    }
    
    // Calculate stats with upgrades
    function calculateStats(unitType, upgrades) {
        // Base stats
        let health = unitType.health;
        let damage = unitType.damage;
        let speed = unitType.speed;
        let attackRange = unitType.attackRange;
        let attackSpeed = unitType.attackSpeed;
        
        // Apply upgrade modifiers (placeholder - will be expanded later)
        // Path 1: Offense
        if (upgrades.path1 >= 1) damage *= 1.25;
        if (upgrades.path1 >= 2) damage *= 1.25;
        if (upgrades.path1 >= 3) damage *= 1.25;
        
        // Path 2: Defense
        if (upgrades.path2 >= 1) health *= 1.4;
        if (upgrades.path2 >= 2) health *= 1.3;
        if (upgrades.path2 >= 3) health *= 1.2;
        
        // Path 3: Utility (Leadership for knights)
        if (upgrades.path3 >= 1) attackSpeed *= 0.9;
        if (upgrades.path3 >= 2) speed *= 1.15;
        if (upgrades.path3 >= 3) attackSpeed *= 0.85;
        
        return { health, damage, speed, attackRange, attackSpeed };
    }
    
    // Move unit toward target position
    function moveUnit(unit, deltaTime) {
        if (!unit.targetPosition) return;
        
        const dx = unit.targetPosition.x - unit.position.x;
        const dz = unit.targetPosition.z - unit.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 0.5) {
            unit.targetPosition = null;
            unit.state = 'idle';
            return;
        }
        
        // Normalize and move
        const moveX = (dx / distance) * unit.speed * deltaTime;
        const moveZ = (dz / distance) * unit.speed * deltaTime;
        
        unit.position.x += moveX;
        unit.position.z += moveZ;
        
        // Update sprite position
        unit.sprite.position.x = unit.position.x;
        unit.sprite.position.z = unit.position.z;
    }
    
    // Command unit to move to position
    function commandMove(unit, targetX, targetZ) {
        unit.targetPosition = { x: targetX, z: targetZ };
        unit.state = 'moving';
    }
    
    // Update all units
    function update() {
        const gameState = getGameState();
        const now = Date.now();
        const deltaTime = now - lastTime;
        lastTime = now;
        
        // Update buildings production
        if (window.GameBuildings) {
            GameBuildings.updateProduction(deltaTime);
        }
        
        // Update units
        gameState.units.forEach(unit => {
            if (unit.state === 'moving') {
                moveUnit(unit, deltaTime);
            }
            
            // Simple idle animation - slight bob
            if (unit.sprite) {
                unit.sprite.position.y = 2.25 + Math.sin(now * 0.003 + unit.id.length) * 0.1;
            }
        });
    }
    
    // Initialize
    function init() {
        console.log('Units module initialized');
    }
    
    // Public API
    return {
        init,
        UNIT_TYPES,
        spawnUnit,
        commandMove,
        update,
        createUnitMaterial
    };
})();
