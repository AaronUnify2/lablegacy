// src/dungeon/floor.js - Dungeon floor class

export class Dungeon {
    constructor(floorNumber, size, theme) {
        this.floorNumber = floorNumber;
        this.size = size;
        this.theme = theme;
        
        this.rooms = [];
        this.corridors = [];
        this.decorations = [];
        
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
        return this.playerSpawnPosition ? this.playerSpawnPosition : { x: 0, y: 0.5, z: 0 };
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
                room.floorHeight - 0.1, // Slightly below to avoid z-fighting
                room.z + room.height / 2
            );
            
            floor.receiveShadow = true;
            this.object.add(floor);
            this.meshes.push(floor);
        });
    }
    
    // Build wall meshes
    buildWalls() {
        this.colliders = [];
        
        // For each room, create four walls
        [...this.rooms, ...this.corridors].forEach(room => {
            // Skip corridors if they are part of a sloped connection
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
            
            // Calculate wall positions
            const northWallZ = room.z;
            const southWallZ = room.z + room.height;
            const westWallX = room.x;
            const eastWallX = room.x + room.width;
            const wallY = room.floorHeight + wallHeight / 2;
            
            const wallThickness = 0.5;
            
            // Check if there's a corridor or connected room in each direction
            // We'll need to check adjacency to avoid building walls where corridors connect
            
            // Check each neighboring position to see if there's a passage
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
        
        // Build ramps or stairs for elevation changes
        this.buildElevationConnectors();
    }
    
    // Build ramps or stairs to connect different elevations
    buildElevationConnectors() {
        // Find corridors that connect rooms at different heights
        this.corridors.forEach(corridor => {
            if (!corridor.isSloped) return;
            
            // Get connected rooms
            const connectedRooms = this.findConnectedRooms(corridor);
            if (connectedRooms.length !== 2) return;
            
            const [room1, room2] = connectedRooms;
            
            // Calculate slope
            const heightDifference = room2.floorHeight - room1.floorHeight;
            
            // Skip if no height difference (shouldn't happen for isSloped corridors)
            if (Math.abs(heightDifference) < 0.1) return;
            
            // Determine if corridor is horizontal or vertical
            const isHorizontal = corridor.width > corridor.height;
            
            // Create ramp geometry
            const rampLength = isHorizontal ? corridor.width : corridor.height;
            const rampWidth = isHorizontal ? corridor.height : corridor.width;
            const rampHeight = Math.abs(heightDifference);
            
            const rampGeometry = new THREE.BoxGeometry(
                isHorizontal ? rampLength : rampWidth,
                0.2, // Thickness
                isHorizontal ? rampWidth : rampLength
            );
            
            const rampMaterial = new THREE.MeshLambertMaterial({ 
                color: this.theme.floorColor || 0x555555,
                map: this.theme.floorTexture
            });
            
            const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
            
            // Position ramp
            ramp.position.set(
                corridor.x + corridor.width / 2,
                (room1.floorHeight + room2.floorHeight) / 2,
                corridor.z + corridor.height / 2
            );
            
            // Rotate to create slope
            if (isHorizontal) {
                // Rotate around Z axis for horizontal corridors
                ramp.rotation.z = Math.atan2(heightDifference, rampLength);
            } else {
                // Rotate around X axis for vertical corridors
                ramp.rotation.x = Math.atan2(-heightDifference, rampLength);
            }
            
            ramp.receiveShadow = true;
            this.object.add(ramp);
            this.meshes.push(ramp);
            
            // Add handrails/walls along sides of the ramp
            this.buildRampHandrails(corridor, room1.floorHeight, room2.floorHeight, isHorizontal);
        });
    }
    
    // Build handrails (walls) along the sides of ramps
    buildRampHandrails(corridor, startHeight, endHeight, isHorizontal) {
        const wallThickness = 0.5;
        const wallHeight = 1.5; // Lower than regular walls
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: this.theme.wallColor || 0x333333,
            map: this.theme.wallTexture 
        });
        
        // Calculate positions based on corridor orientation
        if (isHorizontal) {
            // For horizontal corridors, railings go on north and south sides
            const rampLength = corridor.width;
            const rampSlope = Math.atan2(endHeight - startHeight, rampLength);
            const avgHeight = (startHeight + endHeight) / 2;
            
            // North railing
            const northRailingGeometry = new THREE.BoxGeometry(
                rampLength,
                wallHeight * Math.cos(rampSlope), // Adjust height for slope
                wallThickness
            );
            const northRailing = new THREE.Mesh(northRailingGeometry, wallMaterial);
            
            northRailing.position.set(
                corridor.x + rampLength / 2,
                avgHeight + wallHeight / 2 * Math.cos(rampSlope),
                corridor.z + wallThickness / 2
            );
            
            northRailing.rotation.z = rampSlope;
            
            // South railing
            const southRailingGeometry = new THREE.BoxGeometry(
                rampLength,
                wallHeight * Math.cos(rampSlope),
                wallThickness
            );
            const southRailing = new THREE.Mesh(southRailingGeometry, wallMaterial);
            
            southRailing.position.set(
                corridor.x + rampLength / 2,
                avgHeight + wallHeight / 2 * Math.cos(rampSlope),
                corridor.z + corridor.height - wallThickness / 2
            );
            
            southRailing.rotation.z = rampSlope;
            
            // Add railings to scene
            this.object.add(northRailing);
            this.object.add(southRailing);
            this.meshes.push(northRailing, southRailing);
            
        } else {
            // For vertical corridors, railings go on east and west sides
            const rampLength = corridor.height;
            const rampSlope = Math.atan2(endHeight - startHeight, rampLength);
            const avgHeight = (startHeight + endHeight) / 2;
            
            // East railing
            const eastRailingGeometry = new THREE.BoxGeometry(
                wallThickness,
                wallHeight * Math.cos(rampSlope),
                rampLength
            );
            const eastRailing = new THREE.Mesh(eastRailingGeometry, wallMaterial);
            
            eastRailing.position.set(
                corridor.x + corridor.width - wallThickness / 2,
                avgHeight + wallHeight / 2 * Math.cos(rampSlope),
                corridor.z + rampLength / 2
            );
            
            eastRailing.rotation.x = -rampSlope;
            
            // West railing
            const westRailingGeometry = new THREE.BoxGeometry(
                wallThickness,
                wallHeight * Math.cos(rampSlope),
                rampLength
            );
            const westRailing = new THREE.Mesh(westRailingGeometry, wallMaterial);
            
            westRailing.position.set(
                corridor.x + wallThickness / 2,
                avgHeight + wallHeight / 2 * Math.cos(rampSlope),
                corridor.z + rampLength / 2
            );
            
            westRailing.rotation.x = -rampSlope;
            
            // Add railings to scene
            this.object.add(eastRailing);
            this.object.add(westRailing);
            this.meshes.push(eastRailing, westRailing);
        }
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
