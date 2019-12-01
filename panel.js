var isListening = false;
var maxLogLength = 30000;
var partyData = {};
var party = [];
var currentFormation = [];
var total = undefined;
var totalTurn = 1;
var eventLog = [];
var preciseValues = new Set(["avg_attacks", "critical_rate", "avg_echoes"]);

var tracing = false;

function refreshUi () {
    document.querySelector("#startstop").textContent = isListening ? "Stop" : "Start";
};

function startListening () {
    isListening = true;
    refreshUi();
};

function stopListening () {
    isListening = false;
    refreshUi();
};

// save to .json
function saveSummary() {
    if(partyData.length == 0) return;
    var json = JSON.stringify(Object.values(partyData), null, 2);
    var file = new Blob([json], {type: "text/plain"});
    var a = document.createElement("a"), url = URL.createObjectURL(file);
    a.href = url;
    a.download = "Summary_" + JSON.stringify(new Date().getTime()) + ".json"
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);  
    }, 0); 
}

function saveLog() {
    if(partyData.length == 0) return;
    var json = JSON.stringify(eventLog, null, 2);
    var file = new Blob([json], {type: "text/plain"});
    var a = document.createElement("a"), url = URL.createObjectURL(file);
    a.href = url;
    a.download = "Log_" + JSON.stringify(new Date().getTime()) + ".json"
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);  
    }, 0); 
}

function formatValue (value, isFloat) {
    if ((typeof (value) !== "number") || Number.isNaN(value))
        return value;

    if (value <= 2048) {
        return value.toFixed(isFloat ? 2 : 0);
    } else if (value <= 2048000) {
        return (value / 1000).toFixed(1) + "k";
    } else {
        return (value / 1000000).toFixed(2) + "m";
    }
};

function refreshRow (data) {
    if (data.num_turns > 0) {
        data.avg_damage = data.total_damage / data.num_turns;
        data.avg_attacks = (data.num_attacks + data.num_charge_attacks) / data.num_turns;
        data.avg_healing = data.total_healing / data.num_turns;
        data.avg_echoes = data.num_echoes / Math.max(data.num_attacks, 1);
    } else {
        data.avg_damage = data.avg_attacks = 
            data.avg_healing = data.avg_echoes = 0;
    }
    data.num_triple_or_more_attacks = data.num_triple_attacks + data.num_four_or_more_attacks;

    if (data.num_criticals + data.num_noncriticals > 0)
        data.critical_rate = (data.num_criticals / (data.num_criticals + data.num_noncriticals)) * 100;
    else
        data.critical_rate = 0;

    if (data.num_charge_attacks)
        data.avg_ca_damage = data.total_ca_damage / data.num_charge_attacks;
    else
        data.avg_ca_damage = 0;

    if (data.num_skills)
        data.avg_skill_damage = data.total_skill_damage / data.num_skills;
    else
        data.avg_skill_damage = 0;

    for (var k in data) {
        if (k == "row")
            continue;

        var elt = data.row.querySelector('value-display[key="' + k + '"]');
        if (!elt)
            continue;

        elt.textContent = formatValue(data[k], preciseValues.has(k));
    }
};

function refreshTotal (total) {
    if(partyData.length < 2) return;

    total.total_damage = 0;
    total.num_attacks = 0;
    total.total_healing = 0;
    total.avg_damage = 0;
    total.avg_attacks = 0;
    total.avg_healing = 0;
    total.total_ca_damage = 0;
    total.num_charge_attacks= 0;
    total.num_triple_or_more_attacks= 0;
    total.num_four_or_more_attacks= 0;
    total.avg_ca_damage = 0;
    total.total_skill_damage = 0;
    total.num_skills = 0;
    total.avg_skill_damage = 0;
    total.num_criticals = 0;
    total.num_noncriticals = 0;
    total.total_echo_damage = 0;
    total.num_single_attacks = 0;
    total.num_double_attacks = 0;
    total.num_triple_attacks = 0;
    total.num_echoes = 0;

    for (var i in partyData) {
        if (i == "Party") continue;
        if (partyData.hasOwnProperty(i)) {
            if(partyData[i].num_turns > total.num_turns) total.num_turns = partyData[i].num_turns;
            total.total_damage += partyData[i].total_damage;
            total.num_attacks += partyData[i].num_attacks;
            total.total_healing += partyData[i].total_healing;
            total.total_ca_damage += partyData[i].total_ca_damage;
            total.num_charge_attacks += partyData[i].num_charge_attacks;
            total.num_triple_or_more_attacks += partyData[i].num_triple_or_more_attacks;
            total.num_four_or_more_attacks += partyData[i].num_four_or_more_attacks;
            total.total_skill_damage += partyData[i].total_skill_damage;
            total.num_skills += partyData[i].num_skills;
            total.num_criticals += partyData[i].num_criticals;
            total.num_noncriticals += partyData[i].num_noncriticals;
            total.total_echo_damage += partyData[i].total_echo_damage;
            total.num_single_attacks += partyData[i].num_single_attacks;
            total.num_double_attacks += partyData[i].num_double_attacks;
            total.num_triple_attacks += partyData[i].num_triple_attacks;
            total.num_echoes += partyData[i].num_echoes;
        }
    }

    if (total.num_turns > 0) {
        total.avg_damage = total.total_damage / total.num_turns;
        total.avg_attacks = total.num_attacks / total.num_turns;
        total.avg_healing = total.total_healing / total.num_turns;
        total.avg_echoes = total.num_echoes / total.num_attacks;
    } else {
        total.avg_damage = total.avg_attacks = 
            total.avg_healing = total.critical_rate = total.avg_echoes = 0;
    }

    if (total.num_criticals + total.num_noncriticals > 0)
        total.critical_rate = (total.num_criticals / (total.num_criticals + total.num_noncriticals)) * 100;
    else
        total.critical_rate = 0;

    if (total.num_charge_attacks)
        total.avg_ca_damage = total.total_ca_damage / total.num_charge_attacks;
    else
        total.avg_ca_damage = 0;

    if (total.num_skills)
        total.avg_skill_damage = total.total_skill_damage / total.num_skills;
    else
        total.avg_skill_damage = 0;

    for (var k in total) {
        if (k == "row")
            continue;

        var elt = total.row.querySelector('value-display[key="' + k + '"]');
        if (!elt)
            continue;

        elt.textContent = formatValue(total[k], preciseValues.has(k));
    }
};
function newPartyData (name) {
    return {
        name: name,
        total_damage: 0,
        total_healing: 0,
        total_ca_damage: 0,
        total_skill_damage: 0,
        total_echo_damage: 0,
        num_criticals: 0,
        num_noncriticals: 0,
        num_attacks: 0,
        num_single_attacks: 0,
        num_double_attacks: 0,
        num_triple_attacks: 0,
        num_charge_attacks: 0,
        num_triple_or_more_attacks: 0,
        num_four_or_more_attacks: 0,
        num_echoes: 0,
        num_turns: 0,
        num_skills: 0
    };
};

function copySummary () {
    var json = JSON.stringify(Object.values(partyData), null, 2);
    navigator.clipboard.writeText(json);
};

function copyLog () {
    var json = JSON.stringify(eventLog, null, 2);
    navigator.clipboard.writeText(json);
};

function showTurns () {
    var elt = document.querySelector("#turns");
    var btn = document.querySelector("#showTurns");
    if (elt.classList.contains("show")) {
        elt.classList.remove("show");
        btn.textContent = "Show Turns";
    } else {
        elt.classList.add("show");
        btn.textContent = "Hide Turns";
    }
};

function resetData () {
    partyData = {};
    party = [];
    total = null;
    currentFormation = [];
    totalTurn = 1;
    eventLog = [];
    document.querySelector("div#data").textContent = "";
    document.querySelector("div#turns").textContent = "";
    console.log("reset")
};

function instantiate (templateSelector) {
    var template = document.querySelector(templateSelector);
    var instance = document.importNode(template.content, true);
    var element = document.createElement("div");
    element.appendChild(instance);
    return element;
};

function updateFormation(formation) {
    if(formation == undefined) return false;;
    currentFormation = [];
    console.log(formation);
    for(var i = 0; i < formation.length; i++) {
        currentFormation.push(parseInt(formation[i]));
    }
    return true;
}

function onStart(player, formation) {
    total = partyData["Party"]
    if(!total)
    {
        partyData["Party"] = total = newPartyData("Party");
        var partyRow = instantiate("template.data-row");
        partyRow.className = "data-row";
        partyRow.setAttribute("data-name", "Party");
        document.querySelector("div#data").appendChild(partyRow);
        total.row = partyRow;
    }
    for (var i = 0; i < player.number; i++) {
        var pm = player.param[i].name;
        var data = partyData[pm];
        if (!data) {
            partyData[pm] = data = newPartyData(pm);
            var partyRow = instantiate("template.data-row");
            partyRow.className = "data-row";
            partyRow.setAttribute("data-name", pm);
            document.querySelector("div#data").appendChild(partyRow);
            data.row = partyRow;
        }
        party[i] = data;
    }
    updateFormation(formation);
}

function onActionResult(scenario, actionType, formation) {
    if(total == undefined) return;

    var totalAttacksThisTurn = 0, totalChargeAttacksThisTurn = 0;
    var totalDamageThisTurn = 0;
    var attacksThisTurn = [0, 0, 0, 0, 0, 0];
    var lastAttackIndex = [-1, -1, -1, -1, -1, -1];
    var shouldRecordSkill = [false, false, false, false];

    var isTurn = actionType == "normal_attack_result";
    var switchFlag = updateFormation(formation);
    for (var i = 0; i < currentFormation.length; i++) {
        if (isTurn)
            party[currentFormation[i]].num_turns += 1;
    }

    if (isTurn) {
        eventLog.push({ type: "new_turn", actionType: actionType });
    } else {
        eventLog.push({ type: "action", actionType: actionType });
    }

    var mostRecentAbilityUser = -1;
    var chainMembers = [], isChain = false;
    var abilityFlag = false; // hack: white damage fix

    for (var i = 0, l = scenario.length; i < l; i++) {
        var s = scenario[i];
        var recordEvent = false;

        console.log(s.cmd, s.from, s.to, s);
        var pos = currentFormation[s.pos]
        switch (s.cmd) {
            case "ability":
                if (s.to != "player" || switchFlag) {
                    mostRecentAbilityUser = -1;
                } else {
                    mostRecentAbilityUser = pos;
                    shouldRecordSkill[pos] = true;
                    recordEvent = true;
                    abilityFlag = true; // hack: white damage fix
                }
                break;

            case "chain_cutin":
                isChain = true;
                mostRecentAbilityUser = -1;
                break;

            case "damage":
                if ((mostRecentAbilityUser < 0) && !isChain)
                    continue;
                if (s.to != "boss" && !isChain)
                    continue;

                recordEvent = true;

                for (var j = 0; j < s.list.length; j++) {
                    var item = s.list[j];

                    if (!abilityFlag && item.color == undefined && !isChain) continue; // hack: white damage fix

                    if (isChain) {
                        totalDamageThisTurn += item.value;
                        for (var k = 0; k < chainMembers.length; k++) {
                            var data = partyData[chainMembers[k]];
                            var scaled = item.value / chainMembers.length;
                            data.total_damage += scaled;
                            data.total_ca_damage += scaled;
                        }
                    } else {
                        // FIXME: Increase attack count?
                        var data = party[mostRecentAbilityUser];
                        data.total_skill_damage += item.value;
                        data.total_damage += item.value;

                        if (shouldRecordSkill[mostRecentAbilityUser]) {
                            shouldRecordSkill[mostRecentAbilityUser] = false;
                            data.num_skills += 1;
                        }

                        if (item.color != 0) {
                            if (item.critical)
                                data.num_criticals += 1;
                            else data.num_noncriticals += 1;
                        }
                    }
                }
                isChain = false; // important for stuff like pig-post turn skill

                break;

            case "loop_damage":
                if ((mostRecentAbilityUser < 0) && !isChain)
                    continue;
                if (s.to != "boss")
                    continue;

                var data = party[mostRecentAbilityUser];

                //var isCrit = false; // multihit skills are always not critting for some reason, viramate problem?

                recordEvent = true;

                // ???????? cygames????????
                for (var j in s.list) {
                    var item = s.list[j];

                    for (var k = 0; k < item.length; k++) {
                        var subitem = item[k];
                        // FIXME: Tag team?
                        
                        if (shouldRecordSkill[mostRecentAbilityUser]) {
                            shouldRecordSkill[mostRecentAbilityUser] = false;
                            data.num_skills += 1;
                        }

                        totalDamageThisTurn += subitem.value;
                        data.total_skill_damage += subitem.value;
                        data.total_damage += subitem.value;

                        // multi hit skills not working
                        //if (subitem.critical) isCrit = true;
                    }
                }

                //if (isCrit) // think of white damage if I ever put it up
                //    data.num_criticals += 1;
                //else data.num_noncriticals += 1;

                break;

            case "special_npc":
            case "special":
            case "attack":
                // FIXME: Tag team?
                mostRecentAbilityUser = -1;

                if ((s.from != "player") && (s.cmd != "special_npc") && (s.target != "boss"))
                    continue;

                var isOugi = (s.cmd != "attack");

                var data = party[pos];

                if (isOugi) {
                    chainMembers.push(data.name);
                    data.num_charge_attacks += 1;
                    totalChargeAttacksThisTurn += 1;
                }

                var firstList = (isOugi ? s.list : s.damage);

                var isCrit = false;

                for (var j = 0; firstList && (j < firstList.length); j++) {
                    var item = firstList[j];

                    var secondList = (isOugi ? item.damage : item);

                    // oh my god cygames what the fuck
                    for (var k = 0; k < secondList.length; k++) {
                        var subitem = secondList[k];

                        if (!isOugi) {
                            if (lastAttackIndex[pos] != subitem.attack_count) {
                                attacksThisTurn[pos] += 1;
                            } else {
                                data.num_echoes += 1;
                                data.total_echo_damage += subitem.value;
                            }
                        }

                        if (subitem.critical) isCrit = true;

                        lastAttackIndex[pos] = subitem.attack_count;

                        totalDamageThisTurn += subitem.value;
                        data.total_damage += subitem.value;
                        if (isOugi)
                            data.total_ca_damage += subitem.value;
                    }

                }

                // hacky: ougi bonus damage
                mostRecentAbilityUser = pos;
                shouldRecordSkill[pos] = true;

                if (isCrit) data.num_criticals += 1;
                else data.num_noncriticals += 1;

                lastAttackIndex[pos] = -1;
                recordEvent = true;

                break;

            case "heal":
                if (s.to != "player")
                    continue;

                for (var j = 0; j < s.list.length; j++) {
                    var item = s.list[j];
                    var data = party[item.pos];
                    data.total_healing += parseInt(item.value);
                }

                recordEvent = true;

                break;

            case "summon":
                for (var j = 0; j < s.list.length; j++) {
                    console.log(s.list[j].damage);
                    for (var h = 0; h < s.list[j].damage.length; h++) {
                        console.log(s.list[j].damage[h]);
                        var item = s.list[j].damage[h];
                        if(item != undefined) {
                            console.log(party[item.pos]);
                            var data = party[item.pos];
                            data.total_skill_damage += item.value;
                            data.total_damage += item.value;
                        }
                    }
                }

                recordEvent = true;

                break;

            case "message":
            case "condition":
                recordEvent = true;
                abilityFlag = false; // hack: white damage fix
                break;

        }

        if (recordEvent)
            eventLog.push(s);
    }

    for (var i = 0; i < party.length; i++) {
        if(!currentFormation.includes(i)) continue;
        switch (attacksThisTurn[i]) {
            case 1:
                party[i].num_single_attacks++;
                break;
            case 2:
                party[i].num_double_attacks++;
                break;
            case 3:
                party[i].num_triple_attacks++;
                break;
            default:
                if (attacksThisTurn[i] > 3)
                    party[i].num_four_or_more_attacks++;
                // idk what to do here.
                break;
        }
        party[i].num_attacks += attacksThisTurn[i];
        totalAttacksThisTurn += attacksThisTurn[i];
        refreshRow(party[i]);
    }
    refreshTotal(total);
    var excess = eventLog.length - maxLogLength;
    if (excess > 100) {
        console.log("Event log full. Dropping old entries.");
        eventLog.splice(0, excess);
    }

    if (isTurn) {
        var turnElt = instantiate("template.turn-row");
        turnElt.className = "turn-row";
        turnElt.querySelector('[key="turn"]').textContent = totalTurn;
        totalTurn += 1;
        turnElt.querySelector('[key="attacks"]').textContent = totalAttacksThisTurn;
        turnElt.querySelector('[key="charge_attacks"]').textContent = totalChargeAttacksThisTurn;
        turnElt.querySelector('[key="total_damage"]').textContent = formatValue(totalDamageThisTurn, false);
        var turns = document.querySelector("div#turns");
        if (!turns.hasChildNodes())
            turns.appendChild(turnElt);
        else
            turns.insertBefore(turnElt, turns.firstElementChild);
    }
};

function onLoad () {
    window.addEventListener('load', function startstop(event){
        var button = document.getElementById('startstop');
        button.addEventListener('click', function() { isListening ? stopListening() : startListening(); });
    });
    window.addEventListener('load', function reset(event){
        var button = document.getElementById('reset');
        button.addEventListener('click', function() { resetData(); });
    });
    window.addEventListener('load', function reset(event){
        var button = document.getElementById('copy');
        button.addEventListener('click', function() { copySummary(); });
    });
    window.addEventListener('load', function reset(event){
        var button = document.getElementById('save');
        button.addEventListener('click', function() { saveSummary(); });
    });
    window.addEventListener('load', function reset(event){
        var button = document.getElementById('copyLog');
        button.addEventListener('click', function() { copyLog(); });
    });
    window.addEventListener('load', function reset(event){
        var button = document.getElementById('saveLog');
        button.addEventListener('click', function() { saveLog(); });
    });
    window.addEventListener('load', function reset(event){
        var button = document.getElementById('showTurns');
        button.addEventListener('click', function() { showTurns(); });
    });
    chrome.devtools.network.onRequestFinished.addListener(request => {
      request.getContent((body) => {
        if (request.request && request.request.url) {
          if (request.request.url.includes("http://game.granbluefantasy.jp/rest/raid/") || request.request.url.includes("http://game.granbluefantasy.jp/rest/multiraid/")) {
            chrome.runtime.sendMessage({
                response: body
            });
            if(isListening){
              var actionType = request.request.url.slice(
                request.request.url.lastIndexOf("/") + 1, request.request.url.indexOf(".json")
              );
              if(actionType == "start"){
                var result = JSON.parse(body);
                onStart(result["player"], result["formation"]);
              }
              else{
                var result = JSON.parse(body);
                onActionResult(result["scenario"], actionType, result["status"]["formation"]);
              }
            }
          }
        }
      });
    });
    console.log("Loaded");
    startListening();
};

window.addEventListener("DOMContentLoaded", onLoad, false);