# Fetch with access token refresh

A simple wrapper around the Fetch API with build in access token refresh on 401 response status

## Install

```
npm i @russh/fetch-api
```

## Usage

First create an instance of the Fwr class with a base URL and optionally a path name to refresh the access token.
```ts
const api = new FetchApi('https://example.com', '/refresh-token')
```
Then use full declaration...
```ts
const result = await api.fetch({ url: '/path', method: 'POST', body: { foo: 'bar' } })
```
...or shorthand to get fetch data

```ts
await api.get('/path')
await api.post('/path', { foo: 'bar' })
await api.patch('/path/id', { foo: 'bar' })
await api.delete('/path/id')
```
The instance is also contains fetch-api based RTK baseQuery

```ts
export const apiName = createApi({
    reducerPath: 'apiName',
    baseQuery: api.baseQuery,
    endpoints: (builder) => ({
    ...
    })
})
```
