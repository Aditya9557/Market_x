import express from 'express';
import { getProducts, getProductById, getVendorProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productController';
import { protect, authorize, storeScope } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Vendor product routes (mounted at /api/vendor/products via server.ts)
export const vendorProductRouter = express.Router();
vendorProductRouter.get('/', protect, authorize('shopkeeper'), storeScope(true), getVendorProducts);
vendorProductRouter.post('/', protect, authorize('shopkeeper'), storeScope(true), createProduct);
vendorProductRouter.put('/:id', protect, authorize('shopkeeper'), storeScope(true), updateProduct);
vendorProductRouter.delete('/:id', protect, authorize('shopkeeper'), storeScope(true), deleteProduct);

export default router;
