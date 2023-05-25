// Options
const defaultOptions: RequestInit = {
    credentials: 'include',
    cache: "no-cache",
    mode: "cors",
}

/**
 * A simple wrapper around the Fetch API
 * 
 * @author Rus Sharafiev
 */
export class Fwr {

    /**
     * A simple wrapper around the Fetch API with build in access token refresh on 401 response status.
     * 
     * @param   baseUrl Base URL 
     * @param   tokenSource A function that returns Promise which resolves with access token, or url path to fetch it
     * @param   options an object with `HeadersInit` and `RequestInit` without headers
     * 
     * @example
     * ``` ts
     *  const api = new Fwr('https://example.com', '/refresh-token', {
     *      headers: { Accept: 'application/json' },
     *      options: { mode: "no-cors" }
     *  }) 
     * ```
     */
    constructor(
        baseUrl: string,
        tokenSource?: (() => Promise<AccessTokenPayload>) | string,
        options?: {
            headers?: HeadersInit,
            options?: RequestInit
        }
    ) {
        this.baseUrl = baseUrl
        this.tokenSource = tokenSource ?? undefined
        this.headers = new Headers(options?.headers)
        this.options = { headers: this.headers, ...options?.options } ?? { headers: this.headers, ...defaultOptions }
    }

    private baseUrl: string
    private tokenSource: string | (() => Promise<AccessTokenPayload>) | undefined

    private headers: Headers
    private options: RequestInit

    /**
     * Use object with args to fetch query
     * 
     * @param   Object with `url` and `RequestInit` options
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    async fetch({ url, method = 'GET', body, refresh = true, ...args }: FwrArgs): Promise<unknown> {

        if (body instanceof FormData)
            this.headers.delete("Content-Type")
        else
            this.headers.set("Content-Type", "application/json")

        if (method === 'PATCH' || method === 'POST')
            args = { ...args, method, body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }

        let response = await fetch(this.baseUrl + url, { method, ...this.options, ...args })

        if (response.status === 201 || response.status === 200) {
            return response.json()
        }

        if (response.status === 401 && refresh) {
            if (this.tokenSource)
                return this.refreshToken(url, method ?? 'GET', body)
        }

        return this.error(response)
    }

    /**
     * Request interceptor with token update function
     * 
     * @param   method  Original request method
     * @param   url     Original URL
     * @param   payload Original payload
     * @returns Original request
     */
    private async refreshToken(url: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
        if (this.tokenSource) {

            let token: AccessTokenPayload | undefined = undefined

            try {
                if (typeof this.tokenSource === 'string')
                    token = await this.fetch({ url: this.tokenSource, method: 'GET', refresh: false }) as AccessTokenPayload
                else
                    token = await this.tokenSource() as AccessTokenPayload
            } catch (e) {
                throw { message: 'Failed to get token' }
            }

            if (token) {
                this.headers.set('Authorization', `Bearer ${token.accessToken}`)
                localStorage.setItem('accessToken', token.accessToken)
            }

            return this.fetch({ url, method, body, refresh: false })

        } else {
            localStorage.removeItem('accessToken')
            throw { message: 'Failed to refresh token' }
        }
    }

    /**
     * Add token from  and fingerprint to the "Authorization" header
     * Used to prepare the `Api` when the application is loaded
     */
    setAuthHeader(fingerprint?: string) {
        fingerprint && this.headers.set('Fingerprint', fingerprint)
        const accessToken = localStorage.getItem('accessToken')
        if (accessToken)
            this.headers.set('Authorization', `Bearer ${accessToken ?? ''}`)
    }

    /**
     * Delete "Authorization" header from the Api
     * Used on logout
     */
    deleteAuthHeader() {
        this.headers.delete('Authorization')
        localStorage.removeItem('accessToken')
    }

    /**
     * Error handler
     * 
     * @param   res     Responce with error
     * @returns Error object with response status and resolved error message from server
     */
    private async error(res: Response): Promise<FwrError> {
        let err = await res.json()
        throw {
            status: res.status,
            message: err.message,
            errors: err.errors
        }
    }


    // --------------- Shorthands --------------------------------------------------------------------

    /**
     * GET data from resource
     * 
     * @param   url     Resource URL
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    async get(url: string) {

        return this.fetch({ url })
    }

    /**
     * POST (add) data to resource
     * 
     * @param   url     Resource URL
     * @param   payload Body data which will be converted to a JSON string
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    async post(url: string, body: unknown) {

        return this.fetch({
            url, method: 'POST', body
        })
    }

    /**
     * PATCH (update) resource with new data
     * 
     * @param   url     Resource URL
     * @param   payload Body data which will be converted to a JSON string
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    async patch(url: string, body?: unknown) {

        return this.fetch({
            url, method: 'PATCH', body
        })
    }

    /**
     * DELETE data from resource
     * 
     * @param   url     Resource URL
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    async delete(url: string) {

        return this.fetch({
            url, method: 'DELETE'
        })
    }

    /**
     * fwr-based `baseQuery` utility
     * 
     * @param args `baseQuery` args
     * @returns `FetchBaseQueryResult`
     */
    baseQuery: BaseQueryFn<FwrArgs, unknown, FwrError> = async (args) => {
        try {
            const result = await this.fetch(args)
            return { data: result }
        } catch (e) {
            const error = e as FwrError
            return { error }
        }
    }
}

export default Fwr

// Types --------------------------------------------------------------------------

// fwr
export interface FwrError {
    status: number,
    message: string
    errors?: object
}

export interface FwrArgs {
    url: string,
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body?: unknown
    refresh?: boolean
}

interface AccessTokenPayload {
    accessToken: string
}

// baseQueryTypes
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
    type: T
}
interface ThunkDispatch<State, ExtraThunkArg, BasicAction extends Action> {
    <ReturnType>(thunkAction: ThunkAction<ReturnType, State, ExtraThunkArg, BasicAction>): ReturnType;
    <Action extends BasicAction>(action: Action): Action;
    <ReturnType, Action extends BasicAction>(action: Action | ThunkAction<ReturnType, State, ExtraThunkArg, BasicAction>): Action | ReturnType;
}
type ThunkAction<ReturnType, State, ExtraThunkArg, BasicAction extends Action> = (dispatch: ThunkDispatch<State, ExtraThunkArg, BasicAction>, getState: () => State, extraArgument: ExtraThunkArg) => ReturnType;
type MaybePromise<T> = T | PromiseLike<T>; type QueryReturnValue<T = unknown, E = unknown, M = unknown> = {
    error: E;
    data?: undefined;
    meta?: M;
} | {
    error?: undefined;
    data: T;
    meta?: M;
};
type BaseQueryFn<Args = any, Result = unknown, Error = unknown, DefinitionExtraOptions = {}, Meta = {}> = (args: Args, api: BaseQueryApi, extraOptions: DefinitionExtraOptions) => MaybePromise<QueryReturnValue<Result, Error, Meta>>