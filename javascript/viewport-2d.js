module.exports = (app) => ({
    canvas: null,
    context: null,
    modelPlane: null,
    view: {
        zoom: 1,
        plane: "top",
    },
    init() {
        this.canvas = document.getElementById("editor-canvas");
        this.context = this.canvas.getContext("2d");

        this.invalidate();
    },
    invalidate() {
        this.setView({});
    },
    render() {},
    setView(view) {
        Object.assign(this.view, view);
        let { zoom, plane } = this.view;

        this.modelPlane = app.model.getPlane(plane);
        this.canvas.width = this.modelPlane.width * zoom;
        this.canvas.height = this.modelPlane.height * zoom;
    },
});
