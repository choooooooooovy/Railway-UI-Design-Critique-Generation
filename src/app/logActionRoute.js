// Example Express route to log user actions
const express = require('express');
const router = express.Router();
const { logUserAction } = require('../utils/logUserAction');

// POST /api/log-action
router.post('/log-action', (req, res) => {
    const { userId, action, content, details } = req.body;
    logUserAction({ userId, action, content, details });
    res.status(200).json({ success: true });
});

module.exports = router;
