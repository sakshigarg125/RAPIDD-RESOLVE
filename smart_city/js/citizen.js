document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || user.role !== 'citizen') {
        window.location.href = 'index.html';
        return;
    }

    // Initialize notification system
    initNotifications();

    // Set dynamic user name
    const welcomeHeader = document.getElementById('welcomeHeader');
    const userAvatar = document.getElementById('userAvatar');
    if (welcomeHeader && user.name) {
        welcomeHeader.innerText = `Welcome back, ${user.name}!`;
        if (userAvatar) userAvatar.innerText = user.name.charAt(0).toUpperCase();
    }
});

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Initialize Auto ID and Auto Date on Load
document.addEventListener('DOMContentLoaded', () => {
    generateAutoIdAndDate();
    loadMyComplaints();
});

function switchView(viewName, event) {
    if (event) event.preventDefault();
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
    });

    document.getElementById(`view-${viewName}`).style.display = 'block';

    if (viewName === 'lodge') {
        document.getElementById('complaintIdInput').value = '#C-' + Math.floor(1000 + Math.random() * 9000);
        document.getElementById('dateInput').value = new Date().toLocaleString();

        // Spawn map safely after div renders
        setTimeout(() => {
            initMap();
        }, 300);
    }

    if (event) {
        const links = document.querySelectorAll('.nav-links a');
        links.forEach(link => link.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
}

let complaintMap = null;
let currentMarker = null;

function initMap() {
    if (complaintMap) {
        complaintMap.invalidateSize();
        return;
    }

    // Initialize Leaflet map
    complaintMap = L.map('map').setView([28.6139, 77.2090], 12); // Default to New Delhi Coordinates

    // Standard high-res tiles from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(complaintMap);

    // Initial Marker (Draggable)
    currentMarker = L.marker([28.6139, 77.2090], { draggable: true }).addTo(complaintMap);

    // Add Search Bar (Geocoder)
    L.Control.geocoder({
        defaultMarkGeocode: false
    })
        .on('markgeocode', function (e) {
            const center = e.geocode.center;
            complaintMap.setView(center, 16);
            currentMarker.setLatLng(center);
            updateInput(center.lat, center.lng);
        })
        .addTo(complaintMap);

    // Prevent map features (like geocoder enter keys) from submitting the whole outer form
    document.getElementById('map').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') e.preventDefault();
    });

    // Auto-patch map buttons as type="button" to prevent them from firing a submit event
    setTimeout(() => {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.querySelectorAll('button').forEach(btn => {
                if (!btn.getAttribute('type')) btn.setAttribute('type', 'button');
            });
        }
    }, 1000);

    function updateInput(lat, lng) {
        document.getElementById('mapCoordsInput').value = `[GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
    }

    // Drag release event
    currentMarker.on('dragend', function (e) {
        const coords = e.target.getLatLng();
        updateInput(coords.lat, coords.lng);
    });

    // Map click event updates Marker explicitly
    complaintMap.on('click', function (e) {
        currentMarker.setLatLng(e.latlng);
        updateInput(e.latlng.lat, e.latlng.lng);
    });
}

// Function to load complaints from localStorage
async function loadMyComplaints() {
    const tableBody = document.getElementById('complaintsTableBody');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let userComplaints = [];

    try {
        userComplaints = await apiCall('/complaints?citizenId=' + currentUser.userId);
    } catch (err) {
        console.error("Failed to load complaints", err);
    }

    tableBody.innerHTML = ''; // clear out

    // Update Dashboard Stats
    const totalEl = document.getElementById('citTotal');
    if (totalEl) {
        totalEl.innerText = userComplaints.length;
        document.getElementById('citResolved').innerText = userComplaints.filter(c => c.status === 'Resolved').length;
        document.getElementById('citPending').innerText = userComplaints.filter(c => c.status !== 'Resolved').length;
    }

    // Populate Profile
    const profileNameEl = document.getElementById('profileName');
    if (profileNameEl) {
        profileNameEl.value = currentUser.name || 'Citizen User';
        document.getElementById('profileId').value = currentUser.userId || 'N/A';
        document.getElementById('profileEmail').value = currentUser.email || 'Not Provided';
        document.getElementById('profileJoined').innerText = currentUser.joined || 'Recently';

        const statusEl = document.getElementById('profileStatus');
        // Default to Active if old cache happens to miss the status property
        if (currentUser.status === 'Active' || !currentUser.status) {
            statusEl.innerHTML = '<span style="color: var(--success);">✔ Active</span>';
        } else {
            statusEl.innerHTML = '<span style="color: var(--danger);">✖ Blocked</span>';
        }
    }

    const recentActivityEl = document.getElementById('dashboardRecentActivity');

    if (userComplaints.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">No complaints lodged yet.</td></tr>';
        if (recentActivityEl) {
            recentActivityEl.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">No recent activity found. Lodge a complaint to see updates here.</div>';
        }
        return;
    }

    // Populate Recent Activity Widget (Show the single most recent one)
    if (recentActivityEl) {
        // userComplaints is chronologically ordered (oldest to newest based on ID timestamp) before reverse
        const latest = userComplaints[userComplaints.length - 1];

        let statusColor = '#64748b';
        let statusBg = '#f1f5f9';
        if (latest.status === 'Pending') { statusColor = '#b45309'; statusBg = '#fef3c7'; }
        else if (latest.status === 'In Progress') { statusColor = '#1d4ed8'; statusBg = '#dbeafe'; }
        else if (latest.status === 'Resolved') { statusColor = '#15803d'; statusBg = '#dcfce7'; }

        let dateObj = latest.createdAt ? new Date(latest.createdAt) : new Date();
        let dateString = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        let recentImageHtml = latest.imageUrl && latest.imageUrl !== 'null' && latest.imageUrl !== 'undefined'
            ? `<div style="margin-top: 10px;"><img src="http://localhost:5000${latest.imageUrl}" style="max-height: 100px; border-radius: 6px; border: 1px solid #cbd5e1;"></div>`
            : '';

        recentActivityEl.innerHTML = `
            <div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 5px;">Latest Update • ${dateString}</div>
                    <div style="font-weight: 600; color: var(--text-dark); margin-bottom: 5px; text-transform: capitalize;">${latest.department} Issue</div>
                    <div style="font-size: 0.9rem; color: #475569; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; max-width: 400px;">
                        ${latest.description}
                    </div>
                    ${recentImageHtml}
                </div>
                <div style="text-align: right;">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: ${statusBg}; color: ${statusColor};">
                        ${latest.status}
                    </span>
                    <div style="margin-top: 10px; font-size: 0.85rem; font-weight: 600; color: var(--accent-citizen);">
                        ${latest.complaintId || 'N/A'}
                    </div>
                </div>
            </div>
            <button onclick="switchView('complaints', event)" style="margin-top: 15px; width: 100%; padding: 10px; background: transparent; color: var(--accent-citizen); border: 1px dashed #cbd5e1; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s;">View All Complaints &rarr;</button>
        `;
    }

    // Reverse to show newest first in the Table
    userComplaints.reverse().forEach(complaint => {
        let statusBadge = '';
        if (complaint.status === 'Pending') statusBadge = '<span class="status pending">Pending</span>';
        else if (complaint.status === 'In Progress') statusBadge = '<span class="status" style="background:#dbeafe; color:#1e40af;">In Progress</span>';
        else if (complaint.status === 'Resolved') statusBadge = '<span class="status resolved">Resolved</span>';

        // Format timestamp
        let dateObj = complaint.createdAt ? new Date(complaint.createdAt) : new Date();
        let dateString = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        let priorityBadge = '';
        if (complaint.priority === 'low') priorityBadge = '<span class="priority-badge priority-low">Low</span>';
        else if (complaint.priority === 'medium') priorityBadge = '<span class="priority-badge priority-medium">Medium</span>';
        else if (complaint.priority === 'high') priorityBadge = '<span class="priority-badge priority-high">High</span>';
        else if (complaint.priority === 'urgent') priorityBadge = '<span class="priority-badge priority-urgent">Urgent</span>';
        else priorityBadge = '<span class="priority-badge priority-medium">Medium</span>';

        let proofHtml = complaint.imageUrl && complaint.imageUrl !== 'null' && complaint.imageUrl !== 'undefined'
            ? `<a href="http://localhost:5000${complaint.imageUrl}" target="_blank" style="color: var(--accent-citizen); text-decoration: underline; font-weight: 500;">View Photo</a>`
            : `<span style="opacity: 0.5;">None</span>`;

        let row = `<tr>
            <td style="font-weight: bold; color: var(--accent-citizen);">${complaint.complaintId || 'N/A'}</td>
            <td>${priorityBadge}</td>
            <td style="text-transform: capitalize;">${complaint.department}</td>
            <td>${dateString}</td>
            <td>${statusBadge}</td>
            <td style="font-style: italic; color: #64748b; font-size: 0.85rem;">${complaint.remarks || '<span style="opacity:0.5;">No remarks yet</span>'}</td>
            <td>${proofHtml}</td>
        </tr>`;

        tableBody.innerHTML += row;
    });
}

function generateAutoIdAndDate() {
    // Generate Random ID like #C-8542
    const randomId = Math.floor(1000 + Math.random() * 9000);
    document.getElementById('complaintIdInput').value = `#C-${randomId}`;

    // Generate Current Date
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    document.getElementById('dateInput').value = dateStr;
}

// Simulate GPS Location fetching
function getGPS() {
    const input = document.getElementById('locationInput');
    const btn = document.querySelector('.gps-btn');

    btn.innerHTML = 'Locating...';
    input.value = '';

    setTimeout(() => {
        input.value = '14.5995° N, 120.9842° E (Downtown Sector 4)';
        btn.innerHTML = '&#x1f4cd; GPS Set';
        btn.style.background = '#dcfce7';
        btn.style.color = '#166534';
        btn.style.borderColor = '#bbf7d0';
    }, 800);
}

// Simulate form submission visually and save to backend
async function submitForm(e) {
    if (e) {
        e.preventDefault();
        // Defend against Leaflet DOM buttons attempting to implicitly submit the form on click
        if (e.submitter && e.submitter.id !== 'submitBtn') {
            return;
        }
    }
    const btn = document.getElementById('submitBtn');
    const successMsg = document.getElementById('successMsg');

    btn.innerHTML = 'Submitting...';
    btn.style.opacity = '0.8';

    // Construct the payload structure natively for media uploading
    const user = JSON.parse(localStorage.getItem('currentUser')) || { userId: 'USR-GUEST' };
    const coords = document.getElementById('mapCoordsInput').value;
    const manualLoc = document.getElementById('locationInput').value;
    const loc = coords ? `${coords} - ${manualLoc}` : manualLoc;

    const payload = new FormData();
    payload.append('citizenId', user.userId);
    payload.append('department', document.getElementById('deptInput').value);
    payload.append('description', document.getElementById('descInput').value);
    payload.append('location', loc);
    payload.append('priority', document.getElementById('priorityInput').value || 'medium');

    const fileField = document.getElementById('imageInput');
    if (fileField && fileField.files[0]) {
        payload.append('image', fileField.files[0]);
    }

    try {
        await apiCall('/complaints', 'POST', payload);

        document.getElementById('complaintForm').reset();
        btn.innerHTML = 'Submit Complaint';
        btn.style.opacity = '1';

        // Generate new IDs for the next complaint
        generateAutoIdAndDate();

        // Instantly reload table to show the new complaint
        await loadMyComplaints();

        // Show success banner
        successMsg.classList.add('show');

        // Hide banner after 5 seconds
        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 5000);

        // Auto scroll to top to see message
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        alert('Failed to submit complaint: ' + err.message);
        btn.innerHTML = 'Submit Complaint';
        btn.style.opacity = '1';
    }
}

// Update profile details dynamically
async function updateProfile(e) {
    if (e) e.preventDefault();
    const btn = e.target;
    const originalText = btn.innerText;

    btn.innerText = 'Synchronizing...';
    btn.style.opacity = '0.8';

    const newName = document.getElementById('profileName').value;
    const newEmail = document.getElementById('profileEmail').value;
    const user = JSON.parse(localStorage.getItem('currentUser'));

    try {
        await apiCall('/users/' + user.userId, 'PATCH', {
            name: newName,
            email: newEmail
        });

        // Mutate local memory instantly 
        user.name = newName;
        user.email = newEmail;
        localStorage.setItem('currentUser', JSON.stringify(user));

        // Dynamically change Header and Avatar synchronously!
        const welcomeHeader = document.getElementById('welcomeHeader');
        const userAvatar = document.getElementById('userAvatar');
        welcomeHeader.innerText = `Welcome back, ${newName}!`;
        userAvatar.innerText = newName.charAt(0).toUpperCase();

        btn.innerText = 'Changes Saved Successfully!';
        btn.style.background = 'var(--success)';

        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = 'var(--accent-citizen)';
            btn.style.opacity = '1';
        }, 2500);

    } catch (err) {
        alert('Failed to update profile: ' + err.message);
        btn.innerText = originalText;
        btn.style.opacity = '1';
    }
}
