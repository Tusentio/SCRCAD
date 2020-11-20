module.exports = {
    toRGBA(n) {
        return [
            (((n >>> 24) & 0xff) / 0xff) ** 2,
            (((n >>> 16) & 0xff) / 0xff) ** 2,
            (((n >>> 8) & 0xff) / 0xff) ** 2,
            ((n & 0xff) / 0xff) ** 2,
        ];
    },
    mix(a, b, p = 0.5) {
        let pAlpha = Math.min(a[3], b[3]) === 0 ? 0 : 1;
        let ia = (1 - p) * pAlpha + (a[3] / (a[3] + b[3])) * (1 - pAlpha);
        let ib = p * pAlpha + (b[3] / (a[3] + b[3])) * (1 - pAlpha);

        let res = [
            a[0] * ia + b[0] * ib,
            a[1] * ia + b[1] * ib,
            a[2] * ia + b[2] * ib,
            a[3] * (1 - p) + b[3] * p,
        ];
        if (res[3] === 0) res = [0, 0, 0, 0];

        return res;
    },
    mult(a, b) {
        return [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3]];
    },
    toNumber(rgba) {
        return (
            ((((Math.sqrt(rgba[0]) * 0xff) | 0) << 24) |
                (((Math.sqrt(rgba[1]) * 0xff) | 0) << 16) |
                (((Math.sqrt(rgba[2]) * 0xff) | 0) << 8) |
                ((Math.sqrt(rgba[3]) * 0xff) | 0)) >>>
            0
        );
    },
};
