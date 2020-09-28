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

    get(...indices) {
        let index = indices.shift();

        if (indices.length == 0 && typeof index == "number") {
            return this[index];
        } else {
            return this[index]?.get(...indices);
        }
    }

    set(value, ...indices) {
        let index = indices.shift();

        if (indices.length == 0 && typeof index == "number") {
            this[index] = value;
        } else {
            this[index]?.set(value, ...indices);
        }
    }

    static from(arrayLike, ...dims) {
        let res = new NdArray(...dims);

        let i = 0;
        res.forEach((_, ...indices) => res.set(arrayLike[i++], ...indices));

        return res;
    }

    static isNdArray(object) {
        return object?.[ND_ARRAY] !== undefined;
    }
}

module.exports = NdArray;