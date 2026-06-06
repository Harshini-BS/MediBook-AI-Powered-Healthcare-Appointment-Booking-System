const Appointment = require('../models/Appointment');
const { generateAppointmentPDF } = require('../utils/pdfGenerator');

const SYSTEM_PROMPT = `You are MediAssist, a helpful and empathetic healthcare appointment assistant for MediBook. You help patients:
1. Understand how to book appointments
2. Provide general health information and guidance
3. Help find the right department/specialty based on symptoms
4. Answer questions about their appointments
5. Provide pre-appointment preparation tips

Guidelines:
- Be warm, professional, and empathetic
- For symptom-based queries, suggest the appropriate medical department
- Never diagnose conditions or prescribe medications
- Always recommend consulting a qualified doctor for medical advice
- Keep responses concise and actionable (under 200 words unless detail is needed)
- Use bullet points for lists
- If asked about booking, guide them to use the booking form on the page

Departments available: General Medicine, Cardiology, Orthopedics, Neurology, Dermatology, Gynecology, Pediatrics, ENT, Ophthalmology, Psychiatry, Dentistry, Oncology, Urology, Gastroenterology, Pulmonology`;

const parseBookingFields = (message) => {
  return {
    name: /(?:name[:\s]*[A-Za-z]+|my name is|name is|i am|i'm)\s*[A-Za-z]+/i.test(message),
    age: /(?:age[:\s]*\d{1,3}|\b\d{1,3}\s*(?:years|yrs|yo|y\/o|old)\b)/i.test(message),
    gender: /(?:gender[:\s]*\b(?:male|female|other)\b|\b(?:male|female|other)\b)/i.test(message),
    contact: /(?:contact(?: number)?[:\s]*\+?\d{7,15}|phone[:\s]*\+?\d{7,15}|\b\+?\d{7,15}\b)/i.test(message),
    hospital: /(?:hospital[:\s]*[A-Za-z ]+|clinic[:\s]*[A-Za-z ]+|medical center|center|hospital\b)/i.test(message),
    district: /(?:district[:\s]*[A-Za-z ]+|\bdistrict\b)/i.test(message),
    state: /(?:state[:\s]*[A-Za-z ]+|\bstate\b)/i.test(message),
    zipCode: /(?:zip(?: code)?[:\s]*\d{4,10}|postal code[:\s]*\d{4,10}|\b\d{5,10}\b)/i.test(message),
    department: /\b(cardiology|orthopedics|neurology|dermatology|gynecology|pediatrics|ent|ophthalmology|psychiatry|dentistry|oncology|urology|gastroenterology|pulmonology|general medicine)\b/i.test(message),
    symptoms: /(?:symptoms[:\s]*[A-Za-z ]+|\b(?:pain|ache|fever|cough|rash|dizziness|headache|nausea|vomit|stomach|breath|chest pain)\b)/i.test(message),
    date: /(?:date[:\s]*\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}|\b\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}\b|\btoday\b|\btomorrow\b|\bnext week\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b)/i.test(message),
    time: /(?:time[:\s]*\d{1,2}(?::\d{2})?\s?(?:am|pm)?|\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b|\b(?:morning|afternoon|evening)\b)/i.test(message),
  };
};

const normalizeText = (value) => (value || '').trim().replace(/\s+/g, ' ');

const parseAppointmentDate = (value) => {
  if (!value) return null;
  const raw = value.trim().replace(/\./g, '/').replace(/-/g, '/');

  const dmyFour = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyFour) {
    const [, day, month, year] = dmyFour;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const dmyTwo = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (dmyTwo) {
    const [, day, month, year] = dmyTwo;
    return new Date(Number(`20${year}`), Number(month) - 1, Number(day));
  }

  const isoMatch = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const capitalizeWords = (value) =>
  (value || '')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const extractLabel = (message, regex) => {
  const match = message.match(regex);
  return match ? match[1].trim() : undefined;
};

const parseReferenceId = (message) => {
  const refMatch = message.match(/\b(MB-[A-Z0-9-]{6,})\b/i);
  if (refMatch) return refMatch[1].toUpperCase();

  const altMatch = message.match(/\bref(?:erence)?\s*id[:\s]*([A-Z0-9-]+)\b/i);
  return altMatch ? altMatch[1].toUpperCase() : undefined;
};

const hasCancelContext = (conversationHistory = []) => {
  return conversationHistory.some((entry) => {
    const text = String(entry.content || '').toLowerCase();
    return /\b(cancel|cancel appointment|cancel booking|withdraw|drop appointment|call off)\b/.test(text);
  });
};

const isReferenceIdOnly = (message) => {
  return /^\s*(?:ref(?:erence)?\s*id[:\s]*)?(MB-[A-Z0-9-]{6,})\s*$/i.test(message);
};

const parseBookingDetails = (message) => {
  const details = {
    name: extractLabel(message, /(?:name|patient name)[:\s]*([A-Za-z ]+)/i),
    age: extractLabel(message, /age[:\s]*(\d{1,3})/i),
    gender: extractLabel(message, /gender[:\s]*(male|female|other)/i),
    contact: extractLabel(message, /(?:contact(?: number)?|phone)[:\s]*([+\d]{7,15})/i),
    symptoms: extractLabel(message, /(?:symptoms|condition|disease)[:\s]*([A-Za-z0-9 ,]+)/i),
    hospital: extractLabel(message, /(?:hospital|clinic|medical center|center)[:\s]*([A-Za-z ]+)/i),
    district: extractLabel(message, /district[:\s]*([A-Za-z ]+)/i),
    state: extractLabel(message, /state[:\s]*([A-Za-z ]+)/i),
    zipCode: extractLabel(message, /(?:zip(?: code)?|postal code)[:\s]*(\d{4,10})/i),
    department: extractLabel(message, /department[:\s]*(cardiology|orthopedics|neurology|dermatology|gynecology|pediatrics|ent|ophthalmology|psychiatry|dentistry|oncology|urology|gastroenterology|pulmonology|general medicine)/i),
    date: extractLabel(message, /date[:\s]*([0-9./\- ]+)/i),
    time: extractLabel(message, /time[:\s]*([0-9: .apmAPM]+)/i),
  };

  const commaParts = message.split(/\s*,\s*/).map((part) => part.trim());
  if (!details.name && commaParts[0]) details.name = commaParts[0];
  if (!details.age && commaParts[1]) details.age = commaParts[1];
  if (!details.gender && commaParts[2]) details.gender = commaParts[2];
  if (!details.contact && commaParts[3]) details.contact = commaParts[3];
  if (!details.symptoms && commaParts[4]) details.symptoms = commaParts[4];
  if (!details.hospital && commaParts[5]) details.hospital = commaParts[5];
  if (!details.department && commaParts[6]) details.department = commaParts[6];
  if (!details.date && commaParts[7]) details.date = commaParts[7];
  if (!details.time && commaParts[8]) details.time = commaParts[8];

  details.date = parseAppointmentDate(details.date);
  details.gender = details.gender ? details.gender.toLowerCase() : undefined;
  details.department = details.department ? details.department.toLowerCase() : undefined;
  details.hospital = normalizeText(details.hospital);
  details.district = normalizeText(details.district);
  details.state = normalizeText(details.state);
  details.zipCode = normalizeText(details.zipCode);
  details.symptoms = normalizeText(details.symptoms);
  details.name = normalizeText(details.name);
  details.contact = normalizeText(details.contact);
  details.time = normalizeText(details.time);

  details.complete = !!(
    details.name &&
    details.age &&
    details.gender &&
    details.contact &&
    details.symptoms &&
    details.hospital &&
    details.department &&
    details.date &&
    details.time &&
    details.state &&
    details.district &&
    details.zipCode
  );

  return details;
};

const generateReferenceId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `MB-${timestamp}-${random}`;
};

const fallbackChatResponse = (message) => {
  const lower = message.toLowerCase();
  if (/\b(documents|papers|id|identity|proof|medical records|reports)\b/.test(lower)) {
    return 'For appointments, bring a valid photo ID, your contact information, appointment confirmation or reference ID, and any relevant medical records or referral letters. If you have prior test reports, bring those as well.';
  }

  if (/\b(cancel|cancel appointment|cancel booking|call off|withdraw|drop appointment)\b/.test(lower)) {
    return 'To cancel an appointment, share your appointment reference ID or the booking details, and I will help you cancel it. You can also cancel through the appointment management section if available.';
  }

  if (/\b(reschedule|reschedule appointment|change appointment|move appointment|postpone)\b/.test(lower)) {
    return 'To reschedule, please tell me the appointment reference ID and your preferred new date and time. I will help you update the booking.';
  }

  const bookingRelated = /\b(book|appointment|schedule|reschedule|cancel|confirm)\b/.test(lower);
  const bookingDetails = parseBookingDetails(message);
  const fields = parseBookingFields(message);
  const supplied = Object.keys(fields).filter((key) => fields[key]);
  const missing = ['name', 'age', 'gender', 'contact', 'symptoms', 'hospital', 'state', 'district', 'zipCode', 'department', 'date', 'time'].filter((field) => !fields[field]);
  const bookingComplete = bookingDetails.complete;

  if (bookingComplete) {
    return 'Thanks! I have enough information to book your appointment. I will proceed with the details you provided. If anything is wrong, please update the missing field.';
  }

  if (bookingRelated) {
    if (supplied.length > 2) {
      return `I can help you book the appointment. I detected you already mentioned: ${supplied.join(', ')}. Please send the remaining details: ${missing.join(', ')}.`;
    }
    return 'Sure, I can help book your appointment. Please tell me your name, age, gender, contact number, symptoms, preferred hospital or clinic, department, date, time, and your state, district, and zip code.';
  }
  if (/chest|heart|palpitations|blood pressure|angina|cardiac/.test(lower)) {
    return 'This looks most like Cardiology. Please choose Cardiology when booking your appointment, and mention your chest or heart symptoms.';
  }
  if (/headache|migraine|dizziness|seizure|numbness|stroke|brain/.test(lower)) {
    return 'This sounds like a Neurology concern. I recommend booking with Neurology for headache, dizziness, or nervous system symptoms.';
  }
  if (/skin|rash|acne|eczema|psoriasis|itch/.test(lower)) {
    return 'This is likely Dermatology. Please choose Dermatology for skin-related issues and describe any rash or itching.';
  }
  if (/back|bone|joint|fracture|arthritis|spine|muscle/.test(lower)) {
    return 'This appears to be Orthopedics. Book with Orthopedics for bone, joint, or muscle pain.';
  }
  if (/pregnancy|period|ovary|uterus|gynecology|breast/.test(lower)) {
    return 'This is best handled by Gynecology. Please select Gynecology and share your reproductive health details.';
  }
  if (/child|kid|baby|pediatric/.test(lower)) {
    return 'This is a Pediatrics case. Book with Pediatrics and provide the child’s symptoms.';
  }
  if (/ear|nose|throat|sinus|hearing|tonsillitis|hoarse/.test(lower)) {
    return 'This looks like an ENT issue. Please choose ENT when booking and describe your ear, nose, or throat symptoms.';
  }
  if (/eye|vision|blurry|glaucoma|cataract|retina/.test(lower)) {
    return 'This is likely Ophthalmology. Book with Ophthalmology for eye or vision concerns.';
  }
  if (/anxiety|depression|mood|stress|sleep|mental/.test(lower)) {
    return 'This seems related to mental health. Please book with Psychiatry for emotional or sleep-related concerns.';
  }
  if (/tooth|mouth|gum|dental|oral/.test(lower)) {
    return 'This should go to Dentistry. Select Dentistry for any oral health issues.';
  }
  if (/cancer|tumor|mass|chemotherapy|radiation/.test(lower)) {
    return 'This is best handled by Oncology. Please choose Oncology if you have cancer-related concerns.';
  }
  if (/urine|bladder|kidney|prostate|urology|urinary/.test(lower)) {
    return 'This points to Urology. Book with Urology for urinary or kidney-related symptoms.';
  }
  if (/stomach|gastric|digestion|liver|gastro|intestine|abdomen|nausea|vomit/.test(lower)) {
    return 'This sounds like Gastroenterology. Please select Gastroenterology for digestion or abdominal issues.';
  }
  if (/fever|temperature|infection|chills|sweating/.test(lower)) {
    return 'High fever often starts with General Medicine. Book with General Medicine and mention your fever and any other symptoms.';
  }
  if (/breath|lungs|asthma|cough|chest pain|pneumonia|respiratory|covid/.test(lower)) {
    return 'This seems like Pulmonology. Choose Pulmonology for breathing or lung-related symptoms.';
  }
  return 'I can help you with appointment booking or choosing the right department. Tell me your symptoms or ask for booking help, and I will guide you step by step.';
};

const chatWithAI = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const bookingDetails = parseBookingDetails(message);
    const lower = message.toLowerCase();
    const bookingRelated = /\b(book|appointment|schedule|reschedule|cancel|confirm)\b/.test(lower);
    const cancelRequested = /\b(cancel|cancel appointment|cancel booking|withdraw|drop appointment|call off)\b/.test(lower);
    const referenceId = parseReferenceId(message);
    const referenceOnly = isReferenceIdOnly(message);
    const cancelContext = hasCancelContext(conversationHistory);

    if (cancelRequested || (referenceOnly && cancelContext)) {
      if (!referenceId) {
        return res.json({
          success: true,
          message: 'Please share your appointment reference ID so I can locate and cancel the booking for you.',
        });
      }

      const appointment = await Appointment.findOneAndUpdate(
        { referenceId },
        { status: 'cancelled' },
        { new: true }
      );

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: `I could not find an appointment with reference ID ${referenceId}. Please check the ID and try again.`,
        });
      }

      return res.json({
        success: true,
        message: `Your appointment ${referenceId} has been cancelled successfully. Let me know if you want to book a new appointment.`,
        data: appointment,
      });
    }

    if (referenceOnly) {
      return res.json({
        success: true,
        message: `I found reference ID ${referenceId}. If you want to cancel this appointment, please say "cancel appointment ${referenceId}" or include the words cancel/cancel booking.`,
      });
    }

    if (bookingDetails.complete) {
      try {
        const appointment = new Appointment({
          referenceId: generateReferenceId(),
          patientName: capitalizeWords(bookingDetails.name),
          age: Number(bookingDetails.age),
          gender: capitalizeWords(bookingDetails.gender),
          contactNumber: bookingDetails.contact,
          disease: bookingDetails.symptoms,
          hospitalName: capitalizeWords(bookingDetails.hospital),
          state: capitalizeWords(bookingDetails.state),
          district: capitalizeWords(bookingDetails.district),
          zipCode: bookingDetails.zipCode,
          department: capitalizeWords(bookingDetails.department),
          appointmentDate: bookingDetails.date,
          appointmentTime: bookingDetails.time,
          status: 'confirmed',
        });

        await appointment.save();

        try {
          const { filename } = await generateAppointmentPDF(appointment.toObject());
          appointment.pdfPath = `/pdfs/${filename}`;
          await appointment.save();
        } catch (pdfError) {
          console.error('PDF generation failed during AI booking:', pdfError);
        }

        return res.json({
          success: true,
          message: `Appointment confirmed for ${appointment.patientName} on ${appointment.appointmentDate.toLocaleDateString()} at ${appointment.appointmentTime}. Reference ID: ${appointment.referenceId}.`,
          data: appointment,
          pdfUrl: appointment.pdfPath || null,
        });
      } catch (error) {
        console.error('Booking creation failed:', error);
        return res.status(500).json({ success: false, message: 'Unable to book appointment automatically. Please use the booking form.' });
      }
    }

    if (bookingRelated) {
      return res.json({ success: true, message: fallbackChatResponse(message) });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.json({ success: true, message: fallbackChatResponse(message) });
    }

    // Build messages array with history
    const messages = [
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'AI service error');
    }

    const data = await response.json();
    const aiMessage = data.content[0]?.text || 'I could not generate a response.';

    res.json({
      success: true,
      message: aiMessage,
      usage: data.usage,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// AI-powered symptom to department suggestion
const fallbackDepartmentSuggestion = (symptoms) => {
  const text = symptoms.toLowerCase();
  if (/chest|heart|palpitations|blood pressure|angina|cardiac/.test(text)) {
    return { department: 'Cardiology', reason: 'Symptoms point to heart or blood circulation issues', urgency: 'urgent' };
  }
  if (/headache|migraine|dizziness|seizure|numbness|stroke|brain/.test(text)) {
    return { department: 'Neurology', reason: 'Symptoms suggest a nervous system concern', urgency: 'urgent' };
  }
  if (/skin|rash|acne|eczema|psoriasis|itch|dermatology/.test(text)) {
    return { department: 'Dermatology', reason: 'Skin-related symptoms need a dermatology review', urgency: 'normal' };
  }
  if (/back|bone|joint|fracture|arthritis|spine|muscle/.test(text)) {
    return { department: 'Orthopedics', reason: 'Symptoms are related to bones, joints, or muscles', urgency: 'normal' };
  }
  if (/pregnancy|period|ovary|uterus|gynecology|breast/.test(text)) {
    return { department: 'Gynecology', reason: 'Symptoms are related to women’s reproductive health', urgency: 'normal' };
  }
  if (/child|kid|pediatric|infant|baby|newborn/.test(text)) {
    return { department: 'Pediatrics', reason: 'Symptoms concern a child’s health', urgency: 'normal' };
  }
  if (/ear|nose|throat|sinus|hearing|tonsillitis|hoarse/.test(text)) {
    return { department: 'ENT', reason: 'Symptoms point to ear, nose, or throat issues', urgency: 'normal' };
  }
  if (/eye|vision|blurry|glaucoma|cataract|retina/.test(text)) {
    return { department: 'Ophthalmology', reason: 'Symptoms concern the eyes or vision', urgency: 'normal' };
  }
  if (/anxiety|depression|mood|stress|sleep|mental/.test(text)) {
    return { department: 'Psychiatry', reason: 'Symptoms are related to mental health', urgency: 'normal' };
  }
  if (/tooth|mouth|gum|dental|oral/.test(text)) {
    return { department: 'Dentistry', reason: 'Symptoms concern teeth or oral health', urgency: 'normal' };
  }
  if (/cancer|tumor|mass|chemotherapy|radiation/.test(text)) {
    return { department: 'Oncology', reason: 'Symptoms may require cancer specialist evaluation', urgency: 'urgent' };
  }
  if (/urine|bladder|kidney|prostate|urology|urinary/.test(text)) {
    return { department: 'Urology', reason: 'Symptoms are related to the urinary or reproductive system', urgency: 'urgent' };
  }
  if (/stomach|gastric|digestion|liver|gastro|intestine|abdomen|nausea|vomit/.test(text)) {
    return { department: 'Gastroenterology', reason: 'Symptoms relate to digestion or abdominal health', urgency: 'normal' };
  }
  if (/breath|lungs|asthma|cough|chest pain|pneumonia|respiratory|covid/.test(text)) {
    return { department: 'Pulmonology', reason: 'Symptoms involve breathing or lung function', urgency: 'urgent' };
  }
  return { department: 'General Medicine', reason: 'Symptoms are general and should be evaluated by a primary physician first', urgency: 'normal' };
};

const suggestDepartment = async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) {
      return res.status(400).json({ success: false, message: 'Symptoms are required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const fallback = fallbackDepartmentSuggestion(symptoms);
      return res.json({ success: true, data: fallback, note: 'No AI key configured; returning fallback suggestion' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: 'You are a medical triage assistant. Based on symptoms, suggest the most appropriate medical department. Respond ONLY with valid JSON: {"department": "Department Name", "reason": "brief reason", "urgency": "normal|urgent|emergency"}. Available departments: General Medicine, Cardiology, Orthopedics, Neurology, Dermatology, Gynecology, Pediatrics, ENT, Ophthalmology, Psychiatry, Dentistry, Oncology, Urology, Gastroenterology, Pulmonology',
        messages: [{ role: 'user', content: `Symptoms: ${symptoms}` }],
      }),
    });

    if (!response.ok) throw new Error('AI service error');

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    try {
      const suggestion = JSON.parse(text);
      res.json({ success: true, data: suggestion });
    } catch {
      res.json({ success: true, data: { department: 'General Medicine', reason: 'Please consult a general physician first', urgency: 'normal' } });
    }
  } catch (error) {
    console.error('Suggest department error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { chatWithAI, suggestDepartment };