module.exports = (app) => ({
    canvas: null,
    /**
     * @type {CanvasRenderingContext2D}
     */
    context: null,
    modelPlane: null,
    view: {
        zoom: 100,
        plane: "top",
    },
    init() {
        this.canvas = document.getElementById("editor-canvas");
        this.context = this.canvas.getContext("2d");

        this.invalidate();
    },
    invalidate() {
        this.setView({});
        this.render();
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
    },
});
