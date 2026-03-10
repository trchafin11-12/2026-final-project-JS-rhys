// ============================================================================
// IDK GAME
// Complete multi-mode arcade game with progression, achievements, themes
// ============================================================================

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONSTANTS = {
  // Canvas
  WIDTH: 800,
  HEIGHT: 600,
  CENTER_X: 400,
  CENTER_Y: 300,

  // Game mechanics
  ARC_RADIUS: 200,
  NEEDLE_LENGTH: 180,
  PERFECT_ARC_BASE: 0.3,
  ROTATION_SPEED_BASE: 5,
  MIN_ARC_SIZE: 0.15,
  MAX_ARC_SIZE: 0.6,

  // Difficulty scaling
  DIFFICULTY_PER_POINT: 0.001,
  DIRECTION_CHANGE_CHANCE_BASE: 0.02,
  DIRECTION_CHANGE_CHANCE_MAX: 0.15,

  // Game modes
  TIME_ATTACK_DURATION: 60000,
  COMBO_DECAY_TIME: 3000,

  // Hardcore chaos
  HARDCORE_DIRECTION_FLIP_CHANCE: 0.04,
  HARDCORE_ARC_TELEPORT_CHANCE: 0.03,
  HARDCORE_SPEED_MULTIPLIER: 1.4,
  HARDCORE_MIN_ARC_SIZE: 0.1,

  // Power-ups
  POWER_UP_SPAWN_CHANCE: 0.02,
  POWER_UP_DURATION: 4000,

  // Visual
  EASE_DURATION: 300,
  COMBO_VISUAL_SCALE: 0.1,
  PERFECT_CAMERA_ZOOM: 1.05,

  // Themes
  THEMES: {
    darkmode: {
      name: 'Dark Mode',
      bg: 0x0a0a0a,
      arc: 0x0064ff,
      needle: 0x0064ff,
      glow: 0x0064ff,
      unlocked: true
    },
    whitemode: {
      name: 'White Mode',
      bg: 0xffffff,
      arc: 0x0064ff,
      needle: 0x0064ff,
      glow: 0x0064ff,
      unlocked: true
    }
  },

  // Achievements
  ACHIEVEMENTS: {
    firstPerfect: { id: 'firstPerfect', name: 'Perfect Shot', desc: 'Hit your first perfect', icon: '⭐' },
    combo10: { id: 'combo10', name: 'On Fire', desc: '10 hit combo', icon: '🔥' },
    hits50: { id: 'hits50', name: '50 Striker', desc: '50 total hits', icon: '💪' },
    score1000: { id: 'score1000', name: 'Scorer', desc: '1000 total score', icon: '🎯' },
    hardcore30: { id: 'hardcore30', name: 'Chaos Master', desc: 'Survive 30s Hardcore', icon: '⚡' },
    perfects25: { id: 'perfects25', name: 'Precision Master', desc: '25 perfects in one run', icon: '✨' },
    allModes: { id: 'allModes', name: 'Mode Explorer', desc: 'Play all game modes', icon: '🎮' },
    allThemes: { id: 'allThemes', name: 'Collector', desc: 'Unlock all themes', icon: '🎨' }
  }
};

// ============================================================================
// PLAYER DATA SYSTEM
// ============================================================================

class PlayerProfile {
  constructor() {
    this.totalScore = 0;
    this.totalPerfects = 0;
    this.gamesPlayed = 0;
    this.bestCombo = 0;
    this.totalHits = 0;
    this.highScores = {
      classic: 0,
      timeAttack: 0,
      zen: 0,
      hardcore: 0
    };
    this.unlockedThemes = ['darkmode'];
    this.unlockedModes = ['classic', 'timeAttack', 'zen'];
    this.achievements = {};
    this.currentTheme = 'darkmode';
    this.settings = {
      screenShake: true,
      slowMotion: true,
      difficulty: 'normal',
      glow: true
    };
    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem('precision_pulse_profile');
      if (data) {
        const loaded = JSON.parse(data);
        Object.assign(this, loaded);
      }
    } catch (e) {
      console.log('Fresh profile created');
    }
  }

  save() {
    try {
      localStorage.setItem('precision_pulse_profile', JSON.stringify({
        totalScore: this.totalScore,
        totalPerfects: this.totalPerfects,
        gamesPlayed: this.gamesPlayed,
        bestCombo: this.bestCombo,
        totalHits: this.totalHits,
        highScores: this.highScores,
        unlockedThemes: this.unlockedThemes,
        unlockedModes: this.unlockedModes,
        achievements: this.achievements,
        currentTheme: this.currentTheme,
        settings: this.settings
      }));
    } catch (e) {
      console.log('Save failed');
    }
  }

  reset() {
    if (confirm('Reset all progress? This cannot be undone.')) {
      this.totalScore = 0;
      this.totalPerfects = 0;
      this.gamesPlayed = 0;
      this.bestCombo = 0;
      this.totalHits = 0;
      this.highScores = { classic: 0, timeAttack: 0, zen: 0, hardcore: 0 };
      this.achievements = {};
      this.save();
      return true;
    }
    return false;
  }
}

// ============================================================================
// MATH UTILITIES
// ============================================================================

function normalizeAngle(angle) {
  let normalized = angle % (Math.PI * 2);
  if (normalized < 0) normalized += Math.PI * 2;
  return normalized;
}

function angleDistance(a1, a2) {
  let diff = normalizeAngle(a2 - a1);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff;
}

function isAngleInArc(angle, arcCenter, arcSize) {
  angle = normalizeAngle(angle);
  arcCenter = normalizeAngle(arcCenter);

  const halfArc = arcSize / 2;
  const arcStart = normalizeAngle(arcCenter - halfArc);
  const arcEnd = normalizeAngle(arcCenter + halfArc);

  // Handle wrap around
  if (arcStart < arcEnd) {
    return angle >= arcStart && angle <= arcEnd;
  } else {
    return angle >= arcStart || angle <= arcEnd;
  }
}

function calculateDifficulty(score, mode) {
  let rotationSpeed = CONSTANTS.ROTATION_SPEED_BASE;
  let arcSize = CONSTANTS.MAX_ARC_SIZE;
  let perfectSize = CONSTANTS.PERFECT_ARC_BASE;
  let directionChangeChance = CONSTANTS.DIRECTION_CHANGE_CHANCE_BASE;

  const scoreMultiplier = Math.min(score * CONSTANTS.DIFFICULTY_PER_POINT, 2);

  switch (mode) {
    case 'classic':
      rotationSpeed = CONSTANTS.ROTATION_SPEED_BASE + scoreMultiplier;
      arcSize = Math.max(CONSTANTS.MAX_ARC_SIZE - scoreMultiplier * 0.1, CONSTANTS.MIN_ARC_SIZE);
      perfectSize = CONSTANTS.PERFECT_ARC_BASE - scoreMultiplier * 0.05;
      directionChangeChance = Math.min(CONSTANTS.DIRECTION_CHANGE_CHANCE_BASE + scoreMultiplier * 0.02, CONSTANTS.DIRECTION_CHANGE_CHANCE_MAX);
      break;

    case 'timeAttack':
      rotationSpeed = CONSTANTS.ROTATION_SPEED_BASE + scoreMultiplier * 0.5;
      arcSize = CONSTANTS.MAX_ARC_SIZE;
      perfectSize = CONSTANTS.PERFECT_ARC_BASE;
      break;

    case 'zen':
      rotationSpeed = CONSTANTS.ROTATION_SPEED_BASE * 0.7;
      arcSize = CONSTANTS.MAX_ARC_SIZE * 1.2;
      perfectSize = CONSTANTS.PERFECT_ARC_BASE + 0.1;
      break;

    case 'hardcore':
      rotationSpeed = (CONSTANTS.ROTATION_SPEED_BASE + scoreMultiplier) * CONSTANTS.HARDCORE_SPEED_MULTIPLIER;
      arcSize = Math.max(CONSTANTS.MAX_ARC_SIZE - scoreMultiplier * 0.15, CONSTANTS.HARDCORE_MIN_ARC_SIZE);
      perfectSize = CONSTANTS.PERFECT_ARC_BASE * 0.8;
      directionChangeChance = Math.min(CONSTANTS.DIRECTION_CHANGE_CHANCE_BASE + scoreMultiplier * 0.03, CONSTANTS.DIRECTION_CHANGE_CHANCE_MAX);
      break;
  }

  directionChangeChance = Math.max(directionChangeChance, 0);
  directionChangeChance = Math.min(directionChangeChance, CONSTANTS.DIRECTION_CHANGE_CHANCE_MAX);

  return {
    rotationSpeed,
    arcSize,
    perfectSize,
    directionChangeChance
  };
}

function spawnPowerUpArc() {
  const types = ['slowMo', 'doublePoints', 'bigArc', 'reverse'];
  return types[Math.floor(Math.random() * types.length)];
}

// ============================================================================
// ACHIEVEMENT SYSTEM
// ============================================================================

function unlockAchievement(profile, achievementId, scene) {
  if (!profile.achievements[achievementId]) {
    profile.achievements[achievementId] = Date.now();
    profile.save();

    const ach = CONSTANTS.ACHIEVEMENTS[achievementId];
    if (ach) {
      showAchievementPopup(scene, ach);
    }
  }
}

function checkAchievements(profile, gameData, scene) {
  // First Perfect
  if (!profile.achievements.firstPerfect && gameData.perfects > 0) {
    unlockAchievement(profile, 'firstPerfect', scene);
  }

  // 10 Combo
  if (!profile.achievements.combo10 && gameData.combo >= 10) {
    unlockAchievement(profile, 'combo10', scene);
  }

  // 50 Total Hits
  if (!profile.achievements.hits50 && profile.totalHits >= 50) {
    unlockAchievement(profile, 'hits50', scene);
  }

  // 1000 Total Score
  if (!profile.achievements.score1000 && profile.totalScore >= 1000) {
    unlockAchievement(profile, 'score1000', scene);
  }

  // Hardcore 30s
  if (!profile.achievements.hardcore30 && gameData.mode === 'hardcore' && gameData.timeLeft <= 30000 && gameData.timeLeft > 0) {
    unlockAchievement(profile, 'hardcore30', scene);
  }

  // 25 Perfects in one run
  if (!profile.achievements.perfects25 && gameData.perfects >= 25) {
    unlockAchievement(profile, 'perfects25', scene);
  }

  // All modes played
  if (!profile.achievements.allModes) {
    const modes = new Set(profile.highScores);
    if (Object.keys(profile.highScores).length === 4) {
      const allPlayed = Object.values(profile.highScores).some(score => score > 0);
      if (allPlayed) {
        unlockAchievement(profile, 'allModes', scene);
      }
    }
  }

  // All themes unlocked
  if (!profile.achievements.allThemes && profile.unlockedThemes.length === Object.keys(CONSTANTS.THEMES).length) {
    unlockAchievement(profile, 'allThemes', scene);
  }
}

function showAchievementPopup(scene, achievement) {
  const popup = scene.add.container(CONSTANTS.WIDTH - 150, 80);
  
  const bg = scene.add.rectangle(0, 0, 280, 70, 0x000000);
  bg.setStrokeStyle(2, 0xffff00);
  bg.setAlpha(0.9);
  
  const icon = scene.add.text(-100, 0, achievement.icon, { fontSize: '32px' }).setOrigin(0.5);
  const name = scene.add.text(-50, -15, achievement.name, { fontSize: '16px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0);
  const desc = scene.add.text(-50, 10, achievement.desc, { fontSize: '12px', fill: '#ffffff' }).setOrigin(0);
  
  popup.add([bg, icon, name, desc]);
  
  scene.tweens.add({
    targets: popup,
    y: 100,
    duration: 500,
    ease: 'Cubic.easeOut'
  });
  
  scene.time.delayedCall(4000, () => {
    scene.tweens.add({
      targets: popup,
      alpha: 0,
      duration: 500,
      ease: 'Linear',
      onComplete: () => popup.destroy()
    });
  });
}

// ============================================================================
// THEME SYSTEM
// ============================================================================

function applyTheme(scene, themeName) {
  const theme = CONSTANTS.THEMES[themeName] || CONSTANTS.THEMES.default;
  scene.theme = theme;
  
  if (scene.bg) {
    scene.bg.setFillStyle(theme.bg);
  }
  
  scene.registry.set('currentTheme', themeName);
}

// ============================================================================
// SCENE: BOOT
// ============================================================================

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.profile = new PlayerProfile();
    this.registry.set('profile', this.profile);
    
    applyTheme(this, this.profile.currentTheme);
    
    // Apply glow effect setting
    const gameElement = document.getElementById('game');
    if (gameElement) {
      if (!this.profile.settings.glow) {
        gameElement.classList.add('glow-off');
      } else {
        gameElement.classList.remove('glow-off');
      }
    }
    
    this.time.delayedCall(500, () => {
      this.scene.start('MainMenuScene');
    });
  }
}

// ============================================================================
// SCENE: MAIN MENU
// ============================================================================

class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create() {
    this.profile = this.registry.get('profile');
    
    // Beautiful gradient background
    this.bg = this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, 0x0a0a0a);
    this.add.rectangle(CONSTANTS.CENTER_X, 0, CONSTANTS.WIDTH, 300, 0x1a3a3a).setAlpha(0.4);
    this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.HEIGHT, CONSTANTS.WIDTH, 200, 0x0a2a2a).setAlpha(0.3);
    
    applyTheme(this, this.profile.currentTheme);

    // Secret code tracker
    this.secretCode = '';
    this.secretCodeText = this.add.text(10, CONSTANTS.HEIGHT - 20, 'Secret: _____', {
      fontSize: '10px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0);

    // Title with glow effect
    this.add.text(CONSTANTS.CENTER_X, 50, 'IDK GAME', {
      fontSize: '56px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setStroke('#0064ff', 4).setShadow(0, 0, '#0064ff', 10, true, true);

    // Subtitle
    this.add.text(CONSTANTS.CENTER_X, 115, 'rhys best game', {
      fontSize: '22px',
      fill: '#ffffff',
      fontStyle: 'italic',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setAlpha(0.85).setShadow(0, 0, '#0064ff', 3, true, true);

    // Play button
    const playBtn = this.createButton(CONSTANTS.CENTER_X, 220, 'PLAY', 140, 45);
    playBtn.on('pointerdown', () => {
      this.scene.start('ModeSelectScene');
    });

    // Stats button
    const statsBtn = this.createButton(CONSTANTS.CENTER_X, 290, 'STATS', 140, 45);
    statsBtn.on('pointerdown', () => {
      this.scene.start('StatsScene');
    });

    // Settings button
    const settingsBtn = this.createButton(CONSTANTS.CENTER_X, 360, 'SETTINGS', 140, 45);
    settingsBtn.on('pointerdown', () => {
      this.scene.start('SettingsScene');
    });

    // Stats display with better styling
    const statsBg = this.add.rectangle(CONSTANTS.CENTER_X, 475, 420, 95, 0x0a1a2e);
    statsBg.setStrokeStyle(3, 0x0064ff);
    statsBg.setAlpha(0.85);
    
    this.add.text(CONSTANTS.CENTER_X, 435, 'YOUR STATS', {
      fontSize: '13px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setShadow(0, 0, '#0064ff', 3, true, true);
    
    this.add.text(CONSTANTS.CENTER_X, 465, `Score: ${this.profile.totalScore} pts  |  Games: ${this.profile.gamesPlayed}  |  Combo: ${this.profile.bestCombo}`, {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Setup keyboard for secret code
    this.input.keyboard.on('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (/^[a-z]$/.test(key)) {
        this.secretCode += key;
        if (this.secretCode.length > 5) {
          this.secretCode = this.secretCode.slice(-5);
        }
        this.updateSecretDisplay();
        
        if (this.secretCode === 'rhys') {
          this.activatePlatformer();
          this.secretCode = '';
        }
      }
    });
  }

  updateSecretDisplay() {
    const display = this.secretCode.padEnd(5, '_');
    this.secretCodeText.setText(`Secret: ${display}`);
  }

  activatePlatformer() {
    this.scene.start('PlatformerScene');
  }

  createButton(x, y, text, width, height) {
    // Button background with gradient effect
    const btn = this.add.rectangle(x, y, width, height, 0x00ff00);
    btn.setAlpha(0.85);
    btn.setInteractive();
    btn.setStrokeStyle(3, 0x0064ff);
    btn.setDepth(1);

    // Glow shadow effect
    const glow = this.add.rectangle(x, y, width, height, 0x00ff00);
    glow.setAlpha(0.2);
    glow.setDepth(0);

    const btnText = this.add.text(x, y, text, {
      fontSize: '18px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(2).setShadow(0, 0, '#0064ff', 2, true, true);

    btn.on('pointerover', () => {
      this.tweens.add({
        targets: [btn, btnText],
        scale: 1.12,
        duration: 120,
        ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: btn,
        alpha: 1,
        duration: 120
      });
      this.tweens.add({
        targets: glow,
        alpha: 0.4,
        duration: 120
      });
    });

    btn.on('pointerout', () => {
      this.tweens.add({
        targets: [btn, btnText],
        scale: 1,
        duration: 150,
        ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: btn,
        alpha: 0.85,
        duration: 150
      });
      this.tweens.add({
        targets: glow,
        alpha: 0.2,
        duration: 150
      });
    });

    return btn;
  }
}

// ============================================================================
// SCENE: MODE SELECT
// ============================================================================

class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super('ModeSelectScene');
  }


  create() {
    this.profile = this.registry.get('profile');
    this.bg = this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, 0x0a0a0a);
    applyTheme(this, this.profile.currentTheme);

    this.add.text(CONSTANTS.CENTER_X, 50, 'SELECT MODE', {
      fontSize: '48px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setStroke('#0064ff', 2);

    const modes = [
      { key: 'classic', name: 'CLASSIC', desc: 'One miss ends it', y: 160 },
      { key: 'timeAttack', name: 'TIME ATTACK', desc: '60 seconds', y: 240 },
      { key: 'zen', name: 'ZEN', desc: 'No stress mode', y: 320 },
      { key: 'hardcore', name: 'HARDCORE', desc: 'Chaos reigns', y: 400 }
    ];

    modes.forEach(mode => {
      const btn = this.add.rectangle(CONSTANTS.CENTER_X, mode.y, 280, 60, 0x00ff00);
      btn.setAlpha(0.7);
      btn.setInteractive();
      btn.setStrokeStyle(2, 0x0064ff);

      this.add.text(CONSTANTS.CENTER_X - 80, mode.y - 12, mode.name, {
        fontSize: '20px',
        fill: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'Arial'
      }).setOrigin(0);

      this.add.text(CONSTANTS.CENTER_X - 80, mode.y + 12, mode.desc, {
        fontSize: '13px',
        fill: '#ffffff'
      }).setOrigin(0);

      btn.on('pointerdown', () => {
        this.registry.set('selectedMode', mode.key);
        this.scene.start('GameScene');
      });

      btn.on('pointerover', () => {
        this.tweens.add({
          targets: btn,
          scale: 1.05,
          alpha: 1,
          duration: 150
        });
      });

      btn.on('pointerout', () => {
        this.tweens.add({
          targets: btn,
          scale: 1,
          alpha: 0.7,
          duration: 150
        });
      });
    });

    // Game Mode Packs Section
    this.add.text(CONSTANTS.CENTER_X, 420, 'GAME MODE PACKS', {
      fontSize: '16px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Featured Game Mode
    this.add.text(CONSTANTS.CENTER_X, 410, 'FEATURED', {
      fontSize: '14px',
      fill: '#00ff00',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    const featuredBtn = this.add.rectangle(CONSTANTS.CENTER_X, 437, 380, 45, 0x006600);
    featuredBtn.setAlpha(0.8);
    featuredBtn.setInteractive();
    featuredBtn.setStrokeStyle(3, 0x00ff00);

    this.add.text(CONSTANTS.CENTER_X - 170, 427, 'GRAVITY COLLAPSE: SOLO', {
      fontSize: '14px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0);

    this.add.text(CONSTANTS.CENTER_X - 170, 447, 'Physics-based survival action. Last survivor on a collapsing space city.', {
      fontSize: '10px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0);

    featuredBtn.on('pointerover', () => {
      this.tweens.add({
        targets: featuredBtn,
        alpha: 1,
        scale: 1.05,
        duration: 150
      });
    });

    featuredBtn.on('pointerout', () => {
      this.tweens.add({
        targets: featuredBtn,
        alpha: 0.8,
        scale: 1,
        duration: 150
      });
    });

    featuredBtn.on('pointerdown', () => {
      alert('GRAVITY COLLAPSE: SOLO\n\nCore Features:\n- Dynamic gravity engine (5 gravity states)\n- Combat with Energy Rifle & Gravity Pulse\n- Progressive upgrades & skill tree\n- Floating city environments\n- Boss fight at gravity core\n- Roguelike mode with permadeath\n- Time attack leaderboard\n\nMission: Reach the central Gravity Core and stabilize it before the city is torn apart!\n\nComing soon...');
    });

    // Regular Game Mode Packs Section
    this.add.text(CONSTANTS.CENTER_X, 495, 'GAME MODE PACKS', {
      fontSize: '16px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    const gameModes = [
      { name: 'Sci-Fi Shooter', desc: 'Gravity, Core, Hunter', color: 0x0064ff },
      { name: 'Survival Horror', desc: 'Echoes, Sanity, Mimic', color: 0x00ff00 },
      { name: 'Fantasy RPG', desc: 'Siege, Dungeon, Relics', color: 0x0064ff },
      { name: 'Arcade Chaos', desc: 'Lava, Tag, Size, Hole', color: 0x00ff00 }
    ];

    let modeY = 525;
    gameModes.forEach((mode, index) => {
      const modeBtn = this.add.rectangle(CONSTANTS.CENTER_X, modeY, 320, 30, mode.color);
      modeBtn.setAlpha(0.7);
      modeBtn.setInteractive();
      modeBtn.setStrokeStyle(2, 0x00ff00);

      this.add.text(CONSTANTS.CENTER_X - 140, modeY - 6, mode.name, {
        fontSize: '12px',
        fill: '#000000',
        fontStyle: 'bold',
        fontFamily: 'Arial'
      }).setOrigin(0);

      this.add.text(CONSTANTS.CENTER_X - 140, modeY + 5, mode.desc, {
        fontSize: '10px',
        fill: '#000000',
        fontFamily: 'Arial'
      }).setOrigin(0);

      modeBtn.on('pointerover', () => {
        this.tweens.add({
          targets: modeBtn,
          alpha: 1,
          scale: 1.05,
          duration: 150
        });
      });

      modeBtn.on('pointerout', () => {
        this.tweens.add({
          targets: modeBtn,
          alpha: 0.7,
          scale: 1,
          duration: 150
        });
      });

      modeBtn.on('pointerdown', () => {
        console.log('Selected mode pack: ' + mode.name);
      });

      modeY += 35;
    });

    // Back button
    const backBtn = this.add.text(30, CONSTANTS.HEIGHT - 30, '< BACK', {
      fontSize: '14px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0).setInteractive();

    backBtn.on('pointerover', () => {
      backBtn.setFill('#ffffff');
    });
    backBtn.on('pointerout', () => {
      backBtn.setFill('#ffffff');
    });

    backBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }
}

// ============================================================================
// SCENE: GAME
// ============================================================================

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.profile = this.registry.get('profile');
    this.mode = this.registry.get('selectedMode') || 'classic';
    
    applyTheme(this, this.profile.currentTheme);

    this.bg = this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, this.theme.bg);
    
    // Pulse background
    this.tweens.add({
      targets: this.bg,
      alpha: { from: 0.4, to: 0.6 },
      duration: 2000,
      yoyo: true,
      loop: -1
    });

    // Game state
    this.gameData = {
      score: 0,
      lives: this.mode === 'zen' ? 999 : 1,
      combo: 0,
      maxCombo: 0,
      hits: 0,
      misses: 0,
      perfects: 0,
      mode: this.mode,
      gameOver: false,
      paused: false,
      timeLeft: this.mode === 'timeAttack' ? CONSTANTS.TIME_ATTACK_DURATION : null,
      powerUpActive: null,
      powerUpTimeLeft: 0
    };

    // Game mechanics
    this.needleAngle = 0;
    this.needleRotationSpeed = CONSTANTS.ROTATION_SPEED_BASE;
    this.arcCenter = Math.random() * Math.PI * 2;
    this.arcSize = CONSTANTS.MAX_ARC_SIZE;
    this.perfectSize = CONSTANTS.PERFECT_ARC_BASE;
    this.directionCW = Math.random() > 0.5;
    this.timeSinceArcSpawn = 0;
    this.comboDecayTime = CONSTANTS.COMBO_DECAY_TIME;

    this.setupUI();
    this.setupInput();
    this.createArena();

    if (this.mode === 'hardcore') {
      this.setupHardcoreEffects();
    }

    if (this.mode === 'timeAttack') {
      this.timeAttackInterval = setInterval(() => {
        if (!this.gameData.gameOver && !this.gameData.paused) {
          this.gameData.timeLeft -= 1000;
          if (this.gameData.timeLeft <= 0) {
            this.gameData.timeLeft = 0;
            clearInterval(this.timeAttackInterval);
            this.endGame();
          }
        }
      }, 1000);
    }
  }

  setupUI() {
    // Top bar background
    const topBar = this.add.rectangle(CONSTANTS.CENTER_X, 35, CONSTANTS.WIDTH, 70, 0x000000);
    topBar.setStrokeStyle(2, 0x0064ff);
    topBar.setAlpha(0.9);

    this.scoreText = this.add.text(20, 12, '', { fontSize: '16px', fill: '#ffffff', fontStyle: 'bold', fontFamily: 'Arial' });
    this.comboText = this.add.text(CONSTANTS.CENTER_X - 60, 12, '', { fontSize: '16px', fill: '#ffffff', fontStyle: 'bold', fontFamily: 'Arial' }).setOrigin(0);
    this.modeText = this.add.text(CONSTANTS.WIDTH - 20, 12, this.mode.toUpperCase(), { fontSize: '12px', fill: '#ffffff', fontFamily: 'Arial' }).setOrigin(1, 0);

    this.timerText = null;
    if (this.mode === 'timeAttack') {
      this.timerText = this.add.text(CONSTANTS.CENTER_X, 50, '', { fontSize: '20px', fill: '#ffffff', fontStyle: 'bold', fontFamily: 'Arial' }).setOrigin(0.5);
    }

    // Restart button
    const restartBtnBg = this.add.rectangle(CONSTANTS.WIDTH - 90, 35, 100, 40, 0x00ff00);
    restartBtnBg.setAlpha(0.8);
    restartBtnBg.setInteractive({ useHandCursor: true });
    restartBtnBg.setStrokeStyle(2, 0x0064ff);
    
    const restartBtnText = this.add.text(CONSTANTS.WIDTH - 90, 35, 'RESTART', {
      fontSize: '13px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    restartBtnText.setInteractive({ useHandCursor: false });

    restartBtnBg.on('pointerdown', () => {
      this.scene.restart();
    });

    restartBtnBg.on('pointerover', () => {
      this.tweens.add({
        targets: restartBtnBg,
        scale: 1.05,
        alpha: 1,
        duration: 150
      });
    });

    restartBtnBg.on('pointerout', () => {
      this.tweens.add({
        targets: restartBtnBg,
        scale: 1,
        alpha: 0.8,
        duration: 150
      });
    });

    this.powerUpIndicator = null;
  }

  setupInput() {
    this.input.on('pointerdown', (pointer) => {
      // Check if we clicked on an interactive UI element (button)
      const hitObjects = this.input.hitTestPointer(pointer);
      const isUIObject = hitObjects.some(obj => obj.isInteractive && obj !== this.input);
      
      // Only handle shot if not clicking a UI button and game is active
      if (!isUIObject && !this.gameData.gameOver && !this.gameData.paused) {
        this.handleShot();
      }
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.gameData.gameOver) {
        if (this.gameData.paused) {
          this.resume();
        } else {
          this.pauseGame();
        }
      }
    });

    this.input.keyboard.on('keydown-P', () => {
      if (!this.gameData.gameOver) {
        if (this.gameData.paused) {
          this.resume();
        } else {
          this.pauseGame();
        }
      }
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (this.gameData.paused) {
        this.scene.start('MainMenuScene');
      }
    });
  }

  createArena() {
    // Center circle
    this.add.circle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, 12, 0xffffff);

    // Arc track (main gameplay circle)
    this.arcGraphics = this.make.graphics({ x: 0, y: 0, add: true });

    // Needle
    this.needleGraphics = this.make.graphics({ x: 0, y: 0, add: true });
  }

  setupHardcoreEffects() {
    this.distortionOverlay = this.make.graphics({ x: 0, y: 0, add: true });
    this.distortionIntensity = 0;
  }

  handleShot() {
    const perfectZone = this.isAngleInPerfectZone(this.needleAngle);
    const normalZone = this.isAngleInArc(this.needleAngle);

    this.gameData.hits++;
    this.profile.totalHits++;

    if (normalZone) {
      const points = perfectZone ? 100 : 50;
      const multiplier = this.gameData.powerUpActive === 'doublePoints' ? 2 : 1;
      this.gameData.score += points * multiplier;
      this.gameData.combo++;

      if (perfectZone) {
        this.gameData.perfects++;
        this.createPerfectEffect();
        if (this.profile.settings.screenShake) {
          this.cameras.main.shake(100, 0.01);
        }
      } else {
        this.createNiceHitEffect();
      }

      this.spawnNewArc();
      this.updateDifficulty();
    } else {
      this.gameData.misses++;
      if (this.mode !== 'zen') {
        this.gameData.lives--;
        this.createMissEffect();
        if (this.profile.settings.screenShake) {
          this.cameras.main.shake(200, 0.02);
        }
        if (this.gameData.lives <= 0) {
          this.endGame();
        }
      }
      this.gameData.combo = 0;
    }

    if (this.gameData.combo > this.gameData.maxCombo) {
      this.gameData.maxCombo = this.gameData.combo;
    }

    this.comboDecayTime = CONSTANTS.COMBO_DECAY_TIME;

    // Power-up chance
    if (Math.random() < CONSTANTS.POWER_UP_SPAWN_CHANCE && !this.gameData.powerUpActive) {
      this.spawnPowerUp();
    }
  }

  isAngleInArc(angle) {
    return isAngleInArc(angle, this.arcCenter, this.arcSize);
  }

  isAngleInPerfectZone(angle) {
    return isAngleInArc(angle, this.arcCenter, this.perfectSize);
  }

  spawnNewArc() {
    this.arcCenter = Math.random() * Math.PI * 2;
    this.arcSize = calculateDifficulty(this.gameData.score, this.mode).arcSize;
    this.timeSinceArcSpawn = 0;

    if (Math.random() < calculateDifficulty(this.gameData.score, this.mode).directionChangeChance) {
      this.directionCW = !this.directionCW;
    }
  }

  spawnPowerUp() {
    const type = spawnPowerUpArc();
    this.gameData.powerUpActive = type;
    this.gameData.powerUpTimeLeft = CONSTANTS.POWER_UP_DURATION;

    switch (type) {
      case 'slowMo':
        this.needleRotationSpeed *= 0.6;
        break;
      case 'doublePoints':
        // Just visual indicator
        break;
      case 'bigArc':
        this.arcSize *= 1.5;
        break;
      case 'reverse':
        this.directionCW = !this.directionCW;
        break;
    }

    this.updatePowerUpIndicator();
  }

  updatePowerUpIndicator() {
    if (this.powerUpIndicator) {
      this.powerUpIndicator.destroy();
    }

    if (this.gameData.powerUpActive) {
      const icons = {
        slowMo: '⏱️',
        doublePoints: '2️⃣',
        bigArc: '📈',
        reverse: '🔄'
      };

      this.powerUpIndicator = this.add.text(CONSTANTS.CENTER_X, 65, icons[this.gameData.powerUpActive], {
        fontSize: '24px'
      }).setOrigin(0.5);
    }
  }

  createPerfectEffect() {
    const particle = this.add.container(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y);
    const text = this.add.text(0, 0, 'PERFECT!', {
      fontSize: '32px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    particle.add(text);

    this.tweens.add({
      targets: particle,
      y: CONSTANTS.CENTER_Y - 100,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => particle.destroy()
    });

    if (this.profile.settings.slowMotion && this.cameras.main.zoom < CONSTANTS.PERFECT_CAMERA_ZOOM) {
      this.tweens.add({
        targets: this.cameras.main,
        zoom: CONSTANTS.PERFECT_CAMERA_ZOOM,
        duration: 100,
        yoyo: true,
        hold: 100
      });
    }
  }

  createNiceHitEffect() {
    const niceText = this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 50, 'NICE HIT!', {
      fontSize: '28px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: niceText,
      y: CONSTANTS.CENTER_Y - 120,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => niceText.destroy()
    });
  }

  createMissEffect() {
    const overlay = this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, 0xff0000);
    overlay.setAlpha(0.3);

    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 300,
      onComplete: () => overlay.destroy()
    });

    // Add MISS text
    const missText = this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, 'MISS!', {
      fontSize: '48px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: missText,
      y: CONSTANTS.CENTER_Y - 80,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => missText.destroy()
    });
  }

  updateDifficulty() {
    const diff = calculateDifficulty(this.gameData.score, this.mode);
    this.needleRotationSpeed = diff.rotationSpeed;
    this.perfectSize = diff.perfectSize;
  }

  pauseGame() {
    this.gameData.paused = true;
    this.scene.launch('PauseScene', { gameScene: this });
  }

  resume() {
    this.gameData.paused = false;
    this.scene.stop('PauseScene');
  }

  update(time, delta) {
    if (this.gameData.gameOver || this.gameData.paused) return;

    // Update needle
    const direction = this.directionCW ? 1 : -1;
    this.needleAngle += (this.needleRotationSpeed * direction * delta * 0.001);
    this.needleAngle = normalizeAngle(this.needleAngle);

    // Handle hardcore chaos
    if (this.mode === 'hardcore') {
      if (Math.random() < CONSTANTS.HARDCORE_DIRECTION_FLIP_CHANCE * delta * 0.001) {
        this.directionCW = !this.directionCW;
      }
      if (Math.random() < CONSTANTS.HARDCORE_ARC_TELEPORT_CHANCE * delta * 0.001) {
        this.arcCenter = Math.random() * Math.PI * 2;
      }
      this.distortionIntensity = 0.02 + Math.sin(time * 0.005) * 0.01;
    }

    // Update combo decay
    this.comboDecayTime -= delta;
    if (this.comboDecayTime < 0 && this.gameData.combo > 0) {
      this.gameData.combo = 0;
    }

    // Update power-up
    if (this.gameData.powerUpActive) {
      this.gameData.powerUpTimeLeft -= delta;
      if (this.gameData.powerUpTimeLeft <= 0) {
        // Restore original values
        if (this.gameData.powerUpActive === 'slowMo') {
          this.needleRotationSpeed /= 0.6;
        } else if (this.gameData.powerUpActive === 'bigArc') {
          this.arcSize /= 1.5;
        } else if (this.gameData.powerUpActive === 'reverse') {
          this.directionCW = !this.directionCW;
        }
        this.gameData.powerUpActive = null;
        this.updatePowerUpIndicator();
      } else {
        // Update visual
        if (this.powerUpIndicator) {
          this.powerUpIndicator.setAlpha(0.5 + Math.sin(time * 0.01) * 0.5);
        }
      }
    }

    // Render
    this.renderGame();

    // Update UI
    this.scoreText.setText(`Score: ${this.gameData.score}`);
    this.comboText.setText(`Combo: ${this.gameData.combo}`);
    
    if (this.timerText) {
      const seconds = Math.ceil(this.gameData.timeLeft / 1000);
      this.timerText.setText(`${seconds}s`);
    }
  }

  renderGame() {
    // Clear graphics
    this.arcGraphics.clear();
    this.needleGraphics.clear();

    // Draw main circle track border (white)
    this.arcGraphics.lineStyle(4, 0xffffff, 1);
    this.arcGraphics.beginPath();
    this.arcGraphics.arc(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.ARC_RADIUS, 0, Math.PI * 2);
    this.arcGraphics.strokePath();

    // Draw hit zone (bright white broader line)
    this.arcGraphics.lineStyle(8, 0x00ff00, 0.8);
    this.arcGraphics.beginPath();
    const arcStart = normalizeAngle(this.arcCenter - this.arcSize / 2);
    const arcEnd = normalizeAngle(this.arcCenter + this.arcSize / 2);
    
    this.arcGraphics.arc(
      CONSTANTS.CENTER_X,
      CONSTANTS.CENTER_Y,
      CONSTANTS.ARC_RADIUS,
      arcStart,
      arcEnd,
      false
    );
    this.arcGraphics.strokePath();

    // Draw perfect zone inner (golden glow)
    this.arcGraphics.lineStyle(5, 0xffff00, 0.6);
    this.arcGraphics.beginPath();
    const perfectStart = normalizeAngle(this.arcCenter - this.perfectSize / 2);
    const perfectEnd = normalizeAngle(this.arcCenter + this.perfectSize / 2);
    
    this.arcGraphics.arc(
      CONSTANTS.CENTER_X,
      CONSTANTS.CENTER_Y,
      CONSTANTS.ARC_RADIUS,
      perfectStart,
      perfectEnd,
      false
    );
    this.arcGraphics.strokePath();

    // Draw needle (red line from center)
    this.needleGraphics.lineStyle(4, 0xff0000, 1);
    const needleEnd = {
      x: CONSTANTS.CENTER_X + Math.cos(this.needleAngle) * CONSTANTS.NEEDLE_LENGTH,
      y: CONSTANTS.CENTER_Y + Math.sin(this.needleAngle) * CONSTANTS.NEEDLE_LENGTH
    };
    this.needleGraphics.beginPath();
    this.needleGraphics.moveTo(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y);
    this.needleGraphics.lineTo(needleEnd.x, needleEnd.y);
    this.needleGraphics.strokePath();

    if (this.distortionOverlay && this.distortionIntensity > 0) {
      this.distortionOverlay.clear();
      this.distortionOverlay.fillStyle(0x0064ff, this.distortionIntensity);
      this.distortionOverlay.fillRect(0, 0, CONSTANTS.WIDTH, CONSTANTS.HEIGHT);
    }
  }

  endGame() {
    this.gameData.gameOver = true;

    if (this.timeAttackInterval) {
      clearInterval(this.timeAttackInterval);
    }

    // Update profile
    this.profile.totalScore += this.gameData.score;
    this.profile.totalPerfects += this.gameData.perfects;
    this.profile.gamesPlayed++;

    if (this.gameData.combo > this.profile.bestCombo) {
      this.profile.bestCombo = this.gameData.combo;
    }

    const modeKey = this.gameData.mode;
    if (this.gameData.score > this.profile.highScores[modeKey]) {
      this.profile.highScores[modeKey] = this.gameData.score;
    }

    // Check achievements
    checkAchievements(this.profile, this.gameData, this);

    // Unlock hardcore mode after 5 games
    if (this.profile.gamesPlayed >= 5 && !this.profile.unlockedModes.includes('hardcore')) {
      this.profile.unlockedModes.push('hardcore');
      showAchievementPopup(this, { name: 'Hardcore Unlocked!', desc: 'Play for real', icon: '⚡' });
    }

    // Unlock themes on score milestones
    if (this.gameData.score >= 500 && !this.profile.unlockedThemes.includes('neon')) {
      this.profile.unlockedThemes.push('neon');
      showAchievementPopup(this, { name: 'Neon Theme Unlocked', desc: 'Check Settings', icon: '🎨' });
    }
    if (this.gameData.score >= 1500 && !this.profile.unlockedThemes.includes('sunset')) {
      this.profile.unlockedThemes.push('sunset');
      showAchievementPopup(this, { name: 'Sunset Theme Unlocked', desc: 'Check Settings', icon: '🌅' });
    }
    if (this.gameData.score >= 3000 && !this.profile.unlockedThemes.includes('cyber')) {
      this.profile.unlockedThemes.push('cyber');
      showAchievementPopup(this, { name: 'Cyber Theme Unlocked', desc: 'Check Settings', icon: '💜' });
    }
    if (this.gameData.score >= 5000 && !this.profile.unlockedThemes.includes('minimal')) {
      this.profile.unlockedThemes.push('minimal');
      showAchievementPopup(this, { name: 'Minimal Theme Unlocked', desc: 'Check Settings', icon: '⚪' });
    }

    this.profile.save();

    this.time.delayedCall(1000, () => {
      this.registry.set('gameData', this.gameData);
      this.scene.start('GameOverScene');
    });
  }
}

// ============================================================================
// SCENE: PAUSE
// ============================================================================

class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene', { active: false });
  }

  create(data) {
    this.gameScene = data.gameScene;
    this.profile = this.registry.get('profile');

    // Dark overlay
    this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, 0x000000).setAlpha(0.7);

    // Pause window
    const windowWidth = 300;
    const windowHeight = 200;
    const windowX = CONSTANTS.CENTER_X - windowWidth / 2;
    const windowY = CONSTANTS.CENTER_Y - windowHeight / 2;

    this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, windowWidth, windowHeight, 0x1a1a1a);
    this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, windowWidth, windowHeight, 0x00ff00).setStrokeStyle(2);

    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 60, 'PAUSED', {
      fontSize: '32px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Resume button
    const resumeBtn = this.createButton(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 10, 'RESUME (SPACE)', 200, 40);
    resumeBtn.on('pointerdown', () => {
      this.scene.stop();
      this.gameScene.resume();
    });

    // Menu button
    const menuBtn = this.createButton(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 50, 'MENU (ESC)', 200, 40);
    menuBtn.on('pointerdown', () => {
      this.scene.stop();
      this.gameScene.scene.start('MainMenuScene');
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      this.scene.stop();
      this.gameScene.resume();
    });
  }

  createButton(x, y, text, width, height) {
    const btn = this.add.rectangle(x, y, width, height, 0x00ff00);
    btn.setInteractive();
    btn.setStrokeStyle(2, 0x0064ff);
    btn.setAlpha(0.8);

    const btnText = this.add.text(x, y, text, {
      fontSize: '14px',
      fill: '#ffffff'
    }).setOrigin(0.5);

    btn.on('pointerover', () => {
      this.tweens.add({
        targets: btn,
        alpha: 1,
        duration: 200
      });
    });

    btn.on('pointerout', () => {
      this.tweens.add({
        targets: btn,
        alpha: 0.8,
        duration: 200
      });
    });

    return btn;
  }
}

// ============================================================================
// SCENE: GAME OVER
// ============================================================================

class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    this.profile = this.registry.get('profile');
    this.gameData = this.registry.get('gameData');

    applyTheme(this, this.profile.currentTheme);
    this.bg = this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, 0x0a0a0a);

    this.add.text(CONSTANTS.CENTER_X, 50, 'GAME OVER', {
      fontSize: '56px',
      fill: '#ff6b6b',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setStroke('#aa0000', 2);

    // Stats box
    const statsBg = this.add.rectangle(CONSTANTS.CENTER_X, 200, 350, 200, 0x000000);
    statsBg.setStrokeStyle(2, 0x00ff00);

    let y = 130;

    this.add.text(CONSTANTS.CENTER_X, y, `SCORE: ${this.gameData.score}`, {
      fontSize: '24px',
      fill: '#00ff00',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    y += 50;

    this.add.text(CONSTANTS.CENTER_X, y, `Combo: ${this.gameData.maxCombo}`, {
      fontSize: '18px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    y += 35;

    this.add.text(CONSTANTS.CENTER_X, y, `Perfects: ${this.gameData.perfects}`, {
      fontSize: '18px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    y += 35;

    this.add.text(CONSTANTS.CENTER_X, y, `Hits: ${this.gameData.hits}`, {
      fontSize: '18px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    y += 60;

    // Buttons
    const retryBtn = this.createButton(CONSTANTS.CENTER_X - 110, y, 'RETRY', 120, 45);
    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    const menuBtn = this.createButton(CONSTANTS.CENTER_X + 110, y, 'MENU', 120, 45);
    menuBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }

  createButton(x, y, text, width, height) {
    const btn = this.add.rectangle(x, y, width, height, 0x00ff00);
    btn.setAlpha(0.8);
    btn.setInteractive();
    btn.setStrokeStyle(2, 0x00aa00);

    const btnText = this.add.text(x, y, text, {
      fontSize: '16px',
      fill: '#000000',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    btn.on('pointerover', () => {
      this.tweens.add({
        targets: btn,
        scale: 1.08,
        alpha: 1,
        duration: 150
      });
    });

    btn.on('pointerout', () => {
      this.tweens.add({
        targets: btn,
        scale: 1,
        alpha: 0.8,
        duration: 150
      });
    });

    return btn;
  }
}

// ============================================================================
// SCENE: STATS
// ============================================================================

class StatsScene extends Phaser.Scene {
  constructor() {
    super('StatsScene');
  }

  create() {
    this.profile = this.registry.get('profile');
    
    applyTheme(this, this.profile.currentTheme);
    this.bg = this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, this.theme.bg);

    this.add.text(CONSTANTS.CENTER_X, 40, 'STATISTICS', {
      fontSize: '40px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    let y = 100;

    // Stats
    this.addStatLine(y, 'Total Score:', this.profile.totalScore);
    y += 35;

    this.addStatLine(y, 'Games Played:', this.profile.gamesPlayed);
    y += 35;

    this.addStatLine(y, 'Best Combo:', this.profile.bestCombo);
    y += 35;

    this.addStatLine(y, 'Total Perfects:', this.profile.totalPerfects);
    y += 35;

    this.addStatLine(y, 'Total Hits:', this.profile.totalHits);
    y += 50;

    // High Scores
    this.add.text(CONSTANTS.CENTER_X, y, 'HIGH SCORES BY MODE', {
      fontSize: '16px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    y += 30;

    ['classic', 'timeAttack', 'zen', 'hardcore'].forEach(mode => {
      this.addStatLine(y, `${mode.charAt(0).toUpperCase() + mode.slice(1)}:`, this.profile.highScores[mode]);
      y += 30;
    });

    // Achievements
    y += 20;
    const achCount = Object.keys(this.profile.achievements).length;
    const achTotal = Object.keys(CONSTANTS.ACHIEVEMENTS).length;

    this.add.text(CONSTANTS.CENTER_X, y, `ACHIEVEMENTS: ${achCount}/${achTotal}`, {
      fontSize: '16px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(50, CONSTANTS.HEIGHT - 40, '< BACK', {
      fontSize: '14px',
      fill: '#ffffff'
    }).setInteractive();

    backBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }

  addStatLine(y, label, value) {
    this.add.text(CONSTANTS.CENTER_X - 150, y, label, {
      fontSize: '14px',
      fill: '#ffffff'
    });

    this.add.text(CONSTANTS.CENTER_X + 150, y, value.toString(), {
      fontSize: '14px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(1, 0);
  }
}

// ============================================================================
// SCENE: SETTINGS
// ============================================================================

class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  create() {
    this.profile = this.registry.get('profile');

    applyTheme(this, this.profile.currentTheme);
    this.bg = this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, this.theme.bg);

    this.add.text(CONSTANTS.CENTER_X, 40, 'SETTINGS', {
      fontSize: '40px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    let y = 110;

    // Screen shake toggle
    this.createToggle(y, 'Screen Shake:', this.profile.settings.screenShake, (value) => {
      this.profile.settings.screenShake = value;
      this.profile.save();
    });
    y += 50;

    // Slow motion toggle
    this.createToggle(y, 'Effects:', this.profile.settings.slowMotion, (value) => {
      this.profile.settings.slowMotion = value;
      this.profile.save();
    });
    y += 50;

    // Glow toggle
    this.createToggle(y, 'Glow Effect:', this.profile.settings.glow, (value) => {
      this.profile.settings.glow = value;
      this.profile.save();
      const gameElement = document.getElementById('game');
      if (gameElement) {
        if (value) {
          gameElement.classList.remove('glow-off');
        } else {
          gameElement.classList.add('glow-off');
        }
      }
    });
    y += 60;

    // Theme selector
    this.add.text(CONSTANTS.CENTER_X - 150, y, 'Theme:', {
      fontSize: '16px',
      fill: '#ffffff',
      fontStyle: 'bold'
    });

    const themes = Object.entries(CONSTANTS.THEMES);
    let themeX = CONSTANTS.CENTER_X - 100;

    themes.forEach(([key, theme]) => {
      if (this.profile.unlockedThemes.includes(key)) {
        const btn = this.add.rectangle(themeX, y + 25, 60, 30, theme.arc);
        btn.setAlpha(this.profile.currentTheme === key ? 1 : 0.5);
        btn.setInteractive();

        const label = this.add.text(themeX, y + 45, key.substring(0, 4), {
          fontSize: '10px',
          fill: '#000000'
        }).setOrigin(0.5);

        btn.on('pointerdown', () => {
          this.profile.currentTheme = key;
          this.profile.save();
          applyTheme(this, key);
          this.scene.restart();
        });

        btn.on('pointerover', () => {
          this.tweens.add({
            targets: btn,
            alpha: 1,
            duration: 200
          });
        });

        btn.on('pointerout', () => {
          this.tweens.add({
            targets: btn,
            alpha: this.profile.currentTheme === key ? 1 : 0.5,
            duration: 200
          });
        });
      }

      themeX += 70;
    });

    y += 80;

    // Reset button
    const resetBtn = this.add.rectangle(CONSTANTS.CENTER_X, y, 180, 40, 0x8b0000);
    resetBtn.setAlpha(0.7);
    resetBtn.setInteractive();

    this.add.text(CONSTANTS.CENTER_X, y, 'RESET ALL DATA', {
      fontSize: '14px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    resetBtn.on('pointerdown', () => {
      if (this.profile.reset()) {
        this.scene.start('BootScene');
      }
    });

    resetBtn.on('pointerover', () => {
      this.tweens.add({
        targets: resetBtn,
        alpha: 1,
        duration: 200
      });
    });

    resetBtn.on('pointerout', () => {
      this.tweens.add({
        targets: resetBtn,
        alpha: 0.7,
        duration: 200
      });
    });

    // Back button
    const backBtn = this.add.text(50, CONSTANTS.HEIGHT - 40, '< BACK', {
      fontSize: '14px',
      fill: '#ffffff'
    }).setInteractive();

    backBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }

  createToggle(y, label, currentValue, callback) {
    this.add.text(CONSTANTS.CENTER_X - 150, y, label, {
      fontSize: '14px',
      fill: '#ffffff',
      fontStyle: 'bold'
    });

    const toggleX = CONSTANTS.CENTER_X + 50;
    const bg = this.add.rectangle(toggleX, y, 60, 30, currentValue ? 0x00ff00 : 0xaa0000);
    bg.setInteractive();
    bg.setStrokeStyle(2, currentValue ? 0x0064ff : 0x660000);

    const text = this.add.text(toggleX, y, currentValue ? 'ON' : 'OFF', {
      fontSize: '12px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      const newValue = !currentValue;
      callback(newValue);

      this.tweens.add({
        targets: bg,
        fillColor: newValue ? 0x00ff00 : 0xaa0000,
        duration: 200
      });

      text.setText(newValue ? 'ON' : 'OFF');
    });

    bg.on('pointerover', () => {
      this.tweens.add({
        targets: bg,
        scaleX: 1.1,
        scaleY: 1.05,
        duration: 200
      });
    });

    bg.on('pointerout', () => {
      this.tweens.add({
        targets: bg,
        scaleX: 1,
        scaleY: 1,
        duration: 200
      });
    });
  }
}

// ============================================================================
// SCENE: PLATFORMER (SECRET MODE)
// ============================================================================

class PlatformerScene extends Phaser.Scene {
  constructor() {
    super('PlatformerScene');
  }

  create() {
    this.profile = this.registry.get('profile');
    
    // Initialize upgrades if not exists
    if (!this.profile.platformerUpgrades) {
      this.profile.platformerUpgrades = {
        jumpBoost: 0,
        speedBoost: 0,
        shieldBoost: 0
      };
      this.profile.platformerCoins = 0;
    }
    
    // Game state
    this.gameData = {
      score: 0,
      lives: 5,
      level: 1,
      maxLevel: 30,
      gameOver: false,
      won: false,
      completedAllLevels: false,
      coins: 0,
      upgrades: this.profile.platformerUpgrades,
      totalCoins: this.profile.platformerCoins
    };

    // Background gradient effect
    this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, 0x1a3a52);
    this.add.rectangle(CONSTANTS.CENTER_X, 0, CONSTANTS.WIDTH, CONSTANTS.HEIGHT / 2, 0x2a5a82).setAlpha(0.3);
    
    // Title
    this.add.text(CONSTANTS.CENTER_X, 20, "🎮 RHYS' PLATFORMER ADVENTURE 🎮", {
      fontSize: '20px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setStroke('#aa8800', 2);

    // UI
    this.scoreText = this.add.text(20, 50, `Coins: ${this.gameData.coins}`, {
      fontSize: '18px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    });

    this.livesText = this.add.text(CONSTANTS.WIDTH - 20, 50, `❤️ ${this.gameData.lives}`, {
      fontSize: '18px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(1, 0);

    this.levelText = this.add.text(CONSTANTS.CENTER_X, 50, `LEVEL ${this.gameData.level}`, {
      fontSize: '16px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Graphics layer for game objects
    this.gameGraphics = this.make.graphics({ x: 0, y: 0, add: true });

    this.setupInput();
    this.createLevel();
    
    // Initialize player on first platform AFTER level is created
    this.initializePlayer();
    
    // Display upgrade UI
    this.displayUpgradeStatus();
  }

  initializePlayer() {
    const jumpBonus = this.gameData.upgrades.jumpBoost * 0.5;
    const speedBonus = this.gameData.upgrades.speedBoost * 0.2;
    
    // Spawn on first platform (platforms[1], since [0] is ground)
    const spawnPlatform = this.platforms[1] || this.platforms[0];
    
    this.player = {
      x: spawnPlatform.x + spawnPlatform.width / 2 - 11,
      y: spawnPlatform.y - 28,
      width: 22,
      height: 28,
      velocityY: 0,
      velocityX: 0,
      isJumping: false,
      speed: 5 + speedBonus,
      maxSpeed: 5 + speedBonus,
      jumpPower: 10 + jumpBonus,
      jumpTimeCounter: 0,
      canJump: true,
      doubleJumpReady: false,
      doubleJumpUsed: false,
      invincible: false,
      invincibleTime: 0,
      coyoteCounter: 0,
      maxCoyote: 6
    };
  }

  setupInput() {
    const keys = this.input.keyboard.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      u: Phaser.Input.Keyboard.KeyCodes.U
    });

    this.keys = keys;
  }

  displayUpgradeStatus() {
    const upgradeText = `⬆️ Jump+${this.gameData.upgrades.jumpBoost} ⚡ Speed+${this.gameData.upgrades.speedBoost} 🛡️ Shield+${this.gameData.upgrades.shieldBoost} | 💰 ${this.gameData.totalCoins}`;
    if (this.upgradeText) this.upgradeText.destroy();
    this.upgradeText = this.add.text(CONSTANTS.CENTER_X, CONSTANTS.HEIGHT - 20, upgradeText, {
      fontSize: '12px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setAlpha(0.8);
  }

  createLevel() {
    this.generateRandomLevel(this.gameData.level);
  }

  generateRandomLevel(levelNum) {
    // Difficulty increases with level (1-30)
    const difficulty = Math.min(1 + (levelNum - 1) * 0.1, 3);
    
    // Generate platforms - fewer/higher platforms = harder
    this.platforms = [];
    
    // Ground platform (always there)
    this.platforms.push({ x: 400, y: CONSTANTS.HEIGHT - 20, width: 800, height: 40, moving: false, color: 0x00cc00 });
    
    // Generate 5-8 platforms with increasing height/difficulty
    const platformCount = Math.floor(5 + difficulty * 2);
    let currentHeight = CONSTANTS.HEIGHT - 100;
    let currentX = 100;
    
    for (let i = 0; i < platformCount; i++) {
      const platformWidth = Math.max(90, 160 - difficulty * 15);
      const gapSize = Math.min(100 + difficulty * 30, 180);
      
      // Random x position but ensure it's reachable
      currentX = Math.random() > 0.5 ? currentX + gapSize : currentX - gapSize * 0.5;
      currentX = Math.max(50, Math.min(currentX, CONSTANTS.WIDTH - 100));
      
      currentHeight -= (40 + difficulty * 20);
      
      if (currentHeight > 100) {
        const platformColor = i < platformCount - 2 ? 0x00cc00 : (i === platformCount - 1 ? 0xffaa00 : 0x00aa00);
        this.platforms.push({
          x: currentX,
          y: currentHeight,
          width: platformWidth,
          height: 20,
          moving: false,
          color: platformColor
        });
      }
    }
    
    // Random enemies (0-2, more on harder levels)
    this.enemies = [];
    const enemyCount = Math.floor(difficulty * 2);
    for (let i = 0; i < enemyCount && i < 2; i++) {
      const enemyY = CONSTANTS.HEIGHT - 150 - (i * 150);
      this.enemies.push({
        x: 200 + i * 300,
        y: enemyY,
        width: 18,
        height: 18,
        speed: 0.8 + difficulty * 0.5,
        minX: 100 + i * 200,
        maxX: 300 + i * 250,
        direction: 1,
        type: 'enemy',
        color: 0xff3333
      });
    }
    
    // Random power-ups (1-2)
    this.powerups = [];
    const powerupCount = Math.floor(1 + difficulty * 0.8);
    const powerupTypes = ['doubleJump', 'shield', 'extraJump'];
    for (let i = 0; i < powerupCount; i++) {
      this.powerups.push({
        x: 150 + Math.random() * 500,
        y: CONSTANTS.HEIGHT - 200 - Math.random() * 300,
        type: powerupTypes[Math.floor(Math.random() * powerupTypes.length)],
        collected: false,
        color: [0x00ff00, 0x0099ff, 0x0064ff][Math.floor(Math.random() * 3)],
        active: false
      });
    }
    
    // Random coins (3-8)
    this.coins = [];
    const coinCount = Math.floor(3 + difficulty * 3);
    for (let i = 0; i < coinCount; i++) {
      this.coins.push({
        x: 100 + Math.random() * 600,
        y: CONSTANTS.HEIGHT - 100 - Math.random() * 400,
        collected: false
      });
    }
    
    // Goal on the highest platform
    const highestPlatform = this.platforms[this.platforms.length - 1];
    this.goal = { 
      x: highestPlatform.x + highestPlatform.width / 2 - 20,
      y: highestPlatform.y - 60,
      width: 40,
      height: 60
    };
  }

  update() {
    if (this.gameData.gameOver || this.gameData.won) return;

    // Handle input with better controls
    let hasMovementInput = false;
    if (this.keys.a.isDown || this.keys.left.isDown) {
      this.player.velocityX = Math.max(this.player.velocityX - 0.35, -this.player.maxSpeed);
      hasMovementInput = true;
    } else if (this.keys.d.isDown || this.keys.right.isDown) {
      this.player.velocityX = Math.min(this.player.velocityX + 0.35, this.player.maxSpeed);
      hasMovementInput = true;
    }

    // Friction when not moving
    if (!hasMovementInput) {
      this.player.velocityX *= 0.84;
    }

    // Coyote time - can jump for a few frames after leaving platform
    if (this.player.isJumping) {
      this.player.coyoteCounter++;
    } else {
      this.player.coyoteCounter = 0;
    }

    // Jump with variable height and coyote time
    if ((this.keys.space.isDown || this.keys.up.isDown || this.keys.w.isDown) && (this.player.coyoteCounter <= this.player.maxCoyote || this.player.doubleJumpReady)) {
      if (this.player.coyoteCounter <= this.player.maxCoyote && !this.player.isJumping) {
        // First jump (normal)
        this.player.velocityY = -this.player.jumpPower;
        this.player.isJumping = true;
        this.player.jumpTimeCounter = 10;
      } else if (this.player.doubleJumpReady && !this.player.doubleJumpUsed && this.player.isJumping) {
        // Double jump
        this.player.velocityY = -this.player.jumpPower;
        this.player.doubleJumpUsed = true;
        this.player.jumpTimeCounter = 10;
      }
    }

    // Extended jump via held space
    if ((this.keys.space.isDown || this.keys.up.isDown || this.keys.w.isDown) && this.player.isJumping && this.player.jumpTimeCounter > 0) {
      this.player.velocityY = Math.max(this.player.velocityY, -this.player.jumpPower);
      this.player.jumpTimeCounter--;
    }

    if (this.keys.esc.isDown) {
      if (this.gameData.gameOver || this.gameData.won) {
        this.scene.start('MainMenuScene');
      }
    }

    // Apply gravity (slightly reduced)
    this.player.velocityY += 0.42;
    this.player.velocityY = Math.min(this.player.velocityY, 13);

    this.player.y += this.player.velocityY;
    this.player.x += this.player.velocityX;

    // Boundary check with wrapping
    if (this.player.x < -20) this.player.x = CONSTANTS.WIDTH + 20;
    if (this.player.x > CONSTANTS.WIDTH + 20) this.player.x = -20;

    // Check platform collisions
    let wasOnGround = !this.player.isJumping;
    this.player.isJumping = true;
    this.platforms.forEach(platform => {
      if (this.checkCollision(this.player, platform)) {
        if (this.player.velocityY > 0.5) {
          this.player.y = platform.y - this.player.height;
          this.player.velocityY = 0;
          this.player.isJumping = false;
          this.player.coyoteCounter = 0;
          if (this.player.doubleJumpReady) {
            this.player.doubleJumpUsed = false;
          }
        }
      }
    });

    // Check enemy collisions (lose life if not invincible)
    this.enemies.forEach(enemy => {
      if (this.checkCollision(this.player, enemy)) {
        if (this.player.invincible) {
          this.player.invincible = false;
          this.player.invincibleTime = 0;
        } else {
          this.loseLife();
        }
      }
    });

    // Update invincibility
    if (this.player.invincible) {
      this.player.invincibleTime--;
      if (this.player.invincibleTime <= 0) {
        this.player.invincible = false;
      }
    }

    // Update enemies
    this.enemies.forEach(enemy => {
      enemy.x += enemy.speed * enemy.direction;
      if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
        enemy.direction *= -1;
      }
    });

    // Check powerup collisions
    this.powerups.forEach(powerup => {
      if (!powerup.collected && this.checkCollisionPoint(powerup, this.player)) {
        powerup.collected = true;
        this.activatePowerup(powerup.type);
      }
    });

    // Check coin collisions
    this.coins.forEach(coin => {
      if (!coin.collected && this.checkCollisionPoint(coin, this.player)) {
        coin.collected = true;
        this.gameData.coins++;
        this.gameData.totalCoins++;
        this.gameData.score += 5;
        this.scoreText.setText(`Coins: ${this.gameData.coins} 💰`);
        this.displayUpgradeStatus();
        // Show coin pickup feedback
        this.add.text(coin.x, coin.y - 20, '+1💰', {
          fontSize: '14px',
          fill: '#ffff00',
          fontFamily: 'Arial',
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100);
      }
    });

    // Press U for upgrades menu (purchase upgrades with coins)
    if (this.keys.u.isDown && !this.showingUpgrades) {
      this.showUpgradesMenu();
      this.showingUpgrades = true;
    }
    if (!this.keys.u.isDown) {
      this.showingUpgrades = false;
    }

    // Check goal collision (win)
    if (this.checkCollision(this.player, this.goal)) {
      if (this.gameData.level >= this.gameData.maxLevel) {
        // All 30 levels completed!
        this.gameData.completedAllLevels = true;
        this.gameData.won = true;
        this.showFinalVictory();
      } else {
        // Move to next level
        this.gameData.level++;
        this.gameData.score += 100;
        this.nextLevel();
      }
    }

    // Fall off platform - lose a life
    if (this.player.y > CONSTANTS.HEIGHT + 50) {
      this.loseLife();
    }

    // Render everything
    this.renderAll();
  }

  activatePowerup(type) {
    switch (type) {
      case 'doubleJump':
        this.player.doubleJumpReady = true;
        this.player.doubleJumpUsed = false;
        this.add.text(CONSTANTS.CENTER_X, 100, '✨ DOUBLE JUMP ACTIVATED!', {
          fontSize: '24px',
          fill: '#00ff00',
          fontStyle: 'bold',
          fontFamily: 'Arial',
          backgroundColor: '#000000',
          padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(100).setAlpha(0.9);
        this.time.delayedCall(30, () => this.add.tween({ targets: [this.children.list[this.children.list.length - 1]], alpha: 0, duration: 1000 }));
        break;
      case 'extraJump':
        this.player.jumpPower += 2;
        this.add.text(CONSTANTS.CENTER_X, 100, '⬆️ JUMP BOOST!', {
          fontSize: '24px',
          fill: '#00ff88',
          fontStyle: 'bold',
          fontFamily: 'Arial',
          backgroundColor: '#000000',
          padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(100).setAlpha(0.9);
        this.time.delayedCall(7000, () => {
          this.player.jumpPower = 13.5;
        });
        break;
      case 'shield':
        this.player.invincible = true;
        this.player.invincibleTime = 300;
        this.add.text(CONSTANTS.CENTER_X, 100, '🛡️ SHIELD ACTIVATED!', {
          fontSize: '24px',
          fill: '#0099ff',
          fontStyle: 'bold',
          fontFamily: 'Arial',
          backgroundColor: '#000000',
          padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(100).setAlpha(0.9);
        break;
      case 'speed':
        this.player.maxSpeed = 7;
        this.add.text(CONSTANTS.CENTER_X, 100, '⚡ SPEED BOOST!', {
          fontSize: '24px',
          fill: '#ff6600',
          fontStyle: 'bold',
          fontFamily: 'Arial',
          backgroundColor: '#000000',
          padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(100).setAlpha(0.9);
        this.time.delayedCall(5000, () => {
          this.player.maxSpeed = 5;
        });
        break;
    }
    this.gameData.score += 50;
  }

  loseLife() {
    this.gameData.lives--;
    this.livesText.setText(`❤️ ${this.gameData.lives}`);
    if (this.gameData.lives <= 0) {
      this.gameData.gameOver = true;
      this.showGameOver();
    } else {
      // Respawn on first platform
      const spawnPlatform = this.platforms[1] || this.platforms[0];
      this.player.x = spawnPlatform.x + spawnPlatform.width / 2 - 11;
      this.player.y = spawnPlatform.y - 28;
      this.player.velocityY = 0;
      this.player.velocityX = 0;
      this.player.invincible = true;
      this.player.invincibleTime = 120;
    }
  }

  checkCollision(obj1, obj2) {
    return !(
      obj1.x + obj1.width < obj2.x ||
      obj1.x > obj2.x + obj2.width ||
      obj1.y + obj1.height < obj2.y ||
      obj1.y > obj2.y + obj2.height
    );
  }

  checkCollisionPoint(point, rect) {
    return !(
      point.x + 8 < rect.x ||
      point.x - 8 > rect.x + rect.width ||
      point.y + 8 < rect.y ||
      point.y - 8 > rect.y + rect.height
    );
  }

  renderAll() {
    this.gameGraphics.clear();

    // Draw platforms with better styling
    this.platforms.forEach(platform => {
      // Platform gradient effect
      this.gameGraphics.fillStyle(platform.color || 0x00cc00, 1);
      this.gameGraphics.fillRect(platform.x, platform.y, platform.width, platform.height);
      
      // Border
      this.gameGraphics.lineStyle(2, 0x00ff00, 1);
      this.gameGraphics.strokeRect(platform.x, platform.y, platform.width, platform.height);
      
      // Shine effect on top
      this.gameGraphics.lineStyle(1, 0xffffff, 0.4);
      this.gameGraphics.beginPath();
      this.gameGraphics.moveTo(platform.x, platform.y + 2);
      this.gameGraphics.lineTo(platform.x + platform.width, platform.y + 2);
      this.gameGraphics.strokePath();
    });

    // Draw enemies with better visuals
    this.enemies.forEach(enemy => {
      // Enemy body
      this.gameGraphics.fillStyle(0xff3333, 1);
      this.gameGraphics.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      
      // Enemy border
      this.gameGraphics.lineStyle(2, 0xff6666, 1);
      this.gameGraphics.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
      
      // Enemy eyes
      this.gameGraphics.fillStyle(0xffffff, 1);
      this.gameGraphics.fillRect(enemy.x + 2, enemy.y + 2, 4, 4);
      this.gameGraphics.fillRect(enemy.x + 12, enemy.y + 2, 4, 4);
    });

    // Draw power-ups with improved pulsing
    this.powerups.forEach(powerup => {
      if (!powerup.collected) {
        const pulse = Math.sin(this.time.now * 0.015) * 2 + 9;
        const glowAlpha = Math.sin(this.time.now * 0.008) * 0.3 + 0.5;
        
        // Glow effect
        this.gameGraphics.fillStyle(powerup.color, glowAlpha * 0.3);
        this.gameGraphics.fillCircle(powerup.x, powerup.y, pulse + 4);
        
        // Main powerup
        this.gameGraphics.fillStyle(powerup.color, 1);
        this.gameGraphics.fillCircle(powerup.x, powerup.y, pulse);
        
        // Border
        this.gameGraphics.lineStyle(2, 0xffffff, 1);
        this.gameGraphics.strokeCircleShape(new Phaser.Geom.Circle(powerup.x, powerup.y, pulse));
      }
    });

    // Draw coins with improved sparkle
    this.coins.forEach(coin => {
      if (!coin.collected) {
        // Coin glow
        const glowSize = Math.sin(this.time.now * 0.02) * 2 + 8;
        this.gameGraphics.fillStyle(0xffdd00, 0.2);
        this.gameGraphics.fillCircle(coin.x, coin.y, glowSize);
        
        // Coin body
        this.gameGraphics.fillStyle(0xffdd00, 1);
        this.gameGraphics.fillCircle(coin.x, coin.y, 6);
        
        // Coin border
        this.gameGraphics.lineStyle(2, 0xffff00, 1);
        this.gameGraphics.strokeCircleShape(new Phaser.Geom.Circle(coin.x, coin.y, 6));
        
        // Sparkle rays
        const sparkleCount = 4;
        const sparkleRadius = Math.sin(this.time.now * 0.025) * 4 + 10;
        this.gameGraphics.lineStyle(1, 0xffffff, 0.6);
        for (let i = 0; i < sparkleCount; i++) {
          const angle = (i / sparkleCount) * Math.PI * 2;
          const x1 = coin.x + Math.cos(angle) * 6;
          const y1 = coin.y + Math.sin(angle) * 6;
          const x2 = coin.x + Math.cos(angle) * sparkleRadius;
          const y2 = coin.y + Math.sin(angle) * sparkleRadius;
          this.gameGraphics.beginPath();
          this.gameGraphics.moveTo(x1, y1);
          this.gameGraphics.lineTo(x2, y2);
          this.gameGraphics.strokePath();
        }
      }
    });

    // Draw goal with better animation
    const flagWave = Math.sin(this.time.now * 0.018) * 3;
    const flagBounce = Math.sin(this.time.now * 0.025) * 1;
    
    // Goal post
    this.gameGraphics.fillStyle(0x0064ff, 1);
    this.gameGraphics.fillRect(this.goal.x + 10, this.goal.y, 10, this.goal.height);
    this.gameGraphics.lineStyle(2, 0x00aaff, 1);
    this.gameGraphics.strokeRect(this.goal.x + 10, this.goal.y, 10, this.goal.height);
    
    // Animated flag
    this.gameGraphics.fillStyle(0x00ff00, 1);
    this.gameGraphics.fillRect(this.goal.x - 8 + flagWave, this.goal.y + 5 + flagBounce, 22, 17);
    this.gameGraphics.lineStyle(2, 0xff66ff, 1);
    this.gameGraphics.strokeRect(this.goal.x - 8 + flagWave, this.goal.y + 5 + flagBounce, 22, 17);
    
    // Flag shine
    this.gameGraphics.lineStyle(1, 0xffffff, 0.5);
    this.gameGraphics.beginPath();
    this.gameGraphics.moveTo(this.goal.x - 6 + flagWave, this.goal.y + 8 + flagBounce);
    this.gameGraphics.lineTo(this.goal.x + 12 + flagWave, this.goal.y + 8 + flagBounce);
    this.gameGraphics.strokePath();

    // Draw player with improved animation
    const playerBob = Math.sin(this.time.now * 0.012) * 1.5;
    const playerColor = this.player.invincible ? 0x0064ff : 0xff8800;
    
    // Player shadow
    this.gameGraphics.fillStyle(0x000000, 0.2);
    this.gameGraphics.fillRect(this.player.x, this.player.y + this.player.height + 2, this.player.width, 3);
    
    // Player body
    this.gameGraphics.fillStyle(playerColor, 1);
    this.gameGraphics.fillRect(this.player.x, this.player.y + playerBob, this.player.width, this.player.height);
    
    // Player outline
    if (this.player.invincible) {
      // Pulsing invincibility outline
      const pulseOutline = Math.sin(this.time.now * 0.03) * 1 + 3;
      this.gameGraphics.lineStyle(pulseOutline, 0x0064ff, 0.7);
      this.gameGraphics.strokeRect(this.player.x - 3, this.player.y + playerBob - 3, this.player.width + 6, this.player.height + 6);
    } else {
      this.gameGraphics.lineStyle(2, 0xffaa00, 1);
      this.gameGraphics.strokeRect(this.player.x - 1, this.player.y + playerBob - 1, this.player.width + 2, this.player.height + 2);
    }
    
    // Eyes direction based on movement
    this.gameGraphics.fillStyle(0xffff00, 1);
    const eyeDir = this.player.velocityX > 0 ? 2 : (this.player.velocityX < 0 ? -2 : 0);
    this.gameGraphics.fillRect(this.player.x + 4 + eyeDir, this.player.y + 5, 3, 3);
    this.gameGraphics.fillRect(this.player.x + 14 + eyeDir, this.player.y + 5, 3, 3);
    
    // Pupils
    this.gameGraphics.fillStyle(0x000000, 1);
    this.gameGraphics.fillRect(this.player.x + 5 + eyeDir, this.player.y + 6, 2, 2);
    this.gameGraphics.fillRect(this.player.x + 15 + eyeDir, this.player.y + 6, 2, 2);
    
    // Mouth (emotion based on state)
    this.gameGraphics.lineStyle(2, 0xffff00, 1);
    if (Math.abs(this.player.velocityY) > 8) {
      // Surprised O mouth while jumping
      this.gameGraphics.beginPath();
      this.gameGraphics.arc(this.player.x + 11, this.player.y + 18, 2, 0, Math.PI * 2);
      this.gameGraphics.strokePath();
    } else if (this.player.isJumping) {
      // Pursed mouth while jumping
      this.gameGraphics.beginPath();
      this.gameGraphics.moveTo(this.player.x + 7, this.player.y + 17);
      this.gameGraphics.lineTo(this.player.x + 15, this.player.y + 17);
      this.gameGraphics.strokePath();
    } else {
      // Happy smile
      this.gameGraphics.beginPath();
      this.gameGraphics.arc(this.player.x + 11, this.player.y + 18, 3, 0, Math.PI);
      this.gameGraphics.strokePath();
    }
  }

  showGameOver() {
    this.gameGraphics.clear();
    const overlay = this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, 0x000000).setAlpha(0.85);
    
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 80, 'GAME OVER', {
      fontSize: '48px',
      fill: '#ff3333',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setStroke('#aa0000', 2);

    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 10, `Coins Collected: ${this.gameData.coins}`, {
      fontSize: '24px',
      fill: '#ffff00',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 30, `Score: ${this.gameData.score}`, {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 100, 'Press ESC to return to menu', {
      fontSize: '16px',
      fill: '#0064ff',
      fontFamily: 'Arial',
      fontStyle: 'italic'
    }).setOrigin(0.5);
  }

  showWin() {
    this.gameGraphics.clear();
    const overlay = this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, 0x000000).setAlpha(0.85);
    
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 80, 'LEVEL COMPLETE!', {
      fontSize: '44px',
      fill: '#00ff00',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setStroke('#00aa00', 2);

    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 10, `Coins Collected: ${this.gameData.coins}/16`, {
      fontSize: '26px',
      fill: '#ffff00',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 35, `Total Score: ${this.gameData.score}`, {
      fontSize: '22px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    let bonusText = '';
    if (this.gameData.coins === 16) {
      bonusText = 'PERFECT COLLECTION! +100 BONUS!';
      this.gameData.score += 100;
    } else if (this.gameData.coins >= 14) {
      bonusText = 'GREAT JOB! +50 BONUS!';
      this.gameData.score += 50;
    }
    
    if (bonusText) {
      this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 75, bonusText, {
        fontSize: '20px',
        fill: '#ffaa00',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 120, 'Press ESC to return to menu', {
      fontSize: '16px',
      fill: '#0064ff',
      fontFamily: 'Arial',
      fontStyle: 'italic'
    }).setOrigin(0.5);
  }

  nextLevel() {
    // Save upgrades and coins to profile
    this.profile.platformerUpgrades = this.gameData.upgrades;
    this.profile.platformerCoins = this.gameData.totalCoins;
    this.profile.save();
    
    // Reset coins for new level
    this.gameData.coins = 0;
    this.scoreText.setText(`Coins: ${this.gameData.coins} 💰`);
    this.levelText.setText(`LEVEL ${this.gameData.level}/${this.gameData.maxLevel}`);
    
    // Generate new level
    this.generateRandomLevel(this.gameData.level);
    
    // Reinitialize player on first platform of new level
    this.initializePlayer();
    
    // Reset game state for new level
    this.gameData.won = false;
    this.displayUpgradeStatus();
  }

  showFinalVictory() {
    this.gameGraphics.clear();
    const overlay = this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, 0x000000).setAlpha(0.9);
    
    // Main title
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 120, '🎉 YOU WIN! 🎉', {
      fontSize: '48px',
      fill: '#ffff00',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setStroke('#ffaa00', 3);

    // Subtitle
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 50, 'ALL 30 LEVELS COMPLETED!', {
      fontSize: '32px',
      fill: '#00ff00',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setStroke('#00aa00', 2);

    // Stats
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 10, `Final Score: ${this.gameData.score}`, {
      fontSize: '26px',
      fill: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 55, `Total Coins: ${this.gameData.coins}`, {
      fontSize: '22px',
      fill: '#ffff00',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Celebration message
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 105, '★ YOU ARE THE PLATFORMING CHAMPION! ★', {
      fontSize: '18px',
      fill: '#ffaa00',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 150, 'Press ESC to return to menu', {
      fontSize: '16px',
      fill: '#0064ff',
      fontFamily: 'Arial',
      fontStyle: 'italic'
    }).setOrigin(0.5);
  }

  showUpgradesMenu() {
    this.gameGraphics.clear();
    const overlay = this.add.rectangle(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y, CONSTANTS.WIDTH, CONSTANTS.HEIGHT, 0x000000).setAlpha(0.92);
    
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 110, 'UPGRADES SHOP', {
      fontSize: '40px',
      fill: '#00ff88',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setStroke('#00cc44', 2);

    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 60, `💰 Available Coins: ${this.gameData.totalCoins}`, {
      fontSize: '20px',
      fill: '#ffff00',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Jump Upgrade
    const jumpPrice = 50;
    const jumpLevel = `⬆️ JUMP BOOST (Level ${this.gameData.upgrades.jumpBoost})`;
    const jumpColor = this.gameData.totalCoins >= jumpPrice ? '#00ff00' : '#ff3333';
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y - 10, `${jumpLevel} - Cost: ${jumpPrice}💰`, {
      fontSize: '16px',
      fill: jumpColor,
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 10, 'Press 1 to buy | Effect: +0.5 jump height', {
      fontSize: '13px',
      fill: '#aaaaaa',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Speed Upgrade
    const speedPrice = 40;
    const speedLevel = `⚡ SPEED BOOST (Level ${this.gameData.upgrades.speedBoost})`;
    const speedColor = this.gameData.totalCoins >= speedPrice ? '#00ff00' : '#ff3333';
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 45, `${speedLevel} - Cost: ${speedPrice}💰`, {
      fontSize: '16px',
      fill: speedColor,
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 65, 'Press 2 to buy | Effect: +0.2 movement speed', {
      fontSize: '13px',
      fill: '#aaaaaa',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Shield Upgrade
    const shieldPrice = 60;
    const shieldLevel = `🛡️ SHIELD BOOST (Level ${this.gameData.upgrades.shieldBoost})`;
    const shieldColor = this.gameData.totalCoins >= shieldPrice ? '#00ff00' : '#ff3333';
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 100, `${shieldLevel} - Cost: ${shieldPrice}💰`, {
      fontSize: '16px',
      fill: shieldColor,
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 120, 'Press 3 to buy | Effect: Lasts longer when hit', {
      fontSize: '13px',
      fill: '#aaaaaa',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(CONSTANTS.CENTER_X, CONSTANTS.CENTER_Y + 160, 'Press U again or ESC to close', {
      fontSize: '14px',
      fill: '#0064ff',
      fontFamily: 'Arial',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Handle upgrade purchases
    if (this.input.keyboard.keys[Phaser.Input.Keyboard.KeyCodes.ONE].isDown) {
      if (this.gameData.totalCoins >= 50) {
        this.gameData.totalCoins -= 50;
        this.gameData.upgrades.jumpBoost++;
        this.displayUpgradeStatus();
      }
    }
    if (this.input.keyboard.keys[Phaser.Input.Keyboard.KeyCodes.TWO].isDown) {
      if (this.gameData.totalCoins >= 40) {
        this.gameData.totalCoins -= 40;
        this.gameData.upgrades.speedBoost++;
        this.displayUpgradeStatus();
      }
    }
    if (this.input.keyboard.keys[Phaser.Input.Keyboard.KeyCodes.THREE].isDown) {
      if (this.gameData.totalCoins >= 60) {
        this.gameData.totalCoins -= 60;
        this.gameData.upgrades.shieldBoost++;
        this.displayUpgradeStatus();
      }
    }
  }
}

// ============================================================================
// PHASER CONFIG & INIT
// ============================================================================

const config = {
  type: Phaser.AUTO,
  width: CONSTANTS.WIDTH,
  height: CONSTANTS.HEIGHT,
  parent: 'game',
  render: {
    pixelArt: false,
    antialias: true,
    smoothStep: true
  },
  input: {
    touch: { target: window },
    mouse: { target: window }
  },
  scene: [BootScene, MainMenuScene, ModeSelectScene, GameScene, PauseScene, GameOverScene, StatsScene, SettingsScene, PlatformerScene],
  backgroundColor: '#0a0a0a'
};

const game = new Phaser.Game(config);
