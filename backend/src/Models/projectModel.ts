import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  code: { type: String, required:false }
});

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    files: [fileSchema], 

    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    }
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
