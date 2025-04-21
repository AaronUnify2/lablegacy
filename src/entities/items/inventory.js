// src/entities/items/inventory.js - Inventory management system

// Define item types
export const ItemType = {
    HEALTH_POTION: 'healthPotion',
    STAMINA_POTION: 'staminaPotion',
    WEAPON_UPGRADE: 'weaponUpgrade',
    STAFF_CRYSTAL: 'staffCrystal',
    KEY: 'key',
    SCROLL: 'scroll'
};

// Item database - predefined items with their properties
export const ItemDatabase = {
    // Health potions
    'smallHealthPotion': {
        id: 'smallHealthPotion',
        name: 'Small Health Potion',
        type: ItemType.HEALTH_POTION,
        description: 'Restores 20 health points.',
        healAmount: 20,
        stackable: true,
        iconClass: 'healthPotion'
    },
    'mediumHealthPotion': {
        id: 'mediumHealthPotion',
        name: 'Medium Health Potion',
        type: ItemType.HEALTH_POTION,
        description: 'Restores 50 health points.',
        healAmount: 50,
        stackable: true,
        iconClass: 'healthPotion'
    },
    'largeHealthPotion': {
        id: 'largeHealthPotion',
        name: 'Large Health Potion',
        type: ItemType.HEALTH_POTION,
        description: 'Restores 100 health points.',
        healAmount: 100,
        stackable: true,
        iconClass: 'healthPotion'
    },
    
    // Stamina potions
    'smallStaminaPotion': {
        id: 'smallStaminaPotion',
        name: 'Small Stamina Potion',
        type: ItemType.STAMINA_POTION,
        description: 'Instantly recharges dash and allows continuous jumping for 5 seconds.',
        duration: 5,
        stackable: true,
        iconClass: 'staminaPotion'
    },
    'largeStaminaPotion': {
        id: 'largeStaminaPotion',
        name: 'Large Stamina Potion',
        type: ItemType.STAMINA_POTION,
        description: 'Instantly recharges dash and allows continuous jumping for 15 seconds.',
        duration: 15,
        stackable: true,
        iconClass: 'staminaPotion'
    },
    
    // Weapon upgrades
    'sharpBlade': {
        id: 'sharpBlade',
        name: 'Sharp Blade',
        type: ItemType.WEAPON_UPGRADE,
        description: 'Increases sword damage by 5 points.',
        upgradeType: 'sword',
        statBoost: {
            damage: 5
        },
        stackable: false,
        iconClass: 'swordUpgrade'
    },
    'reinforcedHilt': {
        id: 'reinforcedHilt',
        name: 'Reinforced Hilt',
        type: ItemType.WEAPON_UPGRADE,
        description: 'Increases sword durability by 50 points.',
        upgradeType: 'sword',
        statBoost: {
            maxDurability: 50
        },
        stackable: false,
        iconClass: 'swordUpgrade'
    },
    
    // Staff crystals
    'blueCrystal': {
        id: 'blueCrystal',
        name: 'Blue Crystal',
        type: ItemType.STAFF_CRYSTAL,
        description: 'Unlocks frost projectiles that slow enemies.',
        abilityType: 'frost',
        stackable: false,
        iconClass: 'staffCrystal'
    },
    'redCrystal': {
        id: 'redCrystal',
        name: 'Red Crystal',
        type: ItemType.STAFF_CRYSTAL,
        description: 'Unlocks fire projectiles that apply damage over time.',
        abilityType: 'fire',
        stackable: false,
        iconClass: 'staffCrystal'
    }
};

// Inventory class to manage player's items
export class Inventory {
    constructor(capacity = 20) {
        this.items = []; // Array of {item, count} objects
        this.capacity = capacity;
        this.onInventoryChanged = null; // Callback for UI updates
    }
    
    // Add an item to the inventory
    addItem(itemId, count = 1) {
        // Get item definition from database
        const itemDef = ItemDatabase[itemId];
        if (!itemDef) {
            console.error(`Item ${itemId} not found in database`);
            return false;
        }
        
        // Check if inventory is full
        if (this.items.length >= this.capacity && !this.hasItem(itemId)) {
            console.log('Inventory is full');
            return false;
        }
        
        // If stackable, try to find existing stack
        if (itemDef.stackable) {
            const existingItem = this.items.find(i => i.item.id === itemId);
            if (existingItem) {
                existingItem.count += count;
                if (this.onInventoryChanged) this.onInventoryChanged();
                return true;
            }
        }
        
        // Add as new item
        this.items.push({
            item: { ...itemDef },
            count: count
        });
        
        // Trigger callback
        if (this.onInventoryChanged) this.onInventoryChanged();
        return true;
    }
    
    // Remove an item from the inventory
    removeItem(itemId, count = 1) {
        const index = this.items.findIndex(i => i.item.id === itemId);
        if (index === -1) return false;
        
        const item = this.items[index];
        if (item.count <= count) {
            // Remove entire stack
            this.items.splice(index, 1);
        } else {
            // Reduce stack
            item.count -= count;
        }
        
        // Trigger callback
        if (this.onInventoryChanged) this.onInventoryChanged();
        return true;
    }
    
    // Check if inventory has a specific item
    hasItem(itemId, count = 1) {
        const item = this.items.find(i => i.item.id === itemId);
        return item && item.count >= count;
    }
    
    // Get count of a specific item
    getItemCount(itemId) {
        const item = this.items.find(i => i.item.id === itemId);
        return item ? item.count : 0;
    }
    
    // Get all items of a specific type
    getItemsByType(type) {
        return this.items.filter(i => i.item.type === type);
    }
    
    // Use an item at a specific index
    useItemAtIndex(index, player) {
        if (index < 0 || index >= this.items.length) return false;
        
        const itemStack = this.items[index];
        const item = itemStack.item;
        
        // Apply item effects based on type
        switch (item.type) {
            case ItemType.HEALTH_POTION:
                // Heal player
                if (player.health < player.maxHealth) {
                    player.health = Math.min(player.maxHealth, player.health + item.healAmount);
                    
                    // Reduce item count
                    if (itemStack.count <= 1) {
                        this.items.splice(index, 1);
                    } else {
                        itemStack.count--;
                    }
                    
                    // Trigger callback
                    if (this.onInventoryChanged) this.onInventoryChanged();
                    return true;
                }
                return false;
                
            case ItemType.STAMINA_POTION:
                // Apply stamina effect
                if (player.applyStaminaBoost) {
                    player.applyStaminaBoost(item.duration);
                    
                    // Reduce item count
                    if (itemStack.count <= 1) {
                        this.items.splice(index, 1);
                    } else {
                        itemStack.count--;
                    }
                    
                    // Trigger callback
                    if (this.onInventoryChanged) this.onInventoryChanged();
                    return true;
                }
                return false;
                
            case ItemType.WEAPON_UPGRADE:
                // Apply weapon upgrade
                if (item.upgradeType === 'sword' && player.weapons.sword) {
                    // Apply stat boosts
                    for (const [stat, value] of Object.entries(item.statBoost)) {
                        if (stat === 'damage') {
                            player.weapons.sword.damage += value;
                        } else if (stat === 'maxDurability') {
                            player.weapons.sword.maxDurability += value;
                            player.weapons.sword.durability += value;
                        }
                    }
                    
                    // Remove the item (not stackable)
                    this.items.splice(index, 1);
                    
                    // Trigger callback
                    if (this.onInventoryChanged) this.onInventoryChanged();
                    return true;
                }
                return false;
                
            case ItemType.STAFF_CRYSTAL:
                // Apply staff crystal for new abilities
                if (player.unlockStaffAbility) {
                    player.unlockStaffAbility(item.abilityType);
                    
                    // Remove the item (not stackable)
                    this.items.splice(index, 1);
                    
                    // Trigger callback
                    if (this.onInventoryChanged) this.onInventoryChanged();
                    return true;
                }
                return false;
                
            default:
                return false;
        }
    }
    
    // Clear all items from inventory
    clear() {
        this.items = [];
        if (this.onInventoryChanged) this.onInventoryChanged();
    }
    
    // Get all items
    getAllItems() {
        return [...this.items];
    }
    
    // Set callback for inventory changes
    setChangeCallback(callback) {
        this.onInventoryChanged = callback;
    }
}

// Export a function to create test items for development
export function createTestItems() {
    return [
        { id: 'smallHealthPotion', count: 5 },
        { id: 'mediumHealthPotion', count: 2 },
        { id: 'smallStaminaPotion', count: 3 },
        { id: 'sharpBlade', count: 1 }
    ];
}
