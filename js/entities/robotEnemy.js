export class Enemy {
    constructor(scene, position, collisionManager, player) {
        this.scene = scene;
        this.position = position.clone();
        this.state = 'patrol'; // Change default state to 'patrol' instead of 'idle'
        this.collisionManager = collisionManager;
        this.player = player;
        
        // AI States
        this.states = {
            PATROL: 'patrol',
            CHASE: 'chase',
            RETURN: 'return',
            IDLE: 'idle',
            ATTACK: 'attack' // Add attack state
        };
        
        // AI Configuration
        this.detectionRange = 8; // Distance at which enemy detects player
        this.chaseRange = 12; // Distance at which enemy gives up chase
        this.moveSpeed = {
            patrol: 0.5, // Slower patrol speed
            chase: 1.5 // Faster chase speed
        };
        this.turnSpeed = {
            patrol: 0.05, // Slower turning during patrol
            chase: 0.15 // Faster turning during chase
        };
        
        // Add patrol properties
        this.patrolRadius = 3; // Radius of patrol circle in world units
        this.patrolSpeed = this.moveSpeed.patrol; // Use patrol speed from AI config
        this.patrolAngle = 0; // Current angle in the patrol circle
        this.patrolCenter = position.clone(); // Center of patrol circle
        this.patrolActive = true; // Flag to enable/disable patrol
        
        // NEW: Mana drop properties
        this.manaDrop = {
            min: 20,
            max: 50,
            dropped: false
        };
        
        // Track last known player position for chase behavior
        this.lastKnownPlayerPos = new THREE.Vector3();
        
        // Track time in current state for state transitions
        this.stateTime = 0;
        this.stateCooldown = 0;
        
        // Collision properties
        this.collisionRadius = 0.8; // Increased from 0.5 to 0.8 for stronger collision
        this.collisionEnabled = true; // Flag to enable/disable collision
        this.lastValidPosition = position.clone(); // Store last valid position
        
        // Attack properties
        this.attackRange = 1.5; // Distance at which enemy can attack player
        this.attackCooldown = 0; // Current cooldown timer
        this.attackCooldownTime = 2; // Time between attacks in seconds
        this.attackDamage = 15; // Damage per attack
        this.attackDuration = 0.5; // Duration of attack animation in seconds
        this.isAttacking = false; // Flag to track if currently attacking
        
        // Ranged attack properties
        this.rangedAttackRange = 15; // Distance at which enemy can use ranged attack
        this.rangedAttackCooldown = 0; // Current cooldown timer
        this.rangedAttackCooldownTime = 3; // Time between ranged attacks in seconds
        this.rangedAttackDamage = 10; // Damage per ranged attack
        this.rangedAttackSpeed = 5; // Speed of projectile
        this.useRangedAttack = true; // Flag to enable/disable ranged attacks
        this.projectiles = []; // Array to store active projectiles
        
        // Health and damage properties
        this.health = 100; // Max health for enemies
        this.maxHealth = 100; // Store max health
        this.isDamaged = false; // Flag for visual damage effect
        this.damageFlashTime = 0; // Timer for the damage flash effect
        this.isInvulnerable = false; // Invulnerability flag after taking damage
        this.invulnerabilityTime = 0; // Timer for invulnerability period
        
        // Initialize animation properties
        this.animationTime = 0;
        this.hoverHeight = 0;
        this.hoverDirection = 1;
        
        // Create a robotic mesh for the enemy
        this.createRoboticMesh();
        
        // Add to scene
        this.scene.add(this.group);
        
        console.log("Robotic Enemy created at position:", this.position);
    }
    
    createRoboticMesh() {
        // Create a group to hold all enemy parts
        this.group = new THREE.Group();
        
        // Create segments array to store body parts
        this.segments = [];
        this.arms = [];
        this.statusLights = [];
        
        // Create main body segments - cylindrical with metallic appearance
        const createBodySegment = (y, height, radius, isCore = false) => {
            const geometry = new THREE.CylinderGeometry(
                radius, // top radius
                radius, // bottom radius
                height, // height
                12,     // radial segments - higher for smoother look
                1,      // height segments
                false   // open-ended
            );
            
            // Choose material based on whether this is a core segment
            let material;
            
            if (isCore) {
                // Energy core with glowing material
                material = new THREE.MeshStandardMaterial({
                    color: 0x3366ff,
                    emissive: 0x3366ff,
                    emissiveIntensity: 0.8,
                    metalness: 0.4,
                    roughness: 0.2,
                    transparent: true,
                    opacity: 0.9
                });
            } else {
                // Brass/copper metallic segments
                material = new THREE.MeshStandardMaterial({
                    color: 0xac8e68, // Brass/copper color
                    metalness: 0.8,
                    roughness: 0.3,
                });
            }
            
            const segment = new THREE.Mesh(geometry, material);
            segment.position.y = y;
            segment.castShadow = true;
            segment.receiveShadow = true;
            
            this.group.add(segment);
            this.segments.push(segment);
            
            return segment;
        };
        
        // Create body segments
        const baseRadius = 0.5;
        const segmentHeight = 0.3;
        
        // Bottom segment (hover base)
        const hoverBase = createBodySegment(segmentHeight * 0.5, segmentHeight, baseRadius * 0.8);
        hoverBase.userData = { isHoverBase: true };
        
        // Lower body segment
        createBodySegment(segmentHeight * 1.5, segmentHeight, baseRadius);
        
        // Middle core segment (energy core)
        const coreSegment = createBodySegment(segmentHeight * 2.5, segmentHeight, baseRadius * 1.05, true);
        this.coreSegment = coreSegment;
        
        // Upper body segment
        createBodySegment(segmentHeight * 3.5, segmentHeight, baseRadius);
        
        // Head segment (slightly smaller)
        const headSegment = createBodySegment(segmentHeight * 4.5, segmentHeight, baseRadius * 0.9);
        this.headSegment = headSegment;
        
        // Create hover effect light
        const hoverLight = new THREE.PointLight(0x3366ff, 1.5, 2);
        hoverLight.position.y = 0.1;
        this.group.add(hoverLight);
        this.hoverLight = hoverLight;
        
        // Add hover glow effect
        const hoverGlowGeometry = new THREE.CylinderGeometry(baseRadius * 0.8, baseRadius * 1.2, 0.05, 16);
        const hoverGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        const hoverGlow = new THREE.Mesh(hoverGlowGeometry, hoverGlowMaterial);
        hoverGlow.position.y = 0.025;
        this.group.add(hoverGlow);
        this.hoverGlow = hoverGlow;
        
        // Add scanning lights to head
        const createScanLight = (angle) => {
            // Create the light cone geometry
            const coneHeight = 0.2;
            const coneGeometry = new THREE.ConeGeometry(0.08, coneHeight, 8, 1, true);
            coneGeometry.translate(0, -coneHeight/2, 0); // Move tip to origin
            coneGeometry.rotateX(Math.PI / 2); // Point forward
            
            const coneMaterial = new THREE.MeshBasicMaterial({
                color: 0xff3333,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            
            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            
            // Position on head
            cone.position.set(
                Math.cos(angle) * baseRadius * 0.7,
                segmentHeight * 4.5, // Same height as head
                Math.sin(angle) * baseRadius * 0.7
            );
            
            // Rotate to point outward
            cone.rotation.y = angle + Math.PI; // Face outward
            
            this.group.add(cone);
            
            // Add light source
            const scanLight = new THREE.PointLight(0xff0000, 1, 0.5);
            scanLight.position.copy(cone.position);
            this.group.add(scanLight);
            
            return { cone, light: scanLight, angle };
        };
        
        // Create scanning lights at different positions
        this.scanLights = [
            createScanLight(0),               // Front
            createScanLight(Math.PI * 2/3),   // Right
            createScanLight(Math.PI * 4/3)    // Left
        ];
        
        // Create mechanical arms (retracted initially)
        const createArm = (side, yOffset) => {
            const armGroup = new THREE.Group();
            
            // Shoulder joint
            const shoulderGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const shoulderMaterial = new THREE.MeshStandardMaterial({
                color: 0x665544, // Darker brass color for joints
                metalness: 0.9,
                roughness: 0.3
            });
            
            const shoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
            armGroup.add(shoulder);
            
            // Upper arm
            const upperArmGeometry = new THREE.CylinderGeometry(0.05, 0.04, 0.3, 8);
            upperArmGeometry.translate(0, -0.15, 0); // Offset
            upperArmGeometry.rotateX(Math.PI / 2); // Make horizontal
            
            const upperArm = new THREE.Mesh(upperArmGeometry, shoulderMaterial);
            upperArm.position.z = 0.1; // Extend forward
            shoulder.add(upperArm);
            
            // Elbow joint
            const elbowGeometry = new THREE.SphereGeometry(0.06, 8, 8);
            const elbow = new THREE.Mesh(elbowGeometry, shoulderMaterial);
            elbow.position.z = 0.3; // End of upper arm
            upperArm.add(elbow);
            
            // Forearm
            const forearmGeometry = new THREE.CylinderGeometry(0.04, 0.03, 0.25, 8);
            forearmGeometry.translate(0, -0.125, 0); // Offset
            forearmGeometry.rotateX(Math.PI / 2); // Make horizontal
            
            const forearm = new THREE.Mesh(forearmGeometry, shoulderMaterial);
            forearm.position.z = 0.06; // Extend forward
            elbow.add(forearm);
            
            // Weapon/hand attachment
            const weaponGeometry = new THREE.ConeGeometry(0.06, 0.15, 8);
            weaponGeometry.rotateX(-Math.PI / 2); // Point forward
            
            const weaponMaterial = new THREE.MeshStandardMaterial({
                color: 0x444455,
                metalness: 0.9,
                roughness: 0.1
            });
            
            const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
            weapon.position.z = 0.2; // End of forearm
            forearm.add(weapon);
            
            // Add weapon glow
            const weaponGlowGeometry = new THREE.SphereGeometry(0.03, 8, 8);
            const weaponGlowMaterial = new THREE.MeshBasicMaterial({
                color: 0xff3333,
                transparent: true,
                opacity: 0.8
            });
            
            const weaponGlow = new THREE.Mesh(weaponGlowGeometry, weaponGlowMaterial);
            weaponGlow.position.z = 0.08; // Tip of weapon
            weapon.add(weaponGlow);
            
            // Position the entire arm
            armGroup.position.set(
                side * 0.5, // Left or right side
                segmentHeight * 3 + yOffset, // Positioned on upper body
                0
            );
            
            // Store initial rotation for animations
            armGroup.userData = {
                defaultRotation: armGroup.rotation.clone(),
                extended: false,
                shoulder,
                upperArm,
                elbow,
                forearm,
                weapon,
                weaponGlow
            };
            
            // Add to group
            this.group.add(armGroup);
            this.arms.push(armGroup);
            
            return armGroup;
        };
        
        // Create two arms at slightly different heights
        createArm(-1, 0); // Left arm
        createArm(1, 0.1); // Right arm, slightly higher
        
        // Add status indicator lights
        const createStatusLight = (angle, yOffset) => {
            const lightGeometry = new THREE.SphereGeometry(0.04, 8, 8);
            const lightMaterial = new THREE.MeshBasicMaterial({
                color: 0x33ff66, // Green for patrol
                transparent: true,
                opacity: 0.9
            });
            
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            
            // Position around the body
            light.position.set(
                Math.cos(angle) * (baseRadius + 0.05),
                segmentHeight * 3 + yOffset,
                Math.sin(angle) * (baseRadius + 0.05)
            );
            
            this.group.add(light);
            this.statusLights.push(light);
            
            return light;
        };
        
        // Create status lights at different positions
        for (let i = 0; i < 4; i++) {
            createStatusLight(i * Math.PI / 2, i * 0.05); // Offset each light
        }
        
        // Add ventilation ports (geometry details)
        const createVentPort = (angle, yOffset) => {
            const ventGeometry = new THREE.BoxGeometry(0.1, 0.04, 0.02);
            const ventMaterial = new THREE.MeshStandardMaterial({
                color: 0x111111,
                metalness: 0.9,
                roughness: 0.8
            });
            
            const vent = new THREE.Mesh(ventGeometry, ventMaterial);
            
            // Create vent slats
            for (let i = 0; i < 3; i++) {
                const slatGeometry = new THREE.BoxGeometry(0.08, 0.005, 0.01);
                const slat = new THREE.Mesh(slatGeometry, ventMaterial);
                slat.position.y = -0.015 + i * 0.015;
                vent.add(slat);
            }
            
            // Position around the body
            const radius = baseRadius + 0.01; // Slightly outside cylinder
            vent.position.set(
                Math.cos(angle) * radius,
                segmentHeight * 2 + yOffset,
                Math.sin(angle) * radius
            );
            
            // Rotate to face outward
            vent.rotation.y = angle;
            
            this.group.add(vent);
            return vent;
        };
        
        // Create vent ports at different angles
        this.vents = [];
        for (let i = 0; i < 6; i++) {
            this.vents.push(createVentPort(i * Math.PI / 3, i * 0.05 - 0.15));
        }
        
        // Add exposed "cable" details
        const createCable = (start, end, thickness, color) => {
            // Create a curve between points for the cable
            const points = [];
            const segments = 8;
            
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                
                // Add slight curve
                const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
                mid.y += 0.05; // Bulge upward slightly
                
                // Interpolate between start, mid, and end points
                let point;
                if (t < 0.5) {
                    // First half: start to mid
                    point = new THREE.Vector3().lerpVectors(
                        start, mid, t * 2 // Scale t to [0,1] for this half
                    );
                } else {
                    // Second half: mid to end
                    point = new THREE.Vector3().lerpVectors(
                        mid, end, (t - 0.5) * 2 // Scale t to [0,1] for this half
                    );
                }
                
                points.push(point);
            }
            
            // Create curve
            const curve = new THREE.CatmullRomCurve3(points);
            
            // Create tube geometry
            const tubeGeometry = new THREE.TubeGeometry(
                curve,
                8,         // tubular segments
                thickness,  // radius
                8,         // radial segments
                false      // closed
            );
            
            const tubeMaterial = new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.3,
                roughness: 0.8
            });
            
            const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
            this.group.add(tube);
            
            return tube;
        };
        
        // Create cables between segments
        this.cables = [];
        
        // Colors for different cables
        const cableColors = [0x3366ff, 0xff3366, 0x33ff66];
        
        // Add cables between segments
        for (let i = 0; i < 3; i++) {
            const angle = i * Math.PI * 2 / 3;
            const yStart = segmentHeight * 1.8;
            const yEnd = segmentHeight * 3.2;
            
            const start = new THREE.Vector3(
                Math.cos(angle) * (baseRadius - 0.05),
                yStart,
                Math.sin(angle) * (baseRadius - 0.05)
            );
            
            const end = new THREE.Vector3(
                Math.cos(angle + 0.2) * (baseRadius - 0.05),
                yEnd,
                Math.sin(angle + 0.2) * (baseRadius - 0.05)
            );
            
            this.cables.push(createCable(start, end, 0.02, cableColors[i]));
        }
        
        // Add "eyes" or optical sensors
        const createOpticalSensor = (x, z) => {
            const sensorGeometry = new THREE.SphereGeometry(0.08, 12, 12);
            const sensorMaterial = new THREE.MeshBasicMaterial({
                color: 0xff3333,
                transparent: true,
                opacity: 0.9
            });
            
            const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
            sensor.position.set(x, segmentHeight * 4.5, z);
            
            // Add outer ring
            const ringGeometry = new THREE.TorusGeometry(0.08, 0.01, 8, 16);
            const ringMaterial = new THREE.MeshStandardMaterial({
                color: 0x444455,
                metalness: 0.9,
                roughness: 0.1
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            sensor.add(ring);
            
            this.group.add(sensor);
            return sensor;
        };
        
        // Create two optical sensors (eyes)
        this.sensors = [
            createOpticalSensor(-0.15, 0.45), // Left eye
            createOpticalSensor(0.15, 0.45)   // Right eye
        ];
        
        // Save body dimensions for collision detection
        this.bodyWidth = baseRadius * 2; // Diameter
        this.bodyHeight = segmentHeight * 5; // Total height
        
        // Position the entire group
        this.group.position.copy(this.position);
    }
    
    update(deltaTime, camera) {
        // Skip updates if enemy is inactive or deltaTime is invalid
        if (this.state === 'dead' || !deltaTime || deltaTime > 1) {
            return;
        }
        
        // Track animation time for movement effects
        this.animationTime += deltaTime;
        
        // Store current position as potentially valid position before movement
        this.lastValidPosition.copy(this.group.position);
        
        // Update state time counter
        this.stateTime += deltaTime;
        if (this.stateCooldown > 0) {
            this.stateCooldown -= deltaTime;
        }
        
        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Decrease ranged attack cooldown
        if (this.rangedAttackCooldown > 0) {
            this.rangedAttackCooldown -= deltaTime;
        }
        
        // Update damage flash effect
        if (this.isDamaged) {
            this.damageFlashTime -= deltaTime;
            
            // Flash the enemy red
            this.segments.forEach(segment => {
                if (segment && segment.material) {
                    segment.material.emissive = new THREE.Color(0xff0000);
                    segment.material.emissiveIntensity = Math.max(0, this.damageFlashTime * 5);
                }
            });
            
            if (this.damageFlashTime <= 0) {
                this.isDamaged = false;
                // Reset emissive properties
                this.segments.forEach(segment => {
                    if (segment && segment.material) {
                        if (segment === this.coreSegment) {
                            segment.material.emissive = new THREE.Color(0x3366ff);
                            segment.material.emissiveIntensity = 0.8;
                        } else {
                            segment.material.emissive = new THREE.Color(0x000000);
                            segment.material.emissiveIntensity = 0;
                        }
                    }
                });
            }
        }
        
        // Update invulnerability timer
        if (this.isInvulnerable) {
            this.invulnerabilityTime -= deltaTime;
            
            // Make the enemy flash by toggling visibility
            if (this.group) {
                this.group.visible = Math.floor(this.invulnerabilityTime * 10) % 2 === 0;
            }
            
            if (this.invulnerabilityTime <= 0) {
                this.isInvulnerable = false;
                // Ensure visibility is restored
                if (this.group) {
                    this.group.visible = true;
                }
            }
        }
        
        // Skip the rest of the update if enemy is dead
        if (this.state === 'dead') {
            return;
        }
        
        // Check player proximity to determine state transitions
        this.checkPlayerProximity();
        
        // Execute behavior based on current state
        switch(this.state) {
            case this.states.PATROL:
                this.executePatrolBehavior(deltaTime);
                break;
                
            case this.states.CHASE:
                this.executeChaseBehavior(deltaTime);
                break;
                
            case this.states.RETURN:
                this.executeReturnBehavior(deltaTime);
                break;
                
            case this.states.IDLE:
                this.executeIdleBehavior(deltaTime);
                break;
                
            case this.states.ATTACK:
                this.executeAttackBehavior(deltaTime);
                break;
        }
        
        // Update robotic animations based on state
        this.updateRoboticAnimations(deltaTime);
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
    }
    
    // New method for robotic-specific animations
    updateRoboticAnimations(deltaTime) {
        // Get current time
        const time = this.animationTime;
        
        // Hover effect
        this.updateHoverEffect(deltaTime, time);
        
        // Segment rotation animation
        this.updateSegmentRotations(time);
        
        // Update status lights based on state
        this.updateStatusLights();
        
        // Update scan lights
        this.updateScanLights(time);
        
        // Update arms based on state
        this.updateArms(deltaTime, time);
        
        // Update core pulsing
        this.updateCorePulsing(time);
        
        // Update eye sensors
        this.updateEyeSensors(time);
    }
    
    updateHoverEffect(deltaTime, time) {
        // Smooth hover animation
        const hoverSpeed = 0.5;
        const maxHoverHeight = 0.1;
        
        // Bobbing movement
        const targetHoverHeight = Math.sin(time * hoverSpeed) * maxHoverHeight;
        
        // Smoothly transition to target height
        this.hoverHeight += (targetHoverHeight - this.hoverHeight) * deltaTime * 2;
        
        // Apply to entire group
        if (this.group) {
            this.group.position.y = this.position.y + this.hoverHeight;
        }
        
        // Update hover light intensity and opacity
        if (this.hoverLight && this.hoverGlow) {
            const intensityMultiplier = 0.8 + Math.sin(time * hoverSpeed * 2) * 0.2;
            this.hoverLight.intensity = 1.5 * intensityMultiplier;
            this.hoverGlow.material.opacity = 0.5 * intensityMultiplier;
        }
    }
    
    updateSegmentRotations(time) {
        // Rotate segments at different speeds
        if (this.segments && this.segments.length > 0) {
            // Different speeds based on state
            let baseSpeed = 0.2; // Default rotation speed
            if (this.state === this.states.CHASE) {
                baseSpeed = 0.5; // Faster when chasing
            } else if (this.state === this.states.ATTACK) {
                baseSpeed = 0.8; // Even faster when attacking
            }
            
            // Rotate each segment
            for (let i = 0; i < this.segments.length; i++) {
                const segment = this.segments[i];
                
                // Skip the hover base (always stays oriented)
                if (segment.userData && segment.userData.isHoverBase) continue;
                
                // Alternate rotation directions and speeds
                const direction = i % 2 === 0 ? 1 : -1;
                const speed = baseSpeed * (1 + i * 0.1); // Increase speed for upper segments
                
                segment.rotation.y += 0.016 * speed * direction;
            }
        }
    }
    
    updateStatusLights() {
        // Change status light colors based on state
        if (this.statusLights && this.statusLights.length > 0) {
            let color;
            
            switch (this.state) {
                case this.states.PATROL:
                case this.states.IDLE:
                    color = new THREE.Color(0x33ff66); // Green for normal state
                    break;
                case this.states.CHASE:
                    color = new THREE.Color(0xffff33); // Yellow for alert
                    break;
                case this.states.ATTACK:
                    color = new THREE.Color(0xff3333); // Red for attack
                    break;
                case this.states.RETURN:
                    color = new THREE.Color(0x3366ff); // Blue for returning
                    break;
                default:
                    color = new THREE.Color(0x33ff66); // Default green
            }
            
            // Update all status lights
            for (const light of this.statusLights) {
                if (light && light.material) {
                    light.material.color = color;
                    
                    // Pulse effect
                    const pulseSpeed = this.state === this.states.ATTACK ? 8 : 
                                      this.state === this.states.CHASE ? 4 : 2;
                    
                    light.material.opacity = 0.7 + Math.sin(this.animationTime * pulseSpeed) * 0.3;
                }
            }
        }
    }
    
    updateScanLights(time) {
        // Animate scan lights - sweeping motion
        if (this.scanLights && this.scanLights.length > 0) {
            // Different scan patterns based on state
            let scanSpeed, scanAmplitude;
            
            switch (this.state) {
                case this.states.PATROL:
                    scanSpeed = 1;
                    scanAmplitude = Math.PI / 4; // 45-degree sweep
                    break;
                case this.states.CHASE:
                    scanSpeed = 3;
                    scanAmplitude = Math.PI / 6; // Narrower, faster sweep
                    break;
                case this.states.ATTACK:
                    scanSpeed = 6;
                    scanAmplitude = Math.PI / 8; // Very narrow, rapid sweep
                    break;
                default:
                    scanSpeed = 0.5;
                    scanAmplitude = Math.PI / 3; // Wide, slow sweep
            }
            
            // Update each scan light
            for (let i = 0; i < this.scanLights.length; i++) {
                const scanLight = this.scanLights[i];
                if (!scanLight || !scanLight.cone) continue;
                
                // Base angle plus sweeping motion
                const sweep = Math.sin(time * scanSpeed + i * Math.PI / 2) * scanAmplitude;
                const newAngle = scanLight.angle + Math.PI + sweep;
                
                // Update cone direction
                scanLight.cone.rotation.y = newAngle;
                
                // Update light intensity
                if (scanLight.light) {
                    // Pulse the light intensity based on state
                    const baseIntensity = this.state === this.states.ATTACK ? 1.5 : 
                                         this.state === this.states.CHASE ? 1.2 : 1.0;
                    
                    scanLight.light.intensity = baseIntensity * (0.8 + Math.sin(time * scanSpeed * 2) * 0.2);
                    
                    // Update light color based on state
                    if (this.state === this.states.ATTACK) {
                        scanLight.light.color = new THREE.Color(0xff3333); // Bright red
                        scanLight.cone.material.color = new THREE.Color(0xff3333);
                    } else if (this.state === this.states.CHASE) {
                        scanLight.light.color = new THREE.Color(0xff6633); // Orange-red
                        scanLight.cone.material.color = new THREE.Color(0xff6633);
                    } else {
                        scanLight.light.color = new THREE.Color(0xff9966); // Softer orange-red
                        scanLight.cone.material.color = new THREE.Color(0xff9966);
                    }
                    
                    // Update cone opacity
                    scanLight.cone.material.opacity = 0.5 + Math.sin(time * scanSpeed * 2) * 0.2;
                }
            }
        }
    }
    
    updateArms(deltaTime, time) {
        // Update mechanical arms based on state
        if (this.arms && this.arms.length > 0) {
            // Determine if arms should be extended
            let shouldExtend = false;
            
            if (this.state === this.states.ATTACK) {
                // Always extend during attack
                shouldExtend = true;
            } else if (this.state === this.states.CHASE) {
                // Extend if close to player
                if (this.player && this.player.camera) {
                    const distanceToPlayer = this.group.position.distanceTo(this.player.camera.position);
                    shouldExtend = distanceToPlayer < this.attackRange * 2; // Start extending as we approach attack range
                }
            }
            
            // Update each arm
            for (let i = 0; i < this.arms.length; i++) {
                const arm = this.arms[i];
                if (!arm || !arm.userData) continue;
                
                // Determine if this specific arm should be extended
                // Alternate arms when not attacking
                const armShouldExtend = shouldExtend || 
                    (this.state === this.states.CHASE && i === Math.floor(time) % this.arms.length);
                
                // Handle arm extension/retraction
                if (armShouldExtend && !arm.userData.extended) {
                    // Extend arm
                    this.extendArm(arm, i, deltaTime);
                } else if (!armShouldExtend && arm.userData.extended) {
                    // Retract arm
                    this.retractArm(arm, i, deltaTime);
                } else if (arm.userData.extended) {
                    // Animate extended arm
                    this.animateExtendedArm(arm, i, time);
                }
                
                // Update weapon glow
                if (arm.userData.weaponGlow) {
                    const glowIntensity = armShouldExtend ? 1.0 : 0.5;
                    const glowColor = this.state === this.states.ATTACK ? 0xff3333 : 0xff6633;
                    
                    arm.userData.weaponGlow.material.color.setHex(glowColor);
                    arm.userData.weaponGlow.material.opacity = glowIntensity * (0.7 + Math.sin(time * 5) * 0.3);
                }
            }
        }
    }
    
    extendArm(arm, index, deltaTime) {
        // Set extended flag
        arm.userData.extended = true;
        
        // Rotate shoulder joint outward
        if (arm.userData.shoulder) {
            // Determine side (left = -1, right = 1)
            const side = index % 2 === 0 ? -1 : 1;
            
            // Set target rotation
            const targetRotation = new THREE.Euler(
                0,                      // No X rotation
                side * Math.PI / 2.5,   // Rotate outward based on side
                0                       // No Z rotation
            );
            
            // Smoothly rotate
            this.smoothRotate(arm, targetRotation, deltaTime * 5);
        }
        
        // Extend elbow joint if we have one
        if (arm.userData.elbow) {
            arm.userData.elbow.rotation.z = -Math.PI / 6; // Slightly bent
        }
    }
    
    retractArm(arm, index, deltaTime) {
        // Reset extended flag
        arm.userData.extended = false;
        
        // Rotate back to default position
        if (arm.userData.defaultRotation) {
            this.smoothRotate(arm, arm.userData.defaultRotation, deltaTime * 3);
        }
        
        // Reset elbow joint if we have one
        if (arm.userData.elbow) {
            arm.userData.elbow.rotation.z = 0; // Straight
        }
    }
    
    animateExtendedArm(arm, index, time) {
        // Animate an already extended arm
        if (!arm.userData.extended) return;
        
        // Determine side (left = -1, right = 1)
        const side = index % 2 === 0 ? -1 : 1;
        
        // If in attack state, make more dramatic movements
        if (this.state === this.states.ATTACK) {
            // Pulsing movement for attack readiness
            const pulseAmount = Math.sin(time * 10) * 0.1;
            
            // Pulse the arm position slightly
            arm.position.y += pulseAmount * 0.02;
            
            // Make weapon glow pulse more dramatically
            if (arm.userData.weaponGlow) {
                arm.userData.weaponGlow.material.opacity = 0.7 + Math.sin(time * 15) * 0.3;
                
                // Scale weapon glow slightly
                const pulseScale = 1 + Math.sin(time * 10) * 0.2;
                arm.userData.weaponGlow.scale.set(pulseScale, pulseScale, pulseScale);
            }
        } else {
            // Gentle swaying motion when not attacking
            const swayAmount = Math.sin(time * 2 + index) * 0.05;
            
            // Apply sway to arm rotation
            arm.rotation.y = side * Math.PI / 2.5 + swayAmount;
        }
    }
    
    // Helper method for smooth rotation
    smoothRotate(object, targetRotation, factor) {
        if (!object) return;
        
        // Create quaternions for current and target rotations
        const currentQ = new THREE.Quaternion().setFromEuler(object.rotation);
        const targetQ = new THREE.Quaternion().setFromEuler(targetRotation);
        
        // Interpolate between the quaternions
        THREE.Quaternion.slerp(currentQ, targetQ, currentQ, factor);
        
        // Apply the interpolated quaternion
        object.quaternion.copy(currentQ);
    }
    
    updateCorePulsing(time) {
        // Make the core segment pulse with energy
        if (this.coreSegment && this.coreSegment.material) {
            // Determine pulse pattern based on state
            let pulseSpeed, pulseIntensity;
            
            switch (this.state) {
                case this.states.PATROL:
                case this.states.IDLE:
                    pulseSpeed = 1.5;
                    pulseIntensity = 0.3;
                    break;
                case this.states.CHASE:
                    pulseSpeed = 3;
                    pulseIntensity = 0.5;
                    break;
                case this.states.ATTACK:
                    pulseSpeed = 6;
                    pulseIntensity = 0.7;
                    break;
                default:
                    pulseSpeed = 1;
                    pulseIntensity = 0.2;
            }
            
            // Calculate pulse value
            const pulseValue = 0.8 + Math.sin(time * pulseSpeed) * pulseIntensity;
            
            // Apply to core emissive intensity
            this.coreSegment.material.emissiveIntensity = pulseValue;
            
            // Slightly scale the core during pulsing
            const scalePulse = 1 + Math.sin(time * pulseSpeed) * 0.05;
            this.coreSegment.scale.set(scalePulse, 1, scalePulse);
        }
    }
    
    updateEyeSensors(time) {
        // Update the optical sensors (eyes)
        if (this.sensors && this.sensors.length > 0) {
            // Determine eye color and intensity based on state
            let eyeColor, pulseSpeed, pulseIntensity;
            
            switch (this.state) {
                case this.states.PATROL:
                case this.states.IDLE:
                    eyeColor = 0xff9966; // Softer orange-red
                    pulseSpeed = 1;
                    pulseIntensity = 0.2;
                    break;
                case this.states.CHASE:
                    eyeColor = 0xff6633; // Orange-red
                    pulseSpeed = 3;
                    pulseIntensity = 0.3;
                    break;
                case this.states.ATTACK:
                    eyeColor = 0xff3333; // Bright red
                    pulseSpeed = 8;
                    pulseIntensity = 0.5;
                    break;
                default:
                    eyeColor = 0xff9966; // Default color
                    pulseSpeed = 1;
                    pulseIntensity = 0.2;
            }
            
            // Update each sensor
            for (let i = 0; i < this.sensors.length; i++) {
                const sensor = this.sensors[i];
                if (sensor && sensor.material) {
                    // Set base color
                    sensor.material.color.setHex(eyeColor);
                    
                    // Apply pulsing effect
                    const pulseValue = 0.7 + Math.sin(time * pulseSpeed + i) * pulseIntensity;
                    sensor.material.opacity = pulseValue;
                    
                    // Slightly scale the sensors during pulsing
                    const scalePulse = 1 + Math.sin(time * pulseSpeed + i) * 0.1;
                    sensor.scale.set(scalePulse, scalePulse, scalePulse);
                }
            }
        }
    }
    
    updateProjectiles(deltaTime) {
        const projectilesToRemove = [];
        for (let i = 0; i < this.projectiles.length; i++) {
            const projectile = this.projectiles[i];
            
            // Update projectile position
            projectile.position.add(projectile.velocity);
            projectile.mesh.position.copy(projectile.position);
            
            // Check for collisions with player
            if (this.player && this.player.camera) {
                const playerPos = this.player.camera.position;
                const distance = projectile.position.distanceTo(playerPos);
                
                // If projectile hits player (using a simple radius check)
                if (distance < 1.0) {
                    // Call player damage function
                    if (this.player.damage) {
                        this.player.damage(this.rangedAttackDamage);
                        console.log(`Projectile hit player for ${this.rangedAttackDamage} damage!`);
                    }
                    
                    // Remove projectile
                    this.scene.remove(projectile.mesh);
                    projectilesToRemove.push(i);
                    
                    // Create hit effect
                    this.createProjectileHitEffect(projectile.position);
                    continue;
                }
            }
            
            // Check for environment collisions
            if (this.collisionManager) {
                const collision = this.collisionManager.checkCollision(projectile.position, 0.3);
                if (collision.collides && (!collision.collider || !collision.collider.isEnemy)) {
                    // Hit environment, remove projectile
                    this.scene.remove(projectile.mesh);
                    projectilesToRemove.push(i);
                    
                    // Create hit effect
                    this.createProjectileHitEffect(projectile.position);
                    continue;
                }
            }
            
            // Check for lifetime
            projectile.lifetime -= deltaTime;
            if (projectile.lifetime <= 0) {
                this.scene.remove(projectile.mesh);
                projectilesToRemove.push(i);
                continue;
            }
            
            // Update visual effect (pulsing)
            const pulse = Math.sin(performance.now() * 0.01) * 0.2 + 0.8;
            projectile.mesh.scale.set(pulse, pulse, pulse);
        }
        
        // Remove projectiles marked for deletion (in reverse order to avoid index problems)
        for (let i = projectilesToRemove.length - 1; i >= 0; i--) {
            this.projectiles.splice(projectilesToRemove[i], 1);
        }
    }
    
    // Create projectile hit effect
    createProjectileHitEffect(position) {
        // Create a flash effect
        const flashGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.8
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Create a light for the flash
        const light = new THREE.PointLight(0xff3333, 2, 3);
        light.position.copy(position);
        this.scene.add(light);
        
        // Animate the flash
        const duration = 0.3; // 300ms
        const startTime = performance.now();
        
        const animateFlash = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale up and fade out
            const scale = 1 + progress * 3;
            flash.scale.set(scale, scale, scale);
            flash.material.opacity = 0.8 * (1 - progress);
            
            // Fade out light
            light.intensity = 2 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animateFlash);
            } else {
                // Clean up
                this.scene.remove(flash);
                this.scene.remove(light);
                if (flash.geometry) flash.geometry.dispose();
                if (flash.material) flash.material.dispose();
            }
        };
        
        animateFlash();
    }
    
    // Create firing effect for projectile
    createProjectileFiringEffect(position) {
        // Create a flash effect
        const flashGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.8
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Create a light for the flash
        const light = new THREE.PointLight(0xff3333, 2, 2);
        light.position.copy(position);
        this.scene.add(light);
        
        // Animate the flash
        const duration = 0.2; // 200ms
        const startTime = performance.now();
        
        const animateFlash = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale up and fade out
            const scale = 1 + progress * 2;
            flash.scale.set(scale, scale, scale);
            flash.material.opacity = 0.8 * (1 - progress);
            
            // Fade out light
            light.intensity = 2 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animateFlash);
            } else {
                // Clean up
                this.scene.remove(flash);
                this.scene.remove(light);
                if (flash.geometry) flash.geometry.dispose();
                if (flash.material) flash.material.dispose();
            }
        };
        
        animateFlash();
    }
    
    // State transition handler - checks proximity to player and changes state
    checkPlayerProximity() {
        if (!this.player || !this.player.camera) return;
        
        // Get player position
        const playerPos = this.player.camera.position;
        
        // Calculate distance to player
        const distanceToPlayer = this.group.position.distanceTo(playerPos);
        
        // Store the player position for use in chase behavior
        this.lastKnownPlayerPos.copy(playerPos);
        
        // Check for attack range if in chase state
        if (distanceToPlayer < this.attackRange && this.attackCooldown <= 0) {
            // Only attack if we're in the chase state
            if (this.state === this.states.CHASE) {
                this.changeState(this.states.ATTACK);
                this.performAttack();
            }
        }
        
        // Check if player is in ranged attack range but outside melee range
        if (this.useRangedAttack && 
            distanceToPlayer < this.rangedAttackRange && 
            distanceToPlayer > this.attackRange + 3 && // Keep some distance from melee range
            this.rangedAttackCooldown <= 0) {
            
            // Only use ranged attack in chase state
            if (this.state === this.states.CHASE) {
                this.performRangedAttack();
            }
        }
        
        // State transitions
        switch(this.state) {
            case this.states.PATROL:
            case this.states.IDLE:
            case this.states.RETURN:
                // If player is within detection range, transition to chase
                if (distanceToPlayer < this.detectionRange) {
                    this.changeState(this.states.CHASE);
                    this.playDetectionEffect();
                }
                break;
                
            case this.states.CHASE:
                // If player is beyond chase range, return to patrol
                if (distanceToPlayer > this.chaseRange) {
                    this.changeState(this.states.RETURN);
                }
                break;
        }
        
        // Visual feedback - sensors glow based on state
        this.updateEyeAppearance(distanceToPlayer);
    }
    
    // Update eye appearance based on distance to player
    updateEyeAppearance(distanceToPlayer) {
        if (!this.sensors || this.sensors.length === 0) return;
        
        // Make eyes glow more intensely as player gets closer
        const intensity = Math.max(0.7, 1 - (distanceToPlayer / this.detectionRange));
        
        // Apply to all sensors
        for (const sensor of this.sensors) {
            if (sensor && sensor.material) {
                sensor.material.emissiveIntensity = intensity;
            }
        }
    }
    
    // Play detection effect when first spotting player
    playDetectionEffect() {
        // Flash eyes bright red
        if (this.sensors && this.sensors.length > 0) {
            for (const sensor of this.sensors) {
                if (sensor && sensor.material) {
                    // Store original color and opacity
                    const originalColor = sensor.material.color.clone();
                    const originalOpacity = sensor.material.opacity;
                    
                    // Flash bright red
                    sensor.material.color.set(0xff0000);
                    sensor.material.opacity = 1;
                    
                    // Return to original after a delay
                    setTimeout(() => {
                        if (sensor && sensor.material) {
                            sensor.material.color.copy(originalColor);
                            sensor.material.opacity = originalOpacity;
                        }
                    }, 300);
                }
            }
        }
        
        // Flash status lights
        if (this.statusLights && this.statusLights.length > 0) {
            for (const light of this.statusLights) {
                if (light && light.material) {
                    // Flash yellow
                    light.material.color.set(0xffff00);
                    light.material.opacity = 1;
                    
                    // Return to state-based color after a delay
                    setTimeout(() => {
                        this.updateStatusLights();
                    }, 300);
                }
            }
        }
        
        // Increase segment rotation speed temporarily
        this.segmentSpeedMultiplier = 3;
        setTimeout(() => {
            this.segmentSpeedMultiplier = 1;
        }, 1000);
    }
    
    // State change helper
    changeState(newState) {
        // Skip if already in this state
        if (this.state === newState) return;
        
        // Log state change for debugging
        console.log(`Enemy state change: ${this.state} -> ${newState}`);
        
        // Store previous state
        this.previousState = this.state;
        
        // Set new state
        this.state = newState;
        
        // Reset state timer
        this.stateTime = 0;
        
        // Handle state entry actions
        switch(newState) {
            case this.states.CHASE:
                // Start with arms retracted, they'll extend based on distance
                for (const arm of this.arms) {
                    if (arm && arm.userData) {
                        arm.userData.extended = false;
                    }
                }
                break;
                
            case this.states.ATTACK:
                // Extend both arms when entering attack state
                for (const arm of this.arms) {
                    if (arm && arm.userData) {
                        arm.userData.extended = true;
                    }
                }
                break;
                
            case this.states.PATROL:
            case this.states.RETURN:
                // Retract arms when returning to peaceful states
                for (const arm of this.arms) {
                    if (arm && arm.userData) {
                        arm.userData.extended = false;
                    }
                }
                break;
        }
    }
    
    // Patrol behavior - move in a circle around patrol center
    executePatrolBehavior(deltaTime) {
        if (!this.patrolActive) return;
        
        // Update patrol angle
        this.patrolAngle += this.patrolSpeed * deltaTime;
        if (this.patrolAngle > Math.PI * 2) {
            this.patrolAngle -= Math.PI * 2;
        }
        
        // Calculate new position
        const newX = this.patrolCenter.x + Math.cos(this.patrolAngle) * this.patrolRadius;
        const newZ = this.patrolCenter.z + Math.sin(this.patrolAngle) * this.patrolRadius;
        
        // Keep y position consistent (hover effect will modify this slightly)
        const newPosition = new THREE.Vector3(newX, this.position.y, newZ);
        
        // Calculate direction to face
        const direction = new THREE.Vector3();
        direction.subVectors(newPosition, this.group.position).normalize();
        
        // Only rotate if we're moving a significant amount
        if (direction.length() > 0.01) {
            // Calculate target rotation
            const targetRotation = Math.atan2(direction.x, direction.z);
            
            // Smoothly rotate towards target
            const currentRotation = this.group.rotation.y;
            let rotationDiff = targetRotation - currentRotation;
            
            // Normalize the rotation difference to (-PI, PI)
            while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
            while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
            
            // Apply smooth rotation
            this.group.rotation.y += rotationDiff * this.turnSpeed.patrol;
        }
        
        // Apply new position
        this.group.position.copy(newPosition);
    }
    
    // Chase behavior - move towards player
    executeChaseBehavior(deltaTime) {
        if (!this.player || !this.player.camera) return;
        
        // Get player position
        const playerPos = this.player.camera.position.clone();
        
        // Calculate direction to player
        const direction = new THREE.Vector3();
        direction.subVectors(playerPos, this.group.position).normalize();
        
        // Calculate new position
        const moveDistance = this.moveSpeed.chase * deltaTime;
        const newPosition = new THREE.Vector3();
        newPosition.copy(this.group.position);
        newPosition.addScaledVector(direction, moveDistance);
        
        // Calculate target rotation
        const targetRotation = Math.atan2(direction.x, direction.z);
        
        // Smoothly rotate towards target
        const currentRotation = this.group.rotation.y;
        let rotationDiff = targetRotation - currentRotation;
        
        // Normalize the rotation difference to (-PI, PI)
        while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
        
        // Apply smooth rotation
        this.group.rotation.y += rotationDiff * this.turnSpeed.chase;
        
        // Apply new position
        this.group.position.copy(newPosition);
    }
    
    // Return behavior - move back to patrol center
    executeReturnBehavior(deltaTime) {
        // Calculate direction to patrol center
        const direction = new THREE.Vector3();
        direction.subVectors(this.patrolCenter, this.group.position).normalize();
        
        // Calculate new position
        const moveDistance = this.moveSpeed.patrol * deltaTime;
        const newPosition = new THREE.Vector3();
        newPosition.copy(this.group.position);
        newPosition.addScaledVector(direction, moveDistance);
        
        // Calculate target rotation
        const targetRotation = Math.atan2(direction.x, direction.z);
        
        // Smoothly rotate towards target
        const currentRotation = this.group.rotation.y;
        let rotationDiff = targetRotation - currentRotation;
        
        // Normalize the rotation difference to (-PI, PI)
        while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
        
        // Apply smooth rotation
        this.group.rotation.y += rotationDiff * this.turnSpeed.patrol;
        
        // Apply new position
        this.group.position.copy(newPosition);
        
        // Check if we've reached the patrol center
        if (this.group.position.distanceTo(this.patrolCenter) < 0.5) {
            this.changeState(this.states.PATROL);
        }
    }
    
    // Idle behavior - just hover and look around occasionally
    executeIdleBehavior(deltaTime) {
        // Occasionally look around
        if (Math.random() < 0.01) {
            const randomRotation = Math.random() * Math.PI * 2;
            this.targetRotation = randomRotation;
        }
        
        // If we have a target rotation, turn towards it
        if (this.targetRotation !== undefined) {
            const currentRotation = this.group.rotation.y;
            let rotationDiff = this.targetRotation - currentRotation;
            
            // Normalize the rotation difference to (-PI, PI)
            while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
            while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
            
            // Apply smooth rotation
            this.group.rotation.y += rotationDiff * this.turnSpeed.patrol * 0.5;
            
            // Check if we've reached the target rotation
            if (Math.abs(rotationDiff) < 0.05) {
                this.targetRotation = undefined;
            }
        }
    }
    
    // Attack behavior - face player and perform attack
    executeAttackBehavior(deltaTime) {
        if (!this.player || !this.player.camera) return;
        
        // Always face the player during attack
        const playerPos = this.player.camera.position;
        const direction = new THREE.Vector3();
        direction.subVectors(playerPos, this.group.position).normalize();
        
        // Calculate target rotation
        const targetRotation = Math.atan2(direction.x, direction.z);
        
        // Smoothly rotate towards target (faster during attack)
        const currentRotation = this.group.rotation.y;
        let rotationDiff = targetRotation - currentRotation;
        
        // Normalize the rotation difference to (-PI, PI)
        while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
        
        // Apply smooth rotation
        this.group.rotation.y += rotationDiff * this.turnSpeed.chase * 1.5;
        
        // If the attack is finished and cooldown is done, transition back to chase
        if (!this.isAttacking && this.attackCooldown <= 0) {
            this.changeState(this.states.CHASE);
        }
    }
    
    // Perform a melee attack
    performAttack() {
        if (this.isAttacking || !this.player) return;
        
        this.isAttacking = true;
        this.attackCooldown = this.attackCooldownTime;
        
        // Find the closest arm to attack with
        let attackArm = null;
        let bestDistance = Infinity;
        
        // Get player position
        const playerPos = this.player.camera.position;
        
        // Find the best arm to attack with
        for (let i = 0; i < this.arms.length; i++) {
            const arm = this.arms[i];
            if (!arm || !arm.userData) continue;
            
            // Get arm position
            const armPos = new THREE.Vector3();
            if (arm.userData.weapon) {
                arm.userData.weapon.getWorldPosition(armPos);
            } else {
                arm.getWorldPosition(armPos);
            }
            
            // Calculate distance to player
            const distance = armPos.distanceTo(playerPos);
            if (distance < bestDistance) {
                bestDistance = distance;
                attackArm = arm;
            }
        }
        
        // If we found an arm, use it to attack
        if (attackArm) {
            // Force extend the arm
            const armIndex = this.arms.indexOf(attackArm);
            this.extendArm(attackArm, armIndex, 1.0);
            
            // Make the arm "strike" forward
            const strikeAmount = 0.6;
            let originalPosition = null;
            
            if (attackArm.userData.upperArm) {
                originalPosition = attackArm.userData.upperArm.position.z;
                
                // Strike animation
                const strikeDuration = this.attackDuration * 1000 * 0.4; // 40% of attack duration
                
                // Forward motion
                attackArm.userData.upperArm.position.z += strikeAmount;
                
                // Return after delay
                setTimeout(() => {
                    if (attackArm.userData.upperArm) {
                        attackArm.userData.upperArm.position.z = originalPosition;
                    }
                }, strikeDuration);
            }
            
            // Make weapon glow brighter during attack
            if (attackArm.userData.weaponGlow) {
                const originalColor = attackArm.userData.weaponGlow.material.color.clone();
                const originalOpacity = attackArm.userData.weaponGlow.material.opacity;
                
                attackArm.userData.weaponGlow.material.opacity = 1.0;
                attackArm.userData.weaponGlow.material.color.set(0xff0000);
                attackArm.userData.weaponGlow.scale.set(1.5, 1.5, 1.5);
                
                // Reset after attack completes
                setTimeout(() => {
                    if (attackArm.userData.weaponGlow) {
                        attackArm.userData.weaponGlow.material.color.copy(originalColor);
                        attackArm.userData.weaponGlow.material.opacity = originalOpacity;
                        attackArm.userData.weaponGlow.scale.set(1, 1, 1);
                    }
                }, this.attackDuration * 1000);
            }
        }
        
        // Create attack effect
        this.createMeleeAttackEffect();
        
        // Deal damage to player after a short delay
        setTimeout(() => {
            // Check if still in range before applying damage
            if (this.player && this.player.camera) {
                const currentDistanceToPlayer = this.group.position.distanceTo(this.player.camera.position);
                if (currentDistanceToPlayer <= this.attackRange) {
                    console.log(`Enemy hit player for ${this.attackDamage} damage!`);
                    // Call the player's damage function
                    if (this.player.damage) {
                        this.player.damage(this.attackDamage);
                    }
                }
            }
            
            // Reset attack state
            this.isAttacking = false;
            
            // Return to chase state after attack
            this.changeState(this.states.CHASE);
        }, this.attackDuration * 1000);
    }
    
    // Create melee attack effect
    createMeleeAttackEffect() {
        if (!this.player || !this.player.camera) return;
        
        // Calculate direction to player
        const playerPosition = this.player.camera.position;
        const direction = new THREE.Vector3().subVectors(playerPosition, this.group.position).normalize();
        
        // Calculate effect position (between enemy and player)
        const effectPosition = new THREE.Vector3().copy(this.group.position);
        effectPosition.addScaledVector(direction, this.attackRange * 0.7); // 70% of the way to the player
        
        // Create swipe effect with arc shape
        const arcGeometry = new THREE.TorusGeometry(0.5, 0.05, 8, 12, Math.PI);
        const arcMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const arc = new THREE.Mesh(arcGeometry, arcMaterial);
        
        // Position and rotate to face player
        arc.position.copy(effectPosition);
        arc.lookAt(playerPosition);
        arc.rotateX(Math.PI / 2); // Rotate to vertical
        
        this.scene.add(arc);
        
        // Add a flash light
        const light = new THREE.PointLight(0xff3333, 2, 2);
        light.position.copy(effectPosition);
        this.scene.add(light);
        
        // Animate the effect
        const duration = 0.3; // 300ms
        const startTime = performance.now();
        
        const animateAttack = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Rotate the arc for a swipe effect
            arc.rotation.z = progress * Math.PI;
            
            // Scale up slightly and fade out
            const scale = 1 + progress * 0.5;
            arc.scale.set(scale, scale, scale);
            arc.material.opacity = 0.7 * (1 - progress);
            
            // Update light
            light.intensity = 2 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animateAttack);
            } else {
                // Clean up
                this.scene.remove(arc);
                this.scene.remove(light);
                if (arc.geometry) arc.geometry.dispose();
                if (arc.material) arc.material.dispose();
            }
        };
        
        animateAttack();
    }
    
    // Ranged attack - shoot a projectile at the player
    performRangedAttack() {
        if (!this.player || this.rangedAttackCooldown > 0) return;

        // Set cooldown
        this.rangedAttackCooldown = this.rangedAttackCooldownTime;
        
        // Get direction to player with prediction
        const playerPos = this.player.camera.position;
        
        // Calculate where the player will be after some time (prediction)
        const playerVelocity = this.player.velocity || new THREE.Vector3(0, 0, 0);
        const predictionTime = 0.5; // Predict where player will be in 0.5 seconds
        const predictedPlayerPos = playerPos.clone().add(
            playerVelocity.clone().multiplyScalar(predictionTime)
        );
        
        // Find an available arm to shoot from
        let shootArm = null;
        for (const arm of this.arms) {
            if (arm && arm.userData && arm.userData.extended && arm.userData.weapon) {
                shootArm = arm;
                break;
            }
        }
        
        // If no extended arm, force extend one
        if (!shootArm && this.arms.length > 0) {
            const armIndex = Math.floor(Math.random() * this.arms.length);
            shootArm = this.arms[armIndex];
            this.extendArm(shootArm, armIndex, 1.0); // Force immediate extension
        }
        
        // Get firing position
        const firingPosition = new THREE.Vector3();
        if (shootArm && shootArm.userData && shootArm.userData.weapon) {
            // Get world position of weapon tip
            shootArm.userData.weapon.getWorldPosition(firingPosition);
        } else {
            // Fallback to head position
            firingPosition.copy(this.group.position);
            firingPosition.y += this.bodyHeight * 0.8; // Near the top
        }
        
        // Calculate direction to the predicted position
        const direction = new THREE.Vector3()
            .subVectors(predictedPlayerPos, firingPosition)
            .normalize();
        
        // Create projectile mesh - energy bolt for robots
        const projectileGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const projectileMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333, // Red energy
            transparent: true,
            opacity: 0.8
        });
        
        const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
        
        // Position at firing position
        projectileMesh.position.copy(firingPosition);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.4,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        projectileMesh.add(glowMesh);
        
        // Add to scene
        this.scene.add(projectileMesh);
        
        // Calculate distance and speed for consistent timing
        const distanceToPlayer = firingPosition.distanceTo(playerPos);
        const projectileSpeed = Math.max(distanceToPlayer / 2.0, 5); // Faster than standard
        
        // Create projectile data
        const projectile = {
            mesh: projectileMesh,
            position: firingPosition.clone(),
            velocity: direction.multiplyScalar(projectileSpeed * 0.016), // Scale for 60fps
            lifetime: 5.0 // 5 seconds lifetime
        };
        
        // Add to projectiles array
        this.projectiles.push(projectile);
        
        // Create firing effect
        this.createProjectileFiringEffect(firingPosition);
        
        // Make the firing arm recoil
        if (shootArm && shootArm.userData) {
            // Add recoil animation
            const recoilAmount = -0.2;
            
            if (shootArm.userData.upperArm) {
                shootArm.userData.upperArm.position.z += recoilAmount;
                
                // Reset after a short delay
                setTimeout(() => {
                    if (shootArm.userData.upperArm) {
                        shootArm.userData.upperArm.position.z -= recoilAmount;
                    }
                }, 100);
            }
            
            // Make weapon glow brighter
            if (shootArm.userData.weaponGlow) {
                const originalOpacity = shootArm.userData.weaponGlow.material.opacity;
                shootArm.userData.weaponGlow.material.opacity = 1.0;
                
                // Reset after a short delay
                setTimeout(() => {
                    if (shootArm.userData.weaponGlow) {
                        shootArm.userData.weaponGlow.material.opacity = originalOpacity;
                    }
                }, 200);
            }
        }
        
        console.log("Enemy fired ranged attack!");
    }
    
    // Take damage from player
    takeDamage(amount) {
        // Skip if already dead or invulnerable
        if (this.state === 'dead' || this.isInvulnerable) return false;
        
        // Reduce health
        this.health -= amount;
        
        // Log damage
        console.log(`Enemy took ${amount} damage, health: ${this.health}/${this.maxHealth}`);
        
        // Visual effect for taking damage
        this.isDamaged = true;
        this.damageFlashTime = 0.3; // 300ms flash duration
        
        // Brief invulnerability
        this.isInvulnerable = true;
        this.invulnerabilityTime = 0.1; // 100ms invulnerability
        
        // Check if dead
        if (this.health <= 0) {
            this.die();
            return true; // Return true if killed
        }
        
        return false; // Return false if still alive
    }
    
    // Death handling
    die() {
        if (this.state === 'dead') return; // Already dead
        
        console.log("Enemy died!");
        this.state = 'dead';
        
        // Clean up projectiles
        for (const projectile of this.projectiles) {
            if (projectile.mesh) {
                this.scene.remove(projectile.mesh);
            }
        }
        this.projectiles = [];
        
        // Drop mana orb if not already dropped
        if (!this.manaDrop.dropped) {
            this.dropManaOrb();
            this.manaDrop.dropped = true;
        }
        
        // Simple death animation - shrink and fade out
        const startScale = this.group.scale.clone();
        const startPosition = this.group.position.clone();
        
        const duration = 1.0; // Death animation duration in seconds
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / 1000; // to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale down
            const scale = 1 - progress * 0.8;
            this.group.scale.set(scale, scale * 0.5, scale); // Flatten as it shrinks
            
            // Sink into ground
            this.group.position.y = startPosition.y - progress * 1.0;
            
            // Rotate slightly
            this.group.rotation.y += 0.02;
            
            // Fade materials
            this.segments.forEach(segment => {
                if (segment && segment.material) {
                    segment.material.opacity = 1 - progress;
                    segment.material.transparent = true;
                }
            });
            
            if (this.coreSegment && this.coreSegment.material) {
                this.coreSegment.material.emissiveIntensity = 0.8 * (1 - progress);
            }
            
            // Fade hover effects
            if (this.hoverLight) {
                this.hoverLight.intensity = 1.5 * (1 - progress);
            }
            
            if (this.hoverGlow && this.hoverGlow.material) {
                this.hoverGlow.material.opacity = 0.5 * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // After death animation completes, remove from scene
                this.group.visible = false;
                
                // Disable collisions for this enemy
                this.collisionEnabled = false;
            }
        };
        
        animate();
    }
    
    // Drop a mana orb when killed
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
    
    // Reset to last valid position if stuck
    resetToLastValidPosition() {
        if (this.lastValidPosition) {
            this.group.position.copy(this.lastValidPosition);
            console.log("Enemy reset to last valid position");
        }
    }
    
    // Clean up resources when removed
    dispose() {
        // Remove from scene
        if (this.scene && this.group) {
            this.scene.remove(this.group);
        }
        
        // Clean up projectiles
        for (const projectile of this.projectiles) {
            if (this.scene && projectile.mesh) {
                this.scene.remove(projectile.mesh);
            }
        }
        
        // Dispose geometries and materials
        if (this.segments) {
            for (const segment of this.segments) {
                if (segment.geometry) segment.geometry.dispose();
                if (segment.material) segment.material.dispose();
            }
        }
        
        // Dispose other resources...
        console.log("Enemy resources disposed");
    }
                }
