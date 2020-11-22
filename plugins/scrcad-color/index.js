function parseColor(str) {
    let [, ...hex] = str;
    let color = ((hex.reduce((a, b) => (a << 4) | parseInt(b, 16), 0) << 8) | 0xff) >>> 0;
    return color;
}

class ColorHandler {
    color = 0;

    change() {
        if (this.error != null) return;
        this.color = parseColor(this.value);
    }
}

const panels_color_primaryColor = new ColorHandler();
const panels_color_secondaryColor = new ColorHandler();

const tools_colorPicker = {
    mouseDown(e) {
        const voxel = e.view.get(e.x, e.y, e.z);

        if (voxel) {
            panels_color_primaryColor.color = voxel.color;
            panels_color_primaryColor.value =
                "#" +
                (voxel.color >>> 8).toString(16).padStart(6, "0") +
                ((voxel.color & 0xff) !== 0xff
                    ? (voxel.color & 0xff).toString(16).padStart(2, "0")
                    : "");
        }
    },
    mouseDrag(e) {
        this.mouseDown(e);
    },
};

exports = {
    parseColor,
    get primaryColor() {
        return panels_color_primaryColor.color;
    },
    get secondaryColor() {
        return panels_color_secondaryColor.color;
    },
};

module.exports = {
    exports,
    handlers: {
        panels_color_primaryColor,
        panels_color_secondaryColor,
        panels_color_switch: {
            change() {
                [panels_color_primaryColor.color, panels_color_secondaryColor.color] = [
                    panels_color_secondaryColor.color,
                    panels_color_primaryColor.color,
                ];

                [panels_color_primaryColor.value, panels_color_secondaryColor.value] = [
                    panels_color_secondaryColor.value,
                    panels_color_primaryColor.value,
                ];
            },
        },
        tools_colorPicker,
    },
};
