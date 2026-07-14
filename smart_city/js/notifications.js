// Notification System
let notificationCount = 0;
let notifications = [];

// Initialize notification system
function initNotifications() {
    loadNotifications();
    // Check for new notifications every 30 seconds
    setInterval(loadNotifications, 30000);
}

// Load notifications from server
async function loadNotifications() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (!user) return;

        const response = await apiCall('/notifications', 'GET');
        notifications = response.notifications || [];
        notificationCount = response.unreadCount || 0;
        
        updateNotificationBadge();
        updateNotificationDropdown();
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

// Update notification badge
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (notificationCount > 0) {
            badge.textContent = notificationCount > 99 ? '99+' : notificationCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Update notification dropdown
function updateNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;

    const container = dropdown.querySelector('.notification-list');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = '<div class="notification-empty">No notifications</div>';
        return;
    }

    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
             onclick="handleNotificationClick('${notification._id}', '${notification.actionUrl || ''}')">
            <div class="notification-content">
                <div class="notification-header">
                    <span class="notification-title">${notification.title}</span>
                    <span class="notification-time">${formatTime(notification.createdAt)}</span>
                </div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-priority priority-${notification.priority}"></div>
            </div>
            <button class="notification-delete" onclick="deleteNotification('${notification._id}', event)">×</button>
        </div>
    `).join('');
}

// Handle notification click
async function handleNotificationClick(notificationId, actionUrl) {
    // Mark as read
    try {
        await apiCall(`/notifications/${notificationId}/read`, 'PATCH');
        loadNotifications();
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }

    // Navigate to action URL if provided
    if (actionUrl) {
        window.location.href = actionUrl;
    }
}

// Delete notification
async function deleteNotification(notificationId, event) {
    event.stopPropagation();
    
    try {
        await apiCall(`/notifications/${notificationId}`, 'DELETE');
        loadNotifications();
    } catch (error) {
        console.error('Failed to delete notification:', error);
    }
}

// Mark all notifications as read
async function markAllAsRead() {
    try {
        await apiCall('/notifications/mark-all-read', 'PATCH');
        loadNotifications();
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
    }
}

// Toggle notification dropdown
function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;

    dropdown.classList.toggle('show');
    
    if (dropdown.classList.contains('show')) {
        loadNotifications();
    }
}

// Format time
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Close notification dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('notificationDropdown');
    const notificationIcon = document.getElementById('notificationIcon');
    
    if (dropdown && !dropdown.contains(event.target) && !notificationIcon.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});
