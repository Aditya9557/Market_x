import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    inventory: number;
    category: string;
    images: string[];
    store: mongoose.Types.ObjectId;
    status: 'active' | 'draft' | 'archived';
    tags: string[];
}

const ProductSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    inventory: { type: Number, required: true, default: 0, min: 0 },
    category: {
        type: String,
        enum: ['food', 'books', 'stationery', 'electronics', 'clothing', 'services', 'other'],
        default: 'other'
    },
    images: [{ type: String }],
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    status: {
        type: String,
        enum: ['active', 'draft', 'archived'],
        default: 'active'
    },
    tags: [{ type: String }]
}, {
    timestamps: true
});

// Indexes for efficient queries
ProductSchema.index({ store: 1, status: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

const Product = mongoose.model<IProduct>('Product', ProductSchema);
export default Product;
