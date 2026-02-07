// ============================================================
// BOSSES MODULE
// ============================================================
// HOW TO ADD A NEW BOSS:
//   1. Write a texture function
//   2. Push to BOSS_TYPES array
//   3. If unique behavior, add case in updateBoss()
// ============================================================

const Bosses = (() => {
    'use strict';

    const BOSS_TYPES = [];
    let texCache = {};

    // ===================== TEXTURES =============================
    function createDragonTex() {
        return createPixelTexture(96, 80, (ctx) => {
            ctx.fillStyle = '#8b0000';
            ctx.beginPath(); ctx.ellipse(48, 50, 30, 20, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#a52a2a';
            for (let i = 0; i < 5; i++) ctx.fillRect(30 + i * 8, 45, 6, 10);
            ctx.fillStyle = '#8b0000'; ctx.fillRect(55, 30, 15, 25);
            ctx.fillStyle = '#a52a2a'; ctx.fillRect(50, 15, 30, 22); ctx.fillRect(70, 20, 15, 12);
            ctx.fillStyle = '#2c2c2c'; ctx.fillRect(52, 8, 6, 12); ctx.fillRect(68, 8, 6, 12);
            ctx.fillStyle = '#ffff00'; ctx.fillRect(72, 22, 8, 6);
            ctx.fillStyle = '#000'; ctx.fillRect(76, 24, 3, 3);
            ctx.fillStyle = '#6b0000';
            ctx.beginPath(); ctx.moveTo(35,35); ctx.lineTo(5,15); ctx.lineTo(10,35); ctx.lineTo(5,50); ctx.lineTo(35,50); ctx.fill();
            ctx.fillStyle = '#8b0000'; ctx.fillRect(10,50,25,10);
            ctx.fillStyle = '#6b0000'; ctx.fillRect(35,65,10,15); ctx.fillRect(55,65,10,15);
            ctx.fillStyle = '#d4a574';
            ctx.beginPath(); ctx.ellipse(48,55,18,12,0,0,Math.PI); ctx.fill();
        });
    }

    function createTrollTex() {
        return createPixelTexture(64, 96, (ctx) => {
            ctx.fillStyle = '#556b2f'; ctx.fillRect(12,35,40,45);
            ctx.fillStyle = '#6b8e23'; ctx.fillRect(14,8,36,32);
            ctx.fillStyle = '#556b2f'; ctx.fillRect(14,14,36,8);
            ctx.fillStyle = '#ff0000'; ctx.fillRect(18,18,10,8); ctx.fillRect(36,18,10,8);
            ctx.fillStyle = '#000'; ctx.fillRect(22,20,4,4); ctx.fillRect(40,20,4,4);
            ctx.fillStyle = '#fffff0'; ctx.fillRect(22,30,5,8); ctx.fillRect(37,30,5,8);
            ctx.fillStyle = '#6b8e23'; ctx.fillRect(0,38,14,35); ctx.fillRect(50,38,14,35);
            ctx.fillStyle = '#556b2f'; ctx.fillRect(14,78,14,18); ctx.fillRect(36,78,14,18);
            ctx.fillStyle = '#8b4513'; ctx.fillRect(14,75,36,10);
        });
    }

    function createEvilTreeTex() {
        return createPixelTexture(80, 112, (ctx) => {
            ctx.fillStyle = '#2c1810'; ctx.fillRect(28,50,24,62);
            ctx.fillStyle = '#1a0f0a'; ctx.fillRect(30,55,4,50); ctx.fillRect(38,52,3,55);
            ctx.fillStyle = '#2c1810'; ctx.fillRect(18,100,15,12); ctx.fillRect(47,100,15,12);
            ctx.fillStyle = '#1a0f0a'; ctx.fillRect(30,55,20,30);
            ctx.fillStyle = '#ff0000'; ctx.fillRect(32,60,7,7); ctx.fillRect(42,60,7,7);
            ctx.fillStyle = '#ffff00'; ctx.fillRect(34,62,3,3); ctx.fillRect(44,62,3,3);
            ctx.fillStyle = '#0a0505'; ctx.fillRect(33,74,14,8);
            ctx.fillStyle = '#2c1810'; ctx.fillRect(8,45,22,10); ctx.fillRect(50,45,22,10);
            ctx.fillStyle = '#1a3d1a';
            ctx.beginPath(); ctx.moveTo(40,0); ctx.lineTo(20,30); ctx.lineTo(15,50);
            ctx.lineTo(65,50); ctx.lineTo(60,30); ctx.closePath(); ctx.fill();
        });
    }

    function initTextures() {
        texCache.fireball = createPixelTexture(32, 32, (ctx) => {
            ctx.fillStyle = '#ff4500'; ctx.beginPath(); ctx.arc(16,16,15,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(16,16,8,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(16,16,3,0,Math.PI*2); ctx.fill();
        });
        texCache.treeMagic = createPixelTexture(24, 24, (ctx) => {
            ctx.fillStyle = '#9b59b6'; ctx.beginPath(); ctx.arc(12,12,11,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = '#bb8fce'; ctx.beginPath(); ctx.arc(12,12,5,0,Math.PI*2); ctx.fill();
        });
        texCache.trollClub = createPixelTexture(20, 48, (ctx) => {
            ctx.fillStyle = '#8b4513'; ctx.fillRect(8,20,6,28);
            ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.ellipse(10,12,10,12,0,0,Math.PI*2); ctx.fill();
        });
    }

    // ===================== TYPE DEFINITIONS =====================
    BOSS_TYPES.push(
        { name:'dragon', displayName:'🐉 DRAGON', texture:createDragonTex, scale:[12,10], speed:0.08,
          behavior:'chase_shoot', attackCooldown:100, xpMultiplier:0.8, goldDrop:360,
          minDungeon:1, maxDungeon:999, projectileKey:'fireball' },
        { name:'troll', displayName:'👹 TROLL', texture:createTrollTex, scale:[8,12], speed:0.035,
          behavior:'chase_club', clubDamageMult:2, xpMultiplier:0.8, goldDrop:80,
          minDungeon:1, maxDungeon:999 },
        { name:'evilTree', displayName:'🌳 EVIL TREE', texture:createEvilTreeTex, scale:[10,14], speed:0,
          behavior:'stationary_magic', attackCooldown:90, boomCooldown:400, xpMultiplier:0.8, goldDrop:220,
          minDungeon:2, maxDungeon:999, projectileKey:'treeMagic' }
    );

    // ===================== SCALING ==============================
    function bossHP() { return CONFIG.projectileDamage * (1 + gameState.player.level * 0.4) * 80; }
    function bossDmg() { return CONFIG.enemyBaseDamage * (2 + gameState.player.level * 0.3); }

    // ===================== SPAWN ================================
    function canSpawn() {
        return gameState.bosses.length === 0 && !gameState.encounters.current && gameState.player.level >= 5;
    }

    function doSpawn(type) {
        if (!texCache.fireball) initTextures();
        const a = Math.random() * Math.PI * 2;
        const d = CONFIG.enemySpawnRadius * 1.2;
        const x = gameState.player.position.x + Math.cos(a) * d;
        const z = gameState.player.position.z + Math.sin(a) * d;

        const mat = new THREE.SpriteMaterial({ map: type.texture(), transparent: true });
        const spr = new THREE.Sprite(mat);
        spr.scale.set(type.scale[0], type.scale[1], 1);
        spr.position.set(x, type.scale[1]/2, z);

        const hp = bossHP();
        const boss = {
            sprite:spr, type, displayName:type.displayName,
            health:hp, maxHealth:hp, damage:bossDmg(), goldDrop:type.goldDrop,
            attackTimer:0, boomTimer:type.boomCooldown||0,
            hitFlash:0, projectiles:[], club:null, clubAngle:0
        };

        if (type.behavior === 'chase_club') {
            const cm = new THREE.SpriteMaterial({ map: texCache.trollClub, transparent: true });
            const cs = new THREE.Sprite(cm);
            cs.scale.set(2.5, 6, 1);
            scene.add(cs);
            boss.club = cs;
        }

        scene.add(spr);
        gameState.bosses.push(boss);
        gameState.bossActive = true;
        gameState.targetCameraZoom = 1.8;
    }

    function spawnRandom() {
        const dl = gameState.dungeonLevel || 1;
        const a = BOSS_TYPES.filter(t => dl >= t.minDungeon && dl <= t.maxDungeon);
        if (a.length > 0) doSpawn(a[Math.floor(Math.random() * a.length)]);
    }

    function spawnByName(name) {
        const t = BOSS_TYPES.find(b => b.name === name);
        t ? doSpawn(t) : spawnRandom();
    }

    // ===================== UPDATE ===============================
    function update() {
        for (let i = gameState.bosses.length - 1; i >= 0; i--) {
            tick(gameState.bosses[i], i);
        }
    }

    function tick(boss, idx) {
        const t = boss.type;
        const px = gameState.player.position.x, pz = gameState.player.position.z;
        const dx = px - boss.sprite.position.x, dz = pz - boss.sprite.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);

        // Move
        if (t.speed > 0 && dist > 3) {
            boss.sprite.position.x += (dx/dist) * t.speed;
            boss.sprite.position.z += (dz/dist) * t.speed;
        }

        // Behavior
        if (t.behavior === 'chase_shoot') {
            boss.attackTimer++;
            if (boss.attackTimer >= t.attackCooldown) {
                shootProj(boss, dx, dz, dist);
                boss.attackTimer = 0;
            }
        } else if (t.behavior === 'chase_club') {
            boss.clubAngle += 0.05;
            const r = 5;
            const cx = boss.sprite.position.x + Math.cos(boss.clubAngle)*r;
            const cz = boss.sprite.position.z + Math.sin(boss.clubAngle)*r;
            if (boss.club) { boss.club.position.set(cx, 3, cz); boss.club.material.rotation = -boss.clubAngle; }
            if (Math.sqrt((px-cx)**2 + (pz-cz)**2) < 2.5) takeDamage(boss.damage * (t.clubDamageMult||1));
        } else if (t.behavior === 'stationary_magic') {
            boss.attackTimer++; boss.boomTimer++;
            if (boss.attackTimer >= t.attackCooldown && dist < 30) { shootProj(boss, dx, dz, dist); boss.attackTimer = 0; }
            if (boss.boomTimer >= (t.boomCooldown||400)) { fireBoom(boss); boss.boomTimer = 0; }
        }

        if (dist < 4 && t.speed > 0) takeDamage(boss.damage * 0.3);

        // Flash
        if (boss.hitFlash > 0) {
            boss.hitFlash--;
            boss.sprite.material.color.setHex(boss.hitFlash%4<2 ? 0xffffff : 0xff0000);
        } else boss.sprite.material.color.setHex(0xffffff);

        tickProjs(boss);

        // Death
        if (boss.health <= 0) {
            onBossDefeated(boss);
            gameState.bosses.splice(idx, 1);
            if (!gameState.bosses.length) { gameState.bossActive = false; gameState.targetCameraZoom = 1; }
            return;
        }
        // Despawn
        if (dist > CONFIG.renderDistance * 2.5) {
            scene.remove(boss.sprite);
            if (boss.club) scene.remove(boss.club);
            boss.projectiles.forEach(p => scene.remove(p.sprite));
            gameState.bosses.splice(idx, 1);
            if (!gameState.bosses.length) { gameState.bossActive = false; gameState.targetCameraZoom = 1; }
        }
    }

    function shootProj(boss, dx, dz, dist) {
        const key = boss.type.projectileKey || 'fireball';
        const mat = new THREE.SpriteMaterial({ map:texCache[key]||texCache.fireball, transparent:true, blending:THREE.AdditiveBlending });
        const s = new THREE.Sprite(mat); s.scale.set(2.5,2.5,1);
        s.position.copy(boss.sprite.position); s.position.y = 2;
        scene.add(s);
        boss.projectiles.push({ sprite:s, direction:new THREE.Vector3(dx/dist,0,dz/dist), speed:0.2, damage:boss.damage, life:300 });
    }

    function fireBoom(boss) {
        const tex = texCache.treeMagic || texCache.fireball;
        for (let i = 0; i < 8; i++) {
            const a = (i/8)*Math.PI*2;
            const mat = new THREE.SpriteMaterial({ map:tex, transparent:true, blending:THREE.AdditiveBlending });
            const s = new THREE.Sprite(mat); s.scale.set(3,3,1);
            s.position.copy(boss.sprite.position); s.position.y = 4;
            scene.add(s);
            boss.projectiles.push({ sprite:s, direction:new THREE.Vector3(Math.cos(a),0,Math.sin(a)), speed:0.25, damage:boss.damage*1.5, life:200 });
        }
    }

    function tickProjs(boss) {
        const px = gameState.player.position.x, pz = gameState.player.position.z;
        for (let i = boss.projectiles.length-1; i >= 0; i--) {
            const p = boss.projectiles[i];
            p.sprite.position.x += p.direction.x * p.speed;
            p.sprite.position.z += p.direction.z * p.speed;
            p.life--; p.sprite.material.rotation += 0.1;
            if ((px-p.sprite.position.x)**2 + (pz-p.sprite.position.z)**2 < 4) {
                takeDamage(p.damage); scene.remove(p.sprite); boss.projectiles.splice(i,1); continue;
            }
            if (p.life <= 0) { scene.remove(p.sprite); boss.projectiles.splice(i,1); }
        }
    }

    function update() {
        for (let i = gameState.bosses.length - 1; i >= 0; i--) {
            updateBoss(gameState.bosses[i], i);
        }
    }

    return {
        init: initTextures,
        update,
        spawnRandom,
        spawnByName,
        canSpawn,
        BOSS_TYPES,
        getBossHealth,
        getBossDamage
    };
})();
