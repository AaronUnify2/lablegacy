// src/engine/utils.js - Helper functions for the game

// Generate a random integer between min and max (inclusive)
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a random float between min and max
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// Generate a random item from an array
export function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Generate a random boolean with a given probability
export function randomBool(probability = 0.5) {
    return Math.random() < probability;
}

// Clamp a value between min and max
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Linear interpolation between two values
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Calculate distance between two points
export function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Check if two rectangles overlap
export function rectanglesOverlap(rect1, rect2) {
    return !(
        rect1.x + rect1.width < rect2.x ||
        rect1.x > rect2.x + rect2.width ||
        rect1.y + rect1.height < rect2.y ||
        rect1.y > rect2.y + rect2.height
    );
}

// Convert degrees to radians
export function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

// Convert radians to degrees
export function radToDeg(radians) {
    return radians * 180 / Math.PI;
}

// Get a color with a random variation
export function randomizeColor(baseColor, variation = 0.1) {
    // Parse the base color
    const r = (baseColor >> 16) & 255;
    const g = (baseColor >> 8) & 255;
    const b = baseColor & 255;
    
    // Apply random variation
    const newR = clamp(r + randomInt(-r * variation, r * variation), 0, 255);
    const newG = clamp(g + randomInt(-g * variation, g * variation), 0, 255);
    const newB = clamp(b + randomInt(-b * variation, b * variation), 0, 255);
    
    // Combine back into a hex color
    return (newR << 16) | (newG << 8) | newB;
}

// Create a simple unique ID
export function generateId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

// Format a number with commas for thousands
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Format time in seconds to MM:SS format
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Debounce a function to prevent multiple calls
export function debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Simple event system
export class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }
    
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        
        this.events[eventName] = this.events[eventName].filter(
            cb => cb !== callback
        );
    }
    
    emit(eventName, ...args) {
        if (!this.events[eventName]) return;
        
        this.events[eventName].forEach(callback => {
            callback(...args);
        });
    }
}

// Load a texture and return a promise
export function loadTexture(url) {
    return new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(
            url,
            texture => resolve(texture),
            undefined,
            err => reject(err)
        );
    });
}

// Load a 3D model and return a promise
export function loadModel(url) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.GLTFLoader();
        loader.load(
            url,
            gltf => resolve(gltf),
            undefined,
            err => reject(err)
        );
    });
}

// Create a simple physics raycast
export function raycast(origin, direction, distance, objects) {
    const raycaster = new THREE.Raycaster(origin, direction, 0, distance);
    return raycaster.intersectObjects(objects, true);
}

// Create a simple ease-in-out function
export function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
