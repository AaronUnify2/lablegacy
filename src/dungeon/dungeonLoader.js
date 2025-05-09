// src/dungeon/dungeonLoader.js - Sequential and stable dungeon generation system

import * as THREE from 'three';
import { Dungeon } from './floor.js';
import { Room } from './room.js';
import { getDungeonTheme } from './themes.js';
import { addToScene, removeFromScene } from '../engine/renderer.js';
import { loadingScreen } from '../game/loadingScreen.js';
import { spawnChestsInDungeon } from '../entities/items/chestSpawner.js';

// DungeonLoader class handles the step-by-step dungeon generation process
export class DungeonLoader {
    constructor(game) {
        this.game = game;
        this.currentFloor = 1;
        this.currentDungeon = null;
        this.isGenerating = false;
        this.errorMessages = [];
        
        // Step completion flags
        this.steps = {
            initialized: false,
            oldDungeonRemoved: false,
            themeSelected: false,
            roomsGenerated: false,
            keyExitPlaced: false,
            playerSpawnSet: false,
            meshesBuilt: false,
            chestsSpawned: false,
            enemiesSpawned: false,
            completed: false
        };
        
        // Generation data
        this.size = null;
        this.theme = null;
        this.centerRoom = null;
    }
    
    // Start the dungeon generation process
    generateDungeon(floorNumber) {
        // Prevent multiple generation processes
        if (this.isGenerating) {
            console.warn("Dungeon generation already in progress");
            return false;
        }
        
        // Reset the state
        this.resetState();
        this.currentFloor = floorNumber;
        this.isGenerating = true;
        
        console.log(`Starting sequential dungeon generation for floor ${floorNumber}`);
        loadingScreen.show(`Preparing Floor ${floorNumber}...`);
        loadingScreen.updateProgress(5);
        
        // Begin the generation sequence
        this.executeNextStep();
        
        return true;
    }
    
    // Reset all state variables for a new generation
    resetState() {
        this.errorMessages = [];
        this.isGenerating = false;
        
        // Reset all step completion flags
        Object.keys(this.steps).forEach(key => {
            this.steps[key] = false;
        });
        
        // Reset generation data
        this.size = null;
        this.theme = null;
        this.centerRoom = null;
    }
    
    // Main function to determine and execute the next step in sequence
    executeNextStep() {
        try {
            // If we encounter any errors, stop generation
            if (this.errorMessages.length > 0) {
                this.handleGenerationFailure();
                return;
            }
            
            // Execute steps in order
            if (!this.steps.initialized) {
                this.initializeGeneration();
            } else if (!this.steps.oldDungeonRemoved) {
                this.removeOldDungeon();
            } else if (!this.steps.themeSelected) {
                this.selectTheme();
            } else if (!this.steps.roomsGenerated) {
                this.generateRooms();
            } else if (!this.steps.keyExitPlaced) {
                this.placeKeyAndExit();
            } else if (!this.steps.playerSpawnSet) {
                this.setPlayerSpawn();
            } else if (!this.steps.meshesBuilt) {
                this.buildMeshes();
            } else if (!this.steps.chestsSpawned) {
                this.spawnChests();
            } else if (!this.steps.enemiesSpawned) {
                this.spawnEnemies();
            } else if (!this.steps.completed) {
                this.finalizeGeneration();
            }
        } catch (error) {
            console.error(`Error in dungeon generation step: ${error.message}`, error);
            this.errorMessages.push(`Generation error: ${error.message}`);
            this.handleGenerationFailure();
        }
    }
    
    // STEP 1: Initialize the generation process
    initializeGeneration() {
        console.log(`[Step 1/10] Initializing dungeon generation for floor ${this.currentFloor}`);
        loadingScreen.setMessage(`Initializing Floor ${this.currentFloor}...`);
        loadingScreen.updateProgress(10);
        
        try {
            // Determine dungeon size based on floor number
            this.size = this.determineDungeonSize(this.currentFloor);
            
            // Create empty dungeon instance
            this.currentDungeon = new Dungeon(this.currentFloor, this.size, null); // Theme will be set later
            
            // Mark step as complete
            this.steps.initialized = true;
            console.log("Dungeon initialization successful");
            
            // Continue to next step
            this.executeNextStep();
        } catch (error) {
            console.error("Error initializing dungeon:", error);
            this.errorMessages.push(`Initialization error: ${error.message}`);
            this.handleGenerationFailure();
        }
    }
    
    // STEP 2: Remove old dungeon if it exists
    removeOldDungeon() {
        console.log("[Step 2/10] Removing old dungeon");
        loadingScreen.setMessage("Clearing previous floor...");
        loadingScreen.updateProgress(15);
        
        try {
            // Remove old dungeon if it exists
            if (this.game.currentDungeon) {
                this.game.currentDungeon.dispose();
                removeFromScene(this.game.currentDungeon.getObject());
                console.log("Old dungeon removed successfully");
            }
            
            // Clean up projectiles
            this.game.projectileSystem.clear();
            
            // Clean up player projectiles
            if (this.game.player) {
                this.game.player.cleanupProjectiles(this.game.scene);
            }
            
            // Clear enemies
            this.game.enemySpawner.clearEnemies(this.game.scene);
            
            // Clear entities list
            this.game.entities = [];
            
            // Mark step as complete
            this.steps.oldDungeonRemoved = true;
            
            // Continue to next step
            this.executeNextStep();
        } catch (error) {
            console.error("Error removing old dungeon:", error);
            this.errorMessages.push(`Cleanup error: ${error.message}`);
            this.handleGenerationFailure();
        }
    }
    
    // STEP 3: Select and apply dungeon theme
    selectTheme() {
        console.log("[Step 3/10] Selecting dungeon theme");
        loadingScreen.setMessage("Selecting theme...");
        loadingScreen.updateProgress(20);
        
        try {
            // Get theme for this floor
            this.theme = getDungeonTheme(this.currentFloor);
            
            if (!this.theme) {
                throw new Error("Failed to get dungeon theme");
            }
            
            // Apply theme to dungeon
            this.currentDungeon.theme = this.theme;
            
            // Mark step as complete
            this.steps.themeSelected = true;
            console.log(`Applied theme: ${this.theme.name}`);
            
            // Continue to next step
            this.executeNextStep();
        } catch (error) {
            console.error("Error selecting theme:", error);
            this.errorMessages.push(`Theme error: ${error.message}`);
            this.handleGenerationFailure();
        }
    }
    
    // STEP 4: Generate rooms
    generateRooms() {
        console.log("[Step 4/10] Generating rooms");
        loadingScreen.setMessage("Generating rooms and corridors...");
        loadingScreen.updateProgress(30);
        
        try {
            // Generate rooms using radial pattern
            this.centerRoom = this.generateRadialRooms();
            
            // Validate room generation
            if (!this.centerRoom || !this.currentDungeon.rooms || this.currentDungeon.rooms.length === 0) {
                throw new Error("Room generation failed - no rooms created");
            }
            
            // Set all rooms to a flat height of 0
            this.setFlatRoomHeights();
            
            // Add alcoves to room edges
            this.addAlcovesToRooms();
            
            // Mark step as complete
            this.steps.roomsGenerated = true;
            console.log(`Generated ${this.currentDungeon.rooms.length} rooms and ${this.currentDungeon.corridors.length} corridors`);
            
            // Continue to next step
            this.executeNextStep();
        } catch (error) {
            console.error("Error generating rooms:", error);
            this.errorMessages.push(`Room generation error: ${error.message}`);
            this.handleGenerationFailure();
        }
    }
    
    // STEP 5: Place key and exit
    placeKeyAndExit() {
        console.log("[Step 5/10] Placing key and exit");
        loadingScreen.setMessage("Placing key and exit...");
        loadingScreen.updateProgress(40);
        
        try {
            const rooms = this.currentDungeon.getRooms();
            
            // Need at least 2 rooms
            if (rooms.length < 2) {
                throw new Error("Not enough rooms to place key and exit");
            }
            
            // Find rooms by type
            const spawnRoom = rooms.find(room => room.isSpawnRoom);
            const radialRooms = rooms.filter(room => room.roomType === 'radial');
            const cardinalRooms = rooms.filter(room => room.roomType === 'cardinal');
            const cardinalPlusRooms = rooms.filter(room => room.roomType === 'cardinalPlus');
            const alcoveRooms = rooms.filter(room => room.roomType === 'alcove');
            
            let keyRoom, exitRoom;
            
            // Choose rooms for key and exit using the same strategy as before
            // but with better error handling
            if (alcoveRooms.length >= 1 && Math.random() < 0.3) {
                keyRoom = alcoveRooms[Math.floor(Math.random() * alcoveRooms.length)];
                const potentialExitRooms = [...cardinalPlusRooms, ...cardinalRooms, ...radialRooms].filter(room => room !== keyRoom);
                
                if (potentialExitRooms.length > 0) {
                    exitRoom = this.findFarthestRoom(keyRoom, potentialExitRooms);
                } else {
                    const otherRooms = rooms.filter(room => room !== keyRoom && room !== spawnRoom && room.roomType !== 'alcove');
                    exitRoom = this.findFarthestRoom(keyRoom, otherRooms);
                }
            } else if (cardinalPlusRooms.length >= 1) {
                keyRoom = cardinalPlusRooms[Math.floor(Math.random() * cardinalPlusRooms.length)];
                const potentialExitRooms = [...cardinalPlusRooms, ...cardinalRooms, ...radialRooms].filter(room => room !== keyRoom);
                
                if (potentialExitRooms.length > 0) {
                    exitRoom = this.findFarthestRoom(keyRoom, potentialExitRooms);
                } else {
                    const otherRooms = rooms.filter(room => room !== keyRoom && room !== spawnRoom);
                    exitRoom = this.findFarthestRoom(keyRoom, otherRooms);
                }
            } else if (cardinalRooms.length >= 1) {
                keyRoom = cardinalRooms[Math.floor(Math.random() * cardinalRooms.length)];
                const potentialExitRooms = [...cardinalRooms, ...radialRooms].filter(room => room !== keyRoom);
                
                if (potentialExitRooms.length > 0) {
                    exitRoom = this.findFarthestRoom(keyRoom, potentialExitRooms);
                } else {
                    const otherRooms = rooms.filter(room => room !== keyRoom && room !== spawnRoom);
                    exitRoom = this.findFarthestRoom(keyRoom, otherRooms);
                }
            } else if (radialRooms.length >= 2) {
                keyRoom = radialRooms[Math.floor(Math.random() * radialRooms.length)];
                const otherRadialRooms = radialRooms.filter(room => room !== keyRoom);
                exitRoom = this.findFarthestRoom(keyRoom, otherRadialRooms);
            } else {
                // Fall back to finding two rooms that are far apart
                const roomsExcludingSpawn = rooms.filter(room => room !== spawnRoom);
                
                if (roomsExcludingSpawn.length >= 2) {
                    let maxDistance = 0;
                    let farthestRoomPair = [roomsExcludingSpawn[0], roomsExcludingSpawn[1]];
                    
                    for (let i = 0; i < roomsExcludingSpawn.length; i++) {
                        for (let j = i + 1; j < roomsExcludingSpawn.length; j++) {
                            const distance = this.calculateDistance(roomsExcludingSpawn[i], roomsExcludingSpawn[j]);
                            
                            if (distance > maxDistance) {
                                maxDistance = distance;
                                farthestRoomPair = [roomsExcludingSpawn[i], roomsExcludingSpawn[j]];
                            }
                        }
                    }
                    
                    keyRoom = farthestRoomPair[0];
                    exitRoom = farthestRoomPair[1];
                } else {
                    throw new Error("Not enough rooms to place key and exit");
                }
            }
            
            // Ensure we have valid rooms
            if (!keyRoom || !exitRoom) {
                throw new Error("Failed to select rooms for key and exit");
            }
            
            // Place key in center of key room
            this.currentDungeon.placeKey(
                keyRoom.x + keyRoom.width / 2,
                keyRoom.floorHeight + 1, // Float above floor
                keyRoom.z + keyRoom.height / 2
            );
            
            // Place exit in center of exit room
            this.currentDungeon.placeExit(
                exitRoom.x + exitRoom.width / 2,
                exitRoom.floorHeight, // At floor level
                exitRoom.z + exitRoom.height / 2
            );
            
            // Mark step as complete
            this.steps.keyExitPlaced = true;
            console.log("Key and exit placed successfully");
            
            // Continue to next step
            this.executeNextStep();
        } catch (error) {
            console.error("Error placing key and exit:", error);
            this.errorMessages.push(`Key/exit placement error: ${error.message}`);
            this.handleGenerationFailure();
        }
    }
    
    // STEP 6: Set player spawn position
    setPlayerSpawn() {
        console.log("[Step 6/10] Setting player spawn position");
        loadingScreen.setMessage("Setting player starting position...");
        loadingScreen.updateProgress(50);
        
        try {
            // Get center room for spawn
            if (!this.centerRoom) {
                throw new Error("Center room not found for player spawn");
            }
            
            // Get center position of center room
            const spawnPosition = this.centerRoom.getCenter();
            
            // Set spawn position in dungeon
            this.currentDungeon.setPlayerSpawnPosition(
                spawnPosition.x,
                spawnPosition.y + 1, // Slightly above floor
                spawnPosition.z
            );
            
            // Mark step as complete
            this.steps.playerSpawnSet = true;
            console.log(`Player spawn set at: (${spawnPosition.x}, ${spawnPosition.y + 1}, ${spawnPosition.z})`);
            
            // Continue to next step
            this.executeNextStep();
        } catch (error) {
            console.error("Error setting player spawn:", error);
            this.errorMessages.push(`Spawn position error: ${error.message}`);
            this.handleGenerationFailure();
        }
    }
    
    // STEP 7: Build all meshes
    buildMeshes() {
        console.log("[Step 7/10] Building dungeon meshes");
        loadingScreen.setMessage("Building dungeon structures...");
        loadingScreen.updateProgress(60);
        
        try {
            // Build the dungeon mesh
            this.currentDungeon.buildMesh();
            
            // Add dungeon to scene
            addToScene(this.currentDungeon.getObject());
            
            // Validate mesh building
            if (!this.currentDungeon.object || !this.currentDungeon.colliders || this.currentDungeon.colliders.length === 0) {
                throw new Error("Dungeon mesh building failed - no colliders created");
            }
            
            // Mark step as complete
            this.steps.meshesBuilt = true;
            console.log("Dungeon meshes built successfully");
            
            // Continue to next step
            this.executeNextStep();
        } catch (error) {
            console.error("Error building meshes:", error);
            this.errorMessages.push(`Mesh building error: ${error.message}`);
            this.handleGenerationFailure();
        }
    }
    
    // STEP 8: Spawn chests
    spawnChests() {
        console.log("[Step 8/10] Spawning treasure chests");
        loadingScreen.setMessage("Adding treasure chests...");
        loadingScreen.updateProgress(70);
        
        try {
            // Use the spawnChestsInDungeon function with skipTimers=true for deterministic operation
            const chests = spawnChestsInDungeon(this.currentDungeon, true);
            
            console.log(`Spawned ${chests.length} chests successfully`);
            
            // Mark step as complete
            this.steps.chestsSpawned = true;
            
            // Continue to next step
            this.executeNextStep();
        } catch (error) {
            console.error("Error spawning chests:", error);
            this.errorMessages.push(`Chest spawning error: ${error.message}`);
            // Continue anyway - chests are not critical
            this.steps.chestsSpawned = true;
            this.executeNextStep();
        }
    }
    
    // STEP 9: Spawn enemies
    spawnEnemies() {
        console.log("[Step 9/10] Spawning enemies");
        loadingScreen.setMessage("Spawning enemies...");
        loadingScreen.updateProgress(85);
        
        try {
            // Initialize enemy spawner with current floor
            this.game.enemySpawner.init(this.currentFloor);
            
            // Spawn enemies directly without timers
            this.game.enemySpawner.spawnEnemiesInDungeon(this.currentDungeon, this.game.scene);
            
            const enemyCount = this.game.enemySpawner.getEnemies().length;
            console.log(`Spawned ${enemyCount} enemies successfully`);
            
            // Mark step as complete
            this.steps.enemiesSpawned = true;
            
            // Continue to next step
            this.executeNextStep();
        } catch (error) {
            console.error("Error spawning enemies:", error);
            this.errorMessages.push(`Enemy spawning error: ${error.message}`);
            // Continue anyway - enemies are not critical
            this.steps.enemiesSpawned = true;
            this.executeNextStep();
        }
    }
    
    // STEP 10: Finalize dungeon generation
    finalizeGeneration() {
        console.log("[Step 10/10] Finalizing dungeon generation");
        loadingScreen.setMessage("Finalizing floor...");
        loadingScreen.updateProgress(95);
        
        try {
            // Set the dungeon in the game
            this.game.currentDungeon = this.currentDungeon;
            
            // Get player spawn position from dungeon
            const spawnPosition = this.currentDungeon.getPlayerSpawnPosition();
            this.game.player.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);
            
            // Update UI
            document.getElementById('floor-number').textContent = this.currentFloor;
            
            // Update camera to focus on player's new position
            this.game.camera.position.copy(this.game.player.getPosition());
            this.game.camera.position.y += 8;
            this.game.camera.position.z += 10;
            this.game.camera.lookAt(this.game.player.getPosition());
            
            // Mark generation as complete
            this.steps.completed = true;
            this.isGenerating = false;
            
            console.log(`Floor ${this.currentFloor} generation completed successfully`);
            loadingScreen.updateProgress(100);
            
            // Add callback to change game state after loading screen is hidden
            loadingScreen.addCallback(() => {
                // Show floor transition message
                if (window.showMessage) {
                    window.showMessage(`Entered Floor ${this.currentFloor}`, 3000);
                }
                
                // Set game state back to playing
                this.game.state = this.game.GameState.PLAYING;
            });
        } catch (error) {
            console.error("Error finalizing dungeon:", error);
            this.errorMessages.push(`Finalization error: ${error.message}`);
            this.handleGenerationFailure();
        }
    }
    
    // Handle generation failure
    handleGenerationFailure() {
        console.error("Dungeon generation failed");
        
        // Prepare error message for display
        let errorMessage = "Failed to generate dungeon:";
        if (this.errorMessages.length > 0) {
            errorMessage += "\n- " + this.errorMessages.join("\n- ");
        }
        
        // Update loading screen
        loadingScreen.setMessage("Generation failed! Please restart the game.");
        
        // Show user-friendly error message
        alert(errorMessage);
        
        // Reset state
        this.isGenerating = false;
        
        // Add callback to reset game state after loading screen is hidden
        loadingScreen.addCallback(() => {
            // Try to recover by setting game state back to playing with empty dungeon
            this.game.state = this.game.GameState.PLAYING;
        });
    }
    
    // HELPER FUNCTIONS
    
    // Determine dungeon size based on floor number (same logic as original)
    determineDungeonSize(floorNumber) {
        if (floorNumber <= 3) {
            return {
                roomCount: 5 + Math.floor(Math.random() * 3), // 5-7 rooms
                width: 200,
                height: 200
            };
        } else if (floorNumber <= 7) {
            return {
                roomCount: 8 + Math.floor(Math.random() * 4), // 8-11 rooms
                width: 280,
                height: 280
            };
        } else {
            return {
                roomCount: 12 + Math.floor(Math.random() * 9), // 12-20 rooms
                width: 400,
                height: 400
            };
        }
    }
    
    // Generate rooms using radial pattern (adapted from original code)
    generateRadialRooms() {
        const centerX = this.size.width / 2;
        const centerZ = this.size.height / 2;
        
        // Room size ranges
        const centerRoomSize = {
            width: 30,
            height: 30
        };
        
        const radialRoomSize = {
            minWidth: 20,
            maxWidth: 40,
            minHeight: 20,
            maxHeight: 40
        };
        
        const cardinalRoomSize = {
            minWidth: 25,
            maxWidth: 45,
            minHeight: 25,
            maxHeight: 45
        };
        
        const cardinalPlusRoomSize = {
            minWidth: 30,
            maxWidth: 60,
            minHeight: 30,
            maxHeight: 60
        };
        
        // Corridor sizes
        const corridorWidth = 6;
        
        // Spacing between rooms
        const roomSpacing = 16;
        
        // Create center room
        const centerRoom = new Room(
            centerX - centerRoomSize.width / 2,
            0, // Height is now always 0
            centerZ - centerRoomSize.height / 2,
            centerRoomSize.width,
            centerRoomSize.height
        );
        
        // Set this as the spawn room
        centerRoom.isSpawnRoom = true;
        this.currentDungeon.addRoom(centerRoom);
        
        // Define the positions for the radial rooms
        const roomPositions = {
            // Radial rooms
            north: {
                dirX: 0,
                dirZ: -1,
                angle: 0,
                isRadial: true,
                connected: false,
                room: null
            },
            east: {
                dirX: 1,
                dirZ: 0,
                angle: Math.PI / 2,
                isRadial: true,
                connected: false,
                room: null
            },
            south: {
                dirX: 0,
                dirZ: 1,
                angle: Math.PI,
                isRadial: true,
                connected: false,
                room: null
            },
            west: {
                dirX: -1,
                dirZ: 0,
                angle: Math.PI * 3 / 2,
                isRadial: true,
                connected: false,
                room: null
            },
            
            // Cardinal rooms
            northeast: {
                dirX: 1,
                dirZ: -1,
                angle: Math.PI / 4,
                isRadial: false,
                connectedTo: 'north',
                connected: false,
                room: null
            },
            southeast: {
                dirX: 1,
                dirZ: 1,
                angle: Math.PI * 3 / 4,
                isRadial: false,
                connectedTo: 'east',
                connected: false,
                room: null
            },
            southwest: {
                dirX: -1,
                dirZ: 1,
                angle: Math.PI * 5 / 4,
                isRadial: false,
                connectedTo: 'south',
                connected: false,
                room: null
            },
            northwest: {
                dirX: -1,
                dirZ: -1,
                angle: Math.PI * 7 / 4,
                isRadial: false,
                connectedTo: 'west',
                connected: false,
                room: null
            },
            
            // Cardinal Plus rooms
            northPlus: {
                dirX: 0,
                dirZ: -2,
                angle: 0,
                isRadial: false,
                isCardinalPlus: true,
                connectedTo: 'north',
                connected: false,
                room: null
            },
            eastPlus: {
                dirX: 2,
                dirZ: 0,
                angle: Math.PI / 2,
                isRadial: false,
                isCardinalPlus: true,
                connectedTo: 'east',
                connected: false,
                room: null
            },
            southPlus: {
                dirX: 0,
                dirZ: 2,
                angle: Math.PI,
                isRadial: false,
                isCardinalPlus: true,
                connectedTo: 'south',
                connected: false,
                room: null
            },
            westPlus: {
                dirX: -2,
                dirZ: 0,
                angle: Math.PI * 3 / 2,
                isRadial: false,
                isCardinalPlus: true,
                connectedTo: 'west',
                connected: false,
                room: null
            }
        };
        
        // Create and place rooms
        for (const [name, position] of Object.entries(roomPositions)) {
            // For radial rooms, 80% chance of spawning
            // For cardinal rooms, 50% chance of spawning if the connected radial room exists
            // For cardinalPlus rooms, 40% chance of spawning if the connected radial room exists
            let shouldSpawn = false;
            
            if (position.isRadial) {
                shouldSpawn = Math.random() < 0.8; // 80% chance for radial rooms
            } else if (position.isCardinalPlus) {
                // Check if the connected radial room exists
                const connectedRadialRoom = roomPositions[position.connectedTo].room;
                shouldSpawn = connectedRadialRoom && Math.random() < 0.4; // 40% chance if connected radial exists
            } else {
                // Check if the connected radial room exists
                const connectedRadialRoom = roomPositions[position.connectedTo].room;
                shouldSpawn = connectedRadialRoom && Math.random() < 0.5; // 50% chance if connected radial exists
            }
            
            if (!shouldSpawn) continue;
            
            // Determine room size
            let sizeTemplate;
            if (position.isRadial) {
                sizeTemplate = radialRoomSize;
            } else if (position.isCardinalPlus) {
                sizeTemplate = cardinalPlusRoomSize;
            } else {
                sizeTemplate = cardinalRoomSize;
            }
            
            const roomWidth = Math.floor(sizeTemplate.minWidth + Math.random() * (sizeTemplate.maxWidth - sizeTemplate.minWidth));
            const roomHeight = Math.floor(sizeTemplate.minHeight + Math.random() * (sizeTemplate.maxHeight - sizeTemplate.minHeight));
            
            // Calculate room position based on direction and distance from center
            let roomDistance;
            if (position.isRadial) {
                roomDistance = centerRoomSize.width / 2 + roomSpacing + roomWidth / 2;
            } else if (position.isCardinalPlus) {
                roomDistance = centerRoomSize.width / 2 + roomSpacing * 3 + roomWidth / 2; // Even further out
            } else {
                roomDistance = centerRoomSize.width / 2 + roomSpacing * 2 + roomWidth / 2;
            }
            
            const roomX = centerX + position.dirX * roomDistance - roomWidth / 2;
            const roomZ = centerZ + position.dirZ * roomDistance - roomHeight / 2;
            
            // Create room
            const room = new Room(roomX, 0, roomZ, roomWidth, roomHeight);
            room.roomType = position.isRadial ? 'radial' : (position.isCardinalPlus ? 'cardinalPlus' : 'cardinal');
            this.currentDungeon.addRoom(room);
            
            // Store room in position data
            position.room = room;
            
            // Connect room to center room or its connected radial room
            if (position.isRadial) {
                // Connect radial room to center room
                this.connectRoomsWithCorridor(centerRoom, room);
                position.connected = true;
            } else {
                // Connect cardinal or cardinalPlus room to its radial room
                const connectedRadialRoom = roomPositions[position.connectedTo].room;
                if (connectedRadialRoom) {
                    this.connectRoomsWithCorridor(connectedRadialRoom, room);
                    position.connected = true;
                }
            }
        }
        
        // Make sure we have at least one radial room
        const hasAnyRadialRoom = Object.values(roomPositions).some(p => p.isRadial && p.connected);
        
        if (!hasAnyRadialRoom) {
            // Force create a random radial room
            const radialPositions = ['north', 'east', 'south', 'west'];
            const randomRadial = radialPositions[Math.floor(Math.random() * radialPositions.length)];
            const position = roomPositions[randomRadial];
            
            // Determine room size
            const roomWidth = Math.floor(radialRoomSize.minWidth + Math.random() * (radialRoomSize.maxWidth - radialRoomSize.minWidth));
            const roomHeight = Math.floor(radialRoomSize.minHeight + Math.random() * (radialRoomSize.maxHeight - radialRoomSize.minHeight));
            
            // Calculate room position
            const roomDistance = centerRoomSize.width / 2 + roomSpacing + roomWidth / 2;
            const roomX = centerX + position.dirX * roomDistance - roomWidth / 2;
            const roomZ = centerZ + position.dirZ * roomDistance - roomHeight / 2;
            
            // Create room
            const room = new Room(roomX, 0, roomZ, roomWidth, roomHeight);
            room.roomType = 'radial';
            this.currentDungeon.addRoom(room);
            
            // Store room in position data
            position.room = room;
            
            // Connect room to center room
            this.connectRoomsWithCorridor(centerRoom, room);
            position.connected = true;
        }
        
        return centerRoom;
    }
    
    // Set all rooms to a flat height
    setFlatRoomHeights() {
        const rooms = this.currentDungeon.getRooms();
        const corridors = this.currentDungeon.corridors;
        
        // Set all rooms to a height of 0
        rooms.forEach(room => {
            room.setFloorHeight(0);
        });
        
        // Set all corridors to a height of 0
        corridors.forEach(corridor => {
            corridor.setFloorHeight(0);
            corridor.isSloped = false; // Make sure no corridors are sloped
        });
    }
    
    // Add alcoves to room edges
    addAlcovesToRooms() {
        const rooms = this.currentDungeon.getRooms();
        
        for (const room of rooms) {
            // Skip corridors
            if (room.isCorridor) continue;
            
            // For each room, check all four sides
            const sides = ['north', 'east', 'south', 'west'];
            
            for (const side of sides) {
                // 70% chance to add an alcove if there's no passage on this side
                if (!this.currentDungeon.hasPassageAt(room, side) && Math.random() < 0.7) {
                    // Determine alcove dimensions
                    const longestEdge = Math.max(room.width, room.height);
                    const alcoveLength = Math.floor(longestEdge * (0.4 + Math.random() * 0.4)); // 40-80% of longest edge
                    const alcoveWidth = Math.floor(longestEdge * (0.2 + Math.random() * 0.1));  // 20-30% of longest edge
                    
                    // Calculate alcove position based on the side of the room
                    let alcoveX, alcoveZ, alcoveWidth2, alcoveHeight2;
                    
                    switch (side) {
                        case 'north':
                            // Alcove extends from north side
                            alcoveWidth2 = alcoveLength;
                            alcoveHeight2 = alcoveWidth;
                            // Random position along north wall, ensuring alcove doesn't extend past room width
                            alcoveX = room.x + Math.max(0, Math.min(room.width - alcoveWidth2, Math.floor(Math.random() * (room.width - alcoveWidth2))));
                            alcoveZ = room.z - alcoveHeight2;
                            break;
                        case 'east':
                            // Alcove extends from east side
                            alcoveWidth2 = alcoveWidth;
                            alcoveHeight2 = alcoveLength;
                            alcoveX = room.x + room.width;
                            // Random position along east wall, ensuring alcove doesn't extend past room height
                            alcoveZ = room.z + Math.max(0, Math.min(room.height - alcoveHeight2, Math.floor(Math.random() * (room.height - alcoveHeight2))));
                            break;
                        case 'south':
                            // Alcove extends from south side
                            alcoveWidth2 = alcoveLength;
                            alcoveHeight2 = alcoveWidth;
                            // Random position along south wall, ensuring alcove doesn't extend past room width
                            alcoveX = room.x + Math.max(0, Math.min(room.width - alcoveWidth2, Math.floor(Math.random() * (room.width - alcoveWidth2))));
                            alcoveZ = room.z + room.height;
                            break;
                        case 'west':
                            // Alcove extends from west side
                            alcoveWidth2 = alcoveWidth;
                            alcoveHeight2 = alcoveLength;
                            alcoveX = room.x - alcoveWidth2;
                            // Random position along west wall, ensuring alcove doesn't extend past room height
                            alcoveZ = room.z + Math.max(0, Math.min(room.height - alcoveHeight2, Math.floor(Math.random() * (room.height - alcoveHeight2))));
                            break;
                    }
                    
                    // Create alcove as a small room
                    const alcove = new Room(alcoveX, 0, alcoveZ, alcoveWidth2, alcoveHeight2);
                    alcove.roomType = 'alcove';
                    this.currentDungeon.addRoom(alcove);
                    
                    // Create a corridor to connect the alcove to the main room (very short one)
                    this.connectRoomsWithCorridor(room, alcove, true);
                }
            }
        }
    }
    
    // Helper function to connect two rooms with a corridor
    connectRoomsWithCorridor(room1, room2, isAlcoveConnection = false) {
        // Get center points of rooms
        const center1 = {
            x: room1.x + room1.width / 2,
            z: room1.z + room1.height / 2
        };
        
        const center2 = {
            x: room2.x + room2.width / 2,
            z: room2.z + room2.height / 2
        };
        
        // All rooms have the same flat height of 0
        const floorHeight = 0;
        
        // Create a simple L-shaped corridor
        const corridorWidth = 6;  // Increased from 3 to match larger rooms
        
        // For alcove connections, use a shorter, direct corridor approach
        if (isAlcoveConnection) {
            // Determine if this is a horizontal or vertical connection
            const isHorizontalConnection = Math.abs(center1.x - center2.x) > Math.abs(center1.z - center2.z);
            
            if (isHorizontalConnection) {
                // Create horizontal corridor
                const minX = Math.min(center1.x, center2.x);
                const maxX = Math.max(center1.x, center2.x);
                
                const horizontalCorridor = new Room(
                    minX - corridorWidth / 2,
                    floorHeight,
                    center1.z - corridorWidth / 2,
                    maxX - minX + corridorWidth,
                    corridorWidth
                );
                
                horizontalCorridor.isCorridor = true;
                horizontalCorridor.setFloorHeight(floorHeight);
                this.currentDungeon.addCorridor(horizontalCorridor);
            } else {
                // Create vertical corridor
                const minZ = Math.min(center1.z, center2.z);
                const maxZ = Math.max(center1.z, center2.z);
                
                const verticalCorridor = new Room(
                    center1.x - corridorWidth / 2,
                    floorHeight,
                    minZ - corridorWidth / 2,
                    corridorWidth,
                    maxZ - minZ + corridorWidth
                );
                
                verticalCorridor.isCorridor = true;
                verticalCorridor.setFloorHeight(floorHeight);
                this.currentDungeon.addCorridor(verticalCorridor);
            }
            
            return;
        }
        
        // Standard L-shaped corridor for normal connections
        // Decide if we go horizontally first or vertically first
        if (Math.random() < 0.5) {
            // Horizontal then vertical
            // Create horizontal corridor
            const minX = Math.min(center1.x, center2.x);
            const maxX = Math.max(center1.x, center2.x);
            
            const horizontalCorridor = new Room(
                minX - corridorWidth / 2,
                floorHeight,
                center1.z - corridorWidth / 2,
                maxX - minX + corridorWidth,
                corridorWidth
            );
            
            horizontalCorridor.isCorridor = true;
            horizontalCorridor.setFloorHeight(floorHeight);
            this.currentDungeon.addCorridor(horizontalCorridor);
            
            // Create vertical corridor
            const minZ = Math.min(center1.z, center2.z);
            const maxZ = Math.max(center1.z, center2.z);
            
            const verticalCorridor = new Room(
                center2.x - corridorWidth / 2,
                floorHeight,
                minZ - corridorWidth / 2,
                corridorWidth,
                maxZ - minZ + corridorWidth
            );
            
            verticalCorridor.isCorridor = true;
            verticalCorridor.setFloorHeight(floorHeight);
            this.currentDungeon.addCorridor(verticalCorridor);
        } else {
            // Vertical then horizontal
            // Create vertical corridor
            const minZ = Math.min(center1.z, center2.z);
            const maxZ = Math.max(center1.z, center2.z);
            
            const verticalCorridor = new Room(
                center1.x - corridorWidth / 2,
                floorHeight,
                minZ - corridorWidth / 2,
                corridorWidth,
                maxZ - minZ + corridorWidth
            );
            
            verticalCorridor.isCorridor = true;
            verticalCorridor.setFloorHeight(floorHeight);
            this.currentDungeon.addCorridor(verticalCorridor);
            
            // Create horizontal corridor
            const minX = Math.min(center1.x, center2.x);
            const maxX = Math.max(center1.x, center2.x);
            
            const horizontalCorridor = new Room(
                minX - corridorWidth / 2,
                floorHeight,
                center2.z - corridorWidth / 2,
                maxX - minX + corridorWidth,
                corridorWidth
            );
            
            horizontalCorridor.isCorridor = true;
            horizontalCorridor.setFloorHeight(floorHeight);
            this.currentDungeon.addCorridor(horizontalCorridor);
        }
    }
    
    // Calculate distance between room centers
    calculateDistance(room1, room2) {
        const centerX1 = room1.x + room1.width / 2;
        const centerZ1 = room1.z + room1.height / 2;
        const centerX2 = room2.x + room2.width / 2;
        const centerZ2 = room2.z + room2.height / 2;
        
        return Math.sqrt(
            Math.pow(centerX2 - centerX1, 2) + 
            Math.pow(centerZ2 - centerZ1, 2)
        );
    }
    
    // Helper function to find the farthest room from a source room
    findFarthestRoom(sourceRoom, roomOptions) {
        if (!roomOptions || roomOptions.length === 0) {
            throw new Error("No room options provided to findFarthestRoom");
        }
        
        let maxDistance = 0;
        let farthestRoom = roomOptions[0];
        
        for (const room of roomOptions) {
            const distance = this.calculateDistance(sourceRoom, room);
            
            if (distance > maxDistance) {
                maxDistance = distance;
                farthestRoom = room;
            }
        }
        
        return farthestRoom;
    }
}
