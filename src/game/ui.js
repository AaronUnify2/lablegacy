// src/game/ui.js - Enhanced user interface with three status bars positioned at top-left

// Update UI elements with current game state
export function updateUI(player, floorNumber) {
    updateHealthBar(player);
    updateManaBar(player);
    updateStaminaBar(player);
    updateWeaponInfo(player);
    updateFloorInfo(floorNumber);
    updateMinimap();
}

// Update health bar UI
function updateHealthBar(player) {
    const healthPercentage = (player.health / player.maxHealth) * 100;
    const healthFill = document.getElementById('health-fill');
    
    if (healthFill) {
        healthFill.style.width = `${healthPercentage}%`;
        
        // Change health bar color based on health percentage
        if (healthPercentage > 60) {
            healthFill.style.backgroundColor = '#f04040'; // Normal red
        } else if (healthPercentage > 30) {
            healthFill.style.backgroundColor = '#f0a000'; // Warning yellow
        } else {
            healthFill.style.backgroundColor = '#f04000'; // Critical red-orange
            // Add pulsing effect for critical health
            if (!healthFill.classList.contains('pulse')) {
                healthFill.classList.add('pulse');
            }
        }
        
        // Remove pulsing effect if health is above critical
        if (healthPercentage > 30 && healthFill.classList.contains('pulse')) {
            healthFill.classList.remove('pulse');
        }
    }
    
    // Update numerical value
    const healthValue = document.getElementById('health-value');
    if (healthValue) {
        healthValue.textContent = `${Math.floor(player.health)}/${player.maxHealth}`;
    }
}

// Update mana bar UI (staff energy)
function updateManaBar(player) {
    // For now, mana is based on staff cooldown (inverse)
    let manaPercentage = 100;
    if (player.weapons && player.weapons.staff) {
        const staff = player.weapons.staff;
        if (staff.cooldownTimer > 0) {
            manaPercentage = 100 - ((staff.cooldownTimer / staff.cooldown) * 100);
        }
    }
    
    const manaFill = document.getElementById('mana-fill');
    if (manaFill) {
        manaFill.style.width = `${manaPercentage}%`;
    }
    
    // Update numerical value (for now showing 100/100 when full)
    const manaValue = document.getElementById('mana-value');
    if (manaValue) {
        manaValue.textContent = `${Math.floor(manaPercentage)}/${100}`;
    }
}

// Update stamina bar UI (dash energy)
function updateStaminaBar(player) {
    // For now, stamina is based on dash cooldown (inverse)
    let staminaPercentage = 100;
    if (player.dashCooldownTimer > 0) {
        staminaPercentage = 100 - ((player.dashCooldownTimer / player.dashCooldown) * 100);
    }
    
    const staminaFill = document.getElementById('stamina-fill');
    if (staminaFill) {
        staminaFill.style.width = `${staminaPercentage}%`;
    }
    
    // Update numerical value
    const staminaValue = document.getElementById('stamina-value');
    if (staminaValue) {
        staminaValue.textContent = `${Math.floor(staminaPercentage)}/${100}`;
    }
}

// Update weapon information UI
function updateWeaponInfo(player) {
    // Update weapon name
    const weaponNameElement = document.querySelector('.weapon-name');
    if (weaponNameElement) {
        weaponNameElement.textContent = 'Sword & Staff';
    }
    
    // Remove durability display element if it exists
    const durabilityContainer = document.querySelector('.weapon-durability');
    if (durabilityContainer) {
        durabilityContainer.style.display = 'none';
    }
}

// Update floor information UI
function updateFloorInfo(floorNumber) {
    const floorElement = document.getElementById('floor-number');
    if (floorElement) {
        floorElement.textContent = floorNumber;
    }
}

// Update minimap UI
function updateMinimap() {
    // This will be implemented after we have the dungeon generation system
    // For now, this is just a placeholder
}

// Initialize the UI
export function initUI() {
    // Create/update UI container if needed
    let uiContainer = document.getElementById('ui-container');
    
    if (!uiContainer) {
        uiContainer = document.createElement('div');
        uiContainer.id = 'ui-container';
        document.body.appendChild(uiContainer);
    }
    
    // Clear existing content
    uiContainer.innerHTML = '';
    
    // Create the three status bars
    
    // 1. Health Bar
    const healthBarContainer = document.createElement('div');
    healthBarContainer.className = 'stat-bar-container';
    healthBarContainer.innerHTML = `
        <div class="stat-label">
            <span>HEALTH</span>
            <span id="health-value" class="stat-value">100/100</span>
        </div>
        <div class="stat-bar">
            <div id="health-fill" class="stat-fill" style="width: 100%;"></div>
        </div>
    `;
    uiContainer.appendChild(healthBarContainer);
    
    // 2. Mana Bar
    const manaBarContainer = document.createElement('div');
    manaBarContainer.className = 'stat-bar-container';
    manaBarContainer.innerHTML = `
        <div class="stat-label">
            <span>MANA</span>
            <span id="mana-value" class="stat-value">100/100</span>
        </div>
        <div class="stat-bar">
            <div id="mana-fill" class="stat-fill" style="width: 100%;"></div>
        </div>
    `;
    uiContainer.appendChild(manaBarContainer);
    
    // 3. Stamina Bar
    const staminaBarContainer = document.createElement('div');
    staminaBarContainer.className = 'stat-bar-container';
    staminaBarContainer.innerHTML = `
        <div class="stat-label">
            <span>STAMINA</span>
            <span id="stamina-value" class="stat-value">100/100</span>
        </div>
        <div class="stat-bar">
            <div id="stamina-fill" class="stat-fill" style="width: 100%;"></div>
        </div>
    `;
    uiContainer.appendChild(staminaBarContainer);
    
    // Floor Info
    const floorInfo = document.createElement('div');
    floorInfo.id = 'floor-info';
    floorInfo.innerHTML = 'Floor: <span id="floor-number">1</span>';
    uiContainer.appendChild(floorInfo);
    
    // Weapon Info (without durability)
    const weaponInfo = document.createElement('div');
    weaponInfo.id = 'weapon-info';
    weaponInfo.innerHTML = `
        <div class="weapon-name">Sword & Staff</div>
    `;
    uiContainer.appendChild(weaponInfo);
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Show a temporary message on screen
export function showMessage(message, duration = 3000) {
    // Check if message container exists, create if not
    let messageContainer = document.getElementById('message-container');
    
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.style.position = 'absolute';
        messageContainer.style.top = '20%';
        messageContainer.style.left = '50%';
        messageContainer.style.transform = 'translateX(-50%)';
        messageContainer.style.display = 'flex';
        messageContainer.style.flexDirection = 'column';
        messageContainer.style.alignItems = 'center';
        messageContainer.style.gap = '10px';
        messageContainer.style.maxWidth = '80%';
        messageContainer.style.zIndex = '1000';
        messageContainer.style.pointerEvents = 'none'; // Don't block mouse events
        document.body.appendChild(messageContainer);
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.fontFamily = 'Arial, sans-serif';
    messageElement.style.fontSize = '18px';
    messageElement.style.textAlign = 'center';
    messageElement.style.opacity = '0';
    messageElement.style.transition = 'opacity 0.3s ease-in-out';
    messageContainer.appendChild(messageElement);
    
    // Detect if message mentions chest tier and style accordingly
    if (message.includes('Epic Chest:')) {
        messageElement.style.backgroundColor = 'rgba(153, 50, 204, 0.8)'; // Purple background
        messageElement.style.border = '2px solid #d070ff';
    } else if (message.includes('Gold Chest:')) {
        messageElement.style.backgroundColor = 'rgba(212, 175, 55, 0.8)'; // Gold background
        messageElement.style.border = '2px solid #ffd700';
    } else if (message.includes('Silver Chest:')) {
        messageElement.style.backgroundColor = 'rgba(192, 192, 192, 0.8)'; // Silver background
        messageElement.style.border = '2px solid #e0e0e0';
    }
    
    // Force reflow before adding opacity
    void messageElement.offsetWidth;
    
    // Fade in
    messageElement.style.opacity = '1';
    
    // Fade out and remove after duration
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            // Check if the element is still in the container before removing
            if (messageElement.parentNode === messageContainer) {
                messageContainer.removeChild(messageElement);
            }
        }, 300);
    }, duration);
}

// Show a popup dialog with options
export function showDialog(title, message, options) {
    // Create dialog container
    const dialogContainer = document.createElement('div');
    dialogContainer.id = 'dialog-container';
    dialogContainer.style.position = 'absolute';
    dialogContainer.style.top = '50%';
    dialogContainer.style.left = '50%';
    dialogContainer.style.transform = 'translate(-50%, -50%)';
    dialogContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    dialogContainer.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    dialogContainer.style.borderRadius = '8px';
    dialogContainer.style.padding = '20px';
    dialogContainer.style.color = 'white';
    dialogContainer.style.fontFamily = 'Arial, sans-serif';
    dialogContainer.style.minWidth = '300px';
    dialogContainer.style.maxWidth = '500px';
    dialogContainer.style.zIndex = '2000';
    
    // Add title
    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    titleElement.style.margin = '0 0 15px 0';
    titleElement.style.color = '#f0a000';
    dialogContainer.appendChild(titleElement);
    
    // Add message
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageElement.style.marginBottom = '20px';
    dialogContainer.appendChild(messageElement);
    
    // Add buttons for options
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.gap = '10px';
    
    options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option.text;
        button.style.backgroundColor = '#333';
        button.style.color = 'white';
        button.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        button.style.borderRadius = '4px';
        button.style.padding = '8px 15px';
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.2s';
        
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#555';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = '#333';
        });
        
        button.addEventListener('click', () => {
            document.body.removeChild(dialogContainer);
            option.callback();
        });
        
        buttonContainer.appendChild(button);
    });
    
    dialogContainer.appendChild(buttonContainer);
    document.body.appendChild(dialogContainer);
    
    return dialogContainer;
}

// Show inventory UI
export function showInventory(player) {
    // This will be implemented later
    // For now, this is just a placeholder
}

// Add this function to create control hints
export function createControlHints() {
    // Function disabled to prevent control hints from showing
    return;
}
