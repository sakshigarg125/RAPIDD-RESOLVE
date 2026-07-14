document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || user.role !== 'officer') {
        window.location.href = 'index.html';
        return;
    }

    // Initialize notification system
    initNotifications();

    // Set dynamic user name
    const officerName = document.getElementById('officerName');
    const officerAvatar = document.getElementById('officerAvatar');
    if (officerName && user.name) {
        officerName.innerText = user.name;
        if (officerAvatar) officerAvatar.innerText = user.name.charAt(0).toUpperCase();
    }

    refreshOfficerDashboard(user);
});

function switchView(viewId, event) {
    if (event) event.preventDefault();
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';

    if (event) {
        const links = document.querySelectorAll('.nav-links a');
        links.forEach(link => link.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
}

async function refreshOfficerDashboard(user) {
    let assignedComplaints = [];
    try {
        console.log('Loading complaints for officer:', user.userId);
        assignedComplaints = await apiCall('/complaints?officerId=' + user.userId);
        console.log('Assigned complaints loaded:', assignedComplaints.length);
    } catch (err) {
        console.error("Failed to load assigned complaints", err);
    }

    // 1. Enhanced Performance Stats
    updatePerformanceStats(assignedComplaints);
    
    // 2. Update Analytics Charts
    updateAnalyticsCharts(assignedComplaints);
    
    // 3. Update Activity Timeline
    updateActivityTimeline(assignedComplaints);

    // 2. Render Table
    const tbody = document.getElementById('officerComplaintsTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (assignedComplaints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b;">No complaints assigned.</td></tr>';
        return;
    }

    // Fetch citizen information for all complaints
    const citizenPromises = assignedComplaints.map(async (complaint) => {
        try {
            const citizen = await apiCall('/users?userId=' + complaint.citizenId);
            return { ...complaint, citizen: citizen[0] || null };
        } catch (err) {
            console.error("Failed to fetch citizen info for", complaint.citizenId);
            return { ...complaint, citizen: null };
        }
    });

    const complaintsWithCitizens = await Promise.all(citizenPromises);
    window.loadedComplaints = complaintsWithCitizens; // Store globally on window for easy access

    complaintsWithCitizens.forEach((c, index) => {
        let statusBadge = '';
        if (c.status === 'Pending' || c.status === 'Pending Review') statusBadge = `<span class="status pending" id="status-${c.complaintId}">Pending Review</span>`;
        else if (c.status === 'In Progress') statusBadge = `<span class="status" id="status-${c.complaintId}" style="background:#e3f2fd; color:#1565c0;">In Progress</span>`;
        else if (c.status === 'Resolved') statusBadge = `<span class="status resolved" id="status-${c.complaintId}">Resolved</span>`;

        let priorityBadge = '';
        if (c.priority === 'low') priorityBadge = '<span class="priority-badge priority-low">Low</span>';
        else if (c.priority === 'medium') priorityBadge = '<span class="priority-badge priority-medium">Medium</span>';
        else if (c.priority === 'high') priorityBadge = '<span class="priority-badge priority-high">High</span>';
        else if (c.priority === 'urgent') priorityBadge = '<span class="priority-badge priority-urgent">Urgent</span>';

        const citizenInfo = c.citizen ? `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent-citizen); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem; font-weight: bold;">
                    ${c.citizen.name ? c.citizen.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                    <div style="font-weight: 500; font-size: 0.9rem;">${c.citizen.name || 'Unknown'}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">${c.citizen.userId || 'N/A'}</div>
                </div>
            </div>
        ` : '<div style="color: #64748b;">Citizen info unavailable</div>';

        const filedDate = c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        }) : 'Unknown';

        let row = `
            <tr class="priority-${c.priority}" onclick="openDetailByIndex(${index})">
                <td style="font-weight: 600; color: var(--accent-officer);">${c.complaintId}</td>
                <td>${priorityBadge}</td>
                <td>${citizenInfo}</td>
                <td>${c.department}</td>
                <td>${c.location}</td>
                <td>${statusBadge}</td>
                <td style="font-size: 0.9rem;">${filedDate}</td>
            </tr>`;
        tbody.innerHTML += row;
    });
}

// Global helper to open details safely using indices
function openDetailByIndex(index) {
    if (!window.loadedComplaints || !window.loadedComplaints[index]) return;
    const c = window.loadedComplaints[index];
    openDetail(c.complaintId, c.department, c.location, c.status, c.description, c.imageUrl, c.priority, c.citizen);
}

// Enhanced Dashboard Analytics Functions
function updatePerformanceStats(complaints) {
    const totalAssigned = complaints.length;
    const requiresAction = complaints.filter(c => c.status !== 'Resolved').length;
    const resolvedToday = complaints.filter(c => {
        if (c.status === 'Resolved' && c.updatedAt) {
            const today = new Date();
            const resolvedDate = new Date(c.updatedAt);
            return resolvedDate.toDateString() === today.toDateString();
        }
        return false;
    }).length;

    // Calculate average resolution time (mock calculation for demo)
    const resolvedComplaints = complaints.filter(c => c.status === 'Resolved');
    let avgResolutionTime = 0;
    if (resolvedComplaints.length > 0) {
        // Mock calculation - in real app, this would use actual timestamps
        avgResolutionTime = Math.floor(Math.random() * 24) + 2; // 2-26 hours
    }

    // Update DOM elements
    document.getElementById('totalAssigned').innerText = totalAssigned;
    document.getElementById('requiresAction').innerText = requiresAction;
    document.getElementById('resolvedToday').innerText = resolvedToday;
    document.getElementById('avgResolutionTime').innerText = avgResolutionTime + 'h';

    // Update change indicators (mock data for demo)
    document.getElementById('assignedChange').innerText = `+${Math.floor(Math.random() * 5)} this week`;
    document.getElementById('pendingChange').innerText = `-${Math.floor(Math.random() * 3)} from yesterday`;
    document.getElementById('resolvedChange').innerText = `+${Math.floor(Math.random() * 20)}% efficiency`;
    document.getElementById('timeChange').innerText = `-${Math.floor(Math.random() * 4)}h improvement`;
}

function updateAnalyticsCharts(complaints) {
    // Priority Distribution
    const priorityCounts = {
        urgent: complaints.filter(c => c.priority === 'urgent').length,
        high: complaints.filter(c => c.priority === 'high').length,
        medium: complaints.filter(c => c.priority === 'medium').length,
        low: complaints.filter(c => c.priority === 'low').length
    };

    const total = complaints.length || 1;
    
    // Update priority counts
    document.getElementById('urgentCount').innerText = priorityCounts.urgent;
    document.getElementById('highCount').innerText = priorityCounts.high;
    document.getElementById('mediumCount').innerText = priorityCounts.medium;
    document.getElementById('lowCount').innerText = priorityCounts.low;

    // Update priority progress bars
    document.querySelector('.urgent-fill').style.width = `${(priorityCounts.urgent / total) * 100}%`;
    document.querySelector('.high-fill').style.width = `${(priorityCounts.high / total) * 100}%`;
    document.querySelector('.medium-fill').style.width = `${(priorityCounts.medium / total) * 100}%`;
    document.querySelector('.low-fill').style.width = `${(priorityCounts.low / total) * 100}%`;

    // Status Breakdown
    const statusCounts = {
        pending: complaints.filter(c => c.status === 'Pending' || c.status === 'Pending Review').length,
        progress: complaints.filter(c => c.status === 'In Progress').length,
        resolved: complaints.filter(c => c.status === 'Resolved').length
    };

    document.getElementById('pendingStatus').innerText = statusCounts.pending;
    document.getElementById('progressStatus').innerText = statusCounts.progress;
    document.getElementById('resolvedStatus').innerText = statusCounts.resolved;

    // Performance Metrics (mock calculations)
    const resolutionRate = total > 0 ? Math.round((statusCounts.resolved / total) * 100) : 0;
    const responseTime = Math.floor(Math.random() * 8) + 1; // 1-8 hours
    const satisfactionRate = Math.floor(Math.random() * 30) + 70; // 70-100%

    document.getElementById('resolutionRate').innerText = resolutionRate + '%';
    document.getElementById('responseTime').innerText = responseTime + 'h';
    document.getElementById('satisfactionRate').innerText = satisfactionRate + '%';

    // Update metric bars
    document.getElementById('resolutionFill').style.width = resolutionRate + '%';
    document.getElementById('responseFill').style.width = Math.min(responseTime * 12.5, 100) + '%'; // Scale to 100%
    document.getElementById('satisfactionFill').style.width = satisfactionRate + '%';
}

function updateActivityTimeline(complaints) {
    const timeline = document.getElementById('activityTimeline');
    
    // Get recent activities (sorted by most recent)
    const recentActivities = complaints
        .filter(c => c.updatedAt || c.createdAt)
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 5);

    if (recentActivities.length === 0) {
        timeline.innerHTML = `
            <div class="activity-item">
                <div class="activity-dot resolved-dot"></div>
                <div class="activity-content">
                    <div class="activity-title">No recent activity</div>
                    <div class="activity-time">Check back later for updates</div>
                </div>
            </div>
        `;
        return;
    }

    timeline.innerHTML = recentActivities.map(complaint => {
        const status = complaint.status;
        const dotClass = status === 'Resolved' ? 'resolved-dot' : 
                        status === 'In Progress' ? 'progress-dot' : 'pending-dot';
        
        const timeAgo = getTimeAgo(new Date(complaint.updatedAt || complaint.createdAt));
        const action = status === 'Resolved' ? 'Resolved complaint' : 
                     status === 'In Progress' ? 'Started working on' : 'Received complaint';
        
        return `
            <div class="activity-item">
                <div class="activity-dot ${dotClass}"></div>
                <div class="activity-content">
                    <div class="activity-title">${action} ${complaint.complaintId}</div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

let currentTargetId = null;

function openDetail(id, dept, loc, currentStatus, desc, imageUrl, priority, citizen) {
    currentTargetId = id;
    document.getElementById('detailPanel').classList.add('active');
    document.getElementById('emptyState').style.display = 'none';

    // Set complaint details
    document.getElementById('detId').innerText = id;
    document.getElementById('detCategory').innerText = dept;
    document.getElementById('detLocation').innerText = loc;
    document.getElementById('statusSelect').value = currentStatus;
    document.getElementById('detailDesc').innerText = desc;

    // Set priority
    const priorityElement = document.getElementById('detPriority');
    if (priority) {
        let priorityBadge = '';
        if (priority === 'low') priorityBadge = '<span class="priority-badge priority-low">Low</span>';
        else if (priority === 'medium') priorityBadge = '<span class="priority-badge priority-medium">Medium</span>';
        else if (priority === 'high') priorityBadge = '<span class="priority-badge priority-high">High</span>';
        else if (priority === 'urgent') priorityBadge = '<span class="priority-badge priority-urgent">Urgent</span>';
        priorityElement.innerHTML = priorityBadge;
    } else {
        priorityElement.innerHTML = '<span class="priority-badge priority-medium">Medium</span>';
    }

    // Set citizen information
    if (citizen && typeof citizen === 'object') {
        document.getElementById('citizenName').innerText = citizen.name || 'Unknown Citizen';
        document.getElementById('citizenId').innerText = citizen.userId || 'N/A';
        document.getElementById('citizenEmail').innerText = citizen.email || 'No email provided';
        document.getElementById('citizenJoined').innerText = citizen.joined || 'Unknown';
        document.getElementById('citizenStatus').innerText = citizen.status || 'Active';
        
        // Set citizen avatar
        const avatar = document.getElementById('citizenAvatar');
        if (citizen.name) {
            avatar.innerText = citizen.name.charAt(0).toUpperCase();
        } else {
            avatar.innerText = 'C';
        }
    } else {
        document.getElementById('citizenName').innerText = 'Citizen Information Unavailable';
        document.getElementById('citizenId').innerText = 'N/A';
        document.getElementById('citizenEmail').innerText = 'N/A';
        document.getElementById('citizenJoined').innerText = 'Unknown';
        document.getElementById('citizenStatus').innerText = 'Unknown';
        document.getElementById('citizenAvatar').innerText = 'C';
    }

    // Set filed date
    const dateElement = document.getElementById('detDate');
    // Find the complaint data from the currently loaded complaints
    const tbody = document.getElementById('officerComplaintsTable');
    const rows = tbody.getElementsByTagName('tr');
    let complaintData = null;
    
    // Try to find complaint data from the rows
    for (let row of rows) {
        if (row.cells[0] && row.cells[0].innerText === id) {
            // This is a simple approach - in a real implementation, we'd store the data better
            complaintData = { createdAt: new Date().toISOString() }; // Fallback to current date
            break;
        }
    }
    
    if (complaintData && complaintData.createdAt) {
        dateElement.innerText = new Date(complaintData.createdAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        dateElement.innerText = 'Unknown';
    }

    // Reveal uploaded proof natively if attached
    const imgRow = document.getElementById('detailImageRow');
    const imgEl = document.getElementById('detailImage');
    if (imageUrl && imageUrl !== 'null' && imageUrl !== 'undefined') {
        imgRow.style.display = 'flex';
        imgEl.src = 'http://localhost:5000' + imageUrl;
    } else {
        imgRow.style.display = 'none';
        imgEl.src = '';
    }
}

function closeDetail() {
    document.getElementById('detailPanel').classList.remove('active');
    document.getElementById('emptyState').style.display = 'block';
    currentTargetId = null;
}

async function submitUpdate(e) {
    e.preventDefault();
    if (!currentTargetId) {
        console.error('No complaint ID selected');
        showToast('Please select a complaint first', 'error');
        return;
    }

    const updateBtn = document.getElementById('updateBtn');
    const newStatus = document.getElementById('statusSelect').value;
    const remarks = document.getElementById('remarksInput').value || '';

    // Validate inputs
    if (!newStatus) {
        showToast('Please select a status', 'error');
        return;
    }

    if (!remarks.trim()) {
        showToast('Please add remarks for the status update', 'error');
        return;
    }

    // Update button state
    updateBtn.innerHTML = '⏳ Saving...';
    updateBtn.disabled = true;
    updateBtn.style.opacity = '0.7';

    console.log('Updating complaint:', currentTargetId, 'to status:', newStatus);

    try {
        const response = await apiCall('/complaints/' + encodeURIComponent(currentTargetId), 'PATCH', {
            status: newStatus,
            remarks: remarks
        });

        console.log('Update successful:', response);

        // Show success toast
        showToast(`✅ Complaint ${currentTargetId} marked as "${newStatus}"`);

        // Clear form and close detail panel
        document.getElementById('remarksInput').value = '';
        closeDetail();

        // Refresh dashboard data
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (user) {
            await refreshOfficerDashboard(user);
        }

    } catch (err) {
        console.error('Update failed:', err);
        showToast(`❌ Failed to update: ${err.message || 'Unknown error'}`, 'error');
    } finally {
        // Reset button state
        updateBtn.innerHTML = 'Update & Save status';
        updateBtn.disabled = false;
        updateBtn.style.opacity = '1';
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    
    // Set message
    toastMsg.innerText = message;
    
    // Remove existing classes
    toast.classList.remove('show', 'error', 'success');
    
    // Add appropriate classes
    toast.classList.add('show');
    if (type === 'error') {
        toast.classList.add('error');
    } else {
        toast.classList.add('success');
    }
    
    // Auto hide after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show', 'error', 'success');
    }, 4000);
}
