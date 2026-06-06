import React, { useState } from 'react';
import { User, Phone, Mail, Calendar, Building, Stethoscope, Clock, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { appointmentAPI, aiAPI } from '../Services/api';
import toast from 'react-hot-toast';
import './BookingForm.css';

const DEPARTMENTS = [
  'General Medicine','Cardiology','Orthopedics','Neurology','Dermatology',
  'Gynecology','Pediatrics','ENT','Ophthalmology','Psychiatry','Dentistry',
  'Oncology','Urology','Gastroenterology','Pulmonology',
];

const TIME_SLOTS = [
  '08:00 AM','08:30 AM','09:00 AM','09:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','02:00 PM','02:30 PM','03:00 PM',
  '03:30 PM','04:00 PM','04:30 PM','05:00 PM',
];

const INITIAL_FORM = {
  patientName: '', age: '', gender: '', contactNumber: '', email: '',
  state: '', district: '', zipCode: '',
  disease: '', hospitalName: '', department: '', appointmentDate: '',
  appointmentTime: '', doctorPreference: '', additionalNotes: '', priority: 'normal',
};

const BookingForm = ({ onSuccess }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [step, setStep] = useState(1);
  const [suggestion, setSuggestion] = useState(null);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAISuggest = async () => {
    if (!form.disease.trim()) {
      toast.error('Please enter your symptoms/condition first');
      return;
    }
    setAiSuggesting(true);
    try {
      const res = await aiAPI.suggestDepartment(form.disease);
      const { department, urgency } = res.data.data;
      const aiSuggestion = {
        department,
        urgency: urgency === 'emergency' ? 'emergency' : urgency === 'urgent' ? 'urgent' : 'normal',
        reason: res.data.data.reason,
      };
      setForm(prev => ({ ...prev, department, priority: aiSuggestion.urgency }));
      setSuggestion(aiSuggestion);
      toast.success(`AI suggests: ${department}`);
    } catch {
      setSuggestion({ department: '', urgency: '', reason: 'Could not get suggestion' });
      toast.error('Could not get AI suggestion');
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await appointmentAPI.create(form);
      toast.success('Appointment booked successfully!');
      onSuccess(res.data.data, res.data.pdfUrl);
      setForm(INITIAL_FORM);
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const step1Valid = form.patientName && form.age && form.gender && form.contactNumber && form.state && form.district && form.zipCode;
  const step2Valid = form.disease && form.hospitalName && form.department;

  return (
    <div className="booking-form">
      {/* Steps indicator */}
      <div className="steps">
        {[1,2,3].map(s => (
          <div key={s} className={`step ${s === step ? 'step--active' : ''} ${s < step ? 'step--done' : ''}`}>
            <div className="step__num">{s < step ? '✓' : s}</div>
            <span>{s===1?'Patient Info':s===2?'Medical Details':'Schedule'}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Step 1: Patient Info ── */}
        {step === 1 && (
          <div className="form-section animate-fade-in">
            <h3 className="form-section__title"><User size={18}/>Patient Information</h3>
            <div className="form-grid">
              <div className="form-field form-field--full">
                <label>Full Name *</label>
                <div className="input-wrap">
                  <User size={16} className="input-icon"/>
                  <input name="patientName" value={form.patientName} onChange={handleChange} placeholder="Enter patient's full name" required/>
                </div>
              </div>
              <div className="form-field">
                <label>Age *</label>
                <input name="age" type="number" value={form.age} onChange={handleChange} placeholder="Age" min="0" max="120" required/>
              </div>
              <div className="form-field">
                <label>Gender *</label>
                <select name="gender" value={form.gender} onChange={handleChange} required>
                  <option value="">Select gender</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="form-field">
                <label>Contact Number *</label>
                <div className="input-wrap">
                  <Phone size={16} className="input-icon"/>
                  <input name="contactNumber" value={form.contactNumber} onChange={handleChange} placeholder="+91 9876543210" required/>
                </div>
              </div>
              <div className="form-field">
                <label>State *</label>
                <input name="state" value={form.state} onChange={handleChange} placeholder="State" required/>
              </div>
              <div className="form-field">
                <label>District *</label>
                <input name="district" value={form.district} onChange={handleChange} placeholder="District" required/>
              </div>
              <div className="form-field">
                <label>Zip Code *</label>
                <input name="zipCode" value={form.zipCode} onChange={handleChange} placeholder="Zip / Postal code" required/>
              </div>
              <div className="form-field">
                <label>Email Address</label>
                <div className="input-wrap">
                  <Mail size={16} className="input-icon"/>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com"/>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--primary" onClick={() => setStep(2)} disabled={!step1Valid}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Medical Details ── */}
        {step === 2 && (
          <div className="form-section animate-fade-in">
            <h3 className="form-section__title"><Stethoscope size={18}/>Medical Details</h3>
            <div className="form-grid">
              <div className="form-field form-field--full">
                <label>Condition / Symptoms *</label>
                <div className="input-with-ai">
                  <textarea name="disease" value={form.disease} onChange={(e) => { handleChange(e); setSuggestion(null); }} placeholder="Describe symptoms or condition..." rows={3} required/>
                  <button type="button" className="ai-suggest-btn" onClick={handleAISuggest} disabled={aiSuggesting || !form.disease.trim()}>
                    <Sparkles size={14}/>
                    {aiSuggesting ? 'Analyzing...' : 'AI Suggest Dept'}
                  </button>
                </div>
                {suggestion && suggestion.department && (
                  <div className="ai-suggestion-note" style={{ marginTop: 12, padding: '12px 14px', background: '#eef2ff', borderRadius: 10, color: '#1e293b' }}>
                    <strong>Suggested Department:</strong> {suggestion.department}
                    <br />
                    <strong>Urgency:</strong> {suggestion.urgency}
                    <br />
                    <strong>Reason:</strong> {suggestion.reason}
                  </div>
                )}
              </div>
              <div className="form-field form-field--full">
                <label>Hospital / Clinic Name *</label>
                <div className="input-wrap">
                  <Building size={16} className="input-icon"/>
                  <input name="hospitalName" value={form.hospitalName} onChange={handleChange} placeholder="Enter hospital or clinic name" required/>
                </div>
              </div>
              <div className="form-field">
                <label>Department *</label>
                <select name="department" value={form.department} onChange={handleChange} required>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="form-field form-field--full">
                <label>Doctor Preference (optional)</label>
                <input name="doctorPreference" value={form.doctorPreference} onChange={handleChange} placeholder="Preferred doctor name"/>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setStep(1)}>← Back</button>
              <button type="button" className="btn btn--primary" onClick={() => setStep(3)} disabled={!step2Valid}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Schedule ── */}
        {step === 3 && (
          <div className="form-section animate-fade-in">
            <h3 className="form-section__title"><Calendar size={18}/>Schedule Appointment</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Appointment Date *</label>
                <div className="input-wrap">
                  <Calendar size={16} className="input-icon"/>
                  <input name="appointmentDate" type="date" value={form.appointmentDate} onChange={handleChange} min={today} required/>
                </div>
              </div>
              <div className="form-field">
                <label>Preferred Time *</label>
                <div className="input-wrap">
                  <Clock size={16} className="input-icon"/>
                  <select name="appointmentTime" value={form.appointmentTime} onChange={handleChange} required>
                    <option value="">Select time slot</option>
                    {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-field form-field--full">
                <label>Additional Notes</label>
                <div className="input-wrap">
                  <FileText size={16} className="input-icon" style={{top:'14px'}}/>
                  <textarea name="additionalNotes" value={form.additionalNotes} onChange={handleChange} placeholder="Any additional information..." rows={3}/>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="booking-summary">
              <div className="summary-row"><span>Patient</span><strong>{form.patientName}</strong></div>
              <div className="summary-row"><span>Hospital</span><strong>{form.hospitalName}</strong></div>
              <div className="summary-row"><span>Department</span><strong>{form.department}</strong></div>
              <div className="summary-row"><span>Location</span><strong>{form.district}, {form.state} {form.zipCode}</strong></div>
              <div className="summary-row"><span>Date & Time</span><strong>{form.appointmentDate} at {form.appointmentTime}</strong></div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setStep(2)}>← Back</button>
              <button type="submit" className="btn btn--success" disabled={loading || !form.appointmentDate || !form.appointmentTime}>
                {loading ? <span className="btn-spinner"/> : null}
                {loading ? 'Booking...' : '✓ Confirm & Book'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default BookingForm;