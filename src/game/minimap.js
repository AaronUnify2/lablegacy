// src/game/minimap.js - Enhanced minimap for radial dungeon layout

// Initialize minimap
export function initMinimap() {
    const minimapCanvas = document.getElementById('minimap-canvas');
    if (!minimapCanvas) return null;
    
    const ctx = minimapCanvas.getContext('2d');
    
    // Set canvas dimensions to match its display size
    minimapCanvas.width = minimapCanvas.offsetWidth;
    minimapCanvas.height = minimapCanvas.offsetHeight;
    
    return ctx;
}

// Clear minimap
function clearMinimap(ctx, canvas) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
}

// Update minimap with current dungeon state
export function updateMinimap(ctx, dungeon, player) {
    if (!ctx || !dungeon) return;
    
    const canvas = ctx.canvas;
    clearMinimap(ctx, canvas);
    
    const rooms = dungeon.getRooms();
    const corridors = dungeon.corridors;
    
    // Calculate dungeon bounds
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    
    [...rooms, ...corridors].forEach(room => {
        minX = Math.min(minX, room.x);
        maxX = Math.max(maxX, room.x + room.width);
        minZ = Math.min(minZ, room.z);
        maxZ = Math.max(maxZ, room.z + room.height);
    });
    
    // Add some padding
    const padding = 10;
    minX -= padding;
    maxX += padding;
    minZ -= padding;
    maxZ += padding;
    
    // Calculate scale factors
    const dungeonWidth = maxX - minX;
    const dungeonHeight = maxZ - minZ;
    const scaleX = (canvas.width - 10) / dungeonWidth;
    const scaleZ = (canvas.height - 10) / dungeonHeight;
    const scale = Math.min(scaleX, scaleZ);
    
    // Center the dungeon in the minimap
    const offsetX = (canvas.width - dungeonWidth * scale) / 2;
    const offsetZ = (canvas.height - dungeonHeight * scale) / 2;
    
    // Convert world coordinates to minimap coordinates
    function toMinimapX(worldX) {
        return offsetX + (worldX - minX) * scale;
    }
    
    function toMinimapZ(worldZ) {
        return offsetZ + (worldZ - minZ) * scale;
    }
    
    // First pass: Map alcoves to their parent room types
    // We'll create a map of alcove rooms to their parent room colors
    const alcoveColors = new Map();
    
    // Find non-alcove rooms first to establish their colors
    const roomColors = new Map();
    rooms.forEach(room => {
        if (room.isCorridor || room.roomType === 'alcove') return;
        
        let color;
        if (room.isSpawnRoom) {
            color = 'rgba(50, 180, 255, 0.8)'; // Blue for spawn room
        } else if (room.roomType === 'cardinalPlus') {
            color = 'rgba(180, 100, 220, 0.8)'; // Purple for cardinalPlus
        } else if (room.roomType === 'radial') {
            color = 'rgba(100, 200, 100, 0.8)'; // Green for radial
        } else if (room.roomType === 'cardinal') {
            color = 'rgba(200, 150, 50, 0.8)'; // Orange/gold for cardinal
        } else {
            color = 'rgba(200, 200, 200, 0.7)'; // Gray for normal rooms
        }
        
        roomColors.set(room, color);
    });
    
    // Draw corridors first (so they appear behind rooms)
    corridors.forEach(corridor => {
        // Different color for sloped corridors
        ctx.fillStyle = corridor.isSloped ? 'rgba(160, 160, 160, 0.5)' : 'rgba(130, 130, 130, 0.5)';
        
        const x = toMinimapX(corridor.x);
        const z = toMinimapZ(corridor.z);
        const width = corridor.width * scale;
        const height = corridor.height * scale;
        
        ctx.fillRect(x, z, width, height);
    });
    
    // Find parent room for each alcove by checking which non-alcove room it's closest to
    // This is a simple approximation - ideally we'd use the actual connection data
    const alcoveRooms = rooms.filter(room => room.roomType === 'alcove');
    const nonAlcoveRooms = rooms.filter(room => !room.isCorridor && room.roomType !== 'alcove');
    
    alcoveRooms.forEach(alcove => {
        let closestRoom = null;
        let minDistance = Infinity;
        
        // Find the closest non-alcove room
        for (const room of nonAlcoveRooms) {
            const distance = calculateDistance(alcove, room);
            if (distance < minDistance) {
                minDistance = distance;
                closestRoom = room;
            }
        }
        
        if (closestRoom) {
            const parentColor = roomColors.get(closestRoom);
            if (parentColor) {
                // Make alcove color slightly brighter than parent room
                const brighterColor = makeColorBrighter(parentColor);
                alcoveColors.set(alcove, brighterColor);
            } else {
                // Fallback color if parent room color not found
                alcoveColors.set(alcove, 'rgba(220, 220, 220, 0.7)');
            }
        }
    });
    
    // Now draw all rooms
    rooms.forEach(room => {
        // Skip corridors since we already drew them
        if (room.isCorridor) return;
        
        // Choose color based on room type
        let fillColor;
        
        if (room.roomType === 'alcove') {
            // Use the parent room color we determined earlier
            fillColor = alcoveColors.get(room) || 'rgba(220, 220, 220, 0.7)';
        } else {
            fillColor = roomColors.get(room) || 'rgba(200, 200, 200, 0.7)';
        }
        
        const x = toMinimapX(room.x);
        const z = toMinimapZ(room.z);
        const width = room.width * scale;
        const height = room.height * scale;
        
        // Fill room
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, z, width, height);
        
        // Add thinner border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 0.5; // Reduced from 1 to make borders lighter
        ctx.strokeRect(x, z, width, height);
    });
    
    // Draw key and exit if they exist
    if (dungeon.keyPosition) {
        const x = toMinimapX(dungeon.keyPosition.x);
        const z = toMinimapZ(dungeon.keyPosition.z);
        
        // Draw key as a star or diamond shape
        ctx.fillStyle = dungeon.isKeyCollected() ? 'rgba(100, 255, 100, 0.8)' : 'rgba(255, 215, 0, 1)'; // Gold color
        ctx.beginPath();
        ctx.moveTo(x, z - 5);
        ctx.lineTo(x + 4, z - 1);
        ctx.lineTo(x, z + 3);
        ctx.lineTo(x - 4, z - 1);
        ctx.closePath();
        ctx.fill();
    }
    
    if (dungeon.exitPosition) {
        const x = toMinimapX(dungeon.exitPosition.x);
        const z = toMinimapZ(dungeon.exitPosition.z);
        
        // Draw exit as a circle
        ctx.fillStyle = dungeon.isKeyCollected() ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(x, z, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // NEW CODE: Draw chests on the minimap
    if (dungeon.chests && dungeon.chests.length > 0) {
        console.log(`Drawing ${dungeon.chests.length} chests on minimap`);
        
        dungeon.chests.forEach((chest, index) => {
            const chestPos = chest.getPosition();
            const x = toMinimapX(chestPos.x);
            const z = toMinimapZ(chestPos.z);
            
            // Choose color based on chest tier
            let chestColor;
            switch(chest.tier) {
                case 'uncommon':
                    chestColor = 'rgba(192, 192, 192, 1)'; // Silver
                    break;
                case 'rare':
                    chestColor = 'rgba(255, 215, 0, 1)'; // Gold
                    break;
                case 'epic':
                    chestColor = 'rgba(153, 50, 204, 1)'; // Purple
                    break;
                case 'common':
                default:
                    chestColor = 'rgba(139, 69, 19, 1)'; // Brown
            }
            
            // Draw chest as a square with outer glow
            const chestSize = 5;
            
            // Draw glow
            ctx.fillStyle = chestColor.replace('1)', '0.5)'); // Transparent version
            ctx.beginPath();
            ctx.arc(x, z, chestSize + 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw chest
            ctx.fillStyle = chestColor;
            ctx.fillRect(x - chestSize/2, z - chestSize/2, chestSize, chestSize);
            
            // Add a border
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - chestSize/2, z - chestSize/2, chestSize, chestSize);
            
            // Add an X if chest is open
            if (chest.isOpen) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x - chestSize/2 + 1, z - chestSize/2 + 1);
                ctx.lineTo(x + chestSize/2 - 1, z + chestSize/2 - 1);
                ctx.moveTo(x + chestSize/2 - 1, z - chestSize/2 + 1);
                ctx.lineTo(x - chestSize/2 + 1, z + chestSize/2 - 1);
                ctx.stroke();
            }
            
            // Log chest position for debugging
            console.log(`Chest ${index}: world pos (${chestPos.x.toFixed(2)}, ${chestPos.z.toFixed(2)}), minimap pos (${x.toFixed(2)}, ${z.toFixed(2)})`);
        });
    } else {
        console.log("No chests found in dungeon data");
    }
    
    // Draw player position
    if (player) {
        const playerPos = player.getPosition();
        const x = toMinimapX(playerPos.x);
        const z = toMinimapZ(playerPos.z);
        
        // Draw player as a triangle indicating direction
        const rotation = player.rotation;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.beginPath();
        ctx.moveTo(
            x + Math.sin(rotation) * 6,
            z + Math.cos(rotation) * 6
        );
        ctx.lineTo(
            x + Math.sin(rotation + 2.5) * 4,
            z + Math.cos(rotation + 2.5) * 4
        );
        ctx.lineTo(
            x + Math.sin(rotation - 2.5) * 4,
            z + Math.cos(rotation - 2.5) * 4
        );
        ctx.closePath();
        ctx.fill();
    }
}

// Helper function to calculate distance between room centers
function calculateDistance(room1, room2) {
    const centerX1 = room1.x + room1.width / 2;
    const centerZ1 = room1.z + room1.height / 2;
    const centerX2 = room2.x + room2.width / 2;
    const centerZ2 = room2.z + room2.height / 2;
    
    return Math.sqrt(
        Math.pow(centerX2 - centerX1, 2) + 
        Math.pow(centerZ2 - centerZ1, 2)
    );
}

// Helper function to make a color slightly brighter
function makeColorBrighter(rgbaColor) {
    // Parse rgba values
    const matches = rgbaColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (!matches) return rgbaColor;
    
    const r = parseInt(matches[1], 10);
    const g = parseInt(matches[2], 10);
    const b = parseInt(matches[3], 10);
    const a = parseFloat(matches[4]);
    
    // Make the color slightly brighter (max 255)
    const brighterR = Math.min(r + 20, 255);
    const brighterG = Math.min(g + 20, 255);
    const brighterB = Math.min(b + 20, 255);
    
    return `rgba(${brighterR}, ${brighterG}, ${brighterB}, ${a})`;
}
