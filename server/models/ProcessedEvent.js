import mongoose from 'mongoose';

const ProcessedEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  processedAt: { type: Date, default: Date.now, expires: 2592000 }, // TTL: 30 days
});

const ProcessedEvent = mongoose.model('ProcessedEvent', ProcessedEventSchema);
export default ProcessedEvent;
