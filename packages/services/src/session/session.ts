// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IIterator } from '@lumino/algorithm';

import { JSONObject } from '@lumino/coreutils';

import { IDisposable } from '@lumino/disposable';

import { ISignal } from '@lumino/signaling';

import { Kernel, KernelMessage } from '../kernel';

import { ServerConnection } from '..';

import { DefaultSession } from './default';

/**
 * A namespace for session interfaces and factory functions.
 */
export namespace Session {
  /**
   * Interface of a session object.
   */
  export interface ISession extends IDisposable {
    /**
     * A signal emitted when the session is shut down.
     */
    terminated: ISignal<this, void>;

    /**
     * A signal emitted when the kernel changes.
     */
    kernelChanged: ISignal<this, IKernelChangedArgs>;

    /**
     * A signal emitted when the session status changes.
     */
    statusChanged: ISignal<this, Kernel.Status>;

    /**
     * A signal emitted when a session property changes.
     */
    readonly propertyChanged: ISignal<this, 'path' | 'name' | 'type'>;

    /**
     * A signal emitted for iopub kernel messages.
     */
    iopubMessage: ISignal<this, KernelMessage.IIOPubMessage>;

    /**
     * A signal emitted for unhandled kernel message.
     */
    unhandledMessage: ISignal<this, KernelMessage.IMessage>;

    /**
     * A signal emitted for any kernel message.
     *
     * Note: The behavior is undefined if the message is modified
     * during message handling. As such, it should be treated as read-only.
     */
    anyMessage: ISignal<this, Kernel.IAnyMessageArgs>;

    /**
     * Unique id of the session.
     */
    readonly id: string;

    /**
     * The current path associated with the session.
     */
    readonly path: string;

    /**
     * The current name associated with the session.
     */
    readonly name: string;

    /**
     * The type of the session.
     */
    readonly type: string;

    /**
     * The server settings of the session.
     */
    readonly serverSettings: ServerConnection.ISettings;

    /**
     * The model associated with the session.
     */
    readonly model: Session.IModel;

    /**
     * The kernel.
     *
     * #### Notes
     * This is a read-only property, and can be altered by [changeKernel].
     */
    readonly kernel: Kernel.IKernelConnection;

    /**
     * The current status of the session.
     *
     * #### Notes
     * This is a delegate to the kernel status.
     */
    readonly status: Kernel.Status;

    /**
     * Change the session path.
     *
     * @param path - The new session path.
     *
     * @returns A promise that resolves when the session has renamed.
     *
     * #### Notes
     * This uses the Jupyter REST API, and the response is validated.
     * The promise is fulfilled on a valid response and rejected otherwise.
     */
    setPath(path: string): Promise<void>;

    /**
     * Change the session name.
     */
    setName(name: string): Promise<void>;

    /**
     * Change the session type.
     */
    setType(type: string): Promise<void>;

    /**
     * Change the kernel.
     *
     * @param options - The name or id of the new kernel.
     *
     * @returns A promise that resolves with the new kernel model.
     *
     * #### Notes
     * This shuts down the existing kernel and creates a new kernel,
     * keeping the existing session ID and path.
     */
    changeKernel(
      options: Partial<Kernel.IModel>
    ): Promise<Kernel.IKernelConnection>;

    /**
     * Kill the kernel and shutdown the session.
     *
     * @returns A promise that resolves when the session is shut down.
     *
     * #### Notes
     * This uses the Jupyter REST API, and the response is validated.
     * The promise is fulfilled on a valid response and rejected otherwise.
     */
    shutdown(): Promise<void>;
  }

  /**
   * List the running sessions.
   *
   * @param settings - The server settings to use for the request.
   *
   * @returns A promise that resolves with the list of session models.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/sessions), and validates the response.
   *
   * All client-side sessions are updated with current information.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  export function listRunning(
    settings?: ServerConnection.ISettings
  ): Promise<Session.IModel[]> {
    return DefaultSession.listRunning(settings);
  }

  /**
   * Start a new session.
   *
   * @param options - The options used to start the session.
   *
   * @returns A promise that resolves with the session instance.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/sessions), and validates the response.
   *
   * A path must be provided.  If a kernel id is given, it will
   * connect to an existing kernel.  If no kernel id or name is given,
   * the server will start the default kernel type.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   *
   * Wrap the result in an Session object. The promise is fulfilled
   * when the session is created on the server, otherwise the promise is
   * rejected.
   */
  export function startNew(options: Session.IOptions): Promise<ISession> {
    return DefaultSession.startNew(options);
  }

  /**
   * Find a session by id.
   *
   * @param id - The id of the target session.
   *
   * @param settings - The server settings.
   *
   * @returns A promise that resolves with the session model.
   *
   * #### Notes
   * If the session was already started via `startNew`, the existing
   * Session object's information is used in the fulfillment value.
   *
   * Otherwise, we attempt to find to the existing session.
   * The promise is fulfilled when the session is found,
   * otherwise the promise is rejected.
   */
  export function findById(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<Session.IModel> {
    return DefaultSession.findById(id, settings);
  }

  /**
   * Find a session by path.
   *
   * @param path - The path of the target session.
   *
   * @param settings: The server settings.
   *
   * @returns A promise that resolves with the session model.
   *
   * #### Notes
   * If the session was already started via `startNewSession`, the existing
   * Session object's info is used in the fulfillment value.
   *
   * Otherwise, we attempt to find to the existing
   * session using [listRunningSessions].
   * The promise is fulfilled when the session is found,
   * otherwise the promise is rejected.
   *
   * If the session was not already started and no `options` are given,
   * the promise is rejected.
   */
  export function findByPath(
    path: string,
    settings?: ServerConnection.ISettings
  ): Promise<Session.IModel> {
    return DefaultSession.findByPath(path, settings);
  }

  /**
   * Connect to a running session.
   *
   * @param model - The model of the target session.
   *
   * @param settigns - The server settings.
   *
   * @returns The session instance.
   *
   * #### Notes
   * If the session was already started via `startNew`, the existing
   * Session object is used as the fulfillment value.
   *
   * Otherwise, we attempt to connect to the existing session.
   */
  export function connectTo(
    model: Session.IModel,
    settings?: ServerConnection.ISettings
  ): ISession {
    return DefaultSession.connectTo(model, settings);
  }

  /**
   * Shut down a session by id.
   *
   * @param id - The id of the target session.
   *
   * @param settings - The server settings.
   *
   * @returns A promise that resolves when the session is shut down.
   *
   */
  export function shutdown(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    return DefaultSession.shutdown(id, settings);
  }

  /**
   * Shut down all sessions.
   *
   * @returns A promise that resolves when all of the sessions are shut down.
   */
  export function shutdownAll(
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    return DefaultSession.shutdownAll(settings);
  }

  /**
   * The session initialization options.
   */
  export interface IOptions {
    /**
     * The path (not including name) to the session.
     */
    path: string;

    /**
     * The name of the session.
     */
    name?: string;

    /**
     * The type of the session.
     */
    type?: string;

    /**
     * The type of kernel (e.g. python3).
     */
    kernelName?: string;

    /**
     * The id of an existing kernel.
     */
    kernelId?: string;

    /**
     * The server settings.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The username of the session client.
     */
    username?: string;

    /**
     * The unique identifier for the session client.
     */
    clientId?: string;
  }

  /**
   * An arguments object for the kernel changed signal.
   */
  export interface IKernelChangedArgs {
    /**
     * The old kernel.
     */
    oldValue: Kernel.IKernelConnection | null;
    /**
     * The new kernel.
     */
    newValue: Kernel.IKernelConnection | null;
  }

  /**
   * Object which manages session instances.
   *
   * #### Notes
   * The manager is responsible for maintaining the state of running
   * sessions and the initial fetch of kernel specs.
   */
  export interface IManager extends IDisposable {
    /**
     * A signal emitted when the kernel specs change.
     */
    specsChanged: ISignal<this, Kernel.ISpecModels>;

    /**
     * A signal emitted when the running sessions change.
     */
    runningChanged: ISignal<this, IModel[]>;

    /**
     * A signal emitted when there is a connection failure.
     */
    connectionFailure: ISignal<IManager, ServerConnection.NetworkError>;

    /**
     * The server settings for the manager.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The cached kernel specs.
     *
     * #### Notes
     * This value will be null until the manager is ready.
     */
    readonly specs: Kernel.ISpecModels | null;

    /**
     * Test whether the manager is ready.
     */
    readonly isReady: boolean;

    /**
     * A promise that is fulfilled when the manager is ready.
     */
    readonly ready: Promise<void>;

    /**
     * Create an iterator over the known running sessions.
     *
     * @returns A new iterator over the running sessions.
     */
    running(): IIterator<IModel>;

    /**
     * Start a new session.
     *
     * @param options - The session options to use.
     *
     * @returns A promise that resolves with the session instance.
     *
     * #### Notes
     * The `serverSettings` of the manager will be used.
     */
    startNew(options: IOptions): Promise<ISession>;

    /**
     * Find a session by id.
     *
     * @param id - The id of the target session.
     *
     * @returns A promise that resolves with the session's model.
     */
    findById(id: string): Promise<IModel>;

    /**
     * Find a session by path.
     *
     * @param path - The path of the target session.
     *
     * @returns A promise that resolves with the session's model.
     */
    findByPath(path: string): Promise<IModel>;

    /**
     * Connect to a running session.
     *
     * @param model - The model of the target session.
     *
     * @param options - The session options to use.
     *
     * @returns The new session instance.
     */
    connectTo(model: Session.IModel): ISession;

    /**
     * Shut down a session by id.
     *
     * @param id - The id of the target kernel.
     *
     * @returns A promise that resolves when the operation is complete.
     */
    shutdown(id: string): Promise<void>;

    /**
     * Shut down all sessions.
     *
     * @returns A promise that resolves when all of the sessions are shut down.
     */
    shutdownAll(): Promise<void>;

    /**
     * Force a refresh of the specs from the server.
     *
     * @returns A promise that resolves when the specs are fetched.
     *
     * #### Notes
     * This is intended to be called only in response to a user action,
     * since the manager maintains its internal state.
     */
    refreshSpecs(): Promise<void>;

    /**
     * Force a refresh of the running sessions.
     *
     * @returns A promise that resolves when the models are refreshed.
     *
     * #### Notes
     * This is intended to be called only in response to a user action,
     * since the manager maintains its internal state.
     */
    refreshRunning(): Promise<void>;

    /**
     * Find a session associated with a path and stop it is the only session
     * using that kernel.
     *
     * @param path - The path in question.
     *
     * @returns A promise that resolves when the relevant sessions are stopped.
     */
    stopIfNeeded(path: string): Promise<void>;
  }

  /**
   * The session model used by the server.
   *
   * #### Notes
   * See the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/sessions).
   */
  export interface IModel extends JSONObject {
    /**
     * The unique identifier for the session client.
     */
    readonly id: string;
    readonly name: string;
    readonly path: string;
    readonly type: string;
    readonly kernel: Kernel.IModel;
  }
}
