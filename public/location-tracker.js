// Initialize WebSocket connection
let socket;
let wsRetryCount = 0;
let wsReconnectTimer = null;
const WS_MAX_RETRIES = 5;
const WS_RETRY_DELAY = 3000; // 3 seconds

// Initialize WebSocket with enhanced retry mechanism
function initializeWebSocket() {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
    }

    const wsUrl = `ws://${window.location.host}`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log('WebSocket connection established');
        wsRetryCount = 0; // Reset retry count on successful connection
        showNotification('Connected to location tracking server', 'success');
    };

    socket.onclose = (event) => {
        if (!event.wasClean && wsRetryCount < WS_MAX_RETRIES) {
            wsRetryCount++;
            showNotification(`Connection lost. Retrying (${wsRetryCount}/${WS_MAX_RETRIES})...`, 'warning');
            wsReconnectTimer = setTimeout(initializeWebSocket, WS_RETRY_DELAY * wsRetryCount);
        } else if (wsRetryCount >= WS_MAX_RETRIES) {
            showNotification('Unable to connect to location tracking server. Please refresh the page.', 'error');
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        showNotification('Connection error. Attempting to reconnect...', 'error');
    };
}

// Initialize Leaflet map variables
let map;
let markers = {};
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
let currentRideId = null;

// Initialize map
export function initializeMap(containerId) {
    if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
    }

    // Initialize OpenStreetMap with Leaflet
    map = L.map(containerId).setView([0, 0], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add legend to distinguish between host and joined users
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `
            <div style="background: white; padding: 10px; border-radius: 5px;">
                <div><i class="fas fa-car" style="color: blue;"></i> Host</div>
                <div><i class="fas fa-user" style="color: green;"></i> Joined User</div>
            </div>
        `;
        return div;
    };
    legend.addTo(map);
}

// Start sharing location
export function startLocationSharing(userId, rideId = null) {
    currentRideId = rideId;
    
    // Initialize WebSocket if not already connected
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        initializeWebSocket();
    }
    const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    };

    // Watch position
    const watchId = navigator.geolocation.watchPosition(
        position => {
            const { latitude, longitude } = position.coords;
            
            // Send location to server with ride information
            socket.send(JSON.stringify({
                type: 'location',
                data: {
                    userId,
                    rideId: currentRideId,
                    latitude,
                    longitude,
                    isHost: !currentRideId // If no rideId, user is a host
                }
            }));

            // Update or create marker for current user
            if (markers[userId]) {
                markers[userId].setLatLng([latitude, longitude]);
            } else {
                const isHost = !currentRideId;
                const icon = L.divIcon({
                    html: `<i class="fas ${isHost ? 'fa-car' : 'fa-user'}" style="color: ${isHost ? 'blue' : 'green'}; font-size: 24px;"></i>`,
                    className: 'custom-marker',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                
                markers[userId] = L.marker([latitude, longitude], {
                    icon: icon,
                    title: isHost ? 'Host Location' : 'Your Location'
                }).addTo(map);
            }

            // Center map on user's location
            map.setView([latitude, longitude]);
        },
        error => {
            handleLocationError(error, userId);
        },
        options
    );

    // Handle incoming WebSocket messages
    socket.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data.type === 'location') {
            const { userId: otherUserId, rideId, latitude, longitude, isHost } = data.data;
            
            // Only show markers for users in the same ride
            if (otherUserId !== userId && (!currentRideId || rideId === currentRideId)) {
                // Update or create marker for other user
                if (markers[otherUserId]) {
                    markers[otherUserId].setLatLng([latitude, longitude]);
                } else {
                    const icon = L.divIcon({
                        html: `<i class="fas ${isHost ? 'fa-car' : 'fa-user'}" style="color: ${isHost ? 'blue' : 'green'}; font-size: 24px;"></i>`,
                        className: 'custom-marker',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    
                    markers[otherUserId] = L.marker([latitude, longitude], {
                        icon: icon,
                        title: isHost ? 'Host Location' : 'Joined User'
                    }).addTo(map);
                }
            }
        }
    };

    return watchId;
}

// Handle location errors with enhanced retry mechanism
function handleLocationError(error, userId) {
    let errorMessage = '';
    let shouldRetry = false;
    
    switch(error.code) {
        case 1: // Permission denied
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings and refresh the page.';
            showNotification(errorMessage, 'error', 10000); // Show for longer duration
            break;
        case 2: // Position unavailable
            errorMessage = 'Location unavailable. Please check your GPS settings and ensure you have a clear signal.';
            shouldRetry = true;
            break;
        case 3: // Timeout
            errorMessage = 'Location request timed out. Retrying...';
            shouldRetry = true;
            break;
        default:
            errorMessage = 'Error getting location. Please check your device settings.';
            shouldRetry = true;
    }

    console.error('Location Error:', error.code, errorMessage);
    showNotification(errorMessage, shouldRetry ? 'warning' : 'error');

    // Enhanced retry mechanism with exponential backoff
    if (shouldRetry && retryCount < MAX_RETRIES) {
        retryCount++;
        const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount - 1);
        showNotification(`Retrying location access... Attempt ${retryCount} of ${MAX_RETRIES}`, 'info');
        
        setTimeout(() => {
            startLocationSharing(userId, currentRideId);
        }, backoffDelay);
    } else if (retryCount >= MAX_RETRIES) {
        showNotification('Unable to access location after multiple attempts. Please refresh the page or check your device settings.', 'error', 10000);
    }
}

// Show notification with enhanced control and styling
function showNotification(message, type = 'info', duration = 5000) {
    const notificationContainer = document.getElementById('notification-container') || document.body;
    const notification = document.createElement('div');
    notification.className = `notification ${type} notification-slide-in`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                ${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}
            </div>
            <p>${message}</p>
            <button class="notification-dismiss" onclick="this.parentElement.parentElement.remove()">
                Dismiss
            </button>
        </div>
    `;
    
    // Add progress bar for auto-dismiss
    if (duration > 0) {
        const progress = document.createElement('div');
        progress.className = 'notification-progress';
        notification.appendChild(progress);
        
        // Animate progress bar
        progress.style.animation = `notification-progress ${duration/1000}s linear`;
    }

    notificationContainer.appendChild(notification);

    // Auto-remove notification after specified duration
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.add('notification-slide-out');
            setTimeout(() => notification.remove(), 300); // Remove after slide-out animation
        }, duration);
    }
}

// Stop sharing location
export function stopLocationSharing(watchId) {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
    
    // Remove all markers
    Object.values(markers).forEach(marker => marker.remove());
    markers = {};

    // Close WebSocket connection
    if (socket.readyState === WebSocket.OPEN) {
        socket.close();
    }
}