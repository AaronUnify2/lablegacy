// src/dungeon/themes.js - Dungeon visual themes

// Define dungeon themes with specific colors and decorations
const dungeonThemes = {
    // Stone dungeon theme (default)
    stone: {
        name: 'Stone Dungeon',
        floorColor: 0x555555,
        wallColor: 0x333333,
        ceilingColor: 0x222222,
        decorations: ['torch', 'barrel', 'crate', 'rock'],
        ambientLight: {
            color: 0x404040,
            intensity: 0.5
        },
        fogColor: 0x000000,
        fogDensity: 0.03
    },
    
    // Cave theme
    cave: {
        name: 'Natural Cave',
        floorColor: 0x443322,
        wallColor: 0x332211,
        ceilingColor: 0x221100,
        decorations: ['rock', 'torch', 'stalagmite'],
        ambientLight: {
            color: 0x221100,
            intensity: 0.3
        },
        fogColor: 0x000000,
        fogDensity: 0.05
    },
    
    // Ancient ruins theme
    ruins: {
        name: 'Ancient Ruins',
        floorColor: 0x998877,
        wallColor: 0x887766,
        ceilingColor: 0x776655,
        decorations: ['pillar', 'statue', 'rubble', 'torch'],
        ambientLight: {
            color: 0x776655,
            intensity: 0.4
        },
        fogColor: 0x112233,
        fogDensity: 0.02
    },
    
    // Crypt theme
    crypt: {
        name: 'Dark Crypt',
        floorColor: 0x222222,
        wallColor: 0x111111,
        ceilingColor: 0x000000,
        decorations: ['tombstone', 'bones', 'cobweb', 'torch'],
        ambientLight: {
            color: 0x110000,
            intensity: 0.2
        },
        fogColor: 0x000000,
        fogDensity: 0.06
    },
    
    // Forest themed dungeon
    forest: {
        name: 'Overgrown Forest',
        floorColor: 0x225522,
        wallColor: 0x336633,
        ceilingColor: 0x224422,
        decorations: ['bush', 'mushroom', 'stump', 'vine'],
        ambientLight: {
            color: 0x225522,
            intensity: 0.6
        },
        fogColor: 0x113311,
        fogDensity: 0.03
    }
};

// Get theme based on floor number
export function getDungeonTheme(floorNumber) {
    // Determine which theme to use based on floor number
    // Different sections of the dungeon can have different themes
    
    if (floorNumber <= 3) {
        return dungeonThemes.stone;
    } else if (floorNumber <= 6) {
        return dungeonThemes.cave;
    } else if (floorNumber <= 9) {
        return dungeonThemes.ruins;
    } else if (floorNumber <= 12) {
        return dungeonThemes.crypt;
    } else {
        return dungeonThemes.forest;
    }
}

// Get theme by name
export function getThemeByName(themeName) {
    return dungeonThemes[themeName] || dungeonThemes.stone;
}

// Get all available themes
export function getAllThemes() {
    return Object.values(dungeonThemes);
}
