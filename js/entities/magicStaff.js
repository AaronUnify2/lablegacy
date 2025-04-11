export class MagicStaff {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.staff = null;
        
        // Light properties
        this.isLightOn = true;
        
        // Main orb light (spotlight for beam)
        this.beamLight = null;
        this.beamIntensity = 2.0;
        this.beamColor = 0x3366ff; // Blue-white light
        this.beamDistance = 10; // 10m beam distance
        this.beamAngle = Math.PI / 6; // 30 degrees spread
        
        // Ambient pool light around player
        this.poolLight = null;
        this.poolIntensity = 1.5;
        this.poolColor = 0x3366ff;
        this.poolDistance = 3; // 3m radius when on
        this.poolDistanceOff = 1; // 1m radius when off
        
        // Staff physical properties
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
        
        // Create and add to scene
        this.createStaff();
        
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
        
        // ===== Create the wooden staff handle =====
        const staffGeometry = new THREE.CylinderGeometry(
            this.staffThickness, // top radius (slightly thinner)
            this.staffThickness * 1.2, // bottom radius (slightly thicker)
            this.staffLength, // height
            8, // radial segments
            3, // height segments
            false // open-ended
        );
        
        // Custom wooden material with natural wood appearance
        const woodTexture = this.generateWoodTexture();
        const staffMaterial = new THREE.MeshStandardMaterial({
            map: woodTexture,
            roughness: 0.7,
            metalness: 0.2,
            color: 0x3d2817 // Dark brown base color - never changes
        });
        
        const staffMesh = new THREE.Mesh(staffGeometry, staffMaterial);
        
        // ===== Create a decorative top wrap near the orb =====
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
            // No emissive property - the wrap doesn't glow
        });
        
        const topWrap = new THREE.Mesh(topWrapGeometry, wrapMaterial);
        topWrap.position.y = this.staffLength * 0.4;
        
        // ===== Create a glowing orb at the top of the staff =====
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
        this.orb = orb; // Store reference for toggling
        
        // ===== Create two light sources =====
        
        // 1. Beam light (spotlight) - directional beam
        this.beamLight = new THREE.SpotLight(
            this.beamColor,
            this.beamIntensity,
            this.beamDistance,
            this.beamAngle,
            0.5, // penumbra - soft edge
            1.0 // decay
        );
        this.beamLight.position.copy(orb.position);
        
        // 2. Pool light (point light) - ambient light around player
        this.poolLight = new THREE.PointLight(
            this.poolColor,
            this.poolIntensity,
            this.poolDistance,
            1.5 // Light decay (quadratic)
        );
        this.poolLight.position.copy(orb.position);
        
        // ===== Inner orb and glow effects =====
        
        // Create a smaller inner orb for extra glow effect
        const innerOrbGeometry = new THREE.SphereGeometry(this.orbSize * 0.6, 16, 16);
        const innerOrbMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
        });
        
        const innerOrb = new THREE.Mesh(innerOrbGeometry, innerOrbMaterial);
        innerOrb.position.copy(orb.position);
        this.innerOrb = innerOrb; // Store reference for toggling
        
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
        this.glowMesh = glowMesh; // Store reference for toggling
        
        // Position the staff handle and rotate it
        staffMesh.rotation.x = Math.PI / 2; // Rotate to point forward
        staffMesh.position.y = -this.staffLength / 2; // Center the staff
        
        // Add all components to the staff group
        this.staff.add(staffMesh);
        this.staff.add(topWrap);
        this.staff.add(orb);
        this.staff.add(innerOrb);
        this.staff.add(glowMesh);
        this.staff.add(this.beamLight);
        this.staff.add(this.poolLight);
        
        // Create and add spotlight target
        this.beamTarget = new THREE.Object3D();
        this.beamTarget.position.set(0, 0, -1); // Forward direction
        this.staff.add(this.beamTarget);
        this.beamLight.target = this.beamTarget;
        
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
        
        // Animate the orb and lights slightly for a magical effect
        if (this.isLightOn) {
            // Animate the beam light intensity slightly
            if (this.beamLight) {
                this.beamLight.intensity = this.beamIntensity * (0.9 + 0.2 * Math.sin(time * 3));
            }
            
            // Animate the pool light intensity slightly
            if (this.poolLight) {
                this.poolLight.intensity = this.poolIntensity * (0.9 + 0.2 * Math.sin(time * 2.5));
            }
            
            // Pulse the orb emissive intensity
            if (this.orb && this.orb.material) {
                this.orb.material.emissiveIntensity = 2.0 * (0.9 + 0.2 * Math.sin(time * 2.7));
            }
        } else {
            // Subtle pulsing even when the main light is off
            if (this.poolLight) {
                this.poolLight.intensity = 0.4 * (0.9 + 0.2 * Math.sin(time * 1.5));
            }
            
            // Subtle orb pulsing when off
            if (this.orb && this.orb.material) {
                this.orb.material.emissiveIntensity = 0.5 * (0.9 + 0.2 * Math.sin(time * 1.7));
            }
        }
    }
    
    // Toggle light on/off
    toggleLight() {
        this.isLightOn = !this.isLightOn;
        
        if (this.isLightOn) {
            // Turn beam light on
            if (this.beamLight) {
                this.beamLight.intensity = this.beamIntensity;
                this.beamLight.distance = this.beamDistance;
            }
            
            // Set pool light to normal size
            if (this.poolLight) {
                this.poolLight.intensity = this.poolIntensity;
                this.poolLight.distance = this.poolDistance;
            }
            
            // Make orb glow strongly
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
            // Turn beam light off
            if (this.beamLight) {
                this.beamLight.intensity = 0;
            }
            
            // Reduce pool light to small area
            if (this.poolLight) {
                this.poolLight.intensity = 0.4;
                this.poolLight.distance = this.poolDistanceOff;
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
        
        return this.isLightOn;
    }
    
    // Show or hide the staff
    setVisible(visible) {
        if (this.staff) {
            this.staff.visible = visible;
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
}
