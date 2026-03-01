import express from 'express';
import { fileDispute, getMyDisputes } from '../controllers/disputeController';
import { protect } from '../middleware/authMiddleware';
import { validate, createDisputeSchema } from '../middleware/validation';

const router = express.Router();

router.use(protect);

router.post('/', validate(createDisputeSchema), fileDispute);
router.get('/my', getMyDisputes);

export default router;
