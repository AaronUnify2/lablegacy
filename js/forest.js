// ============================================================
// FOREST MODULE
// ============================================================
// Sprites: 4 original trees, dark spruce, mushroom, rock,
//          crystal rock, stump
// ============================================================

const Forest = (() => {
    'use strict';

    let textures = {};

    function initTextures() {
        textures.trees = [
            createTreeTex(0),
            createTreeTex(1),
            createTreeTex(2),
            createTreeTex(3),
            createSpruceTex()
        ];
        textures.rock = createRockTex();
        textures.crystalRock = createCrystalRockTex();
        textures.mushroom = createMushroomTex();
        textures.stump = createStumpTex();
    }

    // ===================== ORIGINAL TREES ========================
    function createTreeTex(type) {
        return createPixelTexture(32, 64, (ctx, w) => {
            const palettes = [
                { trunk: '#5d4037', leaves: ['#2e7d32', '#388e3c', '#43a047'] },
                { trunk: '#4e342e', leaves: ['#1b5e20', '#2e7d32', '#388e3c'] },
                { trunk: '#6d4c41', leaves: ['#558b2f', '#689f38', '#7cb342'] },
                { trunk: '#3e2723', leaves: ['#4a148c', '#6a1b9a', '#7b1fa2'] }
            ];
            const c = palettes[type % palettes.length];

            ctx.fillStyle = c.trunk;
            ctx.fillRect(13, 30, 6, 34);
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(14, 30, 2, 34);

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

    // ===================== DARK SPRUCE ===========================
    // Old-growth forest style — tall, narrow, very dark green
    // Dense triangular silhouette, almost black trunk
    function createSpruceTex() {
        return createPixelTexture(24, 72, (ctx) => {
            // Near-black trunk — thin
            ctx.fillStyle = '#1a120b';
            ctx.fillRect(10, 32, 4, 40);
            ctx.fillStyle = '#241a10';
            ctx.fillRect(11, 34, 2, 36);

            // Dense triangular layers — very dark greens
            const greens = ['#0d3b0d', '#163e16', '#1a4a1a'];
            for (let layer = 0; layer < 6; layer++) {
                const y = 3 + layer * 6;
                const halfW = 3 + layer * 1.5;
                ctx.fillStyle = greens[layer % greens.length];
                ctx.beginPath();
                ctx.moveTo(12, y);
                ctx.lineTo(12 - halfW, y + 8);
                ctx.lineTo(12 + halfW, y + 8);
                ctx.closePath();
                ctx.fill();
            }

            // Sparse highlight needles
            ctx.fillStyle = '#1e5631';
            ctx.fillRect(9, 10, 2, 1);
            ctx.fillRect(13, 18, 2, 1);
            ctx.fillRect(7, 26, 2, 1);
            ctx.fillRect(15, 22, 2, 1);
            ctx.fillRect(10, 34, 1, 1);
        });
    }

    // ===================== ORIGINAL ROCK =========================
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

    // ===================== CRYSTAL ROCK ==========================
    // Dark rock base, 2-3 bright angular shards, simple and clean
    function createCrystalRockTex() {
        return createPixelTexture(16, 20, (ctx) => {
            // Dark rock base
            ctx.fillStyle = '#3d4f5f';
            ctx.beginPath(); ctx.arc(8, 14, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(4, 12, 8, 6);

            // Crystal shard 1 — tall center
            ctx.fillStyle = '#00bcd4';
            ctx.beginPath();
            ctx.moveTo(7, 12); ctx.lineTo(8, 2); ctx.lineTo(10, 12);
            ctx.closePath(); ctx.fill();

            // Shard 2 — shorter right
            ctx.fillStyle = '#26c6da';
            ctx.beginPath();
            ctx.moveTo(11, 13); ctx.lineTo(13, 5); ctx.lineTo(14, 13);
            ctx.closePath(); ctx.fill();

            // Shard 3 — small left
            ctx.fillStyle = '#4dd0e1';
            ctx.beginPath();
            ctx.moveTo(3, 13); ctx.lineTo(5, 8); ctx.lineTo(6, 13);
            ctx.closePath(); ctx.fill();

            // Highlight edges
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(8, 4, 1, 4);
            ctx.fillRect(13, 7, 1, 3);
        });
    }

    // ===================== ORIGINAL MUSHROOM =====================
    function createMushroomTex() {
        return createPixelTexture(16, 24, (ctx) => {
            ctx.fillStyle = '#faf0e6'; ctx.fillRect(6, 12, 4, 12);
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.ellipse(8, 10, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(4, 7, 3, 3); ctx.fillRect(9, 5, 2, 2); ctx.fillRect(10, 10, 2, 2);
        });
    }

    // ===================== STUMP =================================
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

    // ===================== LOOT / TREE CONFIG ====================
    const TREE_LOOT_TABLE = [
        { type: 'gold', chance: 0.6, min: 3, max: 12 },
        { type: 'xp',   chance: 0.4, min: 5, max: 15 },
    ];

    function getTreeHealth() {
        return 20 + (gameState.dungeonLevel || 1) * 5;
    }

    // ===================== DESTRUCTIBLE TREES ====================
    const destructibleTrees = [];

    function registerTree(sprite, chunkKey) {
        destructibleTrees.push({
            sprite, health: getTreeHealth(), maxHealth: getTreeHealth(),
            chunkKey, hitFlash: 0, dead: false
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
            if (tree.health <= 0 && !tree.dead) destroyTree(tree);
        }
    }

    function destroyTree(tree) {
        tree.dead = true;
        const stumpMat = new THREE.SpriteMaterial({ map: textures.stump, transparent: true });
        const stump = new THREE.Sprite(stumpMat);
        stump.scale.set(1.5, 1.5, 1);
        stump.position.set(tree.sprite.position.x, 0.75, tree.sprite.position.z);
        scene.add(stump);

        const startScaleY = tree.sprite.scale.y;
        let t = 0;
        const fall = setInterval(() => {
            t += 0.1;
            tree.sprite.scale.y = startScaleY * (1 - t);
            tree.sprite.position.y = (startScaleY * (1 - t)) / 2;
            if (t >= 1) { clearInterval(fall); scene.remove(tree.sprite); }
        }, 30);

        const pos = tree.sprite.position.clone();
        for (const loot of TREE_LOOT_TABLE) {
            if (Math.random() < loot.chance) {
                const amt = Math.floor(loot.min + Math.random() * (loot.max - loot.min + 1));
                if (loot.type === 'gold') spawnGoldOrb(pos, amt);
                else if (loot.type === 'xp') spawnXPOrb(pos, amt);
            }
        }
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

    // ===================== CHUNK GENERATION ======================
    function generateChunk(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        if (gameState.chunks.has(key)) return;

        const group = new THREE.Group();
        const baseX = chunkX * CONFIG.chunkSize;
        const baseZ = chunkZ * CONFIG.chunkSize;
        const CS = CONFIG.chunkSize;

        // Trees (mix of all 5 types)
        const treeCount = Math.floor(CS * CS * 0.0045);
        for (let i = 0; i < treeCount; i++) {
            const seed = chunkX * 10000 + chunkZ * 100 + i;
            const x = baseX + seededRandom(seed) * CS;
            const z = baseZ + seededRandom(seed + 1) * CS;
            const typeIdx = Math.floor(seededRandom(seed + 2) * textures.trees.length);

            const mat = new THREE.SpriteMaterial({ map: textures.trees[typeIdx], transparent: true });
            const sprite = new THREE.Sprite(mat);

            // Spruce is taller and narrower
            if (typeIdx === 4) {
                sprite.scale.set(3, 9, 1);
                sprite.position.set(x, 4.5, z);
            } else {
                sprite.scale.set(4, 8, 1);
                sprite.position.set(x, 3.5, z);
            }
            group.add(sprite);
            registerTree(sprite, key);
        }

        // Rocks (mix of regular and crystal)
        for (let i = 0; i < 3; i++) {
            const seed = chunkX * 20000 + chunkZ * 200 + i;
            const x = baseX + seededRandom(seed) * CS;
            const z = baseZ + seededRandom(seed + 1) * CS;
            const isCrystal = seededRandom(seed + 2) < 0.2; // 20% crystal
            const tex = isCrystal ? textures.crystalRock : textures.rock;
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            const sprite = new THREE.Sprite(mat);
            if (isCrystal) {
                sprite.scale.set(1.8, 2.2, 1);
                sprite.position.set(x, 0.8, z);
            } else {
                sprite.scale.set(1.5, 1.5, 1);
                sprite.position.set(x, 0.3, z);
            }
            group.add(sprite);
        }

        // Mushrooms
        for (let i = 0; i < 2; i++) {
            const seed = chunkX * 30000 + chunkZ * 300 + i;
            const x = baseX + seededRandom(seed) * CS;
            const z = baseZ + seededRandom(seed + 1) * CS;
            const mat = new THREE.SpriteMaterial({ map: textures.mushroom, transparent: true });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(1, 1.5, 1);
            sprite.position.set(x, 0.5, z);
            group.add(sprite);
        }

        scene.add(group);
        gameState.chunks.set(key, group);
    }

    // ===================== CHUNK MANAGEMENT ======================
    function updateChunks() {
        const px = Math.floor(gameState.player.position.x / CONFIG.chunkSize);
        const pz = Math.floor(gameState.player.position.z / CONFIG.chunkSize);
        const viewDist = Math.ceil(CONFIG.renderDistance / CONFIG.chunkSize);

        for (let x = -viewDist; x <= viewDist; x++) {
            for (let z = -viewDist; z <= viewDist; z++) {
                generateChunk(px + x, pz + z);
            }
        }

        for (const [key, chunk] of gameState.chunks) {
            const [cx, cz] = key.split(',').map(Number);
            if (Math.abs(cx - px) > viewDist + 1 || Math.abs(cz - pz) > viewDist + 1) {
                scene.remove(chunk);
                gameState.chunks.delete(key);
                for (let i = destructibleTrees.length - 1; i >= 0; i--) {
                    if (destructibleTrees[i].chunkKey === key) destructibleTrees.splice(i, 1);
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
        getDestructibleTrees: () => destructibleTrees,
        TREE_LOOT_TABLE
    };
})();
