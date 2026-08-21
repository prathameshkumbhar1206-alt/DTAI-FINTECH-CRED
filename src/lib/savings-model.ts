/**
 * Rewards leakage model.
 *
 * The headline KPI — "this household left ₹X on the table" — has to survive a
 * CFO asking where the number comes from. So rather than hardcoding it, it is
 * computed: take the household's monthly spend basket, price every category
 * against every card the household actually holds, and compare what optimal
 * routing would have earned against what the household's default habit earns.
 *
 * The assumptions are deliberately visible (see `assumptions` in the result) so
 * the number can be interrogated rather than taken on faith.
 */

import { evaluateCard, type SpendCategory } from './card-rules';

export type SpendLine = { category: SpendCategory; monthlyAmountINR: number };

export type LeakageLine = {
  category: SpendCategory;
  monthlyAmountINR: number;
  bestCardName: string;
  bestValueINR: number;
  habitCardName: string;
  habitValueINR: number;
  monthlyLeakINR: number;
};

export type LeakageResult = {
  monthlyLeakINR: number;
  annualLeakINR: number;
  monthlyOptimalINR: number;
  monthlyHabitINR: number;
  lines: LeakageLine[];
  assumptions: string[];
};

/**
 * `habitCardName` models the status quo: most households put nearly everything on
 * one familiar primary card rather than switching per category. That habit is the
 * baseline the optimiser is measured against.
 */
export function computeLeakage(
  cards: { name: string }[],
  basket: SpendLine[],
  habitCardName: string
): LeakageResult {
  const lines: LeakageLine[] = [];

  for (const line of basket) {
    if (!cards.length) continue;

    let bestName = cards[0].name;
    let bestValue = -Infinity;
    for (const c of cards) {
      const evaluation = evaluateCard(c.name, line.monthlyAmountINR, line.category, '');
      if (evaluation.netValueINR > bestValue) {
        bestValue = evaluation.netValueINR;
        bestName = c.name;
      }
    }

    const habit = evaluateCard(habitCardName, line.monthlyAmountINR, line.category, '');
    const leak = Math.max(0, bestValue - habit.netValueINR);

    lines.push({
      category: line.category,
      monthlyAmountINR: line.monthlyAmountINR,
      bestCardName: bestName,
      bestValueINR: Math.round(bestValue),
      habitCardName,
      habitValueINR: Math.round(habit.netValueINR),
      monthlyLeakINR: Math.round(leak),
    });
  }

  const monthlyLeak = lines.reduce((s, l) => s + l.monthlyLeakINR, 0);
  const monthlyOptimal = lines.reduce((s, l) => s + l.bestValueINR, 0);
  const monthlyHabit = lines.reduce((s, l) => s + l.habitValueINR, 0);

  return {
    monthlyLeakINR: monthlyLeak,
    annualLeakINR: monthlyLeak * 12,
    monthlyOptimalINR: monthlyOptimal,
    monthlyHabitINR: monthlyHabit,
    lines: lines.sort((a, b) => b.monthlyLeakINR - a.monthlyLeakINR),
    assumptions: [
      `Baseline behaviour: the household routes all spend to ${habitCardName}, its primary card.`,
      'Spend basket is a representative month for this household, held constant across the year.',
      'Reward points are valued at their standard redemption rate; promotional transfer bonuses are excluded.',
      'Monthly reward caps and category exclusions are applied; annual fee waivers are not netted off.',
      'Figures are illustrative and based on synthetic household data, not live bank feeds.',
    ],
  };
}
