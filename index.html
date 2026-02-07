// ============================================================
// FOREST MODULE — "Lost Eden" Edition
// ============================================================
// A mystic forest built on the ruins of a hyper-advanced
// civilization that worshipped machine angel gods. Nature has
// reclaimed the ruins, but strange crystals still hum with
// forgotten power and broken god-statues stare from the
// undergrowth.
//
// SPRITE CATALOG:
//   TREES (8):   Oak, Pine, Willow, Birch, DeadTree,
//                BloodyMaple, GiantMushroom, AncientTreeGod
//   SHRUBS (4):  Berry bush, Fern, FlowerPatch, GlowBush
//   RUINS (5):   BrokenPillar, RuneArch, MachineAngelStatue,
//                DataMonolith, ShatteredGear
//   ROCKS (4):   MossRock, CrystalRock, AmethystCluster,
//                AncientCorestone
//   GROUND (3):  Mushroom, SkullPile, Wildflowers
//
// INTERFACE (unchanged):
//   Forest.init()           Forest.updateChunks()
//   Forest.updateTrees()    Forest.meleeHitTrees(...)
// ============================================================

const Forest = (() => {
    'use strict';

    let textures = {};

    // ===================== INIT ==================================
    function initTextures() {
        textures.trees = [
            createOakTex(),
            createPineTex(),
            createWillowTex(),
            createBirchTex(),
            createDeadTreeTex(),
            createBloodyMapleTex(),
            createGiantMushroomTreeTex(),
            createAncientTreeGodTex()
        ];
        textures.shrubs = [
            createBerryBushTex(),
            createFernTex(),
            createFlowerPatchTex(),
            createGlowBushTex()
        ];
        textures.ruins = [
            createBrokenPillarTex(),
            createRuneArchTex(),
            createMachineAngelTex(),
            createDataMonolithTex(),
            createShatteredGearTex()
        ];
        textures.rocks = [
            createMossRockTex(),
            createCrystalRockTex(),
            createAmethystClusterTex(),
            createAncientCorestoneTex()
        ];
        textures.ground = [
            createMushroomTex(),
            createSkullPileTex(),
            createWildflowerTex()
        ];
        textures.stump = createStumpTex();
    }

    // ============================================================
    //  T R E E S
    // ============================================================

    // --- 0: Classic Oak — broad canopy, thick trunk ---
    function createOakTex() {
        return createPixelTexture(48, 64, (ctx) => {
            // Trunk — thick, gnarled
            ctx.fillStyle = '#5d4037'; ctx.fillRect(18, 34, 12, 30);
            ctx.fillStyle = '#4e342e'; ctx.fillRect(20, 36, 4, 28);
            ctx.fillStyle = '#6d4c41'; ctx.fillRect(26, 38, 3, 20);
            // Roots
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(12, 58, 8, 6); ctx.fillRect(28, 58, 8, 6);
            // Canopy — big round layers
            const greens = ['#2e7d32', '#388e3c', '#43a047', '#4caf50'];
            ctx.fillStyle = greens[0]; ctx.beginPath(); ctx.ellipse(24, 24, 22, 18, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = greens[1]; ctx.beginPath(); ctx.ellipse(20, 20, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = greens[2]; ctx.beginPath(); ctx.ellipse(28, 18, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = greens[3]; ctx.beginPath(); ctx.ellipse(24, 14, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
            // Leaf detail
            ctx.fillStyle = '#1b5e20';
            for (let i = 0; i < 12; i++) {
                ctx.fillRect(6 + Math.floor(Math.random() * 36), 8 + Math.floor(Math.random() * 28), 3, 2);
            }
        });
    }

    // --- 1: Pine — tall triangular conifer ---
    function createPineTex() {
        return createPixelTexture(32, 80, (ctx) => {
            ctx.fillStyle = '#4e342e'; ctx.fillRect(13, 45, 6, 35);
            ctx.fillStyle = '#3e2723'; ctx.fillRect(14, 48, 2, 30);
            const pineG = ['#1b5e20', '#2e7d32', '#256029'];
            // Triangular layers
            for (let layer = 0; layer < 5; layer++) {
                const y = 5 + layer * 10;
                const w = 10 + layer * 4;
                ctx.fillStyle = pineG[layer % pineG.length];
                ctx.beginPath();
                ctx.moveTo(16, y); ctx.lineTo(16 - w / 2, y + 14); ctx.lineTo(16 + w / 2, y + 14);
                ctx.closePath(); ctx.fill();
            }
            // Snow tips
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(14, 5, 4, 2); ctx.fillRect(11, 15, 3, 2); ctx.fillRect(18, 25, 3, 2);
        });
    }

    // --- 2: Willow — drooping fronds ---
    function createWillowTex() {
        return createPixelTexture(48, 72, (ctx) => {
            ctx.fillStyle = '#6d4c41'; ctx.fillRect(20, 30, 8, 42);
            ctx.fillStyle = '#5d4037'; ctx.fillRect(22, 32, 3, 38);
            // Canopy base
            ctx.fillStyle = '#558b2f'; ctx.beginPath(); ctx.ellipse(24, 26, 20, 16, 0, 0, Math.PI * 2); ctx.fill();
            // Hanging fronds
            ctx.fillStyle = '#7cb342';
            for (let i = 0; i < 10; i++) {
                const x = 6 + i * 4;
                const h = 20 + Math.floor(Math.random() * 15);
                ctx.fillRect(x, 28, 2, h);
                ctx.fillStyle = i % 2 === 0 ? '#689f38' : '#8bc34a';
            }
            ctx.fillStyle = '#33691e';
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(8 + Math.floor(Math.random() * 32), 30 + Math.floor(Math.random() * 20), 1, 3);
            }
        });
    }

    // --- 3: Birch — white bark with dark spots ---
    function createBirchTex() {
        return createPixelTexture(32, 72, (ctx) => {
            // White trunk
            ctx.fillStyle = '#eceff1'; ctx.fillRect(12, 28, 8, 44);
            ctx.fillStyle = '#cfd8dc'; ctx.fillRect(14, 30, 4, 40);
            // Bark marks
            ctx.fillStyle = '#37474f';
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(12 + Math.floor(Math.random() * 7), 30 + i * 5, 4 + Math.floor(Math.random() * 3), 1);
            }
            // Leaves — golden-green, light airy
            const colors = ['#c0ca33', '#cddc39', '#d4e157', '#aed581'];
            for (let i = 0; i < 20; i++) {
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillRect(4 + Math.floor(Math.random() * 24), 4 + Math.floor(Math.random() * 28), 4, 3);
            }
            ctx.fillStyle = '#9e9d24';
            for (let i = 0; i < 6; i++) {
                ctx.fillRect(6 + Math.floor(Math.random() * 20), 8 + Math.floor(Math.random() * 20), 2, 2);
            }
        });
    }

    // --- 4: Dead Tree — twisted, barren, creepy ---
    function createDeadTreeTex() {
        return createPixelTexture(40, 64, (ctx) => {
            ctx.fillStyle = '#3e2723'; ctx.fillRect(16, 20, 8, 44);
            ctx.fillStyle = '#4e342e'; ctx.fillRect(18, 22, 3, 40);
            // Branches — jagged, bare
            ctx.fillStyle = '#3e2723';
            // Left branch
            ctx.fillRect(8, 22, 10, 3); ctx.fillRect(4, 18, 6, 3); ctx.fillRect(2, 14, 4, 3);
            // Right branch
            ctx.fillRect(22, 18, 10, 3); ctx.fillRect(30, 14, 8, 3); ctx.fillRect(35, 10, 4, 3);
            // Upper
            ctx.fillRect(14, 12, 6, 3); ctx.fillRect(12, 6, 4, 3); ctx.fillRect(22, 8, 5, 3);
            // Knot hole
            ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(20, 35, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
            // Crows
            ctx.fillStyle = '#111';
            ctx.fillRect(5, 12, 3, 2); ctx.fillRect(3, 11, 2, 1); ctx.fillRect(8, 11, 2, 1);
        });
    }

    // --- 5: Bloody Maple — crimson foliage, dark trunk ---
    function createBloodyMapleTex() {
        return createPixelTexture(40, 60, (ctx) => {
            ctx.fillStyle = '#3e2723'; ctx.fillRect(16, 30, 8, 30);
            ctx.fillStyle = '#4e342e'; ctx.fillRect(18, 32, 3, 26);
            // Crimson canopy
            const reds = ['#b71c1c', '#c62828', '#d32f2f', '#e53935', '#ff5252'];
            ctx.fillStyle = reds[0]; ctx.beginPath(); ctx.ellipse(20, 20, 18, 16, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = reds[1]; ctx.beginPath(); ctx.ellipse(18, 16, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = reds[2]; ctx.beginPath(); ctx.ellipse(24, 14, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
            // Falling leaves
            ctx.fillStyle = '#ff8a80';
            for (let i = 0; i < 6; i++) {
                ctx.fillRect(8 + Math.floor(Math.random() * 24), 32 + Math.floor(Math.random() * 20), 2, 2);
            }
            // Dark veins
            ctx.fillStyle = '#880e4f';
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(6 + Math.floor(Math.random() * 28), 8 + Math.floor(Math.random() * 24), 3, 1);
            }
        });
    }

    // --- 6: Giant Mushroom Tree — bioluminescent cap ---
    function createGiantMushroomTreeTex() {
        return createPixelTexture(40, 64, (ctx) => {
            // Pale thick stalk
            ctx.fillStyle = '#d7ccc8'; ctx.fillRect(14, 28, 12, 36);
            ctx.fillStyle = '#bcaaa4'; ctx.fillRect(16, 30, 4, 32);
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(14, 56, 12, 8);
            // Cap — huge, glowing
            ctx.fillStyle = '#4a148c'; ctx.beginPath(); ctx.ellipse(20, 22, 20, 14, 0, 0, Math.PI); ctx.fill();
            ctx.fillStyle = '#6a1b9a'; ctx.beginPath(); ctx.ellipse(20, 22, 18, 12, 0, 0, Math.PI); ctx.fill();
            // Bioluminescent spots
            ctx.fillStyle = '#e1bee7';
            ctx.fillRect(8, 18, 4, 3); ctx.fillRect(18, 14, 3, 3); ctx.fillRect(28, 18, 4, 3);
            ctx.fillStyle = '#ce93d8';
            ctx.fillRect(12, 22, 3, 2); ctx.fillRect(24, 20, 3, 2);
            // Glow
            ctx.fillStyle = 'rgba(186, 104, 200, 0.25)';
            ctx.beginPath(); ctx.ellipse(20, 22, 22, 16, 0, 0, Math.PI * 2); ctx.fill();
            // Spores
            ctx.fillStyle = 'rgba(206, 147, 216, 0.4)';
            for (let i = 0; i < 5; i++) {
                ctx.beginPath(); ctx.arc(8 + Math.random() * 24, 28 + Math.random() * 15, 1.5, 0, Math.PI * 2); ctx.fill();
            }
        });
    }

    // --- 7: Ancient Tree God — petrified tree with machine face ---
    function createAncientTreeGodTex() {
        return createPixelTexture(48, 80, (ctx) => {
            // Massive twisted trunk
            ctx.fillStyle = '#37474f'; ctx.fillRect(14, 20, 20, 60);
            ctx.fillStyle = '#455a64'; ctx.fillRect(16, 22, 8, 56);
            ctx.fillStyle = '#546e7a'; ctx.fillRect(28, 26, 5, 50);
            // Petrified branches
            ctx.fillStyle = '#37474f';
            ctx.fillRect(4, 24, 12, 4); ctx.fillRect(32, 20, 14, 4);
            ctx.fillRect(0, 18, 8, 3); ctx.fillRect(38, 16, 10, 3);
            ctx.fillRect(8, 30, 8, 3); ctx.fillRect(34, 28, 8, 3);
            // Machine face carved in trunk
            ctx.fillStyle = '#00bcd4';
            // Eyes — glowing cyan triangles
            ctx.beginPath(); ctx.moveTo(18, 36); ctx.lineTo(22, 32); ctx.lineTo(26, 36); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(28, 36); ctx.lineTo(32, 32); ctx.lineTo(36, 36); ctx.closePath(); ctx.fill();
            // Mouth — circuit-like line
            ctx.fillRect(20, 42, 14, 2);
            ctx.fillRect(18, 44, 2, 2); ctx.fillRect(34, 44, 2, 2);
            // Third eye
            ctx.fillStyle = '#ff1744';
            ctx.beginPath(); ctx.arc(27, 26, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(27, 26, 1.5, 0, Math.PI * 2); ctx.fill();
            // Circuitry veins glowing on bark
            ctx.fillStyle = 'rgba(0, 188, 212, 0.3)';
            ctx.fillRect(22, 48, 2, 20); ctx.fillRect(30, 46, 2, 24);
            ctx.fillRect(18, 52, 6, 1); ctx.fillRect(30, 56, 6, 1);
            // Root tendrils
            ctx.fillStyle = '#37474f';
            ctx.fillRect(8, 72, 10, 8); ctx.fillRect(30, 72, 10, 8);
        });
    }

    // ============================================================
    //  S H R U B S
    // ============================================================

    function createBerryBushTex() {
        return createPixelTexture(24, 20, (ctx) => {
            ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.ellipse(12, 12, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#388e3c'; ctx.beginPath(); ctx.ellipse(10, 10, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
            // Berries
            ctx.fillStyle = '#e53935';
            ctx.beginPath(); ctx.arc(6, 10, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(14, 8, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(10, 14, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(18, 12, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff8a80';
            ctx.fillRect(5, 9, 1, 1); ctx.fillRect(13, 7, 1, 1);
        });
    }

    function createFernTex() {
        return createPixelTexture(28, 20, (ctx) => {
            // Multiple fronds fanning out
            ctx.fillStyle = '#558b2f';
            for (let i = 0; i < 5; i++) {
                const angle = -0.6 + i * 0.3;
                ctx.save(); ctx.translate(14, 18); ctx.rotate(angle);
                ctx.fillRect(-1, -16, 2, 16);
                for (let j = 0; j < 6; j++) {
                    ctx.fillRect(-4, -14 + j * 2.5, 3, 1.5);
                    ctx.fillRect(2, -13 + j * 2.5, 3, 1.5);
                }
                ctx.restore();
            }
            ctx.fillStyle = '#33691e';
            ctx.fillRect(12, 14, 4, 6);
        });
    }

    function createFlowerPatchTex() {
        return createPixelTexture(24, 16, (ctx) => {
            // Grass base
            ctx.fillStyle = '#4caf50';
            for (let i = 0; i < 12; i++) {
                ctx.fillRect(1 + i * 2, 8, 1, 4 + Math.floor(Math.random() * 4));
            }
            // Flowers
            const colors = ['#f44336', '#e91e63', '#ffeb3b', '#ff9800', '#9c27b0', '#2196f3'];
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = colors[i];
                const x = 2 + i * 4, y = 4 + Math.floor(Math.random() * 5);
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff8e1'; ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
            }
        });
    }

    function createGlowBushTex() {
        return createPixelTexture(24, 20, (ctx) => {
            // Dark bush body
            ctx.fillStyle = '#1a237e'; ctx.beginPath(); ctx.ellipse(12, 12, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#283593'; ctx.beginPath(); ctx.ellipse(12, 10, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
            // Glowing orbs
            ctx.fillStyle = 'rgba(0, 229, 255, 0.8)';
            ctx.beginPath(); ctx.arc(6, 10, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(16, 8, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(12, 14, 2, 0, Math.PI * 2); ctx.fill();
            // Core glow
            ctx.fillStyle = '#fff';
            ctx.fillRect(5, 9, 2, 2); ctx.fillRect(15, 7, 1, 1); ctx.fillRect(11, 13, 1, 1);
            // Aura
            ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
            ctx.beginPath(); ctx.ellipse(12, 11, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
        });
    }

    // ============================================================
    //  R U I N S  of the Machine Angel Civilization
    // ============================================================

    // --- 0: Broken Pillar — cracked marble with circuit veins ---
    function createBrokenPillarTex() {
        return createPixelTexture(24, 48, (ctx) => {
            // Main column
            ctx.fillStyle = '#b0bec5'; ctx.fillRect(6, 8, 12, 40);
            ctx.fillStyle = '#cfd8dc'; ctx.fillRect(8, 10, 8, 36);
            // Capital
            ctx.fillStyle = '#90a4ae'; ctx.fillRect(4, 6, 16, 4);
            // Broken top — jagged
            ctx.fillStyle = '#b0bec5';
            ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(8, 2); ctx.lineTo(12, 6); ctx.lineTo(16, 0);
            ctx.lineTo(20, 4); ctx.lineTo(20, 8); ctx.closePath(); ctx.fill();
            // Cracks
            ctx.fillStyle = '#455a64';
            ctx.fillRect(10, 16, 1, 12); ctx.fillRect(10, 28, 4, 1);
            ctx.fillRect(14, 22, 1, 8);
            // Circuit veins (ancient tech)
            ctx.fillStyle = 'rgba(0, 188, 212, 0.5)';
            ctx.fillRect(9, 20, 1, 6); ctx.fillRect(9, 26, 3, 1);
            ctx.fillRect(15, 30, 1, 8); ctx.fillRect(13, 38, 3, 1);
            // Moss
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(6, 38, 4, 3); ctx.fillRect(14, 42, 3, 4); ctx.fillRect(4, 44, 5, 4);
        });
    }

    // --- 1: Rune Arch — floating stones with glyphs ---
    function createRuneArchTex() {
        return createPixelTexture(48, 56, (ctx) => {
            // Left pillar
            ctx.fillStyle = '#78909c'; ctx.fillRect(4, 16, 10, 40);
            // Right pillar
            ctx.fillRect(34, 16, 10, 40);
            // Keystone arch
            ctx.fillStyle = '#90a4ae';
            ctx.beginPath();
            ctx.moveTo(4, 16); ctx.quadraticCurveTo(24, -2, 44, 16);
            ctx.lineTo(38, 16); ctx.quadraticCurveTo(24, 4, 10, 16);
            ctx.closePath(); ctx.fill();
            // Glowing runes
            ctx.fillStyle = '#00e5ff';
            // Left pillar runes
            ctx.fillRect(7, 22, 4, 4); ctx.fillRect(7, 30, 4, 4); ctx.fillRect(7, 38, 4, 4);
            // Right pillar runes
            ctx.fillRect(37, 22, 4, 4); ctx.fillRect(37, 30, 4, 4); ctx.fillRect(37, 38, 4, 4);
            // Keystone rune — larger
            ctx.fillRect(21, 8, 6, 6);
            ctx.fillStyle = '#fff'; ctx.fillRect(23, 10, 2, 2);
            // Glow aura on runes
            ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
            ctx.beginPath(); ctx.arc(24, 11, 8, 0, Math.PI * 2); ctx.fill();
            // Rubble at base
            ctx.fillStyle = '#607d8b';
            ctx.fillRect(14, 50, 5, 4); ctx.fillRect(28, 52, 6, 4); ctx.fillRect(18, 54, 4, 2);
        });
    }

    // --- 2: Machine Angel Statue — winged figure with halo circuit ---
    function createMachineAngelTex() {
        return createPixelTexture(56, 72, (ctx) => {
            // Pedestal
            ctx.fillStyle = '#546e7a'; ctx.fillRect(16, 56, 24, 16);
            ctx.fillStyle = '#607d8b'; ctx.fillRect(14, 54, 28, 4);
            ctx.fillStyle = '#78909c'; ctx.fillRect(18, 58, 20, 2);
            // Body — angular, mechanical
            ctx.fillStyle = '#b0bec5'; ctx.fillRect(22, 30, 12, 26);
            ctx.fillStyle = '#cfd8dc'; ctx.fillRect(24, 32, 8, 22);
            // Head — geometric
            ctx.fillStyle = '#cfd8dc';
            ctx.fillRect(24, 20, 8, 12);
            ctx.fillStyle = '#b0bec5'; ctx.fillRect(22, 18, 12, 4);
            // Face — glowing eyes
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(25, 24, 3, 2); ctx.fillRect(30, 24, 3, 2);
            // Mouth line
            ctx.fillStyle = '#78909c'; ctx.fillRect(26, 28, 6, 1);
            // Halo — circuit ring
            ctx.strokeStyle = '#ffd740'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(28, 14, 10, 4, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#ffd740';
            ctx.fillRect(18, 13, 2, 2); ctx.fillRect(36, 13, 2, 2);
            ctx.fillRect(27, 10, 2, 2);
            // Wings — circuit-patterned metal
            ctx.fillStyle = '#78909c';
            // Left wing
            ctx.beginPath(); ctx.moveTo(22, 32); ctx.lineTo(4, 18); ctx.lineTo(2, 24);
            ctx.lineTo(8, 40); ctx.lineTo(22, 44); ctx.closePath(); ctx.fill();
            // Right wing
            ctx.beginPath(); ctx.moveTo(34, 32); ctx.lineTo(52, 18); ctx.lineTo(54, 24);
            ctx.lineTo(48, 40); ctx.lineTo(34, 44); ctx.closePath(); ctx.fill();
            // Wing circuit lines
            ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
            ctx.fillRect(8, 24, 12, 1); ctx.fillRect(10, 30, 10, 1); ctx.fillRect(12, 36, 8, 1);
            ctx.fillRect(36, 24, 12, 1); ctx.fillRect(38, 30, 10, 1); ctx.fillRect(36, 36, 8, 1);
            // Wing feather tips
            ctx.fillStyle = '#90a4ae';
            ctx.fillRect(2, 22, 4, 6); ctx.fillRect(50, 22, 4, 6);
            // Chest sigil — glowing
            ctx.fillStyle = '#ff1744';
            ctx.beginPath(); ctx.arc(28, 38, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(28, 38, 1.5, 0, Math.PI * 2); ctx.fill();
            // Arms — reaching out
            ctx.fillStyle = '#b0bec5';
            ctx.fillRect(16, 34, 6, 3); ctx.fillRect(34, 34, 6, 3);
            ctx.fillRect(12, 36, 6, 3); ctx.fillRect(38, 36, 6, 3);
        });
    }

    // --- 3: Data Monolith — black slab with scrolling runes ---
    function createDataMonolithTex() {
        return createPixelTexture(24, 48, (ctx) => {
            // Black obelisk
            ctx.fillStyle = '#1a1a2e'; ctx.fillRect(4, 4, 16, 44);
            ctx.fillStyle = '#16213e'; ctx.fillRect(6, 6, 12, 40);
            // Beveled top
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(12, 0); ctx.lineTo(20, 4); ctx.closePath(); ctx.fill();
            // Data streams — cyan text-like marks
            ctx.fillStyle = '#00e5ff';
            const chars = '⊡⊞⊟⊠⊛⊕';
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 3; col++) {
                    if (Math.random() > 0.3) {
                        ctx.fillRect(7 + col * 4, 8 + row * 5, 2, 3);
                    }
                }
            }
            // Brighter focal rune
            ctx.fillStyle = '#76ff03';
            ctx.fillRect(10, 22, 4, 4);
            ctx.fillStyle = '#fff'; ctx.fillRect(11, 23, 2, 2);
            // Base glow
            ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
            ctx.beginPath(); ctx.ellipse(12, 46, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
        });
    }

    // --- 4: Shattered Gear — massive broken cogwheel ---
    function createShatteredGearTex() {
        return createPixelTexture(40, 36, (ctx) => {
            // Main gear body — half buried
            ctx.fillStyle = '#546e7a';
            ctx.beginPath(); ctx.arc(20, 22, 16, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#37474f';
            ctx.beginPath(); ctx.arc(20, 22, 11, 0, Math.PI * 2); ctx.fill();
            // Hole
            ctx.fillStyle = '#263238';
            ctx.beginPath(); ctx.arc(20, 22, 6, 0, Math.PI * 2); ctx.fill();
            // Teeth
            ctx.fillStyle = '#546e7a';
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                ctx.fillRect(20 + Math.cos(a) * 14 - 3, 22 + Math.sin(a) * 14 - 3, 6, 6);
            }
            // Break — chunk missing
            ctx.fillStyle = '#1a472a'; // ground color showing through
            ctx.beginPath(); ctx.arc(32, 14, 10, 0, Math.PI * 2); ctx.fill();
            // Rust
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(14, 18, 4, 3); ctx.fillRect(22, 26, 5, 2); ctx.fillRect(10, 28, 3, 3);
            // Cyan core glow in center hole
            ctx.fillStyle = 'rgba(0, 188, 212, 0.4)';
            ctx.beginPath(); ctx.arc(20, 22, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#00bcd4'; ctx.fillRect(19, 21, 2, 2);
        });
    }

    // ============================================================
    //  R O C K S
    // ============================================================

    function createMossRockTex() {
        return createPixelTexture(20, 18, (ctx) => {
            ctx.fillStyle = '#5d6d7e'; ctx.beginPath(); ctx.ellipse(10, 12, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#85929e';
            ctx.fillRect(4, 8, 5, 3); ctx.fillRect(11, 10, 4, 2);
            ctx.fillStyle = '#34495e'; ctx.fillRect(7, 13, 6, 3);
            // Moss patches
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(3, 10, 4, 3); ctx.fillRect(12, 8, 3, 4);
            ctx.fillStyle = '#388e3c'; ctx.fillRect(4, 11, 2, 2); ctx.fillRect(13, 9, 2, 2);
        });
    }

    function createCrystalRockTex() {
        return createPixelTexture(28, 24, (ctx) => {
            // Rock base
            ctx.fillStyle = '#455a64'; ctx.beginPath(); ctx.ellipse(14, 16, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#546e7a'; ctx.fillRect(6, 12, 8, 6); ctx.fillRect(14, 14, 8, 4);
            // Crystal shards erupting
            ctx.fillStyle = '#00bcd4';
            ctx.beginPath(); ctx.moveTo(10, 14); ctx.lineTo(8, 2); ctx.lineTo(12, 4); ctx.lineTo(14, 14); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#26c6da';
            ctx.beginPath(); ctx.moveTo(16, 12); ctx.lineTo(18, 0); ctx.lineTo(21, 3); ctx.lineTo(20, 12); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#4dd0e1';
            ctx.beginPath(); ctx.moveTo(20, 14); ctx.lineTo(23, 6); ctx.lineTo(25, 8); ctx.lineTo(24, 14); ctx.closePath(); ctx.fill();
            // Crystal inner glow
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(9, 6, 2, 4); ctx.fillRect(18, 3, 2, 4);
            // Ground glow
            ctx.fillStyle = 'rgba(0, 188, 212, 0.2)';
            ctx.beginPath(); ctx.ellipse(14, 18, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
        });
    }

    function createAmethystClusterTex() {
        return createPixelTexture(24, 28, (ctx) => {
            // Rocky base
            ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.ellipse(12, 20, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
            // Amethyst crystals — purple shards
            const purples = ['#7b1fa2', '#9c27b0', '#ab47bc', '#ce93d8'];
            const shards = [
                { x: 6, bx: 4, by: 6, tx: 6, ty: 0, ex: 10 },
                { x: 12, bx: 9, by: 8, tx: 12, ty: 1, ex: 15 },
                { x: 18, bx: 16, by: 10, tx: 19, ty: 4, ex: 22 },
                { x: 10, bx: 8, by: 12, tx: 10, ty: 6, ex: 14 }
            ];
            shards.forEach((s, i) => {
                ctx.fillStyle = purples[i];
                ctx.beginPath(); ctx.moveTo(s.bx, s.by); ctx.lineTo(s.tx, s.ty); ctx.lineTo(s.ex, s.by); ctx.closePath(); ctx.fill();
            });
            // Highlights
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(5, 4, 1, 3); ctx.fillRect(11, 3, 1, 3); ctx.fillRect(18, 6, 1, 3);
            // Glow
            ctx.fillStyle = 'rgba(156, 39, 176, 0.2)';
            ctx.beginPath(); ctx.ellipse(12, 16, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
        });
    }

    function createAncientCorestoneTex() {
        return createPixelTexture(24, 24, (ctx) => {
            // Angular hewn stone — not natural
            ctx.fillStyle = '#263238'; ctx.fillRect(4, 6, 16, 16);
            ctx.fillStyle = '#37474f'; ctx.fillRect(6, 8, 12, 12);
            // Perfectly carved circle — machine precision
            ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(12, 14, 5, 0, Math.PI * 2); ctx.stroke();
            // Inner symbol — ancient tech
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(11, 11, 2, 6); ctx.fillRect(9, 13, 6, 2);
            // Corner marks
            ctx.fillRect(5, 7, 2, 2); ctx.fillRect(17, 7, 2, 2);
            ctx.fillRect(5, 19, 2, 2); ctx.fillRect(17, 19, 2, 2);
            // Pulsing glow
            ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
            ctx.beginPath(); ctx.arc(12, 14, 10, 0, Math.PI * 2); ctx.fill();
        });
    }

    // ============================================================
    //  G R O U N D   D E C O R
    // ============================================================

    function createMushroomTex() {
        return createPixelTexture(16, 20, (ctx) => {
            ctx.fillStyle = '#faf0e6'; ctx.fillRect(6, 10, 4, 10);
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.ellipse(8, 8, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(4, 5, 3, 3); ctx.fillRect(9, 3, 2, 2); ctx.fillRect(10, 8, 2, 2);
        });
    }

    function createSkullPileTex() {
        return createPixelTexture(24, 16, (ctx) => {
            // Ancient bones half-buried
            ctx.fillStyle = '#d7ccc8';
            ctx.beginPath(); ctx.ellipse(8, 10, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(16, 11, 4, 3.5, 0.2, 0, Math.PI * 2); ctx.fill();
            // Eye sockets
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(6, 9, 2, 2); ctx.fillRect(10, 9, 2, 2);
            ctx.fillRect(14, 10, 2, 2); ctx.fillRect(18, 10, 2, 2);
            // Jaw
            ctx.fillStyle = '#bcaaa4'; ctx.fillRect(6, 12, 6, 2);
            // Bones sticking out
            ctx.fillStyle = '#d7ccc8';
            ctx.fillRect(0, 12, 6, 2); ctx.fillRect(18, 12, 6, 2);
            ctx.fillRect(10, 14, 4, 2);
        });
    }

    function createWildflowerTex() {
        return createPixelTexture(20, 14, (ctx) => {
            // Grass tufts
            ctx.fillStyle = '#66bb6a';
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(2 + i * 2, 6 + Math.floor(Math.random() * 4), 1, 4 + Math.floor(Math.random() * 4));
            }
            // Tiny flowers
            ctx.fillStyle = '#fff176'; ctx.beginPath(); ctx.arc(4, 4, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e1bee7'; ctx.beginPath(); ctx.arc(10, 3, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#80cbc4'; ctx.beginPath(); ctx.arc(16, 5, 1.5, 0, Math.PI * 2); ctx.fill();
        });
    }

    // ===================== STUMP ==================================
    function createStumpTex() {
        return createPixelTexture(16, 16, (ctx) => {
            ctx.fillStyle = '#5d4037'; ctx.fillRect(3, 6, 10, 10);
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
    // Each chunk gets: trees, shrubs, rocks, ruins (rare), ground decor
    // Ruins appear based on chunk hash — some chunks are "ruin zones"
    function generateChunk(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        if (gameState.chunks.has(key)) return;

        const group = new THREE.Group();
        const bx = chunkX * CONFIG.chunkSize;
        const bz = chunkZ * CONFIG.chunkSize;
        const CS = CONFIG.chunkSize;

        // Chunk personality — seeded hash determines biome mix
        const chunkSeed = chunkX * 73856093 + chunkZ * 19349663;
        const chunkR = seededRandom(chunkSeed);
        const isRuinZone = chunkR < 0.12;        // 12% of chunks have ruins
        const isCrystalZone = chunkR > 0.85;      // 15% have crystal clusters
        const isDenseForest = chunkR > 0.4 && chunkR < 0.7; // 30% extra dense

        // ---------- TREES ----------
        const treeDensity = isDenseForest ? 0.007 : 0.004;
        const treeCount = Math.floor(CS * CS * treeDensity);
        for (let i = 0; i < treeCount; i++) {
            const seed = chunkX * 10000 + chunkZ * 100 + i;
            const x = bx + seededRandom(seed) * CS;
            const z = bz + seededRandom(seed + 1) * CS;
            const typeIdx = Math.floor(seededRandom(seed + 2) * textures.trees.length);
            const sizeVar = 0.8 + seededRandom(seed + 3) * 0.5;

            const tex = textures.trees[typeIdx];
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            const sprite = new THREE.Sprite(mat);
            const w = 4 * sizeVar, h = 8 * sizeVar;
            sprite.scale.set(w, h, 1);
            sprite.position.set(x, h / 2, z);
            group.add(sprite);
            registerTree(sprite, key);
        }

        // ---------- SHRUBS ----------
        const shrubCount = Math.floor(CS * CS * 0.003);
        for (let i = 0; i < shrubCount; i++) {
            const seed = chunkX * 40000 + chunkZ * 400 + i;
            const x = bx + seededRandom(seed) * CS;
            const z = bz + seededRandom(seed + 1) * CS;
            const typeIdx = Math.floor(seededRandom(seed + 2) * textures.shrubs.length);
            const mat = new THREE.SpriteMaterial({ map: textures.shrubs[typeIdx], transparent: true });
            const sprite = new THREE.Sprite(mat);
            const s = 1.2 + seededRandom(seed + 3) * 0.6;
            sprite.scale.set(s * 1.5, s, 1);
            sprite.position.set(x, s * 0.5, z);
            group.add(sprite);
        }

        // ---------- ROCKS ----------
        const rockCount = 2 + (isCrystalZone ? 4 : 0);
        for (let i = 0; i < rockCount; i++) {
            const seed = chunkX * 20000 + chunkZ * 200 + i;
            const x = bx + seededRandom(seed) * CS;
            const z = bz + seededRandom(seed + 1) * CS;
            // Crystal zones get crystal/amethyst rocks, others get moss/ancient
            let typeIdx;
            if (isCrystalZone) {
                typeIdx = 1 + Math.floor(seededRandom(seed + 2) * 3); // crystal, amethyst, corestone
            } else {
                typeIdx = Math.floor(seededRandom(seed + 2) * textures.rocks.length);
            }
            const mat = new THREE.SpriteMaterial({ map: textures.rocks[typeIdx], transparent: true });
            const sprite = new THREE.Sprite(mat);
            const s = 1.2 + seededRandom(seed + 3) * 0.8;
            sprite.scale.set(s * 1.4, s, 1);
            sprite.position.set(x, s * 0.4, z);
            group.add(sprite);
        }

        // ---------- RUINS (rare) ----------
        if (isRuinZone) {
            const ruinCount = 2 + Math.floor(seededRandom(chunkSeed + 7) * 4);
            for (let i = 0; i < ruinCount; i++) {
                const seed = chunkX * 50000 + chunkZ * 500 + i;
                const x = bx + seededRandom(seed) * CS;
                const z = bz + seededRandom(seed + 1) * CS;
                const typeIdx = Math.floor(seededRandom(seed + 2) * textures.ruins.length);
                const mat = new THREE.SpriteMaterial({ map: textures.ruins[typeIdx], transparent: true });
                const sprite = new THREE.Sprite(mat);

                // Ruins are bigger, taller
                let w, h;
                if (typeIdx === 2) {        // Machine Angel — tallest
                    w = 7; h = 9;
                } else if (typeIdx === 1) { // Rune Arch — wide
                    w = 8; h = 9;
                } else if (typeIdx === 4) { // Gear — wide, low
                    w = 5; h = 4;
                } else {                    // Pillars, monoliths
                    w = 3; h = 6;
                }
                const sv = 0.8 + seededRandom(seed + 3) * 0.5;
                sprite.scale.set(w * sv, h * sv, 1);
                sprite.position.set(x, (h * sv) / 2, z);
                group.add(sprite);
            }
        }

        // ---------- GROUND DECOR ----------
        const groundCount = Math.floor(CS * CS * 0.002);
        for (let i = 0; i < groundCount; i++) {
            const seed = chunkX * 60000 + chunkZ * 600 + i;
            const x = bx + seededRandom(seed) * CS;
            const z = bz + seededRandom(seed + 1) * CS;
            const typeIdx = Math.floor(seededRandom(seed + 2) * textures.ground.length);
            const mat = new THREE.SpriteMaterial({ map: textures.ground[typeIdx], transparent: true });
            const sprite = new THREE.Sprite(mat);
            const s = 0.8 + seededRandom(seed + 3) * 0.5;
            sprite.scale.set(s * 1.2, s, 1);
            sprite.position.set(x, s * 0.4, z);
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
