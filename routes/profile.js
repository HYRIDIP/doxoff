const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const sharp = require('sharp');

const db = new sqlite3.Database('./database/pastebin.db');

// Ensure media directories exist
const ensureDirectories = () => {
    const dirs = [
        './public/Media/avatars',
        './public/Media/banners'
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

ensureDirectories();

// Download and process image
async function downloadAndProcessImage(url, width, height, outputPath) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const buffer = await response.buffer();
        
        await sharp(buffer)
            .resize(width, height, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 80 })
            .toFile(outputPath);
            
        return true;
    } catch (error) {
        console.error('Error processing image:', error);
        return false;
    }
}

// Profile route
router.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.id;
    
    db.get('SELECT username, email, role, avatar_url, banner_url FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error');
        }
        
        if (!user) {
            return res.status(404).send('User not found');
        }
        
        res.render('pages/profile', {
            title: 'Profile - ' + user.username,
            user: user,
            message: req.query.message
        });
    });
});

// Update profile image route
router.post('/profile/update-image', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.id;
    const { avatarUrl, bannerUrl } = req.body;
    
    try {
        let avatarFilename = null;
        let bannerFilename = null;
        
        // Process avatar
        if (avatarUrl && avatarUrl.trim() !== '') {
            avatarFilename = `avatar_${userId}_${Date.now()}.jpg`;
            const avatarPath = path.join(__dirname, '../public/Media/avatars', avatarFilename);
            
            const avatarSuccess = await downloadAndProcessImage(
                avatarUrl, 
                150, 150, 
                avatarPath
            );
            
            if (!avatarSuccess) {
                return res.redirect('/profile?message=Error processing avatar image');
            }
            
            avatarFilename = `/Media/avatars/${avatarFilename}`;
        }
        
        // Process banner
        if (bannerUrl && bannerUrl.trim() !== '') {
            bannerFilename = `banner_${userId}_${Date.now()}.jpg`;
            const bannerPath = path.join(__dirname, '../public/Media/banners', bannerFilename);
            
            const bannerSuccess = await downloadAndProcessImage(
                bannerUrl, 
                800, 200, 
                bannerPath
            );
            
            if (!bannerSuccess) {
                return res.redirect('/profile?message=Error processing banner image');
            }
            
            bannerFilename = `/Media/banners/${bannerFilename}`;
        }
        
        // Update database
        let query = 'UPDATE users SET ';
        const params = [];
        
        if (avatarFilename) {
            query += 'avatar_url = ?, ';
            params.push(avatarFilename);
        }
        
        if (bannerFilename) {
            query += 'banner_url = ?, ';
            params.push(bannerFilename);
        }
        
        // Remove trailing comma and space
        query = query.slice(0, -2);
        query += ' WHERE id = ?';
        params.push(userId);
        
        db.run(query, params, function(err) {
            if (err) {
                console.error(err);
                return res.redirect('/profile?message=Error updating profile');
            }
            
            // Update session if avatar was changed
            if (avatarFilename) {
                req.session.user.avatar_url = avatarFilename;
            }
            
            res.redirect('/profile?message=Profile updated successfully');
        });
        
    } catch (error) {
        console.error('Error updating profile images:', error);
        res.redirect('/profile?message=Error updating profile images');
    }
});

module.exports = router;
