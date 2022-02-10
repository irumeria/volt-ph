
// 各条线的交点的信息格式定义
export interface Intersection {
    crossBy: Array<number>, // 这个点是由哪些直线相交得来的
    fixed: number, // 移动线段制造三线交点时, 固定住横线和竖线, 不然结果不好看..., 1: 第一条线固定 2:第二条线固定 3:两条线同时固定 0:无
    position: Array<number>, // 交点的位置, 一个形如[x,y]的数组 
    paired: boolean, //  是否已经和另外一条直线配对成为三线交点
}
class Utils {

    /**
     * 递归求取一组直线的所有两两相交的交点, 最后返回交点组成的数组
     * 
     * 每一条直线是一个数组, 它的含义: [常数 c,电荷前系数 b, ph前系数 a] by = ax + c
     * 
     * @param react_params 存放直线的数组
     * @param cross_points 递归时自调用, 使用时不必传递
     * @param i 递归时自调用, 使用时不必传递
     * @returns 交点构成的数组, 它是满足格式 Intersection 的json
     */
    static lines_to_cross(react_params: Array<Array<number>>,
        cross_points: Array<Intersection> = [], i = 0): Array<Intersection> {
        for (let j = i + 1; j < react_params.length; j++) {
            let y_equal_value: Array<Array<number>> = [[], []];
            let if_parallel = false;
            let x: number, y: number;
            if (react_params[i][2] === 0 || react_params[j][2] === 0) { // 其中有一条是竖线
                if (!(react_params[i][2] === 0 && react_params[j][2] === 0)) {
                    if (react_params[i][2] === 0) {
                        y = react_params[i][0] / react_params[i][1];
                        x = (react_params[j][1] * y - react_params[j][0]) / react_params[j][2];
                    } else {
                        y = react_params[j][0] / react_params[j][1];
                        x = (react_params[i][1] * y - react_params[i][0]) / react_params[i][2];
                    }
                } else {
                    if_parallel = true;
                }
            } else if (react_params[i][1] === 0 || react_params[j][1] === 0) { // 其中有一条是横线
                if (!(react_params[i][1] === 0 && react_params[j][1] === 0)) {
                    if (react_params[i][1] === 0) {
                        x = -1 * react_params[i][0] / react_params[i][2];
                        y = (react_params[j][0] + react_params[j][2] * x) / react_params[j][1];
                    } else {
                        x = -1 * react_params[j][0] / react_params[j][2];
                        y = (react_params[i][0] + react_params[i][2] * x) / react_params[i][1];
                    }
                } else {
                    if_parallel = true;
                }
            } else {
                y_equal_value[0] = [react_params[i][0] / react_params[i][1], react_params[i][2] / react_params[i][1]];
                y_equal_value[1] = [react_params[j][0] / react_params[j][1], react_params[j][2] / react_params[j][1]];
                x = (y_equal_value[1][0] - y_equal_value[0][0]) /
                    (y_equal_value[0][1] - y_equal_value[1][1]); // x = (c2 - c1)/(k1 - k2)
                y = y_equal_value[0][1] * x + y_equal_value[0][0];
            }
            if (!if_parallel) {// 两线平行直接跳过
                let fixed = 0; // 固定住横线或竖线  1: 第一条线固定 2:第二条线固定 3:两条线同时固定 0:无
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
        } else {
            return cross_points
        }
    }
    /**
     * 从各个两线交点中配对出三线交点
     * 
     * @param cross_points 两线交点组成的数组
     * @param accuracy_x  获取三线交点的时候, x距离小于这个精度将会被认为是同一个点
     * @param accuracy_y  获取三线交点的时候, y距离小于这个精度将会被认为是同一个点
     * @param three_cross_points 函数自调用, 三线交点组成的数组, 不必传递
     * @param i 函数自调用, 不必传递
     * @returns 三线交点构成的数组
     */
    static point_grouper(cross_points: Array<Intersection>, accuracy_x: number, accuracy_y: number,
        three_cross_points: Array<Intersection> = [], i = 0): Array<Intersection> {
        let temp_points: Array<Intersection> = [];
        temp_points.push(cross_points[i]);
        for (let j = i + 1; j < cross_points.length; j++) {
            if (cross_points[j].paired === false) {
                if (Math.abs(cross_points[i].position[0] - cross_points[j].position[0]) < accuracy_x &&
                    Math.abs(cross_points[j].position[1] - cross_points[i].position[1]) < accuracy_y) {
                    temp_points.push(cross_points[j]);
                }
            }

        }
        if (temp_points.length == 3) { // 发现了被认为共点的三个交点
            let fixed_points = -1;
            let lines = [];
            for (let j = 0; j < temp_points.length; j++) {
                temp_points[j].paired = true; //  标记一下这个被pair了, 之后并不能再被其他点配对
                if (temp_points[j].fixed != 0) {
                    if(temp_points[j] > temp_points[fixed_points]){ // 出现多个, 固定住fixed最大的
                        fixed_points = j; 
                    }
                }
                // 找出三条点所共有的三条线, 放进lines里面
                temp_points[j].crossBy.map(line => {
                    if (lines.indexOf(line) == -1) { // 发现了lines里不存在的线的编号
                        lines.push(line);
                    }
                });
            }

            if (fixed_points === -1) { // 若没有需要固定的点, 简单地取第一个点的位置
                let tcp: Intersection = JSON.parse(JSON.stringify(temp_points[0])); // 深拷贝一下
                tcp.crossBy = lines;
                three_cross_points.push(tcp)
            } else { // 不然取固定的点
                let tcp: Intersection = JSON.parse(JSON.stringify(temp_points[fixed_points])); // 深拷贝一下
                tcp.crossBy = lines;
                three_cross_points.push(tcp)
            }
        } else if (temp_points.length >= 3) { // 精确度太宽以至于引入了无关点
            console.warn("the accuracy range is too large !");
        }
        i++;
        if (i != cross_points.length) {
            return this.point_grouper(cross_points, accuracy_x, accuracy_y, three_cross_points, i);
        } else {
            return three_cross_points
        }

    }
}
export default Utils;