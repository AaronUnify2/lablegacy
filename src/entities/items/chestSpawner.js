// src/entities/items/chestSpawner.js - Improved chest spawning system with better delay and error handling

import * as THREE from 'three';
import { ItemDatabase } from './inventory.js';

// Define chest tiers (duplicated here to avoid circular imports)
const ChestTier = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic'
};

// Define simple loot tables for each chest tier
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
        { itemId: 'mediumHealthPotion', weight: 30, countRange: [1, 2] },
        { itemId: 'largeHealthPotion', weight: 15, countRange: [1, 1] },
        { itemId: 'largeStaminaPotion', weight: 25, countRange: [1, 1] },
        // Added staff crystals to rare chests with lower weights
        { itemId: 'blueCrystal', weight: 15, countRange: [1, 1] },
        { itemId: 'redCrystal', weight: 15, countRange: [1, 1] }
    ],
    epic: [
        { itemId: 'largeHealthPotion', weight: 25, countRange: [1, 2] },
        { itemId: 'largeStaminaPotion', weight: 25, countRange: [1, 2] },
        // Higher chance to get staff crystals from epic chests
        { itemId: 'blueCrystal', weight: 25, countRange: [1, 1] },
        { itemId: 'redCrystal', weight: 25, countRange: [1, 1] }
    ]
};

// Simple loot generation function with fixed database lookup
function generateLoot(tier = 'common', itemCount = 1) {
    const tierTable = lootTables[tier.toLowerCase()] || lootTables.common;
    const loot = [];
    const itemsToGenerate = Math.min(itemCount, 4); // Limit to 4 items per chest
    
    // Generate items based on weighted random selection
    for (let i = 0; i < itemsToGenerate; i++) {
        // Calculate total weight for this tier
        const totalWeight = tierTable.reduce((sum, item) => sum + item.weight, 0);
        
        // Simple random item selection
        const roll = Math.random() * totalWeight;
        let weightSum = 0;
        
        // Find which item was rolled
        for (const lootItem of tierTable) {
            weightSum += lootItem.weight;
            
            if (roll <= weightSum) {
                // Determine count based on range
                const countRange = lootItem.countRange || [1, 1];
                const count = Math.floor(Math.random() * (countRange[1] - countRange[0] + 1)) + countRange[0];
                
                // Get item data from database
                const itemData = ItemDatabase[lootItem.itemId];
                
                if (!itemData) {
                    console.error(`Item ${lootItem.itemId} not found in database`);
                    continue;
                }
                
                // Create item entry
                const item = {
                    id: lootItem.itemId,
                    name: itemData.name,
                    type: itemData.type,
                    description: itemData.description,
                    count: count,
                    stackable: itemData.stackable,
                    iconClass: itemData.iconClass
                };
                
                // Add special properties based on item type
                if (itemData.healAmount) item.healAmount = itemData.healAmount;
                if (itemData.duration) item.duration = itemData.duration;
                if (itemData.abilityType) item.abilityType = itemData.abilityType;
                
                // Check if item already exists in loot and increase count if stackable
                const existingItem = loot.find(i => i.id === item.id);
                if (existingItem && item.stackable) {
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

// Simple chest class (standalone version)
export class SimpleChest {
    constructor(x, y, z, items = [], tier = 'common') {
        // Position in world
        this.position = new THREE.Vector3(x, y, z);
        
        // Items contained in the chest
        this.items = items;
        
        // Chest state
        this.isOpen = false;
        this.isInteractable = true;
        this.interactionDistance = 5.0; // How close player needs to be to interact
        
        // Chest appearance
        this.tier = tier;
        
        // Three.js objects
        this.object = new THREE.Object3D(); // Main container for the chest
        this.mesh = null;                   // Chest mesh group
        this.lid = null;                    // Reference to lid for animation
        
        // Entity type for physics/collision detection
        this.type = 'chest';
        
        // Create visual representation
        this.createMesh();
        
        // Set initial position
        this.object.position.copy(this.position);
    }
    
    // Create chest mesh with proper scaling and positioning
    createMesh() {
        // Determine color based on tier
        let baseColor, metalColor, glowIntensity;
        
        switch(this.tier) {
            case 'uncommon':
                baseColor = 0x665544;       // Darker wood
                metalColor = 0xc0c0c0;      // Silver
                glowIntensity = 0.6;
                break;
            case 'rare':
                baseColor = 0x704214;       // Rich wood
                metalColor = 0xFFD700;      // Gold
                glowIntensity = 0.8;
                break;
            case 'epic':
                baseColor = 0x4a2a0a;       // Dark ornate wood
                metalColor = 0x9932CC;      // Purple
                glowIntensity = 1.0;
                break;
            case 'common':
            default:
                baseColor = 0x8B4513;       // Brown
                metalColor = 0xddaa44;      // Bronze
                glowIntensity = 0.5;
                break;
        }
        
        // Create a group for the chest pieces
        this.mesh = new THREE.Group();
        
        // Create chest base (bottom part)
        const baseGeometry = new THREE.BoxGeometry(1, 0.7, 0.7);
        const baseMaterial = new THREE.MeshLambertMaterial({ 
            color: baseColor,
            emissive: baseColor,
            emissiveIntensity: 0.2
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.35; // Position half its height above origin
        
        // Create chest lid (top part)
        const lidGeometry = new THREE.BoxGeometry(1, 0.4, 0.7);
        const lidMaterial = new THREE.MeshLambertMaterial({ 
            color: baseColor,
            emissive: baseColor,
            emissiveIntensity: 0.2
        });
        this.lid = new THREE.Mesh(lidGeometry, lidMaterial);
        this.lid.position.set(0, 0.9, 0); // Position above the base
        this.lid.rotation.x = 0; // Closed position
        
        // Create decorative elements - metal bands
        const metalMaterial = new THREE.MeshStandardMaterial({ 
            color: metalColor,
            emissive: metalColor,
            emissiveIntensity: 0.3,
            metalness: 0.8,
            roughness: 0.3
        });
        
        // Horizontal bands
        const bandGeometry1 = new THREE.BoxGeometry(1.05, 0.08, 0.75);
        const band1 = new THREE.Mesh(bandGeometry1, metalMaterial);
        band1.position.y = 0.25; // Lower band
        
        const band2 = new THREE.Mesh(bandGeometry1, metalMaterial);
        band2.position.y = 0.65; // Upper band
        
        const band3 = new THREE.Mesh(bandGeometry1, metalMaterial);
        band3.position.y = 0.9; // Lid band
        
        // Lock for the chest
        const lockGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.15);
        const lock = new THREE.Mesh(lockGeometry, metalMaterial);
        lock.position.set(0, 0.75, 0.4); // Center front of chest
        
        // Add all parts to the chest mesh group
        this.mesh.add(base, this.lid, band1, band2, band3, lock);
        
        // Add chest light based on tier
        const light = new THREE.PointLight(metalColor, glowIntensity, 5);
        light.position.set(0, 0.8, 0);
        this.mesh.add(light);
        
        // Add a secondary white light to ensure visibility
        const ambientLight = new THREE.PointLight(0xffffff, 0.4, 3);
        ambientLight.position.set(0, 1, 0);
        this.mesh.add(ambientLight);
        
        // Add the mesh to the object container
        this.object.add(this.mesh);
        
        // Raise the entire chest to avoid clipping into the floor
        this.mesh.position.y = 0.4;
    }
    
    // Update chest state - handles animation
    update(deltaTime) {
        // If chest is open, animate the lid
        if (this.isOpen && this.lid && this.lid.rotation.x < Math.PI / 2) {
            this.lid.rotation.x += 3 * deltaTime;
            
            // Cap at 90 degrees
            if (this.lid.rotation.x > Math.PI / 2) {
                this.lid.rotation.x = Math.PI / 2;
            }
        }
    }
    
    // Get the Three.js object for rendering
    getObject() {
        return this.object;
    }
    
    // Get chest position
    getPosition() {
        return this.position;
    }
    
    // Set chest position
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.object.position.set(x, y, z);
    }
    
    // Get collision box for physics
    getCollider() {
        return {
            min: new THREE.Vector3(
                this.position.x - 0.6,
                this.position.y,
                this.position.z - 0.4
            ),
            max: new THREE.Vector3(
                this.position.x + 0.6,
                this.position.y + 1.5, // Higher to account for lid opening
                this.position.z + 0.4
            )
        };
    }
    
    // Check if player is close enough to interact
    canInteract(playerPosition) {
        if (!this.isInteractable || this.isOpen) return false;
        
        const distance = Math.sqrt(
            Math.pow(playerPosition.x - this.position.x, 2) +
            Math.pow(playerPosition.z - this.position.z, 2)
        );
        
        return distance <= this.interactionDistance;
    }
    
    // Open the chest and return items
    open() {
        if (this.isOpen) return null;
        
        console.log(`Opening ${this.tier} chest at position:`, this.position);
        
        this.isOpen = true;
        
        // Return a copy of the items
        return [...this.items];
    }
    
    // Check if chest is open
    isChestOpen() {
        return this.isOpen;
    }
    
    // Add items to the chest
    addItems(items) {
        this.items = [...this.items, ...items];
    }
    
    // Get items from the chest
    getItems() {
        return [...this.items];
    }
    
    // Get chest tier
    getTier() {
        return this.tier;
    }
    
    // Helper method to determine chest glow color
    getGlowColor() {
        switch(this.tier) {
            case 'uncommon': return 0xc0c0c0; // Silver
            case 'rare': return 0xFFD700;      // Gold
            case 'epic': return 0x9932CC;      // Purple
            default: return 0xddaa44;          // Bronze
        }
    }
}

// Factory function to create a chest with generated loot
export function createSimpleChest(x, y, z, tier, itemCount = 2) {
    // Make sure tier is a string to avoid any type issues
    const tierString = String(tier).toLowerCase();
    
    // Generate loot based on tier and item count
    const loot = generateLoot(tierString, itemCount);
    
    // Log the generated loot for debugging
    console.log(`Created ${tierString} chest with items:`, loot);
    
    // Create and return the chest
    return new SimpleChest(x, y, z, loot, tierString);
}

// Function to spawn chests in a dungeon with improved error handling and delay
export function spawnChestsInDungeon(dungeon, customDelay = 1500) {
    // Validate the dungeon parameter
    if (!dungeon) {
        console.error("Invalid dungeon object passed to spawnChestsInDungeon");
        return Promise.reject("Invalid dungeon");
    }
    
    console.log(`Setting up chest spawns with ${customDelay}ms delay...`);
    
    // Return a promise that resolves when chests are spawned
    return new Promise((resolve, reject) => {
        // Add a delay to ensure the dungeon is fully rendered first
        setTimeout(() => {
            try {
                console.log("Now spawning chests after delay...");
                
                // Make sure dungeon is valid and has the necessary methods
                if (!dungeon.getRooms || typeof dungeon.getRooms !== 'function') {
                    console.error("Dungeon object doesn't have a valid getRooms method");
                    reject("Invalid dungeon object");
                    return;
                }
                
                // Get all rooms that could have chests
                const rooms = dungeon.getRooms().filter(room => 
                    !room.isCorridor && room.width >= 10 && room.height >= 10
                );
                
                // Check if we have valid rooms
                if (!rooms || rooms.length === 0) {
                    console.warn("No suitable rooms found for chest placement");
                    resolve([]);
                    return;
                }
                
                // Determine number of chests based on floor
                const floorNumber = dungeon.floorNumber || 1;
                const chestCount = 3 + Math.min(Math.floor(floorNumber / 3), 2); // 3-5 chests
                
                console.log(`Planning to spawn ${chestCount} chests in ${rooms.length} eligible rooms`);
                
                // Keep track of rooms where we've placed chests
                const usedRooms = new Set();
                const chests = [];
                
                // Place chests in appropriate rooms
                for (let i = 0; i < chestCount && i < rooms.length; i++) {
                    // Select an unused room randomly
                    const availableRooms = rooms.filter(room => !usedRooms.has(room));
                    if (availableRooms.length === 0) break;
                    
                    const roomIndex = Math.floor(Math.random() * availableRooms.length);
                    const room = availableRooms[roomIndex];
                    usedRooms.add(room);
                    
                    // Determine chest tier based on room type and floor
                    let tier;
                    if (room.roomType === 'cardinalPlus' || room.roomType === 'alcove') {
                        // Higher tier for special rooms
                        tier = Math.random() < 0.6 ? 'rare' : 'epic';
                    } else if (room.roomType === 'radial') {
                        tier = Math.random() < 0.7 ? 'uncommon' : 'rare';
                    } else if (room.roomType === 'cardinal') {
                        tier = Math.random() < 0.6 ? 'common' : 'uncommon';
                    } else {
                        tier = 'common';
                    }
                    
                    // Place chest in room with margin from walls
                    const margin = 2;
                    const x = room.x + margin + Math.random() * (room.width - margin * 2);
                    const z = room.z + margin + Math.random() * (room.height - margin * 2);
                    const y = room.floorHeight || 0; // Default to 0 if floorHeight is undefined
                    
                    console.log(`Creating ${tier} chest at (${x.toFixed(2)}, ${z.toFixed(2)}) in ${room.roomType || 'normal'} room`);
                    
                    try {
                        // Create chest with loot
                        const itemCount = 2 + Math.floor(Math.random() * 3); // 2-4 items
                        const chest = createSimpleChest(x, y, z, tier, itemCount);
                        
                        // Add chest to dungeon if the method exists
                        if (dungeon.addChest && typeof dungeon.addChest === 'function') {
                            dungeon.addChest(chest);
                            chests.push(chest);
                            console.log(`Successfully added chest to dungeon`);
                        } else {
                            console.error("Dungeon object doesn't have a valid addChest method");
                            // Try alternative approach - add chest to scene directly
                            if (window.game && window.game.scene) {
                                window.game.scene.add(chest.getObject());
                                chests.push(chest);
                                console.log(`Added chest directly to scene as fallback`);
                            }
                        }
                    } catch (error) {
                        console.error("Error creating chest:", error);
                    }
                }
                
                console.log(`Successfully spawned ${chests.length} chests after delay`);
                resolve(chests);
            } catch (error) {
                console.error("Error in spawnChestsInDungeon:", error);
                reject(error);
            }
        }, customDelay);
    });
}
