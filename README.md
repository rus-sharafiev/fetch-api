# Fetch with access token refresh

A simple wrapper around the Fetch API with build in access token refresh on 401 response status

## Usage

First create an instance of the Fwr class with a base URL and optionally a path name to refresh the access token.
```ts
const api = new Fwr('https://example.com', '/refresh-token')
```
Then use full declaration...
```ts
const result = await api.fetch({ url: '/foo', method: 'POST', body: { foo: 'bar' } })
```
...or shorthand to get fetch data

```ts
await api.get('/foo')
await api.post('/foo', { foo: 'bar' })
await api.patch('/foo/bar', { foo: 'bar' })
await api.delete('/foo/bar')
```
The instance is also contains fwr-based RTK baseQuery

```ts
export const apiFoo = createApi({
    reducerPath: 'apiFoo',
    baseQuery: api.baseQuery,
    endpoints: (builder) => ({
    ...
    })
})
```
