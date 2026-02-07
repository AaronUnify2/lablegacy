// ============================================================
// ENEMIES MODULE
// ============================================================
// Owns: Enemy type definitions, spawning, AI behaviors, death.
//
// INTERFACE (used by index.html):
//   Enemies.init()       - Initialize textures
//   Enemies.spawnTick()  - Called each frame to maybe spawn
//   Enemies.update()     - Update all enemy AI
//
// HOW TO ADD A NEW ENEMY:
//   1. Write a createXxxTexture() function below
//   2. Push an entry to ENEMY_TYPES with the template fields
//   3. Done — it auto-integrates with spawning, combat, loot
//
// TEMPLATE FIELDS:
//   name          - Unique identifier string
//   texture       - Function that returns a THREE.Texture
//   scale         - [width, height] billboard scale
//   speed         - Movement speed (units/frame)
//   healthMult    - Multiplier on CONFIG.enemyBaseHealth
//   damageMult    - Multiplier on CONFIG.enemyBaseDamage
//   xp            - XP dropped on death
//   gold          - Gold dropped (if goldChance triggers)
//   goldChance    - Probability [0–1] of gold drop
//   behavior      - 'chase' | 'patrol' | 'guard' | 'ranged'
//   minDungeon    - Minimum dungeon level to appear (default 1)
//   maxDungeon    - Maximum dungeon level to appear (default 999)
//   attackRange   - Distance to start attacking (default 1.5)
//   attackCooldown- Frames between attacks (default 60)
//
// DEPENDS ON (from index.html):
//   createPixelTexture, scene, gameState, CONFIG, THREE,
//   onEnemyDeath, takeDamage
// ============================================================

const Enemies = (() => {
    'use strict';

    // ===================== ENEMY TYPE REGISTRY ==================
    // Add new enemies by pushing to this array. That's it.
    const ENEMY_TYPES = [];

    // ===================== TEXTURES =============================

    function createSlimeTexture() {
        return createPixelTexture(32, 32, (ctx) => {
            ctx.fillStyle = '#27ae60';
            ctx.beginPath(); ctx.ellipse(16, 20, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath(); ctx.ellipse(16, 18, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(10, 16, 5, 5); ctx.fillRect(18, 16, 5, 5);
            ctx.fillStyle = '#000';
            ctx.fillRect(12, 18, 2, 2); ctx.fillRect(20, 18, 2, 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(8, 14, 3, 3);
        });
    }

    function createGoblinTexture() {
        return createPixelTexture(32, 40, (ctx) => {
            ctx.fillStyle = '#6b8e23'; ctx.fillRect(8, 16, 16, 16);
            ctx.fillStyle = '#7cba3d'; ctx.fillRect(6, 4, 20, 14);
            ctx.fillStyle = '#6b8e23'; ctx.fillRect(2, 6, 6, 8); ctx.fillRect(24, 6, 6, 8);
            ctx.fillStyle = '#ff0';
            ctx.fillRect(10, 8, 4, 4); ctx.fillRect(18, 8, 4, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(11, 9, 2, 2); ctx.fillRect(19, 9, 2, 2);
            ctx.fillStyle = '#5a7a1e'; ctx.fillRect(14, 11, 4, 4);
            ctx.fillStyle = '#8b0000'; ctx.fillRect(12, 15, 8, 2);
            ctx.fillStyle = '#6b8e23';
            ctx.fillRect(10, 32, 4, 8); ctx.fillRect(18, 32, 4, 8);
            ctx.fillRect(4, 18, 4, 10); ctx.fillRect(24, 18, 4, 10);
        });
    }

    function createSkeletonTexture() {
        return createPixelTexture(32, 48, (ctx) => {
            ctx.fillStyle = '#ecf0f1';
            ctx.fillRect(10, 2, 12, 14); ctx.fillRect(8, 6, 16, 8);
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(11, 7, 4, 4); ctx.fillRect(17, 7, 4, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(12, 8, 2, 2); ctx.fillRect(18, 8, 2, 2);
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(15, 11, 2, 3);
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(12, 14, 8, 2);
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(14, 16, 4, 20);
            ctx.fillStyle = '#bdc3c7';
            for (let i = 0; i < 4; i++) ctx.fillRect(8, 18 + i * 4, 16, 2);
            ctx.fillRect(4, 18, 4, 14); ctx.fillRect(24, 18, 4, 14);
            ctx.fillRect(10, 36, 4, 12); ctx.fillRect(18, 36, 4, 12);
        });
    }

    function createGhostTexture() {
        return createPixelTexture(32, 40, (ctx) => {
            ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
            ctx.beginPath(); ctx.ellipse(16, 16, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(6, 24, 20, 10);
            for (let i = 0; i < 4; i++) ctx.fillRect(6 + i * 6, 34, 4, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(9, 12, 5, 6); ctx.fillRect(18, 12, 5, 6);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(10, 8, 4, 3); ctx.fillRect(19, 8, 4, 3);
        });
    }

    function createBatTexture() {
        return createPixelTexture(40, 24, (ctx) => {
            ctx.fillStyle = '#2c2c54';
            ctx.beginPath(); ctx.ellipse(20, 14, 8, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#40407a';
            ctx.beginPath(); ctx.moveTo(12, 14); ctx.lineTo(2, 6); ctx.lineTo(4, 16); ctx.lineTo(12, 18); ctx.fill();
            ctx.beginPath(); ctx.moveTo(28, 14); ctx.lineTo(38, 6); ctx.lineTo(36, 16); ctx.lineTo(28, 18); ctx.fill();
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(16, 11, 3, 3); ctx.fillRect(21, 11, 3, 3);
            ctx.fillStyle = '#2c2c54';
            ctx.fillRect(14, 4, 4, 6); ctx.fillRect(22, 4, 4, 6);
        });
    }

    function createWizardTexture() {
        return createPixelTexture(32, 48, (ctx) => {
            ctx.fillStyle = '#4a235a';
            ctx.fillRect(8, 20, 16, 22); ctx.fillRect(6, 42, 20, 6);
            ctx.fillStyle = '#fad7a0'; ctx.fillRect(10, 14, 12, 10);
            ctx.fillStyle = '#6c3483';
            ctx.fillRect(6, 10, 20, 6); ctx.fillRect(10, 2, 12, 10); ctx.fillRect(14, 0, 4, 4);
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(14, 4, 4, 4);
            ctx.fillStyle = '#9b59b6';
            ctx.fillRect(12, 16, 3, 3); ctx.fillRect(17, 16, 3, 3);
            ctx.fillStyle = '#bdc3c7';
            ctx.fillRect(10, 22, 12, 8); ctx.fillRect(12, 30, 8, 4); ctx.fillRect(14, 34, 4, 2);
            ctx.fillStyle = '#8b4513'; ctx.fillRect(26, 10, 3, 38);
            ctx.fillStyle = '#9b59b6'; ctx.fillRect(24, 6, 7, 6);
        });
    }

    // ===================== TYPE DEFINITIONS ======================
    // To add a new enemy: push to this array.
    // minDungeon/maxDungeon control when they appear.

    ENEMY_TYPES.push(
        {
            name: 'slime',
            texture: createSlimeTexture,
            scale: [2.5, 2.5],
            speed: 0.025,
            healthMult: 0.5,
            damageMult: 0.5,
            xp: 10,
            gold: 20,
            goldChance: 0.1,
            behavior: 'chase',
            minDungeon: 1,
            maxDungeon: 999,
            attackRange: 1.5,
            attackCooldown: 60
        },
        {
            name: 'goblin',
            texture: createGoblinTexture,
            scale: [2.5, 3.2],
            speed: 0.055,
            healthMult: 0.9,
            damageMult: 0.95,
            xp: 25,
            gold: 30,
            goldChance: 0.4,
            behavior: 'chase',
            minDungeon: 1,
            maxDungeon: 999,
            attackRange: 1.5,
            attackCooldown: 50
        },
        {
            name: 'skeleton',
            texture: createSkeletonTexture,
            scale: [2.5, 4],
            speed: 0.038,
            healthMult: 1.8,
            damageMult: 1.05,
            xp: 40,
            gold: 50,
            goldChance: 0.5,
            behavior: 'patrol',
            minDungeon: 2,
            maxDungeon: 999,
            attackRange: 1.8,
            attackCooldown: 55
        },
        {
            name: 'ghost',
            texture: createGhostTexture,
            scale: [2.5, 3.2],
            speed: 0.1,
            healthMult: 2.4,
            damageMult: 1.2,
            xp: 75,
            gold: 70,
            goldChance: 0.5,
            behavior: 'chase',
            minDungeon: 3,
            maxDungeon: 999,
            attackRange: 1.5,
            attackCooldown: 50
        },
        {
            name: 'bat',
            texture: createBatTexture,
            scale: [3, 2],
            speed: 0.17,
            healthMult: 0.4,
            damageMult: 1.6,
            xp: 90,
            gold: 1000,
            goldChance: 0.01,
            behavior: 'patrol',
            minDungeon: 3,
            maxDungeon: 999,
            attackRange: 1.8,
            attackCooldown: 40
        },
        {
            name: 'wizard',
            texture: createWizardTexture,
            scale: [2.5, 4],
            speed: 0.028,
            healthMult: 5.0,
            damageMult: 3.4,
            xp: 150,
            gold: 90,
            goldChance: 0.75,
            behavior: 'guard',
            minDungeon: 4,
            maxDungeon: 999,
            attackRange: 2.0,
            attackCooldown: 70
        }
    );

    // ===================== SPAWN LOGIC ==========================
    function getAvailableTypes() {
        const dl = gameState.dungeonLevel || 1;
        return ENEMY_TYPES.filter(t => dl >= t.minDungeon && dl <= t.maxDungeon);
    }

    function spawnEnemy() {
        if (gameState.enemies.length >= CONFIG.enemyMaxCount) return;
        if (gameState.isGameOver) return;

        const available = getAvailableTypes();
        if (available.length === 0) return;

        const type = available[Math.floor(Math.random() * available.length)];

        const angle = Math.random() * Math.PI * 2;
        const dist = CONFIG.enemySpawnRadius * (0.7 + Math.random() * 0.3);
        const x = gameState.player.position.x + Math.cos(angle) * dist;
        const z = gameState.player.position.z + Math.sin(angle) * dist;

        const tex = type.texture();
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(type.scale[0], type.scale[1], 1);
        sprite.position.set(x, type.scale[1] / 2, z);

        // Individual stat variations
        const hVar = 0.7 + Math.random() * 0.6;
        const dVar = 0.75 + Math.random() * 0.5;
        const sVar = 0.8 + Math.random() * 0.4;

        const baseHP = CONFIG.enemyBaseHealth * type.healthMult * (1 + gameState.player.level * 0.2);
        const baseDmg = CONFIG.enemyBaseDamage * type.damageMult * (1 + gameState.player.level * 0.15);

        const enemy = {
            sprite,
            type,
            health: baseHP * hVar,
            maxHealth: baseHP * hVar,
            damage: baseDmg * dVar,
            speed: type.speed * sVar,
            attackCooldown: 0,
            hitFlash: 0,
            // Patrol behavior
            patrolOrigin: new THREE.Vector3(x, 0, z),
            patrolAngle: Math.random() * Math.PI * 2,
            patrolTimer: 0,
            aggroed: false
        };

        scene.add(sprite);
        gameState.enemies.push(enemy);
    }

    let spawnTimer = 0;

    function spawnTick() {
        spawnTimer++;
        if (spawnTimer >= CONFIG.enemySpawnInterval) {
            spawnTimer = 0;
            spawnEnemy();
        }
    }

    // ===================== BEHAVIOR AI ==========================
    function updateEnemy(enemy, index) {
        const p = gameState.player.position;
        const dx = p.x - enemy.sprite.position.x;
        const dz = p.z - enemy.sprite.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const type = enemy.type;

        // Aggro detection
        if (dist < 20) enemy.aggroed = true;
        if (dist > CONFIG.renderDistance) enemy.aggroed = false;

        // Movement by behavior type
        const behavior = type.behavior || 'chase';

        if (behavior === 'chase' || (enemy.aggroed && behavior !== 'guard')) {
            // Move toward player
            if (dist > (type.attackRange || 1.5)) {
                enemy.sprite.position.x += (dx / dist) * enemy.speed;
                enemy.sprite.position.z += (dz / dist) * enemy.speed;
            }
        } else if (behavior === 'patrol' && !enemy.aggroed) {
            // Wander in a circle around spawn point
            enemy.patrolTimer += 0.01;
            enemy.patrolAngle += 0.02;
            const pr = 5;
            const tx = enemy.patrolOrigin.x + Math.cos(enemy.patrolAngle) * pr;
            const tz = enemy.patrolOrigin.z + Math.sin(enemy.patrolAngle) * pr;
            const pdx = tx - enemy.sprite.position.x;
            const pdz = tz - enemy.sprite.position.z;
            const pd = Math.sqrt(pdx * pdx + pdz * pdz);
            if (pd > 0.5) {
                enemy.sprite.position.x += (pdx / pd) * enemy.speed * 0.5;
                enemy.sprite.position.z += (pdz / pd) * enemy.speed * 0.5;
            }
        } else if (behavior === 'guard') {
            // Stay near origin, only attack if player is close
            if (dist < 12 && dist > (type.attackRange || 1.5)) {
                enemy.sprite.position.x += (dx / dist) * enemy.speed;
                enemy.sprite.position.z += (dz / dist) * enemy.speed;
            }
        }

        // Attack
        if (dist < (type.attackRange || 1.5) && enemy.attackCooldown <= 0) {
            takeDamage(enemy.damage);
            enemy.attackCooldown = type.attackCooldown || 60;
        }
        if (enemy.attackCooldown > 0) enemy.attackCooldown--;

        // Hit flash
        if (enemy.hitFlash > 0) {
            enemy.hitFlash--;
            enemy.sprite.material.color.setHex(enemy.hitFlash % 4 < 2 ? 0xffffff : 0xff0000);
        } else {
            enemy.sprite.material.color.setHex(0xffffff);
        }

        // Death
        if (enemy.health <= 0) {
            onEnemyDeath(enemy);
            gameState.enemies.splice(index, 1);
            return;
        }

        // Despawn if too far
        if (dist > CONFIG.renderDistance * 1.5) {
            scene.remove(enemy.sprite);
            gameState.enemies.splice(index, 1);
        }
    }

    function update() {
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            updateEnemy(gameState.enemies[i], i);
        }
    }

    // ===================== PUBLIC API ============================
    return {
        init: () => { /* textures are lazy-created per spawn */ },
        spawnTick,
        update,

        // Expose type registry for encounters/bosses to reference
        ENEMY_TYPES,
        getAvailableTypes,

        // Allow encounters to spawn specific enemy types as guards
        spawnEnemyOfType: (typeName, x, z, healthMult) => {
            const type = ENEMY_TYPES.find(t => t.name === typeName);
            if (!type) return null;

            const tex = type.texture();
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(type.scale[0], type.scale[1], 1);
            sprite.position.set(x, type.scale[1] / 2, z);
            scene.add(sprite);

            const baseHP = CONFIG.enemyBaseHealth * type.healthMult * (1 + gameState.player.level * 0.2) * (healthMult || 1);
            return {
                sprite,
                type,
                health: baseHP,
                maxHealth: baseHP,
                damage: CONFIG.enemyBaseDamage * type.damageMult * (1 + gameState.player.level * 0.15),
                speed: type.speed,
                attackCooldown: 0,
                hitFlash: 0,
                patrolOrigin: new THREE.Vector3(x, 0, z),
                patrolAngle: 0,
                patrolTimer: 0,
                aggroed: false
            };
        }
    };
})();
