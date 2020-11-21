const fs = require("fs");
const $path = require("path");
const { Component, Panel, Tool } = require("./components.js");

class Plugin extends Component {
    #id;
    #info;
    panels = [];
    tools = [];

    constructor(info, script, id, root) {
        super(info, script);
        this.#id = id;
        this.#info = info;

        info.panels?.forEach((info) => {
            this.panels.push(new Panel(info, script.handlers, root));
        });

        info.tools?.forEach((info) => {
            this.tools.push(new Tool(info, script.handlers, root));
        });
    }

    get id() {
        return this.#id;
    }

    get description() {
        return this.#info.description || "";
    }
}

async function _import(path) {
    const root = $path.resolve(path);

    try {
        const packageInfo = JSON.parse(
            await fs.promises.readFile($path.join(root, "package.json"))
        );
        const pluginInfo = JSON.parse(await fs.promises.readFile($path.join(root, "plugin.json")));
        const script = require($path.join(root, packageInfo.main));

        return new Plugin(pluginInfo, script, packageInfo.name, root);
    } catch (err) {
        throw new Error(`Loading plugin in '${root}': ${err.stack || err.message}`);
    }
}

module.exports = {
    import: _import,
};
