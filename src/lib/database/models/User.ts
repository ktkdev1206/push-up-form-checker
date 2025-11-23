import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  // TODO: Define user schema
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    // TODO: Add user fields
  },
  {
    timestamps: true,
  }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

