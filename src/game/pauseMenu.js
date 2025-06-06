// src/game/pauseMenu.js - Menu implementation with improved inventory layout

// Enum for tracking the current selected menu in the menu screen
export const PauseMenuType = {
    MAIN: 'main',
    INVENTORY: 'inventory',
    SWORD: 'sword',
    STAFF: 'staff',
    SAVE: 'save'
};

// State for the menu
let pauseMenuState = {
    isVisible: false,
    currentMenu: PauseMenuType.MAIN,
    inventoryItems: [], // Will store player's inventory items
    swordUpgrades: [],  // Will store sword upgrades
    staffAbilities: [], // Will store staff abilities
    selectedInventorySlot: -1 // Track selected inventory slot
};

// Initialize the menu
export function initMenu() {
    createMenuDOM();
    setupEventListeners();
}

// Create and inject the menu DOM elements
function createMenuDOM() {
    // Create main menu container
    const menuContainer = document.createElement('div');
    menuContainer.id = 'pause-menu-container';
    menuContainer.className = 'menu-container';
    menuContainer.style.display = 'none';
    
    // Create menu content
    menuContainer.innerHTML = `
        <div class="pause-menu">
            <!-- Main Menu -->
            <div id="main-menu" class="menu-section active">
                <h1>MENU</h1>
                <button id="inventory-btn" class="menu-button">Inventory</button>
                <button id="sword-btn" class="menu-button">Sword</button>
                <button id="staff-btn" class="menu-button">Staff</button>
                <button id="save-btn" class="menu-button">Save Game</button>
                <button id="resume-btn" class="menu-button resume">Close Menu</button>
            </div>
            
            <!-- Inventory Menu - Simplified header and improved layout -->
            <div id="inventory-menu" class="menu-section">
                <h1>INVENTORY</h1>
                <!-- Player stats display - moved up -->
                <div class="player-stats">
                    <div class="stat-row">
                        <div class="stat">Health: <span id="inventory-health">100/100</span></div>
                        <div class="stat">Mana: <span id="inventory-mana">100/100</span></div>
                        <div class="stat">Stamina: <span id="inventory-stamina">100/100</span></div>
                    </div>
                </div>
                <!-- Simplified inventory layout -->
                <div class="inventory-container">
                    <div id="inventory-scrollable" class="inventory-scrollable">
                        <div id="inventory-grid" class="inventory-grid">
                            <!-- Inventory slots will be generated here -->
                        </div>
                    </div>
                    <div class="inventory-details">
                        <h3 id="item-name">Select an item</h3>
                        <p id="item-description">Item description will appear here.</p>
                        <button id="use-item-btn" class="menu-button" disabled>Use Item</button>
                    </div>
                </div>
                <button id="inventory-back-btn" class="menu-button back-button">Back</button>
            </div>
            
            <!-- Sword Menu -->
            <div id="sword-menu" class="menu-section">
                <h1>SWORD</h1>
                <div class="weapon-stats">
                    <p>Damage: <span id="sword-damage">10</span></p>
                </div>
                <div class="upgrade-list" id="sword-upgrades">
                    <!-- Sword upgrades will be listed here -->
                    <p class="empty-message">Sword upgrades will be available later.</p>
                </div>
                <button id="sword-back-btn" class="menu-button back-button">Back</button>
            </div>
            
            <!-- Staff Menu -->
            <div id="staff-menu" class="menu-section">
                <h1>STAFF</h1>
                <div class="weapon-stats">
                    <p>Damage: <span id="staff-damage">8</span></p>
                </div>
                <div class="upgrade-list" id="staff-abilities">
                    <!-- Staff abilities will be listed here -->
                    <p class="empty-message">Staff abilities will be unlocked with experience.</p>
                </div>
                <button id="staff-back-btn" class="menu-button back-button">Back</button>
            </div>
            
            <!-- Save Game Menu -->
            <div id="save-menu" class="menu-section">
                <h1>SAVE GAME</h1>
                <div class="save-slots">
                    <button id="save-slot-1" class="save-slot">Save Slot 1<span class="save-date"></span></button>
                    <button id="save-slot-2" class="save-slot">Save Slot 2<span class="save-date"></span></button>
                    <button id="save-slot-3" class="save-slot">Save Slot 3<span class="save-date"></span></button>
                </div>
                <div id="save-message"></div>
                <button id="save-back-btn" class="menu-button back-button">Back</button>
            </div>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(menuContainer);
    
    // Generate inventory slots (5x10 grid)
    generateInventorySlots(50); // 50 slots for a 5x10 grid
}

// Generate inventory slots
function generateInventorySlots(count) {
    const inventoryGrid = document.getElementById('inventory-grid');
    if (!inventoryGrid) return;
    
    for (let i = 0; i < count; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.index = i;
        inventoryGrid.appendChild(slot);
    }
}

// Setup event listeners for menu buttons - with improved touch support
function setupEventListeners() {
    // Main menu buttons - add touchstart and touchend events for mobile
    addTouchableEventListeners('inventory-btn', () => showMenu(PauseMenuType.INVENTORY));
    addTouchableEventListeners('sword-btn', () => showMenu(PauseMenuType.SWORD));
    addTouchableEventListeners('staff-btn', () => showMenu(PauseMenuType.STAFF));
    addTouchableEventListeners('save-btn', () => showMenu(PauseMenuType.SAVE));
    addTouchableEventListeners('resume-btn', toggleMenu);
    
    // Back buttons
    addTouchableEventListeners('inventory-back-btn', () => showMenu(PauseMenuType.MAIN));
    addTouchableEventListeners('sword-back-btn', () => showMenu(PauseMenuType.MAIN));
    addTouchableEventListeners('staff-back-btn', () => showMenu(PauseMenuType.MAIN));
    addTouchableEventListeners('save-back-btn', () => showMenu(PauseMenuType.MAIN));
    
    // Save slot buttons
    addTouchableEventListeners('save-slot-1', () => saveGame(1));
    addTouchableEventListeners('save-slot-2', () => saveGame(2));
    addTouchableEventListeners('save-slot-3', () => saveGame(3));
    
    // Use item button
    addTouchableEventListeners('use-item-btn', useSelectedItem);
    
    // Inventory slot selection - add touch capability to all slots
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    inventorySlots.forEach(slot => {
        const index = parseInt(slot.dataset.index, 10);
        
        // Add click for desktop and touchstart for mobile
        slot.addEventListener('click', (e) => {
            e.preventDefault();
            selectInventorySlot(index);
        });
        
        slot.addEventListener('touchstart', (e) => {
            e.preventDefault();
            slot.classList.add('touch-active');
            selectInventorySlot(index);
        });
        
        slot.addEventListener('touchend', (e) => {
            e.preventDefault();
            slot.classList.remove('touch-active');
        });
        
        slot.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            slot.classList.remove('touch-active');
        });
    });

    // Direct Close button handler with enhanced reset functionality
    const resumeButton = document.getElementById('resume-btn');
    if (resumeButton) {
        // Instead of replacing the button, add another click handler that runs AFTER the original
        resumeButton.addEventListener('click', function(e) {
            // Emergency reset of player controls
            if (window.game && window.game.player) {
                const player = window.game.player;
                
                // Reset all movement controls
                player.velocity.x = 0;
                player.velocity.z = 0;
                player.velocity.y = 0;
                
                // Reset action states
                player.isAttacking = false;
                player.chargeAttack = false;
                player.isJumping = false;
                player.isFalling = false;
                player.isDashing = false;
                
                // Ensure the game state is PLAYING - WITH CORRECT CASE!
                window.game.state = 'playing';
                window.game.lastTimestamp = performance.now();
                
                console.log("Player controls reset by enhanced close button handler");
            }
        });
    }
}

// Helper function to add both mouse and touch event listeners to an element
function addTouchableEventListeners(elementId, callback) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Add visual feedback for touch
    const addActiveClass = () => element.classList.add('touch-active');
    const removeActiveClass = () => element.classList.remove('touch-active');
    
    // Mouse events (for desktop)
    element.addEventListener('click', (e) => {
        e.preventDefault();
        callback();
    });
    
    // Touch events (for mobile)
    element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        addActiveClass();
    });
    
    element.addEventListener('touchend', (e) => {
        e.preventDefault();
        removeActiveClass();
        
        // Only trigger the callback if the touch ended on the element
        const touch = e.changedTouches[0];
        const elementRect = element.getBoundingClientRect();
        
        if (touch.clientX >= elementRect.left && touch.clientX <= elementRect.right &&
            touch.clientY >= elementRect.top && touch.clientY <= elementRect.bottom) {
            callback();
        }
    });
    
    element.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        removeActiveClass();
    });
}

// Show a specific menu
function showMenu(menuType) {
    // Hide all menu sections
    const menuSections = document.querySelectorAll('.menu-section');
    menuSections.forEach(section => section.classList.remove('active'));
    
    // Show the selected menu
    switch (menuType) {
        case PauseMenuType.MAIN:
            document.getElementById('main-menu').classList.add('active');
            break;
        case PauseMenuType.INVENTORY:
            document.getElementById('inventory-menu').classList.add('active');
            updateInventoryDisplay();
            break;
        case PauseMenuType.SWORD:
            document.getElementById('sword-menu').classList.add('active');
            updateSwordDisplay();
            break;
        case PauseMenuType.STAFF:
            document.getElementById('staff-menu').classList.add('active');
            updateStaffDisplay();
            break;
        case PauseMenuType.SAVE:
            document.getElementById('save-menu').classList.add('active');
            updateSaveDisplay();
            break;
    }
    
    pauseMenuState.currentMenu = menuType;
}

// Toggle menu visibility
export function toggleMenu() {
    pauseMenuState.isVisible = !pauseMenuState.isVisible;
    
    const menuContainer = document.getElementById('pause-menu-container');
    if (pauseMenuState.isVisible) {
        menuContainer.style.display = 'flex';
        showMenu(PauseMenuType.MAIN);
    } else {
        menuContainer.style.display = 'none';
        
        // Reset input state when closing menu using our global function
        if (window.resetInputState) {
            window.resetInputState();
        }
        
        // Emergency fix for input issues on closing menu
        setTimeout(() => {
            if (window.game && window.game.player) {
                // Force reset player velocity
                window.game.player.velocity.x = 0;
                window.game.player.velocity.z = 0;
                window.game.player.isAttacking = false;
                window.game.player.chargeAttack = false;
            }
        }, 50); // Small delay to ensure it happens after state transition
    }
    
    // Return the current state for the game to know if the menu is open
    return pauseMenuState.isVisible;
}

// For backwards compatibility with existing code
export function togglePauseMenu() {
    return toggleMenu();
}

// Update inventory display
function updateInventoryDisplay() {
    // Get player stats if available
    const player = window.game?.player;
    if (player) {
        // Sync menu inventory with player inventory
        pauseMenuState.inventoryItems = player.getInventory();
        
        // Update player stats display
        const healthEl = document.getElementById('inventory-health');
        const manaEl = document.getElementById('inventory-mana');
        const staminaEl = document.getElementById('inventory-stamina');
        
        if (healthEl) {
            healthEl.textContent = `${Math.floor(player.health)}/${player.maxHealth}`;
            // Color based on health amount
            if (player.health < player.maxHealth * 0.3) {
                healthEl.style.color = '#ff4040'; // Red for low health
            } else if (player.health < player.maxHealth * 0.6) {
                healthEl.style.color = '#ffaa40'; // Orange for medium health
            } else {
                healthEl.style.color = '#ffffff'; // White for high health
            }
        }
        
        if (manaEl) {
            // For mana, use staff cooldown (inverse)
            let manaPercentage = 100;
            if (player.weapons && player.weapons.staff) {
                const staff = player.weapons.staff;
                if (staff.cooldownTimer > 0) {
                    manaPercentage = 100 - ((staff.cooldownTimer / staff.cooldown) * 100);
                }
            }
            manaEl.textContent = `${Math.floor(manaPercentage)}/100`;
        }
        
        if (staminaEl) {
            // For stamina, use dash cooldown (inverse)
            let staminaPercentage = 100;
            if (player.dashCooldownTimer > 0) {
                staminaPercentage = 100 - ((player.dashCooldownTimer / player.dashCooldown) * 100);
            }
            staminaEl.textContent = `${Math.floor(staminaPercentage)}/100`;
        }
    }
    
    // Clear all slots first
    const slots = document.querySelectorAll('.inventory-slot');
    slots.forEach(slot => {
        slot.innerHTML = '';
        slot.classList.remove('filled');
        slot.classList.remove('selected');
        // Remove any custom data attributes
        slot.removeAttribute('data-ability');
    });
    
    // Display items in inventory with improved type handling
    pauseMenuState.inventoryItems.forEach((item, index) => {
        if (index < slots.length) {
            const slot = slots[index];
            
            // Determine the CSS class to use - fix mismatches between item.type and CSS classes
            let iconClass = '';
            
            // Match item type to the appropriate CSS class
            if (typeof ItemType !== 'undefined') {
                // Use ItemType constants if available
                switch(item.type) {
                    case 'healthPotion':
                    case ItemType.HEALTH_POTION:
                        iconClass = 'healthPotion';
                        break;
                    case 'staminaPotion':
                    case ItemType.STAMINA_POTION:
                        iconClass = 'staminaPotion';
                        break;
                    case 'staffCrystal':
                    case ItemType.STAFF_CRYSTAL:
                        iconClass = 'staffCrystal';
                        // Add data attribute for crystal type if available
                        if (item.abilityType) {
                            slot.dataset.ability = item.abilityType;
                        }
                        break;
                    case 'key':
                    case ItemType.KEY:
                        iconClass = 'key';
                        break;
                    case 'scroll':
                    case ItemType.SCROLL:
                        iconClass = 'scroll';
                        break;
                    default:
                        // Use the provided iconClass if available, otherwise fallback to type
                        iconClass = item.iconClass || item.type;
                        break;
                }
            } else {
                // Fallback if ItemType is not defined
                iconClass = item.iconClass || item.type;
            }
            
            // Create the item display
            slot.innerHTML = `
                <div class="item-icon ${iconClass}"></div>
                <div class="item-count">${item.count}</div>
            `;
            slot.classList.add('filled');
            slot.dataset.itemId = item.id;
            slot.dataset.index = index;
            
            // If this was the previously selected slot, re-select it
            if (index === pauseMenuState.selectedInventorySlot) {
                slot.classList.add('selected');
                updateItemDetails(item);
            }
        }
    });
    
    // If no slot is selected or the selected slot is now empty, reset item details
    if (pauseMenuState.selectedInventorySlot === -1 || 
        pauseMenuState.selectedInventorySlot >= pauseMenuState.inventoryItems.length) {
        document.getElementById('item-name').textContent = 'Select an item';
        document.getElementById('item-description').textContent = 'Item description will appear here.';
        document.getElementById('use-item-btn').disabled = true;
        pauseMenuState.selectedInventorySlot = -1;
    }
}

// Update item details panel
function updateItemDetails(item) {
    if (!item) {
        document.getElementById('item-name').textContent = 'Select an item';
        document.getElementById('item-description').textContent = 'Item description will appear here.';
        document.getElementById('use-item-btn').disabled = true;
        return;
    }
    
    document.getElementById('item-name').textContent = item.name;
    document.getElementById('item-description').textContent = item.description;
    document.getElementById('use-item-btn').disabled = false;
}

// Update sword display
function updateSwordDisplay() {
    // Update sword stats from player
    const player = window.game?.player;
    if (player) {
        document.getElementById('sword-damage').textContent = player.weapons.sword.damage;
    }
    
    // Update sword upgrades (will be implemented later)
}

// Update staff display
function updateStaffDisplay() {
    // Update staff stats from player
    const player = window.game?.player;
    if (player) {
        document.getElementById('staff-damage').textContent = player.weapons.staff.damage;
    }
    
    // Update staff abilities (will be implemented later)
}

// Update save game display
function updateSaveDisplay() {
    // Check localStorage for save game data
    for (let slot = 1; slot <= 3; slot++) {
        const saveData = localStorage.getItem(`labyrinth_save_${slot}`);
        const dateElem = document.querySelector(`#save-slot-${slot} .save-date`);
        
        if (saveData) {
            try {
                const data = JSON.parse(saveData);
                const date = new Date(data.timestamp);
                dateElem.textContent = `- ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            } catch (e) {
                dateElem.textContent = '- Corrupted';
            }
        } else {
            dateElem.textContent = '- Empty';
        }
    }
    
    // Clear any previous save messages
    document.getElementById('save-message').textContent = '';
}

// Select an inventory slot
function selectInventorySlot(index) {
    // Reset all slots
    const slots = document.querySelectorAll('.inventory-slot');
    slots.forEach(slot => slot.classList.remove('selected'));
    
    // If there's an item in this slot
    if (index < pauseMenuState.inventoryItems.length) {
        // Highlight the selected slot
        slots[index].classList.add('selected');
        
        // Update item details
        const item = pauseMenuState.inventoryItems[index];
        updateItemDetails(item);
        
        // Remember selected slot
        pauseMenuState.selectedInventorySlot = index;
    } else {
        // No item in this slot
        document.getElementById('item-name').textContent = 'Empty slot';
        document.getElementById('item-description').textContent = '';
        document.getElementById('use-item-btn').disabled = true;
        pauseMenuState.selectedInventorySlot = -1;
    }
}

// Use the selected item
function useSelectedItem() {
    const selectedIndex = pauseMenuState.selectedInventorySlot;
    if (selectedIndex === -1) return;
    
    // Use the player's useItem method
    const player = window.game?.player;
    if (player && player.useItem) {
        const selectedItem = pauseMenuState.inventoryItems[selectedIndex];
        const success = player.useItem(selectedIndex);
        
        if (success) {
            // Show message based on item type
            if (typeof ItemType !== 'undefined') {
                if (selectedItem.type === 'healthPotion' || selectedItem.type === ItemType.HEALTH_POTION) {
                    window.showMessage?.(`Used ${selectedItem.name}: +${selectedItem.healAmount} Health`);
                } else if (selectedItem.type === 'staminaPotion' || selectedItem.type === ItemType.STAMINA_POTION) {
                    window.showMessage?.(`Used ${selectedItem.name}: Dash Recharged`);
                } else if (selectedItem.type === 'staffCrystal' || selectedItem.type === ItemType.STAFF_CRYSTAL) {
                    window.showMessage?.(`Used ${selectedItem.name}: Unlocked ${selectedItem.abilityType} ability`);
                }
            } else {
                // Generic success message if ItemType is not defined
                window.showMessage?.(`Used ${selectedItem.name}`);
            }
            
            // Update the inventory display
            updateInventoryDisplay();
            
            // Update main UI health bar if it was a health potion
            document.getElementById('health-fill').style.width = `${(player.health / player.maxHealth) * 100}%`;
        }
    }
}

// Save game to localStorage
function saveGame(slot) {
    const saveMessage = document.getElementById('save-message');
    
    try {
        // Get the game state - this is a simplified version
        const gameState = {
            playerHealth: window.game?.player?.health || 100,
            playerMaxHealth: window.game?.player?.maxHealth || 100,
            currentFloor: window.game?.currentFloor || 1,
            inventory: pauseMenuState.inventoryItems,
            timestamp: Date.now()
        };
        
        // Save to localStorage
        localStorage.setItem(`labyrinth_save_${slot}`, JSON.stringify(gameState));
        
        // Update save slots display
        updateSaveDisplay();
        
        // Show success message
        saveMessage.textContent = 'Game saved successfully!';
        saveMessage.className = 'save-success';
    } catch (error) {
        // Show error message
        saveMessage.textContent = 'Failed to save game: ' + error.message;
        saveMessage.className = 'save-error';
    }
}

// Load game from localStorage
export function loadGame(slot) {
    const saveData = localStorage.getItem(`labyrinth_save_${slot}`);
    if (!saveData) return false;
    
    try {
        const gameState = JSON.parse(saveData);
        
        // Update game state
        if (window.game?.player) {
            window.game.player.health = gameState.playerHealth;
            window.game.player.maxHealth = gameState.playerMaxHealth;
            window.game.currentFloor = gameState.currentFloor;
            
            // Load inventory
            pauseMenuState.inventoryItems = gameState.inventory || [];
        }
        
        return true;
    } catch (error) {
        console.error('Failed to load game:', error);
        return false;
    }
}

// Add items to inventory
export function addItemToInventory(item) {
    // Check if item of same type already exists
    const existingItem = pauseMenuState.inventoryItems.find(i => i.type === item.type);
    
    if (existingItem) {
        // Increase count of existing item
        existingItem.count += item.count || 1;
    } else {
        // Add new item
        pauseMenuState.inventoryItems.push({
            ...item,
            count: item.count || 1
        });
    }
    
    // Return success
    return true;
}

// Export a function to create test items for development
export function createTestItems() {
    return [
        { id: 'smallHealthPotion', count: 5 },
        { id: 'mediumHealthPotion', count: 2 },
        { id: 'smallStaminaPotion', count: 3 }
    ];
}

// Export a global function to update the menu inventory from anywhere
export function updateMenuInventory(items) {
    if (!pauseMenuState) return;
    
    pauseMenuState.inventoryItems = items;
    
    // If the inventory menu is currently active, update it
    if (pauseMenuState.isVisible && pauseMenuState.currentMenu === PauseMenuType.INVENTORY) {
        updateInventoryDisplay();
    }
}

// Expose this function globally so it can be called from the player class
window.updatePauseMenuInventory = updateMenuInventory;
