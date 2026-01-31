import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    facultyId: mongoose.Types.ObjectId;
    action: string;
    details: string;
    platform: 'Web' | 'Mobile';
    deviceId?: string;
    deviceName?: string;
    ipAddress?: string;
    timestamp: Date;
}

const AuditLogSchema: Schema = new Schema({
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    platform: { type: String, enum: ['Web', 'Mobile'], required: true },
    deviceId: { type: String },
    deviceName: { type: String },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now, index: true }
});

// Create index for faster querying by faculty and time
AuditLogSchema.index({ facultyId: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
