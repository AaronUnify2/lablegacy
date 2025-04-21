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
    
    // Draw rooms
    rooms.forEach(room => {
        // Skip corridors since we already drew them
        if (room.isCorridor) return;
        
        // Choose color based on room type
        let fillColor;
        
        if (room.isSpawnRoom) {
            // Center/spawn room
            fillColor = 'rgba(50, 180, 255, 0.8)';
        } else if (room.roomType === 'cardinalPlus') {
            // CardinalPlus rooms - use a purple color to make them stand out
            fillColor = 'rgba(180, 100, 220, 0.8)';
        } else if (room.roomType === 'radial') {
            // Radial rooms
            fillColor = 'rgba(100, 200, 100, 0.8)';
        } else if (room.roomType === 'cardinal') {
            // Cardinal rooms
            fillColor = 'rgba(200, 150, 50, 0.8)';
        } else {
            // Other normal rooms
            fillColor = 'rgba(200, 200, 200, 0.7)';
        }
        
        const x = toMinimapX(room.x);
        const z = toMinimapZ(room.z);
        const width = room.width * scale;
        const height = room.height * scale;
        
        // Fill room
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, z, width, height);
        
        // Add border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, z, width, height);
        
        // Add a special marker for cardinalPlus rooms to highlight them
        if (room.roomType === 'cardinalPlus') {
            const centerX = x + width / 2;
            const centerZ = z + height / 2;
            
            // Draw a small diamond in the center of cardinalPlus rooms
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.moveTo(centerX, centerZ - 3);
            ctx.lineTo(centerX + 3, centerZ);
            ctx.lineTo(centerX, centerZ + 3);
            ctx.lineTo(centerX - 3, centerZ);
            ctx.closePath();
            ctx.fill();
        }
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
