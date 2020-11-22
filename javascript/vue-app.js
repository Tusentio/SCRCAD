const electron = require("electron");
const fs = require("fs");
const Vue = require("vue/dist/vue.common.dev");
const Viewport2D = require("./viewport-2d.js");
const Viewport3D = require("./viewport-3d.js");
const plugin = require("./plugins/import.js");

class VueOptions {
    el = "#vue-wrapper";
    data = {
        panels: {
            editor: new Viewport2D(),
            preview: new Viewport3D(),
            properties: { enabled: true },
            layers: { enabled: true },
        },
        plugins: [],
        propertyCategories: [],
        menuCategories: [],
    };
    computed = {
        layers() {
            return this.range(this.panels.editor.layerCount || 0, 0);
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
        togglePnlProperties() {
            this.panels.properties.enabled = !this.panels.properties.enabled;
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
    };

    constructor(client) {
        this.created = async () => {
            let loadResult = await plugin.loadPlugins("./plugins");
            Object.assign(this.data, loadResult);
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
