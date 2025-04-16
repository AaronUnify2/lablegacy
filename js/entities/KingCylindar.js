import { Enemy } from './enemy.js';

export class KingCylindar extends Enemy {
    constructor(scene, position, collisionManager, player) {
        // Call parent Enemy constructor
        super(scene, position, collisionManager, player);
        
        // Override default enemy settings
        this.health = 300;
        this.maxHealth = 300;
        this.moveSpeed = 0.5;
        this.turnSpeed = 1.0;
        this.attackDamage = 25;
        this.attackRange = 3;
        this.detectionRange = 25;
        this.collisionRadius = 1.5;
        this.isRangedAttacker = true;
        
        // Special King Cylindar properties
        this.isBoss = true;
        this.hasDroppedOrb = false;
        this.orbValue = 25; // Mana value when collected
        
        // State tracking
        this.state = 'idle';
        this.stateTime = 0;
        this.attackCooldown = 0;
        this.attackCooldownTime = 3; // Seconds between attacks
        this.phaseChangeHealth = 150; // Health threshold for phase 2
        this.currentPhase = 1;
        
        // Targeting properties
        this.lastKnownPlayerPosition = new THREE.Vector3();
        this.targetRotation = new THREE.Euler();
        
        // Create the 3D model
        this.createModel();
        
        // Initialize animations
        this.setupAnimations();
        
        // Set initial position
        this.group.position.copy(position);
        
        // For debugging
        this.debug = true;
        if (this.debug) console.log("King Cylindar spawned at", position);
    }
    
    createModel() {
        // Create main group to hold all meshes
        this.group = new THREE.Group();
        
        // Create material loader
        this.textureLoader = new THREE.TextureLoader();
        
        // Create geometries and materials
        this.createMainBody();
        this.createOrbRing();
        this.createEyes();
        this.createSaunaElements();
        this.createPsychedelicEffects();
        
        // Add shadow casting
        this.setShadowProperties(this.bodyMesh);
        
        // Add to scene
        this.scene.add(this.group);
    }
    
    createMainBody() {
        // Main cylindrical body
        const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.5, 9, 32, 8);
        
        // Psychedelic sauna-inspired material
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x885533, // Wood-like base color
            metalness: 0.3,
            roughness: 0.7,
            emissive: 0x331100,
            emissiveIntensity: 0.2,
        });
        
        // Create procedural texture for the wood grain
        this.applyWoodTexture(bodyMaterial);
        
        // Create the main body mesh
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.position.y = 4.5; // Offset to make bottom at y=0
        this.group.add(this.bodyMesh);
        
        // Add metal bands around the cylinder
        this.addMetalBands();
        
        // Add steam vents
        this.addSteamVents();
    }
    
    applyWoodTexture(material) {
        // Create a canvas for the wood texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Draw wood base color
        ctx.fillStyle = '#885533';
        ctx.fillRect(0, 0, 512, 512);
        
        // Add grain lines
        ctx.strokeStyle = '#663311';
        ctx.lineWidth = 2;
        
        // Vertical wood grain
        for (let x = 0; x < 512; x += 8) {
            const wobble = Math.sin(x * 0.1) * 10;
            ctx.beginPath();
            ctx.moveTo(x + wobble, 0);
            ctx.lineTo(x - wobble, 512);
            ctx.stroke();
        }
        
        // Add some darker knots
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 20 + 10;
            
            const gradient = ctx.createRadialGradient(x, y, 1, x, y, radius);
            gradient.addColorStop(0, '#552200');
            gradient.addColorStop(1, '#885533');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        // Apply texture to material
        material.map = texture;
        
        // Create bump map for wood grain
        const bumpCanvas = document.createElement('canvas');
        bumpCanvas.width = 512;
        bumpCanvas.height = 512;
        const bumpCtx = bumpCanvas.getContext('2d');
        
        // Draw base
        bumpCtx.fillStyle = '#888888';
        bumpCtx.fillRect(0, 0, 512, 512);
        
        // Add bumpy grain
        for (let x = 0; x < 512; x += 4) {
            const intensity = Math.random() * 50 + 100;
            bumpCtx.strokeStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;
            bumpCtx.lineWidth = 2 + Math.random() * 2;
            
            bumpCtx.beginPath();
            bumpCtx.moveTo(x, 0);
            
            // Create wavy line
            for (let y = 0; y < 512; y += 20) {
                const xOffset = Math.sin(y * 0.05) * 5 + Math.random() * 4 - 2;
                bumpCtx.lineTo(x + xOffset, y);
            }
            
            bumpCtx.stroke();
        }
        
        // Create bump texture
        const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
        bumpTexture.wrapS = THREE.RepeatWrapping;
        bumpTexture.wrapT = THREE.RepeatWrapping;
        bumpTexture.repeat.set(2, 2);
        
        // Apply bump texture
        material.bumpMap = bumpTexture;
        material.bumpScale = 0.05;
    }
    
    addMetalBands() {
        // Create metal band material
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xaa8866,
            metalness: 0.8,
            roughness: 0.3,
            emissive: 0x554433,
            emissiveIntensity: 0.2
        });
        
        // Add several metal bands at different heights
        const bandHeights = [1, 3.5, 6, 8];
        const bandWidth = 0.3;
        
        bandHeights.forEach(height => {
            const bandGeometry = new THREE.TorusGeometry(1.55, bandWidth, 16, 32);
            const band = new THREE.Mesh(bandGeometry, metalMaterial);
            band.rotation.x = Math.PI / 2; // Rotate to wrap around cylinder
            band.position.y = height;
            this.bodyMesh.add(band);
            
            // Add rivets to bands
            this.addRivetsToBand(band, bandWidth);
            
            // Add some runes or symbols to bands
            if (height === 3.5 || height === 6) {
                this.addRunesToBand(band, bandWidth);
            }
        });
    }
    
    addRivetsToBand(band, bandWidth) {
        const rivetMaterial = new THREE.MeshStandardMaterial({
            color: 0xccbbaa,
            metalness: 0.9,
            roughness: 0.3
        });
        
        // Add rivets around the band
        const rivetCount = 16;
        const rivetRadius = bandWidth * 0.4;
        
        for (let i = 0; i < rivetCount; i++) {
            const angle = (i / rivetCount) * Math.PI * 2;
            const rivetGeometry = new THREE.SphereGeometry(rivetRadius, 8, 8);
            const rivet = new THREE.Mesh(rivetGeometry, rivetMaterial);
            
            // Position rivets on the band
            rivet.position.x = Math.cos(angle) * 1.55;
            rivet.position.z = Math.sin(angle) * 1.55;
            rivet.position.y = 0;
            
            band.add(rivet);
        }
    }
    
    addRunesToBand(band, bandWidth) {
        // Create glowing rune material
        const runeMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366ff,
            emissive: 0x3366ff,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.8
        });
        
        // Add runes at specific positions
        const runePositions = [0, Math.PI/2, Math.PI, Math.PI*3/2];
        
        runePositions.forEach((angle, index) => {
            // Create different rune shapes
            let runeGeometry;
            
            switch(index % 4) {
                case 0: // Triangle rune
                    runeGeometry = new THREE.CircleGeometry(bandWidth * 0.6, 3);
                    break;
                case 1: // Square rune
                    runeGeometry = new THREE.CircleGeometry(bandWidth * 0.5, 4);
                    break;
                case 2: // Pentagram rune
                    runeGeometry = new THREE.CircleGeometry(bandWidth * 0.6, 5);
                    break;
                case 3: // Circular rune
                    runeGeometry = new THREE.RingGeometry(bandWidth * 0.3, bandWidth * 0.6, 16);
                    break;
            }
            
            const rune = new THREE.Mesh(runeGeometry, runeMaterial.clone());
            
            // Position runes on the band
            rune.position.x = Math.cos(angle) * 1.55;
            rune.position.z = Math.sin(angle) * 1.55;
            rune.position.y = 0;
            
            // Orient runes to face outward
            rune.lookAt(
                band.position.clone().add(new THREE.Vector3(
                    Math.cos(angle) * 3, 
                    0, 
                    Math.sin(angle) * 3
                ))
            );
            
            // Store original colors for animation
            rune.userData.originalColor = new THREE.Color(0x3366ff);
            rune.userData.targetColor = new THREE.Color(0xff3366);
            rune.userData.colorProgress = 0;
            rune.userData.colorDirection = 1;
            
            band.add(rune);
            
            // Add to animated runes array
            if (!this.animatedRunes) this.animatedRunes = [];
            this.animatedRunes.push(rune);
        });
    }
    
    addSteamVents() {
        // Create steam vent material
        const ventMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.7,
            roughness: 0.3
        });
        
        // Create steam vents at different positions
        const ventPositions = [
            { angle: 0, height: 2 },
            { angle: Math.PI * 0.5, height: 5 },
            { angle: Math.PI, height: 2 },
            { angle: Math.PI * 1.5, height: 5 },
            { angle: Math.PI * 0.25, height: 7 },
            { angle: Math.PI * 0.75, height: 7 },
            { angle: Math.PI * 1.25, height: 7 },
            { angle: Math.PI * 1.75, height: 7 }
        ];
        
        ventPositions.forEach(pos => {
            // Create vent geometry - slightly protruding cylinder
            const ventGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16);
            const vent = new THREE.Mesh(ventGeometry, ventMaterial);
            
            // Position and rotate the vent
            const x = Math.cos(pos.angle) * 1.5;
            const z = Math.sin(pos.angle) * 1.5;
            vent.position.set(x, pos.height, z);
            
            // Orient vent to face outward
            vent.lookAt(new THREE.Vector3(x * 2, pos.height, z * 2));
            vent.rotateX(Math.PI / 2); // Adjust orientation
            
            this.bodyMesh.add(vent);
            
            // Add inner vent (darker)
            const innerVentGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
            const innerVentMaterial = new THREE.MeshStandardMaterial({
                color: 0x111111,
                metalness: 0.5,
                roughness: 0.8
            });
            const innerVent = new THREE.Mesh(innerVentGeometry, innerVentMaterial);
            innerVent.position.z = -0.1; // Position inside the main vent
            vent.add(innerVent);
            
            // Store vent for steam particle effects
            if (!this.steamVents) this.steamVents = [];
            this.steamVents.push({
                vent: vent,
                position: new THREE.Vector3(x, pos.height, z),
                lastEmitTime: 0,
                emitRate: 0.5 + Math.random() * 0.5, // Random emit rate
                active: Math.random() > 0.5 // Some vents start active, some inactive
            });
        });
    }
    
    createOrbRing() {
        // Create a ring of orbs around the center
        const orbCount = 8;
        this.orbs = [];
        this.orbGroup = new THREE.Group();
        this.bodyMesh.add(this.orbGroup);
        
        // Position the orb group
        this.orbGroup.position.y = 4; // Middle of the body
        
        for (let i = 0; i < orbCount; i++) {
            const angle = (i / orbCount) * Math.PI * 2;
            
            // Create orb geometry
            const orbGeometry = new THREE.SphereGeometry(0.35, 16, 16);
            
            // Generate color based on position - create a rainbow effect
            const hue = (i / orbCount) * 360;
            const color = new THREE.Color(`hsl(${hue}, 100%, 60%)`);
            
            // Create orb material with glow
            const orbMaterial = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 1.0,
                transparent: true,
                opacity: 0.8
            });
            
            // Create orb mesh
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);
            
            // Position around in a circle
            const orbDistance = 2.2;
            orb.position.x = Math.cos(angle) * orbDistance;
            orb.position.z = Math.sin(angle) * orbDistance;
            
            // Store orb data for animation
            orb.userData.originalY = 0;
            orb.userData.baseAngle = angle;
            orb.userData.orbIndex = i;
            orb.userData.originalColor = color.clone();
            orb.userData.floatSpeed = 0.5 + Math.random() * 0.5;
            orb.userData.floatHeight = 0.2 + Math.random() * 0.1;
            
            // Add to group
            this.orbGroup.add(orb);
            this.orbs.push(orb);
            
            // Add a point light to each orb
            const orbLight = new THREE.PointLight(color, 1, 3);
            orbLight.position.copy(orb.position);
            orb.userData.light = orbLight;
            this.orbGroup.add(orbLight);
            
            // Add a lens flare effect
            this.addOrbGlowEffect(orb, color);
        }
    }
    
    addOrbGlowEffect(orb, color) {
        // Add a glow effect around the orb
        const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        orb.add(glowMesh);
        
        // Store for animation
        orb.userData.glowMesh = glowMesh;
    }
    
    createEyes() {
        // Create eye group to hold all eye components
        this.eyeGroup = new THREE.Group();
        this.bodyMesh.add(this.eyeGroup);
        
        // Position eyes near the top of the cylinder
        this.eyeGroup.position.y = 7.5;
        
        // Create materials
        const eyeSocketMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.7,
            roughness: 0.2,
            emissive: 0x000000
        });
        
        const eyeballMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.3
        });
        
        const irisMaterial = new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: 0xff0000,
            emissiveIntensity: 0.8
        });
        
        // Create left eye
        this.leftEyeSocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16),
            eyeSocketMaterial
        );
        this.leftEyeSocket.rotation.x = Math.PI / 2;
        this.leftEyeSocket.position.set(-0.8, 0, 1.3);
        this.eyeGroup.add(this.leftEyeSocket);
        
        this.leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            eyeballMaterial
        );
        this.leftEye.position.z = 0.1;
        this.leftEyeSocket.add(this.leftEye);
        
        this.leftIris = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            irisMaterial
        );
        this.leftIris.position.z = 0.2;
        this.leftEye.add(this.leftIris);
        
        // Create right eye
        this.rightEyeSocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16),
            eyeSocketMaterial
        );
        this.rightEyeSocket.rotation.x = Math.PI / 2;
        this.rightEyeSocket.position.set(0.8, 0, 1.3);
        this.eyeGroup.add(this.rightEyeSocket);
        
        this.rightEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            eyeballMaterial
        );
        this.rightEye.position.z = 0.1;
        this.rightEyeSocket.add(this.rightEye);
        
        this.rightIris = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            irisMaterial
        );
        this.rightIris.position.z = 0.2;
        this.rightEye.add(this.rightIris);
        
        // Add veins to eyes for more menacing look
        this.addEyeDetails();
    }
    
    addEyeDetails() {
        // Add pulsing veins to the eyes
        const veinMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.4
        });
        
        // Left eye veins
        this.leftEyeVeins = [];
        for (let i = 0; i < 5; i++) {
            const veinGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.3);
            const vein = new THREE.Mesh(veinGeometry, veinMaterial.clone());
            
            // Position veins at random angles on the eye
            const angle = Math.random() * Math.PI * 2;
            vein.position.x = Math.cos(angle) * 0.2;
            vein.position.y = Math.sin(angle) * 0.2;
            vein.position.z = 0.1;
            
            // Rotate veins to point outward
            vein.lookAt(new THREE.Vector3(vein.position.x * 2, vein.position.y * 2, 1));
            
            this.leftEye.add(vein);
            this.leftEyeVeins.push(vein);
            
            // Store original opacity for pulsing animation
            vein.userData.originalOpacity = 0.4;
        }
        
        // Right eye veins
        this.rightEyeVeins = [];
        for (let i = 0; i < 5; i++) {
            const veinGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.3);
            const vein = new THREE.Mesh(veinGeometry, veinMaterial.clone());
            
            // Position veins at random angles on the eye
            const angle = Math.random() * Math.PI * 2;
            vein.position.x = Math.cos(angle) * 0.2;
            vein.position.y = Math.sin(angle) * 0.2;
            vein.position.z = 0.1;
            
            // Rotate veins to point outward
            vein.lookAt(new THREE.Vector3(vein.position.x * 2, vein.position.y * 2, 1));
            
            this.rightEye.add(vein);
            this.rightEyeVeins.push(vein);
            
            // Store original opacity for pulsing animation
            vein.userData.originalOpacity = 0.4;
        }
    }
    
    createSaunaElements() {
        // Add sauna-inspired elements
        this.addSaunaRocks();
        this.addHeatingElements();
    }
    
    addSaunaRocks() {
        // Create a ring of "hot rocks" at the top of the cylinder
        const rockGroup = new THREE.Group();
        this.bodyMesh.add(rockGroup);
        rockGroup.position.y = 9.2; // Top of cylinder
        
        // Rock materials
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.1,
            roughness: 0.9
        });
        
        const hotRockMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            emissive: 0xff4400,
            emissiveIntensity: 0.5,
            metalness: 0.1,
            roughness: 0.9
        });
        
        // Create a circle of rocks
        const rockCount = 12;
        this.rocks = [];
        
        for (let i = 0; i < rockCount; i++) {
            const angle = (i / rockCount) * Math.PI * 2;
            
            // Create rock geometry with some randomness
            const rockSize = 0.15 + Math.random() * 0.15;
            const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
            
            // 60% chance of a hot rock, 40% chance of a regular rock
            const isHotRock = Math.random() < 0.6;
            const material = isHotRock ? hotRockMaterial.clone() : rockMaterial.clone();
            
            const rock = new THREE.Mesh(rockGeometry, material);
            
            // Position in a circle with some randomness
            const radius = 1.3 + (Math.random() * 0.2 - 0.1);
            rock.position.x = Math.cos(angle) * radius;
            rock.position.z = Math.sin(angle) * radius;
            rock.position.y = Math.random() * 0.1; // Small y variation
            
            // Random rotation
            rock.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            // Store data for animation
            rock.userData.isHot = isHotRock;
            rock.userData.originalIntensity = isHotRock ? 0.5 : 0;
            rock.userData.pulseSpeed = 0.5 + Math.random() * 1.5;
            
            rockGroup.add(rock);
            this.rocks.push(rock);
            
            // Add a point light for hot rocks
            if (isHotRock) {
                const rockLight = new THREE.PointLight(0xff4400, 0.5, 1);
                rockLight.position.copy(rock.position);
                rock.userData.light = rockLight;
                rockGroup.add(rockLight);
            }
        }
    }
    
    addHeatingElements() {
        // Add heating coils visible through grates
        const heatingGroup = new THREE.Group();
        this.bodyMesh.add(heatingGroup);
        
        // Heating element material - glowing red
        const heatingMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.8,
            metalness: 0.7,
            roughness: 0.3
        });
        
        // Grate material
        const grateMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });
        
        // Add heating elements at different positions
        const heatingPositions = [
            { angle: Math.PI * 0.25, height: 2.5 },
            { angle: Math.PI * 0.75, height: 2.5 },
            { angle: Math.PI * 1.25, height: 2.5 },
            { angle: Math.PI * 1.75, height: 2.5 }
        ];
        
        this.heatingElements = [];
        
        heatingPositions.forEach(pos => {
            // Create grate
            const grateGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.05);
            const grate = new THREE.Mesh(grateGeometry, grateMaterial);
            
            // Position and rotate the grate
            const x = Math.cos(pos.angle) * 1.5;
            const z = Math.sin(pos.angle) * 1.5;
            grate.position.set(x, pos.height, z);
            
            // Orient grate to face outward
            grate.lookAt(new THREE.Vector3(x * 2, pos.height, z * 2));
            
            heatingGroup.add(grate);
            
            // Add grate bars
            for (let i = 0; i < 4; i++) {
                const barGeometry = new THREE.BoxGeometry(0.7, 0.08, 0.05);
                const bar = new THREE.Mesh(barGeometry, grateMaterial);
                bar.position.y = -0.2 + i * 0.15;
                grate.add(bar);
            }
            
            // Add heating coil behind grate
            const coilGeometry = new THREE.TorusGeometry(0.2, 0.03, 8, 24, Math.PI * 2);
            const coil = new THREE.Mesh(coilGeometry, heatingMaterial);
            coil.position.z = -0.1;
            grate.add(coil);
            
            // Add another smaller coil
            const innerCoilGeometry = new THREE.TorusGeometry(0.1, 0.02, 8, 16, Math.PI * 2);
            const innerCoil = new THREE.Mesh(innerCoilGeometry, heatingMaterial);
            innerCoil.position.z = -0.15;
            grate.add(innerCoil);
            
            // Add light
            const coilLight = new THREE.PointLight(0xff5500, 1.2, 2);
            coilLight.position.z = -0.2;
            grate.add(coilLight);
            
            // Store for animation
            coil.userData.light = coilLight;
            coil.userData.innerCoil = innerCoil;
            coil.userData.originalIntensity = 0.8;
            coil.userData.pulseSpeed = 1 + Math.random();
            
            this.heatingElements.push(coil);
        });
    }
    
    createPsychedelicEffects() {
        // Add psychedelic visual elements for the dream-control theme
        this.addEnergyCore();
        this.addFloatingSymbols();
    }
    
    addEnergyCore() {
        // Create a central energy core inside the cylinder
        // This will be visible through the runes and steam vents
        const coreGroup = new THREE.Group();
        this.bodyMesh.add(coreGroup);
        
        // Position the core in the center
        coreGroup.position.y = 4.5;
        
        // Core material - pulsing psychedelic energy
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0x88ddff, 
            transparent: true,
            opacity: 0.7
        });
        
        // Inner core
        const coreGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        this.energyCore = new THREE.Mesh(coreGeometry, coreMaterial);
        coreGroup.add(this.energyCore);
        
        // Add a point light inside the core
        this.coreLight = new THREE.PointLight(0x66ccff, 2, 10);
        this.coreLight.position.set(0, 0, 0);
        this.energyCore.add(this.coreLight);
        
        // Add swirling energy particles around the core
        this.createEnergyParticles(coreGroup);
    }
    
    createEnergyParticles(parentGroup) {
        const particleCount = 20;
        this.energyParticles = [];
        
        // Create particles with different colors
        const particleColors = [
            0x3366ff, // Blue
            0xff33cc, // Pink
            0x33ffcc, // Cyan
            0xffcc33  // Gold
        ];
        
        for (let i = 0; i < particleCount; i++) {
            // Randomly select a color
            const color = particleColors[Math.floor(Math.random() * particleColors.length)];
            
            const particleGeometry = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Set up particle properties for animation
            const radius = 0.8 + Math.random() * 0.4;
            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() - 0.5) * 2;
            
            // Initial position
            particle.position.set(
                Math.cos(angle) * radius,
                elevation,
                Math.sin(angle) * radius
            );
            
            // Store animation parameters
            particle.userData.radius = radius;
            particle.userData.angle = angle;
            particle.userData.elevation = elevation;
            particle.userData.angularSpeed = 0.5 + Math.random() * 1.5;
            particle.userData.elevationSpeed = 0.1 + Math.random() * 0.3;
            particle.userData.elevationDirection = Math.random() > 0.5 ? 1 : -1;
            
            // Store original color for pulsing effect
            particle.userData.originalColor = new THREE.Color(color);
            
            parentGroup.add(particle);
            this.energyParticles.push(particle);
        }
    }
    
    addFloatingSymbols() {
        // Add mysterious floating symbols that orbit the King Cylindar
        // representing its control over dreams
        
        const symbolGroup = new THREE.Group();
        this.group.add(symbolGroup);
        
        // Symbols will float at mid-height
        symbolGroup.position.y = 4.5;
        
        // Create symbol material with glow
        const symbolMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        // Create several dream-related symbols
        this.dreamSymbols = [];
        
        // Symbol 1: Moon
        const moonGeometry = new THREE.RingGeometry(0.3, 0.35, 32);
        const moon = new THREE.Mesh(moonGeometry, symbolMaterial.clone());
        moon.material.color.setHex(0xffff99);
        moon.position.set(3, 1, 0);
        symbolGroup.add(moon);
        this.dreamSymbols.push(moon);
        
        // Symbol 2: Star
        const starGeometry = this.createStarGeometry(0.4);
        const star = new THREE.Mesh(starGeometry, symbolMaterial.clone());
        star.material.color.setHex(0x99ffff);
        star.position.set(0, 1, 3);
        symbolGroup.add(star);
        this.dreamSymbols.push(star);
        
        // Symbol 3: Spiral
        const spiralGeometry = this.createSpiralGeometry();
        const spiral = new THREE.Mesh(spiralGeometry, symbolMaterial.clone());
        spiral.material.color.setHex(0xff99ff);
        spiral.position.set(-3, 0, 0);
        symbolGroup.add(spiral);
        this.dreamSymbols.push(spiral);
        
        // Symbol 4: Eye
        const eyeGeometry = new THREE.CircleGeometry(0.3, 32);
        const eye = new THREE.Mesh(eyeGeometry, symbolMaterial.clone());
        eye.material.color.setHex(0xffcc99);
        eye.position.set(0, -1, -3);
        symbolGroup.add(eye);
        
        // Add pupil to eye
        const pupilGeometry = new THREE.CircleGeometry(0.1, 32);
        const pupilMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        pupil.position.z = 0.01; // Slightly in front of eye
        eye.add(pupil);
        this.dreamSymbols.push(eye);
        
        // Set up orbital animation parameters for each symbol
        this.dreamSymbols.forEach((symbol, index) => {
            symbol.userData.orbitRadius = 3 + Math.random() * 0.5;
            symbol.userData.orbitSpeed = 0.1 + (index * 0.05);
            symbol.userData.orbitAngle = (index / this.dreamSymbols.length) * Math.PI * 2;
            symbol.userData.floatAmplitude = 0.2 + Math.random() * 0.2;
            symbol.userData.floatSpeed = 0.5 + Math.random() * 0.5;
            
            // Add glow effect to symbol
            this.addSymbolGlow(symbol, symbol.material.color);
        });
    }
    
    createStarGeometry(size) {
        const shape = new THREE.Shape();
        const points = 5;
        const outerRadius = size;
        const innerRadius = size * 0.4;
        
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i / (points * 2)) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }
        
        shape.closePath();
        
        const geometry = new THREE.ShapeGeometry(shape);
        return geometry;
    }
    
    createSpiralGeometry() {
        const shape = new THREE.Shape();
        const loops = 2;
        const points = 100;
        const maxRadius = 0.4;
        
        shape.moveTo(0, 0);
        
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2 * loops;
            const radius = (i / points) * maxRadius;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            shape.lineTo(x, y);
        }
        
        const geometry = new THREE.ShapeGeometry(shape);
        return geometry;
    }
    
    addSymbolGlow(symbol, color) {
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        // Clone the geometry but slightly larger
        let glowGeometry;
        
        if (symbol.geometry.type === 'ShapeGeometry') {
            // For shapes, we'll just use a simple circle for the glow
            glowGeometry = new THREE.CircleGeometry(0.5, 32);
        } else if (symbol.geometry.type === 'RingGeometry') {
            // For rings, make a slightly larger ring
            const params = symbol.geometry.parameters;
            glowGeometry = new THREE.RingGeometry(
                params.innerRadius - 0.1,
                params.outerRadius + 0.1,
                params.thetaSegments
            );
        } else {
            // For circles, make a slightly larger circle
            const radius = symbol.geometry.parameters.radius;
            glowGeometry = new THREE.CircleGeometry(radius * 1.5, 32);
        }
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.z = -0.01; // Slightly behind symbol
        symbol.add(glow);
        
        // Store for animation
        symbol.userData.glow = glow;
    }
    
    setupAnimations() {
        // Set up animation parameters for various parts
        
        // Set up orb ring animation
        this.orbAnimParams = {
            rotationSpeed: 0.2,
            wobbleAmount: 0.1,
            wobbleSpeed: 0.5,
            pulseSpeed: 0.3
        };
        
        // Set up eye animation
        this.eyeAnimParams = {
            blinkInterval: 5, // seconds between blinks
            blinkTime: 0, // current blink timer
            blinkDuration: 0.2, // how long a blink lasts
            isBlinking: false,
            lookSpeed: 0.5, // how fast eyes track player
            lookRange: 0.15 // how far eyes can rotate
        };
        
        // Set up core animation
        this.coreAnimParams = {
            pulseSpeed: 0.8,
            pulseAmount: 0.2,
            lightIntensity: 2
        };
        
        // Steam animation parameters
        this.steamAnimParams = {
            updateInterval: 0.2, // seconds between updates
            updateTimer: 0,
            ventSwitchChance: 0.05 // chance for a vent to change state
        };
        
        // Attack animation parameters
        this.attackAnimParams = {
            chargeTime: 1.0, // seconds to charge attack
            fireTime: 0.5, // seconds for attack animation
            cooldownTime: 2.0, // seconds after attack before next one
            currentState: 'idle',
            timer: 0
        };
    }
    
    update(deltaTime, camera) {
        if (!this.group) return;
        
        // Update the parent class behavior
        super.update(deltaTime, camera);
        
        // Update animations
        this.updateAnimations(deltaTime);
        
        // Update AI state
        this.updateState(deltaTime);
        
        // Check for phase change
        this.checkPhaseChange();
        
        // Update steam effects
        this.updateSteamVents(deltaTime);
    }
    
    updateAnimations(deltaTime) {
        // Update orb ring
        this.updateOrbRing(deltaTime);
        
        // Update eyes
        this.updateEyes(deltaTime);
        
        // Update energy core
        this.updateEnergyCore(deltaTime);
        
        // Update dream symbols
        this.updateDreamSymbols(deltaTime);
        
        // Update heating elements
        this.updateHeatingElements(deltaTime);
        
        // Update runes
        this.updateRunes(deltaTime);
        
        // Update hot rocks
        this.updateHotRocks(deltaTime);
    }
    
    updateOrbRing(deltaTime) {
        if (!this.orbGroup || !this.orbs) return;
        
        // Rotate the entire orb ring
        this.orbGroup.rotation.y += this.orbAnimParams.rotationSpeed * deltaTime;
        
        // Apply individual orb animations
        const time = performance.now() * 0.001; // Current time in seconds
        
        this.orbs.forEach((orb, index) => {
            // Calculate float offset based on time and orb index
            const floatOffset = Math.sin(
                time * orb.userData.floatSpeed + index
            ) * orb.userData.floatHeight;
            
            // Apply floating motion
            orb.position.y = orb.userData.originalY + floatOffset;
            
            // Pulse the orb color and intensity
            const pulseScale = 0.2 * Math.sin(time * this.orbAnimParams.pulseSpeed + index) + 0.8;
            
            // Adjust material emissive intensity
            orb.material.emissiveIntensity = pulseScale;
            
            // Update the orb light intensity
            if (orb.userData.light) {
                orb.userData.light.intensity = pulseScale * 1.5;
            }
            
            // Scale the glow effect
            if (orb.userData.glowMesh) {
                orb.userData.glowMesh.scale.set(
                    1 + pulseScale * 0.3,
                    1 + pulseScale * 0.3,
                    1
                );
            }
        });
    }
    
    updateEyes(deltaTime) {
        if (!this.leftEye || !this.rightEye) return;
        
        // Handle blinking
        this.eyeAnimParams.blinkTime += deltaTime;
        
        if (!this.eyeAnimParams.isBlinking && 
            this.eyeAnimParams.blinkTime >= this.eyeAnimParams.blinkInterval) {
            // Start a blink
            this.eyeAnimParams.isBlinking = true;
            this.eyeAnimParams.blinkTime = 0;
            
            // Scale eyes to simulate blink
            this.leftEye.scale.y = 0.1;
            this.rightEye.scale.y = 0.1;
        } else if (this.eyeAnimParams.isBlinking && 
                  this.eyeAnimParams.blinkTime >= this.eyeAnimParams.blinkDuration) {
            // End blink
            this.eyeAnimParams.isBlinking = false;
            
            // Reset eye scale
            this.leftEye.scale.y = 1;
            this.rightEye.scale.y = 1;
        }
        
        // Eye tracking - look at player if detected
        if (this.playerDetected) {
            // Calculate direction to player
            const toPlayer = new THREE.Vector3().subVectors(
                this.player.camera.position,
                this.group.position
            ).normalize();
            
            // Transform to local space
            const localToPlayer = toPlayer.clone().applyMatrix4(
                new THREE.Matrix4().getInverse(this.group.matrixWorld)
            );
            
            // Calculate target eye rotation
        

            const targetEyeX = THREE.MathUtils.clamp(localToPlayer.y * 0.3, -this.eyeAnimParams.lookRange, this.eyeAnimParams.lookRange);
            const targetEyeY = THREE.MathUtils.clamp(localToPlayer.x * 0.3, -this.eyeAnimParams.lookRange, this.eyeAnimParams.lookRange);
            
            // Smoothly rotate eyes toward player
            this.leftEye.rotation.x += (targetEyeX - this.leftEye.rotation.x) * this.eyeAnimParams.lookSpeed * deltaTime;
            this.leftEye.rotation.y += (targetEyeY - this.leftEye.rotation.y) * this.eyeAnimParams.lookSpeed * deltaTime;
            
            this.rightEye.rotation.x += (targetEyeX - this.rightEye.rotation.x) * this.eyeAnimParams.lookSpeed * deltaTime;
            this.rightEye.rotation.y += (targetEyeY - this.rightEye.rotation.y) * this.eyeAnimParams.lookSpeed * deltaTime;
            
            // Make irises slightly larger when looking at player
            this.leftIris.scale.set(1.2, 1.2, 1.2);
            this.rightIris.scale.set(1.2, 1.2, 1.2);
            
            // Pulse eye veins
            this.updateEyeVeins(deltaTime);
        } else {
            // Random idle eye movement
            const time = performance.now() * 0.001;
            
            this.leftEye.rotation.x = Math.sin(time * 0.5) * this.eyeAnimParams.lookRange * 0.3;
            this.leftEye.rotation.y = Math.cos(time * 0.7) * this.eyeAnimParams.lookRange * 0.3;
            
            this.rightEye.rotation.x = Math.sin(time * 0.5) * this.eyeAnimParams.lookRange * 0.3;
            this.rightEye.rotation.y = Math.cos(time * 0.7) * this.eyeAnimParams.lookRange * 0.3;
            
            // Reset iris size
            this.leftIris.scale.set(1, 1, 1);
            this.rightIris.scale.set(1, 1, 1);
        }
    }
    
    updateEyeVeins(deltaTime) {
        if (!this.leftEyeVeins || !this.rightEyeVeins) return;
        
        const time = performance.now() * 0.001;
        
        // Pulse veins with heartbeat effect
        const pulseIntensity = (Math.sin(time * 5) > 0.8) ? 
            0.8 + Math.sin(time * 20) * 0.2 : 
            0.4 + Math.sin(time * 2) * 0.1;
        
        // Apply to all veins
        [...this.leftEyeVeins, ...this.rightEyeVeins].forEach(vein => {
            if (vein.material) {
                vein.material.opacity = vein.userData.originalOpacity * pulseIntensity;
            }
        });
    }
    
    updateEnergyCore(deltaTime) {
        if (!this.energyCore || !this.coreLight) return;
        
        const time = performance.now() * 0.001;
        
        // Pulse the core
        const pulseScale = Math.sin(time * this.coreAnimParams.pulseSpeed) * this.coreAnimParams.pulseAmount + 1;
        this.energyCore.scale.set(pulseScale, pulseScale, pulseScale);
        
        // Vary the color slightly
        const hue = (time * 0.1) % 1;
        this.energyCore.material.color.setHSL(hue, 0.8, 0.7);
        this.coreLight.color.setHSL(hue, 0.8, 0.7);
        
        // Pulse the light intensity
        this.coreLight.intensity = this.coreAnimParams.lightIntensity * (0.8 + Math.sin(time * 2) * 0.2);
        
        // Update energy particles
        if (this.energyParticles) {
            this.energyParticles.forEach(particle => {
                // Update angle
                particle.userData.angle += particle.userData.angularSpeed * deltaTime;
                
                // Update elevation
                particle.userData.elevation += 
                    particle.userData.elevationSpeed * 
                    particle.userData.elevationDirection * 
                    deltaTime;
                
                // Reverse elevation direction if it gets too high/low
                if (Math.abs(particle.userData.elevation) > 1) {
                    particle.userData.elevationDirection *= -1;
                }
                
                // Update position
                particle.position.set(
                    Math.cos(particle.userData.angle) * particle.userData.radius,
                    particle.userData.elevation,
                    Math.sin(particle.userData.angle) * particle.userData.radius
                );
                
                // Pulse color
                const pulseColor = particle.userData.originalColor.clone();
                const saturationShift = 0.3 * Math.sin(time * 2 + particle.userData.angle);
                
                // Get HSL from original color
                const hsl = {};
                pulseColor.getHSL(hsl);
                
                // Modify saturation
                pulseColor.setHSL(hsl.h, Math.clamp(hsl.s + saturationShift, 0, 1), hsl.l);
                
                particle.material.color = pulseColor;
            });
        }
    }
    
    updateDreamSymbols(deltaTime) {
        if (!this.dreamSymbols) return;
        
        const time = performance.now() * 0.001;
        
        this.dreamSymbols.forEach(symbol => {
            // Update orbit position
            symbol.userData.orbitAngle += symbol.userData.orbitSpeed * deltaTime;
            
            symbol.position.x = Math.cos(symbol.userData.orbitAngle) * symbol.userData.orbitRadius;
            symbol.position.z = Math.sin(symbol.userData.orbitAngle) * symbol.userData.orbitRadius;
            
            // Add floating motion
            symbol.position.y = Math.sin(time * symbol.userData.floatSpeed) * symbol.userData.floatAmplitude;
            
            // Make symbols always face the camera if we have one
            if (this.player && this.player.camera) {
                symbol.lookAt(this.player.camera.position);
            }
            
            // Pulse the glow effect
            if (symbol.userData.glow) {
                const glowPulse = 0.7 + Math.sin(time * 2 + symbol.userData.orbitAngle) * 0.3;
                symbol.userData.glow.scale.set(glowPulse, glowPulse, 1);
                
                // Vary opacity
                symbol.userData.glow.material.opacity = 0.3 * glowPulse;
            }
        });
    }
    
    updateHeatingElements(deltaTime) {
        if (!this.heatingElements) return;
        
        const time = performance.now() * 0.001;
        
        this.heatingElements.forEach(element => {
            // Create pulsing effect for heating coils
            const pulseIntensity = 0.5 + Math.abs(Math.sin(time * element.userData.pulseSpeed)) * 0.5;
            
            // Update emissive intensity
            element.material.emissiveIntensity = element.userData.originalIntensity * pulseIntensity;
            
            // Update inner coil with slight delay
            if (element.userData.innerCoil) {
                element.userData.innerCoil.material.emissiveIntensity = 
                    element.userData.originalIntensity * Math.abs(Math.sin(time * element.userData.pulseSpeed + 0.2)) * 0.8;
            }
            
            // Update light intensity
            if (element.userData.light) {
                element.userData.light.intensity = 1.2 * pulseIntensity;
            }
        });
    }
    
    updateRunes(deltaTime) {
        if (!this.animatedRunes) return;
        
        const time = performance.now() * 0.001;
        
        this.animatedRunes.forEach(rune => {
            // Shift the rune color between original and target
            rune.userData.colorProgress += rune.userData.colorDirection * deltaTime * 0.5;
            
            // Reverse direction at limits
            if (rune.userData.colorProgress >= 1 || rune.userData.colorProgress <= 0) {
                rune.userData.colorDirection *= -1;
            }
            
            // Calculate current color
            const currentColor = new THREE.Color().lerpColors(
                rune.userData.originalColor,
                rune.userData.targetColor,
                rune.userData.colorProgress
            );
            
            // Apply color to material
            rune.material.color = currentColor;
            rune.material.emissive = currentColor;
            
            // Pulse emissive intensity
            rune.material.emissiveIntensity = 0.8 + Math.sin(time * 3) * 0.2;
        });
    }
    
    updateHotRocks(deltaTime) {
        if (!this.rocks) return;
        
        const time = performance.now() * 0.001;
        
        this.rocks.forEach(rock => {
            if (rock.userData.isHot) {
                // Create pulsing effect for hot rocks
                const pulseIntensity = 0.3 + Math.sin(time * rock.userData.pulseSpeed) * 0.2;
                
                // Update emissive intensity
                rock.material.emissiveIntensity = rock.userData.originalIntensity + pulseIntensity;
                
                // Update light
                if (rock.userData.light) {
                    rock.userData.light.intensity = 0.5 + pulseIntensity;
                }
            }
        });
    }
    
    updateSteamVents(deltaTime) {
        if (!this.steamVents) return;
        
        // Update timer
        this.steamAnimParams.updateTimer += deltaTime;
        
        // Check if it's time to update vents
        if (this.steamAnimParams.updateTimer >= this.steamAnimParams.updateInterval) {
            this.steamAnimParams.updateTimer = 0;
            
            // Process each vent
            this.steamVents.forEach(vent => {
                // Randomly decide if vent should change state
                if (Math.random() < this.steamAnimParams.ventSwitchChance) {
                    vent.active = !vent.active;
                }
                
                // If active, emit steam particles
                if (vent.active) {
                    this.emitSteamParticle(vent);
                }
            });
        }
    }
    
    emitSteamParticle(vent) {
        // Create a steam particle
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4
        });
        
        const steamParticle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Get world position and direction of the vent
        const ventWorldPos = new THREE.Vector3();
        const ventForward = new THREE.Vector3(0, 0, -1);
        
        vent.vent.getWorldPosition(ventWorldPos);
        ventForward.applyQuaternion(vent.vent.getWorldQuaternion(new THREE.Quaternion()));
        
        // Position particle at vent opening
        steamParticle.position.copy(ventWorldPos);
        steamParticle.position.addScaledVector(ventForward, 0.2);
        
        // Add small random offset
        steamParticle.position.x += (Math.random() - 0.5) * 0.1;
        steamParticle.position.y += (Math.random() - 0.5) * 0.1;
        steamParticle.position.z += (Math.random() - 0.5) * 0.1;
        
        // Add to scene
        this.scene.add(steamParticle);
        
        // Set up velocity - mainly in vent forward direction
        const velocity = ventForward.clone().multiplyScalar(1 + Math.random() * 0.5);
        
        // Add small random velocity components
        velocity.x += (Math.random() - 0.5) * 0.5;
        velocity.y += (Math.random() - 0.5) * 0.5 + 0.2; // Slight upward bias
        velocity.z += (Math.random() - 0.5) * 0.5;
        
        // Animate the steam particle
        const duration = 1 + Math.random() * 0.5; // 1-1.5 seconds
        const startTime = performance.now() * 0.001; // Current time in seconds
        const startScale = 1;
        const endScale = 2 + Math.random();
        
        const animate = () => {
            const currentTime = performance.now() * 0.001;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Move particle
            steamParticle.position.addScaledVector(velocity, 0.016); // Assuming ~60fps
            
            // Slow down velocity over time
            velocity.multiplyScalar(0.98);
            
            // Increase scale
            const scale = startScale + (endScale - startScale) * progress;
            steamParticle.scale.set(scale, scale, scale);
            
            // Fade out
            steamParticle.material.opacity = 0.4 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove particle when animation is complete
                this.scene.remove(steamParticle);
                steamParticle.material.dispose();
                steamParticle.geometry.dispose();
            }
        };
        
        // Start animation
        animate();
    }
    
    updateState(deltaTime) {
        // Update state time
        this.stateTime += deltaTime;
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Process current state
        switch (this.state) {
            case 'idle':
                this.checkForPlayer();
                break;
                
                case 'patrol':
                this.patrolBehavior(deltaTime);
                this.checkForPlayer();
                break;
                
            case 'chase':
                this.chaseBehavior(deltaTime);
                this.tryAttack();
                break;
                
            case 'attack':
                this.attackBehavior(deltaTime);
                break;
                
            case 'stunned':
                if (this.stateTime > 3) {
                    this.state = 'chase';
                    this.stateTime = 0;
                }
                break;
                
            case 'dying':
                this.dyingBehavior(deltaTime);
                break;
                
            case 'dead':
                // Do nothing when dead
                break;
        }
    }
    
    checkForPlayer() {
        // Check if player is in detection range
        if (this.player && this.player.camera) {
            const distanceToPlayer = this.group.position.distanceTo(this.player.camera.position);
            
            // Player is within detection range
            if (distanceToPlayer < this.detectionRange) {
                // Check if we have line of sight
                if (this.hasLineOfSightToPlayer()) {
                    // Player detected, chase them
                    this.playerDetected = true;
                    this.lastKnownPlayerPosition.copy(this.player.camera.position);
                    
                    if (this.state !== 'chase' && this.state !== 'attack') {
                        this.state = 'chase';
                        this.stateTime = 0;
                        
                        // Increase intensity of psychedelic effects when alerted
                        this.activateAlertEffects();
                    }
                    
                    return true;
                }
            }
            
            // Player not detected
            this.playerDetected = false;
            
            // If we were chasing but lost the player, patrol for a while
            if (this.state === 'chase') {
                this.state = 'patrol';
                this.stateTime = 0;
                
                // Return to normal intensity effects
                this.deactivateAlertEffects();
            }
        }
        
        return false;
    }
    
    hasLineOfSightToPlayer() {
        if (!this.player || !this.player.camera || !this.collisionManager) return false;
        
        // Calculate direction to player
        const playerPos = this.player.camera.position.clone();
        const cylindarPos = new THREE.Vector3(
            this.group.position.x,
            this.group.position.y + 4.5, // Eye level
            this.group.position.z
        );
        const direction = new THREE.Vector3().subVectors(playerPos, cylindarPos).normalize();
        
        // Set up raycaster
        const raycaster = new THREE.Raycaster(cylindarPos, direction);
        
        // Get all scene colliders except the enemy's own colliders
        const colliders = this.collisionManager.getColliderObjects().filter(obj => {
            return obj !== this.bodyMesh && obj.parent !== this.group;
        });
        
        // Cast ray
        const intersects = raycaster.intersectObjects(colliders, true);
        
        if (intersects.length > 0) {
            // Check if player is closer than the first hit
            const distanceToPlayer = cylindarPos.distanceTo(playerPos);
            const distanceToObstacle = intersects[0].distance;
            
            // Player is visible if they're closer than any obstacle
            return distanceToPlayer < distanceToObstacle;
        }
        
        // No obstacles between us and the player
        return true;
    }
    
    activateAlertEffects() {
        // Intensify all psychedelic effects when alerted
        
        // Speed up orb rotation
        this.orbAnimParams.rotationSpeed *= 2;
        
        // Make energy core pulse faster
        this.coreAnimParams.pulseSpeed *= 1.5;
        this.coreAnimParams.lightIntensity *= 1.5;
        
        // Make eyes glow more intensely
        if (this.leftIris && this.rightIris) {
            this.leftIris.material.emissiveIntensity = 1.5;
            this.rightIris.material.emissiveIntensity = 1.5;
        }
        
        // Intensify rune animations
        if (this.animatedRunes) {
            this.animatedRunes.forEach(rune => {
                rune.material.emissiveIntensity = 1.5;
            });
        }
        
        // Increase steam from vents
        this.steamAnimParams.updateInterval *= 0.5; // Update twice as frequently
    }
    
    deactivateAlertEffects() {
        // Return psychedelic effects to normal levels
        
        // Reset orb rotation
        this.orbAnimParams.rotationSpeed = 0.2;
        
        // Reset energy core
        this.coreAnimParams.pulseSpeed = 0.8;
        this.coreAnimParams.lightIntensity = 2;
        
        // Reset eye glow
        if (this.leftIris && this.rightIris) {
            this.leftIris.material.emissiveIntensity = 0.8;
            this.rightIris.material.emissiveIntensity = 0.8;
        }
        
        // Reset rune animations
        if (this.animatedRunes) {
            this.animatedRunes.forEach(rune => {
                rune.material.emissiveIntensity = 1.0;
            });
        }
        
        // Reset steam effects
        this.steamAnimParams.updateInterval = 0.2;
    }
    
    patrolBehavior(deltaTime) {
        // Simple patrol behavior
        // Move in a circle around the spawn point
        const patrolRadius = 5;
        const patrolSpeed = 0.5;
        
        // Calculate target position in patrol circle
        const angle = this.stateTime * patrolSpeed;
        const targetX = this.spawnPosition.x + Math.cos(angle) * patrolRadius;
        const targetZ = this.spawnPosition.z + Math.sin(angle) * patrolRadius;
        
        const targetPosition = new THREE.Vector3(targetX, this.group.position.y, targetZ);
        
        // Move toward target
        this.moveTowardPosition(targetPosition, deltaTime);
    }
    
    chaseBehavior(deltaTime) {
        // Chase the player
        if (this.playerDetected && this.player && this.player.camera) {
            // Update last known position
            this.lastKnownPlayerPosition.copy(this.player.camera.position);
        }
        
        // Move toward last known player position
        this.moveTowardPosition(this.lastKnownPlayerPosition, deltaTime);
        
        // If we're close enough, try to attack
        const distanceToTarget = this.group.position.distanceTo(this.lastKnownPlayerPosition);
        
        if (distanceToTarget <= this.attackRange) {
            // In range, try to attack if cooldown is ready
            if (this.attackCooldown <= 0) {
                this.state = 'attack';
                this.stateTime = 0;
                this.attackAnimParams.currentState = 'charging';
            }
        }
    }
    
    moveTowardPosition(position, deltaTime) {
        // Calculate direction to target
        const direction = new THREE.Vector3().subVectors(
            position,
            this.group.position
        ).normalize();
        
        // Calculate target rotation based on direction
        this.targetRotation = new THREE.Euler(0, Math.atan2(direction.x, direction.z), 0);
        
        // Smoothly rotate toward target
        this.smoothRotate(deltaTime);
        
        // Move forward based on current rotation
        const moveSpeed = this.moveSpeed * deltaTime;
        const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.group.rotation);
        
        // Apply movement
        const newPosition = this.group.position.clone().addScaledVector(forward, moveSpeed);
        
        // Check for collision before moving
        if (this.collisionManager) {
            const collision = this.collisionManager.checkCollision(
                newPosition, 
                this.collisionRadius
            );
            
            if (!collision.collides) {
                // Move to new position if no collision
                this.group.position.copy(newPosition);
            }
        } else {
            // No collision manager, just move
            this.group.position.copy(newPosition);
        }
    }
    
    smoothRotate(deltaTime) {
        // Smoothly interpolate current rotation toward target rotation
        const step = this.turnSpeed * deltaTime;
        
        // Get current y rotation
        const currentY = this.group.rotation.y;
        let targetY = this.targetRotation.y;
        
        // Handle the discontinuity at +/-PI
        if (Math.abs(targetY - currentY) > Math.PI) {
            if (targetY > currentY) {
                targetY -= Math.PI * 2;
            } else {
                targetY += Math.PI * 2;
            }
        }
        
        // Interpolate
        const newY = currentY + Math.clamp(targetY - currentY, -step, step);
        
        // Apply rotation
        this.group.rotation.y = newY;
    }
    
    tryAttack() {
        // Try to attack the player if in range and cooldown is ready
        if (this.attackCooldown <= 0 && this.playerDetected) {
            const distanceToPlayer = this.group.position.distanceTo(this.player.camera.position);
            
            if (distanceToPlayer <= this.attackRange) {
                this.state = 'attack';
                this.stateTime = 0;
                this.attackAnimParams.currentState = 'charging';
            }
        }
    }
    
    attackBehavior(deltaTime) {
        // Handle attack sequence
        switch (this.attackAnimParams.currentState) {
            case 'charging':
                // Charging attack
                if (this.stateTime >= this.attackAnimParams.chargeTime) {
                    // Fire attack
                    this.attackAnimParams.currentState = 'firing';
                    this.stateTime = 0;
                    this.fireAttack();
                } else {
                    // Continue charging
                    this.chargeAttack(this.stateTime / this.attackAnimParams.chargeTime);
                }
                break;
                
            case 'firing':
                // Attack is firing
                if (this.stateTime >= this.attackAnimParams.fireTime) {
                    // Attack finished, go to cooldown
                    this.attackAnimParams.currentState = 'cooldown';
                    this.stateTime = 0;
                }
                break;
                
            case 'cooldown':
                // Cooldown after attack
                if (this.stateTime >= this.attackAnimParams.cooldownTime) {
                    // Cooldown finished, go back to chase
                    this.state = 'chase';
                    this.stateTime = 0;
                    this.attackCooldown = this.attackCooldownTime;
                }
                break;
        }
    }
    
    chargeAttack(progress) {
        // Visual effects for charging attack
        if (!this.orbs || !this.energyCore) return;
        
        // Make orbs converge toward the front
        this.orbs.forEach(orb => {
            // Original orbit position based on baseAngle
            const baseAngle = orb.userData.baseAngle;
            const targetAngle = 0; // Front of the cylinder
            
            // Interpolate angles based on charge progress
            let currentAngle = baseAngle + (targetAngle - baseAngle) * progress;
            
            // Add wobble during charge
            currentAngle += Math.sin(performance.now() * 0.01) * 0.2 * progress;
            
            // Calculate position
            const orbDistance = 2.2 * (1 - progress * 0.3); // Pull slightly inward
            
            orb.position.x = Math.cos(currentAngle) * orbDistance;
            orb.position.z = Math.sin(currentAngle) * orbDistance;
            
            // Move forward slightly
            orb.position.z += progress * 0.5;
            
            // Increase light intensity
            if (orb.userData.light) {
                orb.userData.light.intensity = 1 + progress * 2;
            }
        });
        
        // Make core pulse faster as charge builds
        this.coreAnimParams.pulseSpeed = 0.8 + progress * 2;
        this.coreLight.intensity = 2 + progress * 3;
        
        // Add charging particles if progress > 50%
        if (progress > 0.5 && Math.random() > 0.7) {
            this.createChargingParticle();
        }
    }
    
    createChargingParticle() {
        // Create a particle that emanates from front of body
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleColor = new THREE.Color(0x3366ff);
        
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: particleColor,
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position at front of cylinder with some randomness
        const angle = (Math.random() - 0.5) * Math.PI * 0.5;
        const radius = 1.5 + Math.random() * 0.5;
        const height = 3 + Math.random() * 3;
        
        // Get world position and rotation
        const worldPos = new THREE.Vector3();
        this.bodyMesh.getWorldPosition(worldPos);
        const rotation = this.group.rotation.y;
        
        // Calculate position
        particle.position.set(
            worldPos.x + Math.sin(rotation + angle) * radius,
            worldPos.y + height,
            worldPos.z + Math.cos(rotation + angle) * radius
        );
        
        // Add to scene
        this.scene.add(particle);
        
        // Calculate direction to central front point
        const targetPos = new THREE.Vector3(
            worldPos.x + Math.sin(rotation) * 2,
            worldPos.y + 4.5,
            worldPos.z + Math.cos(rotation) * 2
        );
        
        const direction = new THREE.Vector3().subVectors(targetPos, particle.position).normalize();
        
        // Set up animation
        const duration = 0.5;
        const startTime = performance.now() * 0.001;
        
        const animate = () => {
            const currentTime = performance.now() * 0.001;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Move particle
            particle.position.addScaledVector(direction, 0.1);
            
            // Fade out
            particle.material.opacity = 0.7 * (1 - progress);
            
            // Scale down
            const scale = 1 - progress * 0.5;
            particle.scale.set(scale, scale, scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove particle
                this.scene.remove(particle);
                particle.material.dispose();
                particle.geometry.dispose();
            }
        };
        
        animate();
    }
    
    fireAttack() {
        // Fire the charged attack
        if (!this.player || !this.player.camera) return;
        
        // Get the attack target position - the player's current position
        const targetPosition = this.player.camera.position.clone();
        
        // Calculate direction to target
        const startPosition = new THREE.Vector3();
        this.bodyMesh.getWorldPosition(startPosition);
        startPosition.y += 4.5; // Eye level
        
        const direction = new THREE.Vector3().subVectors(targetPosition, startPosition).normalize();
        
        // Create attack visual effects
        this.createAttackVisuals(startPosition, targetPosition);
        
        // Apply damage to player if in range
        const distanceToPlayer = startPosition.distanceTo(targetPosition);
        
        if (distanceToPlayer <= this.attackRange * 1.5) { // Slightly generous range
            // Deal damage to player
            if (this.player.takeDamage) {
                this.player.takeDamage(this.attackDamage);
            }
        }
    }
    
    createAttackVisuals(start, end) {
        // Create beam effect
        const distance = start.distanceTo(end);
        const beamGeometry = new THREE.CylinderGeometry(0.2, 0.5, distance, 8, 1);
        
        // Rotate to point from start to end
        beamGeometry.rotateX(Math.PI / 2);
        
        // Create beam material with psychedelic effect
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.7
        });
        
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        
        // Position beam
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        beam.position.copy(midpoint);
        
        // Orient beam
        beam.lookAt(end);
        
        // Add to scene
        this.scene.add(beam);
        
        // Add impact effect at target
        this.createAttackImpact(end);
        
        // Animate beam
        const duration = 0.5;
        const startTime = performance.now() * 0.001;
        
        const animate = () => {
            const currentTime = performance.now() * 0.001;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Fade out
            beam.material.opacity = 0.7 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove beam
                this.scene.remove(beam);
                beam.material.dispose();
                beam.geometry.dispose();
            }
        };
        
        animate();
    }
    
    createAttackImpact(position) {
        // Create an impact effect at the target position
        const impactGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const impactMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.7
        });
        
        const impact = new THREE.Mesh(impactGeometry, impactMaterial);
        impact.position.copy(position);
        
        // Add to scene
        this.scene.add(impact);
        
        // Add light
        const impactLight = new THREE.PointLight(0x3366ff, 3, 5);
        impactLight.position.copy(position);
        this.scene.add(impactLight);
        
        // Add particles
        this.createImpactParticles(position);
        
        // Animate impact
        const duration = 0.7;
        const startTime = performance.now() * 0.001;
        
        const animate = () => {
            const currentTime = performance.now() * 0.001;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade out
            const scale = 1 + progress * 3;
            impact.scale.set(scale, scale, scale);
            
            impact.material.opacity = 0.7 * (1 - progress);
            
            // Fade out light
            if (impactLight) {
                impactLight.intensity = 3 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove impact
                this.scene.remove(impact);
                this.scene.remove(impactLight);
                
                impact.material.dispose();
                impact.geometry.dispose();
            }
        };
        
        animate();
    }
    
    createImpactParticles(position) {
        const particleCount = 10;
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0x3366ff,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Add to scene
            this.scene.add(particle);
            
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI - Math.PI / 2;
            const speed = 0.1 + Math.random() * 0.2;
            
            const direction = new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation),
                Math.sin(elevation),
                Math.sin(angle) * Math.cos(elevation)
            ).normalize().multiplyScalar(speed);
            
            // Animate particle
            const duration = 0.5 + Math.random() * 0.5;
            const startTime = performance.now() * 0.001;
            
            const animate = () => {
                const currentTime = performance.now() * 0.001;
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Move particle
                particle.position.addScaledVector(direction, 1);
                
                // Slow down
                direction.multiplyScalar(0.95);
                
                // Fade out
                particle.material.opacity = 0.7 * (1 - progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Remove particle
                    this.scene.remove(particle);
                    particle.material.dispose();
                    particle.geometry.dispose();
                }
            };
            
            animate();
        }
    }
    
    checkPhaseChange() {
        // Check for phase transition based on health
        if (this.currentPhase === 1 && this.health <= this.phaseChangeHealth) {
            this.currentPhase = 2;
            this.transitionToPhaseTwo();
        }
    }
    
    transitionToPhaseTwo() {
        // Transition to more aggressive second phase
        if (this.debug) console.log("King Cylindar transitioning to phase two!");
        
        // Increase attributes
        this.moveSpeed *= 1.3;
        this.attackRange *= 1.2;
        this.attackDamage *= 1.25;
        this.attackCooldownTime *= 0.7; // Faster attacks
        
        // Visual changes
        this.applyPhaseTwoVisuals();
        
        // Force attack after phase change
        this.state = 'attack';
        this.stateTime = 0;
        this.attackAnimParams.currentState = 'charging';
    }
    
    applyPhaseTwoVisuals() {
        // Change colors to more intense values
        
        // Change core color to red
        if (this.energyCore) {
            this.energyCore.material.color.setHex(0xff3333);
            this.coreLight.color.setHex(0xff3333);
        }
        
        // Change orb colors to more intense
        if (this.orbs) {
            this.orbs.forEach(orb => {
                // Get current HSL
                const color = orb.material.color;
                const hsl = {};
                color.getHSL(hsl);
                
                // Increase saturation and brightness
                color.setHSL(hsl.h, 1.0, 0.7);
                
                // Update color for light too
                if (orb.userData.light) {
                    orb.userData.light.color = color.clone();
                }
                
                // Store new original color
                orb.userData.originalColor = color.clone();
            });
        }
        
        // Change eye color to red
        if (this.leftIris && this.rightIris) {
            this.leftIris.material.color.setHex(0xff0000);
            this.leftIris.material.emissive.setHex(0xff0000);
            this.rightIris.material.color.setHex(0xff0000);
            this.rightIris.material.emissive.setHex(0xff0000);
        }
        
        // Make runes pulse faster
        if (this.animatedRunes) {
            this.animatedRunes.forEach(rune => {
                // Change color to red
                rune.userData.originalColor.setHex(0xff3333);
                rune.userData.targetColor.setHex(0xff6666);
                
                // Increase emission
                rune.material.emissiveIntensity = 1.5;
            });
        }
        
        // Increase steam rate
        this.steamAnimParams.updateInterval *= 0.5;
        
        // Add phase transition effect
        this.createPhaseTransitionEffect();
    }
    
    createPhaseTransitionEffect() {
        // Create dramatic phase transition effect
        const shockwaveGeometry = new THREE.RingGeometry(0.5, 0.7, 32);
        const shockwaveMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
        
        // Position at center of body
        const centerPosition = new THREE.Vector3();
        this.bodyMesh.getWorldPosition(centerPosition);
        centerPosition.y += 4.5; // Center height
        
        shockwave.position.copy(centerPosition);
        shockwave.rotation.x = Math.PI / 2; // Horizontal ring
        
        this.scene.add(shockwave);
        
        // Add light flash
        const flashLight = new THREE.PointLight(0xff3333, 5, 15);
        flashLight.position.copy(centerPosition);
        this.scene.add(flashLight);
        
        // Animate shockwave
        const duration = 1.5;
        const startTime = performance.now() * 0.001;
        
        const animate = () => {
            const currentTime = performance.now() * 0.001;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand ring
            const scale = 1 + progress * 20;
            shockwave.scale.set(scale, scale, scale);
            
            // Fade out
            shockwave.material.opacity = 0.8 * (1 - progress);
            
            // Pulse light
            if (flashLight) {
                if (progress < 0.2) {
                    // Initial flash
                    flashLight.intensity = 5 + progress * 20;
                } else {
                    // Fade out
                    flashLight.intensity = 5 * (1 - progress);
                }
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove shockwave and light
                this.scene.remove(shockwave);
                this.scene.remove(flashLight);
                
                shockwave.material.dispose();
                shockwave.geometry.dispose();
            }
        };
        
        animate();
    }
    
    // Called when the enemy is damaged
    takeDamage(amount) {
        if (this.state === 'dead') return false;
        
        // Apply damage
        this.health -= amount;
        
        // Check for death
        if (this.health <= 0) {
            this.health = 0;
            this.state = 'dying';
            this.stateTime = 0;
            if (this.debug) console.log("King Cylindar killed!");
            return true;
        }
        
        // Apply hit effects
        this.createHitEffect();
        
        // Check for phase change
        this.checkPhaseChange();
        
        // Briefly stun on big hits (25% chance)
        if (amount > 50 && Math.random() < 0.25) {
            this.state = 'stunned';
            this.stateTime = 0;
        }
        
        return false; // Not killed
    }
    
    createHitEffect() {
        // Visual effect for taking damage
        
        // Flash the whole body
        if (this.bodyMesh && this.bodyMesh.material) {
            const originalColor = this.bodyMesh.material.color.clone();
            const originalEmissive = this.bodyMesh.material.emissive.clone();
            
            // Flash white
            this.bodyMesh.material.color.setHex(0xffffff);
            this.bodyMesh.material.emissive.setHex(0xffffff);
            this.bodyMesh.material.emissiveIntensity = 0.5;
            
            // Return to original after short delay
            setTimeout(() => {
                if (this.bodyMesh && this.bodyMesh.material) {
                    this.bodyMesh.material.color.copy(originalColor);
                    this.bodyMesh.material.emissive.copy(originalEmissive);
                    this.bodyMesh.material.emissiveIntensity = 0.2;
                }
            }, 100);
        }
        
        // Create particles at hit locations
        const particleCount = 5;
        const centerPosition = new THREE.Vector3();
        this.bodyMesh.getWorldPosition(centerPosition);
        
        for (let i = 0; i < particleCount; i++) {
            // Random position on cylinder
            const angle = Math.random() * Math.PI * 2;
            const height = Math.random() * 8;
            
            const position = new THREE.Vector3(
                centerPosition.x + Math.cos(angle) * 1.5,
                centerPosition.y + height,
                centerPosition.z + Math.sin(angle) * 1.5
            );
            
            // Create particle
            const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            this.scene.add(particle);
            
            // Add velocity - outward direction
            const direction = new THREE.Vector3().subVectors(position, centerPosition).normalize();
            direction.y += 0.5; // Add upward component
            
            // Randomize speed
            const speed = 0.05 + Math.random() * 0.1;
            const velocity = direction.multiplyScalar(speed);
            
            // Animate particle
            const duration = 0.5 + Math.random() * 0.5;
            const startTime = performance.now() * 0.001;
            
            const animate = () => {
                const currentTime = performance.now() * 0.001;
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Move particle
                particle.position.addScaledVector(velocity, 1);
                
                // Apply gravity
                velocity.y -= 0.001;
                
                // Fade out
                particle.material.opacity = 0.8 * (1 - progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Remove particle
                    this.scene.remove(particle);
                    particle.material.dispose();
                    particle.geometry.dispose();
                }
            };
            
            animate();
        }
    }
    
    dyingBehavior(deltaTime) {
        // Handle death animation
        if (this.stateTime > 3) {
            // After 3 seconds, transition to dead state
            this.state = 'dead';
            
            // Drop orb if not already dropped
            if (!this.hasDroppedOrb) {
                this.dropOrb();
            }
            
            // Remove from scene after some time
            setTimeout(() => {
                if (this.scene && this.group) {
                    this.scene.remove(this.group);
                }
            }, 5000);
            
            return;
        }
        
        // Death animation effects
        const progress = this.stateTime / 3; // 0 to 1 over 3 seconds
        
        // Make cylinder wobble/shake
        this.group.position.x += (Math.random() - 0.5) * 0.1;
        this.group.position.z += (Math.random() - 0.5) * 0.1;
        
        // Make orbs break free from orbit
        if (this.orbs) {
            this.orbs.forEach(orb => {
                // Break orbit if not already broken
                if (!orb.userData.isFree) {
                    // 10% chance per second to break free
                    if (Math.random() < 0.1 * deltaTime) {
                        orb.userData.isFree = true;
                        
                        // Set random velocity
                        orb.userData.velocity = new THREE.Vector3(
                            (Math.random() - 0.5) * 0.1,
                            (Math.random() - 0.3) * 0.1, // Bias downward
                            (Math.random() - 0.5) * 0.1
                        );
                    }
                }
                
                // Move free orbs
                if (orb.userData.isFree) {
                    // Apply velocity
                    orb.position.add(orb.userData.velocity);
                    
                    // Apply gravity
                    orb.userData.velocity.y -= 0.002;
                    
                    // Move attached light
                    if (orb.userData.light) {
                        orb.userData.light.position.copy(orb.position);
                    }
                }
            });
        }
        
        // Create smoke/particle effects
        if (Math.random() < 2 * deltaTime) {
            this.createDeathParticle();
        }
        
        // Fade out core light
        if (this.coreLight) {
            this.coreLight.intensity = 2 * (1 - progress);
        }
        
        // Make heating elements flicker out
        if (this.heatingElements) {
            this.heatingElements.forEach(element => {
                element.material.emissiveIntensity = element.userData.originalIntensity * (1 - progress) * (0.5 + Math.random() * 0.5);
                
                if (element.userData.light) {
                    element.userData.light.intensity = 1.2 * (1 - progress) * (0.5 + Math.random() * 0.5);
                }
            });
        }
    }
    
    createDeathParticle() {
        // Create smoke/sparks for death animation
        const centerPosition = new THREE.Vector3();
        this.bodyMesh.getWorldPosition(centerPosition);
        
        // Random position on cylinder
        const angle = Math.random() * Math.PI * 2;
        const height = Math.random() * 8;
        
        const position = new THREE.Vector3(
            centerPosition.x + Math.cos(angle) * 1.5,
            centerPosition.y + height,
            centerPosition.z + Math.sin(angle) * 1.5
        );
        
        // Decide between smoke or spark
        const isSpark = Math.random() < 0.3;
        
        if (isSpark) {
            // Create spark
            const sparkGeometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 8, 8);
            const sparkMaterial = new THREE.MeshBasicMaterial({
                color: 0xffcc00,
                transparent: true,
                opacity: 0.9
            });
            
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            spark.position.copy(position);
            
            this.scene.add(spark);
            
            // Add velocity - outward direction with upward bias
            const direction = new THREE.Vector3().subVectors(position, centerPosition).normalize();
            direction.y += Math.random() * 0.5;
            
            // Randomize speed
            const speed = 0.05 + Math.random() * 0.2;
            const velocity = direction.multiplyScalar(speed);
            
            // Animate spark
            const duration = 0.3 + Math.random() * 0.3;
            const startTime = performance.now() * 0.001;
            
            const animate = () => {
                const currentTime = performance.now() * 0.001;
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Move spark
                spark.position.addScaledVector(velocity, 1);
                
                // Apply gravity
                velocity.y -= 0.003;
                
                // Fade out
                spark.material.opacity = 0.9 * (1 - progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Remove spark
                    this.scene.remove(spark);
                    spark.material.dispose();
                    spark.geometry.dispose();
                }
            };
            
            animate();
        } else {
            // Create smoke
            const smokeGeometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.2, 8, 8);
            const smokeMaterial = new THREE.MeshBasicMaterial({
                color: 0x666666,
                transparent: true,
                opacity: 0.4
            });
            
            const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
            smoke.position.copy(position);
            
            this.scene.add(smoke);
            
            // Add velocity - mainly upward
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                0.02 + Math.random() * 0.03,
                (Math.random() - 0.5) * 0.02
            );
            
            // Animate smoke
            const duration = 1.0 + Math.random() * 0.5;
            const startTime = performance.now() * 0.001;
            const startScale = 1;
            const endScale = 2 + Math.random();
            
            const animate = () => {
                const currentTime = performance.now() * 0.001;
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Move smoke
                smoke.position.addScaledVector(velocity, 1);
                
                // Expand
                const scale = startScale + (endScale - startScale) * progress;
                smoke.scale.set(scale, scale, scale);
                
                // Fade out
                smoke.material.opacity = 0.4 * (1 - progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Remove smoke
                    this.scene.remove(smoke);
                    smoke.material.dispose();
                    smoke.geometry.dispose();
                }
            };
            
            animate();
        }
    }
    
    dropOrb() {
        if (this.hasDroppedOrb) return;
        this.hasDroppedOrb = true;
        
        // Create a collectible orb
        const orbGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const orbMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366ff,
            emissive: 0x3366ff,
            emissiveIntensity: 1.0,
            metalness: 0.3,
            roughness: 0.4
        });
        
        this.droppedOrb = new THREE.Mesh(orbGeometry, orbMaterial);
        
        // Position at center of body
        const centerPosition = new THREE.Vector3();
        this.bodyMesh.getWorldPosition(centerPosition);
        
        this.droppedOrb.position.copy(centerPosition);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.droppedOrb.add(glow);
        
        // Add light
        const orbLight = new THREE.PointLight(0x3366ff, 1.5, 5);
        this.droppedOrb.add(orbLight);
        
        // Add to scene
        this.scene.add(this.droppedOrb);
        
        // Store orb data
        this.droppedOrb.userData = {
            type: 'manaOrb',
            value: this.orbValue,
            floatHeight: 0,
            floatSpeed: 1.0,
            rotationSpeed: 0.5,
            glowPulseSpeed: 0.7
        };
        
        // Make orb float
        const startTime = performance.now() * 0.001;
        
        const animateOrb = () => {
            if (!this.droppedOrb) return;
            
            const time = performance.now() * 0.001;
            const elapsed = time - startTime;
            
            // Float up and down
            this.droppedOrb.position.y = centerPosition.y + Math.sin(elapsed * this.droppedOrb.userData.floatSpeed) * 0.3 + 0.5;
            
            // Rotate
            this.droppedOrb.rotation.y += this.droppedOrb.userData.rotationSpeed * 0.01;
            
            // Pulse glow
            if (glow) {
                const pulse = 1 + Math.sin(elapsed * this.droppedOrb.userData.glowPulseSpeed) * 0.2;
                glow.scale.set(pulse, pulse, pulse);
            }
            
            requestAnimationFrame(animateOrb);
        };
        
        animateOrb();
        
        // Create drop effect
        this.createOrbDropEffect(centerPosition);
    }
    
    createOrbDropEffect(position) {
        // Create visual effect for orb appearance
        
        // Create expanding ring
        const ringGeometry = new THREE.RingGeometry(0.5, 0.7, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = Math.PI / 2;
        
        this.scene.add(ring);
        
        // Create light flash
        const flashLight = new THREE.PointLight(0x3366ff, 3, 10);
        flashLight.position.copy(position);
        this.scene.add(flashLight);
        
        // Animate effect
        const duration = 1.0;
        const startTime = performance.now() * 0.001;
        
        const animate = () => {
            const currentTime = performance.now() * 0.001;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand ring
            const scale = 1 + progress * 5;
            ring.scale.set(scale, scale, scale);
            
            // Fade out
            ring.material.opacity = 0.7 * (1 - progress);
            
            // Fade light
            if (flashLight) {
                flashLight.intensity = 3 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove effect
                this.scene.remove(ring);
                this.scene.remove(flashLight);
                
                ring.material.dispose();
                ring.geometry.dispose();
            }
        };
        
        animate();
    }
    
    // Helper method to set shadow properties for a mesh
    setShadowProperties(mesh) {
        if (!mesh) return;
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Also apply to children
        mesh.children.forEach(child => {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Recursively apply to grandchildren
            if (child.children && child.children.length > 0) {
                child.children.forEach(grandchild => {
                    grandchild.castShadow = true;
                    grandchild.receiveShadow = true;
                });
            }
        });
    }
}
