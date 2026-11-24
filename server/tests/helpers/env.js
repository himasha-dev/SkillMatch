// Loaded first by every test file. Gives the app the configuration it expects
// and makes any un-stubbed database call fail fast instead of hanging.
import mongoose from "mongoose";

process.env.JWT_SECRET ||= "test-secret-for-automated-tests";
process.env.CLIENT_URL ||= "http://localhost:5173";
mongoose.set("bufferCommands", false);
