const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const PDF_DIR = path.join(__dirname, '..', 'generated_pdfs');

// Ensure PDF directory exists
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

const generateAppointmentPDF = (appointment) => {
  return new Promise((resolve, reject) => {
    try {
      const filename = `appointment_${appointment.referenceId}.pdf`;
      const filepath = path.join(PDF_DIR, filename);
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);
      buildPdfContent(doc, appointment);
      doc.end();

      stream.on('finish', () => resolve({ filename, filepath }));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

// ─── Stream PDF directly to an HTTP response (no disk write) ──────────────────
// Works reliably on hosts with ephemeral filesystems (e.g. Render free tier),
// where files written to disk can disappear after the server restarts/sleeps.
const streamAppointmentPDF = (appointment, res) => {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="appointment_${appointment.referenceId}.pdf"`);
  doc.pipe(res);
  buildPdfContent(doc, appointment);
  doc.end();
};

// ─── Shared PDF layout builder ─────────────────────────────────────────────────
const buildPdfContent = (doc, appointment) => {
  try {
    // ─── Header Bar ───────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 100).fill('#0f4c81');

    doc.fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(28)
      .text('MediBook', 50, 30);
    doc.fillColor('#a8d5ff')
      .font('Helvetica')
      .fontSize(12)
      .text('Smart Healthcare Appointment System', 50, 62);

    // ─── Confirmed Badge ───────────────────────────────────────────
    const badgeX = doc.page.width - 160;
    doc.roundedRect(badgeX, 25, 110, 50, 8).fill('#22c55e');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text('✓ CONFIRMED', badgeX + 15, 45);

    // ─── Appointment Title ─────────────────────────────────────────
    doc.moveDown(3);
    doc.fillColor('#0f4c81').font('Helvetica-Bold').fontSize(20).text('Appointment Confirmation', { align: 'center' });
    doc.moveDown(0.4);
    doc.fillColor('#64748b').font('Helvetica').fontSize(11).text(`Reference ID: ${appointment.referenceId}`, { align: 'center' });

    // ─── Divider ───────────────────────────────────────────────────
    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.moveDown(0.8);

    // ─── Patient Info Section ──────────────────────────────────────
    const sectionY = doc.y;
    doc.rect(50, sectionY - 4, doc.page.width - 100, 22).fill('#f0f7ff');
    doc.fillColor('#0f4c81').font('Helvetica-Bold').fontSize(13).text('Patient Information', 58, sectionY);
    doc.moveDown(1.2);

    const infoRows = [
      ['Patient Name', appointment.patientName],
      ['Age', `${appointment.age} years`],
      ['Gender', appointment.gender],
      ['Contact Number', appointment.contactNumber],
      ['Email Address', appointment.email || 'N/A'],
    ];

    infoRows.forEach(([label, value], i) => {
      const rowY = doc.y;
      if (i % 2 === 0) doc.rect(50, rowY - 4, doc.page.width - 100, 22).fill('#f8fafc');
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(10).text(label + ':', 58, rowY);
      doc.fillColor('#1e293b').font('Helvetica').fontSize(10).text(value, 230, rowY);
      doc.moveDown(0.75);
    });

    doc.moveDown(0.4);

    // ─── Appointment Info Section ──────────────────────────────────
    const apptSectionY = doc.y;
    doc.rect(50, apptSectionY - 4, doc.page.width - 100, 22).fill('#f0f7ff');
    doc.fillColor('#0f4c81').font('Helvetica-Bold').fontSize(13).text('Appointment Details', 58, apptSectionY);
    doc.moveDown(1.2);

    const apptRows = [
      ['Hospital / Clinic', appointment.hospitalName],
      ['Department', appointment.department],
      ['Condition / Disease', appointment.disease],
      ['Appointment Date', new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
      ['Appointment Time', appointment.appointmentTime],
      ['Doctor Preference', appointment.doctorPreference || 'No preference'],
      ['Priority Level', appointment.priority?.toUpperCase() || 'NORMAL'],
    ];

    apptRows.forEach(([label, value], i) => {
      const rowY = doc.y;
      if (i % 2 === 0) doc.rect(50, rowY - 4, doc.page.width - 100, 22).fill('#f8fafc');
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(10).text(label + ':', 58, rowY);
      doc.fillColor('#1e293b').font('Helvetica').fontSize(10).text(String(value), 230, rowY);
      doc.moveDown(0.75);
    });

    if (appointment.additionalNotes) {
      doc.moveDown(0.4);
      const notesY = doc.y;
      doc.rect(50, notesY - 4, doc.page.width - 100, 22).fill('#f0f7ff');
      doc.fillColor('#0f4c81').font('Helvetica-Bold').fontSize(13).text('Additional Notes', 58, notesY);
      doc.moveDown(1);
      doc.rect(50, doc.y - 4, doc.page.width - 100, 50).fill('#fffbeb');
      doc.fillColor('#78350f').font('Helvetica').fontSize(10).text(appointment.additionalNotes, 58, doc.y, { width: doc.page.width - 116 });
      doc.moveDown(2);
    }

    // ─── Footer ────────────────────────────────────────────────────
    doc.moveDown(1.5);
    doc.rect(50, doc.y, doc.page.width - 100, 60).fill('#f0f7ff');
    const footerY = doc.y + 10;
    doc.fillColor('#0f4c81').font('Helvetica-Bold').fontSize(10)
      .text('Important Instructions:', 65, footerY);
    doc.fillColor('#475569').font('Helvetica').fontSize(9)
      .text('• Please arrive 15 minutes before your scheduled appointment time.', 65, footerY + 15)
      .text('• Carry this confirmation along with a valid photo ID.', 65, footerY + 28)
      .text('• Contact us at least 24 hours in advance if you need to reschedule.', 65, footerY + 41);

    // Page number
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
      .text(`Generated on ${new Date().toLocaleString('en-IN')} | MediBook Healthcare System`, 50, doc.page.height - 40, { align: 'center' });

  } catch (error) {
    console.error('PDF content build error:', error);
    throw error;
  }
};

module.exports = { generateAppointmentPDF, streamAppointmentPDF };