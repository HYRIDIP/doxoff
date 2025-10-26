const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./database/pastebin.db');

console.log('Starting database update...');

// Read and execute SQL file
const sql = `
-- Add avatar_url column if it doesn't exist
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);

-- Add banner_url column if it doesn't exist  
ALTER TABLE users ADD COLUMN banner_url VARCHAR(500);

-- Update existing users with default avatar and banner URLs (optional)
UPDATE users SET avatar_url = '/Media/default_profile.jpg' WHERE avatar_url IS NULL;
UPDATE users SET banner_url = '/Media/default_banner.jpg' WHERE banner_url IS NULL;
`;

// Execute each statement separately
const statements = sql.split(';').filter(stmt => stmt.trim());

let completed = 0;
const total = statements.length;

statements.forEach((statement, index) => {
    if (statement.trim()) {
        db.run(statement.trim(), function(err) {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log(`Column already exists: ${statement.split(' ')[4]}`);
                } else {
                    console.error(`Error executing statement ${index + 1}:`, err);
                }
            } else {
                console.log(`Successfully executed statement ${index + 1}`);
            }
            
            completed++;
            
            if (completed === total) {
                // Verify the changes
                db.all("PRAGMA table_info(users)", (err, columns) => {
                    if (err) {
                        console.error('Error verifying table structure:', err);
                    } else {
                        console.log('\nCurrent users table structure:');
                        columns.forEach(col => {
                            console.log(`- ${col.name} (${col.type})`);
                        });
                    }
                    
                    db.close((err) => {
                        if (err) {
                            console.error('Error closing database:', err);
                        } else {
                            console.log('\nDatabase update completed!');
                        }
                    });
                });
            }
        });
    }
});
