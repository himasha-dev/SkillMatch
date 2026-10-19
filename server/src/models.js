import mongoose from "mongoose";

const { Schema } = mongoose;
const ref = (model, extra = {}) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required: true,
  ...extra,
});

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email address is not valid"],
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "company", "admin"], required: true },
    organization: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
