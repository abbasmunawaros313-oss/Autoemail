// ==========================================
// OS TRAVEL EMAIL AUTOMATION BACKEND v2.0
// Railway Deployment - server.js
// Updated Schedule: 5 Follow-ups + Recurring
// ==========================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();
// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});
// ==========================================
// FIREBASE ADMIN INITIALIZATION
// ==========================================
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
        console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
        console.error('❌ Firebase Admin initialization failed:', error.message);
        process.exit(1);
    }
}
const db = admin.firestore();
// ==========================================
// HELPER FUNCTIONS
// ==========================================
async function sendEmailViaSMTP2GO({ to, subject, body, senderName = "OS Travel and Tours" }) {
    try {
        const payload = {
            api_key: process.env.SMTP_API_KEY,
            to: to,
            sender: process.env.SENDER_EMAIL,
            sender_name: senderName,
            subject: subject,
            text_body: body,
        };
        const response = await fetch("https://api.smtp2go.com/v3/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (data.data && (!data.data.failed || data.data.failed === 0)) {
            return { success: true, data };
        } else {
            throw new Error(`SMTP2GO API Error: ${JSON.stringify(data)}`);
        }
    } catch (error) {
        console.error('❌ SMTP2GO Error:', error.message);
        throw error;
    }
}
/**
 * Get email template based on type
 * NEW: 5 different follow-up emails
 */
function getEmailTemplate(emailType, booking) {
    const templates = {
        followUp1: {
            subject: "📋 Your Visa Application is Being Processed - OS Travel",
            body: `Dear ${booking.fullName},
Great news! Your visa application for ${booking.country} is currently being processed. 🔄
We're working diligently to ensure everything is in order. While we handle your visa, let us help you plan the rest of your journey!
🎫 FLIGHT TICKETING
Book your flights with confidence
→ Best prices guaranteed
→ Flexible booking options
→ Multiple airlines available
🏨 HOTEL RESERVATIONS
Comfortable accommodations await
→ Budget to luxury options
→ Prime locations
→ Special rates for our customers
🕋 UMRAH PACKAGES
Complete spiritual journey solutions
→ Visa assistance included
→ Hotel near Haram
→ Ground transportation
📞 Contact Us Anytime:
Phone: 0333-5542877
Email: ostravelisb@gmail.com
Website: https://www.ostravel.pk/
We'll update you soon on your visa status!
Best regards,
OS Travel and Tours Team`
        },
        followUp2: {
            subject: "⏳ Visa Processing Update - Plan Your Trip with OS Travel",
            body: `Dear ${booking.fullName},
Your visa application for ${booking.country} is still being processed. We appreciate your patience! ⏳
While you wait, why not plan ahead and save time?
✈️ EARLY BIRD FLIGHT DEALS
Lock in the best prices now
→ Flexible date changes available
→ Multiple payment options
→ Instant confirmation
🏨 ACCOMMODATION PLANNING
Secure your preferred hotels
→ Early booking discounts
→ Free cancellation options
→ Best locations guaranteed
🏥 TRAVEL INSURANCE
Protect your journey
→ Medical coverage
→ Trip cancellation protection
→ 24/7 emergency assistance
💡 PRO TIP: Book flights and hotels early to get the best deals!
📞 Ready to Plan?
Phone: 0333-5542877
Email: ostravelisb@gmail.com
Website: https://www.ostravel.pk/
We'll notify you immediately once your visa is approved!
Best regards,
OS Travel and Tours Team`
        },
        followUp3: {
            subject: "🎉 Visa Approved! Complete Your Travel Plans - OS Travel",
            body: `Dear ${booking.fullName},
Congratulations! Your visa for ${booking.country} has been approved! 🎉
Now it's time to finalize your travel arrangements:
🎫 FLIGHT BOOKING - PRIORITY SERVICE
Get the best deals on international flights
→ Competitive prices
→ Multiple airline options
→ Easy booking process
→ Flexible payment plans
🏨 HOTEL PACKAGES - SPECIAL RATES
Comfortable stays worldwide
→ Budget to luxury options
→ Prime locations near attractions
→ Best rates guaranteed
→ Free cancellation available
🕋 UMRAH SERVICES
Complete Umrah travel solutions
→ Visa assistance
→ Hotel near Haram
→ Ground transportation
→ Experienced guides
🏥 TRAVEL INSURANCE - PEACE OF MIND
Comprehensive coverage
→ Emergency medical expenses
→ Trip cancellation protection
→ Lost baggage coverage
→ 24/7 assistance
📞 Book Now - Limited Time Offers:
Phone: 0333-5542877
Email: ostravelisb@gmail.com
Website: https://www.ostravel.pk/
Safe travels!
OS Travel and Tours Team`
        },
        followUp4: {
            subject: "🌍 Your Journey Awaits - Exclusive Travel Services | OS Travel",
            body: `Dear ${booking.fullName},
We hope you're enjoying your approved visa for ${booking.country}! 🌍
As your trusted travel partner, we're here to make every journey memorable:
✈️ INTERNATIONAL FLIGHT TICKETING
→ Worldwide destinations
→ Best price guarantee
→ 24/7 booking support
→ Flexible payment options
🏨 GLOBAL HOTEL BOOKINGS
→ 500,000+ properties worldwide
→ Instant confirmation
→ Best rate guarantee
→ Free cancellation on select bookings
🕋 UMRAH & HAJJ PACKAGES
→ Complete spiritual journey solutions
→ Premium accommodations
→ Expert guidance
→ All-inclusive packages
🏥 COMPREHENSIVE TRAVEL INSURANCE
→ Medical coverage up to $100,000
→ Trip cancellation & interruption
→ Lost baggage protection
→ Emergency evacuation
🎁 EXCLUSIVE FOR YOU:
Special discounts on all services as our valued customer!
📞 Contact Us Today:
Phone: 0333-5542877
Email: ostravelisb@gmail.com
Website: https://www.ostravel.pk/
Let us make your next journey unforgettable!
Best regards,
OS Travel and Tours Team`
        },
        recurring: {
            subject: "🌟 Planning Your Next Adventure? We're Here to Help!",
            body: `Dear ${booking.fullName},
It's been a while since we helped you with your ${booking.country} visa!
We hope your trip was amazing! 🎉
🌍 PLANNING YOUR NEXT JOURNEY?
OS Travel and Tours is ready to assist with:
✈️ Visa Services - Fast & reliable processing for 50+ countries
🎫 Flight Ticketing - Competitive worldwide rates
🕋 Umrah Packages - Spiritual journey made easy
🏨 Hotel Bookings - Comfort guaranteed globally
🏥 Travel Insurance - Complete protection
🎁 RETURNING CUSTOMER BENEFITS:
• Priority visa processing
• Exclusive flight discounts
• Personalized service
• Dedicated support team
• Special package deals
💼 CORPORATE TRAVEL SOLUTIONS:
• Group bookings
• Business travel management
• Customized packages
• Dedicated account manager
📞 Let's Plan Your Next Adventure:
Phone: 0333-5542877
Email: ostravelisb@gmail.com
Website: https://www.ostravel.pk/
We look forward to serving you again!
Best regards,
OS Travel and Tours Team`
        }
    };
    return templates[emailType] || { subject: '', body: '' };
}
/**
 * Update email tracking in Firestore
 * NEW: Supports 5 follow-ups
 */
async function updateEmailTracking(bookingId, emailType) {
    const updateData = {};
    const now = new Date().toISOString();
    if (emailType === "followUp1") {
        updateData["emailTracking.followUp1Sent"] = true;
        updateData["emailTracking.followUp1SentDate"] = now;
    } else if (emailType === "followUp2") {
        updateData["emailTracking.followUp2Sent"] = true;
        updateData["emailTracking.followUp2SentDate"] = now;
    } else if (emailType === "followUp3") {
        updateData["emailTracking.followUp3Sent"] = true;
        updateData["emailTracking.followUp3SentDate"] = now;
    } else if (emailType === "followUp4") {
        updateData["emailTracking.followUp4Sent"] = true;
        updateData["emailTracking.followUp4SentDate"] = now;
    } else if (emailType === "recurring") {
        const nextRecurring = new Date();
        nextRecurring.setMonth(nextRecurring.getMonth() + 6);
        updateData["emailTracking.lastRecurringEmailDate"] = now;
        updateData["emailTracking.nextRecurringEmailDate"] = nextRecurring.toISOString();
    }
    await db.collection("bookings").doc(bookingId).update(updateData);
}
async function sendFollowUpEmail(booking, bookingId, emailType) {
    try {
        if (!booking.email || booking.email.trim() === "") {
            return {
                success: false,
                emailType,
                bookingId,
                error: "No email address"
            };
        }
        const { subject, body } = getEmailTemplate(emailType, booking);
        if (!subject || !body) {
            throw new Error(`Invalid email type: ${emailType}`);
        }
        await sendEmailViaSMTP2GO({
            to: booking.email,
            subject,
            body,
        });
        await updateEmailTracking(bookingId, emailType);
        console.log(`✅ Sent ${emailType} email to ${booking.email} (Booking: ${bookingId})`);
        return {
            success: true,
            emailType,
            bookingId,
            email: booking.email
        };
    } catch (error) {
        console.error(`❌ Failed to send ${emailType} email for booking ${bookingId}:`, error.message);
        return {
            success: false,
            emailType,
            bookingId,
            error: error.message
        };
    }
}
// ==========================================
// API ROUTES
// ==========================================
app.get("/", (req, res) => {
    res.json({
        status: "Server running",
        service: "OS Travel Email Automation v2.0",
        version: "2.0.0",
        emailSchedule: {
            followUp1: "2 days after Processing",
            followUp2: "7 days after Processing",
            followUp3: "1 month after Approved",
            followUp4: "3 months after Approved",
            recurring: "6 months after Approved, then every 6 months"
        },
        timestamp: new Date().toISOString()
    });
});
/**
 * Manual email sending endpoint (existing functionality)
 */
app.post("/send-email", async (req, res) => {
    try {
        const { subject, body, recipients, file } = req.body;
        if (!subject || !body || !recipients?.length) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const sendPromises = recipients.map(async r => {
            const payload = {
                api_key: process.env.SMTP_API_KEY,
                to: r.email,
                sender: process.env.SENDER_EMAIL,
                sender_name: "OS Travel and Tours",
                subject,
                text_body: body.replace("{{name}}", r.name || "Customer"),
            };
            if (file?.name && file?.content) {
                payload.attachments = [
                    {
                        filename: file.name,
                        mimetype: file.type || "application/octet-stream",
                        fileblob: file.content.replace(/\s/g, ""),
                    }
                ];
            }
            const resp = await fetch("https://api.smtp2go.com/v3/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await resp.json();
            if (!data.data || (data.data.failed && data.data.failed > 0)) {
                throw new Error(`Failed to send to ${r.email}: ${JSON.stringify(data)}`);
            }
            return data;
        });
        await Promise.all(sendPromises);
        res.json({ success: true, sent: recipients.length });
    } catch (err) {
        console.error("SMTP2GO API Error:", err);
        res.status(500).json({ error: "Failed to send emails", details: err.message });
    }
});
/**
 * CRON JOB ENDPOINT - Send scheduled follow-up emails
 * NEW: Checks both Processing and Approved statuses
 */
app.get("/send-scheduled-emails", async (req, res) => {
    const startTime = Date.now();
    console.log("\n🔄 ========== CRON JOB STARTED ==========");
    console.log(`Timestamp: ${new Date().toISOString()}`);
    try {
        const now = new Date();
        const bookingsRef = db.collection("bookings");
        // Get Processing bookings (for followUp1 & followUp2)
        const processingSnapshot = await bookingsRef
            .where("visaStatus", "==", "Processing")
            .get();
        // Get Approved bookings (for followUp3, followUp4, recurring)
        const approvedSnapshot = await bookingsRef
            .where("visaStatus", "==", "Approved")
            .get();
        console.log(`📊 Found ${processingSnapshot.size} Processing bookings`);
        console.log(`📊 Found ${approvedSnapshot.size} Approved bookings`);
        const emailResults = {
            followUp1: { sent: 0, failed: 0 },
            followUp2: { sent: 0, failed: 0 },
            followUp3: { sent: 0, failed: 0 },
            followUp4: { sent: 0, failed: 0 },
            recurring: { sent: 0, failed: 0 },
        };
        const emailPromises = [];
        // Process PROCESSING bookings (followUp1 & followUp2)
        for (const doc of processingSnapshot.docs) {
            const booking = doc.data();
            const tracking = booking.emailTracking || {};
            const bookingId = doc.id;
            if (!booking.email) {
                console.log(`⏭️  Skipping booking ${bookingId} - No email address`);
                continue;
            }
            // Check Follow-up #1 (2 days after Processing)
            if (
                !tracking.followUp1Sent &&
                tracking.followUp1ScheduledDate &&
                new Date(tracking.followUp1ScheduledDate) <= now
            ) {
                console.log(`📧 Scheduling followUp1 for ${booking.email} (${bookingId})`);
                emailPromises.push(
                    sendFollowUpEmail(booking, bookingId, "followUp1")
                        .then(result => {
                            if (result.success) emailResults.followUp1.sent++;
                            else emailResults.followUp1.failed++;
                            return result;
                        })
                );
            }
            // Check Follow-up #2 (7 days after Processing)
            if (
                !tracking.followUp2Sent &&
                tracking.followUp2ScheduledDate &&
                new Date(tracking.followUp2ScheduledDate) <= now
            ) {
                console.log(`📧 Scheduling followUp2 for ${booking.email} (${bookingId})`);
                emailPromises.push(
                    sendFollowUpEmail(booking, bookingId, "followUp2")
                        .then(result => {
                            if (result.success) emailResults.followUp2.sent++;
                            else emailResults.followUp2.failed++;
                            return result;
                        })
                );
            }
        }
        // Process APPROVED bookings (followUp3, followUp4, recurring)
        for (const doc of approvedSnapshot.docs) {
            const booking = doc.data();
            const tracking = booking.emailTracking || {};
            const bookingId = doc.id;
            if (!booking.email) {
                console.log(`⏭️  Skipping booking ${bookingId} - No email address`);
                continue;
            }
            // Check Follow-up #3 (1 month after Approved)
            if (
                !tracking.followUp3Sent &&
                tracking.followUp3ScheduledDate &&
                new Date(tracking.followUp3ScheduledDate) <= now
            ) {
                console.log(`📧 Scheduling followUp3 for ${booking.email} (${bookingId})`);
                emailPromises.push(
                    sendFollowUpEmail(booking, bookingId, "followUp3")
                        .then(result => {
                            if (result.success) emailResults.followUp3.sent++;
                            else emailResults.followUp3.failed++;
                            return result;
                        })
                );
            }
            // Check Follow-up #4 (3 months after Approved)
            if (
                !tracking.followUp4Sent &&
                tracking.followUp4ScheduledDate &&
                new Date(tracking.followUp4ScheduledDate) <= now
            ) {
                console.log(`📧 Scheduling followUp4 for ${booking.email} (${bookingId})`);
                emailPromises.push(
                    sendFollowUpEmail(booking, bookingId, "followUp4")
                        .then(result => {
                            if (result.success) emailResults.followUp4.sent++;
                            else emailResults.followUp4.failed++;
                            return result;
                        })
                );
            }
            // Check Recurring (every 6 months after Approved)
            if (
                tracking.nextRecurringEmailDate &&
                new Date(tracking.nextRecurringEmailDate) <= now
            ) {
                console.log(`📧 Scheduling recurring for ${booking.email} (${bookingId})`);
                emailPromises.push(
                    sendFollowUpEmail(booking, bookingId, "recurring")
                        .then(result => {
                            if (result.success) emailResults.recurring.sent++;
                            else emailResults.recurring.failed++;
                            return result;
                        })
                );
            }
        }
        // Send all emails concurrently
        const results = await Promise.all(emailPromises);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const totalSent = Object.values(emailResults).reduce((sum, r) => sum + r.sent, 0);
        const totalFailed = Object.values(emailResults).reduce((sum, r) => sum + r.failed, 0);
        console.log("\n📊 ========== CRON JOB SUMMARY ==========");
        console.log(`✅ Follow-up #1 (Processing): ${emailResults.followUp1.sent} sent, ${emailResults.followUp1.failed} failed`);
        console.log(`✅ Follow-up #2 (Processing): ${emailResults.followUp2.sent} sent, ${emailResults.followUp2.failed} failed`);
        console.log(`✅ Follow-up #3 (Approved): ${emailResults.followUp3.sent} sent, ${emailResults.followUp3.failed} failed`);
        console.log(`✅ Follow-up #4 (Approved): ${emailResults.followUp4.sent} sent, ${emailResults.followUp4.failed} failed`);
        console.log(`✅ Recurring (Approved): ${emailResults.recurring.sent} sent, ${emailResults.recurring.failed} failed`);
        console.log(`📈 Total: ${totalSent} sent, ${totalFailed} failed`);
        console.log(`⏱️  Duration: ${duration}s`);
        console.log("========================================\n");
        res.json({
            success: true,
            summary: {
                totalSent,
                totalFailed,
                breakdown: emailResults,
                duration: `${duration}s`,
                checkedBookings: {
                    processing: processingSnapshot.size,
                    approved: approvedSnapshot.size,
                    total: processingSnapshot.size + approvedSnapshot.size
                },
                timestamp: new Date().toISOString()
            },
            results
        });
    } catch (error) {
        console.error("❌ CRON JOB ERROR:", error);
        res.status(500).json({
            success: false,
            error: "Failed to send scheduled emails",
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Health check for email system
 * NEW: Monitors all 5 follow-ups
 */
app.get("/check-email-status", async (req, res) => {
    try {
        const now = new Date();
        const bookingsRef = db.collection("bookings");
        const processingSnapshot = await bookingsRef
            .where("visaStatus", "==", "Processing")
            .get();
        const approvedSnapshot = await bookingsRef
            .where("visaStatus", "==", "Approved")
            .get();
        const stats = {
            totalProcessingBookings: processingSnapshot.size,
            totalApprovedBookings: approvedSnapshot.size,
            pending: {
                followUp1: 0,
                followUp2: 0,
                followUp3: 0,
                followUp4: 0,
                recurring: 0
            },
            upcoming: {
                followUp1: 0,
                followUp2: 0,
                followUp3: 0,
                followUp4: 0,
                recurring: 0
            }
        };
        // Check Processing bookings
        processingSnapshot.forEach(doc => {
            const tracking = doc.data().emailTracking || {};
            if (!tracking.followUp1Sent && tracking.followUp1ScheduledDate) {
                if (new Date(tracking.followUp1ScheduledDate) <= now) stats.pending.followUp1++;
                else stats.upcoming.followUp1++;
            }
            if (!tracking.followUp2Sent && tracking.followUp2ScheduledDate) {
                if (new Date(tracking.followUp2ScheduledDate) <= now) stats.pending.followUp2++;
                else stats.upcoming.followUp2++;
            }
        });
        // Check Approved bookings
        approvedSnapshot.forEach(doc => {
            const tracking = doc.data().emailTracking || {};
            if (!tracking.followUp3Sent && tracking.followUp3ScheduledDate) {
                if (new Date(tracking.followUp3ScheduledDate) <= now) stats.pending.followUp3++;
                else stats.upcoming.followUp3++;
            }
            if (!tracking.followUp4Sent && tracking.followUp4ScheduledDate) {
                if (new Date(tracking.followUp4ScheduledDate) <= now) stats.pending.followUp4++;
                else stats.upcoming.followUp4++;
            }
            if (tracking.nextRecurringEmailDate) {
                if (new Date(tracking.nextRecurringEmailDate) <= now) stats.pending.recurring++;
                else stats.upcoming.recurring++;
            }
        });
        const totalPending = Object.values(stats.pending).reduce((sum, v) => sum + v, 0);
        const totalUpcoming = Object.values(stats.upcoming).reduce((sum, v) => sum + v, 0);
        res.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            pending: {
                total: totalPending,
                ...stats.pending
            },
            upcoming: {
                total: totalUpcoming,
                ...stats.upcoming
            },
            bookings: {
                processing: stats.totalProcessingBookings,
                approved: stats.totalApprovedBookings,
                total: stats.totalProcessingBookings + stats.totalApprovedBookings
            }
        });
    } catch (error) {
        console.error("❌ Health check error:", error);
        res.status(500).json({
            status: "error",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
app.options("*", (req, res) => res.sendStatus(204));
// ==========================================
// ERROR HANDLING
// ==========================================
app.use((req, res) => {
    res.status(404).json({
        error: "Endpoint not found",
        path: req.path,
        method: req.method
    });
});
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// ==========================================
// SERVER STARTUP
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\n🚀 ========================================');
    console.log(`   OS Travel Email Automation Server v2.0`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Email Schedule:`);
    console.log(`   - Follow-up #1: 2 days after Processing`);
    console.log(`   - Follow-up #2: 7 days after Processing`);
    console.log(`   - Follow-up #3: 1 month after Approved`);
    console.log(`   - Follow-up #4: 3 months after Approved`);
    console.log(`   - Recurring: Every 6 months after Approved`);
    console.log(`   Time: ${new Date().toISOString()}`);
    console.log('========================================\n');
});
// ==========================================
// PROCESS ERROR HANDLERS
// ==========================================
process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
    process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
});
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('👋 SIGINT received, shutting down gracefully...');
    process.exit(0);
});