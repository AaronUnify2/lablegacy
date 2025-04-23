// src/entities/items/loot.js - Loot generation system

import { ItemDatabase } from './inventory.js';

// Define chest tiers
export const ChestTier = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic'
};

// Define loot tables for each chest tier
const lootTables = {
    common: [
        { itemId: 'smallHealthPotion', weight: 60, countRange: [1, 2] },
        { itemId: 'smallStaminaPotion', weight: 40, countRange: [1, 1] }
    ],
    uncommon: [
        { itemId: 'smallHealthPotion', weight: 40, countRange: [1, 3] },
        { itemId: 'mediumHealthPotion', weight: 20, countRange: [1, 1] },
        { itemId: 'smallStaminaPotion', weight: 30, countRange: [1, 2] },
        { itemId: 'largeStaminaPotion', weight: 10, countRange: [1, 1] }
    ],
    rare: [
        { itemId: 'mediumHealthPotion', weight: 35, countRange: [1, 2] },
        { itemId: 'largeHealthPotion', weight: 15, countRange: [1, 1] },
        { itemId: 'largeStaminaPotion', weight: 30, countRange: [1, 1] },
        { itemId: 'blueCrystal', weight: 10, countRange: [1, 1] },
        { itemId: 'redCrystal', weight: 10, countRange: [1, 1] }
    ],
    epic: [
        { itemId: 'largeHealthPotion', weight: 30, countRange: [1, 2] },
        { itemId: 'largeStaminaPotion', weight: 25, countRange: [1, 2] },
        { itemId: 'blueCrystal', weight: 20, countRange: [1, 1] },
        { itemId: 'redCrystal', weight: 20, countRange: [1, 1] }
    ]
};

// Generate loot based on tier
export function generateLoot(tier = ChestTier.COMMON, itemCount = 1) {
    const tierTable = lootTables[tier.toLowerCase()] || lootTables.common;
    const loot = [];
    const itemsToGenerate = Math.min(itemCount, 4); // Limit to 4 items per chest
    
    // Calculate total weight for this tier
    const totalWeight = tierTable.reduce((sum, item) => sum + item.weight, 0);
    
    // Generate items based on weighted random selection
    for (let i = 0; i < itemsToGenerate; i++) {
        // Get random value based on weights
        const roll = Math.random() * totalWeight;
        let weightSum = 0;
        
        // Find which item was rolled
        for (const lootItem of tierTable) {
            weightSum += lootItem.weight;
            
            if (roll <= weightSum) {
                // Found our item, determine count based on range
                const countRange = lootItem.countRange || [1, 1];
                const count = Math.floor(Math.random() * (countRange[1] - countRange[0] + 1)) + countRange[0];
                
                // Create item entry
                const item = {
                    id: lootItem.itemId,
                    count: count
                };
                
                // Check if item already exists in loot and increase count instead if stackable
                const existingItem = loot.find(i => i.id === item.id);
                if (existingItem && ItemDatabase[item.id].stackable) {
                    existingItem.count += item.count;
                } else {
                    loot.push(item);
                }
                
                break;
            }
        }
    }
    
    return loot;
}

// Function to determine chest tier based on floor number
export function determineChestTier(floorNumber) {
    const roll = Math.random() * 100;
    
    if (floorNumber <= 3) {
        // Early floors: 70% common, 25% uncommon, 5% rare
        if (roll < 70) return ChestTier.COMMON;
        if (roll < 95) return ChestTier.UNCOMMON;
        return ChestTier.RARE;
    } else if (floorNumber <= 7) {
        // Mid floors: 40% common, 45% uncommon, 15% rare
        if (roll < 40) return ChestTier.COMMON;
        if (roll < 85) return ChestTier.UNCOMMON;
        return ChestTier.RARE;
    } else if (floorNumber <= 10) {
        // Late floors: 15% common, 45% uncommon, 35% rare, 5% epic
        if (roll < 15) return ChestTier.COMMON;
        if (roll < 60) return ChestTier.UNCOMMON;
        if (roll < 95) return ChestTier.RARE;
        return ChestTier.EPIC;
    } else {
        // End game floors: 10% common, 30% uncommon, 45% rare, 15% epic
        if (roll < 10) return ChestTier.COMMON;
        if (roll < 40) return ChestTier.UNCOMMON;
        if (roll < 85) return ChestTier.RARE;
        return ChestTier.EPIC;
    }
}

// Get a color for the chest based on tier
export function getChestColorByTier(tier) {
    switch (tier) {
        case ChestTier.COMMON:
            return 0x8B4513; // Brown
        case ChestTier.UNCOMMON:
            return 0x888888; // Silver
        case ChestTier.RARE:
            return 0xFFD700; // Gold
        case ChestTier.EPIC:
            return 0x9932CC; // Purple
        default:
            return 0x8B4513; // Default brown
    }
}
