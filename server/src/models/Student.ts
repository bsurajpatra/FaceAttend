import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface Enrollment {
  subject: string;
  section: string;
  facultyId: Types.ObjectId;
}

export interface StudentDocument extends Document {
  name: string;
  rollNumber: string;
  enrollments: Enrollment[];
  faceDescriptor: number[];
  createdAt: Date;
}

const EnrollmentSchema = new Schema<Enrollment>({
  subject: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },
  facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
});

const StudentSchema = new Schema<StudentDocument>({
  name: { type: String, required: true, trim: true },
  rollNumber: { type: String, required: true, trim: true, index: true },
  enrollments: { type: [EnrollmentSchema], default: [] },
  faceDescriptor: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now },
});

StudentSchema.index({ rollNumber: 1 });

export const Student: Model<StudentDocument> =
  mongoose.models.Student || mongoose.model<StudentDocument>('Student', StudentSchema);


