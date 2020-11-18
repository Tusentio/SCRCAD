const Model = require("./model.js");
const VueApp = require("./vue-app.js");

const app = {
    model: null,
    vue: null,
    init(Vue) {
        this.model = new Model("Untitled");
        this.vue = new VueApp(Vue, this);
    },
};

module.exports = app;
