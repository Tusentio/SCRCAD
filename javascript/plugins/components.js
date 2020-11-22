const { EventEmitter } = require("events");
const util = require("util");
const path = require("path");

class Component extends EventEmitter {
    #info;

    constructor(info, handlers) {
        super();
        this.#info = info;

        const handler = handlers[info.handler];
        if (handler == null || typeof handler != "object") return;

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
    }

    get name() {
        return this.#info.name || "";
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
        process.nextTick(async () => {
            if (this.error == null) {
                try {
                    await util.promisify(this.emit).call(this, "validate", {
                        value: this.value,
                    });
                } catch (err) {
                    this.error = err;
                }
            }

            this.emit("change", {
                value: this.value,
                error: this.error,
            });
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

            let [
                ,
                ...rgb
            ] = /.*?([0-9]+(?:\.[0-9]+)?).*?([0-9]+(?:\.[0-9]+)?).*?([0-9]+(?:\.[0-9]+)?).*/.exec(
                style.color
            );
            let color = rgb
                .map(parseFloat)
                .map((n) => n.toString(16).padStart(2, "0"))
                .join("");
            this.value = `#${color}`;
        }
    }

    static isColor(str) {
        let style = new Option().style;
        style.color = str;
        console.log(style.color);
        return style.color.startsWith("rgb") && !style.color.startsWith("rgba");
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
    inputs = [];
    expanded = false;

    constructor(info, handlers, root) {
        super(info, handlers);
        this.#info = info;
        this.#root = root;

        this.#info.inputs.forEach((info) => {
            this.inputs.push(Input.create(info, handlers));
        });
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
