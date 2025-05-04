document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    loadUserRides();
});

async function loadUserRides() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const ridesList = document.getElementById('ridesList');

    try {
        loadingSpinner.style.display = 'block';
        const token = localStorage.getItem('token');

        const response = await fetch('/api/user/history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch rides');

        const history = await response.json();
        const rides = history.hosted || [];

        ridesList.innerHTML = rides.map(ride => `
            <div class="ride-card">
                <h3>${ride.pickup} → ${ride.drop}</h3>
                <div class="ride-details">
                    <p><i class="fas fa-users"></i> ${ride.seats} seats available</p>
                    <p><i class="fas fa-tag"></i> ₹${ride.fare} per seat</p>
                </div>
                <div class="ride-actions">
                    <button onclick="editRide('${ride._id}')" class="btn-primary">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteRide('${ride._id}')" class="btn-danger">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load rides. Please try again.');
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

async function editRide(rideId) {
    const token = localStorage.getItem('token');
    const editModal = document.getElementById('editModal');
    const rideForm = document.getElementById('rideForm');

    try {
        const response = await fetch('/api/user/history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch ride details');

        const history = await response.json();
        const ride = history.hosted.find(r => r._id === rideId);

        if (!ride) throw new Error('Ride not found');

        document.getElementById('source').value = ride.pickup;
        document.getElementById('destination').value = ride.drop;
        document.getElementById('seats').value = ride.seats;
        document.getElementById('price').value = ride.fare;

        rideForm.dataset.rideId = rideId;
        editModal.style.display = 'block';

    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Failed to load ride details.');
    }
}
// Frontend deleteRide function:
async function deleteRide(rideId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to delete rides.');
        return;
    }

    try {
        if (!confirm('Are you sure you want to delete this ride?')) {
            return;
        }

        const response = await fetch(`/api/rides/${rideId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            let errorMessage = 'Failed to delete ride';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } else {
                    const errorText = await response.text();
                    errorMessage = errorText || 'Server error: Please try again later';
                }
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                errorMessage = 'Server error: Please try again later';
            }
            throw new Error(errorMessage);
        }

        alert('Ride deleted successfully');
        await loadUserRides();

    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'An error occurred while deleting the ride.');
    }
}

// Cancel modal
document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
});

// Submit modal (Update Ride)
document.getElementById('rideForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const rideId = form.dataset.rideId;
    const token = localStorage.getItem('token');

    const updatedRide = {
        pickup: document.getElementById('source').value,
        drop: document.getElementById('destination').value,
        seats: document.getElementById('seats').value,
        fare: document.getElementById('price').value
    };

    try {
        const response = await fetch(`/api/rides/${rideId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedRide)
        });

        if (response.ok) {
            alert('Ride updated successfully.');
            document.getElementById('editModal').style.display = 'none';
            await loadUserRides();
        } else if (response.status === 404) {
            throw new Error('Ride not found. It may have already been deleted.');
        } else {
            const errorText = await response.text();
            throw new Error(`Failed to update ride: ${errorText}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'An unexpected error occurred while updating the ride.');
    }
});

// Close modal when clicking outside it
window.addEventListener('click', (event) => {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
