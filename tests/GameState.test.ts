import { describe, expect, it } from "vitest";
import { GameState } from "../src/core/GameState";

describe("GameState", () => {
  it("does not consume reusable key items", () => {
    const state = new GameState();
    state.addItem("ITM-G01-003");
    expect(state.consumeItem("ITM-G01-003", false)).toBe(true);
    expect(state.hasItem("ITM-G01-003")).toBe(true);
  });

  it("keeps G01 star core count at zero", () => {
    const state = new GameState();
    state.setVariable("world_star_core_count", 0);
    expect(state.getVariable("world_star_core_count", -1)).toBe(0);
  });
});
