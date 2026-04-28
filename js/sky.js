// ============================================
// SKY MODULE — deep night sky with stars and nebulas
// ============================================
//
// Builds:
//   - A large inverted skydome with a vertical gradient (zenith black →
//     midsky deep indigo → horizon warm purple) using a tiny custom
//     shader. The dome sits "inside out" so we see its interior.
//   - ~300 star sprites distributed across the upper hemisphere with
//     size and brightness variation. A subset of them twinkle each
//     frame (subtle opacity oscillation).
//   - 3 large soft "nebula" sprites — additive purple/magenta clouds
//     that add depth to the empty parts of the sky.
//
// Rendering notes:
//   - Skydome and stars sit at radius 250, well inside the camera's
//     300 far plane. They render with `depthWrite: false` so foreground
//     objects always sort on top.
//   - The dome has `renderOrder: -1` so it draws first (background).
//   - When the FPS-mode far plane drops to 80, the dome is clipped.
//     We swap dome radius to 70 in that case (still beyond all the
//     trees, still backdropped by stars). updateForMode() handles it.
//
// Public API:
//   GameSky.init()
//   GameSky.update()        — per-frame twinkle + slow rotation
//   GameSky.updateForMode(isFps)

window.GameSky = (function() {
    console.log('sky.js loading...');

    let scene = null;
    let THREE = null;
    let dome = null;
    let starGroup = null;            // THREE.Group containing all star sprites
    let nebulaGroup = null;
    let twinklingStars = [];         // subset whose opacity we update
    let initialized = false;

    // Tunable constants
    const DOME_RADIUS_RTS  = 250;
    const DOME_RADIUS_FPS  = 70;     // FPS far plane is 80, so 70 fits
    const STAR_COUNT       = 300;
    const NEBULA_COUNT     = 3;
    const TWINKLE_FRACTION = 0.25;   // 25% of stars twinkle

    // Sky gradient colors (sampled at zenith / midsky / horizon)
    const COLOR_ZENITH    = 0x05050f;   // near black, slight blue
    const COLOR_MIDSKY    = 0x0a0a2a;   // deep indigo
    const COLOR_HORIZON   = 0x2a1040;   // warm purple at the bottom edge

    function init() {
        if (initialized) return;
        if (!window.GameEngine) {
            console.warn('GameSky.init: GameEngine not ready');
            return;
        }
        scene = window.GameEngine.scene;
        THREE = window.GameEngine.THREE;

        buildDome();
        buildStars();
        buildNebulas();

        // Match scene fog to the horizon color so the world fades into
        // the sky at distance instead of clashing.
        if (scene.fog) {
            scene.fog.color = new THREE.Color(COLOR_HORIZON);
        }

        initialized = true;
        console.log('GameSky initialized');
    }

    // Build the gradient dome. We use a ShaderMaterial with two
    // gradient mixes: bottom-half (horizon→midsky) and top-half
    // (midsky→zenith). Cheap to render — one big quad effectively.
    function buildDome() {
        const geo = new THREE.SphereGeometry(DOME_RADIUS_RTS, 32, 16);
        // We're rendering the inside of the sphere, so flip the
        // material side. (Could also negate the geometry's scale.x;
        // BackSide is cleaner.)
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                topColor:    { value: new THREE.Color(COLOR_ZENITH) },
                midColor:    { value: new THREE.Color(COLOR_MIDSKY) },
                bottomColor: { value: new THREE.Color(COLOR_HORIZON) },
                offset:      { value: 0.0 },
                exponent:    { value: 0.7 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 midColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    // Normalize Y so 0 = horizon (-radius), 1 = zenith (+radius).
                    // Then ease the gradient with a power curve.
                    float h = normalize(vWorldPosition).y;
                    h = clamp(h, 0.0, 1.0);
                    float curved = pow(h, exponent);
                    // Three-stop gradient: bottom → mid → top.
                    vec3 lower = mix(bottomColor, midColor, smoothstep(0.0, 0.4, curved));
                    vec3 upper = mix(midColor, topColor, smoothstep(0.4, 1.0, curved));
                    vec3 color = mix(lower, upper, smoothstep(0.3, 0.7, curved));
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            side: THREE.BackSide,
            depthWrite: false
        });
        dome = new THREE.Mesh(geo, mat);
        dome.renderOrder = -10;            // draw first (background)
        scene.add(dome);
    }

    // Build the star field. 300 sprites distributed on the upper
    // hemisphere of the dome. Each star is a tiny quad with a soft
    // glow texture. Color varies (mostly white, occasional blue/yellow).
    function buildStars() {
        starGroup = new THREE.Group();
        const tex = makeStarTexture();

        for (let i = 0; i < STAR_COUNT; i++) {
            // Random direction on upper hemisphere
            const u = Math.random();
            const v = Math.random() * 0.85;     // bias away from horizon
            const theta = u * Math.PI * 2;
            const phi = Math.acos(1 - v);        // polar from zenith
            // Convert to cartesian, place at slightly under dome radius
            const r = 240;
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.cos(phi);
            const z = r * Math.sin(phi) * Math.sin(theta);

            // Color variation - mostly white, splashes of blue / yellow
            let color;
            const rnd = Math.random();
            if (rnd < 0.08)       color = new THREE.Color(0x88aaff);   // blue giants
            else if (rnd < 0.15)  color = new THREE.Color(0xffe0a0);   // yellow stars
            else if (rnd < 0.20)  color = new THREE.Color(0xffaaaa);   // red dwarfs
            else                  color = new THREE.Color(0xffffff);   // plain white

            // Size variation - most are tiny, a few big "feature" stars
            const sizeRoll = Math.random();
            const size = sizeRoll > 0.97 ? 6 + Math.random() * 4
                       : sizeRoll > 0.85 ? 3 + Math.random() * 2
                       : 1 + Math.random() * 1.5;

            const mat = new THREE.SpriteMaterial({
                map: tex,
                color: color,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                opacity: 0.6 + Math.random() * 0.4
            });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(size, size, 1);
            sprite.position.set(x, y, z);
            sprite.renderOrder = -5;
            starGroup.add(sprite);

            // Mark a fraction of stars as twinkling
            if (Math.random() < TWINKLE_FRACTION) {
                twinklingStars.push({
                    sprite: sprite,
                    baseOpacity: mat.opacity,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.8 + Math.random() * 1.5    // radians per second
                });
            }
        }
        scene.add(starGroup);
    }

    // Soft star texture: bright pixel center with a falloff halo.
    // Used for every star sprite (color is varied via material color).
    function makeStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0,    'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.18, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(0.4,  'rgba(255, 255, 255, 0.25)');
        grad.addColorStop(1.0,  'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearFilter;
        return tex;
    }

    // Build a few large soft nebula patches for visual depth. Each is
    // a big additive sprite with a radial purple/magenta gradient.
    // Intentionally placed at varied angles so the player notices them
    // when looking around in FPS mode.
    function buildNebulas() {
        nebulaGroup = new THREE.Group();
        const tex = makeNebulaTexture();

        for (let i = 0; i < NEBULA_COUNT; i++) {
            const theta = (i / NEBULA_COUNT) * Math.PI * 2 + Math.random() * 0.5;
            const phi = 0.3 + Math.random() * 0.5;     // upper-mid hemisphere
            const r = 235;
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.cos(phi);
            const z = r * Math.sin(phi) * Math.sin(theta);

            // Slightly different hues so they don't all look identical
            const hue = 0.75 + Math.random() * 0.15;   // purple → magenta
            const color = new THREE.Color().setHSL(hue, 0.7, 0.45);

            const mat = new THREE.SpriteMaterial({
                map: tex,
                color: color,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                opacity: 0.45 + Math.random() * 0.2
            });
            const sprite = new THREE.Sprite(mat);
            const size = 60 + Math.random() * 50;
            sprite.scale.set(size, size, 1);
            sprite.position.set(x, y, z);
            sprite.renderOrder = -8;          // behind stars but in front of dome
            nebulaGroup.add(sprite);
        }
        scene.add(nebulaGroup);
    }

    // Big soft fuzzy circular gradient — a few overlapping blobs
    // give the texture a slightly cloudy shape rather than a perfect
    // disc.
    function makeNebulaTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Three overlapping blobs at slightly different positions/sizes
        const blobs = [
            { x: 128, y: 128, r: 110, alpha: 0.55 },
            { x: 100, y: 140, r: 80,  alpha: 0.4 },
            { x: 150, y: 110, r: 70,  alpha: 0.4 }
        ];
        for (const b of blobs) {
            const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
            grad.addColorStop(0,    `rgba(255, 255, 255, ${b.alpha})`);
            grad.addColorStop(0.5,  `rgba(255, 255, 255, ${b.alpha * 0.4})`);
            grad.addColorStop(1.0,  'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 256, 256);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearFilter;
        return tex;
    }

    // Per-frame: animate twinkle on the chosen subset of stars,
    // and optionally rotate the whole sky very slowly so it feels
    // alive without being noticeable.
    let _lastTime = 0;
    function update() {
        if (!initialized) return;
        const now = performance.now();
        if (_lastTime === 0) _lastTime = now;
        const tSec = now / 1000;

        for (const t of twinklingStars) {
            const wave = Math.sin(tSec * t.speed + t.phase);
            // Oscillate around the base opacity by ±40%
            t.sprite.material.opacity = t.baseOpacity * (0.6 + 0.4 * wave);
        }

        // Very slow celestial rotation — about one full turn every
        // 20 minutes. The player won't perceive it as motion but
        // long sessions get a tiny bit of life.
        if (starGroup) {
            starGroup.rotation.y = tSec * 0.005;
        }
        if (nebulaGroup) {
            nebulaGroup.rotation.y = tSec * 0.005;
        }

        _lastTime = now;
    }

    // The FPS far plane is 80. Our dome is at 250 — well outside that.
    // We resize the dome and reposition stars/nebulas to a smaller
    // radius when entering FPS so they're inside the visible frustum.
    // Called from updateCamera when the mode changes.
    let currentRadius = DOME_RADIUS_RTS;
    function updateForMode(isFps) {
        if (!initialized) return;
        const wantRadius = isFps ? DOME_RADIUS_FPS : DOME_RADIUS_RTS;
        if (wantRadius === currentRadius) return;

        const ratio = wantRadius / currentRadius;
        currentRadius = wantRadius;

        // Rescale dome
        if (dome) dome.scale.setScalar(currentRadius / DOME_RADIUS_RTS);

        // Rescale stars and nebulas (positions, not sizes)
        if (starGroup) {
            for (const s of starGroup.children) {
                s.position.multiplyScalar(ratio);
            }
        }
        if (nebulaGroup) {
            for (const n of nebulaGroup.children) {
                n.position.multiplyScalar(ratio);
            }
        }
    }

    // Public API
    return {
        init,
        update,
        updateForMode
    };
})();
