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
        let gridWidth = this.modelPlane.width + 2;
        let gridHeight = this.modelPlane.height + 2;

        this.context.lineWidth = 1;
        this.context.strokeStyle = "rgba(80, 80, 80, 1)";

        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                this.context.strokeRect(x * this.view.zoom, y * this.view.zoom, this.view.zoom, this.view.zoom);
            }
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
            zoom: Math.max(
                this.minZoom - 1 + (this.view.zoom - this.minZoom + 1) * this.zoomScrollFactor ** amount,
                this.minZoom
            ),
        });
    },
});
