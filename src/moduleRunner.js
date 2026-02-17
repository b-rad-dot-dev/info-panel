const path = require("path");

const modulePath = process.argv[2];

async function start() {
    const mod = require(path.resolve(modulePath));

    process.on("message", async (msg) => {
        const { id, routePath, method, payload } = msg;

        try {
            const route = mod.routes.find(
                r => r.path === routePath && r.method === method
            );

            if (!route) {
                throw new Error("Route not found");
            }

            const result = await route.handler(payload);

            process.send({ id, result });
        } catch (err) {
            process.send({ id, error: err.message });
        }
    });
}

start();