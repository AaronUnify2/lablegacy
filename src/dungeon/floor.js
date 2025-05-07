// src/dungeon/floor.js - Dungeon floor class with improved chest handling
import * as THREE from 'three';
import { WallBuilder } from './walls.js';

export class Dungeon {
    constructor(floorNumber, size, theme) {
        this.floorNumber = floorNumber;
        this.size = size;
        this.theme = theme;
        
        this.rooms = [];
        this.corridors = [];
        this.decorations = [];
        this.chests = []; // Array to hold treasure chests
        
        this.keyPosition = null;
        this.exitPosition = null;
        this.playerSpawnPosition = null;
        
        this.keyCollected = false;
        
        // Three.js representation of the dungeon
        this.object = new THREE.Object3D();
        this.meshes = [];
        
        // Colliders for physics
        this.colliders = [];
        
        // Wall builder instance
        this.wallBuilder = null;
    }
    
    // Add a room to the dungeon
    addRoom(room) {
        this.rooms.push(room);
    }
    
    // Add a corridor to the dungeon
    addCorridor(corridor) {
        this.corridors.push(corridor);
    }
    
    // Add a decoration to the dungeon
    addDecoration(x, y, z, theme) {
        // Get a random decoration type based on theme
        const decorationType = this.getRandomDecoration(theme);
        
        this.decorations.push({
            type: decorationType,
            x: x,
            y: y,
            z: z
        });
    }
    
    // Get a random decoration type based on theme
    getRandomDecoration(theme) {
        const decorations = theme.decorations || ['rock', 'torch', 'barrel', 'crate'];
        return decorations[Math.floor(Math.random() * decorations.length)];
    }
    
    // Add a chest to the dungeon with improved error handling
    addChest(chest) {
        if (!chest) {
            console.error("Cannot add null or undefined chest to dungeon");
            return null;
        }
        
        // Add to the chest collection
        this.chests.push(chest);
        
        // Debug log
        console.log(`Adding chest to dungeon at position:`, chest.position);
        
        // Ensure the dungeon's main object exists
        if (!this.object) {
            console.error("Dungeon object is not initialized! Creating a new one.");
            this.object = new THREE.Object3D();
        }
        
        // Add chest object to dungeon's main object container
        const chestObject = chest.getObject();
        if (chestObject) {
            try {
                this.object.add(chestObject);
                console.log(`Successfully added chest object to dungeon`);
                
                // Add additional logging for debugging
                console.log(`Chest position relative to dungeon:`, 
                            chestObject.position.x, 
                            chestObject.position.y, 
                            chestObject.position.z);
                
                // Check if the chest is visible and properly positioned
                if (chestObject.visible === false) {
                    console.warn("Chest is set to invisible! Setting to visible.");
                    chestObject.visible = true;
                }
                
                // Add chest to global scene as a redundant safety measure
                if (window.game && window.game.scene) {
                    try {
                        const globalChest = chest.getObject().clone();
                        // Store reference to the original chest on the clone
                        globalChest.userData.originalChest = chest;
                        window.game.scene.add(globalChest);
                        console.log("Also added chest directly to main scene as a fallback");
                    } catch (e) {
                        console.error("Failed to add chest to main scene:", e);
                    }
                }
            } catch (e) {
                console.error(`Error adding chest to dungeon:`, e);
                
                // Attempt recovery by adding directly to scene
                if (window.game && window.game.scene) {
                    try {
                        window.game.scene.add(chestObject);
                        console.log("Recovery: Added chest directly to main scene instead");
                    } catch (recoveryError) {
                        console.error("Fatal: Could not recover chest addition:", recoveryError);
                    }
                }
            }
        } else {
            console.error(`Failed to get chest object - chest may be invalid`);
            return null;
        }
        
        return chest; // Return chest for chaining
    }
    
    // Get all chests in the dungeon
    getChests() {
        return this.chests;
    }
    
    // Find an interactable chest near the player
    findInteractableChest(playerPosition) {
        for (const chest of this.chests) {
            if (chest.canInteract(playerPosition)) {
                return chest;
            }
        }
        return null;
    }
    
    // Place the key in the dungeon
    placeKey(x, y, z) {
        this.keyPosition = { x, y, z };
    }
    
    // Place the exit in the dungeon
    placeExit(x, y, z) {
        this.exitPosition = { x, y, z };
    }
    
    // Set player spawn position
    setPlayerSpawnPosition(x, y, z) {
        this.playerSpawnPosition = { x, y, z };
    }
    
    // Get all rooms
    getRooms() {
        return this.rooms;
    }
    
    // Check if the key is collected
    isKeyCollected() {
        return this.keyCollected;
    }
    
    // Mark key as collected
    collectKey() {
        this.keyCollected = true;
        
        // Remove key model from scene
        if (this.keyMesh) {
            this.object.remove(this.keyMesh);
        }
        
        // Return true to indicate success
        return true;
    }
    
    // Check if player is at the exit
    isPlayerAtExit(playerPosition) {
        if (!this.exitPosition) return false;
        
        const distance = Math.sqrt(
            Math.pow(playerPosition.x - this.exitPosition.x, 2) +
            Math.pow(playerPosition.z - this.exitPosition.z, 2)
        );
        
        // Player is at exit if within 2 units
        return distance < 2;
    }
    
    // Get player spawn position
    getPlayerSpawnPosition() {
        return this.playerSpawnPosition ? this.playerSpawnPosition : { x: 0, y: 1.0, z: 0 }; // Raised from 0.5 to 1.0
    }
    
    // Get colliders for all walls
    getColliders() {
        return this.colliders;
    }
    
    // Get exit collider
    getExitCollider() {
        if (!this.exitPosition) return null;
        
        return {
            min: new THREE.Vector3(
                this.exitPosition.x - 1,
                this.exitPosition.y,
                this.exitPosition.z - 1
            ),
            max: new THREE.Vector3(
                this.exitPosition.x + 1,
                this.exitPosition.y + 2,
                this.exitPosition.z + 1
            )
        };
    }
    
    // Get key collider
    getKeyCollider() {
        if (!this.keyPosition || this.keyCollected) return null;
        
        return {
            min: new THREE.Vector3(
                this.keyPosition.x - 0.5,
                this.keyPosition.y,
                this.keyPosition.z - 0.5
            ),
            max: new THREE.Vector3(
                this.keyPosition.x + 0.5,
                this.keyPosition.y + 1,
                this.keyPosition.z + 0.5
            )
        };
    }
    
    // Build the 3D mesh representation of the dungeon
    buildMesh() {
        // Create object to hold all dungeon meshes
        this.object = new THREE.Object3D();
        
        // Create floor
        this.buildFloors();
        
        // Create walls using the WallBuilder
        this.buildWalls();
        
        // Create decorations
        this.buildDecorations();
        
        // Create key and exit
        this.buildKeyAndExit();
    }
    
    // Build floor meshes
    buildFloors() {
        // For each room and corridor, create a floor
        [...this.rooms, ...this.corridors].forEach(room => {
            // Create floor geometry
            const floorGeometry = new THREE.BoxGeometry(room.width, 0.2, room.height);
            const floorMaterial = new THREE.MeshLambertMaterial({ 
                color: this.theme.floorColor || 0x555555,
                map: this.theme.floorTexture
            });
            
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.position.set(
                room.x + room.width / 2,
                -0.1, // Slightly below zero to avoid z-fighting
                room.z + room.height / 2
            );
            
            floor.receiveShadow = true;
            this.object.add(floor);
            this.meshes.push(floor);
            
            // Add floor collider
            this.colliders.push({
                min: new THREE.Vector3(
                    room.x,
                    -0.2, // Below floor level to ensure solid collision
                    room.z
                ),
                max: new THREE.Vector3(
                    room.x + room.width,
                    0.01, // Slightly above floor level
                    room.z + room.height
                )
            });
        });
    }
    
    // Build walls using the WallBuilder
    buildWalls() {
        // Create wall builder
        this.wallBuilder = new WallBuilder(this);
        
        try {
            // Build all walls
            const result = this.wallBuilder.buildWalls();
            
            // Check if the result is valid
            if (result && Array.isArray(result.meshes)) {
                // Add wall meshes to the dungeon object
                result.meshes.forEach(mesh => {
                    if (mesh) {
                        this.object.add(mesh);
                        this.meshes.push(mesh);
                    }
                });
                
                // Add wall colliders to dungeon colliders if they exist
                if (Array.isArray(result.colliders)) {
                    this.colliders.push(...result.colliders);
                }
            } else {
                console.error("WallBuilder did not return valid meshes and colliders");
                // Create fallback walls - simple box around the entire dungeon
                this.createFallbackWalls();
            }
        } catch (error) {
            console.error("Error building walls:", error);
            // Create fallback walls if there's an error
            this.createFallbackWalls();
        }
    }
    
    // Add this new method to create fallback walls if regular wall building fails
    createFallbackWalls() {
        console.log("Creating fallback walls...");
        
        const size = this.size;
        const wallMaterial = new THREE.MeshLambertMaterial({
            color: this.theme.wallColor || 0x333333,
            map: this.theme.wallTexture
        });
        
        // Wall dimensions
        const wallHeight = 3;
        const wallThickness = 0.5;
        
        // Create outer walls for the entire dungeon
        // North wall
        const northWall = new THREE.BoxGeometry(size.width, wallHeight, wallThickness);
        const northWallMesh = new THREE.Mesh(northWall, wallMaterial);
        northWallMesh.position.set(size.width / 2, wallHeight / 2, -wallThickness / 2);
        this.object.add(northWallMesh);
        this.meshes.push(northWallMesh);
        
        // South wall
        const southWall = new THREE.BoxGeometry(size.width, wallHeight, wallThickness);
        const southWallMesh = new THREE.Mesh(southWall, wallMaterial);
        southWallMesh.position.set(size.width / 2, wallHeight / 2, size.height + wallThickness / 2);
        this.object.add(southWallMesh);
        this.meshes.push(southWallMesh);
        
        // East wall
        const eastWall = new THREE.BoxGeometry(wallThickness, wallHeight, size.height);
        const eastWallMesh = new THREE.Mesh(eastWall, wallMaterial);
        eastWallMesh.position.set(size.width + wallThickness / 2, wallHeight / 2, size.height / 2);
        this.object.add(eastWallMesh);
        this.meshes.push(eastWallMesh);
        
        // West wall
        const westWall = new THREE.BoxGeometry(wallThickness, wallHeight, size.height);
        const westWallMesh = new THREE.Mesh(westWall, wallMaterial);
        westWallMesh.position.set(-wallThickness / 2, wallHeight / 2, size.height / 2);
        this.object.add(westWallMesh);
        this.meshes.push(westWallMesh);
        
        // Add colliders for these walls
        this.colliders.push(
            // North wall collider
            {
                min: new THREE.Vector3(0, 0, -wallThickness),
                max: new THREE.Vector3(size.width, wallHeight, 0)
            },
            // South wall collider
            {
                min: new THREE.Vector3(0, 0, size.height),
                max: new THREE.Vector3(size.width, wallHeight, size.height + wallThickness)
            },
            // East wall collider
            {
                min: new THREE.Vector3(size.width, 0, 0),
                max: new THREE.Vector3(size.width + wallThickness, wallHeight, size.height)
            },
            // West wall collider
            {
                min: new THREE.Vector3(-wallThickness, 0, 0),
                max: new THREE.Vector3(0, wallHeight, size.height)
            }
        );
        
        console.log("Fallback walls created");
    }
    
    // Check if there's a passage in a given direction from a room
    hasPassageAt(room, direction) {
        if (!room) {
            console.error("Cannot check passage: room is undefined");
            return false;
        }
        
        // Expand room slightly to ensure we find connecting corridors
        const buffer = 1;
        
        try {
            // Make sure we have corridors to check
            if (!Array.isArray(this.corridors)) {
                console.error("Cannot check passages: corridors is not an array");
                return false;
            }
            
            // Check if any corridor or room overlaps with the edge
            for (const corridor of this.corridors) {
                // Skip the room itself
                if (corridor === room) continue;
                if (!corridor) continue; // Skip undefined corridors
                
                // Make sure corridor has all required properties
                if (typeof corridor.x !== 'number' || typeof corridor.z !== 'number' ||
                    typeof corridor.width !== 'number' || typeof corridor.height !== 'number') {
                    continue;
                }
                
                // Check if corridor connects to the room's edge
                switch (direction) {
                    case 'north':
                        if (corridor.z <= room.z && 
                            corridor.z + corridor.height >= room.z &&
                            corridor.x < room.x + room.width + buffer &&
                            corridor.x + corridor.width > room.x - buffer) {
                            return true;
                        }
                        break;
                    case 'south':
                        if (corridor.z <= room.z + room.height && 
                            corridor.z + corridor.height >= room.z + room.height &&
                            corridor.x < room.x + room.width + buffer &&
                            corridor.x + corridor.width > room.x - buffer) {
                            return true;
                        }
                        break;
                    case 'east':
                        if (corridor.x <= room.x + room.width && 
                            corridor.x + corridor.width >= room.x + room.width &&
                            corridor.z < room.z + room.height + buffer &&
                            corridor.z + corridor.height > room.z - buffer) {
                            return true;
                        }
                        break;
                    case 'west':
                        if (corridor.x <= room.x && 
                            corridor.x + corridor.width >= room.x &&
                            corridor.z < room.z + room.height + buffer &&
                            corridor.z + corridor.height > room.z - buffer) {
                            return true;
                        }
                        break;
                }
            }
            
            // Make sure we have rooms to check
            if (!Array.isArray(this.rooms)) {
                console.error("Cannot check passages: rooms is not an array");
                return false;
            }
            
            // Check for adjacent rooms too
            for (const otherRoom of this.rooms) {
                // Skip the room itself
                if (otherRoom === room) continue;
                if (!otherRoom) continue; // Skip undefined rooms
                
                // Make sure otherRoom has all required properties
                if (typeof otherRoom.x !== 'number' || typeof otherRoom.z !== 'number' ||
                    typeof otherRoom.width !== 'number' || typeof otherRoom.height !== 'number') {
                    continue;
                }
                
                // Check if room connects to the room's edge
                switch (direction) {
                    case 'north':
                        if (otherRoom.z + otherRoom.height >= room.z - buffer && 
                            otherRoom.z <= room.z &&
                            otherRoom.x < room.x + room.width + buffer &&
                            otherRoom.x + otherRoom.width > room.x - buffer) {
                            return true;
                        }
                        break;
                    case 'south':
                        if (otherRoom.z <= room.z + room.height + buffer && 
                            otherRoom.z + otherRoom.height >= room.z + room.height &&
                            otherRoom.x < room.x + room.width + buffer &&
                            otherRoom.x + otherRoom.width > room.x - buffer) {
                            return true;
                        }
                        break;
                    case 'east':
                        if (otherRoom.x <= room.x + room.width + buffer && 
                            otherRoom.x + otherRoom.width >= room.x + room.width &&
                            otherRoom.z < room.z + room.height + buffer &&
                            otherRoom.z + otherRoom.height > room.z - buffer) {
                            return true;
                        }
                        break;
                    case 'west':
                        if (otherRoom.x + otherRoom.width >= room.x - buffer && 
                            otherRoom.x <= room.x &&
                            otherRoom.z < room.z + room.height + buffer &&
                            otherRoom.z + otherRoom.height > room.z - buffer) {
                            return true;
                        }
                        break;
                }
            }
        } catch (error) {
            console.error("Error checking for passages:", error);
            return false; // Default to no passage if there's an error
        }
        
        return false;
    }
    
    // Find rooms connected to a corridor
    findConnectedRooms(corridor) {
        const connectedRooms = [];
        
        for (const room of this.rooms) {
            // Check if room overlaps with corridor
            const overlapX = Math.max(0, Math.min(room.x + room.width, corridor.x + corridor.width) - Math.max(room.x, corridor.x));
            const overlapZ = Math.max(0, Math.min(room.z + room.height, corridor.z + corridor.height) - Math.max(room.z, corridor.z));
            
            if (overlapX > 0 && overlapZ > 0) {
                connectedRooms.push(room);
            }
        }
        
        return connectedRooms;
    }
    
    // Build decorations
    buildDecorations() {
        // Create decoration meshes based on type
        this.decorations.forEach(decoration => {
            let mesh;
            
            switch (decoration.type) {
                case 'torch':
                    mesh = this.createTorchMesh();
                    break;
                case 'barrel':
                    mesh = this.createBarrelMesh();
                    break;
                case 'crate':
                    mesh = this.createCrateMesh();
                    break;
                case 'rock':
                default:
                    mesh = this.createRockMesh();
                    break;
            }
            
            if (mesh) {
                mesh.position.set(decoration.x, decoration.y, decoration.z);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                // Add some random rotation for variety
                mesh.rotation.y = Math.random() * Math.PI * 2;
                
                this.object.add(mesh);
                this.meshes.push(mesh);
            }
        });
    }
    
    // Create a torch mesh
    createTorchMesh() {
        const torchGroup = new THREE.Group();
        
        // Torch handle
        const handleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = 0.5;
        
        // Torch head
        const headGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.15;
        
        // Flame (just a simple cone for now)
        const flameGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
        const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.y = 1.5;
        
        // Add light source
        const light = new THREE.PointLight(0xff6600, 1, 10);
        light.position.y = 1.5;
        
        torchGroup.add(handle, head, flame, light);
        return torchGroup;
    }
    
    // Create a barrel mesh
    createBarrelMesh() {
        const barrelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 12);
        const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.y = 0.4;
        
        return barrel;
    }
    
    // Create a crate mesh
    createCrateMesh() {
        const crateGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const crateMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const crate = new THREE.Mesh(crateGeometry, crateMaterial);
        crate.position.y = 0.4;
        
        return crate;
    }
    
    // Create a rock mesh
    createRockMesh() {
        // Use an octahedron as a simple rock shape
        const rockGeometry = new THREE.OctahedronGeometry(0.5, 1);
        const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x777777 });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        // Scale randomly for variety
        const scale = 0.5 + Math.random() * 0.5;
        rock.scale.set(scale, scale * 0.7, scale);
        
        // Position rock so it sits on floor
        rock.position.y = scale * 0.35;
        
        return rock;
    }
    
    // Build key and exit meshes
    buildKeyAndExit() {
        // Create key mesh
        if (this.keyPosition) {
            const keyGeometry = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
            const keyMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xffcc00,
                emissive: 0xff8800,
                emissiveIntensity: 0.5
            });
            
            this.keyMesh = new THREE.Mesh(keyGeometry, keyMaterial);
            this.keyMesh.position.set(
                this.keyPosition.x,
                this.keyPosition.y,
                this.keyPosition.z
            );
            
            // Add a light to the key to make it stand out
            const keyLight = new THREE.PointLight(0xffcc00, 0.7, 5);
            keyLight.position.set(0, 0, 0);
            this.keyMesh.add(keyLight);
            
            // Add animation for the key
            this.keyMesh.userData.animation = {
                rotationSpeed: 0.01,
                floatSpeed: 0.5,
                floatHeight: 0.5,
                originalY: this.keyPosition.y
            };
            
            this.object.add(this.keyMesh);
            this.meshes.push(this.keyMesh);
        }
        
        // Create exit mesh
        if (this.exitPosition) {
            // Create exit portal
            const portalGeometry = new THREE.CircleGeometry(1.5, 32);
            const portalMaterial = new THREE.MeshBasicMaterial({ 
                color: this.keyCollected ? 0x00ff00 : 0xff0000,
                side: THREE.DoubleSide
            });
            
            this.exitMesh = new THREE.Mesh(portalGeometry, portalMaterial);
            this.exitMesh.position.set(
                this.exitPosition.x,
                this.exitPosition.y + 1.5,
                this.exitPosition.z
            );
            
            // Rotate portal to be vertical
            this.exitMesh.rotation.y = Math.PI / 2;
            
            // Add a light to the exit to make it stand out
            const exitLight = new THREE.PointLight(
                this.keyCollected ? 0x00ff00 : 0xff0000,
                1,
                8
            );
            exitLight.position.set(0, 0, 0);
            this.exitMesh.add(exitLight);
            
            this.object.add(this.exitMesh);
            this.meshes.push(this.exitMesh);
        }
    }
    
    // Update dungeon state
    update(deltaTime) {
        // Animate key if it exists and hasn't been collected
        if (this.keyMesh && !this.keyCollected) {
            const anim = this.keyMesh.userData.animation;
            
            // Rotate the key
            this.keyMesh.rotation.y += anim.rotationSpeed;
            
            // Make the key float up and down
            const floatOffset = Math.sin(Date.now() * 0.001 * anim.floatSpeed) * 0.2;
            this.keyMesh.position.y = anim.originalY + floatOffset;
        }
        
        // Update exit portal if key is collected
        if (this.exitMesh && this.keyCollected && this.exitMesh.material.color.getHex() !== 0x00ff00) {
            // Change portal color to green when key is collected
            this.exitMesh.material.color.setHex(0x00ff00);
            
            // Update exit light color
            if (this.exitMesh.children.length > 0 && this.exitMesh.children[0].isLight) {
                this.exitMesh.children[0].color.setHex(0x00ff00);
            }
        }
        
        // Update chests
        for (const chest of this.chests) {
            chest.update(deltaTime);
        }
    }
    
    // Get the main Three.js object for the dungeon
    getObject() {
        return this.object;
    }
    
    // Clean up resources when dungeon is no longer needed
    dispose() {
        // Dispose of geometries and materials
        this.meshes.forEach(mesh => {
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(material => material.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        
        // Clear arrays
        this.meshes = [];
        this.colliders = [];
    }
}
