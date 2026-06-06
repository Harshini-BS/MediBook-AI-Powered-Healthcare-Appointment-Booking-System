const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  referenceId: {
    type: String,
    unique: true,
    required: true,
  },
  patientName: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true,
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [0, 'Age must be positive'],
    max: [120, 'Age must be realistic'],
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: [true, 'Gender is required'],
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  disease: {
    type: String,
    required: [true, 'Condition/Disease is required'],
    trim: true,
  },
  hospitalName: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  district: {
    type: String,
    trim: true,
  },
  zipCode: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required'],
  },
  appointmentTime: {
    type: String,
    required: [true, 'Appointment time is required'],
  },
  doctorPreference: {
    type: String,
    trim: true,
  },
  additionalNotes: {
    type: String,
    trim: true,
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent', 'emergency'],
    default: 'normal',
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'cancelled', 'completed'],
    default: 'confirmed',
  },
  pdfPath: {
    type: String,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Appointment', appointmentSchema);