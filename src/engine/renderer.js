// src/engine/renderer.js - Three.js renderer setup and management with fixed lighting

import * as THREE from 'three';

// Global renderer variables
let scene, camera, renderer;
let canvas;

// Setup Three.js renderer
export function setupRenderer() {
    // Get canvas element
    canvas = document.getElementById('game-canvas');
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // Slightly lighter background for better contrast
    
    // Setup fog for atmosphere - REDUCED density to allow lighting to be visible
    scene.fog = new THREE.FogExp2(0x000000, 0.015); // Reduced from 0.04 to 0.015
    
    // Create perspective camera
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Setup basic lighting
    setupLighting();
    
    // Apply initial sizing
    resizeRenderer();
    
    return {
        scene,
        camera,
        renderer
    };
}

// Set up basic lighting for the scene - ENHANCED VERSION
function setupLighting() {
    // SIGNIFICANTLY brighter ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x666666, 0.8); // Increased from 0x333333, 0.5
    scene.add(ambientLight);
    
    // Brighter directional light for better shadows and directional illumination
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Increased from 0.7
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    
    scene.add(directionalLight);
    
    // Add an additional fill light to brighten the scene from another angle
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-5, 8, -7);
    fillLight.castShadow = false; // Don't cast shadows to avoid conflicts
    scene.add(fillLight);
    
    console.log("Enhanced lighting setup complete - lighting should now be visible");
}

// Handle window resize
export function resizeRenderer() {
    if (!renderer || !camera) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
}

// Render the scene
export function render() {
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
}

// Get scene, camera and renderer
export function getRenderer() {
    return {
        scene,
        camera,
        renderer
    };
}

// Add an object to the scene
export function addToScene(object) {
    scene.add(object);
}

// Remove an object from the scene
export function removeFromScene(object) {
    scene.remove(object);
}
