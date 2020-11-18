const { EventEmitter } = require("events");
const fs = require("fs");
const $path = require("path");

class Component extends EventEmitter {
    constructor(handler) {
        super();
        if (typeof handler !== "object" || handler == null) return;

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
}

class Panel extends Component {
    #info;
    #root;
    inputs;
    expanded;

    constructor(info, handler, root) {
        super(handler);
        this.#info = info;
        this.#root = root;
    }

    get name() {
        return this.#info.name || "";
    }

    get category() {
        return this.#info.category || "Misc";
    }

    toggleExpanded() {
        this.expanded = !this.expanded;
        this.emit(this.expanded ? "open" : "close");
    }
}

class Tool extends Component {
    #info;
    #root;

    constructor(info, handler, root) {
        super(handler);
        this.#info = info;
        this.#root = root;
    }

    get name() {
        return this.#info.name || "";
    }

    get icon() {
        return $path.join(
            ...(this.#info.icon ? [this.#root, this.#info.icon] : ["media", "selection.svg"])
        );
    }

    get tooltip() {
        return this.#info.tooltip;
    }
}

class Plugin extends Component {
    #id;
    #info;
    panels;
    tools;

    constructor(info, script, id, root) {
        super(script.handlers[info.handler]);
        this.#id = id;
        this.#info = info;

        this.panels = info.panels.map((info) => {
            return new Panel(info, script.handlers[info.handler], root);
        });

        this.tools = info.tools.map((info) => {
            return new Tool(info, script.handlers[info.handler], root);
        });
    }

    get id() {
        return this.#id;
    }

    get name() {
        return this.#info.name || "";
    }

    get description() {
        return this.#info.description || "";
    }
}

async function _import(path) {
    const root = $path.resolve(path);

    try {
        const packageInfo = JSON.parse(
            await fs.promises.readFile($path.join(root, "package.json"))
        );
        const pluginInfo = JSON.parse(await fs.promises.readFile($path.join(root, "plugin.json")));
        const script = require($path.join(root, packageInfo.main));

        return new Plugin(pluginInfo, script, packageInfo.name, root);
    } catch (err) {
        throw new Error(`Loading plugin in '${root}': ${err.message}`);
    }
}

module.exports = {
    import: _import,
};
