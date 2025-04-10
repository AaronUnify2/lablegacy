export class Renderer {
    constructor() {
        // Initialize the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        
        // Make the scene available to the dungeon generator
        window.currentScene = this.scene;
        
        // Set up the camera
        this.camera = new THREE.PerspectiveCamera(
            75, // Field of view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Set up the renderer with enhanced shadows
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Enhanced shadow settings
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add post-processing for more atmospheric effects
        this.setupPostProcessing();
        
        // Add the renderer's canvas to the DOM
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        this.domElement = this.renderer.domElement;
        
        // Set up lights with adjusted values for cursed atmosphere
        this.setupLights();
        
        // Add a grid for reference (helpful during development)
        // this.addGrid(); // Commented out for production version
        
        // Bind methods
        this.render = this.render.bind(this);
        this.resize = this.resize.bind(this);
        
        // Initialize animation loop for effects
        this.initEffects();
    }
    
    setupLights() {
        // Ambient light - very dim to create a dark atmosphere
        const ambientLight = new THREE.AmbientLight(0x222222, 0.2); // Dimmed ambient light
        this.scene.add(ambientLight);
        
        // Directional light (distant, weak light)
        const directionalLight = new THREE.DirectionalLight(0x333344, 0.3); // Blueish tint
        directionalLight.position.set(50, 200, 100);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
        
        // No generic point light - they will be added by dungeon generator
        // Store main lights for easy access
        this.lights = {
            ambient: ambientLight,
            directional: directionalLight
        };
        
        // Add fog to the scene (will be overwritten by dungeon generator)
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);
    }
    
    setupPostProcessing() {
        // This is a placeholder for more advanced post-processing
        // In a full implementation, you might add:
        // - Bloom effect for light sources
        // - Film grain for atmosphere
        // - Vignette for darkness at the edges
        // - Custom shaders for shadow effects
        
        // For now, we'll just set up the basic components for the main render loop
        this.composer = null;
        
        // If using post-processing, you would initialize it here with Three.js EffectComposer
        // For simplicity in this implementation, we'll stick with the standard renderer
    }
    
    initEffects() {
        // Set up animation loops for various effects
        this.effectTimers = {
            shadowPulse: 0
        };
        
        // Initialize dark particles floating in the air
        this.initDarkParticles();
    }
    
    initDarkParticles() {
        // Create a particle system for dark wisps floating in the air
        const particleCount = 100;
        const particles = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Initialize particles with random positions
        for (let i = 0; i < particleCount; i++) {
            // Position in a large volume around the camera start position
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 10 + 1; // Height above ground
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
            
            // Random sizes
            sizes[i] = Math.random() * 2 + 0.5;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x000000,
            size: 1.0,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Create particle system
        this.particles = new THREE.Points(particles, particleMaterial);
        this.scene.add(this.particles);
        
        // Store original positions for animation
        this.particles.userData.positions = positions.slice();
        this.particles.userData.animationOffset = new Float32Array(particleCount);
        
        // Initialize animation offsets
        for (let i = 0; i < particleCount; i++) {
            this.particles.userData.animationOffset[i] = Math.random() * Math.PI * 2;
        }
    }
    
    updateDarkParticles(time) {
        if (!this.particles) return;
        
        const positions = this.particles.geometry.attributes.position.array;
        const originalPositions = this.particles.userData.positions;
        const offsets = this.particles.userData.animationOffset;
        
        // Update particle positions with subtle drifting motion
        for (let i = 0; i < positions.length / 3; i++) {
            const idx = i * 3;
            
            // Slow drifting movement
            positions[idx] = originalPositions[idx] + 
                           Math.sin(time * 0.2 + offsets[i]) * 2;
                           
            positions[idx + 1] = originalPositions[idx + 1] + 
                               Math.cos(time * 0.1 + offsets[i]) * 1;
                               
            positions[idx + 2] = originalPositions[idx + 2] + 
                               Math.sin(time * 0.15 + offsets[i]) * 2;
        }
        
        this.particles.geometry.attributes.position.needsUpdate = true;
    }
    
    addGrid() {
        const gridHelper = new THREE.GridHelper(100, 100, 0x555555, 0x333333);
        this.scene.add(gridHelper);
    }
    
    render(time) {
        // Update any animated effects
        if (time !== undefined) {
            const t = time * 0.001; // Convert to seconds
            this.updateEffects(t);
        }
        
        // If using the post-processing composer
        if (this.composer) {
            this.composer.render();
        } else {
            // Standard rendering
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    updateEffects(time) {
        // Update particle effects
        this.updateDarkParticles(time);
        
        // Pulse the shadows subtly
        this.effectTimers.shadowPulse = time;
        const shadowIntensity = 0.8 + Math.sin(time * 0.5) * 0.1;
        
        // Apply to directional light shadow
        if (this.lights.directional) {
            this.lights.directional.shadow.bias = -0.0001 + Math.sin(time * 0.7) * 0.00001;
        }
    }
    
    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update composer if using post-processing
        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
    }
}
