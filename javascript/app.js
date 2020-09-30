const THREE = require("three");
const Model = require("./model.js");

const app = {
    vue: {
        instance: null,
        options: null,
    },
    model: new Model(),
    viewport2D: {
        viewingPlane: "top",
    },
    viewport3D: {
        canvas: null,
        renderer: null,
        scene: null,
        camera: null,
        view: {
            width: 1,
            height: 1,
            zoom: 1,
            xOffset: 0,
            yOffset: 0,
        },
    },
};

app.vue.options = {
    el: "#vue-wrapper",
    data: {},
    methods: {},
};

app.init = function (Vue) {
    app.vue.instance = new Vue(app.vue.options);
    app.viewport3D.init();
};

app.invalidateViewports = function () {
    this.viewport3D.render();
};

app.viewport3D.init = function () {
    this.canvas = document.getElementById("preview-canvas");
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
    });

    this.scene.add(this.camera);
    this.setView({
        width: this.canvas.clientWidth,
        height: this.canvas.clientHeight,
    });

    this.render();
};

app.viewport3D.render = function () {
    this.renderer.render(this.scene, this.camera);
};

app.viewport3D.setView = function (view) {
    Object.assign(this.view, view);
    let { width, height, zoom, xOffset, yOffset } = this.view;

    let aspectRatio = width / height;
    if (width > height) {
        this.camera.right = (height * aspectRatio) / 2 / zoom;
        this.camera.top = height / 2 / zoom;
    } else {
        this.camera.right = width / 2 / zoom;
        this.camera.top = width / aspectRatio / 2 / zoom;
    }
    this.camera.left = -this.camera.right;
    this.camera.bottom = -this.camera.top;

    this.camera.left += xOffset;
    this.camera.right += xOffset;
    this.camera.top += yOffset;
    this.camera.bottom += yOffset;

    this.camera.updateProjectionMatrix();
    this.renderer.setViewport(0, 0, width, height);
};

module.exports = app;
