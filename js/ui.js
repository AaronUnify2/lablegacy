// ============================================
// UI MODULE
// ============================================

window.GameUI = (function() {
    console.log('ui.js loading...');
    
    let menuContainer = null;
    let resourceDisplay = null;
    
    // Create the UI elements
    function createUI() {
        // Menu container
        menuContainer = document.createElement('div');
        menuContainer.id = 'game-menu';
        menuContainer.style.cssText = `
            position: absolute;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 25, 15, 0.95);
            border: 2px solid #4a7c3f;
            border-radius: 8px;
            padding: 15px;
            display: none;
            pointer-events: auto;
            min-width: 200px;
            max-width: 300px;
            z-index: 100;
        `;
        document.getElementById('ui-overlay').appendChild(menuContainer);
        
        // Resource display
        resourceDisplay = document.createElement('div');
        resourceDisplay.id = 'resource-display';
        resourceDisplay.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 25, 15, 0.9);
            border: 2px solid #4a7c3f;
            border-radius: 8px;
            padding: 10px 20px;
            display: flex;
            gap: 20px;
            pointer-events: auto;
            z-index: 100;
        `;
        resourceDisplay.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #8b4513; font-size: 18px;">🪵</span>
                <span style="color: #c8f0c8; font-weight: bold;" id="wood-count">100</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #4a4a4a; font-size: 18px;">ite</span>
                <span style="color: #c8f0c8; font-weight: bold;" id="coal-count">0</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #9b4dca; font-size: 18px;">⚡</span>
                <span style="color: #c8f0c8; font-weight: bold;" id="energy-count">50</span>
            </div>
        `;
        document.getElementById('ui-overlay').appendChild(resourceDisplay);
    }
    
    // Show build menu for empty site
    function showBuildMenu(site) {
        const buildings = window.GameBuildings ? GameBuildings.BUILDING_TYPES : {};
        const gameState = window.GameEngine.gameState;
        
        let html = `
            <div style="color: #7ddf64; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; text-align: center;">
                Build Structure
            </div>
        `;
        
        Object.entries(buildings).forEach(([key, building]) => {
            const canAfford = gameState.resources.wood >= building.cost.wood && 
                             gameState.resources.energy >= building.cost.energy;
            const opacity = canAfford ? '1' : '0.5';
            
            html += `
                <div class="menu-item" data-building="${key}" style="
                    background: rgba(74, 124, 63, 0.3);
                    border: 1px solid #4a7c3f;
                    border-radius: 4px;
                    padding: 10px;
                    margin-bottom: 8px;
                    cursor: ${canAfford ? 'pointer' : 'not-allowed'};
                    opacity: ${opacity};
                    transition: background 0.2s;
                " ${canAfford ? `onclick="GameUI.buildBuilding('${key}')"` : ''}>
                    <div style="color: #c8f0c8; font-weight: bold; margin-bottom: 4px;">
                        ${building.name}
                    </div>
                    <div style="color: #7a9a7a; font-size: 12px; margin-bottom: 6px;">
                        ${building.description}
                    </div>
                    <div style="color: #a8d5a2; font-size: 11px;">
                        Cost: 🪵 ${building.cost.wood} ⚡ ${building.cost.energy}
                    </div>
                </div>
            `;
        });
        
        html += `
            <div style="text-align: center; margin-top: 10px;">
                <button onclick="GameUI.hideMenus()" style="
                    background: rgba(100, 60, 60, 0.5);
                    border: 1px solid #7c4a4a;
                    border-radius: 4px;
                    color: #c8a0a0;
                    padding: 6px 16px;
                    cursor: pointer;
                    font-family: inherit;
                ">Cancel</button>
            </div>
        `;
        
        menuContainer.innerHTML = html;
        menuContainer.style.display = 'block';
        
        // Add hover effects
        menuContainer.querySelectorAll('.menu-item').forEach(item => {
            if (item.style.cursor === 'pointer') {
                item.addEventListener('mouseenter', () => {
                    item.style.background = 'rgba(74, 124, 63, 0.5)';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'rgba(74, 124, 63, 0.3)';
                });
            }
        });
    }
    
    // Show building menu for existing building
    function showBuildingMenu(building) {
        const gameState = window.GameEngine.gameState;
        const canAffordUnit = gameState.resources.energy >= building.typeData.unitCost.energy;
        
        // Production status
        let productionStatus = '';
        if (building.isProducing) {
            const progress = Math.floor((building.productionProgress / building.typeData.productionTime) * 100);
            productionStatus = `
                <div style="margin-bottom: 12px;">
                    <div style="color: #7a9a7a; font-size: 12px; margin-bottom: 4px;">
                        Training: ${building.typeData.unitType}
                    </div>
                    <div style="background: rgba(0,0,0,0.3); border-radius: 4px; height: 8px; overflow: hidden;">
                        <div style="background: #7ddf64; height: 100%; width: ${progress}%; transition: width 0.1s;"></div>
                    </div>
                </div>
            `;
        }
        
        // Queue status
        let queueStatus = '';
        if (building.productionQueue.length > 0) {
            queueStatus = `
                <div style="color: #7a9a7a; font-size: 11px; margin-bottom: 8px;">
                    Queue: ${building.productionQueue.length} unit(s)
                </div>
            `;
        }
        
        let html = `
            <div style="color: #7ddf64; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; text-align: center;">
                ${building.typeData.name}
            </div>
            
            ${productionStatus}
            ${queueStatus}
            
            <div class="menu-item" style="
                background: rgba(74, 124, 63, 0.3);
                border: 1px solid #4a7c3f;
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 8px;
                cursor: ${canAffordUnit ? 'pointer' : 'not-allowed'};
                opacity: ${canAffordUnit ? '1' : '0.5'};
                transition: background 0.2s;
            " ${canAffordUnit ? `onclick="GameUI.trainUnit('${building.id}')"` : ''}>
                <div style="color: #c8f0c8; font-weight: bold; margin-bottom: 4px;">
                    Train ${building.typeData.unitType.charAt(0).toUpperCase() + building.typeData.unitType.slice(1)}
                </div>
                <div style="color: #a8d5a2; font-size: 11px;">
                    Cost: ⚡ ${building.typeData.unitCost.energy}
                </div>
            </div>
            
            <div style="
                color: #7a9a7a;
                font-size: 11px;
                text-align: center;
                padding: 8px;
                border-top: 1px solid rgba(74, 124, 63, 0.3);
                margin-top: 8px;
            ">
                Upgrades coming soon...
            </div>
            
            <div style="text-align: center; margin-top: 10px;">
                <button onclick="GameUI.hideMenus()" style="
                    background: rgba(100, 60, 60, 0.5);
                    border: 1px solid #7c4a4a;
                    border-radius: 4px;
                    color: #c8a0a0;
                    padding: 6px 16px;
                    cursor: pointer;
                    font-family: inherit;
                ">Close</button>
            </div>
        `;
        
        menuContainer.innerHTML = html;
        menuContainer.style.display = 'block';
        
        // Add hover effects
        const trainItem = menuContainer.querySelector('.menu-item');
        if (trainItem && canAffordUnit) {
            trainItem.addEventListener('mouseenter', () => {
                trainItem.style.background = 'rgba(74, 124, 63, 0.5)';
            });
            trainItem.addEventListener('mouseleave', () => {
                trainItem.style.background = 'rgba(74, 124, 63, 0.3)';
            });
        }
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
        document.getElementById('coal-count').textContent = Math.floor(gameState.resources.coal);
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
