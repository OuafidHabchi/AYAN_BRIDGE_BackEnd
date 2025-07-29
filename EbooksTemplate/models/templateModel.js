import mongoose from "mongoose";

const templateSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  imageUrl: { type: String, required: true },
}, { timestamps: true });

const Template = mongoose.model("Template", templateSchema);

export default Template;
