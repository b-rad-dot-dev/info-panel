const moduleManager = require('../moduleLoader');

const init = function(app) {
    app.all('/modules/:moduleName/*', async (req, res) => {
        const { moduleName } = req.params;
        // Everything after /:moduleName/
        const subPath = '/' + req.params[0];

        const payload = {
            query: req.query,
            body: req.body,
        };

        const { status, body } = await moduleManager.dispatch(
            moduleName,
            req.method,
            subPath,
            payload
        );

        res.status(status).json(body);
    });
}

exports.init = init;