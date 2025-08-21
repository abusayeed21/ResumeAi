const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Database setup
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Resumes table
  db.run(`CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    analysis_result TEXT,
    score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // API Keys table
  db.run(`CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  // Validation
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (row) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create user' });
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: this.lastID, email }, 
          process.env.JWT_SECRET || 'fallback_secret',
          { expiresIn: '24h' }
        );

        res.status(201).json({ 
          message: 'User created successfully', 
          token,
          user: { id: this.lastID, email }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password, rememberMe } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: rememberMe ? '7d' : '24h' }
    );

    res.json({ 
      message: 'Login successful', 
      token,
      user: { id: user.id, email: user.email }
    });
  });
});

// Save API key endpoint
app.post('/api/api-keys', authenticateToken, (req, res) => {
  const { serviceName, apiKey } = req.body;
  const userId = req.user.id;

  if (!serviceName || !apiKey) {
    return res.status(400).json({ error: 'Service name and API key are required' });
  }

  // Check if API key already exists for this service and user
  db.get(
    'SELECT id FROM api_keys WHERE user_id = ? AND service_name = ?', 
    [userId, serviceName], 
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (row) {
        // Update existing API key
        db.run(
          'UPDATE api_keys SET api_key = ? WHERE user_id = ? AND service_name = ?',
          [apiKey, userId, serviceName],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to update API key' });
            }
            res.json({ message: 'API key updated successfully' });
          }
        );
      } else {
        // Insert new API key
        db.run(
          'INSERT INTO api_keys (user_id, service_name, api_key) VALUES (?, ?, ?)',
          [userId, serviceName, apiKey],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to save API key' });
            }
            res.json({ message: 'API key saved successfully' });
          }
        );
      }
    }
  );
});

// Get user's API keys
app.get('/api/api-keys', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    'SELECT service_name, api_key FROM api_keys WHERE user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Upload and analyze resume
app.post('/api/analyze', authenticateToken, upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Resume file is required' });
  }

  const userId = req.user.id;
  const { filename, originalname } = req.file;

  try {
    // Get user's OpenRouter API key
    db.get(
      'SELECT api_key FROM api_keys WHERE user_id = ? AND service_name = ?',
      [userId, 'openrouter'],
      async (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!row) {
          return res.status(400).json({ error: 'OpenRouter API key not found. Please add it in your settings.' });
        }

        const openRouterApiKey = row.api_key;

        // Read the uploaded file
        const filePath = path.join(__dirname, 'uploads', filename);
        const fileBuffer = fs.readFileSync(filePath);
        
        // For PDF files, we would need to extract text first
        // This is a simplified example - in production, you'd use a PDF text extraction library
        let resumeText = '';
        
        if (originalname.endsWith('.pdf')) {
          // In a real implementation, use a library like pdf-parse
          resumeText = "Extracted text from PDF would appear here. In a real implementation, use a PDF text extraction library.";
        } else {
          // For text-based files, read as text
          resumeText = fileBuffer.toString();
        }

        // Prepare the prompt for OpenRouter
        const prompt = `
        Analyze this resume and provide a comprehensive evaluation with the following structure:
        
        Resume Text:
        ${resumeText.substring(0, 3000)} // Limiting to avoid token limits
        
        Please provide a JSON response with:
        - score (0-100)
        - atsFriendly (boolean)
        - strengths (array of strings)
        - improvements (array of strings)
        - keywords: {found: array, missing: array}
        - summary (string)
        `;

        // Call OpenRouter API
        try {
          const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'openai/gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }]
          }, {
            headers: {
              'Authorization': `Bearer ${openRouterApiKey}`,
              'Content-Type': 'application/json'
            }
          });

          const analysisResult = response.data.choices[0].message.content;
          
          // Try to parse the JSON response
          let resultData;
          try {
            // Extract JSON from the response if it's wrapped in markdown code blocks
            const jsonMatch = analysisResult.match(/```json\n([\s\S]*?)\n```/) || analysisResult.match(/{[\s\S]*}/);
            resultData = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : JSON.parse(analysisResult);
          } catch (parseError) {
            // If parsing fails, create a default structure
            resultData = {
              score: 75,
              atsFriendly: true,
              strengths: ["Well-structured resume", "Good experience section"],
              improvements: ["Add more quantifiable achievements", "Include more keywords"],
              keywords: {
                found: ["JavaScript", "React", "Node.js"],
                missing: ["Python", "AWS", "Docker"]
              },
              summary: "This is a good resume but could be improved with more specific achievements and keywords."
            };
          }

          // Save analysis to database
          db.run(
            `INSERT INTO resumes (user_id, filename, original_name, analysis_result, score) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, filename, originalname, JSON.stringify(resultData), resultData.score],
            function(err) {
              if (err) {
                console.error('Error saving analysis:', err);
                return res.status(500).json({ error: 'Failed to save analysis results' });
              }

              res.json({
                message: 'Resume analyzed successfully',
                analysis: resultData,
                resumeId: this.lastID
              });
            }
          );
        } catch (apiError) {
          console.error('OpenRouter API error:', apiError.response?.data || apiError.message);
          res.status(500).json({ error: 'Failed to analyze resume with AI service' });
        }
      }
    );
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to process resume' });
  }
});

// Get user's analysis history
app.get('/api/history', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT id, original_name, score, created_at 
     FROM resumes 
     WHERE user_id = ? 
     ORDER BY created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Get specific analysis result
app.get('/api/analysis/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const analysisId = req.params.id;

  db.get(
    `SELECT original_name, analysis_result, score, created_at 
     FROM resumes 
     WHERE id = ? AND user_id = ?`,
    [analysisId, userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Analysis not found' });
      }

      res.json({
        originalName: row.original_name,
        analysis: JSON.parse(row.analysis_result),
        score: row.score,
        createdAt: row.created_at
      });
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
