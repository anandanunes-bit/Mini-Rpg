const STORAGE_KEY = "guardiao-da-floresta-v1";
const initialGameState = {
    player: { maxHealth: 100, health: 100, potions: 3, defending: false },
    enemy: { name: "Slime Sombrio", maxHealth: 80, health: 80 },
    battleFinished: false,
    log: ["A batalha começou."]
};
let gameState = structuredClone(initialGameState);

function selectRequiredElement(selector) {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`Elemento não encontrado: ${selector}`);
    return element;
}
const elements = {
    playerHealthText: selectRequiredElement("#player-health-text"),
    playerHealthBar: selectRequiredElement("#player-health-bar"),
    potionCount: selectRequiredElement("#potion-count"),
    defenseStatus: selectRequiredElement("#defense-status"),
    enemyName: selectRequiredElement("#enemy-name"),
    enemyHealthText: selectRequiredElement("#enemy-health-text"),
    enemyHealthBar: selectRequiredElement("#enemy-health-bar"),
    turnMessage: selectRequiredElement("#turn-message"),
    attackButton: selectRequiredElement("#attack-button"),
    defendButton: selectRequiredElement("#defend-button"),
    healButton: selectRequiredElement("#heal-button"),
    restartButton: selectRequiredElement("#restart-button"),
    clearSaveButton: selectRequiredElement("#clear-save-button"),
    battleLog: selectRequiredElement("#battle-log")
};

function randomInteger(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
function limitValue(v, min, max){ return Math.min(Math.max(v, min), max); }
function calculatePercentage(c, m){ return limitValue((c / m) * 100, 0, 100); }
function updateHealthBar(bar, cur, max){
    const p = calculatePercentage(cur, max);
    bar.style.width = `${p}%`;
    bar.classList.toggle("danger", p <= 30);
}
function renderLog(){
    elements.battleLog.innerHTML = "";
    gameState.log.forEach((msg) => {
        const item = document.createElement("li");
        item.textContent = msg.text ?? msg;
        if (msg.type) item.classList.add(msg.type);
        elements.battleLog.appendChild(item);
    });
    elements.battleLog.scrollTop = elements.battleLog.scrollHeight;
}
function renderGame(){
    elements.playerHealthText.textContent = `${gameState.player.health} / ${gameState.player.maxHealth}`;
    elements.enemyHealthText.textContent = `${gameState.enemy.health} / ${gameState.enemy.maxHealth}`;
    elements.potionCount.textContent = gameState.player.potions;
    elements.enemyName.textContent = gameState.enemy.name;
    elements.defenseStatus.textContent = gameState.player.defending ? "Defesa preparada" : "Defesa inativa";
    updateHealthBar(elements.playerHealthBar, gameState.player.health, gameState.player.maxHealth);
    updateHealthBar(elements.enemyHealthBar, gameState.enemy.health, gameState.enemy.maxHealth);
    elements.attackButton.disabled = gameState.battleFinished;
    elements.defendButton.disabled = gameState.battleFinished;
    elements.healButton.disabled = gameState.battleFinished || gameState.player.potions <= 0;
    elements.restartButton.hidden = !gameState.battleFinished;
    renderLog();
}
function addLog(message, type=""){ gameState.log.push({text:message, type}); if(gameState.log.length>30) gameState.log.shift(); }
function saveGame(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState)); }catch(e){} }
function loadGame(){
    try{
        const saved = localStorage.getItem(STORAGE_KEY);
        if(!saved) return false;
        gameState = JSON.parse(saved);
        return true;
    }catch(e){ localStorage.removeItem(STORAGE_KEY); gameState = structuredClone(initialGameState); return false; }
}
function finishBattle(msg, type){ gameState.battleFinished = true; elements.turnMessage.textContent = msg; addLog(msg, type); saveGame(); renderGame(); }
function checkBattleResult(){
    if(gameState.enemy.health <= 0){ gameState.enemy.health=0; finishBattle("Vitória! O Guardião protegeu a floresta.", "success"); return true; }
    if(gameState.player.health <= 0){ gameState.player.health=0; finishBattle("Derrota. A criatura dominou esta parte da floresta.", "danger"); return true; }
    return false;
}
function enemyTurn(){
    if(gameState.battleFinished) return;
    let damage = randomInteger(8, 18);
    if(gameState.player.defending){ damage = Math.ceil(damage/2); gameState.player.defending=false; addLog(`A defesa reduziu o ataque inimigo para ${damage} de dano.`, "warning"); }
    else{ addLog(`${gameState.enemy.name} causou ${damage} de dano.`, "danger"); }
    gameState.player.health = limitValue(gameState.player.health - damage, 0, gameState.player.maxHealth);
    elements.turnMessage.textContent = "Sua vez. Escolha uma ação.";
    checkBattleResult(); saveGame(); renderGame();
}
function attack(){
    if(gameState.battleFinished) return;
    const damage = randomInteger(12, 24);
    gameState.enemy.health = limitValue(gameState.enemy.health - damage, 0, gameState.enemy.maxHealth);
    elements.turnMessage.textContent = `Você atacou e causou ${damage} de dano.`;
    addLog(`O Guardião atacou e causou ${damage} de dano.`, "success");
    if(!checkBattleResult()) enemyTurn();
}
function defend(){
    if(gameState.battleFinished) return;
    gameState.player.defending = true;
    elements.turnMessage.textContent = "Você preparou a defesa.";
    addLog("O Guardião assumiu postura defensiva.", "warning");
    saveGame(); renderGame(); enemyTurn();
}
function heal(){
    if(gameState.battleFinished || gameState.player.potions<=0) return;
    const rec = randomInteger(18, 32);
    gameState.player.health = limitValue(gameState.player.health + rec, 0, gameState.player.maxHealth);
    gameState.player.potions -= 1;
    elements.turnMessage.textContent = `Você recuperou ${rec} de vida.`;
    addLog(`Usou poção. Restam ${gameState.player.potions}.`, "success");
    saveGame(); renderGame(); enemyTurn();
}
function restartGame(){ gameState = structuredClone(initialGameState); localStorage.removeItem(STORAGE_KEY); elements.turnMessage.textContent="Nova batalha iniciada."; saveGame(); renderGame(); }
function clearSavedProgress(){ localStorage.removeItem(STORAGE_KEY); elements.turnMessage.textContent="Progresso apagado."; renderGame(); }
function registerEvents(){
    elements.attackButton.addEventListener("click", attack);
    elements.defendButton.addEventListener("click", defend);
    elements.healButton.addEventListener("click", heal);
    elements.restartButton.addEventListener("click", restartGame);
    elements.clearSaveButton.addEventListener("click", clearSavedProgress);
}
function initializeGame(){ loadGame(); registerEvents(); renderGame(); elements.turnMessage.textContent="Escolha sua primeira ação."; }
document.addEventListener("DOMContentLoaded", initializeGame);
