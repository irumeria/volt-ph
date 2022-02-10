import { Phfai } from "./dist/phfai.js";
let phfai = new Phfai();
phfai.get_Zn_phase({
    "O2": 1,
    "H2": 1,
    "Zn2+": 1,
    "HZnO2-": 1,
    "ZnO22-": 1,
    "Zn(OH)2":1,
    "H2O":1,
    "Zn":1,
    "ZnO":1,
});