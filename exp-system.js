/**
 * @fileoverview LearnHub Gamification & Progression Engine
 * @version 1.0.0
 * @license MIT
 * * This file acts as the central pure-logic engine for handling EXP, Levels, 
 * Ranks, Badges, Achievements, and Daily Missions for the LearnHub platform.
 * * RANGES/CONSTRAINTS:
 * - NO DOM manipulation, NO Firebase/Firestore dependencies, NO HTML/CSS.
 * - NO Async/Promises (Pure synchronous deterministic calculation).
 * - Fully Data-driven architecture via CONFIG object.
 */

// ============================================================================
// 1. CONFIGURATION
// ============================================================================

/**
 * Global Configuration containing all business rules for the gamification engine.
 * @constant {Object}
 */
export const CONFIG = {
  /**
   * General season metadata and default fallback variables
   */
  SEASON: {
    id: "season_2026_v1",
    name: "LearnHub Alpha Season 2026",
    baseXpPerTest: 10
  },

  /**
   * Rule-set for dynamic score-based bonus EXP calculations.
   * Format: Array of objects ordered from highest score threshold to lowest.
   */
  EXP_RULES: [
    { threshold: 10, bonus: 30 },
    { threshold: 9,  bonus: 20 },
    { threshold: 8,  bonus: 15 },
    { threshold: 7,  bonus: 10 },
    { threshold: 5,  bonus: 5 }
  ],

  /**
   * Level generation scaling formula parameters.
   * Required XP for level L = baseXP + (L - 1) * multiplier
   */
  LEVEL_RULES: {
    maxLevel: 100,
    baseXpRequired: 100,
    xpMultiplierPerLevel: 50
  },

  /**
   * Rank tiers determined strictly by the player's level boundaries.
   */
  RANK_RULES: [
    { minLevel: 1,   maxLevel: 5,   name: "Tân binh",         icon: "🌱", color: "#8E9297" },
    { minLevel: 6,   maxLevel: 10,  name: "Học viên",         icon: "📘", color: "#3498DB" },
    { minLevel: 11,  maxLevel: 20,  name: "Chuyên gia",       icon: "🎓", color: "#2ECC71" },
    { minLevel: 21,  maxLevel: 35,  name: "Cao thủ",          icon: "🔥", color: "#E67E22" },
    { minLevel: 36,  maxLevel: 50,  name: "Học bá",           icon: "💎", color: "#9B59B6" },
    { minLevel: 51,  maxLevel: 70,  name: "Huyền thoại",      icon: "👑", color: "#F1C40F" },
    { minLevel: 71,  maxLevel: 100, name: "LearnHub Legend",  icon: "🚀", color: "#E74C3C" }
  ],

  /**
   * Badges awarded on criteria evaluation.
   * Operators supported: "gte" (>=), "eq" (===), "bool" (boolean flag evaluation)
   */
  BADGE_RULES: [
    // Based on total tests completed
    { id: "badge_tests_10",  name: "Khởi đầu nan",     icon: "👣", description: "Hoàn thành 10 bài kiểm tra", field: "totalTests", operator: "gte", target: 10 },
    { id: "badge_tests_30",  name: "Chăm chỉ",         icon: "🐝", description: "Hoàn thành 30 bài kiểm tra", field: "totalTests", operator: "gte", target: 30 },
    { id: "badge_tests_100", name: "Kiên trì",         icon: "🏋️", description: "Hoàn thành 100 bài kiểm tra", field: "totalTests", operator: "gte", target: 100 },
    { id: "badge_tests_500", name: "Vô song",          icon: "🛡️", description: "Hoàn thành 500 bài kiểm tra", field: "totalTests", operator: "gte", target: 500 },
    
    // Based on total accumulated score
    { id: "badge_score_1000", name: "Tích tiểu thành đại", icon: "🪙", description: "Đạt tổng 1,000 điểm tích lũy", field: "totalScore", operator: "gte", target: 1000 },
    { id: "badge_score_5000", name: "Đại phú hào tri thức", icon: "💰", description: "Đạt tổng 5,000 điểm tích lũy", field: "totalScore", operator: "gte", target: 5000 },
    
    // Special conditions
    { id: "badge_first_perfect", name: "Điểm 10 tuyệt đối", icon: "💯", description: "Đạt điểm 10 đầu tiên trong hệ thống", field: "bestScore", operator: "gte", target: 10 },
    { id: "badge_top_1_weekly",  name: "Vua chiến trường",  icon: "👑", description: "Đạt Top 1 bảng xếp hạng tuần trước", field: "top1LastWeek", operator: "bool", target: true }
  ],

  /**
   * Achievements supporting progressive milestone calculations.
   */
  ACHIEVEMENT_RULES: [
    // Completed test count milestones
    { id: "ach_tests_10",   title: "Bước Chân Đầu Tiên", field: "totalTests",  target: 10 },
    { id: "ach_tests_30",   title: "Thói Quen Học Tập",  field: "totalTests",  target: 30 },
    { id: "ach_tests_100",  title: "Học Giả Đích Thực",  field: "totalTests",  target: 100 },
    { id: "ach_tests_500",  title: "Kẻ Chinh Phục",     field: "totalTests",  target: 500 },
    { id: "ach_tests_1000", title: "Bất Khả Chiến Bại",  field: "totalTests",  target: 1000 },

    // Total score milestones
    { id: "ach_score_100",   title: "Tích Lũy Căn Bản",   field: "totalScore",  target: 100 },
    { id: "ach_score_500",   title: "Vượt Qua Thử Thách", field: "totalScore",  target: 500 },
    { id: "ach_score_1000",  title: "Thành Tựu Rực Rỡ",   field: "totalScore",  target: 1000 },
    { id: "ach_score_5000",  title: "Bậc Thầy Điểm Số",   field: "totalScore",  target: 5000 },
    { id: "ach_score_10000", title: "Đỉnh Cao Tri Thức",  field: "totalScore",  target: 10000 },

    // EXP milestones
    { id: "ach_xp_500",   title: "Kinh Nghiệm Sơ Khai", field: "xp",          target: 500 },
    { id: "ach_xp_2000",  title: "Vững Bước Đi Lên",    field: "xp",          target: 2000 },
    { id: "ach_xp_5000",  title: "Sức Mạnh Tri Thức",   field: "xp",          target: 5000 },
    { id: "ach_xp_10000", title: "Đại Cao Thủ EXP",    field: "xp",          target: 10000 },
    { id: "ach_xp_50000", title: "Huyền Thoại Bất Tử",  field: "xp",          target: 50000 },

    // Level milestones
    { id: "ach_lvl_10",  title: "Cột Mốc Level 10",    field: "level",       target: 10 },
    { id: "ach_lvl_20",  title: "Cột Mốc Level 20",    field: "level",       target: 20 },
    { id: "ach_lvl_30",  title: "Cột Mốc Level 30",    field: "level",       target: 30 },
    { id: "ach_lvl_50",  title: "Cột Mốc Level 50",    field: "level",       target: 50 },
    { id: "ach_lvl_100", title: "Đạt Cảnh Giới Tối Cao", field: "level",       target: 100 }
  ],

  /**
   * Fixed 3 daily mission templates.
   */
  DAILY_MISSION_RULES: [
    { id: "mission_login",   description: "Đăng nhập hôm nay",       field: "loginToday", target: 1,  rewardXp: 20 },
    { id: "mission_test_1",  description: "Hoàn thành 1 bài kiểm tra", field: "todayTests", target: 1,  rewardXp: 30 },
    { id: "mission_score_25", description: "Đạt từ 25 điểm hôm nay",   field: "todayScore", target: 25, rewardXp: 50 }
  ]
};

// ============================================================================
// 2. UTILITY FUNCTIONS
// ============================================================================

/**
 * Pure Utility functional collection providing validation and math constraints.
 */
export const Utils = {
  /**
   * Safely parses and guarantees a valid non-negative integer fallback.
   * @param {*} value - Element to sanitize.
   * @param {number} [fallback=0] - Optional fallback number.
   * @returns {number} Guaranteed validated integer.
   */
  ensureInt(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 0 ? fallback : parsed;
  },

  /**
   * Validates structure of user tracking stats incoming into the system.
   * @param {Object} input Raw state parameters passed to engine.
   * @returns {Object} Perfectly structured sanitized object data.
   */
  validateInput(input) {
    if (!input || typeof input !== "object") {
      throw new Error("[LearnHub Engine] Invalid input object data supplied.");
    }
    return {
      totalTests: this.ensureInt(input.totalTests),
      totalScore: this.ensureInt(input.totalScore),
      weekScore: this.ensureInt(input.weekScore),
      bestScore: this.ensureInt(input.bestScore),
      xp: this.ensureInt(input.xp),
      level: Math.max(1, this.ensureInt(input.level, 1)),
      todayTests: this.ensureInt(input.todayTests),
      todayScore: this.ensureInt(input.todayScore),
      loginToday: !!input.loginToday,
      top1LastWeek: !!input.top1LastWeek,
      currentTestScore: input.currentTestScore !== undefined ? this.ensureInt(input.currentTestScore) : null
    };
  }
};

// ============================================================================
// 3. ENGINE IMPLEMENTATION MODULES
// ============================================================================

/**
 * Handles evaluation of experience gains derived from task/test execution profiles.
 */
export const ExpEngine = {
  /**
   * Calculates earned dynamic XP based strictly on current test results and configuration tables.
   * @param {number|null} currentTestScore Score of current test taken (if any).
   * @returns {number} Resulting total earned XP value from action.
   */
  calculateEarnedXp(currentTestScore) {
    if (currentTestScore === null || currentTestScore < 0) {
      return 0;
    }

    let totalEarned = CONFIG.SEASON.baseXpPerTest;

    // Evaluate bonus layers dynamically from config thresholds
    for (const rule of CONFIG.EXP_RULES) {
      if (currentTestScore >= rule.threshold) {
        totalEarned += rule.bonus;
        break; // Max matched bracket tier terminates loop
      }
    }

    return totalEarned;
  }
};

/**
 * Generates data matrices for dynamic level progression caps and loops level changes.
 */
export const LevelEngine = {
  /**
   * Generates total structural parameters for a specified volume range of levels.
   * @param {number} totalLevels Maximum numeric boundary level to map out.
   * @returns {Array<Object>} Set map containing array index maps of level benchmarks.
   */
  generateLevels(totalLevels = 100) {
    const levels = [];
    const base = CONFIG.LEVEL_RULES.baseXpRequired;
    const mult = CONFIG.LEVEL_RULES.xpMultiplierPerLevel;

    for (let i = 1; i <= totalLevels; i++) {
      levels.push({
        level: i,
        requiredXP: base + (i - 1) * mult
      });
    }
    return levels;
  },

  /**
   * Resolves total cumulative global user XP into complex layered sub-level progress components.
   * @param {number} totalAccumulatedXp Complete pool of points earned historically by target profile.
   * @returns {Object} Layer representation containing {level, currentXP, requiredXP, progress, remainingXP}
   */
  evaluateLevelFromXp(totalAccumulatedXp) {
    const levelMatrix = this.generateLevels(CONFIG.LEVEL_RULES.maxLevel);
    let remainingPool = totalAccumulatedXp;
    let resolvedLevel = 1;
    let requiredForNext = levelMatrix[0].requiredXP;

    for (const item of levelMatrix) {
      resolvedLevel = item.level;
      requiredForNext = item.requiredXP;

      if (remainingPool < requiredForNext) {
        break;
      } else {
        // Level up consuming needed bracket chunk pool
        if (resolvedLevel < CONFIG.LEVEL_RULES.maxLevel) {
          remainingPool -= requiredForNext;
        } else {
          // Absolute Cap Reached
          remainingPool = requiredForNext; 
          break;
        }
      }
    }

    // Edge check handling absolute max overflow configuration safety limits
    if (resolvedLevel === CONFIG.LEVEL_RULES.maxLevel && totalAccumulatedXp >= this.getMaxLevelTotalXpLimit(levelMatrix)) {
      return {
        level: CONFIG.LEVEL_RULES.maxLevel,
        currentXP: requiredForNext,
        requiredXP: requiredForNext,
        progress: 100,
        remainingXP: 0
      };
    }

    const calculatedPercentage = parseFloat(((remainingPool / requiredForNext) * 100).toFixed(2));

    return {
      level: resolvedLevel,
      currentXP: remainingPool,
      requiredXP: requiredForNext,
      progress: calculatedPercentage,
      remainingXP: Math.max(0, requiredForNext - remainingPool)
    };
  },

  /**
   * Calculates structural total aggregate mass limit sum required to unlock maximum configurations.
   * @private
   */
  getMaxLevelTotalXpLimit(matrix) {
    let sum = 0;
    for (let i = 0; i < matrix.length - 1; i++) {
      sum += matrix[i].requiredXP;
    }
    return sum;
  }
};

/**
 * Translates level steps into contextual user tier rankings.
 */
export const RankEngine = {
  /**
   * Evaluates current user Tier Rank profile match based on established Levels.
   * @param {number} currentLevel Normalized active scale index of the user profile.
   * @returns {Object} Matching rule object containing visual asset styling information.
   */
  getRankByLevel(currentLevel) {
    const level = Utils.ensureInt(currentLevel, 1);
    
    // Scan structure configs to discover matching scale constraints
    for (const tier of CONFIG.RANK_RULES) {
      if (level >= tier.minLevel && level <= tier.maxLevel) {
        return {
          name: tier.name,
          icon: tier.icon,
          color: tier.color,
          minLevel: tier.minLevel,
          maxLevel: tier.maxLevel
        };
      }
    }

    // Default Fallback safety net
    return { ...CONFIG.RANK_RULES[0] };
  }
};

/**
 * Processes rules to compute acquired custom data-driven badges.
 */
export const BadgeEngine = {
  /**
   * Evaluates complete state criteria arrays against matching profiles without branching statements.
   * @param {Object} playerStats Cleaned reference stats metadata map.
   * @returns {Array<Object>} Final complete collection list of unlocked badge tokens.
   */
  evaluateBadges(playerStats) {
    const unlockedBadges = [];

    for (const rule of CONFIG.BADGE_RULES) {
      const targetValue = playerStats[rule.field];
      let isUnlocked = false;

      // Evaluation executed without manual programmatic procedural if/else ladders
      switch (rule.operator) {
        case "gte":
          isUnlocked = targetValue !== undefined && targetValue >= rule.target;
          break;
        case "eq":
          isUnlocked = targetValue !== undefined && targetValue === rule.target;
          break;
        case "bool":
          isUnlocked = !!targetValue === !!rule.target;
          break;
      }

      if (isUnlocked) {
        unlockedBadges.push({
          id: rule.id,
          name: rule.name,
          icon: rule.icon,
          description: rule.description
        });
      }
    }

    return unlockedBadges;
  }
};

/**
 * Tracks progressive milestone matrices metrics over time.
 */
export const AchievementEngine = {
  /**
   * Compiles dynamic scalar track elements for progress items.
   * @param {Object} playerStats Validated target evaluation statistics payload.
   * @returns {Array<Object>} Tracking metrics array covering target definitions.
   */
  evaluateAchievements(playerStats) {
    return CONFIG.ACHIEVEMENT_RULES.map(rule => {
      const currentValue = Utils.ensureInt(playerStats[rule.field]);
      const targetValue = rule.target;
      
      const completed = currentValue >= targetValue;
      const remaining = Math.max(0, targetValue - currentValue);
      
      let percentage = parseFloat(((currentValue / targetValue) * 100).toFixed(2));
      if (percentage > 100) percentage = 100;

      return {
        id: rule.id,
        title: rule.title,
        field: rule.field,
        target: targetValue,
        progress: currentValue,
        completed: completed,
        remaining: remaining,
        percentage: percentage
      };
    });
  }
};

/**
 * Handles structural updates on specific target metrics tracking daily missions.
 */
export const MissionEngine = {
  /**
   * Evaluates daily challenges status updates using state constraints.
   * @param {Object} playerStats State payload reference mapping user current parameters.
   * @returns {Array<Object>} Daily target updates status output.
   */
  evaluateMissions(playerStats) {
    return CONFIG.DAILY_MISSION_RULES.map(rule => {
      let rawValue = playerStats[rule.field];
      
      // Map true/false flags into metrics calculation vectors
      let currentValue = typeof rawValue === "boolean" ? (rawValue ? 1 : 0) : Utils.ensureInt(rawValue);
      const targetValue = rule.target;

      const completed = currentValue >= targetValue;
      let percentage = parseFloat(((currentValue / targetValue) * 100).toFixed(2));
      if (percentage > 100) percentage = 100;

      return {
        id: rule.id,
        description: rule.description,
        progress: currentValue,
        completed: completed,
        reward: { xp: rule.rewardXp },
        percentage: percentage
      };
    });
  }
};

/**
 * Compiles output blocks formatting consistent layout profiles.
 */
export const ProfileBuilder = {
  /**
   * Builds summarized output models of the user profile state.
   * @param {Object} levelBlock Evaluation parameters compiled via LevelEngine.
   * @param {Object} rankBlock Evaluation parameters compiled via RankEngine.
   * @param {Array} badges Complete collection array list of badges.
   * @param {Array} achievements Complete collection array list of achievements.
   * @param {Array} missions Complete tracking array listing daily missions.
   * @returns {Object} Compact normalized profile visualization dataset.
   */
  buildProfile(levelBlock, rankBlock, badges, achievements, missions) {
    return {
      level: levelBlock.level,
      rank: {
        name: rankBlock.name,
        icon: rankBlock.icon,
        color: rankBlock.color
      },
      badgesCount: badges.length,
      achievementsSummary: {
        total: achievements.length,
        completed: achievements.filter(a => a.completed).length
      },
      missionsSummary: {
        total: missions.length,
        completed: missions.filter(m => m.completed).length
      },
      xpProgress: {
        currentXP: levelBlock.currentXP,
        requiredXP: levelBlock.requiredXP,
        percentage: levelBlock.progress
      }
    };
  }
};

// ============================================================================
// 4. MAIN ENTRY POINT FUNCTION
// ============================================================================

/**
 * Evaluates a player's statistics to calculate progression, level ups, badges, and achievements.
 * * @param {Object} input - The execution profile data of the target player.
 * @param {number} input.totalTests - Total tests historically completed.
 * @param {number} input.totalScore - Total aggregated cumulative test points.
 * @param {number} input.weekScore - Current weekly points performance tally.
 * @param {number} input.bestScore - Historically recorded top test performance score.
 * @param {number} input.xp - Historical total base XP accumulated by the player.
 * @param {number} input.level - Currently recorded fallback level index.
 * @param {number} input.todayTests - Count number of exams executed within the active window.
 * @param {number} input.todayScore - Point total scored within the active window.
 * @param {boolean} input.loginToday - Active window check authentication registration flag.
 * @param {boolean} input.top1LastWeek - Leaderboard verification status tracker flag.
 * @param {number} [input.currentTestScore] - Optional score from a freshly submitted test.
 * * @returns {Object} Comprehensive calculation matrix containing structural system feedback outputs.
 */
export function evaluatePlayer(input) {
  // 1. Data Sanitization & Guard Rails Injection Handling
  const validatedStats = Utils.validateInput(input);

  // 2. Action Tracking - Calculate Earned XP (if any test was recently completed)
  const earnedXP = ExpEngine.calculateEarnedXp(validatedStats.currentTestScore);

  // 3. Adjust Totals with freshly processed runtime execution actions
  const totalUpdatedXp = validatedStats.xp + earnedXP;
  
  if (validatedStats.currentTestScore !== null) {
    validatedStats.totalTests += 1;
    validatedStats.totalScore += validatedStats.currentTestScore;
    if (validatedStats.currentTestScore > validatedStats.bestScore) {
      validatedStats.bestScore = validatedStats.currentTestScore;
    }
  }

  // 4. Core Pipeline Progression Matrix Calculation
  const levelData = LevelEngine.evaluateLevelFromXp(totalUpdatedXp);
  
  // Update internal verification vector values inside structural context references
  validatedStats.level = levelData.level;
  validatedStats.xp = totalUpdatedXp;

  const rankData = RankEngine.getRankByLevel(levelData.level);
  const badgeList = BadgeEngine.evaluateBadges(validatedStats);
  const achievementList = AchievementEngine.evaluateAchievements(validatedStats);
  const dailyMissionList = MissionEngine.evaluateMissions(validatedStats);

  // 5. Structure Context Summary Profiler Blocks
  const profileSummary = ProfileBuilder.buildProfile(
    levelData,
    rankData,
    badgeList,
    achievementList,
    dailyMissionList
  );

  // Determine structural progression mapping bounds targets for next step layers
  const nextLevelBoundary = Math.min(CONFIG.LEVEL_RULES.maxLevel, levelData.level + 1);

  // 6. Final Outputs Assembly Execution
  return {
    earnedXP: earnedXP,
    currentXP: totalUpdatedXp,
    level: levelData.level,
    rank: rankData,
    badges: badgeList,
    achievements: achievementList,
    missions: dailyMissionList,
    profile: profileSummary,
    nextLevel: nextLevelBoundary,
    progress: levelData.progress
  };
}