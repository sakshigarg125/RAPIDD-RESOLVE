document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    // Initialize dark mode from localStorage
    initDarkMode();

    // Initialize notification system
    initNotifications();

    // Set dynamic user name
    const adminName = document.getElementById('adminName');
    const adminAvatar = document.getElementById('adminAvatar');
    if (adminName && user.name) {
        adminName.innerText = user.name;
        if (adminAvatar) adminAvatar.innerText = user.name.charAt(0).toUpperCase();
    }

    // Load Dynamic Data
    refreshAdminDashboard();
    loadUnassignedComplaints();
});

let allUnassignedComplaints = [];
let allOfficers = [];

// Load unassigned complaints for admin to assign
async function loadUnassignedComplaints(allComplaints = null, officers = null) {
    try {
        const complaintsData = allComplaints || await apiCall('/complaints');
        allOfficers = officers || await apiCall('/users?role=officer');

        console.log('Total officers loaded:', allOfficers.length);
        console.log('Officers:', allOfficers.map(o => `${o.name} - ${o.department}`));

        // Filter unassigned complaints
        allUnassignedComplaints = complaintsData.filter(c => !c.assignedTo || c.assignedTo === '');

        await applyFilters();
        updateGlobalStats(complaintsData);
    } catch (err) {
        console.error('Failed to load unassigned complaints:', err);
    }
}

// Apply filters (search, status, date, priority) to unassigned complaints
async function applyFilters() {
    const searchInput = document.getElementById('complaintSearch');
    const statusSelect = document.getElementById('statusFilter');
    const dateSelect = document.getElementById('dateFilter');

    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
    const statusVal = statusSelect ? statusSelect.value : '';
    const dateVal = dateSelect ? dateSelect.value : '';

    let filtered = allUnassignedComplaints;

    // 1. Priority Filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(c => c.priority === currentFilter);
    }

    // 2. Search Filter
    if (searchVal) {
        filtered = filtered.filter(c => 
            (c.complaintId && c.complaintId.toLowerCase().includes(searchVal)) ||
            (c.location && c.location.toLowerCase().includes(searchVal)) ||
            (c.department && c.department.toLowerCase().includes(searchVal)) ||
            (c.description && c.description.toLowerCase().includes(searchVal))
        );
    }

    // 3. Status Filter
    if (statusVal) {
        filtered = filtered.filter(c => c.status === statusVal);
    }

    // 4. Date Filter
    if (dateVal) {
        const now = new Date();
        filtered = filtered.filter(c => {
            if (!c.createdAt) return false;
            const created = new Date(c.createdAt);
            if (dateVal === 'today') {
                return created.toDateString() === now.toDateString();
            } else if (dateVal === 'week') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return created >= oneWeekAgo;
            } else if (dateVal === 'month') {
                const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return created >= oneMonthAgo;
            }
            return true;
        });
    }

    // Fetch citizen info for filtered complaints and render
    try {
        const complaintsWithCitizens = await Promise.all(
            filtered.map(async (complaint) => {
                try {
                    const users = await apiCall('/users?userId=' + complaint.citizenId);
                    const citizen = users.find(u => u.role === 'citizen') || users[0] || null;
                    return { ...complaint, citizen: citizen };
                } catch (err) {
                    return { ...complaint, citizen: null };
                }
            })
        );
        renderUnassignedComplaints(complaintsWithCitizens, allOfficers);
    } catch (err) {
        console.error('Failed to filter complaints:', err);
    }
}

// Clear all active filters and search inputs
function clearFilters() {
    const searchInput = document.getElementById('complaintSearch');
    const statusSelect = document.getElementById('statusFilter');
    const dateSelect = document.getElementById('dateFilter');

    if (searchInput) searchInput.value = '';
    if (statusSelect) statusSelect.value = '';
    if (dateSelect) dateSelect.value = '';

    currentFilter = 'all';
    document.querySelectorAll('.priority-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const allBtn = document.querySelector('.priority-filter-btn[onclick*="all"]');
    if (allBtn) {
        allBtn.classList.add('active');
    }

    applyFilters();
}

// Render unassigned complaints in admin dashboard
function renderUnassignedComplaints(complaints, officers) {
    const tbody = document.getElementById('unassignedTableBody');
    if (!tbody) return;

    if (complaints.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: #64748b;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">✅</div>
                    <div>All complaints have been assigned to officers!</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = complaints.map(complaint => {
        const priorityBadge = getPriorityBadge(complaint.priority || 'medium');
        const citizenInfo = complaint.citizen ? `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--accent-citizen); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.7rem; font-weight: bold;">
                    ${complaint.citizen.name ? complaint.citizen.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                    <div style="font-weight: 500; font-size: 0.85rem;">${complaint.citizen.name || 'Unknown'}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${complaint.citizen.userId || 'N/A'}</div>
                </div>
            </div>
        ` : '<div style="color: #64748b; font-size: 0.85rem;">Citizen info unavailable</div>';

        const filedDate = complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) : 'Unknown';

        // Department mapping to match complaint categories with officer departments
        const departmentMapping = {
            'Electric': 'Electricity',
            'Electricity': 'Electricity',
            'Road': 'Civil Works (Roads)',
            'Civil Works (Roads)': 'Civil Works (Roads)',
            'Water': 'Water Supply',
            'Water Supply': 'Water Supply',
            'Waste': 'Waste Management',
            'Waste Management': 'Waste Management',
            'Health': 'Health & Sanitation',
            'Health & Sanitation': 'Health & Sanitation',
            'Traffic': 'Traffic Management',
            'Traffic Management': 'Traffic Management',
            'Safety': 'Public Safety',
            'Public Safety': 'Public Safety'
        };

        // Map complaint department to officer department
        const mappedDepartment = departmentMapping[complaint.department] || complaint.department;

        // Filter officers by department (exact match with mapped department)
        const relevantOfficers = officers.filter(officer =>
            officer.department && officer.department.toLowerCase() === mappedDepartment.toLowerCase()
        );

        // Debug: Show all officers if no matching officers found
        const officersToShow = relevantOfficers.length > 0 ? relevantOfficers : officers;

        const officerOptions = officersToShow.length > 0
            ? officersToShow.map(officer =>
                `<option value="${officer.userId}">${officer.name} (${officer.department})</option>`
              ).join('')
            : '<option value="">No officers available (Total: ' + officers.length + ')</option>';

        return `
            <tr class="priority-${complaint.priority || 'medium'}">
                <td style="font-weight: 600; color: var(--accent-admin);">${complaint.complaintId}</td>
                <td>${priorityBadge}</td>
                <td>${citizenInfo}</td>
                <td style="text-transform: capitalize;">${complaint.department}</td>
                <td style="font-size: 0.9rem;">${complaint.location}</td>
                <td style="font-size: 0.85rem; color: #6b7280;">${filedDate}</td>
                <td>
                    <select class="assign-select" onchange="assignOfficer('${complaint.complaintId}', this.value, this)">
                        <option value="">Select Officer...</option>
                        ${officerOptions}
                    </select>
                </td>
            </tr>
        `;
    }).join('');
}

// Assign officer to complaint
async function assignOfficer(complaintId, officerId, selectElement) {
    if (!officerId) return;

    const originalValue = selectElement.value;
    selectElement.disabled = true;
    selectElement.innerHTML = '<option>Assigning...</option>';

    console.log('Assigning officer:', officerId, 'to complaint:', complaintId);

    try {
        // URL-encode the complaintId to handle special characters like #
        const encodedId = encodeURIComponent(complaintId);
        const response = await apiCall('/complaints/' + encodedId, 'PATCH', {
            assignedTo: officerId,
            status: 'In Progress'
        });

        console.log('Assignment response:', response);

        // Show success message
        showToast(`✅ Complaint ${complaintId} assigned successfully!`, 'success');
        alert(`✅ Complaint ${complaintId} assigned successfully to officer ${officerId}!`);

        // Remove the assigned complaint from the table
        const row = selectElement.closest('tr');
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '0';
        row.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            row.remove();
            // Check if no more complaints
            const remainingRows = document.querySelectorAll('#unassignedTableBody tr');
            if (remainingRows.length === 0) {
                loadUnassignedComplaints(); // Refresh to show empty state
            }
        }, 300);

        // Refresh global stats
        loadUnassignedComplaints();

    } catch (err) {
        console.error('Assignment failed:', err);
        showToast(`❌ Failed to assign: ${err.message}`, 'error');
        selectElement.disabled = false;
        selectElement.value = originalValue;
        selectElement.innerHTML = selectElement.innerHTML.replace('Assigning...', originalValue);
    }
}

// Update global statistics
function updateGlobalStats(allComplaints) {
    const totalGlobal = document.getElementById('totalGlobal');
    const pendingGlobal = document.getElementById('pendingGlobal');
    
    if (totalGlobal) totalGlobal.innerText = allComplaints.length;
    if (pendingGlobal) pendingGlobal.innerText = allComplaints.filter(c => !c.assignedTo || c.assignedTo === '').length;
}

// Refresh unassigned complaints
function refreshUnassignedComplaints() {
    loadUnassignedComplaints();
}

// Filter complaints by priority
let currentFilter = 'all';
function filterComplaints(priority, button) {
    currentFilter = priority;
    
    // Update button states
    document.querySelectorAll('.priority-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    // Reload complaints with filter
    loadUnassignedComplaints();
}

// Filter urgent only
function filterUrgent() {
    const urgentBtn = document.querySelector('[data-priority="urgent"]');
    if (urgentBtn) {
        filterComplaints('urgent', urgentBtn);
    }
}

// Get priority badge HTML
function getPriorityBadge(priority) {
    const badges = {
        urgent: '<span class="priority-badge priority-urgent">Urgent</span>',
        high: '<span class="priority-badge priority-high">High</span>',
        medium: '<span class="priority-badge priority-medium">Medium</span>',
        low: '<span class="priority-badge priority-low">Low</span>'
    };
    return badges[priority] || badges.medium;
}

// Toast notification function (reuse from officer.js)
function showToast(message, type = 'success') {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.innerText = message;
    toast.classList.remove('show', 'error', 'success');
    toast.classList.add('show');
    if (type === 'error') {
        toast.classList.add('error');
    } else {
        toast.classList.add('success');
    }
    
    setTimeout(() => {
        toast.classList.remove('show', 'error', 'success');
    }, 4000);
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';

    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => link.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Load data based on view
    if (viewId === 'users') {
        loadUsersManagement();
    } else if (viewId === 'departments') {
        loadDepartmentsManagement();
    } else if (viewId === 'analytics') {
        loadAnalytics();
    }
}

// ----------------------------------------------------- //
// Dynamic Data Rendering from data.js
// ----------------------------------------------------- //

async function refreshAdminDashboard() {
    try {
        const complaints = await apiCall('/complaints');
        const officers = await apiCall('/users?role=officer');
        const citizens = await apiCall('/users?role=citizen');

        // 1. Stats
        document.getElementById('totalGlobal').innerText = complaints.length;
        document.getElementById('pendingGlobal').innerText = complaints.filter(c => c.status !== 'Resolved').length;

        // 2. Unassigned Complaints Table
        await loadUnassignedComplaints(complaints, officers);

        // 3. Departments Table
        renderDepartmentsTable(officers, complaints);

        // 4. Users Table
        renderUsersTable(citizens, complaints);
    } catch (err) {
        console.error("Dashboard failed to load", err);
    }
}



function renderDepartmentsTable(officers, allComplaints) {
    const tbody = document.getElementById('departmentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    officers.forEach(o => {
        const activeLoad = allComplaints.filter(c => c.assignedTo === o.userId && c.status !== 'Resolved').length;
        const color = activeLoad > 5 ? 'var(--warning)' : 'var(--success)';

        let row = `<tr>
            <td>${o.name} (${o.userId})</td>
            <td>${o.department}</td>
            <td><span style="color: ${color}; font-weight:bold;">${activeLoad} complaints</span></td>
            <td>${o.resRate}</td>
            <td><button class="btn-action">Reassign</button></td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function renderUsersTable(citizens, allComplaints) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    citizens.forEach(c => {
        const lodged = allComplaints.filter(comp => comp.citizenId === c.userId).length;
        const statusHtml = c.status === 'Active' ? '<span style="color: var(--success);">✔ Active</span>' : '<span style="color: var(--danger);">✖ Blocked</span>';
        const actionBtn = c.status === 'Active' ? `<button class="btn-action block" onclick="toggleUserStatus('${c.userId}', 'Blocked')">Block User</button>` : `<button class="btn-action" onclick="toggleUserStatus('${c.userId}', 'Active')">Approve</button>`;

        let row = `<tr>
            <td>${c.name || 'Citizen User'}</td>
            <td>${c.joined}</td>
            <td>${lodged} Validated</td>
            <td>${statusHtml}</td>
            <td>${actionBtn}</td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

// Actions


async function toggleUserStatus(userId, newStatus) {
    try {
        // URL-encode the userId to handle special characters
        const encodedId = encodeURIComponent(userId);
        await apiCall('/users/' + encodedId, 'PATCH', { status: newStatus });
        refreshAdminDashboard(); // Refresh completely
    } catch (err) {
        alert('Failed to update user status: ' + err.message);
    }
}

// Modal functions for Add Officer
function openAddOfficerModal() {
    document.getElementById('addOfficerModal').classList.remove('hidden');
    document.getElementById('addOfficerForm').reset();
}

function closeAddOfficerModal() {
    document.getElementById('addOfficerModal').classList.add('hidden');
}

// Add Officer function
async function addOfficer(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('officerFirstName').value;
    const lastName = document.getElementById('officerLastName').value;
    const email = document.getElementById('officerEmail').value;
    const password = document.getElementById('officerPassword').value;
    const department = document.getElementById('officerDepartment').value;
    
    const submitBtn = document.getElementById('addOfficerBtn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Creating...';
    submitBtn.disabled = true;
    
    try {
        const response = await apiCall('/auth/register', 'POST', {
            firstName,
            lastName,
            email,
            password,
            role: 'officer',
            department
        });
        
        if (response) {
            // Show success message
            alert('Officer created successfully!\n\nOfficer ID: ' + response.userId + '\nName: ' + response.name + '\nDepartment: ' + department);
            
            // Close modal and refresh dashboard
            closeAddOfficerModal();
            refreshAdminDashboard();
            loadUnassignedComplaints(); // Refresh to show new officer in dropdown
        }
    } catch (err) {
        alert('Failed to create officer: ' + err.message);
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

// Load users management data
async function loadUsersManagement() {
    try {
        const allUsers = await apiCall('/users');
        const complaints = await apiCall('/complaints');
        
        const citizens = allUsers.filter(u => u.role === 'citizen');
        const officers = allUsers.filter(u => u.role === 'officer');
        
        renderUsersTable(citizens, complaints);
        renderDepartmentsTable(officers, complaints);
    } catch (err) {
        console.error('Failed to load users management:', err);
    }
}

// Load departments management data
async function loadDepartmentsManagement() {
    try {
        const officers = await apiCall('/users?role=officer');
        const complaints = await apiCall('/complaints');
        renderDepartmentsTable(officers, complaints);
    } catch (err) {
        console.error('Failed to load departments management:', err);
    }
}

// Load analytics data
async function loadAnalytics() {
    try {
        const complaints = await apiCall('/complaints');
        const users = await apiCall('/users');
        
        // Calculate real-time statistics
        const totalComplaints = complaints.length;
        const resolvedComplaints = complaints.filter(c => c.status === 'Resolved').length;
        const pendingComplaints = complaints.filter(c => c.status === 'Pending').length;
        const inProgressComplaints = complaints.filter(c => c.status === 'In Progress').length;
        
        const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;
        
        // Calculate average resolution time (in hours)
        const resolvedWithTime = complaints.filter(c => c.status === 'Resolved' && c.resolvedAt && c.createdAt);
        let avgResolutionTime = 0;
        if (resolvedWithTime.length > 0) {
            const totalTime = resolvedWithTime.reduce((sum, c) => {
                const created = new Date(c.createdAt);
                const resolved = new Date(c.resolvedAt);
                return sum + (resolved - created);
            }, 0);
            avgResolutionTime = Math.round(totalTime / resolvedWithTime.length / (1000 * 60 * 60)); // Convert to hours
        }
        
        // Calculate citizen satisfaction
        const complaintsWithRating = complaints.filter(c => c.rating && c.feedbackSubmitted);
        const avgRating = complaintsWithRating.length > 0 
            ? (complaintsWithRating.reduce((sum, c) => sum + c.rating, 0) / complaintsWithRating.length).toFixed(1)
            : 0;
        const satisfactionRate = complaintsWithRating.length > 0
            ? Math.round((complaintsWithRating.filter(c => c.rating >= 4).length / complaintsWithRating.length) * 100)
            : 0;
        
        // Update DOM elements
        document.getElementById('analyticsTotal').innerText = totalComplaints;
        document.getElementById('analyticsResolutionRate').innerText = resolutionRate + '%';
        document.getElementById('analyticsAvgTime').innerText = avgResolutionTime + 'h';
        document.getElementById('analyticsSatisfaction').innerText = satisfactionRate + '%';
        
        // Render charts if Chart.js is available
        if (typeof Chart !== 'undefined') {
            renderCharts(complaints);
        }
        
    } catch (err) {
        console.error('Failed to load analytics:', err);
    }
}

// Render charts for analytics
function renderCharts(complaints) {
    // Status distribution
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        const statusData = {
            Pending: complaints.filter(c => c.status === 'Pending').length,
            'In Progress': complaints.filter(c => c.status === 'In Progress').length,
            Resolved: complaints.filter(c => c.status === 'Resolved').length
        };
        
        new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: ['#f59e0b', '#3b82f6', '#10b981']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    // Priority distribution
    const priorityCtx = document.getElementById('priorityChart');
    if (priorityCtx) {
        const priorityData = {
            Urgent: complaints.filter(c => c.priority === 'urgent').length,
            High: complaints.filter(c => c.priority === 'high').length,
            Medium: complaints.filter(c => c.priority === 'medium').length,
            Low: complaints.filter(c => c.priority === 'low').length
        };
        
        new Chart(priorityCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(priorityData),
                datasets: [{
                    label: 'Complaints',
                    data: Object.values(priorityData),
                    backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    // Department distribution
    const deptCtx = document.getElementById('departmentChart');
    if (deptCtx) {
        const deptData = {};
        complaints.forEach(c => {
            deptData[c.department] = (deptData[c.department] || 0) + 1;
        });
        
        new Chart(deptCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(deptData),
                datasets: [{
                    data: Object.values(deptData),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// Seed default officers for each department
async function seedDefaultOfficers() {
    if (!confirm('This will create default officers for all departments that don\'t have one yet.\n\nDefault password: Officer123\n\nContinue?')) {
        return;
    }

    try {
        const response = await apiCall('/users/seed-officers', 'POST');
        
        if (response.officers && response.officers.length > 0) {
            alert(`✅ Successfully created ${response.officers.length} officers!\n\n${response.officers.map(o => `- ${o.name} (${o.department})\n  ID: ${o.userId}\n  Password: ${o.password}`).join('\n\n')}`);
        } else {
            alert('ℹ️ All departments already have officers.');
        }
        
        // Refresh the departments view
        loadDepartmentsManagement();
    } catch (err) {
        alert('❌ Failed to seed officers: ' + err.message);
    }
}
