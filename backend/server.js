const express = require("express");
const { Client } = require("pg");
// const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

/* ================= MIDDLEWARE ================= */
// app.use(cors({
//   origin: [
//     "http://localhost:3000",
//     "http://127.0.0.1:5500",
//     "https://student-learning-tracker-beta.vercel.app",
//     "https://student-learning-tracker-git-main-ashmita-s-as-projects.vercel.app",
//     "https://student-learning-tracker-ncut66u2m-ashmita-s-as-projects.vercel.app"
//   ],
//   credentials: true
// }));

// Manual CORS handling
app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "https://student-learning-tracker-beta.vercel.app",
    "https://student-learning-tracker-git-main-ashmita-s-as-projects.vercel.app",
    "https://student-learning-tracker-ncut66u2m-ashmita-s-as-projects.vercel.app"
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

/* ================= DATABASE ================= */
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect()
  .then(() => console.log("✅ Connected to Supabase"))
  .catch(err => console.log("❌ DB Error:", err));

/* ================= MAIL ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ================= TEST ROUTE ================= */
app.get("/test", (req, res) => {
  res.send("Backend working");
});

/* ================= AUTH ================= */

// REGISTER
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ success: false, message: "All fields required" });
  }

  try {
    const result = await db.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, password]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.log("Register Error:", err);
    res.json({ success: false, message: "Email already exists" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: "Email and password required" });
  }

  try {
    const result = await db.query(
      "SELECT id, name, email, password FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "Invalid email" });
    }

    if (result.rows[0].password !== password) {
      return res.json({ success: false, message: "Wrong password" });
    }

    res.json({
      success: true,
      user: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email
      }
    });
  } catch (err) {
    console.log("Login Error:", err);
    res.json({ success: false, message: "Login failed" });
  }
});

/* ================= SKILLS ================= */

// ADD SKILL
app.post("/skills/add", async (req, res) => {
  const { user_id, name } = req.body;

  if (!user_id || !name) {
    return res.json({ success: false, message: "Missing data" });
  }

  try {
    await db.query(
      "INSERT INTO skills (user_id, name) VALUES ($1, $2)",
      [user_id, name]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Add Skill Error:", err);
    res.json({ success: false, message: "Failed to add skill" });
  }
});

// GET SKILLS + TOPICS
app.get("/skills/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const skillsResult = await db.query(
      "SELECT * FROM skills WHERE user_id=$1 ORDER BY id ASC",
      [userId]
    );

    const skills = [];

    for (const skill of skillsResult.rows) {
      const topicsResult = await db.query(
        "SELECT * FROM topics WHERE skill_id=$1 ORDER BY id ASC",
        [skill.id]
      );

      skills.push({
        ...skill,
        topics: topicsResult.rows
      });
    }

    res.json(skills);
  } catch (err) {
    console.log("Get Skills Error:", err);
    res.json([]);
  }
});

/* ================= TOPICS ================= */

// ADD TOPIC
app.post("/topics/add", async (req, res) => {
  const { skill_id, name } = req.body;

  if (!skill_id || !name) {
    return res.json({ success: false, message: "Missing data" });
  }

  try {
    await db.query(
      "INSERT INTO topics (skill_id, name, status) VALUES ($1, $2, $3)",
      [skill_id, name, "not-started"]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Add Topic Error:", err);
    res.json({ success: false });
  }
});

// UPDATE TOPIC STATUS
app.post("/topics/status", async (req, res) => {
  const { topic_id, status } = req.body;

  try {
    await db.query(
      "UPDATE topics SET status=$1 WHERE id=$2",
      [status, topic_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Update Topic Status Error:", err);
    res.json({ success: false });
  }
});

// DELETE TOPIC
app.post("/topics/delete", async (req, res) => {
  const { topic_id } = req.body;

  try {
    await db.query("DELETE FROM topics WHERE id=$1", [topic_id]);
    res.json({ success: true });
  } catch (err) {
    console.log("Delete Topic Error:", err);
    res.json({ success: false });
  }
});

/* ================= TASKS ================= */

// GET TASKS BY DATE
app.get("/tasks/:userId/:taskDate", async (req, res) => {
  const { userId, taskDate } = req.params;

  try {
    const result = await db.query(
      "SELECT * FROM tasks WHERE user_id=$1 AND task_date=$2 ORDER BY id ASC",
      [userId, taskDate]
    );

    res.json(result.rows);
  } catch (err) {
    console.log("Get Tasks Error:", err);
    res.json([]);
  }
});

// ADD TASK
app.post("/tasks/add", async (req, res) => {
  const { user_id, task_date, text } = req.body;

  if (!user_id || !task_date || !text) {
    return res.json({ success: false, message: "Missing task data" });
  }

  try {
    await db.query(
      "INSERT INTO tasks (user_id, task_date, text, done, day_ended) VALUES ($1, $2, $3, $4, $5)",
      [user_id, task_date, text, false, false]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Add Task Error:", err);
    res.json({ success: false });
  }
});

// TOGGLE TASK
app.post("/tasks/toggle", async (req, res) => {
  const { id, done } = req.body;

  try {
    await db.query(
      "UPDATE tasks SET done=$1 WHERE id=$2",
      [done, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Toggle Task Error:", err);
    res.json({ success: false });
  }
});

// END DAY
app.post("/tasks/end-day", async (req, res) => {
  const { user_id, task_date } = req.body;

  try {
    await db.query(
      "UPDATE tasks SET day_ended = true WHERE user_id = $1 AND task_date = $2",
      [user_id, task_date]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("End Day Error:", err);
    res.json({ success: false });
  }
});

/* ================= PROGRESS ================= */

app.post("/progress", async (req, res) => {
  const { userId } = req.body;

  try {
    const skillCountResult = await db.query(
      "SELECT COUNT(*) FROM skills WHERE user_id=$1",
      [userId]
    );

    const topicCountResult = await db.query(
      `SELECT COUNT(*) 
       FROM topics t
       JOIN skills s ON t.skill_id = s.id
       WHERE s.user_id = $1`,
      [userId]
    );

    const completedCountResult = await db.query(
      `SELECT COUNT(*) 
       FROM topics t
       JOIN skills s ON t.skill_id = s.id
       WHERE s.user_id = $1 AND t.status = 'finished'`,
      [userId]
    );

    const activeDaysResult = await db.query(
      "SELECT COUNT(DISTINCT task_date) FROM tasks WHERE user_id=$1",
      [userId]
    );

    const skillsProgressResult = await db.query(
      `SELECT 
          s.name AS skill_name,
          COUNT(t.id) AS total,
          COUNT(CASE WHEN t.status = 'finished' THEN 1 END) AS completed
       FROM skills s
       LEFT JOIN topics t ON s.id = t.skill_id
       WHERE s.user_id = $1
       GROUP BY s.id, s.name
       ORDER BY s.id ASC`,
      [userId]
    );

    res.json({
      skillCount: Number(skillCountResult.rows[0].count),
      topicCount: Number(topicCountResult.rows[0].count),
      completedCount: Number(completedCountResult.rows[0].count),
      activeDays: Number(activeDaysResult.rows[0].count),
      skills: skillsProgressResult.rows.map(skill => ({
        skill_name: skill.skill_name,
        total: Number(skill.total),
        completed: Number(skill.completed)
      }))
    });
  } catch (err) {
    console.log("Progress Error:", err);
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

  try {
    const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "Email not registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await db.query(
      "UPDATE users SET otp=$1, otp_expiry=NOW() + interval '5 minutes' WHERE email=$2",
      [otp, email]
    );

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OTP Code",
      text: `Your OTP is ${otp}`
    });

    res.json({ success: true });
  } catch (err) {
    console.log("Send OTP Error:", err);
    res.json({ success: false, message: "Failed to send OTP" });
  }
});

// VERIFY OTP
app.post("/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const result = await db.query(
      "SELECT * FROM users WHERE email=$1 AND otp=$2 AND otp_expiry > NOW()",
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    await db.query(
      "UPDATE users SET otp=NULL, otp_expiry=NULL WHERE email=$1",
      [email]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Verify OTP Error:", err);
    res.json({ success: false, message: "OTP verification failed" });
  }
});

// RESET PASSWORD
app.post("/auth/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    await db.query(
      "UPDATE users SET password=$1 WHERE email=$2",
      [newPassword, email]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Reset Password Error:", err);
    res.json({ success: false });
  }
});

/* ================= PROFILE / SETTINGS ================= */

// UPDATE PROFILE
app.post("/update-profile", async (req, res) => {
  const { user_id, name, phone, profile_image } = req.body;

  if (!user_id || !name) {
    return res.json({ success: false, message: "Missing data" });
  }

  try {
    await db.query(
      "UPDATE users SET name=$1, phone=$2, profile_img=COALESCE($3, profile_img) WHERE id=$4",
      [name, phone || null, profile_image || null, user_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Update Profile Error:", err);
    res.json({ success: false, message: "Failed to update profile" });
  }
});

// GET USER
app.get("/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      "SELECT id, name, email, phone, profile_img FROM users WHERE id=$1",
      [id]
    );

    res.json(result.rows[0] || {});
  } catch (err) {
    console.log("Get User Error:", err);
    res.json({});
  }
});

/* ================= ACTIVITY / STREAK ================= */

// MARK ACTIVITY
app.post("/mark-activity", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.json({ success: false, message: "User ID required" });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    await db.query(
      "INSERT INTO user_activity (user_id, activity_date) VALUES ($1, $2) ON CONFLICT (user_id, activity_date) DO NOTHING",
      [user_id, today]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Mark Activity Error:", err);
    res.json({ success: false });
  }
});

// GET MONTH ACTIVITY
app.get("/activity/:userId/:year/:month", async (req, res) => {
  const { userId, year, month } = req.params;

  try {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const result = await db.query(
      "SELECT activity_date FROM user_activity WHERE user_id=$1 AND activity_date BETWEEN $2 AND $3",
      [userId, startDate, endDate]
    );

    res.json(result.rows);
  } catch (err) {
    console.log("Get Activity Error:", err);
    res.json([]);
  }
});

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/frontpage.html"));
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});