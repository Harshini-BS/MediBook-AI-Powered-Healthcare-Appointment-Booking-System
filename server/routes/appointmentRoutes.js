const express = require('express');
const router = express.Router();
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
router.get('/:referenceId', getAppointmentByRef);
router.patch('/:referenceId/status', updateAppointmentStatus);
router.delete('/:referenceId', deleteAppointment);

module.exports = router;