const Appointment = require('../models/Appointment');
const { generateAppointmentPDF } = require('../utils/pdfGenerator');
const { v4: uuidv4 } = require('uuid');

// Generate short reference ID
const generateReferenceId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `MB-${timestamp}-${random}`;
};

// Create appointment
const createAppointment = async (req, res) => {
  try {
    console.log('Create appointment request body:', req.body);
    const referenceId = generateReferenceId();

    const appointment = new Appointment({
      ...req.body,
      referenceId,
    });

    await appointment.save();

    // Generate PDF
    try {
      const { filename } = await generateAppointmentPDF(appointment.toObject());
      appointment.pdfPath = `/pdfs/${filename}`;
      await appointment.save();
    } catch (pdfErr) {
      console.error('PDF generation failed:', pdfErr);
      // don't fail the whole request if PDF generation fails
    }

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment,
      pdfUrl: appointment.pdfPath,
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    if (error.name === 'ValidationError') {
      const details = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return res.status(400).json({ success: false, message: 'Validation failed', errors: details });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get appointment by reference ID
const getAppointmentByRef = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ referenceId: req.params.referenceId });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all appointments
const getAllAppointments = async (req, res) => {
  try {
    const { status, date, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.appointmentDate = { $gte: start, $lt: end };
    }

    const total = await Appointment.countDocuments(filter);
    const appointments = await Appointment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: appointments,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update appointment status
const updateAppointmentStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { referenceId: req.params.referenceId },
      { status: req.body.status },
      { new: true }
    );
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete appointment
const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({ referenceId: req.params.referenceId });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const [total, confirmed, scheduled, cancelled, completed] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'confirmed' }),
      Appointment.countDocuments({ status: 'scheduled' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      Appointment.countDocuments({ status: 'completed' }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayAppointments = await Appointment.countDocuments({
      appointmentDate: { $gte: today, $lt: todayEnd },
    });

    const recentAppointments = await Appointment.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: { total, confirmed, scheduled, cancelled, completed, todayAppointments, recentAppointments },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createAppointment,
  getAppointmentByRef,
  getAllAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  getDashboardStats,
};