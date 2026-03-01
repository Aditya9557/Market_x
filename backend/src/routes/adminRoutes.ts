import express from 'express';
import { getPendingShops, approveShop, rejectShop, getAllStores, toggleUniGuideApproval } from '../controllers/adminController';
import { getDisputes, resolveDispute } from '../controllers/disputeController';
import { getHeroApplications, approveHeroApplication, rejectHeroApplication } from '../controllers/heroApplicationController';
import { getAdminOverview } from '../controllers/analyticsController';
import {
    getAuditLogsHandler,
    getRiskFlagsHandler,
    resolveFlagHandler,
    getReconciliationReportsHandler,
    triggerReconciliationHandler,
    getCampusConfigsHandler,
    upsertCampusConfigHandler,
} from '../controllers/adminOpsController';
import { adminGetHeroEconomicsHandler } from '../controllers/heroEconomicsController';
import { protect, authorize } from '../middleware/authMiddleware';
import { validate, resolveDisputeSchema } from '../middleware/validation';

const router = express.Router();

// All admin routes protected
router.use(protect, authorize('admin'));

// ── Store management ─────────────────────────────────────────────────────────
router.get('/pending-shops', getPendingShops);
router.get('/all-stores', getAllStores);
router.put('/approve-shop/:id', approveShop);
router.put('/reject-shop/:id', rejectShop);
router.put('/uniguide-toggle/:storeId', toggleUniGuideApproval);

// ── Dispute management ───────────────────────────────────────────────────────
router.get('/disputes', getDisputes);
router.put('/disputes/:id/resolve', validate(resolveDisputeSchema), resolveDispute);

// ── Analytics ────────────────────────────────────────────────────────────────
router.get('/stats/overview', getAdminOverview);

// ── Hero application management ──────────────────────────────────────────────
router.get('/hero-applications', getHeroApplications);
router.put('/hero-applications/:id/approve', approveHeroApplication);
router.put('/hero-applications/:id/reject', rejectHeroApplication);
router.get('/hero-economics/:heroId', adminGetHeroEconomicsHandler);

// ── Audit logs ───────────────────────────────────────────────────────────────
router.get('/audit-logs', getAuditLogsHandler);

// ── Risk & fraud flags ───────────────────────────────────────────────────────
router.get('/risk-flags', getRiskFlagsHandler);
router.put('/risk-flags/:id/resolve', resolveFlagHandler);

// ── Stripe reconciliation ────────────────────────────────────────────────────
router.get('/reconciliation', getReconciliationReportsHandler);
router.post('/reconciliation/trigger', triggerReconciliationHandler);

// ── Campus config ────────────────────────────────────────────────────────────
router.get('/campus-configs', getCampusConfigsHandler);
router.put('/campus-configs/:campusId', upsertCampusConfigHandler);

export default router;
