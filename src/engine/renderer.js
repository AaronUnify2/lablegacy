// src/engine/renderer.js - Enhanced Three.js renderer for first-person view

import * as THREE from 'three';

// Global renderer variables
let scene, camera, renderer;
let canvas;

// First-person specific settings
let cameraShake = { x: 0, y: 0, z: 0 };
let cameraBob = { x: 0, y: 0, z: 0 };
let baseCamera = { position: new THREE.Vector3(), rotation: new THREE.Euler() };

// Setup Three.js renderer with first-person optimizations
export function setupRenderer() {
    // Get canvas element
    canvas = document.getElementById('game-canvas');
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // Slightly lighter background for better contrast
    
    // Setup fog for atmosphere - REDUCED density for first-person view
    scene.fog = new THREE.FogExp2(0x000000, 0.01); // Further reduced from 0.015 for better visibility
    
    // Create perspective camera optimized for first-person
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(
        75,  // Field of view - good for first-person
        aspectRatio, 
        0.1, // Near plane - very close for first-person
        1000 // Far plane
    );
    
    // Set initial camera position (will be overridden by game)
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    // Create renderer with first-person optimizations
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        powerPreference: "high-performance", // Request high-performance GPU
        stencil: false, // Disable stencil buffer if not needed
        depth: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    
    // Enable shadows for immersive first-person experience
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    
    // Enhanced rendering settings for first-person view
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    // Optimize for first-person performance
    renderer.sortObjects = true; // Enable object sorting for better rendering order
    renderer.autoClear = true;
    
    // Setup enhanced lighting for first-person view
    setupLighting();
    
    // Apply initial sizing
    resizeRenderer();
    
    console.log('Renderer initialized for first-person view with enhanced settings');
    
    return {
        scene,
        camera,
        renderer
    };
}

// Enhanced lighting system for first-person view
function setupLighting() {
    // Brighter ambient light for better visibility in first-person
    const ambientLight = new THREE.AmbientLight(0x666666, 0.9); // Further increased for first-person
    scene.add(ambientLight);
    
    // Enhanced directional light for better depth perception
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4); // Increased intensity
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    
    // Enhanced shadow settings for first-person immersion
    directionalLight.shadow.mapSize.width = 2048; // Higher resolution shadows
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    directionalLight.shadow.bias = -0.0001; // Reduce shadow acne
    
    scene.add(directionalLight);
    
    // Additional fill light for better illumination in first-person
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5); // Increased intensity
    fillLight.position.set(-5, 8, -7);
    fillLight.castShadow = false;
    scene.add(fillLight);
    
    // Add hemisphere light for more natural lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362d1d, 0.3);
    scene.add(hemisphereLight);
    
    console.log("Enhanced lighting setup complete for first-person view");
}

// Handle window resize with first-person considerations
export function resizeRenderer() {
    if (!renderer || !camera) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    
    // Update pixel ratio on resize (useful for mobile orientation changes)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// Enhanced render function with first-person effects
export function render() {
    if (!renderer || !scene || !camera) return;
    
    // Apply camera effects before rendering
    applyCameraEffects();
    
    renderer.render(scene, camera);
}

// Apply first-person camera effects (shake, bob, etc.)
function applyCameraEffects() {
    // Store base camera transform if not already stored
    if (baseCamera.position.length() === 0) {
        baseCamera.position.copy(camera.position);
        baseCamera.rotation.copy(camera.rotation);
    }
    
    // Apply camera shake
    camera.position.x = baseCamera.position.x + cameraShake.x;
    camera.position.y = baseCamera.position.y + cameraShake.y + cameraBob.y;
    camera.position.z = baseCamera.position.z + cameraShake.z;
    
    // Apply camera bob rotation
    camera.rotation.x = baseCamera.rotation.x + cameraBob.x;
    camera.rotation.z = baseCamera.rotation.z + cameraBob.z;
}

// Set camera shake for impact effects
export function setCameraShake(intensity, duration = 0.5) {
    const maxShake = 0.1;
    const shakeAmount = Math.min(intensity * maxShake, maxShake);
    
    // Apply random shake
    cameraShake.x = (Math.random() - 0.5) * shakeAmount;
    cameraShake.y = (Math.random() - 0.5) * shakeAmount;
    cameraShake.z = (Math.random() - 0.5) * shakeAmount;
    
    // Gradually reduce shake over time
    const reduceShake = () => {
        cameraShake.x *= 0.9;
        cameraShake.y *= 0.9;
        cameraShake.z *= 0.9;
        
        if (Math.abs(cameraShake.x) > 0.001) {
            setTimeout(reduceShake, 16); // ~60fps
        } else {
            // Reset shake when it's negligible
            cameraShake.x = cameraShake.y = cameraShake.z = 0;
        }
    };
    
    setTimeout(reduceShake, 16);
}

// Set camera bob for walking effect
export function setCameraBob(bobVector) {
    cameraBob.x = bobVector.x * 0.5; // Reduced intensity for subtle effect
    cameraBob.y = bobVector.y;
    cameraBob.z = bobVector.z * 0.3; // Subtle roll effect
}

// Update base camera position (called by game when camera moves)
export function updateBaseCameraTransform(position, rotation) {
    baseCamera.position.copy(position);
    baseCamera.rotation.copy(rotation);
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

// First-person specific: Enable/disable certain rendering features
export function setFirstPersonMode(enabled) {
    if (enabled) {
        // Optimize for first-person rendering
        renderer.shadowMap.enabled = true;
        scene.fog.density = 0.01; // Lighter fog for better visibility
        
        // Adjust field of view for first-person comfort
        camera.fov = 75;
        camera.updateProjectionMatrix();
        
        console.log('Renderer optimized for first-person view');
    } else {
        // Third-person settings
        renderer.shadowMap.enabled = true;
        scene.fog.density = 0.015; // Denser fog for atmosphere
        
        // Wider field of view for third-person
        camera.fov = 60;
        camera.updateProjectionMatrix();
        
        console.log('Renderer set for third-person view');
    }
}

// Adjust rendering quality based on performance
export function setRenderQuality(quality) {
    switch (quality) {
        case 'low':
            renderer.shadowMap.enabled = false;
            renderer.setPixelRatio(1);
            scene.fog.density = 0.02; // Heavier fog to hide LOD
            break;
            
        case 'medium':
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.BasicShadowMap;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            scene.fog.density = 0.015;
            break;
            
        case 'high':
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            scene.fog.density = 0.01;
            break;
            
        default:
            console.warn('Unknown render quality:', quality);
            break;
    }
    
    console.log(`Render quality set to: ${quality}`);
}

// Get current rendering statistics
export function getRenderStats() {
    return {
        triangles: renderer.info.render.triangles,
        calls: renderer.info.render.calls,
        textures: renderer.info.memory.textures,
        geometries: renderer.info.memory.geometries,
        fps: 1000 / renderer.info.render.frame
    };
}

// Clean up renderer resources
export function dispose() {
    if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.context = null;
        renderer.domElement = null;
        renderer = null;
    }
    
    scene = null;
    camera = null;
    canvas = null;
    
    console.log('Renderer resources cleaned up');
}

// Set up post-processing effects for first-person immersion
export function setupPostProcessing() {
    // This would be expanded with post-processing effects like:
    // - Screen space ambient occlusion (SSAO)
    // - Bloom effects
    // - Depth of field
    // - Motion blur
    
    console.log('Post-processing setup (placeholder for future effects)');
}

// Dynamic LOD (Level of Detail) management for performance
export function updateLOD(cameraPosition, objects) {
    // Placeholder for dynamic LOD system
    // Would adjust object detail based on distance from camera
    // Important for first-person games where objects close to camera need high detail
    
    for (const object of objects) {
        if (object.userData && object.userData.lodLevels) {
            const distance = cameraPosition.distanceTo(object.position);
            // LOD logic would go here
        }
    }
}

// First-person specific: Adjust near plane dynamically to prevent clipping
export function adjustNearPlane(playerRadius = 0.4) {
    const minNear = 0.01;
    const maxNear = 0.5;
    
    // Adjust near plane based on player size to prevent wall clipping
    camera.near = Math.max(minNear, Math.min(maxNear, playerRadius * 0.1));
    camera.updateProjectionMatrix();
}

// Handle fullscreen changes
export function handleFullscreenChange() {
    // Resize renderer when entering/exiting fullscreen
    setTimeout(() => {
        resizeRenderer();
    }, 100); // Small delay to ensure dimensions are updated
}

// Performance monitoring for first-person games
export function monitorPerformance(callback) {
    const stats = getRenderStats();
    const memoryInfo = performance.memory;
    
    const performanceData = {
        ...stats,
        memory: {
            used: memoryInfo ? memoryInfo.usedJSHeapSize : 0,
            total: memoryInfo ? memoryInfo.totalJSHeapSize : 0,
            limit: memoryInfo ? memoryInfo.jsHeapSizeLimit : 0
        },
        timestamp: performance.now()
    };
    
    if (callback) {
        callback(performanceData);
    }
    
    return performanceData;
}

// Export camera effects for external use
window.setCameraShake = setCameraShake;
window.setCameraBob = setCameraBob;
