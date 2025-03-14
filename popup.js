// Popup Script for Chrome Extension
'use strict';

/**
 * Main initialization function that runs when the popup is loaded
 */
function initializePopup() {
    setupUIElements();
    attachEventListeners();
}

/**
 * Set up and initialize UI elements
 */
function setupUIElements() {
    const container = document.getElementById('popup-container');
    if (container) {
        container.classList.add('initialized');
    }
}

/**
 * Attach event listeners to interactive elements
 */
function attachEventListeners() {
    // Example: Setup button click handlers
    const buttons = document.querySelectorAll('.action-button');
    buttons.forEach(button => {
        button.addEventListener('click', handleButtonClick);
    });
}

/**
 * Handle button click events
 * @param {Event} event - The click event object
 */
function handleButtonClick(event) {
    const button = event.currentTarget;
    const action = button.dataset.action;
    
    console.log(`Button clicked with action: ${action}`);
    // Add your click handling logic here
}

// Initialize the popup when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializePopup); 