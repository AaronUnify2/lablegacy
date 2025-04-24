// src/dungeon/floor.js - Dungeon floor class
import * as THREE from 'three';

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
    
    // Updated addChest method for Dungeon class (src/dungeon/floor.js)

// Add a chest to the dungeon - simplified version
addChest(chest) {
    // Add to the chest collection
    this.chests.push(chest);
    
    // Debug log
    console.log(`Adding chest to dungeon at position:`, chest.position);
    
    // Add chest object to dungeon's main object container
    const chestObject = chest.getObject();
    if (chestObject) {
        this.object.add(chestObject);
        console.log(`Successfully added chest object to dungeon`);
    }
}

// Find an interactable chest near the player
findInteractableChest(playerPosition) {
    console.log(`Checking for interactable chests near player at (${playerPosition.x.toFixed(2)}, ${playerPosition.z.toFixed(2)})`);
    
    // Log chests for debugging
    console.log(`Total chests in dungeon: ${this.chests.length}`);
    
    for (const chest of this.chests) {
        // Skip already opened chests
        if (chest.isOpen) {
            continue;
        }
        
        // Check if the chest can be interacted with
        if (chest.canInteract(playerPosition)) {
            console.log("Found interactable chest!");
            return chest;
        }
    }
    console.log("No interactable chests found");
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
        
        // Create walls
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
    
    // Build wall meshes
    buildWalls() {
        // For each room, create four walls
        [...this.rooms, ...this.corridors].forEach(room => {
            // Skip corridors if they are marked as sloped (shouldn't happen anymore, but just in case)
            if (room.isCorridor && room.isSloped) return;
            
            const wallHeight = 3; // Standard wall height
            const wallColor = this.theme.wallColor || 0x333333;
            const wallMaterial = new THREE.MeshLambertMaterial({ 
                color: wallColor,
                map: this.theme.wallTexture 
            });
            
            // Build walls around the perimeter of the room
            const buildWall = (x, y, z, width, height, depth, isHorizontal) => {
                const wallGeometry = new THREE.BoxGeometry(width, height, depth);
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                
                wall.position.set(x, y, z);
                wall.castShadow = true;
                wall.receiveShadow = true;
                
                this.object.add(wall);
                this.meshes.push(wall);
                
                // Add collider for the wall
                this.colliders.push({
                    min: new THREE.Vector3(
                        x - width / 2,
                        y - height / 2,
                        z - depth / 2
                    ),
                    max: new THREE.Vector3(
                        x + width / 2,
                        y + height / 2,
                        z + depth / 2
                    )
                });
            };
            
            // Calculate wall positions - y is always 0 for a flat dungeon
            const floorHeight = 0;
            const northWallZ = room.z;
            const southWallZ = room.z + room.height;
            const westWallX = room.x;
            const eastWallX = room.x + room.width;
            const wallY = floorHeight + wallHeight / 2;
            
            const wallThickness = 0.5;
            
            // Check if there's a corridor or connected room in each direction
            const hasNorthPassage = this.hasPassageAt(room, 'north');
            const hasSouthPassage = this.hasPassageAt(room, 'south');
            const hasEastPassage = this.hasPassageAt(room, 'east');
            const hasWestPassage = this.hasPassageAt(room, 'west');
            
            // Build walls where there's no passage
            // North wall
            if (!hasNorthPassage) {
                buildWall(
                    room.x + room.width / 2, // Center of wall
                    wallY,
                    northWallZ + wallThickness / 2,
                    room.width + wallThickness, // Extend slightly beyond room
                    wallHeight,
                    wallThickness,
                    true
                );
            }
            
            // South wall
            if (!hasSouthPassage) {
                buildWall(
                    room.x + room.width / 2,
                    wallY,
                    southWallZ - wallThickness / 2,
                    room.width + wallThickness,
                    wallHeight,
                    wallThickness,
                    true
                );
            }
            
            // East wall
            if (!hasEastPassage) {
                buildWall(
                    eastWallX - wallThickness / 2,
                    wallY,
                    room.z + room.height / 2,
                    wallThickness,
                    wallHeight,
                    room.height + wallThickness,
                    false
                );
            }
            
            // West wall
            if (!hasWestPassage) {
                buildWall(
                    westWallX + wallThickness / 2,
                    wallY,
                    room.z + room.height / 2,
                    wallThickness,
                    wallHeight,
                    room.height + wallThickness,
                    false
                );
            }
        });
    }
    
    // Check if there's a passage in a given direction from a room
    hasPassageAt(room, direction) {
        // Expand room slightly to ensure we find connecting corridors
        const buffer = 1;
        
        // Check if any corridor or room overlaps with the edge
        for (const corridor of this.corridors) {
            // Skip the room itself
            if (corridor === room) continue;
            
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
        
        // Check for adjacent rooms too
        for (const otherRoom of this.rooms) {
            // Skip the room itself
            if (otherRoom === room) continue;
            
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
