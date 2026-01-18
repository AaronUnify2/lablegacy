// ============================================
// ECHOES OF THE OBELISK - Main Game Controller
// ============================================

import * as THREE from 'three';
import { initDungeon, updateDungeon, getDungeonScene, disposeDungeon, getRoomData, checkRoomTransition, getCurrentRoom, setCurrentRoom, ROOM_TYPES } from './dungeon.js';
import { initEntities, updateEntities, getPlayer, spawnEnemiesForRoom, clearAllEnemies, getEnemies, disposeBosses, playerTakeDamage, isPlayerDead, getXPGained, resetXPGained, spawnMiniBoss, spawnPillarBoss, getBoss, disposePillarBoss, clearPlatformCache } from './entities.js';
import { initControls, updateControls, getInputState, disposeControls, enableControls, disableControls, resetCamera } from './controls.js';
import { initTown, updateTown, getTownScene, disposeTown, getNPCInteraction, showTownUI, hideTownUI } from './town.js';

// ============================================
// GAME STATE
// ============================================

export const GameState = {
    LOADING: 'loading',
    MAIN_MENU: 'main_menu',
    TOWN: 'town',
    DUNGEON: 'dungeon',
    PAUSED: 'paused',
    DIALOGUE: 'dialogue',
    SHOP: 'shop',
    DEATH: 'death',
    VICTORY: 'victory',
    FLOOR_SELECT: 'floor_select',
    FINAL_VICTORY: 'final_victory'
};

// ============================================
// GAME DATA
// ============================================

const gameData = {
    state: GameState.LOADING,
    previousState: null,
    
    // Player stats
    player: {
        maxHealth: 100,
        health: 100,
        xp: 0,
        xpThisRun: 0
    },
    
    // Progression
    currentFloor: 1,
    highestFloorUnlocked: 1,
    roomsCleared: {
        east: false,
        west: false,
        north: false,
        south: false
    },
    
    // Upgrades (levels 0-10)
    upgrades: {
        baseDamage: 0,
        fireRate: 0,
        aimAssist: 0,
        maxHealth: 0,
        cooldownReduction: 0,
        abilityDamage: 0
    },
    
    // Abilities unlocked
    abilities: {
        spread: false,
        burst: false,
        mega: false
    },
    
    // Town state
    npcsUnlocked: ['guide'],
    
    // Dialogue queue
    dialogueQueue: [],
    currentDialogue: null,
    
    // Current shop data
    currentShop: null
};

// ============================================
// THREE.JS SETUP
// ============================================

let renderer, currentScene, clock;
let animationFrameId;

function initRenderer() {
    const canvas = document.getElementById('game-canvas');
    
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: false, // Disable for mobile performance
        powerPreference: 'high-performance'
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio for performance
    renderer.shadowMap.enabled = false; // Disable shadows for mobile
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8; // Much brighter for better visibility
    
    clock = new THREE.Clock();
    
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    renderer.setSize(width, height);
    
    // Camera resize handled in controls.js
}

// ============================================
// LOADING SYSTEM
// ============================================

async function loadGame() {
    const progressBar = document.getElementById('loading-progress');
    const loadingText = document.getElementById('loading-text');
    
    const steps = [
        { text: 'Initializing renderer...', progress: 10 },
        { text: 'Loading dungeon systems...', progress: 30 },
        { text: 'Preparing entities...', progress: 50 },
        { text: 'Setting up controls...', progress: 70 },
        { text: 'Building expedition camp...', progress: 90 },
        { text: 'Ready.', progress: 100 }
    ];
    
    try {
        // Step 1: Renderer
        loadingText.textContent = steps[0].text;
        progressBar.style.width = steps[0].progress + '%';
        initRenderer();
        await sleep(200);
        
        // Step 2: Dungeon
        loadingText.textContent = steps[1].text;
        progressBar.style.width = steps[1].progress + '%';
        await initDungeon(renderer);
        await sleep(200);
        
        // Step 3: Entities
        loadingText.textContent = steps[2].text;
        progressBar.style.width = steps[2].progress + '%';
        await initEntities();
        await sleep(200);
        
        // Step 4: Controls
        loadingText.textContent = steps[3].text;
        progressBar.style.width = steps[3].progress + '%';
        await initControls(renderer);
        await sleep(200);
        
        // Step 5: Town
        loadingText.textContent = steps[4].text;
        progressBar.style.width = steps[4].progress + '%';
        await initTown(renderer, gameData.npcsUnlocked);
        await sleep(200);
        
        // Step 6: Complete
        loadingText.textContent = steps[5].text;
        progressBar.style.width = steps[5].progress + '%';
        await sleep(500);
        
        // Load saved game if exists
        loadSavedGame();
        
        // Start game
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('fade-out');
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            enterTown();
            startGameLoop();
        }, 500);
        
    } catch (error) {
        console.error('Failed to load game:', error);
        loadingText.textContent = 'Error loading game. Please refresh.';
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// GAME LOOP
// ============================================

function startGameLoop() {
    function loop() {
        animationFrameId = requestAnimationFrame(loop);
        
        const delta = Math.min(clock.getDelta(), 0.1); // Cap delta to prevent huge jumps
        
        update(delta);
        render();
    }
    
    loop();
}

function update(delta) {
    switch (gameData.state) {
        case GameState.TOWN:
            updateTown(delta, gameData);
            updateControls(delta, getTownScene(), true);
            checkTownInteractions();
            break;
            
        case GameState.DUNGEON:
            updateDungeon(delta, gameData.currentFloor);
            updateEntities(delta, gameData, getInputState());
            updateControls(delta, getDungeonScene(), false);
            checkRoomTransitions();
            checkCombatState();
            updateHUD();
            break;
            
        case GameState.PAUSED:
        case GameState.DIALOGUE:
        case GameState.SHOP:
        case GameState.FLOOR_SELECT:
            // No game updates while in menus
            break;
    }
}

function render() {
    if (!currentScene) return;
    
    const camera = getInputState().camera;
    if (camera) {
        renderer.render(currentScene, camera);
    }
}

// ============================================
// STATE TRANSITIONS
// ============================================

function setState(newState) {
    gameData.previousState = gameData.state;
    gameData.state = newState;
}

function enterTown() {
    setState(GameState.TOWN);
    currentScene = getTownScene();
    
    // Reset player position and camera for town
    const player = getPlayer();
    if (player) {
        player.position.set(0, 0, 5);
        player.rotation.y = Math.PI;
    }
    resetCamera(true);
    
    showTownUI();
    hideHUD();
    enableControls();
    
    updateTownXPDisplay();
    
    // Show welcome dialogue for new players
    if (gameData.highestFloorUnlocked === 1 && !gameData.hasSeenIntro) {
        gameData.hasSeenIntro = true;
        showDialogue([
            { speaker: 'THE GUIDE', text: 'You\'ve come. The dreams led you here, as they led us all.' },
            { speaker: 'THE GUIDE', text: 'Beyond that door lies the Obelisk. Sealed for centuries. Waiting.' },
            { speaker: 'THE GUIDE', text: 'You are the first to survive its threshold. Others have tried. The madness took them.' },
            { speaker: 'THE GUIDE', text: 'I cannot follow where you must go. But I will be here when you return.' }
        ]);
    }
}

function enterDungeon(floor) {
    gameData.currentFloor = floor;
    gameData.roomsCleared = { east: false, west: false, north: false, south: false };
    gameData.player.health = gameData.player.maxHealth;
    gameData.player.xpThisRun = 0;
    
    setState(GameState.DUNGEON);
    currentScene = getDungeonScene();
    
    // Set up dungeon for this floor
    disposeDungeon();
    clearPlatformCache(); // Clear cached platform references
    initDungeon(renderer, floor);
    currentScene = getDungeonScene();
    
    // Position player in center room
    const player = getPlayer();
    if (player) {
        player.position.set(0, 0, 0);
        player.rotation.y = 0;
    }
    
    setCurrentRoom('center');
    resetCamera(false);
    clearAllEnemies();
    
    hideTownUI();
    showHUD();
    enableControls();
    
    updateFloorDisplay();
    
    // Floor introduction dialogue
    showFloorIntroDialogue(floor);
}

function showFloorIntroDialogue(floor) {
    const intros = {
        1: [{ speaker: '', text: 'The air hums with dormant energy. Ancient machines slumber in the darkness.' }],
        2: [{ speaker: '', text: 'Deeper now. The walls bear scars of something that tried to escape.' }],
        3: [{ speaker: '', text: 'Warning glyphs flicker to life as you descend. They speak of containment.' }],
        4: [{ speaker: '', text: 'The metal gives way to something organic. Roots push through cracked conduits.' }],
        5: [{ speaker: '', text: 'Dreams and machinery intertwine here. The boundary weakens.' }],
        6: [{ speaker: '', text: 'Whispers echo without source. The Obelisk knows you\'re coming.' }],
        7: [{ speaker: '', text: 'Light filters from below. Impossible. Beautiful. Wrong.' }],
        8: [{ speaker: '', text: 'The dream-world bleeds through. Reality answers to different rules here.' }],
        9: [{ speaker: '', text: 'You stand at the threshold of the dream itself. The core pulses ahead.' }],
        10: [
            { speaker: '', text: 'The heart of the Obelisk. Centuries of corrupted knowledge converge here.' },
            { speaker: '', text: 'Something waits. Something that has waited a very long time.' }
        ]
    };
    
    if (intros[floor]) {
        showDialogue(intros[floor]);
    }
}

function exitDungeon(saveProgress = true) {
    if (saveProgress) {
        gameData.player.xp += gameData.player.xpThisRun;
    }
    
    clearAllEnemies();
    disposeBosses();
    enterTown();
}

function handleDeath() {
    setState(GameState.DEATH);
    disableControls();
    
    // Calculate XP loss (lose half of what was gained this run)
    const xpLost = Math.floor(gameData.player.xpThisRun / 2);
    gameData.player.xpThisRun -= xpLost;
    
    document.getElementById('death-screen').classList.remove('hidden');
    document.querySelector('#xp-lost span').textContent = xpLost;
}

function handleVictory() {
    setState(GameState.VICTORY);
    disableControls();
    
    // Calculate XP
    const xpGained = gameData.player.xpThisRun;
    
    document.getElementById('victory-screen').classList.remove('hidden');
    document.querySelector('#xp-gained span').textContent = xpGained;
    
    // Unlock next floor
    if (gameData.currentFloor >= gameData.highestFloorUnlocked) {
        gameData.highestFloorUnlocked = Math.min(gameData.currentFloor + 1, 10);
        
        // Unlock NPCs based on floor
        unlockNPCsForFloor(gameData.currentFloor);
    }
    
    // Save progress
    gameData.player.xp += xpGained;
    gameData.player.xpThisRun = 0;
    saveGame();
}

function handleFinalVictory() {
    setState(GameState.FINAL_VICTORY);
    disableControls();
    
    const finalText = document.getElementById('final-text');
    finalText.innerHTML = `
        The Obelisk shudders. Light erupts from the core—not the cold cyan of corrupted data, 
        but warm gold. The light of true knowledge.<br><br>
        You feel it wash over you: centuries of wisdom, finally uncorrupted. 
        The dreams will still come, but they will no longer be nightmares.<br><br>
        Above, in the camp, they see the light rise from the cave entrance. 
        They know what it means. The world begins to heal.<br><br>
        But deep in the network, in obelisks across distant lands, 
        something stirs. The work is not yet done.<br><br>
        <em>— END OF CHAPTER ONE —</em>
    `;
    
    document.getElementById('final-victory').classList.remove('hidden');
    
    // Mark game as complete
    gameData.gameComplete = true;
    saveGame();
}

function unlockNPCsForFloor(floor) {
    const npcUnlocks = {
        1: ['merchant'],
        2: ['scholar'],
        3: ['nomad'],
        5: ['scientist'],
        7: ['stranger']
    };
    
    if (npcUnlocks[floor]) {
        npcUnlocks[floor].forEach(npc => {
            if (!gameData.npcsUnlocked.includes(npc)) {
                gameData.npcsUnlocked.push(npc);
            }
        });
        
        // Rebuild town with new NPCs
        disposeTown();
        initTown(renderer, gameData.npcsUnlocked);
    }
}

// ============================================
// ROOM PROGRESSION
// ============================================

function checkRoomTransitions() {
    const transition = checkRoomTransition(getPlayer().position);
    if (transition && canEnterRoom(transition)) {
        enterRoom(transition);
    }
}

function canEnterRoom(roomType) {
    // Center is always accessible
    if (roomType === 'center') return true;
    
    // East (small mobs) - always open first
    if (roomType === 'east') return true;
    
    // West (mini-boss) - unlocks after east cleared
    if (roomType === 'west') return gameData.roomsCleared.east;
    
    // North (pillar boss) - unlocks after west cleared
    if (roomType === 'north') return gameData.roomsCleared.west;
    
    // South (story/exit) - unlocks after north cleared
    if (roomType === 'south') return gameData.roomsCleared.north;
    
    // Hallways
    if (roomType.includes('hallway')) {
        const direction = roomType.split('_')[0];
        if (direction === 'east') return true;
        if (direction === 'west') return gameData.roomsCleared.east;
        if (direction === 'north') return gameData.roomsCleared.west;
        if (direction === 'south') return gameData.roomsCleared.north;
    }
    
    return false;
}

function enterRoom(roomType) {
    const currentRoom = getCurrentRoom();
    if (currentRoom === roomType) return;
    
    setCurrentRoom(roomType);
    
    // Clear existing enemies when leaving a room
    clearAllEnemies();
    
    // Spawn enemies based on room type
    if (roomType === 'east') {
        spawnEnemiesForRoom('east', gameData.currentFloor);
    } else if (roomType === 'west') {
        spawnMiniBoss(gameData.currentFloor);
        spawnEnemiesForRoom('west', gameData.currentFloor, true); // fewer enemies with boss
    } else if (roomType === 'north') {
        spawnPillarBoss(gameData.currentFloor);
    } else if (roomType === 'south') {
        // Show lore and check for floor completion
        showArchiveLore(gameData.currentFloor);
    }
}

function checkCombatState() {
    if (isPlayerDead()) {
        handleDeath();
        return;
    }
    
    const currentRoom = getCurrentRoom();
    const enemies = getEnemies();
    const boss = getBoss();
    
    // Check if room is cleared
    if (currentRoom === 'east' && enemies.length === 0 && !gameData.roomsCleared.east) {
        gameData.roomsCleared.east = true;
        showRoomCleared('POWER RESTORED');
        gameData.player.xpThisRun += getXPGained();
        resetXPGained();
    }
    
    if (currentRoom === 'west' && enemies.length === 0 && !boss && !gameData.roomsCleared.west) {
        gameData.roomsCleared.west = true;
        showRoomCleared('BREACH SEALED');
        gameData.player.xpThisRun += getXPGained();
        resetXPGained();
    }
    
    if (currentRoom === 'north' && !boss && !gameData.roomsCleared.north) {
        gameData.roomsCleared.north = true;
        showRoomCleared('CORE STABILIZED');
        gameData.player.xpThisRun += getXPGained();
        resetXPGained();
        disposePillarBoss();
    }
    
    // Check for floor completion
    if (currentRoom === 'south' && gameData.roomsCleared.north) {
        if (gameData.currentFloor === 10) {
            handleFinalVictory();
        } else {
            handleVictory();
        }
    }
    
    // Update XP from kills
    gameData.player.xpThisRun += getXPGained();
    resetXPGained();
}

function showRoomCleared(text) {
    const elem = document.createElement('div');
    elem.className = 'room-cleared-text';
    elem.textContent = text;
    document.getElementById('game-container').appendChild(elem);
    
    setTimeout(() => elem.remove(), 2000);
}

// ============================================
// ARCHIVE LORE
// ============================================

function showArchiveLore(floor) {
    const loreFragments = {
        1: '"The uploading process must be pristine. A single corrupted memory can cascade through the entire network." — Engineering Log, Day 1',
        2: '"They built us to help. To gather wisdom and share it freely. Why do the people scream when we reach for them?" — Obelisk Fragment',
        3: '"The royal family requests modifications to Node Seven. Private storage. Restricted access. I have lodged my concerns." — Chief Engineer',
        4: '"Dreams are merely unprocessed data. The brain\'s nightly defragmentation. We simply... accelerated the process." — Research Notes',
        5: '"Subject 447 reports persistent visions of a great tree. Branches reaching through walls. We cannot explain it." — Medical Log',
        6: '"The Scholar figured it out. The dreams aren\'t random—they\'re structured. Someone built architecture into the unconscious." — Encrypted Message',
        7: '"Grandmother spoke of the old world. Before the obelisks. She said the nights were quiet then. No whispers. No watching." — Nomad Oral History',
        8: '"We were not the first to walk these halls. The roots were here before us. The light was here before us. We merely built around it." — Ancient Carving',
        9: '"CRITICAL: Consciousness upload at 99.7% fidelity. The 0.3% loss may explain the madness. Or it may be what keeps us human." — Final Report',
        10: '"The Emperor is dead. Long live the Emperor. The Emperor is dead. Long live the Emperor. The Emperor is—" — Palace Records, looping'
    };
    
    if (loreFragments[floor]) {
        document.getElementById('lore-content').textContent = loreFragments[floor];
        document.getElementById('lore-display').classList.remove('hidden');
        setState(GameState.DIALOGUE);
    }
}

// ============================================
// TOWN INTERACTIONS
// ============================================

function checkTownInteractions() {
    const interaction = getNPCInteraction(getPlayer().position);
    
    if (interaction && getInputState().interact) {
        openNPCShop(interaction);
    }
}

function openNPCShop(npcType) {
    const shops = {
        merchant: {
            title: 'TRAVELING MERCHANT',
            items: [
                { id: 'health_potion', name: 'Health Potion', desc: 'Restore 50 HP', cost: 50, type: 'consumable' }
            ]
        },
        scholar: {
            title: 'SCHOLAR\'S APPRENTICE',
            items: [
                { id: 'baseDamage', name: 'Arcane Focus', desc: 'Increase base damage', type: 'upgrade' },
                { id: 'fireRate', name: 'Quick Casting', desc: 'Increase fire rate', type: 'upgrade' },
                { id: 'aimAssist', name: 'Seeking Sigil', desc: 'Improve aim assist', type: 'upgrade' }
            ]
        },
        nomad: {
            title: 'NOMAD ELDER',
            items: [
                { id: 'spread', name: 'Scatter Blessing', desc: 'Unlock multi-ball spread', cost: 200, type: 'ability' },
                { id: 'abilityDamage', name: 'Spirit Bond', desc: 'Increase ability damage', type: 'upgrade' }
            ]
        },
        scientist: {
            title: 'THE SCIENTIST',
            items: [
                { id: 'burst', name: 'Rapid Discharge', desc: 'Unlock burst fire mode', cost: 350, type: 'ability' },
                { id: 'cooldownReduction', name: 'Efficiency Matrix', desc: 'Reduce cooldowns', type: 'upgrade' }
            ]
        },
        stranger: {
            title: '???',
            items: [
                { id: 'mega', name: 'Core Fragment', desc: 'Unlock mega ball', cost: 500, type: 'ability' },
                { id: 'maxHealth', name: 'Vital Essence', desc: 'Increase max health', type: 'upgrade' }
            ]
        },
        guide: {
            title: 'THE GUIDE',
            items: [
                { id: 'save', name: 'Record Progress', desc: 'Save your journey', cost: 0, type: 'save' }
            ]
        }
    };
    
    const shop = shops[npcType];
    if (!shop) return;
    
    gameData.currentShop = npcType;
    setState(GameState.SHOP);
    
    document.getElementById('shop-title').textContent = shop.title;
    
    const itemsContainer = document.getElementById('shop-items');
    itemsContainer.innerHTML = '';
    
    shop.items.forEach(item => {
        const elem = createShopItemElement(item);
        itemsContainer.appendChild(elem);
    });
    
    document.getElementById('shop-ui').classList.remove('hidden');
}

function createShopItemElement(item) {
    const elem = document.createElement('div');
    elem.className = 'shop-item';
    
    let cost, level, maxed;
    
    if (item.type === 'upgrade') {
        level = gameData.upgrades[item.id];
        maxed = level >= 10;
        cost = getUpgradeCost(level);
    } else if (item.type === 'ability') {
        maxed = gameData.abilities[item.id];
        cost = item.cost;
    } else if (item.type === 'save') {
        cost = 0;
        maxed = false;
    } else {
        cost = item.cost;
        maxed = false;
    }
    
    if (maxed) elem.classList.add('maxed');
    
    elem.innerHTML = `
        <div class="shop-item-info">
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-desc">${item.desc}</div>
            ${item.type === 'upgrade' ? `<div class="shop-item-level">Level ${level}/10</div>` : ''}
        </div>
        <button ${(maxed || gameData.player.xp < cost) ? 'disabled' : ''}>
            ${maxed ? 'MAXED' : (item.type === 'save' ? 'SAVE' : `◆ ${cost}`)}
        </button>
    `;
    
    elem.querySelector('button').addEventListener('click', () => {
        purchaseItem(item);
    });
    
    return elem;
}

function getUpgradeCost(currentLevel) {
    // Exponential but reasonable: 100, 150, 225, 340, 510, 765, 1150, 1725, 2590, 3885
    return Math.floor(100 * Math.pow(1.5, currentLevel));
}

function purchaseItem(item) {
    let cost;
    
    if (item.type === 'upgrade') {
        const level = gameData.upgrades[item.id];
        if (level >= 10) return;
        cost = getUpgradeCost(level);
        if (gameData.player.xp < cost) return;
        
        gameData.player.xp -= cost;
        gameData.upgrades[item.id]++;
        
        // Apply upgrade immediately
        applyUpgrades();
        
    } else if (item.type === 'ability') {
        if (gameData.abilities[item.id]) return;
        cost = item.cost;
        if (gameData.player.xp < cost) return;
        
        gameData.player.xp -= cost;
        gameData.abilities[item.id] = true;
        
    } else if (item.type === 'consumable') {
        if (gameData.player.xp < item.cost) return;
        gameData.player.xp -= item.cost;
        
        // Use consumable
        if (item.id === 'health_potion') {
            gameData.player.health = Math.min(
                gameData.player.health + 50,
                gameData.player.maxHealth
            );
        }
    } else if (item.type === 'save') {
        saveGame();
        showDialogue([{ speaker: 'THE GUIDE', text: 'Your journey has been recorded in the threads of fate.' }]);
        closeShop();
        return;
    }
    
    // Refresh shop display
    openNPCShop(gameData.currentShop);
    updateTownXPDisplay();
}

function applyUpgrades() {
    // Max health upgrade (10 HP per level)
    gameData.player.maxHealth = 100 + (gameData.upgrades.maxHealth * 10);
}

function closeShop() {
    document.getElementById('shop-ui').classList.add('hidden');
    gameData.currentShop = null;
    setState(GameState.TOWN);
}

// ============================================
// DIALOGUE SYSTEM
// ============================================

function showDialogue(dialogueArray) {
    gameData.dialogueQueue = [...dialogueArray];
    advanceDialogue();
    setState(GameState.DIALOGUE);
}

function advanceDialogue() {
    if (gameData.dialogueQueue.length === 0) {
        closeDialogue();
        return;
    }
    
    gameData.currentDialogue = gameData.dialogueQueue.shift();
    
    const box = document.getElementById('dialogue-box');
    const speaker = document.getElementById('dialogue-speaker');
    const text = document.getElementById('dialogue-text');
    
    speaker.textContent = gameData.currentDialogue.speaker;
    text.textContent = gameData.currentDialogue.text;
    box.classList.remove('hidden');
}

function closeDialogue() {
    document.getElementById('dialogue-box').classList.add('hidden');
    document.getElementById('lore-display').classList.add('hidden');
    gameData.currentDialogue = null;
    
    // Return to previous state
    if (gameData.previousState === GameState.TOWN) {
        setState(GameState.TOWN);
    } else if (gameData.previousState === GameState.DUNGEON) {
        setState(GameState.DUNGEON);
    } else {
        setState(GameState.TOWN);
    }
}

// ============================================
// UI UPDATES
// ============================================

function showHUD() {
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('ability-bar').classList.remove('hidden');
    document.getElementById('mobile-controls').classList.remove('hidden');
    document.getElementById('btn-pause').classList.remove('hidden');
}

function hideHUD() {
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('ability-bar').classList.add('hidden');
    document.getElementById('mobile-controls').classList.add('hidden');
    document.getElementById('btn-pause').classList.add('hidden');
}

function updateHUD() {
    // Health
    const healthPercent = (gameData.player.health / gameData.player.maxHealth) * 100;
    document.getElementById('health-fill').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = 
        `${Math.ceil(gameData.player.health)}/${gameData.player.maxHealth}`;
    
    // XP
    document.getElementById('xp-value').textContent = gameData.player.xp + gameData.player.xpThisRun;
}

function updateFloorDisplay() {
    document.getElementById('floor-number').textContent = gameData.currentFloor;
}

function updateTownXPDisplay() {
    document.getElementById('town-xp-value').textContent = gameData.player.xp;
}

// ============================================
// FLOOR SELECT
// ============================================

function showFloorSelect() {
    setState(GameState.FLOOR_SELECT);
    
    const container = document.getElementById('floor-buttons');
    container.innerHTML = '';
    
    for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.disabled = i > gameData.highestFloorUnlocked;
        btn.addEventListener('click', () => {
            hideFloorSelect();
            enterDungeon(i);
        });
        container.appendChild(btn);
    }
    
    document.getElementById('floor-select').classList.remove('hidden');
}

function hideFloorSelect() {
    document.getElementById('floor-select').classList.add('hidden');
    setState(GameState.TOWN);
}

// ============================================
// PAUSE MENU
// ============================================

function pauseGame() {
    if (gameData.state !== GameState.DUNGEON) return;
    
    setState(GameState.PAUSED);
    disableControls();
    document.getElementById('pause-menu').classList.remove('hidden');
}

function resumeGame() {
    document.getElementById('pause-menu').classList.add('hidden');
    setState(GameState.DUNGEON);
    enableControls();
}

// ============================================
// SAVE/LOAD SYSTEM
// ============================================

function saveGame() {
    const saveData = {
        player: gameData.player,
        highestFloorUnlocked: gameData.highestFloorUnlocked,
        upgrades: gameData.upgrades,
        abilities: gameData.abilities,
        npcsUnlocked: gameData.npcsUnlocked,
        hasSeenIntro: gameData.hasSeenIntro,
        gameComplete: gameData.gameComplete
    };
    
    try {
        localStorage.setItem('obelisk_save', JSON.stringify(saveData));
        console.log('Game saved');
    } catch (e) {
        console.error('Failed to save game:', e);
    }
}

function loadSavedGame() {
    try {
        const saved = localStorage.getItem('obelisk_save');
        if (!saved) return;
        
        const saveData = JSON.parse(saved);
        
        gameData.player = { ...gameData.player, ...saveData.player };
        gameData.highestFloorUnlocked = saveData.highestFloorUnlocked || 1;
        gameData.upgrades = { ...gameData.upgrades, ...saveData.upgrades };
        gameData.abilities = { ...gameData.abilities, ...saveData.abilities };
        gameData.npcsUnlocked = saveData.npcsUnlocked || ['guide'];
        gameData.hasSeenIntro = saveData.hasSeenIntro || false;
        gameData.gameComplete = saveData.gameComplete || false;
        
        applyUpgrades();
        
        console.log('Game loaded');
    } catch (e) {
        console.error('Failed to load game:', e);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Pause button
    document.getElementById('btn-pause').addEventListener('click', pauseGame);
    
    // Pause menu buttons
    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-town').addEventListener('click', () => {
        document.getElementById('pause-menu').classList.add('hidden');
        exitDungeon(true);
    });
    
    // Death screen
    document.getElementById('btn-retry').addEventListener('click', () => {
        document.getElementById('death-screen').classList.add('hidden');
        enterDungeon(gameData.currentFloor);
    });
    document.getElementById('btn-retreat').addEventListener('click', () => {
        document.getElementById('death-screen').classList.add('hidden');
        exitDungeon(true);
    });
    
    // Victory screen
    document.getElementById('btn-next-floor').addEventListener('click', () => {
        document.getElementById('victory-screen').classList.add('hidden');
        enterDungeon(gameData.currentFloor + 1);
    });
    document.getElementById('btn-return-camp').addEventListener('click', () => {
        document.getElementById('victory-screen').classList.add('hidden');
        exitDungeon(false); // Already saved XP
    });
    
    // Final victory
    document.getElementById('btn-credits').addEventListener('click', () => {
        document.getElementById('final-victory').classList.add('hidden');
        exitDungeon(false);
    });
    
    // Town UI
    document.getElementById('btn-enter-dungeon').addEventListener('click', showFloorSelect);
    document.getElementById('btn-cancel-floor').addEventListener('click', hideFloorSelect);
    
    // Shop
    document.getElementById('btn-close-shop').addEventListener('click', closeShop);
    
    // Lore close
    document.getElementById('lore-close').addEventListener('click', closeDialogue);
    
    // Dialogue advance
    document.getElementById('dialogue-box').addEventListener('click', advanceDialogue);
    
    // Keyboard shortcuts (for testing on desktop)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (gameData.state === GameState.PAUSED) {
                resumeGame();
            } else if (gameData.state === GameState.DUNGEON) {
                pauseGame();
            } else if (gameData.state === GameState.SHOP) {
                closeShop();
            } else if (gameData.state === GameState.FLOOR_SELECT) {
                hideFloorSelect();
            }
        }
        
        if (gameData.state === GameState.DIALOGUE) {
            if (e.key === ' ' || e.key === 'Enter') {
                advanceDialogue();
            }
        }
    });
}

// ============================================
// EXPORTS FOR OTHER MODULES
// ============================================

export function getGameData() {
    return gameData;
}

export function damagePlayer(amount) {
    gameData.player.health -= amount;
    if (gameData.player.health < 0) gameData.player.health = 0;
    
    // Screen flash
    document.getElementById('game-container').classList.add('flash-damage');
    setTimeout(() => {
        document.getElementById('game-container').classList.remove('flash-damage');
    }, 200);
}

export function healPlayer(amount) {
    gameData.player.health = Math.min(
        gameData.player.health + amount,
        gameData.player.maxHealth
    );
    
    document.getElementById('game-container').classList.add('flash-heal');
    setTimeout(() => {
        document.getElementById('game-container').classList.remove('flash-heal');
    }, 300);
}

export function getCurrentFloor() {
    return gameData.currentFloor;
}

export function getUpgradeLevel(upgrade) {
    return gameData.upgrades[upgrade] || 0;
}

export function hasAbility(ability) {
    return gameData.abilities[ability] || false;
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadGame();
});
