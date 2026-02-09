const routes = {
    "config": require("./config.js"),
    "log": require("./log.js")
}

module.exports = function registerRoutes(app) {
    for (const [name, route] of Object.entries(routes)) {
        console.log(`[STARTUP] Initializing route: ${name}`);
        route.init(app);
    }
};
