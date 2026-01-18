// ============================================
// ECHOES OF THE OBELISK - Town System
// Expedition camp, NPCs, shop interactions
// ============================================

import * as THREE from 'three';
import { getPlayer } from './entities.js';

// ============================================
// STATE
// ============================================

let townScene;
let npcs = [];
let currentNPCsUnlocked = [];

// NPC interaction range
const INTERACTION_RANGE = 3;

// ============================================
// INITIALIZATION
// ============================================

export async function initTown(renderer, unlockedNPCs = ['guide']) {
    currentNPCsUnlocked = unlockedNPCs;
    
    townScene = new THREE.Scene();
    
    // Sky/atmosphere - MUCH less dense fog for visibility
    townScene.background = new THREE.Color(0x2a2535);  // Brighter background
    townScene.fog = new THREE.FogExp2(0x2a2535, 0.004); // Much less dense fog
    
    // Build environment
    buildGround();
    buildForest();
    buildDungeonEntrance();
    buildCamp(unlockedNPCs);
    addLighting();
    
    return townScene;
}

// ============================================
// ENVIRONMENT
// ============================================

function buildGround() {
    // Main clearing - brighter color
    const groundGeom = new THREE.CircleGeometry(30, 32);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x3a4535,  // Brighter
        roughness: 0.95
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    townScene.add(ground);
    
    // Path to dungeon
    const pathGeom = new THREE.PlaneGeometry(4, 15);
    const pathMat = new THREE.MeshStandardMaterial({
        color: 0x4a4540,  // Brighter
        roughness: 0.9
    });
    const path = new THREE.Mesh(pathGeom, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, -10);
    path.receiveShadow = true;
    townScene.add(path);
    
    // Road leading out
    const roadGeom = new THREE.PlaneGeometry(5, 30);
    const road = new THREE.Mesh(roadGeom, pathMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, 20);
    road.receiveShadow = true;
    townScene.add(road);
}

function buildForest() {
    // Ring of trees around clearing
    const treeCount = 40;
    const innerRadius = 25;
    const outerRadius = 40;
    
    for (let i = 0; i < treeCount; i++) {
        const angle = (i / treeCount) * Math.PI * 2;
        const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
        
        // Skip where road exits
        if (angle > Math.PI * 0.9 && angle < Math.PI * 1.1) continue;
        if (angle > -Math.PI * 0.1 && angle < Math.PI * 0.1) continue;
        
        const tree = createTree();
        tree.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );
        tree.rotation.y = Math.random() * Math.PI * 2;
        townScene.add(tree);
    }
    
    // Some bushes/rocks
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 10 + Math.random() * 15;
        
        const bush = createBush();
        bush.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );
        townScene.add(bush);
    }
}

function createTree() {
    const group = new THREE.Group();
    
    // Trunk - brighter
    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 4, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x5d4827,  // Brighter trunk
        roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 2;
    trunk.castShadow = true;
    group.add(trunk);
    
    // Foliage layers - brighter greens
    const foliageMat = new THREE.MeshStandardMaterial({
        color: 0x2a5035,  // Brighter foliage
        roughness: 0.8
    });
    
    const heights = [3.5, 5, 6.5];
    const sizes = [2.5, 2, 1.2];
    
    heights.forEach((h, i) => {
        const foliageGeom = new THREE.ConeGeometry(sizes[i], 2, 6);
        const foliage = new THREE.Mesh(foliageGeom, foliageMat);
        foliage.position.y = h;
        foliage.castShadow = true;
        group.add(foliage);
    });
    
    return group;
}

function createBush() {
    const group = new THREE.Group();
    
    const bushMat = new THREE.MeshStandardMaterial({
        color: 0x3a5540,  // Brighter
        roughness: 0.9
    });
    
    // Cluster of spheres
    for (let i = 0; i < 3; i++) {
        const size = 0.3 + Math.random() * 0.3;
        const bushGeom = new THREE.SphereGeometry(size, 6, 6);
        const bush = new THREE.Mesh(bushGeom, bushMat);
        bush.position.set(
            (Math.random() - 0.5) * 0.5,
            size,
            (Math.random() - 0.5) * 0.5
        );
        bush.castShadow = true;
        group.add(bush);
    }
    
    return group;
}

function buildDungeonEntrance() {
    const group = new THREE.Group();
    group.position.set(0, 0, -18);
    
    // Cave mouth (dark opening)
    const caveGeom = new THREE.CircleGeometry(3, 16);
    const caveMat = new THREE.MeshBasicMaterial({ color: 0x080810 });
    const cave = new THREE.Mesh(caveGeom, caveMat);
    cave.position.z = 0.1;
    cave.position.y = 2;
    group.add(cave);
    
    // Stone archway - brighter
    const archMat = new THREE.MeshStandardMaterial({
        color: 0x6a6a7a,  // Brighter stone
        roughness: 0.7,
        metalness: 0.2
    });
    
    // Left pillar
    const pillarGeom = new THREE.BoxGeometry(1, 5, 1);
    const leftPillar = new THREE.Mesh(pillarGeom, archMat);
    leftPillar.position.set(-3, 2.5, 0);
    leftPillar.castShadow = true;
    group.add(leftPillar);
    
    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeom, archMat);
    rightPillar.position.set(3, 2.5, 0);
    rightPillar.castShadow = true;
    group.add(rightPillar);
    
    // Arch top
    const archTopGeom = new THREE.BoxGeometry(8, 1, 1.2);
    const archTop = new THREE.Mesh(archTopGeom, archMat);
    archTop.position.set(0, 5.5, 0);
    archTop.castShadow = true;
    group.add(archTop);
    
    // Ornate door frame (the elaborate sealed door)
    const doorMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a4e,  // Brighter
        metalness: 0.8,
        roughness: 0.3,
        emissive: 0x000066,
        emissiveIntensity: 0.3
    });
    
    const doorGeom = new THREE.PlaneGeometry(5, 4.5);
    const door = new THREE.Mesh(doorGeom, doorMat);
    door.position.set(0, 2.25, 0.2);
    group.add(door);
    
    // Glowing runes on door
    const runeMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
    });
    
    const runePositions = [
        { x: -1.5, y: 3 }, { x: 0, y: 3.5 }, { x: 1.5, y: 3 },
        { x: -1, y: 1.5 }, { x: 1, y: 1.5 }
    ];
    
    runePositions.forEach(pos => {
        const runeGeom = new THREE.CircleGeometry(0.15, 6);
        const rune = new THREE.Mesh(runeGeom, runeMat);
        rune.position.set(pos.x, pos.y, 0.25);
        group.add(rune);
    });
    
    // Central glow (indicates active obelisk)
    const glowGeom = new THREE.CircleGeometry(0.5, 16);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.position.set(0, 2.5, 0.26);
    group.add(glow);
    
    // Light from entrance - BRIGHTER
    const entranceLight = new THREE.PointLight(0x00ffff, 3, 25);
    entranceLight.position.set(0, 3, 1);
    group.add(entranceLight);
    
    // Ambient obelisk hum light - BRIGHTER
    const humLight = new THREE.PointLight(0x6600ff, 1.5, 30);
    humLight.position.set(0, 2, -2);
    group.add(humLight);
    
    townScene.add(group);
}

function buildCamp(unlockedNPCs) {
    // Clear existing NPCs
    npcs.forEach(npc => townScene.remove(npc.group));
    npcs = [];
    
    // Campfire in center
    const campfire = createCampfire();
    campfire.position.set(0, 0, 5);
    townScene.add(campfire);
    
    // Tents/shelters
    const tent1 = createTent();
    tent1.position.set(-8, 0, 8);
    tent1.rotation.y = 0.3;
    townScene.add(tent1);
    
    const tent2 = createTent();
    tent2.position.set(8, 0, 10);
    tent2.rotation.y = -0.4;
    townScene.add(tent2);
    
    // Merchant wagon
    const wagon = createWagon();
    wagon.position.set(10, 0, 3);
    wagon.rotation.y = -0.5;
    townScene.add(wagon);
    
    // NPCs based on unlocked list
    const npcPositions = {
        guide: { x: 2, z: 7 },
        merchant: { x: 8, z: 3 },
        scholar: { x: -6, z: 8 },
        nomad: { x: -3, z: 12 },
        scientist: { x: 5, z: 12 },
        stranger: { x: -10, z: 5 }
    };
    
    unlockedNPCs.forEach(type => {
        if (npcPositions[type]) {
            const npc = createNPC(type);
            npc.group.position.set(npcPositions[type].x, 0, npcPositions[type].z);
            townScene.add(npc.group);
            npcs.push(npc);
        }
    });
}

function createTent() {
    const group = new THREE.Group();
    
    // Tent body - brighter
    const tentGeom = new THREE.ConeGeometry(3, 3, 4);
    const tentMat = new THREE.MeshStandardMaterial({
        color: 0x7a6a50,  // Brighter canvas
        roughness: 0.9,
        side: THREE.DoubleSide
    });
    const tent = new THREE.Mesh(tentGeom, tentMat);
    tent.position.y = 1.5;
    tent.rotation.y = Math.PI / 4;
    tent.castShadow = true;
    group.add(tent);
    
    // Entrance flap
    const flapGeom = new THREE.PlaneGeometry(1.5, 2);
    const flap = new THREE.Mesh(flapGeom, tentMat);
    flap.position.set(0, 1, 1.8);
    flap.rotation.x = 0.2;
    group.add(flap);
    
    // Interior light
    const interiorLight = new THREE.PointLight(0xffaa44, 1.0, 8);
    interiorLight.position.set(0, 1, 0);
    group.add(interiorLight);
    
    return group;
}

function createWagon() {
    const group = new THREE.Group();
    
    // Wagon body - brighter
    const bodyGeom = new THREE.BoxGeometry(3, 1.5, 2.5);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x6d4827,  // Brighter wood
        roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 1.25;
    body.castShadow = true;
    group.add(body);
    
    // Canopy - brighter
    const canopyGeom = new THREE.CylinderGeometry(1.5, 1.5, 3.2, 8, 1, true);
    const canopyMat = new THREE.MeshStandardMaterial({
        color: 0x9a7a5a,  // Brighter
        roughness: 0.9,
        side: THREE.DoubleSide
    });
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.rotation.z = Math.PI / 2;
    canopy.position.set(0, 2.5, 0);
    canopy.castShadow = true;
    group.add(canopy);
    
    // Wheels
    const wheelGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x5d4827 });
    
    const wheelPositions = [
        { x: -1.2, z: 1.2 },
        { x: -1.2, z: -1.2 },
        { x: 1.2, z: 1.2 },
        { x: 1.2, z: -1.2 }
    ];
    
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(pos.x, 0.5, pos.z);
        wheel.castShadow = true;
        group.add(wheel);
    });
    
    // Lantern - BRIGHTER
    const lanternLight = new THREE.PointLight(0xffaa44, 3, 20);
    lanternLight.position.set(0, 3, 1);
    group.add(lanternLight);
    
    return group;
}

function createCampfire() {
    const group = new THREE.Group();
    
    // Stone ring
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const stoneGeom = new THREE.BoxGeometry(0.4, 0.3, 0.4);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a });
        const stone = new THREE.Mesh(stoneGeom, stoneMat);
        stone.position.set(Math.cos(angle) * 0.8, 0.15, Math.sin(angle) * 0.8);
        stone.rotation.y = angle;
        group.add(stone);
    }
    
    // Fire (simple cones)
    const fireMat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.9
    });
    
    for (let i = 0; i < 3; i++) {
        const fireGeom = new THREE.ConeGeometry(0.3, 0.8, 6);
        const fire = new THREE.Mesh(fireGeom, fireMat);
        fire.position.set(
            (Math.random() - 0.5) * 0.3,
            0.4,
            (Math.random() - 0.5) * 0.3
        );
        group.add(fire);
    }
    
    // Fire light - MUCH brighter and longer range
    const fireLight = new THREE.PointLight(0xff6600, 6, 35);
    fireLight.position.y = 1;
    group.add(fireLight);
    
    // Secondary flicker light - BRIGHTER
    const flickerLight = new THREE.PointLight(0xff4400, 4, 25);
    flickerLight.position.y = 0.5;
    group.add(flickerLight);
    group.userData.flickerLight = flickerLight;
    
    return group;
}

function createNPC(type) {
    const group = new THREE.Group();
    
    // NPC colors - BRIGHTER
    const colors = {
        guide: { robe: 0x5a7050, accent: 0xa8cc97 },
        merchant: { robe: 0x8a6040, accent: 0xffcc44 },
        scholar: { robe: 0x4a4080, accent: 0xa8a8ee },
        nomad: { robe: 0x7a6a40, accent: 0xeeaa77 },
        scientist: { robe: 0x4a6a80, accent: 0x88ccee },
        stranger: { robe: 0x3a3040, accent: 0xbb88cc }
    };
    
    const color = colors[type] || colors.guide;
    
    // Body
    const robeMat = new THREE.MeshStandardMaterial({ color: color.robe, roughness: 0.8 });
    
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
    const body = new THREE.Mesh(bodyGeom, robeMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeom = new THREE.SphereGeometry(0.25, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x9a8876 });  // Brighter skin
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.45;
    head.castShadow = true;
    group.add(head);
    
    // Hood/hat based on type
    if (type === 'scholar' || type === 'guide') {
        const hoodGeom = new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const hood = new THREE.Mesh(hoodGeom, robeMat);
        hood.position.y = 1.5;
        hood.rotation.x = 0.2;
        group.add(hood);
    } else if (type === 'merchant') {
        const hatGeom = new THREE.CylinderGeometry(0.2, 0.35, 0.3, 8);
        const hat = new THREE.Mesh(hatGeom, new THREE.MeshStandardMaterial({ color: 0x5a4030 }));
        hat.position.y = 1.7;
        group.add(hat);
    } else if (type === 'stranger') {
        // Hooded and mysterious
        const cloakGeom = new THREE.ConeGeometry(0.35, 0.5, 8);
        const cloak = new THREE.Mesh(cloakGeom, robeMat);
        cloak.position.y = 1.65;
        group.add(cloak);
    }
    
    // Accent (belt or sash)
    const accentGeom = new THREE.TorusGeometry(0.35, 0.05, 8, 16);
    const accentMat = new THREE.MeshStandardMaterial({ color: color.accent });
    const accent = new THREE.Mesh(accentGeom, accentMat);
    accent.rotation.x = Math.PI / 2;
    accent.position.y = 0.8;
    group.add(accent);
    
    // NPC names for display
    const names = {
        guide: 'THE GUIDE',
        merchant: 'MERCHANT',
        scholar: 'SCHOLAR\'S APPRENTICE',
        nomad: 'NOMAD ELDER',
        scientist: 'THE SCIENTIST',
        stranger: '???'
    };
    
    return {
        group: group,
        type: type,
        name: names[type] || type.toUpperCase()
    };
}

// ============================================
// LIGHTING - SIGNIFICANTLY BRIGHTER
// ============================================

function addLighting() {
    // Moonlight - MUCH brighter
    const moonLight = new THREE.DirectionalLight(0xaaaaee, 2.0);  // Increased from 0.8
    moonLight.position.set(10, 20, 10);
    townScene.add(moonLight);
    
    // Second directional from opposite angle
    const moonLight2 = new THREE.DirectionalLight(0x8888cc, 1.2);
    moonLight2.position.set(-15, 15, -10);
    townScene.add(moonLight2);
    
    // Ambient - MUCH brighter so scene is clearly visible
    const ambient = new THREE.AmbientLight(0x606080, 3.0);  // Increased from 1.2 to 3.0
    townScene.add(ambient);
    
    // Hemisphere for sky/ground color - BRIGHTER
    const hemi = new THREE.HemisphereLight(0x8899cc, 0x444433, 1.5);  // Increased from 0.8
    townScene.add(hemi);
    
    // Add some fill lights around the camp area
    const campFill1 = new THREE.PointLight(0xffaa66, 2, 25);
    campFill1.position.set(-5, 5, 5);
    townScene.add(campFill1);
    
    const campFill2 = new THREE.PointLight(0xffaa66, 2, 25);
    campFill2.position.set(5, 5, 8);
    townScene.add(campFill2);
}

// ============================================
// UPDATE
// ============================================

let time = 0;

export function updateTown(delta, gameData) {
    time += delta;
    
    // Animate campfire flicker
    townScene.traverse(obj => {
        if (obj.userData && obj.userData.flickerLight) {
            const flicker = 0.8 + Math.sin(time * 10) * 0.2 + Math.sin(time * 15) * 0.1;
            obj.userData.flickerLight.intensity = 4 * flicker;  // Base intensity * flicker
        }
    });
    
    // Animate NPCs (subtle idle)
    npcs.forEach((npc, i) => {
        npc.group.rotation.y = Math.sin(time * 0.5 + i) * 0.1;
        npc.group.position.y = Math.sin(time * 2 + i) * 0.02;
    });
}

// ============================================
// NPC INTERACTION
// ============================================

export function getNPCInteraction(playerPos) {
    for (const npc of npcs) {
        const dist = playerPos.distanceTo(npc.group.position);
        if (dist < INTERACTION_RANGE) {
            return npc.type;
        }
    }
    return null;
}

export function getNearestNPC(playerPos) {
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const npc of npcs) {
        const dist = playerPos.distanceTo(npc.group.position);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = npc;
        }
    }
    
    return nearest;
}

// ============================================
// UI
// ============================================

export function showTownUI() {
    document.getElementById('town-ui').classList.remove('hidden');
    document.getElementById('mobile-controls').classList.remove('hidden');
}

export function hideTownUI() {
    document.getElementById('town-ui').classList.add('hidden');
}

// ============================================
// GETTERS
// ============================================

export function getTownScene() {
    return townScene;
}

// ============================================
// CLEANUP
// ============================================

export function disposeTown() {
    if (!townScene) return;
    
    npcs = [];
    
    townScene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });
    
    while (townScene.children.length > 0) {
        townScene.remove(townScene.children[0]);
    }
}
