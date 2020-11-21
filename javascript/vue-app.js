const electron = require("electron");
const fs = require("fs");
const Vue = require("vue/dist/vue.common.dev");
const Viewport2D = require("./viewport-2d.js");
const Viewport3D = require("./viewport-3d.js");
const { import: importPlugin } = require("./plugins/import.js");

class VueOptions {
    el = "#vue-wrapper";
    data = {
        panels: {
            editor: new Viewport2D(),
            preview: new Viewport3D(),
            plugins: { enabled: true },
            layers: { enabled: true },
        },
        plugins: [],
        expandedCategories: [],
    };
    computed = {
        layers() {
            return this.range(this.panels.editor.layerCount || 0, 0);
        },
        categories() {
            const categories = new Set();
            for (const plugin of this.plugins) {
                for (const panel of plugin.panels) {
                    categories.add(panel.category);
                }
            }

            return [...categories.values()].sort();
        },
    };
    methods = {
        close() {
            electron.remote.BrowserWindow.getFocusedWindow().close();
        },
        minimize() {
            electron.remote.BrowserWindow.getFocusedWindow().minimize();
        },
        toggleMaximized() {
            let browserWindow = electron.remote.BrowserWindow.getFocusedWindow();
            if (browserWindow.isMaximized()) {
                browserWindow.unmaximize();
            } else {
                browserWindow.maximize();
            }
        },
        togglePnlEditor() {
            this.panels.editor.enabled = !this.panels.editor.enabled;
            this.dispatchResize();
        },
        togglePnlPreview() {
            this.panels.preview.enabled = !this.panels.preview.enabled;
            this.dispatchResize();
        },
        togglePnlPlugins() {
            this.panels.plugins.enabled = !this.panels.plugins.enabled;
            this.dispatchResize();
        },
        togglePnlLayers() {
            this.panels.layers.enabled = !this.panels.layers.enabled;
            this.dispatchResize();
        },
        toggleCategory(category) {
            if (this.expandedCategories.includes(category)) {
                this.expandedCategories.splice(
                    this.expandedCategories.findIndex((c) => c === category)
                );
            } else {
                this.expandedCategories.push(category);
            }
        },
        invalidateViewports() {
            this.viewport3D.invalidate();
            this.viewport2D.invalidate();
        },
        dispatchResize() {
            requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
        },
        range(a, b) {
            let count = Math.abs(a - b);
            let sign = Math.sign(b - a);
            let offset = Math.min(sign, 0);
            return new Array(count).fill().map((_, i) => a + i * sign + offset);
        },
    };

    constructor(client) {
        this.created = () => {
            (async () => {
                let pluginNames = (await fs.promises.readdir("./plugins", { withFileTypes: true }))
                    .filter((dirent) => dirent.isDirectory())
                    .map((dirent) => dirent.name);

                for (let name of pluginNames) {
                    try {
                        this.data.plugins.push(await importPlugin(`./plugins/${name}`));
                    } catch (err) {
                        console.error(err);
                    }
                }
            })();
        };

        this.mounted = () => {
            this.data.panels.editor.init(client);
            this.data.panels.preview.init(client);
        };
    }
}

class VueApp extends Vue {
    constructor(client) {
        super(new VueOptions(client));
    }
}

module.exports = VueApp;
