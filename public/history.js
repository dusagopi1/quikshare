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

// Function to fetch and display hosted rides
async function fetchHostedRides() {
  const hostedContainer = document.getElementById('hostedHistory');
  const loadingSpinner = document.getElementById('hostedLoadingSpinner');
  const noRidesMessage = document.getElementById('noHostedRides');

  try {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const response = await fetch('/api/user/history', { headers });

    const history = await response.json();
    loadingSpinner.classList.add('hidden');

    if (history.hosted.length === 0) {
      noRidesMessage.classList.remove('hidden');
      return;
    }

    history.hosted.forEach(ride => {
      hostedContainer.appendChild(createRideHistoryItem(ride, true));
    });
  } catch (error) {
    console.error('Error fetching hosted rides:', error);
    loadingSpinner.classList.add('hidden');
    noRidesMessage.classList.remove('hidden');
  }
}

// Function to fetch and display joined rides
async function fetchJoinedRides() {
  const joinedContainer = document.getElementById('joinedHistory');
  const loadingSpinner = document.getElementById('joinedLoadingSpinner');
  const noRidesMessage = document.getElementById('noJoinedRides');

  try {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const response = await fetch('/api/user/history', { headers });

    const history = await response.json();
    loadingSpinner.classList.add('hidden');

    if (history.joined.length === 0) {
      noRidesMessage.classList.remove('hidden');
      return;
    }

    history.joined.forEach(ride => {
      joinedContainer.appendChild(createRideHistoryItem(ride, false));
    });
  } catch (error) {
    console.error('Error fetching joined rides:', error);
    loadingSpinner.classList.add('hidden');
    noRidesMessage.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // Handle tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  const historyContents = document.querySelectorAll('.history-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      historyContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(`${tabId}History`).classList.add('active');
    });
  });

  // Handle logout
  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
  });

  // Fetch initial ride data
  fetchHostedRides();
  fetchJoinedRides();
});