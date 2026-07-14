const express = require('express');
const router = express.Router();
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require('../controllers/notificationController');

router.route('/')
    .get(getNotifications);

router.route('/mark-all-read')
    .patch(markAllAsRead);

router.route('/:id/read')
    .patch(markAsRead);

router.route('/:id')
    .delete(deleteNotification);

module.exports = router;
