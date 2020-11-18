const electron = require("electron");
const fs = require("fs");
const Viewport2D = require("./viewport-2d.js");
const Viewport3D = require("./viewport-3d.js");
const { import: importPlugin } = require("./plugins/import.js");

class VueApp {
    #options = {
        el: "#vue-wrapper",
        data: {
            panels: {
                editor: new Viewport2D(),
                preview: new Viewport3D(),
                plugins: { enabled: true },
                layers: { enabled: true },
            },
            plugins: [],
        },
        computed: {
            layers() {
                return this.range(this.panels.editor.layerCount || 0, 0);
            },
        },
        methods: {
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
        },
        created() {
            (async () => {
                let pluginNames = (await fs.promises.readdir("./plugins", { withFileTypes: true }))
                    .filter((dirent) => dirent.isDirectory())
                    .map((dirent) => dirent.name);

                for (let name of pluginNames) {
                    try {
                        this.plugins.push(await importPlugin(`./plugins/${name}`));
                    } catch (err) {
                        console.error(err);
                    }
                }
            })();
        },
    };

    constructor(Vue, client) {
        let instance = new Vue(this.#options);
        instance.panels.editor.init(client);
        instance.panels.preview.init(client);

        return instance;
    }
}

module.exports = VueApp;
