import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Omit<Document, 'errors'> {
  userId?: string;
  totalReps: number;
  correctReps: number;
  incorrectReps: number;
  duration: number; // in seconds
  formErrors: string[];
  startedAt: Date;
  endedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: String, required: false },
    totalReps: { type: Number, required: true, default: 0 },
    correctReps: { type: Number, required: true, default: 0 },
    incorrectReps: { type: Number, required: true, default: 0 },
    duration: { type: Number, required: true, default: 0 },
    formErrors: [{ type: String }],
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date, required: false },
  },
  {
    timestamps: true,
  }
);

export const Session =
  mongoose.models.Session ||
  mongoose.model<ISession>('Session', SessionSchema);

