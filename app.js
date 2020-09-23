const { app, BrowserWindow } = require("electron");
app.allowRendererProcessReuse = true;

app.whenReady().then(() => {
    let window = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        minWidth: 200,
        minHeight: 150,
        backgroundColor: "black",
        autoHideMenuBar: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
        }
    });

    //window.setMenu(null);
    window.loadFile("./ui/index.html");
    window.webContents.on("did-finish-load", () => window.show());
});