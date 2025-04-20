// src/game/game.js - Updated Game class with jump-related changes
// Partial code showing only the needed changes for jumping functionality

// Update game while playing
updatePlaying(deltaTime, inputState) {
    // Handle pause input
    if (inputState.justPressed.pause) {
        this.state = GameState.PAUSED;
        return;
    }
    
    // Update player
    this.player.update(deltaTime, inputState, this.currentDungeon);
    
    // Update camera to follow player
    this.updateCamera(deltaTime);
    
    // Update physics
    this.physics.update(deltaTime);
    
    // Update all entities
    for (const entity of this.entities) {
        entity.update(deltaTime, this.player);
    }
    
    // Check for collisions
    this.physics.checkCollisions(this.player, this.entities, this.currentDungeon);
    
    // Update UI
    updateUI(this.player, this.currentFloor);
    
    // Update minimap
    if (this.minimapContext) {
        updateMinimap(this.minimapContext, this.currentDungeon, this.player);
    }
    
    // Check for floor progression
    if (this.currentDungeon.isKeyCollected() && this.currentDungeon.isPlayerAtExit(this.player.getPosition())) {
        this.currentFloor++;
        this.generateNewFloor(this.currentFloor);
    }
}

// Update camera position to follow player
updateCamera(deltaTime) {
    const playerPosition = this.player.getPosition();
    const isPlayerInAir = this.player.isInAir();
    
    // Calculate target camera position
    // Adjust camera height based on whether player is jumping
    const cameraHeight = isPlayerInAir ? 
        playerPosition.y + 9 : // Higher camera when jumping
        playerPosition.y + 8;  // Normal camera height
    
    const targetPosition = new THREE.Vector3(
        playerPosition.x,
        cameraHeight,
        playerPosition.z + 10 // Camera distance behind player
    );
    
    // Smoothly move camera to target position
    // Use faster lerp when player is jumping for more responsive camera
    const lerpFactor = isPlayerInAir ? 8 * deltaTime : 5 * deltaTime;
    this.camera.position.lerp(targetPosition, lerpFactor);
    
    // Look at player
    this.camera.lookAt(playerPosition);
}
