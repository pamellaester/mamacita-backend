import express from 'express';
import { getProfile, updateProfile, changePassword, completeOnboarding } from './users.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/v1/users/profile
router.get('/profile', getProfile);

// PUT /api/v1/users/profile
router.put('/profile', updateProfile);

// PUT /api/v1/users/password
router.put('/password', changePassword);

// POST /api/v1/users/onboarding
router.post('/onboarding', completeOnboarding);

export default router;
