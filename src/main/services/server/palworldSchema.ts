// This file is auto-generated.
export interface PalworldSettingSchema {
  key: string
  displayName?: string
  type:
    | 'String'
    | 'Numeric'
    | 'NumericSigned'
    | 'Floating'
    | 'TrueFalse'
    | 'AlphaDash'
    | 'CrossplayPlatforms'
    | 'DenyTechnologyList'
  defaultValue: string | number | boolean
  category: string
  requiresQuotes: boolean
  hideInUI: boolean
  description?: string
}

export const PALWORLD_SCHEMA: PalworldSettingSchema[] = [
  {
    key: 'Difficulty',
    displayName: 'Difficulty',
    type: 'String',
    defaultValue: 'None',
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'RandomizerType',
    displayName: 'Randomizer Type',
    type: 'String',
    defaultValue: 'None',
    category: 'General',
    requiresQuotes: false,
    description:
      'Pal spawn randomization mode: None = no randomization; Region = randomize per region; All = fully randomized.',
    hideInUI: false
  },
  {
    key: 'RandomizerSeed',
    displayName: 'Randomizer Seed',
    type: 'String',
    defaultValue: '',
    category: 'General',
    requiresQuotes: true,
    description: 'Seed value used when Pal spawn randomization mode is enabled.',
    hideInUI: false
  },
  {
    key: 'bIsRandomizerPalLevelRandom',
    displayName: 'Is Randomizer Pal Level Random',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description:
      'If true, wild Pal levels are fully random. If false, levels are randomized within each area’s intended range.',
    hideInUI: false
  },
  {
    key: 'DayTimeSpeedRate',
    displayName: 'Day Time Speed Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Daytime progression speed.',
    hideInUI: false
  },
  {
    key: 'NightTimeSpeedRate',
    displayName: 'Night Time Speed Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Nighttime progression speed.',
    hideInUI: false
  },
  {
    key: 'ExpRate',
    displayName: 'Experience Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'EXP gain multiplier.',
    hideInUI: false
  },
  {
    key: 'PalCaptureRate',
    displayName: 'Pal Capture Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Capture rate multiplier.',
    hideInUI: false
  },
  {
    key: 'PalSpawnNumRate',
    displayName: 'Pal Spawn Number Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Pal spawn rate. (Impacts performance.)',
    hideInUI: false
  },
  {
    key: 'PalDamageRateAttack',
    displayName: 'Pal Damage Rate Attack',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Damage dealt by Pals multiplier.',
    hideInUI: false
  },
  {
    key: 'PalDamageRateDefense',
    displayName: 'Pal Damage Rate Defense',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Damage taken by Pals multiplier.',
    hideInUI: false
  },
  {
    key: 'PlayerDamageRateAttack',
    displayName: 'Player Damage Rate Attack',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Damage dealt by players multiplier.',
    hideInUI: false
  },
  {
    key: 'PlayerDamageRateDefense',
    displayName: 'Player Damage Rate Defense',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Damage taken by players multiplier.',
    hideInUI: false
  },
  {
    key: 'PlayerStomachDecreaceRate',
    displayName: 'Player Stomach Decrease Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Player hunger depletion rate multiplier.',
    hideInUI: false
  },
  {
    key: 'PlayerStaminaDecreaceRate',
    displayName: 'Player Stamina Decrease Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Player stamina depletion rate multiplier.',
    hideInUI: false
  },
  {
    key: 'PlayerAutoHPRegeneRate',
    displayName: 'Player Auto HP Regeneration Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Player natural HP regen multiplier.',
    hideInUI: false
  },
  {
    key: 'PlayerAutoHpRegeneRateInSleep',
    displayName: 'Player Auto HP Regeneration Rate In Sleep',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Player HP regen while sleeping multiplier.',
    hideInUI: false
  },
  {
    key: 'PalStomachDecreaceRate',
    displayName: 'Pal Stomach Decrease Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Pal hunger depletion rate multiplier.',
    hideInUI: false
  },
  {
    key: 'PalStaminaDecreaceRate',
    displayName: 'Pal Stamina Decrease Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Pal stamina depletion rate multiplier.',
    hideInUI: false
  },
  {
    key: 'PalAutoHPRegeneRate',
    displayName: 'Pal Auto HP Regeneration Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Pal natural HP regen multiplier.',
    hideInUI: false
  },
  {
    key: 'PalAutoHpRegeneRateInSleep',
    displayName: 'Pal Auto HP Regeneration Rate In Sleep',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Pal HP regen while sleeping (in Palbox) multiplier.',
    hideInUI: false
  },
  {
    key: 'BuildObjectHpRate',
    displayName: 'Build Object HP Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'BuildObjectDamageRate',
    displayName: 'Build Object Damage Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Damage multiplier to buildings.',
    hideInUI: false
  },
  {
    key: 'BuildObjectDeteriorationDamageRate',
    displayName: 'Build Object Deterioration Damage Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Building decay speed multiplier.',
    hideInUI: false
  },
  {
    key: 'CollectionDropRate',
    displayName: 'Collection Drop Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Gatherable items multiplier',
    hideInUI: false
  },
  {
    key: 'CollectionObjectHpRate',
    displayName: 'Collection Object HP Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Gatherable objects health multiplier',
    hideInUI: false
  },
  {
    key: 'CollectionObjectRespawnSpeedRate',
    displayName: 'Collection Object Respawn Speed Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Gatherable objects respawn interval',
    hideInUI: false
  },
  {
    key: 'EnemyDropItemRate',
    displayName: 'Enemy Drop Item Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Dropped item quantity multiplier.',
    hideInUI: false
  },
  {
    key: 'DeathPenalty',
    displayName: 'Death Penalty',
    type: 'String',
    defaultValue: 'Item',
    category: 'PvP & Guild',
    requiresQuotes: false,
    description:
      'Death Penalty None : No drops, Item : Drop all items except equipment, ItemAndEquipment : Drop all items, All : Drop all items and all Pals on team',
    hideInUI: false
  },
  {
    key: 'bEnablePlayerToPlayerDamage',
    displayName: 'Enable Player to Player Damage',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'bEnableFriendlyFire',
    displayName: 'Enable Friendly Fire',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'PvP & Guild',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'bEnableInvaderEnemy',
    displayName: 'Enable Invader Enemy',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'PvP & Guild',
    requiresQuotes: false,
    description: 'Enable Invader',
    hideInUI: false
  },
  {
    key: 'bActiveUNKO',
    displayName: 'Active UNKO',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'bEnableAimAssistPad',
    displayName: 'Enable Aim Assist Pad',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'bEnableAimAssistKeyboard',
    displayName: 'Enable Aim Assist Keyboard',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'DropItemMaxNum',
    displayName: 'Drop Item Max Number',
    type: 'Numeric',
    defaultValue: 3000,
    category: 'World & Building',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'PhysicsActiveDropItemMaxNum',
    displayName: 'Physics Active Drop Item Max Num',
    type: 'NumericSigned',
    defaultValue: -1,
    category: 'World & Building',
    requiresQuotes: false,
    description: 'Maximum number of dropped items that can use physics behavior.',
    hideInUI: false
  },
  {
    key: 'DropItemMaxNum_UNKO',
    displayName: 'Drop Item Max Number UNKO',
    type: 'Numeric',
    defaultValue: 100,
    category: 'World & Building',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'BaseCampMaxNum',
    displayName: 'Base Camp Max Number',
    type: 'Numeric',
    defaultValue: 128,
    category: 'World & Building',
    requiresQuotes: false,
    description: 'Total number of bases across the server.',
    hideInUI: false
  },
  {
    key: 'BaseCampWorkerMaxNum',
    displayName: 'Base Camp Worker Max Number',
    type: 'Numeric',
    defaultValue: 15,
    category: 'World & Building',
    requiresQuotes: false,
    description:
      'Maximum number of Pals per base (max 50). Increasing this value raises processing load.',
    hideInUI: false
  },
  {
    key: 'DropItemAliveMaxHours',
    displayName: 'Drop Item Alive Max Hours',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'World & Building',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'bAutoResetGuildNoOnlinePlayers',
    displayName: 'Auto Reset Guild No Online Players',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description: 'If no guild members log in, automatically delete structures and base Pals.',
    hideInUI: false
  },
  {
    key: 'AutoResetGuildTimeNoOnlinePlayers',
    displayName: 'Auto Reset Guild Time No Online Players',
    type: 'Floating',
    defaultValue: 72.0,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description:
      'Offline duration before bAutoResetGuildNoOnlinePlayers triggers. Ignored if bAutoResetGuildNoOnlinePlayers is False.',
    hideInUI: false
  },
  {
    key: 'GuildPlayerMaxNum',
    displayName: 'Guild Player Max Number',
    type: 'Numeric',
    defaultValue: 20,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description: 'Max player number of guild.',
    hideInUI: false
  },
  {
    key: 'BaseCampMaxNumInGuild',
    displayName: 'Base Camp Max Number In Guild',
    type: 'Numeric',
    defaultValue: 4,
    category: 'World & Building',
    requiresQuotes: false,
    description:
      'Maximum number of bases per guild. Default: 4 (max 10). Increasing this value raises processing load.',
    hideInUI: false
  },
  {
    key: 'PalEggDefaultHatchingTime',
    displayName: 'Pal Egg Default Hatching Time',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description:
      'Time to hatch a Huge Egg (hours). Note: Other eggs also require time to incubate.',
    hideInUI: false
  },
  {
    key: 'WorkSpeedRate',
    displayName: 'Work Speed Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'AutoSaveSpan',
    displayName: 'Auto Save Span',
    type: 'Floating',
    defaultValue: 30.0,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'bIsMultiplay',
    displayName: 'Is Multiplay',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'General',
    requiresQuotes: false,
    hideInUI: true
  },
  {
    key: 'bIsPvP',
    displayName: 'Is PvP',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'PvP & Guild',
    requiresQuotes: false,
    description: 'EnablePvP',
    hideInUI: false
  },
  {
    key: 'bHardcore',
    displayName: 'Hardcore Mode',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'General',
    requiresQuotes: false,
    description: 'Enable Hardcore. You will not be able to respawn on death.',
    hideInUI: false
  },
  {
    key: 'bPalLost',
    displayName: 'Pal Lost',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description: 'Permanently lose Pals on death.',
    hideInUI: false
  },
  {
    key: 'bCharacterRecreateInHardcore',
    displayName: 'Character Recreate In Hardcore',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'General',
    requiresQuotes: false,
    description: 'Whether you may recreate your character upon death in Hardcore mode.',
    hideInUI: false
  },
  {
    key: 'bCanPickupOtherGuildDeathPenaltyDrop',
    displayName: 'Can Pickup Other Guild Death Penalty Drop',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'World & Building',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'bEnableNonLoginPenalty',
    displayName: 'Enable Non-Login Penalty',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'bEnableFastTravel',
    displayName: 'Enable Fast Travel',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'General',
    requiresQuotes: false,
    description: 'Enable fast travel.',
    hideInUI: false
  },
  {
    key: 'bEnableFastTravelOnlyBaseCamp',
    displayName: 'Enable Fast Travel Only Base Camp',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'World & Building',
    requiresQuotes: false,
    description: 'Restrict fast travel to between bases only.',
    hideInUI: false
  },
  {
    key: 'bIsStartLocationSelectByMap',
    displayName: 'Is Start Location Select By Map',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'General',
    requiresQuotes: false,
    description: 'Whether to allow players to choose their starting location.',
    hideInUI: false
  },
  {
    key: 'bExistPlayerAfterLogout',
    displayName: 'Exist Player After Logout',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description:
      'Whether players enter a sleeping state at their current location when logging out.',
    hideInUI: false
  },
  {
    key: 'bEnableDefenseOtherGuildPlayer',
    displayName: 'Enable Defense Other Guild Player',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'bInvisibleOtherGuildBaseCampAreaFX',
    displayName: 'Invisible Other Guild Base Camp Area',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'World & Building',
    requiresQuotes: false,
    description: 'Show base area boundaries.',
    hideInUI: false
  },
  {
    key: 'bBuildAreaLimit',
    displayName: 'Build Area Limit',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'World & Building',
    requiresQuotes: false,
    description: 'Prevent building near structures such as fast-travel points.',
    hideInUI: false
  },
  {
    key: 'ItemWeightRate',
    displayName: 'Item Weight Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Item weight multiplier.',
    hideInUI: false
  },
  {
    key: 'CoopPlayerMaxNum',
    displayName: 'Coop Player Max Number',
    type: 'Numeric',
    defaultValue: 4,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'ServerPlayerMaxNum',
    displayName: 'Max Players',
    type: 'Numeric',
    defaultValue: 32,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description: 'Maximum number of players who can join the server.',
    hideInUI: false
  },
  {
    key: 'ServerName',
    displayName: 'Server Name',
    type: 'String',
    defaultValue: 'Palworld Server Hosted By PalTools/PalServer-Manager',
    category: 'General',
    requiresQuotes: true,
    description: 'Server name',
    hideInUI: false
  },
  {
    key: 'ServerDescription',
    displayName: 'Server Description',
    type: 'String',
    defaultValue: 'Palworld Server Hosted By PalTools/PalServer-Manager',
    category: 'General',
    requiresQuotes: true,
    description: 'Server description',
    hideInUI: false
  },
  {
    key: 'AdminPassword',
    displayName: 'Admin Password',
    type: 'AlphaDash',
    defaultValue: 'ChangeItToUniquePassword',
    category: 'General',
    requiresQuotes: true,
    description: 'Password used to obtain administrative privileges on the server.',
    hideInUI: false
  },
  {
    key: 'ServerPassword',
    displayName: 'Server Password',
    type: 'AlphaDash',
    defaultValue: '',
    category: 'General',
    requiresQuotes: true,
    description: 'Password required to log in to the server.',
    hideInUI: false
  },
  {
    key: 'bAllowClientMod',
    displayName: 'Allow Client Mod',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'General',
    requiresQuotes: false,
    description: 'Allow players with mods enabled to join the server.',
    hideInUI: false
  },
  {
    key: 'PublicPort',
    displayName: 'Public Port',
    type: 'Numeric',
    defaultValue: 8211,
    category: 'General',
    requiresQuotes: false,
    description:
      '(Community server) Explicitly specify the external public port. (Does not change the server’s listening port.)',
    hideInUI: false
  },
  {
    key: 'PublicIP',
    displayName: 'Public IP',
    type: 'String',
    defaultValue: '',
    category: 'General',
    requiresQuotes: true,
    description: '(Community server) Explicitly specify the external public IP.',
    hideInUI: false
  },
  {
    key: 'RCONEnabled',
    displayName: 'Enable RCON',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'RCONPort',
    displayName: 'RCON Port',
    type: 'Numeric',
    defaultValue: 25575,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'Region',
    displayName: 'Server Region',
    type: 'String',
    defaultValue: '',
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'bUseAuth',
    displayName: 'Use Auth',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'BanListURL',
    displayName: 'Ban List URL',
    type: 'String',
    defaultValue: 'https://b.palworldgame.com/api/banlist.txt',
    category: 'General',
    requiresQuotes: true,
    hideInUI: false
  },
  {
    key: 'RESTAPIEnabled',
    displayName: 'Enable RESTAPI',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'RESTAPIPort',
    displayName: 'RESTAPI Port',
    type: 'Numeric',
    defaultValue: 8212,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'bShowPlayerList',
    displayName: 'Show Player List',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description: 'Enable the player list on the ESC menu.',
    hideInUI: false
  },
  {
    key: 'ChatPostLimitPerMinute',
    displayName: 'Chat Post Limit Per Minute',
    type: 'Numeric',
    defaultValue: 128,
    category: 'General',
    requiresQuotes: false,
    description: 'Maximum number of chat messages allowed per minute.',
    hideInUI: false
  },
  {
    key: 'CrossplayPlatforms',
    displayName: 'Crossplay Platforms',
    type: 'CrossplayPlatforms',
    defaultValue: '(Steam,Xbox,PS5,Mac)',
    category: 'General',
    requiresQuotes: false,
    description: 'Allowed platform to connect the server. Default: (Steam,Xbox,PS5,Mac)',
    hideInUI: false
  },
  {
    key: 'bIsUseBackupSaveData',
    displayName: 'Use Backup Save Data',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'General',
    requiresQuotes: false,
    description: 'Enable world backups. Enabling this increases disk load.',
    hideInUI: false
  },
  {
    key: 'LogFormatType',
    displayName: 'Log Format Type',
    type: 'String',
    defaultValue: 'Text',
    category: 'General',
    requiresQuotes: false,
    description: 'Log format: Text or Json',
    hideInUI: false
  },
  {
    key: 'bIsShowJoinLeftMessage',
    displayName: 'Show Join Left Message',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'General',
    requiresQuotes: false,
    description: 'On dedicated servers, show in-game messages when players join/leave.',
    hideInUI: false
  },
  {
    key: 'SupplyDropSpan',
    displayName: 'Supply Drop Span',
    type: 'Numeric',
    defaultValue: 180,
    category: 'World & Building',
    requiresQuotes: false,
    description: 'Meteorite / supply drop interval (minutes).',
    hideInUI: false
  },
  {
    key: 'EnablePredatorBossPal',
    displayName: 'Enable Predator Boss Pal',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'MaxBuildingLimitNum',
    displayName: 'Max Building Limit Number',
    type: 'Numeric',
    defaultValue: 0,
    category: 'World & Building',
    requiresQuotes: false,
    description: 'Per-player building count cap (0 = unlimited).',
    hideInUI: false
  },
  {
    key: 'ServerReplicatePawnCullDistance',
    displayName: 'Server Replicate Pawn Cull Distance',
    type: 'Floating',
    defaultValue: 15000.0,
    category: 'General',
    requiresQuotes: false,
    description: 'Pal sync distance from players (cm). Minimum 5000 – maximum 15000.',
    hideInUI: false
  },
  {
    key: 'bAllowGlobalPalboxExport',
    displayName: 'Allow Global Palbox Export',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Allow saving to the Global Palbox.',
    hideInUI: false
  },
  {
    key: 'bAllowGlobalPalboxImport',
    displayName: 'Allow Global Palbox Import',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description: 'Allow loading from the Global Palbox.',
    hideInUI: false
  },
  {
    key: 'EquipmentDurabilityDamageRate',
    displayName: 'Equipment Durability Damage Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Equipment durability loss multiplier.',
    hideInUI: false
  },
  {
    key: 'ItemContainerForceMarkDirtyInterval',
    displayName: 'Item Container Force Mark Dirty Interval',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'World & Building',
    requiresQuotes: false,
    description: 'How often to force re-sync while a container UI is open (seconds).',
    hideInUI: false
  },
  {
    key: 'PlayerDataPalStorageUpdateCheckTickInterval',
    displayName: 'Player Data Pal Storage Update Check Tick Interval',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'ItemCorruptionMultiplier',
    displayName: 'Item Corruption Multiplier',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Item corruption speed multiplier.',
    hideInUI: false
  },
  {
    key: 'MonsterFarmActionSpeedRate',
    displayName: 'Monster Farm Action Speed Rate',
    type: 'Floating',
    defaultValue: 1.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Item production speed multiplier from grazing.',
    hideInUI: false
  },
  {
    key: 'DenyTechnologyList',
    displayName: 'Deny Technology List',
    type: 'DenyTechnologyList',
    defaultValue: '',
    category: 'General',
    requiresQuotes: false,
    description:
      'Disable specific technologies. Specify Technology IDs. Example: DenyTechnologyList=("PALBOX", "RepairBench")',
    hideInUI: false
  },
  {
    key: 'GuildRejoinCooldownMinutes',
    displayName: 'Guild Rejoin Cooldown Minutes',
    type: 'Numeric',
    defaultValue: 0,
    category: 'PvP & Guild',
    requiresQuotes: false,
    description: 'Guild rejoin cooldown (minutes).',
    hideInUI: false
  },
  {
    key: 'AutoTransferMasterCheckIntervalSeconds',
    displayName: 'Auto Transfer Master Check Interval Seconds',
    type: 'Floating',
    defaultValue: 3600.0,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'AutoTransferMasterThresholdDays',
    displayName: 'Auto Transfer Master Threshold Days',
    type: 'Numeric',
    defaultValue: 14,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'MaxGuildsPerFrame',
    displayName: 'Max Guilds Per Frame',
    type: 'Numeric',
    defaultValue: 10,
    category: 'PvP & Guild',
    requiresQuotes: false,
    hideInUI: false
  },
  {
    key: 'BlockRespawnTime',
    displayName: 'Block Respawn Time',
    type: 'Floating',
    defaultValue: 5.0,
    category: 'General',
    requiresQuotes: false,
    description: 'Cooldown before you can respawn after death (seconds).',
    hideInUI: false
  },
  {
    key: 'RespawnPenaltyDurationThreshold',
    displayName: 'Respawn Penalty Duration Threshold',
    type: 'Floating',
    defaultValue: 0.0,
    category: 'General',
    requiresQuotes: false,
    description:
      'Survival-time threshold (seconds) for applying the respawn cooldown multiplier set by RespawnPenaltyTimeScale on a subsequent death.',
    hideInUI: false
  },
  {
    key: 'RespawnPenaltyTimeScale',
    displayName: 'Respawn Penalty Time Scale',
    type: 'Floating',
    defaultValue: 2.0,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Multiplier applied to the respawn cooldown.',
    hideInUI: false
  },
  {
    key: 'bDisplayPvPItemNumOnWorldMap_BaseCamp',
    displayName: 'Display PvP Item Num On World Map Base Camp',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'World & Building',
    requiresQuotes: false,
    description: 'Whether to show, on the map, the number of PvP-exclusive items in each base.',
    hideInUI: false
  },
  {
    key: 'bDisplayPvPItemNumOnWorldMap_Player',
    displayName: 'Display PvP Item Num On World Map Player',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description:
      'Whether to show player locations and the number of PvP-exclusive items on the map.',
    hideInUI: false
  },
  {
    key: 'AdditionalDropItemWhenPlayerKillingInPvPMode',
    displayName: 'Additional Drop Item When Player Killing In PvP Mode',
    type: 'String',
    defaultValue: 'PlayerDropItem',
    category: 'Player & Pal Stats',
    requiresQuotes: true,
    description:
      'When bAdditionalDropItemWhenPlayerKillingInPvPMode is enabled, the ID of the item to drop.',
    hideInUI: false
  },
  {
    key: 'AdditionalDropItemNumWhenPlayerKillingInPvPMode',
    displayName: 'Additional Drop Item Num When Player Killing In PvP Mode',
    type: 'Numeric',
    defaultValue: 1,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description:
      'When bAdditionalDropItemWhenPlayerKillingInPvPMode is enabled, the quantity of the item to drop.',
    hideInUI: false
  },
  {
    key: 'bAdditionalDropItemWhenPlayerKillingInPvPMode',
    displayName: 'Additional Drop Item When Player Killing In PvP Mode Enabled',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description: 'Whether to drop a special item when a player is killed while PvP is enabled.',
    hideInUI: false
  },
  {
    key: 'bEnableVoiceChat',
    displayName: 'Enable Voice Chat',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'General',
    requiresQuotes: false,
    description: 'Enable in-game voice chat.',
    hideInUI: false
  },
  {
    key: 'VoiceChatMaxVolumeDistance',
    displayName: 'Voice Chat Max Volume Distance',
    type: 'Floating',
    defaultValue: 3000.0,
    category: 'General',
    requiresQuotes: false,
    description: 'Distance at which voice chat volume does not attenuate.',
    hideInUI: false
  },
  {
    key: 'VoiceChatZeroVolumeDistance',
    displayName: 'Voice Chat Zero Volume Distance',
    type: 'Floating',
    defaultValue: 15000.0,
    category: 'General',
    requiresQuotes: false,
    description: 'Distance at which voice chat volume becomes zero.',
    hideInUI: false
  },
  {
    key: 'bAllowEnhanceStat_Health',
    displayName: 'Allow Enhance Stat Health',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'General',
    requiresQuotes: false,
    description: 'Allow allocating stat points to HP.',
    hideInUI: false
  },
  {
    key: 'bAllowEnhanceStat_Attack',
    displayName: 'Allow Enhance Stat Attack',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'General',
    requiresQuotes: false,
    description: 'Allow allocating stat points to Attack.',
    hideInUI: false
  },
  {
    key: 'bAllowEnhanceStat_Stamina',
    displayName: 'Allow Enhance Stat Stamina',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description: 'Allow allocating stat points to Stamina.',
    hideInUI: false
  },
  {
    key: 'bAllowEnhanceStat_Weight',
    displayName: 'Allow Enhance Stat Weight',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'General',
    requiresQuotes: false,
    description: 'Allow allocating stat points to Carry Weight.',
    hideInUI: false
  },
  {
    key: 'bAllowEnhanceStat_WorkSpeed',
    displayName: 'Allow Enhance Stat Work Speed',
    type: 'TrueFalse',
    defaultValue: true,
    category: 'Rates & Multipliers',
    requiresQuotes: false,
    description: 'Allow allocating stat points to Work Speed.',
    hideInUI: false
  },
  {
    key: 'bEnableBuildingPlayerUIdDisplay',
    displayName: 'Enable Building Player U Id Display',
    type: 'TrueFalse',
    defaultValue: false,
    category: 'Player & Pal Stats',
    requiresQuotes: false,
    description: 'Whether to display the creator’s player ID on structures.',
    hideInUI: false
  },
  {
    key: 'BuildingNameDisplayCacheTTLSeconds',
    displayName: 'Building Name Display Cache T T L Seconds',
    type: 'Numeric',
    defaultValue: 60,
    category: 'General',
    requiresQuotes: false,
    hideInUI: false
  }
]

/**
 * Validates and smartly fixes an incoming setting value based on its schema type.
 */
export function smartFixSetting(
  schema: PalworldSettingSchema,
  rawValue: unknown
): string | number | boolean {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return schema.defaultValue
  }

  const strVal = String(rawValue).trim()

  switch (schema.type) {
    case 'Numeric': {
      const parsed = parseInt(strVal, 10)
      return isNaN(parsed) || parsed < 0 ? schema.defaultValue : parsed
    }
    case 'NumericSigned': {
      const parsed = parseInt(strVal, 10)
      return isNaN(parsed) ? schema.defaultValue : parsed
    }
    case 'Floating': {
      const parsed = parseFloat(strVal)
      // Palworld expects up to 6 decimal places for floats
      return isNaN(parsed) ? schema.defaultValue : Number(parsed.toFixed(6))
    }
    case 'TrueFalse': {
      const lower = strVal.toLowerCase()
      if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on') return 'True'
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off') return 'False'
      if (rawValue === true) return 'True'
      if (rawValue === false) return 'False'
      return schema.defaultValue
    }
    case 'AlphaDash': {
      const cleaned = strVal.replace(/[^a-zA-Z0-9_-]/g, '')
      return cleaned || schema.defaultValue
    }
    case 'CrossplayPlatforms': {
      const clean = strVal.replace(/[()\s]/g, '')
      if (!clean) return ''
      const allowed = ['Steam', 'Xbox', 'PS5', 'Mac']
      const parts = clean.split(',').filter((p) => allowed.includes(p))
      if (parts.length === 0) return ''
      return `(${parts.join(',')})`
    }
    case 'DenyTechnologyList': {
      const clean = strVal.replace(/[()\s]/g, '')
      if (!clean) return ''
      const parts = clean
        .split(',')
        .map((p) => p.replace(/"/g, '').trim())
        .filter(Boolean)
      if (parts.length === 0) return ''
      return `(${parts.map((p) => `"${p}"`).join(',')})`
    }
    case 'String':
    default:
      return strVal
  }
}
