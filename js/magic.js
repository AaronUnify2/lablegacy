// ============================================
// MAGIC MODULE — projectiles fired by the hero (Slice C)
// ============================================
//
// What this owns:
//   - Magic blast projectile sprites (purple orb + glow)
//   - Per-frame projectile movement and collision
//   - Tree damage (calls GameUnits.damageTree, which handles HP)
//   - Damage to enemy units
//   - Aim assist: when an enemy is in front of the hero, projectiles
//     are aimed at THEM instead of the strict crosshair direction.
//     Trees get no aim assist — strict ray from camera/crosshair.
//
// Public API:
//   GameMagic.init()           — call once after THREE/scene exist
//   GameMagic.fireFromHero()   — bound to the magic button
//   GameMagic.update(deltaMS)  — call from the main animation loop

window.GameMagic = (function() {
    console.log('magic.js loading...');

    // Tunable constants — adjust after playtest.
    // Speed and life are time-based, NOT frame-based. This matters
    // because FPS-view frame rates differ from RTS-view frame rates
    // (the dense forest renders slower in FPS), and frame-based
    // motion would make projectiles crawl in FPS and fly fast in RTS.
    const PROJECTILE_SPEED_PER_SEC = 35;     // world units per second
    const PROJECTILE_LIFE_SEC      = 1.5;    // seconds before despawn (range = speed × life)
    const PROJECTILE_RADIUS        = 0.5;    // for collision
    const COOLDOWN_MS              = 500;    // between blasts (bumped for 5-shot spread)
    const HERO_DAMAGE_PER_BLAST    = 20;     // applied to enemies on hit
    const AIM_ASSIST_RANGE         = 25;     // tiles, max range to consider an enemy
    const AIM_ASSIST_CONE_DEG      = 30;     // half-angle of forward cone

    // Shotgun spread. 10 shots spanning 20° total (so ±10° around the
    // center direction) for a tight, dense fan that reliably chews
    // through the front line of trees instead of bypassing them.
    const SHOT_COUNT               = 10;
    const SHOT_SPREAD_DEG          = 20;

    let projectiles = [];
    let lastFireTime = 0;
    let lastUpdateTime = 0;     // for computing deltaSeconds in update()

    // Resolved engine refs (set in init)
    let scene = null;
    let THREE = null;
    let gameState = null;
    let CELL = null;
    let CONFIG = null;

    // Pre-built sprite material for projectiles. Built lazily so we
    // don't run canvas code before THREE is available.
    let projectileMaterialCache = null;

    function init() {
        if (!window.GameEngine) {
            console.warn('GameMagic.init: GameEngine not available yet');
            return;
        }
        scene = window.GameEngine.scene;
        THREE = window.GameEngine.THREE;
        gameState = window.GameEngine.gameState;
        CELL = window.GameEngine.CELL;
        CONFIG = window.GameEngine.CONFIG;
        console.log('GameMagic initialized');
    }

    // Builds the purple-orb sprite material on demand. Same color
    // family as the staff orb on the wizard's sprite for visual
    // continuity. Additive blend gives it a glow.
    function getProjectileMaterial() {
        if (projectileMaterialCache) return projectileMaterialCache;
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Soft halo first (painted as a radial gradient)
        const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
        grad.addColorStop(0, 'rgba(216, 180, 255, 1.0)');
        grad.addColorStop(0.4, 'rgba(155, 109, 255, 0.85)');
        grad.addColorStop(0.7, 'rgba(110, 70, 200, 0.4)');
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);

        // Bright center pixel cluster
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(15, 15, 2, 2);

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearFilter;
        projectileMaterialCache = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        return projectileMaterialCache;
    }

    // ============================================
    // FIRING
    // ============================================

    // Called by the magic button. Spawns SHOT_COUNT projectiles in a
    // horizontal fan from the hero's eye-level position. The center
    // shot honors aim assist (locks onto an enemy in front if one
    // exists); the other shots fan out around that center direction.
    // Projectile direction also honors the hero's pitch, so looking
    // up arcs the blast skyward.
    function fireFromHero() {
        if (!gameState || !gameState.hero) return;
        if (!gameState.fpsMode) return;
        const now = Date.now();
        if (now - lastFireTime < COOLDOWN_MS) return;
        lastFireTime = now;

        const hero = gameState.hero;
        const rot   = hero.rotation || 0;
        const pitch = hero.pitch    || 0;

        // Forward direction = camera's full view ray. Horizontal
        // component shrinks as we pitch up/down (cos(pitch)), and the
        // y component rises (sin(pitch)). Same math the FPS camera
        // lookAt uses.
        const horiz = Math.cos(pitch);
        const fwd = {
            x: -Math.sin(rot) * horiz,
            y:  Math.sin(pitch),
            z: -Math.cos(rot) * horiz
        };

        // Aim-assist target search uses the horizontal projection of
        // the forward vector — enemies are on the ground, not in the
        // sky, so we don't want pitch to throw the cone off.
        const horizFwd = {
            x: -Math.sin(rot),
            y: 0,
            z: -Math.cos(rot)
        };
        const target = findAimAssistTarget(hero, horizFwd);

        // Origin: hero's eye level, slightly forward so the orbs
        // don't spawn inside his hat.
        const origin = {
            x: hero.position.x + fwd.x * 0.5,
            y: 2.5,
            z: hero.position.z + fwd.z * 0.5
        };

        // Determine the CENTER direction. If aim assist found a target,
        // the center shot aims at them. Otherwise, the strict camera
        // forward vector. The four side shots fan out around this.
        let centerDir;
        if (target) {
            const tx = target.position.x - origin.x;
            const tz = target.position.z - origin.z;
            const ty = 2 - origin.y;
            const len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
            centerDir = { x: tx / len, y: ty / len, z: tz / len };
        } else {
            centerDir = fwd;
        }

        // Spawn the fan. Spread is purely horizontal: rotate the
        // center direction around the world Y axis by symmetric
        // angles. With SHOT_COUNT=10 and SHOT_SPREAD_DEG=20, offsets
        // are evenly distributed from -10° to +10°.
        const halfSpread = (SHOT_SPREAD_DEG / 2) * Math.PI / 180;
        for (let i = 0; i < SHOT_COUNT; i++) {
            const t = SHOT_COUNT === 1 ? 0
                    : (i / (SHOT_COUNT - 1)) * 2 - 1;     // -1 .. +1
            const angle = t * halfSpread;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            // Rotate centerDir around Y by `angle`
            const dir = {
                x: centerDir.x * cosA + centerDir.z * sinA,
                y: centerDir.y,
                z: -centerDir.x * sinA + centerDir.z * cosA
            };
            spawnProjectile(origin, dir);
        }
    }

    function findAimAssistTarget(hero, fwd) {
        if (!gameState.units) return null;
        const coneCos = Math.cos(AIM_ASSIST_CONE_DEG * Math.PI / 180);

        let best = null;
        let bestDist = AIM_ASSIST_RANGE;

        for (const u of gameState.units) {
            if (u === hero) continue;
            if (u.owner === 'player') continue;     // no friendly fire / no allied targeting
            if (u.health <= 0) continue;

            const dx = u.position.x - hero.position.x;
            const dz = u.position.z - hero.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > AIM_ASSIST_RANGE) continue;
            if (dist < 0.001) continue;

            // Forward cone test: dot product of normalized vector to
            // target with hero's forward vector must exceed cos(cone).
            const nx = dx / dist;
            const nz = dz / dist;
            const dot = nx * fwd.x + nz * fwd.z;
            if (dot < coneCos) continue;

            if (dist < bestDist) {
                bestDist = dist;
                best = u;
            }
        }
        return best;
    }

    function spawnProjectile(origin, dir) {
        const sprite = new THREE.Sprite(getProjectileMaterial());
        sprite.scale.set(0.8, 0.8, 1);
        sprite.position.set(origin.x, origin.y, origin.z);
        scene.add(sprite);

        projectiles.push({
            sprite: sprite,
            x: origin.x, y: origin.y, z: origin.z,
            dx: dir.x, dy: dir.y, dz: dir.z,
            // Life is wall-clock seconds remaining, not frames.
            // update() decrements by deltaSeconds.
            life: PROJECTILE_LIFE_SEC
        });
    }

    // ============================================
    // UPDATE LOOP
    // ============================================

    function update() {
        if (!scene || !gameState) return;

        // Compute deltaSeconds since the last call. First frame is a
        // no-op (we don't have a previous timestamp yet). Cap to 0.1s
        // to avoid teleporting projectiles after a tab-switch pause.
        const now = performance.now();
        if (lastUpdateTime === 0) {
            lastUpdateTime = now;
            return;
        }
        let deltaSec = (now - lastUpdateTime) / 1000;
        lastUpdateTime = now;
        // Cap deltaSec to prevent teleport-through-walls when the tab
        // was backgrounded for a while. 0.5s is loose enough that
        // normal-but-laggy framerates (down to ~3fps) still produce
        // accurate projectile motion, while a tab-switch (delta of
        // many seconds) gets clamped.
        if (deltaSec > 0.5) deltaSec = 0.5;

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];

            // Step (time-based)
            const step = PROJECTILE_SPEED_PER_SEC * deltaSec;
            p.x += p.dx * step;
            p.y += p.dy * step;
            p.z += p.dz * step;
            p.life -= deltaSec;

            p.sprite.position.set(p.x, p.y, p.z);

            // Out of life or out of bounds → cleanup
            if (p.life <= 0 || outOfBounds(p.x, p.z)) {
                cleanupProjectile(p, i);
                continue;
            }

            // Collision: enemy units first (cheaper, fewer of them)
            const hitUnit = checkUnitHit(p);
            if (hitUnit) {
                hitUnit.health -= HERO_DAMAGE_PER_BLAST;
                console.log(`Magic blast hit ${hitUnit.type} for ${HERO_DAMAGE_PER_BLAST}. HP: ${hitUnit.health.toFixed(0)}`);
                if (hitUnit.health <= 0 && window.GameUnits) {
                    GameUnits.killUnit(hitUnit);
                }
                cleanupProjectile(p, i);
                continue;
            }

            // Collision: trees. We sample the projectile's current
            // grid cell. Each hit applies 1 HP of damage. damageTree
            // returns true when the tree falls; we award resources
            // and despawn.
            const hitTree = checkTreeHit(p);
            if (hitTree) {
                if (window.GameUnits) {
                    const treeType = hitTree.type;
                    const fell = GameUnits.damageTree(hitTree.x, hitTree.z, 1);
                    if (fell) GameUnits.awardTreeResources(treeType);
                }
                cleanupProjectile(p, i);
                continue;
            }
        }
    }

    function checkUnitHit(p) {
        if (!gameState.units) return null;
        for (const u of gameState.units) {
            if (u.owner === 'player') continue;     // skip friendlies
            if (u.health <= 0) continue;
            const dx = u.position.x - p.x;
            const dz = u.position.z - p.z;
            const dy = 2 - p.y;        // unit center mass approx
            const distSq = dx * dx + dy * dy + dz * dz;
            // Slightly loose collision to compensate for sprites
            // being billboard squares with no real volume.
            if (distSq < 1.5 * 1.5) return u;
        }
        return null;
    }

    // Returns the closest tree within HIT_RADIUS of the projectile's
    // position, or null. The previous implementation only checked the
    // exact cell the projectile was in, which meant orbs could squeeze
    // between adjacent trees (the cell collision was ~0.5×0.5 with no
    // thickness). With 13.5-tall sprites that *visually* look like a
    // wall, that felt wrong. Now we sample the projectile's cell plus
    // its 8 neighbors and pick the closest tree among them.
    const HIT_RADIUS = 0.7;
    function checkTreeHit(p) {
        if (!CELL || !gameState.grid) return null;
        // Don't damage trees if the projectile is high above the canopy
        // (the player aimed up over the forest). Trees now reach ~13.5
        // high (3× original height), so under y=14 counts as "still in
        // the forest".
        if (p.y > 14) return null;

        const cx = Math.floor(p.x);
        const cz = Math.floor(p.z);
        if (cx < 0 || cx >= CONFIG.GRID_WIDTH || cz < 0 || cz >= CONFIG.GRID_HEIGHT) return null;

        let bestTree = null;
        let bestDistSq = HIT_RADIUS * HIT_RADIUS;

        // Sample the 3×3 grid centered on the projectile's cell. Each
        // tree cell has its center at (cellX + 0.5, cellZ + 0.5) since
        // grid cells are 1×1 anchored at their integer corners. We
        // measure squared distance from the projectile to that center
        // and pick the closest tree within HIT_RADIUS.
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const tx = cx + dx;
                const tz = cz + dz;
                if (tx < 0 || tx >= CONFIG.GRID_WIDTH || tz < 0 || tz >= CONFIG.GRID_HEIGHT) continue;
                const cell = gameState.grid[tx]?.[tz];
                if (cell !== CELL.TREE_NORMAL &&
                    cell !== CELL.TREE_HIGH_YIELD &&
                    cell !== CELL.TREE_ENERGY) continue;
                const treeCenterX = tx + 0.5;
                const treeCenterZ = tz + 0.5;
                const ddx = p.x - treeCenterX;
                const ddz = p.z - treeCenterZ;
                const distSq = ddx * ddx + ddz * ddz;
                if (distSq < bestDistSq) {
                    bestDistSq = distSq;
                    bestTree = { x: tx, z: tz, type: cell };
                }
            }
        }

        return bestTree;
    }

    function outOfBounds(x, z) {
        if (!CONFIG) return false;
        return x < -10 || x > CONFIG.GRID_WIDTH + 10 ||
               z < -10 || z > CONFIG.GRID_HEIGHT + 10;
    }

    function cleanupProjectile(p, index) {
        if (p.sprite) scene.remove(p.sprite);
        projectiles.splice(index, 1);
    }

    // Public API
    return {
        init,
        fireFromHero,
        update
    };
})();
