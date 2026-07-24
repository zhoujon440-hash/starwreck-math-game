export type SceneState = "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

export class GameState {
  readonly variables = new Map<string, boolean | number | string>();
  readonly scenes = new Map<string, SceneState>();
  readonly inventory = new Set<string>();

  setVariable(key: string, value: boolean | number | string): void {
    this.variables.set(key, value);
  }

  getVariable<T extends boolean | number | string>(key: string, fallback: T): T {
    return (this.variables.get(key) as T | undefined) ?? fallback;
  }

  setSceneState(sceneId: string, state: SceneState): void {
    this.scenes.set(sceneId, state);
  }

  addItem(itemId: string): void {
    this.inventory.add(itemId);
  }

  hasItem(itemId: string): boolean {
    return this.inventory.has(itemId);
  }

  consumeItem(itemId: string, consumable: boolean): boolean {
    if (!this.inventory.has(itemId)) return false;
    if (consumable) this.inventory.delete(itemId);
    return true;
  }
}
