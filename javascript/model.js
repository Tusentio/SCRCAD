const NdArray = require("./ndarray.js");

class Model {
    constructor(x = 1, y = 1, z = 1) {
        this._voxels = new NdArray(x, y, z);
        this._voxels.forEach((x, y, z) => {
            this._voxels[x][y][z] = {
                color: 0x00000000,
                selected: false
            };
        });
    }

    getVoxelAt(x, y, z) {
        return this._voxels[x][y][z];
    }

    setVoxelAt(x, y, z, properties) {
        Object.assign(this._voxels[x][y][z], properties);
    }

    forEach(callbackfn) {
        let model = this;

        this._voxels.forEach((_, x, y, z) => {
            let voxelContainer = {
                get value() {
                    return model.getVoxelAt(x, y, z);
                },
                set value(value) {
                    model.setVoxelAt(x, y, z, value);
                }
            };

            callbackfn(voxelContainer, x, y, z);
        });
    }

    getPlane(plane) {
        return new Plane(this, plane);
    }

    getShapeOfPlane(plane) {
        let shape = this._voxels.shape;
        return ({
            "right": [shape[2], shape[1], shape[0]],
            "top": [shape[2], shape[0], shape[1]],
            "left": [shape[0], shape[1], shape[2]]
        })[plane];
    }
}

class Plane {
    constructor(model, plane) {
        this._shape = model.getShapeOfPlane(plane);

        this.planeToModelSpace = ({
            right(x, y, z) {
                return [this.depth - z, y, x];
            },
            top(x, y) {
                return [this.height - 1 - y, this.depth - 1 - z, x];
            },
            left(x, y) {
                return [x, y, z];
            }
        })[plane];

        this._model = model;
    }

    getVoxelAt(x, y, z) {
        return this._model.getVoxelAt(...this.planeToModelSpace(x, y, z));
    }

    setVoxelAt(x, y, z, properties) {
        this._model.setVoxelAt(...this.planeToModelSpace(x, y, z), properties);
    }

    forEachInZLayer(z, callbackfn) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {

                let [mx, my, mz] = this.planeToModelSpace(x, y, z);
                let voxelContainer = {
                    get value() {
                        return this._model.getVoxelAt(mx, my, mz);
                    },
                    set value(value) {
                        this._model.setVoxelAt(mx, my, mz, value);
                    }
                };

                callbackfn(voxelContainer, x, y, z);
            }
        }
    }

    get width() {
        return this._shape[0];
    }

    get height() {
        return this._shape[1];
    }

    get depth() {
        return this._shape[2];
    }
}

module.exports = Model;