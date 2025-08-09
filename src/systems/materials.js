// Materials System - All material definitions and texture management
// Handles all visual styling for different room types and elements

class DungeonMaterialSystem {
    constructor() {
        console.log('Initializing Dungeon Material System...');
        
        this.materials = new Map();
        this.textureLoader = new THREE.TextureLoader();
        
        this.init();
    }
    
    init() {
        this.createBasicMaterials();
        this.createSpecialMaterials();
        console.log(`Material system initialized with ${this.materials.size} materials`);
        return true;
    }
    
    createBasicMaterials() {
        // Arena materials (central combat area)
        this.materials.set('arena_floor', new THREE.MeshLambertMaterial({ 
            color: 0x2C3E50,
            transparent: false
        }));
        
        this.materials.set('arena_wall', new THREE.MeshLambertMaterial({ 
            color: 0x34495E,
            transparent: false
        }));
        
        this.materials.set('arena_ceiling', new THREE.MeshLambertMaterial({ 
            color: 0x1B2631,
            transparent: false
        }));
        
        // Chamber materials (side rooms)
        this.materials.set('chamber_floor', new THREE.MeshLambertMaterial({ 
            color: 0x5D4E37,
            transparent: false
        }));
        
        this.materials.set('chamber_wall', new THREE.MeshLambertMaterial({ 
            color: 0x6B5B73,
            transparent: false
        }));
        
        this.materials.set('chamber_ceiling', new THREE.MeshLambertMaterial({ 
            color: 0x483D54,
            transparent: false
        }));
        
        // Platform materials (special rooms)
        this.materials.set('platform_floor', new THREE.MeshLambertMaterial({ 
            color: 0x1F3A93,
            transparent: false
        }));
        
        this.materials.set('platform_wall', new THREE.MeshLambertMaterial({ 
            color: 0x2E4BC6,
            transparent: false
        }));
        
        this.materials.set('platform_ceiling', new THREE.MeshLambertMaterial({ 
            color: 0x1A237E,
            transparent: false
        }));
        
        // Passage materials (corridors)
        this.materials.set('passage_floor', new THREE.MeshLambertMaterial({ 
            color: 0x566573,
            transparent: false
        }));
        
        this.materials.set('passage_wall', new THREE.MeshLambertMaterial({ 
            color: 0x626567,
            transparent: false
        }));
        
        this.materials.set('passage_ceiling', new THREE.MeshLambertMaterial({ 
            color: 0x455A64,
            transparent: false
        }));
    }
    
    createSpecialMaterials() {
        // Decorative materials
        this.materials.set('broken_stone', new THREE.MeshLambertMaterial({ 
            color: 0x8B7355,
            transparent: false
        }));
        
        this.materials.set('rusted_metal', new THREE.MeshLambertMaterial({ 
            color: 0x8B4513,
            transparent: false
        }));
        
        // Glowing materials
        this.materials.set('ancient_gold', new THREE.MeshLambertMaterial({ 
            color: 0xB8860B,
            emissive: 0xB8860B,
            emissiveIntensity: 0.2,
            transparent: false
        }));
        
        this.materials.set('crystal_formation', new THREE.MeshLambertMaterial({ 
            color: 0x4169E1,
            emissive: 0x4169E1,
            emissiveIntensity: 0.3,
            transparent: false
        }));
        
        // Portal materials
        this.materials.set('portal_active', new THREE.MeshLambertMaterial({ 
            color: 0x00FF00,
            emissive: 0x00FF00,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.8
        }));
        
        this.materials.set('portal_locked', new THREE.MeshLambertMaterial({ 
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6
        }));
        
        this.materials.set('portal_frame', new THREE.MeshLambertMaterial({ 
            color: 0xB8860B,
            emissive: 0xB8860B,
            emissiveIntensity: 0.1,
            transparent: false
        }));
        
        // Barrier materials
        this.materials.set('magic_barrier', new THREE.MeshBasicMaterial({
            color: 0x8B0000,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        }));
        
        this.materials.set('energy_field', new THREE.MeshBasicMaterial({
            color: 0x4169E1,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        }));
        
        // Enhanced gothic materials
        this.materials.set('gothic_stone_dark', new THREE.MeshLambertMaterial({ 
            color: 0x2F2F2F,
            transparent: false
        }));
        
        this.materials.set('gothic_stone_light', new THREE.MeshLambertMaterial({ 
            color: 0x4A4A4A,
            transparent: false
        }));
        
        this.materials.set('weathered_bronze', new THREE.MeshLambertMaterial({ 
            color: 0x8C7853,
            emissive: 0x8C7853,
            emissiveIntensity: 0.1,
            transparent: false
        }));
        
        this.materials.set('mystical_purple', new THREE.MeshLambertMaterial({ 
            color: 0x6A0DAD,
            emissive: 0x6A0DAD,
            emissiveIntensity: 0.2,
            transparent: false
        }));
        
        // Floor variation materials
        this.materials.set('cracked_stone', new THREE.MeshLambertMaterial({ 
            color: 0x696969,
            transparent: false
        }));
        
        this.materials.set('mossy_stone', new THREE.MeshLambertMaterial({ 
            color: 0x556B2F,
            transparent: false
        }));
        
        this.materials.set('polished_marble', new THREE.MeshLambertMaterial({ 
            color: 0xF5F5DC,
            transparent: false
        }));
    }
    
    // Get a specific material by name
    getMaterial(name) {
        const material = this.materials.get(name);
        if (!material) {
            console.warn(`Material '${name}' not found, returning fallback`);
            return new THREE.MeshLambertMaterial({ color: 0x808080 });
        }
        return material;
    }
    
    // Get material set for a room type
    getMaterialsForRoomType(roomType) {
        switch(roomType) {
            case 'center':
                return {
                    floor: this.getMaterial('arena_floor'),
                    wall: this.getMaterial('arena_wall'),
                    ceiling: this.getMaterial('arena_ceiling')
                };
            case 'orbital':
                return {
                    floor: this.getMaterial('chamber_floor'),
                    wall: this.getMaterial('chamber_wall'),
                    ceiling: this.getMaterial('chamber_ceiling')
                };
            case 'cardinal':
                return {
                    floor: this.getMaterial('platform_floor'),
                    wall: this.getMaterial('platform_wall'),
                    ceiling: this.getMaterial('platform_ceiling')
                };
            default: // passage
                return {
                    floor: this.getMaterial('passage_floor'),
                    wall: this.getMaterial('passage_wall'),
                    ceiling: this.getMaterial('passage_ceiling')
                };
        }
    }
    
    // Get themed material sets for different floor depths
    getThemedMaterials(floorNumber) {
        const depth = Math.floor(floorNumber / 5); // Change theme every 5 floors
        
        switch(depth % 4) {
            case 0: // Stone ruins (floors 1-5, 21-25, etc.)
                return {
                    primary: this.getMaterial('gothic_stone_light'),
                    secondary: this.getMaterial('gothic_stone_dark'),
                    accent: this.getMaterial('weathered_bronze')
                };
            case 1: // Deep chambers (floors 6-10, 26-30, etc.)
                return {
                    primary: this.getMaterial('cracked_stone'),
                    secondary: this.getMaterial('mossy_stone'),
                    accent: this.getMaterial('ancient_gold')
                };
            case 2: // Mystical depths (floors 11-15, 31-35, etc.)
                return {
                    primary: this.getMaterial('mystical_purple'),
                    secondary: this.getMaterial('gothic_stone_dark'),
                    accent: this.getMaterial('crystal_formation')
                };
            case 3: // Sacred halls (floors 16-20, 36-40, etc.)
                return {
                    primary: this.getMaterial('polished_marble'),
                    secondary: this.getMaterial('gothic_stone_light'),
                    accent: this.getMaterial('ancient_gold')
                };
            default:
                return this.getThemedMaterials(1); // Fallback to first theme
        }
    }
    
    // Create custom material variations
    createVariationMaterial(baseMaterial, colorShift = 0x000000, emissiveShift = 0x000000, intensityMultiplier = 1.0) {
        const material = baseMaterial.clone();
        
        if (colorShift !== 0x000000) {
            const color = new THREE.Color(material.color);
            const shift = new THREE.Color(colorShift);
            color.add(shift);
            material.color = color;
        }
        
        if (material.emissive && emissiveShift !== 0x000000) {
            const emissive = new THREE.Color(material.emissive);
            const shift = new THREE.Color(emissiveShift);
            emissive.add(shift);
            material.emissive = emissive;
        }
        
        if (material.emissiveIntensity !== undefined) {
            material.emissiveIntensity *= intensityMultiplier;
        }
        
        return material;
    }
    
    // Get materials for specific architectural elements
    getArchitecturalMaterials() {
        return {
            pillar: this.getMaterial('gothic_stone_light'),
            arch: this.getMaterial('weathered_bronze'),
            decoration: this.getMaterial('ancient_gold'),
            ruin: this.getMaterial('broken_stone'),
            mystical: this.getMaterial('crystal_formation')
        };
    }
    
    // Get materials for interactive elements
    getInteractiveMaterials() {
        return {
            orb: this.getMaterial('crystal_formation'),
            basin: this.getMaterial('ancient_gold'),
            switch: this.getMaterial('weathered_bronze'),
            chest: this.getMaterial('rusted_metal'),
            door: this.getMaterial('gothic_stone_dark')
        };
    }
    
    // Update materials (for animated effects)
    update(deltaTime) {
        const time = Date.now() * 0.001;
        
        // Animate crystal formations
        const crystal = this.materials.get('crystal_formation');
        if (crystal && crystal.emissiveIntensity !== undefined) {
            crystal.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.1;
        }
        
        // Animate ancient gold
        const gold = this.materials.get('ancient_gold');
        if (gold && gold.emissiveIntensity !== undefined) {
            gold.emissiveIntensity = 0.2 + Math.sin(time * 1.5) * 0.05;
        }
        
        // Animate portal materials
        const portalActive = this.materials.get('portal_active');
        if (portalActive && portalActive.emissiveIntensity !== undefined) {
            portalActive.emissiveIntensity = 0.4 + Math.sin(time * 3) * 0.1;
        }
        
        const portalLocked = this.materials.get('portal_locked');
        if (portalLocked && portalLocked.emissiveIntensity !== undefined) {
            portalLocked.emissiveIntensity = 0.3 + Math.sin(time * 4) * 0.1;
        }
    }
    
    // Clean up materials (dispose of textures, etc.)
    dispose() {
        this.materials.forEach((material, name) => {
            if (material.map) material.map.dispose();
            if (material.normalMap) material.normalMap.dispose();
            if (material.roughnessMap) material.roughnessMap.dispose();
            if (material.metalnessMap) material.metalnessMap.dispose();
            material.dispose();
        });
        this.materials.clear();
        console.log('Material system disposed');
    }
    
    // Get all available material names (for debugging)
    getMaterialNames() {
        return Array.from(this.materials.keys());
    }
    
    // Verification methods
    verify() { return this.materials.size > 0; }
    isReady() { return this.materials.size > 0; }
    isValid() { return this.materials.size > 0; }
    isInitialized() { return this.materials.size > 0; }
}

// Immediate global assignment
console.log('Assigning DungeonMaterialSystem to window...');
window.DungeonMaterialSystem = DungeonMaterialSystem;
console.log('DungeonMaterialSystem assigned successfully');
