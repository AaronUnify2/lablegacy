// src/entities/items/treasureChest.js - Dedicated file for treasure chest functionality
import * as THREE from 'three';
import { generateLoot } from './loot.js';

// Treasure Chest class - handles rendering, interaction, and loot
export class TreasureChest {
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
export function createChestWithLoot(x, y, z, tier, itemCount = 2) {
    const loot = generateLoot(tier, itemCount);
    return new TreasureChest(x, y, z, loot, tier);
}

// Function to place chests in a dungeon
export function placeChestsInDungeon(dungeon, chestCount = 3) {
    console.log(`Placing ${chestCount} chests in dungeon...`);
    
    const rooms = dungeon.getRooms().filter(room => 
        !room.isSpawnRoom && !room.isCorridor && room.width >= 10 && room.height >= 10
    );
    
    // If no suitable rooms, return
    if (rooms.length === 0) {
        console.log("No suitable rooms found for chest placement");
        return [];
    }
    
    const chests = [];
    const usedRooms = new Set();
    
    // Always place a chest in center/spawn room if possible
    const spawnRoom = dungeon.getRooms().find(room => room.isSpawnRoom);
    if (spawnRoom) {
        const centerX = spawnRoom.x + spawnRoom.width / 2;
        const centerZ = spawnRoom.z + spawnRoom.height / 2;
        
        const epicChest = createChestWithLoot(
            centerX, 
            spawnRoom.floorHeight, 
            centerZ,
            'epic',
            4
        );
        
        chests.push(epicChest);
        usedRooms.add(spawnRoom);
        console.log(`Placed epic chest in spawn room at (${centerX}, ${centerZ})`);
    }
    
    // Place remaining chests in other rooms
    const remainingCount = Math.min(chestCount - chests.length, rooms.length - usedRooms.size);
    
    for (let i = 0; i < remainingCount; i++) {
        // Select an unused room
        const availableRooms = rooms.filter(room => !usedRooms.has(room));
        if (availableRooms.length === 0) break;
        
        const roomIndex = Math.floor(Math.random() * availableRooms.length);
        const room = availableRooms[roomIndex];
        usedRooms.add(room);
        
        // Get a position within the room (not too close to walls)
        const margin = 2;
        const x = room.x + margin + Math.random() * (room.width - margin * 2);
        const z = room.z + margin + Math.random() * (room.height - margin * 2);
        
        // Determine chest tier based on room type
        let tier;
        if (room.roomType === 'cardinalPlus') {
            tier = Math.random() < 0.7 ? 'rare' : 'epic';
        } else if (room.roomType === 'radial') {
            tier = Math.random() < 0.6 ? 'uncommon' : 'rare';
        } else if (room.roomType === 'alcove') {
            tier = 'rare'; // Hidden treasures in alcoves
        } else {
            tier = 'common';
        }
        
        const chest = createChestWithLoot(x, room.floorHeight, z, tier, 2 + Math.floor(Math.random() * 2));
        chests.push(chest);
        
        console.log(`Placed ${tier} chest in ${room.roomType || 'normal'} room at (${x.toFixed(2)}, ${z.toFixed(2)})`);
    }
    
    return chests;
}
