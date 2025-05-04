import { initializeMap, startLocationSharing } from './location-tracker.js';

// DOM Elements
const ridesList = document.getElementById('ridesList');
const pickupInput = document.getElementById('pickupSearch');
const dropInput = document.getElementById('dropSearch');

// Initialize WebSocket connection
let websocket;
try {
    websocket = new WebSocket('ws://localhost:3000');
    
    // Handle connection errors
    websocket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        showMessage('Connection error. Some real-time features may not work.');
    });
    
    // Handle connection close
    websocket.addEventListener('close', (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        if (event.code !== 1000) { // 1000 is normal closure
            showMessage('Connection lost. Please refresh the page for real-time updates.');
        }
    });
} catch (error) {
    console.error('Failed to establish WebSocket connection:', error);
}

// Create map container
const mapContainer = document.createElement('div');
mapContainer.id = 'map';
mapContainer.style.display = 'none';
mapContainer.style.height = '300px';
mapContainer.style.marginTop = '20px';
document.body.appendChild(mapContainer);

// Load all available rides
async function loadAllRides() {
    try {
        const response = await fetch('/api/rides');
        
        if (!response.ok) {
            throw new Error(`Failed to load rides: ${response.status}`);
        }
        
        const rides = await response.json();
        displayRides(rides);
    } catch (error) {
        console.error('Error:', error);
        showMessage('Failed to load rides. Please try again.');
    }
}

// Display rides with join buttons
function displayRides(rides) {
    if (!ridesList) return;

    if (!rides || rides.length === 0) {
        ridesList.innerHTML = '<div class="no-rides">No rides available at the moment</div>';
        return;
    }

    ridesList.innerHTML = `
        <div class="rides-container">
            <h2>Available Rides</h2>
            <div class="rides-list">
                ${rides.map(ride => `
                    <div class="ride-card" data-ride-id="${ride._id}">
                        <div class="ride-info">
                            <h3>${ride.pickup} → ${ride.drop}</h3>
                            <p><i class="fas fa-user"></i> ${ride.hostName || 'Host'}</p>
                            <p><i class="fas fa-rupee-sign"></i> ${ride.fare || '0'}</p>
                            <p><i class="fas fa-chair"></i> ${ride.seats - (ride.passengers?.length || 0)} seats left</p>
                            <p><i class="fas fa-key"></i> Secret Code: ${ride.secretCode}</p>
                        </div>
                        <button class="join-btn" ${(ride.seats - (ride.passengers?.length || 0)) <= 0 ? 'disabled' : ''}>
                            ${(ride.seats - (ride.passengers?.length || 0)) <= 0 ? 'FULL' : 'JOIN RIDE'}
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Add click handlers to all join buttons
    document.querySelectorAll('.join-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const rideCard = e.target.closest('.ride-card');
            const rideId = rideCard.dataset.rideId;
            
            // Show joining animation
            e.target.innerHTML = '<i class="fas fa-spinner fa-spin"></i> JOINING...';
            e.target.disabled = true;
            
            await joinRide(rideId);
            
            // Reset button state
            e.target.innerHTML = 'JOINED!';
        });
    });
}

// Join ride function
async function joinRide(rideId) {
    try {
        const rideCard = document.querySelector(`.ride-card[data-ride-id="${rideId}"]`);
        if (!rideCard) return;

        // Get basic ride info from the card
        const pickup = rideCard.querySelector('h3').textContent.split('→')[0].trim();
        const drop = rideCard.querySelector('h3').textContent.split('→')[1].trim();
        const hostName = rideCard.querySelector('.ride-info p:first-child').textContent.replace('Host', '').trim();

        // Store ride info in localStorage
        const rideInfo = {
            rideId,
            pickup,
            drop,
            hostName,
            joinedAt: new Date().toISOString()
        };
        localStorage.setItem('currentRide', JSON.stringify(rideInfo));

        // Show success message
        showPopupNotification('Ride Joined Successfully!', 'Redirecting to map view...');

        // Initialize map and location sharing
        await initializeLocationSharing(rideId);

        // Redirect to map page after a short delay
        setTimeout(() => {
            window.location.href ='map.html';
        }, 1500);

    } catch (error) {
        window.location.href ='map.html';
    }

    }



// Notify host about new joiner
function notifyHost(hostId, joinerDetails) {
    try {
        // Check if websocket is available and connected
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                type: 'new_joiner',
                hostId,
                joinerDetails,
                timestamp: new Date().toISOString()
            }));
            console.log('Notification sent to host:', hostId);
        } else {
            console.warn('WebSocket not available or not connected. Host notification will be handled by the server.');
            // The server should handle notifying the host through other means
            // like push notifications or when the host reconnects
        }
    } catch (error) {
        console.error('Error notifying host:', error);
    }
}

// Handle WebSocket messages
websocket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'confirmation') {
        showMessage(`Host acknowledged your join request!`);
    }
});

// Initialize location sharing
async function initializeLocationSharing(rideId) {
    try {
        mapContainer.style.display = 'block';
        await initializeMap('map');
        await startLocationSharing(rideId);
    } catch (error) {
        console.error('Location sharing error:', error);
    }
}

// Search functionality
const handleSearch = debounce(async () => {
    const pickup = pickupInput?.value?.trim();
    const drop = dropInput?.value?.trim();

    try {
        let url = '/api/rides?';
        if (pickup) url += `pickup=${encodeURIComponent(pickup)}&`;
        if (drop) url += `drop=${encodeURIComponent(drop)}`;

        const response = await fetch(url);
        const rides = await response.json();
        displayRides(rides);
    } catch (error) {
        console.error('Search error:', error);
    }
}, 300);

// Helper functions
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Simple flash message
function showMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'flash-message';
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

// Enhanced popup notification with title and message
function showPopupNotification(title, message, type = 'success') {
    // Create overlay for modal effect
    const overlay = document.createElement('div');
    overlay.className = 'notification-overlay';
    
    // Create popup container
    const popup = document.createElement('div');
    popup.className = `popup-notification ${type}`;
    
    // Add content
    popup.innerHTML = `
        <div class="popup-header">
            <h3>${title}</h3>
            <button class="close-btn">&times;</button>
        </div>
        <div class="popup-body">
            <p>${message}</p>
        </div>
        <div class="popup-footer">
            <button class="btn btn-primary confirm-btn">OK</button>
        </div>
    `;
    
    // Add to DOM
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Add event listeners
    const closeBtn = popup.querySelector('.close-btn');
    const confirmBtn = popup.querySelector('.confirm-btn');
    
    const closePopup = () => {
        document.body.removeChild(overlay);
    };
    
    closeBtn.addEventListener('click', closePopup);
    confirmBtn.addEventListener('click', closePopup);
    
    // Auto close after 8 seconds
    setTimeout(closePopup, 8000);
    
    // Add styles if not already in CSS
    if (!document.getElementById('popup-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'popup-notification-styles';
        style.textContent = `
            .notification-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            .popup-notification {
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                width: 90%;
                max-width: 400px;
                overflow: hidden;
                animation: popup-appear 0.3s ease-out;
            }
            .popup-notification.error {
                border-top: 4px solid #ff3b30;
            }
            .popup-notification.success {
                border-top: 4px solid #34c759;
            }
            .popup-header {
                padding: 15px 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .popup-header h3 {
                margin: 0;
                font-size: 18px;
            }
            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
            }
            .popup-body {
                padding: 20px;
                max-height: 300px;
                overflow-y: auto;
            }
            .popup-footer {
                padding: 15px 20px;
                border-top: 1px solid #eee;
                text-align: right;
            }
            .btn-primary {
                background-color: #007bff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            }
            @keyframes popup-appear {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Update ride card in UI after joining
function updateRideInUI(updatedRide) {
    const rideCard = document.querySelector(`.ride-card[data-ride-id="${updatedRide._id}"]`);
    if (!rideCard) return;
    
    // Update seats information
    const seatsInfo = rideCard.querySelector('.ride-info p:nth-child(3)');
    if (seatsInfo) {
        const remainingSeats = updatedRide.seats - updatedRide.passengers.length;
        seatsInfo.innerHTML = `<i class="fas fa-chair"></i> ${remainingSeats} seats left`;
    }
    
    // Update join button
    const joinBtn = rideCard.querySelector('.join-btn');
    if (joinBtn) {
        joinBtn.innerHTML = 'JOINED!';
        joinBtn.disabled = true;
        joinBtn.classList.add('joined');
    }
}

// Save joined ride to localStorage for persistence
function saveJoinedRide(ride) {
    // Get existing joined rides or initialize empty array
    const joinedRides = JSON.parse(localStorage.getItem('joinedRides') || '[]');
    
    // Add this ride if not already in the list
    if (!joinedRides.some(r => r._id === ride._id)) {
        joinedRides.push({
            _id: ride._id,
            pickup: ride.pickup,
            drop: ride.drop,
            joinedAt: new Date().toISOString()
        });
        
        // Save back to localStorage
        localStorage.setItem('joinedRides', JSON.stringify(joinedRides));
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAllRides();
    
    if (pickupInput && dropInput) {
        pickupInput.addEventListener('input', handleSearch);
        dropInput.addEventListener('input', handleSearch);
    }
});