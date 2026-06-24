import mongoose from "mongoose";

const mongoUri = "mongodb+srv://Hbafna:ApQmAacNzSfsQaue@sync-study.gcd6qh5.mongodb.net/test?appName=sync-study";

async function run() {
  console.log("Connecting to:", mongoUri);
  await mongoose.connect(mongoUri);
  console.log("Connected!");

  const conversations = await mongoose.connection.db.collection("conversations").find().toArray();
  console.log("\nConversations in DB:");
  conversations.forEach(c => {
    console.log(JSON.stringify(c, null, 2));
  });

  const messages = await mongoose.connection.db.collection("messages").find().toArray();
  console.log("\nMessages in DB:");
  messages.forEach(m => {
    console.log(JSON.stringify(m, null, 2));
  });

  const sharedfiles = await mongoose.connection.db.collection("sharedfiles").find().toArray();
  console.log("\nSharedFiles in DB:");
  sharedfiles.forEach(f => {
    console.log(JSON.stringify(f, null, 2));
  });

  await mongoose.disconnect();
}

run().catch(console.error);
