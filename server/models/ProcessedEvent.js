import mongoose from 'mongoose';

const ProcessedEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  processedAt: { type: Date, default: Date.now, expires: 604800 }, // TTL: 7 days
});

const ProcessedEvent = mongoose.model('ProcessedEvent', ProcessedEventSchema);
export default ProcessedEvent;
