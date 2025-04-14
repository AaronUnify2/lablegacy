export class MagicStaff {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.staff = null;
        this.orb = null; // Separate orb group
        this.light = null;
        this.spotlight = null; // Spotlight for forward beam
        this.lightIntensity = 2.5; // Keep the original intensity for reference
        this.lightColor = 0x3366ff; // Blue-white light
        this.lightDistance = 3; // Base 3m radius
        this.staffLength = 1.2; // Length of the staff
        this.staffThickness = 0.025; // Thickness of the staff
        this.orbSize = 0.075; // Size of the glowing orb (reduced from 0.1)
        
        // Staff position offset relative to camera - now positioned for left hand
        this.positionOffset = new THREE.Vector3(-0.3, -0.4, -0.6);
        
        // Orb position offset relative to camera - repositioned to top of staff
        this.orbOffset = new THREE.Vector3(-0.3, -0.25, -0.5);
        
        // Staff animation variables
        this.bobAmount = 0.02;
        this.swayAmount = 0.01;
        this.bobSpeed = 2;
        this.swaySpeed = 1.5;
        
        // Light state
        this.isLightOn = true;
        this.savedLightIntensity = this.lightIntensity;
        
        // Create and add to scene
        this.createStaff();
        this.createOrb(); // Create orb separately
        
        // Set up event listener for toggling the light
        document.addEventListener('toggle-staff-light', this.toggleLight.bind(this));
        
        // Also allow keyboard 'L' key to toggle light
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyL') {
                this.toggleLight();
            }
        });
    }
    
    createStaff() {
        // Create the staff group to hold staff components
        this.staff = new THREE.Group();
        
        // Create the wooden staff handle
        const staffGeometry = new THREE.CylinderGeometry(
            this.staffThickness, // top radius (slightly thinner)
            this.staffThickness * 1.2, // bottom radius (slightly thicker)
            this.staffLength, // height
            8, // radial segments
            3, // height segments
            false // open-ended
        );
        
        // Custom wooden material with darker tones for an ancient staff
        const woodTexture = this.generateWoodTexture();
        const staffMaterial = new THREE.MeshStandardMaterial({
            map: woodTexture,
            roughness: 0.7,
            metalness: 0.2,
            color: 0x3d2817 // Dark brown base color
        });
        
        const staffMesh = new THREE.Mesh(staffGeometry, staffMaterial);
        
        // Create a decorative top cap for the staff
        const topCapGeometry = new THREE.ConeGeometry(
            this.staffThickness * 2.5, // Wider cap
            this.staffThickness * 6, // Taller cap
            8,
            1,
            false
        );
        
        const topCapMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366ff,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0x1a3366,
            emissiveIntensity: 1.0 // Bright glow
        });
        
        const topCap = new THREE.Mesh(topCapGeometry, topCapMaterial);
        topCap.position.y = this.staffLength * 0.48; // Place near the top
        
        // Create decorative metal bands along the staff
        const createMetalBand = (position, scale = 1) => {
            const bandGeometry = new THREE.TorusGeometry(
                this.staffThickness * 1.2, // Radius
                this.staffThickness * 0.4, // Tube radius
                8, // Radial segments
                12 // Tubular segments
            );
            
            const bandMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                roughness: 0.3,
                metalness: 0.9,
                emissive: 0x222222,
                emissiveIntensity: 0.2
            });
            
            const band = new THREE.Mesh(bandGeometry, bandMaterial);
            band.rotation.x = Math.PI / 2; // Orient horizontally
            band.position.y = position;
            band.scale.set(scale, scale, scale);
            
            return band;
        };
        
        // Add multiple decorative bands
        const topBand = createMetalBand(this.staffLength * 0.4, 1.0);
        const middleBand = createMetalBand(this.staffLength * 0.15, 0.9);
        const bottomBand = createMetalBand(this.staffLength * -0.2, 1.1);
        
        // Add glowing runes on the staff
        const runeGeometry = new THREE.PlaneGeometry(this.staffThickness * 4, this.staffThickness * 1);
        const runeMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        // Create several runes at different positions and rotations
        for (let i = 0; i < 5; i++) {
            const rune = new THREE.Mesh(runeGeometry, runeMaterial.clone());
            rune.material.opacity = 0.4 + Math.random() * 0.3;
            
            // Position along staff
            const yPos = this.staffLength * (0.3 - i * 0.15);
            rune.position.set(0, yPos, 0);
            
            // Random rotation around staff
            rune.rotation.y = Math.random() * Math.PI * 2;
            rune.rotation.x = Math.PI / 2;
            
            // Make it hover slightly above the staff surface
            rune.position.x = (this.staffThickness + 0.01) * Math.cos(rune.rotation.y);
            rune.position.z = (this.staffThickness + 0.01) * Math.sin(rune.rotation.y);
            
            // Add to staff
            this.staff.add(rune);
        }
        
        // Create a small crystal at the top as a focal point for the light
        const crystalGeometry = new THREE.OctahedronGeometry(this.staffThickness * 1.2, 0);
        const crystalMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0.5,
            transparent: true,
            opacity: 0.9,
            emissive: 0x3366ff,
            emissiveIntensity: 2.0
        });
        
        const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
        crystal.position.y = this.staffLength * 0.56; // Position at the very top
        crystal.rotation.y = Math.PI / 4; // Rotate for better visual effect
        
        // Position the staff handle and rotate it
        staffMesh.rotation.x = Math.PI / 2; // Rotate to point forward
        staffMesh.position.y = -this.staffLength / 2; // Center the staff
        
        // Add components to the staff group
        this.staff.add(staffMesh);
        this.staff.add(topCap);
        this.staff.add(topBand);
        this.staff.add(middleBand);
        this.staff.add(bottomBand);
        this.staff.add(crystal);
        
        // Add the staff to the scene
        this.scene.add(this.staff);
        
        // Store original positions for animation
        this.originalPosition = this.positionOffset.clone();
        
        // Start the animation
        this.setupAnimations();
    }
    
    createOrb() {
        // Create a separate orb group
        this.orb = new THREE.Group();
        
        // Create a glowing orb 
        const orbGeometry = new THREE.SphereGeometry(this.orbSize, 16, 16);
        const orbMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0.3,
            emissive: 0x3366ff,
            emissiveIntensity: 6.0, // Increased from 2.0 for much brighter glow
            transparent: true,
            opacity: 0.95 // Increased from 0.9 for more visibility
        });
        
        const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
        this.orbMesh = orbMesh; // Store reference for toggling
        
        // Add a point light at the orb position (ambient pool light)
        this.light = new THREE.PointLight(
            this.lightColor,
            this.lightIntensity * 2, // Doubled intensity
            this.lightDistance * 1.5, // Increased distance by 50%
            1.2 // Light decay (reduced from 1.5 for less rapid falloff)
        );
        
        // Add a spotlight at the orb position (directional beam)
        this.spotlight = new THREE.SpotLight(
            this.lightColor,
            this.lightIntensity * 3.5, // 3.5x brighter (increased from 2.5x)
            40, // Doubled to 40m beam distance (increased from 20m)
            Math.PI / 9, // Even narrower angle for more focused beam
            0.8, // Increased penumbra for slightly softer edge
            0.5 // Reduced decay further for less falloff at longer distances
        );
        
        // Create a spotlight target
        this.spotlightTarget = new THREE.Object3D();
        this.spotlightTarget.position.set(0, 0, -1); // Forward direction
        this.orb.add(this.spotlightTarget);
        this.spotlight.target = this.spotlightTarget;
        
        // Create a smaller inner orb for extra glow effect
        const innerOrbGeometry = new THREE.SphereGeometry(this.orbSize * 0.6, 16, 16);
        const innerOrbMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9 // Increased from 0.7
        });
        
        const innerOrb = new THREE.Mesh(innerOrbGeometry, innerOrbMaterial);
        this.innerOrb = innerOrb; // Store reference for toggling
        
        // Add ethereal glow effect
        const glowGeometry = new THREE.SphereGeometry(this.orbSize * 1.8, 16, 16); // Increased multiplier from 1.5
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.35, // Increased from 0.15
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowMesh = glowMesh; // Store reference for toggling
        
        // Add all components to the orb group
        this.orb.add(orbMesh);
        this.orb.add(innerOrb);
        this.orb.add(glowMesh);
        this.orb.add(this.light);
        this.orb.add(this.spotlight);
        
        // Add the orb to the scene
        this.scene.add(this.orb);
    }
    
    generateWoodTexture() {
        // Create a canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Fill with a base wood color
        ctx.fillStyle = '#3d2817';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add wood grain
        const grainCount = 20;
        for (let i = 0; i < grainCount; i++) {
            const x = Math.random() * canvas.width;
            const width = Math.random() * 5 + 2;
            const lightness = Math.random() * 20 - 10;
            
            ctx.strokeStyle = lightness > 0 ? 
                `rgba(100, 80, 60, ${Math.random() * 0.3 + 0.1})` : 
                `rgba(30, 20, 10, ${Math.random() * 0.3 + 0.1})`;
            
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            
            // Create a wavy line for wood grain
            let prevX = x;
            for (let y = 20; y < canvas.height; y += 20) {
                const newX = prevX + (Math.random() * 10 - 5);
                ctx.lineTo(newX, y);
                prevX = newX;
            }
            
            ctx.stroke();
        }
        
        // Add some dark knots
        const knotCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < knotCount; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 10 + 5;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(20, 10, 0, 0.8)');
            gradient.addColorStop(0.7, 'rgba(40, 20, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(50, 30, 10, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Create a texture from the canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 5); // Repeat vertically for the staff
        
        return texture;
    }
    
    setupAnimations() {
        // If we already have an animation loop for flickering lights,
        // we'll add our staff to that list
        if (!window.animatedItems) {
            window.animatedItems = [];
            
            const animateItems = () => {
                const items = window.animatedItems;
                if (items && items.length > 0) {
                    const time = performance.now() * 0.001;
                    
                    for (const item of items) {
                        if (item.update) {
                            item.update(time);
                        }
                    }
                }
                
                requestAnimationFrame(animateItems);
            };
            
            animateItems();
        }
        
        // Add our staff to the animation items
        window.animatedItems.push(this);
    }
    
    update(time) {
        if (!this.camera) return;
        
        // Get the camera's world position and direction
        const cameraPosition = this.camera.position.clone();
        const cameraQuaternion = this.camera.quaternion.clone();
        
        // Update staff position if it exists
        if (this.staff) {
            // Create an offset vector for staff
            const staffOffset = this.positionOffset.clone();
            
            // Add subtle bobbing and swaying motion based on time
            staffOffset.y += Math.sin(time * this.bobSpeed) * this.bobAmount;
            staffOffset.x += Math.sin(time * this.swaySpeed) * this.swayAmount;
            
            // Apply the offset in camera's local space
            staffOffset.applyQuaternion(cameraQuaternion);
            
            // Position the staff relative to the camera
            this.staff.position.copy(cameraPosition).add(staffOffset);
            
            // Make the staff face the same direction as the camera
            this.staff.quaternion.copy(cameraQuaternion);
            
            // Add a tilt to the staff
            const tiltQuaternion = new THREE.Quaternion();
            tiltQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.25);
            this.staff.quaternion.multiply(tiltQuaternion);
            
            // Add a slow rotation to the staff around its axis for visual effect
            const staffMeshes = this.staff.children;
            for (let i = 0; i < staffMeshes.length; i++) {
                // Only rotate the rune planes (5th through 9th children)
                if (i >= 4 && i <= 8) {
                    // Different rotation speeds for each rune
                    const rotSpeed = 0.1 + (i - 4) * 0.05;
                    staffMeshes[i].rotation.y += rotSpeed * Math.sin(time * 0.5) * 0.01;
                    
                    // Pulse the opacity of runes
                    if (staffMeshes[i].material && staffMeshes[i].material.opacity !== undefined) {
                        staffMeshes[i].material.opacity = 0.4 + 0.3 * Math.sin(time * 0.5 + i);
                    }
                }
                
                // Make the crystal at the top pulse
                if (i === 9) { // Crystal is the 10th child
                    if (staffMeshes[i].material) {
                        staffMeshes[i].material.emissiveIntensity = 1.5 + Math.sin(time * 2) * 0.5;
                    }
                }
            }
        }
        
        // Update orb position if it exists
        if (this.orb) {
            // Position the orb at the top of the staff
            // Get the staff's position and add an offset to place orb at the top
            let orbPosition;
            if (this.staff) {
                // Create a vector for the top of the staff
                const topOfStaffOffset = new THREE.Vector3(0, 0.65, 0); // Move up to top of staff
                orbPosition = this.staff.position.clone();
                
                // Apply staff's rotation to the offset
                topOfStaffOffset.applyQuaternion(this.staff.quaternion);
                
                // Add the offset to get the final orb position
                orbPosition.add(topOfStaffOffset);
                
                // Set the orb's position
                this.orb.position.copy(orbPosition);
                
                // Make the orb face the same direction as the staff
                this.orb.quaternion.copy(this.staff.quaternion);
            } else {
                // Fallback if staff doesn't exist
                const orbOffset = this.orbOffset.clone();
                
                // Add subtle bobbing and swaying motion based on time
                orbOffset.y += Math.sin(time * this.bobSpeed) * this.bobAmount;
                orbOffset.x += Math.sin(time * this.swaySpeed) * this.swayAmount;
                
                // Apply the offset in camera's local space
                orbOffset.applyQuaternion(cameraQuaternion);
                
                // Position the orb relative to the camera
                this.orb.position.copy(cameraPosition).add(orbOffset);
                
                // Make the orb face the same direction as the camera
                this.orb.quaternion.copy(cameraQuaternion);
            }
            
            // Animate the light intensity slightly
            if (this.light && this.isLightOn) {
                this.light.intensity = (this.lightIntensity * 2) * (0.9 + 0.2 * Math.sin(time * 3));
            }
            
            if (this.spotlight && this.isLightOn) {
                this.spotlight.intensity = (this.lightIntensity * 3.5) * (0.9 + 0.2 * Math.sin(time * 3));
                
                // Add a gentle swaying motion to the spotlight target for more natural light movement
                if (this.spotlightTarget) {
                    const swayX = Math.sin(time * 0.7) * 0.3;
                    const swayZ = Math.cos(time * 0.5) * 0.3;
                    this.spotlightTarget.position.set(swayX, 0, -1 + swayZ);
                }
            }
            
            // Animate orb glow
            if (this.orbMesh && this.orbMesh.material && this.orbMesh.material.emissiveIntensity) {
                const baseIntensity = this.isLightOn ? 6.0 : 1.0; // Increased from 2.0/0.5
                this.orbMesh.material.emissiveIntensity = baseIntensity * (0.9 + 0.2 * Math.sin(time * 2.7));
            }
        }
    }
    
    // Adjust light intensity
    setLightIntensity(intensity) {
        this.lightIntensity = intensity;
        if (this.light && this.isLightOn) {
            this.light.intensity = intensity * 2; // Double the intensity
        }
        if (this.spotlight && this.isLightOn) {
            this.spotlight.intensity = intensity * 2.5; // 2.5x the intensity
        }
    }
    
    // Show or hide the staff and orb
    setVisible(visible) {
        if (this.staff) {
            this.staff.visible = visible;
        }
        if (this.orb) {
            this.orb.visible = visible;
        }
    }
    
    // Toggle light on/off
    toggleLight() {
        this.isLightOn = !this.isLightOn;
        
        // Add visual effects to the staff when toggling
        this.animateStaffLightToggle(this.isLightOn);
        
        if (this.isLightOn) {
            // Turn point light on (3m pool)
            if (this.light) {
                this.light.intensity = this.savedLightIntensity * 2; // Double the intensity
                this.light.distance = this.lightDistance * 1.5; // 4.5m when on
            }
            
            // Turn spotlight on
            if (this.spotlight) {
                this.spotlight.intensity = this.savedLightIntensity * 3.5; // 3.5x the intensity
            }
            
            // Make orb glow brightly
            if (this.orbMesh && this.orbMesh.material) {
                this.orbMesh.material.emissive.set(0x3366ff);
                this.orbMesh.material.emissiveIntensity = 6.0; // Increased from 2.0
            }
            
            if (this.innerOrb && this.innerOrb.material) {
                this.innerOrb.material.opacity = 0.9; // Increased from 0.7
            }
            
            if (this.glowMesh && this.glowMesh.material) {
                this.glowMesh.material.opacity = 0.35; // Increased from 0.15
            }
            
            // Show visual feedback
            this.showToggleEffect(true);
        } else {
            // Save current intensity
            this.savedLightIntensity = this.lightIntensity;
            
            // Turn spotlight off completely
            if (this.spotlight) {
                this.spotlight.intensity = 0;
            }
            
            // Keep point light on but dimmer and shorter range (1m pool)
            if (this.light) {
                this.light.intensity = 1.0; // Increased from 0.4
                this.light.distance = 2; // Increased from 1m when off
            }
            
            // Make orb dim
            if (this.orbMesh && this.orbMesh.material) {
                this.orbMesh.material.emissive.set(0x112244);
                this.orbMesh.material.emissiveIntensity = 1.0; // Increased from 0.5
            }
            
            if (this.innerOrb && this.innerOrb.material) {
                this.innerOrb.material.opacity = 0.4; // Increased from 0.3
            }
            
            if (this.glowMesh && this.glowMesh.material) {
                this.glowMesh.material.opacity = 0.1; // Increased from 0.05
            }
            
            // Show visual feedback
            this.showToggleEffect(false);
        }
        
        return this.isLightOn;
    }
    
    // Show visual effect when toggling the light
    showToggleEffect(isOn) {
        // Create a message element
        const message = document.createElement('div');
        message.textContent = isOn ? "Staff Light: ON" : "Staff Light: OFF";
        message.style.position = 'absolute';
        message.style.bottom = '10%';
        message.style.left = '0';
        message.style.width = '100%';
        message.style.textAlign = 'center';
        message.style.color = isOn ? '#aaccff' : '#667788';
        message.style.fontFamily = 'Cinzel, serif';
        message.style.fontSize = '1.2rem';
        message.style.textShadow = isOn ? 
            '0 0 10px rgba(51, 102, 255, 0.7)' : 
            '0 0 5px rgba(0, 0, 0, 0.7)';
        message.style.opacity = '0';
        message.style.transition = 'opacity 0.5s ease';
        message.style.zIndex = '1000';
        message.style.pointerEvents = 'none';
        
        // Add to document
        document.body.appendChild(message);
        
        // Fade in
        setTimeout(() => {
            message.style.opacity = '1';
        }, 10);
        
        // Fade out and remove
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(message);
            }, 500);
        }, 2000);
    }
    
    // Add visual effects to the staff when toggling the light
    animateStaffLightToggle(isOn) {
        if (!this.staff) return;
        
        const staffMeshes = this.staff.children;
        
        // Create a flash effect
        const flash = (mesh, intensity = 2, duration = 300) => {
            if (!mesh.material) return;
            
            // Store original properties
            const originalEmissive = mesh.material.emissive ? mesh.material.emissive.clone() : new THREE.Color(0x000000);
            const originalEmissiveIntensity = mesh.material.emissiveIntensity || 0;
            
            // Flash effect
            mesh.material.emissive = new THREE.Color(isOn ? 0x3366ff : 0x112233);
            mesh.material.emissiveIntensity = intensity;
            
            // Reset after duration
            setTimeout(() => {
                if (mesh.material) {
                    mesh.material.emissive = originalEmissive;
                    mesh.material.emissiveIntensity = originalEmissiveIntensity;
                }
            }, duration);
        };
        
        // Flash the crystal at the top
        if (staffMeshes[9]) { // Crystal is the 10th child
            flash(staffMeshes[9], 5, 500); // Stronger flash for crystal
        }
        
        // Flash the metal bands with a staggered delay for a ripple effect
        if (staffMeshes[5]) { // Top band
            setTimeout(() => flash(staffMeshes[5], 3, 300), 0);
        }
        
        if (staffMeshes[6]) { // Middle band
            setTimeout(() => flash(staffMeshes[6], 2.5, 300), 100);
        }
        
        if (staffMeshes[7]) { // Bottom band
            setTimeout(() => flash(staffMeshes[7], 2, 300), 200);
        }
        
        // Flash the runes with a cascading effect
        for (let i = 4; i <= 8; i++) {
            if (staffMeshes[i]) {
                // Calculate delay based on position - cascade from top to bottom
                const delay = (i - 4) * 50;
                
                // Flash the rune with decreasing intensity for ones further down
                setTimeout(() => {
                    if (staffMeshes[i].material) {
                        const originalOpacity = staffMeshes[i].material.opacity;
                        // Make runes pulse
                        staffMeshes[i].material.opacity = isOn ? 0.9 : 0.2;
                        
                        // Return to normal after a delay
                        setTimeout(() => {
                            if (staffMeshes[i].material) {
                                staffMeshes[i].material.opacity = originalOpacity;
                            }
                        }, 300);
                    }
                }, delay);
            }
        }
        
        // Create a pulse wave that travels down the staff
        this.createStaffPulseWave(isOn);
    }
    
    // Create a pulse wave effect that travels down the staff
    createStaffPulseWave(isActivating) {
        if (!this.staff || !this.scene) return;
        
        // Create a ring geometry for the pulse
        const ringGeometry = new THREE.TorusGeometry(this.staffThickness * 2, 0.01, 8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: isActivating ? 0x3366ff : 0x662222,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        // Create the ring mesh
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        
        // Add to staff at the top
        ring.position.y = this.staffLength * 0.55; // Start at the top
        ring.rotation.x = Math.PI / 2; // Align with staff
        
        this.staff.add(ring);
        
        // Animate the pulse wave
        const duration = 600; // ms
        const startTime = performance.now();
        const startY = ring.position.y;
        const endY = -this.staffLength / 2; // Bottom of staff
        
        const animateRing = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Move ring down the staff
            ring.position.y = startY - (startY - endY) * progress;
            
            // Scale the ring slightly as it moves
            const scale = 1 + progress * 0.5;
            ring.scale.set(scale, scale, scale);
            
            // Fade out as it moves
            ring.material.opacity = 0.9 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animateRing);
            } else {
                // Remove when done
                this.staff.remove(ring);
                ring.geometry.dispose();
                ring.material.dispose();
            }
        };
        
        animateRing();
    }
}
    

