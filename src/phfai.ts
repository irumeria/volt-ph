// import data from "./gibbs.json" assert { type: "json" };
import fs from 'fs'
import { Intersection } from './utils.js'
import Utils from './utils.js'
interface Gibbs {
    GAS: Elem;
    OTHER: Elem;
    Zn: Elem;
    [propName: string]: any;
}
interface Elem {
    [propName: string]: [PureContent];
}
interface PureContent {
    gas?: Temperture_gibbs;
    aq?: Temperture_gibbs;
    liquid?: Temperture_gibbs;
    solid?: Temperture_gibbs;
}
interface Temperture_gibbs {
    [propName: string]: Array<number>;
}
//
interface Elem_info {
    T: number;
    content: string;
    status: string;
    gibbs_energy: number;
}

// 放活度的
interface Alpha_array {
    // "O2": number,
    // "H2": number,
    // "Zn2+": number,
    // "HZnO2-": number,
    // "ZnO22-": number,
    // "Zn(OH)2": number,
    // "H2O": number,
    // "Zn": number,
    [propName: string]: number
}

export class Phfai {
    // 常量定义
    ACCURACY_GROUPER_X: number = 0.5;   // 获取三线交点的时候, x距离小于这个精度将会被认为是同一个点
    ACCURACY_GROUPER_Y: number = 0.05;  /// 获取三线交点的时候, y距离小于这个精度将会被认为是同一个点
    R: number = 8.314;
    LN10: number = 2.3;
    F: number = 96485;
    system_T: number = 298;

    // 尝试去编码一个反应
    zn_reactions: Array<Array<string | number>> = [
        ["Zn2+", 1, "H2O", "1", "H+", -2, "ZnO", -1],
        ["Zn", 1, "Zn2+", -1, "e", -2],
        ["Zn", 1, "H2O", 1, "H+", -2, "ZnO", -1, "e", -2],
        ["ZnO", 1, "H2O", 1, "ZnO22-", -1, "H+", -2],
        ["Zn", 1, "H2O", 2, "ZnO22-", -1, "H+", -4, "e", -2],
    ];
    water_reactions:Array<Array<string | number>> = [
        ["H2O", 2, "O2", -1, "H+", -4, "e", -4],
        ["H2", 1, "H+", -2, "e", -2]
    ]

    gibbsData: Gibbs;

    readData(): Gibbs {
        let _data: Gibbs;
        try {
            _data = JSON.parse(fs.readFileSync('./assets/gibbs.json', 'utf-8'));
        } catch (e) {
            console.error(e);
        }
        // console.log(data,typeof data)
        return _data;
    }
    getGibbs_at_T(Gibbs_array: Array<number>, T: number): number {
        return Gibbs_array[0] +
            Gibbs_array[1] * T +
            Gibbs_array[2] * T * Math.log(T) +
            Gibbs_array[3] * T * T +
            Gibbs_array[4] / T +
            Gibbs_array[5] / (T * T) +
            Gibbs_array[6] * Math.pow(T, 0.5) +
            Gibbs_array[7] * Math.pow(T, 3) +
            Gibbs_array[8] * Math.log(T);
    }

    getGibbs_from_elements(element_array: Array<Elem_info>, ele_type: string): Array<Elem_info> {
        for (let i = 0; i < element_array.length; i++) {
            let element: Elem_info = element_array[i];
            let temp_array: Temperture_gibbs = this.gibbsData[ele_type][element.content][element.status];
            // 寻找合适的温度区间
            let keys: Array<string> = Object.keys(temp_array);
            keys.sort(); // 从小到大排序
            let selected_key: string;
            for (let item in keys) {
                if (element.T < Number(item)) {
                    selected_key = item;
                }
            }
            if (typeof (selected_key) == "undefined") {
                selected_key = keys.pop();
            }
            // console.log(temp_array,selected_key)
            element.gibbs_energy = this.getGibbs_at_T(temp_array[selected_key], element.T);
            element_array[i] = element;
        }
        return element_array;

    }
    /**
     * 
     * @param alpha_array 存放活度的数组
     * @param index_begining 线id的计数起始点
     * @returns 析氧线和析氢线组成的数组 二者格式满足:[线的id, 线type: {-1 保留负半段, 0 两端截取, 1 保留正半段, 2 直线},第一个点position , {第二个点position(type=0),b}, a]
     */
    cal_water_lines(alpha_array: Alpha_array,index_begining:number=0): Array<Array<number | Array<number>>>{
        let other_reactions: Array<Array<string | number>> = this.water_reactions;
        let delta_oGs: Array<number> = [-236960*2,0];
        let i = 0;
        // [线的id, 线type: {-1 保留负半段, 0 两端截取, 1 保留正半段, 2 直线},第一个点position , {第二个点position(type=0),b}, a]
        let react_params: Array<Array<number | Array<number>>> = [];
        delta_oGs.map(g_theta => {
            let rp: Array<number| Array<number>> = [[0,-g_theta], 0, 0];
            let z: number = 0;
            let z_ph: number = 0;
            for (let j = 0; j < other_reactions[i].length; j += 2) {
                if (other_reactions[i][j] == "e") {
                    z = -1 * Number(other_reactions[i][j + 1]);
                } else if (other_reactions[i][j] == "H+") {
                    z_ph = Number(other_reactions[i][j + 1]);
                } else {
                    rp[0][1] += -1 * this.R * this.system_T * this.LN10 *//-RTln10
                        Math.log10(
                            Math.pow(
                                alpha_array[other_reactions[i][j]],
                                Number(other_reactions[i][j + 1])
                            )
                        );
                }
            }
            if (z != 0) { // 反应有电荷转移
                rp[0][1] = rp[0][1] / (z * this.F);
                rp[2] = 1;
                rp[1] = this.R * this.system_T * this.LN10 / (z * this.F) * z_ph;
            } else {// 反应无电荷转移
                rp[2] = 0;
                rp[1] = this.R * this.system_T * this.LN10 * z_ph;
            }       
            let array_head:Array<number | Array<number>> = [index_begining+i,2]
            rp = array_head.concat(rp);
            react_params.push(rp);
            i++;
        })
        return react_params;
    }

    // 传入活度
    /**
     *  主函数, 求解出 Zn 的电位-PH图
     * @param alpha_array 
     */
    get_Zn_phase(alpha_array: Alpha_array): Array<Array<number | Array<number>>> {
        this.gibbsData = this.readData();

        let gas_array: Array<Elem_info> = [
            { content: "O2", T: this.system_T, gibbs_energy: undefined, status: "gas" },
            { content: "H2", T: this.system_T, gibbs_energy: undefined, status: "gas" },
        ]
        let zn_array: Array<Elem_info> = [
            { content: "Zn", T: this.system_T, gibbs_energy: undefined, status: "solid" },
            { content: "Zn2+", T: this.system_T, gibbs_energy: undefined, status: "aq" },
            { content: "ZnO", T: this.system_T, gibbs_energy: undefined, status: "solid" },
            { content: "ZnO22-", T: this.system_T, gibbs_energy: undefined, status: "aq" }
        ]
        let other_array: Array<Elem_info> = [
            { content: "H2O", T: this.system_T, gibbs_energy: undefined, status: "liquid" },
            { content: "H+", T: this.system_T, gibbs_energy: undefined, status: "aq" }
        ]
        gas_array = this.getGibbs_from_elements(gas_array, "GAS");
        zn_array = this.getGibbs_from_elements(zn_array, "Zn");
        other_array = this.getGibbs_from_elements(other_array, "OTHER");
        let all_array: Array<Elem_info> = gas_array.concat(zn_array).concat(other_array);
        /** 方案 1
         * 1. Zn2+ + 2e = Zn
         * 2. Zn2+ + 2H2O = 2H+ + Zn(OH)2
         * 3. Zn(OH)2 = HZnO- + H+
         * 4. HZnO- = ZnO2- + H+
         * 5. Zn(OH)2 + 2H+ + 2e = Zn + 2H2O 
         * 6. HZnO- + 3H+ + 2e = Zn + 2H2O
         * 7. ZnO2- + 4H+ + 2e = Zn + 2H2O 
         * 8. O2 + 4H+ + 4e = 2H2O
         * 9. 2H+ + 2e = H2 
         * ["Zn", 1, "Zn2+", -1, "e", -2],
         * ["Zn(OH)2", 2, "H+", 2, "H2O", -2, "Zn2+", -1],
         * ["HZnO2-", 1, "H+", 1, "Zn(OH)2", -1],
         * ["ZnO22-", 1, "H+", 1, "HZnO2-", -1],
         * ["Zn", 1, "H2O", 2, "Zn(OH)2", -1, "H+", -2, "e", -2],
         * ["Zn", 1, "H2O", 2, "HZnO2-", -1, "H+", -3, "e", -2],
         * ["Zn", 1, "H2O", 2, "ZnO22-", -1, "H+", -4, "e", 2],
         * */
        /** 方案 2
         * 1. ZnO + 2H+ = Zn2+ + H2O
         * 2. Zn2+ + 2e = Zn
         * 3. ZnO + 2H+ + 2e = Zn + H2O
         * 4. ZnO22- + 2H+ = ZnO + H2O
         * 5. ZnO22- + 2e + 4H+ = Zn + 2H2O
         * 
         * 6. O2 + 4H+ + 4e = 2H2O
         * 7. 2H+ + 2e = H2 
         * */
        
        let reactions: Array<Array<string | number>> = this.zn_reactions;

        // 计算各个反应的 标准 吉布斯自由能变
        let delta_Gs: Array<number> = [];
        reactions.map(reaction => {
            let gibbs_sum: number = 0;

            for (let i = 0; i < reaction.length; i += 2) {
                if (reaction[i] == "e") {
                    continue;
                }
                gibbs_sum += Number(reaction[i + 1]) * all_array.filter(
                    elem => elem.content == reaction[i]
                )[0].gibbs_energy;
            }
            delta_Gs.push(gibbs_sum);
        })


        // console.log(delta_Gs);

        // just for test =====
        delta_Gs = [-66120, 147050, 80930, -165740, -84810];
        // ===================

        // 计算各个反应在电位-ph图中的曲线方程
        let react_params: Array<Array<number>> = []; //第二层array为[常数,电荷前系数,ph前系数]
        let i = 0;
        delta_Gs.map(g_theta => {
            let rp: Array<number> = [-g_theta, 0, 0];
            let z: number = 0;
            let z_ph: number = 0;
            for (let j = 0; j < reactions[i].length; j += 2) {
                if (reactions[i][j] == "e") {
                    z = -1 * Number(reactions[i][j + 1]);
                } else if (reactions[i][j] == "H+") {
                    z_ph = Number(reactions[i][j + 1]);
                } else {
                    rp[0] += -1 * this.R * this.system_T * this.LN10 *//-RTln10
                        Math.log10(
                            Math.pow(
                                alpha_array[reactions[i][j]],
                                Number(reactions[i][j + 1])
                            )
                        );
                }
            }
            if (z != 0) { // 反应有电荷转移
                rp[0] = rp[0] / (z * this.F);
                rp[1] = 1;
                rp[2] = this.R * this.system_T * this.LN10 / (z * this.F) * z_ph;
            } else {// 反应无电荷转移
                rp[1] = 0;
                rp[2] = this.R * this.system_T * this.LN10 * z_ph;
            }
            react_params.push(rp);
            i++;
        })
        // console.log(react_params);

        // 获取数组内线的所有两线交点
        let cross_points: Array<Intersection> = Utils.lines_to_cross(react_params);
        // console.log(cross_points);

        // 从各个两线交点中配对出三线交点
        let three_cross_points: Array<Intersection> = Utils.point_grouper(cross_points, this.ACCURACY_GROUPER_X, this.ACCURACY_GROUPER_Y);

        // console.log(three_cross_points);

        // 接下来开始判断各个直线在交点上的截取情况
        let saveHalf: Array<boolean> = []; // true: 右半段, 竖线的下半段 false: 左半段, 竖线的上半段
        for (let i = 0; i < three_cross_points.length; i++) { // 遍历每个三线交点
            if (three_cross_points[i].fixed == 0) {
                console.warn(" no solution for triple slope lines ");
                return;
            }
            let line_1_index: number;
            three_cross_points[i].crossBy.map(
                index => {
                    if (react_params[index][1] === 0 || react_params[index][2] === 0) {
                        line_1_index = index; // 第一步, 找到斜率为 0 或 inf 的那条线
                    }
                }
            )
            // 第二步, 判断它的顺逆
            let direction: boolean; // true:顺 false:逆
            let line_2_index: number; // 含生成物线
            let line_3_index: number; // 含反应物线
            for (let j = 0; j < reactions[line_1_index].length; j++) {
                let reg = RegExp(/Zn/); // TO DO: 没有更好的能应对多反应物的配对方式了吗?
                if (reactions[line_1_index][j].toString().match(reg) && reactions[line_1_index][j + 1] > 0) { // 找到生成物!
                    three_cross_points[i].crossBy.map(
                        index => {
                            // 接下来找到另外两个反应中拥有这个生成物的反应, 
                            // 看看对于它是生成物还是反应物
                            let react_index: number = reactions[index].indexOf(reactions[line_1_index][j]);           
                            if (react_index != -1 && index != line_1_index) {
                                if (reactions[index][react_index+1] > 0) {
                                    direction = false; // 同时对于line_2为生成物
                                } else {
                                    direction = true;
                                }
                                line_2_index = index; // 找到共有生成物线
                            } else if (index != line_1_index) {
                                line_3_index = index; // 找到共有反应物物线
                            }
                        }
                    )
                    break;
                }
            }
            // 第三步, 由下表得到另外二者的截取情况
            /**
             * ax/ay	line1-2		->	含生成物线(共区域2)		含反应物线(共区域1)	
             *  0		正					正						负
             *  0		负					正						负
             *  inf		正					负						正
             *  inf		负					负						正
             */
            // console.log(line_1_index,direction)
            if (react_params[line_1_index][2] == 0) {
                saveHalf[line_1_index] = direction;
                saveHalf[line_2_index] = true;
                saveHalf[line_3_index] = false;
            } else {
                saveHalf[line_1_index] = !direction;
                saveHalf[line_2_index] = false;
                saveHalf[line_3_index] = true;
            }
        }
        // console.log(saveHalf)

        // 用于存放修正完成的数组
        let fin_lines: Array<Array<number | Array<number>>> = [];

        // 先找到两点都被固定的数组
        let index_array: Array<number> = [];
        let i_array: Array<number> = [];
        // [线的id, 线type: {-1 保留负半段, 0 两端截取, 1 保留正半段, 2 直线},第一个点position , {第二个点position(type=0),b}, a]
        for (let i = 0; i < three_cross_points.length; i++) {
            three_cross_points[i].crossBy.map(
                index => {
                    let _old_i: number;
                    if ((_old_i = index_array.indexOf(index)) >= 0) {
                        fin_lines[index] = [
                            index,
                            0,
                            three_cross_points[i].position,
                            three_cross_points[i_array[_old_i]].position
                        ];
                    } else {
                        let _sh = -1;
                        if (saveHalf[index]) {
                            _sh = 1;
                        }
                        fin_lines[index] = [
                            index,
                            _sh,
                            three_cross_points[i].position,
                            react_params[index][2],
                            react_params[index][1]
                        ];
                        index_array.push(index);
                        i_array.push(i);
                    }
                }
            )
        }
        let water_lines = this.cal_water_lines(alpha_array,fin_lines.length);
        fin_lines = fin_lines.concat(fin_lines,water_lines);
        console.log(fin_lines);
        return fin_lines;
    }
}