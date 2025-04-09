export class DungeonGenerator {
    constructor() {
        // Settings for dungeon generation
        this.settings = {
            // Room sizes
            hubRoomSize: 50, // Size of the central hub
            outerRoomSizeMin: 30,
            outerRoomSizeMax: 45,
            satelliteRoomSizeMin: 15,
            satelliteRoomSizeMax: 25,
            
            // Room counts and probabilities
            numOuterRooms: 5, // Number of main rooms around the hub
            satelliteRoomChance: 0.6, // Chance each outer room has a satellite
            outerConnectionChance: 0.3, // Chance for outer rooms to connect
            
            // Features
            pillarSize: 6, // Size of the central pillar
            roomPillarChance: 0.4, // Chance for a room to have a pillar
            alcoveChance: 0.7, // Chance to add alcoves to room edges
            alcoveSizeMin: 5,
            alcoveSizeMax: 15,
            alcoveDepthMin: 5,
            alcoveDepthMax: 10,
            
            // Construction
            corridorWidth: 5,
            floorHeight: 0.2,
            wallHeight: 3,
            gridSize: 1,
            doorwayWidth: 5,
            
            // Spacing
            minRoomSpacing: 20, // Minimum distance between rooms
            hubDistanceMultiplier: 1.8 // Controls how far rooms are from the hub
        };
    }
    
    generateFloor(floorLevel) {
        console.log(`Generating hub-based dungeon level ${floorLevel}...`);
        
        // Generate the central hub room
        const hubRoom = this.generateHubRoom();
        
        // Generate outer rooms around the hub
        const outerRooms = this.generateOuterRooms(hubRoom);
        
        // Generate satellite rooms attached to some outer rooms
        const satelliteRooms = this.generateSatelliteRooms(outerRooms);
        
        // Combine all rooms into a single array
        const allRooms = [hubRoom, ...outerRooms, ...satelliteRooms];
        
        // Connect rooms with corridors
        const corridors = this.connectRooms(hubRoom, outerRooms, satelliteRooms, allRooms);
        
        // Add features to rooms (pillars, alcoves)
        this.addRoomFeatures(allRooms, corridors);
        
        // Add doorways to rooms where corridors connect
        this.createDoorways(allRooms, corridors);
        
        // Place the key in the farthest room from the hub
        const keyPosition = this.placeKey(outerRooms, satelliteRooms);
        
        // Create the dungeon mesh
        const dungeonMesh = this.createDungeonMesh(allRooms, corridors, keyPosition);
        
        // Return the generated dungeon data
        return {
            level: floorLevel,
            rooms: allRooms,
            corridors: corridors,
            keyPosition: keyPosition,
            mesh: dungeonMesh
        };
    }
    
    generateHubRoom() {
        const size = this.settings.hubRoomSize;
        
        // Create a central hub room
        const hubRoom = {
            x: -size / 2, // Center the room at the origin
            y: -size / 2,
            width: size,
            height: size,
            isHub: true,
            connections: [],
            doorways: [],
            features: [],
            type: 'hub'
        };
        
        // Add a central pillar
        const pillarSize = this.settings.pillarSize;
        hubRoom.features.push({
            type: 'pillar',
            shape: 'circle',
            x: 0 - pillarSize / 2, // Center of the room
            y: 0 - pillarSize / 2,
            width: pillarSize,
            height: pillarSize
        });
        
        return hubRoom;
    }
    
    generateOuterRooms(hubRoom) {
        const outerRooms = [];
        const numRooms = this.settings.numOuterRooms;
        const hubRadius = (this.settings.hubRoomSize / 2);
        
        // Calculate base distance to ensure rooms don't overlap with the hub
        // Use the diagonal of the hub room and add minimum spacing
        const hubDiagonal = Math.sqrt(Math.pow(hubRoom.width, 2) + Math.pow(hubRoom.height, 2));
        const baseDistance = (hubDiagonal / 2) * this.settings.hubDistanceMultiplier;
        
        // Place rooms in a circle around the hub
        for (let i = 0; i < numRooms; i++) {
            // Calculate position on the circle
            const angle = (i / numRooms) * Math.PI * 2;
            const roomWidth = Math.floor(Math.random() * 
                (this.settings.outerRoomSizeMax - this.settings.outerRoomSizeMin + 1)) + 
                this.settings.outerRoomSizeMin;
            const roomHeight = Math.floor(Math.random() * 
                (this.settings.outerRoomSizeMax - this.settings.outerRoomSizeMin + 1)) + 
                this.settings.outerRoomSizeMin;
            
            // Distance from hub center to outer room center
            // Add room size to base distance to ensure edge rooms don't overlap
            const distanceFromHub = baseDistance + Math.max(roomWidth, roomHeight) / 2;
            
            // Position is at center of room
            const centerX = Math.cos(angle) * distanceFromHub;
            const centerY = Math.sin(angle) * distanceFromHub;
            
            // Adjust to get the top-left corner
            const roomX = centerX - roomWidth / 2;
            const roomY = centerY - roomHeight / 2;
            
            // Create the room
            const room = {
                x: roomX,
                y: roomY,
                width: roomWidth,
                height: roomHeight,
                angle: angle, // Store the angle for corridor connection
                connections: [],
                doorways: [],
                features: [],
                type: 'outer',
                index: i
            };
            
            // Check if this room overlaps with any existing outer room
            let overlaps = false;
            for (const existingRoom of outerRooms) {
                if (this.roomsOverlap(room, existingRoom, this.settings.minRoomSpacing)) {
                    overlaps = true;
                    break;
                }
            }
            
            // If no overlap, add the room
            if (!overlaps) {
                outerRooms.push(room);
            } else {
                // If overlap, adjust the angle slightly and try again (retry logic could be improved)
                i--; // Retry this room
            }
        }
        
        return outerRooms;
    }
    
    roomsOverlap(roomA, roomB, spacing = 0) {
        // Add spacing to room dimensions
        const aLeft = roomA.x - spacing;
        const aRight = roomA.x + roomA.width + spacing;
        const aTop = roomA.y - spacing;
        const aBottom = roomA.y + roomA.height + spacing;
        
        const bLeft = roomB.x - spacing;
        const bRight = roomB.x + roomB.width + spacing;
        const bTop = roomB.y - spacing;
        const bBottom = roomB.y + roomB.height + spacing;
        
        // Check for overlap
        return !(
            aRight < bLeft ||
            aLeft > bRight ||
            aBottom < bTop ||
            aTop > bBottom
        );
    }
    
    generateSatelliteRooms(outerRooms) {
        const satelliteRooms = [];
        
        for (const outerRoom of outerRooms) {
            // Random chance to add a satellite room
            if (Math.random() < this.settings.satelliteRoomChance) {
                const parentAngle = outerRoom.angle;
                
                // Size of the satellite room
                const satelliteWidth = Math.floor(Math.random() * 
                    (this.settings.satelliteRoomSizeMax - this.settings.satelliteRoomSizeMin + 1)) + 
                    this.settings.satelliteRoomSizeMin;
                const satelliteHeight = Math.floor(Math.random() * 
                    (this.settings.satelliteRoomSizeMax - this.settings.satelliteRoomSizeMin + 1)) + 
                    this.settings.satelliteRoomSizeMin;
                
                // Distance between rooms (spacing)
                const distanceFromParent = this.settings.minRoomSpacing;
                
                // Get which edge of the parent room to connect to based on angle
                const attachEdge = this.getEdgeForAngle(parentAngle);
                
                // Calculate the position of the satellite room
                let satelliteX, satelliteY;
                
                // Position satellite based on which edge we're attaching to
                if (attachEdge === 'east') {
                    satelliteX = outerRoom.x + outerRoom.width + distanceFromParent;
                    satelliteY = outerRoom.y + (outerRoom.height - satelliteHeight) / 2;
                } else if (attachEdge === 'west') {
                    satelliteX = outerRoom.x - satelliteWidth - distanceFromParent;
                    satelliteY = outerRoom.y + (outerRoom.height - satelliteHeight) / 2;
                } else if (attachEdge === 'north') {
                    satelliteX = outerRoom.x + (outerRoom.width - satelliteWidth) / 2;
                    satelliteY = outerRoom.y - satelliteHeight - distanceFromParent;
                } else { // south
                    satelliteX = outerRoom.x + (outerRoom.width - satelliteWidth) / 2;
                    satelliteY = outerRoom.y + outerRoom.height + distanceFromParent;
                }
                
                // Create the satellite room
                const satelliteRoom = {
                    x: satelliteX,
                    y: satelliteY,
                    width: satelliteWidth,
                    height: satelliteHeight,
                    angle: parentAngle,
                    parentRoom: outerRoom,
                    attachEdge: attachEdge,
                    connections: [],
                    doorways: [],
                    features: [],
                    type: 'satellite'
                };
                
                // Check if this satellite room overlaps with any existing room
                let overlaps = false;
                for (const room of [...outerRooms, ...satelliteRooms]) {
                    if (room !== outerRoom && this.roomsOverlap(satelliteRoom, room, this.settings.minRoomSpacing / 2)) {
                        overlaps = true;
                        break;
                    }
                }
                
                // If no overlap, add the room
                if (!overlaps) {
                    // Store the connection
                    outerRoom.connections.push(satelliteRoom);
                    satelliteRoom.connections.push(outerRoom);
                    
                    satelliteRooms.push(satelliteRoom);
                }
            }
        }
        
        return satelliteRooms;
    }
    
    // Helper to determine which edge to connect to based on angle
    getEdgeForAngle(angle) {
        // Normalize angle to 0-2π
        const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        
        // Determine which edge to use based on the angle
        // East: -π/4 to π/4
        // North: π/4 to 3π/4
        // West: 3π/4 to 5π/4
        // South: 5π/4 to 7π/4
        
        if (normalizedAngle < Math.PI / 4 || normalizedAngle >= Math.PI * 7 / 4) {
            return 'east';
        } else if (normalizedAngle < Math.PI * 3 / 4) {
            return 'north';
        } else if (normalizedAngle < Math.PI * 5 / 4) {
            return 'west';
        } else {
            return 'south';
        }
    }
    
    // Helper to find the center point of a room's edge based on edge type
    getEdgeAttachPoint(room, edge) {
        let point = {x: 0, y: 0};
        
        switch(edge) {
            case 'north':
                point.x = room.x + room.width / 2;
                point.y = room.y;
                break;
            case 'south':
                point.x = room.x + room.width / 2;
                point.y = room.y + room.height;
                break;
            case 'east':
                point.x = room.x + room.width;
                point.y = room.y + room.height / 2;
                break;
            case 'west':
                point.x = room.x;
                point.y = room.y + room.height / 2;
                break;
        }
        
        return point;
    }
    
    connectRooms(hubRoom, outerRooms, satelliteRooms, allRooms) {
        const corridors = [];
        
        // 1. Connect hub to each outer room
        for (const outerRoom of outerRooms) {
            const corridor = this.createCorridorBetweenRooms(hubRoom, outerRoom, allRooms);
            if (corridor) {
                corridors.push(corridor);
                
                // Store the connection
                if (!hubRoom.connections.includes(outerRoom)) {
                    hubRoom.connections.push(outerRoom);
                    outerRoom.connections.push(hubRoom);
                }
            }
        }
        
        // 2. Connect outer rooms to their satellites
        for (const satelliteRoom of satelliteRooms) {
            const parentRoom = satelliteRoom.parentRoom;
            const corridor = this.createDirectCorridorBetweenRooms(parentRoom, satelliteRoom, satelliteRoom.attachEdge);
            if (corridor) {
                corridors.push(corridor);
            }
        }
        
        // 3. Randomly connect some outer rooms to each other
        for (let i = 0; i < outerRooms.length; i++) {
            for (let j = i + 1; j < outerRooms.length; j++) {
                if (Math.random() < this.settings.outerConnectionChance) {
                    const roomA = outerRooms[i];
                    const roomB = outerRooms[j];
                    
                    // Avoid connecting rooms that are already connected
                    if (!roomA.connections.includes(roomB)) {
                        const corridor = this.createCorridorBetweenRooms(roomA, roomB, allRooms);
                        if (corridor) {
                            corridors.push(corridor);
                            
                            // Store the connection
                            roomA.connections.push(roomB);
                            roomB.connections.push(roomA);
                        }
                    }
                }
            }
        }
        
        return corridors;
    }
    
    // Create a direct corridor between two rooms (for satellites)
    createDirectCorridorBetweenRooms(roomA, roomB, attachEdge) {
        // Get the connection points on the appropriate edges
        const pointA = this.getEdgeAttachPoint(roomA, attachEdge);
        
        // Get the opposite edge for room B
        const oppositeEdge = this.getOppositeEdge(attachEdge);
        const pointB = this.getEdgeAttachPoint(roomB, oppositeEdge);
        
        // Create a single-segment corridor
        return {
            points: [pointA, pointB],
            width: this.settings.corridorWidth,
            startRoom: roomA,
            endRoom: roomB,
            startEdge: attachEdge,
            endEdge: oppositeEdge
        };
    }
    
    // Get the opposite edge
    getOppositeEdge(edge) {
        switch(edge) {
            case 'north': return 'south';
            case 'south': return 'north';
            case 'east': return 'west';
            case 'west': return 'east';
            default: return 'north';
        }
    }
    
    // Create a corridor between two rooms with pathfinding to avoid other rooms
    createCorridorBetweenRooms(roomA, roomB, allRooms) {
        // Find the best connection points between the rooms
        const connection = this.findBestConnectionPoints(roomA, roomB);
        
        if (connection && connection.startPoint && connection.endPoint) {
            // Pathfind to avoid rooms
            const path = this.findPathBetweenPoints(
                connection.startPoint, 
                connection.endPoint, 
                allRooms,
                roomA,
                roomB
            );
            
            if (path.length > 0) {
                return {
                    points: path,
                    width: this.settings.corridorWidth,
                    startRoom: roomA,
                    endRoom: roomB,
                    startEdge: connection.startEdge ? connection.startEdge.dir : null,
                    endEdge: connection.endEdge ? connection.endEdge.dir : null
                };
            }
        }
        
        return null;
    }
    
    // Pathfinding to create corridors that avoid rooms
    findPathBetweenPoints(start, end, allRooms, startRoom, endRoom) {
        // For simplicity, we'll just create an L-shaped path
        // and check if it intersects any rooms
        
        // Create two potential paths - horizontal first or vertical first
        const horizontalFirst = [
            { x: start.x, y: start.y },
            { x: end.x, y: start.y },
            { x: end.x, y: end.y }
        ];
        
        const verticalFirst = [
            { x: start.x, y: start.y },
            { x: start.x, y: end.y },
            { x: end.x, y: end.y }
        ];
        
        // Check which path is better (doesn't intersect other rooms)
        const isHorizontalValid = !this.pathIntersectsRooms(horizontalFirst, allRooms, startRoom, endRoom);
        const isVerticalValid = !this.pathIntersectsRooms(verticalFirst, allRooms, startRoom, endRoom);
        
        // Choose the best path, prioritize non-intersecting
        if (isHorizontalValid && !isVerticalValid) {
            return horizontalFirst;
        } else if (!isHorizontalValid && isVerticalValid) {
            return verticalFirst;
        } else if (isHorizontalValid && isVerticalValid) {
            // Both are valid, choose randomly or by shortest path
            const hDist = Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
            const vDist = Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
            return (hDist <= vDist) ? horizontalFirst : verticalFirst;
        } else {
            // Neither is valid, we need a more complex path
            // For now, just return direct points and we'll handle collisions later
            return [start, end];
        }
    }
    
    // Check if a path intersects any rooms (except start and end rooms)
    pathIntersectsRooms(path, allRooms, startRoom, endRoom) {
        // Expand path into line segments
        for (let i = 0; i < path.length - 1; i++) {
            const segmentStart = path[i];
            const segmentEnd = path[i + 1];
            
            // Check if this segment intersects any rooms
            for (const room of allRooms) {
                // Skip the start and end rooms
                if (room === startRoom || room === endRoom) continue;
                
                // Expand room bounds slightly to account for corridor width
                const expandedRoom = {
                    x: room.x - this.settings.corridorWidth / 2,
                    y: room.y - this.settings.corridorWidth / 2,
                    width: room.width + this.settings.corridorWidth,
                    height: room.height + this.settings.corridorWidth
                };
                
                // Check if segment intersects this room
                if (this.lineIntersectsRect(segmentStart, segmentEnd, expandedRoom)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Check if a line segment intersects a rectangle
    lineIntersectsRect(lineStart, lineEnd, rect) {
        // Simplification: check if line segment bounding box overlaps with rect
        const minX = Math.min(lineStart.x, lineEnd.x);
        const maxX = Math.max(lineStart.x, lineEnd.x);
        const minY = Math.min(lineStart.y, lineEnd.y);
        const maxY = Math.max(lineStart.y, lineEnd.y);
        
        // Rectangle bounds
        const rectLeft = rect.x;
        const rectRight = rect.x + rect.width;
        const rectTop = rect.y;
        const rectBottom = rect.y + rect.height;
        
        // Check if bounding boxes don't overlap
        if (maxX < rectLeft || minX > rectRight || maxY < rectTop || minY > rectBottom) {
            return false;
        }
        
        // For horizontal or vertical lines, bounding box check is sufficient
        if (lineStart.x === lineEnd.x || lineStart.y === lineEnd.y) {
            return true;
        }
        
        // For diagonal lines, check intersection with all 4 edges of rectangle
        // This is a simplified version that may have edge cases
        const edges = [
            [{x: rectLeft, y: rectTop}, {x: rectRight, y: rectTop}], // Top
            [{x: rectRight, y: rectTop}, {x: rectRight, y: rectBottom}], // Right
            [{x: rectLeft, y: rectBottom}, {x: rectRight, y: rectBottom}], // Bottom
            [{x: rectLeft, y: rectTop}, {x: rectLeft, y: rectBottom}]  // Left
        ];
        
        for (const edge of edges) {
            if (this.lineSegmentsIntersect(lineStart, lineEnd, edge[0], edge[1])) {
                return true;
            }
        }
        
        return false;
    }
    
    // Check if two line segments intersect
    lineSegmentsIntersect(p1, p2, p3, p4) {
        const d1 = this.direction(p3, p4, p1);
        const d2 = this.direction(p3, p4, p2);
        const d3 = this.direction(p1, p2, p3);
        const d4 = this.direction(p1, p2, p4);
        
        // Check if lines intersect
        return (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
                ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) ||
               (d1 === 0 && this.onSegment(p3, p4, p1)) ||
               (d2 === 0 && this.onSegment(p3, p4, p2)) ||
               (d3 === 0 && this.onSegment(p1, p2, p3)) ||
               (d4 === 0 && this.onSegment(p1, p2, p4));
    }
    
    // Calculate the direction of point p3 relative to line segment p1-p2
    direction(p1, p2, p3) {
        return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
    }
    
    // Check if point p3 lies on segment p1-p2
    onSegment(p1, p2, p3) {
        return p3.x <= Math.max(p1.x, p2.x) && p3.x >= Math.min(p1.x, p2.x) &&
               p3.y <= Math.max(p1.y, p2.y) && p3.y >= Math.min(p1.y, p2.y);
    }
    
    findBestConnectionPoints(roomA, roomB) {
        // Define the edges of each room
        const edgesA = [
            { // North edge (top)
                start: { x: roomA.x, y: roomA.y },
                end: { x: roomA.x + roomA.width, y: roomA.y },
                dir: 'north'
            },
            { // South edge (bottom)
                start: { x: roomA.x, y: roomA.y + roomA.height },
                end: { x: roomA.x + roomA.width, y: roomA.y + roomA.height },
                dir: 'south'
            },
            { // West edge (left)
                start: { x: roomA.x, y: roomA.y },
                end: { x: roomA.x, y: roomA.y + roomA.height },
                dir: 'west'
            },
            { // East edge (right)
                start: { x: roomA.x + roomA.width, y: roomA.y },
                end: { x: roomA.x + roomA.width, y: roomA.y + roomA.height },
                dir: 'east'
            }
        ];
        
        const edgesB = [
            { // North edge (top)
                start: { x: roomB.x, y: roomB.y },
                end: { x: roomB.x + roomB.width, y: roomB.y },
                dir: 'north'
            },
            { // South edge (bottom)
                start: { x: roomB.x, y: roomB.y + roomB.height },
                end: { x: roomB.x + roomB.width, y: roomB.y + roomB.height },
                dir: 'south'
            },
            { // West edge (left)
                start: { x: roomB.x, y: roomB.y },
                end: { x: roomB.x, y: roomB.y + roomB.height },
                dir: 'west'
            },
            { // East edge (right)
                start: { x: roomB.x + roomB.width, y: roomB.y },
                end: { x: roomB.x + roomB.width, y: roomB.y + roomB.height },
                dir: 'east'
            }
        ];
        
        let minDistance = Infinity;
        let bestStartPoint = null;
        let bestEndPoint = null;
        let bestEdgeA = null;
        let bestEdgeB = null;
        
        // For the hub room specifically, we want to connect to the outer edge
        // This ensures corridors don't pass through the central pillar
        if (roomA.isHub) {
            // Calculate the hub center
            const hubCenterX = roomA.x + roomA.width / 2;
            const hubCenterY = roomA.y + roomA.height / 2;
            
            // Get the center of the other room
            const roomBCenterX = roomB.x + roomB.width / 2;
            const roomBCenterY = roomB.y + roomB.height / 2;
            
            // Calculate angle from hub center to the other room
            const angle = Math.atan2(roomBCenterY - hubCenterY, roomBCenterX - hubCenterX);
            
            // Find the point on the hub edge in this direction
            let hubEdgeX, hubEdgeY, hubEdgeDir;
            
            // Based on the angle, determine which edge of the hub to use
            if (angle >= -Math.PI/4 && angle < Math.PI/4) {
                // East edge
                hubEdgeX = roomA.x + roomA.width;
                hubEdgeY = hubCenterY;
                hubEdgeDir = 'east';
            } else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) {
                // South edge
                hubEdgeX = hubCenterX;
                hubEdgeY = roomA.y + roomA.height;
                hubEdgeDir = 'south';
            } else if (angle >= 3*Math.PI/4 || angle < -3*Math.PI/4) {
                // West edge
                hubEdgeX = roomA.x;
                hubEdgeY = hubCenterY;
                hubEdgeDir = 'west';
            } else {
                // North edge
                hubEdgeX = hubCenterX;
                hubEdgeY = roomA.y;
                hubEdgeDir = 'north';
            }
            
            // Now find the best edge on room B to connect to
            for (const edgeB of edgesB) {
                // Skip edges facing the same direction
                if (edgeB.dir === hubEdgeDir) continue;
                
                let connectionPoint;
                
                // For vertical hub edge to horizontal room edge
                if ((hubEdgeDir === 'east' || hubEdgeDir === 'west') && 
                    (edgeB.dir === 'north' || edgeB.dir === 'south')) {
                    
                    // Find the best x-coordinate on the room edge
                    const xPos = Math.min(Math.max(hubEdgeX, edgeB.start.x), edgeB.end.x);
                    connectionPoint = { x: xPos, y: edgeB.start.y };
                }
                // For horizontal hub edge to vertical room edge
                else if ((hubEdgeDir === 'north' || hubEdgeDir === 'south') && 
                         (edgeB.dir === 'east' || edgeB.dir === 'west')) {
                    
                    // Find the best y-coordinate on the room edge
                    const yPos = Math.min(Math.max(hubEdgeY, edgeB.start.y), edgeB.end.y);
                    connectionPoint = { x: edgeB.start.x, y: yPos };
                }
                // For parallel edges, use a direct connection
                else {
                    // For this case, the logic is a bit simplified as we've already picked the hub edge
                    // Just find a corresponding point on room B
                    if (edgeB.dir === 'north' || edgeB.dir === 'south') {
                        // Connect to the room's edge at the same x-coordinate if possible
                        const xPos = Math.min(Math.max(hubEdgeX, edgeB.start.x), edgeB.end.x);
                        connectionPoint = { x: xPos, y: edgeB.start.y };
                    } else {
                        // Connect to the room's edge at the same y-coordinate if possible
                        const yPos = Math.min(Math.max(hubEdgeY, edgeB.start.y), edgeB.end.y);
                        connectionPoint = { x: edgeB.start.x, y: yPos };
                    }
                }
                
                // Calculate distance and update if this is the best connection
                const distance = Math.abs(hubEdgeX - connectionPoint.x) + 
                                Math.abs(hubEdgeY - connectionPoint.y);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    bestStartPoint = { x: hubEdgeX, y: hubEdgeY };
                    bestEndPoint = connectionPoint;
                    bestEdgeA = { dir: hubEdgeDir };
                    bestEdgeB = edgeB;
                }
            }
        }
        // Standard room-to-room connection
        else {
            // Try all edge combinations to find the closest points
            for (const edgeA of edgesA) {
                for (const edgeB of edgesB) {
                    // Skip incompatible edge pairs (facing the same direction)
                    if (edgeA.dir === edgeB.dir) continue;
                    
                    // Find the best points on these edges
                    let startPoint, endPoint, distance;
                    
                    // Horizontal edge to vertical edge
                    if ((edgeA.dir === 'north' || edgeA.dir === 'south') && 
                        (edgeB.dir === 'east' || edgeB.dir === 'west')) {
                        
                        // Clamp x-position to edge A's range
                        const xPos = Math.min(Math.max(edgeB.start.x, edgeA.start.x), edgeA.end.x);
                        startPoint = { x: xPos, y: edgeA.start.y };
                        endPoint = { x: edgeB.start.x, y: Math.min(Math.max(startPoint.y, edgeB.start.y), edgeB.end.y) };
                        
                    } 
                    // Vertical edge to horizontal edge
                    else if ((edgeA.dir === 'east' || edgeA.dir === 'west') && 
                            (edgeB.dir === 'north' || edgeB.dir === 'south')) {
                        
                        // Clamp y-position to edge A's range
                        const yPos = Math.min(Math.max(edgeB.start.y, edgeA.start.y), edgeA.end.y);
                        startPoint = { x: edgeA.start.x, y: yPos };
                        endPoint = { x: Math.min(Math.max(startPoint.x, edgeB.start.x), edgeB.end.x), y: edgeB.start.y };
                        
                    }
                    // Horizontal edge to horizontal edge
                    else if ((edgeA.dir === 'north' || edgeA.dir === 'south') && 
                            (edgeB.dir === 'north' || edgeB.dir === 'south')) {
                        
                        // Find overlapping x-range
                        const maxStartX = Math.max(edgeA.start.x, edgeB.start.x);
                        const minEndX = Math.min(edgeA.end.x, edgeB.end.x);
                        
                        if (maxStartX <= minEndX) {
                            // There is an overlap
                            const midX = (maxStartX + minEndX) / 2;
                            startPoint = { x: midX, y: edgeA.start.y };
                            endPoint = { x: midX, y: edgeB.start.y };
                        } else {
                            // No overlap, use closest endpoints
                            if (edgeA.end.x < edgeB.start.x) {
                                startPoint = { x: edgeA.end.x, y: edgeA.start.y };
                                endPoint = { x: edgeB.start.x, y: edgeB.start.y };
                            } else {
                                startPoint = { x: edgeA.start.x, y: edgeA.start.y };
                                endPoint = { x: edgeB.end.x, y: edgeB.start.y };
                            }
                        }
                    }
                    // Vertical edge to vertical edge
                    else if ((edgeA.dir === 'east' || edgeA.dir === 'west') && 
                            (edgeB.dir === 'east' || edgeB.dir === 'west')) {
                        
                        // Find overlapping y-range
                        const maxStartY = Math.max(edgeA.start.y, edgeB.start.y);
                        const minEndY = Math.min(edgeA.end.y, edgeB.end.y);
                        
                        if (maxStartY <= minEndY) {
                            // There is an overlap
                            const midY = (maxStartY + minEndY) / 2;
                            startPoint = { x: edgeA.start.x, y: midY };
                            endPoint = { x: edgeB.start.x, y: midY };
                        } else {
                            // No overlap, use closest endpoints
                            if (edgeA.end.y < edgeB.start.y) {
                                startPoint = { x: edgeA.start.x, y: edgeA.end.y };
                                endPoint = { x: edgeB.start.x, y: edgeB.start.y };
                            } else {
                                startPoint = { x: edgeA.start.x, y: edgeA.start.y };
                                endPoint = { x: edgeB.start.x, y: edgeB.end.y };
                            }
                        }
                    }
                    
                    // Calculate Manhattan distance
                    distance = Math.abs(startPoint.x - endPoint.x) + Math.abs(startPoint.y - endPoint.y);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestStartPoint = startPoint;
                        bestEndPoint = endPoint;
                        bestEdgeA = edgeA;
                        bestEdgeB = edgeB;
                    }
                }
            }
        }
        
        // Return the best connection points
        return {
            startPoint: bestStartPoint,
            endPoint: bestEndPoint,
            distance: minDistance,
            startEdge: bestEdgeA,
            endEdge: bestEdgeB
        };
    }
    
    addRoomFeatures(allRooms, corridors) {
        // Skip the hub room as we already added a central pillar
        for (const room of allRooms) {
            if (room.isHub) continue;
            
            // Chance to add a pillar to the room
            if (Math.random() < this.settings.roomPillarChance) {
                const pillarShapes = ['square', 'triangle', 'circle'];
                const randomShape = pillarShapes[Math.floor(Math.random() * pillarShapes.length)];
                const pillarSize = this.settings.pillarSize;
                
                // Place in center of room
                const pillarX = room.x + room.width / 2 - pillarSize / 2;
                const pillarY = room.y + room.height / 2 - pillarSize / 2;
                
                room.features.push({
                    type: 'pillar',
                    shape: randomShape,
                    x: pillarX,
                    y: pillarY,
                    width: pillarSize,
                    height: pillarSize
                });
            }
            
            // Add alcoves to some edges without doorways
            this.addAlcovesToRoom(room, corridors);
        }
    }
    
    addAlcovesToRoom(room, corridors) {
        // Check each edge of the room
        const edges = ['north', 'south', 'east', 'west'];
        
        for (const edge of edges) {
            // Skip if there's already a connection on this edge
            let hasConnectionOnEdge = false;
            
            // Check corridors to see if any connect to this edge
            for (const corridor of corridors) {
                if ((corridor.startRoom === room && corridor.startEdge === edge) ||
                    (corridor.endRoom === room && corridor.endEdge === edge)) {
                    hasConnectionOnEdge = true;
                    break;
                }
            }
            
            // If no connection and we pass the random check, add an alcove
            if (!hasConnectionOnEdge && Math.random() < this.settings.alcoveChance) {
                const alcoveWidth = Math.floor(Math.random() * 
                    (this.settings.alcoveSizeMax - this.settings.alcoveSizeMin + 1)) + 
                    this.settings.alcoveSizeMin;
                
                const alcoveDepth = Math.floor(Math.random() * 
                    (this.settings.alcoveDepthMax - this.settings.alcoveDepthMin + 1)) + 
                    this.settings.alcoveDepthMin;
                
                let alcoveX, alcoveY, alcoveW, alcoveH;
                
                // Position the alcove based on the edge
                if (edge === 'north') {
                    alcoveX = room.x + Math.random() * (room.width - alcoveWidth);
                    alcoveY = room.y - alcoveDepth;
                    alcoveW = alcoveWidth;
                    alcoveH = alcoveDepth;
                } else if (edge === 'south') {
                    alcoveX = room.x + Math.random() * (room.width - alcoveWidth);
                    alcoveY = room.y + room.height;
                    alcoveW = alcoveWidth;
                    alcoveH = alcoveDepth;
                } else if (edge === 'east') {
                    alcoveX = room.x + room.width;
                    alcoveY = room.y + Math.random() * (room.height - alcoveWidth);
                    alcoveW = alcoveDepth;
                    alcoveH = alcoveWidth;
                } else if (edge === 'west') {
                    alcoveX = room.x - alcoveDepth;
                    alcoveY = room.y + Math.random() * (room.height - alcoveWidth);
                    alcoveW = alcoveDepth;
                    alcoveH = alcoveWidth;
                }
                
                room.features.push({
                    type: 'alcove',
                    edge: edge,
                    x: alcoveX,
                    y: alcoveY,
                    width: alcoveW,
                    height: alcoveH
                });
                
                // Add a doorway for the alcove
                this.addDoorwayForAlcove(room, edge, alcoveX, alcoveY, alcoveW, alcoveH);
            }
        }
    }
    
    // Add a doorway to connect the alcove to the room
    addDoorwayForAlcove(room, edge, alcoveX, alcoveY, alcoveWidth, alcoveHeight) {
        let doorX, doorY, doorWidth, doorHeight;
        
        // Position doorway based on which edge the alcove is on
        if (edge === 'north') {
            doorX = alcoveX + (alcoveWidth - this.settings.doorwayWidth) / 2;
            doorY = room.y - this.settings.gridSize;
            doorWidth = this.settings.doorwayWidth;
            doorHeight = this.settings.gridSize;
        } else if (edge === 'south') {
            doorX = alcoveX + (alcoveWidth - this.settings.doorwayWidth) / 2;
            doorY = room.y + room.height;
            doorWidth = this.settings.doorwayWidth;
            doorHeight = this.settings.gridSize;
        } else if (edge === 'east') {
            doorX = room.x + room.width;
            doorY = alcoveY + (alcoveHeight - this.settings.doorwayWidth) / 2;
            doorWidth = this.settings.gridSize;
            doorHeight = this.settings.doorwayWidth;
        } else if (edge === 'west') {
            doorX = room.x - this.settings.gridSize;
            doorY = alcoveY + (alcoveHeight - this.settings.doorwayWidth) / 2;
            doorWidth = this.settings.gridSize;
            doorHeight = this.settings.doorwayWidth;
        }
        
        room.doorways.push({
            x: doorX,
            y: doorY,
            width: doorWidth,
            height: doorHeight,
            isEastWall: edge === 'east',
            isNorthWall: edge === 'north'
        });
    }
    
    createDoorways(rooms, corridors) {
        // For each corridor, create doorways where it meets rooms
        for (const corridor of corridors) {
            const startRoom = corridor.startRoom;
            const endRoom = corridor.endRoom;
            const points = corridor.points;
            
            // Create doorway at the start point
            this.createDoorwayForRoom(startRoom, points[0], points[1], corridor.startEdge);
            
            // Create doorway at the end point
            this.createDoorwayForRoom(endRoom, points[points.length - 1], points[points.length - 2], corridor.endEdge);
        }
    }
    
    createDoorwayForRoom(room, doorPoint, corridorPoint, edgeDir) {
        // Determine which wall the doorway is on if not provided
        let wallType = edgeDir;
        
        if (!wallType) {
            // Check if doorway is on the north wall
            if (Math.abs(doorPoint.y - room.y) < 0.1) {
                wallType = 'north';
            }
            // Check if doorway is on the south wall
            else if (Math.abs(doorPoint.y - (room.y + room.height)) < 0.1) {
                wallType = 'south';
            }
            // Check if doorway is on the west wall
            else if (Math.abs(doorPoint.x - room.x) < 0.1) {
                wallType = 'west';
            }
            // Check if doorway is on the east wall
            else if (Math.abs(doorPoint.x - (room.x + room.width)) < 0.1) {
                wallType = 'east';
            }
        }
        
        let doorX, doorY, doorWidth, doorHeight;
        
        // Position doorway based on the wall type
        if (wallType === 'north') {
            doorX = doorPoint.x - this.settings.doorwayWidth / 2;
            doorY = room.y - this.settings.gridSize;
            doorWidth = this.settings.doorwayWidth;
            doorHeight = this.settings.gridSize;
        } else if (wallType === 'south') {
            doorX = doorPoint.x - this.settings.doorwayWidth / 2;
            doorY = room.y + room.height;
            doorWidth = this.settings.doorwayWidth;
            doorHeight = this.settings.gridSize;
        } else if (wallType === 'east') {
            doorX = room.x + room.width;
            doorY = doorPoint.y - this.settings.doorwayWidth / 2;
            doorWidth = this.settings.gridSize;
            doorHeight = this.settings.doorwayWidth;
        } else if (wallType === 'west') {
            doorX = room.x - this.settings.gridSize;
            doorY = doorPoint.y - this.settings.doorwayWidth / 2;
            doorWidth = this.settings.gridSize;
            doorHeight = this.settings.doorwayWidth;
        }
        
        // Create the doorway object
        const doorway = {
            x: doorX,
            y: doorY,
            width: doorWidth,
            height: doorHeight,
            isEastWall: wallType === 'east',
            isNorthWall: wallType === 'north'
        };
        
        // Add doorway to the room
        room.doorways.push(doorway);
    }
    
    placeKey(outerRooms, satelliteRooms) {
        // Prefer placing the key in a satellite room if available
        if (satelliteRooms.length > 0) {
            // Choose a random satellite room
            const keyRoom = satelliteRooms[Math.floor(Math.random() * satelliteRooms.length)];
            
            return {
                x: keyRoom.x + keyRoom.width / 2,
                y: keyRoom.y + keyRoom.height / 2
            };
        }
        
        // Fallback to an outer room
        const keyRoom = outerRooms[outerRooms.length - 1];
        
        return {
            x: keyRoom.x + keyRoom.width / 2,
            y: keyRoom.y + keyRoom.height / 2
        };
    }
    
    createDungeonMesh(rooms, corridors, keyPosition) {
        // Create a group to hold all dungeon meshes
        const dungeonGroup = new THREE.Group();
        
        // Create materials
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x666666,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444444,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const keyMaterial = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0xffcc00,
            emissiveIntensity: 0.5
        });
        
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.5,
            metalness: 0.3
        });
        
        // Array to store collider meshes
        dungeonGroup.colliderMeshes = [];
        
        // Add room floors, walls, and features
        for (const room of rooms) {
            // Create floor
            const floorGeometry = new THREE.BoxGeometry(
                room.width * this.settings.gridSize,
                this.settings.floorHeight,
                room.height * this.settings.gridSize
            );
            
            const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
            floorMesh.position.set(
                room.x + (room.width * this.settings.gridSize) / 2,
                -this.settings.floorHeight / 2,
                room.y + (room.height * this.settings.gridSize) / 2
            );
            floorMesh.receiveShadow = true;
            
            // Add collision to floor - prevents falling through
            dungeonGroup.colliderMeshes.push(floorMesh);
            dungeonGroup.add(floorMesh);
            
            // Create walls with doorways
            this.createRoomWalls(dungeonGroup, room, wallMaterial);
            
            // Add room features (pillars, alcoves)
            for (const feature of room.features) {
                if (feature.type === 'pillar') {
                    this.createPillar(dungeonGroup, feature, pillarMaterial);
                } else if (feature.type === 'alcove') {
                    this.createAlcove(dungeonGroup, room, feature, floorMaterial, wallMaterial);
                }
            }
        }
        
        // Add corridor floors and walls
        for (const corridor of corridors) {
            this.createCorridorSegments(dungeonGroup, corridor, floorMaterial, wallMaterial);
        }
        
        // Add key
        const keyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const keyMesh = new THREE.Mesh(keyGeometry, keyMaterial);
        keyMesh.position.set(
            keyPosition.x,
            1, // Floating above the floor
            keyPosition.y
        );
        
        // Add a point light to the key to make it glow
        const keyLight = new THREE.PointLight(0xffcc00, 1, 10);
        keyLight.position.copy(keyMesh.position);
        dungeonGroup.add(keyLight);
        
        keyMesh.castShadow = true;
        dungeonGroup.add(keyMesh);
        
        return dungeonGroup;
    }
    
    createPillar(group, pillarInfo, material) {
        let pillarGeometry;
        const pillarHeight = this.settings.wallHeight * 1.5; // Make pillars a bit taller
        
        // Create different shaped pillars
        if (pillarInfo.shape === 'square') {
            pillarGeometry = new THREE.BoxGeometry(
                pillarInfo.width, 
                pillarHeight, 
                pillarInfo.height
            );
        } else if (pillarInfo.shape === 'circle') {
            const radius = pillarInfo.width / 2;
            pillarGeometry = new THREE.CylinderGeometry(
                radius, // top radius
                radius, // bottom radius
                pillarHeight, // height
                16 // segments
            );
            // Rotate to stand upright
            pillarGeometry.rotateX(Math.PI / 2);
        } else if (pillarInfo.shape === 'triangle') {
            // Create a triangular prism
            const shape = new THREE.Shape();
            const size = pillarInfo.width;
            
            shape.moveTo(0, 0);
            shape.lineTo(size, 0);
            shape.lineTo(size / 2, size);
            shape.lineTo(0, 0);
            
            const extrudeSettings = {
                steps: 1,
                depth: pillarHeight,
                bevelEnabled: false
            };
            
            pillarGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            // Rotate to stand upright
            pillarGeometry.rotateX(Math.PI / 2);
        }
        
        const pillarMesh = new THREE.Mesh(pillarGeometry, material);
        
        // Position the pillar
        if (pillarInfo.shape === 'square' || pillarInfo.shape === 'circle') {
            pillarMesh.position.set(
                pillarInfo.x + pillarInfo.width / 2,
                pillarHeight / 2, // Position on the floor
                pillarInfo.y + pillarInfo.height / 2
            );
        } else if (pillarInfo.shape === 'triangle') {
            pillarMesh.position.set(
                pillarInfo.x,
                0, // Position on the floor
                pillarInfo.y
            );
        }
        
        pillarMesh.castShadow = true;
        pillarMesh.receiveShadow = true;
        
        // Add collision to the pillar
        group.colliderMeshes.push(pillarMesh);
        group.add(pillarMesh);
    }
    
    createAlcove(group, room, alcoveInfo, floorMaterial, wallMaterial) {
        // Create the alcove floor
        const floorGeometry = new THREE.BoxGeometry(
            alcoveInfo.width * this.settings.gridSize,
            this.settings.floorHeight,
            alcoveInfo.height * this.settings.gridSize
        );
        
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.set(
            alcoveInfo.x + (alcoveInfo.width * this.settings.gridSize) / 2,
            -this.settings.floorHeight / 2,
            alcoveInfo.y + (alcoveInfo.height * this.settings.gridSize) / 2
        );
        floorMesh.receiveShadow = true;
        
        // Add collision to floor
        group.colliderMeshes.push(floorMesh);
        group.add(floorMesh);
        
        // Create walls for the alcove
        // Based on which edge the alcove is connected to, we'll skip that wall
        const skipEdge = alcoveInfo.edge;
        
        // Create north wall if not connected to the room's north
        if (skipEdge !== 'north') {
            const wallMesh = this.createWall(
                group,
                alcoveInfo.x,
                alcoveInfo.y,
                alcoveInfo.width * this.settings.gridSize,
                this.settings.wallHeight,
                this.settings.gridSize,
                wallMaterial
            );
            group.colliderMeshes.push(wallMesh);
        }
        
        // Create south wall if not connected to the room's south
        if (skipEdge !== 'south') {
            const wallMesh = this.createWall(
                group,
                alcoveInfo.x,
                alcoveInfo.y + alcoveInfo.height * this.settings.gridSize - this.settings.gridSize,
                alcoveInfo.width * this.settings.gridSize,
                this.settings.wallHeight,
                this.settings.gridSize,
                wallMaterial
            );
            group.colliderMeshes.push(wallMesh);
        }
        
        // Create west wall if not connected to the room's west
        if (skipEdge !== 'west') {
            const wallMesh = this.createWall(
                group,
                alcoveInfo.x,
                alcoveInfo.y,
                this.settings.gridSize,
                this.settings.wallHeight,
                alcoveInfo.height * this.settings.gridSize,
                wallMaterial,
                true
            );
            group.colliderMeshes.push(wallMesh);
        }
        
        // Create east wall if not connected to the room's east
        if (skipEdge !== 'east') {
            const wallMesh = this.createWall(
                group,
                alcoveInfo.x + alcoveInfo.width * this.settings.gridSize - this.settings.gridSize,
                alcoveInfo.y,
                this.settings.gridSize,
                this.settings.wallHeight,
                alcoveInfo.height * this.settings.gridSize,
                wallMaterial,
                true
            );
            group.colliderMeshes.push(wallMesh);
        }
    }
    
    createCorridorSegments(group, corridor, floorMaterial, wallMaterial) {
        const points = corridor.points;
        
        // Create segments between each pair of points
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Determine corridor orientation and dimensions
            let width, depth, x, z;
            const isHorizontal = Math.abs(p1.y - p2.y) < 0.1;
            
            if (isHorizontal) {
                // Horizontal corridor
                width = Math.abs(p2.x - p1.x);
                depth = corridor.width;
                x = Math.min(p1.x, p2.x);
                z = p1.y - depth / 2;
            } else {
                // Vertical corridor
                width = corridor.width;
                depth = Math.abs(p2.y - p1.y);
                x = p1.x - width / 2;
                z = Math.min(p1.y, p2.y);
            }
            
            // Create corridor floor
            const corridorGeometry = new THREE.BoxGeometry(width, this.settings.floorHeight, depth);
            const corridorMesh = new THREE.Mesh(corridorGeometry, floorMaterial);
            
            corridorMesh.position.set(
                x + width / 2,
                -this.settings.floorHeight / 2,
                z + depth / 2
            );
            
            corridorMesh.receiveShadow = true;
            group.colliderMeshes.push(corridorMesh);
            group.add(corridorMesh);
            
            // Add walls along the corridor
            if (isHorizontal) {
                // Add north and south walls for horizontal corridors
                
                // North wall
                const northWall = this.createWall(
                    group,
                    x,
                    z,
                    width,
                    this.settings.wallHeight,
                    this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(northWall);
                
                // South wall
                const southWall = this.createWall(
                    group,
                    x,
                    z + depth - this.settings.gridSize,
                    width,
                    this.settings.wallHeight,
                    this.settings.gridSize,
                    wallMaterial
                );
                group.colliderMeshes.push(southWall);
            } else {
                // Add east and west walls for vertical corridors
                
                // West wall
                const westWall = this.createWall(
                    group,
                    x,
                    z,
                    this.settings.gridSize,
                    this.settings.wallHeight,
                    depth,
                    wallMaterial,
                    true
                );
                group.colliderMeshes.push(westWall);
                
                // East wall
                const eastWall = this.createWall(
                    group,
                    x + width - this.settings.gridSize,
                    z,
                    this.settings.gridSize,
                    this.settings.wallHeight,
                    depth,
                    wallMaterial,
                    true
                );
                group.colliderMeshes.push(eastWall);
            }
        }
    }
    
    createRoomWalls(group, room, wallMaterial) {
        // Get doorway info for this room
        const doorways = room.doorways || [];
        
        // Create north wall with possible doorway gaps
        this.createWallWithDoorways(
            group,
            room.x,
            room.y,
            room.width * this.settings.gridSize,
            this.settings.wallHeight,
            this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => d.isNorthWall)
        );
        
        // Create south wall with possible doorway gaps
        this.createWallWithDoorways(
            group,
            room.x,
            room.y + room.height * this.settings.gridSize - this.settings.gridSize,
            room.width * this.settings.gridSize,
            this.settings.wallHeight,
            this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => !d.isNorthWall && !d.isEastWall)
        );
        
        // Create west wall with possible doorway gaps
        this.createWallWithDoorways(
            group,
            room.x,
            room.y,
            this.settings.gridSize,
            this.settings.wallHeight,
            room.height * this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => !d.isEastWall),true
        );
        
        // Create east wall with possible doorway gaps
        this.createWallWithDoorways(
            group,
            room.x + room.width * this.settings.gridSize - this.settings.gridSize,
            room.y,
            this.settings.gridSize,
            this.settings.wallHeight,
            room.height * this.settings.gridSize,
            wallMaterial,
            doorways.filter(d => d.isEastWall),
            true
        );
    }
    
    createWallWithDoorways(group, x, y, width, height, depth, material, doorways, isVertical = false) {
        // If no doorways, create a single wall
        if (!doorways || doorways.length === 0) {
            const wallMesh = this.createWall(group, x, y, width, height, depth, material, isVertical);
            group.colliderMeshes.push(wallMesh);
            return;
        }
        
        // For walls with doorways, create wall segments
        if (isVertical) {
            // Vertical wall (west or east wall)
            // Sort doorways by Y position
            doorways.sort((a, b) => a.y - b.y);
            
            let currentY = y;
            
            for (const doorway of doorways) {
                // Create wall segment from current position to doorway
                if (doorway.y > currentY) {
                    const segmentHeight = doorway.y - currentY;
                    const wallMesh = this.createWall(
                        group, 
                        x, 
                        currentY, 
                        width, 
                        height, 
                        segmentHeight, 
                        material,
                        isVertical
                    );
                    group.colliderMeshes.push(wallMesh);
                }
                
                // Skip the doorway
                currentY = doorway.y + doorway.height;
            }
            
            // Create final wall segment after the last doorway
            const endY = y + depth;
            if (currentY < endY) {
                const segmentHeight = endY - currentY;
                const wallMesh = this.createWall(
                    group, 
                    x, 
                    currentY, 
                    width, 
                    height, 
                    segmentHeight, 
                    material,
                    isVertical
                );
                group.colliderMeshes.push(wallMesh);
            }
        } else {
            // Horizontal wall (north or south wall)
            // Sort doorways by X position
            doorways.sort((a, b) => a.x - b.x);
            
            let currentX = x;
            
            for (const doorway of doorways) {
                // Create wall segment from current position to doorway
                if (doorway.x > currentX) {
                    const segmentWidth = doorway.x - currentX;
                    const wallMesh = this.createWall(
                        group, 
                        currentX, 
                        y, 
                        segmentWidth, 
                        height, 
                        depth, 
                        material,
                        isVertical
                    );
                    group.colliderMeshes.push(wallMesh);
                }
                
                // Skip the doorway
                currentX = doorway.x + doorway.width;
            }
            
            // Create final wall segment after the last doorway
            const endX = x + width;
            if (currentX < endX) {
                const segmentWidth = endX - currentX;
                const wallMesh = this.createWall(
                    group, 
                    currentX, 
                    y, 
                    segmentWidth, 
                    height, 
                    depth, 
                    material,
                    isVertical
                );
                group.colliderMeshes.push(wallMesh);
            }
        }
    }
    
    createWall(group, x, y, width, height, depth, material, isVertical = false) {
        const wallGeometry = new THREE.BoxGeometry(width, height, depth);
        const wallMesh = new THREE.Mesh(wallGeometry, material);
        
        wallMesh.position.set(
            x + width / 2,
            height / 2,
            y + depth / 2
        );
        
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        
        group.add(wallMesh);
        
        return wallMesh;
    }
}




