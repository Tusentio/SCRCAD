const Model = require("./model.js");

const app = {
    model: null,
    vue: null,
    viewport2D: null,
    viewport3D: null,
    init(Vue) {
        this.model = new Model();

        this.vue = require("./vue-app.js")(this);
        this.viewport2D = require("./viewport-2d.js")(this);
        this.viewport3D = require("./viewport-3d.js")(this);

        this.vue.init(Vue);
        this.viewport2D.init();
        this.viewport3D.init();
    },
    invalidateViewports() {
        this.viewport3D.invalidate();
        this.viewport2D.invalidate();
    },
};

module.exports = app;
