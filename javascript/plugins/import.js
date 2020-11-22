const { EventEmitter } = require("events");
const fs = require("fs");
const $path = require("path");
const { Component, Input, Panel, Tool } = require("./components.js");

function parseVersion(str = "") {
    return str
        .split(".")
        .map(BigInt)
        .reverse()
        .reduce((a, b) => (a << 128n) | (b & ((1n << 128n) - 1n)), 0n);
}

class Plugin extends Component {
    #id;
    #version;
    #versionHash;
    #info;
    #exports;
    _panels = [];
    _tools = [];
    _menu = [];

    $imports = {};

    constructor(info, pkg, script, root) {
        super(info, script.handlers);
        this.#id = pkg.name;
        this.#version = pkg.version;
        this.#versionHash = parseVersion(pkg.version);
        this.#info = info;
        this.#exports = script.exports || {};

        info.panels?.forEach((info) => {
            this.panels.push(new Panel(info, script.handlers, root));
        });

        info.tools?.forEach((info) => {
            this.tools.push(new Tool(info, script.handlers, root));
        });

        info.menu?.forEach((info) => {
            this.menu.push(Input.create(info, script.handlers));
        });
    }

    get dependencies() {
        let deps =
            this.#info.dependencies?.map((dependency) => ({
                as: dependency.name,
                versionHash: parseVersion(dependency.version),
                ...dependency,
            })) || [];

        return deps;
    }

    get id() {
        return this.#id;
    }

    get version() {
        return this.#version;
    }

    get versionHash() {
        return this.#versionHash;
    }

    get exports() {
        return this.#exports;
    }

    get panels() {
        return this._panels;
    }

    get tools() {
        return this._tools;
    }

    get menu() {
        return this._menu;
    }
}

async function loadPlugin(path) {
    const root = $path.resolve(path);

    try {
        const packageInfo = JSON.parse(
            await fs.promises.readFile($path.join(root, "package.json"), { flag: "r" })
        );
        const pluginInfo = JSON.parse(
            await fs.promises.readFile($path.join(root, "plugin.json"), { flag: "r" })
        );
        const script = require($path.join(root, packageInfo.main));

        return new Plugin(pluginInfo, packageInfo, script, root);
    } catch (err) {
        throw new Error(`Loading plugin in '${root}': ${err.stack || err.message}`);
    }
}

async function loadPlugins(path) {
    let pluginNames = (await fs.promises.readdir(path, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    let plugins = [];
    for (let name of pluginNames) {
        try {
            plugins.push(await loadPlugin($path.join(path, name)));
        } catch (err) {
            console.error(err);
        }
    }

    let propertyCategories = [];
    let propertyCategoryIndex = new Map();

    let menuCategories = [];
    let menuCategoryIndex = new Map();

    for (const plugin of plugins) {
        for (const dep of plugin.dependencies) {
            let dependee = plugins.find((other) => {
                let idsMatch = other.id === dep.id;
                let versionsMatch = other.versionHash % dep.versionHash === 0n;
                return idsMatch && versionsMatch;
            });

            if (dependee == null)
                throw new Error(
                    `Could not find plugin '${dep.id}@${dep.version}' required by '${plugin.id}@${plugin.version}' (${plugin.name})`
                );
            plugin.$imports[dep.as] = dependee.exports;
        }
        plugin.emit("load");

        for (const panel of plugin.panels) {
            const category = panel.category;
            if (!propertyCategoryIndex.has(category)) {
                let propertyCategory = {
                    name: category,
                    expanded: false,
                    panels: [],
                };

                propertyCategoryIndex.set(category, propertyCategory);
                propertyCategories.push(propertyCategory);
            }

            propertyCategoryIndex.get(category).panels.push(panel);
        }

        for (const control of plugin.menu) {
            const category = control.category;
            if (!menuCategoryIndex.has(category)) {
                let menuCategory = {
                    name: category,
                    expanded: false,
                    controls: [],
                };

                menuCategoryIndex.set(category, menuCategory);
                menuCategories.push(menuCategory);
            }

            menuCategoryIndex.get(category).controls.push(control);
        }
    }

    propertyCategories = propertyCategories.sort((a, b) => a.localeCompare(b));
    menuCategories = menuCategories.sort((a, b) => a.localeCompare(b));

    return {
        plugins,
        propertyCategories,
        menuCategories,
    };
}

module.exports = {
    loadPlugin,
    loadPlugins,
};
