const Complaint = require('../models/complaint');
const User = require('../models/user');
const { sendEmail, emailTemplates } = require('../services/emailService');

// @desc    Create a complaint
// @route   POST /api/complaints
exports.createComplaint = async (req, res) => {
  try {
    const { department, location, description, citizenId, priority } = req.body;

    // Generate custom complaintID
    const complaintId = `#C-${Math.floor(1000 + Math.random() * 9000)}`;

    const complaint = await Complaint.create({
      complaintId,
      citizenId, // this is expected to be the manual userId, e.g., 'CT-1'
      department,
      location,
      description,
      priority: priority || 'medium',
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null
    });

    // Send email notification to citizen
    try {
      const citizen = await User.findOne({ userId: citizenId });
      if (citizen && citizen.email) {
        const template = emailTemplates.complaintFiled(complaint);
        await sendEmail(citizen.email, template.subject, template.html);
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all complaints (Admin) or complaints assigned to an officer
// @route   GET /api/complaints
exports.getComplaints = async (req, res) => {
  try {
    const { officerId, citizenId } = req.query;

    let query = {};
    if (officerId) query.assignedTo = officerId;
    if (citizenId) query.citizenId = citizenId;

    const complaints = await Complaint.find(query).sort('-createdAt');
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update complaint status
// @route   PATCH /api/complaints/:id
exports.updateComplaint = async (req, res) => {
  try {
    const { status, remarks, assignedTo } = req.body;
    const complaint = await Complaint.findOne({ complaintId: req.params.id });

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const previousStatus = complaint.status;
    const wasAssigned = complaint.assignedTo;

    if (status) complaint.status = status;
    if (remarks) complaint.remarks = remarks;
    if (assignedTo) complaint.assignedTo = assignedTo;

    await complaint.save();

    // Send email notifications
    try {
      const citizen = await User.findOne({ userId: complaint.citizenId });
      
      if (citizen && citizen.email) {
        // Send assignment notification
        if (assignedTo && !wasAssigned) {
          const officer = await User.findOne({ userId: assignedTo });
          if (officer) {
            const template = emailTemplates.officerAssigned(complaint, officer);
            await sendEmail(citizen.email, template.subject, template.html);
          }
        }
        
        // Send status update notification
        if (status && status !== previousStatus) {
          const template = emailTemplates.statusUpdated(complaint, status, remarks);
          await sendEmail(citizen.email, template.subject, template.html);
          
          // If resolved, send feedback request after 1 hour
          if (status === 'Resolved') {
            setTimeout(async () => {
              try {
                const feedbackTemplate = emailTemplates.feedbackRequest(complaint);
                await sendEmail(citizen.email, feedbackTemplate.subject, feedbackTemplate.html);
              } catch (err) {
                console.error('Failed to send feedback email:', err);
              }
            }, 60 * 60 * 1000); // 1 hour delay
          }
        }
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit feedback for resolved complaint
// @route   POST /api/complaints/:id/feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const complaint = await Complaint.findOne({ complaintId: req.params.id });

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (complaint.status !== 'Resolved') {
      return res.status(400).json({ message: 'Can only submit feedback for resolved complaints' });
    }

    if (complaint.feedbackSubmitted) {
      return res.status(400).json({ message: 'Feedback already submitted for this complaint' });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    complaint.rating = rating;
    complaint.feedback = feedback || '';
    complaint.feedbackDate = new Date();
    complaint.feedbackSubmitted = true;

    await complaint.save();

    res.json({
      message: 'Feedback submitted successfully',
      complaint: {
        complaintId: complaint.complaintId,
        rating: complaint.rating,
        feedback: complaint.feedback,
        feedbackDate: complaint.feedbackDate
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get officer performance metrics including ratings
// @route   GET /api/complaints/officer/:officerId/performance
exports.getOfficerPerformance = async (req, res) => {
  try {
    const { officerId } = req.params;
    
    // Get all resolved complaints assigned to this officer
    const resolvedComplaints = await Complaint.find({
      assignedTo: officerId,
      status: 'Resolved',
      feedbackSubmitted: true
    });

    // Calculate average rating
    const totalRatings = resolvedComplaints.reduce((sum, c) => sum + (c.rating || 0), 0);
    const averageRating = resolvedComplaints.length > 0 ? (totalRatings / resolvedComplaints.length).toFixed(1) : 0;

    // Get rating distribution
    const ratingDistribution = {
      5: resolvedComplaints.filter(c => c.rating === 5).length,
      4: resolvedComplaints.filter(c => c.rating === 4).length,
      3: resolvedComplaints.filter(c => c.rating === 3).length,
      2: resolvedComplaints.filter(c => c.rating === 2).length,
      1: resolvedComplaints.filter(c => c.rating === 1).length
    };

    // Get recent feedback
    const recentFeedback = resolvedComplaints
      .filter(c => c.feedbackSubmitted)
      .sort((a, b) => b.feedbackDate - a.feedbackDate)
      .slice(0, 5)
      .map(c => ({
        complaintId: c.complaintId,
        rating: c.rating,
        feedback: c.feedback,
        date: c.feedbackDate
      }));

    res.json({
      officerId,
      totalResolvedComplaints: resolvedComplaints.length,
      averageRating: parseFloat(averageRating),
      ratingDistribution,
      recentFeedback,
      satisfactionRate: resolvedComplaints.length > 0 
        ? Math.round((resolvedComplaints.filter(c => c.rating >= 4).length / resolvedComplaints.length) * 100)
        : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};