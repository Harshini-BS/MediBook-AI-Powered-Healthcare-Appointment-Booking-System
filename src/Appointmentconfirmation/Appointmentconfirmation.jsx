import React from 'react';
import { CheckCircle, Download, Copy, Calendar, Building, User, Clock, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import './Appointmentconfirmation.css';

const AppointmentConfirmation = ({ appointment, pdfUrl, onBookAnother }) => {
  const copyRefId = () => {
    navigator.clipboard.writeText(appointment.referenceId);
    toast.success('Reference ID copied!');
  };

  // ✅ New version
const downloadPdf = () => {
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  window.open(`${base}/api/appointments/${appointment.referenceId}/pdf`, '_blank');
};

  const priorityColor = { normal: '#22c55e', urgent: '#f59e0b', emergency: '#ef4444' };

  return (
    <div className="confirmation animate-bounce-in">
      <div className="confirmation__header">
        <div className="confirmation__icon">
          <CheckCircle size={40} strokeWidth={1.5} />
        </div>
        <h2>Appointment Confirmed!</h2>
        <p>Your appointment has been successfully booked. A confirmation PDF has been generated.</p>
      </div>

      <div className="confirmation__ref">
        <span>Reference ID</span>
        <div className="ref-id">
          <strong>{appointment.referenceId}</strong>
          <button onClick={copyRefId} title="Copy"><Copy size={14}/></button>
        </div>
      </div>

      <div className="confirmation__details">
        <div className="detail-card">
          <User size={16}/>
          <div>
            <span>Patient</span>
            <strong>{appointment.patientName}, {appointment.age} yrs</strong>
          </div>
        </div>
        <div className="detail-card">
          <Building size={16}/>
          <div>
            <span>Hospital</span>
            <strong>{appointment.hospitalName}</strong>
          </div>
        </div>
        <div className="detail-card">
          <Calendar size={16}/>
          <div>
            <span>Date</span>
            <strong>{new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}</strong>
          </div>
        </div>
        <div className="detail-card">
          <Clock size={16}/>
          <div>
            <span>Time</span>
            <strong>{appointment.appointmentTime}</strong>
          </div>
        </div>
        {appointment.contactNumber && (
          <div className="detail-card">
            <Phone size={16}/>
            <div>
              <span>Contact</span>
              <strong>{appointment.contactNumber}</strong>
            </div>
          </div>
        )}
        {appointment.email && (
          <div className="detail-card">
            <Mail size={16}/>
            <div>
              <span>Email</span>
              <strong>{appointment.email}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="confirmation__priority">
        <span style={{ background: priorityColor[appointment.priority] + '20', color: priorityColor[appointment.priority], borderColor: priorityColor[appointment.priority] + '40' }}>
          {appointment.priority?.toUpperCase()} PRIORITY
        </span>
        <span className="status-badge">{appointment.status?.toUpperCase()}</span>
      </div>

      <div className="confirmation__notice">
        <p>📌 Please arrive <strong>15 minutes early</strong> and carry this confirmation + valid photo ID.</p>
      </div>

      <div className="confirmation__actions">
    
            {appointment.referenceId && (
            <button className="btn-pdf" onClick={downloadPdf}>
              <Download size={16}/>
              Download PDF
            </button>
)}
        <button className="btn-again" onClick={onBookAnother}>
          + Book Another
        </button>
      </div>
    </div>
  );
};

export default AppointmentConfirmation;