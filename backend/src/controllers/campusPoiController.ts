import { Request, Response } from 'express';
import CampusPOI from '../models/CampusPOI';

/**
 * @route   GET /api/campus/pois
 * @desc    List approved POIs with optional type/search filters (public)
 */
export const getPOIs = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, search, approved } = req.query;
        const filter: any = {};

        // Public users only see approved POIs; admin can pass ?approved=all
        if (approved === 'all' && (req as any).user?.role === 'admin') {
            // no filter on approved
        } else {
            filter.approved = true;
        }

        // Type filter — supports comma-separated: ?type=hostel,building
        if (type && typeof type === 'string' && type !== 'all') {
            const types = type.split(',').map(t => t.trim());
            if (types.length === 1) {
                filter.type = types[0];
            } else {
                filter.type = { $in: types };
            }
        }

        // Search filter — regex on name, description, tags
        if (search && typeof search === 'string') {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        const pois = await CampusPOI.find(filter)
            .populate('linkedStore', 'name status category')
            .sort({ legendNumber: 1 });

        res.json(pois);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/campus/pois/:id
 * @desc    Get single POI detail (public)
 */
export const getPOIById = async (req: Request, res: Response): Promise<void> => {
    try {
        const poi = await CampusPOI.findById(req.params.id)
            .populate('linkedStore', 'name status category owner');

        if (!poi) {
            res.status(404).json({ message: 'POI not found' });
            return;
        }

        res.json(poi);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   GET /api/campus/types
 * @desc    Get distinct POI types for filter buttons (public)
 */
export const getPOITypes = async (_req: Request, res: Response): Promise<void> => {
    try {
        const types = await CampusPOI.distinct('type', { approved: true });
        res.json(types);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @route   POST /api/campus/pois
 * @desc    Create a new POI (admin only)
 */
export const createPOI = async (req: Request, res: Response): Promise<void> => {
    try {
        const poi = await CampusPOI.create(req.body);
        res.status(201).json(poi);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   PUT /api/campus/pois/:id
 * @desc    Update a POI (admin only)
 */
export const updatePOI = async (req: Request, res: Response): Promise<void> => {
    try {
        const poi = await CampusPOI.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!poi) {
            res.status(404).json({ message: 'POI not found' });
            return;
        }
        res.json(poi);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server Error' });
    }
};

/**
 * @route   DELETE /api/campus/pois/:id
 * @desc    Delete a POI (admin only)
 */
export const deletePOI = async (req: Request, res: Response): Promise<void> => {
    try {
        const poi = await CampusPOI.findByIdAndDelete(req.params.id);
        if (!poi) {
            res.status(404).json({ message: 'POI not found' });
            return;
        }
        res.json({ message: 'POI deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
