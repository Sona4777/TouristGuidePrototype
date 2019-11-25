// Global attractions array
let attractions = [];

// Fetch JSON data and store in global variable
fetch('data/attraction.json')
    .then(response => response.json())
    .then(data => {
        attractions = data;
        // Trigger main.js functions AFTER JSON loads
        if (typeof initPage === "function") {
            initPage();
        }
    })
    .catch(error => console.error('Error loading attraction data:', error));
