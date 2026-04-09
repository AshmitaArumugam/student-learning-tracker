# Backend Setup Guide - Supabase Integration

## Prerequisites
- Node.js 14+ installed
- A Supabase account and project
- Gmail account for email notifications

## Installation Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create `.env` File
Copy from `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Configure Supabase

#### Get Supabase Credentials:
1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy your Project URL and Anon Public Key
4. Update `.env`:
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-public-key
```

#### Create Database Tables:
Run this SQL in your Supabase SQL editor:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  profile_img TEXT,
  otp VARCHAR(6),
  otp_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id BIGSERIAL PRIMARY KEY,
  skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'not-started',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_date DATE NOT NULL,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  day_ended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Activity table
CREATE TABLE IF NOT EXISTS user_activity (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, activity_date)
);

-- Indexes for better performance
CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_topics_skill_id ON topics(skill_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_date ON tasks(task_date);
CREATE INDEX idx_activity_user_id ON user_activity(user_id);
```

### 4. Configure Email (Gmail)

1. Enable 2-Factor Authentication on Gmail
2. Generate App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select Mail → Windows Computer (or your device)
   - Copy the generated password
3. Update `.env`:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

### 5. Run Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /auth/send-otp` - Send OTP for password reset
- `POST /auth/verify-otp` - Verify OTP
- `POST /auth/reset-password` - Reset password

### Skills
- `POST /skills/add` - Add a skill
- `GET /skills/:userId` - Get all skills with topics

### Topics
- `POST /topics/add` - Add topic to a skill
- `POST /topics/status` - Update topic status
- `POST /topics/delete` - Delete a topic

### Tasks
- `GET /tasks/:userId/:taskDate` - Get tasks for a date
- `POST /tasks/add` - Add new task
- `POST /tasks/toggle` - Toggle task completion
- `POST /tasks/end-day` - Mark day as ended

### Progress
- `POST /progress` - Get user progress statistics

### Profile
- `POST /update-profile` - Update user profile
- `GET /user/:id` - Get user details

### Activity
- `POST /mark-activity` - Mark activity for a day
- `GET /activity/:userId/:year/:month` - Get month activity

### Test
- `GET /test` - Test if backend is working

## Troubleshooting

### Connection Error
- Check `.env` file has correct Supabase credentials
- Verify Supabase project is not paused
- Check internet connection

### Email Not Sending
- Verify Gmail credentials in `.env`
- Check if App Password is correctly generated
- Ensure 2FA is enabled on Gmail account

### Database Errors
- Check if all tables are created in Supabase
- Verify column names match the SQL schema
- Check Row Level Security (RLS) policies if issues persist

## Security Notes
- Passwords are hashed using SHA-256 (consider using bcrypt for production)
- OTP expires after 5 minutes
- Sensitive data should never be logged
- Always use HTTPS in production
- Implement rate limiting for production deployment

## Performance Optimization
- Database indexes are created for faster queries
- Implement caching for frequently accessed data
- Enable Supabase caching for better performance
