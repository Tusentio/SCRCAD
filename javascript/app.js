const path = require("path");
const fs = require("fs");
const os = require("os");
const Store = require("@tusent.io/json-database");
const Model = require("./model.js");
const VueApp = require("./vue-app.js");

fs.promises.exists = async function (path) {
    try {
        await fs.promises.stat(path);
        return true;
    } catch {
        return false;
    }
};

const app = {
    model: null,
    vue: null,
    tempStore: null,
    init() {
        const scrcadTempPath = path.resolve(os.tmpdir(), "SCRCAD");
        if (!fs.existsSync(scrcadTempPath)) {
            fs.mkdirSync(scrcadTempPath, { recursive: true });
        }

        const tempStorePath = path.join(scrcadTempPath, "store.json");
        this.tempStore = new Store(tempStorePath);

        this.model = new Model("Untitled");
        this.vue = new VueApp(this);
    },
    async saveProject(overwrite = true) {
        const projectsPath = await this.getProjectsPath();

        let fileName = this.model.name;
        if (!overwrite) {
            for (
                let i = 1;
                await fs.promises.exists(path.resolve(projectsPath, `${fileName}.scrcad`));
                i++
            ) {
                fileName = `${this.model.name}-${i}`;
            }
        }

        await this.model.save(path.resolve(projectsPath, `${fileName}.scrcad`));
    },
    async loadProject(name) {
        const projectsPath = await this.getProjectsPath();
        return await Model.load(path.resolve(projectsPath, `${name}.scrcad`));
    },
    async getProjectsPath() {
        const projectsPath =
            this.tempStore.get("projects_path") ||
            this.tempStore.set("projects_path", path.resolve(os.homedir(), "SCRCAD", "Projects"));

        if (!(await fs.promises.exists(projectsPath))) {
            await fs.promises.mkdir(projectsPath, { recursive: true });
        }

        return projectsPath;
    },
};

module.exports = app;
