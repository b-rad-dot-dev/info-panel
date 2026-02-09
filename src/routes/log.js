const COLORS = {
    error: "\x1b[31m", //RED
    // success: "\x1b[32m", //GREEN
    warn: "\x1b[33m", //YELLOW
    debug: "\x1b[35m", //MAGENTA
    info: "\x1b[36m", //CYAN
    RESET: "\x1b[0m" //RESET
}

const init = function(app) {

    app.post('/api/log', (req, res) => {
        const missing = [];
        const additional = [];
        const level = req.body.logLevel;
        const module = req.body.module;
        const msg = req.body.message;

        if(!level) missing.push("logLevel");
        if(!module) missing.push("module");
        if(!msg) missing.push("message");

        const validLoggingLevels = ['info', 'warn', 'error', 'debug'];

        if(level && !validLoggingLevels.includes(level)) additional.push(`Invalid logging level '${level}'. Must be one of: ${validLoggingLevels.join(', ')}`);

        const errorResponses = [];

        if(missing.length > 0) {
            errorResponses.push(`The following required fields were missing from the request: ${missing.join(", ")}`);
        }
        if(additional.length > 0) {
            errorResponses.push(...additional);
        }

        if(errorResponses.length > 0) {
            return res.status(500).json({
                error: "Invalid log request",
                message: `The following error(s) were encountered for the log request:\n${errorResponses.join("\n")}`
            });
        }

        console[level](`${COLORS[level]}[${level.toUpperCase().padStart(5)}]${COLORS.RESET} <${module}> - ${msg}`);
        return res.status(200).json({
            success: true
        });
    });
}

exports.init = init;