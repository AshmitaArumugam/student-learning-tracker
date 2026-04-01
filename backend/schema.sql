-- Create database (if needed, but usually handled by provider)
-- CREATE DATABASE student_app;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  reset_otp VARCHAR(6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Topics table
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'not-started' CHECK (status IN ('not-started', 'unclear', 'practicing', 'finished')),
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  task_date DATE NOT NULL,
  text VARCHAR(255) NOT NULL,
  done BOOLEAN DEFAULT false,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);