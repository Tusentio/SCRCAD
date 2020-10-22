const EventEmitter = require("events");

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

class Input extends EventEmitter {
    #label;
    #id = Buffer.from(new Array(12).fill().map((_) => (Math.random() * 0x100) | 0)).toString(
        "base64"
    );
    #options = {};

    $ = {
        value: null,
        error: null,
    };

    constructor(label, value = null, options = {}) {
        super();

        this.#label = label;
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
                        this.notifyChange();
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
        this.notifyChange();
    }

    get error() {
        return this.$.error?.length > 0;
    }

    get() {
        return this.$.value;
    }

    notifyChange() {
        this.validate();
        this.emit("change", this.get(), this.error);
    }

    validate() {
        this.$.error = null;
    }

    renderElement(pluginInputLocation) {
        let input = new HTMLInputElement();
        input.setAttribute("v-model", `${pluginInputLocation}.$.value`);
        input.id = this.#id;

        let label = new HTMLLabelElement();
        label.setAttribute("for", this.id);
        label.textContent = this.#label;

        return [label, input];
    }
}

class InputColor extends Input {
    constructor(label, value = "#000000") {
        super(label, value);
    }

    get() {
        return parseColor(this.value);
    }

    validate() {
        if (colorRegex.test(this.value)) {
            this.$.error = null;
        } else {
            this.$.error = "Invalid color value (try #4285F4)";
        }
    }
}

class InputColorRGBA extends InputColor {
    constructor(label, value = "#00000000") {
        super(label, value);
    }

    validate() {
        if (colorRGBARegex.test(this.value)) {
            this.$.error = null;
        } else {
            this.$.error = "Invalid color RGBA value (must have alpha)";
        }
    }
}

class InputColorRGB extends InputColor {
    constructor(label, value = "#000000") {
        super(label, value);
    }

    validate() {
        if (colorRGBRegex.test(this.value)) {
            this.$.error = null;
        } else {
            this.$.error = "Invalid color RGB value (must not have alpha)";
        }
    }
}

class InputBoolean extends Input {
    constructor(label, value = false) {
        super(label, value);
    }

    get() {
        return this.value === true;
    }

    validate() {
        if (this.value === true || this.value === false) {
            this.$.error = null;
        } else {
            this.$.error = "Invalid boolean value";
        }
    }
}

class InputButton extends Input {
    constructor(label) {
        super(label, null);
    }
}

module.exports = {
    InputColor,
    InputColorRGB,
    InputColorRGBA,
    InputBoolean,
    InputButton,
};
