const electron = require("electron");
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
    methods: {
        onResize(e) {
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
};

app.init = function (Vue) {
    this.vue.instance = new Vue(app.vue.options);
    this.viewport3D.init();
};

app.invalidateViewports = function () {
    this.viewport3D.invalidate();
};

app.viewport3D.init = function () {
    this.canvas = document.getElementById("preview-canvas");
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
    });
    this.renderer.setClearColor(0, 0);

    let geometry = new THREE.BoxGeometry(25, 25, 25);
    let material = new THREE.MeshNormalMaterial();
    for (let i = 0; i < 300; i++) {
        let cube = new THREE.Mesh(geometry, material);
        cube.rotateX(Math.random() * 180);
        cube.rotateY(Math.random() * 180);
        cube.rotateZ(Math.random() * 180);
        cube.position.x = Math.random() - 0.5;
        cube.position.y = Math.random() - 0.5;
        cube.position.z = Math.random() - 0.5;
        cube.position.normalize();
        cube.position.multiplyScalar(Math.random() * 200);
        this.scene.add(cube);
    }

    this.scene.add(this.camera);
    this.invalidate();
};

app.viewport3D.invalidate = function () {
    this.setView({
        width: this.canvas.parentElement.clientWidth,
        height: this.canvas.parentElement.clientHeight,
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

    // Apply position offsets
    this.camera.left += xOffset;
    this.camera.right += xOffset;
    this.camera.top += yOffset;
    this.camera.bottom += yOffset;

    this.camera.position.z = 1000;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
};

module.exports = app;
