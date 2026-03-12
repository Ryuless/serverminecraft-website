export const SERVER_UPDATES = [
  {
    id: 'v1-1-2',
    version: 'v1.1.2',
    date: '2026-03-12',
    image: '/patch-updates/images/v1.1.2.png',
    summary:
      'Added Jobs System, Added Parties System, Re-Added Clans System, Added Bounties System, Better World Generator',
    content: `Added Jobs System
Added Parties System
Re-Added Clans System
Added Bounties System
Better World Generator`,
  },
  {
    id: 'v1-1',
    version: 'v1.1',
    date: '2026-03-12',
    summary: 'New Races: Demon & Mermaid, Races Rework, Class Rework',
    content: `VALHALLARACES REWORK SUMMARY
Date: 2026-03-12

====================================================
RACES - OVERALL
====================================================
- Reworked all existing races: dwarf, fairy, human, lich, elf, dragonborn.
- Added 2 new races: demon, mermaid.
- Adjusted race positions to fit compact menu layout (19-26).
- Rebalanced stat spread to reduce extreme values and improve PvP/PvE parity.

----------------------------------------------------
RACES - DETAILED CHANGES
----------------------------------------------------

[DWARF] (REWORK)
- Buff: MINING_EXP_GAIN 0.20 -> 0.25
- Nerf: EXPLOSION_RESISTANCE 0.40 -> 0.25
- Nerf: MELEE_RESISTANCE 0.15 -> 0.10
- Nerf: MOVEMENT_SPEED_BONUS -0.15 -> -0.10 (less penalty = buff quality of life)
- Adjustment: SCALE -0.02 -> -0.03
- Adjustment: HEAVY_WEAPONS_EXP_GAIN 0.20 -> 0.15

[FAIRY] (REWORK)
- Nerf: extreme fragility reduced and normalized
- Adjustment: SCALE -0.50 (was too extreme compared to lore text)
- Nerf: MAGIC_DAMAGE_DEALT 0.25 -> 0.20
- Nerf: MOVEMENT_SPEED_BONUS 0.15 -> 0.12
- Nerf: DODGE_CHANCE 0.18 -> 0.16
- Nerf: JUMP_HEIGHT_MULTIPLIER 0.30 -> 0.20
- Buff: survivability improved by reducing penalties
  * HEALTH_BONUS -6 -> -5
  * DAMAGE_RESISTANCE -0.32 -> -0.12
  * removed HEAVY_ARMOR_MULTIPLIER -0.25 penalty

[HUMAN] (REWORK)
- Buff: GLOBAL_EXP_GAIN 0.10 -> 0.12
- Nerf: DAMAGE_RESISTANCE 0.10 -> 0.08
- Nerf: COOLDOWN_REDUCTION 0.20 -> 0.12
- New Adjustment: added MELEE_DAMAGE_DEALT +0.05 and RANGED_DAMAGE_DEALT +0.05
- Design goal: true jack-of-all-trades without overpowered cooldown advantage

[LICH] (REWORK)
- Nerf: MAGIC_DAMAGE_DEALT 0.35 -> 0.28
- Nerf: COOLDOWN_REDUCTION 0.20 -> 0.16
- Nerf: POISON_RESISTANCE 0.30 -> 0.20
- Nerf: movement penalty reduced (quality buff) MOVEMENT_SPEED_BONUS -0.25 -> -0.15
- Buff: health penalty reduced HEALTH_BONUS -4 -> -3
- Nerf: RADIANT_RESISTANCE penalty improved -0.30 -> -0.20
- Nerf: GLOBAL_EXP_GAIN penalty improved -0.15 -> -0.10

[ELF] (REWORK)
- Nerf: ARCHERY_EXP_GAIN 0.30 -> 0.20
- Nerf: DODGE_CHANCE 0.25 -> 0.12
- Nerf: MOVEMENT_SPEED_BONUS 0.10 -> 0.08
- Adjustment: shifted identity toward agile precision + anti-fall utility
- Buff: added HEAVY_ARMOR_MULTIPLIER -0.08 weakness for role clarity

[DRAGONBORN] (REWORK)
- Nerf: FIRE_DAMAGE_DEALT 0.30 -> 0.22
- Nerf: MELEE_DAMAGE_DEALT 0.15 -> 0.12
- Nerf: KNOCKBACK_BONUS 0.20 -> 0.16
- Nerf: HEALTH_BONUS 4 -> 3
- Buff: movement penalty reduced -0.15 -> -0.10
- Buff: cooldown penalty reduced -0.10 -> -0.08
- Adjustment: SCALE 0.05 -> 0.06

[DEMON] (NEW)
- New race with high-risk high-reward infernal melee profile
- Core buffs:
  * MELEE_DAMAGE_DEALT +0.18
  * NECROTIC_DAMAGE_DEALT +0.18
  * FIRE_RESISTANCE +0.25
  * HEALING_BONUS +0.12
  * KNOCKBACK_RESISTANCE +0.10
- Core trade-offs:
  * RADIANT_RESISTANCE -0.20
  * GLOBAL_EXP_GAIN -0.08
  * MOVEMENT_SPEED_BONUS -0.06
  * COOLDOWN_REDUCTION -0.08

[MERMAID] (NEW)
- New support/control caster race
- Core buffs:
  * MAGIC_DAMAGE_DEALT +0.16
  * HEALING_BONUS +0.20
  * LINGERING_DURATION_MULTIPLIER +0.18
  * COOLDOWN_REDUCTION +0.15
  * MOVEMENT_SPEED_BONUS +0.10
  * FREEZING_RESISTANCE +0.15
- Core trade-offs:
  * MELEE_DAMAGE_DEALT -0.10
  * HEAVY_ARMOR_MULTIPLIER -0.10
  * FIRE_RESISTANCE -0.05


====================================================
CLASSES - OVERALL
====================================================
- Reworked classes.yml completely.
- Removed old multi-group progression model.
- Set ALL classes to group: 1.
- Result: player can only choose 1 class total.
- Added multiple new fantasy/MMORPG class archetypes.

----------------------------------------------------
CLASSES - FINAL LIST
----------------------------------------------------
- warrior (rework)
- berserker (new)
- paladin (new)
- ranger (rework)
- assassin (new)
- mage (new)
- warlock (new)
- cleric (new)
- alchemist (rework)
- necromancer (new)

----------------------------------------------------
CLASSES - DETAILED CHANGES
----------------------------------------------------

[WARRIOR] (REWORK)
- Adjustment: now true frontline baseline
- MELEE_DAMAGE_DEALT +0.08
- ARMOR_MULTIPLIER_BONUS +0.10
- Added MELEE_RESISTANCE +0.08

[RANGER] (REWORK)
- Buff: RANGED_DAMAGE_DEALT +0.14 (from old +0.10)
- Maintained accuracy identity with RANGED_INACCURACY -2
- Added MOVEMENT_SPEED_BONUS +0.08

[ALCHEMIST] (REWORK)
- Nerf/Adjustment: quality from +25 -> +20
- Normalized stat key usage to BREWING_SPEED_BONUS +0.35
- Added ALCHEMY_EXP_GAIN +0.20

[BERSERKER] (NEW)
- High melee burst class
- MELEE_DAMAGE_DEALT +0.16
- ATTACK_SPEED_BONUS +0.10
- Trade-off: DAMAGE_RESISTANCE -0.08

[PALADIN] (NEW)
- Tank/support holy hybrid
- DAMAGE_RESISTANCE +0.15
- RADIANT_DAMAGE_DEALT +0.12
- HEALING_BONUS +0.12
- Trade-off: MOVEMENT_SPEED_BONUS -0.06

[ASSASSIN] (NEW)
- Mobility/crit melee class
- MELEE_DAMAGE_DEALT +0.12
- CRIT_CHANCE +0.10
- DODGE_CHANCE +0.10
- Trade-off: HEALTH_BONUS -2

[MAGE] (NEW)
- Pure arcane DPS
- MAGIC_DAMAGE_DEALT +0.18
- COOLDOWN_REDUCTION +0.12
- ENCHANTING_EXP_GAIN +0.15
- Trade-off: MELEE_DAMAGE_DEALT -0.10

[WARLOCK] (NEW)
- Dark caster with DoT profile
- MAGIC_DAMAGE_DEALT +0.14
- NECROTIC_DAMAGE_DEALT +0.16
- LINGERING_DURATION_MULTIPLIER +0.20
- Trade-off: RADIANT_RESISTANCE -0.08

[CLERIC] (NEW)
- Defensive healer role
- HEALING_BONUS +0.20
- DAMAGE_RESISTANCE +0.10
- RADIANT_DAMAGE_DEALT +0.10
- Trade-off: DAMAGE_DEALT -0.08

[NECROMANCER] (NEW)
- Poison/necrotic specialist
- NECROTIC_DAMAGE_DEALT +0.15
- POISON_DAMAGE_DEALT +0.15
- POISON_RESISTANCE +0.10
- Trade-off: GLOBAL_EXP_GAIN -0.06


====================================================
IMPLEMENTATION NOTES
====================================================
- All stat keys were aligned to available keys in config stat list.
- All classes use group: 1 to enforce one class pick.
- Icons/positions were set to remain compatible with 45-slot menu.`,
  },
]
