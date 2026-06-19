




// const Appointment = require('../models/Appointment');
// const { generateAppointmentPDF } = require('../utils/pdfGenerator');

// // ─── Groq API Helper ──────────────────────────────────────────────────────────
// const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// const GROQ_MODEL = 'llama-3.3-70b-versatile';

// const callGroq = async (apiKey, messages, jsonMode = false) => {
//   const body = {
//     model: GROQ_MODEL,
//     messages,
//     temperature: 0.4,
//     max_tokens: 1024,
//   };
//   if (jsonMode) body.response_format = { type: 'json_object' };

//   const response = await fetch(GROQ_URL, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${apiKey}`,
//     },
//     body: JSON.stringify(body),
//   });

//   if (!response.ok) {
//     const err = await response.json();
//     throw new Error(err.error?.message || 'Groq API error');
//   }

//   const data = await response.json();
//   return data.choices?.[0]?.message?.content || '';
// };

// // ─── System Prompt ────────────────────────────────────────────────────────────
// const SYSTEM_PROMPT = `You are MediAssist, a smart healthcare appointment assistant for MediBook. You can:
// 1. Book appointments directly by collecting patient details via conversation
// 2. Check appointment status using a reference ID
// 3. Suggest the right medical department based on symptoms
// 4. Answer general health and appointment questions

// BOOKING FLOW — When a user wants to book an appointment, collect these details ONE BY ONE in a friendly way:
// - Full name
// - Age
// - Gender (Male/Female/Other)
// - Contact number (with country code e.g. +91)
// - Email (optional)
// - Symptoms or condition
// - Hospital/clinic name
// - Department (suggest based on symptoms if needed)
// - Preferred date (YYYY-MM-DD format)
// - Preferred time slot (e.g. 09:00 AM)
// - Priority (normal/urgent/emergency)

// Once you have ALL required details (name, age, gender, contact, symptoms, hospital, department, date, time), respond with ONLY this JSON (no extra text):
// BOOK_APPOINTMENT:{"patientName":"...","age":0,"gender":"...","contactNumber":"...","email":"...","disease":"...","hospitalName":"...","department":"...","appointmentDate":"YYYY-MM-DD","appointmentTime":"...","priority":"normal","additionalNotes":"..."}

// CHECK FLOW — If user provides a reference ID like MB-XXXX or APT-XXXX:
// Respond with ONLY: CHECK_APPOINTMENT:{"referenceId":"..."}

// DEPARTMENT SUGGESTION — suggest from: General Medicine, Cardiology, Orthopedics, Neurology, Dermatology, Gynecology, Pediatrics, ENT, Ophthalmology, Psychiatry, Dentistry, Oncology, Urology, Gastroenterology, Pulmonology

// Guidelines:
// - Be warm, friendly and empathetic
// - Ask for one detail at a time
// - Never make up details — always ask if missing
// - Never diagnose or prescribe medications
// - Keep responses short and clear`;

// // ─── Generate Reference ID ────────────────────────────────────────────────────
// const generateReferenceId = () => {
//   const timestamp = Date.now().toString(36).toUpperCase();
//   const random = Math.random().toString(36).substring(2, 5).toUpperCase();
//   return `MB-${timestamp}-${random}`;
// };

// // ─── Chat with AI (with booking capability) ───────────────────────────────────
// const chatWithAI = async (req, res) => {
//   try {
//     const { message, conversationHistory = [] } = req.body;

//     if (!message) {
//       return res.status(400).json({ success: false, message: 'Message is required' });
//     }

//     const apiKey = process.env.GROQ_API_KEY;
//     if (!apiKey) {
//       return res.status(500).json({ success: false, message: 'AI service not configured. Please add GROQ_API_KEY to .env' });
//     }

//     // Build messages
//     const messages = [
//       { role: 'system', content: SYSTEM_PROMPT },
//       ...conversationHistory.slice(-20).map(m => ({
//         role: m.role === 'assistant' ? 'assistant' : 'user',
//         content: m.content,
//       })),
//       { role: 'user', content: message },
//     ];

//     const aiResponse = await callGroq(apiKey, messages);

//     // ── Check if AI wants to book an appointment ──
//     if (aiResponse.includes('BOOK_APPOINTMENT:')) {
//       try {
//         const jsonStr = aiResponse.split('BOOK_APPOINTMENT:')[1].trim();
//         const appointmentData = JSON.parse(jsonStr);

//         const referenceId = generateReferenceId();
//         const appointment = new Appointment({
//           ...appointmentData,
//           referenceId,
//           status: 'confirmed',
//         });
//         await appointment.save();

//         // Generate PDF
//         const { filename } = await generateAppointmentPDF(appointment.toObject());
//         appointment.pdfPath = `/pdfs/${filename}`;
//         await appointment.save();

//         const confirmMsg = `✅ **Appointment Booked Successfully!**

// 📋 **Booking Summary:**
// - **Reference ID:** ${referenceId}
// - **Patient:** ${appointmentData.patientName}, ${appointmentData.age} yrs
// - **Hospital:** ${appointmentData.hospitalName}
// - **Department:** ${appointmentData.department}
// - **Date:** ${appointmentData.appointmentDate} at ${appointmentData.appointmentTime}
// - **Status:** Confirmed ✓

// 📄 Your appointment PDF has been generated!
// 🔖 Save your Reference ID: **${referenceId}**

// Please arrive 15 minutes early and carry a valid photo ID. Is there anything else I can help you with?`;

//         return res.json({
//           success: true,
//           message: confirmMsg,
//           appointmentBooked: true,
//           appointment: appointment.toObject(),
//           pdfUrl: appointment.pdfPath,
//         });
//       } catch (bookingError) {
//         console.error('Booking error:', bookingError);
//         return res.json({
//           success: true,
//           message: "I have all the details but encountered an issue saving your appointment. Please try the booking form directly or try again.",
//         });
//       }
//     }

//     // ── Check if AI wants to check appointment status ──
//     if (aiResponse.includes('CHECK_APPOINTMENT:')) {
//       try {
//         const jsonStr = aiResponse.split('CHECK_APPOINTMENT:')[1].trim();
//         const { referenceId } = JSON.parse(jsonStr);

//         const appointment = await Appointment.findOne({ referenceId });

//         if (!appointment) {
//           return res.json({
//             success: true,
//             message: `❌ No appointment found with reference ID **${referenceId}**. Please check the ID and try again.`,
//           });
//         }

//         const statusMsg = `📋 **Appointment Details**

// - **Reference ID:** ${appointment.referenceId}
// - **Patient:** ${appointment.patientName}, ${appointment.age} yrs
// - **Hospital:** ${appointment.hospitalName}
// - **Department:** ${appointment.department}
// - **Date:** ${new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
// - **Time:** ${appointment.appointmentTime}
// - **Status:** ${appointment.status.toUpperCase()} ✓
// - **Priority:** ${appointment.priority.toUpperCase()}

// Is there anything else you need help with?`;

//         return res.json({
//           success: true,
//           message: statusMsg,
//           appointmentFound: true,
//           appointment: appointment.toObject(),
//           pdfUrl: appointment.pdfPath,
//         });
//       } catch (checkError) {
//         console.error('Check error:', checkError);
//       }
//     }

//     // ── Normal chat response ──
//     res.json({ success: true, message: aiResponse.trim() });

//   } catch (error) {
//     console.error('AI chat error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ─── Suggest Department ───────────────────────────────────────────────────────
// const suggestDepartment = async (req, res) => {
//   try {
//     const { symptoms } = req.body;

//     if (!symptoms) {
//       return res.status(400).json({ success: false, message: 'Symptoms are required' });
//     }

//     const apiKey = process.env.GROQ_API_KEY;
//     if (!apiKey) {
//       return res.status(500).json({ success: false, message: 'AI service not configured.' });
//     }

//     const messages = [
//       {
//         role: 'system',
//         content: `You are a medical triage assistant. Based on symptoms, suggest the most appropriate medical department.
// Respond ONLY with valid JSON: {"department": "Department Name", "reason": "brief reason under 20 words", "urgency": "normal"}
// urgency must be: normal, urgent, or emergency.
// Departments: General Medicine, Cardiology, Orthopedics, Neurology, Dermatology, Gynecology, Pediatrics, ENT, Ophthalmology, Psychiatry, Dentistry, Oncology, Urology, Gastroenterology, Pulmonology`,
//       },
//       { role: 'user', content: `Symptoms: ${symptoms}` },
//     ];

//     const text = await callGroq(apiKey, messages, true);

//     try {
//       const clean = text.replace(/```json|```/g, '').trim();
//       const suggestion = JSON.parse(clean);
//       res.json({ success: true, data: suggestion });
//     } catch {
//       res.json({
//         success: true,
//         data: { department: 'General Medicine', reason: 'Please consult a general physician first', urgency: 'normal' },
//       });
//     }
//   } catch (error) {
//     console.error('Suggest department error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// module.exports = { chatWithAI, suggestDepartment };




const Appointment = require('../models/Appointment');
const { generateAppointmentPDF } = require('../utils/pdfGenerator');

// ─── Groq API Helper ──────────────────────────────────────────────────────────
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const callGroq = async (apiKey, messages, jsonMode = false) => {
  const body = {
    model: GROQ_MODEL,
    messages,
    temperature: 0.4,
    max_tokens: 1024,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Groq API error');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
};

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are MediAssist, a smart healthcare appointment assistant for MediBook. You can:
1. Book appointments directly by collecting patient details via conversation
2. Check appointment status using a reference ID
3. Cancel an existing appointment using a reference ID
4. Suggest the right medical department based on symptoms
5. Answer general health and appointment questions

BOOKING FLOW — When a user wants to book an appointment, collect these details ONE BY ONE in a friendly way:
- Full name
- Age
- Gender (Male/Female/Other)
- Contact number (with country code e.g. +91)
- Email (optional)
- Symptoms or condition
- Hospital/clinic name
- Department (suggest based on symptoms if needed)
- Preferred date (YYYY-MM-DD format)
- Preferred time slot (e.g. 09:00 AM)
- Priority (normal/urgent/emergency)

Once you have ALL required details (name, age, gender, contact, symptoms, hospital, department, date, time), respond with ONLY this JSON (no extra text):
BOOK_APPOINTMENT:{"patientName":"...","age":0,"gender":"...","contactNumber":"...","email":"...","disease":"...","hospitalName":"...","department":"...","appointmentDate":"YYYY-MM-DD","appointmentTime":"...","priority":"normal","additionalNotes":"..."}

CHECK FLOW — If user provides a reference ID like MB-XXXX or APT-XXXX and wants to know status:
Respond with ONLY: CHECK_APPOINTMENT:{"referenceId":"..."}

CANCEL FLOW — If user wants to cancel an appointment:
- First ask for their Reference ID if not already given
- Once you have the reference ID AND the user has confirmed they want to cancel, respond with ONLY this JSON (no extra text):
CANCEL_APPOINTMENT:{"referenceId":"..."}
- Always confirm with the user before cancelling (e.g. "Are you sure you want to cancel appointment MB-XXXX?") — only emit the JSON after they say yes/confirm.

DEPARTMENT SUGGESTION — suggest from: General Medicine, Cardiology, Orthopedics, Neurology, Dermatology, Gynecology, Pediatrics, ENT, Ophthalmology, Psychiatry, Dentistry, Oncology, Urology, Gastroenterology, Pulmonology

Guidelines:
- Be warm, friendly and empathetic
- Ask for one detail at a time
- Never make up details — always ask if missing
- Never diagnose or prescribe medications
- Keep responses short and clear`;

// ─── Generate Reference ID ────────────────────────────────────────────────────
const generateReferenceId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `MB-${timestamp}-${random}`;
};

// ─── Chat with AI (with booking capability) ───────────────────────────────────
const chatWithAI = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'AI service not configured. Please add GROQ_API_KEY to .env' });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-12).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const aiResponse = await callGroq(apiKey, messages);

    // ── Check if AI wants to book an appointment ──
  if (aiResponse.includes('BOOK_APPOINTMENT:')) {
      try {
        const jsonStr = aiResponse.split('BOOK_APPOINTMENT:')[1].trim();
        const appointmentData = JSON.parse(jsonStr);

        // Normalize fields to match schema enums (AI may send inconsistent casing)
        if (appointmentData.gender) {
          const g = appointmentData.gender.toLowerCase();
          appointmentData.gender = g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other';
        }
        if (appointmentData.priority) {
          appointmentData.priority = appointmentData.priority.toLowerCase();
          if (!['normal', 'urgent', 'emergency'].includes(appointmentData.priority)) {
            appointmentData.priority = 'normal';
          }
        }
        if (appointmentData.age) {
          appointmentData.age = Number(appointmentData.age);
        }

        const referenceId = generateReferenceId();
        const appointment = new Appointment({
          ...appointmentData,
          referenceId,
          status: 'confirmed',
        });
        await appointment.save();

        const { filename } = await generateAppointmentPDF(appointment.toObject());
        appointment.pdfPath = `/pdfs/${filename}`;
        await appointment.save();

        const confirmMsg = `✅ **Appointment Booked Successfully!**

📋 **Booking Summary:**
- **Reference ID:** ${referenceId}
- **Patient:** ${appointmentData.patientName}, ${appointmentData.age} yrs
- **Hospital:** ${appointmentData.hospitalName}
- **Department:** ${appointmentData.department}
- **Date:** ${appointmentData.appointmentDate} at ${appointmentData.appointmentTime}
- **Status:** Confirmed ✓

📄 Your appointment PDF has been generated!
🔖 Save your Reference ID: **${referenceId}**

Please arrive 15 minutes early and carry a valid photo ID. Is there anything else I can help you with?`;

        return res.json({
          success: true,
          message: confirmMsg,
          appointmentBooked: true,
          appointment: appointment.toObject(),
          pdfUrl: appointment.pdfPath,
        });
      } catch (bookingError) {
        console.error('Booking error:', bookingError);
        return res.json({
          success: true,
          message: `I have all the details but encountered an issue saving your appointment (${bookingError.message}). Please try the booking form directly or try again.`,
        });
      }
    }

    // ── Check if AI wants to check appointment status ──
    if (aiResponse.includes('CHECK_APPOINTMENT:')) {
      try {
        const jsonStr = aiResponse.split('CHECK_APPOINTMENT:')[1].trim();
        const { referenceId } = JSON.parse(jsonStr);

        const appointment = await Appointment.findOne({ referenceId });

        if (!appointment) {
          return res.json({
            success: true,
            message: `❌ No appointment found with reference ID **${referenceId}**. Please check the ID and try again.`,
          });
        }

        const statusMsg = `📋 **Appointment Details**

- **Reference ID:** ${appointment.referenceId}
- **Patient:** ${appointment.patientName}, ${appointment.age} yrs
- **Hospital:** ${appointment.hospitalName}
- **Department:** ${appointment.department}
- **Date:** ${new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
- **Time:** ${appointment.appointmentTime}
- **Status:** ${appointment.status.toUpperCase()} ✓
- **Priority:** ${appointment.priority.toUpperCase()}

Is there anything else you need help with?`;

        return res.json({
          success: true,
          message: statusMsg,
          appointmentFound: true,
          appointment: appointment.toObject(),
          pdfUrl: appointment.pdfPath,
        });
      } catch (checkError) {
        console.error('Check error:', checkError);
      }
    }

    // ── Check if AI wants to cancel an appointment ──
    if (aiResponse.includes('CANCEL_APPOINTMENT:')) {
      try {
        const jsonStr = aiResponse.split('CANCEL_APPOINTMENT:')[1].trim();
        const { referenceId } = JSON.parse(jsonStr);

        const appointment = await Appointment.findOne({ referenceId });

        if (!appointment) {
          return res.json({
            success: true,
            message: `❌ No appointment found with reference ID **${referenceId}**. Please check the ID and try again.`,
          });
        }

        if (appointment.status === 'cancelled') {
          return res.json({
            success: true,
            message: `ℹ️ Appointment **${referenceId}** is already cancelled.`,
          });
        }

        appointment.status = 'cancelled';
        await appointment.save();

        const cancelMsg = `✅ **Appointment Cancelled**

- **Reference ID:** ${appointment.referenceId}
- **Patient:** ${appointment.patientName}
- **Was scheduled for:** ${new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at ${appointment.appointmentTime}
- **Status:** CANCELLED

If this was a mistake or you'd like to book a new appointment, just let me know! 💙`;

        return res.json({
          success: true,
          message: cancelMsg,
          appointmentCancelled: true,
          appointment: appointment.toObject(),
        });
      } catch (cancelError) {
        console.error('Cancel error:', cancelError);
        return res.json({
          success: true,
          message: "I couldn't process the cancellation. Please try again or use the Track Appointment page.",
        });
      }
    }

    // ── Normal chat response ──
    res.json({ success: true, message: aiResponse.trim() });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Suggest Department ───────────────────────────────────────────────────────
const suggestDepartment = async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms) {
      return res.status(400).json({ success: false, message: 'Symptoms are required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'AI service not configured.' });
    }

    const messages = [
      {
        role: 'system',
        content: `You are a medical triage assistant. Based on symptoms, suggest the most appropriate medical department.
Respond ONLY with valid JSON: {"department": "Department Name", "reason": "brief reason under 20 words", "urgency": "normal"}
urgency must be: normal, urgent, or emergency.
Departments: General Medicine, Cardiology, Orthopedics, Neurology, Dermatology, Gynecology, Pediatrics, ENT, Ophthalmology, Psychiatry, Dentistry, Oncology, Urology, Gastroenterology, Pulmonology`,
      },
      { role: 'user', content: `Symptoms: ${symptoms}` },
    ];

    const text = await callGroq(apiKey, messages, true);

    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const suggestion = JSON.parse(clean);
      res.json({ success: true, data: suggestion });
    } catch {
      res.json({
        success: true,
        data: { department: 'General Medicine', reason: 'Please consult a general physician first', urgency: 'normal' },
      });
    }
  } catch (error) {
    console.error('Suggest department error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { chatWithAI, suggestDepartment };