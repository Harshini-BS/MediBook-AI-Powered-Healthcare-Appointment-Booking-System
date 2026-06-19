const express = require('express');
const router = express.Router();
const { streamAppointmentPDF } = require('../utils/pdfGenerator');
const Appointment = require('../models/Appointment');
const {
  createAppointment,
  getAppointmentByRef,
  getAllAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  getDashboardStats,
} = require('../controllers/appointmentController');

router.get('/stats', getDashboardStats);
router.post('/', createAppointment);
router.get('/', getAllAppointments);

// IMPORTANT: specific routes BEFORE the generic /:referenceId route
router.get('/:referenceId/pdf', async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ referenceId: req.params.referenceId });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    streamAppointmentPDF(appointment.toObject(), res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:referenceId', getAppointmentByRef);
router.patch('/:referenceId/status', updateAppointmentStatus);
router.delete('/:referenceId', deleteAppointment);

module.exports = router;