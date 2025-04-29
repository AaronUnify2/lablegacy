// src/entities/enemies/enemyRegistry.js - Central registry for all enemy types
import { EnemyType } from './enemyBase.js';

// Enemy registry to manage all enemy types
export class EnemyRegistryClass {
    constructor() {
        this.enemies = {}; // Map of enemy ID to factory function
        this.enemyData = {}; // Map of enemy ID to metadata
    }
    
    // Register a new enemy type
    registerEnemy(id, factoryFunction, metadata = {}) {
        this.enemies[id] = factoryFunction;
        this.enemyData[id] = {
            id,
            name: metadata.name || id,
            type: metadata.type || EnemyType.MOB,
            minFloor: metadata.minFloor || 1,
            maxFloor: metadata.maxFloor || Number.MAX_SAFE_INTEGER,
            rarity: metadata.rarity || 1.0, // 0.0 to 1.0, higher is more common
            description: metadata.description || "",
            ...metadata
        };
        
        console.log(`Registered enemy type: ${id} (${this.enemyData[id].name})`);
        return this;
    }
    
    // Create a new enemy instance
    createEnemy(id, options = {}) {
        if (!this.enemies[id]) {
            console.error(`Enemy type not found: ${id}`);
            return null;
        }
        
        try {
            // Get the factory function and create the enemy
            const factory = this.enemies[id];
            return factory(options);
        } catch (error) {
            console.error(`Error creating enemy ${id}:`, error);
            return null;
        }
    }
    
    // Get enemy metadata
    getEnemyData(id) {
        return this.enemyData[id];
    }
    
    // Get all registered enemy types
    getAllEnemies() {
        return Object.values(this.enemyData);
    }
    
    // Get enemies by type
    getEnemiesByType(type, floorNumber = 1) {
        return Object.values(this.enemyData).filter(data => 
            data.type === type &&
            floorNumber >= data.minFloor &&
            floorNumber <= data.maxFloor
        );
    }
    
    // Get enemies by floor number
    getEnemiesByFloor(floorNumber) {
        return Object.values(this.enemyData).filter(data => 
            floorNumber >= data.minFloor &&
            floorNumber <= data.maxFloor
        );
    }
    
    // Get list of all enemy IDs
    getEnemyIds() {
        return Object.keys(this.enemies);
    }
    
    // Check if an enemy type exists
    hasEnemy(id) {
        return !!this.enemies[id];
    }
    
    // Remove an enemy type
    unregisterEnemy(id) {
        if (this.enemies[id]) {
            delete this.enemies[id];
            delete this.enemyData[id];
            console.log(`Unregistered enemy type: ${id}`);
            return true;
        }
        return false;
    }
    
    // Pick a random enemy based on type and floor
    pickRandomEnemy(type, floorNumber) {
        const eligibleEnemies = this.getEnemiesByType(type, floorNumber);
        
        if (eligibleEnemies.length === 0) {
            console.warn(`No eligible enemies found for type ${type} on floor ${floorNumber}`);
            return null;
        }
        
        // Calculate total rarity weight
        const totalWeight = eligibleEnemies.reduce((sum, enemy) => sum + enemy.rarity, 0);
        
        // Pick a random enemy based on rarity weight
        let randomValue = Math.random() * totalWeight;
        let cumulativeWeight = 0;
        
        for (const enemy of eligibleEnemies) {
            cumulativeWeight += enemy.rarity;
            if (randomValue <= cumulativeWeight) {
                return enemy.id;
            }
        }
        
        // Fallback to first enemy (should never happen)
        return eligibleEnemies[0].id;
    }
}

// Create singleton instance
export const EnemyRegistry = new EnemyRegistryClass();

// Register standard enemy types
// These will be imported from their respective files in the variants directory
import { createSlimeEnemy } from './variants/slime.js';

// Register initial enemies
export function registerInitialEnemies() {
    // Register slime enemy (we'll implement it)
    EnemyRegistry.registerEnemy('slime', createSlimeEnemy, {
        name: 'Slime',
        type: EnemyType.MOB,
        minFloor: 1,
        maxFloor: 5,
        rarity: 1.0,
        description: 'A basic slime monster that hops toward its prey.'
    });
    
    // Future enemies would be registered here by importing from their files

// Register golem enemy
EnemyRegistry.registerEnemy('golem', createGolemEnemy, {
    name: 'Stone Golem',
    type: EnemyType.MINI_BOSS,
    minFloor: 3,
    maxFloor: 10,
    rarity: 0.6,
    description: 'A powerful stone construct that can cause earthquakes.'
});
    
    console.log(`Registered ${EnemyRegistry.getEnemyIds().length} enemy types`);
}

// Call this when the game starts
registerInitialEnemies();
