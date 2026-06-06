require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./utils/db');

const appointmentRoutes = require('./routes/appointmentRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve generated PDFs as static files
app.use('/pdfs', express.static('generated_pdfs'));

// Routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MediBook server is running' });
});

app.listen(PORT, () => {
  console.log(`🏥 MediBook server running on port ${PORT}`);
});