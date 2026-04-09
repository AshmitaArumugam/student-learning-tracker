const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

/* ================= VALIDATION ================= */
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error("❌ Missing Supabase credentials in .env file");
  console.error("Add SUPABASE_URL and SUPABASE_KEY to .env");
  process.exit(1);
}

/* ================= MIDDLEWARE ================= */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://student-learning-tracker-beta.vercel.app",
      "https://student-learning-tracker-git-main-ashmita-s-as-projects.vercel.app",
      "https://student-learning-tracker-ncut66u2m-ashmita-s-as-projects.vercel.app",
      /\.vercel\.app$/,  // Allow all Vercel domains
      /\.netlify\.app$/,  // Allow Netlify domains
      /^https?:\/\/localhost(:\d+)?$/,  // Allow localhost with any port
    ];

    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

/* ================= SUPABASE CLIENT ================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Test Supabase connection
(async () => {
  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact' });
    if (error) throw error;
    console.log("✅ Connected to Supabase successfully");
  } catch (err) {
    console.error("❌ Supabase Connection Error:", err.message);
  }
})();

/* ================= MAIL ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ================= UTILITY FUNCTIONS ================= */
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const handleError = (res, error, message = "An error occurred") => {
  console.error(message, error);
  res.status(500).json({ success: false, message });
};

/* ================= TEST ROUTE ================= */
app.get("/test", (req, res) => {
  res.json({ message: "Backend working", database: "Supabase" });
});

/* ================= AUTH ================= */

// REGISTER
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email, and password are required" });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
  }

  try {
    const hashedPassword = hashPassword(password);

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    // Insert new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ name, email, password: hashedPassword }])
      .select('id, name, email')
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ success: true, user: newUser, message: "Registration successful" });
  } catch (err) {
    console.error("Register Error:", err);
    handleError(res, err, "Registration failed");
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    const hashedPassword = hashPassword(password);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password')
      .eq('email', email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (user.password !== hashedPassword) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      message: "Login successful"
    });
  } catch (err) {
    console.error("Login Error:", err);
    handleError(res, err, "Login failed");
  }
});

/* ================= SKILLS ================= */

// ADD SKILL
app.post("/skills/add", async (req, res) => {
  const { user_id, name } = req.body;

  if (!user_id || !name) {
    return res.json({ success: false, message: "Missing user ID or skill name" });
  }

  try {
    const { error } = await supabase
      .from('skills')
      .insert([{ user_id, name }]);

    if (error) throw error;
    res.json({ success: true, message: "Skill added successfully" });
  } catch (err) {
    console.error("Add Skill Error:", err);
    res.json({ success: false, message: "Failed to add skill" });
  }
});

// GET SKILLS + TOPICS
app.get("/skills/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: skillsData, error: skillsError } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true });

    if (skillsError) throw skillsError;

    const skills = [];
    for (const skill of skillsData) {
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .eq('skill_id', skill.id)
        .order('id', { ascending: true });

      if (topicsError) throw topicsError;

      skills.push({
        ...skill,
        topics: topicsData || []
      });
    }

    res.json(skills);
  } catch (err) {
    console.error("Get Skills Error:", err);
    res.json([]);
  }
});

/* ================= TOPICS ================= */

// ADD TOPIC
app.post("/topics/add", async (req, res) => {
  const { skill_id, name } = req.body;

  if (!skill_id || !name) {
    return res.json({ success: false, message: "Missing skill ID or topic name" });
  }

  try {
    const { error } = await supabase
      .from('topics')
      .insert([{ skill_id, name, status: 'not-started' }]);

    if (error) throw error;
    res.json({ success: true, message: "Topic added successfully" });
  } catch (err) {
    console.error("Add Topic Error:", err);
    res.json({ success: false, message: "Failed to add topic" });
  }
});

// UPDATE TOPIC STATUS
app.post("/topics/status", async (req, res) => {
  const { topic_id, status } = req.body;

  if (!topic_id || !status) {
    return res.json({ success: false, message: "Missing topic ID or status" });
  }

  try {
    const { error } = await supabase
      .from('topics')
      .update({ status })
      .eq('id', topic_id);

    if (error) throw error;
    res.json({ success: true, message: "Status updated successfully" });
  } catch (err) {
    console.error("Update Topic Status Error:", err);
    res.json({ success: false, message: "Failed to update status" });
  }
});

// DELETE TOPIC
app.post("/topics/delete", async (req, res) => {
  const { topic_id } = req.body;

  if (!topic_id) {
    return res.json({ success: false, message: "Missing topic ID" });
  }

  try {
    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', topic_id);

    if (error) throw error;
    res.json({ success: true, message: "Topic deleted successfully" });
  } catch (err) {
    console.error("Delete Topic Error:", err);
    res.json({ success: false, message: "Failed to delete topic" });
  }
});

/* ================= TASKS ================= */

// GET TASKS BY DATE
app.get("/tasks/:userId/:taskDate", async (req, res) => {
  const { userId, taskDate } = req.params;

  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('task_date', taskDate)
      .order('id', { ascending: true });

    if (error) throw error;
    res.json(tasks || []);
  } catch (err) {
    console.error("Get Tasks Error:", err);
    res.json([]);
  }
});

// ADD TASK
app.post("/tasks/add", async (req, res) => {
  const { user_id, task_date, text } = req.body;

  if (!user_id || !task_date || !text) {
    return res.json({ success: false, message: "Missing required fields" });
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .insert([{ user_id, task_date, text, done: false, day_ended: false }]);

    if (error) throw error;
    res.json({ success: true, message: "Task added successfully" });
  } catch (err) {
    console.error("Add Task Error:", err);
    res.json({ success: false, message: "Failed to add task" });
  }
});

// TOGGLE TASK
app.post("/tasks/toggle", async (req, res) => {
  const { id, done } = req.body;

  if (!id || done === undefined) {
    return res.json({ success: false, message: "Missing task ID or done status" });
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ done })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: "Task toggled successfully" });
  } catch (err) {
    console.error("Toggle Task Error:", err);
    res.json({ success: false, message: "Failed to toggle task" });
  }
});

// END DAY
app.post("/tasks/end-day", async (req, res) => {
  const { user_id, task_date } = req.body;

  if (!user_id || !task_date) {
    return res.json({ success: false, message: "Missing user ID or task date" });
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ day_ended: true })
      .eq('user_id', user_id)
      .eq('task_date', task_date);

    if (error) throw error;
    res.json({ success: true, message: "Day ended successfully" });
  } catch (err) {
    console.error("End Day Error:", err);
    res.json({ success: false, message: "Failed to end day" });
  }
});

/* ================= PROGRESS ================= */

app.post("/progress", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.json({ success: false, message: "Missing user ID" });
  }

  try {
    // Get skill count
    const { count: skillCount, error: skillError } = await supabase
      .from('skills')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (skillError) throw skillError;

    // Get all skills with topic counts
    const { data: skillsData, error: skillsDataError } = await supabase
      .from('skills')
      .select(`
        id,
        name,
        topics (id, status)
      `)
      .eq('user_id', userId);

    if (skillsDataError) throw skillsDataError;

    let topicCount = 0;
    let completedCount = 0;
    const skillsProgress = [];

    for (const skill of skillsData) {
      const total = skill.topics.length;
      const completed = skill.topics.filter(t => t.status === 'finished').length;
      
      topicCount += total;
      completedCount += completed;

      skillsProgress.push({
        skill_name: skill.name,
        total,
        completed
      });
    }

    // Get active days count
    const { data: activeDays, error: activeDaysError } = await supabase
      .from('user_activity')
      .select('activity_date')
      .eq('user_id', userId);

    if (activeDaysError) throw activeDaysError;

    const uniqueDays = new Set(activeDays.map(a => a.activity_date)).size;

    res.json({
      skillCount: skillCount || 0,
      topicCount,
      completedCount,
      activeDays: uniqueDays,
      skills: skillsProgress
    });
  } catch (err) {
    console.error("Progress Error:", err);
    res.json({
      skillCount: 0,
      topicCount: 0,
      completedCount: 0,
      activeDays: 0,
      skills: []
    });
  }
});

/* ================= OTP / PASSWORD RESET ================= */

// SEND OTP
app.post("/auth/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  try {
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') throw userError;

    if (!user) {
      return res.json({ success: false, message: "Email not registered" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP
    const { error: updateError } = await supabase
      .from('users')
      .update({ otp, otp_expiry: otpExpiry })
      .eq('email', email);

    if (updateError) throw updateError;

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🔐 Your OTP Code - Student Learning Tracker",
      html: `<h2>Your OTP Code</h2><p>Your one-time password is: <strong>${otp}</strong></p><p>This OTP will expire in 5 minutes.</p>`
    });

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("Send OTP Error:", err);
    res.json({ success: false, message: "Failed to send OTP" });
  }
});

// VERIFY OTP
app.post("/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.json({ success: false, message: "Email and OTP are required" });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('otp, otp_expiry')
      .eq('email', email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.otp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (new Date(user.otp_expiry) < new Date()) {
      return res.json({ success: false, message: "OTP has expired" });
    }

    // Clear OTP
    const { error: clearError } = await supabase
      .from('users')
      .update({ otp: null, otp_expiry: null })
      .eq('email', email);

    if (clearError) throw clearError;

    res.json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.json({ success: false, message: "OTP verification failed" });
  }
});

// RESET PASSWORD
app.post("/auth/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.json({ success: false, message: "Email and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.json({ success: false, message: "Password must be at least 6 characters" });
  }

  try {
    const hashedPassword = hashPassword(newPassword);

    const { error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email);

    if (error) throw error;

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.json({ success: false, message: "Failed to reset password" });
  }
});

/* ================= PROFILE / SETTINGS ================= */

// UPDATE PROFILE
app.post("/update-profile", async (req, res) => {
  const { user_id, name, phone, profile_image } = req.body;

  if (!user_id || !name) {
    return res.json({ success: false, message: "User ID and name are required" });
  }

  try {
    const updateData = { name, phone: phone || null };
    if (profile_image) {
      updateData.profile_img = profile_image;
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user_id);

    if (error) throw error;

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.json({ success: false, message: "Failed to update profile" });
  }
});

// GET USER
app.get("/user/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.json({});
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, profile_img')
      .eq('id', id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    res.json(user || {});
  } catch (err) {
    console.error("Get User Error:", err);
    res.json({});
  }
});

/* ================= ACTIVITY / STREAK ================= */

// MARK ACTIVITY
app.post("/mark-activity", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.json({ success: false, message: "User ID is required" });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from('user_activity')
      .upsert(
        { user_id, activity_date: today },
        { onConflict: 'user_id,activity_date' }
      );

    if (error) throw error;

    res.json({ success: true, message: "Activity marked successfully" });
  } catch (err) {
    console.error("Mark Activity Error:", err);
    res.json({ success: false, message: "Failed to mark activity" });
  }
});

// GET MONTH ACTIVITY
app.get("/activity/:userId/:year/:month", async (req, res) => {
  const { userId, year, month } = req.params;

  try {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const { data: activities, error } = await supabase
      .from('user_activity')
      .select('activity_date')
      .eq('user_id', userId)
      .gte('activity_date', startDate)
      .lte('activity_date', endDate)
      .order('activity_date', { ascending: true });

    if (error) throw error;

    res.json(activities || []);
  } catch (err) {
    console.error("Get Activity Error:", err);
    res.json([]);
  }
});

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/frontpage.html"));
});

/* ================= ERROR HANDLING ================= */
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Supabase Connection: Active`);
  console.log(`📧 Email Service: ${process.env.EMAIL_USER ? 'Connected' : 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});