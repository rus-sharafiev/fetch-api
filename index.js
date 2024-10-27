// Options
const defaultOptions = {
    credentials: 'include',
    cache: "no-cache",
    mode: "cors",
};
/**
 * A simple wrapper around the Fetch API
 *
 * @author Rus Sharafiev
 */
export class FetchApi {
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
     *      options: { mode: "no-cors" },
     *      convertToFormData: true
     *  })
     * ```
     */
    constructor(baseUrl, tokenSource, options) {
        if (typeof baseUrl === 'string') {
            this.baseUrl = baseUrl;
            this.tokenSource = tokenSource ?? undefined;
            this.headers = new Headers(options?.headers);
            this.options = options?.options
                ? { headers: this.headers, ...options?.options }
                : { headers: this.headers, ...defaultOptions };
            this.convertToFormData = !!options && 'convertToFormData' in options ? !!options.convertToFormData : false;
        }
        else if (baseUrl) {
            const { baseUrl: url = '/', headers, options, tokenSource, convertToFormData } = baseUrl;
            this.baseUrl = url;
            this.tokenSource = tokenSource ?? undefined;
            this.headers = new Headers(headers);
            this.options = options
                ? { headers: this.headers, ...options }
                : { headers: this.headers, ...defaultOptions };
            this.convertToFormData = convertToFormData ?? false;
        }
        else {
            this.baseUrl = '/';
            this.convertToFormData = false;
            this.headers = new Headers();
            this.options = { headers: this.headers, ...defaultOptions };
        }
    }
    baseUrl;
    tokenSource;
    headers;
    options;
    convertToFormData;
    /**
     * Use object with args to fetch query
     *
     * @param   Object with `url` and `RequestInit` options
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    async fetch({ url, method = 'GET', body, refresh = true, ...args }) {
        // Remove Content-Type header and skip FormData converter if body is FormData
        if (body instanceof FormData)
            this.headers.delete("Content-Type");
        else {
            if (body && this.convertToFormData) {
                // Check whether body has files or file list and convert to formdata if it has 
                const data = body;
                const hasFile = Object.values(data).find(el => el instanceof File || el instanceof FileList);
                if (hasFile) {
                    body = this.toFormData(data);
                    this.headers.delete("Content-Type");
                }
                else {
                    this.headers.set("Content-Type", "application/json");
                }
            }
            else
                this.headers.set("Content-Type", "application/json");
        }
        if (method === 'PATCH' || method === 'POST')
            args = { ...args, method, body: body instanceof FormData ? body : JSON.stringify(body ?? {}) };
        let response = await fetch(this.baseUrl + url, { method, ...this.options, ...args });
        if (response.status === 201 || response.status === 200) {
            return response.json();
        }
        if (response.status === 401 && refresh) {
            return this.refreshToken(response, url, method ?? 'GET', body);
        }
        return this.error(response);
    }
    /**
     * Request interceptor with token update function
     *
     * @param   response    Original response (used to return original error)
     * @param   method      Original request method
     * @param   url         Original URL
     * @param   payload     Original payload
     * @returns             Original request
     */
    async refreshToken(response, url, method, body) {
        if (this.tokenSource) {
            let token = undefined;
            try {
                if (typeof this.tokenSource === 'string')
                    token = await this.fetch({ url: this.tokenSource, method: 'GET', refresh: false });
                else
                    token = await this.tokenSource();
            }
            catch (e) {
                return this.error(response);
            }
            if (token) {
                this.headers.set('Authorization', `Bearer ${token.accessToken}`);
                localStorage.setItem('accessToken', token.accessToken);
            }
            return this.fetch({ url, method, body, refresh: false });
        }
        else {
            localStorage.removeItem('accessToken');
            return this.error(response);
        }
    }
    /**
     * Add token and fingerprint to the "Authorization" header
     * Used to prepare the `Api` when the application is loaded
     */
    setAuthHeader(fingerprint) {
        fingerprint && this.headers.set('Fingerprint', fingerprint);
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken)
            this.headers.set('Authorization', `Bearer ${accessToken ?? ''}`);
    }
    /**
     * Delete "Authorization" header from the Api
     * Used on logout
     */
    deleteAuthHeader() {
        this.headers.delete('Authorization');
        localStorage.removeItem('accessToken');
    }
    /**
     * Error handler
     *
     * @param   res     Responce with error
     * @returns Error object with response status and resolved error message from server
     */
    async error(res) {
        let err = await res.json();
        throw {
            status: res.status,
            message: err.message,
            fields: err.fields
        };
    }
    /**
     * Method converts JSON object with files to `FormData` with files and `serialized-json` field with the rest object
     *
     * @param data JSON object
     * @returns FormData
     */
    toFormData(data) {
        const formDataWithFiles = new FormData();
        let jsonData = {};
        for (const key in data) {
            if (data[key] instanceof File) {
                formDataWithFiles.append(key, data[key]);
            }
            else if (data[key] instanceof FileList) {
                const fileList = data[key];
                Array.from(fileList).forEach((file) => formDataWithFiles.append(key, file));
            }
            else if (data[key] instanceof Array) {
                const arr = data[key];
                const hasFile = arr.find(el => el instanceof File);
                if (hasFile)
                    arr.forEach((file) => formDataWithFiles.append(key, file));
                else
                    jsonData = { ...jsonData, [key]: data[key] };
            }
            else {
                jsonData = { ...jsonData, [key]: data[key] };
            }
        }
        const formData = new FormData();
        formData.append('serialized-json', JSON.stringify(jsonData));
        formDataWithFiles.forEach((value, key) => formData.append(key, value));
        return formData;
    }
    // --------------- Shorthands --------------------------------------------------------------------
    /**
     * GET data from resource
     *
     * @param   url     Resource URL
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    async get(url) {
        return this.fetch({ url });
    }
    /**
     * POST (add) data to resource
     *
     * @param   url     Resource URL
     * @param   payload Body data which will be converted to a JSON string
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    async post(url, body) {
        return this.fetch({
            url, method: 'POST', body
        });
    }
    /**
     * PATCH (update) resource with new data
     *
     * @param   url     Resource URL
     * @param   payload Body data which will be converted to a JSON string
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    async patch(url, body) {
        return this.fetch({
            url, method: 'PATCH', body
        });
    }
    /**
     * DELETE data from resource
     *
     * @param   url     Resource URL
     * @returns Promise which resolves with the result of parsing the body text as JSON
     */
    async delete(url) {
        return this.fetch({
            url, method: 'DELETE'
        });
    }
    // --------------- RTK baseQuery -----------------------------------------------------------------
    /**
     * FetchApi-based `baseQuery` utility
     *
     * @param args `baseQuery` args
     * @returns `FetchBaseQueryResult`
     */
    baseQuery = async (args) => {
        try {
            const result = await this.fetch(args);
            return { data: result };
        }
        catch (e) {
            const error = e;
            return { error };
        }
    };
}
export default FetchApi;
