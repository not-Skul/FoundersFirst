CREATE TABLE startup_forms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    startup_idea TEXT NOT NULL,
    age INTEGER CHECK (age > 0),
    gender VARCHAR(20),
    category VARCHAR(50),
    location VARCHAR(100),
    funding_status VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
