// src/entities/enemies/variants/Sphere.js - Simple sphere enemy that uses melee attacks

import * as THREE from 'three';
import { EnemyBase } from '../enemyBase.js';
import { createMeleeAttack } from '../enemyAttacks.js';

// Sphere enemy class
export class Sphere {
    // Static method to create a new sphere enemy
    static create(x, y, z, params = {}) {
        // Configure base parameters
        const enemyParams = {
            id: 'sphere',
            name: 'Sphere Guardian',
            x: x,
            y: y,
            z: z,
            maxHealth: 60,
            baseDamage: 8,
            moveSpeed: 2.0,
            color: 0x4080ff, // Blue color
            attackType: 'melee',
            attackRange: 1.5,
            detectionRange: 10,
            retreatRange: 0.5, // Get a bit closer for melee
            ...params
        };
        
        // Create base enemy
        const enemy = new EnemyBase(enemyParams);
        
        // Override mesh creation with sphere-specific mesh
        enemy.createMesh = (params) => {
            // Create a sphere geometry instead of the default cube
            const geometry = new THREE.SphereGeometry(enemy.size * 0.5, 16, 16);
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
        
        // Custom animation for the sphere
        enemy.animate = (deltaTime) => {
            // Simple bobbing animation when moving
            if (enemy.isMoving && enemy.mesh) {
                enemy.mesh.position.y = Math.sin(Date.now() * 0.005) * 0.2;
                
                // Add a subtle rotation when moving
                enemy.mesh.rotation.x += deltaTime * 1.0;
                enemy.mesh.rotation.z += deltaTime * 0.5;
            }
            
            // Attack animation
            if (enemy.isAttacking && enemy.mesh) {
                const attackProgress = 1 - (enemy.attackTimer / enemy.attackCooldown);
                if (attackProgress < 0.5) {
                    // First half - lunge forward
                    enemy.mesh.position.z = attackProgress * 2 * 0.7;
                } else {
                    // Second half - move back
                    enemy.mesh.position.z = (1 - (attackProgress - 0.5) * 2) * 0.7;
                }
            }
        };
        
        // Initialize the enemy
        enemy.init();
        
        return enemy;
    }
    
    // Define sphere-specific spawn rules
    static spawnRules = {
        // Which floor numbers this enemy can appear on
        floors: [1, 2, 3],
        // Which room types this enemy can spawn in
        roomTypes: ['spawnRoom', 'radial'],
        // Spawn weight (higher = more common)
        weight: 2
    };
}
