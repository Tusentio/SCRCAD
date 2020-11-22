const fs = require("fs");
const $path = require("path");
const { Component, Input, Panel, Tool } = require("./components.js");

class Plugin extends Component {
    #id;
    #info;
    panels = [];
    tools = [];
    menu = [];

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

        info.menu?.forEach((info) => {
            this.menu.push(Input.create(info, script.handlers));
        });
    }

    get id() {
        return this.#id;
    }

    get description() {
        return this.#info.description || "";
    }
}

async function loadPlugin(path) {
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
