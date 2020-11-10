const voxelUtil = require("../pkg");

onmessage = function (e) {
    let result = voxelUtil[e.data.action](...e.data.params);

    let response = {
        id: e.data.id,
        result: result,
    };

    postMessage(response);
};
