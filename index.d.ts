/**
 * A simple wrapper around the Fetch API
 *
 * @author Rus Sharafiev
 */
export declare class FetchApi {
    /**
     * A simple wrapper around the Fetch API with build in access token refresh on 401 response status.
     *
     * @param   baseUrl Base URL
     * @param   tokenSource A function that returns Promise which resolves with access token, or url path to fetch it
     * @param   options an object with `HeadersInit` and `RequestInit` without headers
     *
     * @example
     * ``` ts
     *  const api = new FetchApi('https://example.com', '/refresh-token', {
     *      headers: { Accept: 'application/json' },
     *      options: { mode: "no-cors" }
     *  })
     * ```
     */
    constructor(baseUrl: string, tokenSource?: (() => Promise<AccessTokenPayload>) | string, options?: {
        headers?: HeadersInit;
        options?: RequestInit;
        convertToFormData: boolean;
    });
    private baseUrl;
    private tokenSource;
    private headers;
    private options;
    private convertToFormData;
    /**
     * Use object with args to fetch query
     *
     * @param   Object with `url` and `RequestInit` options
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    fetch({ url, method, body, refresh, ...args }: FetchApiArgs): Promise<unknown>;
    /**
     * Request interceptor with token update function
     *
     * @param   response    Original response (used to return original error)
     * @param   method      Original request method
     * @param   url         Original URL
     * @param   payload     Original payload
     * @returns             Original request
     */
    private refreshToken;
    /**
     * Add token from  and fingerprint to the "Authorization" header
     * Used to prepare the `Api` when the application is loaded
     */
    setAuthHeader(fingerprint?: string): void;
    /**
     * Delete "Authorization" header from the Api
     * Used on logout
     */
    deleteAuthHeader(): void;
    /**
     * Error handler
     *
     * @param   res     Responce with error
     * @returns Error object with response status and resolved error message from server
     */
    private error;
    /**
     * Method converts JSON object with files to `FormData` with files and `serialized-json` field with the rest object
     *
     * @param data JSON object
     * @returns FormData
     */
    private toFormData;
    /**
     * GET data from resource
     *
     * @param   url     Resource URL
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    get(url: string): Promise<unknown>;
    /**
     * POST (add) data to resource
     *
     * @param   url     Resource URL
     * @param   payload Body data which will be converted to a JSON string
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    post(url: string, body: unknown): Promise<unknown>;
    /**
     * PATCH (update) resource with new data
     *
     * @param   url     Resource URL
     * @param   payload Body data which will be converted to a JSON string
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    patch(url: string, body?: unknown): Promise<unknown>;
    /**
     * DELETE data from resource
     *
     * @param   url     Resource URL
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    delete(url: string): Promise<unknown>;
    /**
     * FetchApi-based `baseQuery` utility
     *
     * @param args `baseQuery` args
     * @returns `FetchBaseQueryResult`
     */
    baseQuery: BaseQueryFn<FetchApiArgs, unknown, FetchApiError>;
}
export default FetchApi;
export interface FetchApiError {
    status: number;
    message: string;
    errors?: object;
}
export interface FetchApiArgs {
    url: string;
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    refresh?: boolean;
}
interface AccessTokenPayload {
    accessToken: string;
}
interface BaseQueryApi {
    signal: AbortSignal;
    abort: (reason?: string) => void;
    dispatch: ThunkDispatch<any, any, any>;
    getState: () => unknown;
    extra: unknown;
    endpoint: string;
    type: 'query' | 'mutation';
    forced?: boolean;
}
interface Action<T = any> {
    type: T;
}
interface ThunkDispatch<State, ExtraThunkArg, BasicAction extends Action> {
    <ReturnType>(thunkAction: ThunkAction<ReturnType, State, ExtraThunkArg, BasicAction>): ReturnType;
    <Action extends BasicAction>(action: Action): Action;
    <ReturnType, Action extends BasicAction>(action: Action | ThunkAction<ReturnType, State, ExtraThunkArg, BasicAction>): Action | ReturnType;
}
type ThunkAction<ReturnType, State, ExtraThunkArg, BasicAction extends Action> = (dispatch: ThunkDispatch<State, ExtraThunkArg, BasicAction>, getState: () => State, extraArgument: ExtraThunkArg) => ReturnType;
type MaybePromise<T> = T | PromiseLike<T>;
type QueryReturnValue<T = unknown, E = unknown, M = unknown> = {
    error: E;
    data?: undefined;
    meta?: M;
} | {
    error?: undefined;
    data: T;
    meta?: M;
};
type BaseQueryFn<Args = any, Result = unknown, Error = unknown, DefinitionExtraOptions = {}, Meta = {}> = (args: Args, api: BaseQueryApi, extraOptions: DefinitionExtraOptions) => MaybePromise<QueryReturnValue<Result, Error, Meta>>;
