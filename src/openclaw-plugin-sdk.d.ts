declare module "openclaw/plugin-sdk" {
  export interface OpenclawConfig {
    channels?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface ChannelConfigSchema {
    schema: unknown;
  }

  export interface PluginRuntime {
    channel?: {
      dispatchInbound?: (payload: unknown) => Promise<unknown> | unknown;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export interface ChannelPlugin<TAccount = any> {
    id: string;
    meta?: Record<string, unknown>;
    capabilities?: Record<string, unknown>;
    reload?: Record<string, unknown>;
    configSchema?: ChannelConfigSchema;
    config?: Record<string, unknown>;
    security?: Record<string, unknown>;
    outbound?: Record<string, unknown>;
    gateway?: {
      startAccount?: (ctx: {
        account: TAccount;
        getStatus: () => Record<string, unknown>;
        setStatus: (status: Record<string, unknown>) => void;
        abortSignal: AbortSignal;
        log?: {
          info?: (...args: unknown[]) => void;
          warn?: (...args: unknown[]) => void;
          error?: (...args: unknown[]) => void;
        };
        [key: string]: unknown;
      }) => Promise<void>;
      handleRequest?: (...args: unknown[]) => Promise<unknown>;
      [key: string]: unknown;
    };
    status?: Record<string, unknown>;
    onboarding?: unknown;
    [key: string]: unknown;
  }
}
