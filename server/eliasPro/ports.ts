/**
 * Elias Pro — node agent port.
 * ============================================================
 * The subsystem talks to the outside world ONLY through this interface
 * (hexagonal / ports-and-adapters architecture).
 *
 * Two adapters implement it:
 *   • `httpAgentAdapter`      → a real EliasPro node (Pode REST surface).
 *   • `simulatedAgentAdapter` → the built-in simulator for sandboxes, demos,
 *                                air-gapped installs and tests.
 *
 * The port is deliberately coarse: it exposes *capabilities*, not transport
 * details. Swapping the adapter never changes the service layer or the router.
 */
import type {
  EliasDeviceSnapshot,
  EliasEngineDescriptor,
  EliasEngineRunResult,
  EliasNodeHealth,
  EliasWorkOrder,
  EliasWorkOrderPriority,
  EliasWorkOrderStatus,
} from "../../shared/eliasPro";

export interface EliasWorkOrderQuery {
  status?: EliasWorkOrderStatus;
  search?: string;
  limit: number;
}

export interface EliasWorkOrderDraft {
  title: string;
  customerName?: string | null;
  customerPhone?: string | null;
  deviceType?: string | null;
  deviceSerial?: string | null;
  reportedIssue?: string | null;
  priority?: EliasWorkOrderPriority;
  estimatedCost?: number | null;
}

export interface EliasEngineArgs {
  [key: string]: string | number | boolean;
}

export interface EliasProAgentPort {
  readonly nodeId: number;
  readonly code: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly isSimulated: boolean;

  /** Liveness + self-reported health score. Must never throw. */
  health(): Promise<EliasNodeHealth>;

  /** Full device snapshot, normalized to the platform contract. */
  snapshot(): Promise<EliasDeviceSnapshot>;

  /** Invoke a maintenance engine and return its normalized result. */
  runEngine(
    engine: EliasEngineDescriptor,
    args?: EliasEngineArgs
  ): Promise<EliasEngineRunResult>;

  listWorkOrders(query: EliasWorkOrderQuery): Promise<EliasWorkOrder[]>;

  createWorkOrder(draft: EliasWorkOrderDraft): Promise<EliasWorkOrder>;

  updateWorkOrderStatus(
    externalRef: string,
    status: EliasWorkOrderStatus
  ): Promise<EliasWorkOrder>;
}

/** Error raised by adapters when the node cannot satisfy a request. */
export class EliasAgentError extends Error {
  readonly status: "unreachable" | "timeout" | "unauthorized" | "invalid";
  readonly cause?: unknown;

  constructor(
    status: "unreachable" | "timeout" | "unauthorized" | "invalid",
    message: string,
    cause?: unknown
  ) {
    super(message);
    this.name = "EliasAgentError";
    this.status = status;
    this.cause = cause;
  }
}
