import express from 'express';
import { getApprovedStores, getStoreById, getOwnStore, updateOwnStore } from '../controllers/storeController';
import { protect, authorize, storeScope } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', getApprovedStores);
router.get('/:id', getStoreById);

// Vendor routes (mounted at /api/vendor/store via server.ts)
export const vendorStoreRouter = express.Router();
vendorStoreRouter.get('/', protect, authorize('shopkeeper'), storeScope(false), getOwnStore);
vendorStoreRouter.put('/', protect, authorize('shopkeeper'), storeScope(false), updateOwnStore);

export default router;
