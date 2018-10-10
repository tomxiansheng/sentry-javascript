import { Scope } from '@sentry/hub';
import {
  Breadcrumb,
  Integration,
  SentryBreadcrumbHint,
  SentryEvent,
  SentryEventHint,
  SentryResponse,
  Severity,
  Transport,
  TransportClass,
  TransportOptions,
} from '@sentry/types';
import { Dsn } from './dsn';
import { RequestBuffer } from './requestbuffer';

/** Console logging verbosity for the SDK. */
export enum LogLevel {
  /** No logs will be generated. */
  None = 0,
  /** Only SDK internal errors will be logged. */
  Error = 1,
  /** Information useful for debugging the SDK will be logged. */
  Debug = 2,
  /** All SDK actions will be logged. */
  Verbose = 3,
}

/** Base configuration options for every SDK. */
export interface Options {
  /**
   * Enable debug functionality in the SDK itself
   */
  debug?: boolean;

  /**
   * Specifies whether this SDK should activate and send events to Sentry.
   * Disabling the SDK reduces all overhead from instrumentation, collecting
   * breadcrumbs and capturing events. Defaults to true.
   */
  enabled?: boolean;

  /**
   * The Dsn used to connect to Sentry and identify the project. If omitted, the
   * SDK will not send any data to Sentry.
   */
  dsn?: string;

  /**
   * If this is set to false, default integrations will not be added, otherwise this will internally be set to the
   * recommended default integrations.
   */
  defaultIntegrations?: boolean | Integration[];

  /**
   * List of integrations that should be installed after SDK was initialized.
   * Accepts either a list of integrations or a function that receives
   * default integrations and returns a new, updated list.
   */
  integrations?: Integration[] | ((integrations: Integration[]) => Integration[]);

  /**
   * A pattern for error messages which should not be sent to Sentry.
   * By default, all errors will be sent.
   */
  ignoreErrors?: Array<string | RegExp>;

  /**
   * Transport object that should be used to send events to Sentry
   */
  transport?: TransportClass<Transport>;

  /**
   * Options for the default transport that the SDK uses.
   */
  transportOptions?: TransportOptions;

  /**
   * The release identifier used when uploading respective source maps. Specify
   * this value to allow Sentry to resolve the correct source maps when
   * processing events.
   */
  release?: string;

  /** The current environment of your application (e.g. "production"). */
  environment?: string;

  /** Sets the distribution for all events */
  dist?: string;

  /** The maximum number of breadcrumbs sent with events. Defaults to 100. */
  maxBreadcrumbs?: number;

  /** Console logging verbosity for the SDK Client. */
  logLevel?: LogLevel;

  /** A global sample rate to apply to all events (0 - 1). */
  sampleRate?: number;

  /** Attaches stacktraces to pure capture message / log integrations */
  attachStacktrace?: boolean;

  /**
   * A callback invoked during event submission, allowing to optionally modify
   * the event before it is sent to Sentry.
   *
   * Note that you must return a valid event from this callback. If you do not
   * wish to modify the event, simply return it at the end.
   * Returning null will case the event to be dropped.
   *
   * @param event The error or message event generated by the SDK.
   * @param hint May contain additional information about the original exception.
   * @returns A new event that will be sent | null.
   */
  beforeSend?(event: SentryEvent, hint?: SentryEventHint): SentryEvent | null | Promise<SentryEvent | null>;

  /**
   * A callback invoked when adding a breadcrumb, allowing to optionally modify
   * it before adding it to future events.
   *
   * Note that you must return a valid breadcrumb from this callback. If you do
   * not wish to modify the breadcrumb, simply return it at the end.
   * Returning null will case the breadcrumb to be dropped.
   *
   * @param breadcrumb The breadcrumb as created by the SDK.
   * @returns The breadcrumb that will be added | null.
   */
  beforeBreadcrumb?(breadcrumb: Breadcrumb, hint?: SentryBreadcrumbHint): Breadcrumb | null;
}

/**
 * User-Facing Sentry SDK Client Client.
 *
 * This interface contains all methods to interface with the SDK once it has
 * been installed. It allows to send events to Sentry, record breadcrumbs and
 * set a context included in every event. Since the SDK mutates its environment,
 * there will only be one instance during runtime. To retrieve that instance,
 * use {@link Client.getInstance}.
 *
 * Note that the call to {@link Client.install} should occur as early as
 * possible so that even errors during startup can be recorded reliably:
 *
 * @example
 * import { captureMessage } from '@sentry/node';
 * captureMessage('Custom message');
 */
export interface Client<O extends Options = Options> {
  /**
   * Installs the SDK if it hasn't been installed already.
   *
   * Since this performs modifications in the environment, such as instrumenting
   * library functionality or adding signal handlers, this method will only
   * execute once and cache its result.
   *
   * @returns If the installation was the successful or not.
   */
  install(): boolean;

  /**
   * Captures an exception event and sends it to Sentry.
   *
   * @param exception An exception-like object.
   * @param hint May contain additional information about the original exception.
   * @param scope An optional scope containing event metadata.
   * @returns SentryResponse status and event
   */
  captureException(exception: any, hint?: SentryEventHint, scope?: Scope): Promise<SentryResponse>;

  /**
   * Captures a message event and sends it to Sentry.
   *
   * @param message The message to send to Sentry.
   * @param level Define the level of the message.
   * @param hint May contain additional information about the original exception.
   * @param scope An optional scope containing event metadata.
   * @returns SentryResponse status and event
   */
  captureMessage(message: string, level?: Severity, hint?: SentryEventHint, scope?: Scope): Promise<SentryResponse>;

  /**
   * Captures a manually created event and sends it to Sentry.
   *
   * @param event The event to send to Sentry.
   * @param hint May contain additional information about the original exception.
   * @param scope An optional scope containing event metadata.
   * @returns SentryResponse status and event
   */
  captureEvent(event: SentryEvent, hint?: SentryEventHint, scope?: Scope): Promise<SentryResponse>;

  /**
   * Records a new breadcrumb which will be attached to future events.
   *
   * Breadcrumbs will be added to subsequent events to provide more context on
   * user's actions prior to an error or crash. To configure the maximum number
   * of breadcrumbs, use {@link Options.maxBreadcrumbs}.
   *
   * @param breadcrumb The breadcrumb to record.
   * @param hint May contain additional information about the original breadcrumb.
   * @param scope An optional scope to store this breadcrumb in.
   */
  addBreadcrumb(breadcrumb: Breadcrumb, hint?: SentryBreadcrumbHint, scope?: Scope): void;

  /** Returns the current Dsn. */
  getDsn(): Dsn | undefined;

  /** Returns the current options. */
  getOptions(): O;

  /**
   * A promise that resolves whenever the request buffer is empty.
   * If you provide a timeout and the buffer takes longer to drain the promise returns false.
   *
   * @param timeout Maximum time in ms the client should wait.
   */
  close(timeout?: number): Promise<boolean>;

  /** Returns an array of installed integrations on the client. */
  getIntegration(name: string): Integration | null;
}

/**
 * Internal platform-dependent Sentry SDK Backend.
 *
 * While {@link Client} contains business logic specific to an SDK, the
 * Backend offers platform specific implementations for low-level operations.
 * These are persisting and loading information, sending events, and hooking
 * into the environment.
 *
 * Backends receive a handle to the Client in their constructor. When a
 * Backend automatically generates events or breadcrumbs, it must pass them to
 * the Client for validation and processing first.
 *
 * Usually, the Client will be of corresponding type, e.g. NodeBackend
 * receives NodeClient. However, higher-level SDKs can choose to instanciate
 * multiple Backends and delegate tasks between them. In this case, an event
 * generated by one backend might very well be sent by another one.
 *
 * The client also provides access to options via {@link Client.getOptions}
 * and context via {@link Client.getContext}. Note that the user might update
 * these any time and they should not be cached.
 */
export interface Backend {
  /** Installs the SDK into the environment. */
  install?(): boolean;

  /** Creates a {@link SentryEvent} from an exception. */
  eventFromException(exception: any, hint?: SentryEventHint): Promise<SentryEvent>;

  /** Creates a {@link SentryEvent} from a plain message. */
  eventFromMessage(message: string, level?: Severity, hint?: SentryEventHint): Promise<SentryEvent>;

  /** Submits the event to Sentry */
  sendEvent(event: SentryEvent): Promise<SentryResponse>;

  /**
   * Receives a breadcrumb and stores it in a platform-dependent way.
   *
   * This function is invoked by the client before merging the breadcrumb into
   * the scope. Return `false` to prevent this breadcrumb from being merged.
   * This should be done for custom breadcrumb management in the backend.
   *
   * In most cases, this method does not have to perform any action and can
   * simply return `true`. It can either be synchronous or asynchronous.
   *
   * @param breadcrumb The breadcrumb to store.
   * @returns True if the breadcrumb should be merged by the client.
   */
  storeBreadcrumb(breadcrumb: Breadcrumb): boolean;

  /**
   * Receives the whole scope and stores it in a platform-dependent way.
   *
   * This function is invoked by the scope after the scope is configured.
   * This should be done for custom context management in the backend.
   *
   * @param scope The scope to store.
   */
  storeScope(scope: Scope): void;

  /**
   * Returns the internal instance of the request buffer.
   * Only used internally.
   */
  getBuffer(): RequestBuffer<SentryResponse>;
}
