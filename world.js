// ============================================
// OBELISK: DREAM OF THE ANCIENTS
// World Module - Dungeon, Town, and Entities
// Uses global Controls object from index.html
// ============================================

// ============================================
// CONSTANTS
// ============================================

// Room dimensions
const ROOM_SIZE = {
    center: { width: 30, depth: 30, height: 8 },
    orbital: { width: 20, depth: 20, height: 8 },
    hallway: { width: 6, depth: 20, height: 5 },
    pillar: { width: 20, depth: 20, height: 15 }
};

// Room positions (center of each room)
const ROOM_POSITIONS = {
    center: { x: 0, z: 0 },
    east: { x: 35, z: 0 },
    west: { x: -35, z: 0 },
    north: { x: 0, z: -35 },
    south: { x: 0, z: 35 }
};

// Hallway positions
const HALLWAY_POSITIONS = {
    east: { x: 17.5, z: 0 },
    west: { x: -17.5, z: 0 },
    north: { x: 0, z: -17.5 },
    south: { x: 0, z: 17.5 }
};

// Floor theme colors
const FLOOR_THEMES = {
    machine: {
        fog: 0x0a0a12,
        fogDensity: 0.05,
        ambient: 0x111122,
        primary: 0x00ffff,
        secondary: 0x0066aa,
        wall: 0x3a3a4a,
        floor: 0x1a1a2a
    },
    corruption: {
        fog: 0x0a0812,
        fogDensity: 0.04,
        ambient: 0x110822,
        primary: 0x9900ff,
        secondary: 0xff00aa,
        wall: 0x2a2a3a,
        floor: 0x1a1020
    },
    dream: {
        fog: 0x12100a,
        fogDensity: 0.03,
        ambient: 0x221811,
        primary: 0xffaa00,
        secondary: 0xffcc44,
        wall: 0x4a3a2a,
        floor: 0x201810
    },
    source: {
        fog: 0x1a1812,
        fogDensity: 0.02,
        ambient: 0x222018,
        primary: 0xffdd66,
        secondary: 0xaaffff,
        wall: 0x5a4a3a,
        floor: 0x2a2018
    }
};

// Enemy definitions
const ENEMY_TYPES = {
    drone: {
        health: 30,
        damage: 8,
        speed: 3,
        attackRange: 12,
        attackRate: 2,
        xp: 10,
        size: 0.8,
        color: 0x00aaaa
    },
    walker: {
        health: 50,
        damage: 15,
        speed: 5,
        chargeSpeed: 10,
        chargeRange: 8,
        attackRange: 2,
        xp: 15,
        size: 1.2,
        color: 0x666688
    },
    turret: {
        health: 40,
        damage: 5,
        speed: 0,
        attackRange: 15,
        attackRate: 0.33,
        xp: 12,
        size: 1,
        color: 0x884444
    },
    wisp: {
        health: 20,
        damage: 30,
        speed: 7,
        explosionRadius: 3,
        fuseTime: 1.5,
        xp: 20,
        size: 0.6,
        color: 0xff8800
    }
};

// Spawn tables for east room
const SPAWN_TABLES = {
    1: { drones: 4, walkers: 2, turrets: 0, wisps: 0 },
    2: { drones: 3, walkers: 3, turrets: 2, wisps: 0 },
    3: { drones: 2, walkers: 3, turrets: 2, wisps: 2 },
    4: { drones: 3, walkers: 4, turrets: 2, wisps: 2 },
    5: { drones: 4, walkers: 4, turrets: 3, wisps: 2 },
    6: { drones: 4, walkers: 4, turrets: 3, wisps: 3 },
    7: { drones: 5, walkers: 4, turrets: 3, wisps: 3 },
    8: { drones: 5, walkers: 5, turrets: 4, wisps: 3 },
    9: { drones: 6, walkers: 5, turrets: 4, wisps: 4 },
    10: { drones: 6, walkers: 6, turrets: 4, wisps: 4 }
};

// Mini-boss rotation
const MINI_BOSS_ROTATION = {
    1: { type: 'sentinel', tier: 1 },
    2: { type: 'sentinel', tier: 1 },
    3: { type: 'sentinel', tier: 2 },
    4: { type: 'hollow', tier: 1 },
    5: { type: 'hollow', tier: 1 },
    6: { type: 'hollow', tier: 2 },
    7: { type: 'dreamer', tier: 1 },
    8: { type: 'dreamer', tier: 1 },
    9: { type: 'dreamer', tier: 2 },
    10: { type: 'emperor', tier: 1 }
};

// Lore fragments
const LORE_FRAGMENTS = {
    1: [
        "The Upload function connects mind to obelisk. What you give, it remembers.",
        "Warning: Proximity without protection causes neural degradation."
    ],
    2: [
        "Storage capacity: Theoretically infinite. The knowledge of every mind that ever connected.",
        "Error Log 7,431: Upload successful. Consciousness echo persists. Recommend purge."
    ],
    3: [
        "The three obelisks form a network. City guides progress. Farm nurtures growth. Wild preserves balance.",
        "Personal Note: The dreams are getting worse. But the work must continue."
    ],
    4: [
        "Distribution protocols corrupted. Knowledge output replaced with... something else.",
        "They call it madness. But what if it's just information we weren't meant to receive?"
    ],
    5: [
        "The royal family requested modifications. Against all protocols, we complied.",
        "Consciousness transfer successful. The king is dead. Long live the king."
    ],
    6: [
        "The tree is not metaphor. In the dream-space, it is real. Roots in every mind.",
        "Some can walk the branches while waking. We called them Engineers."
    ],
    7: [
        "The corruption is not malfunction. It is rejection. The obelisks refuse what we've become.",
        "Paradise was promised. Instead, we made a machine to skip the work. We were fools."
    ],
    8: [
        "The last Engineer sealed themselves inside. Waiting. For someone worthy.",
        "Your blood carries the code. Your dreams carry the key. You were always meant to come here."
    ],
    9: [
        "The Emperor's consciousness has overwritten seventeen heirs. Seventeen minds, erased.",
        "In the deepest level, the truth waits. The truth the rulers tried to bury forever."
    ],
    10: [
        "You've seen it now. The dream-tree. The source of all we lost.",
        "The obelisks can be restored. But the Emperor fears a world that doesn't need him.",
        "Choose wisely, descendant of Engineers. The next age begins with your decision."
    ]
};

// ============================================
// STATE
// ============================================

let scene = null;
let currentFloor = 1;
let currentRoom = 'center';
let dungeonGroup = null;
let townGroup = null;

// Gate states
const gateStates = {
    east: true,  // Always open at start
    west: false,
    north: false,
    south: false
};

// Room clear states
const roomCleared = {
    center: false,
    east: false,
    west: false,
    north: false,
    south: false
};

// Entity arrays
let enemies = [];
let projectiles = [];
let playerProjectiles = [];
let miniBoss = null;
let pillarBoss = null;

// Object pools
const projectilePool = [];
const enemyPools = {
    drone: [],
    walker: [],
    turret: [],
    wisp: []
};

// Town state
let npcs = [];
let townLights = [];

// ============================================
// PLAYER
// ============================================

const player = {
    mesh: null,
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    
    // Stats
    maxHealth: 100,
    health: 100,
    baseDamage: 10,
    fireRate: 1,
    aimAssist: 0.05,
    
    // State
    isGrounded: true,
    isInvincible: false,
    invincibleTimer: 0,
    attackCooldown: 0,
    burstModeTimer: 0,
    
    // Upgrades
    upgrades: {
        maxHealth: 0,
        baseDamage: 0,
        fireRate: 0,
        aimAssist: 0,
        spreadDamage: 0,
        spreadArc: 0,
        spreadCooldown: 0,
        burstDuration: 0,
        burstCooldown: 0,
        megaDamage: 0,
        megaCooldown: 0,
        globalCooldown: 0,
        globalAbilityDamage: 0
    }
};

// Upgrade values
const UPGRADE_VALUES = {
    maxHealth: [100, 120, 140, 165, 195, 230],
    baseDamage: [10, 13, 17, 22, 28, 35],
    fireRate: [1.0, 1.3, 1.6, 2.0, 2.5, 3.0],
    aimAssist: [0.05, 0.12, 0.20, 0.28, 0.36, 0.45]
};

// ============================================
// INITIALIZATION
// ============================================

function initPlayer(sceneRef) {
    scene = sceneRef;
    
    // Create player mesh group
    player.mesh = new THREE.Group();
    
    // Body (cylinder)
    const bodyGeom = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 8);
    const bodyMat = new THREE.MeshPhongMaterial({ 
        color: 0x1a1a4a,
        emissive: 0x0a0a2a
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.6;
    player.mesh.add(body);
    
    // Robe (cone)
    const robeGeom = new THREE.ConeGeometry(0.6, 0.8, 8);
    const robeMat = new THREE.MeshPhongMaterial({ 
        color: 0x1a1a4a,
        emissive: 0x0a0a2a
    });
    const robe = new THREE.Mesh(robeGeom, robeMat);
    robe.position.y = 0.3;
    robe.rotation.x = Math.PI;
    player.mesh.add(robe);
    
    // Head (sphere)
    const headGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const headMat = new THREE.MeshPhongMaterial({ 
        color: 0x0a0a1a
    });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.4;
    player.mesh.add(head);
    
    // Glowing trim
    const trimGeom = new THREE.TorusGeometry(0.45, 0.03, 8, 16);
    const trimMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff
    });
    const trim = new THREE.Mesh(trimGeom, trimMat);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 1.1;
    player.mesh.add(trim);
    
    // Hands (glowing spheres)
    const handGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const handMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
    });
    
    const leftHand = new THREE.Mesh(handGeom, handMat);
    leftHand.position.set(-0.5, 0.8, 0.3);
    leftHand.name = 'leftHand';
    player.mesh.add(leftHand);
    
    const rightHand = new THREE.Mesh(handGeom, handMat);
    rightHand.position.set(0.5, 0.8, 0.3);
    rightHand.name = 'rightHand';
    player.mesh.add(rightHand);
    
    // Add point light for player
    const playerLight = new THREE.PointLight(0x00ffff, 0.5, 5);
    playerLight.position.y = 1;
    player.mesh.add(playerLight);
    
    player.mesh.position.copy(player.position);
    scene.add(player.mesh);
    
    return player;
}

function updatePlayer(delta, inputState) {
    if (!player.mesh) return;
    
    // Update invincibility
    if (player.isInvincible) {
        player.invincibleTimer -= delta;
        // Flash effect
        player.mesh.visible = Math.floor(player.invincibleTimer * 10) % 2 === 0;
        
        if (player.invincibleTimer <= 0) {
            player.isInvincible = false;
            player.mesh.visible = true;
        }
    }
    
    // Update burst mode
    if (player.burstModeTimer > 0) {
        player.burstModeTimer -= delta;
    }
    
    // Movement
    const moveSpeed = 5;
    const cameraYaw = Controls.getCameraYaw();
    
    // Calculate movement direction relative to camera
    const moveX = inputState.moveX;
    const moveZ = inputState.moveY;
    
    if (moveX !== 0 || moveZ !== 0) {
        const angle = Math.atan2(moveX, moveZ) + cameraYaw;
        player.velocity.x = Math.sin(angle) * moveSpeed;
        player.velocity.z = Math.cos(angle) * moveSpeed;
        
        // Rotate player to face movement direction
        player.mesh.rotation.y = angle;
    } else {
        player.velocity.x *= 0.9;
        player.velocity.z *= 0.9;
    }
    
    // Gravity and jumping
    if (!player.isGrounded) {
        player.velocity.y -= 20 * delta; // Gravity
    }
    
    if (inputState.jumping && player.isGrounded) {
        player.velocity.y = 10; // Jump force
        player.isGrounded = false;
    }
    
    // Apply velocity
    player.position.x += player.velocity.x * delta;
    player.position.y += player.velocity.y * delta;
    player.position.z += player.velocity.z * delta;
    
    // Ground collision
    if (player.position.y <= 0) {
        player.position.y = 0;
        player.velocity.y = 0;
        player.isGrounded = true;
    }
    
    // Wall collisions (simple room bounds)
    const roomBounds = getCurrentRoomBounds();
    player.position.x = Math.max(roomBounds.minX + 1, Math.min(roomBounds.maxX - 1, player.position.x));
    player.position.z = Math.max(roomBounds.minZ + 1, Math.min(roomBounds.maxZ - 1, player.position.z));
    
    // Update mesh position
    player.mesh.position.copy(player.position);
    
    // Attack cooldown
    if (player.attackCooldown > 0) {
        player.attackCooldown -= delta;
    }
    
    // Handle attacks
    if (inputState.attacking && player.attackCooldown <= 0) {
        fireProjectile();
        const effectiveFireRate = player.burstModeTimer > 0 ? 
            player.fireRate * 3 : player.fireRate;
        player.attackCooldown = 1 / effectiveFireRate;
    }
    
    // Handle abilities
    if (inputState.useSpread && Controls.getCooldown('spread') <= 0) {
        fireSpreadShot();
        const cooldown = 8 - player.upgrades.spreadCooldown;
        Controls.triggerCooldown('spread', cooldown);
    }
    
    if (inputState.useBurst && Controls.getCooldown('burst') <= 0) {
        activateBurstMode();
        const cooldown = 15 - player.upgrades.burstCooldown * 1.67;
        Controls.triggerCooldown('burst', cooldown);
    }
    
    if (inputState.useMega && Controls.getCooldown('mega') <= 0) {
        fireMegaBall();
        const cooldown = 20 - player.upgrades.megaCooldown * 2.67;
        Controls.triggerCooldown('mega', cooldown);
    }
    
    // Check room transitions
    checkRoomTransition();
}

function getCurrentRoomBounds() {
    const pos = ROOM_POSITIONS[currentRoom] || ROOM_POSITIONS.center;
    const size = currentRoom === 'north' ? ROOM_SIZE.pillar : 
                 currentRoom === 'center' ? ROOM_SIZE.center : ROOM_SIZE.orbital;
    
    return {
        minX: pos.x - size.width / 2,
        maxX: pos.x + size.width / 2,
        minZ: pos.z - size.depth / 2,
        maxZ: pos.z + size.depth / 2
    };
}

function checkRoomTransition() {
    const px = player.position.x;
    const pz = player.position.z;
    
    // Check hallway entries from center
    if (currentRoom === 'center') {
        if (px > 12 && gateStates.east) enterRoom('east');
        else if (px < -12 && gateStates.west) enterRoom('west');
        else if (pz < -12 && gateStates.north) enterRoom('north');
        else if (pz > 12 && gateStates.south) enterRoom('south');
    }
    // Return to center from other rooms
    else {
        const bounds = getCurrentRoomBounds();
        if (currentRoom === 'east' && px < bounds.minX + 2) enterRoom('center');
        else if (currentRoom === 'west' && px > bounds.maxX - 2) enterRoom('center');
        else if (currentRoom === 'north' && pz > bounds.maxZ - 2) enterRoom('center');
        else if (currentRoom === 'south' && pz < bounds.minZ + 2) enterRoom('center');
    }
}

function enterRoom(roomName) {
    const oldRoom = currentRoom;
    currentRoom = roomName;
    
    // Position player at room entrance
    const roomPos = ROOM_POSITIONS[roomName];
    
    if (roomName === 'center') {
        // Coming from orbital room, position based on which room
        if (oldRoom === 'east') player.position.set(10, 0, 0);
        else if (oldRoom === 'west') player.position.set(-10, 0, 0);
        else if (oldRoom === 'north') player.position.set(0, 0, -10);
        else if (oldRoom === 'south') player.position.set(0, 0, 10);
    } else {
        // Entering orbital room
        if (roomName === 'east') player.position.set(roomPos.x - 8, 0, 0);
        else if (roomName === 'west') player.position.set(roomPos.x + 8, 0, 0);
        else if (roomName === 'north') player.position.set(0, 0, roomPos.z + 8);
        else if (roomName === 'south') player.position.set(0, 0, roomPos.z - 8);
    }
    
    // Set camera mode
    if (roomName === 'west' && !roomCleared.west) {
        Controls.setCameraMode(Controls.CameraMode.MINI_BOSS);
    } else if (roomName === 'north') {
        Controls.setCameraMode(Controls.CameraMode.PILLAR_BOSS);
    } else {
        Controls.setCameraMode(Controls.CameraMode.NORMAL);
    }
    
    // Spawn enemies if room not cleared
    if (!roomCleared[roomName]) {
        spawnRoomEnemies(roomName);
    }
    
    console.log(`Entered room: ${roomName}`);
}

// ============================================
// PROJECTILES
// ============================================

function fireProjectile() {
    const projectile = getProjectileFromPool();
    
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.mesh.rotation.y);
    
    projectile.position.copy(player.position);
    projectile.position.y += 0.8;
    projectile.position.add(forward.clone().multiplyScalar(0.5));
    
    projectile.velocity = forward.multiplyScalar(15);
    projectile.damage = player.baseDamage;
    projectile.active = true;
    projectile.lifetime = 3;
    projectile.type = 'normal';
    projectile.mesh.visible = true;
    projectile.mesh.scale.set(1, 1, 1);
    
    playerProjectiles.push(projectile);
}

function fireSpreadShot() {
    const baseAngle = player.mesh.rotation.y;
    const spreadAngle = Math.PI / 2; // 90 degrees
    const numBalls = 5;
    const damageMultiplier = 0.6 + (player.upgrades.spreadDamage * 0.1);
    
    for (let i = 0; i < numBalls; i++) {
        const projectile = getProjectileFromPool();
        
        const angle = baseAngle + (i - (numBalls - 1) / 2) * (spreadAngle / (numBalls - 1));
        const forward = new THREE.Vector3(
            Math.sin(angle),
            0,
            Math.cos(angle)
        );
        
        projectile.position.copy(player.position);
        projectile.position.y += 0.8;
        projectile.position.add(forward.clone().multiplyScalar(0.5));
        
        projectile.velocity = forward.multiplyScalar(15);
        projectile.damage = player.baseDamage * damageMultiplier;
        projectile.active = true;
        projectile.lifetime = 3;
        projectile.type = 'spread';
        projectile.mesh.visible = true;
        projectile.mesh.scale.set(0.8, 0.8, 0.8);
        projectile.mesh.material.color.setHex(0x00aaff);
        
        playerProjectiles.push(projectile);
    }
}

function activateBurstMode() {
    const duration = 3 + player.upgrades.burstDuration;
    player.burstModeTimer = duration;
    
    // Visual feedback
    if (player.mesh) {
        const handLeft = player.mesh.getObjectByName('leftHand');
        const handRight = player.mesh.getObjectByName('rightHand');
        if (handLeft) handLeft.material.color.setHex(0xff8800);
        if (handRight) handRight.material.color.setHex(0xff8800);
        
        setTimeout(() => {
            if (handLeft) handLeft.material.color.setHex(0x00ffff);
            if (handRight) handRight.material.color.setHex(0x00ffff);
        }, duration * 1000);
    }
}

function fireMegaBall() {
    const projectile = getProjectileFromPool();
    
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.mesh.rotation.y);
    
    projectile.position.copy(player.position);
    projectile.position.y += 0.8;
    projectile.position.add(forward.clone().multiplyScalar(0.5));
    
    projectile.velocity = forward.multiplyScalar(8); // Slower
    projectile.damage = player.baseDamage * (5 + player.upgrades.megaDamage);
    projectile.active = true;
    projectile.lifetime = 5;
    projectile.type = 'mega';
    projectile.piercing = true;
    projectile.mesh.visible = true;
    projectile.mesh.scale.set(2.5, 2.5, 2.5);
    projectile.mesh.material.color.setHex(0xffff00);
    
    playerProjectiles.push(projectile);
}

function getProjectileFromPool() {
    for (const proj of projectilePool) {
        if (!proj.active) {
            return proj;
        }
    }
    
    // Create new projectile
    const geom = new THREE.SphereGeometry(0.15, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff,
        transparent: true,
        opacity: 0.9
    });
    const mesh = new THREE.Mesh(geom, mat);
    
    // Add glow
    const glowGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    mesh.add(glow);
    
    scene.add(mesh);
    
    const proj = {
        mesh,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        damage: 0,
        active: false,
        lifetime: 0,
        type: 'normal',
        piercing: false
    };
    
    projectilePool.push(proj);
    return proj;
}

function releaseProjectile(projectile) {
    projectile.active = false;
    projectile.mesh.visible = false;
    projectile.piercing = false;
    projectile.mesh.material.color.setHex(0x00ffff);
    projectile.mesh.scale.set(1, 1, 1);
    
    const idx = playerProjectiles.indexOf(projectile);
    if (idx > -1) playerProjectiles.splice(idx, 1);
}

function updateProjectiles(delta) {
    for (const proj of playerProjectiles) {
        if (!proj.active) continue;
        
        // Move
        proj.position.add(proj.velocity.clone().multiplyScalar(delta));
        proj.mesh.position.copy(proj.position);
        
        // Lifetime
        proj.lifetime -= delta;
        if (proj.lifetime <= 0) {
            releaseProjectile(proj);
            continue;
        }
        
        // Aim assist (slight homing)
        if (proj.type === 'normal' && player.aimAssist > 0) {
            const nearest = findNearestEnemy(proj.position, 10);
            if (nearest) {
                const toEnemy = new THREE.Vector3().subVectors(nearest.position, proj.position).normalize();
                proj.velocity.lerp(toEnemy.multiplyScalar(15), player.aimAssist * 0.1);
            }
        }
        
        // Check enemy collisions
        for (const enemy of enemies) {
            if (!enemy.active) continue;
            
            const dist = proj.position.distanceTo(enemy.position);
            if (dist < enemy.size + 0.2) {
                damageEnemy(enemy, proj.damage);
                if (!proj.piercing) {
                    releaseProjectile(proj);
                }
                break;
            }
        }
        
        // Check mini-boss collision
        if (miniBoss && miniBoss.active) {
            const dist = proj.position.distanceTo(miniBoss.position);
            if (dist < miniBoss.size + 0.3) {
                damageMiniBoss(proj.damage);
                if (!proj.piercing) {
                    releaseProjectile(proj);
                }
            }
        }
        
        // Check pillar boss collision
        if (pillarBoss && pillarBoss.active) {
            for (const weakSpot of pillarBoss.weakSpots) {
                if (!weakSpot.active) continue;
                const dist = proj.position.distanceTo(weakSpot.position);
                if (dist < 0.8) {
                    damagePillarWeakSpot(weakSpot, proj.damage);
                    if (!proj.piercing) {
                        releaseProjectile(proj);
                    }
                    break;
                }
            }
        }
    }
    
    // Update enemy projectiles
    for (const proj of projectiles) {
        if (!proj.active) continue;
        
        proj.position.add(proj.velocity.clone().multiplyScalar(delta));
        proj.mesh.position.copy(proj.position);
        
        proj.lifetime -= delta;
        if (proj.lifetime <= 0) {
            proj.active = false;
            proj.mesh.visible = false;
            continue;
        }
        
        // Check player collision
        const dist = proj.position.distanceTo(player.position);
        if (dist < 1) {
            damagePlayer(proj.damage);
            proj.active = false;
            proj.mesh.visible = false;
        }
    }
}

function findNearestEnemy(position, maxRange) {
    let nearest = null;
    let nearestDist = maxRange;
    
    for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dist = position.distanceTo(enemy.position);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = enemy;
        }
    }
    
    return nearest;
}

// ============================================
// PLAYER DAMAGE & HEALING
// ============================================

function damagePlayer(amount) {
    if (player.isInvincible) return;
    
    player.health -= amount;
    player.isInvincible = true;
    player.invincibleTimer = 0.5;
    
    // Update UI
    updateHealthUI();
    
    // Screen shake effect
    if (window.shakeCamera) window.shakeCamera(0.2);
    
    // Show damage number
    showDamageNumber(player.position, amount, false);
    
    if (player.health <= 0) {
        player.health = 0;
        playerDeath();
    }
}

function healPlayer(amount) {
    player.health = Math.min(player.maxHealth, player.health + amount);
    updateHealthUI();
    showDamageNumber(player.position, amount, true);
}

function updateHealthUI() {
    const healthFill = document.getElementById('health-fill');
    const healthText = document.getElementById('health-text');
    
    if (healthFill && healthText) {
        const percent = (player.health / player.maxHealth) * 100;
        healthFill.style.width = `${percent}%`;
        healthText.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
        
        if (percent <= 25) {
            healthFill.classList.add('low');
        } else {
            healthFill.classList.remove('low');
        }
    }
}

function playerDeath() {
    // Handled by game.js
    if (window.onPlayerDeath) window.onPlayerDeath();
}

function showDamageNumber(position, amount, isHeal) {
    const container = document.getElementById('damage-numbers');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = `damage-number ${isHeal ? 'heal' : ''}`;
    div.textContent = isHeal ? `+${Math.round(amount)}` : `-${Math.round(amount)}`;
    
    // Project 3D position to screen
    // Simplified - just use random position near center for now
    div.style.left = `${50 + (Math.random() - 0.5) * 20}%`;
    div.style.top = `${40 + (Math.random() - 0.5) * 10}%`;
    
    container.appendChild(div);
    
    setTimeout(() => div.remove(), 1000);
}

// ============================================
// PLAYER STATS
// ============================================

function applyUpgrades(upgrades) {
    player.upgrades = { ...upgrades };
    
    // Apply stat upgrades
    player.maxHealth = UPGRADE_VALUES.maxHealth[upgrades.maxHealth] || 100;
    player.baseDamage = UPGRADE_VALUES.baseDamage[upgrades.baseDamage] || 10;
    player.fireRate = UPGRADE_VALUES.fireRate[upgrades.fireRate] || 1.0;
    player.aimAssist = UPGRADE_VALUES.aimAssist[upgrades.aimAssist] || 0.05;
    
    // Ensure health doesn't exceed max
    if (player.health > player.maxHealth) {
        player.health = player.maxHealth;
    }
    
    updateHealthUI();
}

function resetPlayerPosition() {
    player.position.set(0, 0, 0);
    player.velocity.set(0, 0, 0);
    if (player.mesh) {
        player.mesh.position.copy(player.position);
    }
}

function fullHealPlayer() {
    player.health = player.maxHealth;
    updateHealthUI();
}

// ============================================
// ENEMIES
// ============================================

function spawnRoomEnemies(roomName) {
    // Clear existing enemies
    for (const enemy of enemies) {
        if (enemy.mesh) scene.remove(enemy.mesh);
    }
    enemies = [];
    
    if (roomName === 'center' && !roomCleared.center) {
        // Tutorial enemies
        spawnEnemy('drone', 5, 0, 5);
        spawnEnemy('drone', -5, 0, 5);
        spawnEnemy('walker', 0, 0, 8);
        spawnEnemy('walker', 3, 0, -5);
    } else if (roomName === 'east') {
        const spawns = SPAWN_TABLES[currentFloor];
        const roomPos = ROOM_POSITIONS.east;
        
        // Spawn drones
        for (let i = 0; i < spawns.drones; i++) {
            const angle = (i / spawns.drones) * Math.PI * 2;
            const dist = 5 + Math.random() * 3;
            spawnEnemy('drone', roomPos.x + Math.cos(angle) * dist, 0, roomPos.z + Math.sin(angle) * dist);
        }
        
        // Spawn walkers
        for (let i = 0; i < spawns.walkers; i++) {
            const x = roomPos.x + (Math.random() - 0.5) * 14;
            const z = roomPos.z + (Math.random() - 0.5) * 14;
            spawnEnemy('walker', x, 0, z);
        }
        
        // Spawn turrets (along walls)
        for (let i = 0; i < spawns.turrets; i++) {
            const side = i % 4;
            let x, z;
            if (side === 0) { x = roomPos.x - 9; z = roomPos.z + (Math.random() - 0.5) * 12; }
            else if (side === 1) { x = roomPos.x + 9; z = roomPos.z + (Math.random() - 0.5) * 12; }
            else if (side === 2) { x = roomPos.x + (Math.random() - 0.5) * 12; z = roomPos.z - 9; }
            else { x = roomPos.x + (Math.random() - 0.5) * 12; z = roomPos.z + 9; }
            spawnEnemy('turret', x, 0, z);
        }
        
        // Spawn wisps
        for (let i = 0; i < spawns.wisps; i++) {
            const x = roomPos.x + (Math.random() - 0.5) * 12;
            const z = roomPos.z + (Math.random() - 0.5) * 12;
            spawnEnemy('wisp', x, 0, z);
        }
    } else if (roomName === 'west') {
        // Mini-boss room
        const roomPos = ROOM_POSITIONS.west;
        const bossInfo = MINI_BOSS_ROTATION[currentFloor];
        
        // Spawn support enemies
        spawnEnemy('drone', roomPos.x + 5, 0, roomPos.z + 5);
        spawnEnemy('drone', roomPos.x - 5, 0, roomPos.z + 5);
        if (currentFloor >= 4) {
            spawnEnemy('walker', roomPos.x + 5, 0, roomPos.z - 5);
            spawnEnemy('walker', roomPos.x - 5, 0, roomPos.z - 5);
        } else {
            spawnEnemy('walker', roomPos.x, 0, roomPos.z - 5);
        }
        
        // Spawn mini-boss
        spawnMiniBoss(bossInfo.type, bossInfo.tier, roomPos.x, roomPos.z);
    } else if (roomName === 'north') {
        // Pillar boss room
        spawnPillarBoss();
    }
    // South room has no enemies (lore room)
}

function spawnEnemy(type, x, y, z) {
    const def = ENEMY_TYPES[type];
    if (!def) return null;
    
    // Scale stats by floor
    const healthScale = 1 + (currentFloor - 1) * 0.25;
    const damageScale = 1 + (currentFloor - 1) * 0.20;
    const speedScale = 1 + (currentFloor - 1) * 0.05;
    
    // Create enemy mesh
    let mesh;
    if (type === 'drone') {
        mesh = createDroneMesh();
    } else if (type === 'walker') {
        mesh = createWalkerMesh();
    } else if (type === 'turret') {
        mesh = createTurretMesh();
    } else if (type === 'wisp') {
        mesh = createWispMesh();
    }
    
    mesh.position.set(x, y + def.size / 2, z);
    scene.add(mesh);
    
    const enemy = {
        type,
        mesh,
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(),
        health: def.health * healthScale,
        maxHealth: def.health * healthScale,
        damage: def.damage * damageScale,
        speed: def.speed * speedScale,
        attackRange: def.attackRange,
        attackCooldown: 0,
        xp: def.xp,
        size: def.size,
        active: true,
        state: 'idle',
        stateTimer: 0,
        
        // Type-specific
        chargeSpeed: def.chargeSpeed ? def.chargeSpeed * speedScale : 0,
        chargeRange: def.chargeRange || 0,
        fuseTimer: def.fuseTime || 0,
        isFusing: false
    };
    
    enemies.push(enemy);
    return enemy;
}

function createDroneMesh() {
    const group = new THREE.Group();
    
    // Main body (sphere)
    const bodyGeom = new THREE.SphereGeometry(0.4, 12, 12);
    const bodyMat = new THREE.MeshPhongMaterial({ 
        color: getThemeColor('primary'),
        emissive: getThemeColor('primary'),
        emissiveIntensity: 0.3
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    group.add(body);
    
    // Rings
    const ringGeom = new THREE.TorusGeometry(0.5, 0.05, 8, 16);
    const ringMat = new THREE.MeshPhongMaterial({ color: getThemeColor('secondary') });
    
    const ring1 = new THREE.Mesh(ringGeom, ringMat);
    ring1.rotation.x = Math.PI / 2;
    group.add(ring1);
    
    const ring2 = new THREE.Mesh(ringGeom, ringMat);
    ring2.rotation.y = Math.PI / 2;
    group.add(ring2);
    
    // Eye
    const eyeGeom = new THREE.SphereGeometry(0.15, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eye = new THREE.Mesh(eyeGeom, eyeMat);
    eye.position.z = 0.35;
    group.add(eye);
    
    // Light
    const light = new THREE.PointLight(getThemeColor('primary'), 0.5, 5);
    group.add(light);
    
    return group;
}

function createWalkerMesh() {
    const group = new THREE.Group();
    
    // Body
    const bodyGeom = new THREE.BoxGeometry(0.8, 1.2, 0.6);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x666688 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.8;
    group.add(body);
    
    // Head
    const headGeom = new THREE.BoxGeometry(0.5, 0.4, 0.5);
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.position.y = 1.6;
    group.add(head);
    
    // Eyes
    const eyeGeom = new THREE.SphereGeometry(0.08, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(-0.12, 1.65, 0.25);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(0.12, 1.65, 0.25);
    group.add(eyeR);
    
    // Legs
    const legGeom = new THREE.BoxGeometry(0.25, 0.6, 0.25);
    const legL = new THREE.Mesh(legGeom, bodyMat);
    legL.position.set(-0.25, 0.3, 0);
    group.add(legL);
    const legR = new THREE.Mesh(legGeom, bodyMat);
    legR.position.set(0.25, 0.3, 0);
    group.add(legR);
    
    return group;
}

function createTurretMesh() {
    const group = new THREE.Group();
    
    // Base
    const baseGeom = new THREE.CylinderGeometry(0.5, 0.6, 0.4, 8);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x884444 });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = 0.2;
    group.add(base);
    
    // Turret head
    const headGeom = new THREE.SphereGeometry(0.4, 8, 8);
    const head = new THREE.Mesh(headGeom, baseMat);
    head.position.y = 0.6;
    group.add(head);
    
    // Gun barrel
    const barrelGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6);
    const barrelMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
    const barrel = new THREE.Mesh(barrelGeom, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.6, 0.4);
    group.add(barrel);
    
    // Eye
    const eyeGeom = new THREE.SphereGeometry(0.12, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eye = new THREE.Mesh(eyeGeom, eyeMat);
    eye.position.set(0, 0.75, 0.3);
    group.add(eye);
    
    return group;
}

function createWispMesh() {
    const group = new THREE.Group();
    
    // Core
    const coreGeom = new THREE.SphereGeometry(0.3, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({ 
        color: 0xff8800,
        transparent: true,
        opacity: 0.9
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    group.add(core);
    
    // Glow
    const glowGeom = new THREE.SphereGeometry(0.5, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    group.add(glow);
    
    // Light
    const light = new THREE.PointLight(0xff8800, 1, 5);
    group.add(light);
    
    return group;
}

function getThemeColor(type) {
    let theme;
    if (currentFloor <= 3) theme = FLOOR_THEMES.machine;
    else if (currentFloor <= 6) theme = FLOOR_THEMES.corruption;
    else if (currentFloor <= 9) theme = FLOOR_THEMES.dream;
    else theme = FLOOR_THEMES.source;
    
    return theme[type] || 0x00ffff;
}

function updateEnemies(delta) {
    for (const enemy of enemies) {
        if (!enemy.active) continue;
        
        updateEnemy(enemy, delta);
    }
    
    // Check if room is cleared
    const activeEnemies = enemies.filter(e => e.active).length;
    const bossAlive = (miniBoss && miniBoss.active) || (pillarBoss && pillarBoss.active);
    
    if (!roomCleared[currentRoom] && activeEnemies === 0 && !bossAlive) {
        onRoomCleared(currentRoom);
    }
}

function updateEnemy(enemy, delta) {
    const distToPlayer = enemy.position.distanceTo(player.position);
    
    // Face player
    const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
    toPlayer.y = 0;
    if (toPlayer.length() > 0.1) {
        enemy.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    }
    
    // Type-specific behavior
    if (enemy.type === 'drone') {
        updateDrone(enemy, delta, distToPlayer, toPlayer);
    } else if (enemy.type === 'walker') {
        updateWalker(enemy, delta, distToPlayer, toPlayer);
    } else if (enemy.type === 'turret') {
        updateTurret(enemy, delta, distToPlayer);
    } else if (enemy.type === 'wisp') {
        updateWisp(enemy, delta, distToPlayer, toPlayer);
    }
    
    // Update mesh position
    enemy.mesh.position.copy(enemy.position);
    enemy.mesh.position.y += enemy.size / 2;
}

function updateDrone(enemy, delta, distToPlayer, toPlayer) {
    // Hover behavior
    enemy.mesh.position.y = 1.5 + Math.sin(Date.now() * 0.003) * 0.2;
    
    // Maintain distance
    const idealDist = 9;
    if (distToPlayer < idealDist - 1) {
        // Move away
        const moveDir = toPlayer.clone().normalize().multiplyScalar(-enemy.speed * delta);
        enemy.position.add(moveDir);
    } else if (distToPlayer > idealDist + 1 && distToPlayer < enemy.attackRange) {
        // Move closer
        const moveDir = toPlayer.clone().normalize().multiplyScalar(enemy.speed * delta);
        enemy.position.add(moveDir);
    }
    
    // Strafe
    const strafeDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
    enemy.position.add(strafeDir.multiplyScalar(Math.sin(Date.now() * 0.001) * enemy.speed * 0.3 * delta));
    
    // Attack
    enemy.attackCooldown -= delta;
    if (enemy.attackCooldown <= 0 && distToPlayer < enemy.attackRange) {
        fireEnemyProjectile(enemy, toPlayer.normalize());
        enemy.attackCooldown = 2;
    }
}

function updateWalker(enemy, delta, distToPlayer, toPlayer) {
    enemy.stateTimer -= delta;
    
    if (enemy.state === 'idle' || enemy.state === 'walking') {
        // Walk toward player
        if (distToPlayer > enemy.attackRange) {
            const moveDir = toPlayer.clone().normalize().multiplyScalar(enemy.speed * delta);
            enemy.position.add(moveDir);
        }
        
        // Start charge if in range
        if (distToPlayer < enemy.chargeRange && distToPlayer > enemy.attackRange) {
            enemy.state = 'windup';
            enemy.stateTimer = 0.5;
        }
    } else if (enemy.state === 'windup') {
        // Wind up animation (could add visual)
        if (enemy.stateTimer <= 0) {
            enemy.state = 'charging';
            enemy.velocity = toPlayer.clone().normalize().multiplyScalar(enemy.chargeSpeed);
            enemy.stateTimer = 1;
        }
    } else if (enemy.state === 'charging') {
        // Charge!
        enemy.position.add(enemy.velocity.clone().multiplyScalar(delta));
        
        // Check player collision
        if (distToPlayer < 1.5) {
            damagePlayer(enemy.damage);
            enemy.state = 'stunned';
            enemy.stateTimer = 1;
            enemy.velocity.set(0, 0, 0);
        }
        
        if (enemy.stateTimer <= 0) {
            enemy.state = 'stunned';
            enemy.stateTimer = 1;
        }
    } else if (enemy.state === 'stunned') {
        if (enemy.stateTimer <= 0) {
            enemy.state = 'walking';
        }
    }
}

function updateTurret(enemy, delta, distToPlayer) {
    enemy.attackCooldown -= delta;
    
    if (distToPlayer < enemy.attackRange && enemy.attackCooldown <= 0) {
        const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
        fireEnemyProjectile(enemy, toPlayer);
        enemy.attackCooldown = 0.33; // 3 shots per second
    }
}

function updateWisp(enemy, delta, distToPlayer, toPlayer) {
    if (!enemy.isFusing) {
        // Erratic movement toward player
        const moveDir = toPlayer.clone().normalize();
        moveDir.x += (Math.random() - 0.5) * 0.5;
        moveDir.z += (Math.random() - 0.5) * 0.5;
        moveDir.normalize();
        
        enemy.position.add(moveDir.multiplyScalar(enemy.speed * delta));
        
        // Start fuse when close
        if (distToPlayer < 3) {
            enemy.isFusing = true;
            enemy.fuseTimer = 1.5;
        }
    } else {
        // Fusing - glow brighter
        enemy.fuseTimer -= delta;
        
        const intensity = 1 + (1.5 - enemy.fuseTimer) * 2;
        if (enemy.mesh.children[1]) {
            enemy.mesh.children[1].material.opacity = Math.min(0.8, 0.3 + (1.5 - enemy.fuseTimer) * 0.3);
        }
        
        if (enemy.fuseTimer <= 0) {
            // Explode!
            if (distToPlayer < 3) {
                damagePlayer(enemy.damage);
            }
            
            // Visual explosion
            createExplosion(enemy.position);
            
            // Die
            enemy.active = false;
            scene.remove(enemy.mesh);
        }
    }
}

function fireEnemyProjectile(enemy, direction) {
    const proj = {
        mesh: null,
        position: enemy.position.clone(),
        velocity: direction.multiplyScalar(10),
        damage: enemy.damage,
        active: true,
        lifetime: 3
    };
    
    proj.position.y += 0.5;
    
    // Create mesh
    const geom = new THREE.SphereGeometry(0.15, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    proj.mesh = new THREE.Mesh(geom, mat);
    proj.mesh.position.copy(proj.position);
    scene.add(proj.mesh);
    
    projectiles.push(proj);
}

function createExplosion(position) {
    // Simple particle explosion
    const group = new THREE.Group();
    
    for (let i = 0; i < 8; i++) {
        const geom = new THREE.SphereGeometry(0.2, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0xff8800,
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Mesh(geom, mat);
        particle.position.copy(position);
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            Math.random() * 3,
            (Math.random() - 0.5) * 5
        );
        group.add(particle);
    }
    
    scene.add(group);
    
    // Animate and remove
    let time = 0;
    const animate = () => {
        time += 0.016;
        for (const p of group.children) {
            p.position.add(p.userData.velocity.clone().multiplyScalar(0.016));
            p.userData.velocity.y -= 10 * 0.016;
            p.material.opacity = Math.max(0, 1 - time);
        }
        
        if (time < 1) {
            requestAnimationFrame(animate);
        } else {
            scene.remove(group);
        }
    };
    animate();
}

function damageEnemy(enemy, amount) {
    enemy.health -= amount;
    showDamageNumber(enemy.position, amount, false);
    
    // Flash effect
    if (enemy.mesh.children[0] && enemy.mesh.children[0].material) {
        const originalColor = enemy.mesh.children[0].material.color.getHex();
        enemy.mesh.children[0].material.color.setHex(0xffffff);
        setTimeout(() => {
            if (enemy.mesh.children[0] && enemy.mesh.children[0].material) {
                enemy.mesh.children[0].material.color.setHex(originalColor);
            }
        }, 100);
    }
    
    if (enemy.health <= 0) {
        killEnemy(enemy);
    }
}

function killEnemy(enemy) {
    enemy.active = false;
    scene.remove(enemy.mesh);
    
    // Award XP
    if (window.awardXP) window.awardXP(enemy.xp);
    
    // Create death particles
    createExplosion(enemy.position);
}

function onRoomCleared(roomName) {
    roomCleared[roomName] = true;
    console.log(`Room cleared: ${roomName}`);
    
    // Unlock next area
    if (roomName === 'center') {
        // Already open
    } else if (roomName === 'east') {
        gateStates.west = true;
        updateGateVisuals();
        if (window.showMessage) window.showMessage('West gate opened!');
    } else if (roomName === 'west') {
        gateStates.north = true;
        updateGateVisuals();
        if (window.showMessage) window.showMessage('North gate opened!');
    } else if (roomName === 'north') {
        gateStates.south = true;
        updateGateVisuals();
        if (window.showMessage) window.showMessage('South gate opened! Floor cleared!');
        if (window.onFloorComplete) window.onFloorComplete();
    }
}

// ============================================
// MINI-BOSS
// ============================================

function spawnMiniBoss(type, tier, x, z) {
    const bossGroup = new THREE.Group();
    
    let health, size, color;
    
    if (type === 'sentinel') {
        health = tier === 1 ? 200 : 350;
        size = 3;
        color = 0x00ffff;
        
        // Create sentinel mesh
        const coreGeom = new THREE.SphereGeometry(0.8, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
        const core = new THREE.Mesh(coreGeom, coreMat);
        bossGroup.add(core);
        
        // Rings
        for (let i = 0; i < 3; i++) {
            const ringGeom = new THREE.TorusGeometry(1.2 + i * 0.2, 0.08, 8, 24);
            const ringMat = new THREE.MeshPhongMaterial({ color: 0x0066aa });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.rotation.x = Math.PI / 2 + i * 0.3;
            ring.userData.rotationSpeed = 0.5 + i * 0.3;
            bossGroup.add(ring);
        }
        
        // Eye
        const eyeGeom = new THREE.SphereGeometry(0.3, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eye.position.z = 0.7;
        bossGroup.add(eye);
        
    } else if (type === 'hollow') {
        health = tier === 1 ? 300 : 500;
        size = 4;
        color = 0x9900ff;
        
        // Humanoid shadow
        const bodyGeom = new THREE.CapsuleGeometry(0.5, 2, 4, 8);
        const bodyMat = new THREE.MeshPhongMaterial({ 
            color: 0x111111,
            transparent: true,
            opacity: 0.8
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 1.5;
        bossGroup.add(body);
        
        // Skeleton visible inside
        const skeleGeom = new THREE.CapsuleGeometry(0.3, 1.5, 4, 8);
        const skeleMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const skeleton = new THREE.Mesh(skeleGeom, skeleMat);
        skeleton.position.y = 1.5;
        bossGroup.add(skeleton);
        
        // Eyes
        const eyeGeom = new THREE.SphereGeometry(0.15, 6, 6);
        const eyeMat = new THREE.MeshBasicMaterial({ color });
        const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
        eyeL.position.set(-0.2, 2.5, 0.3);
        bossGroup.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
        eyeR.position.set(0.2, 2.5, 0.3);
        bossGroup.add(eyeR);
        
    } else if (type === 'dreamer') {
        health = tier === 1 ? 350 : 600;
        size = 3;
        color = 0xffaa00;
        
        // Amorphous glowing form
        const coreGeom = new THREE.SphereGeometry(1, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({ 
            color,
            transparent: true,
            opacity: 0.7
        });
        const core = new THREE.Mesh(coreGeom, coreMat);
        core.scale.y = 1.5;
        bossGroup.add(core);
        
        // Outer glow
        const glowGeom = new THREE.SphereGeometry(1.3, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.scale.y = 1.5;
        bossGroup.add(glow);
        
    } else if (type === 'emperor') {
        health = 800;
        size = 3.5;
        color = 0xffdd66;
        
        // Regal armored figure
        const bodyGeom = new THREE.CapsuleGeometry(0.6, 2, 4, 8);
        const bodyMat = new THREE.MeshPhongMaterial({ 
            color: 0x8b7355,
            emissive: 0x332200
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 1.5;
        bossGroup.add(body);
        
        // Crown
        const crownGeom = new THREE.CylinderGeometry(0.3, 0.4, 0.3, 6);
        const crownMat = new THREE.MeshBasicMaterial({ color });
        const crown = new THREE.Mesh(crownGeom, crownMat);
        crown.position.y = 3;
        bossGroup.add(crown);
        
        // Cape
        const capeGeom = new THREE.ConeGeometry(1, 2.5, 6);
        const capeMat = new THREE.MeshPhongMaterial({ 
            color: 0x440066,
            side: THREE.DoubleSide
        });
        const cape = new THREE.Mesh(capeGeom, capeMat);
        cape.position.set(0, 1.5, -0.3);
        cape.rotation.x = 0.2;
        bossGroup.add(cape);
        
        // Mask
        const maskGeom = new THREE.SphereGeometry(0.3, 6, 6);
        const maskMat = new THREE.MeshBasicMaterial({ color });
        const mask = new THREE.Mesh(maskGeom, maskMat);
        mask.position.set(0, 2.6, 0.2);
        mask.scale.z = 0.5;
        bossGroup.add(mask);
    }
    
    bossGroup.position.set(x, 0, z);
    scene.add(bossGroup);
    
    // Add light
    const light = new THREE.PointLight(color, 1, 15);
    light.position.y = 2;
    bossGroup.add(light);
    
    miniBoss = {
        type,
        tier,
        mesh: bossGroup,
        position: new THREE.Vector3(x, 0, z),
        velocity: new THREE.Vector3(),
        health,
        maxHealth: health,
        size,
        active: true,
        state: 'idle',
        stateTimer: 2,
        attackCooldown: 0,
        phaseTriggered: false
    };
    
    // Boss entrance dialogue
    if (type === 'emperor' && window.showDialogue) {
        window.showDialogue('???', "You've come far, dreamer. But this is where your journey ends.");
    }
}

function damageMiniBoss(amount) {
    if (!miniBoss || !miniBoss.active) return;
    
    miniBoss.health -= amount;
    showDamageNumber(miniBoss.position, amount, false);
    
    // Phase triggers for Emperor
    if (miniBoss.type === 'emperor') {
        const healthPercent = miniBoss.health / miniBoss.maxHealth;
        if (healthPercent <= 0.75 && !miniBoss.phase75) {
            miniBoss.phase75 = true;
            if (window.showDialogue) {
                window.showDialogue('Emperor', "Impressive. You have the blood of the engineers in you.");
            }
        } else if (healthPercent <= 0.5 && !miniBoss.phase50) {
            miniBoss.phase50 = true;
            if (window.showDialogue) {
                window.showDialogue('Emperor', "I have ruled for a thousand years. You are nothing.");
            }
        } else if (healthPercent <= 0.25 && !miniBoss.phase25) {
            miniBoss.phase25 = true;
            if (window.showDialogue) {
                window.showDialogue('Emperor', "No... the obelisk is MINE. The dream is MINE!");
            }
        }
    }
    
    if (miniBoss.health <= 0) {
        killMiniBoss();
    }
}

function killMiniBoss() {
    miniBoss.active = false;
    scene.remove(miniBoss.mesh);
    
    // XP reward
    let xp = 75;
    if (miniBoss.type === 'sentinel') xp = miniBoss.tier === 1 ? 75 : 125;
    else if (miniBoss.type === 'hollow') xp = miniBoss.tier === 1 ? 100 : 175;
    else if (miniBoss.type === 'dreamer') xp = miniBoss.tier === 1 ? 125 : 200;
    else if (miniBoss.type === 'emperor') xp = 500;
    
    if (window.awardXP) window.awardXP(xp);
    
    // Emperor death dialogue
    if (miniBoss.type === 'emperor' && window.showDialogue) {
        window.showDialogue('Emperor', "The truth... you'll wish you never learned it...");
    }
    
    createExplosion(miniBoss.position);
    
    miniBoss = null;
    Controls.setCameraMode(Controls.CameraMode.NORMAL);
}

function updateMiniBoss(delta) {
    if (!miniBoss || !miniBoss.active) return;
    
    miniBoss.stateTimer -= delta;
    miniBoss.attackCooldown -= delta;
    
    const distToPlayer = miniBoss.position.distanceTo(player.position);
    const toPlayer = new THREE.Vector3().subVectors(player.position, miniBoss.position);
    toPlayer.y = 0;
    
    // Face player
    if (toPlayer.length() > 0.1) {
        miniBoss.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    }
    
    // Type-specific AI
    if (miniBoss.type === 'sentinel') {
        updateSentinelBoss(delta, distToPlayer, toPlayer);
    } else if (miniBoss.type === 'hollow') {
        updateHollowBoss(delta, distToPlayer, toPlayer);
    } else if (miniBoss.type === 'dreamer') {
        updateDreamerBoss(delta, distToPlayer, toPlayer);
    } else if (miniBoss.type === 'emperor') {
        updateEmperorBoss(delta, distToPlayer, toPlayer);
    }
    
    // Animate rings for sentinel
    if (miniBoss.type === 'sentinel') {
        for (const child of miniBoss.mesh.children) {
            if (child.userData.rotationSpeed) {
                child.rotation.z += child.userData.rotationSpeed * delta;
            }
        }
    }
    
    miniBoss.mesh.position.copy(miniBoss.position);
    miniBoss.mesh.position.y = miniBoss.type === 'sentinel' ? 2 : 0;
}

function updateSentinelBoss(delta, distToPlayer, toPlayer) {
    // Float and maintain distance
    if (distToPlayer < 8) {
        const moveDir = toPlayer.clone().normalize().multiplyScalar(-2 * delta);
        miniBoss.position.add(moveDir);
    } else if (distToPlayer > 12) {
        const moveDir = toPlayer.clone().normalize().multiplyScalar(2 * delta);
        miniBoss.position.add(moveDir);
    }
    
    // Gaze Beam attack
    if (miniBoss.attackCooldown <= 0 && distToPlayer < 15) {
        // Fire beam projectile
        const beamDir = toPlayer.clone().normalize();
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (miniBoss && miniBoss.active) {
                    fireEnemyProjectile(miniBoss, beamDir.clone());
                }
            }, i * 100);
        }
        miniBoss.attackCooldown = 4;
    }
}

function updateHollowBoss(delta, distToPlayer, toPlayer) {
    if (miniBoss.state === 'idle') {
        // Walk toward player
        if (distToPlayer > 3) {
            const moveDir = toPlayer.clone().normalize().multiplyScalar(4 * delta);
            miniBoss.position.add(moveDir);
        }
        
        // Shockwave at close range
        if (distToPlayer < 6 && miniBoss.attackCooldown <= 0) {
            miniBoss.state = 'slamWindup';
            miniBoss.stateTimer = 0.75;
        }
        
        // Phase dash at long range
        if (distToPlayer > 10 && miniBoss.attackCooldown <= 0) {
            miniBoss.state = 'dashWindup';
            miniBoss.stateTimer = 0.5;
        }
    } else if (miniBoss.state === 'slamWindup') {
        if (miniBoss.stateTimer <= 0) {
            // Shockwave!
            if (distToPlayer < 8) {
                damagePlayer(20);
            }
            miniBoss.state = 'idle';
            miniBoss.attackCooldown = 3;
        }
    } else if (miniBoss.state === 'dashWindup') {
        if (miniBoss.stateTimer <= 0) {
            // Teleport to player
            miniBoss.position.copy(player.position);
            miniBoss.position.add(toPlayer.clone().normalize().multiplyScalar(-2));
            if (distToPlayer < 3) {
                damagePlayer(25);
            }
            miniBoss.state = 'idle';
            miniBoss.attackCooldown = 2;
        }
    }
}

function updateDreamerBoss(delta, distToPlayer, toPlayer) {
    // Slow float toward player
    if (distToPlayer > 6) {
        const moveDir = toPlayer.clone().normalize().multiplyScalar(2 * delta);
        miniBoss.position.add(moveDir);
    }
    
    // Dream shards attack
    if (miniBoss.attackCooldown <= 0) {
        const numShards = miniBoss.tier === 1 ? 8 : 16;
        for (let i = 0; i < numShards; i++) {
            const angle = (i / numShards) * Math.PI * 2 + Date.now() * 0.001;
            const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
            fireEnemyProjectile(miniBoss, dir);
        }
        miniBoss.attackCooldown = 3;
    }
}

function updateEmperorBoss(delta, distToPlayer, toPlayer) {
    // Menacing walk
    if (distToPlayer > 4) {
        const moveDir = toPlayer.clone().normalize().multiplyScalar(2 * delta);
        miniBoss.position.add(moveDir);
    }
    
    // Various attacks
    if (miniBoss.attackCooldown <= 0) {
        const attack = Math.random();
        if (attack < 0.4) {
            // Mandate - DOT
            damagePlayer(5);
            miniBoss.attackCooldown = 3;
        } else {
            // Summon guard (simplified - just fire projectiles)
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
                fireEnemyProjectile(miniBoss, dir);
            }
            miniBoss.attackCooldown = 5;
        }
    }
}

// ============================================
// PILLAR BOSS
// ============================================

function spawnPillarBoss() {
    const roomPos = ROOM_POSITIONS.north;
    const pillarGroup = new THREE.Group();
    
    // Pillar structure
    const pillarHeight = 12;
    const pillarRadius = 2;
    
    // Main pillar
    const pillarGeom = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarHeight, 16);
    const pillarMat = new THREE.MeshPhongMaterial({
        color: getThemeColor('wall'),
        emissive: getThemeColor('primary'),
        emissiveIntensity: 0.1
    });
    const pillar = new THREE.Mesh(pillarGeom, pillarMat);
    pillar.position.y = pillarHeight / 2;
    pillarGroup.add(pillar);
    
    // Glowing core
    const coreGeom = new THREE.CylinderGeometry(pillarRadius * 0.6, pillarRadius * 0.6, pillarHeight * 0.9, 16);
    const coreMat = new THREE.MeshBasicMaterial({
        color: getThemeColor('primary'),
        transparent: true,
        opacity: 0.5
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    core.position.y = pillarHeight / 2;
    pillarGroup.add(core);
    
    // Create weak spots
    const numWeakSpots = Math.min(3 + Math.floor(currentFloor / 3), 6);
    const weakSpots = [];
    
    for (let i = 0; i < numWeakSpots; i++) {
        const angle = (i / numWeakSpots) * Math.PI * 2;
        const height = 2 + (i / numWeakSpots) * (pillarHeight - 4);
        
        const spotGeom = new THREE.SphereGeometry(0.5, 8, 8);
        const spotMat = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.9
        });
        const spot = new THREE.Mesh(spotGeom, spotMat);
        spot.position.set(
            Math.cos(angle) * (pillarRadius + 0.3),
            height,
            Math.sin(angle) * (pillarRadius + 0.3)
        );
        pillarGroup.add(spot);
        
        // Glow
        const glowGeom = new THREE.SphereGeometry(0.7, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        spot.add(glow);
        
        weakSpots.push({
            mesh: spot,
            position: spot.position.clone().add(new THREE.Vector3(roomPos.x, 0, roomPos.z)),
            health: 100 * currentFloor,
            maxHealth: 100 * currentFloor,
            active: true,
            baseAngle: angle,
            baseHeight: height
        });
    }
    
    // Spiral platforms
    const platformGroup = new THREE.Group();
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const height = 1.5 + (i / 8) * (pillarHeight - 3);
        
        const platGeom = new THREE.BoxGeometry(3, 0.3, 4);
        const platMat = new THREE.MeshPhongMaterial({
            color: getThemeColor('wall'),
            emissive: getThemeColor('primary'),
            emissiveIntensity: 0.05
        });
        const platform = new THREE.Mesh(platGeom, platMat);
        platform.position.set(
            Math.cos(angle) * 5,
            height,
            Math.sin(angle) * 5
        );
        platform.rotation.y = -angle;
        platformGroup.add(platform);
    }
    pillarGroup.add(platformGroup);
    
    pillarGroup.position.set(roomPos.x, 0, roomPos.z);
    scene.add(pillarGroup);
    
    // Add ambient light
    const light = new THREE.PointLight(getThemeColor('primary'), 1, 30);
    light.position.y = pillarHeight / 2;
    pillarGroup.add(light);
    
    pillarBoss = {
        mesh: pillarGroup,
        position: new THREE.Vector3(roomPos.x, 0, roomPos.z),
        weakSpots,
        rotation: 0,
        rotationSpeed: 0.1,
        active: true,
        attackCooldown: 2,
        sweepActive: false,
        sweepAngle: 0
    };
}

function damagePillarWeakSpot(weakSpot, amount) {
    weakSpot.health -= amount;
    showDamageNumber(weakSpot.position, amount, false);
    
    // Flash effect
    weakSpot.mesh.material.color.setHex(0xffffff);
    setTimeout(() => {
        if (weakSpot.mesh) {
            weakSpot.mesh.material.color.setHex(0xff4444);
        }
    }, 100);
    
    if (weakSpot.health <= 0) {
        weakSpot.active = false;
        weakSpot.mesh.visible = false;
        
        // Award XP per weak spot
        if (window.awardXP) window.awardXP(currentFloor * 10);
        
        // Check if all destroyed
        const activeSpots = pillarBoss.weakSpots.filter(ws => ws.active);
        if (activeSpots.length === 0) {
            killPillarBoss();
        }
    }
}

function killPillarBoss() {
    pillarBoss.active = false;
    
    // Dramatic destruction
    const pos = pillarBoss.position.clone();
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const explosionPos = pos.clone();
            explosionPos.y = Math.random() * 12;
            explosionPos.x += (Math.random() - 0.5) * 4;
            explosionPos.z += (Math.random() - 0.5) * 4;
            createExplosion(explosionPos);
        }, i * 100);
    }
    
    setTimeout(() => {
        scene.remove(pillarBoss.mesh);
        pillarBoss = null;
        
        // Award XP
        if (window.awardXP) window.awardXP(50 * currentFloor);
        
        Controls.setCameraMode(Controls.CameraMode.NORMAL);
    }, 2000);
}

function updatePillarBoss(delta) {
    if (!pillarBoss || !pillarBoss.active) return;
    
    // Rotate pillar slowly
    pillarBoss.rotation += pillarBoss.rotationSpeed * delta;
    pillarBoss.mesh.rotation.y = pillarBoss.rotation;
    
    // Update weak spot positions
    for (const ws of pillarBoss.weakSpots) {
        if (!ws.active) continue;
        
        const angle = ws.baseAngle + pillarBoss.rotation;
        ws.position.set(
            pillarBoss.position.x + Math.cos(angle) * 2.3,
            ws.baseHeight,
            pillarBoss.position.z + Math.sin(angle) * 2.3
        );
    }
    
    // Attacks
    pillarBoss.attackCooldown -= delta;
    if (pillarBoss.attackCooldown <= 0) {
        // Energy bolt attack
        const toPlayer = new THREE.Vector3().subVectors(player.position, pillarBoss.position).normalize();
        fireEnemyProjectile({ position: pillarBoss.position.clone().setY(6), damage: 10 }, toPlayer);
        pillarBoss.attackCooldown = 2 - (currentFloor * 0.1);
    }
    
    // Sweep beam (floors 2+)
    if (currentFloor >= 2) {
        pillarBoss.sweepAngle += delta * 0.5;
        
        // Check if player is hit by sweep beam
        const playerAngle = Math.atan2(
            player.position.z - pillarBoss.position.z,
            player.position.x - pillarBoss.position.x
        );
        const beamAngle = pillarBoss.sweepAngle % (Math.PI * 2);
        const angleDiff = Math.abs(playerAngle - beamAngle);
        
        if (angleDiff < 0.2 || angleDiff > Math.PI * 2 - 0.2) {
            const distToCenter = new THREE.Vector2(
                player.position.x - pillarBoss.position.x,
                player.position.z - pillarBoss.position.z
            ).length();
            
            if (distToCenter < 8 && player.position.y < 2) {
                damagePlayer(5 * delta);
            }
        }
    }
}

// ============================================
// DUNGEON GENERATION
// ============================================

function initDungeon(sceneRef, floor) {
    scene = sceneRef;
    currentFloor = floor;
    currentRoom = 'center';
    
    // Clear existing dungeon
    if (dungeonGroup) {
        scene.remove(dungeonGroup);
    }
    
    dungeonGroup = new THREE.Group();
    
    // Get theme
    let theme;
    if (floor <= 3) theme = FLOOR_THEMES.machine;
    else if (floor <= 6) theme = FLOOR_THEMES.corruption;
    else if (floor <= 9) theme = FLOOR_THEMES.dream;
    else theme = FLOOR_THEMES.source;
    
    // Set fog
    scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity);
    scene.background = new THREE.Color(theme.fog);
    
    // Ambient light
    const ambient = new THREE.AmbientLight(theme.ambient, 0.3);
    dungeonGroup.add(ambient);
    
    // Create rooms
    createRoom('center', theme);
    createRoom('east', theme);
    createRoom('west', theme);
    createRoom('north', theme);
    createRoom('south', theme);
    
    // Create hallways
    createHallway('east', theme);
    createHallway('west', theme);
    createHallway('north', theme);
    createHallway('south', theme);
    
    // Create gates
    createGates(theme);
    
    scene.add(dungeonGroup);
    
    // Reset states
    roomCleared.center = false;
    roomCleared.east = false;
    roomCleared.west = false;
    roomCleared.north = false;
    roomCleared.south = false;
    
    gateStates.east = true;
    gateStates.west = false;
    gateStates.north = false;
    gateStates.south = false;
    
    // Clear entities
    for (const enemy of enemies) {
        if (enemy.mesh) scene.remove(enemy.mesh);
    }
    enemies = [];
    
    for (const proj of projectiles) {
        if (proj.mesh) scene.remove(proj.mesh);
    }
    projectiles = [];
    
    for (const proj of playerProjectiles) {
        if (proj.mesh) scene.remove(proj.mesh);
    }
    playerProjectiles = [];
    
    miniBoss = null;
    pillarBoss = null;
    
    // Spawn initial enemies in center
    spawnRoomEnemies('center');
    
    return dungeonGroup;
}

function createRoom(roomName, theme) {
    const pos = ROOM_POSITIONS[roomName];
    const size = roomName === 'north' ? ROOM_SIZE.pillar :
                 roomName === 'center' ? ROOM_SIZE.center : ROOM_SIZE.orbital;
    
    const roomGroup = new THREE.Group();
    
    // Floor
    const floorGeom = new THREE.PlaneGeometry(size.width, size.depth);
    const floorMat = new THREE.MeshPhongMaterial({
        color: theme.floor,
        side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    roomGroup.add(floor);
    
    // Walls
    const wallMat = new THREE.MeshPhongMaterial({ color: theme.wall });
    
    // North wall
    const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(size.width, size.height, 0.5),
        wallMat
    );
    northWall.position.set(0, size.height / 2, -size.depth / 2);
    roomGroup.add(northWall);
    
    // South wall
    const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(size.width, size.height, 0.5),
        wallMat
    );
    southWall.position.set(0, size.height / 2, size.depth / 2);
    roomGroup.add(southWall);
    
    // East wall
    const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, size.height, size.depth),
        wallMat
    );
    eastWall.position.set(size.width / 2, size.height / 2, 0);
    roomGroup.add(eastWall);
    
    // West wall
    const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, size.height, size.depth),
        wallMat
    );
    westWall.position.set(-size.width / 2, size.height / 2, 0);
    roomGroup.add(westWall);
    
    // Ceiling
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(size.width, size.depth),
        new THREE.MeshPhongMaterial({ color: theme.wall, side: THREE.DoubleSide })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = size.height;
    roomGroup.add(ceiling);
    
    // Room-specific decorations
    if (roomName === 'center') {
        // Central obelisk fragment
        const obeliskGeom = new THREE.BoxGeometry(1, 4, 1);
        const obeliskMat = new THREE.MeshBasicMaterial({
            color: theme.primary,
            transparent: true,
            opacity: 0.8
        });
        const obelisk = new THREE.Mesh(obeliskGeom, obeliskMat);
        obelisk.position.y = 2;
        roomGroup.add(obelisk);
        
        // Obelisk light
        const obeliskLight = new THREE.PointLight(theme.primary, 1, 15);
        obeliskLight.position.y = 3;
        roomGroup.add(obeliskLight);
    }
    
    // Spotlights
    const spotCount = roomName === 'center' ? 4 : 2;
    for (let i = 0; i < spotCount; i++) {
        const angle = (i / spotCount) * Math.PI * 2;
        const dist = Math.min(size.width, size.depth) * 0.3;
        
        const spotlight = new THREE.SpotLight(theme.primary, 0.8, 30, Math.PI / 6, 0.5);
        spotlight.position.set(
            Math.cos(angle) * dist,
            size.height - 0.5,
            Math.sin(angle) * dist
        );
        spotlight.target.position.set(
            Math.cos(angle) * dist * 0.5,
            0,
            Math.sin(angle) * dist * 0.5
        );
        roomGroup.add(spotlight);
        roomGroup.add(spotlight.target);
    }
    
    roomGroup.position.set(pos.x, 0, pos.z);
    dungeonGroup.add(roomGroup);
}

function createHallway(direction, theme) {
    const pos = HALLWAY_POSITIONS[direction];
    const size = ROOM_SIZE.hallway;
    
    const hallwayGroup = new THREE.Group();
    
    // Floor
    const floorGeom = new THREE.PlaneGeometry(
        direction === 'east' || direction === 'west' ? size.depth : size.width,
        direction === 'east' || direction === 'west' ? size.width : size.depth
    );
    const floorMat = new THREE.MeshPhongMaterial({ color: theme.floor, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    hallwayGroup.add(floor);
    
    // Walls
    const wallMat = new THREE.MeshPhongMaterial({ color: theme.wall });
    
    if (direction === 'east' || direction === 'west') {
        // Side walls
        const wall1 = new THREE.Mesh(
            new THREE.BoxGeometry(size.depth, size.height, 0.5),
            wallMat
        );
        wall1.position.set(0, size.height / 2, -size.width / 2);
        hallwayGroup.add(wall1);
        
        const wall2 = new THREE.Mesh(
            new THREE.BoxGeometry(size.depth, size.height, 0.5),
            wallMat
        );
        wall2.position.set(0, size.height / 2, size.width / 2);
        hallwayGroup.add(wall2);
    } else {
        // Side walls
        const wall1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, size.height, size.depth),
            wallMat
        );
        wall1.position.set(-size.width / 2, size.height / 2, 0);
        hallwayGroup.add(wall1);
        
        const wall2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, size.height, size.depth),
            wallMat
        );
        wall2.position.set(size.width / 2, size.height / 2, 0);
        hallwayGroup.add(wall2);
    }
    
    // Ceiling
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(
            direction === 'east' || direction === 'west' ? size.depth : size.width,
            direction === 'east' || direction === 'west' ? size.width : size.depth
        ),
        new THREE.MeshPhongMaterial({ color: theme.wall, side: THREE.DoubleSide })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = size.height;
    hallwayGroup.add(ceiling);
    
    // Light
    const light = new THREE.PointLight(theme.primary, 0.5, 15);
    light.position.y = size.height - 1;
    hallwayGroup.add(light);
    
    hallwayGroup.position.set(pos.x, 0, pos.z);
    dungeonGroup.add(hallwayGroup);
}

let gateMeshes = {};

function createGates(theme) {
    gateMeshes = {};
    
    const gateMat = new THREE.MeshBasicMaterial({
        color: theme.primary,
        transparent: true,
        opacity: 0.6
    });
    
    // East gate (always open)
    // West gate
    const westGate = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 5),
        gateMat.clone()
    );
    westGate.position.set(-12, 2.5, 0);
    westGate.rotation.y = Math.PI / 2;
    dungeonGroup.add(westGate);
    gateMeshes.west = westGate;
    
    // North gate
    const northGate = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 5),
        gateMat.clone()
    );
    northGate.position.set(0, 2.5, -12);
    dungeonGroup.add(northGate);
    gateMeshes.north = northGate;
    
    // South gate
    const southGate = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 5),
        gateMat.clone()
    );
    southGate.position.set(0, 2.5, 12);
    dungeonGroup.add(southGate);
    gateMeshes.south = southGate;
    
    updateGateVisuals();
}

function updateGateVisuals() {
    if (gateMeshes.west) {
        gateMeshes.west.visible = !gateStates.west;
    }
    if (gateMeshes.north) {
        gateMeshes.north.visible = !gateStates.north;
    }
    if (gateMeshes.south) {
        gateMeshes.south.visible = !gateStates.south;
    }
}

function getDungeonData() {
    return {
        currentFloor,
        currentRoom,
        gateStates: { ...gateStates },
        roomCleared: { ...roomCleared }
    };
}

function updateDungeon(delta) {
    // Animate obelisk in center room
    if (dungeonGroup) {
        const time = Date.now() * 0.001;
        // Could add pulsing animations here
    }
}

// ============================================
// TOWN
// ============================================

function initTown(sceneRef) {
    scene = sceneRef;
    
    // Clear existing
    if (townGroup) {
        scene.remove(townGroup);
    }
    
    townGroup = new THREE.Group();
    
    // Set atmosphere
    scene.fog = new THREE.FogExp2(0x1a2a1a, 0.02);
    scene.background = new THREE.Color(0x1a2a1a);
    
    // Ambient light
    const ambient = new THREE.AmbientLight(0x334433, 0.5);
    townGroup.add(ambient);
    
    // Ground - forest clearing
    const groundGeom = new THREE.CircleGeometry(30, 32);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0x2a3a2a });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    townGroup.add(ground);
    
    // Path to cave
    const pathGeom = new THREE.PlaneGeometry(4, 20);
    const pathMat = new THREE.MeshPhongMaterial({ color: 0x3a3a2a });
    const path = new THREE.Mesh(pathGeom, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, -10);
    townGroup.add(path);
    
    // Cave entrance
    createCaveEntrance();
    
    // Trees around the clearing
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const dist = 25 + Math.random() * 10;
        createTree(Math.cos(angle) * dist, Math.sin(angle) * dist);
    }
    
    // Campfire in center
    createCampfire(0, 5);
    
    // Caravan circle
    createCaravanCircle();
    
    scene.add(townGroup);
    
    // Spawn NPCs based on progress
    spawnTownNPCs();
    
    return townGroup;
}

function createCaveEntrance() {
    const entranceGroup = new THREE.Group();
    
    // Cliff face
    const cliffGeom = new THREE.BoxGeometry(15, 10, 3);
    const cliffMat = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
    const cliff = new THREE.Mesh(cliffGeom, cliffMat);
    cliff.position.set(0, 5, -22);
    entranceGroup.add(cliff);
    
    // Cave opening
    const doorFrameGeom = new THREE.TorusGeometry(3, 0.5, 8, 16, Math.PI);
    const doorFrameMat = new THREE.MeshPhongMaterial({ 
        color: 0x8b7355,
        emissive: 0x221100
    });
    const doorFrame = new THREE.Mesh(doorFrameGeom, doorFrameMat);
    doorFrame.position.set(0, 3, -20.5);
    entranceGroup.add(doorFrame);
    
    // Glowing runes
    const runeGeom = new THREE.PlaneGeometry(6, 6);
    const runeMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.5
    });
    const runes = new THREE.Mesh(runeGeom, runeMat);
    runes.position.set(0, 4, -20.4);
    entranceGroup.add(runes);
    
    // Light from cave
    const caveLight = new THREE.PointLight(0x00ffff, 0.8, 15);
    caveLight.position.set(0, 3, -19);
    entranceGroup.add(caveLight);
    
    townGroup.add(entranceGroup);
}

function createTree(x, z) {
    const treeGroup = new THREE.Group();
    
    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 4, 6);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x4a3520 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 2;
    treeGroup.add(trunk);
    
    // Foliage
    const foliageGeom = new THREE.ConeGeometry(2, 5, 8);
    const foliageMat = new THREE.MeshPhongMaterial({ color: 0x2a4a2a });
    const foliage = new THREE.Mesh(foliageGeom, foliageMat);
    foliage.position.y = 5.5;
    treeGroup.add(foliage);
    
    treeGroup.position.set(x, 0, z);
    treeGroup.rotation.y = Math.random() * Math.PI * 2;
    townGroup.add(treeGroup);
}

function createCampfire(x, z) {
    const fireGroup = new THREE.Group();
    
    // Stones
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const stoneGeom = new THREE.SphereGeometry(0.3, 6, 6);
        const stoneMat = new THREE.MeshPhongMaterial({ color: 0x5a5a5a });
        const stone = new THREE.Mesh(stoneGeom, stoneMat);
        stone.position.set(Math.cos(angle) * 0.8, 0.15, Math.sin(angle) * 0.8);
        stone.scale.y = 0.5;
        fireGroup.add(stone);
    }
    
    // Fire (emissive cone)
    const fireGeom = new THREE.ConeGeometry(0.4, 1, 6);
    const fireMat = new THREE.MeshBasicMaterial({ 
        color: 0xff6600,
        transparent: true,
        opacity: 0.9
    });
    const fire = new THREE.Mesh(fireGeom, fireMat);
    fire.position.y = 0.5;
    fireGroup.add(fire);
    
    // Fire light
    const fireLight = new THREE.PointLight(0xff6600, 1.5, 15);
    fireLight.position.y = 1;
    fireGroup.add(fireLight);
    townLights.push(fireLight);
    
    fireGroup.position.set(x, 0, z);
    townGroup.add(fireGroup);
}

function createCaravanCircle() {
    // Wagon positions
    const wagonPositions = [
        { x: -8, z: 3, rot: 0.5 },
        { x: 8, z: 3, rot: -0.5 },
        { x: -10, z: 8, rot: 0.8 },
        { x: 10, z: 8, rot: -0.8 }
    ];
    
    for (const pos of wagonPositions) {
        createWagon(pos.x, pos.z, pos.rot);
    }
}

function createWagon(x, z, rot) {
    const wagonGroup = new THREE.Group();
    
    // Base
    const baseGeom = new THREE.BoxGeometry(3, 0.5, 2);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x5a4030 });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = 0.8;
    wagonGroup.add(base);
    
    // Walls
    const wallMat = new THREE.MeshPhongMaterial({ color: 0x4a3525 });
    
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.1), wallMat);
    backWall.position.set(0, 1.8, -0.95);
    wagonGroup.add(backWall);
    
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 2), wallMat);
    leftWall.position.set(-1.45, 1.8, 0);
    wagonGroup.add(leftWall);
    
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 2), wallMat);
    rightWall.position.set(1.45, 1.8, 0);
    wagonGroup.add(rightWall);
    
    // Roof
    const roofGeom = new THREE.BoxGeometry(3.2, 0.2, 2.5);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x6a5535 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = 2.6;
    wagonGroup.add(roof);
    
    // Wheels
    const wheelGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x3a3030 });
    
    for (const wx of [-1.2, 1.2]) {
        for (const wz of [-0.8, 0.8]) {
            const wheel = new THREE.Mesh(wheelGeom, wheelMat);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(wx, 0.4, wz);
            wagonGroup.add(wheel);
        }
    }
    
    wagonGroup.position.set(x, 0, z);
    wagonGroup.rotation.y = rot;
    townGroup.add(wagonGroup);
}

function spawnTownNPCs() {
    // Clear existing NPCs
    for (const npc of npcs) {
        if (npc.mesh) scene.remove(npc.mesh);
    }
    npcs = [];
    
    // Guide is always present
    spawnNPC('guide', -2, -15);
    
    // Others arrive based on floor progress
    const maxFloor = window.gameState?.maxFloorReached || 1;
    
    if (maxFloor >= 1) spawnNPC('merchant', -8, 4);
    if (maxFloor >= 2) spawnNPC('scholar', 8, 4);
    if (maxFloor >= 3) spawnNPC('storyteller', 1, 6);
    if (maxFloor >= 5) spawnNPC('scientist', -10, 9);
    if (maxFloor >= 7) spawnNPC('hooded', 12, 12);
    if (maxFloor >= 9) spawnNPC('traveler', -5, 10);
}

function spawnNPC(type, x, z) {
    const npcGroup = new THREE.Group();
    
    let color, height;
    switch (type) {
        case 'guide':
            color = 0x4a4a6a;
            height = 1.8;
            break;
        case 'merchant':
            color = 0x6a5a4a;
            height = 1.6;
            break;
        case 'scholar':
            color = 0x5a5a8a;
            height = 1.7;
            break;
        case 'storyteller':
            color = 0x8a6a4a;
            height = 1.9;
            break;
        case 'scientist':
            color = 0x6a6a6a;
            height = 1.7;
            break;
        case 'hooded':
            color = 0x2a2a3a;
            height = 2.0;
            break;
        case 'traveler':
            color = 0x5a4a4a;
            height = 1.6;
            break;
        default:
            color = 0x5a5a5a;
            height = 1.7;
    }
    
    // Body
    const bodyGeom = new THREE.CapsuleGeometry(0.3, height - 0.6, 4, 8);
    const bodyMat = new THREE.MeshPhongMaterial({ color });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = height / 2;
    npcGroup.add(body);
    
    // Head
    const headGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xddb896 });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = height + 0.1;
    npcGroup.add(head);
    
    // Interaction indicator
    const indicatorGeom = new THREE.ConeGeometry(0.2, 0.3, 4);
    const indicatorMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
    });
    const indicator = new THREE.Mesh(indicatorGeom, indicatorMat);
    indicator.position.y = height + 0.7;
    indicator.rotation.x = Math.PI;
    npcGroup.add(indicator);
    
    npcGroup.position.set(x, 0, z);
    townGroup.add(npcGroup);
    
    const npc = {
        type,
        mesh: npcGroup,
        position: new THREE.Vector3(x, 0, z),
        interactionRadius: 3
    };
    
    npcs.push(npc);
    return npc;
}

function updateTown(delta) {
    // Animate fire light
    for (const light of townLights) {
        light.intensity = 1.5 + Math.sin(Date.now() * 0.01) * 0.3;
    }
    
    // Animate NPC indicators
    for (const npc of npcs) {
        if (npc.mesh.children[2]) { // Indicator
            npc.mesh.children[2].position.y = 
                (npc.type === 'hooded' ? 2.0 : 1.8) + 0.7 + Math.sin(Date.now() * 0.005) * 0.1;
        }
    }
}

function checkNPCInteraction(playerPos) {
    for (const npc of npcs) {
        const dist = playerPos.distanceTo(npc.position);
        if (dist < npc.interactionRadius) {
            return npc;
        }
    }
    return null;
}

function getNPCDialogue(npcType, maxFloor) {
    const dialogues = {
        guide: {
            default: [
                "The obelisk calls to you. I've seen it in my dreams.",
                "Ready yourself before descending. The machines still guard the upper levels.",
                "Rest now. I'll remember your journey."
            ],
            floor3: [
                "You've proven yourself. The real challenge lies below.",
                "The corruption spreads deeper. Stay vigilant."
            ]
        },
        merchant: {
            default: [
                "Dangerous work you're doing. These'll keep you breathing.",
                "I've sold supplies to a hundred explorers. You might actually make it."
            ]
        },
        scholar: {
            default: [
                "My master spoke of places like this. The old knowledge isn't lost - just hidden.",
                "Your potential is remarkable. Let me help you focus it."
            ]
        },
        storyteller: {
            default: [
                "We remember what the city dwellers forgot. The obelisks were meant to heal, not harm.",
                "You fight with dream-fire. My people have a name for ones like you."
            ]
        },
        scientist: {
            default: [
                "Fascinating. The corruption follows patterns I've only theorized about.",
                "The ruling family has hidden so much from us. But you're finding the truth."
            ]
        },
        hooded: {
            default: [
                "There are those who profit from the world's madness. Be careful.",
                "The Emperor knows you're coming. He's known since you first dreamed of this place.",
                "We are not enemies. Not yet."
            ]
        },
        traveler: {
            default: [
                "He's waiting for you. The Emperor himself. At the threshold.",
                "I tried to reach the core. I wasn't strong enough.",
                "End this. Please."
            ]
        }
    };
    
    const npcDialogues = dialogues[npcType];
    if (!npcDialogues) return "...";
    
    let pool = npcDialogues.default;
    if (maxFloor >= 3 && npcDialogues.floor3) {
        pool = [...pool, ...npcDialogues.floor3];
    }
    
    return pool[Math.floor(Math.random() * pool.length)];
}

function getLoreFragment(floor) {
    const fragments = LORE_FRAGMENTS[floor];
    if (!fragments) return null;
    return fragments[Math.floor(Math.random() * fragments.length)];
}

// ============================================
// EXPORTS
// ============================================

function getCurrentRoom() {
    return currentRoom;
}

function getCurrentFloor() {
    return currentFloor;
}

function getPlayer() {
    return player;
}

function isInTown() {
    return townGroup !== null && townGroup.parent !== null;
}

function cleanupDungeon() {
    if (dungeonGroup) {
        scene.remove(dungeonGroup);
        dungeonGroup = null;
    }
    
    for (const enemy of enemies) {
        if (enemy.mesh) scene.remove(enemy.mesh);
    }
    enemies = [];
    
    for (const proj of [...projectiles, ...playerProjectiles]) {
        if (proj.mesh) scene.remove(proj.mesh);
    }
    projectiles = [];
    playerProjectiles = [];
    
    if (miniBoss && miniBoss.mesh) scene.remove(miniBoss.mesh);
    miniBoss = null;
    
    if (pillarBoss && pillarBoss.mesh) scene.remove(pillarBoss.mesh);
    pillarBoss = null;
}

function cleanupTown() {
    if (townGroup) {
        scene.remove(townGroup);
        townGroup = null;
    }
    
    for (const npc of npcs) {
        if (npc.mesh) scene.remove(npc.mesh);
    }
    npcs = [];
    townLights = [];
}

// ============================================
// GLOBAL WORLD OBJECT
// Expose all functions for use by game.js
// ============================================

const World = {
    // Player
    player,
    initPlayer,
    updatePlayer,
    damagePlayer,
    healPlayer,
    applyUpgrades,
    resetPlayerPosition,
    fullHealPlayer,
    getPlayer,
    
    // Projectiles
    updateProjectiles,
    
    // Enemies
    updateEnemies,
    
    // Bosses
    updateMiniBoss,
    updatePillarBoss,
    
    // Dungeon
    initDungeon,
    updateDungeon,
    getDungeonData,
    getCurrentRoom,
    getCurrentFloor,
    cleanupDungeon,
    
    // Town
    initTown,
    updateTown,
    checkNPCInteraction,
    getNPCDialogue,
    getLoreFragment,
    isInTown,
    cleanupTown
};
