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
    plane: null,
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
        });
        this.setPlane("home");

        window.addEventListener("resize", () => {
            this.setView({
                width: this.canvas.parentElement.clientWidth,
                height: this.canvas.parentElement.clientHeight,
            });
        });

        app.model.on("change", () => {
            this._refreshMesh = true;
            this.invalidate();
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
                        let dRotationX = (dy / 360) * this.rotationSpeed * Math.PI * 2;
                        let dRotationY = (dx / 360) * this.rotationSpeed * Math.PI * 2;

                        if (Math.abs((this.view.rotationX + Math.PI / 2) % (Math.PI * 2)) > Math.PI)
                            dRotationY *= -1;

                        this.setRotation(
                            this.view.rotationX + dRotationX,
                            this.view.rotationY + dRotationY
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
            requestAnimationFrame(async () => {
                await this.render();
                this._anim = undefined;
            });
    },
    async render() {
        if (this._refreshMesh) {
            await this.reloadMesh();
            this.updateMeshTransforms();
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
    setPlane(plane) {
        switch (plane) {
            case "home":
                this.resetView();
                break;
            case "top":
                this.setRotation(Math.PI / 2, 0);
                break;
            case "left":
                this.setRotation(0, 0);
                break;
            case "right":
                this.setRotation(0, -Math.PI / 2);
                break;
            default:
                return;
        }

        this.plane = plane;
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
        this.view.rotationX = (Math.PI * 2 + (x % (Math.PI * 2))) % (Math.PI * 2);
        this.view.rotationY = (Math.PI * 2 + (y % (Math.PI * 2))) % (Math.PI * 2);
        this.plane = null;

        this.updateMeshTransforms();
    },
    async reloadMesh() {
        if (this.modelMesh) this.scene.remove(this.modelMesh);
        this.modelMesh = await app.model.meshify();
        this.scene.add(this.modelMesh);

        this.invalidate();
    },
    updateMeshTransforms() {
        this.modelMesh?.setRotationFromEuler(
            new THREE.Euler(this.view.rotationX, this.view.rotationY, 0, "ZXY")
        );

        this.invalidate();
    },
    zoom(amount) {
        this.setView({
            zoom: Math.max(this.view.zoom * this.zoomScrollFactor ** amount, this.minZoom),
        });

        if (this.plane === "home") {
            this.plane = null;
        }
    },
});
