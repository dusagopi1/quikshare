// home.js

// Function to format date
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// Function to create ride history item
function createRideHistoryItem(ride, isHosted) {
  const item = document.createElement('div');
  item.className = 'history-item';
  
  const icon = document.createElement('i');
  icon.className = 'fas fa-car';
  
  const details = document.createElement('div');
  details.className = 'ride-details';
  
  const route = document.createElement('h4');
  route.textContent = `${ride.pickup} → ${ride.drop}`;
  
  const info = document.createElement('p');
  if (isHosted) {
    info.textContent = `Date: ${formatDate(ride.createdAt)} | ${ride.passengers.length} passenger(s)`;
  } else {
    info.textContent = `Date: ${formatDate(ride.createdAt)} | Host: ${ride.hostId.firstName || 'Unknown'}`;
  }
  
  details.appendChild(route);
  details.appendChild(info);
  item.appendChild(icon);
  item.appendChild(details);
  
  return item;
}

// Function to fetch and display ride history
async function fetchAndDisplayHistory() {
  try {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    // Fetch ride history
    const response = await fetch('/api/user/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const history = await response.json();
    const hostedRides = history.hosted;
    const joinedRides = history.joined;

    // Display hosted rides
    const sharedHistoryContainer = document.getElementById('sharedHistory');
    sharedHistoryContainer.innerHTML = '';
    if (hostedRides.length === 0) {
      const noRidesMessage = document.createElement('p');
      noRidesMessage.className = 'no-rides-message';
      noRidesMessage.textContent = 'No hosted rides available';
      sharedHistoryContainer.appendChild(noRidesMessage);
    } else {
      hostedRides.forEach(ride => {
        sharedHistoryContainer.appendChild(createRideHistoryItem(ride, true));
      });
    }

    // Display joined rides
    const joinedHistoryContainer = document.getElementById('joinedHistory');
    joinedHistoryContainer.innerHTML = '';
    if (joinedRides.length === 0) {
      const noRidesMessage = document.createElement('p');
      noRidesMessage.className = 'no-rides-message';
      noRidesMessage.textContent = 'No joined rides available';
      joinedHistoryContainer.appendChild(noRidesMessage);
    } else {
      joinedRides.forEach(ride => {
        joinedHistoryContainer.appendChild(createRideHistoryItem(ride, false));
      });
    }
  } catch (error) {
    console.error('Error fetching ride history:', error);
  }
}

// Function to initialize WebSocket connection
let socket;

function initializeWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('WebSocket connection established');
  };

  socket.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    showNotification(notification);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
    // Attempt to reconnect after 5 seconds
    setTimeout(initializeWebSocket, 5000);
  };
}

// Function to show notification
function showNotification(notification) {
  const notificationsPanel = document.getElementById('notificationsPanel');
  
  const notificationItem = document.createElement('div');
  notificationItem.className = 'notification-item';
  notificationItem.innerHTML = `
    <i class="fas fa-bell"></i>
    <p>${notification.message}</p>
  `;

  // Add notification to panel
  notificationsPanel.insertBefore(notificationItem, notificationsPanel.firstChild);

  // Update notification badge
  const badge = document.querySelector('.notification-badge');
  const currentCount = parseInt(badge.textContent) || 0;
  badge.textContent = currentCount + 1;
  badge.style.display = 'inline';

  // Auto remove notification after 5 seconds
  setTimeout(() => {
    if (notificationItem.parentElement) {
      notificationItem.remove();
      const newCount = parseInt(badge.textContent) - 1;
      badge.textContent = newCount;
      badge.style.display = newCount > 0 ? 'inline' : 'none';
    }
  }, 5000);
}

document.addEventListener('DOMContentLoaded', function () {
  // Initialize WebSocket
  initializeWebSocket();

  // Initialize user information from localStorage
  const userFirstName = localStorage.getItem('userFirstName') || 'User';
  document.getElementById('userFirstName').textContent = userFirstName;

  // Get all necessary elements
  const hostBtn = document.getElementById('hostBtn');
  const joinBtn = document.getElementById('joinBtn');
  const notificationsBtn = document.getElementById('notificationsBtn');
  const editbtn = document.getElementById('editBtn');
  const historyBtn = document.getElementById('historyBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const notificationsPanel = document.getElementById('notificationsPanel');
  const historyPanel = document.getElementById('historyPanel');
  const tabButtons = document.querySelectorAll('.tab-button');

  // Navigation buttons click handlers
  hostBtn.addEventListener('click', () => {
    window.location.href = 'host.html';
  });

  joinBtn.addEventListener('click', () => {
    window.location.href = 'join.html';
  });

  historyBtn.addEventListener('click', () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'index.html';
      return;
    }
    window.location.href = 'history.html';
  });

  // Navigate to notifications page
  notificationsBtn.addEventListener('click', () => {
    window.location.href = 'notification.html';
  });
  editbtn.addEventListener('click', () => {
    window.location.href = 'edit.html';
  });
  // Toggle history panel
  historyBtn.addEventListener('click', () => {
    historyPanel.classList.toggle('active');
    notificationsPanel.classList.remove('active');
  });

  // Handle history tabs
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.history-content').forEach(content => {
        content.classList.remove('active');
      });

      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(`${tabId}History`).classList.add('active');
    });
  });

  // Handle logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('userFirstName');
    window.location.href = 'index.html';
  });
  // Close panels when clicking outside
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.notifications-panel') && 
        !event.target.closest('#notificationsBtn') &&
        !event.target.closest('.history-panel') &&
        !event.target.closest('#historyBtn')) {
      notificationsPanel.classList.remove('active');
      historyPanel.classList.remove('active');
    }
  });
});
  