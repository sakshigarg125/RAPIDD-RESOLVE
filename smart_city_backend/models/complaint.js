const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, required: true, unique: true }, // custom ID like '#C-8542'
  citizenId: { type: String, ref: 'User', required: true }, // reference by manual custom ID
  department: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  assignedTo: { type: String, ref: 'User', default: null }, // officer ID
  remarks: { type: String, default: '' },
  imageUrl: { type: String, default: null }, // Optional photo proof url (legacy)
  attachments: [{ 
    filename: String, 
    originalName: String, 
    mimeType: String, 
    size: Number, 
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }], // Multiple file attachments
  escalatedAt: { type: Date, default: null }, // Auto-escalation timestamp
  resolvedAt: { type: Date, default: null },
  // Feedback and Rating fields
  rating: { type: Number, min: 1, max: 5, default: null }, // 1-5 star rating
  feedback: { type: String, default: '' }, // Citizen feedback text
  feedbackDate: { type: Date, default: null },
  feedbackSubmitted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);cd