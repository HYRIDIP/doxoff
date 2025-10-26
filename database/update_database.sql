-- Add avatar_url column if it doesn't exist
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);

-- Add banner_url column if it doesn't exist  
ALTER TABLE users ADD COLUMN banner_url VARCHAR(500);

-- Update existing users with default avatar and banner URLs (optional)
UPDATE users SET avatar_url = '/Media/default_profile.jpg' WHERE avatar_url IS NULL;
UPDATE users SET banner_url = '/Media/default_banner.jpg' WHERE banner_url IS NULL;

-- Verify the changes
PRAGMA table_info(users);
