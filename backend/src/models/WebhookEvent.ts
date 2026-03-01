import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhookEvent extends Document {
    eventId: string;           // Stripe event ID (evt_xxx)
    eventType: string;         // e.g. payment_intent.succeeded
    processedAt: Date;
    payload: Record<string, any>;
    createdAt: Date;
}

const WebhookEventSchema: Schema = new Schema({
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed },
}, {
    timestamps: true,
});

const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
export default WebhookEvent;
