const electron = require("electron");

module.exports = (app) => ({
    instance: null,
    options: {
        el: "#vue-wrapper",
        data: {
            app,
            modelName: "Untitled",
            panels: {
                editor: true,
                preview: false,
                plugins: true,
                layers: true,
            },
            grid: true,
        },
        computed: {
            layers() {
                return this.range(app.viewport2D.layerCount, 0);
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
            toggleGrid() {
                this.grid = !this.grid;
                app.viewport2D.invalidate();
            },
            togglePnlEditor() {
                this.panels.editor = !this.panels.editor;
                app.dispatchResize();
            },
            togglePnlPreview() {
                this.panels.preview = !this.panels.preview;
                app.dispatchResize();
            },
            togglePnlPlugins() {
                this.panels.plugins = !this.panels.plugins;
                app.dispatchResize();
            },
            togglePnlLayers() {
                this.panels.layers = !this.panels.layers;
                app.dispatchResize();
            },
            range(a, b) {
                let count = Math.abs(a - b);
                let sign = Math.sign(b - a);
                let offset = Math.min(sign, 0);
                return new Array(count).fill().map((_, i) => a + i * sign + offset);
            },
        },
    },
    init(Vue) {
        this.instance = new Vue(this.options);
    },
});
