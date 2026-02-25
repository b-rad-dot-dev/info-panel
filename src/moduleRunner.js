const path = require("path");

const moduleBackendPath = process.env.MODULE_PATH;
const moduleName = process.env.MODULE_NAME;

let handlers;
try {
    handlers = require(moduleBackendPath);
} catch (err) {
    process.send({ type: 'init_error', error: err.message });
    process.exit(1);
}

if (typeof handlers !== 'object' || handlers === null) {
    process.send({ type: 'init_error', error: 'backend.js must export a plain object' });
    process.exit(1);
}

process.send({ type: 'ready' });

process.on('message', async (msg) => {
    if (msg.type !== 'request') return;

    const { requestId, method, path, payload } = msg;
    const route = handlers.routes.find((route) => {
        return route.method === method.toUpperCase() && route.path === path
    });

    if (!route) {
        return process.send({
            type: 'response',
            requestId,
            status: 404,
            body: { error: `No handler for ${method.toUpperCase()} for ${path}` }
        });
    }

    try {
        const result = await route.handler(payload);
        process.send({
            type: 'response',
            requestId,
            status: 200,
            body: result ?? null
        });
    } catch (err) {
        process.send({
            type: 'response',
            requestId,
            status: 500,
            body: { error: err.message }
        });
    }
});