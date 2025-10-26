const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.dirname('./database/pastebin.db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database('./database/pastebin.db');

db.serialize(() => {
    // Create users table with avatar and banner fields
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        avatar_url VARCHAR(500),
        banner_url VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            console.log('Users table created or already exists');
            
            // Check if we need to add the new columns
            db.all("PRAGMA table_info(users)", (err, columns) => {
                if (err) {
                    console.error('Error checking table structure:', err);
                    return;
                }
                
                const columnNames = columns.map(col => col.name);
                
                // Add avatar_url column if it doesn't exist
                if (!columnNames.includes('avatar_url')) {
                    db.run("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)", (err) => {
                        if (err) {
                            console.error('Error adding avatar_url column:', err);
                        } else {
                            console.log('Added avatar_url column to users table');
                        }
                    });
                }
                
                // Add banner_url column if it doesn't exist
                if (!columnNames.includes('banner_url')) {
                    db.run("ALTER TABLE users ADD COLUMN banner_url VARCHAR(500)", (err) => {
                        if (err) {
                            console.error('Error adding banner_url column:', err);
                        } else {
                            console.log('Added banner_url column to users table');
                        }
                    });
                }
            });
        }
    });

    // Create pastes table
    db.run(`CREATE TABLE IF NOT EXISTS pastes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255),
        content TEXT,
        author_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(author_id) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating pastes table:', err);
        } else {
            console.log('Pastes table created or already exists');
        }
    });

    // Create admin user if it doesn't exist
    const adminUsername = 'admin';
    const adminEmail = 'admin@doxify.com';
    const adminPassword = 'admin123';
    
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [adminUsername, adminEmail], (err, row) => {
        if (err) {
            console.error('Error checking for admin user:', err);
            return;
        }
        
        if (!row) {
            bcrypt.hash(adminPassword, 10, (err, hash) => {
                if (err) {
                    console.error('Error hashing admin password:', err);
                    return;
                }
                
                db.run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', 
                    [adminUsername, adminEmail, hash, 'admin'], 
                    function(err) {
                        if (err) {
                            console.error('Error creating admin user:', err);
                        } else {
                            console.log('Admin user created successfully');
                            console.log('Username: admin');
                            console.log('Password: admin123');
                            console.log('Email: admin@doxify.com');
                        }
                    });
            });
        } else {
            console.log('Admin user already exists');
        }
    });

    // Create sample user for testing
    const sampleUsername = 'testuser';
    const sampleEmail = 'test@doxify.com';
    const samplePassword = 'test123';
    
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [sampleUsername, sampleEmail], (err, row) => {
        if (err) {
            console.error('Error checking for sample user:', err);
            return;
        }
        
        if (!row) {
            bcrypt.hash(samplePassword, 10, (err, hash) => {
                if (err) {
                    console.error('Error hashing sample user password:', err);
                    return;
                }
                
                db.run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', 
                    [sampleUsername, sampleEmail, hash, 'user'], 
                    function(err) {
                        if (err) {
                            console.error('Error creating sample user:', err);
                        } else {
                            console.log('Sample user created successfully');
                            console.log('Username: testuser');
                            console.log('Password: test123');
                            console.log('Email: test@doxify.com');
                        }
                    });
            });
        } else {
            console.log('Sample user already exists');
        }
    });

    // Create some sample pastes
    db.get('SELECT COUNT(*) as count FROM pastes', (err, row) => {
        if (err) {
            console.error('Error checking pastes count:', err);
            return;
        }
        
        if (row.count === 0) {
            // Get the admin user ID to associate with pastes
            db.get('SELECT id FROM users WHERE username = ?', [adminUsername], (err, adminRow) => {
                if (err || !adminRow) {
                    console.error('Error getting admin user ID for sample pastes:', err);
                    return;
                }
                
                const adminId = adminRow.id;
                const samplePastes = [
                    {
                        title: 'Welcome to Doxify',
                        content: 'This is a sample paste to demonstrate the functionality of Doxify pastebin service.',
                        author_id: adminId
                    },
                    {
                        title: 'How to Use This Platform',
                        content: '1. Create an account\n2. Make your first paste\n3. Share with others\n4. Manage your pastes in dashboard',
                        author_id: adminId
                    },
                    {
                        title: 'Sample Code - Hello World',
                        content: '```javascript\nconsole.log("Hello, World!");\n```',
                        author_id: adminId
                    }
                ];
                
                const insertPaste = db.prepare('INSERT INTO pastes (title, content, author_id) VALUES (?, ?, ?)');
                
                samplePastes.forEach(paste => {
                    insertPaste.run([paste.title, paste.content, paste.author_id], (err) => {
                        if (err) {
                            console.error('Error inserting sample paste:', err);
                        }
                    });
                });
                
                insertPaste.finalize();
                console.log('Sample pastes created successfully');
            });
        } else {
            console.log('Sample pastes already exist');
        }
    });
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err);
    } else {
        console.log('Database initialization completed successfully');
    }
});
