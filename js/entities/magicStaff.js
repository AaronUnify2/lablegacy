export class MagicStaff {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.staff = null;
        this.light = null;
        this.spotlight = null; // New spotlight for forward beam
        this.lightIntensity = 2.5;
        this.lightColor = 0x3366ff; // Blue-white light
        this.lightDistance = 3; // 3m radius
        this.staffLength = 1.2; // Length of the staff
        this.staffThickness = 0.025; // Thickness of the staff
        this.orbSize = 0.08; // Size of the glowing orb
        
        // Staff position offset relative to camera
        this.positionOffset = new THREE.Vector3(0.3, -0.4, -0.6);
        
        // Staff animation variables
        this.bobAmount = 0.02;
        this.swayAmount = 0.01;
        this.bobSpeed = 2;
        this.swaySpeed = 1.5;
        
        // Light state
        this.isLightOn = true;
        this.savedLightIntensity = this.lightIntensity;
        
        // Delay staff creation to prevent physics issues
        setTimeout(() => {
            // Create and add to scene
            this.createStaff();
            
            // Show a message when staff appears
            this.showMessage("Staff materialized");
        }, 1000); // 1 second delay
        
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
        // Create the staff group to hold all staff components
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
        
        // Create a decorative top wrap near the orb
        const topWrapGeometry = new THREE.CylinderGeometry(
            this.staffThickness * 1.5,
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
            emissiveIntensity: 0.3
        });
        
        const topWrap = new THREE.Mesh(topWrapGeometry, wrapMaterial);
        topWrap.position.y = this.staffLength * 0.4;
        
        // Create a glowing orb at the top of the staff
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
        
        // Add a point light at the orb position (ambient pool light)
        this.light = new THREE.PointLight(
            this.lightColor,
            this.lightIntensity,
            this.lightDistance,
            1.5 // Light decay (quadratic)
        );
        this.light.position.copy(orb.position);
        
        // Add a spotlight at the orb position (directional beam)
        this.spotlight = new THREE.SpotLight(
            this.lightColor,
            this.lightIntensity,  
            10, // 10m beam distance
            Math.PI / 6, // 30 degrees spread
            0.5, // penumbra - soft edge
            1.0 // decay
        );
        this.spotlight.position.copy(orb.position);
        
        // Create a spotlight target
        this.spotlightTarget = new THREE.Object3D();
        this.spotlightTarget.position.set(0, 0, -1); // Forward direction
        this.staff.add(this.spotlightTarget);
        this.spotlight.target = this.spotlightTarget;
        
        // Create a smaller inner orb for extra glow effect
        const innerOrbGeometry = new THREE.SphereGeometry(this.orbSize * 0.6, 16, 16);
        const innerOrbMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
        });
        
        const innerOrb = new THREE.Mesh(innerOrbGeometry, innerOrbMaterial);
        innerOrb.position.copy(orb.position);
        
        // Add ethereal glow effect
        const glowGeometry = new THREE.SphereGeometry(this.orbSize * 1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x3366ff,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.copy(orb.position);
        
        // Position the staff handle and rotate it
        staffMesh.rotation.x = Math.PI / 2; // Rotate to point forward
        staffMesh.position.y = -this.staffLength / 2; // Center the staff
        
        // Add all components to the staff group
        this.staff.add(staffMesh);
        this.staff.add(topWrap);
        this.staff.add(orb);
        this.staff.add(innerOrb);
        this.staff.add(glowMesh);
        this.staff.add(this.light);
        this.staff.add(this.spotlight);
        
        // Add the staff to the scene
        this.scene.add(this.staff);
        
        // Store original positions for animation
        this.originalPosition = this.positionOffset.clone();
        
        // Start the animation
        this.setupAnimations();
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
        
        // Make the staff face the same direction as the camera
        this.staff.quaternion.copy(cameraQuaternion);
        
        // Add a tilt to the staff
        const tiltQuaternion = new THREE.Quaternion();
        tiltQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.25);
        this.staff.quaternion.multiply(tiltQuaternion);
        
        // Animate the light intensity slightly
        if (this.light && this.isLightOn) {
            this.light.intensity = this.lightIntensity * (0.9 + 0.2 * Math.sin(time * 3));
        }
        
        if (this.spotlight && this.isLightOn) {
            this.spotlight.intensity = this.lightIntensity * (0.9 + 0.2 * Math.sin(time * 3));
        }
    }
    
    // Adjust light intensity
    setLightIntensity(intensity) {
        this.lightIntensity = intensity;
        if (this.light && this.isLightOn) {
            this.light.intensity = intensity;
        }
        if (this.spotlight && this.isLightOn) {
            this.spotlight.intensity = intensity;
        }
    }
    
    // Show or hide the staff
    setVisible(visible) {
        if (this.staff) {
            this.staff.visible = visible;
        }
    }
    
    // Toggle light on/off
    toggleLight() {
        this.isLightOn = !this.isLightOn;
        
        if (this.isLightOn) {
            // Turn point light on (3m pool)
            if (this.light) {
                this.light.intensity = this.savedLightIntensity;
                this.light.distance = 3; // 3m when on
            }
            
            // Turn spotlight on
            if (this.spotlight) {
                this.spotlight.intensity = this.savedLightIntensity;
            }
            
            // Make orb glow
            if (this.staff) {
                this.staff.children.forEach(child => {
                    if (child.material && child.material.emissive) {
                        child.material.emissive.set(0x3366ff);
                        if (child.material.emissiveIntensity) {
                            child.material.emissiveIntensity = 2.0;
                        }
                    }
                });
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
                this.light.intensity = 0.4;
                this.light.distance = 1; // 1m when off
            }
            
            // Make orb dim
            if (this.staff) {
                this.staff.children.forEach(child => {
                    if (child.material && child.material.emissive) {
                        child.material.emissive.set(0x112244);
                        if (child.material.emissiveIntensity) {
                            child.material.emissiveIntensity = 0.3;
                        }
                    }
                });
            }
            
            // Show visual feedback
            this.showToggleEffect(false);
        }
        
        return this.isLightOn;
    }
    
    // Show any message to the player
    showMessage(text, color = '#aaccff', glow = true) {
        // Create a message element
        const message = document.createElement('div');
        message.textContent = text;
        message.style.position = 'absolute';
        message.style.bottom = '10%';
        message.style.left = '0';
        message.style.width = '100%';
        message.style.textAlign = 'center';
        message.style.color = color;
        message.style.fontFamily = 'Cinzel, serif';
        message.style.fontSize = '1.2rem';
        message.style.textShadow = glow ? 
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
    
    // Show visual effect when toggling the light
    showToggleEffect(isOn) {
        const text = isOn ? "Staff light activated" : "Staff light deactivated";
        const color = isOn ? '#aaccff' : '#667788';
        this.showMessage(text, color, isOn);
    }
}
