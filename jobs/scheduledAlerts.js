const cron = require("node-cron");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Student = require("../models/Student");
const sendEmail = require("../utils/sendEmail");

// Run every minute
cron.schedule("* * * * *", async () => {
  console.log("⏰ Cron: Checking for scheduled alerts...");

  try {
    const now = new Date();

    // Find notifications that are scheduled, but not yet sent
    const notifications = await Notification.find({
      scheduledAt: { $lte: now },
      sentAt: { $exists: false },
    });

    for (const note of notifications) {
      let recipients = [];

      if (note.audienceType === "all") {
        recipients = await User.find({ role: "parent" }).select("email");
      } else if (note.audienceType === "grades") {
        const students = await Student.find({ grade: { $in: note.recipientGrades } }).populate("parentId", "email");
        recipients = students.map(s => s.parentId).filter(p => p?.email);
      } else if (note.audienceType === "individuals") {
        recipients = await User.find({ _id: { $in: note.recipientParentIds } }).select("email");
      }

      const uniqueEmails = [...new Set(recipients.map(p => p.email).filter(Boolean))];

      for (const email of uniqueEmails) {
        await sendEmail(email, note.subject, `<p>${note.messageBody}</p>${note.link ? `<p><a href="${note.link}">${note.link}</a></p>` : ""}`);
      }

      // Mark it as sent
      note.sentAt = new Date();
      await note.save();

      console.log(`📬 Sent scheduled alert: ${note.subject}`);
    }

  } catch (err) {
    console.error("❌ Cron job error:", err);
  }
});
