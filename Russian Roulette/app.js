const STORAGE_KEY = "russian-roulette-showdown-profile";
const MAX_POWERUP_CAPACITY = 16;
const SHOTGUN_DAMAGE_STEPS = [1, 2, 4, 8, 12, 16, 20];
const DEV_NAME = "YeeDev";

const POWERUPS = {
  sparklingWater: {
    name: "Sparkling Water",
    description: "Unload 1 real bullet from the remaining chambers.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      const realIndex = game.getRemainingRealBulletIndex();
      if (realIndex === -1) {
        game.addLog(`${actor.name} used Sparkling Water, but there were no real bullets left to unload.`);
        return false;
      }
      game.chambers[realIndex] = "fake";
      game.addLog(`${actor.name} unloaded a real bullet from chamber ${realIndex + 1}.`);
      game.setPhase("resolve");
      return true;
    }
  },
  spyGlass: {
    name: "Spy Glass",
    description: "Reveal whether the next chamber is real or fake.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      actor.knowledge.nextBullet = game.chambers[game.currentChamber];
      game.addLog(`${actor.name} used Spy Glass and saw that the next chamber is ${actor.knowledge.nextBullet}.`);
      game.setPhase("resolve");
      return true;
    }
  },
  drug: {
    name: "Drug",
    description: "50% chance to heal 1 HP, 50% chance to lose 1 HP.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      if (Math.random() < 0.5) {
        actor.hp = Math.min(game.getMaxHp(actor), actor.hp + 1);
        game.addLog(`${actor.name} used Drug and recovered 1 HP.`);
        game.triggerScreenTint("heal");
      } else {
        actor.hp = Math.max(0, actor.hp - 1);
        game.addLog(`${actor.name} used Drug and lost 1 HP.`);
        game.triggerScreenTint("damage");
      }
      game.setPhase("resolve");
      return true;
    }
  },
  shotgunBullet: {
    name: "Shotgun Bullet",
    description: "Stacks your next real shot damage up to 20.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      actor.effects.shotgunStacks = Math.min(actor.effects.shotgunStacks + 1, SHOTGUN_DAMAGE_STEPS.length - 1);
      const stackedDamage = SHOTGUN_DAMAGE_STEPS[actor.effects.shotgunStacks];
      game.addLog(`${actor.name} primed Shotgun Bullet x${actor.effects.shotgunStacks}. Next real shot will deal ${stackedDamage} damage.`);
      game.setPhase("resolve");
      return true;
    }
  },
  backupBullet: {
    name: "Back-Up Bullet",
    description: "Turns the next chamber into a real bullet if it is fake.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      if (game.chambers[game.currentChamber] === "real") {
        game.addLog(`${actor.name} used Back-Up Bullet, but the next chamber was already real.`);
        return false;
      }
      game.chambers[game.currentChamber] = "real";
      actor.knowledge.nextBullet = "real";
      game.addLog(`${actor.name} forced the next chamber into a real bullet.`);
      game.setPhase("resolve");
      return true;
    }
  },
  cheese: {
    name: "Cheese",
    description: "Heal 1 HP.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      const before = actor.hp;
      actor.hp = Math.min(game.getMaxHp(actor), actor.hp + 1);
      game.addLog(`${actor.name} ate Cheese and ${before === actor.hp ? "stayed at full HP" : "healed 1 HP"}.`);
      game.triggerScreenTint("heal");
      game.setPhase("resolve");
      return true;
    }
  },
  miceTrap: {
    name: "Mice Trap",
    description: "Block your opponent from doing anything on their next turn.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      const opponent = game.players[1 - actorIndex];
      opponent.effects.skipTurn = true;
      game.addLog(`${actor.name} placed a Mice Trap. ${opponent.name} loses their next turn.`);
      game.setPhase("resolve");
      return true;
    }
  },
  phone: {
    name: "Phone",
    description: "Reveal whether any chamber from 1-8 is real or fake.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      const chamberIndex = Math.floor(Math.random() * 8);
      actor.knowledge.phoneReveal = {
        chamberIndex,
        bulletType: game.chambers[chamberIndex]
      };
      game.addLog(
        `${actor.name} used Phone and learned that chamber ${chamberIndex + 1} is ${actor.knowledge.phoneReveal.bulletType}.`
      );
      game.setPhase("resolve");
      return true;
    }
  },
  handcuffs: {
    name: "Handcuffs",
    description: "Your opponent cannot use power-ups on their next turn.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      const opponent = game.players[1 - actorIndex];
      opponent.effects.noPowerups = true;
      game.addLog(`${actor.name} used Handcuffs. ${opponent.name} cannot use power-ups next turn.`);
      game.setPhase("resolve");
      return true;
    }
  },
  adrenaline: {
    name: "Adrenaline",
    description: "Steal one random power-up from your opponent.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      const opponent = game.players[1 - actorIndex];
      if (opponent.inventory.length === 0) {
        game.addLog(`${actor.name} used Adrenaline, but ${opponent.name} had nothing to steal.`);
        return false;
      }
      const stolenIndex = game.randomInt(0, opponent.inventory.length - 1);
      const [stolen] = opponent.inventory.splice(stolenIndex, 1);
      if (actor.inventory.length < game.getCapacity(actor.isAi)) {
        actor.inventory.push(stolen);
        game.addLog(`${actor.name} stole ${POWERUPS[stolen].name} from ${opponent.name}.`);
      } else {
        game.addLog(`${actor.name} stole ${POWERUPS[stolen].name} from ${opponent.name}, but inventory was full so it was discarded.`);
      }
      game.setPhase("resolve");
      return true;
    }
  },
  bulletproofVest: {
    name: "Bulletproof Vest",
    description: "Block the next real bullet that would hit you.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      actor.effects.vestReady = true;
      game.addLog(`${actor.name} equipped a Bulletproof Vest.`);
      game.setPhase("resolve");
      return true;
    }
  },
  remote: {
    name: "Remote",
    description: "Skip the current chamber without firing.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      game.currentChamber += 1;
      game.addLog(`${actor.name} used Remote and skipped the current chamber.`);
      if (game.currentChamber >= game.chambers.length) {
        game.setPhase("reload");
        game.addLog("The cylinder is empty. Reloading a fresh 8-chamber cylinder.");
        game.refillEmptyInventories();
        game.chambers = game.buildCylinder();
        game.currentChamber = 0;
        game.reloadCount += 1;
        game.triggerReloadEffect();
      } else {
        game.setPhase("resolve");
      }
      return true;
    }
  },
  jammer: {
    name: "Jammer",
    description: "Cancel your opponent's armed next-shot effect.",
    use(game, actorIndex) {
      const actor = game.players[actorIndex];
      const opponent = game.players[1 - actorIndex];
      opponent.effects.shotgunStacks = 0;
      game.addLog(`${actor.name} used Jammer and wiped ${opponent.name}'s armed shot effects.`);
      game.setPhase("resolve");
      return true;
    }
  }
};

const POWERUP_KEYS = Object.keys(POWERUPS);

const DIFFICULTIES = {
  easy: { label: "Easy", style: "Soft Shark", hp: 5, dealerCapacity: 5, thinkDelay: 950, riskTolerance: 0.12, informationBias: 0.45, aggression: 0.35, healThreshold: 2 },
  normal: { label: "Normal", style: "House Dealer", hp: 7, dealerCapacity: 7, thinkDelay: 800, riskTolerance: 0.22, informationBias: 0.7, aggression: 0.55, healThreshold: 3 },
  hard: { label: "Hard", style: "Predator", hp: 10, dealerCapacity: 10, thinkDelay: 650, riskTolerance: 0.3, informationBias: 0.9, aggression: 0.72, healThreshold: 4 },
  nightmare: { label: "Nightmare", style: "Executioner", hp: 16, dealerCapacity: 13, thinkDelay: 500, riskTolerance: 0.38, informationBias: 1, aggression: 0.88, healThreshold: 5 },
  deathwish: { label: "Deathwish", style: "Apex Butcher", hp: 20, dealerCapacity: 20, thinkDelay: 380, riskTolerance: 0.45, informationBias: 1, aggression: 1, healThreshold: 6 }
};

const AI_TAUNTS = {
  playerSelfReal: ["Haha, you got shot by yourself.", "You really handled that for me.", "Self-inflicted. Beautiful work."],
  playerSelfFake: ["Lucky blank. Don't confuse that with talent.", "You survived by accident again.", "Blank round. Still embarrassing."],
  playerHitsAiReal: ["One good shot and now you think you're dangerous.", "Fine. You landed one.", "Cute. You found the barrel."],
  playerHitsAiFake: ["Blank. That's the story of your whole strategy.", "You couldn't hurt me if the gun begged you to.", "Nothing. Just like your plan."],
  aiSelfFake: ["See? I knew the odds.", "Calculated. Try learning from it.", "I take risks when they're worth it."],
  aiSelfReal: ["Fluke. Don't smile too hard.", "Even the table gets lucky sometimes.", "You needed that gift."],
  aiHitsPlayerReal: ["There it is. That's how a dealer closes.", "Too easy. You were already dead in your head.", "You practically asked for that shot."],
  aiHitsPlayerFake: ["Blank. Mercy from the chamber, not from me.", "You got spared. I didn't miss.", "Next one won't be so kind."]
};

const elements = {
  siteTabs: [...document.querySelectorAll(".site-tab")],
  pageSections: [...document.querySelectorAll(".page-section")],
  modeButtons: [...document.querySelectorAll(".mode-btn")],
  difficultySelect: document.getElementById("difficulty-select"),
  newGame: document.getElementById("new-game-btn"),
  changeUserBtn: document.getElementById("change-user-btn"),
  currentUserLabel: document.getElementById("current-user-label"),
  registerOverlay: document.getElementById("register-overlay"),
  nameInput: document.getElementById("name-input"),
  saveNameBtn: document.getElementById("save-name-btn"),
  phasePills: [...document.querySelectorAll(".phase-pill")],
  roundCounter: document.getElementById("round-counter"),
  oddsLabel: document.getElementById("odds-label"),
  dealerStyleLabel: document.getElementById("dealer-style-label"),
  coinCount: document.getElementById("coin-count"),
  slotUpgradeCopy: document.getElementById("slot-upgrade-copy"),
  hpUpgradeCopy: document.getElementById("hp-upgrade-copy"),
  starterUpgradeCopy: document.getElementById("starter-upgrade-copy"),
  medkitCopy: document.getElementById("medkit-copy"),
  rewardPreview: document.getElementById("reward-preview"),
  buySlotBtn: document.getElementById("buy-slot-btn"),
  buyHpBtn: document.getElementById("buy-hp-btn"),
  buyStarterBtn: document.getElementById("buy-starter-btn"),
  buyMedkitBtn: document.getElementById("buy-medkit-btn"),
  marketPhoneCopy: document.getElementById("market-phone-copy"),
  marketTrapCopy: document.getElementById("market-trap-copy"),
  marketCheeseCopy: document.getElementById("market-cheese-copy"),
  marketWaterCopy: document.getElementById("market-water-copy"),
  marketBountyCopy: document.getElementById("market-bounty-copy"),
  marketReviveCopy: document.getElementById("market-revive-copy"),
  marketScanCopy: document.getElementById("market-scan-copy"),
  marketInstantCheeseCopy: document.getElementById("market-instant-cheese-copy"),
  marketInstantTrapCopy: document.getElementById("market-instant-trap-copy"),
  marketRerollCopy: document.getElementById("market-reroll-copy"),
  buyPhoneUpgradeBtn: document.getElementById("buy-phone-upgrade-btn"),
  buyTrapUpgradeBtn: document.getElementById("buy-trap-upgrade-btn"),
  buyCheeseUpgradeBtn: document.getElementById("buy-cheese-upgrade-btn"),
  buyWaterUpgradeBtn: document.getElementById("buy-water-upgrade-btn"),
  buyBountyUpgradeBtn: document.getElementById("buy-bounty-upgrade-btn"),
  buyReviveUpgradeBtn: document.getElementById("buy-revive-upgrade-btn"),
  buyScanBtn: document.getElementById("buy-scan-btn"),
  buyInstantCheeseBtn: document.getElementById("buy-instant-cheese-btn"),
  buyInstantTrapBtn: document.getElementById("buy-instant-trap-btn"),
  buyRerollBtn: document.getElementById("buy-reroll-btn"),
  premiumOffers: [...document.querySelectorAll(".premium-offer")],
  checkoutOverlay: document.getElementById("checkout-overlay"),
  checkoutTitle: document.getElementById("checkout-title"),
  checkoutCopy: document.getElementById("checkout-copy"),
  checkoutSummary: document.getElementById("checkout-summary"),
  cardNameInput: document.getElementById("card-name-input"),
  cardNumberInput: document.getElementById("card-number-input"),
  cardExpiryInput: document.getElementById("card-expiry-input"),
  cardCvcInput: document.getElementById("card-cvc-input"),
  cancelCheckoutBtn: document.getElementById("cancel-checkout-btn"),
  confirmCheckoutBtn: document.getElementById("confirm-checkout-btn"),
  vipStatusLabel: document.getElementById("vip-status-label"),
  vipCopy: document.getElementById("vip-copy"),
  vipObserverBtn: document.getElementById("vip-observer-btn"),
  vipBanBtn: document.getElementById("vip-ban-btn"),
  securityLog: document.getElementById("security-log"),
  devCard: document.getElementById("dev-card"),
  devAllPowerupsBtn: document.getElementById("dev-all-powerups-btn"),
  devToggleInfiniteBtn: document.getElementById("dev-toggle-infinite-btn"),
  devHealBtn: document.getElementById("dev-heal-btn"),
  devReloadBtn: document.getElementById("dev-reload-btn"),
  devConsoleInput: document.getElementById("dev-console-input"),
  devConsoleRunBtn: document.getElementById("dev-console-run-btn"),
  turnTitle: document.getElementById("turn-title"),
  turnSubtitle: document.getElementById("turn-subtitle"),
  board: document.getElementById("board"),
  centerPanel: document.getElementById("center-panel"),
  flash: document.getElementById("fx-flash"),
  tint: document.getElementById("fx-tint"),
  chamberRing: document.getElementById("chamber-ring"),
  gunIndicator: document.getElementById("gun-indicator"),
  gunTargetLabel: document.getElementById("gun-target-label"),
  nextShotLabel: document.getElementById("next-shot-label"),
  shootSelf: document.getElementById("shoot-self-btn"),
  shootOpponent: document.getElementById("shoot-opponent-btn"),
  confirmShot: document.getElementById("confirm-shot-btn"),
  cancelShot: document.getElementById("cancel-shot-btn"),
  logOutput: document.getElementById("log-output"),
  powerupTemplate: document.getElementById("powerup-button-template"),
  players: [0, 1].map((index) => ({
    card: document.getElementById(`player-${index}-card`),
    name: document.getElementById(`player-${index}-name`),
    hp: document.getElementById(`player-${index}-hp`),
    status: document.getElementById(`player-${index}-status`),
    inventory: document.getElementById(`player-${index}-inventory`)
  }))
};

class Game {
  constructor() {
    this.mode = "pvp";
    this.difficulty = "normal";
    this.currentPage = "game";
    this.profile = this.loadProfile();
    this.reset();
    this.renderProfile();
  }

  loadProfile() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        coins: Number.isFinite(saved.coins) ? saved.coins : 0,
        bonusSlots: Number.isFinite(saved.bonusSlots) ? saved.bonusSlots : 0,
        bonusHp: Number.isFinite(saved.bonusHp) ? saved.bonusHp : 0,
        bonusStartItems: Number.isFinite(saved.bonusStartItems) ? saved.bonusStartItems : 0,
        guaranteedPhone: Number.isFinite(saved.guaranteedPhone) ? saved.guaranteedPhone : 0,
        guaranteedTrap: Number.isFinite(saved.guaranteedTrap) ? saved.guaranteedTrap : 0,
        guaranteedCheese: Number.isFinite(saved.guaranteedCheese) ? saved.guaranteedCheese : 0,
        guaranteedWater: Number.isFinite(saved.guaranteedWater) ? saved.guaranteedWater : 0,
        bountyBonus: Number.isFinite(saved.bountyBonus) ? saved.bountyBonus : 0,
        reviveTier: Number.isFinite(saved.reviveTier) ? saved.reviveTier : 0,
        name: typeof saved.name === "string" ? saved.name : "",
        infinitePowerups: Boolean(saved.infinitePowerups),
        vip: Boolean(saved.vip),
        observerMode: Boolean(saved.observerMode)
      };
    } catch {
      return { coins: 0, bonusSlots: 0, bonusHp: 0, bonusStartItems: 0, guaranteedPhone: 0, guaranteedTrap: 0, guaranteedCheese: 0, guaranteedWater: 0, bountyBonus: 0, reviveTier: 0, name: "", infinitePowerups: false, vip: false, observerMode: false };
    }
  }

  saveProfile() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
  }

  reset() {
    window.clearTimeout(this.aiTimer);
    window.clearTimeout(this.aiShotTimer);
    window.clearTimeout(this.tintTimer);
    elements.tint.classList.remove("active", "screen-damage", "screen-heal");
    this.players = [];
    this.chambers = [];
    this.currentChamber = 0;
    this.currentTurn = 0;
    this.matchOver = false;
    this.waitingForManualEndTurn = false;
    this.logs = [];
    this.phase = "use";
    this.turnCount = 0;
    this.reloadCount = 1;
    this.lastReward = 0;
    this.devMode = this.profile.name === DEV_NAME;
    this.securityEvents = [];
    this.flaggedPlayer = null;
    this.pendingPurchase = null;
    this.revivesRemaining = 0;
    this.pendingTarget = null;
  }

  setPage(page) {
    this.currentPage = page;
    elements.siteTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.page === page);
    });
    elements.pageSections.forEach((section) => {
      section.classList.toggle("active", section.dataset.page === page);
    });
  }

  start(mode) {
    this.mode = mode;
    this.matchOver = false;
    this.waitingForManualEndTurn = false;
    this.currentTurn = 0;
    this.currentChamber = 0;
    this.turnCount = 1;
    this.reloadCount = 1;
    this.lastReward = 0;
    this.phase = "use";
    this.revivesRemaining = this.profile.reviveTier;
    this.chambers = this.buildCylinder();
    this.players = [
      this.createPlayer(0, "Player 1", false),
      this.createPlayer(1, mode === "ai" ? "Dealer AI" : "Player 2", mode === "ai")
    ];
    this.logs = [];
    this.addLog(`New ${mode === "ai" ? "Player vs AI" : "Player vs Player"} match started.`);
    if (mode === "ai") this.addLog(`Dealer difficulty set to ${DIFFICULTIES[this.difficulty].label}.`);
    this.addLog(`Cylinder loaded with ${this.countRealBullets()} real bullets and ${8 - this.countRealBullets()} fake bullets.`);
    this.render();
    this.resolveTurnStart();
    this.maybeRunAiTurn();
  }

  createPlayer(index, name, isAi) {
    const startingHp = this.getStartingHp(isAi);
    return {
      index,
      name,
      isAi,
      hp: startingHp,
      inventory: this.generateRandomInventory(isAi),
      knowledge: { nextBullet: null, phoneReveal: null },
      effects: { shotgunStacks: 0, skipTurn: false, noPowerups: false, vestReady: false }
    };
  }

  getStartingHp(isAi = false) {
    return DIFFICULTIES[this.difficulty].hp + (!isAi ? this.profile.bonusHp : 0);
  }

  getCapacity(isAi) {
    if (isAi) {
      return this.getDealerProfile().dealerCapacity;
    }
    return Math.min(MAX_POWERUP_CAPACITY, 8 + this.profile.bonusSlots);
  }

  generateRandomInventory(isAi) {
    const guaranteed = !isAi
      ? [
          ...Array(this.profile.guaranteedPhone).fill("phone"),
          ...Array(this.profile.guaranteedTrap).fill("miceTrap"),
          ...Array(this.profile.guaranteedCheese).fill("cheese"),
          ...Array(this.profile.guaranteedWater).fill("sparklingWater")
        ]
      : [];
    const capacity = this.getCapacity(isAi);
    const minCount = Math.min(capacity, 1 + (!isAi ? this.profile.bonusStartItems : 0));
    const targetCount = this.randomInt(Math.max(minCount, guaranteed.length), capacity);
    const inventory = [...guaranteed];
    while (inventory.length < targetCount) {
      inventory.push(POWERUP_KEYS[this.randomInt(0, POWERUP_KEYS.length - 1)]);
    }
    return inventory;
  }

  buildCylinder() {
    const chambers = Array.from({ length: 8 }, () => "fake");
    const realCount = this.mode === "ai" && (this.difficulty === "nightmare" || this.difficulty === "deathwish")
      ? this.randomInt(3, 4)
      : this.randomInt(2, 4);
    const chosen = new Set();
    while (chosen.size < realCount) chosen.add(this.randomInt(0, 7));
    chosen.forEach((index) => {
      chambers[index] = "real";
    });
    return chambers;
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getCurrentPlayer() {
    return this.players[this.currentTurn];
  }

  getOpponent() {
    return this.players[1 - this.currentTurn];
  }

  countRealBullets() {
    return this.chambers.filter((bullet) => bullet === "real").length;
  }

  getRemainingRealBulletIndex() {
    for (let i = this.currentChamber; i < this.chambers.length; i += 1) {
      if (this.chambers[i] === "real") return i;
    }
    return -1;
  }

  getRealChance() {
    const chambersLeft = this.chambers.length - this.currentChamber;
    if (chambersLeft <= 0) return 0;
    const realLeft = this.chambers.slice(this.currentChamber).filter((bullet) => bullet === "real").length;
    return realLeft / chambersLeft;
  }

  getMaxHp(player) {
    return DIFFICULTIES[this.difficulty].hp + (!player.isAi ? this.profile.bonusHp : 0);
  }

  setPhase(phase) {
    this.phase = phase;
    this.renderMeta();
  }

  addLog(message) {
    this.logs.unshift(message);
    this.renderLog();
  }

  addSecurityEvent(message, flaggedPlayer = null) {
    this.securityEvents.unshift(message);
    if (flaggedPlayer) {
      this.flaggedPlayer = flaggedPlayer;
    }
    this.renderSecurityLog();
  }

  triggerShotEffect(targetIndex, isReal) {
    const shooter = this.getCurrentPlayer();
    const shotgunStacks = shooter ? shooter.effects.shotgunStacks : 0;
    const damage = isReal && shooter ? SHOTGUN_DAMAGE_STEPS[shotgunStacks] : 0;
    const impactClass = damage >= 12 ? "impact-massive" : damage >= 4 ? "impact-heavy" : "impact-light";
    const recoilClass = damage >= 12 ? "recoil-massive" : damage >= 4 ? "recoil-heavy" : "recoil";
    const fxTier = damage >= 12 ? "massive" : damage >= 4 ? "heavy" : "light";

    elements.flash.classList.add("active", impactClass);
    elements.centerPanel.classList.add(recoilClass);
    document.body.classList.add("impact-shake", impactClass);
    if (isReal) {
      this.triggerScreenTint("damage");
    }
    this.spawnShotFx(fxTier, isReal);
    if (typeof targetIndex === "number") {
      elements.players[targetIndex].card.classList.add("hit");
      if (isReal) {
        const card = elements.players[targetIndex].card;
        const bloodClass = damage >= 12 ? "blood-massive" : damage >= 4 ? "blood-heavy" : "blood-light";
        card.classList.add("hit-real", bloodClass);
        const burst = document.createElement("div");
        burst.className = `blood-burst ${bloodClass}`;
        card.appendChild(burst);
        window.setTimeout(() => {
          burst.remove();
        }, 700);
      }
    }
    window.setTimeout(() => {
      elements.flash.classList.remove("active", "impact-light", "impact-heavy", "impact-massive");
      elements.centerPanel.classList.remove("recoil", "recoil-heavy", "recoil-massive");
      document.body.classList.remove("impact-shake", "impact-light", "impact-heavy", "impact-massive");
      if (typeof targetIndex === "number") {
        elements.players[targetIndex].card.classList.remove("hit", "hit-real", "blood-light", "blood-heavy", "blood-massive");
      }
    }, isReal ? 360 : 160);
  }

  spawnShotFx(tier, isReal) {
    const smoke = document.createElement("div");
    smoke.className = `shot-smoke ${tier === "heavy" ? "heavy" : tier === "massive" ? "massive" : ""}`.trim();
    elements.centerPanel.appendChild(smoke);
    window.setTimeout(() => smoke.remove(), 950);

    if (!isReal) return;
    const blast = document.createElement("div");
    blast.className = `muzzle-blast ${tier === "heavy" ? "heavy" : tier === "massive" ? "massive" : ""}`.trim();
    elements.centerPanel.appendChild(blast);
    window.setTimeout(() => blast.remove(), 460);
  }

  triggerScreenTint(type, duration = 900) {
    window.clearTimeout(this.tintTimer);
    elements.tint.classList.remove("active", "screen-damage", "screen-heal");
    elements.tint.classList.add("instant", type === "heal" ? "screen-heal" : "screen-damage", "active");
    void elements.tint.offsetWidth;
    elements.tint.classList.remove("instant");
    this.tintTimer = window.setTimeout(() => {
      elements.tint.classList.remove("active", "screen-damage", "screen-heal");
    }, duration);
  }

  triggerReloadEffect() {
    document.body.classList.add("reload-glow");
    const ripple = document.createElement("div");
    ripple.className = "reload-ripple";
    elements.centerPanel.appendChild(ripple);
    window.setTimeout(() => {
      document.body.classList.remove("reload-glow");
      ripple.remove();
    }, 380);
  }

  getTaunt(type) {
    const options = AI_TAUNTS[type];
    return options ? options[this.randomInt(0, options.length - 1)] : null;
  }

  addAiTaunt(type) {
    const aiPlayer = this.players.find((player) => player.isAi);
    const taunt = aiPlayer ? this.getTaunt(type) : null;
    if (taunt) this.addLog(`${aiPlayer.name}: "${taunt}"`);
  }

  resolveTurnStart() {
    if (this.matchOver) return;
    const actor = this.getCurrentPlayer();
    if (!actor) return;
    this.setPhase("use");
    if (actor.effects.noPowerups) {
      this.addLog(`${actor.name} is locked by Handcuffs and cannot use power-ups this turn.`);
      actor.effects.noPowerups = false;
    }
    if (!actor.effects.skipTurn) {
      this.render();
      return;
    }
    actor.effects.skipTurn = false;
    this.waitingForManualEndTurn = false;
    this.addLog(`${actor.name} is caught in a Mice Trap and loses the whole turn.`);
    this.currentTurn = 1 - this.currentTurn;
    this.turnCount += 1;
    this.render();
    this.maybeRunAiTurn();
  }

  usePowerup(actorIndex, slotIndex) {
    if (this.matchOver || actorIndex !== this.currentTurn || this.waitingForManualEndTurn) return;
    const actor = this.players[actorIndex];
    if (actor.effects.noPowerups) {
      this.addLog(`${actor.name} is locked by Handcuffs and cannot use power-ups this turn.`);
      return;
    }
    const key = actor.inventory[slotIndex];
    if (!key) return;
    this.setPhase("use");
    const used = POWERUPS[key].use(this, actorIndex);
    if (!used) return;
    if (!(this.devMode && this.profile.infinitePowerups && !actor.isAi)) {
      actor.inventory.splice(slotIndex, 1);
    }
    this.checkWinner();
    this.render();
    this.maybeRunAiTurn();
  }

  aimShot(targetSelf) {
    if (this.matchOver || this.waitingForManualEndTurn) return;
    const actor = this.getCurrentPlayer();
    if (!actor || actor.isAi || actor.effects.skipTurn) return;
    this.pendingTarget = targetSelf ? "self" : "opponent";
    this.render();
  }

  cancelAim() {
    this.pendingTarget = null;
    this.render();
  }

  confirmShot() {
    if (!this.pendingTarget) return;
    this.takeShot(this.pendingTarget === "self");
  }

  takeShot(targetSelf) {
    if (this.matchOver || this.waitingForManualEndTurn) return;
    window.clearTimeout(this.aiShotTimer);
    this.pendingTarget = null;
    this.setPhase("shoot");

    const shooter = this.getCurrentPlayer();
    const target = targetSelf ? shooter : this.getOpponent();
    const targetIndex = target.index;
    const bullet = this.chambers[this.currentChamber];
    let damage = 0;

    if (bullet === "real") {
      damage = SHOTGUN_DAMAGE_STEPS[shooter.effects.shotgunStacks];
      if (target.effects.vestReady) {
        target.effects.vestReady = false;
        damage = 0;
        this.addLog(`${target.name}'s Bulletproof Vest blocked the shot.`);
      } else {
        target.hp = Math.max(0, target.hp - damage);
      }
    }

    this.addLog(`${shooter.name} shot at ${targetSelf ? "themself" : target.name}. Chamber ${this.currentChamber + 1} was ${bullet}.`);
    this.triggerShotEffect(targetIndex, bullet === "real");
    if (bullet === "real" && shooter.effects.shotgunStacks > 0) {
      this.addLog(`Shotgun Bullet triggered for ${damage} damage.`);
    }

    this.handleAiTauntAfterShot(shooter, targetSelf, bullet);
    shooter.effects.shotgunStacks = 0;
    shooter.knowledge.nextBullet = null;
    shooter.knowledge.phoneReveal = null;
    this.currentChamber += 1;
    this.setPhase("resolve");

    this.checkWinner();
    if (this.matchOver) {
      this.render();
      return;
    }

    if (this.currentChamber >= this.chambers.length) {
      this.setPhase("reload");
      this.addLog("The cylinder is empty. Reloading a fresh 8-chamber cylinder.");
      this.refillEmptyInventories();
      this.chambers = this.buildCylinder();
      this.currentChamber = 0;
      this.reloadCount += 1;
      this.triggerReloadEffect();
    }

    if (targetSelf && bullet === "fake") {
      this.addLog(`${shooter.name} fired a fake bullet at themself and earns one more shot.`);
      this.waitingForManualEndTurn = false;
      this.setPhase("use");
      this.render();
      this.maybeRunAiTurn();
      return;
    }

    this.waitingForManualEndTurn = false;
    this.advanceTurn();
  }

  handleAiTauntAfterShot(shooter, targetSelf, bullet) {
    if (this.mode !== "ai") return;
    if (!shooter.isAi) {
      if (targetSelf && bullet === "real") this.addAiTaunt("playerSelfReal");
      if (targetSelf && bullet === "fake") this.addAiTaunt("playerSelfFake");
      if (!targetSelf && bullet === "real") this.addAiTaunt("playerHitsAiReal");
      if (!targetSelf && bullet === "fake") this.addAiTaunt("playerHitsAiFake");
      return;
    }
    if (targetSelf && bullet === "fake") this.addAiTaunt("aiSelfFake");
    if (targetSelf && bullet === "real") this.addAiTaunt("aiSelfReal");
    if (!targetSelf && bullet === "real") this.addAiTaunt("aiHitsPlayerReal");
    if (!targetSelf && bullet === "fake") this.addAiTaunt("aiHitsPlayerFake");
  }

  advanceTurn() {
    this.currentTurn = 1 - this.currentTurn;
    this.turnCount += 1;
    this.render();
    this.resolveTurnStart();
    this.maybeRunAiTurn();
  }

  calculateDealerReward() {
    const base = { easy: 10, normal: 16, hard: 24, nightmare: 34, deathwish: 48 }[this.difficulty];
    const speedBonus = Math.max(0, 10 - this.turnCount);
    const reloadBonus = Math.max(0, 4 - this.reloadCount) * 3;
    return Math.round((base + speedBonus + reloadBonus) * (1 + this.profile.bountyBonus * 0.15));
  }

  awardCoinsIfNeeded(winner) {
    if (this.mode !== "ai" || winner.isAi) return;
    this.lastReward = this.calculateDealerReward();
    this.profile.coins += this.lastReward;
    this.saveProfile();
    this.addLog(`${winner.name} earned ${this.lastReward} coins for beating the dealer in ${this.turnCount} rounds.`);
  }

  checkWinner() {
    const playerOne = this.players[0];
    if (playerOne && playerOne.hp <= 0 && this.revivesRemaining > 0) {
      this.revivesRemaining -= 1;
      playerOne.hp = 1;
      this.addLog(`Second Chance triggered. ${playerOne.name} revived with 1 HP.`);
      this.renderProfile();
      return;
    }
    const defeated = this.players.find((player) => player.hp <= 0);
    if (!defeated) return;
    const winner = this.players.find((player) => player.hp > 0);
    this.matchOver = true;
    this.waitingForManualEndTurn = false;
    this.awardCoinsIfNeeded(winner);
    this.addLog(`${winner.name} wins the match.`);
    this.renderProfile();
  }

  refillEmptyInventories() {
    this.players.forEach((player) => {
      if (player.inventory.length === 0) {
        player.inventory = this.generateRandomInventory(player.isAi);
        this.addLog(`${player.name} received ${player.inventory.length} new random power-up${player.inventory.length === 1 ? "" : "s"} for the new cylinder.`);
      } else if (this.devMode && this.profile.infinitePowerups && !player.isAi) {
        player.inventory = this.generateRandomInventory(false);
      }
      player.knowledge.nextBullet = null;
      player.knowledge.phoneReveal = null;
    });
  }

  getDealerProfile() {
    return DIFFICULTIES[this.difficulty];
  }

  maybeRunAiTurn() {
    const actor = this.getCurrentPlayer();
    if (!actor || !actor.isAi || this.matchOver) return;
    window.clearTimeout(this.aiTimer);
    this.aiTimer = window.setTimeout(() => this.runAiTurn(), this.getDealerProfile().thinkDelay);
  }

  queueAiShot(targetSelf) {
    if (this.matchOver) return;
    const actor = this.getCurrentPlayer();
    if (!actor || !actor.isAi) return;
    this.pendingTarget = targetSelf ? "self" : "opponent";
    this.render();
    window.clearTimeout(this.aiShotTimer);
    this.aiShotTimer = window.setTimeout(() => {
      const current = this.getCurrentPlayer();
      if (!this.matchOver && current && current.isAi && this.pendingTarget === (targetSelf ? "self" : "opponent")) {
        this.takeShot(targetSelf);
      }
    }, 420);
  }

  runAiTurn() {
    const actor = this.getCurrentPlayer();
    if (!actor || !actor.isAi || this.matchOver) return;

    const profile = this.getDealerProfile();
    const opponent = this.getOpponent();
    const available = actor.inventory.map((key, index) => ({ key, index }));
    const findPowerup = (key) => available.find((item) => item.key === key);
    const hasOpponentItem = (key) => opponent.inventory.includes(key);
    const realLeft = this.chambers.slice(this.currentChamber).filter((bullet) => bullet === "real").length;
    const chambersLeft = this.chambers.length - this.currentChamber;
    const realChance = chambersLeft > 0 ? realLeft / chambersLeft : 0;
    const phoneCurrentInfo = actor.knowledge.phoneReveal && actor.knowledge.phoneReveal.chamberIndex === this.currentChamber
      ? actor.knowledge.phoneReveal.bulletType
      : null;
    const knownNextBullet = actor.knowledge.nextBullet || phoneCurrentInfo;
    const currentShotDamage = SHOTGUN_DAMAGE_STEPS[actor.effects.shotgunStacks];
    const nextStackDamage = SHOTGUN_DAMAGE_STEPS[Math.min(actor.effects.shotgunStacks + 1, SHOTGUN_DAMAGE_STEPS.length - 1)];
    const canFinishOpponent = opponent.hp <= currentShotDamage;
    const canFinishAfterOneMoreStack = opponent.hp <= nextStackDamage;
    const opponentThreatScore =
      opponent.effects.shotgunStacks * 3 +
      (hasOpponentItem("miceTrap") ? 2 : 0) +
      (hasOpponentItem("handcuffs") ? 2 : 0) +
      (hasOpponentItem("shotgunBullet") ? 2 : 0) +
      (hasOpponentItem("backupBullet") ? 1 : 0) +
      (hasOpponentItem("sparklingWater") ? 1 : 0) +
      (hasOpponentItem("adrenaline") ? 1 : 0) +
      (hasOpponentItem("cheese") ? 1 : 0) +
      (hasOpponentItem("bulletproofVest") ? 1 : 0);
    const aiInDanger = actor.hp <= Math.max(2, profile.healThreshold - 1) || (realChance >= 0.45 && actor.hp <= 3);
    const opponentLikelyToControlNextTurn = opponentThreatScore >= 4 || opponent.inventory.length >= 5;
    const useIfAvailable = (key, condition = true) => {
      const item = findPowerup(key);
      if (item && condition) {
        this.usePowerup(actor.index, item.index);
        return true;
      }
      return false;
    };

    if (knownNextBullet && actor.knowledge.nextBullet !== knownNextBullet) {
      actor.knowledge.nextBullet = knownNextBullet;
    }

    if (actor.effects.noPowerups) {
      if (knownNextBullet === "fake") {
        this.queueAiShot(true);
        return;
      }
      if (knownNextBullet === "real") {
        this.queueAiShot(false);
        return;
      }
      this.queueAiShot(realChance <= 0.18 + profile.riskTolerance);
      return;
    }

    if (opponent.effects.shotgunStacks > 0 && (knownNextBullet === "real" || realChance >= 0.3)) {
      if (useIfAvailable("jammer")) return;
    }

    if (aiInDanger) {
      if (useIfAvailable("cheese", actor.hp < this.getStartingHp(true))) return;
      if (useIfAvailable("bulletproofVest", !actor.effects.vestReady && (knownNextBullet === "real" || realChance >= 0.25 || opponent.effects.shotgunStacks > 0))) return;
      if (useIfAvailable("drug", actor.hp <= 2)) return;
      if (useIfAvailable("miceTrap", !opponent.effects.skipTurn && opponentLikelyToControlNextTurn)) return;
      if (useIfAvailable("handcuffs", !opponent.effects.noPowerups && opponent.inventory.length > 0)) return;
      if (useIfAvailable("sparklingWater", realLeft >= 2 && realChance >= 0.45)) return;
      if (useIfAvailable("remote", knownNextBullet === "real" || realChance >= 0.58)) return;
    }

    if (!knownNextBullet && profile.informationBias >= 0.45) {
      if (useIfAvailable("spyGlass", actor.effects.shotgunStacks > 0 || aiInDanger || canFinishAfterOneMoreStack || realChance >= 0.24)) return;
    }

    if (!knownNextBullet && profile.informationBias >= 0.75) {
      if (useIfAvailable("phone", !actor.knowledge.phoneReveal && chambersLeft >= 4)) return;
    }

    if (opponent.inventory.length > 0 && !opponent.effects.skipTurn) {
      if (useIfAvailable("miceTrap", opponentLikelyToControlNextTurn && (profile.aggression >= 0.45 || aiInDanger))) return;
      if (useIfAvailable("handcuffs", !opponent.effects.noPowerups && (opponentThreatScore >= 3 || opponent.inventory.length >= 4))) return;
    }

    if (useIfAvailable("adrenaline", opponent.inventory.length > 0 && (opponentThreatScore >= 4 || opponent.hp > actor.hp))) return;

    if (knownNextBullet === "fake") {
      if (useIfAvailable("backupBullet", canFinishOpponent || canFinishAfterOneMoreStack || actor.effects.shotgunStacks > 0 || opponent.hp <= 2 || profile.aggression >= 0.8)) return;
      this.queueAiShot(true);
      return;
    }

    if (knownNextBullet === "real") {
      if (useIfAvailable("shotgunBullet", actor.effects.shotgunStacks < SHOTGUN_DAMAGE_STEPS.length - 1 && !opponent.effects.vestReady && (canFinishAfterOneMoreStack || (profile.aggression >= 0.65 && opponent.hp > currentShotDamage && actor.hp >= opponent.hp)))) return;
      if (useIfAvailable("sparklingWater", !canFinishOpponent && actor.hp < opponent.hp && realLeft >= 2)) return;
      if (useIfAvailable("remote", !canFinishOpponent && aiInDanger)) return;
      this.queueAiShot(false);
      return;
    }

    if (useIfAvailable("shotgunBullet", actor.effects.shotgunStacks < SHOTGUN_DAMAGE_STEPS.length - 1 && !opponent.effects.vestReady && (canFinishAfterOneMoreStack || (realChance >= 0.34 && opponent.hp > currentShotDamage)))) return;

    if (useIfAvailable("backupBullet", realChance <= 0.16 && (actor.effects.shotgunStacks > 0 || opponent.hp <= 2 || profile.aggression >= 0.82))) return;

    if (useIfAvailable("sparklingWater", realChance >= 0.5 && realLeft >= 2 && (actor.hp < opponent.hp || opponentThreatScore >= 4))) return;

    if (useIfAvailable("bulletproofVest", !actor.effects.vestReady && opponent.effects.shotgunStacks > 0 && realChance >= 0.25)) return;

    if (actor.effects.shotgunStacks > 0 && (canFinishOpponent || realChance >= 0.33)) {
      this.queueAiShot(false);
      return;
    }

    if (realChance <= 0.14 + profile.riskTolerance) {
      this.queueAiShot(true);
      return;
    }

    if (opponent.hp <= currentShotDamage || (opponent.hp <= 2 && realChance >= 0.22)) {
      this.queueAiShot(false);
      return;
    }

    if (opponentThreatScore >= 4 && realChance < 0.34) {
      this.queueAiShot(true);
      return;
    }

    if (actor.hp < opponent.hp && realChance >= 0.42) {
      this.queueAiShot(false);
      return;
    }

    if (actor.hp > opponent.hp && realChance < 0.32) {
      this.queueAiShot(true);
      return;
    }

    this.queueAiShot(realChance < 0.38 - profile.aggression * 0.08);
  }

  buySlotUpgrade() {
    const cost = this.getSlotUpgradeCost();
    if (this.profile.coins < cost) {
      this.addLog(`Not enough coins. You need ${cost} to buy another slot.`);
      return;
    }
    if (this.getCapacity(false) >= MAX_POWERUP_CAPACITY) {
      this.addLog("Your power-up rack is already maxed out.");
      return;
    }
    this.profile.coins -= cost;
    this.profile.bonusSlots += 1;
    this.saveProfile();
    this.addLog(`You bought +1 power-up capacity for ${cost} coins.`);
    this.renderProfile();
    this.render();
  }

  getHpUpgradeCost() {
    return 20 + this.profile.bonusHp * 12;
  }

  buyHpUpgrade() {
    const cost = this.getHpUpgradeCost();
    if (this.profile.coins < cost) {
      this.addLog(`Not enough coins. You need ${cost} to buy Reinforced Nerves.`);
      return;
    }
    if (this.profile.bonusHp >= 5) {
      this.addLog("Reinforced Nerves is already maxed out.");
      return;
    }
    this.profile.coins -= cost;
    this.profile.bonusHp += 1;
    this.saveProfile();
    this.addLog(`You bought +1 permanent player HP for ${cost} coins.`);
    this.renderProfile();
    this.render();
  }

  getStarterUpgradeCost() {
    return 18 + this.profile.bonusStartItems * 10;
  }

  buyStarterUpgrade() {
    const cost = this.getStarterUpgradeCost();
    if (this.profile.coins < cost) {
      this.addLog(`Not enough coins. You need ${cost} to buy Lucky Pocket.`);
      return;
    }
    if (this.profile.bonusStartItems >= 4) {
      this.addLog("Lucky Pocket is already maxed out.");
      return;
    }
    this.profile.coins -= cost;
    this.profile.bonusStartItems += 1;
    this.saveProfile();
    this.addLog(`You bought +1 guaranteed starting power-up tier for ${cost} coins.`);
    this.renderProfile();
    this.render();
  }

  buyMedkit() {
    const cost = 15;
    const actor = this.players[0];
    if (!actor || this.matchOver) {
      this.addLog("Start a live match first to use an Emergency Medkit.");
      return;
    }
    const maxHp = this.getStartingHp(false);
    if (actor.hp >= maxHp) {
      this.addLog("Emergency Medkit wasted: Player 1 is already at full HP.");
      return;
    }
    if (this.profile.coins < cost) {
      this.addLog(`Not enough coins. You need ${cost} for an Emergency Medkit.`);
      return;
    }
    this.profile.coins -= cost;
    actor.hp = Math.min(maxHp, actor.hp + 1);
    this.saveProfile();
    this.addLog(`Emergency Medkit used. Player 1 recovered 1 HP for ${cost} coins.`);
    this.renderProfile();
    this.render();
  }

  buyMarketUpgrade(key, label, costBase, step, maxTier) {
    const current = this.profile[key];
    const cost = costBase + current * step;
    if (this.profile.coins < cost) {
      this.addLog(`Not enough coins. You need ${cost} to buy ${label}.`);
      return;
    }
    if (current >= maxTier) {
      this.addLog(`${label} is already maxed out.`);
      return;
    }
    this.profile.coins -= cost;
    this.profile[key] += 1;
    this.saveProfile();
    this.addLog(`You bought ${label} for ${cost} coins.`);
    this.renderProfile();
    this.render();
  }

  buyPhoneUpgrade() { this.buyMarketUpgrade("guaranteedPhone", "Lucky Phone", 14, 10, 3); }
  buyTrapUpgrade() { this.buyMarketUpgrade("guaranteedTrap", "Trap Wire", 16, 10, 3); }
  buyCheeseUpgrade() { this.buyMarketUpgrade("guaranteedCheese", "Cheese Crate", 12, 8, 3); }
  buyWaterUpgrade() { this.buyMarketUpgrade("guaranteedWater", "Water Reserve", 14, 8, 3); }
  buyBountyUpgrade() { this.buyMarketUpgrade("bountyBonus", "Bounty License", 22, 14, 4); }
  buyReviveUpgrade() { this.buyMarketUpgrade("reviveTier", "Second Chance", 26, 18, 2); }

  buyScan() {
    const cost = 10;
    const actor = this.players[0];
    if (!actor || this.matchOver) {
      this.addLog("Start a match first to use Chamber Scan.");
      return;
    }
    if (this.profile.coins < cost) {
      this.addLog(`Not enough coins. You need ${cost} for Chamber Scan.`);
      return;
    }
    this.profile.coins -= cost;
    actor.knowledge.nextBullet = this.chambers[this.currentChamber];
    this.saveProfile();
    this.addLog(`Chamber Scan purchased. Next chamber is ${actor.knowledge.nextBullet}.`);
    this.renderProfile();
    this.render();
  }

  buyInstantInventoryItem(itemKey, label, cost) {
    const actor = this.players[0];
    if (!actor || this.matchOver) {
      this.addLog(`Start a match first to buy ${label}.`);
      return;
    }
    if (this.profile.coins < cost) {
      this.addLog(`Not enough coins. You need ${cost} for ${label}.`);
      return;
    }
    if (actor.inventory.length >= this.getCapacity(false)) {
      this.addLog(`${label} failed: your inventory is already full.`);
      return;
    }
    this.profile.coins -= cost;
    actor.inventory.push(itemKey);
    this.saveProfile();
    this.addLog(`${label} purchased and added to your inventory.`);
    this.renderProfile();
    this.render();
  }

  buyReroll() {
    const cost = 18;
    const actor = this.players[0];
    if (!actor || this.matchOver) {
      this.addLog("Start a match first to reroll your inventory.");
      return;
    }
    if (this.profile.coins < cost) {
      this.addLog(`Not enough coins. You need ${cost} for Inventory Reroll.`);
      return;
    }
    this.profile.coins -= cost;
    actor.inventory = this.generateRandomInventory(false);
    this.saveProfile();
    this.addLog("Inventory Reroll purchased. Player 1 received a fresh loadout.");
    this.renderProfile();
    this.render();
  }

  getPackDetails(pack) {
    if (pack === "starter") {
      return { title: "$1 Starter Drop", price: "$1.00", reward: "500 in-game money" };
    }
    if (pack === "stack") {
      return { title: "$5 Heavy Stack", price: "$5.00", reward: "2600 in-game money" };
    }
    if (pack === "vip") {
      return { title: "VIP Pass", price: "$9.99", reward: "VIP permissions" };
    }
    return null;
  }

  openCheckout(pack) {
    const details = this.getPackDetails(pack);
    if (!details) {
      return;
    }
    this.pendingPurchase = pack;
    elements.checkoutTitle.textContent = details.title;
    elements.checkoutCopy.textContent = `Enter payment details to unlock ${details.reward}.`;
    elements.checkoutSummary.textContent = `${details.price} • ${details.reward}`;
    elements.checkoutOverlay.classList.remove("hidden");
  }

  closeCheckout() {
    this.pendingPurchase = null;
    elements.checkoutOverlay.classList.add("hidden");
    elements.cardNameInput.value = "";
    elements.cardNumberInput.value = "";
    elements.cardExpiryInput.value = "";
    elements.cardCvcInput.value = "";
  }

  confirmCheckout() {
    if (!this.pendingPurchase) {
      return;
    }
    const name = elements.cardNameInput.value.trim();
    const cardNumber = elements.cardNumberInput.value.replace(/\s+/g, "");
    const expiry = elements.cardExpiryInput.value.trim();
    const cvc = elements.cardCvcInput.value.trim();
    if (!name || cardNumber.length < 12 || expiry.length < 4 || cvc.length < 3) {
      this.addLog("Checkout failed: payment details look incomplete.");
      return;
    }
    this.completePurchase(this.pendingPurchase);
    this.closeCheckout();
  }

  completePurchase(pack) {
    if (pack === "starter") {
      this.profile.coins += 500;
      this.addLog("Mock checkout complete: $1 pack delivered 500 in-game money.");
    } else if (pack === "stack") {
      this.profile.coins += 2600;
      this.addLog("Mock checkout complete: $5 pack delivered 2600 in-game money.");
    } else if (pack === "vip") {
      this.profile.vip = true;
      this.addLog("Mock checkout complete: VIP permissions granted.");
    }
    this.saveProfile();
    this.renderProfile();
    this.render();
  }

  toggleObserverMode() {
    if (!this.profile.vip) {
      return;
    }
    this.profile.observerMode = !this.profile.observerMode;
    this.saveProfile();
    this.renderProfile();
    this.render();
    this.addLog(`VIP observer vision turned ${this.profile.observerMode ? "on" : "off"}.`);
  }

  banFlaggedPlayer() {
    if (!this.profile.vip || !this.flaggedPlayer) {
      return;
    }
    this.addLog(`VIP action: ${this.flaggedPlayer} was banned from the active table.`);
    this.addSecurityEvent(`VIP banned ${this.flaggedPlayer} after suspicious activity.`, null);
    this.flaggedPlayer = null;
    this.matchOver = true;
    this.waitingForManualEndTurn = false;
    this.renderProfile();
    this.render();
  }

  getSlotUpgradeCost() {
    return 12 + this.profile.bonusSlots * 8;
  }

  renderProfile() {
    elements.currentUserLabel.textContent = this.profile.name || "Unregistered";
    elements.coinCount.textContent = this.profile.coins;
    const currentCapacity = this.getCapacity(false);
    elements.slotUpgradeCopy.textContent = `Future player inventories can roll up to ${currentCapacity} slots.`;
    const cost = this.getSlotUpgradeCost();
    elements.buySlotBtn.textContent = currentCapacity >= MAX_POWERUP_CAPACITY ? "Maxed Out" : `Buy for ${cost} Coins`;
    elements.buySlotBtn.disabled = currentCapacity >= MAX_POWERUP_CAPACITY || this.profile.coins < cost;
    const hpCost = this.getHpUpgradeCost();
    elements.hpUpgradeCopy.textContent = `Player-only HP bonus: +${this.profile.bonusHp}. Current start HP: ${this.getStartingHp(false)}.`;
    elements.buyHpBtn.textContent = this.profile.bonusHp >= 5 ? "Maxed Out" : `Buy for ${hpCost} Coins`;
    elements.buyHpBtn.disabled = this.profile.bonusHp >= 5 || this.profile.coins < hpCost;
    const starterCost = this.getStarterUpgradeCost();
    elements.starterUpgradeCopy.textContent = `Guaranteed extra starting items: +${this.profile.bonusStartItems}.`;
    elements.buyStarterBtn.textContent = this.profile.bonusStartItems >= 4 ? "Maxed Out" : `Buy for ${starterCost} Coins`;
    elements.buyStarterBtn.disabled = this.profile.bonusStartItems >= 4 || this.profile.coins < starterCost;
    const actor = this.players[0];
    const actorInventorySize = actor ? actor.inventory.length : 0;
    const medkitEnabled = Boolean(actor) && !this.matchOver && actor.hp < this.getStartingHp(false) && this.profile.coins >= 15;
    elements.medkitCopy.textContent = actor
      ? `Player 1 HP: ${actor.hp}/${this.getStartingHp(false)}. Mid-match only.`
      : "Spend 15 coins during a live match to recover 1 HP.";
    elements.buyMedkitBtn.disabled = !medkitEnabled;
    const phoneCost = 14 + this.profile.guaranteedPhone * 10;
    elements.marketPhoneCopy.textContent = `Guaranteed Phones: ${this.profile.guaranteedPhone}.`;
    elements.buyPhoneUpgradeBtn.textContent = this.profile.guaranteedPhone >= 3 ? "Maxed Out" : `Buy for ${phoneCost} Coins`;
    elements.buyPhoneUpgradeBtn.disabled = this.profile.guaranteedPhone >= 3 || this.profile.coins < phoneCost;
    const trapCost = 16 + this.profile.guaranteedTrap * 10;
    elements.marketTrapCopy.textContent = `Guaranteed Traps: ${this.profile.guaranteedTrap}.`;
    elements.buyTrapUpgradeBtn.textContent = this.profile.guaranteedTrap >= 3 ? "Maxed Out" : `Buy for ${trapCost} Coins`;
    elements.buyTrapUpgradeBtn.disabled = this.profile.guaranteedTrap >= 3 || this.profile.coins < trapCost;
    const cheeseCost = 12 + this.profile.guaranteedCheese * 8;
    elements.marketCheeseCopy.textContent = `Guaranteed Cheese: ${this.profile.guaranteedCheese}.`;
    elements.buyCheeseUpgradeBtn.textContent = this.profile.guaranteedCheese >= 3 ? "Maxed Out" : `Buy for ${cheeseCost} Coins`;
    elements.buyCheeseUpgradeBtn.disabled = this.profile.guaranteedCheese >= 3 || this.profile.coins < cheeseCost;
    const waterCost = 14 + this.profile.guaranteedWater * 8;
    elements.marketWaterCopy.textContent = `Guaranteed Waters: ${this.profile.guaranteedWater}.`;
    elements.buyWaterUpgradeBtn.textContent = this.profile.guaranteedWater >= 3 ? "Maxed Out" : `Buy for ${waterCost} Coins`;
    elements.buyWaterUpgradeBtn.disabled = this.profile.guaranteedWater >= 3 || this.profile.coins < waterCost;
    const bountyCost = 22 + this.profile.bountyBonus * 14;
    elements.marketBountyCopy.textContent = `Reward bonus: +${this.profile.bountyBonus * 15}%.`;
    elements.buyBountyUpgradeBtn.textContent = this.profile.bountyBonus >= 4 ? "Maxed Out" : `Buy for ${bountyCost} Coins`;
    elements.buyBountyUpgradeBtn.disabled = this.profile.bountyBonus >= 4 || this.profile.coins < bountyCost;
    const reviveCost = 26 + this.profile.reviveTier * 18;
    elements.marketReviveCopy.textContent = `Revives per match: ${this.profile.reviveTier}. Remaining this match: ${this.revivesRemaining}.`;
    elements.buyReviveUpgradeBtn.textContent = this.profile.reviveTier >= 2 ? "Maxed Out" : `Buy for ${reviveCost} Coins`;
    elements.buyReviveUpgradeBtn.disabled = this.profile.reviveTier >= 2 || this.profile.coins < reviveCost;
    const liveActor = Boolean(actor) && !this.matchOver;
    elements.marketScanCopy.textContent = liveActor ? "Reveal the next chamber instantly right now." : "Requires a live match.";
    elements.buyScanBtn.disabled = !liveActor || this.profile.coins < 10;
    elements.marketInstantCheeseCopy.textContent = liveActor ? `Inventory size: ${actorInventorySize}/${this.getCapacity(false)}.` : "Requires a live match.";
    elements.buyInstantCheeseBtn.disabled = !liveActor || this.profile.coins < 10 || actorInventorySize >= this.getCapacity(false);
    elements.marketInstantTrapCopy.textContent = liveActor ? `Inventory size: ${actorInventorySize}/${this.getCapacity(false)}.` : "Requires a live match.";
    elements.buyInstantTrapBtn.disabled = !liveActor || this.profile.coins < 12 || actorInventorySize >= this.getCapacity(false);
    elements.marketRerollCopy.textContent = liveActor ? `Reroll current loadout of ${actorInventorySize} item(s).` : "Requires a live match.";
    elements.buyRerollBtn.disabled = !liveActor || this.profile.coins < 18;
    if (this.mode === "ai") {
      const preview = this.calculateDealerReward();
      elements.rewardPreview.textContent = this.matchOver && this.lastReward
        ? `Last payout: ${this.lastReward} coins.`
        : `Current dealer bounty: about ${preview} coins if you win now.`;
    } else {
      elements.rewardPreview.textContent = "Coin rewards only drop in Player vs AI.";
    }
    elements.vipStatusLabel.textContent = this.profile.vip ? "VIP Active" : "VIP Offline";
    elements.vipCopy.textContent = this.profile.vip
      ? "Observer vision can expose chamber truth and hacker activity on the live table."
      : "Buy VIP to unlock observer vision and anti-cheat controls.";
    elements.vipObserverBtn.disabled = !this.profile.vip;
    elements.vipObserverBtn.textContent = `Observer Vision: ${this.profile.observerMode ? "On" : "Off"}`;
    elements.vipBanBtn.disabled = !this.profile.vip || !this.flaggedPlayer;
    elements.vipBanBtn.textContent = this.flaggedPlayer ? `Ban ${this.flaggedPlayer}` : "Ban Flagged Player";
    elements.devCard.classList.toggle("hidden", !this.devMode);
    elements.devToggleInfiniteBtn.textContent = `Infinite Power-Ups: ${this.profile.infinitePowerups ? "On" : "Off"}`;
    elements.registerOverlay.classList.toggle("hidden", Boolean(this.profile.name));
    this.renderSecurityLog();
  }

  renderSecurityLog() {
    elements.securityLog.innerHTML = "";
    const entries = this.securityEvents.length > 0
      ? this.securityEvents
      : ["No suspicious activity detected on rrs.com."];
    entries.slice(0, 4).forEach((line) => {
      const item = document.createElement("p");
      item.className = "security-entry";
      item.textContent = line;
      elements.securityLog.appendChild(item);
    });
  }

  renderMeta() {
    elements.phasePills.forEach((pill) => {
      pill.classList.toggle("active", pill.dataset.phase === this.phase);
    });
    elements.roundCounter.textContent = this.turnCount;
    elements.oddsLabel.textContent = this.players.length ? `${Math.round(this.getRealChance() * 100)}%` : "Unknown";
    elements.dealerStyleLabel.textContent = this.mode === "ai" ? this.getDealerProfile().style : "Off";
    this.renderProfile();
  }

  render() {
    const actor = this.getCurrentPlayer();
    this.setPage(this.currentPage);
    this.renderMeta();
    if (!actor) {
      elements.turnTitle.textContent = "Start a new match";
      elements.turnSubtitle.textContent = this.profile.name
        ? `Welcome ${this.profile.name}. Choose a mode, pick a dealer difficulty, and load the cylinder.`
        : "Choose a mode, pick a dealer difficulty, and load the cylinder.";
      elements.nextShotLabel.textContent = "Unknown";
      elements.gunIndicator.classList.add("aim-player");
      elements.gunIndicator.classList.remove("aim-dealer");
      elements.gunTargetLabel.textContent = "Dealer";
      elements.centerPanel.classList.remove("turn-player", "turn-dealer");
      elements.players.forEach((ui, index) => {
        ui.name.textContent = index === 0 ? "Player 1" : "Player 2";
        ui.hp.textContent = String(this.getStartingHp(index === 1));
        ui.status.textContent = "Waiting for match start.";
        ui.card.style.outline = "none";
        ui.card.classList.remove("active-turn");
        ui.inventory.innerHTML = "";
      });
      this.renderChambers();
      this.renderControls();
      return;
    }

    elements.turnTitle.textContent = this.matchOver ? "Match Finished" : `${actor.name}'s turn`;
    elements.turnSubtitle.textContent = this.matchOver
      ? "Start a new match to play again."
      : this.pendingTarget
        ? this.pendingTarget === "self"
          ? "Shot aimed at yourself. Confirm to fire."
          : "Shot aimed at your opponent. Confirm to fire."
        : this.phase === "use"
          ? "Use power-ups, read the table, or take the shot."
          : "Resolve the turn and keep pressure on.";
    if (this.profile.vip && this.profile.observerMode && !this.matchOver) {
      elements.turnSubtitle.textContent += ` Observer sees chamber ${this.currentChamber + 1}: ${this.chambers[this.currentChamber]}.`;
    }

    elements.gunTargetLabel.textContent = this.mode === "ai" ? "Dealer" : (this.players[1]?.name || "Player 2");
    const aimedIndex = this.pendingTarget
      ? (this.pendingTarget === "self" ? this.currentTurn : 1 - this.currentTurn)
      : this.currentTurn;
    elements.gunIndicator.classList.toggle("aim-player", aimedIndex === 0 && !this.matchOver);
    elements.gunIndicator.classList.toggle("aim-dealer", aimedIndex === 1 && !this.matchOver);
    elements.nextShotLabel.textContent = this.matchOver ? "Match Over" : `Chamber ${Math.min(this.currentChamber + 1, 8)} / 8`;

    elements.players.forEach((ui, index) => {
      const player = this.players[index];
      ui.name.textContent = player.name;
      ui.hp.textContent = player.hp;
      ui.status.textContent = this.buildStatus(player, index === this.currentTurn);
      ui.card.style.outline = index === this.currentTurn && !this.matchOver ? "2px solid rgba(242, 166, 90, 0.65)" : "none";
      ui.card.classList.toggle("active-turn", index === this.currentTurn && !this.matchOver);
      this.renderInventory(ui.inventory, player, index);
    });

    elements.centerPanel.classList.toggle("turn-player", aimedIndex === 0 && !this.matchOver);
    elements.centerPanel.classList.toggle("turn-dealer", aimedIndex === 1 && !this.matchOver);
    this.renderChambers();
    this.renderControls();
  }

  buildStatus(player, isCurrent) {
    if (this.matchOver) return player.hp > 0 ? "Winner." : "Defeated.";
    const parts = [];
    if (isCurrent) parts.push("Active turn.");
    if (player.effects.skipTurn) parts.push("Trapped by Mice Trap.");
    if (player.effects.noPowerups) parts.push("Handcuffed from using power-ups.");
    if (player.effects.vestReady) parts.push("Bulletproof Vest ready.");
    if (player.effects.shotgunStacks > 0) {
      parts.push(`Shotgun Bullet armed for ${SHOTGUN_DAMAGE_STEPS[player.effects.shotgunStacks]} damage.`);
    }
    if (player.knowledge.nextBullet) parts.push(`Next chamber: ${player.knowledge.nextBullet}.`);
    if (player.knowledge.phoneReveal) {
      parts.push(`Phone says chamber ${player.knowledge.phoneReveal.chamberIndex + 1} is ${player.knowledge.phoneReveal.bulletType}.`);
    }
    if (!player.isAi) parts.push(`Capacity: ${this.getCapacity(false)}.`);
    return parts.join(" ") || "Waiting.";
  }

  renderInventory(container, player, playerIndex) {
    container.innerHTML = "";
    if (player.inventory.length === 0) {
      const empty = document.createElement("p");
      empty.className = "status-line";
      empty.textContent = "No power-ups left. New ones arrive after the cylinder reloads.";
      container.appendChild(empty);
      return;
    }
    player.inventory.forEach((key, slotIndex) => {
      const fragment = elements.powerupTemplate.content.cloneNode(true);
      const button = fragment.querySelector("button");
      button.innerHTML = `${POWERUPS[key].name}<small>${POWERUPS[key].description}</small>`;
      button.disabled = this.matchOver || playerIndex !== this.currentTurn || this.waitingForManualEndTurn || player.effects.skipTurn;
      button.addEventListener("click", () => this.usePowerup(playerIndex, slotIndex));
      container.appendChild(button);
    });
  }

  renderChambers() {
    elements.chamberRing.innerHTML = "";
    for (let i = 0; i < 8; i += 1) {
      const chamber = document.createElement("div");
      chamber.className = "chamber";
      chamber.textContent = i + 1;
      if (i < this.currentChamber) {
        chamber.classList.add("used");
        chamber.classList.add(this.chambers[i] === "real" ? "revealed-real" : "revealed-fake");
      } else if (i === this.currentChamber && !this.matchOver) {
        chamber.classList.add("current");
      }
      elements.chamberRing.appendChild(chamber);
    }
  }

  renderControls() {
    const currentPlayer = this.getCurrentPlayer();
    const isAiTurn = currentPlayer?.isAi;
    const trapped = currentPlayer?.effects.skipTurn;
    const disabled = this.matchOver || isAiTurn;
    elements.shootSelf.disabled = disabled || this.waitingForManualEndTurn || trapped;
    elements.shootOpponent.disabled = disabled || this.waitingForManualEndTurn || trapped;
    elements.confirmShot.disabled = disabled || trapped || !this.pendingTarget;
    elements.cancelShot.disabled = disabled || trapped || !this.pendingTarget;
  }

  renderLog() {
    elements.logOutput.innerHTML = "";
    this.logs.forEach((line) => {
      const entry = document.createElement("p");
      entry.className = "log-entry";
      entry.textContent = line;
      elements.logOutput.appendChild(entry);
    });
  }

  registerName(name) {
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) return;
    this.profile.name = trimmed;
    this.devMode = trimmed === DEV_NAME;
    if (!this.devMode) {
      this.profile.infinitePowerups = false;
    }
    this.saveProfile();
    this.renderProfile();
    this.render();
    this.addLog(this.devMode ? `${trimmed} detected. Dev mode unlocked.` : `Profile loaded for ${trimmed}.`);
  }

  openRegistration() {
    elements.registerOverlay.classList.remove("hidden");
    elements.nameInput.value = this.profile.name || "";
    elements.nameInput.focus();
  }

  giveAllPowerups() {
    const actor = this.players[0];
    if (!actor) {
      this.addLog("Start a match first to inject power-ups.");
      return;
    }
    actor.inventory = [...POWERUP_KEYS, ...POWERUP_KEYS];
    this.addLog("Dev console granted Player 1 a full stack of power-ups.");
    this.addSecurityEvent(`${this.profile.name || "Unknown player"} injected all power-ups with dev tools.`, this.profile.name || "Unknown player");
    this.render();
  }

  toggleInfinitePowerups() {
    this.profile.infinitePowerups = !this.profile.infinitePowerups;
    this.saveProfile();
    this.renderProfile();
    this.addLog(`Dev console turned infinite power-ups ${this.profile.infinitePowerups ? "on" : "off"}.`);
    this.addSecurityEvent(`${this.profile.name || "Unknown player"} toggled infinite power-ups.`, this.profile.name || "Unknown player");
  }

  healPlayer() {
    const actor = this.players[0];
    if (!actor) {
      this.addLog("Start a match first to heal.");
      return;
    }
    actor.hp = this.getStartingHp();
    this.addLog("Dev console restored Player 1 to full HP.");
    this.addSecurityEvent(`${this.profile.name || "Unknown player"} used full-heal dev tool.`, this.profile.name || "Unknown player");
    this.render();
  }

  forceReload() {
    if (!this.players.length) {
      this.addLog("Start a match first to force a reload.");
      return;
    }
    this.addLog("Dev console forced a cylinder reload.");
    this.addSecurityEvent(`${this.profile.name || "Unknown player"} forced a reload through dev tools.`, this.profile.name || "Unknown player");
    this.refillEmptyInventories();
    this.chambers = this.buildCylinder();
    this.currentChamber = 0;
    this.reloadCount += 1;
    this.setPhase("reload");
    this.render();
  }

  runDevCommand(command) {
    if (!this.devMode) return;
    const normalized = command.trim().toLowerCase();
    if (!normalized) return;
    if (normalized === "all") this.giveAllPowerups();
    else if (normalized === "infinite") this.toggleInfinitePowerups();
    else if (normalized === "heal") this.healPlayer();
    else if (normalized === "reload") this.forceReload();
    else this.addLog(`Unknown dev command: ${normalized}.`);
  }
}

const game = new Game();

elements.siteTabs.forEach((button) => {
  button.addEventListener("click", () => {
    game.setPage(button.dataset.page);
  });
});

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    elements.modeButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    game.mode = button.dataset.mode;
    game.renderProfile();
    game.render();
  });
});

elements.premiumOffers.forEach((button) => {
  button.addEventListener("click", () => {
    game.openCheckout(button.dataset.pack);
  });
});

elements.cancelCheckoutBtn.addEventListener("click", () => {
  game.closeCheckout();
});

elements.confirmCheckoutBtn.addEventListener("click", () => {
  game.confirmCheckout();
});

elements.difficultySelect.addEventListener("change", (event) => {
  game.difficulty = event.target.value;
  game.renderProfile();
  game.render();
});

elements.buySlotBtn.addEventListener("click", () => {
  game.buySlotUpgrade();
});

elements.buyHpBtn.addEventListener("click", () => {
  game.buyHpUpgrade();
});

elements.buyStarterBtn.addEventListener("click", () => {
  game.buyStarterUpgrade();
});

elements.buyMedkitBtn.addEventListener("click", () => {
  game.buyMedkit();
});

elements.buyPhoneUpgradeBtn.addEventListener("click", () => {
  game.buyPhoneUpgrade();
});

elements.buyTrapUpgradeBtn.addEventListener("click", () => {
  game.buyTrapUpgrade();
});

elements.buyCheeseUpgradeBtn.addEventListener("click", () => {
  game.buyCheeseUpgrade();
});

elements.buyWaterUpgradeBtn.addEventListener("click", () => {
  game.buyWaterUpgrade();
});

elements.buyBountyUpgradeBtn.addEventListener("click", () => {
  game.buyBountyUpgrade();
});

elements.buyReviveUpgradeBtn.addEventListener("click", () => {
  game.buyReviveUpgrade();
});

elements.buyScanBtn.addEventListener("click", () => {
  game.buyScan();
});

elements.buyInstantCheeseBtn.addEventListener("click", () => {
  game.buyInstantInventoryItem("cheese", "Instant Cheese", 10);
});

elements.buyInstantTrapBtn.addEventListener("click", () => {
  game.buyInstantInventoryItem("miceTrap", "Instant Trap", 12);
});

elements.buyRerollBtn.addEventListener("click", () => {
  game.buyReroll();
});

elements.vipObserverBtn.addEventListener("click", () => {
  game.toggleObserverMode();
});

elements.vipBanBtn.addEventListener("click", () => {
  game.banFlaggedPlayer();
});

elements.saveNameBtn.addEventListener("click", () => {
  game.registerName(elements.nameInput.value);
});

elements.nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    game.registerName(elements.nameInput.value);
  }
});

elements.devAllPowerupsBtn.addEventListener("click", () => {
  game.giveAllPowerups();
});

elements.devToggleInfiniteBtn.addEventListener("click", () => {
  game.toggleInfinitePowerups();
});

elements.devHealBtn.addEventListener("click", () => {
  game.healPlayer();
});

elements.devReloadBtn.addEventListener("click", () => {
  game.forceReload();
});

elements.devConsoleRunBtn.addEventListener("click", () => {
  game.runDevCommand(elements.devConsoleInput.value);
  elements.devConsoleInput.value = "";
});

elements.devConsoleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    game.runDevCommand(elements.devConsoleInput.value);
    elements.devConsoleInput.value = "";
  }
});

elements.changeUserBtn.addEventListener("click", () => {
  game.openRegistration();
});

elements.newGame.addEventListener("click", () => {
  game.start(game.mode);
});

elements.shootSelf.addEventListener("click", () => {
  game.aimShot(true);
});

elements.shootOpponent.addEventListener("click", () => {
  game.aimShot(false);
});

elements.confirmShot.addEventListener("click", () => {
  game.confirmShot();
});

elements.cancelShot.addEventListener("click", () => {
  game.cancelAim();
});

game.render();
