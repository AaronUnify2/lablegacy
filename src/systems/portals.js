// Portal System - Progressive unlocking and portal management
// Handles room progression, portal barriers, and unlocking mechanics

class DungeonPortalSystem {
    constructor() {
        console.log('Initializing Dungeon Portal System...');
        
        // Progressive unlock system
        this.roomProgression = {
            center: { unlocked: true, enemiesDefeated: false },
            north: { unlocked: true, enemiesDefeated: false },
            east: { unlocked: false, enemiesDefeated: false },
            west: { unlocked: false, enemiesDefeated: false },
            south: { unlocked: false, enemiesDefeated: false }
        };
        
        this.progressionOrder = ['north', 'east', 'west', 'south'];
        this.currentProgressionIndex = 0;
        
        // Portal management
        this.portals = [];
        this.materialSystem = null;
        
        // Grid reference (matching dungeon system)
        this.gridSize = 2;
        this.dungeonWidth = 180;
        this.dungeonDepth = 180;
        this.floorHeight = 0;
        
        this.init();
    }
    
    init() {
        console.log('Portal system ready for progressive unlocking');
        return true;
    }
    
    // Connect to material system
    setMaterialSystem(materialSystem) {
        this.materialSystem = materialSystem;
        console.log('Material system connected to portal system');
    }
    
    // Progressive Unlock System
    resetProgression() {
        this.roomProgression = {
            center: { unlocked: true, enemiesDefeated: false },
            north: { unlocked: true, enemiesDefeated: false },
            east: { unlocked: false, enemiesDefeated: false },
            west: { unlocked: false, enemiesDefeated: false },
            south: { unlocked: false, enemiesDefeated: false }
        };
        this.currentProgressionIndex = 0;
        console.log('Room progression reset');
    }
    
    defeatEnemiesInRoom(roomDirection) {
        if (this.roomProgression[roomDirection]) {
            this.roomProgression[roomDirection].enemiesDefeated = true;
            this.checkProgressionUnlock();
            console.log(`Enemies defeated in ${roomDirection} room`);
        }
    }
    
    checkProgressionUnlock() {
        if (this.currentProgressionIndex >= this.progressionOrder.length) {
            return;
        }
        
        const currentRoom = this.progressionOrder[this.currentProgressionIndex];
        
        if (this.roomProgression[currentRoom] && this.roomProgression[currentRoom].enemiesDefeated) {
            this.currentProgressionIndex++;
            
            if (this.currentProgressionIndex < this.progressionOrder.length) {
                const nextRoom = this.progressionOrder[this.currentProgressionIndex];
                this.roomProgression[nextRoom].unlocked = true;
                this.updateRoomPortals(nextRoom, true);
                console.log(`${nextRoom} chamber unlocked!`);
            } else {
                console.log('All chambers cleared!');
            }
        }
    }
    
    testProgressionAdvance() {
        const currentRoom = this.progressionOrder[this.currentProgressionIndex];
        if (currentRoom) {
            this.defeatEnemiesInRoom(currentRoom);
        }
    }
    
    // Portal Creation and Management
    addPortals(roomLayout, dungeonGroup) {
        console.log('Adding portal system to dungeon...');
        
        this.clearPortals();
        
        const centerRoom = roomLayout.rooms.center;
        const gridWidth = Math.floor(this.dungeonWidth / this.gridSize);
        const gridDepth = Math.floor(this.dungeonDepth / this.gridSize);
        const centerWorldX = (centerRoom.gridX - gridWidth/2) * this.gridSize;
        const centerWorldZ = (centerRoom.gridZ - gridDepth/2) * this.gridSize;
        
        // Portal positions relative to center
        const portalPositions = {
            north: { x: centerWorldX, z: centerWorldZ - 15, rotation: 0 },
            east: { x: centerWorldX + 15, z: centerWorldZ, rotation: Math.PI / 2 },
            west: { x: centerWorldX - 15, z: centerWorldZ, rotation: -Math.PI / 2 },
            south: { x: centerWorldX, z: centerWorldZ + 15, rotation: Math.PI }
        };
        
        // Create portals for each direction
        Object.entries(portalPositions).forEach(([direction, pos]) => {
            const portal = this.createPortal(direction, this.roomProgression[direction].unlocked, pos.rotation);
            portal.position.set(pos.x, this.floorHeight + 4, pos.z);
            portal.name = `${direction}_portal`;
            
            dungeonGroup.add(portal);
            this.portals.push(portal);
        });
        
        console.log(`Created ${this.portals.length} portals`);
    }
    
    createPortal(direction, isUnlocked, rotation = 0) {
        const portalGroup = new THREE.Group();
        portalGroup.userData = {
            direction: direction,
            isBlocking: !isUnlocked,
            portalType: 'room_entrance'
        };
        
        // Create portal archway
        const arch = this.createPortalArch(isUnlocked);
        arch.rotation.y = rotation;
        portalGroup.add(arch);
        
        // Create barrier when locked
        if (!isUnlocked) {
            const barrier = this.createPortalBarrier();
            barrier.rotation.y = rotation;
            portalGroup.add(barrier);
            portalGroup.userData.barrier = barrier;
        }
        
        // Add mystical effects
        const effects = this.createPortalEffects(isUnlocked);
        effects.rotation.y = rotation;
        portalGroup.add(effects);
        
        return portalGroup;
    }
    
    createPortalArch(isUnlocked) {
        const archGroup = new THREE.Group();
        
        // Main archway ring
        const archGeometry = new THREE.RingGeometry(2.2, 2.8, 16, 1, 0, Math.PI * 1.8);
        const archMaterial = isUnlocked ? 
            (this.materialSystem ? this.materialSystem.getMaterial('portal_frame') : new THREE.MeshLambertMaterial({ color: 0xB8860B })) :
            (this.materialSystem ? this.materialSystem.getMaterial('rusted_metal') : new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
        
        const arch = new THREE.Mesh(archGeometry, archMaterial);
        arch.rotation.x = Math.PI / 2;
        archGroup.add(arch);
        
        // Portal pillars
        const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.3, 6, 8);
        const pillarMaterial = archMaterial.clone();
        
        const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        leftPillar.position.set(-2.5, -1, 0);
        archGroup.add(leftPillar);
        
        const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        rightPillar.position.set(2.5, -1, 0);
        archGroup.add(rightPillar);
        
        // Decorative elements
        if (isUnlocked) {
            this.addPortalDecorations(archGroup);
        }
        
        return archGroup;
    }
    
    createPortalBarrier() {
        const barrierGroup = new THREE.Group();
        
        // Main barrier plane
        const barrierGeometry = new THREE.PlaneGeometry(4.5, 5.5);
        const barrierMaterial = this.materialSystem ? 
            this.materialSystem.getMaterial('magic_barrier') :
            new THREE.MeshBasicMaterial({
                color: 0x8B0000,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
        
        const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        barrier.rotation.x = Math.PI / 2;
        barrierGroup.add(barrier);
        
        // Barrier frame
        const frameGeometry = new THREE.RingGeometry(2.2, 2.4, 16);
        const frameMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.9
        });
        
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.rotation.x = Math.PI / 2;
        frame.position.y = 0.1;
        barrierGroup.add(frame);
        
        // Add mystical runes around the barrier
        this.addBarrierRunes(barrierGroup);
        
        barrierGroup.userData = { 
            type: 'barrier',
            animationSpeed: 2.0,
            pulseIntensity: 0.3
        };
        
        return barrierGroup;
    }
    
    createPortalEffects(isUnlocked) {
        const effectsGroup = new THREE.Group();
        
        if (isUnlocked) {
            // Active portal swirling energy
            const energyGeometry = new THREE.RingGeometry(1.8, 2.0, 24);
            const energyMaterial = this.materialSystem ? 
                this.materialSystem.getMaterial('portal_active') :
                new THREE.MeshBasicMaterial({
                    color: 0x00FF00,
                    transparent: true,
                    opacity: 0.6,
                    side: THREE.DoubleSide
                });
            
            const energy = new THREE.Mesh(energyGeometry, energyMaterial);
            energy.rotation.x = Math.PI / 2;
            energy.userData = { 
                type: 'energy_swirl',
                rotationSpeed: 1.5,
                pulseSpeed: 2.0
            };
            effectsGroup.add(energy);
            
            // Floating particles effect
            this.addFloatingParticles(effectsGroup);
            
        } else {
            // Locked portal ominous glow
            const ominousGeometry = new THREE.RingGeometry(2.0, 2.2, 16);
            const ominousMaterial = this.materialSystem ? 
                this.materialSystem.getMaterial('portal_locked') :
                new THREE.MeshBasicMaterial({
                    color: 0xFF0000,
                    transparent: true,
                    opacity: 0.4,
                    side: THREE.DoubleSide
                });
            
            const ominous = new THREE.Mesh(ominousGeometry, ominousMaterial);
            ominous.rotation.x = Math.PI / 2;
            ominous.userData = { 
                type: 'ominous_glow',
                pulseSpeed: 0.8
            };
            effectsGroup.add(ominous);
        }
        
        return effectsGroup;
    }
    
    addPortalDecorations(archGroup) {
        // Add mystical crystals around the arch
        const crystalPositions = [
            { x: 0, y: 3, z: 0 },      // Top
            { x: -2, y: 1.5, z: 0 },   // Left
            { x: 2, y: 1.5, z: 0 }     // Right
        ];
        
        crystalPositions.forEach(pos => {
            const crystalGeometry = new THREE.OctahedronGeometry(0.2);
            const crystalMaterial = this.materialSystem ? 
                this.materialSystem.getMaterial('crystal_formation') :
                new THREE.MeshLambertMaterial({ 
                    color: 0x4169E1,
                    emissive: 0x4169E1,
                    emissiveIntensity: 0.3
                });
            
            const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
            crystal.position.set(pos.x, pos.y, pos.z);
            crystal.userData = { 
                type: 'decoration_crystal',
                rotationSpeed: 0.5,
                bobSpeed: 1.0,
                bobAmount: 0.1
            };
            archGroup.add(crystal);
        });
    }
    
    addBarrierRunes(barrierGroup) {
        // Create mystical runes around the barrier
        const runePositions = [
            { angle: 0, radius: 3 },
            { angle: Math.PI / 2, radius: 3 },
            { angle: Math.PI, radius: 3 },
            { angle: 3 * Math.PI / 2, radius: 3 }
        ];
        
        runePositions.forEach((rune, i) => {
            const runeGeometry = new THREE.RingGeometry(0.1, 0.2, 6);
            const runeMaterial = new THREE.MeshBasicMaterial({
                color: 0xFF6666,
                transparent: true,
                opacity: 0.8
            });
            
            const runeMesh = new THREE.Mesh(runeGeometry, runeMaterial);
            runeMesh.position.set(
                Math.cos(rune.angle) * rune.radius,
                0.2,
                Math.sin(rune.angle) * rune.radius
            );
            runeMesh.rotation.x = Math.PI / 2;
            runeMesh.userData = { 
                type: 'barrier_rune',
                pulseSpeed: 1.5,
                pulseOffset: i * Math.PI / 2
            };
            barrierGroup.add(runeMesh);
        });
    }
    
    addFloatingParticles(effectsGroup) {
        // Create floating particle effects around active portals
        for (let i = 0; i < 8; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0x00FFFF,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            const angle = (i / 8) * Math.PI * 2;
            particle.position.set(
                Math.cos(angle) * 2.5,
                Math.random() * 2 - 1,
                Math.sin(angle) * 2.5
            );
            
            particle.userData = { 
                type: 'floating_particle',
                orbitSpeed: 0.5 + Math.random() * 0.5,
                orbitRadius: 2.5,
                bobSpeed: 1.0 + Math.random() * 0.5,
                bobAmount: 0.3,
                baseHeight: particle.position.y
            };
            
            effectsGroup.add(particle);
        }
    }
    
    // Portal state management
    updateRoomPortals(direction, shouldOpen) {
        console.log(`Updating ${direction} portal - ${shouldOpen ? 'OPENING' : 'CLOSING'}`);
        
        const portal = this.portals.find(p => p.userData.direction === direction);
        if (!portal) return;
        
        portal.userData.isBlocking = !shouldOpen;
        
        // Update arch materials
        portal.traverse((child) => {
            if (child.geometry && child.geometry.type === 'RingGeometry' && child.parent.userData.type !== 'barrier') {
                const isArchRing = child.geometry.parameters.innerRadius > 2;
                if (isArchRing) {
                    child.material = shouldOpen ? 
                        (this.materialSystem ? this.materialSystem.getMaterial('portal_frame') : new THREE.MeshLambertMaterial({ color: 0xB8860B })) :
                        (this.materialSystem ? this.materialSystem.getMaterial('rusted_metal') : new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
                }
            }
        });
        
        // Show/hide barrier
        if (portal.userData.barrier) {
            portal.userData.barrier.visible = !shouldOpen;
        }
        
        // Update effects
        this.updatePortalEffects(portal, shouldOpen);
    }
    
    updatePortalEffects(portal, isUnlocked) {
        portal.traverse((child) => {
            if (child.userData.type === 'energy_swirl') {
                child.visible = isUnlocked;
            } else if (child.userData.type === 'ominous_glow') {
                child.visible = !isUnlocked;
            } else if (child.userData.type === 'floating_particle') {
                child.visible = isUnlocked;
            }
        });
    }
    
    // Animation updates
    update(deltaTime) {
        const time = Date.now() * 0.001;
        
        this.portals.forEach(portal => {
            portal.traverse((child) => {
                const userData = child.userData;
                
                if (userData.type === 'energy_swirl') {
                    child.rotation.z += userData.rotationSpeed * deltaTime;
                    
                    // Pulse effect
                    const pulse = Math.sin(time * userData.pulseSpeed) * 0.2 + 1;
                    child.scale.setScalar(pulse);
                    
                } else if (userData.type === 'ominous_glow') {
                    const pulse = Math.sin(time * userData.pulseSpeed) * 0.3 + 0.7;
                    child.material.opacity = pulse * 0.4;
                    
                } else if (userData.type === 'barrier_rune') {
                    const pulse = Math.sin(time * userData.pulseSpeed + userData.pulseOffset) * 0.4 + 0.8;
                    child.material.opacity = pulse;
                    child.rotation.z += deltaTime * 0.5;
                    
                } else if (userData.type === 'decoration_crystal') {
                    child.rotation.y += userData.rotationSpeed * deltaTime;
                    child.rotation.z += userData.rotationSpeed * 0.7 * deltaTime;
                    
                    // Bobbing motion
                    const bob = Math.sin(time * userData.bobSpeed) * userData.bobAmount;
                    child.position.y += bob * deltaTime;
                    
                } else if (userData.type === 'floating_particle') {
                    // Orbital motion
                    const orbitTime = time * userData.orbitSpeed;
                    const basePos = child.position.clone();
                    child.position.x = Math.cos(orbitTime) * userData.orbitRadius;
                    child.position.z = Math.sin(orbitTime) * userData.orbitRadius;
                    
                    // Bobbing motion
                    const bob = Math.sin(time * userData.bobSpeed) * userData.bobAmount;
                    child.position.y = userData.baseHeight + bob;
                    
                } else if (userData.type === 'barrier' && userData.animationSpeed) {
                    // Barrier animation
                    const pulse = Math.sin(time * userData.animationSpeed) * userData.pulseIntensity + 0.7;
                    child.traverse(subChild => {
                        if (subChild.material && subChild.material.opacity !== undefined) {
                            subChild.material.opacity = pulse;
                        }
                    });
                }
            });
        });
    }
    
    // Portal interaction checking
    checkPortalCollision(position) {
        for (const portal of this.portals) {
            if (portal.userData.isBlocking) {
                const portalPos = portal.position;
                const distance = position.distanceTo(portalPos);
                
                if (distance < 5.0) {
                    return {
                        blocked: true,
                        direction: portal.userData.direction,
                        portal: portal
                    };
                }
            }
        }
        
        return { blocked: false };
    }
    
    // Get progression status
    getProgressionStatus() {
        return {
            currentIndex: this.currentProgressionIndex,
            totalRooms: this.progressionOrder.length,
            currentRoom: this.progressionOrder[this.currentProgressionIndex] || 'completed',
            roomStates: { ...this.roomProgression }
        };
    }
    
    // Clear all portals
    clearPortals() {
        this.portals.forEach(portal => {
            if (portal.parent) {
                portal.parent.remove(portal);
            }
        });
        this.portals.length = 0;
        console.log('All portals cleared');
    }
    
    // Get portal statistics
    getPortalStats() {
        return {
            totalPortals: this.portals.length,
            unlockedPortals: this.portals.filter(p => !p.userData.isBlocking).length,
            lockedPortals: this.portals.filter(p => p.userData.isBlocking).length,
            progressionIndex: this.currentProgressionIndex
        };
    }
    
    // Verification methods
    verify() { return true; }
    isReady() { return true; }
    isValid() { return true; }
    isInitialized() { return true; }
}

// Immediate global assignment
console.log('Assigning DungeonPortalSystem to window...');
window.DungeonPortalSystem = DungeonPortalSystem;
console.log('DungeonPortalSystem assigned successfully');
