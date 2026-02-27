const { fork } = require("child_process");
const path = require("path");
const fs = require("fs");
const crypto = require('crypto');

const RUNNER_PATH = path.join(__dirname, 'moduleRunner.js');

class ModuleProcess {
    constructor(moduleName, moduleBackendPath) {
        this.moduleName = moduleName;
        this.moduleBackendPath = moduleBackendPath;
        this.pending = new Map(); // requestId -> { resolve, reject, timer }
        this.ready = false;
        this.process = null;
    }

    start() {
        return new Promise((resolve, reject) => {
            this.process = fork(RUNNER_PATH, [], {
                env: {
                    ...process.env,
                    MODULE_PATH: this.moduleBackendPath,
                    MODULE_NAME: this.moduleName,
                    NODE_OPTIONS: '--max-old-space-size=128',
                },
            });

            const timeout = setTimeout(() => {
                this.process.kill();
                reject(new Error(`Module "${this.moduleName}" timed out on startup`));
            }, 5000);

            this.process.on('message', (msg) => {
                if (msg.type === 'ready') {
                    clearTimeout(timeout);
                    this.ready = true;
                    resolve();
                } else if (msg.type === 'init_error') {
                    clearTimeout(timeout);
                    reject(new Error(msg.error));
                } else if (msg.type === 'response') {
                    this._handleResponse(msg);
                }
            });

            this.process.on('exit', (code) => {
                console.warn(`[moduleManager] Module "${this.moduleName}" exited (code ${code}), restarting...`);
                this.ready = false;
                // Reject any in-flight requests
                for (const [id, { reject: rej, timer }] of this.pending) {
                    clearTimeout(timer);
                    rej(new Error('Module process restarted unexpectedly'));
                    this.pending.delete(id);
                }
                setTimeout(() => this.start().catch(console.error), 1000);
            });

            this.process.on('error', reject);
        });
    }

    // TODO: Somehow get the timeoutMs from the module itself (which requires...requiring it)
    dispatch(method, modulePath, payload, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const requestId = crypto.randomUUID();

            const timer = setTimeout(() => {
                this.pending.delete(requestId);
                // Rejection caught in routes/modules.js
                reject(new Error(`Module "${this.moduleName}" timed out handling ${method} ${modulePath}`));
            }, timeoutMs);

            this.pending.set(requestId, { resolve, reject, timer });

            this.process.send({
                type: 'request',
                requestId,
                method,
                path: modulePath,
                payload,
            });
        });
    }

    _handleResponse({ requestId, status, body }) {
        const pending = this.pending.get(requestId);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        pending.resolve({ status, body });
    }
}

class ModuleManager {
    constructor() {
        this.modules = new Map();
    }

    async loadAll(modulesDir) {
        const entries = fs.readdirSync(modulesDir, { withFileTypes: true });
        await Promise.all(
            entries
                .filter(e => e.isDirectory())
                .map(e => {
                    const backendPath = path.join(modulesDir, e.name, 'backend.js');
                    if (!fs.existsSync(backendPath)) return Promise.resolve();
                    const mod = new ModuleProcess(e.name, backendPath);
                    this.modules.set(e.name, mod);
                    return mod.start().catch(err => {
                        console.error(`[moduleManager] Failed to load "${e.name}":`, err.message);
                        this.modules.delete(e.name);
                    });
                })
        );
    }

    async dispatch(moduleName, method, modulePath, payload) {
        const mod = this.modules.get(moduleName);
        if (!mod || !mod.ready) return { status: 404, body: { error: `Module "${moduleName}" not found` } };
        return mod.dispatch(method, modulePath, payload);
    }
}

module.exports = new ModuleManager();

// ===================================================
//
// const modules = {};
//
// function loadModule(name) {
//     const modulePath = path.join(__dirname, "modules", name, "backend.js");
//
//     const child = fork("./moduleRunner.js", [modulePath], {
//         execArgv: ["--max-old-space-size=128"] // memory limit
//     });
//
//     modules[name] = {
//         process: child,
//         pending: new Map()
//     };
//
//     child.on("message", (msg) => {
//         const { id, result, error } = msg;
//         const pending = modules[name].pending.get(id);
//
//         if (!pending) return;
//
//         modules[name].pending.delete(id);
//
//         if (error) pending.reject(error);
//         else pending.resolve(result);
//     });
// }
//
// function loadModules() {
//     const moduleDirectory = path.join(__dirname, 'modules');
//     const moduleDirectoryContents = fs.readdirSync(moduleDirectory);
//     moduleDirectoryContents.forEach(moduleName => {
//         const backendFilePath = path.join(moduleDirectory, moduleName, "backend.js");
//         try {
//             fs.accessSync(backendFilePath, fs.constants.F_OK);
//             loadModule(moduleName);
//         } catch (e) {
//             // file does not exist, move on
//         }
//     });
//     return modules;
// }
//
// exports.loadModules = loadModules;