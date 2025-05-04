let map, userMarker, socket, roomId;
const markers = {};
let myUserId = null;

window.initMap = function () {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 0, lng: 0 },
    zoom: 2
  });
};

document.getElementById('join-btn').onclick = () => {
  roomId = document.getElementById('room-input').value.trim();
  if (!roomId) return alert('Please enter a room ID');
  document.getElementById('room-form').style.display = 'none';
  startSocket();
};

function startSocket() {
  socket = io();

  socket.emit('join-room', roomId);

  socket.on('user-id', (id) => {
    myUserId = id;
  
    // Send my current location to others as soon as I get my userId
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        socket.emit('location-update', { lat: latitude, lng: longitude });
      });
    }
  });

  socket.on('existing-users', (users) => {
    // Show existing users on map
    users.forEach(user => {
      if (user.userId !== myUserId && !markers[user.userId]) {
        markers[user.userId] = new google.maps.Marker({
          map,
          label: `User ${user.userId}`,
          icon: { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }
        });
      }
      if (markers[user.userId]) {
        markers[user.userId].setPosition({ lat: user.lat, lng: user.lng });
      }
    });
  });

  socket.on('location-update', (data) => {
    // When location is updated, move the corresponding marker
    if (data.userId !== myUserId) {
      if (!markers[data.userId]) {
        markers[data.userId] = new google.maps.Marker({
          map,
          label: `User ${data.userId}`,
          icon: { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }
        });
      }
      markers[data.userId].setPosition({ lat: data.lat, lng: data.lng });
    }
  });

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!userMarker) {
          userMarker = new google.maps.Marker({
            map,
            label: 'You',
            icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }
          });
          map.setCenter({ lat: latitude, lng: longitude });
          map.setZoom(15);
        }
        userMarker.setPosition({ lat: latitude, lng: longitude });
        socket.emit('location-update', { lat: latitude, lng: longitude });
      },
      (err) => {
        alert('Geolocation error: ' + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 30000 }
    );
  } else {
    alert('Geolocation not supported.');
  }
}
