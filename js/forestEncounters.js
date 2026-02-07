// ============================================================
// FOREST ENCOUNTERS MODULE
// ============================================================
// Owns: Story sequence, encounter templates, compass, guard AI,
// NPC spawning, treasure chests, reward distribution.
//
// INTERFACE:
//   ForestEncounters.init()           - Initialize textures
//   ForestEncounters.update()         - Tick each frame
//   ForestEncounters.onEnemyKilled()  - Hook: any enemy dies
//   ForestEncounters.onBossDefeated() - Hook: boss dies
//
// HOW TO ADD A NEW ENCOUNTER:
//   1. Add texture function + register in initTextures
//   2. Add entry to ENCOUNTER_TEMPLATES
//   3. Add key to STORY_SEQUENCE at desired position
//   4. Done — story system handles spawning/ordering
//
// Guards can reference Enemies.ENEMY_TYPES by name (customTexture:false)
// or use encounter-specific textures (customTexture:true).
// Boss encounters use Bosses.spawnByName().
// ============================================================

const ForestEncounters = (() => {
    'use strict';

    let textures = {};

    function initTextures() {
        textures = {
            princessTower: createPrincessTowerTex(),
            swordInStone: createSwordInStoneTex(),
            emptyStone: createEmptyStoneTex(),
            witchHut: createWitchHutTex(),
            princess: createPrincessTex(),
            witch: createWitchTex(),
            goldenSkeleton: createGoldenSkeletonTex(),
            heart: createHeartTex(),
            treasureChest: createTreasureChestTex(),
            openChest: createOpenChestTex()
        };
    }

    // ===================== TEXTURES =============================
    function createPrincessTowerTex() {
        return createPixelTexture(64, 128, (ctx, w) => {
            ctx.fillStyle = '#5d6d7e'; ctx.fillRect(12, 40, 40, 88);
            ctx.fillStyle = '#4a5568';
            for (let y = 0; y < 11; y++) for (let x = 0; x < 5; x++)
                ctx.fillRect(12 + x * 8 + (y % 2 ? 4 : 0), 40 + y * 8, 7, 7);
            ctx.fillStyle = '#5d6d7e'; ctx.fillRect(8, 32, 48, 12);
            for (let i = 0; i < 6; i++) ctx.fillRect(8 + i * 8, 24, 6, 10);
            ctx.fillStyle = '#85c1e9'; ctx.fillRect(26, 52, 12, 20);
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(31, 52, 2, 20); ctx.fillRect(26, 60, 12, 2);
            ctx.fillStyle = '#fad7a0'; ctx.fillRect(28, 56, 8, 8);
            ctx.fillStyle = '#f4d03f'; ctx.fillRect(27, 53, 10, 5);
            ctx.fillStyle = '#3498db'; ctx.fillRect(29, 58, 2, 2); ctx.fillRect(33, 58, 2, 2);
            ctx.fillStyle = '#8b4513'; ctx.fillRect(24, 100, 16, 28); ctx.fillRect(30, 0, 4, 28);
            ctx.fillStyle = '#e91e63'; ctx.fillRect(34, 2, 20, 14);
        });
    }
    function createPrincessTex() {
        return createPixelTexture(32, 48, (ctx) => {
            ctx.fillStyle = '#e91e63'; ctx.fillRect(8, 20, 16, 24); ctx.fillRect(4, 40, 24, 8);
            ctx.fillStyle = '#fad7a0'; ctx.fillRect(10, 8, 12, 14);
            ctx.fillStyle = '#f4d03f'; ctx.fillRect(8, 4, 16, 8); ctx.fillRect(6, 8, 4, 16); ctx.fillRect(22, 8, 4, 16);
            ctx.fillStyle = '#ffd700'; ctx.fillRect(10, 2, 12, 4); ctx.fillRect(15, -1, 2, 4);
            ctx.fillStyle = '#3498db'; ctx.fillRect(12, 12, 3, 3); ctx.fillRect(17, 12, 3, 3);
            ctx.fillStyle = '#c2185b'; ctx.fillRect(14, 18, 4, 2);
            ctx.fillStyle = '#fad7a0'; ctx.fillRect(4, 22, 4, 10); ctx.fillRect(24, 22, 4, 10);
        });
    }
    function createGoldenSkeletonTex() {
        return createPixelTexture(32, 48, (ctx) => {
            ctx.fillStyle = '#ffd700'; ctx.fillRect(10, 2, 12, 14); ctx.fillRect(8, 6, 16, 8);
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(11, 7, 4, 4); ctx.fillRect(17, 7, 4, 4);
            ctx.fillStyle = '#000'; ctx.fillRect(12, 8, 2, 2); ctx.fillRect(18, 8, 2, 2);
            ctx.fillStyle = '#fff'; ctx.fillRect(12, 14, 8, 2);
            ctx.fillStyle = '#ffd700'; ctx.fillRect(14, 16, 4, 20);
            ctx.fillStyle = '#daa520';
            for (let i = 0; i < 4; i++) ctx.fillRect(8, 18 + i * 4, 16, 2);
            ctx.fillRect(4, 18, 4, 14); ctx.fillRect(24, 18, 4, 14);
            ctx.fillRect(10, 36, 4, 12); ctx.fillRect(18, 36, 4, 12);
        });
    }
    function createSwordInStoneTex() {
        return createPixelTexture(48, 64, (ctx) => {
            ctx.fillStyle = '#5d6d7e'; ctx.beginPath(); ctx.ellipse(24, 50, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#6c7a89'; ctx.beginPath(); ctx.ellipse(24, 45, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(22, 40, 4, 20);
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(21, 8, 6, 36);
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(22, 10, 2, 32);
            ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.moveTo(21, 8); ctx.lineTo(27, 8); ctx.lineTo(24, 0); ctx.fill();
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(14, 42, 20, 4);
            ctx.fillStyle = '#8b4513'; ctx.fillRect(21, 46, 6, 10);
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(20, 55, 8, 5);
            ctx.fillStyle = 'rgba(241,196,15,0.3)'; ctx.beginPath(); ctx.arc(24, 30, 15, 0, Math.PI * 2); ctx.fill();
        });
    }
    function createEmptyStoneTex() {
        return createPixelTexture(48, 64, (ctx) => {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.ellipse(8, 58, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(40, 58, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#5d6d7e'; ctx.beginPath(); ctx.ellipse(24, 50, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#6c7a89'; ctx.beginPath(); ctx.ellipse(24, 45, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1a1a2e'; ctx.fillRect(22, 40, 4, 12);
        });
    }
    function createWitchHutTex() {
        return createPixelTexture(80, 96, (ctx) => {
            ctx.fillStyle = '#5d4037'; ctx.fillRect(15, 50, 50, 46);
            ctx.fillStyle = '#2c2c54'; ctx.beginPath(); ctx.moveTo(40, 5); ctx.lineTo(5, 55); ctx.lineTo(75, 55); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#4a3728'; ctx.fillRect(55, 15, 10, 30);
            ctx.fillStyle = 'rgba(150,150,150,0.6)'; ctx.beginPath(); ctx.arc(60, 10, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#3e2723'; ctx.fillRect(32, 65, 16, 31);
            ctx.fillStyle = '#9b59b6'; ctx.fillRect(42, 80, 3, 3); ctx.fillRect(21, 61, 8, 10);
        });
    }
    function createWitchTex() {
        return createPixelTexture(32, 56, (ctx) => {
            ctx.fillStyle = '#2c2c54'; ctx.fillRect(8, 24, 16, 26); ctx.fillRect(4, 46, 24, 10);
            ctx.fillStyle = '#a8e6cf'; ctx.fillRect(10, 14, 12, 12);
            ctx.fillStyle = '#9b59b6'; ctx.fillRect(11, 16, 4, 4); ctx.fillRect(17, 16, 4, 4);
            ctx.fillStyle = '#2c2c54'; ctx.fillRect(6, 10, 20, 6); ctx.fillRect(10, 2, 12, 10); ctx.fillRect(13, -2, 6, 6);
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(14, 9, 4, 4);
            ctx.fillStyle = '#a8e6cf'; ctx.fillRect(4, 26, 4, 12); ctx.fillRect(24, 26, 4, 12);
            ctx.fillStyle = '#8b4513'; ctx.fillRect(26, 20, 3, 36);
        });
    }
    function createHeartTex() {
        return createPixelTexture(24, 24, (ctx) => {
            ctx.fillStyle = '#e91e63';
            ctx.beginPath(); ctx.arc(8, 9, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(16, 9, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(2, 10); ctx.lineTo(12, 22); ctx.lineTo(22, 10); ctx.fill();
        });
    }
    function createTreasureChestTex() {
        return createPixelTexture(32, 28, (ctx) => {
            ctx.fillStyle = '#8b4513'; ctx.fillRect(2, 10, 28, 18);
            ctx.fillStyle = '#a0522d'; ctx.fillRect(2, 4, 28, 8);
            ctx.fillStyle = '#ffd700'; ctx.fillRect(0, 8, 32, 3); ctx.fillRect(0, 20, 32, 3); ctx.fillRect(14, 4, 4, 24);
            ctx.fillRect(13, 10, 6, 8);
            ctx.fillStyle = '#000'; ctx.fillRect(15, 14, 2, 3);
        });
    }
    function createOpenChestTex() {
        return createPixelTexture(32, 32, (ctx) => {
            ctx.fillStyle = '#a0522d'; ctx.fillRect(2, 0, 28, 6); ctx.fillRect(4, 4, 24, 8);
            ctx.fillStyle = '#8b4513'; ctx.fillRect(2, 14, 28, 18);
            ctx.fillStyle = '#3d2314'; ctx.fillRect(4, 14, 24, 8);
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.arc(10, 17, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(16, 16, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(22, 17, 3, 0, Math.PI * 2); ctx.fill();
        });
    }

    // ===================== STORY SEQUENCE ========================
    const STORY_SEQUENCE = [
        'swordInStone',     // 0
        'boss_troll',       // 1
        'princessTower',    // 2
        'boss_evilTree',    // 3
        'boss_dragon',      // 4
        'witchHut',         // 5
        'boss_troll',       // 6
        'swordInStoneAct2', // 7
        'boss_evilTree',    // 8
        'boss_dragon',      // 9
        'princessTower',    // 10
        'boss_troll',       // 11
        'storyComplete'     // 12
    ];

    let storyStage = 0;
    let killsSinceLastEncounter = 0;
    const KILLS_PER_ENCOUNTER = 15;

    function getCurrentStoryEvent() {
        return storyStage < STORY_SEQUENCE.length ? STORY_SEQUENCE[storyStage] : null;
    }
    function advanceStory() {
        storyStage++;
        killsSinceLastEncounter = 0;
        console.log('Story stage', storyStage, '→', getCurrentStoryEvent());
    }

    // ===================== ENCOUNTER TEMPLATES ==================
    const ENCOUNTER_TEMPLATES = {
        princessTower: {
            name: 'princessTower', displayName: 'Princess Tower',
            textureKey: 'princessTower', scale: [8, 16],
            guards: { type: 'goldenSkeleton', count: 20, healthMult: 2, customTexture: true },
            cameraZoom: 2.5,
            reward: { type: 'upgrade', upgrade: 'magnetLevel', text: '🧲 MAGNET UPGRADED!' },
            minLevel: 1, spawnWeight: 1,
            npc: { textureKey: 'princess', scale: [2.5, 4], walksToPlayer: true, rewardOnContact: true },
            onComplete: 'spawnNPC',
            spawnDialogue: { speaker: '👸 TOWER', text: 'A tower appears! Golden skeletons guard the princess!' }
        },
        swordInStone: {
            name: 'swordInStone', displayName: 'Sword in Stone',
            textureKey: 'swordInStone', scale: [6, 8],
            guards: { type: 'goblin', count: 15, healthMult: 1, customTexture: false },
            cameraZoom: 2.2,
            reward: { type: 'upgrade', upgrade: 'swordLevel', text: '⚔️ SWORD ADDED!' },
            minLevel: 1, spawnWeight: 0,
            onComplete: 'interactWithStructure', interactionRange: 3,
            spawnDialogue: { speaker: '🗡️ GOBLINS', text: '"Take the sword, become King of Forest!"' },
            completionDialogue: { speaker: '🪨 STONE', text: 'The sword slides out effortlessly. Goblin jaws drop.' }
        },
        swordInStoneAct2: {
            name: 'swordInStoneAct2', displayName: 'The Empty Stone',
            textureKey: 'emptyStone', scale: [6, 8],
            guards: { type: 'goblin', count: 20, healthMult: 1, customTexture: false },
            cameraZoom: 2.2,
            reward: { type: 'gold', amount: 650, text: '💰 +650 GOLD!' },
            minLevel: 1, spawnWeight: 0,
            onComplete: 'interactWithStructure', interactionRange: 3,
            spawnDialogue: { speaker: '🗡️ GOBLINS', text: '"Sword gone! Put shinies around rock!"' },
            completionDialogue: { speaker: '🗡️ GOBLIN', text: '"Maybe that man kill goblin friend?" They scatter.' }
        },
        witchHut: {
            name: 'witchHut', displayName: 'Witch Hut',
            textureKey: 'witchHut', scale: [10, 12],
            guards: { type: 'wizard', count: 15, healthMult: 1, customTexture: false },
            cameraZoom: 2.3,
            reward: { type: 'upgrade', upgrade: 'boomLevel', text: '💥 BOOM UPGRADED!' },
            minLevel: 1, spawnWeight: 1,
            npc: { textureKey: 'witch', scale: [2.5, 4.5], walksToPlayer: true,
                dialogue: { speaker: '🧙‍♀️ WITCH', text: '"I summoned dogmatic buddhists instead of a handsome wizard!"' },
                rewardOnContact: true },
            onComplete: 'spawnNPC'
        }
    };

    // ===================== TREASURE CHESTS =======================
    let treasureChests = [];
    const FUN_FACTS = [
        "Only a fool laughs at the mighty dragon.",
        "With 8 orbiting swords you could survive standing perfectly still.",
        "Those 'wizards' are actually Dogmatic Buddhists.",
        "Why do monsters carry gold? Underground monster-only shop.",
        "Skeletons = heroes who drank milk. Ghosts = heroes who didn't.",
        "The evil tree is dangerous but at least he makes oxygen.",
        "In a pinch, slimes make a surprisingly effective hat.",
        "A truly dogmatic buddhist would become god of the forest in 90 seconds."
    ];

    // ===================== SPAWN ENCOUNTER ======================
    function trySpawnStoryEncounter() {
        if (gameState.encounters.current || gameState.bosses.length > 0) return;
        if (gameState.player.level < 3 || killsSinceLastEncounter < KILLS_PER_ENCOUNTER) return;

        const event = getCurrentStoryEvent();
        if (!event || event === 'storyComplete') { trySpawnRandom(); return; }

        if (event.startsWith('boss_')) {
            if (Bosses.canSpawn()) Bosses.spawnByName(event.replace('boss_', ''));
            return;
        }
        const template = ENCOUNTER_TEMPLATES[event];
        if (template) spawnEncounter(template);
        else { advanceStory(); }
    }

    function trySpawnRandom() {
        if (killsSinceLastEncounter < KILLS_PER_ENCOUNTER) return;
        const pool = Object.values(ENCOUNTER_TEMPLATES).filter(t => t.spawnWeight > 0 && gameState.player.level >= t.minLevel);
        if (pool.length === 0) return;
        const weighted = []; pool.forEach(t => { for (let i = 0; i < t.spawnWeight; i++) weighted.push(t); });
        spawnEncounter(weighted[Math.floor(Math.random() * weighted.length)]);
    }

    function spawnEncounter(template) {
        const angle = Math.random() * Math.PI * 2;
        const dist = CONFIG.enemySpawnRadius * 1.3;
        const x = gameState.player.position.x + Math.cos(angle) * dist;
        const z = gameState.player.position.z + Math.sin(angle) * dist;

        const tex = textures[template.textureKey];
        if (!tex) { advanceStory(); return; }
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(template.scale[0], template.scale[1], 1);
        sprite.position.set(x, template.scale[1] / 2, z);
        scene.add(sprite);

        // Spawn guards
        const guards = [];
        for (let i = 0; i < template.guards.count; i++) {
            const ga = (i / template.guards.count) * Math.PI * 2;
            const gd = 6 + Math.random() * 4;
            const gx = x + Math.cos(ga) * gd, gz = z + Math.sin(ga) * gd;
            let guard;
            if (template.guards.customTexture) {
                const gTex = textures[template.guards.type]; if (!gTex) continue;
                const gMat = new THREE.SpriteMaterial({ map: gTex, transparent: true });
                const gSprite = new THREE.Sprite(gMat);
                gSprite.scale.set(2.5, 4, 1); gSprite.position.set(gx, 2, gz);
                scene.add(gSprite);
                const hp = CONFIG.enemyBaseHealth * (1 + gameState.player.level * 0.2) * template.guards.healthMult;
                guard = { sprite: gSprite, type: { name: template.guards.type, xp: 30, gold: 40, goldChance: 0.5 },
                    health: hp, maxHealth: hp, damage: CONFIG.enemyBaseDamage * (1 + gameState.player.level * 0.15),
                    speed: 0.06, attackCooldown: 0, hitFlash: 0 };
            } else {
                guard = Enemies.spawnEnemyOfType(template.guards.type, gx, gz, template.guards.healthMult);
                if (!guard) continue;
            }
            guards.push(guard);
        }

        gameState.encounters.current = {
            template, sprite, position: new THREE.Vector3(x, 0, z),
            guardsDefeated: false, npcSpawned: false, npc: null, rewardGiven: false
        };
        gameState.encounters.guards = guards;
        gameState.encounters.compassTarget = new THREE.Vector3(x, 0, z);
        gameState.targetCameraZoom = template.cameraZoom || 1.5;

        if (template.spawnDialogue) showDialogue(template.spawnDialogue.speaker, template.spawnDialogue.text);
        else showDialogue('⚔️ ' + template.displayName, 'Defeat the guards!');
    }

    // ===================== ENCOUNTER UPDATE ======================
    function updateCurrentEncounter() {
        const enc = gameState.encounters.current; if (!enc) return;
        const guards = gameState.encounters.guards;
        const pp = gameState.player.position;

        if (gameState.dialogueTimer <= 0) {
            for (let i = guards.length - 1; i >= 0; i--) {
                const g = guards[i];
                const dx = pp.x - g.sprite.position.x, dz = pp.z - g.sprite.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < 20 && dist > 1.5) { g.sprite.position.x += (dx / dist) * g.speed; g.sprite.position.z += (dz / dist) * g.speed; }
                if (dist < 1.5 && g.attackCooldown <= 0) { takeDamage(g.damage); g.attackCooldown = 60; }
                if (g.attackCooldown > 0) g.attackCooldown--;
                if (g.hitFlash > 0) { g.hitFlash--; g.sprite.material.color.setHex(g.hitFlash % 4 < 2 ? 0xffffff : 0xff0000); }
                else g.sprite.material.color.setHex(0xffffff);
                if (g.health <= 0) { onEnemyDeath(g); guards.splice(i, 1); }
            }
        }

        if (guards.length === 0 && !enc.guardsDefeated) { enc.guardsDefeated = true; onGuardsDefeated(enc); }

        // NPC walk
        if (enc.npc && enc.npc.walksToPlayer) {
            const dx = pp.x - enc.npc.sprite.position.x, dz = pp.z - enc.npc.sprite.position.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d > 2) { enc.npc.sprite.position.x += (dx / d) * 0.05; enc.npc.sprite.position.z += (dz / d) * 0.05; }
            else if (!enc.rewardGiven) giveReward(enc);
        }

        // Structure interaction
        if (enc.guardsDefeated && enc.template.onComplete === 'interactWithStructure' && !enc.rewardGiven) {
            const dx = pp.x - enc.position.x, dz = pp.z - enc.position.z;
            if (Math.sqrt(dx * dx + dz * dz) < (enc.template.interactionRange || 3)) {
                if (enc.template.completionDialogue) showDialogue(enc.template.completionDialogue.speaker, enc.template.completionDialogue.text);
                giveReward(enc);
            }
        }

        if (enc.rewardGiven && gameState.dialogueTimer <= 0) cleanupEncounter();
    }

    function onGuardsDefeated(enc) {
        const t = enc.template;
        if (t.onComplete === 'spawnNPC' && t.npc) {
            const nTex = textures[t.npc.textureKey]; if (!nTex) { giveReward(enc); return; }
            const nMat = new THREE.SpriteMaterial({ map: nTex, transparent: true });
            const nSprite = new THREE.Sprite(nMat);
            nSprite.scale.set(t.npc.scale[0], t.npc.scale[1], 1);
            nSprite.position.set(enc.position.x + (Math.random() - 0.5) * 6, t.npc.scale[1] / 2, enc.position.z + (Math.random() - 0.5) * 6);
            scene.add(nSprite);
            enc.npc = { sprite: nSprite, walksToPlayer: t.npc.walksToPlayer };
            if (t.npc.dialogue) showDialogue(t.npc.dialogue.speaker, t.npc.dialogue.text);
        } else if (t.onComplete === 'interactWithStructure') {
            gameState.encounters.compassTarget = enc.position;
        } else { giveReward(enc); }
    }

    function giveReward(enc) {
        if (enc.rewardGiven) return;
        enc.rewardGiven = true;
        const r = enc.template.reward; if (!r) { advanceStory(); return; }
        if (r.type === 'upgrade' && gameState.player[r.upgrade] !== undefined) gameState.player[r.upgrade]++;
        else if (r.type === 'gold') gameState.player.gold += r.amount || 100;
        showReward(r.text);
        advanceStory();
    }

    function cleanupEncounter() {
        const enc = gameState.encounters.current; if (!enc) return;
        scene.remove(enc.sprite);
        if (enc.npc && enc.npc.sprite) scene.remove(enc.npc.sprite);
        for (const g of gameState.encounters.guards) scene.remove(g.sprite);
        gameState.encounters.current = null;
        gameState.encounters.guards = [];
        gameState.encounters.compassTarget = null;
        gameState.targetCameraZoom = 1;
    }

    // ===================== TREASURE CHESTS =======================
    function updateChests() {
        if (treasureChests.length < 5 && Math.random() < 0.003) {
            const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 20;
            const x = gameState.player.position.x + Math.cos(a) * d, z = gameState.player.position.z + Math.sin(a) * d;
            const mat = new THREE.SpriteMaterial({ map: textures.treasureChest, transparent: true });
            const s = new THREE.Sprite(mat); s.scale.set(2.5, 2, 1); s.position.set(x, 1, z);
            scene.add(s); treasureChests.push({ sprite: s, opened: false });
        }
        for (let i = treasureChests.length - 1; i >= 0; i--) {
            const c = treasureChests[i];
            const dx = gameState.player.position.x - c.sprite.position.x, dz = gameState.player.position.z - c.sprite.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 2.5 && !c.opened) {
                c.opened = true; c.sprite.material.map = textures.openChest; c.sprite.material.needsUpdate = true;
                const gold = 15 + Math.floor(Math.random() * 55);
                spawnGoldOrb(c.sprite.position.clone(), gold);
                showDialogue('📦 TREASURE', `+${gold} Gold!\n\n${FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]}`);
                setTimeout(() => { scene.remove(c.sprite); const idx = treasureChests.indexOf(c); if (idx >= 0) treasureChests.splice(idx, 1); }, 5000);
            }
            if (dist > CONFIG.renderDistance * 2) { scene.remove(c.sprite); treasureChests.splice(i, 1); }
        }
    }

    // ===================== UPDATE ================================
    function update() {
        updateCurrentEncounter();
        updateChests();
        if (!gameState.encounters.current && !gameState.bossActive) trySpawnStoryEncounter();
    }

    // ===================== PUBLIC API ============================
    return {
        init: initTextures,
        update,
        onEnemyKilled: () => { killsSinceLastEncounter++; },
        onBossDefeated: () => { const e = getCurrentStoryEvent(); if (e && e.startsWith('boss_')) advanceStory(); },
        reset: () => { cleanupEncounter(); treasureChests.forEach(c => scene.remove(c.sprite)); treasureChests = []; storyStage = 0; killsSinceLastEncounter = 0; },
        ENCOUNTER_TEMPLATES, STORY_SEQUENCE,
        getStoryStage: () => storyStage,
        spawnEncounterByKey: (key) => { const t = ENCOUNTER_TEMPLATES[key]; if (t) spawnEncounter(t); }
    };
})();
