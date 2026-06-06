const express = require('express');
const router = express.Router();
const { chatWithAI, suggestDepartment } = require('../controllers/aiController');

router.post('/chat', chatWithAI);
router.post('/suggest-department', suggestDepartment);

module.exports = router;