// src/game/loadingScreen.js - Loading screen implementation

// Create and manage the loading screen
export class LoadingScreen {
    constructor() {
        this.element = null;
        this.progressBar = null;
        this.messageElement = null;
        this.isActive = false;
        this.progress = 0;
        this.callbacks = [];
    }
    
    // Initialize and create the loading screen DOM elements
    init() {
        // Check if already initialized
        if (this.element) return;
        
        // Create loading screen container
        this.element = document.createElement('div');
        this.element.id = 'loading-screen';
        this.element.style.display = 'none';
        
        // Add content
        this.element.innerHTML = `
            <h1>LABYRINTH LEGACY</h1>
            <h2 id="loading-message">Preparing Next Floor...</h2>
            <div id="loading-bar-container">
                <div id="loading-bar"></div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(this.element);
        
        // Get references to elements
        this.progressBar = document.getElementById('loading-bar');
        this.messageElement = document.getElementById('loading-message');
    }
    
    // Show the loading screen with initial message
    show(message = 'Loading...') {
        this.init();
        
        // Reset progress
        this.progress = 0;
        this.updateProgress(0);
        
        // Set message
        this.setMessage(message);
        
        // Show element
        this.element.style.display = 'flex';
        this.element.style.opacity = '1';
        
        // Flag as active
        this.isActive = true;
        
        // Clear any existing callbacks
        this.callbacks = [];
    }
    
    // Hide the loading screen
    hide() {
        if (!this.element) return;
        
        // Add fade-out effect
        this.element.style.opacity = '0';
        
        // Hide after transition
        setTimeout(() => {
            if (this.element) {
                this.element.style.display = 'none';
            }
            this.isActive = false;
            
            // Execute callbacks
            this.callbacks.forEach(callback => callback());
            this.callbacks = [];
        }, 500); // Match transition time in CSS
    }
    
    // Update the progress bar (value between 0 and 100)
    updateProgress(value) {
        this.progress = Math.min(Math.max(value, 0), 100);
        
        if (this.progressBar) {
            this.progressBar.style.width = `${this.progress}%`;
        }
        
        // Auto-hide when 100%
        if (this.progress >= 100) {
            // Small delay before hiding to show completed progress bar
            setTimeout(() => this.hide(), 500);
        }
    }
    
    // Increment the progress bar by a specific amount
    incrementProgress(amount) {
        this.updateProgress(this.progress + amount);
    }
    
    // Set the loading message
    setMessage(message) {
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }
    }
    
    // Add a callback to execute after loading screen is hidden
    addCallback(callback) {
        if (typeof callback === 'function') {
            this.callbacks.push(callback);
        }
    }
    
    // Check if loading screen is active
    isShowing() {
        return this.isActive;
    }
}

// Export a singleton instance
export const loadingScreen = new LoadingScreen();
