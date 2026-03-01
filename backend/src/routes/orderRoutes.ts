import express from 'express';
import { createOrder, getMyOrders, getOrderById, getVendorOrders, updateOrderStatus, getAllOrders } from '../controllers/orderController';
import { protect, authorize, storeScope } from '../middleware/authMiddleware';

const router = express.Router();

// Student order routes
router.post('/', protect, authorize('student'), createOrder);
router.get('/my', protect, authorize('student'), getMyOrders);
router.get('/:id', protect, getOrderById); // Access control checked in controller

// Vendor order routes (mounted at /api/vendor/orders via server.ts)
export const vendorOrderRouter = express.Router();
vendorOrderRouter.get('/', protect, authorize('shopkeeper'), storeScope(true), getVendorOrders);
vendorOrderRouter.put('/:id/status', protect, authorize('shopkeeper'), storeScope(true), updateOrderStatus);

// Admin order routes
export const adminOrderRouter = express.Router();
adminOrderRouter.get('/', protect, authorize('admin'), getAllOrders);

export default router;
