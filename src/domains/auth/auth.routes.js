import express from 'express';
import { register, login, getCurrentUser } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// POST /api/v1/auth/register
router.post('/register', register);

// POST /api/v1/auth/login
router.post('/login', login);

// GET /api/v1/auth/me (protected)
router.get('/me', authenticate, getCurrentUser);

export default router;
