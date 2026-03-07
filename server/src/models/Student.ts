import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface Enrollment {
  subject: string;
  section: string;
  sessionType: 'Lecture' | 'Tutorial' | 'Practical' | 'Skill';
  facultyId: Types.ObjectId;
}

export interface StudentDocument extends Document {
  name: string;
  rollNumber: string;
  enrollments: Enrollment[];
  faceDescriptor: number[]; // Legacy field - keeping for backward compatibility
  embeddings: number[][]; // FaceNet embeddings - array of 512-dimensional vectors
  createdAt: Date;
}

const EnrollmentSchema = new Schema<Enrollment>({
  subject: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },
  sessionType: {
    type: String,
    required: true,
    enum: ['Lecture', 'Tutorial', 'Practical', 'Skill'],
    default: 'Lecture'
  },
  facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
});

const StudentSchema = new Schema<StudentDocument>({
  name: { type: String, required: true, trim: true },
  rollNumber: { type: String, required: true, trim: true },
  enrollments: { type: [EnrollmentSchema], default: [] },
  faceDescriptor: { type: [Number], required: false, default: [] }, // Legacy field
  embeddings: { type: [[Number]], required: false, default: [] }, // FaceNet embeddings
  createdAt: { type: Date, default: Date.now },
});

StudentSchema.index({ rollNumber: 1 });

export const Student: Model<StudentDocument> =
  mongoose.models.Student || mongoose.model<StudentDocument>('Student', StudentSchema);


