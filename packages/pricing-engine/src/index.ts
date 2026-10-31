import jsonLogic from "json-logic-js";
import { Decimal } from "decimal.js";
import { z } from "zod";
import type { Money, CurrencyCode } from "@alhusseiniya/types/common";

export const PricingRuleSchema = z.object({
  id: z.string().uuid(),
  code: z.string().max(50),
  name: z.string().max(200),
  nameAr: z.string().max(200).optional(),
  description: z.string().optional(),
  entityType: z.enum(["product", "customer", "order", "quotation"]),
  condition: z.record(z.unknown()),
  actions: z.array(
    z.object({
      type: z.enum([
        "set_price",
        "apply_discount",
        "apply_surcharge",
        "set_tax_rate",
        "set_payment_terms",
      ]),
      params: z.record(z.unknown()),
    })
  ),
  priority: z.number().int().default(0),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
});
export type PricingRule = z.infer<typeof PricingRuleSchema>;

export const PricingContextSchema = z.object({
  product: z
    .object({
      id: z.string().uuid(),
      code: z.string(),
      name: z.string(),
      categoryId: z.string().uuid().optional(),
      basePrice: z.object({
        amount: z.number(),
        currency: z.string(),
      }),
      cost: z
        .object({
          amount: z.number(),
          currency: z.string(),
        })
        .optional(),
      attributes: z.record(z.unknown()),
      tags: z.array(z.string()),
    })
    .optional(),
  customer: z
    .object({
      id: z.string().uuid(),
      code: z.string(),
      segment: z.string().optional(),
      creditRating: z.string().optional(),
      paymentHistory: z.enum(["excellent", "good", "fair", "poor"]).optional(),
      totalPurchases: z.number().default(0),
      tags: z.array(z.string()),
    })
    .optional(),
  order: z
    .object({
      id: z.string().uuid().optional(),
      quantity: z.number().positive().default(1),
      items: z
        .array(
          z.object({
            productId: z.string().uuid(),
            quantity: z.number().positive(),
            unitPrice: z.object({ amount: z.number(), currency: z.string() }),
          })
        )
        .default([]),
      date: z.string().datetime(),
      deliveryDate: z.string().datetime().optional(),
      paymentTermsDays: z.number().int().nonnegative().default(0),
      warehouseId: z.string().uuid().optional(),
      tags: z.array(z.string()),
    })
    .optional(),
  quotation: z
    .object({
      id: z.string().uuid().optional(),
      items: z
        .array(
          z.object({
            productId: z.string().uuid(),
            quantity: z.number().positive(),
            unitPrice: z.object({ amount: z.number(), currency: z.string() }),
          })
        )
        .default([]),
      validUntil: z.string().datetime().optional(),
      competitorPrice: z
        .object({ amount: z.number(), currency: z.string() })
        .optional(),
    })
    .optional(),
  environment: z.object({
    currency: z.string().default("SAR"),
    exchangeRates: z.record(z.number()),
    taxRate: z.number().default(0.15),
    date: z.string().datetime(),
    timezone: z.string().default("Asia/Riyadh"),
  }),
});
export type PricingContext = z.infer<typeof PricingContextSchema>;

export const PricingResultSchema = z.object({
  unitPrice: z.object({ amount: z.number(), currency: z.string() }),
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.object({ amount: z.number(), currency: z.string() }),
  surchargePercent: z.number().min(0).max(100).default(0),
  surchargeAmount: z.object({ amount: z.number(), currency: z.string() }),
  taxRate: z.number().min(0).max(100).default(0),
  taxAmount: z.object({ amount: z.number(), currency: z.string() }),
  finalPrice: z.object({ amount: z.number(), currency: z.string() }),
  appliedRules: z.array(
    z.object({
      ruleId: z.string().uuid(),
      ruleCode: z.string(),
      actions: z.array(
        z.object({
          type: z.string(),
          params: z.record(z.unknown()),
        })
      ),
    })
  ),
  warnings: z.array(z.string()).default([]),
  breakdown: z.object({
    basePrice: z.object({ amount: z.number(), currency: z.string() }),
    discounts: z
      .array(
        z.object({
          ruleId: z.string().uuid(),
          label: z.string(),
          amount: z.object({ amount: z.number(), currency: z.string() }),
        })
      )
      .default([]),
    surcharges: z
      .array(
        z.object({
          ruleId: z.string().uuid(),
          label: z.string(),
          amount: z.object({ amount: z.number(), currency: z.string() }),
        })
      )
      .default([]),
    taxes: z
      .array(
        z.object({
          label: z.string(),
          rate: z.number(),
          amount: z.object({ amount: z.number(), currency: z.string() }),
        })
      )
      .default([]),
  }),
});
export type PricingResult = z.infer<typeof PricingResultSchema>;

export class PricingEngine {
  private rules: PricingRule[] = [];
  private logic = jsonLogic;

  addRule(rule: PricingRule) {
    const existingIndex = this.rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
    } else {
      this.rules.push(rule);
    }
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  setRules(rules: PricingRule[]) {
    this.rules = rules.filter(r => r.isActive);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  getRules(): PricingRule[] {
    return [...this.rules];
  }

  evaluate(context: PricingContext): PricingResult {
    const basePrice = context.product?.basePrice || {
      amount: 0,
      currency: context.environment.currency,
    };
    const cost = context.product?.cost || {
      amount: 0,
      currency: context.environment.currency,
    };

    let unitPrice = new Decimal(basePrice.amount);
    let discountPercent = 0;
    let discountAmount = new Decimal(0);
    let surchargePercent = 0;
    let surchargeAmount = new Decimal(0);
    let taxRate = context.environment.taxRate * 100;
    const appliedRules: PricingResult["appliedRules"] = [];
    const warnings: string[] = [];
    const discounts: PricingResult["breakdown"]["discounts"] = [];
    const surcharges: PricingResult["breakdown"]["surcharges"] = [];

    const evalContext = {
      product: context.product,
      customer: context.customer,
      order: context.order,
      quotation: context.quotation,
      env: context.environment,
      now: new Date().toISOString(),
    };

    for (const rule of this.rules) {
      if (rule.validFrom && new Date(rule.validFrom) > new Date()) continue;
      if (rule.validTo && new Date(rule.validTo) < new Date()) continue;

      try {
        const matches = this.logic.apply(rule.condition, evalContext);
        if (!matches) continue;

        for (const action of rule.actions) {
          switch (action.type) {
            case "set_price":
              if (action.params.price) {
                unitPrice = new Decimal(action.params.price);
              } else if (action.params.formula) {
                unitPrice = new Decimal(
                  this.logic.apply(action.params.formula, evalContext)
                );
              }
              break;

            case "apply_discount":
              if (action.params.percent) {
                const pct = new Decimal(action.params.percent);
                discountPercent = Decimal.max(discountPercent, pct).toNumber();
                const discAmt = unitPrice.mul(pct).div(100);
                discountAmount = discountAmount.plus(discAmt);
                discounts.push({
                  ruleId: rule.id,
                  label: rule.name,
                  amount: {
                    amount: discAmt.toNumber(),
                    currency: basePrice.currency,
                  },
                });
              } else if (action.params.amount) {
                const amt = new Decimal(action.params.amount);
                discountAmount = discountAmount.plus(amt);
                discounts.push({
                  ruleId: rule.id,
                  label: rule.name,
                  amount: {
                    amount: amt.toNumber(),
                    currency: basePrice.currency,
                  },
                });
              }
              break;

            case "apply_surcharge":
              if (action.params.percent) {
                const pct = new Decimal(action.params.percent);
                surchargePercent = Decimal.max(
                  surchargePercent,
                  pct
                ).toNumber();
                const surchAmt = unitPrice.mul(pct).div(100);
                surchargeAmount = surchargeAmount.plus(surchAmt);
                surcharges.push({
                  ruleId: rule.id,
                  label: rule.name,
                  amount: {
                    amount: surchAmt.toNumber(),
                    currency: basePrice.currency,
                  },
                });
              } else if (action.params.amount) {
                const amt = new Decimal(action.params.amount);
                surchargeAmount = surchargeAmount.plus(amt);
                surcharges.push({
                  ruleId: rule.id,
                  label: rule.name,
                  amount: {
                    amount: amt.toNumber(),
                    currency: basePrice.currency,
                  },
                });
              }
              break;

            case "set_tax_rate":
              if (action.params.rate !== undefined) {
                taxRate = action.params.rate * 100;
              }
              break;

            case "set_payment_terms":
              // Handled by order processing
              break;
          }
        }

        appliedRules.push({
          ruleId: rule.id,
          ruleCode: rule.code,
          actions: rule.actions,
        });
      } catch (error) {
        warnings.push(
          `Rule ${rule.code} evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    const priceAfterDiscount = unitPrice.minus(
      discountAmount.div(context.order?.quantity || 1)
    );
    const priceAfterSurcharge = priceAfterDiscount.plus(
      surchargeAmount.div(context.order?.quantity || 1)
    );
    const taxAmount = priceAfterSurcharge.mul(taxRate).div(100);
    const finalPrice = priceAfterSurcharge.plus(taxAmount);

    const taxBreakdown: PricingResult["breakdown"]["taxes"] = [];
    if (taxRate > 0) {
      taxBreakdown.push({
        label: "VAT",
        rate: taxRate / 100,
        amount: { amount: taxAmount.toNumber(), currency: basePrice.currency },
      });
    }

    return {
      unitPrice: { amount: unitPrice.toNumber(), currency: basePrice.currency },
      discountPercent,
      discountAmount: {
        amount: discountAmount.toNumber(),
        currency: basePrice.currency,
      },
      surchargePercent,
      surchargeAmount: {
        amount: surchargeAmount.toNumber(),
        currency: basePrice.currency,
      },
      taxRate,
      taxAmount: { amount: taxAmount.toNumber(), currency: basePrice.currency },
      finalPrice: {
        amount: finalPrice.toNumber(),
        currency: basePrice.currency,
      },
      appliedRules,
      warnings,
      breakdown: {
        basePrice: {
          amount: unitPrice.toNumber(),
          currency: basePrice.currency,
        },
        discounts,
        surcharges,
        taxes: taxBreakdown,
      },
    };
  }

  evaluateBatch(contexts: PricingContext[]): PricingResult[] {
    return contexts.map(ctx => this.evaluate(ctx));
  }

  // Optimization solver for complex pricing scenarios
  optimize(config: {
    objective: "maximize_margin" | "maximize_volume" | "target_price";
    constraints: Array<{
      type: "min_margin" | "max_discount" | "competitor_match" | "min_price";
      value: number;
      productId?: string;
    }>;
    variables: Array<{
      ruleId: string;
      param: string;
      min: number;
      max: number;
      step: number;
    }>;
    contexts: PricingContext[];
  }): {
    bestResult: PricingResult[];
    bestConfig: Record<string, number>;
    iterations: number;
  } {
    // Simplified grid search - in production, use OR-Tools or similar
    let bestScore = -Infinity;
    let bestResult: PricingResult[] = [];
    let bestConfig: Record<string, number> = {};
    /* eslint-disable prefer-const */
    let iterations;

    const generateCombinations = (
      vars: typeof config.variables,
      index = 0,
      current: Record<string, number> = {}
    ) => {
      if (index >= vars.length) {
        return [current];
      }
      const varDef = vars[index];
      const results = [];
      for (let v = varDef.min; v <= varDef.max; v += varDef.step) {
        results.push(
          ...generateCombinations(vars, index + 1, {
            ...current,
            [varDef.param]: v,
          })
        );
      }
      return results;
    };

    const combinations = generateCombinations(config.variables);
    iterations = combinations.length;

    for (const combo of combinations) {
      // Apply combination to rules
      const originalRules = this.rules.map(r => ({
        ...r,
        actions: r.actions.map(a => ({ ...a, params: { ...a.params } })),
      }));

      for (const [param, value] of Object.entries(combo)) {
        for (const rule of this.rules) {
          for (const action of rule.actions) {
            if (action.params[param] !== undefined) {
              action.params[param] = value;
            }
          }
        }
      }

      const results = this.evaluateBatch(config.contexts);
      let score = 0;

      for (const result of results) {
        switch (config.objective) {
          case "maximize_margin":
            score +=
              result.finalPrice.amount -
              (results[0].breakdown.basePrice.amount || 0);
            break;
          case "maximize_volume":
            score += 1 / (result.discountPercent + 1);
            break;
          case "target_price":
            score -= Math.abs(
              result.finalPrice.amount -
                config.constraints.find(c => c.type === "target_price")
                  ?.value || 0
            );
            break;
        }
      }

      // Check constraints
      let valid = true;
      for (const constraint of config.constraints) {
        for (const result of results) {
          switch (constraint.type) {
            case "min_margin":
              {
                const margin =
                  (result.finalPrice.amount -
                    result.breakdown.basePrice.amount) /
                  result.finalPrice.amount;
                if (margin < constraint.value) valid = false;
              }
              break;
            case "max_discount":
              if (result.discountPercent > constraint.value) valid = false;
              break;
          }
          if (!valid) break;
        }
        if (!valid) break;
      }

      if (valid && score > bestScore) {
        bestScore = score;
        bestResult = results;
        bestConfig = { ...combo };
      }
    }

    // Restore original rules
    this.rules = originalRules;

    return { bestResult, bestConfig, iterations };
  }
}

export const pricingEngine = new PricingEngine();

export function createPricingEngine(rules?: PricingRule[]) {
  const engine = new PricingEngine();
  if (rules) {
    engine.setRules(rules);
  }
  return engine;
}
