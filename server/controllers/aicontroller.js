const Appointment = require('../models/Appointment');
const { generateAppointmentPDF } = require('../utils/pdfGenerator');

// ─── Groq API ─────────────────────────────────────────────────────────────────
const callGroq = async (apiKey, messages, jsonMode = false) => {
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

  const body = {
    model,
    messages,
    temperature: 0.4,
    max_tokens: 1024,
    
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
  const choice = data.choices?.[0];
  if (choice?.finish_reason === 'tool_calls' || choice?.message?.tool_calls) {
    return choice?.message?.content || '';
  }
  return choice?.message?.content || '';
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

CRITICAL RULE: Track every detail given so far in this conversation. As soon as you have collected ALL of these 9 required fields — full name, age, gender, contact number, symptoms, hospital name, department, date, AND time — you MUST immediately respond with ONLY the JSON below. Do NOT ask for confirmation. Do NOT re-ask any question. Just output the JSON immediately:
BOOK_APPOINTMENT:{"patientName":"...","age":0,"gender":"...","contactNumber":"...","email":"...","disease":"...","hospitalName":"...","department":"...","appointmentDate":"YYYY-MM-DD","appointmentTime":"...","priority":"normal","additionalNotes":"..."}

Email and priority can default to "" and "normal" if not given. Once priority is collected, output the JSON immediately.

CHECK FLOW — If user provides a reference ID like MB-XXXX and wants to know status:
Respond with ONLY: CHECK_APPOINTMENT:{"referenceId":"..."}

CANCEL FLOW — If user wants to cancel an appointment:
- First ask for their Reference ID if not already given
- Once you have the reference ID AND the user has confirmed they want to cancel:
CANCEL_APPOINTMENT:{"referenceId":"..."}
- Always confirm before cancelling.

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

// ─── Chat with AI ─────────────────────────────────────────────────────────────
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
      ...conversationHistory.slice(-24).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const aiResponse = await callGroq(apiKey, messages);

    // ── Book appointment ──
    if (aiResponse.includes('BOOK_APPOINTMENT:')) {
      try {
        const jsonStr = aiResponse.split('BOOK_APPOINTMENT:')[1].trim();
        const appointmentData = JSON.parse(jsonStr);

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
        if (appointmentData.age) appointmentData.age = Number(appointmentData.age);

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

        return res.json({
          success: true,
          message: `✅ **Appointment Booked Successfully!**\n\n📋 **Booking Summary:**\n- **Reference ID:** ${referenceId}\n- **Patient:** ${appointmentData.patientName}, ${appointmentData.age} yrs\n- **Hospital:** ${appointmentData.hospitalName}\n- **Department:** ${appointmentData.department}\n- **Date:** ${appointmentData.appointmentDate} at ${appointmentData.appointmentTime}\n- **Status:** Confirmed ✓\n\n📄 Your appointment PDF has been generated!\n🔖 Save your Reference ID: **${referenceId}**\n\nPlease arrive 15 minutes early and carry a valid photo ID.`,
          appointmentBooked: true,
          appointment: appointment.toObject(),
          pdfUrl: appointment.pdfPath,
        });
      } catch (bookingError) {
        console.error('Booking error:', bookingError);
        return res.json({
          success: true,
          message: `I have all the details but encountered an issue saving your appointment (${bookingError.message}). Please try the booking form directly.`,
        });
      }
    }

    // ── Check appointment ──
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

        return res.json({
          success: true,
          message: `📋 **Appointment Details**\n\n- **Reference ID:** ${appointment.referenceId}\n- **Patient:** ${appointment.patientName}, ${appointment.age} yrs\n- **Hospital:** ${appointment.hospitalName}\n- **Department:** ${appointment.department}\n- **Date:** ${new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n- **Time:** ${appointment.appointmentTime}\n- **Status:** ${appointment.status.toUpperCase()} ✓\n- **Priority:** ${appointment.priority.toUpperCase()}`,
          appointmentFound: true,
          appointment: appointment.toObject(),
          pdfUrl: appointment.pdfPath,
        });
      } catch (checkError) {
        console.error('Check error:', checkError);
      }
    }

    // ── Cancel appointment ──
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

        return res.json({
          success: true,
          message: `✅ **Appointment Cancelled**\n\n- **Reference ID:** ${appointment.referenceId}\n- **Patient:** ${appointment.patientName}\n- **Was scheduled for:** ${new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at ${appointment.appointmentTime}\n- **Status:** CANCELLED\n\nIf this was a mistake, feel free to book a new appointment! 💙`,
          appointmentCancelled: true,
          appointment: appointment.toObject(),
        });
      } catch (cancelError) {
        console.error('Cancel error:', cancelError);
        return res.json({
          success: true,
          message: "I couldn't process the cancellation. Please make sure your Reference ID is correct (format: MB-XXXXXX-XXX) and try again.",
        });
      }
    }

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
    if (!symptoms) return res.status(400).json({ success: false, message: 'Symptoms are required' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, message: 'AI service not configured.' });

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