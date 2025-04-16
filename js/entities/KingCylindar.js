import { Enemy } from './enemy.js';

export class KingCylindar extends Enemy {
    constructor(scene, position, collisionManager, player) {
        // Call parent constructor first
        super(scene, position, collisionManager, player);
        
        // Override key properties for King Cylindar
        this.health = 500;
        this.maxHealth = 500; 
        this.detectionRange = 15;
        this.chaseRange = 25;
        this.attackRange = 2.5;
        this.attackDamage = 30;
        
        // Ranged attack properties
        this.rangedAttackRange = 25;
        this.rangedAttackCooldownTime = 5;
        this.rangedAttackDamage = 15;
        this.shotgunProjectileCount = 8;
        this.shotgunSpreadAngle = Math.PI / 4;
        
        // Mana drop properties - same as other enemies
        this.manaDrop = {
            min: 20,
            max: 50,
            dropped: false  
        };
        
        // Movement speed adjustments
        this.moveSpeed = { 
            patrol: 0.3,
            chase: 1.0
        };
        
        // King-sized patrol radius  
        this.patrolRadius = 6;
        
        // Create the mesh
        this.createPsychedelicMesh();
        
        console.log("King Cylindar created at:", this.position);
        
        // Animation parameters  
        this.animationTime = 0;
        this.pulseLayers = [];
        this.colorCycle = 0;
        this.colorCycleRate = 0.2;
    }
    
    createPsychedelicMesh() {
        // Remove existing mesh if it exists
        if (this.group) {
            this.scene.remove(this.group);
        }
        
        // Create a group to hold all enemy parts
        this.group = new THREE.Group();
        
        // Create a giant body with layered cylinders for vapor effect
        const createVaporLayer = (radius, height, color, opacity, emissive = true) => {
            const geometry = new THREE.CylinderGeometry(
                radius, // top radius
                radius * 0.9, // slightly narrower bottom for vapor effect
                height, // height
                16, // radial segments
                4, // height segments
                true // open-ended for vapor effect
            );
            
            const material = new THREE.MeshStandardMaterial({
                color: color,
                transparent: true,
                opacity: opacity,
                roughness: 0.3,
                metalness: 0.7,
                side: THREE.DoubleSide
            });
            
            if (emissive) {
                material.emissive = new THREE.Color(color);
                material.emissiveIntensity = 0.6;
            }
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = false; // Vapor doesn't cast shadows
            mesh.receiveShadow = false;
            
            return mesh;
        };
        
        // Create base body - solid core
        const bodyGeometry = new THREE.CylinderGeometry(
            2.0, // top radius (4x larger)
            2.0, // bottom radius
            9.0, // height (larger)
            16, // more radial segments for better quality
            3, // height segments
            false // closed
        );
        
        // Central body with metallic material and subtle pattern
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xD4AF37, // Gold base
            emissive: 0xD4AF37,
            emissiveIntensity: 0.2,
            roughness: 0.4,
            metalness: 0.9
        });
        
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.bodyMesh.position.y = 9.0 / 2; // Center vertically based on height
        
        // Save body dimensions for collision detection
        this.bodyWidth = 4.0; // Diameter
        this.bodyHeight = 9.0;
        
        // Add body to group
        this.group.add(this.bodyMesh);
        
        // Create vapor/steam layers with different colors
        const vaporColors = [
            0xFF3366, // Hot pink
            0x66CCFF, // Cyan blue
            0xFFCC33, // Amber
            0xAA66FF  // Purple
        ];
        
        // Create multiple vapor layers
        for (let i = 0; i < 4; i++) {
            const radius = 2.5 + (i * 0.4);
            const height = 10.0 + (i * 0.5);
            const color = vaporColors[i % vaporColors.length];
            const opacity = 0.4 - (i * 0.05);
            
            const layer = createVaporLayer(radius, height, color, opacity);
            layer.position.y = height / 2;
            this.pulseLayers.push(layer);
            this.group.add(layer);
        }
        
        // Create heat distortion effect (inner ripple)
        const heatDistortionGeometry = new THREE.SphereGeometry(2.8, 20, 20);
        const heatDistortionMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.1,
            roughness: 0.1,
            metalness: 0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.2,
            side: THREE.DoubleSide
        });
        
        this.heatDistortion = new THREE.Mesh(heatDistortionGeometry, heatDistortionMaterial);
        this.heatDistortion.position.y = 5.0;
        this.group.add(this.heatDistortion);
        
        // Add giant glowing eyes - with iris detail for more presence
        this.createPsychedelicEyes();
        
        // Add swirling energy particles
        this.createEnergyParticles();
        
        // Add a point light to make it glow
        this.glowLight = new THREE.PointLight(0xFFCC33, 2.0, 15);
        this.glowLight.position.y = 4.5;
        this.group.add(this.glowLight);
        
        // Add secondary smaller lights for color variety
        const createColorLight = (color, height, intensity, distance) => {
            const light = new THREE.PointLight(color, intensity, distance);
            light.position.y = height;
            this.group.add(light);
            return light;
        };
        
        this.colorLights = [
            createColorLight(0xFF3366, 7.0, 1.0, 8), // Pink light near top
            createColorLight(0x66CCFF, 2.0, 1.0, 8)  // Blue light near bottom
        ];
        
        // Position the entire group
        this.group.position.copy(this.position);
        
        // Add to scene
        this.scene.add(this.group);
        
        // Update collision radius for the larger entity
        this.collisionRadius = 2.5; // 3x larger collision radius
    }
    
    createPsychedelicEyes() {
        // Create eye sockets - darker circular areas
        const eyeSocketGeometry = new THREE.CircleGeometry(0.6, 16);
        const eyeSocketMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide
        });
        
        // Create the eye with iris and pupil
        const createEye = (x, z) => {
            // Eye socket/base
            const socket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
            socket.position.set(x, 7.5, z); // High on cylinder
            socket.rotation.y = Math.PI / 2; // Rotate to face outward
            
            // Iris (colorful part)
            const irisGeometry = new THREE.CircleGeometry(0.5, 16);
            const irisMaterial = new THREE.MeshBasicMaterial({
                color: 0x66CCFF, // Bright blue base color
                side: THREE.DoubleSide
            });
            
            const iris = new THREE.Mesh(irisGeometry, irisMaterial);
            iris.position.set(0, 0, 0.01); // Slightly in front of socket
            socket.add(iris);
            
            // Pupil (center black part)
            const pupilGeometry = new THREE.CircleGeometry(0.2, 16);
            const pupilMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,
                side: THREE.DoubleSide
            });
            
            const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
            pupil.position.set(0, 0, 0.02); // Slightly in front of iris
            iris.add(pupil);
            
            // Eye glow
            const glowGeometry = new THREE.CircleGeometry(0.7, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x66FFFF,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.set(0, 0, -0.02); // Slightly behind the socket
            socket.add(glow);
            
            return {socket, iris, pupil, glow};
        };
        
        // Create left and right eyes
        this.leftEye = createEye(-1.8, -0.8);
        this.rightEye = createEye(1.8, -0.8);
        
        // Add eyes to group
        this.group.add(this.leftEye.socket);
        this.group.add(this.rightEye.socket);
    }
    
    createEnergyParticles() {
        // Create small particles that orbit the King Cylindar
        this.particles = new THREE.Group();
        
        const particleColors = [
            0xFF3366, // Pink
            0x66CCFF, // Blue
            0xFFCC33, // Amber
            0xAA66FF, // Purple
            0x33FF66  // Green
        ];
        
        for (let i = 0; i < 30; i++) {
            // Create small glowing sphere
            const size = 0.1 + Math.random() * 0.2;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const color = particleColors[Math.floor(Math.random() * particleColors.length)];
            
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Set random orbit parameters
            const radius = 3 + Math.random() * 2; // Orbit radius
            const angle = Math.random() * Math.PI * 2; // Starting angle
            const height = Math.random() * 10; // Height along cylinder
            const speed = 0.2 + Math.random() * 0.5; // Orbit speed
            const direction = Math.random() > 0.5 ? 1 : -1; // Direction
            
            // Store orbit parameters with the particle
            particle.userData = {
                radius,
                angle,
                height,
                speed: speed * direction,
                verticalSpeed: (Math.random() - 0.5) * 0.1, // Movement up/down
                sizePulse: Math.random() * 0.1 // Size variation
            };
            
            // Position particle
            particle.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            
            // Add to particles group
            this.particles.add(particle);
        }
        
        // Add particles group to main group
        this.group.add(this.particles);
    }
    
    // Override update method to add pulsing and psychedelic effects
    update(deltaTime, camera) {
        // Call the parent update method first
        super.update(deltaTime, camera);
        
        // Update animation time
        this.animationTime += deltaTime;
        
        // Update color cycle
        this.colorCycle += deltaTime * this.colorCycleRate;
        if (this.colorCycle > 1) this.colorCycle -= 1;
        
        // Update vapor layers pulsation
        this.updateVaporLayers();
        
        // Update eye colors
        this.updateEyeEffects();
        
        // Update particle movements
        this.updateParticles(deltaTime);
        
        // Update lights
        this.updateLights();
    }
    
    updateVaporLayers() {
        if (!this.pulseLayers || this.pulseLayers.length === 0) return;
        
        const time = this.animationTime;
        
        // Calculate a base pulse value from time
        const basePulse = (Math.sin(time * 1.5) * 0.5 + 0.5);
        
        // Update each vapor layer
        for (let i = 0; i < this.pulseLayers.length; i++) {
            const layer = this.pulseLayers[i];
            
            // Create offset pulse for each layer
            const layerPulse = Math.sin(time * (1.0 + i * 0.2) + i * 0.5) * 0.5 + 0.5;
            
            // Scale the layer based on pulse
            const scaleValue = 1 + layerPulse * 0.1;
            layer.scale.set(scaleValue, 1, scaleValue);
            
            // Rotate the layers at different speeds
            const rotationSpeed = 0.2 - (i * 0.05);
            layer.rotation.y += deltaTime * rotationSpeed * (i % 2 === 0 ? 1 : -1);
            
            // Update color based on color cycle with offset for each layer
            if (layer.material) {
                const hue = (this.colorCycle + (i * 0.25)) % 1;
                const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
                
                layer.material.color.set(color);
                if (layer.material.emissive) {
                    layer.material.emissive.set(color);
                }
                
                // Adjust opacity with pulse
                layer.material.opacity = 0.3 + (layerPulse * 0.1);
            }
        }
        
        // Update heat distortion effect
        if (this.heatDistortion) {
            const distortPulse = Math.sin(time * 2.5) * 0.5 + 0.5;
            this.heatDistortion.scale.set(
                1 + distortPulse * 0.1,
                1 + distortPulse * 0.1,
                1 + distortPulse * 0.1
            );
        }
    }
    
    updateEyeEffects() {
        const time = this.animationTime;
        
        const updateEyePart = (eye) => {
            if (!eye) return;
            
            // Make iris color cycle
            if (eye.iris && eye.iris.material) {
                // Smoother color cycle effect based on HSL
            const hue = (this.colorCycle + 0.5) % 1; // Offset from body color
                const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
                eye.iris.material.color.set(color);
            }
            
            // Make pupil pulse
            if (eye.pupil) {
                const pupilPulse = Math.sin(time * 3) * 0.5 + 0.5;
                const pupilScale = 0.8 + pupilPulse * 0.4; // Pupil dilates and contracts
                eye.pupil.scale.set(pupilScale, pupilScale, 1);
            }
            
            // Make glow pulse
            if (eye.glow && eye.glow.material) {
                const glowPulse = Math.sin(time * 2) * 0.5 + 0.5;
                eye.glow.material.opacity = 0.3 + glowPulse * 0.5;
                
                // Match glow color to iris with slight variation
                if (eye.iris && eye.iris.material) {
                    const irisColor = eye.iris.material.color.clone();
                    // Brighten for glow
                    irisColor.r = Math.min(1, irisColor.r * 1.5);
                    irisColor.g = Math.min(1, irisColor.g * 1.5);
                    irisColor.b = Math.min(1, irisColor.b * 1.5);
                    eye.glow.material.color.copy(irisColor);
                }
            }
        };
        
        // Update both eyes
        updateEyePart(this.leftEye);
        updateEyePart(this.rightEye);
    }
    
    updateParticles(deltaTime) {
        if (!this.particles) return;
        
        const time = this.animationTime;
        
        // Update each particle
        this.particles.children.forEach(particle => {
            if (!particle.userData) return;
            
            // Update angle based on speed
            particle.userData.angle += particle.userData.speed * deltaTime;
            
            // Update height with bounds
            particle.userData.height += particle.userData.verticalSpeed;
            if (particle.userData.height > 10) {
                particle.userData.height = 10;
                particle.userData.verticalSpeed *= -1;
            } else if (particle.userData.height < 0) {
                particle.userData.height = 0;
                particle.userData.verticalSpeed *= -1;
            }
            
            // Update position based on orbit
            particle.position.set(
                Math.cos(particle.userData.angle) * particle.userData.radius,
                particle.userData.height,
                Math.sin(particle.userData.angle) * particle.userData.radius
            );
            
            // Pulse size
            const sizePulse = 1 + Math.sin(time * 3 + particle.userData.angle) * particle.userData.sizePulse;
            particle.scale.set(sizePulse, sizePulse, sizePulse);
            
            // Update color based on height (creates vertical color gradient effect)
            if (particle.material) {
                // Get hue from height
                const hue = (this.colorCycle + (particle.userData.height / 10)) % 1;
                const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
                particle.material.color.set(color);
                
                // Pulse opacity
                const opacityPulse = Math.sin(time * 2 + particle.userData.angle) * 0.2 + 0.7;
                particle.material.opacity = opacityPulse;
            }
        });
    }
    
    updateLights() {
        const time = this.animationTime;
        
        // Update main glow light
        if (this.glowLight) {
            // Pulsate intensity
            const intensityPulse = Math.sin(time * 1.5) * 0.5 + 0.5;
            this.glowLight.intensity = 1.5 + intensityPulse * 1.0;
            
            // Update color based on color cycle
            const hue = this.colorCycle;
            const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
            this.glowLight.color.set(color);
        }
        
        // Update color lights
        if (this.colorLights && this.colorLights.length >= 2) {
            // Update first light (pink/red range)
            const hue1 = (this.colorCycle + 0.1) % 1;
            const color1 = new THREE.Color().setHSL(hue1, 0.9, 0.6);
            this.colorLights[0].color.set(color1);
            this.colorLights[0].intensity = 1.0 + Math.sin(time * 2) * 0.5;
            
            // Update second light (blue/cyan range)
            const hue2 = (this.colorCycle + 0.6) % 1;
            const color2 = new THREE.Color().setHSL(hue2, 0.9, 0.6);
            this.colorLights[1].color.set(color2);
            this.colorLights[1].intensity = 1.0 + Math.sin(time * 2 + 1) * 0.5;
        }
    }
    
    // Override the performRangedAttack method to implement psychedelic shotgun-style attack
    performRangedAttack() {
        if (!this.player || this.rangedAttackCooldown > 0) return;

        // Set cooldown
        this.rangedAttackCooldown = this.rangedAttackCooldownTime;
        
        // Get direction to player
        const playerPos = this.player.camera.position;
        const baseDirection = new THREE.Vector3()
            .subVectors(playerPos, this.group.position)
            .normalize();
        
        // Spawn position should be at the center of the cylinder, higher up
        const spawnPos = this.group.position.clone();
        spawnPos.y += this.bodyHeight * 0.7; // Higher spawn point
        
        // Create firing effect at the center point
        this.createEnhancedFiringEffect(spawnPos.clone());
        
        // Calculate direction with player prediction
        const playerVelocity = this.player.velocity || new THREE.Vector3(0, 0, 0);
        const predictionTime = 0.8; // Predict where player will be in 0.8 seconds
        const predictedPlayerPos = playerPos.clone().add(
            playerVelocity.clone().multiplyScalar(predictionTime)
        );
        
        // Calculate direction to the predicted position
        const predictedDirection = new THREE.Vector3()
            .subVectors(predictedPlayerPos, spawnPos)
            .normalize();
        
        // Fire multiple projectiles in a spread pattern
        for (let i = 0; i < this.shotgunProjectileCount; i++) {
            // Skip a frame to prevent too many calculations at once
            setTimeout(() => {
                // Create a spread angle based on which projectile this is
                const angleOffset = this.shotgunSpreadAngle * (i / (this.shotgunProjectileCount - 1) - 0.5);
                
                // Rotation around the Y axis (horizontal spread)
                const horizontalRot = new THREE.Quaternion().setFromAxisAngle(
                    new THREE.Vector3(0, 1, 0), 
                    angleOffset
                );
                
                // Apply the rotation to the base direction
                const spreadDirection = predictedDirection.clone().applyQuaternion(horizontalRot);
                
                // Add a small vertical spread too
                const verticalOffset = (Math.random() - 0.5) * 0.1;
                spreadDirection.y += verticalOffset;
                spreadDirection.normalize();
                
                // Get hue from color cycle with offset for each projectile
                const hue = (this.colorCycle + (i / this.shotgunProjectileCount)) % 1;
                const projectileColor = new THREE.Color().setHSL(hue, 0.9, 0.6);
                const projectileHex = projectileColor.getHex();
                
                // Create projectile with psychedelic color
                const projectileGeometry = new THREE.SphereGeometry(0.4, 8, 8);
                const projectileMaterial = new THREE.MeshBasicMaterial({
                    color: projectileHex,
                    transparent: true,
                    opacity: 0.8
                });
                
                const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
                projectileMesh.position.copy(spawnPos);
                
                // Add trail effect
                const trailGeometry = new THREE.CylinderGeometry(0.1, 0.3, 0.8, 8, 1, true);
                const trailMaterial = new THREE.MeshBasicMaterial({
                    color: projectileHex,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide
                });
                
                const trail = new THREE.Mesh(trailGeometry, trailMaterial);
                trail.rotation.x = Math.PI / 2; // Orient properly
                trail.position.z = -0.4; // Behind the projectile
                projectileMesh.add(trail);
                
                // Add glow effect
                const glowGeometry = new THREE.SphereGeometry(0.7, 8, 8);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: projectileHex,
                    transparent: true,
                    opacity: 0.4,
                    side: THREE.BackSide
                });
                
                const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                projectileMesh.add(glowMesh);
                
                // Add to scene
                this.scene.add(projectileMesh);
                
                // Calculate distance and speed
                const distanceToPlayer = spawnPos.distanceTo(playerPos);
                const projectileSpeed = Math.max(distanceToPlayer / 2.0, 5);
                
                // Create projectile data
                const projectile = {
                    mesh: projectileMesh,
                    position: spawnPos.clone(),
                    velocity: spreadDirection.multiplyScalar(projectileSpeed * 0.016),
                    lifetime: 5.0, // 5 seconds lifetime
                    color: projectileHex // Store color for trail effects
                };
                
                // Add to projectiles array
                this.projectiles.push(projectile);
                
                // Create small firing effect for some projectiles
                if (i === 0 || i === this.shotgunProjectileCount - 1) {
                    this.createProjectileFiringEffect(spawnPos.clone(), projectileHex);
                }
            }, i * 30); // Small delay between each projectile
        }
        
        // Eye flash effect for both eyes
        if (this.leftEye && this.leftEye.iris) {
            this.leftEye.iris.material.color.set(0xFFFFFF); // White flash
            this.leftEye.glow.material.color.set(0xFFFFFF);
            this.leftEye.glow.material.opacity = 1.0;
            
            // Reset after a short delay
            setTimeout(() => {
                if (this.leftEye && this.leftEye.iris) {
                    const hue = (this.colorCycle + 0.5) % 1;
                    const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
                    this.leftEye.iris.material.color.copy(color);
                    this.leftEye.glow.material.opacity = 0.5;
                }
            }, 400);
        }
        
        if (this.rightEye && this.rightEye.iris) {
            this.rightEye.iris.material.color.set(0xFFFFFF);
            this.rightEye.glow.material.color.set(0xFFFFFF);
            this.rightEye.glow.material.opacity = 1.0;
            
            // Reset after a short delay
            setTimeout(() => {
                if (this.rightEye && this.rightEye.iris) {
                    const hue = (this.colorCycle + 0.5) % 1;
                    const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
                    this.rightEye.iris.material.color.copy(color);
                    this.rightEye.glow.material.opacity = 0.5;
                }
            }, 400);
        }
    }
    
    // New enhanced firing effect for the psychedelic shotgun attack
    createEnhancedFiringEffect(position) {
        // Create a larger flash effect at the firing position
        const flashGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        
        // Use current color cycle for the flash
        const hue = this.colorCycle;
        const flashColor = new THREE.Color().setHSL(hue, 0.9, 0.7);
        
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: flashColor,
            transparent: true,
            opacity: 0.8
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Create a point light for the flash
        const flashLight = new THREE.PointLight(flashColor, 3, 10);
        flashLight.position.copy(position);
        this.scene.add(flashLight);
        
        // Add energy ring effect
        const ringGeometry = new THREE.RingGeometry(0.5, 2.0, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: flashColor,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        // Orient the ring facing outward
        ring.lookAt(this.player.camera.position);
        this.scene.add(ring);
        
        // Animate the flash
        const duration = 0.5; // 500ms
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade out
            const scale = 1 + progress * 4;
            flash.scale.set(scale, scale, scale);
            flash.material.opacity = 0.8 * (1 - progress);
            
            // Expand the ring
            ring.scale.set(scale, scale, 1);
            ring.material.opacity = 0.7 * (1 - progress);
            
            // Fade out light
            if (flashLight) {
                flashLight.intensity = 3 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove after animation completes
                this.scene.remove(flash);
                this.scene.remove(flashLight);
                this.scene.remove(ring);
                if (flash.material) flash.material.dispose();
                if (flash.geometry) flash.geometry.dispose();
                if (ring.material) ring.material.dispose();
                if (ring.geometry) ring.geometry.dispose();
   }
};

        animate();
}

// Override death method for a simpler death
die() {
    if (this.state === 'dead') return; // Already dead
    
    console.log("King Cylindar died!");
    this.state = 'dead';
    
    // Clean up projectiles
    this.cleanupProjectiles();
    
    // Drop mana orb if not already dropped
    if (!this.manaDrop.dropped) {
        this.dropManaOrb();
        this.manaDrop.dropped = true;
    }
    
    // Simple fade out animation
    const duration = 1.0; // 1 second
    const startTime = performance.now();
    
    const animate = () => {
        const now = performance.now();
        const elapsed = (now - startTime) / 1000; // to seconds
        const progress = Math.min(elapsed / duration, 1);
        
        // Fade out all materials
        this.group.traverse(child => {
            if (child.material) {
                child.material.opacity = 1 - progress;
                child.material.transparent = true;
            }
        });
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // After animation, remove from scene
            this.group.visible = false;
            
            // Disable collisions
            this.collisionEnabled = false;
        }
    };
    
    animate();
}

// Use the same mana orb as other enemies
dropManaOrb() {
    // Calculate mana amount
    const manaAmount = Math.floor(Math.random() * 
        (this.manaDrop.max - this.manaDrop.min + 1)) + this.manaDrop.min;
    
    // Create mana orb mesh
    const orbGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const orbMaterial = new THREE.MeshStandardMaterial({
        color: 0x3366ff,
        emissive: 0x3366ff,
        emissiveIntensity: 0.8,
        metalness: 0.7,
        roughness: 0.3,
        transparent: true,
        opacity: 0.9
    });
    
    const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
    
    // Position the orb at the enemy's death location, slightly elevated
    orbMesh.position.copy(this.group.position);
    orbMesh.position.y += 0.5;
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x3366ff,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide
    });
    
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    orbMesh.add(glowMesh);
    
    // Add point light to make it glow
    const orbLight = new THREE.PointLight(0x3366ff, 1.5, 3);
    orbLight.position.set(0, 0, 0);
    orbMesh.add(orbLight);
    
    // Add userData to identify this as a mana orb and store mana amount
    orbMesh.userData = {
        isManaOrb: true,
        manaAmount: manaAmount
    };
    
    // Add to scene
    this.scene.add(orbMesh);
    
    // Add a collider for the orb
    if (this.collisionManager) {
        const colliderIndex = this.collisionManager.addCollider(orbMesh);
        
        // Tag this collider as a mana orb
        if (this.collisionManager.colliders[colliderIndex]) {
            this.collisionManager.colliders[colliderIndex].isManaOrb = true;
            this.collisionManager.colliders[colliderIndex].manaAmount = manaAmount;
        }
    }
    
    // Animate the orb
    this.animateManaOrb(orbMesh);
    
    console.log(`Dropped mana orb containing ${manaAmount} mana`);
}

// Animate the mana orb
animateManaOrb(orbMesh) {
    // Make the orb bob up and down
    const startY = orbMesh.position.y;
    const floatHeight = 0.3;
    const floatSpeed = 1.5;
    
    // Make orb pulse
    const pulseSpeed = 2;
    
    // If we already have an animation system, use it
    if (!window.animatedOrbs) {
        window.animatedOrbs = [];
        
        const animateOrbs = () => {
            const orbs = window.animatedOrbs;
            if (orbs && orbs.length > 0) {
                const time = performance.now() * 0.001;
                
                for (const orb of orbs) {
                    if (!orb || !orb.userData) continue;
                    
                    // Bobbing motion
                    orb.position.y = orb.userData.startY + 
                        Math.sin(time * orb.userData.floatSpeed) * orb.userData.floatHeight;
                    
                    // Rotate slowly
                    orb.rotation.y += 0.01;
                    
                    // Pulse glow
                    if (orb.children && orb.children[0]) {
                        const glow = orb.children[0];
                        const pulseScale = 1 + Math.sin(time * orb.userData.pulseSpeed) * 0.2;
                        glow.scale.set(pulseScale, pulseScale, pulseScale);
                    }
                    
                    // Pulse light
                    if (orb.children && orb.children[1]) {
                        const light = orb.children[1];
                        light.intensity = 1.5 + Math.sin(time * orb.userData.pulseSpeed) * 0.5;
                    }
                }
            }
            
            requestAnimationFrame(animateOrbs);
        };
        
        animateOrbs();
    }
    
    // Store animation parameters with the orb
    orbMesh.userData.startY = startY;
    orbMesh.userData.floatHeight = floatHeight;
    orbMesh.userData.floatSpeed = floatSpeed;
    orbMesh.userData.pulseSpeed = pulseSpeed;
    
    // Add to animated orbs
    window.animatedOrbs.push(orbMesh);
}

    
