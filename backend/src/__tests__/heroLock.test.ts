/**
 * Unit tests for hero accept Redis lock.
 * Verifies that concurrent accept attempts are properly serialized.
 */

jest.mock('../config/redis', () => ({
    acquireLock: jest.fn(),
    releaseLock: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../config/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
jest.mock('../models/DeliveryDriver');
jest.mock('../models/Delivery');
jest.mock('../models/Order');
jest.mock('../models/User');
jest.mock('../models/Store');

import { acquireLock, releaseLock } from '../config/redis';
import DeliveryDriver from '../models/DeliveryDriver';
import Delivery from '../models/Delivery';
import Order from '../models/Order';

describe('Hero Accept Lock', () => {
    const mockReq = (orderId: string) => ({
        params: { orderId },
        body: { tip: 0 },
        user: { _id: 'hero123', name: 'Test Hero', email: 'hero@test.com' },
    });

    const mockRes = () => {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 409 when lock cannot be acquired (another hero is accepting)', async () => {
        (acquireLock as jest.Mock).mockResolvedValueOnce(false);

        const { acceptDelivery } = require('../controllers/heroController');
        const req = mockReq('order123');
        const res = mockRes();

        await acceptDelivery(req as any, res as any);

        expect(acquireLock).toHaveBeenCalledWith('hero:accept:order123', 10000);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('Another hero') })
        );
    });

    it('should release lock after successful accept', async () => {
        (acquireLock as jest.Mock).mockResolvedValueOnce(true);

        const mockDriver = {
            isOnline: true,
            isAvailable: true,
            currentDelivery: null,
            save: jest.fn().mockResolvedValue(true),
        };
        (DeliveryDriver.findOne as jest.Mock).mockResolvedValueOnce(mockDriver);

        const mockOrder = {
            _id: 'order123',
            user: { _id: 'student1' },
            store: 'store1',
            deliveryAddress: 'Hostel A',
        };
        (Order.findById as jest.Mock).mockReturnValueOnce({
            populate: jest.fn().mockResolvedValue(mockOrder),
        });

        (Delivery.findOne as jest.Mock).mockResolvedValueOnce(null); // no existing

        const mockStore = { settings: { address: 'Shop A' } };
        const Store = require('../models/Store').default;
        (Store.findById as jest.Mock).mockResolvedValueOnce(mockStore);

        (Delivery.create as jest.Mock).mockResolvedValueOnce({ _id: 'del123' });

        const { acceptDelivery } = require('../controllers/heroController');
        const req = mockReq('order123');
        const res = mockRes();

        await acceptDelivery(req as any, res as any);

        expect(releaseLock).toHaveBeenCalledWith('hero:accept:order123');
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should release lock even on error', async () => {
        (acquireLock as jest.Mock).mockResolvedValueOnce(true);
        (DeliveryDriver.findOne as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

        const { acceptDelivery } = require('../controllers/heroController');
        const req = mockReq('order123');
        const res = mockRes();

        await acceptDelivery(req as any, res as any);

        expect(releaseLock).toHaveBeenCalledWith('hero:accept:order123');
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
