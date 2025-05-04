// Map selection module for location picking

let map;
let pickupMarker;
let dropMarker;
let searchControl;
let currentMode = 'pickup'; // Track whether we're selecting pickup or drop location

// Initialize map for location selection
export function initializeSelectionMap(containerId) {
    // Initialize the map
    map = L.map(containerId, {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([20.5937, 78.9629], 5); // Default view centered on India

    // Add mode control panel
    const modeControl = L.control({position: 'topright'});
    modeControl.onAdd = function() {
        const container = L.DomUtil.create('div', 'leaflet-control-mode');
        container.innerHTML = `
            <div class="mode-buttons" style="background: white; padding: 8px; border-radius: 4px; box-shadow: 0 1px 5px rgba(0,0,0,0.4);">
                <button id="pickup-mode" class="mode-btn active" style="margin-right: 5px; padding: 6px 12px; border: none; border-radius: 4px; background: #4CAF50; color: white; cursor: pointer;">Pickup</button>
                <button id="drop-mode" class="mode-btn" style="padding: 6px 12px; border: none; border-radius: 4px; background: #f44336; color: white; cursor: pointer;">Drop</button>
            </div>
        `;

        // Add click handlers for mode buttons
        container.querySelector('#pickup-mode').addEventListener('click', () => setMode('pickup'));
        container.querySelector('#drop-mode').addEventListener('click', () => setMode('drop'));

        return container;
    };
    modeControl.addTo(map);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add a loading indicator
    const loadingControl = L.control({position: 'bottomright'});
    loadingControl.onAdd = function() {
        const container = L.DomUtil.create('div', 'leaflet-control-loading');
        container.innerHTML = '<div class="loading-indicator" style="display:none;">Loading...</div>';
        return container;
    };
    loadingControl.addTo(map);

    // Add search control (using OpenStreetMap Nominatim)
    searchControl = L.Control.extend({
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-control leaflet-control-search');
            container.innerHTML = `
                <input type="text" id="location-search" placeholder="Search location..." 
                    style="padding: 6px; width: 200px; border: 1px solid #ccc; border-radius: 4px;">
            `;
            
            const searchInput = container.querySelector('#location-search');
            searchInput.addEventListener('input', debounce(handleSearch, 500));
            
            return container;
        }
    });
    
    map.addControl(new searchControl({ position: 'topleft' }));

    // Add click handler for map
    map.on('click', handleMapClick);

    return map;
}

// Handle map clicks for marker placement
function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    updateMarkerPosition(lat, lng);
    reverseGeocode(lat, lng, currentMode);
}

// Update or create marker at position
function updateMarkerPosition(lat, lng) {
    const markerOptions = { 
        draggable: true,
        autoPan: true
    };

    if (currentMode === 'pickup') {
        if (pickupMarker) {
            pickupMarker.setLatLng([lat, lng]);
        } else {
            pickupMarker = L.marker([lat, lng], {
                ...markerOptions,
                icon: L.divIcon({
                    className: 'custom-div-icon',
                    html: '<div style="background-color: #4CAF50; padding: 5px; border-radius: 50%; color: white;">P</div>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                })
            }).addTo(map);
            pickupMarker.on('dragend', function(event) {
                const position = event.target.getLatLng();
                map.panTo(position);
                reverseGeocode(position.lat, position.lng, 'pickup');
            });
        }
    } else {
        if (dropMarker) {
            dropMarker.setLatLng([lat, lng]);
        } else {
            dropMarker = L.marker([lat, lng], {
                ...markerOptions,
                icon: L.divIcon({
                    className: 'custom-div-icon',
                    html: '<div style="background-color: #f44336; padding: 5px; border-radius: 50%; color: white;">D</div>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                })
            }).addTo(map);
            dropMarker.on('dragend', function(event) {
                const position = event.target.getLatLng();
                map.panTo(position);
                reverseGeocode(position.lat, position.lng, 'drop');
            });
        }
    }
    map.setView([lat, lng], 16);
}

// Search for locations
async function handleSearch(event) {
    const query = event.target.value;
    if (!query) return;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.length > 0) {
            const { lat, lon } = data[0];
            map.setView([lat, lon], 16);
            updateMarkerPosition(lat, lon);
            reverseGeocode(lat, lon);
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Reverse geocode coordinates to address
// Add styles for loading indicator and map controls
const styles = `
    .leaflet-control-loading {
        background: white;
        padding: 8px 15px;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
    }
    .loading-indicator {
        font-size: 13px;
        color: #555;
        font-weight: 500;
    }
    .leaflet-control-search {
        margin: 10px;
    }
    .leaflet-control-search input {
        font-size: 14px;
        padding: 10px 15px !important;
        width: 280px !important;
        border: 1px solid #ddd !important;
        border-radius: 6px !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
    }
    .leaflet-control-search input:focus {
        border-color: #4CAF50 !important;
        box-shadow: 0 2px 12px rgba(76,175,80,0.2);
        outline: none;
    }
    .mode-buttons {
        background: white;
        padding: 10px;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .mode-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        color: white;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
    }
    .mode-btn:first-child {
        margin-right: 8px;
    }
    #pickup-mode {
        background: #4CAF50;
    }
    #drop-mode {
        background: #f44336;
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles + `
    .mode-btn.active {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .mode-btn:not(.active) {
        opacity: 0.85;
    }
    .mode-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
    }
    .custom-div-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
    }
    .custom-div-icon:hover {
        transform: scale(1.1);
    }
`;

document.head.appendChild(styleSheet);

// Function to switch between pickup and drop modes
function setMode(mode) {
    currentMode = mode;
    
    // Update button states
    const pickupBtn = document.querySelector('#pickup-mode');
    const dropBtn = document.querySelector('#drop-mode');
    
    if (pickupBtn && dropBtn) {
        if (mode === 'pickup') {
            pickupBtn.classList.add('active');
            dropBtn.classList.remove('active');
        } else {
            dropBtn.classList.add('active');
            pickupBtn.classList.remove('active');
        }
    }
}

async function reverseGeocode(lat, lng, locationType) {
    const loadingIndicator = document.querySelector('.loading-indicator');
    loadingIndicator.style.display = 'block';
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        
        if (data.display_name) {
            // Dispatch custom event with location data
            window.dispatchEvent(new CustomEvent('locationSelected', {
                detail: {
                    type: locationType,
                    address: data.display_name,
                    latitude: lat,
                    longitude: lng
                }
            }));
            
            // Update marker popup with address
            const marker = locationType === 'pickup' ? pickupMarker : dropMarker;
            if (marker) {
                marker.bindPopup(data.display_name).openPopup();
            }
        } else {
            throw new Error('Location not found');
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        window.dispatchEvent(new CustomEvent('locationError', {
            detail: {
                message: 'Failed to get location details. Please try again.'
            }
        }));
    } finally {
        loadingIndicator.style.display = 'none';
    }

}

// Utility function to debounce search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}