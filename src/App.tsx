import { useState } from 'react'
import BookingForm from './Bookingform/Bookingform.jsx'
import AIChat from './AIchat/AIchat.jsx'
import { appointmentAPI } from './Services/api'
import './App.css'

function App() {
  const [appointmentData, setAppointmentData] = useState<any>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelMessage, setCancelMessage] = useState<string | null>(null)

  const handleSuccess = (data: any, pdfUrl?: string) => {
    console.log('Appointment created:', data, pdfUrl)
    setAppointmentData(data)
    setPdfUrl(pdfUrl || null)
    setCancelMessage(null)
  }

  const handleReset = () => {
    setAppointmentData(null)
    setPdfUrl(null)
    setCancelMessage(null)
  }

 const handleCancelAppointment = async () => {
  if (!appointmentData?.referenceId) return
  setCancelLoading(true)
  setCancelMessage(null)

  try {
    const res = await appointmentAPI.updateStatus(appointmentData.referenceId, 'cancelled')
    setAppointmentData(res.data.data) // update status to 'cancelled' in UI, stay on this screen
    setCancelMessage('Your appointment has been cancelled successfully.')
  } catch (err) {
    setCancelMessage('Unable to cancel the appointment right now. Please try again.')
  } finally {
    setCancelLoading(false)
  }
}

  if (appointmentData && pdfUrl) {
    return (
      <div className="app-root">
        <header style={{padding:20}}>
          <h1 style={{margin:0}}>✓ Appointment Confirmed</h1>
        </header>
        <main style={{padding:20, maxWidth: 600, margin: '0 auto'}}>
          <div style={{background: '#e6f9f0', padding: 20, borderRadius: 12, marginBottom: 20}}>
            <h2 style={{margin: '0 0 10px 0', color: '#0f4c81'}}>Booking Successful!</h2>
            <p style={{margin: 0, color: '#475569'}}>
              Your appointment has been confirmed. Reference ID: <strong>{appointmentData.referenceId}</strong>
            </p>
          </div>

          <div style={{background: '#f0f7ff', padding: 16, borderRadius: 12, marginBottom: 20}}>
            <h3 style={{margin: '0 0 12px 0', color: '#0f4c81'}}>Appointment Details</h3>
            <div style={{fontSize: 14, color: '#475569', lineHeight: 1.8}}>
              <p><strong>Patient:</strong> {appointmentData.patientName}</p>
              <p><strong>Hospital:</strong> {appointmentData.hospitalName}</p>
              <p><strong>Department:</strong> {appointmentData.department}</p>
              <p><strong>Date:</strong> {new Date(appointmentData.appointmentDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {appointmentData.appointmentTime}</p>
              <p><strong>Status:</strong> {appointmentData.status}</p>
            </div>
          </div>

          {cancelMessage && (
            <div style={{background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20, color: '#0f172a'}}>
              {cancelMessage}
            </div>
          )}

          <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
            <a
             href={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api','')}/api/appointments/${appointmentData.referenceId}/pdf`}
  target="_blank"
  rel="noopener noreferrer"
  style={{
    flex: 1,
    minWidth: 160,
    padding: '12px 20px',
    background: '#0f4c81',
    color: 'white',
    textDecoration: 'none',
    borderRadius: 8,
    textAlign: 'center',
    fontWeight: 600,
  }}
>
  📥 Download PDF
</a>
            <button
              onClick={handleCancelAppointment}
              disabled={cancelLoading || appointmentData.status === 'cancelled'}
              style={{
                flex: 1,
                minWidth: 160,
                padding: '12px 20px',
                background: appointmentData.status === 'cancelled' ? '#cbd5e1' : '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: cancelLoading || appointmentData.status === 'cancelled' ? 'not-allowed' : 'pointer',
              }}
            >
              {cancelLoading ? 'Cancelling...' : appointmentData.status === 'cancelled' ? 'Cancelled' : 'Cancel Appointment'}
            </button>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                minWidth: 160,
                padding: '12px 20px',
                background: '#e2e8f0',
                color: '#334155',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Book Another
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-root">
      <header style={{padding:20}}>
        <h1 style={{margin:0}}>MediBook — Book Appointments</h1>
      </header>
      <main style={{padding:20}}>
        <BookingForm onSuccess={handleSuccess} />
      </main>
      <AIChat />
    </div>
  )
}

export default App
