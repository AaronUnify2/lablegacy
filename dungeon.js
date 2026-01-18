// ============================================
// ECHOES OF THE OBELISK - Dungeon System
// Floor/wall geometry, decorations, lighting
// ============================================

import * as THREE from 'three';

// ============================================
// CONSTANTS
// ============================================

export const ROOM_TYPES = {
    CENTER: 'center',
    EAST: 'east',
    WEST: 'west',
    NORTH: 'north',
    SOUTH: 'south',
    HALLWAY_EAST: 'east_hallway',
    HALLWAY_WEST: 'west_hallway',
    HALLWAY_NORTH: 'north_hallway',
    HALLWAY_SOUTH: 'south_hallway'
};

// Room dimensions
const CENTER_SIZE = 20;
const ORBITAL_SIZE = 16;
const HALLWAY_LENGTH = 15;
const HALLWAY_WIDTH = 6;
const WALL_HEIGHT = 8;
const PILLAR_ROOM_HEIGHT = 20; // Taller for pillar boss

// ============================================
// STATE
// ============================================

let dungeonScene;
let currentRoom = ROOM_TYPES.CENTER;
let currentFloor = 1;

// Reusable geometries
const geometries = {};
const materials = {};

// Light references for animation
const animatedLights = [];
const glowMeshes = [];

// ============================================
// INITIALIZATION
// ============================================

export async function initDungeon(renderer, floor = 1) {
    currentFloor = floor;
    
    dungeonScene = new THREE.Scene();
    
    // Set fog based on floor aesthetic - VERY light fog for visibility
    const fogColor = getFloorFogColor(floor);
    dungeonScene.fog = new THREE.FogExp2(fogColor, 0.003); // Much less dense
    dungeonScene.background = new THREE.Color(fogColor);
    
    // Create shared geometries and materials
    createSharedResources(floor);
    
    // Build dungeon layout
    buildCenterRoom();
    buildHallways();
    buildEastRoom();   // Small mobs
    buildWestRoom();   // Mini-boss
    buildNorthRoom();  // Pillar boss
    buildSouthRoom();  // Archive/exit
    
    // Add ambient lighting - MUCH BRIGHTER
    addAmbientLighting(floor);
    
    // Add decorations
    addDecorations(floor);
    
    return dungeonScene;
}

function createSharedResources(floor) {
    // Floor geometry
    geometries.floor = new THREE.PlaneGeometry(1, 1);
    geometries.wall = new THREE.BoxGeometry(1, WALL_HEIGHT, 0.5);
    geometries.pillar = new THREE.BoxGeometry(1, WALL_HEIGHT, 1);
    
    // Get floor-appropriate colors - BRIGHTER BASE COLORS
    const palette = getFloorPalette(floor);
    
    // Materials - brighter base colors
    materials.floor = new THREE.MeshStandardMaterial({
        color: palette.floor,
        roughness: 0.9,
        metalness: 0.1
    });
    
    materials.wall = new THREE.MeshStandardMaterial({
        color: palette.wall,
        roughness: 0.8,
        metalness: 0.2
    });
    
    materials.accent = new THREE.MeshStandardMaterial({
        color: palette.accent,
        roughness: 0.3,
        metalness: 0.8,
        emissive: palette.glow,
        emissiveIntensity: 0.5 // Increased emissive
    });
    
    materials.glow = new THREE.MeshBasicMaterial({
        color: palette.glow,
        transparent: true,
        opacity: 0.9
    });
    
    materials.portal = new THREE.MeshBasicMaterial({
        color: palette.portal,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
}

function getFloorPalette(floor) {
    if (floor <= 3) {
        // Mechanical/tomb - cool cyan - MUCH BRIGHTER
        return {
            floor: 0x3a3a5e,  // Brighter floor
            wall: 0x3a4a6e,   // Brighter walls
            accent: 0x2a5a90,
            glow: 0x00ffff,
            portal: 0x00ffff,
            fog: 0x1a1a2a     // Lighter fog
        };
    } else if (floor <= 6) {
        // Corrupted/hybrid - purple mixing - BRIGHTER
        return {
            floor: 0x3a3540,
            wall: 0x5a3b7e,
            accent: 0x7a3d9b,
            glow: 0xbf00ff,
            portal: 0x9900ff,
            fog: 0x201020
        };
    } else if (floor <= 9) {
        // Dream/organic - warm amber - BRIGHTER
        return {
            floor: 0x4a4030,
            wall: 0x5a5040,
            accent: 0x7a6550,
            glow: 0xffaa00,
            portal: 0xffd700,
            fog: 0x252015
        };
    } else {
        // Final floor - golden ethereal - BRIGHTER
        return {
            floor: 0x3a3832,
            wall: 0x454035,
            accent: 0x5a5040,
            glow: 0xffd700,
            portal: 0xffffff,
            fog: 0x28251f
        };
    }
}

function getFloorFogColor(floor) {
    const palette = getFloorPalette(floor);
    return palette.fog;
}

// ============================================
// ROOM BUILDERS
// ============================================

function buildCenterRoom() {
    const group = new THREE.Group();
    group.name = 'center_room';
    
    // Floor
    const floor = createFloor(CENTER_SIZE, CENTER_SIZE);
    group.add(floor);
    
    // Walls with openings for hallways
    // North wall (with opening)
    createWallSegment(group, -CENTER_SIZE/2, 0, -CENTER_SIZE/2, CENTER_SIZE/2 - HALLWAY_WIDTH/2, 'z');
    createWallSegment(group, CENTER_SIZE/2 - (CENTER_SIZE/2 - HALLWAY_WIDTH/2), 0, -CENTER_SIZE/2, CENTER_SIZE/2 - HALLWAY_WIDTH/2, 'z', HALLWAY_WIDTH/2);
    
    // South wall (with opening)
    createWallSegment(group, -CENTER_SIZE/2, 0, CENTER_SIZE/2, CENTER_SIZE/2 - HALLWAY_WIDTH/2, 'z');
    createWallSegment(group, HALLWAY_WIDTH/2, 0, CENTER_SIZE/2, CENTER_SIZE/2 - HALLWAY_WIDTH/2, 'z');
    
    // East wall (with opening)
    createWallSegment(group, CENTER_SIZE/2, 0, -CENTER_SIZE/2, CENTER_SIZE/2 - HALLWAY_WIDTH/2, 'x');
    createWallSegment(group, CENTER_SIZE/2, 0, HALLWAY_WIDTH/2, CENTER_SIZE/2 - HALLWAY_WIDTH/2, 'x');
    
    // West wall (with opening)
    createWallSegment(group, -CENTER_SIZE/2, 0, -CENTER_SIZE/2, CENTER_SIZE/2 - HALLWAY_WIDTH/2, 'x');
    createWallSegment(group, -CENTER_SIZE/2, 0, HALLWAY_WIDTH/2, CENTER_SIZE/2 - HALLWAY_WIDTH/2, 'x');
    
    // Corner pillars
    addPillar(group, -CENTER_SIZE/2 + 1, -CENTER_SIZE/2 + 1);
    addPillar(group, CENTER_SIZE/2 - 1, -CENTER_SIZE/2 + 1);
    addPillar(group, -CENTER_SIZE/2 + 1, CENTER_SIZE/2 - 1);
    addPillar(group, CENTER_SIZE/2 - 1, CENTER_SIZE/2 - 1);
    
    // Central feature - glowing floor sigil
    const sigil = createFloorSigil(6);
    group.add(sigil);
    
    // Ceiling
    const ceiling = createCeiling(CENTER_SIZE, CENTER_SIZE, WALL_HEIGHT);
    group.add(ceiling);
    
    // Add bright center room lighting
    addCenterRoomLighting(group);
    
    dungeonScene.add(group);
}

function buildHallways() {
    // East hallway
    const eastHall = createHallway(HALLWAY_LENGTH, HALLWAY_WIDTH);
    eastHall.position.set(CENTER_SIZE/2 + HALLWAY_LENGTH/2, 0, 0);
    eastHall.name = 'east_hallway';
    dungeonScene.add(eastHall);
    
    // West hallway
    const westHall = createHallway(HALLWAY_LENGTH, HALLWAY_WIDTH);
    westHall.position.set(-CENTER_SIZE/2 - HALLWAY_LENGTH/2, 0, 0);
    westHall.name = 'west_hallway';
    dungeonScene.add(westHall);
    
    // North hallway
    const northHall = createHallway(HALLWAY_LENGTH, HALLWAY_WIDTH);
    northHall.rotation.y = Math.PI / 2;
    northHall.position.set(0, 0, -CENTER_SIZE/2 - HALLWAY_LENGTH/2);
    northHall.name = 'north_hallway';
    dungeonScene.add(northHall);
    
    // South hallway
    const southHall = createHallway(HALLWAY_LENGTH, HALLWAY_WIDTH);
    southHall.rotation.y = Math.PI / 2;
    southHall.position.set(0, 0, CENTER_SIZE/2 + HALLWAY_LENGTH/2);
    southHall.name = 'south_hallway';
    dungeonScene.add(southHall);
}

function createHallway(length, width) {
    const group = new THREE.Group();
    
    // Floor
    const floor = createFloor(length, width);
    group.add(floor);
    
    // Walls along length
    const wallNorth = createWall(length, WALL_HEIGHT);
    wallNorth.position.set(0, WALL_HEIGHT/2, -width/2);
    group.add(wallNorth);
    
    const wallSouth = createWall(length, WALL_HEIGHT);
    wallSouth.position.set(0, WALL_HEIGHT/2, width/2);
    group.add(wallSouth);
    
    // Ceiling
    const ceiling = createCeiling(length, width, WALL_HEIGHT);
    group.add(ceiling);
    
    // Light strips - MUCH BRIGHTER
    addHallwayLights(group, length, width);
    
    return group;
}

function buildEastRoom() {
    // Small mobs room - rectangular, moderate size
    const group = new THREE.Group();
    group.name = 'east_room';
    
    const roomX = CENTER_SIZE/2 + HALLWAY_LENGTH + ORBITAL_SIZE/2;
    group.position.set(roomX, 0, 0);
    
    // Floor
    const floor = createFloor(ORBITAL_SIZE, ORBITAL_SIZE);
    group.add(floor);
    
    // Walls (opening on west side toward hallway)
    createWallSegment(group, -ORBITAL_SIZE/2, 0, -ORBITAL_SIZE/2, ORBITAL_SIZE, 'x'); // North
    createWallSegment(group, -ORBITAL_SIZE/2, 0, ORBITAL_SIZE/2, ORBITAL_SIZE, 'x');  // South
    createWallSegment(group, ORBITAL_SIZE/2, 0, -ORBITAL_SIZE/2, ORBITAL_SIZE, 'z');  // East (full)
    // West wall with opening
    createWallSegment(group, -ORBITAL_SIZE/2, 0, -ORBITAL_SIZE/2, ORBITAL_SIZE/2 - HALLWAY_WIDTH/2, 'z');
    createWallSegment(group, -ORBITAL_SIZE/2, 0, HALLWAY_WIDTH/2, ORBITAL_SIZE/2 - HALLWAY_WIDTH/2, 'z');
    
    // Ceiling
    const ceiling = createCeiling(ORBITAL_SIZE, ORBITAL_SIZE, WALL_HEIGHT);
    group.add(ceiling);
    
    // Corner lights - BRIGHTER
    addCornerLights(group, ORBITAL_SIZE);
    
    // Cover objects for tactical combat
    addCoverObjects(group, ORBITAL_SIZE, 'mechanical');
    
    dungeonScene.add(group);
}

function buildWestRoom() {
    // Mini-boss room - slightly larger, more dramatic
    const group = new THREE.Group();
    group.name = 'west_room';
    
    const roomX = -CENTER_SIZE/2 - HALLWAY_LENGTH - ORBITAL_SIZE/2;
    group.position.set(roomX, 0, 0);
    
    // Floor
    const floor = createFloor(ORBITAL_SIZE + 4, ORBITAL_SIZE + 4);
    group.add(floor);
    
    // Walls (opening on east side)
    createWallSegment(group, -(ORBITAL_SIZE+4)/2, 0, -(ORBITAL_SIZE+4)/2, ORBITAL_SIZE+4, 'x');
    createWallSegment(group, -(ORBITAL_SIZE+4)/2, 0, (ORBITAL_SIZE+4)/2, ORBITAL_SIZE+4, 'x');
    createWallSegment(group, -(ORBITAL_SIZE+4)/2, 0, -(ORBITAL_SIZE+4)/2, ORBITAL_SIZE+4, 'z');
    // East wall with opening
    createWallSegment(group, (ORBITAL_SIZE+4)/2, 0, -(ORBITAL_SIZE+4)/2, ORBITAL_SIZE/2, 'z');
    createWallSegment(group, (ORBITAL_SIZE+4)/2, 0, HALLWAY_WIDTH/2 + 1, ORBITAL_SIZE/2, 'z');
    
    // Ceiling
    const ceiling = createCeiling(ORBITAL_SIZE + 4, ORBITAL_SIZE + 4, WALL_HEIGHT);
    group.add(ceiling);
    
    // Arena-style lighting - BRIGHTER
    addArenaLighting(group, ORBITAL_SIZE + 4);
    
    // Boss platform in center
    const platform = createBossPlatform();
    group.add(platform);
    
    dungeonScene.add(group);
}

function buildNorthRoom() {
    // Pillar boss room - tall, cylindrical space
    const group = new THREE.Group();
    group.name = 'north_room';
    
    const roomZ = -CENTER_SIZE/2 - HALLWAY_LENGTH - ORBITAL_SIZE/2;
    group.position.set(0, 0, roomZ);
    
    // Larger, taller room
    const roomSize = ORBITAL_SIZE + 6;
    
    // Floor
    const floor = createFloor(roomSize, roomSize);
    group.add(floor);
    
    // Walls (opening on south side)
    createWallSegment(group, -roomSize/2, 0, -roomSize/2, roomSize, 'x', 0, PILLAR_ROOM_HEIGHT);
    createWallSegment(group, -roomSize/2, 0, roomSize/2, roomSize, 'x', 0, PILLAR_ROOM_HEIGHT);
    createWallSegment(group, -roomSize/2, 0, -roomSize/2, roomSize, 'z', 0, PILLAR_ROOM_HEIGHT);
    // South wall with opening
    createWallSegment(group, -roomSize/2, 0, roomSize/2, roomSize/2 - HALLWAY_WIDTH/2, 'z', 0, PILLAR_ROOM_HEIGHT);
    createWallSegment(group, HALLWAY_WIDTH/2, 0, roomSize/2, roomSize/2 - HALLWAY_WIDTH/2, 'z', 0, PILLAR_ROOM_HEIGHT);
    
    // Very high ceiling
    const ceiling = createCeiling(roomSize, roomSize, PILLAR_ROOM_HEIGHT);
    group.add(ceiling);
    
    // Spiral platforms around the center (for wall jumping during pillar fight)
    addSpiralPlatforms(group, roomSize);
    
    // Pillar boss placeholder position (actual boss spawned by entities.js)
    const pillarMarker = new THREE.Object3D();
    pillarMarker.name = 'pillar_spawn';
    pillarMarker.position.set(0, 0, 0);
    group.add(pillarMarker);
    
    // Dramatic vertical lighting - BRIGHTER
    addPillarRoomLighting(group, roomSize);
    
    dungeonScene.add(group);
}

function buildSouthRoom() {
    // Archive/exit room - ornate, mysterious
    const group = new THREE.Group();
    group.name = 'south_room';
    
    const roomZ = CENTER_SIZE/2 + HALLWAY_LENGTH + ORBITAL_SIZE/2;
    group.position.set(0, 0, roomZ);
    
    // Floor
    const floor = createFloor(ORBITAL_SIZE, ORBITAL_SIZE);
    group.add(floor);
    
    // Walls (opening on north side)
    createWallSegment(group, -ORBITAL_SIZE/2, 0, ORBITAL_SIZE/2, ORBITAL_SIZE, 'x');
    createWallSegment(group, -ORBITAL_SIZE/2, 0, -ORBITAL_SIZE/2, ORBITAL_SIZE, 'z');
    createWallSegment(group, ORBITAL_SIZE/2, 0, -ORBITAL_SIZE/2, ORBITAL_SIZE, 'z');
    // North wall with opening
    createWallSegment(group, -ORBITAL_SIZE/2, 0, -ORBITAL_SIZE/2, ORBITAL_SIZE/2 - HALLWAY_WIDTH/2, 'x');
    createWallSegment(group, HALLWAY_WIDTH/2, 0, -ORBITAL_SIZE/2, ORBITAL_SIZE/2 - HALLWAY_WIDTH/2, 'x');
    
    // Ceiling
    const ceiling = createCeiling(ORBITAL_SIZE, ORBITAL_SIZE, WALL_HEIGHT);
    group.add(ceiling);
    
    // Exit portal
    const portal = createExitPortal();
    portal.position.set(0, 0, ORBITAL_SIZE/2 - 2);
    group.add(portal);
    
    // Lore pedestal
    const pedestal = createLorePedestal();
    pedestal.position.set(-ORBITAL_SIZE/4, 0, 0);
    group.add(pedestal);
    
    // Soft ambient lighting - BRIGHTER
    addArchiveLighting(group, ORBITAL_SIZE);
    
    dungeonScene.add(group);
}

// ============================================
// GEOMETRY HELPERS
// ============================================

function createFloor(width, depth) {
    const geometry = new THREE.PlaneGeometry(width, depth, Math.floor(width), Math.floor(depth));
    const mesh = new THREE.Mesh(geometry, materials.floor);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    return mesh;
}

function createWall(width, height) {
    const geometry = new THREE.BoxGeometry(width, height, 0.5);
    const mesh = new THREE.Mesh(geometry, materials.wall);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createWallSegment(group, startX, startY, startZ, length, axis, offset = 0, height = WALL_HEIGHT) {
    const geometry = new THREE.BoxGeometry(
        axis === 'x' ? 0.5 : length,
        height,
        axis === 'z' ? 0.5 : length
    );
    const mesh = new THREE.Mesh(geometry, materials.wall);
    
    if (axis === 'x') {
        mesh.position.set(startX, height/2, startZ + length/2 + offset);
    } else {
        mesh.position.set(startX + length/2 + offset, height/2, startZ);
    }
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
}

function createCeiling(width, depth, height) {
    const geometry = new THREE.PlaneGeometry(width, depth);
    const mesh = new THREE.Mesh(geometry, materials.wall);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = height;
    mesh.receiveShadow = true;
    return mesh;
}

function addPillar(group, x, z) {
    const geometry = new THREE.BoxGeometry(1.5, WALL_HEIGHT, 1.5);
    const mesh = new THREE.Mesh(geometry, materials.accent);
    mesh.position.set(x, WALL_HEIGHT/2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    
    // Glow strip on pillar
    const glowGeom = new THREE.BoxGeometry(0.1, WALL_HEIGHT - 1, 0.1);
    const glowMesh = new THREE.Mesh(glowGeom, materials.glow);
    glowMesh.position.set(x + 0.7, WALL_HEIGHT/2, z + 0.7);
    group.add(glowMesh);
    glowMeshes.push(glowMesh);
}

function createFloorSigil(radius) {
    const group = new THREE.Group();
    
    // Outer ring
    const ringGeom = new THREE.RingGeometry(radius - 0.3, radius, 32);
    const ringMat = materials.glow.clone();
    ringMat.opacity = 0.5;
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    group.add(ring);
    
    // Inner patterns
    for (let i = 0; i < 4; i++) {
        const lineGeom = new THREE.PlaneGeometry(radius * 1.5, 0.1);
        const line = new THREE.Mesh(lineGeom, ringMat);
        line.rotation.x = -Math.PI / 2;
        line.rotation.z = (Math.PI / 4) * i;
        line.position.y = 0.01;
        group.add(line);
    }
    
    // Center glow
    const centerGeom = new THREE.CircleGeometry(1, 16);
    const center = new THREE.Mesh(centerGeom, ringMat);
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.02;
    group.add(center);
    
    glowMeshes.push(ring, center);
    
    return group;
}

function createBossPlatform() {
    const group = new THREE.Group();
    
    // Raised platform
    const platGeom = new THREE.CylinderGeometry(3, 3.5, 0.5, 8);
    const platform = new THREE.Mesh(platGeom, materials.accent);
    platform.position.y = 0.25;
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);
    
    // Glow ring
    const ringGeom = new THREE.TorusGeometry(3.2, 0.1, 8, 32);
    const ring = new THREE.Mesh(ringGeom, materials.glow);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5;
    group.add(ring);
    glowMeshes.push(ring);
    
    return group;
}

function addSpiralPlatforms(group, roomSize) {
    const numPlatforms = 8;
    const heightStep = PILLAR_ROOM_HEIGHT / numPlatforms;
    const radius = roomSize / 2 - 2;
    
    for (let i = 0; i < numPlatforms; i++) {
        const angle = (i / numPlatforms) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (i + 1) * heightStep - 1;
        
        // Platform
        const platGeom = new THREE.BoxGeometry(3, 0.5, 2);
        const platform = new THREE.Mesh(platGeom, materials.accent);
        platform.position.set(x, y, z);
        platform.rotation.y = -angle;
        platform.castShadow = true;
        platform.receiveShadow = true;
        platform.userData.isPlatform = true;
        group.add(platform);
        
        // Small light on platform - BRIGHTER
        const light = new THREE.PointLight(getFloorPalette(currentFloor).glow, 1.5, 10);
        light.position.set(x, y + 1, z);
        group.add(light);
    }
}

function createExitPortal() {
    const group = new THREE.Group();
    
    // Portal frame
    const frameGeom = new THREE.TorusGeometry(2, 0.3, 8, 32);
    const frame = new THREE.Mesh(frameGeom, materials.accent);
    frame.rotation.x = Math.PI / 2;
    frame.position.y = 2;
    frame.castShadow = true;
    group.add(frame);
    
    // Portal surface
    const portalGeom = new THREE.CircleGeometry(1.7, 32);
    const portal = new THREE.Mesh(portalGeom, materials.portal);
    portal.position.y = 2;
    portal.userData.isPortal = true;
    group.add(portal);
    glowMeshes.push(portal);
    
    // Portal light - BRIGHTER
    const light = new THREE.PointLight(getFloorPalette(currentFloor).portal, 4, 15);
    light.position.y = 2;
    group.add(light);
    animatedLights.push({ light, baseIntensity: 4, variation: 0.8 });
    
    return group;
}

function createLorePedestal() {
    const group = new THREE.Group();
    
    // Base
    const baseGeom = new THREE.CylinderGeometry(0.8, 1, 1, 6);
    const base = new THREE.Mesh(baseGeom, materials.wall);
    base.position.y = 0.5;
    base.castShadow = true;
    group.add(base);
    
    // Glowing top
    const topGeom = new THREE.BoxGeometry(0.8, 0.1, 0.8);
    const top = new THREE.Mesh(topGeom, materials.glow);
    top.position.y = 1.05;
    group.add(top);
    glowMeshes.push(top);
    
    // Floating book/tablet
    const tabletGeom = new THREE.BoxGeometry(0.6, 0.05, 0.4);
    const tablet = new THREE.Mesh(tabletGeom, materials.accent);
    tablet.position.y = 1.5;
    tablet.rotation.x = -0.3;
    group.add(tablet);
    
    // Mark as interactable
    group.userData.isLorePedestal = true;
    
    return group;
}

function addCoverObjects(group, roomSize, style) {
    const positions = [
        { x: -roomSize/4, z: -roomSize/4 },
        { x: roomSize/4, z: roomSize/4 },
        { x: -roomSize/4, z: roomSize/4 },
        { x: roomSize/4, z: -roomSize/4 }
    ];
    
    positions.forEach((pos, i) => {
        const height = 1.5 + Math.random() * 0.5;
        const geom = new THREE.BoxGeometry(1.5, height, 1.5);
        const mesh = new THREE.Mesh(geom, materials.wall);
        mesh.position.set(pos.x, height/2, pos.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.isCover = true;
        group.add(mesh);
    });
}

// ============================================
// LIGHTING - SIGNIFICANTLY BRIGHTER
// ============================================

function addAmbientLighting(floor) {
    // MUCH brighter ambient so geometry is clearly visible
    const ambient = new THREE.AmbientLight(0x606080, 2.5); // Increased from 1.0 to 2.5
    dungeonScene.add(ambient);
    
    // Hemisphere light for color variation - BRIGHTER
    const palette = getFloorPalette(floor);
    const hemi = new THREE.HemisphereLight(palette.glow, 0x404040, 1.5); // Increased from 0.8 to 1.5
    dungeonScene.add(hemi);
    
    // Strong directional light for overall visibility
    const dirLight = new THREE.DirectionalLight(0x8888cc, 1.2); // Increased from 0.5 to 1.2
    dirLight.position.set(10, 20, 10);
    dungeonScene.add(dirLight);
    
    // Add a second directional light from opposite side
    const dirLight2 = new THREE.DirectionalLight(0x6666aa, 0.8);
    dirLight2.position.set(-10, 15, -10);
    dungeonScene.add(dirLight2);
}

function addCenterRoomLighting(group) {
    const palette = getFloorPalette(currentFloor);
    
    // Bright central light
    const centerLight = new THREE.PointLight(palette.glow, 4, 35);
    centerLight.position.set(0, WALL_HEIGHT - 1, 0);
    group.add(centerLight);
    animatedLights.push({ light: centerLight, baseIntensity: 4, variation: 0.5 });
    
    // Four corner lights
    const corners = [
        { x: -CENTER_SIZE/3, z: -CENTER_SIZE/3 },
        { x: CENTER_SIZE/3, z: -CENTER_SIZE/3 },
        { x: -CENTER_SIZE/3, z: CENTER_SIZE/3 },
        { x: CENTER_SIZE/3, z: CENTER_SIZE/3 }
    ];
    
    corners.forEach((pos, i) => {
        const light = new THREE.PointLight(palette.glow, 2.5, 20);
        light.position.set(pos.x, WALL_HEIGHT - 2, pos.z);
        group.add(light);
        animatedLights.push({ light, baseIntensity: 2.5, variation: 0.3, phase: i });
    });
}

function addHallwayLights(group, length, width) {
    const palette = getFloorPalette(currentFloor);
    const numLights = 3;
    const spacing = length / (numLights + 1);
    
    for (let i = 1; i <= numLights; i++) {
        // Light on ceiling - MUCH brighter and longer range
        const light = new THREE.PointLight(palette.glow, 4, 30);
        light.position.set(-length/2 + i * spacing, WALL_HEIGHT - 1, 0);
        group.add(light);
        animatedLights.push({ light, baseIntensity: 4, variation: 0.5 });
        
        // Visual glow marker
        const glowGeom = new THREE.SphereGeometry(0.2, 8, 8);
        const glow = new THREE.Mesh(glowGeom, materials.glow);
        glow.position.copy(light.position);
        group.add(glow);
        glowMeshes.push(glow);
    }
}

function addCornerLights(group, roomSize) {
    const palette = getFloorPalette(currentFloor);
    const corners = [
        { x: -roomSize/2 + 1, z: -roomSize/2 + 1 },
        { x: roomSize/2 - 1, z: -roomSize/2 + 1 },
        { x: -roomSize/2 + 1, z: roomSize/2 - 1 },
        { x: roomSize/2 - 1, z: roomSize/2 - 1 }
    ];
    
    corners.forEach(pos => {
        // MUCH brighter corner lights
        const light = new THREE.PointLight(palette.glow, 4, 35);
        light.position.set(pos.x, WALL_HEIGHT - 1, pos.z);
        group.add(light);
        animatedLights.push({ light, baseIntensity: 4, variation: 0.5 });
    });
    
    // Add center light for even coverage
    const centerLight = new THREE.PointLight(palette.glow, 3, 30);
    centerLight.position.set(0, WALL_HEIGHT - 1, 0);
    group.add(centerLight);
    animatedLights.push({ light: centerLight, baseIntensity: 3, variation: 0.4 });
}

function addArenaLighting(group, roomSize) {
    const palette = getFloorPalette(currentFloor);
    
    // Central spotlight - MUCH brighter
    const spotlight = new THREE.SpotLight(palette.glow, 8, roomSize * 2, Math.PI / 4, 0.5, 1);
    spotlight.position.set(0, WALL_HEIGHT - 0.5, 0);
    spotlight.target.position.set(0, 0, 0);
    group.add(spotlight);
    group.add(spotlight.target);
    animatedLights.push({ light: spotlight, baseIntensity: 8, variation: 1.5 });
    
    // Additional ambient point light
    const ambientLight = new THREE.PointLight(palette.glow, 4, 40);
    ambientLight.position.set(0, WALL_HEIGHT - 2, 0);
    group.add(ambientLight);
    
    // Corner accent lights - BRIGHTER
    addCornerLights(group, roomSize);
}

function addPillarRoomLighting(group, roomSize) {
    const palette = getFloorPalette(currentFloor);
    
    // Vertical strip lights on walls - MUCH brighter and longer range
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const x = Math.cos(angle) * (roomSize / 2 - 0.5);
        const z = Math.sin(angle) * (roomSize / 2 - 0.5);
        
        for (let j = 0; j < 4; j++) {
            const y = 3 + j * 4;
            const light = new THREE.PointLight(palette.glow, 3, 25);
            light.position.set(x, y, z);
            group.add(light);
            animatedLights.push({ light, baseIntensity: 3, variation: 0.5, phase: i + j });
        }
    }
    
    // Dramatic central light from above - MUCH brighter
    const topLight = new THREE.PointLight(palette.glow, 8, 50);
    topLight.position.set(0, PILLAR_ROOM_HEIGHT - 1, 0);
    group.add(topLight);
    animatedLights.push({ light: topLight, baseIntensity: 8, variation: 1.0 });
    
    // Floor level ambient
    const floorLight = new THREE.PointLight(palette.glow, 3, 30);
    floorLight.position.set(0, 2, 0);
    group.add(floorLight);
}

function addArchiveLighting(group, roomSize) {
    const palette = getFloorPalette(currentFloor);
    
    // Soft overhead light - BRIGHTER
    const mainLight = new THREE.PointLight(palette.glow, 5, 40);
    mainLight.position.set(0, WALL_HEIGHT - 1, 0);
    group.add(mainLight);
    
    // Portal glow (adds to portal's own light) - BRIGHTER
    const portalLight = new THREE.PointLight(palette.portal, 5, 20);
    portalLight.position.set(0, 2, roomSize/2 - 2);
    group.add(portalLight);
    animatedLights.push({ light: portalLight, baseIntensity: 5, variation: 1.0 });
    
    // Corner fill lights
    const corners = [
        { x: -roomSize/3, z: -roomSize/3 },
        { x: roomSize/3, z: -roomSize/3 },
        { x: -roomSize/3, z: roomSize/3 },
        { x: roomSize/3, z: roomSize/3 }
    ];
    
    corners.forEach(pos => {
        const light = new THREE.PointLight(palette.glow, 2, 15);
        light.position.set(pos.x, WALL_HEIGHT - 2, pos.z);
        group.add(light);
    });
}

// ============================================
// DECORATIONS
// ============================================

function addDecorations(floor) {
    if (floor <= 3) {
        addMechanicalDecorations();
    } else if (floor <= 6) {
        addCorruptedDecorations();
    } else {
        addOrganicDecorations();
    }
}

function addMechanicalDecorations() {
    // Pipes along walls
    const pipeGeom = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.8, roughness: 0.3 });
    
    // Add pipes at various positions
    const pipePositions = [
        { x: -CENTER_SIZE/2 + 0.3, z: -5, rotZ: 0 },
        { x: -CENTER_SIZE/2 + 0.3, z: 5, rotZ: 0 },
        { x: CENTER_SIZE/2 - 0.3, z: -3, rotZ: 0 },
    ];
    
    pipePositions.forEach(pos => {
        const pipe = new THREE.Mesh(pipeGeom, pipeMat);
        pipe.position.set(pos.x, WALL_HEIGHT/2, pos.z);
        pipe.rotation.z = pos.rotZ;
        dungeonScene.add(pipe);
    });
    
    // Warning signs (billboard sprites would go here in a full implementation)
    // For now, small glowing panels
    addWarningPanels();
}

function addWarningPanels() {
    const panelGeom = new THREE.PlaneGeometry(0.8, 0.5);
    const panelMat = new THREE.MeshBasicMaterial({ 
        color: 0xff6600, 
        transparent: true, 
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    
    const positions = [
        { x: CENTER_SIZE/2 + 2, z: -2, rotY: -Math.PI/2 },
        { x: -CENTER_SIZE/2 - 2, z: 2, rotY: Math.PI/2 }
    ];
    
    positions.forEach(pos => {
        const panel = new THREE.Mesh(panelGeom, panelMat);
        panel.position.set(pos.x, 2, pos.z);
        panel.rotation.y = pos.rotY;
        dungeonScene.add(panel);
    });
}

function addCorruptedDecorations() {
    // Roots breaking through
    const rootMat = new THREE.MeshStandardMaterial({ color: 0x2d1b4e, roughness: 0.9 });
    
    for (let i = 0; i < 8; i++) {
        const root = createRoot();
        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 5;
        root.position.set(
            Math.cos(angle) * dist,
            0,
            Math.sin(angle) * dist
        );
        root.rotation.y = angle;
        dungeonScene.add(root);
    }
    
    // Cracked floor sections (dark patches)
    const crackGeom = new THREE.CircleGeometry(1.5, 6);
    const crackMat = new THREE.MeshStandardMaterial({ color: 0x0a0510, roughness: 1 });
    
    for (let i = 0; i < 5; i++) {
        const crack = new THREE.Mesh(crackGeom, crackMat);
        crack.rotation.x = -Math.PI / 2;
        crack.position.set(
            (Math.random() - 0.5) * CENTER_SIZE,
            0.01,
            (Math.random() - 0.5) * CENTER_SIZE
        );
        crack.rotation.z = Math.random() * Math.PI;
        dungeonScene.add(crack);
    }
}

function createRoot() {
    const group = new THREE.Group();
    const rootMat = new THREE.MeshStandardMaterial({ color: 0x3d2b5e, roughness: 0.9 });
    
    // Main root tendril
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.3, 1, 0.2),
        new THREE.Vector3(-0.2, 2, 0.1),
        new THREE.Vector3(0.1, 3, -0.2)
    ]);
    
    const tubeGeom = new THREE.TubeGeometry(curve, 10, 0.15, 6, false);
    const root = new THREE.Mesh(tubeGeom, rootMat);
    group.add(root);
    
    return group;
}

function addOrganicDecorations() {
    // Luminous plants
    const glowPlantMat = new THREE.MeshBasicMaterial({ 
        color: getFloorPalette(currentFloor).glow,
        transparent: true,
        opacity: 0.7
    });
    
    for (let i = 0; i < 12; i++) {
        const plant = createGlowPlant();
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 10;
        plant.position.set(
            Math.cos(angle) * dist,
            0,
            Math.sin(angle) * dist
        );
        dungeonScene.add(plant);
        glowMeshes.push(plant);
    }
    
    // Floating particles (simulated with small meshes)
    addFloatingParticles();
}

function createGlowPlant() {
    const group = new THREE.Group();
    const palette = getFloorPalette(currentFloor);
    
    // Stem
    const stemGeom = new THREE.CylinderGeometry(0.05, 0.08, 0.8, 6);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x334422 });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = 0.4;
    group.add(stem);
    
    // Glowing bulb
    const bulbGeom = new THREE.SphereGeometry(0.15, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ 
        color: palette.glow,
        transparent: true,
        opacity: 0.8
    });
    const bulb = new THREE.Mesh(bulbGeom, bulbMat);
    bulb.position.y = 0.9;
    group.add(bulb);
    
    // Small light - BRIGHTER
    const light = new THREE.PointLight(palette.glow, 0.8, 5);
    light.position.y = 0.9;
    group.add(light);
    animatedLights.push({ light, baseIntensity: 0.8, variation: 0.2 });
    
    return group;
}

function addFloatingParticles() {
    const palette = getFloorPalette(currentFloor);
    const particleGeom = new THREE.SphereGeometry(0.05, 4, 4);
    const particleMat = new THREE.MeshBasicMaterial({
        color: palette.glow,
        transparent: true,
        opacity: 0.6
    });
    
    for (let i = 0; i < 30; i++) {
        const particle = new THREE.Mesh(particleGeom, particleMat);
        particle.position.set(
            (Math.random() - 0.5) * 30,
            1 + Math.random() * 5,
            (Math.random() - 0.5) * 30
        );
        particle.userData.floatSpeed = 0.5 + Math.random() * 0.5;
        particle.userData.floatOffset = Math.random() * Math.PI * 2;
        dungeonScene.add(particle);
        glowMeshes.push(particle);
    }
}

// ============================================
// UPDATE LOOP
// ============================================

let time = 0;

export function updateDungeon(delta, floor) {
    time += delta;
    
    // Animate lights (flicker effect)
    animatedLights.forEach((lightData, i) => {
        const phase = lightData.phase || i * 0.5;
        const flicker = Math.sin(time * 3 + phase) * lightData.variation;
        lightData.light.intensity = lightData.baseIntensity + flicker;
    });
    
    // Animate glow meshes (pulse)
    glowMeshes.forEach((mesh, i) => {
        if (mesh.material && mesh.material.opacity !== undefined) {
            const basOpacity = 0.6;
            const pulse = Math.sin(time * 2 + i * 0.3) * 0.2;
            mesh.material.opacity = basOpacity + pulse;
        }
        
        // Float particles
        if (mesh.userData.floatSpeed) {
            mesh.position.y += Math.sin(time * mesh.userData.floatSpeed + mesh.userData.floatOffset) * 0.002;
        }
    });
}

// ============================================
// ROOM TRANSITION DETECTION
// ============================================

export function checkRoomTransition(playerPos) {
    const x = playerPos.x;
    const z = playerPos.z;
    
    // Define room boundaries
    const roomBounds = {
        center: { minX: -CENTER_SIZE/2, maxX: CENTER_SIZE/2, minZ: -CENTER_SIZE/2, maxZ: CENTER_SIZE/2 },
        east_hallway: { minX: CENTER_SIZE/2, maxX: CENTER_SIZE/2 + HALLWAY_LENGTH, minZ: -HALLWAY_WIDTH/2, maxZ: HALLWAY_WIDTH/2 },
        west_hallway: { minX: -CENTER_SIZE/2 - HALLWAY_LENGTH, maxX: -CENTER_SIZE/2, minZ: -HALLWAY_WIDTH/2, maxZ: HALLWAY_WIDTH/2 },
        north_hallway: { minX: -HALLWAY_WIDTH/2, maxX: HALLWAY_WIDTH/2, minZ: -CENTER_SIZE/2 - HALLWAY_LENGTH, maxZ: -CENTER_SIZE/2 },
        south_hallway: { minX: -HALLWAY_WIDTH/2, maxX: HALLWAY_WIDTH/2, minZ: CENTER_SIZE/2, maxZ: CENTER_SIZE/2 + HALLWAY_LENGTH },
        east: { 
            minX: CENTER_SIZE/2 + HALLWAY_LENGTH, 
            maxX: CENTER_SIZE/2 + HALLWAY_LENGTH + ORBITAL_SIZE, 
            minZ: -ORBITAL_SIZE/2, 
            maxZ: ORBITAL_SIZE/2 
        },
        west: { 
            minX: -CENTER_SIZE/2 - HALLWAY_LENGTH - ORBITAL_SIZE - 4, 
            maxX: -CENTER_SIZE/2 - HALLWAY_LENGTH, 
            minZ: -(ORBITAL_SIZE+4)/2, 
            maxZ: (ORBITAL_SIZE+4)/2 
        },
        north: { 
            minX: -(ORBITAL_SIZE+6)/2, 
            maxX: (ORBITAL_SIZE+6)/2, 
            minZ: -CENTER_SIZE/2 - HALLWAY_LENGTH - ORBITAL_SIZE - 6, 
            maxZ: -CENTER_SIZE/2 - HALLWAY_LENGTH 
        },
        south: { 
            minX: -ORBITAL_SIZE/2, 
            maxX: ORBITAL_SIZE/2, 
            minZ: CENTER_SIZE/2 + HALLWAY_LENGTH, 
            maxZ: CENTER_SIZE/2 + HALLWAY_LENGTH + ORBITAL_SIZE 
        }
    };
    
    // Check which room player is in
    for (const [roomName, bounds] of Object.entries(roomBounds)) {
        if (x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ) {
            return roomName;
        }
    }
    
    return currentRoom; // Stay in current room if position unclear
}

export function getRoomData(roomType) {
    const roomCenters = {
        center: { x: 0, z: 0 },
        east: { x: CENTER_SIZE/2 + HALLWAY_LENGTH + ORBITAL_SIZE/2, z: 0 },
        west: { x: -CENTER_SIZE/2 - HALLWAY_LENGTH - (ORBITAL_SIZE+4)/2, z: 0 },
        north: { x: 0, z: -CENTER_SIZE/2 - HALLWAY_LENGTH - (ORBITAL_SIZE+6)/2 },
        south: { x: 0, z: CENTER_SIZE/2 + HALLWAY_LENGTH + ORBITAL_SIZE/2 }
    };
    
    return roomCenters[roomType] || roomCenters.center;
}

// ============================================
// GETTERS/SETTERS
// ============================================

export function getDungeonScene() {
    return dungeonScene;
}

export function getCurrentRoom() {
    return currentRoom;
}

export function setCurrentRoom(room) {
    currentRoom = room;
}

export function getCurrentFloor() {
    return currentFloor;
}

// Also export getTownScene for controls.js (will be null in dungeon)
export function getTownScene() {
    return null;
}

// ============================================
// CLEANUP
// ============================================

export function disposeDungeon() {
    if (!dungeonScene) return;
    
    // Clear arrays
    animatedLights.length = 0;
    glowMeshes.length = 0;
    
    // Dispose of all objects
    dungeonScene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });
    
    // Clear scene
    while (dungeonScene.children.length > 0) {
        dungeonScene.remove(dungeonScene.children[0]);
    }
}
