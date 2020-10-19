const THREE = require("three");
const mouseWheel = require("mouse-wheel");

module.exports = (app) => ({
    canvas: null,
    renderer: null,
    scene: null,
    camera: null,
    modelMesh: null,
    zoomScrollFactor: 1.2,
    minZoom: 5,
    rotationSpeed: 1,
    view: {
        width: 0,
        height: 0,
        zoom: 0,
        xOffset: 0,
        yOffset: 0,
        rotationX: 0,
        rotationY: 0,
    },
    init() {
        this.canvas = document.getElementById("preview-canvas");
        this.scene = new THREE.Scene();

        this.camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0);
        this.scene.add(this.camera);

        let ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        let light = new THREE.DirectionalLight(0xffffff, 0.5);
        light.position.set(-10, 10, 10);
        light.target.position.set(0, 0, 0);
        this.scene.add(light);
        this.scene.add(light.target);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
        });
        this.renderer.setClearColor(0, 0);

        this.setView({
            width: this.canvas.parentElement.clientWidth,
            height: this.canvas.parentElement.clientHeight,
            zoom: 100,
        });

        window.addEventListener("resize", () => {
            this.setView({
                width: this.canvas.parentElement.clientWidth,
                height: this.canvas.parentElement.clientHeight,
            });
        });

        app.model.on("change", () => {
            this._refreshMesh = true;
            this.setView({});
        });

        mouseWheel(this.canvas, (_, dy) => {
            this.zoom(dy < 0 ? 1 : -1);
        });

        {
            let drag = null;

            this.canvas.addEventListener("mousedown", (e) => {
                drag = {
                    button: e.button,
                    x: e.clientX,
                    y: e.clientY,
                };
            });

            window.addEventListener("mouseup", (e) => {
                if (e.button !== drag?.button) return;
                drag = null;
            });

            window.addEventListener("mousemove", (e) => {
                if (!drag) return;

                let dx = e.clientX - drag.x;
                let dy = e.clientY - drag.y;
                drag.x = e.clientX;
                drag.y = e.clientY;

                switch (drag.button) {
                    case 0:
                        this.setRotation(
                            this.view.rotationX + (dy / 360) * this.rotationSpeed * Math.PI * 2,
                            this.view.rotationY + (dx / 360) * this.rotationSpeed * Math.PI * 2
                        );
                        break;
                    case 2:
                        this.setView({
                            xOffset: this.view.xOffset - dx / this.view.zoom,
                            yOffset: this.view.yOffset + dy / this.view.zoom,
                        });
                        break;
                }
            });
        }
    },
    invalidate() {
        if (!app.vue.instance.panels.preview) return;

        // Don't allow more than one uncompleted animation frame request at once
        this._anim =
            this._anim ||
            requestAnimationFrame(() => {
                this.render();
                this._anim = undefined;
            });
    },
    render() {
        if (this._refreshMesh) {
            if (this.modelMesh) this.scene.remove(this.modelMesh);

            this.modelMesh = app.model.meshify();
            this.setRotation();

            this.scene.add(this.modelMesh);
            this._refreshMesh = false;
        }

        this.renderer.render(this.scene, this.camera);
    },
    setView(view) {
        Object.assign(this.view, view);
        let { width, height, zoom, xOffset, yOffset } = this.view;

        // Calculate camera viewing planes based on zoom and aspect ratio
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

        // Have (z: 0) always be in the center of the camera's viewing box
        this.camera.position.z = this.camera.far / 2;

        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);

        this.invalidate();
    },
    resetView() {
        this.setRotation(0, 0);

        this.setView({
            xOffset: 0,
            yOffset: 0,
            zoom: 100,
        });
    },
    setRotation(x = this.view.rotationX, y = this.view.rotationY) {
        this.view.rotationX = x;
        this.view.rotationY = y;

        if (this.modelMesh) {
            this.modelMesh.setRotationFromEuler(new THREE.Euler(x, y, 0, "ZXY"));
            this.invalidate();
        }
    },
    zoom(amount) {
        this.setView({
            zoom: Math.max(this.view.zoom * this.zoomScrollFactor ** amount, this.minZoom),
        });
    },
});
