const colorRegex = /^\s*#?([0-9A-F]{8}|[0-9A-F]{6}|[0-9A-F]{4}|[0-9A-]{3})\s*$/i;
const colorRGBARegex = /^\s*#?([0-9A-F]{8}|[0-9A-F]{4})\s*$/i;
const colorRGBRegex = /^\s*#?([0-9A-F]{6}|[0-9A-]{3})\s*$/i;

function parseColor(str) {
    let [_, $1] = colorRegex.exec(str) || [];
    if ($1 === undefined) return Number.NaN;

    $1 = $1.toLowerCase();

    if ($1.length < 6) {
        $1 = $1.replace(/[0-9a-f]/g, (c) => c + c);
    }

    if ($1.length === 6) {
        $1 = $1.padEnd(8, "f");
    }

    return parseInt($1, 16);
}

class Input {
    #options = {};
    label;
    $ = {
        value: null,
        error: null,
    };

    constructor(label, value = null, options = {}) {
        this.label = label;
        this.$.value = value;

        for (let name in options) {
            if (name in this) continue;

            this.#options[name] = options[name];
            Object.defineProperty(this, name, {
                get() {
                    return this.#options[name];
                },
                set(value) {
                    let _value = this.#options[name];
                    if ((this.#options[name] = value) !== _value) {
                        this.validate();
                    }
                },
            });
        }

        Object.freeze(this);
        this.validate();
    }

    get value() {
        return this.$.value;
    }

    set value(value) {
        this.$.value = value;
        this.validate();
    }

    validate() {
        this.$.error = "Raw input";
    }
}

class InputColor extends Input {
    constructor(label, value = "#000000") {
        super(label, value);
    }

    get color() {
        return parseColor(this.value);
    }

    validate() {
        if (!colorRegex.test(this.value)) {
            this.$.error = "Invalid color value (try #4285F4)";
        } else {
            this.$.error = null;
        }
    }
}

class InputColorRGBA extends InputColor {
    constructor(name, value = "#00000000") {
        super(name, value);
    }

    validate() {
        if (!colorRGBARegex.test(this.value)) {
            this.$.error = "Invalid color RGBA value (must have alpha)";
        } else {
            this.$.error = null;
        }
    }
}

class InputColorRGB extends InputColor {
    constructor(name, value = "#000000") {
        super(name, value);
    }

    validate() {
        if (!colorRGBRegex.test(this.value)) {
            this.$.error = "Invalid color RGB value (must not have alpha)";
        } else {
            this.$.error = null;
        }
    }
}

module.exports = {
    InputColor,
    InputColorRGB,
    InputColorRGBA,
};
