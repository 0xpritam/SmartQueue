const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

const authRoutes = require('./routes/auth.routes');

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'SmartQueue API is running'
    });
});

module.exports = app;