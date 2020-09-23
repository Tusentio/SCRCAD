const ND_ARRAY = Symbol("ND_ARRAY");

class NdArray extends Array {
    constructor(...dims) {
        super(dims.shift());
        super.fill();
        if (dims.length > 0)
            super.forEach((_, i) => this[i] = new NdArray(...dims));

        this[ND_ARRAY] = this;
    }

    get shape() {
        return [this.length, ...(this[0]?.shape || [])];
    }

    forEach(callbackfn) {
        for (let i = 0; i < this.length; i++) {
            let current = this[i];

            if (NdArray.isNdArray(current)) {
                current.forEach((e, ...indices) => {
                    callbackfn(e, i, ...indices);
                });
            } else {
                callbackfn(current, i);
            }
        }
    }

    static isNdArray(object) {
        return object?.[ND_ARRAY] !== undefined;
    }
}

module.exports = NdArray;