// ============================================================
// TOWN MODULE (V1 Stub)
// ============================================================
// Owns: Town 3D environment, NPC sprites, zone switching.
// V1: Minimal clearing with shopkeeper. Full version adds
// sword master, magic vendor, traveling merchants, buildings.
//
// INTERFACE:
//   Town.init()    Town.update()    Town.enter()    Town.exit()
// ============================================================

const Town = (() => {
    'use strict';
    let built = false, townGroup = null, npcs = [];

    function init() { console.log('🏘️ Town ready'); }

    function build() {
        if (built) return; built = true;
        townGroup = new THREE.Group();
        const cx = 10000, cz = 10000;

        // Lighter grass patch
        const gTex = createPixelTexture(64, 64, (ctx, w, h) => {
            ctx.fillStyle = '#2d6b3f'; ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 60; i++) {
                ctx.fillStyle = ['#3a7d4f', '#357548', '#408855'][Math.floor(Math.random() * 3)];
                ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
            }
        });
        const gMesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshLambertMaterial({ map: gTex }));
        gMesh.rotation.x = -Math.PI / 2; gMesh.position.set(cx, 0, cz);
        townGroup.add(gMesh);

        // Shopkeeper
        const sTex = createPixelTexture(32, 48, (ctx) => {
            ctx.fillStyle = '#8b4513'; ctx.fillRect(8, 20, 16, 22);
            ctx.fillStyle = '#fad7a0'; ctx.fillRect(10, 6, 12, 14);
            ctx.fillStyle = '#654321'; ctx.fillRect(8, 2, 16, 8);
            ctx.fillStyle = '#000'; ctx.fillRect(12, 10, 3, 3); ctx.fillRect(17, 10, 3, 3);
            ctx.fillStyle = '#fad7a0'; ctx.fillRect(4, 22, 4, 10); ctx.fillRect(24, 22, 4, 10);
        });
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: sTex, transparent: true }));
        spr.scale.set(3, 4.5, 1); spr.position.set(cx + 5, 2.25, cz - 5);
        townGroup.add(spr); npcs.push({ sprite: spr, name: 'Shopkeeper' });
        scene.add(townGroup);
    }

    function enter() { build(); gameState.currentZone = 'town'; gameState.player.position.set(10000, 0, 10000); }
    function exit()  { gameState.currentZone = 'forest'; gameState.player.position.set(0, 0, 0); }
    function update() { /* NPC interactions, exit zone checks — expand later */ }

    return { init, update, enter, exit };
})();
