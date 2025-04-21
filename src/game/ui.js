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
    // Get both weapons from player
    const sword = player.weapons.sword;
    const staff = player.weapons.staff;
    
    if (!sword || !staff) return;
    
    // Update sword info (main weapon display)
    const weaponNameElement = document.querySelector('.weapon-name');
    if (weaponNameElement) {
        weaponNameElement.textContent = 'Sword & Staff';
    }
    
    // Update sword durability
    const durabilityElement = document.getElementById('durability-value');
    if (durabilityElement) {
        const swordDurabilityPercentage = Math.floor((sword.durability / sword.maxDurability) * 100);
        const staffDurabilityPercentage = Math.floor((staff.durability / staff.maxDurability) * 100);
        
        // Show both weapons' durability
        durabilityElement.textContent = `${swordDurabilityPercentage}% / ${staffDurabilityPercentage}%`;
        
        // Change color based on the lower durability
        const lowerDurability = Math.min(swordDurabilityPercentage, staffDurabilityPercentage);
        if (lowerDurability > 60) {
            durabilityElement.style.color = '#ffffff'; // Normal
        } else if (lowerDurability > 30) {
            durabilityElement.style.color = '#f0a000'; // Warning yellow
        } else {
            durabilityElement.style.color = '#f04000'; // Critical red-orange
        }
    }
    
    // Update weapon cooldown indicators if they exist
    updateWeaponCooldowns(player);
}

// Update weapon cooldown indicators
function updateWeaponCooldowns(player) {
    // Check for staff cooldown element, create if doesn't exist
    let staffCooldownElement = document.getElementById('staff-cooldown');
    
    if (!staffCooldownElement) {
        // Create container for cooldown indicators
        let cooldownContainer = document.getElementById('cooldown-container');
        
        if (!cooldownContainer) {
            cooldownContainer = document.createElement('div');
            cooldownContainer.id = 'cooldown-container';
            cooldownContainer.style.position = 'absolute';
            cooldownContainer.style.bottom = '20px';
            cooldownContainer.style.right = '20px';
            cooldownContainer.style.display = 'flex';
            cooldownContainer.style.gap = '10px';
            document.body.appendChild(cooldownContainer);
        }
        
        // Create staff cooldown indicator
        staffCooldownElement = document.createElement('div');
        staffCooldownElement.id = 'staff-cooldown';
        staffCooldownElement.style.width = '40px';
        staffCooldownElement.style.height = '40px';
        staffCooldownElement.style.borderRadius = '50%';
        staffCooldownElement.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        staffCooldownElement.style.border = '2px solid #4040ff';
        staffCooldownElement.style.position = 'relative';
        staffCooldownElement.style.overflow = 'hidden';
        
        const staffIcon = document.createElement('div');
        staffIcon.style.position = 'absolute';
        staffIcon.style.top = '50%';
        staffIcon.style.left = '50%';
        staffIcon.style.transform = 'translate(-50%, -50%)';
        staffIcon.style.color = '#4040ff';
        staffIcon.style.fontSize = '18px';
        staffIcon.textContent = '✦'; // Magic star symbol
        
        staffCooldownElement.appendChild(staffIcon);
        cooldownContainer.appendChild(staffCooldownElement);
        
        // Create cooldown overlay
        const staffOverlay = document.createElement('div');
        staffOverlay.id = 'staff-cooldown-overlay';
        staffOverlay.style.position = 'absolute';
        staffOverlay.style.bottom = '0';
        staffOverlay.style.left = '0';
        staffOverlay.style.width = '100%';
        staffOverlay.style.backgroundColor = 'rgba(64, 64, 255, 0.5)';
        staffOverlay.style.transition = 'height 0.1s linear';
        
        staffCooldownElement.appendChild(staffOverlay);
    }
    
    // Update staff cooldown display
    const staffCooldownOverlay = document.getElementById('staff-cooldown-overlay');
    if (staffCooldownOverlay) {
        const cooldownPercentage = (player.weapons.staff.cooldownTimer / player.weapons.staff.cooldown) * 100;
        staffCooldownOverlay.style.height = `${cooldownPercentage}%`;
        
        // Make it glow when ready
        if (cooldownPercentage <= 0) {
            staffCooldownElement.style.boxShadow = '0 0 10px #4040ff';
        } else {
            staffCooldownElement.style.boxShadow = 'none';
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
            <div>Melee Attack:</div><div>Left Mouse</div>
            <div>Magic Attack:</div><div>Right Mouse</div>
            <div>Interact:</div><div>E</div>
            <div>Inventory:</div><div>I</div>
            <div>Pause:</div><div>ESC</div>
        </div>
    `;
    
    hintsContainer.innerHTML = hintContent;
    
    // Style the container
    hintsContainer.style.position = 'absolute';
    hintsContainer.style.top = '20px';
    hintsContainer.style.left = '20px';
    hintsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    hintsContainer.style.color = 'white';
    hintsContainer.style.padding = '15px';
    hintsContainer.style.borderRadius = '8px';
    hintsContainer.style.fontFamily = 'Arial, sans-serif';
    hintsContainer.style.fontSize = '14px';
    hintsContainer.style.zIndex = '1000';
    hintsContainer.style.userSelect = 'none';
    
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
