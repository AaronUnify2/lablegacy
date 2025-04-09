export class Renderer {
    constructor() {
        // Initialize the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        
        // Set up the camera
        this.camera = new THREE.PerspectiveCamera(
            75, // Field of view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Set up the renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add the renderer's canvas to the DOM
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        this.domElement = this.renderer.domElement;
        
        // Set up lights
        this.setupLights();
        
        // Add a grid for reference (helpful during development)
        this.addGrid();
        
        // Bind methods
        this.render = this.render.bind(this);
        this.resize = this.resize.bind(this);
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light (sun-like)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
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
        
        // Point light (for closer illumination)
        const pointLight = new THREE.PointLight(0xffa95c, 1, 50);
        pointLight.position.set(0, 10, 0);
        pointLight.castShadow = true;
        this.scene.add(pointLight);
        
        // Store main lights for easy access
        this.lights = {
            ambient: ambientLight,
            directional: directionalLight,
            point: pointLight
        };
    }
    
    addGrid() {
        const gridHelper = new THREE.GridHelper(100, 100, 0x555555, 0x333333);
        this.scene.add(gridHelper);
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
