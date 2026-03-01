import mongoose, { Document, Schema } from 'mongoose';

export interface IContactMessage extends Document {
    user: mongoose.Types.ObjectId;
    subject: string;
    message: string;
    status: 'open' | 'closed';
    createdAt: Date;
}

const ContactMessageSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' }
}, {
    timestamps: true
});

const ContactMessage = mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema);
export default ContactMessage;
