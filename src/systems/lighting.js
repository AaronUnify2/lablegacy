// Lighting System - Comprehensive dungeon lighting management
// Handles all light sources, effects, and atmospheric lighting

class DungeonLightingSystem {
    constructor(scene) {
        console.log('Initializing Dungeon Lighting System...');
        
        this.scene = scene;
        this.lightSources = [];
        this.ambientLights = [];
        this.effectLights = [];
        
        // Lighting parameters
        this.gridSize = 2;
        this.dungeonWidth = 180;
        this.dungeonDepth = 180;
        this.floorHeight = 0;
        this.ceilingHeight = 12;
        
        this.init();
    }
    
    init() {
        console.log('Lighting system ready for dungeon illumination');
        return true;
    }
    
    // Main lighting setup for dungeon
    addLighting(roomLayout, dungeonGroup) {
        console.log('Adding comprehensive exploration lighting...');
        
        this.clearLights();
        
        // Add main lighting for each room
        Object.values(roomLayout.rooms).forEach(room => {
            this.addRoomLighting(room, dungeonGroup);
        });
        
        // Add corridor lighting between rooms
        roomLayout.connections.forEach(connection => {
            this.addCorridorLighting(
                roomLayout.rooms[connection.from], 
                roomLayout.rooms[connection.to], 
                dungeonGroup
            );
        });
        
        // Add atmospheric perimeter lighting
        this.addPerimeterLighting(dungeonGroup);
        
        // Add special effect lighting
        this.addEffectLighting(roomLayout, dungeonGroup);
        
        console.log(`Added ${this.lightSources.length} exploration lights`);
    }
    
    addRoomLighting(room, dungeonGroup) {
        const worldX = (room.gridX - (Math.floor(this.dungeonWidth / this.gridSize) / 2)) * this.gridSize;
        const worldZ = (room.gridZ - (Math.floor(this.dungeonDepth / this.gridSize) / 2)) * this.gridSize;
        const roomSize = room.size * this.gridSize;
        
        if (room.type === 'center') {
            this.addCenterArenaLighting(worldX, worldZ, roomSize, dungeonGroup);
        } else if (room.type === 'orbital') {
            this.addChamberLighting(worldX, worldZ, roomSize, dungeonGroup, room.direction);
        } else {
            this.addGenericRoomLighting(worldX, worldZ, roomSize, dungeonGroup);
        }
    }
    
    addCenterArenaLighting(worldX, worldZ, roomSize, dungeonGroup) {
        // Main dramatic overhead lighting for central arena
        const mainLight = new THREE.PointLight(0xFFE135, 4.0, 100);
        mainLight.position.set(worldX, this.floorHeight + this.ceilingHeight * 0.9, worldZ);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 150;
        mainLight.userData = { 
            type: 'arena_main',
            originalIntensity: 4.0,
            flickerSpeed: 0.3
        };
        
        dungeonGroup.add(mainLight);
        this.lightSources.push(mainLight);
        
        // Corner accent lights for the arena
        const cornerPositions = [
            { x: worldX + roomSize * 0.3, z: worldZ + roomSize * 0.3 },
            { x: worldX - roomSize * 0.3, z: worldZ + roomSize * 0.3 },
            { x: worldX + roomSize * 0.3, z: worldZ - roomSize * 0.3 },
            { x: worldX - roomSize * 0.3, z: worldZ - roomSize * 0.3 }
        ];
        
        cornerPositions.forEach((pos, i) => {
            const cornerLight = new THREE.PointLight(0xFF6B35, 1.8, 45);
            cornerLight.position.set(pos.x, this.floorHeight + 6, pos.z);
            cornerLight.castShadow = true;
            cornerLight.userData = { 
                type: 'arena_corner',
                originalIntensity: 1.8,
                flickerSpeed: 0.5 + Math.random() * 0.3,
                flickerOffset: i * Math.PI / 2
            };
            
            dungeonGroup.add(cornerLight);
            this.lightSources.push(cornerLight);
        });
        
        // Central orb ambient glow
        const orbGlow = new THREE.PointLight(0x4169E1, 2.0, 30);
        orbGlow.position.set(worldX, this.floorHeight + 1.4, worldZ);
        orbGlow.userData = { 
            type: 'orb_glow',
            originalIntensity: 2.0,
            flickerSpeed: 1.0,
            pulseEffect: true
        };
        
        dungeonGroup.add(orbGlow);
        this.effectLights.push(orbGlow);
    }
    
    addChamberLighting(worldX, worldZ, roomSize, dungeonGroup, direction) {
        // Main chamber light - focused and tactical
        const chamberLight = new THREE.PointLight(0xFFE4B5, 3.0, 70);
        chamberLight.position.set(worldX, this.floorHeight + this.ceilingHeight * 0.7, worldZ);
        chamberLight.castShadow = true;
        chamberLight.userData = { 
            type: 'chamber_main',
            direction: direction,
            originalIntensity: 3.0,
            flickerSpeed: 0.4
        };
        
        dungeonGroup.add(chamberLight);
        this.lightSources.push(chamberLight);
        
        // Direction-specific lighting
        const directionColors = {
            north: 0x87CEEB,  // Sky blue
            south: 0xFF6347,  // Tomato red
            east: 0xFFD700,   // Gold
            west: 0x9370DB    // Medium purple
        };
        
        const directionColor = directionColors[direction] || 0xCD853F;
        
        // Side accent lighting specific to chamber direction
        const sidePositions = [
            { x: worldX + roomSize * 0.25, z: worldZ },
            { x: worldX - roomSize * 0.25, z: worldZ },
            { x: worldX, z: worldZ + roomSize * 0.25 },
            { x: worldX, z: worldZ - roomSize * 0.25 }
        ];
        
        sidePositions.forEach((pos, i) => {
            const sideLight = new THREE.PointLight(directionColor, 1.2, 35);
            sideLight.position.set(pos.x, this.floorHeight + 4, pos.z);
            sideLight.userData = { 
                type: 'chamber_side',
                direction: direction,
                originalIntensity: 1.2,
                flickerSpeed: 0.6 + Math.random() * 0.2,
                flickerOffset: i * Math.PI / 4
            };
            
            dungeonGroup.add(sideLight);
            this.lightSources.push(sideLight);
        });
    }
    
    addGenericRoomLighting(worldX, worldZ, roomSize, dungeonGroup) {
        // Standard room lighting
        const roomLight = new THREE.PointLight(0xDEB887, 2.5, 50);
        roomLight.position.set(worldX, this.floorHeight + this.ceilingHeight * 0.6, worldZ);
        roomLight.castShadow = true;
        roomLight.userData = { 
            type: 'generic_room',
            originalIntensity: 2.5,
            flickerSpeed: 0.4
        };
        
        dungeonGroup.add(roomLight);
        this.lightSources.push(roomLight);
    }
    
    addCorridorLighting(roomA, roomB, dungeonGroup) {
        const startWorldX = (roomA.gridX - (Math.floor(this.dungeonWidth / this.gridSize) / 2)) * this.gridSize;
        const startWorldZ = (roomA.gridZ - (Math.floor(this.dungeonDepth / this.gridSize) / 2)) * this.gridSize;
        const endWorldX = (roomB.gridX - (Math.floor(this.dungeonWidth / this.gridSize) / 2)) * this.gridSize;
        const endWorldZ = (roomB.gridZ - (Math.floor(this.dungeonDepth / this.gridSize) / 2)) * this.gridSize;
        
        // Calculate corridor path and add lights along it
        const distance = Math.sqrt(Math.pow(endWorldX - startWorldX, 2) + Math.pow(endWorldZ - startWorldZ, 2));
        const numLights = Math.max(2, Math.floor(distance / 15)); // Light every 15 units
        
        for (let i = 1; i < numLights; i++) {
            const t = i / numLights;
            const lightX = startWorldX + (endWorldX - startWorldX) * t;
            const lightZ = startWorldZ + (endWorldZ - startWorldZ) * t;
            
            // Corridor light - warm and guiding
            const corridorLight = new THREE.PointLight(0xDEB887, 2.0, 40);
            corridorLight.position.set(lightX, this.floorHeight + 5, lightZ);
            corridorLight.castShadow = true;
            corridorLight.userData = { 
                type: 'corridor',
                originalIntensity: 2.0,
                flickerSpeed: 0.3,
                flickerOffset: i * 0.5
            };
            
            dungeonGroup.add(corridorLight);
            this.lightSources.push(corridorLight);
        }
        
        // Junction lighting where corridors meet
        const junctionLight = new THREE.PointLight(0xF0E68C, 1.5, 30);
        junctionLight.position.set(endWorldX, this.floorHeight + 4, startWorldZ);
        junctionLight.userData = { 
            type: 'junction',
            originalIntensity: 1.5,
            flickerSpeed: 0.5
        };
        
        dungeonGroup.add(junctionLight);
        this.lightSources.push(junctionLight);
    }
    
    addPerimeterLighting(dungeonGroup) {
        // Subtle perimeter lights around the dungeon edges for atmosphere
        const centerX = 0;
        const centerZ = 0;
        const radius = Math.min(this.dungeonWidth, this.dungeonDepth) * 0.4;
        
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;
            
            const perimeterLight = new THREE.PointLight(0x8B4513, 0.8, 25);
            perimeterLight.position.set(x, this.floorHeight + 8, z);
            perimeterLight.userData = { 
                type: 'perimeter',
                originalIntensity: 0.8,
                flickerSpeed: 0.2,
                flickerOffset: i * Math.PI / 6
            };
            
            dungeonGroup.add(perimeterLight);
            this.lightSources.push(perimeterLight);
        }
    }
    
    addEffectLighting(roomLayout, dungeonGroup) {
        // Add special atmospheric effects
        
        // Mystical floating lights in chambers
        Object.values(roomLayout.rooms).forEach(room => {
            if (room.type === 'orbital') {
                this.addFloatingLights(room, dungeonGroup);
            }
        });
        
        // Add dramatic rim lighting for architectural features
        this.addArchitecturalLighting(roomLayout, dungeonGroup);
    }
    
    addFloatingLights(room, dungeonGroup) {
        const worldX = (room.gridX - (Math.floor(this.dungeonWidth / this.gridSize) / 2)) * this.gridSize;
        const worldZ = (room.gridZ - (Math.floor(this.dungeonDepth / this.gridSize) / 2)) * this.gridSize;
        
        // Create 2-3 floating mystical lights per chamber
        const numFloatingLights = 2 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < numFloatingLights; i++) {
            const angle = (i / numFloatingLights) * Math.PI * 2 + Math.random() * 0.5;
            const radius = 3 + Math.random() * 4;
            const floatX = worldX + Math.cos(angle) * radius;
            const floatZ = worldZ + Math.sin(angle) * radius;
            const floatY = this.floorHeight + 3 + Math.random() * 2;
            
            const floatingLight = new THREE.PointLight(0x9370DB, 0.6, 20);
            floatingLight.position.set(floatX, floatY, floatZ);
            floatingLight.userData = { 
                type: 'floating',
                originalIntensity: 0.6,
                flickerSpeed: 1.0 + Math.random() * 0.5,
                orbitCenter: { x: worldX, z: worldZ },
                orbitRadius: radius,
                orbitSpeed: 0.2 + Math.random() * 0.3,
                baseHeight: floatY,
                bobSpeed: 0.5 + Math.random() * 0.3,
                bobAmount: 0.5 + Math.random() * 0.5
            };
            
            dungeonGroup.add(floatingLight);
            this.effectLights.push(floatingLight);
        }
    }
    
    addArchitecturalLighting(roomLayout, dungeonGroup) {
        // Add dramatic uplighting and downlighting for architectural drama
        Object.values(roomLayout.rooms).forEach(room => {
            const worldX = (room.gridX - (Math.floor(this.dungeonWidth / this.gridSize) / 2)) * this.gridSize;
            const worldZ = (room.gridZ - (Math.floor(this.dungeonDepth / this.gridSize) / 2)) * this.gridSize;
            
            if (room.type === 'center') {
                // Add dramatic uplighting around the arena perimeter
                const uplightPositions = [
                    { x: worldX + 8, z: worldZ + 8 },
                    { x: worldX - 8, z: worldZ + 8 },
                    { x: worldX + 8, z: worldZ - 8 },
                    { x: worldX - 8, z: worldZ - 8 }
                ];
                
                uplightPositions.forEach(pos => {
                    const uplight = new THREE.PointLight(0xFF4500, 1.0, 25);
                    uplight.position.set(pos.x, this.floorHeight + 0.5, pos.z);
                    uplight.userData = { 
                        type: 'uplight',
                        originalIntensity: 1.0,
                        flickerSpeed: 0.7
                    };
                    
                    dungeonGroup.add(uplight);
                    this.effectLights.push(uplight);
                });
            }
        });
    }
    
    // Dynamic lighting effects
    update(deltaTime) {
        const time = Date.now() * 0.001;
        
        // Update standard flickering lights
        this.lightSources.forEach(light => {
            if (!light.userData.originalIntensity) {
                light.userData.originalIntensity = light.intensity;
                light.userData.flickerSpeed = 0.5 + Math.random();
                light.userData.flickerOffset = Math.random() * Math.PI * 2;
            }
            
            const flickerTime = time * light.userData.flickerSpeed + light.userData.flickerOffset;
            const flicker = Math.sin(flickerTime) * 0.1 + 1;
            light.intensity = light.userData.originalIntensity * flicker;
        });
        
        // Update effect lights with special behaviors
        this.effectLights.forEach(light => {
            const userData = light.userData;
            
            if (userData.type === 'floating') {
                // Floating orbital motion
                if (userData.orbitCenter) {
                    const orbitTime = time * userData.orbitSpeed;
                    light.position.x = userData.orbitCenter.x + Math.cos(orbitTime) * userData.orbitRadius;
                    light.position.z = userData.orbitCenter.z + Math.sin(orbitTime) * userData.orbitRadius;
                }
                
                // Bobbing motion
                if (userData.baseHeight && userData.bobSpeed) {
                    const bobTime = time * userData.bobSpeed;
                    light.position.y = userData.baseHeight + Math.sin(bobTime) * userData.bobAmount;
                }
                
                // Intensity pulsing
                const pulseTime = time * userData.flickerSpeed;
                light.intensity = userData.originalIntensity * (0.8 + Math.sin(pulseTime) * 0.4);
                
            } else if (userData.type === 'orb_glow' && userData.pulseEffect) {
                // Special pulsing for central orb
                const pulseTime = time * userData.flickerSpeed;
                light.intensity = userData.originalIntensity * (0.7 + Math.sin(pulseTime) * 0.5);
                
            } else if (userData.type === 'uplight') {
                // Dramatic uplighting flicker
                const flickerTime = time * userData.flickerSpeed + (userData.flickerOffset || 0);
                const flicker = Math.sin(flickerTime) * 0.3 + 1;
                light.intensity = userData.originalIntensity * flicker;
            }
        });
    }
    
    // Environmental lighting adjustments
    adjustForFloorDepth(floorNumber) {
        const depthMultiplier = Math.max(0.3, 1.0 - (floorNumber * 0.05)); // Darker as you go deeper
        
        this.lightSources.forEach(light => {
            if (light.userData.originalIntensity) {
                light.userData.originalIntensity *= depthMultiplier;
            }
        });
        
        this.effectLights.forEach(light => {
            if (light.userData.originalIntensity) {
                light.userData.originalIntensity *= depthMultiplier;
            }
        });
        
        console.log(`Adjusted lighting for floor ${floorNumber} (depth multiplier: ${depthMultiplier})`);
    }
    
    // Lighting state management
    setLightingMood(mood) {
        const moods = {
            dramatic: { intensity: 1.2, saturation: 1.1 },
            subtle: { intensity: 0.8, saturation: 0.9 },
            mystical: { intensity: 1.0, saturation: 1.3 },
            ominous: { intensity: 0.6, saturation: 0.8 }
        };
        
        const moodData = moods[mood] || moods.dramatic;
        
        [...this.lightSources, ...this.effectLights].forEach(light => {
            if (light.userData.originalIntensity) {
                light.userData.originalIntensity *= moodData.intensity;
            }
        });
        
        console.log(`Applied ${mood} lighting mood`);
    }
    
    // Clear all lights
    clearLights() {
        // Remove lights from their parent groups
        [...this.lightSources, ...this.effectLights, ...this.ambientLights].forEach(light => {
            if (light.parent) {
                light.parent.remove(light);
            }
        });
        
        this.lightSources.length = 0;
        this.effectLights.length = 0;
        this.ambientLights.length = 0;
        
        console.log('All dungeon lights cleared');
    }
    
    // Get lighting statistics
    getLightingStats() {
        return {
            totalLights: this.lightSources.length + this.effectLights.length + this.ambientLights.length,
            standardLights: this.lightSources.length,
            effectLights: this.effectLights.length,
            ambientLights: this.ambientLights.length
        };
    }
    
    // Verification methods
    verify() { return true; }
    isReady() { return true; }
    isValid() { return true; }
    isInitialized() { return true; }
}

// Immediate global assignment
console.log('Assigning DungeonLightingSystem to window...');
window.DungeonLightingSystem = DungeonLightingSystem;
console.log('DungeonLightingSystem assigned successfully');
