// ============================================
// UI MODULE - Enhanced with Multi-Select Support
// ============================================

window.GameUI = (function() {
    console.log('ui.js loading...');
    
    let menuContainer = null;
    let resourceDisplay = null;
    let unitMenuContainer = null;
    let commandIndicator = null;
    let menuOpenTime = 0;
    const MENU_CLICK_DELAY = 300; // ms before clicks register
    
    // Create the UI elements
    function createUI() {
        // Menu container for buildings
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
        
        // Unit menu container
        unitMenuContainer = document.createElement('div');
        unitMenuContainer.id = 'unit-menu';
        unitMenuContainer.style.cssText = `
            position: absolute;
            bottom: 140px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 25, 15, 0.95);
            border: 2px solid #4a9c7f;
            border-radius: 12px;
            padding: 0;
            display: none;
            pointer-events: auto;
            width: 280px;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            overflow: hidden;
            flex-direction: column;
        `;
        document.getElementById('ui-overlay').appendChild(unitMenuContainer);
        
        // Command mode indicator
        commandIndicator = document.createElement('div');
        commandIndicator.id = 'command-indicator';
        commandIndicator.style.cssText = `
            position: absolute;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(100, 200, 100, 0.9);
            border: 2px solid #7ddf64;
            border-radius: 20px;
            padding: 8px 20px;
            display: none;
            pointer-events: none;
            z-index: 100;
            color: #1a2a1a;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        document.getElementById('ui-overlay').appendChild(commandIndicator);
        
        // Resource display
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
                <span style="color: #c8f0c8; font-weight: bold; font-size: 14px;" id="wood-count">5000</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 16px;">⚡</span>
                <span style="color: #c8f0c8; font-weight: bold; font-size: 14px;" id="energy-count">3000</span>
            </div>
        `;
        document.getElementById('ui-overlay').appendChild(resourceDisplay);
    }
    
    function canClick() {
        return Date.now() - menuOpenTime > MENU_CLICK_DELAY;
    }
    
    // ============================================
    // UNIT MENU - NOW SUPPORTS MULTI-SELECT
    // ============================================
    
    function showUnitMenu(units) {
        hideMenuVisuals();
        
        // Handle both single unit and array of units
        if (!Array.isArray(units)) {
            units = [units];
        }
        
        if (units.length === 0) return;
        
        const firstUnit = units[0];
        const unitCount = units.length;
        const isMultiSelect = unitCount > 1;
        const isWoodsman = firstUnit.type === 'woodsman';
        
        let statusInfo = '';
        
        // Header showing selection count
        const headerText = isMultiSelect 
            ? `${firstUnit.typeData.name} ×${unitCount}`
            : firstUnit.typeData.name;
        
        // For single selection, show detailed status
        if (!isMultiSelect) {
            // Health bar
            const healthPercent = (firstUnit.health / firstUnit.maxHealth) * 100;
            statusInfo += `
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #8ab88a; font-size: 11px;">Health</span>
                        <span style="color: #a8d5a2; font-size: 11px;">${Math.floor(firstUnit.health)}/${firstUnit.maxHealth}</span>
                    </div>
                    <div style="background: rgba(0,0,0,0.4); border-radius: 4px; height: 8px; overflow: hidden; border: 1px solid #3a5a3a;">
                        <div style="background: linear-gradient(90deg, #5a9a4a, #7ddf64); height: 100%; width: ${healthPercent}%;"></div>
                    </div>
                </div>
            `;
            
            // Woodsman inventory
            if (isWoodsman) {
                const carryPercent = ((firstUnit.inventory.wood + firstUnit.inventory.energy) / firstUnit.carryCapacity) * 100;
                statusInfo += `
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #8ab88a; font-size: 11px;">Carrying</span>
                            <span style="color: #a8d5a2; font-size: 11px;">
                                🪵${firstUnit.inventory.wood} ⚡${firstUnit.inventory.energy} / ${firstUnit.carryCapacity}
                            </span>
                        </div>
                        <div style="background: rgba(0,0,0,0.4); border-radius: 4px; height: 8px; overflow: hidden; border: 1px solid #3a5a3a;">
                            <div style="background: linear-gradient(90deg, #8B6914, #d4a84a); height: 100%; width: ${carryPercent}%;"></div>
                        </div>
                    </div>
                `;
                
                // State info
                let stateText = 'Idle';
                let stateColor = '#8ab88a';
                switch(firstUnit.state) {
                    case 'harvesting':
                        if (firstUnit.harvestMode === 'cutPath') {
                            stateText = '🛤️ Cutting path...';
                        } else if (firstUnit.harvestMode === 'cutLane') {
                            stateText = '🛣️ Cutting lane...';
                        } else {
                            stateText = '🪓 Harvesting...';
                        }
                        stateColor = '#d4a84a';
                        break;
                    case 'moving':
                        if (firstUnit.harvestMode === 'cutPath') {
                            stateText = '🛤️ Moving to cut path...';
                            stateColor = '#d4a84a';
                        } else if (firstUnit.harvestMode === 'cutLane') {
                            stateText = '🛣️ Moving to cut lane...';
                            stateColor = '#d4a84a';
                        } else {
                            stateText = '🚶 Moving...';
                            stateColor = '#7ddf64';
                        }
                        break;
                    case 'returning':
                        stateText = '📦 Returning to Sawmill...';
                        stateColor = '#a8d5a2';
                        break;
                }
                
                statusInfo += `
                    <div style="
                        background: rgba(0,0,0,0.2);
                        border-radius: 6px;
                        padding: 8px;
                        margin-bottom: 10px;
                        text-align: center;
                    ">
                        <span style="color: ${stateColor}; font-size: 12px;">${stateText}</span>
                    </div>
                `;
            }
        } else {
            // Multi-select summary
            statusInfo += `
                <div style="
                    background: rgba(74, 156, 127, 0.2);
                    border-radius: 6px;
                    padding: 10px;
                    margin-bottom: 10px;
                    text-align: center;
                ">
                    <span style="color: #7ddfb4; font-size: 12px;">
                        ${unitCount} units selected
                    </span>
                </div>
            `;
        }
        
        // Commands section
        let commandsHtml = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button class="unit-cmd-btn" data-cmd="move" style="
                    background: rgba(74, 124, 63, 0.3);
                    border: 1px solid #4a7c3f;
                    border-radius: 6px;
                    color: #c8f0c8;
                    padding: 12px 16px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.15s ease;
                ">
                    <span style="font-size: 18px;">🎯</span>
                    <span style="flex: 1; text-align: left;">Move</span>
                    <span style="color: #7a9a7a; font-size: 11px;">Tap destination</span>
                </button>
        `;
        
        if (isWoodsman) {
            // Check if any unit has harvest mode active
            const anyHarvesting = units.some(u => u.harvestMode === 'nearby');
            const anyCuttingPath = units.some(u => u.harvestMode === 'cutPath');
            const anyCuttingLane = units.some(u => u.harvestMode === 'cutLane');
            
            commandsHtml += `
                <button class="unit-cmd-btn" data-cmd="harvest" style="
                    background: ${anyHarvesting ? 'rgba(139, 105, 20, 0.4)' : 'rgba(74, 124, 63, 0.3)'};
                    border: 1px solid ${anyHarvesting ? '#d4a84a' : '#4a7c3f'};
                    border-radius: 6px;
                    color: #c8f0c8;
                    padding: 12px 16px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.15s ease;
                ">
                    <span style="font-size: 18px;">🪓</span>
                    <span style="flex: 1; text-align: left;">Harvest Nearby</span>
                    <span style="color: #7a9a7a; font-size: 11px;">${anyHarvesting ? 'ACTIVE' : 'Auto-chop'}</span>
                </button>
                
                <button class="unit-cmd-btn" data-cmd="cutPath" style="
                    background: ${anyCuttingPath ? 'rgba(139, 105, 20, 0.4)' : 'rgba(74, 124, 63, 0.3)'};
                    border: 1px solid ${anyCuttingPath ? '#d4a84a' : '#4a7c3f'};
                    border-radius: 6px;
                    color: #c8f0c8;
                    padding: 12px 16px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.15s ease;
                ">
                    <span style="font-size: 18px;">🛤️</span>
                    <span style="flex: 1; text-align: left;">Cut Path</span>
                    <span style="color: #7a9a7a; font-size: 11px;">${anyCuttingPath ? 'ACTIVE' : '2 wide'}</span>
                </button>
                
                <button class="unit-cmd-btn" data-cmd="cutLane" style="
                    background: ${anyCuttingLane ? 'rgba(139, 105, 20, 0.4)' : 'rgba(74, 124, 63, 0.3)'};
                    border: 1px solid ${anyCuttingLane ? '#d4a84a' : '#4a7c3f'};
                    border-radius: 6px;
                    color: #c8f0c8;
                    padding: 12px 16px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.15s ease;
                ">
                    <span style="font-size: 18px;">🛣️</span>
                    <span style="flex: 1; text-align: left;">Cut Lane</span>
                    <span style="color: #7a9a7a; font-size: 11px;">${anyCuttingLane ? 'ACTIVE' : '4 wide'}</span>
                </button>
            `;
        }
        
        commandsHtml += '</div>';
        
        // Select All Visible button
        const selectAllBtn = `
            <button id="select-all-visible-btn" style="
                width: 100%;
                background: rgba(74, 156, 127, 0.3);
                border: 1px solid #4a9c7f;
                border-radius: 6px;
                color: #7ddfb4;
                padding: 10px 16px;
                cursor: pointer;
                font-family: inherit;
                font-size: 12px;
                margin-top: 8px;
                transition: all 0.15s ease;
            ">
                👁️ Select All Visible ${firstUnit.typeData.name}s
            </button>
        `;
        
        let html = `
            <div style="
                background: rgba(74, 156, 127, 0.3);
                padding: 12px 15px;
                border-bottom: 1px solid #4a9c7f;
            ">
                <div style="color: #7ddfb4; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; text-align: center; font-weight: bold;">
                    ${headerText}
                </div>
            </div>
            <div style="padding: 12px;">
                ${statusInfo}
                ${commandsHtml}
                ${selectAllBtn}
            </div>
            <div style="
                padding: 10px 12px;
                border-top: 1px solid #4a9c7f;
                background: rgba(15, 25, 15, 0.5);
            ">
                <button id="unit-menu-close" style="
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
                ">Deselect${isMultiSelect ? ' All' : ''}</button>
            </div>
        `;
        
        unitMenuContainer.innerHTML = html;
        unitMenuContainer.style.display = 'flex';
        menuOpenTime = Date.now();
        
        // Command button handlers
        unitMenuContainer.querySelectorAll('.unit-cmd-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!canClick()) return;
                
                const cmd = btn.dataset.cmd;
                handleUnitCommand(units, cmd);
            });
            
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(74, 156, 127, 0.4)';
            });
            btn.addEventListener('mouseleave', () => {
                const cmd = btn.dataset.cmd;
                let isActive = false;
                
                if (cmd === 'harvest') {
                    isActive = units.some(u => u.harvestMode === 'nearby');
                } else if (cmd === 'cutPath') {
                    isActive = units.some(u => u.harvestMode === 'cutPath');
                } else if (cmd === 'cutLane') {
                    isActive = units.some(u => u.harvestMode === 'cutLane');
                }
                
                btn.style.background = isActive ? 'rgba(139, 105, 20, 0.4)' : 'rgba(74, 124, 63, 0.3)';
            });
        });
        
        // Select All Visible button handler
        const selectAllVisibleBtn = document.getElementById('select-all-visible-btn');
        if (selectAllVisibleBtn) {
            selectAllVisibleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!canClick()) return;
                
                if (window.GameUnits) {
                    GameUnits.selectAllVisibleOfType(firstUnit.type);
                }
            });
            
            selectAllVisibleBtn.addEventListener('mouseenter', () => {
                selectAllVisibleBtn.style.background = 'rgba(74, 156, 127, 0.5)';
            });
            selectAllVisibleBtn.addEventListener('mouseleave', () => {
                selectAllVisibleBtn.style.background = 'rgba(74, 156, 127, 0.3)';
            });
        }
        
        // Close/Deselect button
        document.getElementById('unit-menu-close').addEventListener('click', (e) => {
            e.stopPropagation();
            if (canClick()) {
                if (window.GameUnits) {
                    GameUnits.deselectAllUnits();
                }
            }
        });
    }
    
    function handleUnitCommand(units, cmd) {
        // Handle both single unit and array
        if (!Array.isArray(units)) {
            units = [units];
        }
        
        switch(cmd) {
            case 'move':
                // Enter move mode
                if (window.GameUnits) {
                    GameUnits.setCommandMode('move');
                }
                const moveText = units.length > 1 
                    ? `Tap destination for ${units.length} units`
                    : 'Tap destination to move';
                showCommandIndicator(moveText);
                hideMenuVisuals();
                break;
                
            case 'harvest':
                // Toggle harvest mode for all selected units
                const anyHarvesting = units.some(u => u.harvestMode === 'nearby');
                
                units.forEach(unit => {
                    if (anyHarvesting) {
                        // Turn off for all
                        unit.harvestMode = null;
                        unit.corridorTarget = null;
                        unit.state = 'idle';
                    } else {
                        // Turn on for all
                        unit.harvestMode = 'nearby';
                        unit.corridorTarget = null;
                        if (window.GameUnits) {
                            GameUnits.startHarvesting(unit);
                        }
                    }
                });
                
                // Refresh menu
                showUnitMenu(units);
                break;
                
            case 'cutPath':
                // Enter cut path mode (2 wide)
                if (window.GameUnits) {
                    GameUnits.setCommandMode('cutPath');
                }
                const pathText = units.length > 1 
                    ? `Tap destination for ${units.length} woodsmen to cut path`
                    : 'Tap destination to cut path (2 wide)';
                showCommandIndicator(pathText);
                hideMenuVisuals();
                break;
                
            case 'cutLane':
                // Enter cut lane mode (4 wide)
                if (window.GameUnits) {
                    GameUnits.setCommandMode('cutLane');
                }
                const laneText = units.length > 1 
                    ? `Tap destination for ${units.length} woodsmen to cut lane`
                    : 'Tap destination to cut lane (4 wide)';
                showCommandIndicator(laneText);
                hideMenuVisuals();
                break;
        }
    }
    
    function showCommandIndicator(text) {
        commandIndicator.textContent = text;
        commandIndicator.style.display = 'block';
    }
    
    function hideCommandIndicator() {
        commandIndicator.style.display = 'none';
    }
    
    // ============================================
    // BUILDING MENUS
    // ============================================
    
    function showBuildMenu(site) {
        hideMenuVisuals();
        
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
        
        // Add click handlers
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
    
    function showBuildingMenu(building) {
        hideMenuVisuals();
        
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
                <div style="color: #7a9a7a; font-size: 11px; margin-bottom: 10px;">
                    Queue: ${building.productionQueue.length} unit(s)
                </div>
            `;
        }
        
        // Upgrade paths (for Lodge)
        let upgradesHtml = '';
        if (building.typeData.id === 'lodge' && window.GameUnits) {
            const upgrades = GameUnits.WOODSMAN_UPGRADES;
            upgradesHtml = `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #3a5a3a;">
                    <div style="color: #7ddf64; font-size: 12px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">
                        Woodsman Upgrades
                    </div>
            `;
            
            ['path1', 'path2', 'path3'].forEach((pathKey, pathIndex) => {
                const path = upgrades[pathKey];
                const currentLevel = building.upgrades[pathKey] || 0;
                const nextLevel = path.levels[currentLevel];
                
                if (nextLevel) {
                    const upgradeCosts = [
                        { wood: 30, energy: 20 },
                        { wood: 60, energy: 40 },
                        { wood: 100, energy: 70 }
                    ];
                    const cost = upgradeCosts[currentLevel];
                    const canAfford = gameState.resources.wood >= cost.wood && gameState.resources.energy >= cost.energy;
                    
                    upgradesHtml += `
                        <div class="upgrade-btn" data-path="${pathKey}" data-affordable="${canAfford}" style="
                            background: rgba(74, 124, 63, 0.2);
                            border: 1px solid ${canAfford ? '#4a7c3f' : '#3a5a3a'};
                            border-radius: 6px;
                            padding: 10px;
                            margin-bottom: 8px;
                            cursor: ${canAfford ? 'pointer' : 'not-allowed'};
                            opacity: ${canAfford ? '1' : '0.6'};
                            transition: all 0.15s ease;
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="color: #c8f0c8; font-size: 12px; font-weight: bold;">
                                        ${nextLevel.name}
                                    </div>
                                    <div style="color: #8ab88a; font-size: 10px; margin-top: 2px;">
                                        ${nextLevel.description}
                                    </div>
                                </div>
                                <div style="text-align: right; color: #a8d5a2; font-size: 10px;">
                                    🪵${cost.wood}<br>⚡${cost.energy}
                                </div>
                            </div>
                            <div style="color: #5a8a5a; font-size: 9px; margin-top: 4px;">
                                ${path.name} Level ${currentLevel + 1}/3
                            </div>
                        </div>
                    `;
                } else {
                    upgradesHtml += `
                        <div style="
                            background: rgba(74, 124, 63, 0.1);
                            border: 1px solid #3a5a3a;
                            border-radius: 6px;
                            padding: 10px;
                            margin-bottom: 8px;
                            opacity: 0.5;
                        ">
                            <div style="color: #7ddf64; font-size: 12px;">
                                ✓ ${path.name} MAXED
                            </div>
                        </div>
                    `;
                }
            });
            
            upgradesHtml += '</div>';
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
            <div style="padding: 12px; max-height: 45vh; overflow-y: auto;">
                ${productionStatus}
                ${queueStatus}
                
                <button id="train-unit-btn" data-building-id="${building.id}" style="
                    width: 100%;
                    background: ${canAffordUnit ? 'rgba(74, 124, 63, 0.4)' : 'rgba(60, 60, 60, 0.4)'};
                    border: 1px solid ${canAffordUnit ? '#4a7c3f' : '#4a4a4a'};
                    border-radius: 6px;
                    color: ${canAffordUnit ? '#c8f0c8' : '#8a8a8a'};
                    padding: 12px 16px;
                    cursor: ${canAffordUnit ? 'pointer' : 'not-allowed'};
                    font-family: inherit;
                    font-size: 13px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.15s ease;
                    opacity: ${canAffordUnit ? '1' : '0.6'};
                ">
                    <span>Train ${building.typeData.unitType}</span>
                    <span>⚡ ${building.typeData.unitCost.energy}</span>
                </button>
                
                ${upgradesHtml}
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
        
        // Train button
        const trainBtn = document.getElementById('train-unit-btn');
        if (canAffordUnit) {
            trainBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (canClick()) {
                    trainUnit(building.id);
                }
            });
            trainBtn.addEventListener('mouseenter', () => {
                trainBtn.style.background = 'rgba(74, 124, 63, 0.6)';
            });
            trainBtn.addEventListener('mouseleave', () => {
                trainBtn.style.background = 'rgba(74, 124, 63, 0.4)';
            });
        }
        
        // Upgrade buttons
        menuContainer.querySelectorAll('.upgrade-btn').forEach(btn => {
            if (btn.dataset.affordable === 'true') {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (canClick()) {
                        purchaseUpgrade(building, btn.dataset.path);
                    }
                });
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = 'rgba(74, 124, 63, 0.4)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'rgba(74, 124, 63, 0.2)';
                });
            }
        });
        
        // Close button
        document.getElementById('menu-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (canClick()) {
                hideMenus();
            }
        });
    }
    
    function purchaseUpgrade(building, pathKey) {
        const gameState = window.GameEngine.gameState;
        const currentLevel = building.upgrades[pathKey] || 0;
        
        if (currentLevel >= 3) return;
        
        const upgradeCosts = [
            { wood: 30, energy: 20 },
            { wood: 60, energy: 40 },
            { wood: 100, energy: 70 }
        ];
        
        const cost = upgradeCosts[currentLevel];
        
        if (gameState.resources.wood < cost.wood || gameState.resources.energy < cost.energy) {
            return;
        }
        
        // Deduct resources
        gameState.resources.wood -= cost.wood;
        gameState.resources.energy -= cost.energy;
        
        // Apply upgrade
        building.upgrades[pathKey] = currentLevel + 1;
        
        console.log(`Upgraded ${pathKey} to level ${currentLevel + 1}`);
        
        // Refresh UI
        updateResources();
        showBuildingMenu(building);
    }
    
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
        
        // Convert button handler
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
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function buildBuilding(buildingTypeId) {
        const gameState = window.GameEngine.gameState;
        if (!gameState.selectedSite) return;
        
        const building = GameBuildings.placeBuilding(gameState.selectedSite, buildingTypeId);
        if (building) {
            hideMenus();
            gameState.selectedSite = null;
        }
    }
    
    function trainUnit(buildingId) {
        const gameState = window.GameEngine.gameState;
        const building = gameState.buildings.find(b => b.id === buildingId);
        if (!building) return;
        
        if (GameBuildings.queueUnit(building)) {
            showBuildingMenu(building);
        }
    }
    
    // Just hide the menu visuals without clearing game state
    function hideMenuVisuals() {
        if (menuContainer) {
            menuContainer.style.display = 'none';
        }
        if (unitMenuContainer) {
            unitMenuContainer.style.display = 'none';
        }
        hideCommandIndicator();
    }
    
    // Hide menus AND clear selection state (for clicking elsewhere)
    function hideMenus() {
        hideMenuVisuals();
        
        const gameState = window.GameEngine?.gameState;
        if (gameState) {
            gameState.selectedSite = null;
            gameState.selectedBuilding = null;
        }
    }
    
    function updateResources() {
        const gameState = window.GameEngine?.gameState;
        if (!gameState) return;
        
        const woodEl = document.getElementById('wood-count');
        const energyEl = document.getElementById('energy-count');
        
        if (woodEl) woodEl.textContent = Math.floor(gameState.resources.wood);
        if (energyEl) energyEl.textContent = Math.floor(gameState.resources.energy);
    }
    
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
        showUnitMenu,
        showCommandIndicator,
        hideCommandIndicator,
        hideMenus,
        hideMenuVisuals,
        buildBuilding,
        trainUnit,
        updateResources
    };
})();
