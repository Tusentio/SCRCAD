class ClickToolHandler {
    mouseDown(e) {
        e?.view?.set(e.x, e.y, e.z, {
            color: 0xffffffff,
        });
    }

    mouseDrag(e) {
        this.mouseDown(e);
    }
}

module.exports = {
    properties: {},
    handlers: {
        testPlugin: {
            load(e) {},
        },
        clickMe: {
            validate() {
                alert("Hello!");
            },
        },
    },
};
