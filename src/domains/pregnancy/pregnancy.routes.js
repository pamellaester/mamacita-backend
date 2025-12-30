import express from 'express';
import {
  createPregnancy,
  getCurrentPregnancy,
  updatePregnancy,
  logSymptoms,
  getSymptomLogs,
  getWeeklyContent
} from './pregnancy.controller.js';
import { authenticate, isMother } from '../../middleware/auth.js';

const router = express.Router();

// Public route - anyone can view weekly content
router.get('/weeks/:week', getWeeklyContent);

// Protected routes (require authentication)
router.use(authenticate);

// POST /api/v1/pregnancy
router.post('/', isMother, createPregnancy);

// GET /api/v1/pregnancy/current
router.get('/current', isMother, getCurrentPregnancy);

// PUT /api/v1/pregnancy/:id
router.put('/:id', isMother, updatePregnancy);

// POST /api/v1/pregnancy/symptoms
router.post('/symptoms', isMother, logSymptoms);

// GET /api/v1/pregnancy/symptoms
router.get('/symptoms', isMother, getSymptomLogs);

export default router;
