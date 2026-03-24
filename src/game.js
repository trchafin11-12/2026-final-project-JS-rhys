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

    // Title with glow effect
    this.add.text(CONSTANTS.CENTER_X, 50, 'THE BIG GAME OF GAMES', {
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

    // Add animated mints
    this.createAnimatedMints();

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

    // Store buttons for keyboard navigation
    this.buttons = [playBtn, statsBtn, settingsBtn];
    this.selectedButtonIndex = 0;

    // Keyboard input
    this.input.keyboard.on('keydown-UP', () => {
      this.selectedButtonIndex = (this.selectedButtonIndex - 1 + this.buttons.length) % this.buttons.length;
      this.updateButtonSelection();
    });

    this.input.keyboard.on('keydown-DOWN', () => {
      this.selectedButtonIndex = (this.selectedButtonIndex + 1) % this.buttons.length;
      this.updateButtonSelection();
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      this.activateSelectedButton();
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      this.activateSelectedButton();
    });

    // Initial button selection
    this.updateButtonSelection();
  }

  updateButtonSelection() {
    // Reset all buttons to normal state
    this.buttons.forEach((btn, index) => {
      if (index === this.selectedButtonIndex) {
        // Highlight selected button
        btn.setScale(1.1);
        btn.setAlpha(1);
      } else {
        // Normal state for unselected buttons
        btn.setScale(1);
        btn.setAlpha(0.85);
      }
    });
  }

  activateSelectedButton() {
    const selectedButton = this.buttons[this.selectedButtonIndex];
    
    // Trigger the button's action based on which one is selected
    if (selectedButton === this.buttons[0]) {
      this.scene.start('ModeSelectScene');
    } else if (selectedButton === this.buttons[1]) {
      this.scene.start('StatsScene');
    } else if (selectedButton === this.buttons[2]) {
      this.scene.start('SettingsScene');
    }
  }

  createAnimatedMints() {
    this.mints = [];
    
    // Create multiple animated mints
    for (let i = 0; i < 8; i++) {
      const mint = this.add.circle(
        Math.random() * CONSTANTS.WIDTH,
        Math.random() * CONSTANTS.HEIGHT,
        8 + Math.random() * 12,
        0x00ff88
      );
      
      mint.setAlpha(0.3 + Math.random() * 0.4);
      mint.setBlendMode(Phaser.BlendModes.ADD);
      
      // Store mint data
      this.mints.push({
        sprite: mint,
        x: mint.x,
        y: mint.y,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        scale: 1,
        scaleDirection: 1,
        hue: 120 + Math.random() * 60 // Green to cyan range
      });
      
      // Animate the mint
      this.animateMint(this.mints[i]);
    }
  }

  animateMint(mint) {
    // Movement animation
    this.tweens.add({
      targets: mint.sprite,
      x: {
        value: mint.x + mint.speedX * 100,
        duration: 3000 + Math.random() * 2000,
        ease: 'Sine.easeInOut'
      },
      y: {
        value: mint.y + mint.speedY * 100,
        duration: 3000 + Math.random() * 2000,
        ease: 'Sine.easeInOut'
      },
      onComplete: () => {
        // Reset position and continue animation
        mint.sprite.x = mint.x;
        mint.sprite.y = mint.y;
        this.animateMint(mint);
      }
    });

    // Rotation animation
    this.tweens.add({
      targets: mint.sprite,
      rotation: Math.PI * 2,
      duration: 4000 + Math.random() * 4000,
      repeat: -1,
      ease: 'Linear'
    });

    // Pulsing scale animation
    this.tweens.add({
      targets: mint.sprite,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 1500 + Math.random() * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Alpha pulsing
    this.tweens.add({
      targets: mint.sprite,
      alpha: 0.1,
      duration: 2000 + Math.random() * 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
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
          fill: '#ffffff'
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
  scene: [BootScene, MainMenuScene, ModeSelectScene, GameScene, PauseScene, GameOverScene, StatsScene, SettingsScene],
  backgroundColor: '#0a0a0a'
};

const game = new Phaser.Game(config);
