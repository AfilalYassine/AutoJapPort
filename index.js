const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const JSSoup = require("jssoup").default
const axios = require("axios")
const fs = require("fs")
const inquirer = require("inquirer")
const figlet = require("figlet")
const chalk = require("chalk")
const passive_skill = require("./passiveSkill")
let nodb = false
const db_jap = new sqlite3.Database(path.resolve('./databases/db_jap.db'),sqlite3.OPEN_READONLY,(err)=>{
})

const db_glo = new sqlite3.Database(path.resolve('./databases/db_glo.db'),sqlite3.OPEN_READONLY,(err)=>{ 
})

const path1 = path.join(__dirname, "config.json")
if (!fs.existsSync(path1)){
    fs.appendFileSync("./config.json",`{\n    "whitelist":[\n\n    ],\n    "banned":[\n\n    ],\n    "whitelistEZA":[\n\n    ],\n    "bannedEZA":[\n\n    ]\n,    "language":false}`)
}
let config = fs.readFileSync('config.json');
config = JSON.parse(config);


async function query(query,db){
    return new Promise(function(resolve,reject){
        db.all(query, function(err,rows){
           if(err){return reject(err);}
           resolve(rows);
         });
    });
}
const text_fr = {
    no_db_jap: "❌ ERREUR | La database JAP est absente. Elle doit être dans le chemin suivant : `/databases/db_jap.db`",
    no_db_glo: "❌ ERREUR | La database GLO est absente. Elle doit être dans le chemin suivant : `/databases/db_glo.db`",
    choose_option: "Veuillez choisir une option",
    cards_t: "Générer toutes les exclus JAP",
    cards_wl: "Générer seulement les persos dans la whitelist (fichier \"config.json\")",
    ztur_t: "Générer tous les ZTUR",
    ztr_wl: "Générer seulement les ZTUR dans le fichier config.json",
    misc_sql: "Générer le fichier misc.sql",
    leave: "Quitter",
    end_generation: "Génération terminée !",
    effect_packs: "Génération de la table effect_packs...",
    awakening_set: "Génération de la table card_awakening_sets...",
    japan_port_sql: "Génération du fichier \"japan_port.sql\" en cours...",
    eza_port_sql: "Génération du fichier \"eza_port.sql\" en cours...",
    generated: "a été généré"
}

const text_en = {
    no_db_jap: "❌ ERROR | The JP database is missing. It should be in the following path : `/databases/db_jap.db`",
    no_db_glo: "❌ ERROR | The GLB database is missing. It should be in the following path : `/databases/db_glo.db`",
    choose_option: "Please choose an option",
    cards_t: "Import all JP exclusives cards",
    cards_wl: "Import only JP exclusives cards in the whitelist (\"config.json\" file)",
    ztur_t: "Import all JP exlusives EZA",
    ztr_wl: "Import only JP exclusives EZAs in the whitelist (\"config.json\" file)",
    misc_sql: "Generate the misc.sql file",
    leave: "Exit",
    end_generation: "Done !",
    effect_packs: "Generating the effect_packs table...",
    awakening_set: "Generating the card_awakening_sets table...",
    japan_port_sql: "Generating the \"japan_port.sql\" file...",
    eza_port_sql: "Generating the \"eza_port.sql\" file...",
    generated: "has been imported"
}

let text = {}
if (config.language === "fr") {
    text = text_fr
}
if (config.language === "en") {
    text = text_en
}


async function includeEffect_Pack(){
    let folders = []
    console.log(chalk.blue.bold(text.effect_packs))
    let effect_pack_glo = await query(`SELECT * FROM effect_packs`,db_glo)
    let effect_pack_jap = await query(`SELECT * FROM effect_packs`,db_jap)
    let difference = []
    fs.writeFileSync('./misc.sql', '');
    for (let index = 0; index < effect_pack_jap.length; index++) {
        const element = effect_pack_jap[index];

        if (effect_pack_glo.find(e => e.id === element.id)) continue;
        else difference.push(element)
        
    }

    for (let index = 0; index < difference.length; index++) {
        const element = difference[index]
        fs.appendFileSync('./misc.sql', `INSERT OR REPLACE INTO effect_packs(id,category,name,pack_name,scene_name,red,green,blue,alpha,lite_flicker_rate,created_at,updated_at) VALUES(${element.id},${element.category},'${element.name}','${element.pack_name}','${element.scene_name}',${element.red},${element.green},${element.blue},${element.alpha},${element.lite_flicker_rate},'${element.created_at}','${element.updated_at}');\n`);
        if (!folders.includes(element.pack_name)){
            folders.push(element.pack_name)
        }
    }
    fs.appendFileSync('./misc.sql', `\n\n\n`);
    for (let index = 0; index < folders.length; index++) {
        const element = folders[index];
        fs.appendFileSync('./misc.sql', `-- ${element}\n`);

    }
    await getCausalities()
    return console.log(chalk.greenBright.bold(text.end_generation))

}
async function getCausalities() {
    console.log(chalk.blue.bold(text.awakening_set))
    let effect_pack_glo = await query(`SELECT * FROM card_awakening_sets`,db_glo)
    let effect_pack_jap = await query(`SELECT * FROM card_awakening_sets`,db_jap)
    let difference = []

    for (let index = 0; index < effect_pack_jap.length; index++) {
        const element = effect_pack_jap[index];

        if (effect_pack_glo.find(e => e.id === element.id)) continue;
        else difference.push(element)
        
    }

    for (let index = 0; index < difference.length; index++) {
        const element = difference[index]
        fs.appendFileSync('./misc.sql', `INSERT OR REPLACE INTO card_awakening_sets(id,name,description,created_at,updated_at) VALUES(${element.id},'${element.name}','${element.description}','${element.created_at}','${element.updated_at}');\n`);
    }
    return null

}

async function tradAll(whitelist){
    async function getExclus(){
        let cards_jap = await query("SELECT * FROM cards",db_jap)
        let cards_glo = await query("SELECT * FROM cards",db_glo)
        let exclusjap = []
        for (let index = 0; index < cards_jap.length; index++) {
        const card = cards_jap[index];
        if (cards_glo.find(e => e.id === card.id)) continue;
        const firstDigitStr = String(card.id)[0];
        const firstDigitNum = Number(firstDigitStr);
    
        if (firstDigitNum !== 1 && firstDigitNum !==4) continue;
        
        exclusjap.push(card)
        }
        return exclusjap
    }
    let exclusjap = await getExclus()
    let appliedPassives = []
    let appliedLeaders = []
    let appliedSAs = []
    let appliedChara = []
    let applieduniqInfos = []
    let applied = []
    let appliedAS = []
    async function implementCard(card){
        let param_no = []
        let viewIDS = []
        const lastDigit1Str = String(card.id).slice(-1);
        const lastDigit1Num = Number(lastDigit1Str);
        fs.appendFileSync('./japan_port.sql', `INSERT OR REPLACE INTO cards(id,name,character_id,card_unique_info_id,cost,rarity,hp_init,hp_max,atk_init,atk_max,def_init,def_max,element,lv_max,skill_lv_max,grow_type,optimal_awakening_grow_type,price,exp_type,training_exp,special_motion,passive_skill_set_id,leader_skill_set_id,link_skill1_id,link_skill2_id,link_skill3_id,link_skill4_id,link_skill5_id,link_skill6_id,link_skill7_id,eball_mod_min,eball_mod_num100,eball_mod_mid,eball_mod_mid_num,eball_mod_max,eball_mod_max_num,max_level_reward_id,max_level_reward_type,collectable_type,face_x,face_y,aura_id,aura_scale,aura_offset_x,aura_offset_y,is_aura_front,is_selling_only,awakening_number,resource_id,bg_effect_id,selling_exchange_point,awakening_element_type,potential_board_id,open_at,created_at,updated_at) VALUES(${card.id},'${card.name}',${card.character_id},${card.card_unique_info_id},${card.cost},${card.rarity},${card.hp_init},${card.hp_max},${card.atk_init},${card.atk_max},${card.def_init},${card.def_max},${card.element},${card.lv_max},${card.skill_lv_max},${card.grow_type},${card.optimal_awakening_grow_type},${card.price},${card.exp_type},${card.training_exp},${card.special_motion},${card.passive_skill_set_id},${card.leader_skill_set_id},${card.link_skill1_id},${card.link_skill2_id},${card.link_skill3_id},${card.link_skill4_id},${card.link_skill5_id},${card.link_skill6_id},${card.link_skill7_id},${card.eball_mod_min},${card.eball_mod_num100},${card.eball_mod_mid},${card.eball_mod_mid_num},${card.eball_mod_max},${card.eball_mod_max_num},${card.max_level_reward_id},${card.max_level_reward_type},${card.collectable_type},${card.face_x},${card.face_y},${card.aura_id},${card.aura_scale},${card.aura_offset_x},${card.aura_offset_y},${card.is_aura_front},${card.is_selling_only},${card.awakening_number},${card.resource_id},${card.bg_effect_id},${card.selling_exchange_point},${card.awakening_element_type},${card.potential_board_id},'${card.open_at}','${card.created_at}','${card.updated_at}');\n`);
        if (!appliedPassives.includes(card.passive_skill_set_id)){
            let passiveSQL = await passive_skill.importPassive(card)
            param_no = param_no.concat(passiveSQL.param_no)
            fs.appendFileSync('./japan_port.sql', passiveSQL.SQLCode);
            appliedPassives.push(card.passive_skill_set_id)
        }

        if (!appliedLeaders.includes(card.leader_skill_set_id)){
            let leaderSQL = await passive_skill.importLeader(card)
            fs.appendFileSync('./japan_port.sql', leaderSQL);
            appliedLeaders.push(card.leader_skill_set_id)
        }
        if (lastDigit1Num === 1){
            let SAsImport = await passive_skill.importSAs(card,appliedSAs,viewIDS)
            fs.appendFileSync('./japan_port.sql', SAsImport.SQLCode)
            appliedSAs = appliedSAs.concat(SAsImport.appliedSAs)
            viewIDS = viewIDS.concat(SAsImport.viewIDS)
        }

        let activeSkill = await query(`SELECT * FROM card_active_skills WHERE card_id=${card.id}`,db_jap)
        if (activeSkill.length > 0){
            activeSkill = activeSkill[0]
            let activeSkillSet = await query(`SELECT * FROM active_skill_sets WHERE id=${activeSkill.active_skill_set_id}`,db_jap)
            activeSkillSet = activeSkillSet[0]
            let ASimport = await passive_skill.importAS(card,activeSkillSet.condition_description,activeSkillSet.name,activeSkillSet.effect_description)
            fs.appendFileSync('./japan_port.sql', ASimport.SQLCode)
            viewIDS = viewIDS.concat(ASimport.viewIDS)
            param_no = param_no.concat(ASimport.param_no)
        }
        fs.appendFileSync('./japan_port.sql',await passive_skill.importViews(viewIDS));
        if (!appliedChara.includes(card.character_id)){
            let charas = await passive_skill.importChara(card,card.name)
            fs.appendFileSync('./japan_port.sql',charas)
            appliedChara.push(card.character_id)
        }
        fs.appendFileSync('./japan_port.sql',await passive_skill.categorie(card));


        if (!applieduniqInfos.includes(card.card_unique_info_id)){
            fs.appendFileSync('./japan_port.sql',await passive_skill.importUniqueInfos(card));
            applieduniqInfos.push(card.card_unique_info_id)
        }

        if (param_no.length > 0){
            fs.appendFileSync('./japan_port.sql',await passive_skill.importBattle_params(param_no));
        }
        fs.appendFileSync("./japan_port.sql",await passive_skill.importAwakRoutes(card))
        

        
        return {
            id: card.id,
            name: card.name
        }
    }

    let rawdata = fs.readFileSync('config.json');
    rawdata = JSON.parse(rawdata);
    banned = rawdata.banned

    fs.writeFileSync('./japan_port.sql', '')
    console.log(chalk.blue.bold(text.japan_port_sql))
    if (whitelist === null){
        for (let index = 0; index < exclusjap.length; index++) {
            const element = exclusjap[index];
            if (banned.includes(element.id)) continue;
            let carte = await implementCard(element)
            console.log(chalk.green(`✔️ ${carte.name} | ${carte.id} ${text.generated}`))
        }
    } else {
        for (let index = 0; index < exclusjap.length; index++) {
            const element = exclusjap[index];
            if (!whitelist.includes(element.id)) continue;
            let carte = await implementCard(element)
            console.log(chalk.green(`✔️ ${carte.name} | ${carte.id} ${text.generated}`))
        }
    }
    
    console.log(chalk.green.bold(text.end_generation))
    

}
async function ZTURAll(whitelist){
    fs.writeFileSync('./eza_port.sql', '')
    async function getZTURDiff(){
        let optimal_jap = await query("SELECT * FROM optimal_awakening_growths",db_jap)
        let optimal_glo = await query("SELECT * FROM optimal_awakening_growths",db_glo)
        let optimal_exclus = []
        let japan_eza_eclus = []
        for (let index = 0; index < optimal_jap.length; index++) {
            const growth = optimal_jap[index];
            if (optimal_glo.find(e => e.optimal_awakening_grow_type === growth.optimal_awakening_grow_type)) continue;
            if (optimal_exclus.includes(growth.optimal_awakening_grow_type)) continue;
            optimal_exclus.push(growth.optimal_awakening_grow_type)
        }
        for (let index = 0; index < optimal_exclus.length; index++) {
            const optimal = optimal_exclus[index];
            let card = await query(`SELECT * FROM cards WHERE optimal_awakening_grow_type=${optimal}`,db_jap)
            card = card[0]
            japan_eza_eclus.push(card)

            
        }
        return japan_eza_eclus
    }
    let cards = await getZTURDiff()
    async function port_eza(card) {
        let leaderSkills = []
        let passiveSkills = []
        fs.appendFileSync('./eza_port.sql',`UPDATE cards SET optimal_awakening_grow_type = ${card.optimal_awakening_grow_type} WHERE id=${card.id};\n`); 
        let optimal_awakenings = await query(`SELECT * FROM optimal_awakening_growths WHERE optimal_awakening_grow_type=${card.optimal_awakening_grow_type}`,db_jap)

        for (let index = 0; index < optimal_awakenings.length; index++) {
            const awakening = optimal_awakenings[index];
            fs.appendFileSync('./eza_port.sql',`INSERT OR REPLACE INTO optimal_awakening_growths(id,optimal_awakening_grow_type,step,lv_max,skill_lv_max,passive_skill_set_id,leader_skill_set_id) VALUES(${awakening.id},${awakening.optimal_awakening_grow_type},${awakening.step},${awakening.lv_max},${awakening.skill_lv_max},${awakening.passive_skill_set_id},${awakening.leader_skill_set_id});\n`);
            if (!leaderSkills.includes(awakening.leader_skill_set_id)){
                leaderSkills.push(awakening.leader_skill_set_id)
            }
            if (!passiveSkills.includes(awakening.passive_skill_set_id)){
                passiveSkills.push(awakening.passive_skill_set_id)
            } 
        }

        for (let index = 0; index < passiveSkills.length; index++) {
            const passif_id = passiveSkills[index];
            let passiveRelations = await query(`SELECT * FROM passive_skill_set_relations WHERE passive_skill_set_id=${passif_id}`,db_jap)
            let passivesID = []
            let passif_glo = await query(`SELECT * FROM passive_skill_sets WHERE id=${passif_id}`,db_glo)
            let passif_jap = await query(`SELECT * FROM passive_skill_sets WHERE id=${passif_id}`,db_jap)
            passif_jap = passif_jap[0]
            if (passif_glo.length > 0) continue;
            fs.appendFileSync('./eza_port.sql', (await passive_skill.importPassive(card)).SQLCode);
            

        }

        for (let index = 0; index < leaderSkills.length; index++) {
            const leader_id = leaderSkills[index];
            let leader_glo = await query(`SELECT * FROM leader_skill_sets WHERE id=${leader_id}`,db_glo)
            let leader_jap = await query(`SELECT * FROM leader_skill_sets WHERE id=${leader_id}`,db_jap)
            leader_jap = leader_jap[0]
            if (leader_glo.length > 0) continue;
            fs.appendFileSync('./eza_port.sql', await passive_skill.importLeader(card));
        }
        let spes_0 = await query(`SELECT * FROM card_specials WHERE card_id=${card.id - 1}`,db_jap)
        let spes_1 = await query(`SELECT * FROM card_specials WHERE card_id=${card.id}`,db_jap)

        for (let index = 0; index < spes_1.length; index++) {
            const SA = spes_1[index];
            let spe_set = await query(`SELECT * FROM special_sets WHERE id=${SA.special_set_id}`,db_jap)
            spe_set = spe_set[0]
            if (card.rarity === 5){
                var minimum = 24
            } else var minimum = 14
            if (SA.lv_start < minimum) continue;
            var sp_name = spe_set.name
            var sp_desc = spe_set.description
            var sp_cond = spe_set.causality_description

            if (sp_cond !== null) sp_cond = `'${sp_cond.replaceAll("'", "''")}'`
            var special_asset_id = null
            if (SA.special_asset_id !== null) special_asset_id = SA.special_asset_id
            let view_id = await query(`SELECT * FROM special_views WHERE id=${SA.view_id}`,db_jap)
            view_id = view_id[0]
            view_id = await query(`SELECT * FROM special_views WHERE script_name='${view_id.script_name}'`,db_glo)
            if (SA.causality_conditions !== null) SA.causality_conditions = `'${SA.causality_conditions}'`
            if (view_id.length > 0){
                SA.view_id = view_id[0].id
                fs.appendFileSync('./eza_port.sql',`INSERT OR REPLACE INTO card_specials(id,card_id,special_set_id,priority,style,lv_start,eball_num_start,view_id,card_costume_condition_id,special_bonus_id1,special_bonus_lv1,bonus_view_id1,special_bonus_id2,special_bonus_lv2,bonus_view_id2,causality_conditions,special_asset_id,created_at,updated_at) VALUES(${SA.id},${SA.card_id},${SA.special_set_id},${SA.priority},'${SA.style}',${SA.lv_start},${SA.eball_num_start},${SA.view_id},${SA.card_costume_condition_id},${SA.special_bonus_id1},${SA.special_bonus_lv1},${SA.bonus_view_id1},${SA.special_bonus_id2},${SA.special_bonus_lv2},${SA.bonus_view_id2},${SA.causality_conditions},${special_asset_id},'${SA.created_at}','${SA.updated_at}');\n`);  
                fs.appendFileSync('./eza_port.sql',`INSERT OR REPLACE INTO special_sets(id,name,description,causality_description,aim_target,increase_rate,lv_bonus,created_at,updated_at) VALUES(${spe_set.id},'${sp_name}','${sp_desc}',${sp_cond},${spe_set.aim_target},${spe_set.increase_rate},${spe_set.lv_bonus},'${spe_set.created_at}','${spe_set.updated_at}');\n`);
  
            } else {
                let view_id = await query(`SELECT * FROM special_views WHERE id=${SA.view_id}`,db_jap)
                view_id = view_id[0]
                fs.appendFileSync('./eza_port.sql',`INSERT OR REPLACE INTO special_views(id,script_name,cut_in_card_id,special_name_no,special_motion,lite_flicker_rate,energy_color,special_category_id,created_at,updated_at) VALUES(${view_id.id},'${view_id.script_name}',${view_id.cut_in_card_id},${view_id.special_name_no},${view_id.special_motion},${view_id.lite_flicker_rate},${view_id.energy_color},${view_id.special_category_id},'${view_id.created_at}','${view_id.updated_at}');\n`);
                fs.appendFileSync('./eza_port.sql',`INSERT OR REPLACE INTO card_specials(id,card_id,special_set_id,priority,style,lv_start,eball_num_start,view_id,card_costume_condition_id,special_bonus_id1,special_bonus_lv1,bonus_view_id1,special_bonus_id2,special_bonus_lv2,bonus_view_id2,causality_conditions,special_asset_id,created_at,updated_at) VALUES(${SA.id},${SA.card_id},${SA.special_set_id},${SA.priority},'${SA.style}',${SA.lv_start},${SA.eball_num_start},${SA.view_id},${SA.card_costume_condition_id},${SA.special_bonus_id1},${SA.special_bonus_lv1},${SA.bonus_view_id1},${SA.special_bonus_id2},${SA.special_bonus_lv2},${SA.bonus_view_id2},${SA.causality_conditions},${special_asset_id},'${SA.created_at}','${SA.updated_at}');\n`);
                fs.appendFileSync('./eza_port.sql',`INSERT OR REPLACE INTO special_sets(id,name,description,causality_description,aim_target,increase_rate,lv_bonus,created_at,updated_at) VALUES(${spe_set.id},'${sp_name}','${sp_desc}',${sp_cond},${spe_set.aim_target},${spe_set.increase_rate},${spe_set.lv_bonus},'${spe_set.created_at}','${spe_set.updated_at}');\n`);
                }
            
            let specials = await query(`SELECT * FROM specials WHERE special_set_id=${SA.special_set_id}`,db_jap)
            for (let index = 0; index < specials.length; index++) {
                const special = specials[index];
                fs.appendFileSync('./eza_port.sql',`INSERT OR REPLACE INTO specials(id,special_set_id,type,efficacy_type,target_type,calc_option,turn,prob,causality_conditions,eff_value1,eff_value2,eff_value3,created_at,updated_at) VALUES(${special.id},${special.special_set_id},'${special.type}',${special.efficacy_type},${special.target_type},${special.calc_option},${special.turn},${special.prob},${special.causality_conditions},${special.eff_value1},${special.eff_value2},${special.eff_value3},'${special.created_at}','${special.updated_at}');\n`);
            }
        }
        for (let index = 0; index < spes_0.length; index++) {
            const SA = spes_0[index];
            let view_id = await query(`SELECT * FROM special_views WHERE id=${SA.view_id}`,db_jap)
            view_id = view_id[0]
            view_id = await query(`SELECT * FROM special_views WHERE script_name='${view_id.script_name}'`,db_glo)
            var special_asset_id = null
            if (SA.special_asset_id !== null) special_asset_id = SA.special_asset_id
            if (view_id.length > 0){
                SA.view_id = view_id[0].id
                fs.appendFileSync('./eza_port.sql',`INSERT OR REPLACE INTO card_specials(id,card_id,special_set_id,priority,style,lv_start,eball_num_start,view_id,card_costume_condition_id,special_bonus_id1,special_bonus_lv1,bonus_view_id1,special_bonus_id2,special_bonus_lv2,bonus_view_id2,causality_conditions,special_asset_id,created_at,updated_at) VALUES(${SA.id},${SA.card_id},${SA.special_set_id},${SA.priority},'${SA.style}',${SA.lv_start},${SA.eball_num_start},${SA.view_id},${SA.card_costume_condition_id},${SA.special_bonus_id1},${SA.special_bonus_lv1},${SA.bonus_view_id1},${SA.special_bonus_id2},${SA.special_bonus_lv2},${SA.bonus_view_id2},${SA.causality_conditions},${special_asset_id},'${SA.created_at}','${SA.updated_at}');\n`);    
            } else {
                let view_id = await query(`SELECT * FROM special_views WHERE id=${SA.view_id}`,db_jap)
                view_id = view_id[0]
                fs.appendFileSync('./eza_port.sql',`INSERT OR REPLACE INTO special_views(id,script_name,cut_in_card_id,special_name_no,special_motion,lite_flicker_rate,energy_color,special_category_id,created_at,updated_at) VALUES(${view_id.id},'${view_id.script_name}',${view_id.cut_in_card_id},${view_id.special_name_no},${view_id.special_motion},${view_id.lite_flicker_rate},${view_id.energy_color},${view_id.special_category_id},'${view_id.created_at}','${view_id.updated_at}');\n`);
                fs.appendFileSync('./eza_port.sql',`INSERT OR REPLACE INTO card_specials(id,card_id,special_set_id,priority,style,lv_start,eball_num_start,view_id,card_costume_condition_id,special_bonus_id1,special_bonus_lv1,bonus_view_id1,special_bonus_id2,special_bonus_lv2,bonus_view_id2,causality_conditions,special_asset_id,created_at,updated_at) VALUES(${SA.id},${SA.card_id},${SA.special_set_id},${SA.priority},'${SA.style}',${SA.lv_start},${SA.eball_num_start},${SA.view_id},${SA.card_costume_condition_id},${SA.special_bonus_id1},${SA.special_bonus_lv1},${SA.bonus_view_id1},${SA.special_bonus_id2},${SA.special_bonus_lv2},${SA.bonus_view_id2},${SA.causality_conditions},${special_asset_id},'${SA.created_at}','${SA.updated_at}');\n`);    
            }
        }
        return {
            name: card.name,
            id: card.id
        }  
        
    }
    let rawdata = fs.readFileSync('config.json');
    rawdata = JSON.parse(rawdata);
    banned = rawdata.bannedEZA

    console.log(chalk.blue.bold(text.eza_port_sql))
    
    if (whitelist === null){
        for (let index = 0; index < cards.length; index++) {
            const element = cards[index];
            if (banned.includes(element.id)) continue;
            let carte = await port_eza(element)
            console.log(chalk.green(`✔️ ${carte.name} | ${carte.id} ${text.generated}`))
        }
    } else {
        for (let index = 0; index < cards.length; index++) {
            const element = cards[index];
            if (!whitelist.includes(element.id)) continue;
            let carte = await port_eza(element)
            console.log(chalk.green(`✔️ ${carte.name} | ${carte.id} ${text.generated}`))
        }
    }
    
    console.log(chalk.green.bold(text.end_generation))
    
}


async function main(){
    let nodb = false
    const path_db1 = path.join(__dirname, "/databases/db_jap.db")
    if (!config.language || (config.language !== "en" && config.language !== "fr")){
        console.log(chalk.blue("ERREUR | Pas de language ! Veuillez changer la valeur de \"language\" dans le fichier config.json par \"fr\""))
        return console.log(chalk.red("ERROR | No language choosen ! Please change the value of \"language\" in the file config.json to \"en\""))
    }
    
    if (!fs.existsSync(path_db1)){
        console.log(chalk.red(text.no_db_jap))
        nodb = true
    }
    const path_db2 = path.join(__dirname, "/databases/db_glo.db")
    if (!fs.existsSync(path_db2)){
        console.log(chalk.red(text.no_db_glo))
        nodb = true
    }
    if (nodb) return;
    console.log(chalk.redBright(figlet.textSync('Auto Jap Port', { horizontalLayout: 'fitted' })))
    let prompt = await inquirer.prompt([{
        type: 'list',
        message: text.choose_option,
        name: "option",
        choices: [text.cards_t,text.cards_wl,text.ztur_t,text.ztr_wl,text.misc_sql,chalk.red(text.leave)]
    }])
    let choice = prompt.option
    if (choice === text.cards_t){
        await tradAll(null)
        return main()
    }
    if (choice === text.misc_sql){
        await includeEffect_Pack()
        return main()
    }

    if (choice === cards_wl){
        let rawdata = fs.readFileSync('config.json');
        rawdata = JSON.parse(rawdata);
        whitelist = rawdata.whitelist
        await tradAll(whitelist)
        return main()
    }
    if (choice === text.ztur_t){
        await ZTURAll(null)
        return main()
    }
    if (choice === text.ztr_wl){
        let rawdata = fs.readFileSync('config.json');
        rawdata = JSON.parse(rawdata);
        whitelist = rawdata.whitelistEZA
        await ZTURAll(whitelist)
        return main()
    }
    if (choice === chalk.red(text.leave)){
        return;
    }
}
main()









