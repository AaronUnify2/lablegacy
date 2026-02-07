// ============================================================
// FOREST MODULE
// ============================================================
// Owns: Procedural chunk generation, tree/rock/mushroom textures,
// destructible tree system with loot drops, chunk lifecycle.
//
// INTERFACE (used by index.html):
//   Forest.init()           - Initialize textures
//   Forest.updateChunks()   - Generate/remove chunks around player
//   Forest.updateTrees()    - Tick destructible trees (animations)
//   Forest.meleeHitTrees(pos, fwd, range, damage) - Melee hits trees
//
// DEPENDS ON (from index.html):
//   createPixelTexture, scene, gameState, CONFIG, spawnGoldOrb,
//   spawnXPOrb, THREE
// ============================================================

const Forest = (() => {
    'use strict';

    // ===================== TEXTURES =============================
    let textures = {};

    function initTextures() {
        textures.trees = [
            createTreeTex(0),
            createTreeTex(1),
            createTreeTex(2),
            createTreeTex(3)
        ];
        textures.rock = createRockTex();
        textures.mushroom = createMushroomTex();
        textures.stump = createStumpTex();
    }

    function createTreeTex(type) {
        return createPixelTexture(32, 64, (ctx, w, h) => {
            const palettes = [
                { trunk: '#5d4037', leaves: ['#2e7d32', '#388e3c', '#43a047'] },
                { trunk: '#4e342e', leaves: ['#1b5e20', '#2e7d32', '#388e3c'] },
                { trunk: '#6d4c41', leaves: ['#558b2f', '#689f38', '#7cb342'] },
                { trunk: '#3e2723', leaves: ['#4a148c', '#6a1b9a', '#7b1fa2'] }
            ];
            const c = palettes[type % palettes.length];

            // Trunk
            ctx.fillStyle = c.trunk;
            ctx.fillRect(13, 30, 6, 34);
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(14, 30, 2, 34);

            // Leaf layers
            const layers = [
                { y: 5, w: 24, h: 14 },
                { y: 15, w: 28, h: 12 },
                { y: 24, w: 22, h: 10 }
            ];
            layers.forEach((l, i) => {
                ctx.fillStyle = c.leaves[i % c.leaves.length];
                ctx.fillRect((w - l.w) / 2, l.y, l.w, l.h);
                ctx.fillStyle = c.leaves[(i + 1) % c.leaves.length];
                for (let j = 0; j < 6; j++) {
                    ctx.fillRect(
                        Math.floor((w - l.w) / 2 + Math.random() * l.w),
                        Math.floor(l.y + Math.random() * l.h), 2, 2
                    );
                }
            });
            ctx.fillStyle = c.leaves[0];
            ctx.fillRect(12, 0, 8, 6);
        });
    }

    function createRockTex() {
        return createPixelTexture(16, 16, (ctx) => {
            ctx.fillStyle = '#5d6d7e';
            ctx.beginPath(); ctx.arc(8, 10, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#85929e';
            ctx.fillRect(4, 6, 4, 3); ctx.fillRect(9, 8, 3, 2);
            ctx.fillStyle = '#34495e';
            ctx.fillRect(6, 11, 5, 3);
        });
    }

    function createMushroomTex() {
        return createPixelTexture(16, 24, (ctx) => {
            ctx.fillStyle = '#faf0e6'; ctx.fillRect(6, 12, 4, 12);
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.ellipse(8, 10, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(4, 7, 3, 3); ctx.fillRect(9, 5, 2, 2); ctx.fillRect(10, 10, 2, 2);
        });
    }

    function createStumpTex() {
        return createPixelTexture(16, 16, (ctx) => {
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(3, 6, 10, 10);
            ctx.fillStyle = '#8d6e63';
            ctx.beginPath(); ctx.ellipse(8, 6, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#4e342e';
            ctx.beginPath(); ctx.ellipse(8, 6, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        });
    }

    // ===================== LOOT TABLES ==========================
    // Each entry: { item, chance, amountMin, amountMax }
    // Add new loot by adding entries here — no other code changes needed.
    const TREE_LOOT_TABLE = [
        { type: 'gold', chance: 0.6, min: 3, max: 12 },
        { type: 'xp',   chance: 0.4, min: 5, max: 15 },
        // Future: { type: 'wood', chance: 1.0, min: 1, max: 3 },
        // Future: { type: 'rare_seed', chance: 0.02, min: 1, max: 1 },
    ];

    // ===================== TREE HEALTH CONFIG ====================
    // Keyed by dungeon level bracket. Trees get tougher as you go deeper.
    // To add a new bracket, just add another entry.
    function getTreeHealth() {
        const dl = gameState.dungeonLevel || 1;
        return 20 + dl * 5;
    }

    // ===================== DESTRUCTIBLE TREES ====================
    // Stored per-chunk. Each has: { sprite, health, maxHealth, chunkKey, hitFlash }
    const destructibleTrees = [];

    function registerTree(sprite, chunkKey) {
        destructibleTrees.push({
            sprite,
            health: getTreeHealth(),
            maxHealth: getTreeHealth(),
            chunkKey,
            hitFlash: 0,
            dead: false
        });
    }

    function meleeHitTrees(playerPos, forward, range, damage) {
        for (const tree of destructibleTrees) {
            if (tree.dead) continue;
            const dx = tree.sprite.position.x - playerPos.x;
            const dz = tree.sprite.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > range + 1) continue;

            const dot = (dx * forward.x + dz * forward.z) / (dist || 1);
            if (dot < 0.3) continue;

            tree.health -= damage;
            tree.hitFlash = 8;

            if (tree.health <= 0 && !tree.dead) {
                destroyTree(tree);
            }
        }
    }

    function destroyTree(tree) {
        tree.dead = true;

        // Replace with stump
        const stumpMat = new THREE.SpriteMaterial({ map: textures.stump, transparent: true });
        const stump = new THREE.Sprite(stumpMat);
        stump.scale.set(1.5, 1.5, 1);
        stump.position.set(tree.sprite.position.x, 0.75, tree.sprite.position.z);
        scene.add(stump);

        // Quick fall animation: shrink Y
        const startScaleY = tree.sprite.scale.y;
        let t = 0;
        const fallInterval = setInterval(() => {
            t += 0.1;
            tree.sprite.scale.y = startScaleY * (1 - t);
            tree.sprite.position.y = (startScaleY * (1 - t)) / 2;
            if (t >= 1) {
                clearInterval(fallInterval);
                scene.remove(tree.sprite);
            }
        }, 30);

        // Drop loot
        const pos = tree.sprite.position.clone();
        for (const loot of TREE_LOOT_TABLE) {
            if (Math.random() < loot.chance) {
                const amt = Math.floor(loot.min + Math.random() * (loot.max - loot.min + 1));
                if (loot.type === 'gold') spawnGoldOrb(pos, amt);
                else if (loot.type === 'xp') spawnXPOrb(pos, amt);
                // Future loot types: dispatch to an inventory system
            }
        }

        // Auto-remove stump after 30s
        setTimeout(() => scene.remove(stump), 30000);
    }

    function updateTrees() {
        for (const tree of destructibleTrees) {
            if (tree.dead) continue;
            if (tree.hitFlash > 0) {
                tree.hitFlash--;
                tree.sprite.material.color.setHex(tree.hitFlash % 4 < 2 ? 0xffffff : 0xff4444);
            } else {
                tree.sprite.material.color.setHex(0xffffff);
            }
        }
    }

    // ===================== SEEDED RANDOM ========================
    function seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // ===================== CHUNK SYSTEM =========================
    function generateChunk(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        if (gameState.chunks.has(key)) return;

        const group = new THREE.Group();
        group.userData = { chunkX, chunkZ };

        const baseX = chunkX * CONFIG.chunkSize;
        const baseZ = chunkZ * CONFIG.chunkSize;
        const density = 0.0045;

        // Trees
        const treeCount = Math.floor(CONFIG.chunkSize * CONFIG.chunkSize * density);
        for (let i = 0; i < treeCount; i++) {
            const seed = chunkX * 10000 + chunkZ * 100 + i;
            const rx = seededRandom(seed);
            const rz = seededRandom(seed + 1);
            const rt = seededRandom(seed + 2);

            const x = baseX + rx * CONFIG.chunkSize;
            const z = baseZ + rz * CONFIG.chunkSize;
            const treeType = Math.floor(rt * textures.trees.length);

            const mat = new THREE.SpriteMaterial({ map: textures.trees[treeType], transparent: true });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(4, 8, 1);
            sprite.position.set(x, 3.5, z);
            group.add(sprite);

            // Register as destructible
            registerTree(sprite, key);
        }

        // Rocks
        for (let i = 0; i < 3; i++) {
            const seed = chunkX * 20000 + chunkZ * 200 + i;
            const x = baseX + seededRandom(seed) * CONFIG.chunkSize;
            const z = baseZ + seededRandom(seed + 1) * CONFIG.chunkSize;
            const mat = new THREE.SpriteMaterial({ map: textures.rock, transparent: true });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(1.5, 1.5, 1);
            sprite.position.set(x, 0.3, z);
            group.add(sprite);
        }

        // Mushrooms
        for (let i = 0; i < 2; i++) {
            const seed = chunkX * 30000 + chunkZ * 300 + i;
            const x = baseX + seededRandom(seed) * CONFIG.chunkSize;
            const z = baseZ + seededRandom(seed + 1) * CONFIG.chunkSize;
            const mat = new THREE.SpriteMaterial({ map: textures.mushroom, transparent: true });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(1, 1.5, 1);
            sprite.position.set(x, 0.5, z);
            group.add(sprite);
        }

        scene.add(group);
        gameState.chunks.set(key, group);
    }

    function updateChunks() {
        const px = Math.floor(gameState.player.position.x / CONFIG.chunkSize);
        const pz = Math.floor(gameState.player.position.z / CONFIG.chunkSize);
        const viewDist = Math.ceil(CONFIG.renderDistance / CONFIG.chunkSize);

        // Generate nearby
        for (let x = -viewDist; x <= viewDist; x++) {
            for (let z = -viewDist; z <= viewDist; z++) {
                generateChunk(px + x, pz + z);
            }
        }

        // Remove far
        for (const [key, chunk] of gameState.chunks) {
            const [cx, cz] = key.split(',').map(Number);
            if (Math.abs(cx - px) > viewDist + 1 || Math.abs(cz - pz) > viewDist + 1) {
                scene.remove(chunk);
                gameState.chunks.delete(key);
                // Remove associated destructible trees
                for (let i = destructibleTrees.length - 1; i >= 0; i--) {
                    if (destructibleTrees[i].chunkKey === key) {
                        destructibleTrees.splice(i, 1);
                    }
                }
            }
        }
    }

    // ===================== PUBLIC API ============================
    return {
        init: initTextures,
        updateChunks,
        updateTrees,
        meleeHitTrees,

        // Expose for encounters/town that may want forest data
        getDestructibleTrees: () => destructibleTrees,
        TREE_LOOT_TABLE
    };
})();
