// Initialize location tracking and map selection functions
let initializeMap, startLocationSharing, stopLocationSharing;
let initializeSelectionMap;

// Import location tracking and map selection functions
async function initializeLocationTracking() {
    const locationModule = await import('./location-tracker.js');
    const mapSelectionModule = await import('./map-selection.js');
    initializeMap = locationModule.initializeMap;
    startLocationSharing = locationModule.startLocationSharing;
    stopLocationSharing = locationModule.stopLocationSharing;
    initializeSelectionMap = mapSelectionModule.initializeSelectionMap;
}

// DOM Elements
const hostRideBtn = document.getElementById("hostRideBtn");
const hostRideModal = document.getElementById("hostRideModal");
const joinbtn = document.getElementById("joinRideBtn");

joinbtn.addEventListener('click', function () {
    window.location.href = 'join.html';
});

// --- Removed Firebase listeners and replaced with placeholders for backend/WebSocket integration ---
// You should implement real-time updates using your backend API or WebSocket as needed.
function initializeRideListeners(rideId) {
    // Example: Listen for join requests and location updates via WebSocket or polling
    // This is a placeholder for your implementation.
    // Remove this comment and add your WebSocket or REST polling logic here.
}

// Handle join request response
async function handleJoinRequest(rideId, requestId, userId, isAccepted) {
    try {
        // WebSocket connection for real-time updates
const websocket = new WebSocket('ws://localhost:3000');

// Handle incoming WebSocket messages
websocket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'new_joiner') {
        showNotification(`${message.joinerDetails.joinerName || 'A user'} wants to join your ride!`);
    }
});

// Replace with your backend API call to accept/reject join requests
        const token = localStorage.getItem('token');
        const url = `/api/rides/${rideId}/joinRequests/${requestId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId, isAccepted })
        });
        if (!response.ok) {
            throw new Error('Failed to process join request');
        }
        if (isAccepted) {
            showNotification('Ride request accepted! Redirecting to location sharing...');
            window.location.href = `location-sharing.html?rideId=${rideId}&isHost=true`;
        } else {
            showNotification('Ride request rejected.');
        }
        // Remove the notification from UI
        const notification = document.querySelector('.join-request');
        if (notification) {
            notification.remove();
        }
    } catch (error) {
        console.error('Error handling join request:', error);
        showNotification('Failed to process join request. Please try again.');
    }
}

// Update rider's location on map
function updateRiderLocation(userId, location) {
    // Update the marker on the map
    if (typeof updateMarker === 'function') {
        updateMarker(userId, location.latitude, location.longitude, false);
    }
}

// Show notification helper
function showNotification(message, duration = 5000) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content">
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), duration);
}

// Create map container
const mapContainer = document.createElement('div');
mapContainer.id = 'map';
mapContainer.style.display = 'none';
mapContainer.style.height = '300px';
mapContainer.style.marginTop = '20px';
document.body.appendChild(mapContainer);

// Load available rides when page loads
async function loadAvailableRides() {
    try {
        const response = await fetch('/api/rides');
        const rides = await response.json();
        const ridesContainer = document.createElement('div');
        ridesContainer.className = 'rides-container';
        ridesContainer.innerHTML = `
            <h2>Available Rides</h2>
            <div class="rides-list">
                ${rides.map(ride => `
                    <div class="ride-card">
                        <h3>${ride.pickup} → ${ride.drop}</h3>
                        <p>Fare: ₹${ride.fare}</p>
                        <p>Available Seats: ${ride.seats - ride.passengers.length}</p>
                        <p>Status: ${ride.status}</p>
                    </div>
                `).join('')}
            </div>
        `;
        // Insert rides container after the dashboard
        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            dashboard.parentNode.insertBefore(ridesContainer, dashboard.nextSibling);
        }
    } catch (error) {
        console.error('Error loading rides:', error);
    }
}
function initializeElements() {
    // Re-query DOM elements
    const hostRideBtn = document.getElementById("hostRideBtn");
    const hostRideModal = document.getElementById("hostRideModal");
    const joinbtn = document.getElementById("joinRideBtn");
    
    if (hostRideBtn && hostRideModal) {
        hostRideBtn.addEventListener('click', function () {
            // Load the form FIRST
            loadHostRideForm();
            
            // Then initialize the map
            hostRideModal.style.display = 'block';
            initializeSelectionMap('map');
            mapContainer.style.display = 'block';
        });
    }
}

// Load rides when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await initializeLocationTracking();
    initializeElements();
    loadAvailableRides();
});

// Load Form Dynamically
function loadHostRideForm() {
    if (!hostRideModal) return;
    
    hostRideModal.innerHTML = `
        <div class="modal-content">
            <h2>Host a Ride</h2>
            <form id="rideForm">
                <div class="form-group">
                    <label for="pickup">Pickup Location</label>
                    <input type="text" id="pickup" required readonly>
                    <div id="pickupMap" style="height: 200px; margin-top: 10px;"></div>
                </div>
                <div class="form-group">
                    <label for="drop">Drop Location</label>
                    <input type="text" id="drop" required readonly>
                    <div id="dropMap" style="height: 200px; margin-top: 10px;"></div>
                </div>
                <div class="form-group">
                    <label for="fare">Total Fare (₹)</label>
                    <input type="number" id="fare" min="1" required>
                </div>
                <div class="form-group">
                    <label for="seats">Seats Available</label>
                    <input type="number" id="seats" min="1" required>
                </div>
                <div class="form-group">
                    <label for="secretCode">Secret Code (Required)</label>
                    <input type="text" id="secretCode" required minlength="4" maxlength="8" pattern="[A-Za-z0-9]+" title="4-8 characters, letters and numbers only">
                    <small class="form-hint">Create a 4-8 character code (letters and numbers only)</small>
                </div>
                <div class="form-group">
                    <label for="notes">Notes (Optional)</label>
                    <textarea id="notes" rows="2"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" id="cancelBtn" class="btn btn-cancel">Cancel</button>
                    <button type="submit" class="btn btn-submit">Host Ride</button>
                </div>
            </form>
        </div>
    `;
    
    // Close Modal
    const cancelBtn = document.getElementById("cancelBtn");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            hostRideModal.style.display = "none";
        });
    }
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === hostRideModal) {
            hostRideModal.style.display = "none";
        }
    });
    // Initialize maps for location selection
    const pickupMap = initializeSelectionMap('pickupMap');
    const dropMap = initializeSelectionMap('dropMap');
    // Handle location selection events
    let pickupData = null;
    let dropData = null;
    window.addEventListener('locationSelected', (event) => {
        const { address, latitude, longitude } = event.detail;
        const activeElement = document.activeElement;
        const pickupInput = document.getElementById('pickup');
        const dropInput = document.getElementById('drop');
        if (activeElement.closest('#pickupMap') || pickupInput === activeElement) {
            pickupInput.value = address;
            pickupData = { latitude, longitude, address };
        } else if (activeElement.closest('#dropMap') || dropInput === activeElement) {
            dropInput.value = address;
            dropData = { latitude, longitude, address };
        }
    });
    // Handle Form Submit
    const rideForm = document.getElementById("rideForm");
    if (rideForm) {
        rideForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            try {
                // Check if user is authenticated
                const token = localStorage.getItem('token');
                if (!token) {
                    alert('Please login first to host a ride');
                    window.location.href = 'login.html';
                    return;
                }
                if (!pickupData || !dropData) {
                    alert('Please select both pickup and drop locations from the map');
                    return;
                }
                const secretCode = document.getElementById("secretCode").value;
                if (!secretCode.match(/^[A-Za-z0-9]{4,8}$/)) {
                    throw new Error('Secret code must be 4-8 characters long and contain only letters and numbers');
                }

                const rideData = {
                    pickup: pickupData.address,
                    pickupCoords: {
                        latitude: pickupData.latitude,
                        longitude: pickupData.longitude
                    },
                    drop: dropData.address,
                    dropCoords: {
                        latitude: dropData.latitude,
                        longitude: dropData.longitude
                    },
                    fare: document.getElementById("fare").value,
                    seats: document.getElementById("seats").value,
                    notes: document.getElementById("notes").value,
                    secretCode: secretCode
                };
                const response = await fetch('/api/rides/host', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(rideData)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to host ride');
                }
                const result = await response.json();
                alert('Ride hosted successfully!');
                window.location.href = 'map.html';  // Redirect after successful submission

                hostRideModal.style.display = "none";
                // Initialize location sharing for host
                const userId = localStorage.getItem('userId');
                if (!map) {
                    initializeMap('map');
                }
                await startLocationSharing(userId, result.rideId);
                initializeRideListeners(result.rideId);
                // Show map
                mapContainer.style.display = 'block';
                loadAvailableRides(); // Refresh the rides list
            } catch (error) {
                alert(error.message || 'An error occurred while hosting the ride');
            }
        });
    }
}
