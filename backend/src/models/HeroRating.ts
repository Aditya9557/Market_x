import mongoose, { Document, Schema } from 'mongoose';

export interface IHeroRating extends Document {
    delivery: mongoose.Types.ObjectId;
    order: mongoose.Types.ObjectId;
    hero: mongoose.Types.ObjectId;          // the delivery hero being rated
    ratedBy: mongoose.Types.ObjectId;       // the student who rated
    rating: number;                         // 1-5
    comment?: string;
    createdAt: Date;
}

const HeroRatingSchema: Schema = new Schema({
    delivery: { type: Schema.Types.ObjectId, ref: 'Delivery', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    hero: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ratedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
}, {
    timestamps: true,
});

// One rating per delivery per user
HeroRatingSchema.index({ delivery: 1, ratedBy: 1 }, { unique: true });
HeroRatingSchema.index({ hero: 1 });

const HeroRating = mongoose.model<IHeroRating>('HeroRating', HeroRatingSchema);
export default HeroRating;
