const mouseWheel = require("mouse-wheel");

module.exports = (app) => ({
    canvas: null,
    context: null,
    zoomScrollFactor: 1.2,
    minZoom: 5,
    modelPlane: null,
    view: {
        zoom: 0,
        plane: null,
    },
    init() {
        this.canvas = document.getElementById("editor-canvas");
        this.context = this.canvas.getContext("2d");

        mouseWheel(this.canvas.parentNode, (_, dy) => {
            this.zoom(dy < 0 ? 1 : -1);
        });

        let drag = null;

        this.canvas.parentNode.addEventListener("mousedown", (e) => {
            if (e.button != 2) return;

            drag = {
                x: e.clientX - this.canvas.offsetLeft,
                y: e.clientY - this.canvas.offsetTop
            };

            this.canvas.style.left = (this.canvas.offsetLeft - this.canvas.parentNode.offsetLeft) + "px";
            this.canvas.style.top = (this.canvas.offsetTop - this.canvas.parentNode.offsetTop) + "px";

            console.log({
                dragX: drag.x,
                dragY: drag.y,
                mouseX: e.clientX,
                mouseY: e.clientY,
                dX: e.clientX - drag.x - this.canvas.parentNode.offsetLeft,
                dY: e.clientY - drag.y - this.canvas.parentNode.offsetTop,
                offsetLeft: this.canvas.offsetLeft - this.canvas.parentNode.offsetLeft,
                offsetTop: this.canvas.offsetTop - this.canvas.parentNode.offsetTop,
            });
        });

        this.canvas.parentNode.addEventListener("mouseup", (e) => {
            if (e.button != 2) return;

            drag = null;
        });

        this.canvas.parentNode.addEventListener("mousemove", (e) => {
            if (!drag) return;

            console.log({
                dragX: drag.x,
                dragY: drag.y,
                mouseX: e.clientX,
                mouseY: e.clientY,
                dX: e.clientX - drag.x - this.canvas.parentNode.offsetLeft,
                dY: e.clientY - drag.y - this.canvas.parentNode.offsetTop
            });

            this.canvas.style.left = (e.clientX - drag.x - this.canvas.parentNode.offsetLeft) + "px";
            this.canvas.style.top = (e.clientY - drag.y - this.canvas.parentNode.offsetTop) + "px";
        });

        this.canvas.addEventListener("click", (e) => {
            let posX = e.clientX - e.target.offsetLeft;
            let posY = e.clientY - e.target.offsetTop;

            let tileX = Math.floor(posX / this.view.zoom) - 1;
            let tileY = Math.floor(posY / this.view.zoom) - 1;

            this.modelPlane.setVoxelAt(tileX, tileY, 0, {
                selected: true,
                color: 0xffffffff,
            });

            this.setView({});
        });

        this.setView({
            zoom: 100,
            plane: "top",
        });
    },
    invalidate() {
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

        this.context.lineWidth = 0.16 * this.view.zoom;

        let gradient = this.context.createLinearGradient(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );
        gradient.addColorStop("0", "#00F5AA");
        gradient.addColorStop("1.0", "#F90FD6");

        this.context.strokeStyle = gradient;

        this.modelPlane.forEachInZLayer(0, (voxel, x, y) => {
            let voxelTransform = [
                (x + 1) * this.view.zoom + this.context.lineWidth / 2,
                (y + 1) * this.view.zoom + this.context.lineWidth / 2,
                this.view.zoom - this.context.lineWidth,
                this.view.zoom - this.context.lineWidth,
            ];

            let tempColorBuffer = Buffer.alloc(4);
            tempColorBuffer.writeUInt32BE(voxel.value.color);
            this.context.fillStyle = `#${tempColorBuffer.toString("hex")}`;

            let _strokeStyle = this.context.strokeStyle;
            this.context.strokeStyle = this.context.fillStyle;

            this.context.strokeRect(...voxelTransform);
            this.context.fillRect(...voxelTransform);

            this.context.strokeStyle = _strokeStyle;

            if (voxel.value.selected) this.context.strokeRect(...voxelTransform);
        });

        this.context.lineWidth = 1;
        this.context.strokeStyle = "rgba(80, 80, 80, 1)";

        for (let x = 0; x < gridWidth; x++) {
            this.context.strokeRect(x * this.view.zoom, 0, this.view.zoom, this.canvas.height);
        }

        for (let y = 0; y < gridHeight; y++) {
            this.context.strokeRect(0, y * this.view.zoom, this.canvas.width, this.view.zoom);
        }
    },
    setView(view) {
        Object.assign(this.view, view);
        let { zoom, plane } = this.view;

        this.modelPlane = app.model.getPlane(plane);
        this.canvas.width = (this.modelPlane.width + 2) * zoom;
        this.canvas.height = (this.modelPlane.height + 2) * zoom;

        this.context = this.canvas.getContext("2d");

        this.invalidate();
    },
    zoom(amount) {
        this.setView({
            zoom: Math.max(this.view.zoom * this.zoomScrollFactor ** amount, this.minZoom),
        });
    },
});
