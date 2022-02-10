var Utils = (function () {
    function Utils() {
    }
    Utils.lines_to_cross = function (react_params, cross_points, i) {
        if (cross_points === void 0) { cross_points = []; }
        if (i === void 0) { i = 0; }
        for (var j = i + 1; j < react_params.length; j++) {
            var y_equal_value = [[], []];
            var if_parallel = false;
            var x = void 0, y = void 0;
            if (react_params[i][2] === 0 || react_params[j][2] === 0) {
                if (!(react_params[i][2] === 0 && react_params[j][2] === 0)) {
                    if (react_params[i][2] === 0) {
                        y = react_params[i][0] / react_params[i][1];
                        x = (react_params[j][1] * y - react_params[j][0]) / react_params[j][2];
                    }
                    else {
                        y = react_params[j][0] / react_params[j][1];
                        x = (react_params[i][1] * y - react_params[i][0]) / react_params[i][2];
                    }
                }
                else {
                    if_parallel = true;
                }
            }
            else if (react_params[i][1] === 0 || react_params[j][1] === 0) {
                if (!(react_params[i][1] === 0 && react_params[j][1] === 0)) {
                    if (react_params[i][1] === 0) {
                        x = -1 * react_params[i][0] / react_params[i][2];
                        y = (react_params[j][0] + react_params[j][2] * x) / react_params[j][1];
                    }
                    else {
                        x = -1 * react_params[j][0] / react_params[j][2];
                        y = (react_params[i][0] + react_params[i][2] * x) / react_params[i][1];
                    }
                }
                else {
                    if_parallel = true;
                }
            }
            else {
                y_equal_value[0] = [react_params[i][0] / react_params[i][1], react_params[i][2] / react_params[i][1]];
                y_equal_value[1] = [react_params[j][0] / react_params[j][1], react_params[j][2] / react_params[j][1]];
                x = (y_equal_value[1][0] - y_equal_value[0][0]) /
                    (y_equal_value[0][1] - y_equal_value[1][1]);
                y = y_equal_value[0][1] * x + y_equal_value[0][0];
            }
            if (!if_parallel) {
                var fixed = 0;
                if (react_params[i][1] === 0 || react_params[i][2] === 0) {
                    fixed += 1;
                }
                if (react_params[j][1] === 0 || react_params[j][2] === 0) {
                    fixed += 2;
                }
                cross_points.push({ crossBy: [i, j], fixed: fixed, position: [x, y], paired: false });
            }
        }
        i++;
        if (i != react_params.length) {
            return this.lines_to_cross(react_params, cross_points, i);
        }
        else {
            return cross_points;
        }
    };
    Utils.point_grouper = function (cross_points, accuracy_x, accuracy_y, three_cross_points, i) {
        if (three_cross_points === void 0) { three_cross_points = []; }
        if (i === void 0) { i = 0; }
        var temp_points = [];
        temp_points.push(cross_points[i]);
        for (var j = i + 1; j < cross_points.length; j++) {
            if (cross_points[j].paired === false) {
                if (Math.abs(cross_points[i].position[0] - cross_points[j].position[0]) < accuracy_x &&
                    Math.abs(cross_points[j].position[1] - cross_points[i].position[1]) < accuracy_y) {
                    temp_points.push(cross_points[j]);
                }
            }
        }
        if (temp_points.length == 3) {
            var fixed_points = -1;
            var lines_1 = [];
            for (var j = 0; j < temp_points.length; j++) {
                temp_points[j].paired = true;
                if (temp_points[j].fixed != 0) {
                    if (temp_points[j] > temp_points[fixed_points]) {
                        fixed_points = j;
                    }
                }
                temp_points[j].crossBy.map(function (line) {
                    if (lines_1.indexOf(line) == -1) {
                        lines_1.push(line);
                    }
                });
            }
            if (fixed_points === -1) {
                var tcp = JSON.parse(JSON.stringify(temp_points[0]));
                tcp.crossBy = lines_1;
                three_cross_points.push(tcp);
            }
            else {
                var tcp = JSON.parse(JSON.stringify(temp_points[fixed_points]));
                tcp.crossBy = lines_1;
                three_cross_points.push(tcp);
            }
        }
        else if (temp_points.length >= 3) {
            console.warn("the accuracy range is too large !");
        }
        i++;
        if (i != cross_points.length) {
            return this.point_grouper(cross_points, accuracy_x, accuracy_y, three_cross_points, i);
        }
        else {
            return three_cross_points;
        }
    };
    return Utils;
}());
export default Utils;
