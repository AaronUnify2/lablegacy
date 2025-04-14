
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
        this.lightDistance = 5; // Base 3m radius
        this.staffLength = 1.2; // Length of the staff
        this.staffThickness = 0.025; // Thickness of the staff
        this.orbSize = 0.075; // Size of the glowing orb (reduced from 0.1)
        
        // Staff position offset relative to camera - adjusted for left hand dual wielding
        this.positionOffset = new THREE.Vector3(-0.45, -0.4, -0.6);
        
        // Orb position offset relative to camera - repositioned to top of staff
        this.orbOffset = new THREE.Vector3(-0.45, -0.25, -0.5);
        
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
        
        // Create a decorative top wrap near the orb - moved closer to the top
        const topWrapGeometry = new THREE.CylinderGeometry(
            this.staffThickness * 1.8, // Slightly wider to support orb
            this.staffThickness * 1.5,
            this.staffThickness * 5,
            8,
            1,
            false
        );
        
        const wrapMaterial = new THREE.MeshStandardMaterial({
            color: 0x3366aa,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0x1a3366,
            emissiveIntensity: 0.8 // Increased from 0.3 for brighter glow
        });
        
        const topWrap = new THREE.Mesh(topWrapGeometry, wrapMaterial);
        topWrap.position.y = this.staffLength * 0.45; // Moved closer to top (was 0.4)
        
        // Position the staff handle and rotate it
        staffMesh.rotation.x = Math.PI / 2; // Rotate to point forward
        staffMesh.position.y = -this.staffLength / 2; // Center the staff
        
        // Add components to the staff group
        this.staff.add(staffMesh);
        this.staff.add(topWrap);
        
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
            this.lightIntensity * 2.5, // 2.5x brighter
            60, // Doubled from 10m to 20m beam distance
            Math.PI / 8, // Narrower angle (was Math.PI/6) for more focused beam
            0.7, // Increased penumbra for slightly softer edge
            0.6 // Reduced decay for less falloff at distance
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
        }
        
        // Update orb position if it exists
        if (this.orb) {
            // Position the orb at the top of the staff
            // Get the staff's position and add an offset to place orb at the top
            let orbPosition;
            if (this.staff) {
                // Create a vector for the top of the staff
                const topOfStaffOffset = new THREE.Vector3(0, 0.6, 0); // Move up to top of staff
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
                this.spotlight.intensity = (this.lightIntensity * 2.5) * (0.9 + 0.2 * Math.sin(time * 3));
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
        
        if (this.isLightOn) {
            // Turn point light on (3m pool)
            if (this.light) {
                this.light.intensity = this.savedLightIntensity * 2; // Double the intensity
                this.light.distance = this.lightDistance * 1.5; // 4.5m when on
            }
            
            // Turn spotlight on
            if (this.spotlight) {
                this.spotlight.intensity = this.savedLightIntensity * 2.5; // 2.5x the intensity
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
        message.textContent = isOn ? " " : " ";
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
    
}
