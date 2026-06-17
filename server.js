// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors()); // Allows your website to talk to this server
app.use(bodyParser.json());

// 1. Connect to XAMPP MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Default XAMPP user
    password: '',      // Default XAMPP password (leave empty)
    database: 'dastarkhwan'
});

db.connect(err => {
    if (err) { console.error('Database connection failed:', err); }
    else { console.log('✅ Connected to MySQL Database'); }
});

// 2. API Endpoint to Save User
app.post('/api/enter', (req, res) => {
    const { name, location } = req.body;
    
    const sql = "INSERT INTO app_users (name, location) VALUES (?, ?)";
    db.query(sql, [name, location], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error saving data");
        } else {
            res.status(200).send("User Welcome");
        }
    });
});

// 3. Start Server on Port 3000
app.listen(3000, () => {
    console.log('🚀 Server running on port 3000');
});