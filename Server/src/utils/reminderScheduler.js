import cron from "node-cron";
import mongoose from "mongoose";
import { Lead } from "../models/Lead.js";
import { User } from "../models/User.js";
import { createTransporter } from "./email.js";


let schedulerStarted = false;

export const startReminderScheduler = () => {
    if (schedulerStarted) return;
    schedulerStarted = true;

    // Run every minute
    cron.schedule("* * * * *", async () => {

        try {
            if (mongoose.connection.readyState !== 1) {
                return;
            }

            const now = new Date();

            console.log(
                `[REMINDER CHECK] ${now.toISOString()}`
            );


            // ==========================================
            // FIND LEADS WITH DUE REMINDERS
            // ==========================================

            const leads = await Lead.find({

                isDeleted: false,

                reminders: {
                    $elemMatch: {
                        scheduledFor: {
                            $lte: now
                        },

                        completed: false,

                        emailSent: false
                    }
                }

            });


            if (!leads.length) {
                return;
            }


            const transporter = createTransporter();

            if (!transporter) {

                console.error(
                    "[REMINDER ERROR] SMTP transporter unavailable."
                );

                return;
            }


            // ==========================================
            // PROCESS EACH LEAD
            // ==========================================

            for (const lead of leads) {

                for (const reminder of lead.reminders) {

                    // Skip reminders that aren't due
                    if (
                        reminder.completed ||
                        reminder.emailSent ||
                        new Date(reminder.scheduledFor) > now
                    ) {
                        continue;
                    }


                    // ======================================
                    // FIND ADMIN
                    // ======================================

                    const admin = await User.findOne({

                        _id: reminder.createdBy,

                        isDeleted: false,

                        isAdmin: true

                    });


                    if (!admin) {

                        console.error(
                            `[REMINDER ERROR] Admin not found for reminder ${reminder._id}`
                        );

                        continue;
                    }


                    if (!admin.email) {

                        console.error(
                            `[REMINDER ERROR] Admin ${admin._id} has no email.`
                        );

                        continue;
                    }


                    // ======================================
                    // SEND EMAIL
                    // ======================================

                    try {

                        const info = await transporter.sendMail({

                            from:
                                process.env.EMAIL_FROM ||
                                process.env.EMAIL_USER,

                            to: admin.email,

                            subject:
                                `Lead Reminder: ${reminder.title}`,

                            html: `

                                <div style="
                                    font-family: Arial, sans-serif;
                                    max-width: 600px;
                                    margin: auto;
                                    padding: 25px;
                                    border: 1px solid #e5e7eb;
                                    border-radius: 10px;
                                ">

                                    <h2 style="
                                        color: #111827;
                                    ">
                                        Lead Reminder
                                    </h2>

                                    <p>
                                        You have a scheduled reminder.
                                    </p>

                                    <div style="
                                        background: #f3f4f6;
                                        padding: 15px;
                                        border-radius: 8px;
                                        margin: 20px 0;
                                    ">

                                        <strong>
                                            ${reminder.title}
                                        </strong>

                                        <br><br>

                                        Lead:
                                        ${lead.subject}

                                        <br>

                                        Client:
                                        ${lead.clientName}

                                        <br>

                                        Scheduled:
                                        ${new Date(
                                            reminder.scheduledFor
                                        ).toLocaleString("en-IN")}

                                    </div>

                                    <p>
                                        Please follow up with the customer.
                                    </p>

                                </div>

                            `

                        });


                        console.log(
                            `[REMINDER EMAIL SENT] ${admin.email} - ${reminder.title}`
                        );


                        // ======================================
                        // MARK EMAIL AS SENT
                        // ======================================

                        reminder.emailSent = true;

                        reminder.emailSentAt = new Date();


                        await lead.save();


                    } catch (emailError) {

                        console.error(
                            `[REMINDER EMAIL ERROR] ${emailError.message}`
                        );

                    }

                }

            }

        } catch (error) {

            console.error(
                "[REMINDER SCHEDULER ERROR]",
                error
            );

        }

    });

    console.log(
        "✅ Lead reminder scheduler started."
    );
};