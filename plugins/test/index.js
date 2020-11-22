const plugin = {
    loaded: false,
    load() {
        this.loaded = true;
    },
};

let tools_pencil = {
    mouseDown(e) {
        if (!plugin.loaded) return;

        e.view.set(e.x, e.y, e.z, {
            color: plugin.imports.color.primaryColor,
        });
    },
    mouseDrag(e) {
        this.mouseDown(e);
    },
};

module.exports = {
    exports: {},
    handlers: {
        plugin,
        tools_pencil,
    },
};
