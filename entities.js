// ============================================
// ECHOES OF THE OBELISK - Entity System
// Player, enemies, mini-bosses, pillar boss
// ============================================

import * as THREE from 'three';
import { getDungeonScene, getRoomData, getCurrentFloor } from './dungeon.js';
import { damagePlayer, getUpgradeLevel, hasAbility, getGameData } from './game.js';

// ============================================
// STATE
// ============================================

let player;
let enemies = [];
let projectiles = [];
let currentBoss = null;
let pillarBoss = null;
let xpGained = 0;

const cooldowns = { attack: 0, spread: 0, burst: 0, mega: 0 };
let burstModeActive = false;
let burstModeTimer = 0;

// ============================================
// INITIALIZATION
// ============================================

export async function initEntities() {
    createPlayer();
    return Promise.resolve();
}

// ============================================
// PLAYER
// ============================================

function createPlayer() {
    player = new THREE.Group();
    player.name = 'player';
    
    const robeColor = 0x1a237e;
    const glowColor = 0x00ffff;
    
    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    player.add(body);
    
    // Robe
    const robeGeom = new THREE.ConeGeometry(0.45, 0.6, 8);
    const robe = new THREE.Mesh(robeGeom, bodyMat);
    robe.position.y = 0.3;
    robe.rotation.x = Math.PI;
    player.add(robe);
    
    // Head
    const headGeom = new THREE.SphereGeometry(0.25, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x111122 });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.15;
    player.add(head);
    
    // Hood
    const hoodGeom = new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hood = new THREE.Mesh(hoodGeom, bodyMat);
    hood.position.y = 1.2;
    hood.rotation.x = 0.2;
    player.add(hood);
    
    // Hands
    const handGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const handMat = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.8 });
    const leftHand = new THREE.Mesh(handGeom, handMat);
    leftHand.position.set(-0.4, 0.7, 0.2);
    player.add(leftHand);
    const rightHand = new THREE.Mesh(handGeom, handMat);
    rightHand.position.set(0.4, 0.7, 0.2);
    player.add(rightHand);
    
    // Aura
    const auraGeom = new THREE.RingGeometry(0.3, 0.5, 16);
    const auraMat = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const aura = new THREE.Mesh(auraGeom, auraMat);
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.02;
    player.add(aura);
    
    // Light
    const playerLight = new THREE.PointLight(glowColor, 0.5, 5);
    playerLight.position.y = 1;
    player.add(playerLight);
    
    player.userData = {
        velocity: new THREE.Vector3(),
        onGround: true,
        canWallJump: false,
        lastWallNormal: null,
        height: 1.5,
        radius: 0.35,
        moveSpeed: 6,
        jumpForce: 12,
        gravity: -25
    };
    
    player.position.set(0, 0, 0);
}

export function getPlayer() { return player; }

// ============================================
// PLAYER PHYSICS
// ============================================

function updatePlayer(delta, inputState) {
    if (!player) return;
    
    const { moveX, moveZ, jump, attack } = inputState;
    const userData = player.userData;
    
    // Movement
    const moveDir = new THREE.Vector3(moveX, 0, moveZ);
    if (moveDir.length() > 0) {
        moveDir.normalize();
        player.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        player.position.x += moveDir.x * userData.moveSpeed * delta;
        player.position.z += moveDir.z * userData.moveSpeed * delta;
    }
    
    // Gravity
    userData.velocity.y += userData.gravity * delta;
    
    // Jump
    if (jump && userData.onGround) {
        userData.velocity.y = userData.jumpForce;
        userData.onGround = false;
    }
    
    // Wall jump
    if (jump && !userData.onGround && userData.canWallJump) {
        userData.velocity.y = userData.jumpForce * 0.9;
        if (userData.lastWallNormal) {
            player.position.x += userData.lastWallNormal.x * 0.5;
            player.position.z += userData.lastWallNormal.z * 0.5;
        }
        userData.canWallJump = false;
    }
    
    player.position.y += userData.velocity.y * delta;
    
    // Ground
    if (player.position.y <= 0) {
        player.position.y = 0;
        userData.velocity.y = 0;
        userData.onGround = true;
        userData.canWallJump = false;
    }
    
    checkPlatformCollision();
    checkWallCollision();
    
    // Combat
    updateCooldowns(delta);
    if (attack) fireBasicAttack();
    if (inputState.ability1 && hasAbility('spread') && cooldowns.spread <= 0) fireSpreadAttack();
    if (inputState.ability2 && hasAbility('burst') && cooldowns.burst <= 0) activateBurstMode();
    if (inputState.ability3 && hasAbility('mega') && cooldowns.mega <= 0) fireMegaBall();
    
    if (burstModeActive) {
        burstModeTimer -= delta;
        if (burstModeTimer <= 0) burstModeActive = false;
    }
    
    checkEnemyCollision();
}

function checkPlatformCollision() {
    const scene = getDungeonScene();
    if (!scene) return;
    
    scene.traverse(obj => {
        if (obj.userData?.isPlatform) {
            const box = new THREE.Box3().setFromObject(obj);
            if (player.userData.velocity.y < 0) {
                const prevY = player.position.y - player.userData.velocity.y * 0.016;
                if (prevY >= box.max.y && player.position.y < box.max.y) {
                    if (player.position.x > box.min.x && player.position.x < box.max.x &&
                        player.position.z > box.min.z && player.position.z < box.max.z) {
                        player.position.y = box.max.y;
                        player.userData.velocity.y = 0;
                        player.userData.onGround = true;
                    }
                }
            }
        }
    });
}

function checkWallCollision() {
    const scene = getDungeonScene();
    if (!scene) return;
    
    const playerRadius = player.userData.radius;
    player.userData.canWallJump = false;
    
    scene.traverse(obj => {
        if (obj.geometry && obj.material && !obj.userData?.isPlatform && !obj.userData?.isPortal) {
            const box = new THREE.Box3().setFromObject(obj);
            const closestX = Math.max(box.min.x, Math.min(player.position.x, box.max.x));
            const closestZ = Math.max(box.min.z, Math.min(player.position.z, box.max.z));
            const distX = player.position.x - closestX;
            const distZ = player.position.z - closestZ;
            const dist = Math.sqrt(distX * distX + distZ * distZ);
            
            if (dist < playerRadius && box.max.y > player.position.y + 0.5) {
                if (dist > 0) {
                    player.position.x += (distX / dist) * (playerRadius - dist);
                    player.position.z += (distZ / dist) * (playerRadius - dist);
                    if (!player.userData.onGround) {
                        player.userData.canWallJump = true;
                        player.userData.lastWallNormal = new THREE.Vector3(distX, 0, distZ).normalize();
                    }
                }
            }
        }
    });
}

function checkEnemyCollision() {
    enemies.forEach(enemy => {
        if (!enemy.userData.alive) return;
        const dist = player.position.distanceTo(enemy.position);
        if (dist < player.userData.radius + enemy.userData.radius) {
            damagePlayer(enemy.userData.contactDamage || 5);
            const pushDir = new THREE.Vector3().subVectors(player.position, enemy.position).normalize().multiplyScalar(2);
            player.position.add(pushDir);
        }
    });
    
    if (currentBoss?.userData.alive) {
        const dist = player.position.distanceTo(currentBoss.position);
        if (dist < player.userData.radius + currentBoss.userData.radius) {
            damagePlayer(currentBoss.userData.contactDamage || 15);
            const pushDir = new THREE.Vector3().subVectors(player.position, currentBoss.position).normalize().multiplyScalar(3);
            player.position.add(pushDir);
        }
    }
}

// ============================================
// COMBAT
// ============================================

function updateCooldowns(delta) {
    const cdReduction = 1 + getUpgradeLevel('cooldownReduction') * 0.1;
    cooldowns.attack -= delta * cdReduction;
    cooldowns.spread -= delta * cdReduction;
    cooldowns.burst -= delta * cdReduction;
    cooldowns.mega -= delta * cdReduction;
    updateAbilityCooldownUI();
}

function updateAbilityCooldownUI() {
    const maxCooldowns = { spread: 8, burst: 15, mega: 20 };
    ['spread', 'burst', 'mega'].forEach(ability => {
        const elem = document.querySelector(`#ability-${ability} .ability-cooldown`);
        const slot = document.getElementById(`ability-${ability}`);
        const btn = document.getElementById(`btn-${ability}`);
        if (elem && slot) {
            const percent = Math.max(0, cooldowns[ability] / maxCooldowns[ability]) * 100;
            elem.style.height = percent + '%';
            if (cooldowns[ability] <= 0 && hasAbility(ability)) {
                slot.classList.add('ready');
                btn?.classList.add('ready');
                btn?.classList.remove('on-cooldown');
            } else {
                slot.classList.remove('ready');
                btn?.classList.remove('ready');
                btn?.classList.add('on-cooldown');
            }
        }
    });
}

function getAttackCooldown() {
    const baseRate = 0.4;
    const fireRateBonus = getUpgradeLevel('fireRate') * 0.03;
    return burstModeActive ? (baseRate - fireRateBonus) * 0.3 : baseRate - fireRateBonus;
}

function getBaseDamage() { return 10 + getUpgradeLevel('baseDamage') * 2; }
function getAbilityDamage() { return 15 + getUpgradeLevel('abilityDamage') * 3; }
function getAimAssist() { return getUpgradeLevel('aimAssist') * 0.1; }

function getPlayerForward() {
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(player.quaternion);
    return forward;
}

function fireBasicAttack() {
    if (cooldowns.attack > 0) return;
    cooldowns.attack = getAttackCooldown();
    
    const proj = createProjectile(
        player.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
        getPlayerForward(), getBaseDamage(), 'basic', 0x00ffff
    );
    projectiles.push(proj);
    getDungeonScene()?.add(proj);
}

function fireSpreadAttack() {
    cooldowns.spread = 8;
    const forward = getPlayerForward();
    [-0.4, -0.2, 0, 0.2, 0.4].forEach(angle => {
        const dir = forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        const proj = createProjectile(
            player.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
            dir, getAbilityDamage() * 0.7, 'spread', 0x00ff88
        );
        projectiles.push(proj);
        getDungeonScene()?.add(proj);
    });
}

function activateBurstMode() {
    cooldowns.burst = 15;
    burstModeActive = true;
    burstModeTimer = 3;
    const slot = document.getElementById('ability-burst');
    slot?.classList.add('active');
    setTimeout(() => slot?.classList.remove('active'), 3000);
}

function fireMegaBall() {
    cooldowns.mega = 20;
    const proj = createProjectile(
        player.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
        getPlayerForward(), getAbilityDamage() * 3, 'mega', 0xffaa00
    );
    proj.scale.setScalar(2);
    proj.userData.speed = 8;
    proj.userData.piercing = true;
    projectiles.push(proj);
    getDungeonScene()?.add(proj);
}

function createProjectile(position, direction, damage, type, color) {
    const geom = new THREE.SphereGeometry(0.15, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const proj = new THREE.Mesh(geom, mat);
    proj.position.copy(position);
    proj.userData = { direction: direction.normalize(), speed: 15, damage, type, lifetime: 3, isPlayerProjectile: true, aimAssist: getAimAssist() };
    
    const glowGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
    proj.add(new THREE.Mesh(glowGeom, glowMat));
    return proj;
}

function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        
        if (proj.userData.isPlayerProjectile && proj.userData.aimAssist > 0) {
            const nearest = findNearestEnemy(proj.position);
            if (nearest) {
                const toEnemy = new THREE.Vector3().subVectors(nearest.position, proj.position).normalize();
                proj.userData.direction.lerp(toEnemy, proj.userData.aimAssist * delta * 2).normalize();
            }
        }
        
        proj.position.add(proj.userData.direction.clone().multiplyScalar(proj.userData.speed * delta));
        proj.userData.lifetime -= delta;
        
        if (proj.userData.lifetime <= 0) { removeProjectile(i); continue; }
        
        if (proj.userData.isPlayerProjectile) {
            let hit = false;
            for (const enemy of enemies) {
                if (!enemy.userData.alive) continue;
                if (proj.position.distanceTo(enemy.position) < 0.5 + enemy.userData.radius) {
                    damageEnemy(enemy, proj.userData.damage);
                    hit = true;
                    if (!proj.userData.piercing) break;
                }
            }
            if (currentBoss?.userData.alive && proj.position.distanceTo(currentBoss.position) < 0.5 + currentBoss.userData.radius) {
                damageBoss(currentBoss, proj.userData.damage);
                hit = true;
            }
            if (pillarBoss) hit = checkPillarBossHit(proj) || hit;
            if (hit && !proj.userData.piercing) { removeProjectile(i); continue; }
        } else {
            if (proj.position.distanceTo(player.position) < 0.5 + player.userData.radius) {
                damagePlayer(proj.userData.damage);
                removeProjectile(i);
                continue;
            }
        }
        
        if (proj.position.y < 0 || proj.position.y > 20) removeProjectile(i);
    }
}

function removeProjectile(index) {
    const proj = projectiles[index];
    getDungeonScene()?.remove(proj);
    proj.geometry?.dispose();
    proj.material?.dispose();
    projectiles.splice(index, 1);
}

function findNearestEnemy(position) {
    let nearest = null, nearestDist = Infinity;
    enemies.forEach(e => {
        if (!e.userData.alive) return;
        const dist = position.distanceTo(e.position);
        if (dist < nearestDist) { nearestDist = dist; nearest = e; }
    });
    if (currentBoss?.userData.alive) {
        const dist = position.distanceTo(currentBoss.position);
        if (dist < nearestDist) nearest = currentBoss;
    }
    return nearest;
}

// ============================================
// ENEMIES
// ============================================

function getEnemyStyle(floor) {
    if (floor <= 3) return { primary: 0x334455, secondary: 0x00ffff, emissive: 0x003333, style: 'mechanical' };
    if (floor <= 6) return { primary: 0x442244, secondary: 0xbf00ff, emissive: 0x330033, style: 'corrupted' };
    return { primary: 0x443322, secondary: 0xffaa00, emissive: 0x331100, style: 'dream' };
}

function createEnemy(type, position, floor) {
    const enemy = new THREE.Group();
    const style = getEnemyStyle(floor);
    
    if (type === 'drone') {
        const bodyGeom = new THREE.OctahedronGeometry(0.4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: style.primary, metalness: 0.7, roughness: 0.3, emissive: style.emissive, emissiveIntensity: 0.3 });
        enemy.add(new THREE.Mesh(bodyGeom, bodyMat));
        const eyeGeom = new THREE.SphereGeometry(0.15, 8, 8);
        const eye = new THREE.Mesh(eyeGeom, new THREE.MeshBasicMaterial({ color: style.secondary }));
        eye.position.z = 0.3;
        enemy.add(eye);
        enemy.userData = { type: 'drone', health: 30 + floor * 5, maxHealth: 30 + floor * 5, damage: 8 + floor, contactDamage: 5, radius: 0.5, speed: 3 + floor * 0.2, alive: true, attackCooldown: 0, attackRate: 2 - floor * 0.05, xpValue: 10 + floor * 2 };
    } else if (type === 'walker') {
        const bodyGeom = new THREE.BoxGeometry(0.8, 1, 0.6);
        const bodyMat = new THREE.MeshStandardMaterial({ color: style.primary, metalness: 0.5, emissive: style.emissive, emissiveIntensity: 0.2 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 0.5;
        enemy.add(body);
        const eyeGeom = new THREE.SphereGeometry(0.1, 6, 6);
        const eyeMat = new THREE.MeshBasicMaterial({ color: style.secondary });
        [-0.2, 0.2].forEach(x => { const eye = new THREE.Mesh(eyeGeom, eyeMat); eye.position.set(x, 0.7, 0.31); enemy.add(eye); });
        enemy.userData = { type: 'walker', health: 50 + floor * 8, maxHealth: 50 + floor * 8, damage: 12 + floor * 2, contactDamage: 10, radius: 0.6, speed: 4 + floor * 0.3, alive: true, chargeTimer: 0, isCharging: false, xpValue: 15 + floor * 3 };
    } else if (type === 'turret') {
        const baseGeom = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: style.primary, metalness: 0.6 });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.15;
        enemy.add(base);
        const headGeom = new THREE.SphereGeometry(0.3, 8, 8);
        const head = new THREE.Mesh(headGeom, baseMat);
        head.position.y = 0.45;
        enemy.add(head);
        enemy.userData = { type: 'turret', health: 40 + floor * 6, maxHealth: 40 + floor * 6, damage: 6 + floor, contactDamage: 3, radius: 0.4, speed: 0, alive: true, attackCooldown: 0, attackRate: 0.5 - floor * 0.02, burstCount: 0, burstMax: 3 + Math.floor(floor / 3), xpValue: 12 + floor * 2 };
    } else if (type === 'wisp') {
        const coreGeom = new THREE.SphereGeometry(0.25, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({ color: style.secondary, transparent: true, opacity: 0.8 });
        enemy.add(new THREE.Mesh(coreGeom, coreMat));
        const glowGeom = new THREE.SphereGeometry(0.4, 8, 8);
        enemy.add(new THREE.Mesh(glowGeom, new THREE.MeshBasicMaterial({ color: style.secondary, transparent: true, opacity: 0.3 })));
        enemy.add(new THREE.PointLight(style.secondary, 0.5, 3));
        enemy.userData = { type: 'wisp', health: 20 + floor * 3, maxHealth: 20 + floor * 3, damage: 25 + floor * 3, contactDamage: 25 + floor * 3, radius: 0.3, speed: 5 + floor * 0.4, alive: true, erraticTimer: 0, targetOffset: new THREE.Vector3(), xpValue: 20 + floor * 4 };
    }
    
    enemy.position.copy(position);
    enemy.position.y = type === 'drone' ? 1.5 : 0;
    return enemy;
}

function updateEnemies(delta) {
    enemies.forEach(enemy => {
        if (!enemy.userData.alive) return;
        
        const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
        toPlayer.y = 0;
        const dist = toPlayer.length();
        
        if (enemy.userData.type === 'drone') {
            if (dist > 5) { toPlayer.normalize(); enemy.position.x += toPlayer.x * enemy.userData.speed * delta; enemy.position.z += toPlayer.z * enemy.userData.speed * delta; }
            enemy.position.y = 1.5 + Math.sin(Date.now() * 0.003) * 0.2;
            enemy.userData.attackCooldown -= delta;
            if (enemy.userData.attackCooldown <= 0 && dist < 12) { enemy.userData.attackCooldown = enemy.userData.attackRate; fireEnemyProjectile(enemy, toPlayer.normalize()); }
            enemy.lookAt(player.position.x, enemy.position.y, player.position.z);
        } else if (enemy.userData.type === 'walker') {
            if (enemy.userData.isCharging) {
                enemy.userData.chargeTimer -= delta;
                enemy.position.add(enemy.userData.chargeDir.clone().multiplyScalar(enemy.userData.speed * 2.5 * delta));
                if (enemy.userData.chargeTimer <= 0) enemy.userData.isCharging = false;
            } else if (dist < 8 && dist > 2) {
                enemy.userData.chargeTimer += delta;
                if (enemy.userData.chargeTimer > 1) { enemy.userData.isCharging = true; enemy.userData.chargeTimer = 0.5; enemy.userData.chargeDir = toPlayer.clone().normalize(); }
            } else if (dist >= 8) { toPlayer.normalize(); enemy.position.x += toPlayer.x * enemy.userData.speed * delta; enemy.position.z += toPlayer.z * enemy.userData.speed * delta; enemy.userData.chargeTimer = 0; }
            if (toPlayer.length() > 0.1) enemy.lookAt(player.position.x, 0, player.position.z);
        } else if (enemy.userData.type === 'turret') {
            if (dist < 15) {
                enemy.userData.attackCooldown -= delta;
                if (enemy.userData.attackCooldown <= 0) {
                    fireEnemyProjectile(enemy, toPlayer.normalize());
                    enemy.userData.burstCount++;
                    enemy.userData.attackCooldown = enemy.userData.burstCount >= enemy.userData.burstMax ? (enemy.userData.burstCount = 0, 2) : enemy.userData.attackRate;
                }
            }
        } else if (enemy.userData.type === 'wisp') {
            enemy.userData.erraticTimer -= delta;
            if (enemy.userData.erraticTimer <= 0) { enemy.userData.erraticTimer = 0.3 + Math.random() * 0.3; enemy.userData.targetOffset.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3); }
            const targetPos = player.position.clone().add(enemy.userData.targetOffset);
            const toTarget = new THREE.Vector3().subVectors(targetPos, enemy.position);
            if (dist > 1) { toTarget.normalize(); enemy.position.add(toTarget.multiplyScalar(enemy.userData.speed * delta)); }
            enemy.position.y = Math.max(0.5, enemy.position.y);
        }
        
        enemy.rotation.y += delta * 0.5;
    });
}

function fireEnemyProjectile(enemy, direction) {
    const proj = createProjectile(enemy.position.clone().add(new THREE.Vector3(0, 0.5, 0)), direction, enemy.userData.damage, 'enemy', 0xff3333);
    proj.userData.isPlayerProjectile = false;
    proj.userData.aimAssist = 0;
    proj.userData.speed = 10;
    projectiles.push(proj);
    getDungeonScene()?.add(proj);
}

function damageEnemy(enemy, damage) {
    enemy.userData.health -= damage;
    enemy.traverse(obj => { if (obj.material?.emissive) { const orig = obj.material.emissiveIntensity; obj.material.emissiveIntensity = 1; setTimeout(() => { if (obj.material) obj.material.emissiveIntensity = orig; }, 100); } });
    if (enemy.userData.health <= 0) killEnemy(enemy);
}

function killEnemy(enemy) {
    enemy.userData.alive = false;
    xpGained += enemy.userData.xpValue;
    let t = 0;
    const animate = () => { t += 0.05; if (t >= 1) { getDungeonScene()?.remove(enemy); const idx = enemies.indexOf(enemy); if (idx > -1) enemies.splice(idx, 1); return; } enemy.scale.setScalar(1 - t); enemy.position.y += 0.1; requestAnimationFrame(animate); };
    animate();
}

// ============================================
// MINI-BOSSES
// ============================================

export function spawnMiniBoss(floor) {
    clearBoss();
    const bossType = floor <= 3 ? 'sentinel' : floor <= 6 ? 'hollow' : floor <= 9 ? 'dreamer' : 'emperor';
    const tier = ((floor - 1) % 3) + 1;
    currentBoss = createMiniBoss(bossType, tier, floor);
    const roomData = getRoomData('west');
    currentBoss.position.set(roomData.x, 0, roomData.z);
    getDungeonScene()?.add(currentBoss);
    showBossHealthUI(currentBoss.userData.name);
}

function createMiniBoss(type, tier, floor) {
    const boss = new THREE.Group();
    
    if (type === 'sentinel') {
        const coreGeom = new THREE.IcosahedronGeometry(0.8);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.9, roughness: 0.2, emissive: 0x003333, emissiveIntensity: 0.5 });
        boss.add(new THREE.Mesh(coreGeom, coreMat));
        for (let i = 0; i < 2 + tier; i++) { const ringGeom = new THREE.TorusGeometry(1 + i * 0.3, 0.05, 8, 32); const ring = new THREE.Mesh(ringGeom, new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.7 })); ring.rotation.x = Math.PI / 2 + i * 0.3; boss.add(ring); }
        const eyeGeom = new THREE.SphereGeometry(0.3, 16, 16);
        const eye = new THREE.Mesh(eyeGeom, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        eye.position.z = 0.6;
        boss.add(eye);
        boss.add(new THREE.PointLight(0x00ffff, 1, 10));
        boss.position.y = 2;
        boss.userData = { type: 'sentinel', name: 'THE SENTINEL', tier, health: 200 + tier * 100 + floor * 20, maxHealth: 200 + tier * 100 + floor * 20, damage: 15 + tier * 5, contactDamage: 20, radius: 1.5, alive: true, attackTimer: 0, droneCount: 1 + tier, xpValue: 100 + tier * 50 };
    } else if (type === 'hollow') {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a0a20, roughness: 0.9, transparent: true, opacity: 0.9 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.3), bodyMat);
        torso.position.y = 1.2;
        boss.add(torso);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.3), bodyMat);
        head.position.y = 2;
        boss.add(head);
        const skeleMat = new THREE.MeshBasicMaterial({ color: 0xbf00ff, transparent: true, opacity: 0.6 });
        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), skeleMat);
        spine.position.y = 1.2;
        boss.add(spine);
        boss.add(new THREE.PointLight(0xbf00ff, 0.8, 8));
        boss.userData = { type: 'hollow', name: 'THE HOLLOW', tier, health: 250 + tier * 120 + floor * 25, maxHealth: 250 + tier * 120 + floor * 25, damage: 20 + tier * 8, contactDamage: 25, radius: 1, alive: true, attackTimer: 0, teleportCooldown: 0, comboCount: tier, xpValue: 120 + tier * 60 };
    } else if (type === 'dreamer') {
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.7 });
        const bodyGeom = new THREE.SphereGeometry(0.8, 16, 24);
        bodyGeom.scale(0.7, 1.2, 0.7);
        const body = new THREE.Mesh(bodyGeom, coreMat);
        body.position.y = 1.5;
        boss.add(body);
        const auraMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.2, side: THREE.BackSide });
        const aura = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 24), auraMat);
        aura.position.y = 1.5;
        boss.add(aura);
        boss.add(new THREE.PointLight(0xffaa00, 1.5, 12));
        boss.userData = { type: 'dreamer', name: 'THE DREAMER', tier, health: 300 + tier * 150 + floor * 30, maxHealth: 300 + tier * 150 + floor * 30, damage: 12 + tier * 4, contactDamage: 15, radius: 1.2, alive: true, attackTimer: 0, cloneCount: tier, patternPhase: 0, xpValue: 150 + tier * 75 };
    } else if (type === 'emperor') {
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x660022, roughness: 0.7, metalness: 0.3 });
        boss.add(new THREE.Mesh(new THREE.ConeGeometry(0.8, 2, 8), robeMat)).position.y = 1;
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.5), robeMat);
        torso.position.y = 2.2;
        boss.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), new THREE.MeshStandardMaterial({ color: 0x886655 }));
        head.position.y = 2.8;
        boss.add(head);
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, emissive: 0x664400, emissiveIntensity: 0.5 });
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.15, 8), crownMat);
        crownBase.position.y = 3.1;
        boss.add(crownBase);
        boss.add(new THREE.PointLight(0xff0044, 1, 10));
        boss.userData = { type: 'emperor', name: 'THE EMPEROR', tier: 3, health: 800, maxHealth: 800, damage: 30, contactDamage: 40, radius: 1.5, alive: true, attackTimer: 0, speechDone: false, xpValue: 500 };
    }
    
    return boss;
}

function updateMiniBoss(delta) {
    if (!currentBoss?.userData.alive) return;
    const boss = currentBoss;
    boss.userData.attackTimer -= delta;
    
    if (boss.userData.type === 'sentinel') {
        boss.position.y = 2 + Math.sin(Date.now() * 0.002) * 0.3;
        boss.children.forEach((c, i) => { if (c.geometry?.type === 'TorusGeometry') c.rotation.z += delta * (1 + i * 0.5); });
        boss.lookAt(player.position.x, boss.position.y, player.position.z);
        if (boss.userData.attackTimer <= 0) { if (Math.random() < 0.5) { sentinelGazeBeam(boss); boss.userData.attackTimer = 2; } else { sentinelDeployDrones(boss); boss.userData.attackTimer = 4; } }
    } else if (boss.userData.type === 'hollow') {
        boss.userData.teleportCooldown -= delta;
        const dist = boss.position.distanceTo(player.position);
        if (boss.userData.attackTimer <= 0) { if (dist > 5 && boss.userData.teleportCooldown <= 0) { hollowPhaseDash(boss); boss.userData.attackTimer = 1.5; boss.userData.teleportCooldown = 3 / boss.userData.tier; } else if (dist < 3) { hollowShockwave(boss); boss.userData.attackTimer = 2; } }
        if (dist > 2) { const toPlayer = new THREE.Vector3().subVectors(player.position, boss.position).normalize(); boss.position.x += toPlayer.x * 2 * delta; boss.position.z += toPlayer.z * 2 * delta; }
        boss.lookAt(player.position.x, 0, player.position.z);
    } else if (boss.userData.type === 'dreamer') {
        boss.position.y = 1.5 + Math.sin(Date.now() * 0.001) * 0.5;
        boss.rotation.y += delta * 0.5;
        if (boss.userData.attackTimer <= 0) { const attack = Math.random(); if (attack < 0.4) { dreamerShards(boss); boss.userData.attackTimer = 2; } else if (attack < 0.7) { dreamerMirror(boss); boss.userData.attackTimer = 5; } else { dreamerNightmareZone(boss); boss.userData.attackTimer = 4; } }
    } else if (boss.userData.type === 'emperor') {
        if (!boss.userData.speechDone) { boss.userData.speechDone = true; return; }
        if (boss.userData.attackTimer <= 0) { const attack = Math.random(); if (attack < 0.3) { hollowPhaseDash(boss); boss.userData.attackTimer = 1; } else if (attack < 0.6) { emperorDecree(boss); boss.userData.attackTimer = 2; } else { hollowShockwave(boss); boss.userData.attackTimer = 1.5; } }
        boss.lookAt(player.position.x, 0, player.position.z);
    }
    
    updateBossHealthUI(boss.userData.health, boss.userData.maxHealth);
}

function sentinelGazeBeam(boss) {
    const toPlayer = new THREE.Vector3().subVectors(player.position, boss.position).normalize();
    for (let i = 0; i < 5; i++) setTimeout(() => { if (!boss.userData.alive) return; const proj = createProjectile(boss.position.clone(), toPlayer.clone(), boss.userData.damage, 'beam', 0xff0000); proj.userData.isPlayerProjectile = false; proj.userData.speed = 15; projectiles.push(proj); getDungeonScene()?.add(proj); }, i * 100);
}

function sentinelDeployDrones(boss) {
    for (let i = 0; i < boss.userData.droneCount; i++) { const angle = (i / boss.userData.droneCount) * Math.PI * 2; const pos = boss.position.clone(); pos.x += Math.cos(angle) * 2; pos.z += Math.sin(angle) * 2; const drone = createEnemy('drone', pos, getCurrentFloor()); drone.userData.health = 15; drone.scale.setScalar(0.6); enemies.push(drone); getDungeonScene()?.add(drone); }
}

function hollowPhaseDash(boss) {
    const angle = Math.random() * Math.PI * 2, dist = 2 + Math.random() * 2;
    boss.position.x = player.position.x + Math.cos(angle) * dist;
    boss.position.z = player.position.z + Math.sin(angle) * dist;
    if (new THREE.Vector3().subVectors(player.position, boss.position).length() < 3) damagePlayer(boss.userData.damage);
}

function hollowShockwave(boss) {
    const ringGeom = new THREE.RingGeometry(0.5, 1, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xbf00ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(boss.position);
    ring.position.y = 0.1;
    getDungeonScene()?.add(ring);
    let scale = 1;
    const expand = () => { scale += 0.3; ring.scale.setScalar(scale); ringMat.opacity -= 0.05; if (Math.abs(player.position.distanceTo(ring.position) - scale * 0.75) < 1 && player.position.y < 1) damagePlayer(boss.userData.damage); if (scale < 10) requestAnimationFrame(expand); else { getDungeonScene()?.remove(ring); ring.geometry.dispose(); ring.material.dispose(); } };
    expand();
}

function dreamerShards(boss) {
    const numShards = 8 + boss.userData.tier * 4;
    for (let i = 0; i < numShards; i++) setTimeout(() => { if (!boss.userData.alive) return; const angle = (i / numShards) * Math.PI * 2 + boss.userData.patternPhase; const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)); const proj = createProjectile(boss.position.clone(), dir, boss.userData.damage, 'shard', 0xffaa00); proj.userData.isPlayerProjectile = false; proj.userData.speed = 8; projectiles.push(proj); getDungeonScene()?.add(proj); }, i * 50);
    boss.userData.patternPhase += 0.3;
}

function dreamerMirror(boss) {
    for (let i = 0; i < boss.userData.cloneCount; i++) { const angle = (i / boss.userData.cloneCount) * Math.PI * 2; const clone = boss.clone(); clone.position.x = boss.position.x + Math.cos(angle) * 3; clone.position.z = boss.position.z + Math.sin(angle) * 3; clone.scale.setScalar(0.7); clone.userData = { type: 'clone', health: 30, maxHealth: 30, damage: boss.userData.damage * 0.5, contactDamage: 10, radius: 0.8, alive: true, lifetime: 8, xpValue: 10 }; enemies.push(clone); getDungeonScene()?.add(clone); }
}

function dreamerNightmareZone(boss) {
    const zoneGeom = new THREE.CircleGeometry(3, 16);
    const zoneMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const zone = new THREE.Mesh(zoneGeom, zoneMat);
    zone.rotation.x = -Math.PI / 2;
    zone.position.copy(player.position);
    zone.position.y = 0.1;
    getDungeonScene()?.add(zone);
    let lifetime = 5;
    const tick = () => { lifetime -= 0.016; if (player.position.distanceTo(zone.position) < 3 && player.position.y < 1) damagePlayer(2); if (lifetime > 0) requestAnimationFrame(tick); else { getDungeonScene()?.remove(zone); zone.geometry.dispose(); zone.material.dispose(); } };
    tick();
}

function emperorDecree(boss) {
    for (let i = 0; i < 12; i++) { const angle = (i / 12) * Math.PI * 2; const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)); const proj = createProjectile(boss.position.clone().add(new THREE.Vector3(0, 1.5, 0)), dir, boss.userData.damage, 'decree', 0xff0000); proj.userData.isPlayerProjectile = false; proj.userData.speed = 10; projectiles.push(proj); getDungeonScene()?.add(proj); }
}

function damageBoss(boss, damage) {
    boss.userData.health -= damage;
    boss.traverse(obj => { if (obj.material?.emissive) { obj.material.emissiveIntensity = 2; setTimeout(() => { if (obj.material) obj.material.emissiveIntensity = 0.5; }, 100); } });
    if (boss.userData.health <= 0) killBoss(boss);
}

function killBoss(boss) {
    boss.userData.alive = false;
    xpGained += boss.userData.xpValue;
    hideBossHealthUI();
    let t = 0;
    const animate = () => { t += 0.02; if (t >= 1) { getDungeonScene()?.remove(boss); currentBoss = null; return; } boss.scale.setScalar(1 - t); boss.rotation.y += 0.1; boss.position.y += 0.05; requestAnimationFrame(animate); };
    animate();
}

// ============================================
// PILLAR BOSS
// ============================================

export function spawnPillarBoss(floor) {
    disposePillarBoss();
    pillarBoss = createPillarBoss(floor);
    const roomData = getRoomData('north');
    pillarBoss.position.set(roomData.x, 0, roomData.z);
    getDungeonScene()?.add(pillarBoss);
    showBossHealthUI('THE CORE');
}

function getPillarPalette(floor) {
    if (floor <= 3) return { primary: 0x223344, emissive: 0x002233, glow: 0x00ffff, weakSpot: 0x00ff88 };
    if (floor <= 6) return { primary: 0x332244, emissive: 0x220033, glow: 0xbf00ff, weakSpot: 0xff00ff };
    return { primary: 0x443322, emissive: 0x331100, glow: 0xffaa00, weakSpot: 0xffff00 };
}

function createPillarBoss(floor) {
    const group = new THREE.Group();
    const palette = getPillarPalette(floor);
    const height = 15;
    
    const pillarGeom = new THREE.CylinderGeometry(1.5, 2, height, 12);
    const pillarMat = new THREE.MeshStandardMaterial({ color: palette.primary, metalness: 0.7, roughness: 0.3, emissive: palette.emissive, emissiveIntensity: 0.3 });
    const pillar = new THREE.Mesh(pillarGeom, pillarMat);
    pillar.position.y = height / 2;
    group.add(pillar);
    
    const weakSpotCount = 3 + Math.floor(floor / 3);
    const weakSpots = [];
    for (let i = 0; i < weakSpotCount; i++) {
        const spotGeom = new THREE.SphereGeometry(0.4, 12, 12);
        const spotMat = new THREE.MeshBasicMaterial({ color: palette.weakSpot, transparent: true, opacity: 0.9 });
        const spot = new THREE.Mesh(spotGeom, spotMat);
        const angle = (i / weakSpotCount) * Math.PI * 2;
        const spotHeight = 3 + (i / weakSpotCount) * (height - 6);
        spot.position.set(Math.cos(angle) * 1.6, spotHeight, Math.sin(angle) * 1.6);
        spot.userData = { isWeakSpot: true, active: true, baseAngle: angle, baseHeight: spotHeight };
        group.add(spot);
        weakSpots.push(spot);
        const glowGeom = new THREE.SphereGeometry(0.6, 8, 8);
        const glow = new THREE.Mesh(glowGeom, new THREE.MeshBasicMaterial({ color: palette.weakSpot, transparent: true, opacity: 0.3 }));
        glow.position.copy(spot.position);
        group.add(glow);
        spot.userData.glow = glow;
    }
    
    for (let i = 0; i < 6; i++) { const angle = (i / 6) * Math.PI * 2; const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.1, height, 0.1), new THREE.MeshBasicMaterial({ color: palette.glow, transparent: true, opacity: 0.7 })); conduit.position.set(Math.cos(angle) * 1.8, height / 2, Math.sin(angle) * 1.8); group.add(conduit); }
    
    group.add(new THREE.PointLight(palette.glow, 2, 20)).position.y = height / 2;
    
    const attacks = ['energyBolts'];
    if (floor >= 2) attacks.push('sweepBeam');
    if (floor >= 4) attacks.push('steamVents');
    if (floor >= 5) attacks.push('nodeShield');
    if (floor >= 7) attacks.push('cascade');
    
    group.userData = { type: 'pillar', name: 'THE CORE', floor, health: 400 + floor * 60, maxHealth: 400 + floor * 60, weakSpots, weakSpotsHit: 0, rotationSpeed: 0.3 + floor * 0.05, attackTimer: 0, attacks, xpValue: 200 + floor * 30 };
    
    return group;
}

function updatePillarBoss(delta) {
    if (!pillarBoss) return;
    const boss = pillarBoss;
    boss.rotation.y += boss.userData.rotationSpeed * delta;
    
    boss.userData.weakSpots.forEach(spot => {
        if (!spot.userData.active) return;
        const angle = spot.userData.baseAngle + boss.rotation.y;
        spot.position.x = Math.cos(angle) * 1.6;
        spot.position.z = Math.sin(angle) * 1.6;
        if (spot.userData.glow) spot.userData.glow.position.copy(spot.position);
    });
    
    boss.userData.attackTimer -= delta;
    if (boss.userData.attackTimer <= 0) {
        const attack = boss.userData.attacks[Math.floor(Math.random() * boss.userData.attacks.length)];
        executePillarAttack(boss, attack);
        boss.userData.attackTimer = 2;
    }
    
    if (boss.userData.health < boss.userData.maxHealth * 0.25) boss.userData.rotationSpeed = 0.6 + boss.userData.floor * 0.1;
    updateBossHealthUI(boss.userData.health, boss.userData.maxHealth);
}

function executePillarAttack(boss, attack) {
    if (attack === 'energyBolts') { for (let i = 0; i < 3; i++) setTimeout(() => { if (!pillarBoss) return; const toPlayer = new THREE.Vector3().subVectors(player.position, boss.position).normalize(); const proj = createProjectile(boss.position.clone().add(new THREE.Vector3(0, 5, 0)), toPlayer, 15, 'bolt', 0x00ffff); proj.userData.isPlayerProjectile = false; proj.userData.speed = 12; projectiles.push(proj); getDungeonScene()?.add(proj); }, i * 200); }
    else if (attack === 'sweepBeam') { const beam = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 })); beam.position.copy(boss.position); beam.position.y = 1; getDungeonScene()?.add(beam); let rot = 0; const sweep = () => { rot += 0.05; beam.rotation.y = rot; if (player.position.y < 1.5 && boss.position.distanceTo(player.position) < 10) damagePlayer(20); if (rot < Math.PI * 2) requestAnimationFrame(sweep); else { getDungeonScene()?.remove(beam); beam.geometry.dispose(); beam.material.dispose(); } }; sweep(); }
    else if (attack === 'steamVents') { getDungeonScene()?.traverse(obj => { if (obj.userData?.isPlatform) { const orig = obj.material.color.getHex(); obj.material.color.setHex(0xff4400); obj.material.emissive = new THREE.Color(0xff2200); obj.material.emissiveIntensity = 0.5; setTimeout(() => { if (obj.material) { obj.material.color.setHex(orig); obj.material.emissiveIntensity = 0; } }, 3000); } }); }
    else if (attack === 'nodeShield') { boss.userData.weakSpots.forEach(spot => { if (!spot.userData.active) return; spot.userData.shielded = true; spot.material.color.setHex(0x888888); setTimeout(() => { spot.userData.shielded = false; spot.material.color.setHex(getPillarPalette(boss.userData.floor).weakSpot); }, 4000); }); }
    else if (attack === 'cascade') { executePillarAttack(boss, 'energyBolts'); setTimeout(() => executePillarAttack(boss, 'steamVents'), 500); }
}

function checkPillarBossHit(projectile) {
    if (!pillarBoss) return false;
    let hit = false;
    pillarBoss.userData.weakSpots.forEach(spot => {
        if (!spot.userData.active || spot.userData.shielded) return;
        const worldPos = new THREE.Vector3();
        spot.getWorldPosition(worldPos);
        if (projectile.position.distanceTo(worldPos) < 0.8) {
            spot.userData.active = false;
            spot.material.opacity = 0.2;
            if (spot.userData.glow) spot.userData.glow.material.opacity = 0;
            pillarBoss.userData.weakSpotsHit++;
            pillarBoss.userData.health -= pillarBoss.userData.maxHealth / pillarBoss.userData.weakSpots.length;
            hit = true;
            if (pillarBoss.userData.weakSpotsHit >= pillarBoss.userData.weakSpots.length) killPillarBoss();
        }
    });
    return hit;
}

function killPillarBoss() {
    if (!pillarBoss) return;
    xpGained += pillarBoss.userData.xpValue;
    hideBossHealthUI();
    let t = 0;
    const animate = () => { t += 0.01; if (t >= 1) { getDungeonScene()?.remove(pillarBoss); pillarBoss = null; return; } pillarBoss.scale.x = 1 - t * 0.5; pillarBoss.scale.z = 1 - t * 0.5; pillarBoss.position.y -= 0.1; requestAnimationFrame(animate); };
    animate();
}

export function disposePillarBoss() { if (pillarBoss) { getDungeonScene()?.remove(pillarBoss); pillarBoss = null; } }

// ============================================
// BOSS UI
// ============================================

function showBossHealthUI(name) {
    let bossUI = document.getElementById('boss-health');
    if (!bossUI) { bossUI = document.createElement('div'); bossUI.id = 'boss-health'; bossUI.innerHTML = '<div id="boss-name"></div><div id="boss-health-bar"><div id="boss-health-fill"></div></div>'; document.getElementById('game-container').appendChild(bossUI); }
    document.getElementById('boss-name').textContent = name;
    document.getElementById('boss-health-fill').style.width = '100%';
    bossUI.classList.remove('hidden');
}

function updateBossHealthUI(current, max) { const fill = document.getElementById('boss-health-fill'); if (fill) fill.style.width = (current / max * 100) + '%'; }
function hideBossHealthUI() { document.getElementById('boss-health')?.classList.add('hidden'); }

// ============================================
// SPAWNING
// ============================================

export function spawnEnemiesForRoom(roomType, floor, reducedCount = false) {
    const roomData = getRoomData(roomType);
    const count = reducedCount ? 3 : 6 + Math.floor(floor / 2);
    const enemyTypes = ['drone', 'walker', 'turret', 'wisp'];
    for (let i = 0; i < count; i++) {
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const angle = (i / count) * Math.PI * 2;
        const dist = 4 + Math.random() * 3;
        const pos = new THREE.Vector3(roomData.x + Math.cos(angle) * dist, 0, roomData.z + Math.sin(angle) * dist);
        const enemy = createEnemy(type, pos, floor);
        enemies.push(enemy);
        getDungeonScene()?.add(enemy);
    }
}

export function clearAllEnemies() { enemies.forEach(e => getDungeonScene()?.remove(e)); enemies = []; projectiles.forEach(p => getDungeonScene()?.remove(p)); projectiles = []; }
function clearBoss() { if (currentBoss) { getDungeonScene()?.remove(currentBoss); currentBoss = null; } hideBossHealthUI(); }
export function disposeBosses() { clearBoss(); disposePillarBoss(); }

// ============================================
// UPDATE
// ============================================

export function updateEntities(delta, gameData, inputState) {
    const scene = getDungeonScene();
    if (scene && player && !player.parent) scene.add(player);
    updatePlayer(delta, inputState);
    updateEnemies(delta);
    updateProjectiles(delta);
    updateMiniBoss(delta);
    updatePillarBoss(delta);
    enemies = enemies.filter(e => { if (e.userData.type === 'clone' && e.userData.lifetime !== undefined) { e.userData.lifetime -= delta; if (e.userData.lifetime <= 0) { getDungeonScene()?.remove(e); return false; } } return true; });
}

// ============================================
// GETTERS
// ============================================

export function getEnemies() { return enemies.filter(e => e.userData.alive); }
export function getBoss() { if (currentBoss?.userData.alive) return currentBoss; if (pillarBoss) return pillarBoss; return null; }
export function getXPGained() { return xpGained; }
export function resetXPGained() { xpGained = 0; }
export function isPlayerDead() { return getGameData().player.health <= 0; }
export function playerTakeDamage(amount) { damagePlayer(amount); }
