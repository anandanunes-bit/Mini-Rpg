const STORAGE_KEY = "guardiao-da-floresta-v1";

const initialGameState = {
    player: {
        maxHealth: 100,
        health: 100,
        potions: 3,
        defending: false
    },
    enemy: {
        name: "Slime Sombrio",
        maxHealth: 80,
        health: 80
    },
    battleFinished: false,
    log: ["A batalha começou."]
};

let gameState = structuredClone(initialGameState);

function selectRequiredElement(selector) {
    const element = document.querySelector(selector);

    if (!element) {
        throw new Error(`Elemento obrigatório não encontrado: ${selector}`);
    }

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

function randomInteger(minimum, maximum) {
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum)) {
        throw new TypeError("Os limites do sorteio devem ser números inteiros.");
    }

    if (minimum > maximum) {
        throw new RangeError("O valor mínimo não pode ser maior que o máximo.");
    }

    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function limitValue(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}

function calculatePercentage(currentValue, maximumValue) {
    if (maximumValue <= 0) {
        throw new RangeError("O valor máximo deve ser maior que zero.");
    }

    return limitValue((currentValue / maximumValue) * 100, 0, 100);
}

function updateHealthBar(barElement, currentHealth, maximumHealth) {
    const percentage = calculatePercentage(currentHealth, maximumHealth);

    barElement.style.width = `${percentage}%`;
    barElement.classList.toggle("danger", percentage <= 30);
}

function renderLog() {
    elements.battleLog.innerHTML = "";

    gameState.log.forEach((message) => {
        const item = document.createElement("li");

        item.textContent = message.text ?? message;

        if (message.type) {
            item.classList.add(message.type);
        }

        elements.battleLog.appendChild(item);
    });

    elements.battleLog.scrollTop = elements.battleLog.scrollHeight;
}

function renderGame() {
    elements.playerHealthText.textContent =
        `${gameState.player.health} / ${gameState.player.maxHealth}`;

    elements.enemyHealthText.textContent =
        `${gameState.enemy.health} / ${gameState.enemy.maxHealth}`;

    elements.potionCount.textContent = gameState.player.potions;
    elements.enemyName.textContent = gameState.enemy.name;

    elements.defenseStatus.textContent = gameState.player.defending
        ? "Defesa preparada"
        : "Defesa inativa";

    updateHealthBar(
        elements.playerHealthBar,
        gameState.player.health,
        gameState.player.maxHealth
    );

    updateHealthBar(
        elements.enemyHealthBar,
        gameState.enemy.health,
        gameState.enemy.maxHealth
    );

    elements.attackButton.disabled = gameState.battleFinished;
    elements.defendButton.disabled = gameState.battleFinished;
    elements.healButton.disabled =
        gameState.battleFinished || gameState.player.potions <= 0;

    elements.restartButton.hidden = !gameState.battleFinished;

    renderLog();
}

function addLog(message, type = "") {
    gameState.log.push({
        text: message,
        type
    });

    if (gameState.log.length > 30) {
        gameState.log.shift();
    }
}

function saveGame() {
    try {
        const serializedState = JSON.stringify(gameState);
        localStorage.setItem(STORAGE_KEY, serializedState);
    } catch (error) {
        console.error("Não foi possível salvar o jogo.", error);
        elements.turnMessage.textContent =
            "A partida continua, mas o progresso não pôde ser salvo.";
    }
}

function isValidSavedState(savedState) {
    if (!savedState || typeof savedState !== "object") {
        return false;
    }

    const player = savedState.player;
    const enemy = savedState.enemy;

    return Boolean(
        player &&
        enemy &&
        Number.isFinite(player.maxHealth) &&
        Number.isFinite(player.health) &&
        Number.isFinite(player.potions) &&
        typeof player.defending === "boolean" &&
        typeof enemy.name === "string" &&
        Number.isFinite(enemy.maxHealth) &&
        Number.isFinite(enemy.health) &&
        typeof savedState.battleFinished === "boolean" &&
        Array.isArray(savedState.log)
    );
}

function loadGame() {
    try {
        const savedText = localStorage.getItem(STORAGE_KEY);

        if (!savedText) {
            return false;
        }

        const savedState = JSON.parse(savedText);

        if (!isValidSavedState(savedState)) {
            throw new Error("O progresso salvo possui uma estrutura inválida.");
        }

        gameState = savedState;
        return true;
    } catch (error) {
        console.error("Falha ao recuperar o progresso.", error);

        localStorage.removeItem(STORAGE_KEY);
        gameState = structuredClone(initialGameState);

        addLog(
            "O progresso salvo estava inválido e foi reiniciado.",
            "warning"
        );

        return false;
    }
}

function finishBattle(message, type) {
    gameState.battleFinished = true;
    elements.turnMessage.textContent = message;
    addLog(message, type);

    saveGame();
    renderGame();
}

function checkBattleResult() {
    if (gameState.enemy.health <= 0) {
        gameState.enemy.health = 0;
        finishBattle(
            "Vitória! O Guardião protegeu a floresta.",
            "success"
        );
        return true;
    }

    if (gameState.player.health <= 0) {
        gameState.player.health = 0;
        finishBattle(
            "Derrota. A criatura dominou esta parte da floresta.",
            "danger"
        );
        return true;
    }

    return false;
}

function enemyTurn() {
    if (gameState.battleFinished) {
        return;
    }

    let damage = randomInteger(8, 18);

    if (gameState.player.defending) {
        damage = Math.ceil(damage / 2);
        gameState.player.defending = false;

        addLog(
            `A defesa reduziu o ataque inimigo para ${damage} de dano.`,
            "warning"
        );
    } else {
        addLog(
            `${gameState.enemy.name} causou ${damage} de dano.`,
            "danger"
        );
    }

    gameState.player.health = limitValue(
        gameState.player.health - damage,
        0,
        gameState.player.maxHealth
    );

    elements.turnMessage.textContent = "Sua vez. Escolha uma ação.";

    checkBattleResult();
    saveGame();
    renderGame();
}

function attack() {
    if (gameState.battleFinished) {
        return;
    }

    try {
        const damage = randomInteger(12, 24);

        gameState.enemy.health = limitValue(
            gameState.enemy.health - damage,
            0,
            gameState.enemy.maxHealth
        );

        elements.turnMessage.textContent =
            `Você atacou e causou ${damage} de dano.`;

        addLog(
            `O Guardião atacou e causou ${damage} de dano.`,
            "success"
        );

        if (!checkBattleResult()) {
            enemyTurn();
        }
    } catch (error) {
        handleUnexpectedError(error);
    }
}

function defend() {
    if (gameState.battleFinished) {
        return;
    }

    try {
        gameState.player.defending = true;

        elements.turnMessage.textContent =
            "Você preparou a defesa para o próximo ataque.";

        addLog(
            "O Guardião assumiu uma postura defensiva.",
            "warning"
        );

        saveGame();
        renderGame();
        enemyTurn();
    } catch (error) {
        handleUnexpectedError(error);
    }
}

function heal() {
    if (gameState.battleFinished) {
        return;
    }

    try {
        if (gameState.player.potions <= 0) {
            throw new Error("Não existem poções disponíveis.");
        }

        if (gameState.player.health >= gameState.player.maxHealth) {
            throw new Error("A vida já está completa.");
        }

        const recoveredHealth = randomInteger(18, 32);

        gameState.player.health = limitValue(
            gameState.player.health + recoveredHealth,
            0,
            gameState.player.maxHealth
        );

        gameState.player.potions -= 1;

        elements.turnMessage.textContent =
            `Você recuperou até ${recoveredHealth} pontos de vida.`;

        addLog(
            `O Guardião utilizou uma poção. Restam ${gameState.player.potions}.`,
            "success"
        );

        saveGame();
        renderGame();
        enemyTurn();
    } catch (error) {
        elements.turnMessage.textContent = error.message;
        addLog(error.message, "warning");
        renderGame();
    }
}

function handleUnexpectedError(error) {
    console.error("Erro inesperado durante a partida.", error);

    elements.turnMessage.textContent =
        "Ocorreu um erro inesperado. Consulte o console do navegador.";

    addLog(
        "Uma ação não pôde ser concluída por causa de um erro.",
        "danger"
    );

    renderGame();
}

function restartGame() {
    try {
        gameState = structuredClone(initialGameState);
        localStorage.removeItem(STORAGE_KEY);

        elements.turnMessage.textContent =
            "Nova batalha iniciada. Escolha uma ação.";

        saveGame();
        renderGame();
    } catch (error) {
        handleUnexpectedError(error);
    }
}

function clearSavedProgress() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        elements.turnMessage.textContent =
            "O progresso salvo foi apagado.";

        addLog(
            "O armazenamento local foi limpo pelo jogador.",
            "warning"
        );

        renderGame();
    } catch (error) {
        handleUnexpectedError(error);
    }
}

function registerEvents() {
    elements.attackButton.addEventListener("click", attack);
    elements.defendButton.addEventListener("click", defend);
    elements.healButton.addEventListener("click", heal);
    elements.restartButton.addEventListener("click", restartGame);
    elements.clearSaveButton.addEventListener("click", clearSavedProgress);
}

function initializeGame() {
    try {
        const progressRecovered = loadGame();

        registerEvents();
        renderGame();

        elements.turnMessage.textContent = progressRecovered
            ? "Progresso recuperado. Continue a batalha."
            : "Escolha sua primeira ação.";
    } catch (error) {
        console.error("Falha grave durante a inicialização.", error);

        document.body.innerHTML = `
            <main style="max-width:700px;margin:60px auto;padding:30px;
            font-family:Arial;background:#fff5f5;color:#7f1d1d;
            border:2px solid #c53030;border-radius:12px;">
                <h1>Não foi possível iniciar o jogo</h1>
                <p>${error.message}</p>
                <p>Verifique o HTML e consulte o console do navegador.</p>
            </main>
        `;
    }
}

document.addEventListener("DOMContentLoaded", initializeGame);

DESAFIO 1!
function attack() {
    if (gameState.battleFinished) {
        return;
    }

    try {
        let damage = randomInteger(12, 24);

        // 20% de chance de ataque crítico
        const criticalChance = randomInteger(1, 100);
        const isCritical = criticalChance <= 20;

        if (isCritical) {
            damage *= 2;
        }

        gameState.enemy.health = limitValue(
            gameState.enemy.health - damage,
            0,
            gameState.enemy.maxHealth
        );

        if (isCritical) {
            elements.turnMessage.textContent =
                `💥 Ataque crítico! Você causou ${damage} de dano.`;

            addLog(
                `💥 Ataque crítico! O Guardião causou ${damage} de dano.`,
                "success"
            );
        } else {
            elements.turnMessage.textContent =
                `Você atacou e causou ${damage} de dano.`;

            addLog(
                `O Guardião atacou e causou ${damage} de dano.`,
                "success"
            );
        }

        if (!checkBattleResult()) {
            enemyTurn();
        }
    } catch (error) {
        handleUnexpectedError(error);
    }
}

DESAFIO 2!
enemyIndex: 0,

enemies: [
    {
        name: "Slime Sombrio",
        maxHealth: 80,
        health: 80
    },
    {
        name: "Lobo Corrompido",
        maxHealth: 110,
        health: 110
    },
    {
        name: "Ent Amaldiçoado",
        maxHealth: 150,
        health: 150
    },
    {
        name: "Dragão da Floresta",
        maxHealth: 220,
        health: 220
    }
],

enemy: {
    name: "Slime Sombrio",
    maxHealth: 80,
    health: 80
},
function nextEnemy() {
    if (gameState.enemyIndex + 1 >= gameState.enemies.length) {
        finishBattle(
            "🏆 Você derrotou todos os inimigos da floresta!",
            "success"
        );
        return;
    }

    gameState.enemyIndex++;

    const next = gameState.enemies[gameState.enemyIndex];

    gameState.enemy = structuredClone(next);

    gameState.player.health = gameState.player.maxHealth;
    gameState.player.defending = false;

    elements.turnMessage.textContent =
        `Um novo inimigo apareceu: ${next.name}!`;

    addLog(
        `${next.name} surgiu para continuar a batalha.`,
        "warning"
    );

    saveGame();
    renderGame();
}
function checkBattleResult() {
    if (gameState.enemy.health <= 0) {

        if (gameState.enemyIndex + 1 < gameState.enemies.length) {

            addLog(
                `${gameState.enemy.name} foi derrotado!`,
                "success"
            );

            nextEnemy();

            return true;
        }

        gameState.enemy.health = 0;

        finishBattle(
            "🏆 Vitória! Todos os inimigos foram derrotados.",
            "success"
        );

        return true;
    }

    if (gameState.player.health <= 0) {

        gameState.player.health = 0;

        finishBattle(
            "💀 Derrota. A floresta foi dominada.",
            "danger"
        );

        return true;
    }

    return false;
}

DESAFIO 3!
player: {
    maxHealth: 100,
    health: 100,
    potions: 3,
    defending: false,
    level: 1,
    experience: 0
},
function gainExperience(amount) {
    gameState.player.experience += amount;

    while (gameState.player.experience >= 100) {
        gameState.player.experience -= 100;
        gameState.player.level++;

        gameState.player.maxHealth += 20;
        gameState.player.health = gameState.player.maxHealth;

        addLog(
            `🎉 O Guardião subiu para o nível ${gameState.player.level}!`,
            "success"
        );
    }
}
if (gameState.enemy.health <= 0) {

    gameState.enemy.health = 0;

    gainExperience(50);

    finishBattle(
        "Vitória! O Guardião protegeu a floresta.",
        "success"
    );

    return true;
}
playerLevel: selectRequiredElement("#player-level"),
playerExp: selectRequiredElement("#player-exp"),
elements.playerLevel.textContent =
    gameState.player.level;

elements.playerExp.textContent =
    gameState.player.experience;
    Number.isFinite(player.level) &&
Number.isFinite(player.experience) &&

DESAFIO 4!
const initialGameState = {
    version: 1,

    player: {
        maxHealth: 100,
        health: 100,
        potions: 3,
        defending: false
    },

    enemy: {
        name: "Slime Sombrio",
        maxHealth: 80,
        health: 80
    },

    battleFinished: false,
    log: ["A batalha começou."]
};
function saveGame() {
    try {

        gameState.version = 1;

        const serializedState = JSON.stringify(gameState);

        localStorage.setItem(STORAGE_KEY, serializedState);

    } catch (error) {

        console.error("Não foi possível salvar o jogo.", error);

        elements.turnMessage.textContent =
            "A partida continua, mas o progresso não pôde ser salvo.";
    }
}
return Boolean(

    savedState.version === 1 &&

    player &&
    enemy &&
    Number.isFinite(player.maxHealth) &&
    Number.isFinite(player.health) &&
    Number.isFinite(player.potions) &&
    typeof player.defending === "boolean" &&
    typeof enemy.name === "string" &&
    Number.isFinite(enemy.maxHealth) &&
    Number.isFinite(enemy.health) &&
    typeof savedState.battleFinished === "boolean" &&
    Array.isArray(savedState.log)

);
const savedState = JSON.parse(savedText);
if (savedState.version !== 1) {
    throw new Error("Versão incompatível do progresso salvo.");
}

DESAFIO 5!
function clearSavedProgress() {
    try {

        const confirmation = window.confirm(
            "Tem certeza que deseja apagar o progresso salvo?"
        );

        if (!confirmation) {
            elements.turnMessage.textContent =
                "O progresso foi mantido.";

            return;
        }

        localStorage.removeItem(STORAGE_KEY);

        elements.turnMessage.textContent =
            "O progresso salvo foi apagado.";

        addLog(
            "O armazenamento local foi limpo pelo jogador.",
            "warning"
        );

        renderGame();

    } catch (error) {
        handleUnexpectedError(error);
    }
}

DESAFIO 6!
function registerKeyboardShortcuts() {

    document.addEventListener("keydown", (event) => {

        if (gameState.battleFinished) {
            return;
        }

        switch (event.key.toLowerCase()) {

            case "a":
                attack();
                break;

            case "d":
                defend();
                break;

            case "p":
                heal();
                break;

        }

    });

}
registerEvents();
registerKeyboardShortcuts();
renderGame();

DESAFIO 7!
function saveGame() {
    try {

        // Simulação de falha
        throw new Error("Falha simulada de salvamento.");

        const serializedState = JSON.stringify(gameState);
        localStorage.setItem(STORAGE_KEY, serializedState);

    } catch (error) {

        console.error("Não foi possível salvar o jogo.", error);

        elements.turnMessage.textContent =
            "A partida continua, mas o progresso não pôde ser salvo.";

        addLog(
            "Falha simulada durante o salvamento.",
            "danger"
        );

        renderGame();
    }
}


