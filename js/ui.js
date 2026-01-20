// ============================================
// UI MODULE
// ============================================

window.GameUI = (function() {
    console.log('ui.js loading...');
    
    let menuContainer = null;
    let resourceDisplay = null;
    let menuOpenTime = 0;
    const MENU_CLICK_DELAY = 300; // ms before clicks register
    
    // Create the UI elements
    function createUI() {
        // Menu container with scroll
        menuContainer = document.createElement('div');
        menuContainer.id = 'game-menu';
        menuContainer.style.cssText = `
            position: absolute;
            bottom: 140px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 25, 15, 0.95);
            border: 2px solid #4a7c3f;
            border-radius: 12px;
            padding: 0;
            display: none;
            pointer-events: auto;
            width: 280px;
            max-height: 55vh;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            overflow: hidden;
            flex-direction: column;
        `;
        document.getElementById('ui-overlay').appendChild(menuContainer);
        
        // Resource display - cleaner design
        resourceDisplay = document.createElement('div');
        resourceDisplay.id = 'resource-display';
        resourceDisplay.style.cssText = `
            position: absolute;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 25, 15, 0.9);
            border: 2px solid #4a7c3f;
            border-radius: 25px;
            padding: 8px 24px;
            display: flex;
            gap: 24px;
            pointer-events: auto;
            z-index: 100;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        resourceDisplay.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 16px;">🪵</span>
                <span style="color: #c8f0c8; font-weight: bold; font-size: 14px;" id="wood-count">500</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 16px;">⚡</span>
                <span style="color: #c8f0c8; font-weight: bold; font-size: 14px;" id="energy-count">300</span>
            </div>
        `;
        document.getElementById('ui-overlay').appendChild(resourceDisplay);
    }
    
    // Check if enough time has passed since menu opened
    function canClick() {
        return Date.now() - menuOpenTime > MENU_CLICK_DELAY;
    }
    
    // Show build menu for empty site
    function showBuildMenu(site) {
        const buildings = window.GameBuildings ? GameBuildings.BUILDING_TYPES : {};
        const gameState = window.GameEngine.gameState;
        
        let html = `
            <div style="
                background: rgba(74, 124, 63, 0.4);
                padding: 12px 15px;
                border-bottom: 1px solid #4a7c3f;
                position: sticky;
                top: 0;
            ">
                <div style="color: #7ddf64; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; text-align: center; font-weight: bold;">
                    Build Structure
                </div>
            </div>
            <div style="
                padding: 12px;
                overflow-y: auto;
                max-height: calc(55vh - 100px);
            ">
        `;
        
        Object.entries(buildings).forEach(([key, building]) => {
            const canAfford = gameState.resources.wood >= building.cost.wood && 
                             gameState.resources.energy >= building.cost.energy;
            const opacity = canAfford ? '1' : '0.5';
            
            html += `
                <div class="menu-item" data-building="${key}" data-affordable="${canAfford}" style="
                    background: rgba(74, 124, 63, 0.25);
                    border: 1px solid ${canAfford ? '#4a7c3f' : '#3a5a3f'};
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 10px;
                    cursor: ${canAfford ? 'pointer' : 'not-allowed'};
                    opacity: ${opacity};
                    transition: all 0.15s ease;
                ">
                    <div style="color: #c8f0c8; font-weight: bold; margin-bottom: 4px; font-size: 14px;">
                        ${building.name}
                    </div>
                    <div style="color: #8ab88a; font-size: 11px; margin-bottom: 8px; line-height: 1.4;">
                        ${building.description}
                    </div>
                    <div style="color: #a8d5a2; font-size: 12px; display: flex; gap: 12px;">
                        <span>🪵 ${building.cost.wood}</span>
                        <span>⚡ ${building.cost.energy}</span>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        
        html += `
            <div style="
                padding: 10px 12px;
                border-top: 1px solid #4a7c3f;
                background: rgba(15, 25, 15, 0.5);
            ">
                <button id="menu-cancel-btn" style="
                    width: 100%;
                    background: rgba(100, 60, 60, 0.4);
                    border: 1px solid #7c4a4a;
                    border-radius: 6px;
                    color: #d0a0a0;
                    padding: 10px 16px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 13px;
                    transition: all 0.15s ease;
                ">Cancel</button>
            </div>
        `;
        
        menuContainer.innerHTML = html;
        menuContainer.style.display = 'flex';
        menuOpenTime = Date.now();
        
        // Add click handlers with delay check
        menuContainer.querySelectorAll('.menu-item').forEach(item => {
            const isAffordable = item.dataset.affordable === 'true';
            const buildingKey = item.dataset.building;
            
            if (isAffordable) {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (canClick()) {
                        buildBuilding(buildingKey);
                    }
                });
                
                item.addEventListener('mouseenter', () => {
                    item.style.background = 'rgba(74, 124, 63, 0.45)';
                    item.style.borderColor = '#5a9c4f';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'rgba(74, 124, 63, 0.25)';
                    item.style.borderColor = '#4a7c3f';
                });
            }
        });
        
        // Cancel button
        document.getElementById('menu-cancel-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (canClick()) {
                hideMenus();
            }
        });
    }
    
    // Show building menu for existing building
    function showBuildingMenu(building) {
        const gameState = window.GameEngine.gameState;
        
        // Handle buildings without units (Sawmill, Furnace)
        if (!building.typeData.unitType) {
            showEconomyBuildingMenu(building);
            return;
        }
        
        const canAffordUnit = gameState.resources.energy >= building.typeData.unitCost.energy;
        
        // Production status
        let productionStatus = '';
        if (building.isProducing) {
            const progress = Math.floor((building.productionProgress / building.typeData.productionTime) * 100);
            productionStatus = `
                <div style="margin: 12px 0;">
                    <div style="color: #8ab88a; font-size: 11px; margin-bottom: 6px;">
                        Training: ${building.typeData.unitType}
                    </div>
                    <div style="background: rgba(0,0,0,0.4); border-radius: 4px; height: 10px; overflow: hidden; border: 1px solid #3a5a3a;">
                        <div style="background: linear-gradient(90deg, #5a9a4a, #7ddf64); height: 100%; width: ${progress}%; transition: width 0.2s;"></div>
                    </div>
                </div>
            `;
        }
        
        // Queue status
        let queueStatus = '';
        if (building.productionQueue.length > 0) {
            queueStatus = `
                <div style="color: #8ab88a; font-size: 11px; margin-bottom: 8px;">
                    In queue: ${building.productionQueue.length} unit(s)
                </div>
            `;
        }
        
        let html = `
            <div style="
                background: rgba(74, 124, 63, 0.4);
                padding: 12px 15px;
                border-bottom: 1px solid #4a7c3f;
            ">
                <div style="color: #7ddf64; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; text-align: center; font-weight: bold;">
                    ${building.typeData.name}
                </div>
            </div>
            <div style="padding: 12px;">
                ${productionStatus}
                ${queueStatus}
                
                <div class="menu-item train-btn" data-building-id="${building.id}" style="
                    background: rgba(74, 124, 63, 0.25);
                    border: 1px solid ${canAffordUnit ? '#4a7c3f' : '#3a5a3f'};
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 10px;
                    cursor: ${canAffordUnit ? 'pointer' : 'not-allowed'};
                    opacity: ${canAffordUnit ? '1' : '0.5'};
                    transition: all 0.15s ease;
                ">
                    <div style="color: #c8f0c8; font-weight: bold; margin-bottom: 4px;">
                        Train ${building.typeData.unitType.charAt(0).toUpperCase() + building.typeData.unitType.slice(1)}
                    </div>
                    <div style="color: #a8d5a2; font-size: 12px;">
                        ⚡ ${building.typeData.unitCost.energy}
                    </div>
                </div>
                
                <div style="
                    color: #6a8a6a;
                    font-size: 11px;
                    text-align: center;
                    padding: 10px;
                    border: 1px dashed #3a5a3a;
                    border-radius: 6px;
                    margin-bottom: 10px;
                ">
                    Upgrades coming soon...
                </div>
            </div>
            <div style="
                padding: 10px 12px;
                border-top: 1px solid #4a7c3f;
                background: rgba(15, 25, 15, 0.5);
            ">
                <button id="menu-close-btn" style="
                    width: 100%;
                    background: rgba(80, 80, 80, 0.4);
                    border: 1px solid #6a6a6a;
                    border-radius: 6px;
                    color: #c0c0c0;
                    padding: 10px 16px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 13px;
                    transition: all 0.15s ease;
                ">Close</button>
            </div>
        `;
        
        menuContainer.innerHTML = html;
        menuContainer.style.display = 'flex';
        menuOpenTime = Date.now();
        
        // Train button handler
        const trainBtn = menuContainer.querySelector('.train-btn');
        if (trainBtn && canAffordUnit) {
            trainBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (canClick()) {
                    trainUnit(building.id);
                }
            });
            trainBtn.addEventListener('mouseenter', () => {
                trainBtn.style.background = 'rgba(74, 124, 63, 0.45)';
            });
            trainBtn.addEventListener('mouseleave', () => {
                trainBtn.style.background = 'rgba(74, 124, 63, 0.25)';
            });
        }
        
        // Close button
        document.getElementById('menu-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (canClick()) {
                hideMenus();
            }
        });
    }
    
    // Show menu for economy buildings (Sawmill, Furnace)
    function showEconomyBuildingMenu(building) {
        let specialInfo = '';
        
        if (building.typeData.isDepot) {
            specialInfo = `
                <div style="
                    background: rgba(139, 105, 20, 0.2);
                    border: 1px solid #8B6914;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 10px;
                ">
                    <div style="color: #d4a84a; font-size: 12px;">
                        📦 Resource Depot
                    </div>
                    <div style="color: #a89060; font-size: 11px; margin-top: 4px;">
                        Woodsmen will deposit ${building.typeData.resourceType} here
                    </div>
                </div>
            `;
        }
        
        if (building.typeData.isConverter) {
            specialInfo = `
                <div style="
                    background: rgba(255, 100, 50, 0.15);
                    border: 1px solid #ff6432;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 10px;
                ">
                    <div style="color: #ff9966; font-size: 12px;">
                        🔥 Resource Converter
                    </div>
                    <div style="color: #cc8866; font-size: 11px; margin-top: 4px;">
                        Converts 10 wood → 1 energy
                    </div>
                    <button id="convert-btn" style="
                        margin-top: 10px;
                        width: 100%;
                        background: rgba(255, 100, 50, 0.3);
                        border: 1px solid #ff6432;
                        border-radius: 4px;
                        color: #ffaa88;
                        padding: 8px;
                        cursor: pointer;
                        font-family: inherit;
                    ">Convert 10 🪵 → 1 ⚡</button>
                </div>
            `;
        }
        
        let html = `
            <div style="
                background: rgba(74, 124, 63, 0.4);
                padding: 12px 15px;
                border-bottom: 1px solid #4a7c3f;
            ">
                <div style="color: #7ddf64; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; text-align: center; font-weight: bold;">
                    ${building.typeData.name}
                </div>
            </div>
            <div style="padding: 12px;">
                ${specialInfo}
            </div>
            <div style="
                padding: 10px 12px;
                border-top: 1px solid #4a7c3f;
                background: rgba(15, 25, 15, 0.5);
            ">
                <button id="menu-close-btn" style="
                    width: 100%;
                    background: rgba(80, 80, 80, 0.4);
                    border: 1px solid #6a6a6a;
                    border-radius: 6px;
                    color: #c0c0c0;
                    padding: 10px 16px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 13px;
                ">Close</button>
            </div>
        `;
        
        menuContainer.innerHTML = html;
        menuContainer.style.display = 'flex';
        menuOpenTime = Date.now();
        
        // Convert button handler for Furnace
        const convertBtn = document.getElementById('convert-btn');
        if (convertBtn) {
            convertBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (canClick()) {
                    const gameState = window.GameEngine.gameState;
                    if (gameState.resources.wood >= 10) {
                        gameState.resources.wood -= 10;
                        gameState.resources.energy += 1;
                        updateResources();
                    }
                }
            });
        }
        
        // Close button
        document.getElementById('menu-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (canClick()) {
                hideMenus();
            }
        });
    }
    
    // Build a building on selected site
    function buildBuilding(buildingTypeId) {
        const gameState = window.GameEngine.gameState;
        if (!gameState.selectedSite) return;
        
        const building = GameBuildings.placeBuilding(gameState.selectedSite, buildingTypeId);
        if (building) {
            hideMenus();
            gameState.selectedSite = null;
        }
    }
    
    // Train a unit from a building
    function trainUnit(buildingId) {
        const gameState = window.GameEngine.gameState;
        const building = gameState.buildings.find(b => b.id === buildingId);
        if (!building) return;
        
        if (GameBuildings.queueUnit(building)) {
            // Refresh menu to show updated queue
            showBuildingMenu(building);
        }
    }
    
    // Hide all menus
    function hideMenus() {
        if (menuContainer) {
            menuContainer.style.display = 'none';
        }
        const gameState = window.GameEngine.gameState;
        gameState.selectedSite = null;
        gameState.selectedBuilding = null;
    }
    
    // Update resource display
    function updateResources() {
        const gameState = window.GameEngine.gameState;
        document.getElementById('wood-count').textContent = Math.floor(gameState.resources.wood);
        document.getElementById('energy-count').textContent = Math.floor(gameState.resources.energy);
    }
    
    // Initialize
    function init() {
        createUI();
        updateResources();
        console.log('UI module initialized');
    }
    
    // Public API
    return {
        init,
        showBuildMenu,
        showBuildingMenu,
        hideMenus,
        buildBuilding,
        trainUnit,
        updateResources
    };
})();
