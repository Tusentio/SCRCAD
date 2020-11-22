const { EventEmitter } = require("events");
const path = require("path");

class Component extends EventEmitter {
    #info;
    #handler;

    constructor(info, handlers) {
        super();
        this.#info = info;

        const handler = handlers[info.handler];
        if (handler == null || typeof handler != "object") return;
        this.#handler = handler;

        const events = new Set();
        for (let h = handler; h !== Object.prototype; h = Object.getPrototypeOf(h)) {
            for (const event of Object.getOwnPropertyNames(h)) {
                if (event === "constructor") continue;

                const listener = handler[event];
                if (typeof listener !== "function") continue;

                if (events.has(event)) continue;
                events.add(event);

                this.addListener(event, (...args) => listener.apply(handler, args));
            }
        }

        process.nextTick(() => {
            for (
                let comp = this;
                comp !== Component.prototype;
                comp = Object.getPrototypeOf(comp)
            ) {
                for (let key of Object.keys(comp)) {
                    if (key[0] === "_") continue;
                    let name = key;

                    const descriptor = {
                        enumerable: true,
                        get() {
                            return comp[key];
                        },
                    };

                    if (key[0] !== "$") {
                        descriptor.set = (value) => {
                            return (comp[key] = value);
                        };
                    } else {
                        name = key.slice(1);
                    }

                    Object.defineProperty(handler, name, descriptor);
                }
            }
        });
    }

    get name() {
        return this.#info.name || "";
    }

    get handler() {
        return this.#handler;
    }
}

class Input extends Component {
    #info;

    value;
    error;

    constructor(info, handlers, value) {
        super(info, handlers);
        this.#info = info;

        this.value = typeof info.value == "undefined" ? value : info.value;
        if (this.inputType !== "button") this.validate();
    }

    get styleType() {
        return this.#info.type;
    }

    get inputType() {
        return "text";
    }

    validate() {
        process.nextTick(() => {
            if (this.error == null) {
                this.emit("validate");
            }

            this.emit("change");
        });

        this.error = undefined;
    }

    static create(info, handlers) {
        return new (inputTypes[info.type] || Input)(info, handlers);
    }
}

class InputColor extends Input {
    constructor(info, handlers) {
        super(info, handlers, "#000000");
    }

    validate() {
        super.validate();

        if (!InputColor.isColor(this.value)) {
            if (this.value[0] !== "#") {
                this.value = "#" + this.value;

                if (!InputColor.isColor(this.value)) {
                    this.error = "Invalid color value (try eg. #4285F4)";
                }
            } else {
                this.error = "Invalid color value (try eg. #4285F4)";
            }
        }

        if (this.error == null) {
            let style = new Option().style;
            style.color = this.value;

            let rgba = /\((.*?)\)/.exec(style.color)[1].split(",").map(parseFloat);
            let color = rgba
                .map((n) => (n < 1 ? (n * 256) | 0 : n).toString(16).padStart(2, "0"))
                .join("");
            this.value = `#${color}`;
        }
    }

    static isColor(str) {
        let style = new Option().style;
        style.color = str;
        return style.color.startsWith("rgb");
    }
}

class InputNumber extends Input {
    constructor(info, handlers) {
        super(info, handlers, 0);
    }

    get inputType() {
        return "number";
    }

    validate() {
        super.validate();

        this.value = parseFloat(this.value);
        if (Number.isNaN(this.value)) {
            this.error = "Invalid number value";
        }
    }
}

class InputInteger extends Input {
    constructor(info, handlers) {
        super(info, handlers, 0);
    }

    get inputType() {
        return "number";
    }

    validate() {
        super.validate();

        this.value = parseFloat(this.value);
        if (!Number.isInteger(this.value)) {
            this.error = "Invalid integer value";
        }
    }
}

class InputBoolean extends Input {
    #info;

    constructor(info, handlers) {
        super(info, handlers, false);
        this.#info = info;
    }

    get inputType() {
        return "button";
    }

    get category() {
        return this.#info.category || "Misc";
    }

    validate() {
        super.validate();
        this.value = !this.value;
    }
}

class InputButton extends Input {
    #info;

    constructor(info, handlers, root) {
        super(info, handlers);
        this.#info = info;
    }

    get inputType() {
        return "button";
    }

    get category() {
        return this.#info.category || "Misc";
    }
}

const inputTypes = {
    color: InputColor,
    number: InputNumber,
    integer: InputInteger,
    boolean: InputBoolean,
    action: InputButton,
};

class Panel extends Component {
    #info;
    #root;
    _inputs = [];

    expanded = false;

    constructor(info, handlers, root) {
        super(info, handlers);
        this.#info = info;
        this.#root = root;

        this.#info.inputs.forEach((info) => {
            this._inputs.push(Input.create(info, handlers));
        });
    }

    get inputs() {
        return this._inputs;
    }

    get category() {
        return this.#info.category || "Misc";
    }

    get icon() {
        return path.join(
            ...(this.#info.icon == null
                ? ["media", "plugin-placeholder.png"]
                : [this.#root, this.#info.icon])
        );
    }

    toggleExpanded() {
        this.expanded = !this.expanded;
        this.emit(this.expanded ? "open" : "close");
    }
}

class Tool extends Component {
    #info;
    #root;

    constructor(info, handlers, root) {
        super(info, handlers);
        this.#info = info;
        this.#root = root;
    }

    get icon() {
        return path.join(
            ...(this.#info.icon == null
                ? ["media", "selection.svg"]
                : [this.#root, this.#info.icon])
        );
    }

    get tooltip() {
        return this.#info.tooltip;
    }
}

module.exports = {
    Component,
    Input,
    Panel,
    Tool,
};
