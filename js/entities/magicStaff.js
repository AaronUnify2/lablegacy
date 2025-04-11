export class MagicStaff {
    constructor(scene, camera) {
        // Check if scene and camera are valid
        if (!scene || !camera) {
            console.error("MagicStaff: Missing scene or camera");
            return;
        }
        
        this.scene = scene;
        this.camera = camera;
        this.staff = null;
        
        // Lights
        this.spotLight = null;  // Forward beam light
        this.pointLight = null; // Surrounding ambient light
        
        // Light properties
        this.beamColor = 0x3366ff;    // Blue-white beam
        this.beamIntensity = 3.0;     // Brighter beam
        this.beamDistance = 10;       // 10m beam reach
        this.beamAngle = Math.PI/6;   // 30 degrees spread
        
        this.poolColor = 0x3366ff;    // Matching pool color
        this.poolIntensity = 2.0;     
        this.poolDistance = 3;        // 3m pool radius when on
        this.poolDistanceOff = 1;     // 1m pool radius when off
        
        // Staff physical properties
        this.staffLength = 1.2;       // Length of the staff
        this.staffThickness = 0.025;  // Thickness of the staff
        this.orbSize = 0.08;          // Size of the glowing orb
        
        // Staff position offset relative to camera
        this.positionOffset = new THREE.Vector3(0.3, -0.4, -0.6);
        
        // Staff animation variables
        this.bobAmount = 0.02;
        this.swayAmount = 0.01;
        this.bobSpeed = 2;
        this.swaySpeed = 1.5;
        
        // Light state
        this.isLightOn = true;
        
        // Check if THREE is fully loaded
        if (typeof THREE === 'undefined') {
            console.error("MagicStaff: THREE is not defined yet");
            // Wait for THREE to load
            setTimeout(() => this.createStaff(), 500);
        } else {
            // Create and add to scene
            this.createStaff();
        }
        
        // Event listeners
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyL') {
                this.toggleLight();
            }
        });
    }
    
    createStaff() {
        try {
            // Check if THREE is defined
            if (typeof THREE === 'undefined') {
                console.error("MagicStaff: THREE is not defined");
                return;
            }
            
            // Create the staff group to hold all components
            this.staff = new THREE.Group();
            
            // Create the wooden staff handle
            const staffGeometry = new THREE.CylinderGeometry(
                this.staffThickness,              // top radius
                this.staffThickness * 1.2,        // bottom radius (slightly thicker)
                this.staffLength,                 // height
                8,                                // radial segments
                3,                                // height segments
                false                             // open-ended
            );
            
            // Wooden material with natural texture
            const woodTexture = this.generateWoodTexture();
            const staffMaterial = new THREE.MeshStandardMaterial({
                map: woodTexture,
                roughness: 0.7,
                metalness: 0.2,
                color: 0x3d2817  // Dark brown base color
            });
            
            const staffMesh = new THREE.Mesh(staffGeometry, staffMaterial);
            
            // Create the glowing orb at the top of the staff
            const orbGeometry = new THREE.SphereGeometry(this.orbSize, 16, 16);
            const orbMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.1,
                metalness: 0.3,
                emissive: 0x3366ff,
                emissiveIntensity: 2.0,
                transparent: true,
                opacity: 0.9
            });
            
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);
            orb.position.y = this.staffLength / 2 + this.orbSize * 0.8;
            this.orb = orb; // Save reference for later
            
            // Create inner orb for extra glow effect
            const innerOrbGeometry = new THREE.SphereGeometry(this.orbSize * 0.6, 16, 16);
            const innerOrbMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7
            });
            
            const innerOrb = new THREE.Mesh(innerOrbGeometry, innerOrbMaterial);
            innerOrb.position.copy(orb.position);
            this.innerOrb = innerOrb; // Save reference
            
            // Add ethereal glow effect around orb
            const glowGeometry = new THREE.SphereGeometry(this.orbSize * 1.5, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x3366ff,
                transparent: true,
                opacity: 0.15,
                side: THREE.BackSide
            });
            
            const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
            glowMesh.position.copy(orb.position);
            this.glowMesh = glowMesh; // Save reference
            
            // Position the staff handle and rotate it
            staffMesh.rotation.x = Math.PI / 2; // Rotate to point forward
            staffMesh.position.y = -this.staffLength / 2; // Center the staff
            
            // Add all components to the staff group
            this.staff.add(staffMesh);
            this.staff.add(orb);
            this.staff.add(innerOrb);
            this.staff.add(glowMesh);
            
            // Create spotlight for forward beam (with reduced intensity to start)
            this.spotLight = new THREE.SpotLight(
                this.beamColor,
                this.beamIntensity * 0.8,  // Slightly reduced initial intensity
                this.beamDistance,
                this.beamAngle,
                0.8, // Penumbra - makes the beam edge softer
                1.0  // Decay - quadratic
            );
            
            // Position spotlight at orb
            this.spotLight.position.copy(orb.position);
            
            // Create target for spotlight to aim forward
            this.spotLightTarget = new THREE.Object3D();
            this.spotLightTarget.position.set(0, 0, -5); // Forward direction, more distant
            this.staff.add(this.spotLightTarget);
            this.spotLight.target = this.spotLightTarget;
            
            // Add spotlight to staff
            this.staff.add(this.spotLight);
            
            // Create point light for surrounding pool of light (with reduced intensity)
            this.pointLight = new THREE.PointLight(
                this.poolColor,
                this.poolIntensity * 0.7,  // Slightly reduced intensity
                this.poolDistance,
                1.5 // Light decay (quadratic)
            );
            
            // Position point light at player position (will be updated)
            this.pointLight.position.set(0, 0, 0);
            this.staff.add(this.pointLight);
            
            // Add the staff to the scene
            this.scene.add(this.staff);
            
            // Store original positions for animation
            this.originalPosition = this.positionOffset.clone();
            
            // Start the animation
            this.setupAnimations();
            
            console.log("MagicStaff: Successfully created staff");
        } catch (error) {
            console.error("MagicStaff: Error creating staff", error);
        }
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
        try {
            if (!this.staff || !this.camera) return;
            
            // Get the camera's world position and direction
            const cameraPosition = this.camera.position.clone();
            const cameraQuaternion = this.camera.quaternion.clone();
            
            // Create an offset vector
            const offset = this.positionOffset.clone();
            
            // Add subtle bobbing and swaying motion based on time
            offset.y += Math.sin(time * this.bobSpeed) * this.bobAmount;
            offset.x += Math.sin(time * this.swaySpeed) * this.swayAmount;
            
            // Apply the offset in camera's local space
            offset.applyQuaternion(cameraQuaternion);
            
            // Position the staff relative to the camera
            this.staff.position.copy(cameraPosition).add(offset);
            
            // Update the pool light position (detached from staff position)
            if (this.pointLight) {
                // Position the pool light at player position, but slightly lower
                const lightPos = cameraPosition.clone();
                lightPos.y -= 0.5; // Lower than camera to light up the floor better
                this.pointLight.position.copy(lightPos);
            }
            
            // Make the staff face the same direction as the camera
            this.staff.quaternion.copy(cameraQuaternion);
            
            // Add a tilt to the staff
            const tiltQuaternion = new THREE.Quaternion();
            tiltQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.25);
            this.staff.quaternion.multiply(tiltQuaternion);
            
            // Animate the light intensity slightly - but less dramatically
            if (this.isLightOn) {
                // Animate beam light with subtle flicker
                if (this.spotLight) {
                    this.spotLight.intensity = this.beamIntensity * (0.95 + 0.1 * Math.sin(time * 3));
                }
                
                // Animate pool light with even more subtle flicker
                if (this.pointLight) {
                    this.pointLight.intensity = this.poolIntensity * (0.95 + 0.05 * Math.sin(time * 4));
                }
                
                // Animate orb glow
                if (this.orb && this.orb.material) {
                    this.orb.material.emissiveIntensity = 2.0 * (0.95 + 0.1 * Math.sin(time * 3));
                }
            }
        } catch (error) {
            console.error("MagicStaff: Error in update", error);
        }
    }
    
    // Toggle light on/off
    toggleLight() {
        try {
            this.isLightOn = !this.isLightOn;
            
            if (this.isLightOn) {
                // Turn on the beam light
                if (this.spotLight) {
                    this.spotLight.intensity = this.beamIntensity;
                    this.spotLight.distance = this.beamDistance;
                }
                
                // Set pool light to full range
                if (this.pointLight) {
                    this.pointLight.distance = this.poolDistance;
                    this.pointLight.intensity = this.poolIntensity;
                }
                
                // Make orb glow brightly
                if (this.orb && this.orb.material) {
                    this.orb.material.emissive.set(0x3366ff);
                    this.orb.material.emissiveIntensity = 2.0;
                }
                
                if (this.innerOrb && this.innerOrb.material) {
                    this.innerOrb.material.opacity = 0.7;
                }
                
                if (this.glowMesh && this.glowMesh.material) {
                    this.glowMesh.material.opacity = 0.15;
                }
                
                // Show visual feedback
                this.showToggleEffect(true);
            } else {
                // Turn off the beam light
                if (this.spotLight) {
                    this.spotLight.intensity = 0;
                }
                
                // Reduce pool light to minimum
                if (this.pointLight) {
                    this.pointLight.distance = this.poolDistanceOff;
                    this.pointLight.intensity = this.poolIntensity * 0.3;
                }
                
                // Make orb dim
                if (this.orb && this.orb.material) {
                    this.orb.material.emissive.set(0x112244);
                    this.orb.material.emissiveIntensity = 0.5;
                }
                
                if (this.innerOrb && this.innerOrb.material) {
                    this.innerOrb.material.opacity = 0.3;
                }
                
                if (this.glowMesh && this.glowMesh.material) {
                    this.glowMesh.material.opacity = 0.05;
                }
                
                // Show visual feedback
                this.showToggleEffect(false);
            }
            
            console.log(`MagicStaff: Light toggled ${this.isLightOn ? 'ON' : 'OFF'}`);
            return this.isLightOn;
        } catch (error) {
            console.error("MagicStaff: Error toggling light", error);
            return this.isLightOn;
        }
    }
    
    // Show visual effect when toggling the light
    showToggleEffect(isOn) {
        // Create a message element
        const message = document.createElement('div');
        message.textContent = isOn ? "Staff light activated" : "Staff light deactivated";
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
    
    // Show or hide the staff
    setVisible(visible) {
        if (this.staff) {
            this.staff.visible = visible;
        }
    }
}
