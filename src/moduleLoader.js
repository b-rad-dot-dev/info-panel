const { fork } = require("child_process");
const path = require("path");
const fs = require("fs");

const modules = {};

function loadModule(name) {
    const modulePath = path.join(__dirname, "modules", name, "backend.js");

    const child = fork("./moduleRunner.js", [modulePath], {
        execArgv: ["--max-old-space-size=128"] // memory limit
    });

    modules[name] = {
        process: child,
        pending: new Map()
    };

    child.on("message", (msg) => {
        const { id, result, error } = msg;
        const pending = modules[name].pending.get(id);

        if (!pending) return;

        modules[name].pending.delete(id);

        if (error) pending.reject(error);
        else pending.resolve(result);
    });
}

function loadModules() {
    const moduleDirectory = path.join(__dirname, 'modules');
    const moduleDirectoryContents = fs.readdirSync(moduleDirectory);
    moduleDirectoryContents.forEach(moduleName => {
        const backendFilePath = path.join(moduleDirectory, moduleName, "backend.js");
        try {
            fs.accessSync(backendFilePath, fs.constants.F_OK);
            loadModule(moduleName);
        } catch (e) {
            // file does not exist, move on
        }
    });
    return modules;
}

exports.loadModules = loadModules;