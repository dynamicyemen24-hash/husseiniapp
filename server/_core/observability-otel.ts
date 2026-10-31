/**
 * ALHUSAINIA — OpenTelemetry Observability Setup
 * ==============================================
 * Configures distributed tracing, metrics, and logging export.
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { resourceFromAttributes, Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { ENV } from "./env";

let sdk: NodeSDK | null = null;

export function initObservability(): void {
  if (sdk) {
    console.warn("[Observability] Already initialized");
    return;
  }

  if (!ENV.otelEndpoint) {
    console.log("[Observability] OTEL_ENDPOINT not set, skipping initialization");
    return;
  }

  const resource: Resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: "alhusseiniya-platform",
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || "dev",
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: ENV.isProduction ? "production" : "development",
  });

  const traceExporter = new OTLPTraceExporter({
    url: ENV.otelEndpoint,
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
      }),
    ],
    serviceName: "alhusseiniya-platform",
  });

  sdk.start();
  console.log("[Observability] OpenTelemetry initialized");

  process.on("SIGTERM", () => {
    sdk?.shutdown().catch(console.error);
  });
}

export function getSdk(): NodeSDK | null {
  return sdk;
}