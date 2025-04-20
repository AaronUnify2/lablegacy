// src/game/ui.js - User interface management

// Update UI elements with current game state
export function updateUI(player, floorNumber) {
    updateHealthBar(player);
    updateWeaponInfo(player);
    updateFloorInfo(floorNumber);
    updateMinimap();
    
    // Show jumping animation if player is in air
    if (player.isInAir()) {
        showJumpingIndicator(true);
    } else {
        showJumpingIndicator(false);
    }
}

// Update health bar UI
function updateHealthBar(player) {
    const healthPercentage = (player.health / player.maxHealth) * 100;
    document.getElementById('health-fill').style.width = `${healthPercentage}%`;
    
    // Change health bar color based on health percentage
    const healthFill = document.getElementById('health-fill');
    
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

// Update weapon information UI
function updateWeaponInfo(player) {
    const weapon = player.currentWeapon;
    
    if (!weapon) return;
    
    // Update weapon name
    const weaponNameElement = document.querySelector('.weapon-name');
    if (weaponNameElement) {
        weaponNameElement.textContent = capitalizeFirstLetter(weapon.type);
    }
    
    // Update weapon durability
    const durabilityElement = document.getElementById('durability-value');
    if (durabilityElement) {
        const durabilityPercentage = Math.floor((weapon.durability / weapon.maxDurability) * 100);
        durabilityElement.textContent = durabilityPercentage;
        
        // Change color based on durability
        if (durabilityPercentage > 60) {
            durabilityElement.style.color = '#ffffff'; // Normal
        } else if (durabilityPercentage > 30) {
            durabilityElement.style.color = '#f0a000'; // Warning yellow
        } else {
            durabilityElement.style.color = '#f04000'; // Critical red-orange
        }
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
        messageContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageContainer.style.color = 'white';
        messageContainer.style.padding = '10px 20px';
        messageContainer.style.borderRadius = '5px';
        messageContainer.style.fontFamily = 'Arial, sans-serif';
        messageContainer.style.fontSize = '18px';
        messageContainer.style.textAlign = 'center';
        messageContainer.style.zIndex = '1000';
        messageContainer.style.pointerEvents = 'none'; // Don't block mouse events
        document.body.appendChild(messageContainer);
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.opacity = '1';
    messageElement.style.transition = 'opacity 0.5s';
    messageContainer.appendChild(messageElement);
    
    // Fade out and remove after duration
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            messageContainer.removeChild(messageElement);
        }, 500);
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
    // Check if hints already exist
    if (document.getElementById('control-hints')) return;
    
    // Create container for control hints
    const hintsContainer = document.createElement('div');
    hintsContainer.id = 'control-hints';
    
    // Set up the basic hint content
    const hintContent = `
        <div style="margin-bottom: 8px; font-weight: bold;">CONTROLS:</div>
        <div style="display: grid; grid-template-columns: auto auto; gap: 5px;">
            <div>Move:</div><div>WASD or Arrows</div>
            <div>Jump:</div><div>SPACE</div>
            <div>Dash:</div><div>SHIFT</div>
            <div>Attack:</div><div>Left Mouse</div>
            <div>Interact:</div><div>E</div>
            <div>Inventory:</div><div>I</div>
            <div>Pause:</div><div>ESC</div>
        </div>
    `;
    
    hintsContainer.innerHTML = hintContent;
    
    // Add to document
    document.body.appendChild(hintsContainer);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        hintsContainer.style.opacity = '0';
        hintsContainer.style.transition = 'opacity 1s';
        
        // Remove from DOM after fade out
        setTimeout(() => {
            if (hintsContainer.parentNode) {
                hintsContainer.parentNode.removeChild(hintsContainer);
            }
        }, 1000);
    }, 10000);
}

// Add a visual indicator when player is jumping
function showJumpingIndicator(isJumping) {
    // Get or create the indicator
    let jumpIndicator = document.getElementById('jump-indicator');
    
    if (!jumpIndicator && isJumping) {
        // Create the indicator if it doesn't exist
        jumpIndicator = document.createElement('div');
        jumpIndicator.id = 'jump-indicator';
        jumpIndicator.style.position = 'absolute';
        jumpIndicator.style.bottom = '100px';
        jumpIndicator.style.left = '20px';
        jumpIndicator.style.backgroundColor = 'rgba(60, 179, 113, 0.6)';
        jumpIndicator.style.color = 'white';
        jumpIndicator.style.padding = '5px 10px';
        jumpIndicator.style.borderRadius = '4px';
        jumpIndicator.style.fontFamily = 'Arial, sans-serif';
        jumpIndicator.style.fontSize = '14px';
        jumpIndicator.style.opacity = '0';
        jumpIndicator.style.transition = 'opacity 0.3s';
        jumpIndicator.textContent = 'JUMPING';
        
        document.body.appendChild(jumpIndicator);
        
        // Fade in
        setTimeout(() => {
            jumpIndicator.style.opacity = '1';
        }, 10);
    }
    
    // Show or hide the indicator
    if (jumpIndicator) {
        if (isJumping) {
            jumpIndicator.style.opacity = '1';
        } else {
            jumpIndicator.style.opacity = '0';
            
            // Remove from DOM after fade out
            setTimeout(() => {
                if (jumpIndicator && jumpIndicator.parentNode) {
                    jumpIndicator.parentNode.removeChild(jumpIndicator);
                }
            }, 300);
        }
    }
}
