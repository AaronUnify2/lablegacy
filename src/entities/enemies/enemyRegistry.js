// src/entities/enemies/enemyRegistry.js - Central registry for all enemy types

// This file will import all enemy variants once they're created
// For now we'll set up the structure with placeholder imports
// that will be replaced when the variant files are created

// Import enemy variants (will be uncommented when variants are created)
// import { Sphere } from './variants/Sphere.js';
// import { Cube } from './variants/Cube.js';
// import { Cylinder } from './variants/Cylinder.js';

// Enemy registry class
export class EnemyRegistry {
    constructor() {
        // Registry of all available enemy types
        this.enemyTypes = new Map();
        
        // Registration will happen when variants are created
        this.initRegistry();
    }
    
    // Initialize registry with all enemy types
    initRegistry() {
        // When variant files are created, we'll uncomment these registrations
        
        // PLACEHOLDER: Register sphere enemy
        // this.register('sphere', Sphere);
        
        // PLACEHOLDER: Register cube enemy
        // this.register('cube', Cube);
        
        // PLACEHOLDER: Register cylinder enemy (mini-boss)
        // this.register('cylinder', Cylinder);
        
        // For now, add a basic placeholder enemy to test with
        this.register('placeholder', {
            create: (x, y, z, params) => {
                // Import dynamically to avoid circular dependencies
                const { EnemyBase } = require('./enemyBase.js');
                
                // Create a basic red cube enemy
                return new EnemyBase({
                    id: 'placeholder',
                    name: 'Test Enemy',
                    x: x,
                    y: y,
                    z: z,
                    maxHealth: 50,
                    baseDamage: 10,
                    color: 0xff0000,
                    attackType: 'melee',
                    ...params
                });
            },
            // Define spawn rules for this enemy
            spawnRules: {
                // Which floor numbers this enemy can appear on
                floors: [1, 2, 3, 4, 5],
                // Which room types this enemy can spawn in
                roomTypes: ['radial', 'cardinal', 'corridor'],
                // Spawn weight (higher = more common)
                weight: 1
            }
        });
        
        console.log('Enemy registry initialized with placeholder enemy');
    }
    
    // Register a new enemy type
    register(id, enemyClass) {
        this.enemyTypes.set(id, {
            id: id,
            constructor: enemyClass,
            spawnRules: enemyClass.spawnRules || {
                floors: [1], // Default to only floor 1
                roomTypes: ['radial'], // Default to only radial rooms
                weight: 1 // Default weight
            }
        });
    }
    
    // Get enemy data by ID
    getEnemyData(id) {
        return this.enemyTypes.get(id);
    }
    
    // Create a new enemy instance
    createEnemy(id, x, y, z, params = {}) {
        const enemyData = this.getEnemyData(id);
        
        if (!enemyData) {
            console.error(`Enemy type '${id}' not found in registry`);
            return null;
        }
        
        // Create the enemy
        return enemyData.constructor.create(x, y, z, params);
    }
    
    // Get appropriate enemy types for a specific floor and room type
    getEnemiesForSpawn(floorNumber, roomType) {
        const validEnemies = [];
        
        this.enemyTypes.forEach(enemyData => {
            const rules = enemyData.spawnRules;
            
            // Check if this enemy can spawn on this floor
            const validFloor = rules.floors.includes(floorNumber) || 
                               (rules.minFloor !== undefined && 
                                rules.maxFloor !== undefined && 
                                floorNumber >= rules.minFloor && 
                                floorNumber <= rules.maxFloor);
            
            // Check if this enemy can spawn in this room type
            const validRoom = rules.roomTypes.includes(roomType);
            
            if (validFloor && validRoom) {
                // Add enemy ID to list with its weight determining how many times it's added
                for (let i = 0; i < rules.weight; i++) {
                    validEnemies.push(enemyData.id);
                }
            }
        });
        
        return validEnemies;
    }
    
    // Get all enemies that can appear on a specific floor
    getEnemiesForFloor(floorNumber) {
        const validEnemies = [];
        
        this.enemyTypes.forEach(enemyData => {
            const rules = enemyData.spawnRules;
            
            // Check if this enemy can spawn on this floor
            const validFloor = rules.floors.includes(floorNumber) || 
                               (rules.minFloor !== undefined && 
                                rules.maxFloor !== undefined && 
                                floorNumber >= rules.minFloor && 
                                floorNumber <= rules.maxFloor);
            
            if (validFloor) {
                validEnemies.push(enemyData.id);
            }
        });
        
        return validEnemies.length > 0 ? validEnemies : ['placeholder'];
    }
    
    // Get all registered enemy IDs
    getAllEnemyIds() {
        return Array.from(this.enemyTypes.keys());
    }
}

// Create and export a singleton instance
export const enemyRegistry = new EnemyRegistry();
