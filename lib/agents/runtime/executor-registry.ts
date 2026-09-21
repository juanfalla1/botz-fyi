import type { ToolExecutor } from "./types";

export class ToolExecutorRegistry {
  private readonly executors = new Map<string, ToolExecutor>();

  constructor(initialExecutors: readonly ToolExecutor[] = []) {
    for (const executor of initialExecutors) this.register(executor);
  }

  register(executor: ToolExecutor) {
    const toolId = String(executor.toolId || "").trim();
    if (!toolId) throw new Error("Tool executor must declare a toolId.");
    if (this.executors.has(toolId)) throw new Error(`Tool executor already registered: ${toolId}`);
    this.executors.set(toolId, executor);
    return this;
  }

  get(toolId: string) {
    return this.executors.get(toolId);
  }

  has(toolId: string) {
    return this.executors.has(toolId);
  }

  listToolIds() {
    return Array.from(this.executors.keys());
  }
}
