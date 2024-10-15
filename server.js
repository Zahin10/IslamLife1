require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const admin = require('firebase-admin');
const cookieParser = require('cookie-parser');

// Initialize Firebase Admin
const serviceAccount = {
    "type": "service_account",
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Middleware to check if user is authenticated
const checkAuth = async (req, res, next) => {
  const sessionCookie = req.cookies.session || '';
  try {
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    req.user = decodedClaims;
    next();
  } catch (error) {
    res.redirect('/login');
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.post('/sessionLogin', async (req, res) => {
  const idToken = req.body.idToken;
  try {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
    res.cookie('session', sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true });
    res.end(JSON.stringify({ status: 'success' }));
  } catch (error) {
    res.status(401).send('Unauthorized');
  }
});

app.get('/sessionLogout', (req, res) => {
  res.clearCookie('session');
  res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
