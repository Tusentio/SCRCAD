const { app, BrowserWindow } = require("electron");
app.allowRendererProcessReuse = false;

app.whenReady().then(() => {
    let window = new BrowserWindow({
        show: false,
        minWidth: 1000,
        minHeight: 500,
        backgroundColor: "black",
        autoHideMenuBar: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        },
    });

    //window.setMenu(null);
    window.loadFile("./ui/index.html");
    window.webContents.on("did-finish-load", () => window.show());
});
