const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
};

// Send email notification
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: '"Smart City System" <smartcity@system.com>',
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Email templates
const emailTemplates = {
  complaintFiled: (complaint) => ({
    subject: `Complaint ${complaint.complaintId} Filed Successfully`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Smart City Complaint System</h2>
        <p>Dear Citizen,</p>
        <p>Your complaint has been successfully filed with the following details:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
          <p><strong>Category:</strong> ${complaint.department}</p>
          <p><strong>Location:</strong> ${complaint.location}</p>
          <p><strong>Priority:</strong> ${complaint.priority || 'Medium'}</p>
          <p><strong>Status:</strong> ${complaint.status}</p>
        </div>
        <p>You will receive another email once an officer is assigned to your complaint.</p>
        <p>Thank you for helping us improve our city!</p>
      </div>
    `
  }),

  officerAssigned: (complaint, officer) => ({
    subject: `Officer Assigned to Complaint ${complaint.complaintId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Officer Assignment Update</h2>
        <p>Dear Citizen,</p>
        <p>An officer has been assigned to your complaint ${complaint.complaintId}.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Officer Name:</strong> ${officer.name}</p>
          <p><strong>Department:</strong> ${officer.department}</p>
          <p><strong>Status:</strong> In Progress</p>
        </div>
        <p>The officer will contact you soon and begin working on your complaint.</p>
      </div>
    `
  }),

  statusUpdated: (complaint, newStatus, remarks) => ({
    subject: `Complaint ${complaint.complaintId} Status Updated`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Status Update</h2>
        <p>Dear Citizen,</p>
        <p>Your complaint ${complaint.complaintId} status has been updated.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>New Status:</strong> ${newStatus}</p>
          <p><strong>Officer Remarks:</strong> ${remarks || 'No remarks provided'}</p>
          <p><strong>Updated At:</strong> ${new Date().toLocaleString()}</p>
        </div>
        ${newStatus === 'Resolved' ? '<p style="color: #10b981; font-weight: bold;">Your complaint has been resolved! Thank you for your patience.</p>' : '<p>We are working on your complaint and will update you soon.</p>'}
      </div>
    `
  }),

  feedbackRequest: (complaint) => ({
    subject: `Rate Your Experience - Complaint ${complaint.complaintId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">We Value Your Feedback</h2>
        <p>Dear Citizen,</p>
        <p>Your complaint ${complaint.complaintId} has been resolved.</p>
        <p>Please take a moment to rate your experience and provide feedback to help us improve our services.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3000/feedback/${complaint.complaintId}" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Submit Feedback
          </a>
        </div>
        <p>Thank you for using Smart City Complaint System!</p>
      </div>
    `
  })
};

module.exports = {
  sendEmail,
  emailTemplates
};
