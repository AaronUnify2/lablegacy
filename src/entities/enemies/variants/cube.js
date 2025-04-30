// src/entities/enemies/variants/Cube.js - Cube enemy that uses ranged attacks

import * as THREE from 'three';
import { EnemyBase } from '../enemyBase.js';
import { createRangedAttack } from '../enemyAttacks.js';

// Cube enemy class
export class Cube {
    // Static method to create a new cube enemy
    static create(x, y, z, params = {}) {
        // Configure base parameters
        const enemyParams = {
            id: 'cube',
            name: 'Cube Sentinel',
            x: x,
            y: y,
            z: z,
            maxHealth: 50,
            baseDamage: 10,
            moveSpeed: 2.5, // Slower than the sphere
            color: 0xff6040, // Orange-red color
            attackType: 'ranged',
            attackRange: 12, // Longer attack range for ranged attacks
            attackCooldown: 2.5, // Slower attacks
            detectionRange: 15,
            retreatRange: 4, // Tries to keep distance for ranged attacks
            projectileSpeed: 7,
            projectileLifetime: 3,
            ...params
        };
        
        // Create base enemy
        const enemy = new EnemyBase(enemyParams);
        
        // Override mesh creation with cube-specific mesh
        enemy.createMesh = (params) => {
            // Create a cube geometry with beveled edges
            const geometry = new THREE.BoxGeometry(enemy.size * 0.8, enemy.size * 0.8, enemy.size * 0.8);
            const material = new THREE.MeshLambertMaterial({ color: enemy.color });
            enemy.mesh = new THREE.Mesh(geometry, material);
            enemy.mesh.castShadow = true;
            enemy.mesh.receiveShadow = true;
            
            // Create container object for positioning
            enemy.object = new THREE.Object3D();
            enemy.object.position.copy(enemy.position);
            enemy.object.add(enemy.mesh);
            
            // Add a point light to make the enemy glow
            const light = new THREE.PointLight(enemy.color, 0.7, 4);
            light.position.set(0, 0, 0);
            enemy.mesh.add(light);
        };
        
        // Custom animation for the cube
        enemy.animate = (deltaTime) => {
            // Simple hovering animation - always float slightly above ground
            enemy.mesh.position.y = 0.3 + Math.sin(Date.now() * 0.002) * 0.1;
            
            // Slow rotation even when idle
            enemy.mesh.rotation.y += deltaTime * 0.3;
            
            // Attack animation
            if (enemy.isAttacking && enemy.mesh) {
                const attackProgress = 1 - (enemy.attackTimer / enemy.attackCooldown);
                if (attackProgress < 0.2) {
                    // First phase - scale up
                    const scale = 1 + attackProgress * 5 * 0.2;
                    enemy.mesh.scale.set(scale, scale, scale);
                } else if (attackProgress < 0.3) {
                    // Second phase - scale back down quickly
                    const scaleDown = 1 + (0.3 - attackProgress) * 10 * 0.2;
                    enemy.mesh.scale.set(scaleDown, scaleDown, scaleDown);
                } else {
                    // Reset scale
                    enemy.mesh.scale.set(1, 1, 1);
                }
            }
        };
        
        // Initialize the enemy
        enemy.init();
        
        return enemy;
    }
    
    // Define cube-specific spawn rules
    static spawnRules = {
        // Which floor numbers this enemy can appear on
        floors: [1, 2, 3, 4, 5],
        // Which room types this enemy can spawn in
        roomTypes: ['cardinal', 'radial'],
        // Spawn weight (higher = more common)
        weight: 2
    };
}
