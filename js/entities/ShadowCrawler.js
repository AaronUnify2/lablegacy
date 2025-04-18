import { Enemy } from './robotEnemy.js';

export class ShadowCrawler extends Enemy {
    constructor(scene, position, collisionManager, player) {
        // Call parent constructor first
        super(scene, position, collisionManager, player);
        
        // Override key properties for Shadow Crawler
        this.health = 70;
        this.maxHealth = 70;
        this.detectionRange = 10;
        this.chaseRange = 15;
        this.attackRange = 2.0;
        this.attackDamage = 10;
        
        // Simplified movement speed - faster than standard enemies
        this.moveSpeed = {
            patrol: 1.0,
            chase: 2.2
        };
        
        // Completely disable ranged attacks
        this.useRangedAttack = false;
        
        // Create the enhanced mesh
        this.createMesh();
        
        console.log("Shadow Crawler created at position:", this.position);
    }
    
    // Enhanced mesh creation with beetle-like features and neon highlights
    createMesh() {
        // Remove existing mesh if it exists
        if (this.group) {
            this.scene.remove(this.group);
        }
        
        // Create a group to hold all crawler parts
        this.group = new THREE.Group();
        
        // Create a smaller body - 1/3 the size of standard enemy
        const bodyGeometry = new THREE.SphereGeometry(0.7, 16, 16);
        
        // Main body material - dark with slight glossiness
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: 0x000000,
            emissiveIntensity: 0.2,
            roughness: 0.7,
            metalness: 0.3
        });
        
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        
        // Add body to group
        this.group.add(this.bodyMesh);
        
        // Add glowing red eyes
        const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 2.0
        });
        
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.25, 0.2, 0.5);
        this.group.add(this.leftEye);
        
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.25, 0.2, 0.5);
        this.group.add(this.rightEye);
        
        // Add beetle-like legs (6 legs)
        this.legs = [];
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            emissive: 0x222222,
            emissiveIntensity: 0.3,
            roughness: 0.5,
            metalness: 0.4
        });
        
        // Helper function to create a leg segment
        const createLegSegment = (length, thickness) => {
            const segmentGeometry = new THREE.CylinderGeometry(thickness, thickness * 0.7, length, 8, 1);
            return new THREE.Mesh(segmentGeometry, legMaterial);
        };
        
        // Create 6 legs (3 on each side)
        for (let i = 0; i < 6; i++) {
            const side = i % 2 === 0 ? -1 : 1; // Alternate left and right
            const pair = Math.floor(i / 2); // 0=front, 1=middle, 2=back
            
            // Create leg group
            const legGroup = new THREE.Group();
            
            // Upper leg segment
            const upperLeg = createLegSegment(0.5, 0.08);
            upperLeg.rotation.z = side * Math.PI / 4; // 45 degrees outward
            upperLeg.position.y = -0.25; // Position at body midpoint
            legGroup.add(upperLeg);
            
            // Lower leg segment
            const lowerLeg = createLegSegment(0.6, 0.06);
            // Position at end of upper leg
            lowerLeg.position.set(
                side * 0.35, // x position based on upper leg angle
                -0.5, // y position below upper leg
                0
            );
            lowerLeg.rotation.z = side * Math.PI / 3; // More angled than upper leg
            legGroup.add(lowerLeg);
            
            // Foot/claw
            const foot = new THREE.Mesh(
                new THREE.ConeGeometry(0.04, 0.15, 8),
                new THREE.MeshBasicMaterial({ color: 0x33ff66 }) // Neon green tips
            );
            foot.position.set(
                side * (0.35 + 0.3), // Extended from lower leg
                -0.75, // Below lower leg
                0
            );
            foot.rotation.z = -side * Math.PI / 6; // Angle inward slightly
            legGroup.add(foot);
            
            // Position the entire leg group based on which pair it is
            legGroup.position.z = 0.3 - pair * 0.3; // Front to back spacing
            
            // Add to body and save reference
            this.group.add(legGroup);
            this.legs.push(legGroup);
        }
        
        // Add beetle wings (folded when idle, extended when attacking)
        const wingGeometry = new THREE.BufferGeometry();
        
        // Create wing shape (slightly curved triangular shape)
        const wingPoints = [
            0, 0, 0,          // Attachment point
            0, 0.1, -0.6,     // Wing tip
            0.35, 0, -0.3     // Outer edge
        ];
        
        // Add vertices to the wing geometry
        wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wingPoints, 3));
        wingGeometry.setIndex([0, 1, 2]); // Create a triangular face
        wingGeometry.computeVertexNormals();
        
        // Create translucent material with neon highlights
        const wingMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x000000,
            emissive: 0x003311,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            roughness: 0.3,
            metalness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.2
        });
        
        // Create left wing and position it
        this.leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        this.leftWing.position.set(-0.2, 0.2, -0.1);
        this.leftWing.rotation.set(0, 0, Math.PI / 12);
        this.group.add(this.leftWing);
        
        // Create right wing (mirror of left wing)
        this.rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        this.rightWing.scale.x = -1; // Mirror on X axis
        this.rightWing.position.set(0.2, 0.2, -0.1);
        this.rightWing.rotation.set(0, 0, -Math.PI / 12);
        this.group.add(this.rightWing);
        
        // Add neon highlights along body edges
        const addNeonHighlight = (x, y, z, length, rotation) => {
            const highlightGeometry = new THREE.CylinderGeometry(0.03, 0.03, length, 8, 1);
            const highlightMaterial = new THREE.MeshBasicMaterial({
                color: 0x33ff66, // Neon green
                transparent: true,
                opacity: 0.8
            });
            
            const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
            highlight.position.set(x, y, z);
            highlight.rotation.set(rotation.x, rotation.y, rotation.z);
            this.group.add(highlight);
            
            return highlight;
        };
        
        // Add highlights on top and sides
        this.highlights = [];
        this.highlights.push(addNeonHighlight(0, 0.5, 0, 0.8, { x: 0, y: 0, z: Math.PI / 2 }));
        this.highlights.push(addNeonHighlight(0, 0.3, 0.5, 0.5, { x: Math.PI / 2, y: 0, z: 0 }));
        this.highlights.push(addNeonHighlight(0, 0.3, -0.5, 0.5, { x: Math.PI / 2, y: 0, z: 0 }));
        
        // Create antenna with glowing tips
        for (let i = 0; i < 2; i++) {
            const side = i === 0 ? -1 : 1;
            
            // Antenna base
            const antennaGeometry = new THREE.CylinderGeometry(0.03, 0.02, 0.6, 8, 1);
            const antennaMaterial = new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.7
            });
            
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
            antenna.position.set(side * 0.2, 0.4, 0.5);
            antenna.rotation.set(Math.PI / 3, 0, side * Math.PI / 8);
            this.group.add(antenna);
            
            // Glowing antenna tip
            const tipGeometry = new THREE.SphereGeometry(0.06, 8, 8);
            const tipMaterial = new THREE.MeshBasicMaterial({
                color: 0xff3366, // Reddish-pink
                emissive: 0xff3366,
                emissiveIntensity: 1.5
            });
            
            const tip = new THREE.Mesh(tipGeometry, tipMaterial);
            tip.position.set(
                side * 0.3,
                0.7,
                0.7
            );
            this.group.add(tip);
            
            // Store reference to antenna tips for animation
            if (i === 0) this.leftAntennaTip = tip;
            else this.rightAntennaTip = tip;
        }
        
        // Add a subtle glow effect around the entire crawler
        const glowGeometry = new THREE.SphereGeometry(1.0, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x33ff66, // Neon green
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.group.add(this.glowMesh);
        
        // Position the entire group
        this.group.position.copy(this.position);
        
        // Add to scene
        this.scene.add(this.group);
        
        // Set collision radius to match visual size
        this.collisionRadius = 0.8;
    }
    
    // Override update method to add animations
    update(deltaTime, camera) {
        // Call the parent update method first
        super.update(deltaTime, camera);
        
        if (this.state === 'dead') return;
        
        // Get current time for animations
        const time = performance.now() * 0.001;
        
        // Animate legs when moving
        if (this.state === 'patrol' || this.state === 'chase' || this.state === 'return') {
            // Leg movement animation
            for (let i = 0; i < this.legs.length; i++) {
                const leg = this.legs[i];
                const offset = i * 0.3; // Phase offset between legs
                const speed = this.state === 'chase' ? 12 : 6; // Faster in chase mode
                
                // Up-down movement with alternating pattern
                leg.position.y = Math.sin(time * speed + offset) * 0.1;
                
                // Forward-backward movement
                leg.position.z += Math.sin(time * speed + offset) * 0.02;
            }
        }
        
        // Animate antenna based on state
        if (this.leftAntennaTip && this.rightAntennaTip) {
            // Different movement patterns based on state
            if (this.state === 'chase') {
                // Faster, more erratic movement when chasing
                this.leftAntennaTip.position.y = 0.7 + Math.sin(time * 10) * 0.05;
                this.rightAntennaTip.position.y = 0.7 + Math.sin(time * 10 + 0.5) * 0.05;
                
                // Brighter glow when chasing
                this.leftAntennaTip.material.emissiveIntensity = 2.0 + Math.sin(time * 5) * 0.5;
                this.rightAntennaTip.material.emissiveIntensity = 2.0 + Math.sin(time * 5 + 0.5) * 0.5;
            } else {
                // Slower, gentler movement when patrolling
                this.leftAntennaTip.position.y = 0.7 + Math.sin(time * 3) * 0.03;
                this.rightAntennaTip.position.y = 0.7 + Math.sin(time * 3 + 0.5) * 0.03;
                
                // Normal glow when patrolling
                this.leftAntennaTip.material.emissiveIntensity = 1.5;
                this.rightAntennaTip.material.emissiveIntensity = 1.5;
            }
        }
        
        // Animate wings based on state
        if (this.leftWing && this.rightWing) {
            if (this.state === 'attack' || this.isAttacking) {
                // Extend wings during attack
                this.leftWing.rotation.z = Math.PI / 6 + Math.sin(time * 20) * 0.2;
                this.rightWing.rotation.z = -Math.PI / 6 - Math.sin(time * 20) * 0.2;
            } else if (this.state === 'chase') {
                // Partially extended during chase
                this.leftWing.rotation.z = Math.PI / 8 + Math.sin(time * 5) * 0.05;
                this.rightWing.rotation.z = -Math.PI / 8 - Math.sin(time * 5) * 0.05;
            } else {
                // Folded during patrol/idle
                this.leftWing.rotation.z = Math.PI / 12;
                this.rightWing.rotation.z = -Math.PI / 12;
            }
        }
        
        // Animate glow effect
        if (this.glowMesh) {
            // Pulse glow based on state
            let pulseSpeed, intensity;
            
            switch (this.state) {
                case 'attack':
                    pulseSpeed = 10;
                    intensity = 0.3;
                    this.glowMesh.material.color.set(0xff3366); // Red during attack
                    break;
                case 'chase':
                    pulseSpeed = 5;
                    intensity = 0.25;
                    this.glowMesh.material.color.set(0xff6633); // Orange during chase
                    break;
                default:
                    pulseSpeed = 2;
                    intensity = 0.15;
                    this.glowMesh.material.color.set(0x33ff66); // Green during patrol/idle
                    break;
            }
            
            this.glowMesh.material.opacity = intensity * (0.7 + Math.sin(time * pulseSpeed) * 0.3);
        }
        
        // Animate body highlights
        if (this.highlights && this.highlights.length > 0) {
            for (let i = 0; i < this.highlights.length; i++) {
                const highlight = this.highlights[i];
                
                // Pulse the opacity based on state
                if (this.state === 'attack' || this.isAttacking) {
                    highlight.material.opacity = 0.9 + Math.sin(time * 15) * 0.1;
                    highlight.material.color.set(0xff3366); // Red during attack
                } else if (this.state === 'chase') {
                    highlight.material.opacity = 0.8 + Math.sin(time * 8) * 0.2;
                    highlight.material.color.set(0xff6633); // Orange during chase
                } else {
                    highlight.material.opacity = 0.7 + Math.sin(time * 3) * 0.3;
                    highlight.material.color.set(0x33ff66); // Green during patrol/idle
                }
            }
        }
        
        // Add slight hovering effect
        if (this.group) {
            this.group.position.y += Math.sin(time * 2) * 0.005;
        }
    }
    
    // Override the attack behavior for a more dramatic version
    performAttack() {
        if (this.isAttacking || !this.player) return;
        
        this.isAttacking = true;
        this.attackCooldown = this.attackCooldownTime;
        
        // Make eyes flash brightly during attack
        if (this.leftEye && this.leftEye.material) {
            this.leftEye.material.color.set(0xff3366); // Brighter red
            this.leftEye.material.emissiveIntensity = 4.0;
            
            // Scale up eyes slightly
            this.leftEye.scale.set(1.3, 1.3, 1.3);
        }
        
        if (this.rightEye && this.rightEye.material) {
            this.rightEye.material.color.set(0xff3366);
            this.rightEye.material.emissiveIntensity = 4.0;
            
            // Scale up eyes slightly
            this.rightEye.scale.set(1.3, 1.3, 1.3);
        }
        
        // Extend wings dramatically
        if (this.leftWing && this.rightWing) {
            // Quick wing extension animation
            const startTime = performance.now();
            const extendDuration = 150; // ms
            
            const extendWings = () => {
                const now = performance.now();
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / extendDuration, 1);
                
                // Extend wings outward
                this.leftWing.rotation.z = Math.PI / 12 + progress * Math.PI / 4;
                this.rightWing.rotation.z = -Math.PI / 12 - progress * Math.PI / 4;
                
                if (progress < 1) {
                    requestAnimationFrame(extendWings);
                }
            };
            
            extendWings();
        }
        
        // Create attack effect
        this.createCrawlerAttackEffect();
        
        // Deal damage to player after a short delay
        setTimeout(() => {
            // Check if still in range before applying damage
            if (this.player && this.player.camera) {
                const currentDistanceToPlayer = this.group.position.distanceTo(this.player.camera.position);
                if (currentDistanceToPlayer <= this.attackRange) {
                    console.log(`Shadow Crawler hit player for ${this.attackDamage} damage!`);
                    // Call the player's damage function
                    if (this.player.damage) {
                        this.player.damage(this.attackDamage);
                    }
                }
            }
            
            // Reset attack state
            this.isAttacking = false;
            
            // Reset eye color and scale
            if (this.leftEye && this.leftEye.material) {
                this.leftEye.material.color.set(0xff0000);
                this.leftEye.material.emissiveIntensity = 2.0;
                this.leftEye.scale.set(1, 1, 1);
            }
            
            if (this.rightEye && this.rightEye.material) {
                this.rightEye.material.color.set(0xff0000);
                this.rightEye.material.emissiveIntensity = 2.0;
                this.rightEye.scale.set(1, 1, 1);
            }
            
            // Return to chase state after attack
            this.changeState(this.states.CHASE);
        }, this.attackDuration * 1000);
    }
    
    // Create a custom attack effect for the crawler
    createCrawlerAttackEffect() {
        if (!this.scene || !this.player || !this.player.camera) return;
        
        // Get direction to player
        const directionToPlayer = new THREE.Vector3()
            .subVectors(this.player.camera.position, this.group.position)
            .normalize();
        
        // Position for effect (slightly in front of the crawler)
        const effectPosition = this.group.position.clone()
            .add(directionToPlayer.clone().multiplyScalar(1.0));
        effectPosition.y += 0.5; // Raise slightly
        
        // Create slashing effect
        const slashGeometry = new THREE.PlaneGeometry(2.0, 0.4);
        const slashMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3366,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const slash = new THREE.Mesh(slashGeometry, slashMaterial);
        slash.position.copy(effectPosition);
        slash.lookAt(this.player.camera.position);
        
        // Add to scene
        this.scene.add(slash);
        
        // Add a point light for flash effect
        const flashLight = new THREE.PointLight(0xff3366, 5, 3);
        flashLight.position.copy(effectPosition);
        this.scene.add(flashLight);
        
        // Animate the slash effect
        const duration = 300; // ms
        const startTime = performance.now();
        
        const animateSlash = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Move slash along attack path
            const newPosition = new THREE.Vector3().lerpVectors(
                effectPosition,
                this.player.camera.position.clone().add(new THREE.Vector3(0, -0.5, 0)),
                progress * 0.7 // Don't go all the way to player
            );
            slash.position.copy(newPosition);
            
            // Make it face the player
            slash.lookAt(this.player.camera.position);
            
            // Rotate for slashing effect
            slash.rotation.z += progress * Math.PI;
            
            // Scale effect
            const scale = 1 - progress * 0.5;
            slash.scale.set(scale * 2, scale, scale);
            
            // Fade out
            slash.material.opacity = 0.7 * (1 - progress);
            
            // Update light
            if (flashLight) {
                flashLight.position.copy(newPosition);
                flashLight.intensity = 5 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animateSlash);
            } else {
                // Clean up
                this.scene.remove(slash);
                this.scene.remove(flashLight);
                if (slash.material) slash.material.dispose();
                if (slash.geometry) slash.geometry.dispose();
            }
        };
        
        animateSlash();
        
        // Play attack sound
        try {
            const attackSound = new Audio('sounds/crawler_attack.mp3');
            attackSound.volume = 0.4;
            attackSound.playbackRate = 1.2;
            attackSound.play().catch(err => console.log('Could not play attack sound', err));
        } catch (e) {
            console.log('Error playing attack sound', e);
        }
    }
    
    // Enhance the death effect
    die() {
        if (this.state === 'dead') return;
        
        console.log("Shadow Crawler died!");
        this.state = 'dead';
        
        // Drop mana orb if not already dropped
        if (!this.manaDrop.dropped) {
            this.dropManaOrb();
            this.manaDrop.dropped = true;
        }
        
        // Create enhanced death effect
        this.createEnhancedDeathEffect();
        
        // Disable collisions
        this.collisionEnabled = false;
        
        // Hide the original mesh after a delay
        setTimeout(() => {
            if (this.group) {
                this.group.visible = false;
            }
        }, 1000);
    }
    
    // Create an enhanced death effect with particles
    createEnhancedDeathEffect() {
        if (!this.scene || !this.group) return;
        
        // Get position
        const position = this.group.position.clone();
        
        // Create particles
        const particleCount = 20;
        const particles = [];
        
        // Particle colors
        const colors = [0x33ff66, 0xff3366, 0x3366ff];
        
        for (let i = 0; i < particleCount; i++) {
            // Random size
            const size = Math.random() * 0.15 + 0.05;
            
            // Random geometry type
            let geometry;
            const geomType = Math.floor(Math.random() * 3);
            
            switch (geomType) {
                case 0:
                    geometry = new THREE.SphereGeometry(size, 8, 8);
                    break;
                case 1:
                    geometry = new THREE.TetrahedronGeometry(size, 0);
                    break;
                case 2:
                default:
                    geometry = new THREE.BoxGeometry(size, size, size);
                    break;
            }
            
            // Random color from palette
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Position at crawler location with slight randomization
            particle.position.set(
                position.x + (Math.random() - 0.5) * 0.5,
                position.y + Math.random() * 0.5,
                position.z + (Math.random() - 0.5) * 0.5
            );
            
            // Random velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.01 + Math.random() * 0.03;
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                0.03 + Math.random() * 0.03, // Upward bias
                Math.sin(angle) * speed
            );
            
            // Random rotation
            particle.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            // Random rotation velocity
            particle.rotationVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Add a flash effect
        const flashGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x33ff66, // Green flash
            transparent: true,
            opacity: 0.7
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Add a point light
        const light = new THREE.PointLight(0x33ff66, 3, 8);
        light.position.copy(position);
        this.scene.add(light);
        
        // Animate particles and effects
        const duration = 1.5; // seconds
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Update particles
            for (const particle of particles) {
                // Move particle
                particle.position.add(particle.velocity);
                
                // Apply gravity
                particle.velocity.y -= 0.001;
                
                // Rotate particle
                particle.rotation.x += particle.rotationVelocity.x;
                particle.rotation.y += particle.rotationVelocity.y;
                particle.rotation.z += particle.rotationVelocity.z;
                
                // Fade out
                if (particle.material) {
                    particle.material.opacity = 0.8 * (1 - progress);
                }
            }
            
            // Update flash
            if (flash) {
                // Expand
                flash.scale.set(1 + progress * 2, 1 + progress * 2, 1 + progress * 2);
                // Fade out
                flash.material.opacity = 0.7 * (1 - progress);
            }
            
            // Update light
            if (light) {
                light.intensity = 3 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                for (const particle of particles) {
                    this.scene.remove(particle);
                    if (particle.material) particle.material.dispose();
                    if (particle.geometry) particle.geometry.dispose();
                }
                
                this.scene.remove(flash);
                this.scene.remove(light);
                if (flash.material) flash.material.dispose();
                if (flash.geometry) flash.geometry.dispose();
            }
        };
        
        animate();
        
        // Play death sound
        try {
            const deathSound = new Audio('sounds/crawler_death.mp3');
            deathSound.volume = 0.5;
            deathSound.play().catch(err => console.log('Could not play death sound', err));
        } catch (e) {
            console.log('Error playing death sound', e);
        }
    }
    
    // Custom mana orb with neon styling
    dropManaOrb() {
        // Calculate mana amount
        const manaAmount = Math.floor(Math.random() * 
            (this.manaDrop.max - this.manaDrop.min + 1)) + this.manaDrop.min;
        
        // Create mana orb mesh - smaller than standard orbs but more vibrant
        const orbGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const orbMaterial = new THREE.MeshStandardMaterial({
            color: 0x33ff66, // Neon green to match crawler theme
            emissive: 0x33ff66,
            emissiveIntensity: 1.2,
            metalness: 0.3,
            roughness: 0.2,
            transparent: true,
            opacity: 0.9
        });
        
        const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
        
        // Position the orb at the enemy's death location
        orbMesh.position.copy(this.group.position);
        orbMesh.position.y = 0.7; // Float higher than standard orbs
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x33ff66,
            transparent: true,
            opacity: 0.4,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        orbMesh.add(glowMesh);
        
        // Add light - brighter for shadow crawler orbs
        const orbLight = new THREE.PointLight(0x33ff66, 2.5, 4);
        orbLight.position.set(0, 0, 0);
        orbMesh.add(orbLight);
        
        // Add distinctive neon ring to identify shadow crawler orbs
        const ringGeometry = new THREE.TorusGeometry(0.5, 0.05, 16, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x33ff66,
            transparent: true,
            opacity: 0.7
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2; // Make horizontal
        orbMesh.add(ring);
        
        // Add userData for orb identification
        orbMesh.userData = {
            isManaOrb: true,
            manaAmount: manaAmount,
            isShadowOrb: true // Special flag for shadow crawler orbs
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
                this.collisionManager.colliders[colliderIndex].isShadowOrb = true;
            }
        }
        
        // Custom animation for shadow orbs
        this.animateShadowManaOrb(orbMesh);
        
        console.log(`Dropped shadow mana orb containing ${manaAmount} mana`);
    }
    
    // Custom animation for shadow crawler orbs
    animateShadowManaOrb(orbMesh) {
        // Make the orb bob up and down with more dramatic movement
        const startY = orbMesh.position.y;
        const floatHeight = 0.4; // More vertical movement
        const floatSpeed = 2.0; // Faster movement
        
        // Make orb pulse
        const pulseSpeed = 3.0;
        
        // If we already have an animation system for shadow orbs, use it
        if (!window.animatedShadowOrbs) {
            window.animatedShadowOrbs = [];
            
            const animateShadowOrbs = () => {
                const orbs = window.animatedShadowOrbs;
                if (orbs && orbs.length > 0) {
                    const time = performance.now() * 0.001;
                    
                    for (const orb of orbs) {
                        if (!orb || !orb.userData) continue;
                        
                        // Bobbing motion with figure-8 pattern
                        orb.position.y = orb.userData.startY + 
                            Math.sin(time * orb.userData.floatSpeed) * orb.userData.floatHeight;
                        
                        // Add horizontal drift
                        orb.position.x += Math.sin(time * 0.5) * 0.003;
                        orb.position.z += Math.cos(time * 0.3) * 0.003;
                        
                        // Rotate the orb and its ring
                        orb.rotation.y += 0.02;
                        if (orb.children && orb.children[2]) {
                            // Rotate ring in opposite direction
                            orb.children[2].rotation.z += 0.03;
                            
                            // Pulse ring scale
                            const ringPulse = 1 + Math.sin(time * orb.userData.pulseSpeed * 1.5) * 0.1;
                            orb.children[2].scale.set(ringPulse, ringPulse, ringPulse);
                        }
                        
                        // Pulse glow
                        if (orb.children && orb.children[0]) {
                            const glow = orb.children[0];
                            const pulseScale = 1 + Math.sin(time * orb.userData.pulseSpeed) * 0.3;
                            glow.scale.set(pulseScale, pulseScale, pulseScale);
                        }
                        
                        // Pulse light
                        if (orb.children && orb.children[1]) {
                            const light = orb.children[1];
                            light.intensity = 2.5 + Math.sin(time * orb.userData.pulseSpeed * 0.7) * 1.0;
                        }
                    }
                }
                
                requestAnimationFrame(animateShadowOrbs);
            };
            
            animateShadowOrbs();
        }
        
        // Store animation parameters with the orb
        orbMesh.userData.startY = startY;
        orbMesh.userData.floatHeight = floatHeight;
        orbMesh.userData.floatSpeed = floatSpeed;
        orbMesh.userData.pulseSpeed = pulseSpeed;
        
        // Add to animated shadow orbs
        window.animatedShadowOrbs.push(orbMesh);
    }
}
