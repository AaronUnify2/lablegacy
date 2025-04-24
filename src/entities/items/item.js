// src/entities/items/item.js - Base Item class
import * as THREE from 'three';
import { ItemDatabase } from './inventory.js';

export class Item {
    constructor(itemId, x, y, z) {
        // Get item definition from database
        const itemDef = ItemDatabase[itemId];
        if (!itemDef) {
            console.error(`Item ${itemId} not found in database`);
            throw new Error(`Invalid item ID: ${itemId}`);
        }
        
        // Item properties
        this.id = itemId;
        this.name = itemDef.name;
        this.type = itemDef.type;
        this.description = itemDef.description;
        this.stackable = itemDef.stackable;
        this.count = 1;
        
        // Position in world
        this.position = new THREE.Vector3(x, y, z);
        
        // Three.js objects
        this.object = null;
        this.mesh = null;
        
        // Item state
        this.isCollected = false;
        this.floatAnimation = {
            height: 0.3,
            speed: 1.5,
            originalY: y,
            rotationSpeed: 0.01
        };
        
        // Entity type for physics/collision detection
        this.type = 'item';
        
        // Create visual representation
        this.createMesh();
    }
    
    // Create visual mesh for the item
    createMesh() {
        this.object = new THREE.Object3D();
        this.object.position.copy(this.position);
        
        // Create different meshes based on item type
        switch (this.type) {
            case 'healthPotion':
                this.createHealthPotionMesh();
                break;
            case 'staminaPotion':
                this.createStaminaPotionMesh();
                break;
            case 'weaponUpgrade':
                this.createWeaponUpgradeMesh();
                break;
            case 'staffCrystal':
                this.createStaffCrystalMesh();
                break;
            case 'key':
                this.createKeyMesh();
                break;
            default:
                this.createDefaultMesh();
                break;
        }
    }
    
    // Create health potion mesh
    createHealthPotionMesh() {
        // Bottle
        const bottleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
        const bottleMaterial = new THREE.MeshLambertMaterial({ color: 0xdddddd, transparent: true, opacity: 0.7 });
        const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
        
        // Neck
        const neckGeometry = new THREE.CylinderGeometry(0.05, 0.15, 0.1, 8);
        const neck = new THREE.Mesh(neckGeometry, bottleMaterial);
        neck.position.y = 0.2;
        
        // Cork
        const corkGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8);
        const corkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const cork = new THREE.Mesh(corkGeometry, corkMaterial);
        cork.position.y = 0.275;
        
        // Liquid
        const liquidGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.28, 8);
        const liquidMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const liquid = new THREE.Mesh(liquidGeometry, liquidMaterial);
        liquid.position.y = -0.01;
        liquid.scale.set(0.9, 0.9, 0.9);
        
        // Add light to make it glow
        const light = new THREE.PointLight(0xff0000, 0.5, 1);
        light.position.set(0, 0, 0);
        
        // Group all parts
        this.mesh = new THREE.Group();
        this.mesh.add(bottle, neck, cork, liquid, light);
        this.object.add(this.mesh);
    }
    
    // Create stamina potion mesh
    createStaminaPotionMesh() {
        // Bottle
        const bottleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
        const bottleMaterial = new THREE.MeshLambertMaterial({ color: 0xdddddd, transparent: true, opacity: 0.7 });
        const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
        
        // Neck
        const neckGeometry = new THREE.CylinderGeometry(0.05, 0.15, 0.1, 8);
        const neck = new THREE.Mesh(neckGeometry, bottleMaterial);
        neck.position.y = 0.2;
        
        // Cork
        const corkGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8);
        const corkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const cork = new THREE.Mesh(corkGeometry, corkMaterial);
        cork.position.y = 0.275;
        
        // Liquid
        const liquidGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.28, 8);
        const liquidMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const liquid = new THREE.Mesh(liquidGeometry, liquidMaterial);
        liquid.position.y = -0.01;
        liquid.scale.set(0.9, 0.9, 0.9);
        
        // Add light to make it glow
        const light = new THREE.PointLight(0x00ff00, 0.5, 1);
        light.position.set(0, 0, 0);
        
        // Group all parts
        this.mesh = new THREE.Group();
        this.mesh.add(bottle, neck, cork, liquid, light);
        this.object.add(this.mesh);
    }
    
    // Create weapon upgrade mesh
    createWeaponUpgradeMesh() {
        // Sword blade
        const bladeGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.02);
        const bladeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc,
            metalness: 0.8,
            roughness: 0.2
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = 0.1;
        
        // Sword guard
        const guardGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.05);
        const guardMaterial = new THREE.MeshLambertMaterial({ color: 0xddaa44 });
        const guard = new THREE.Mesh(guardGeometry, guardMaterial);
        guard.position.y = -0.15;
        
        // Sword handle
        const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
        const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -0.25;
        
        // Add glow effect
        const light = new THREE.PointLight(0xffcc00, 0.4, 1);
        light.position.set(0, 0, 0);
        
        // Group all parts
        this.mesh = new THREE.Group();
        this.mesh.add(blade, guard, handle, light);
        this.mesh.rotation.x = Math.PI / 4; // Tilt the sword
        this.object.add(this.mesh);
    }
    
    // Create staff crystal mesh
    createStaffCrystalMesh() {
        // Determine color based on crystal subtype
        let crystalColor;
        const itemDef = ItemDatabase[this.id];
        
        if (itemDef && itemDef.abilityType === 'frost') {
            crystalColor = 0x00aaff; // Blue for frost
        } else if (itemDef && itemDef.abilityType === 'fire') {
            crystalColor = 0xff5500; // Red for fire
        } else {
            crystalColor = 0xaa44ff; // Purple default
        }
        
        // Crystal geometry
        const crystalGeometry = new THREE.OctahedronGeometry(0.2, 1);
        const crystalMaterial = new THREE.MeshLambertMaterial({
            color: crystalColor,
            emissive: crystalColor,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
        
        // Add light for glow effect
        const light = new THREE.PointLight(crystalColor, 1, 2);
        light.position.set(0, 0, 0);
        
        // Group
        this.mesh = new THREE.Group();
        this.mesh.add(crystal, light);
        this.object.add(this.mesh);
    }
    
    // Create key mesh
    createKeyMesh() {
        // Key ring
        const ringGeometry = new THREE.TorusGeometry(0.15, 0.03, 16, 32);
        const ringMaterial = new THREE.MeshLambertMaterial({ color: 0xddaa44 });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        
        // Key shaft
        const shaftGeometry = new THREE.BoxGeometry(0.03, 0.3, 0.03);
        const shaft = new THREE.Mesh(shaftGeometry, ringMaterial);
        shaft.position.y = -0.2;
        
        // Key teeth
        const teethGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.03);
        const teeth = new THREE.Mesh(teethGeometry, ringMaterial);
        teeth.position.set(0.06, -0.3, 0);
        
        // Add light for glow effect
        const light = new THREE.PointLight(0xffcc00, 0.6, 1.5);
        
        // Group
        this.mesh = new THREE.Group();
        this.mesh.add(ring, shaft, teeth, light);
        this.object.add(this.mesh);
    }
    
    // Create default mesh for unspecified item types
    createDefaultMesh() {
        const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const material = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
        this.mesh = new THREE.Mesh(geometry, material);
        this.object.add(this.mesh);
    }
    
    // Update item (animation, etc.)
    update(deltaTime) {
        if (this.isCollected) return;
        
        // Float animation
        const floatOffset = Math.sin(Date.now() * 0.001 * this.floatAnimation.speed) * this.floatAnimation.height;
        this.object.position.y = this.floatAnimation.originalY + floatOffset;
        
        // Rotation animation
        this.object.rotation.y += this.floatAnimation.rotationSpeed;
    }
    
    // Get the Three.js object for rendering
    getObject() {
        return this.object;
    }
    
    // Get item position
    getPosition() {
        return this.position;
    }
    
    // Set item position
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.object.position.set(x, y, z);
        this.floatAnimation.originalY = y;
    }
    
    // Get collision box
    getCollider() {
        return {
            min: new THREE.Vector3(
                this.position.x - 0.2,
                this.position.y - 0.2,
                this.position.z - 0.2
            ),
            max: new THREE.Vector3(
                this.position.x + 0.2,
                this.position.y + 0.5,
                this.position.z + 0.2
            )
        };
    }
    
    // Mark item as collected
    collect() {
        this.isCollected = true;
        // Hide the mesh when collected
        if (this.object && this.object.parent) {
            this.object.parent.remove(this.object);
        }
    }
    
    // Get item data for inventory
    getItemData() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            description: this.description,
            count: this.count
        };
    }
}

// Ensure this class is properly exported
export class TreasureChest {
    constructor(x, y, z, items = [], tier = 'common') {
        // Position in world
        this.position = new THREE.Vector3(x, y, z);
        
        // Items contained in the chest
        this.items = items;
        
        // Chest state
        this.isOpen = false;
        this.isInteractable = true;
        this.interactionDistance = 3.0; // How close player needs to be to interact
        
        // Chest appearance
        this.tier = tier;
        
        // Three.js objects
        this.object = null;
        this.mesh = null;
        
        // Entity type for physics/collision detection
        this.type = 'chest';
        
        // Create visual representation
        this.createMesh();
    }
    
    // Create chest mesh - ENHANCED VERSION with larger size and bright materials
    createMesh() {
        this.object = new THREE.Object3D();
        this.object.position.copy(this.position);
        
        // Determine color based on tier
        let baseColor, metalColor;
        
        switch(this.tier) {
            case 'uncommon':
                baseColor = 0x665544; // Darker wood
                metalColor = 0xc0c0c0; // Silver
                break;
            case 'rare':
                baseColor = 0x704214; // Rich wood
                metalColor = 0xFFD700; // Gold
                break;
            case 'epic':
                baseColor = 0x4a2a0a; // Dark ornate wood
                metalColor = 0x9932CC; // Purple
                break;
            case 'common':
            default:
                baseColor = 0x8B4513; // Brown
                metalColor = 0xddaa44; // Bronze
                break;
        }
        
        // ENHANCEMENT: Make chests much larger - increasing scale by 5x
        const scaleFactor = 0.1;
        
        // Create chest base
        const baseGeometry = new THREE.BoxGeometry(0.8 * scaleFactor, 0.5 * scaleFactor, 0.5 * scaleFactor);
        const baseMaterial = new THREE.MeshLambertMaterial({ 
            color: baseColor,
            emissive: baseColor,
            emissiveIntensity: 0.3 // Add glow
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        
        // Create chest lid (will be animated when opened)
        const lidGeometry = new THREE.BoxGeometry(0.8 * scaleFactor, 0.3 * scaleFactor, 0.5 * scaleFactor);
        const lidMaterial = new THREE.MeshLambertMaterial({ 
            color: baseColor,
            emissive: baseColor,
            emissiveIntensity: 0.3 // Add glow
        });
        this.lid = new THREE.Mesh(lidGeometry, lidMaterial);
        this.lid.position.y = 0.4 * scaleFactor;
        this.lid.rotation.x = 0; // Closed
        
        // Create decorative elements
        const metalMaterial = new THREE.MeshStandardMaterial({ 
            color: metalColor,
            emissive: metalColor,
            emissiveIntensity: 0.5, // Increased glow
            metalness: 0.8,
            roughness: 0.3
        });
        
        // Metal bands
        const bandGeometry1 = new THREE.BoxGeometry(0.82 * scaleFactor, 0.05 * scaleFactor, 0.52 * scaleFactor);
        const band1 = new THREE.Mesh(bandGeometry1, metalMaterial);
        band1.position.y = 0.15 * scaleFactor;
        
        const bandGeometry2 = new THREE.BoxGeometry(0.82 * scaleFactor, 0.05 * scaleFactor, 0.52 * scaleFactor);
        const band2 = new THREE.Mesh(bandGeometry2, metalMaterial);
        band2.position.y = 0.45 * scaleFactor;
        
        // Lock
        const lockGeometry = new THREE.BoxGeometry(0.1 * scaleFactor, 0.15 * scaleFactor, 0.1 * scaleFactor);
        const lock = new THREE.Mesh(lockGeometry, metalMaterial);
        lock.position.set(0, 0.4 * scaleFactor, (0.25 + 0.05) * scaleFactor);
        
        // Add all parts to chest
        this.mesh = new THREE.Group();
        this.mesh.add(base, this.lid, band1, band2, lock);
        this.object.add(this.mesh);
        
        // ENHANCEMENT: Raise position to ensure chest is visible
        // Adjust the Y position to lift the chest above the floor
        this.object.position.y += 1.0; // Raise chest 1 unit above the floor
        
        // ENHANCEMENT: Add bright light to make chest extremely visible
        const chestLight = new THREE.PointLight(metalColor, 1.5, 10);
        chestLight.position.set(0, 0.5 * scaleFactor, 0);
        this.object.add(chestLight);
        
        // Add brighter glow for all chest types
        const secondaryLight = new THREE.PointLight(0xffffff, 0.8, 5);
        secondaryLight.position.set(0, 0, 0);
        this.object.add(secondaryLight);
    }
    
    // Update chest state
    update(deltaTime) {
        // If chest is open, animate the lid
        if (this.isOpen && this.lid.rotation.x < Math.PI / 2) {
            this.lid.rotation.x += 3 * deltaTime;
            if (this.lid.rotation.x > Math.PI / 2) {
                this.lid.rotation.x = Math.PI / 2; // Cap at 90 degrees
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
    
    // Get collision box
    getCollider() {
        return {
            min: new THREE.Vector3(
                this.position.x - 0.4,
                this.position.y - 0.25,
                this.position.z - 0.25
            ),
            max: new THREE.Vector3(
                this.position.x + 0.4,
                this.position.y + 0.55,
                this.position.z + 0.25
            )
        };
    }
    
    // Get interaction collider (slightly larger than physical collider)
    getInteractionCollider() {
        return {
            min: new THREE.Vector3(
                this.position.x - this.interactionDistance,
                this.position.y - this.interactionDistance,
                this.position.z - this.interactionDistance
            ),
            max: new THREE.Vector3(
                this.position.x + this.interactionDistance,
                this.position.y + this.interactionDistance,
                this.position.z + this.interactionDistance
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
}
