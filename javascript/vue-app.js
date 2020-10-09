const electron = require("electron");

module.exports = (app) => ({
    instance: null,
    options: {
        el: "#vue-wrapper",
        data: {},
        methods: {
            onResize(e) {
                app.viewport3D.setView({
                    width: app.viewport3D.canvas.parentElement.clientWidth,
                    height: app.viewport3D.canvas.parentElement.clientHeight,
                });

                app.invalidateViewports();
            },
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
        },
        created() {
            window.addEventListener("resize", this.onResize);
        },
    },
    init(Vue) {
        this.instance = new Vue(this.options);
    },
});