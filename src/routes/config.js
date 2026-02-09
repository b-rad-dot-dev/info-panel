const fs = require("fs");
const path = require("path");

const CONFIG_PATH = process.env.CONFIG_PATH || path.join(__dirname, '../config.json');

const init = function(app) {
    app.get('/api/config', (req, res) => {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            res.json(config);
        } catch (error) {
            console.error('Error reading config:', error);
            res.status(500).json({ error: 'Failed to read config' });
        }
    });
}

exports.init = init;