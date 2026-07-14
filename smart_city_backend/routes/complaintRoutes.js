const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createComplaint, getComplaints, updateComplaint, submitFeedback, getOfficerPerformance } = require('../controllers/complaintController');

// Ensure native path safely maps during bootstrap
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, 'uploads/'); },
  filename(req, file, cb) { cb(null, `proof-${Date.now()}${path.extname(file.originalname)}`); }
});
const upload = multer({ storage });

router.route('/')
  .get(getComplaints)
  .post(upload.single('image'), createComplaint);

router.route('/:id')
  .patch(updateComplaint);

router.route('/:id/feedback')
  .post(submitFeedback);

router.route('/officer/:officerId/performance')
  .get(getOfficerPerformance);

module.exports = router;