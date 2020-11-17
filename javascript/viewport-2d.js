const mouseWheel = require("mouse-wheel");

module.exports = (app) => ({
    canvas: null,
    context: null,
    zoomScrollFactor: 1.2,
    minZoom: 5,
    modelPlane: null,
    activeLayer: 0,
    view: {
        zoom: 0,
        plane: null,
        layer: {
            top: 0,
            right: 0,
            front: 0,
        },
    },
    init() {
        this.canvas = document.getElementById("editor-canvas");
        this.context = this.canvas.getContext("2d");

        mouseWheel(this.canvas.parentNode, (_, dy) => {
            this.zoom(dy < 0 ? 1 : -1);
        });

        window.addEventListener("resize", () => {
            this.invalidate();
        });

        {
            let drag = null;

            this.canvas.parentNode.addEventListener("mousedown", (e) => {
                drag = {
                    button: e.button,
                    x: e.clientX,
                    y: e.clientY,
                };

                if (e.button === 2) {
                    this.canvas.classList.add("canvas-moving");
                }
            });

            window.addEventListener("mouseup", (e) => {
                if (e.button !== drag?.button) return;
                drag = null;

                if (e.button === 2) {
                    this.canvas.classList.remove("canvas-moving");
                }
            });

            window.addEventListener("mousemove", (e) => {
                if (!drag) return;

                let dx = e.clientX - drag.x;
                let dy = e.clientY - drag.y;
                drag.x = e.clientX;
                drag.y = e.clientY;

                if (drag.button === 2) {
                    this.canvas.style.left = parseInt(this.canvas.style.left || "0") + dx + "px";
                    this.canvas.style.top = parseInt(this.canvas.style.top || "0") + dy + "px";
                }
            });
        }

        this.canvas.addEventListener("click", (e) => {
            let canvasStyle = getComputedStyle(this.canvas);
            let posX =
                e.clientX -
                this.canvas.offsetLeft -
                this.canvas.parentNode.offsetLeft -
                parseInt(canvasStyle.getPropertyValue("border-left-width"));
            let posY =
                e.clientY -
                this.canvas.offsetTop -
                this.canvas.parentNode.offsetTop -
                parseInt(canvasStyle.getPropertyValue("border-top-width"));

            if (posX < 0 || posY < 0 || posX >= this.canvas.width || posY >= this.canvas.height) {
                return;
            }

            let tileX = Math.floor(posX / this.view.zoom) - 1;
            let tileY = Math.floor(posY / this.view.zoom) - 1;

            this.modelPlane.set(tileX, tileY, this.activeLayer, {
                selected: true,
                color: 0xffffffff,
            });

            this.setView({});
        });

        this.setView({
            zoom: 100,
            plane: "front",
        });
    },
    resetPosition() {
        this.canvas.style.left = "0px";
        this.canvas.style.top = "0px";
        this.setView({ zoom: 100 });
    },
    invalidate() {
        if (!app.vue.instance.panels.editor) return;

        // Don't allow more than one uncompleted animation frame request at once
        this._anim =
            this._anim ||
            requestAnimationFrame(() => {
                this._anim = undefined;
                this.render();
            });
    },
    render() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let gridWidth = this.modelPlane.width + 2;
        let gridHeight = this.modelPlane.height + 2;

        this.context.lineWidth = 0.1 * this.view.zoom;

        let gradient = this.context.createLinearGradient(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );
        gradient.addColorStop("0", "#0022ff");
        gradient.addColorStop("1.0", "#00d9ff");

        this.context.strokeStyle = gradient;

        for (let x = 0; x < this.layerWidth; x++) {
            for (let y = 0; y < this.layerHeight; y++) {
                let voxel = this.modelPlane.get(x, y, this.activeLayer);

                let voxelTransform = [
                    (x + 1) * this.view.zoom + this.context.lineWidth / 2,
                    (y + 1) * this.view.zoom + this.context.lineWidth / 2,
                    this.view.zoom - this.context.lineWidth,
                    this.view.zoom - this.context.lineWidth,
                ];

                let tempColorBuffer = Buffer.alloc(4);
                tempColorBuffer.writeUInt32BE(voxel.color);
                this.context.fillStyle = `#${tempColorBuffer.toString("hex")}`;

                let _strokeStyle = this.context.strokeStyle;
                this.context.strokeStyle = this.context.fillStyle;

                this.context.strokeRect(...voxelTransform);
                this.context.fillRect(...voxelTransform);

                this.context.strokeStyle = _strokeStyle;

                if (voxel.selected) this.context.strokeRect(...voxelTransform);
            }
        }

        if (!app.vue.instance.grid) return;

        this.context.lineWidth = 1;
        this.context.strokeStyle = "rgba(80, 80, 80, 1)";

        for (let x = 0; x < gridWidth; x++) {
            this.context.strokeRect(x * this.view.zoom, 0, this.view.zoom, this.canvas.height);
        }

        for (let y = 0; y < gridHeight; y++) {
            this.context.strokeRect(0, y * this.view.zoom, this.canvas.width, this.view.zoom);
        }
    },
    get layerWidth() {
        return this.modelPlane?.width || 0;
    },
    get layerHeight() {
        return this.modelPlane?.height || 0;
    },
    get layerCount() {
        return this.modelPlane?.depth || 0;
    },
    setView(view) {
        Object.assign(this.view, view);
        let { zoom, plane } = this.view;

        this.modelPlane = app.model.getPlane(plane);
        this.canvas.width = (this.modelPlane.width + 2) * zoom;
        this.canvas.height = (this.modelPlane.height + 2) * zoom;

        this.view.layer[plane] = Math.min(
            Math.max(this.view.layer[this.view.plane], 0),
            this.modelPlane.depth - 1
        );
        this.activeLayer = this.view.layer[plane];

        this.invalidate();
    },
    selectLayer(index) {
        index = Math.min(Math.max(index, 0), this.layerCount - 1);
        this.activeLayer = this.view.layer[this.view.plane] = index;

        this.invalidate();
    },
    duplicateLayer(index) {
        index = Math.min(Math.max(index, 0), this.layerCount - 1);
        this.modelPlane.duplicateLayer(index);

        this.setView({});

        if (index < this.activeLayer) {
            this.selectLayer(this.activeLayer + 1);
        }
    },
    insertLayer(index) {
        index = Math.min(Math.max(index, 0), this.layerCount);
        this.modelPlane.insertLayer(index);

        this.setView({});

        if (index > this.activeLayer) {
            this.selectLayer(this.activeLayer + 1);
        }
    },
    swapLayers(i, j) {
        i = Math.min(Math.max(i, 0), this.layerCount - 1);
        j = Math.min(Math.max(j, 0), this.layerCount - 1);
        if (i === j) return;

        this.modelPlane.swapLayers(i, j);

        switch (this.activeLayer) {
            case i:
                this.selectLayer(j);
                break;
            case j:
                this.selectLayer(i);
                break;
        }
    },
    zoom(amount) {
        this.setView({
            zoom: Math.max(this.view.zoom * this.zoomScrollFactor ** amount, this.minZoom),
        });
    },
});
