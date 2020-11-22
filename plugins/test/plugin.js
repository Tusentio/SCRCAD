let clickToolHandler = {
    color: 0,
    mouseDown(e) {
        e?.view?.set(e.x, e.y, e.z, {
            color: this.color,
        });
    },
    mouseDrag(e) {
        this.mouseDown(e);
    },
};

let colorHandler = {
    change() {
        if (this.error != null) return;

        let [, ...hex] = this.value;
        let color = ((hex.reduce((a, b) => (a << 4) | parseInt(b, 16), 0) << 8) | 0xff) >>> 0;

        clickToolHandler.color = color;
    },
};

module.exports = {
    properties: {},
    handlers: {
        testPlugin: {
            load(e) {},
        },
        clickTool: clickToolHandler,
        clickMe: {
            validate() {
                alert("Hello!");
            },
        },
        color: colorHandler,
    },
};
