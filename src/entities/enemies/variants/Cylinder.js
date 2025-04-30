// src/entities/enemies/variants/Cylinder.js - Large mini-boss cylinder enemy that uses slam attacks

import * as THREE from 'three';
import { EnemyBase } from '../enemyBase.js';
import { createSlamAttack } from '../enemyAttacks.js';

// Cylinder enemy class
export class Cylinder {
    // Static method to create a new cylinder enemy
    static create(x, y, z, params = {}) {
        // Configure base parameters
        const enemyParams = {
            id: 'cylinder',
            name: 'Cylinder Crusher',
            x: x,
            y: y,
            z: z,
            maxHealth: 150, // Much more health than other enemies
            baseDamage: 20,  // Higher damage
            moveSpeed: 2.0,  // Slower movement
            size: 3.0,       // HUGE size (increased from 1.5)
            color: 0x9040ff, // Purple color
            attackType: 'slam',
            attackRange: 6,  // Wider attack range to match larger size
            attackCooldown: 4.0, // Longer cooldown
            detectionRange: 15, // Increased detection range
            retreatRange: 0.5,
            ...params
        };
        
        // Create base enemy
        const enemy = new EnemyBase(enemyParams);
        
        // Override mesh creation with cylinder-specific mesh
        enemy.createMesh = (params) => {
            // Create a cylinder geometry
            const geometry = new THREE.CylinderGeometry(
                enemy.size * 0.4, // top radius
                enemy.size * 0.4, // bottom radius
                enemy.size * 1.2, // height
                16 // radial segments
            );
            const material = new THREE.MeshLambertMaterial({ color: enemy.color });
            enemy.mesh = new THREE.Mesh(geometry, material);
            enemy.mesh.castShadow = true;
            enemy.mesh.receiveShadow = true;
            
            // Create container object for positioning
            enemy.object = new THREE.Object3D();
            enemy.object.position.copy(enemy.position);
            enemy.object.add(enemy.mesh);
            
            // Add a point light to make the enemy glow
            const light = new THREE.PointLight(enemy.color, 0.9, 6);
            light.position.set(0, enemy.size * 0.5, 0); // Position at top of cylinder
            enemy.mesh.add(light);
            
            // Add a ring at the bottom
            const ringGeometry = new THREE.TorusGeometry(enemy.size * 0.45, 0.1, 8, 24);
            const ringMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xffcc00,
                emissive: 0xffcc00,
                emissiveIntensity: 0.5
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2; // Lay flat
            ring.position.y = -enemy.size * 0.55; // Position at bottom
            enemy.mesh.add(ring);
        };
        
        // Custom animation for the cylinder
        enemy.animate = (deltaTime) => {
            // Slow rotation when idle or moving
            if (!enemy.isAttacking) {
                enemy.mesh.rotation.y += deltaTime * 0.5;
            }
            
            // When moving, add a slight tilt in the direction of movement
            if (enemy.isMoving && !enemy.isAttacking) {
                const tiltDirection = new THREE.Vector2(enemy.velocity.x, enemy.velocity.z).normalize();
                const targetTiltX = tiltDirection.y * 0.2; // Tilt forward/backward
                const targetTiltZ = -tiltDirection.x * 0.2; // Tilt left/right
                
                // Smoothly interpolate current tilt to target tilt
                enemy.mesh.rotation.x = enemy.mesh.rotation.x * 0.9 + targetTiltX * 0.1;
                enemy.mesh.rotation.z = enemy.mesh.rotation.z * 0.9 + targetTiltZ * 0.1;
            } else if (!enemy.isAttacking) {
                // Return to upright position
                enemy.mesh.rotation.x *= 0.95;
                enemy.mesh.rotation.z *= 0.95;
            }
            
            // Custom slam attack animation handled in the base enemy class
        };
        
        // Override the standard slam animation with a custom one
        const originalPerformSlamAttack = enemy.performSlamAttack;
        enemy.performSlamAttack = (player) => {
            // Original slam functionality
            originalPerformSlamAttack.call(enemy, player);
            
            // Add additional visual effects for the cylinder
            const originalY = enemy.position.y;
            const jumpHeight = 5; // Higher jump for the cylinder
            
            // Make bottom ring glow stronger during slam
            const ring = enemy.mesh.children.find(child => child.geometry && child.geometry.type === 'TorusGeometry');
            if (ring) {
                ring.material.emissiveIntensity = 1.0;
                
                // Reset emissive intensity after slam
                setTimeout(() => {
                    ring.material.emissiveIntensity = 0.5;
                }, 1000);
            }
        };
        
        // Initialize the enemy
        enemy.init();
        
        return enemy;
    }
    
    // Define cylinder-specific spawn rules
    static spawnRules = {
        // Which floor numbers this enemy can appear on
        floors: [1, 2, 3, 4, 5, 6, 7, 8], // Now appears from floor 1
        // Which room types this enemy can spawn in
        roomTypes: ['cardinal'], // Only spawn in cardinal rooms as mini-bosses
        // Spawn weight (lower = less common)
        weight: 5
    };
}
