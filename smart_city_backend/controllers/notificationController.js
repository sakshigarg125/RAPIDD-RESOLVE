const Notification = require('../models/notification');

// @desc    Get user notifications
// @route   GET /api/notifications
exports.getNotifications = async (req, res) => {
    try {
        const user = JSON.parse(req.headers.user || '{}');
        const notifications = await Notification.find({ userId: user.userId })
            .sort('-createdAt')
            .limit(50);
        
        const unreadCount = await Notification.countDocuments({ 
            userId: user.userId, 
            read: false 
        });
        
        res.json({
            notifications,
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );
        
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/mark-all-read
exports.markAllAsRead = async (req, res) => {
    try {
        const user = JSON.parse(req.headers.user || '{}');
        await Notification.updateMany(
            { userId: user.userId, read: false },
            { read: true }
        );
        
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create notification (internal function)
exports.createNotification = async (userId, title, message, type = 'complaint', priority = 'medium', relatedId = null, actionUrl = null) => {
    try {
        const notification = await Notification.create({
            userId,
            title,
            message,
            type,
            priority,
            relatedId,
            actionUrl
        });
        
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findByIdAndDelete(req.params.id);
        
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
