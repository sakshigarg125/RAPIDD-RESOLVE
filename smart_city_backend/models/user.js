const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // custom ID like 'ADM-1', 'CT-1'
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'officer', 'admin'], default: 'citizen' },
  department: { type: String }, // For officers
  activeWorkload: { type: Number, default: 0 },
  resRate: { type: String, default: '0%' },
  status: { type: String, enum: ['Active', 'Blocked'], default: 'Active' },
  joined: { type: String, default: () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
}, { timestamps: true });  // automatically track when it was created and updated

module.exports = mongoose.model('User', userSchema);