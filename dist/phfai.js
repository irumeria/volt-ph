import fs from 'fs';
import Utils from './utils.js';
var Phfai = (function () {
    function Phfai() {
        this.ACCURACY_GROUPER_X = 0.5;
        this.ACCURACY_GROUPER_Y = 0.05;
        this.R = 8.314;
        this.LN10 = 2.3;
        this.F = 96485;
        this.system_T = 298;
        this.zn_reactions = [
            ["Zn2+", 1, "H2O", "1", "H+", -2, "ZnO", -1],
            ["Zn", 1, "Zn2+", -1, "e", -2],
            ["Zn", 1, "H2O", 1, "H+", -2, "ZnO", -1, "e", -2],
            ["ZnO", 1, "H2O", 1, "ZnO22-", -1, "H+", -2],
            ["Zn", 1, "H2O", 2, "ZnO22-", -1, "H+", -4, "e", -2],
        ];
        this.water_reactions = [
            ["H2O", 2, "O2", -1, "H+", -4, "e", -4],
            ["H2", 1, "H+", -2, "e", -2]
        ];
    }
    Phfai.prototype.readData = function () {
        var _data;
        try {
            _data = JSON.parse(fs.readFileSync('./assets/gibbs.json', 'utf-8'));
        }
        catch (e) {
            console.error(e);
        }
        return _data;
    };
    Phfai.prototype.getGibbs_at_T = function (Gibbs_array, T) {
        return Gibbs_array[0] +
            Gibbs_array[1] * T +
            Gibbs_array[2] * T * Math.log(T) +
            Gibbs_array[3] * T * T +
            Gibbs_array[4] / T +
            Gibbs_array[5] / (T * T) +
            Gibbs_array[6] * Math.pow(T, 0.5) +
            Gibbs_array[7] * Math.pow(T, 3) +
            Gibbs_array[8] * Math.log(T);
    };
    Phfai.prototype.getGibbs_from_elements = function (element_array, ele_type) {
        for (var i = 0; i < element_array.length; i++) {
            var element = element_array[i];
            var temp_array = this.gibbsData[ele_type][element.content][element.status];
            var keys = Object.keys(temp_array);
            keys.sort();
            var selected_key = void 0;
            for (var item in keys) {
                if (element.T < Number(item)) {
                    selected_key = item;
                }
            }
            if (typeof (selected_key) == "undefined") {
                selected_key = keys.pop();
            }
            element.gibbs_energy = this.getGibbs_at_T(temp_array[selected_key], element.T);
            element_array[i] = element;
        }
        return element_array;
    };
    Phfai.prototype.cal_water_lines = function (alpha_array, index_begining) {
        var _this = this;
        if (index_begining === void 0) { index_begining = 0; }
        var other_reactions = this.water_reactions;
        var delta_oGs = [-236960 * 2, 0];
        var i = 0;
        var react_params = [];
        delta_oGs.map(function (g_theta) {
            var rp = [[0, -g_theta], 0, 0];
            var z = 0;
            var z_ph = 0;
            for (var j = 0; j < other_reactions[i].length; j += 2) {
                if (other_reactions[i][j] == "e") {
                    z = -1 * Number(other_reactions[i][j + 1]);
                }
                else if (other_reactions[i][j] == "H+") {
                    z_ph = Number(other_reactions[i][j + 1]);
                }
                else {
                    rp[0][1] += -1 * _this.R * _this.system_T * _this.LN10 *
                        Math.log10(Math.pow(alpha_array[other_reactions[i][j]], Number(other_reactions[i][j + 1])));
                }
            }
            if (z != 0) {
                rp[0][1] = rp[0][1] / (z * _this.F);
                rp[2] = 1;
                rp[1] = _this.R * _this.system_T * _this.LN10 / (z * _this.F) * z_ph;
            }
            else {
                rp[2] = 0;
                rp[1] = _this.R * _this.system_T * _this.LN10 * z_ph;
            }
            var array_head = [index_begining + i, 2];
            rp = array_head.concat(rp);
            react_params.push(rp);
            i++;
        });
        return react_params;
    };
    Phfai.prototype.get_Zn_phase = function (alpha_array) {
        var _this = this;
        this.gibbsData = this.readData();
        var gas_array = [
            { content: "O2", T: this.system_T, gibbs_energy: undefined, status: "gas" },
            { content: "H2", T: this.system_T, gibbs_energy: undefined, status: "gas" },
        ];
        var zn_array = [
            { content: "Zn", T: this.system_T, gibbs_energy: undefined, status: "solid" },
            { content: "Zn2+", T: this.system_T, gibbs_energy: undefined, status: "aq" },
            { content: "ZnO", T: this.system_T, gibbs_energy: undefined, status: "solid" },
            { content: "ZnO22-", T: this.system_T, gibbs_energy: undefined, status: "aq" }
        ];
        var other_array = [
            { content: "H2O", T: this.system_T, gibbs_energy: undefined, status: "liquid" },
            { content: "H+", T: this.system_T, gibbs_energy: undefined, status: "aq" }
        ];
        gas_array = this.getGibbs_from_elements(gas_array, "GAS");
        zn_array = this.getGibbs_from_elements(zn_array, "Zn");
        other_array = this.getGibbs_from_elements(other_array, "OTHER");
        var all_array = gas_array.concat(zn_array).concat(other_array);
        var reactions = this.zn_reactions;
        var delta_Gs = [];
        reactions.map(function (reaction) {
            var gibbs_sum = 0;
            var _loop_3 = function (i_1) {
                if (reaction[i_1] == "e") {
                    return "continue";
                }
                gibbs_sum += Number(reaction[i_1 + 1]) * all_array.filter(function (elem) { return elem.content == reaction[i_1]; })[0].gibbs_energy;
            };
            for (var i_1 = 0; i_1 < reaction.length; i_1 += 2) {
                _loop_3(i_1);
            }
            delta_Gs.push(gibbs_sum);
        });
        delta_Gs = [-66120, 147050, 80930, -165740, -84810];
        var react_params = [];
        var i = 0;
        delta_Gs.map(function (g_theta) {
            var rp = [-g_theta, 0, 0];
            var z = 0;
            var z_ph = 0;
            for (var j = 0; j < reactions[i].length; j += 2) {
                if (reactions[i][j] == "e") {
                    z = -1 * Number(reactions[i][j + 1]);
                }
                else if (reactions[i][j] == "H+") {
                    z_ph = Number(reactions[i][j + 1]);
                }
                else {
                    rp[0] += -1 * _this.R * _this.system_T * _this.LN10 *
                        Math.log10(Math.pow(alpha_array[reactions[i][j]], Number(reactions[i][j + 1])));
                }
            }
            if (z != 0) {
                rp[0] = rp[0] / (z * _this.F);
                rp[1] = 1;
                rp[2] = _this.R * _this.system_T * _this.LN10 / (z * _this.F) * z_ph;
            }
            else {
                rp[1] = 0;
                rp[2] = _this.R * _this.system_T * _this.LN10 * z_ph;
            }
            react_params.push(rp);
            i++;
        });
        var cross_points = Utils.lines_to_cross(react_params);
        var three_cross_points = Utils.point_grouper(cross_points, this.ACCURACY_GROUPER_X, this.ACCURACY_GROUPER_Y);
        var saveHalf = [];
        var _loop_1 = function (i_2) {
            if (three_cross_points[i_2].fixed == 0) {
                console.warn(" no solution for triple slope lines ");
                return { value: void 0 };
            }
            var line_1_index;
            three_cross_points[i_2].crossBy.map(function (index) {
                if (react_params[index][1] === 0 || react_params[index][2] === 0) {
                    line_1_index = index;
                }
            });
            var direction;
            var line_2_index;
            var line_3_index;
            var _loop_4 = function (j) {
                var reg = RegExp(/Zn/);
                if (reactions[line_1_index][j].toString().match(reg) && reactions[line_1_index][j + 1] > 0) {
                    three_cross_points[i_2].crossBy.map(function (index) {
                        var react_index = reactions[index].indexOf(reactions[line_1_index][j]);
                        if (react_index != -1 && index != line_1_index) {
                            if (reactions[index][react_index + 1] > 0) {
                                direction = false;
                            }
                            else {
                                direction = true;
                            }
                            line_2_index = index;
                        }
                        else if (index != line_1_index) {
                            line_3_index = index;
                        }
                    });
                    return "break";
                }
            };
            for (var j = 0; j < reactions[line_1_index].length; j++) {
                var state_2 = _loop_4(j);
                if (state_2 === "break")
                    break;
            }
            if (react_params[line_1_index][2] == 0) {
                saveHalf[line_1_index] = direction;
                saveHalf[line_2_index] = true;
                saveHalf[line_3_index] = false;
            }
            else {
                saveHalf[line_1_index] = !direction;
                saveHalf[line_2_index] = false;
                saveHalf[line_3_index] = true;
            }
        };
        for (var i_2 = 0; i_2 < three_cross_points.length; i_2++) {
            var state_1 = _loop_1(i_2);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        var fin_lines = [];
        var index_array = [];
        var i_array = [];
        var _loop_2 = function (i_3) {
            three_cross_points[i_3].crossBy.map(function (index) {
                var _old_i;
                if ((_old_i = index_array.indexOf(index)) >= 0) {
                    fin_lines[index] = [
                        index,
                        0,
                        three_cross_points[i_3].position,
                        three_cross_points[i_array[_old_i]].position
                    ];
                }
                else {
                    var _sh = -1;
                    if (saveHalf[index]) {
                        _sh = 1;
                    }
                    fin_lines[index] = [
                        index,
                        _sh,
                        three_cross_points[i_3].position,
                        react_params[index][2],
                        react_params[index][1]
                    ];
                    index_array.push(index);
                    i_array.push(i_3);
                }
            });
        };
        for (var i_3 = 0; i_3 < three_cross_points.length; i_3++) {
            _loop_2(i_3);
        }
        var water_lines = this.cal_water_lines(alpha_array, fin_lines.length);
        fin_lines = fin_lines.concat(fin_lines, water_lines);
        console.log(fin_lines);
        return fin_lines;
    };
    return Phfai;
}());
export { Phfai };
