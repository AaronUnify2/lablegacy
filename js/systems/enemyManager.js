import { Enemy } from '../entities/enemy.js';

export class EnemyManager {
    constructor(scene, collisionManager, player) {
        this.scene = scene;
        this.collisionManager = collisionManager;
        this.player = player;
        
        // List of all enemies
        this.enemies = [];
        
        // Enemy spawn settings - simplified
        this.maxEnemies = 5;
        this.spawnDistance = {
            min: 10,
            max: 20
        };
        
        // Debug flag - set to true to get console logs about spawning
        this.debug = true;
        
        // Force spawn a test enemy after a short delay
        if (this.debug) console.log("Enemy Manager initialized - will spawn test enemy in 3 seconds");
        
        setTimeout(() => {
            this.forceSpawnTestEnemy();
        }, 3000);
    }
    
    update(deltaTime, camera) {
        // Update all enemies
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime, camera);
        }
    }
    
    forceSpawnTestEnemy() {
        if (this.debug) console.log("Attempting to spawn test enemy...");
        
        // Try to spawn at a fixed position first
        const testPosition = new THREE.Vector3(0, 1, -10); // 10 units in front of origin
        
        // Try to find floor beneath
        if (this.collisionManager && typeof this.collisionManager.findFloorBelow === 'function') {
            const floorHit = this.collisionManager.findFloorBelow(testPosition, 10);
            if (floorHit && floorHit.point) {
                testPosition.y = floorHit.point.y + 0.1; // Just above floor
            }
        }
        
        // Create enemy
        const enemy = new Enemy(this.scene, testPosition, this.collisionManager, this.player);
        this.enemies.push(enemy);
        
        // Show some visual effect
        this.showSimpleSpawnEffect(testPosition);
        
        if (this.debug) console.log(`Spawned test enemy at (${testPosition.x}, ${testPosition.y}, ${testPosition.z})`);
        
        // Spawn a second test enemy at player position + offset
        setTimeout(() => {
            this.spawnEnemyNearPlayer();
        }, 2000);
    }
    
    spawnEnemyNearPlayer() {
        if (this.debug) console.log("Attempting to spawn enemy near player...");
        
        // Just use player position with an offset
        const playerPos = this.player.camera.position;
        const spawnPos = new THREE.Vector3(
            playerPos.x + 5, // 5 units to the right
            playerPos.y - 1, // Slightly below eye level
            playerPos.z - 5  // 5 units in front
        );
        
        // Try to find floor beneath
        if (this.collisionManager && typeof this.collisionManager.findFloorBelow === 'function') {
            const floorHit = this.collisionManager.findFloorBelow(spawnPos, 10);
            if (floorHit && floorHit.point) {
                spawnPos.y = floorHit.point.y + 0.1; // Just above floor
            }
        }
        
        // Create enemy
        const enemy = new Enemy(this.scene, spawnPos, this.collisionManager, this.player);
        this.enemies.push(enemy);
        
        // Show some visual effect
        this.showSimpleSpawnEffect(spawnPos);
        
        if (this.debug) console.log(`Spawned enemy near player at (${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z})`);
    }
    
    showSimpleSpawnEffect(position) {
        // Create a simple sphere that expands and fades out
        const effectGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const effectMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.7,
            wireframe: true
        });
        
        const effect = new THREE.Mesh(effectGeometry, effectMaterial);
        effect.position.copy(position);
        this.scene.add(effect);
        
        // Simple animation
        const duration = 1000; // 1 second
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale up
            const scale = 1 + progress * 3;
            effect.scale.set(scale, scale, scale);
            
            // Fade out
            effect.material.opacity = 0.7 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove when done
                this.scene.remove(effect);
            }
        };
        
        animate();
    }
    
    // Additional simplified methods that might be called by the game
    clear() {
        // Remove all enemies from the scene
        for (const enemy of this.enemies) {
            if (enemy.group) {
                this.scene.remove(enemy.group);
            }
        }
        this.enemies = [];
        if (this.debug) console.log("Cleared all enemies");
    }
}
