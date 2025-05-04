// WebSocket connection for real-time notifications
let socket;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 5000;

// Initialize WebSocket connection
function initializeNotifications() {
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        return; // Already connected or connecting
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('WebSocket connection established');
            reconnectAttempts = 0; // Reset reconnection attempts on successful connection
        };

        socket.onmessage = (event) => {
            try {
                const notification = JSON.parse(event.data);
                showNotification(notification);
            } catch (error) {
                console.error('Error parsing notification:', error);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                setTimeout(initializeNotifications, RECONNECT_INTERVAL);
            } else {
                console.log('Max reconnection attempts reached. Please refresh the page.');
            }
        };
    } catch (error) {
        console.error('Error initializing WebSocket:', error);
    }
}

// Create and show notification
function showNotification(notification) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notificationElement = document.createElement('div');
    notificationElement.className = 'notification';
    notificationElement.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-bell"></i>
            <span>${notification.message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add notification to container
    container.appendChild(notificationElement);

    // Play notification sound
    playNotificationSound();

    // Auto remove notification after 5 seconds
    setTimeout(() => {
        if (notificationElement.parentElement) {
            notificationElement.remove();
        }
    }, 5000);
}

// Play notification sound
function playNotificationSound() {
    const audio = new Audio('/notification-sound.mp3');
    audio.play().catch(error => console.log('Error playing sound:', error));
}

// Send notification to specific user
function sendNotification(userId, message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'notification',
            userId,
            message
        }));
    }
}

// Initialize notifications when the page loads
document.addEventListener('DOMContentLoaded', initializeNotifications);

export { sendNotification };