# urql

Universal React Query Library

[![Build Status](https://travis-ci.org/FormidableLabs/urql.svg?branch=master)](https://travis-ci.org/FormidableLabs/urql) [![Build status](https://ci.appveyor.com/api/projects/status/01arsdnaxm28ogwg?svg=true)](https://ci.appveyor.com/project/kenwheeler/urql)
[![Coverage Status](https://coveralls.io/repos/github/FormidableLabs/urql/badge.svg?branch=master)](https://coveralls.io/github/FormidableLabs/urql?branch=master) [![npm](https://img.shields.io/npm/v/urql.svg)]() [![npm](https://img.shields.io/npm/l/urql.svg)]()

![Urkel](https://images-production.global.ssl.fastly.net/uploads/posts/image/97733/jaleel-white-steve-urkel.jpg)

## What is `urql`

`urql` is a GraphQL client, exposed as a set of ReactJS components.

## Why this exists

In my experience, existing solutions have been a bit heavy on the API side of things, and I see people getting discouraged or turned away from the magic that is GraphQL. This library aims to make GraphQL on the client side as simple as possible.

## How its different

### React

`urql` is specifically for React. There have been no efforts made to abstract the core in order to work with other libaries. Usage with React was a priority from the get go, and it has been architected as such.

### Render Props

`urql` exposes its API via render props. Recent discussion has shown render props to be an extraordinarily flexible and appropriate API decision for libraries targeting React.

### Caching

`urql` takes a unique approach to caching. Many existing solutions normalize your data and parse your queries to try to invalidate cached data. I am not smart enough to implement this solution, and further, normalizing everything, on big datasets, can potentially lead to performance/memory issues.

`urql` takes a different approach. It takes your query signature and creates a hash, which it uses to cache the results of your query. It also adds `__typename` fields to both queries and mutations, and by default, will invalidate a cached query if it contains a type changed by a mutation. Further, handing control back to the users, it exposes a `shouldInvalidate` prop, which is a function that can be used to determine whether the cache is invalid based upon typenames, mutation response and your current data.

## Install

`npm install urql --save`

## Getting Started

The core of `urql` is three exports, `Provider`, `Connect` and `Client`. To get started, you simply create a `Client` instance, pass it to a `Provider` and then wrap any components you want to make queries or fire mutation from with a `Connect` component. We also provide a `ConnectHOC` higher order component, if you're one of those dorks that doesn't enjoy the absolutely amazing explicit nature of render props.

Lets look at a root level component and how you can get it set up:

```jsx
import React from 'react';
import ReactDOM from 'react-dom';

import { Provider, Client } from 'urql';
import Home from './home';

const client = new Client({
  url: 'http://localhost:3001/graphql',
});

export const App = () => (
  <Provider client={client}>
    <Home />
  </Provider>
);

ReactDOM.render(<App />, document.getElementById('root'));
```

As you can see above, all that's required to get started is the `url` field on `Client` which tells us where your GraphQL API lives. After the client is created, and passed to the `Provider` that wraps your app, now you can wrap any component down in the tree with a `Connect` to start issuing queries.

Queries and mutations both have creation functions, which you can import. An `urql` `Connect` component can take multiple queries, and multiple mutations. The `render` prop exposes the internal logic to any component you`d like to provide it to.

Lets start by defining a query and a mutation:

```javascript
const TodoQuery = `
query {
  todos {
    id
    text
  }
}
`;
```

## HOLD UP FAM THIS IS IMPORTANT

It is absolutely necessary if you want this library to work properly, to create a valid mutation response. If you change a todo, return it. If you delete a todo, return it. If you add a todo, return it. If you don't return the thing that changed and file an issue, I'm going to screenshot this paragraph, paste it into the issue, and then drop my finger from a 3ft height onto the close button while making plane crash sounds.

```javascript
const AddTodo = `
mutation($text: String!) {
  addTodo(text: $text) {
    id
    text
  }
}
`;
```

Now we can use the `mutation` and `query` functions to format them in the way `urql` expects.

```javascript
const Home = () => (
  <Connect
    query={query(TodoQuery)}
    mutation={{
      addTodo: mutation(AddTodo),
    }}
    render={({ loaded, fetching, refetch, data, error, addTodo }) => {
      //...Your Component
    }}
  />
);
```

The render prop sends a couple of fields back by default:

* `loaded` - This is like `loading` but its false by default, and becomes true after the first time your query loads. This makes initial loading states easy and reduces flicker on subsequent fetch/refetches.
* `fetching` - This is what you might commonly think of as `loading`. Any time a query or mutation is taking place, this puppy equals true, resolving to false when complete.
* `refetch` - This is a method that you can use to manually refetch your query, skipping and repopulating the cache.
* `data` - This is where your data lives. Once the query returns, This would look like `{ todos: [...] }`.
* `error` - If there is an error returned when making the query, instead of data, you get this and you can handle it or show a `refetch` button or cry or whatever you wanna do.

Also, any mutations, because they are named, are also passed into this render prop.

As you can see above, the `query` accepts either a single query, or an array of queries. The `mutation` prop accepts an object, with the mutation names as keys.

So why do we use these `query` and `mutation` functions before passing them? Variables, thats why. If you wanted to pass a query with variables, you would construct it like so:

```javascript
import { query } from 'urql';

query(TodoQuery, { myVariable: 5 });
```

Similarly, you can pass variables to your mutation. Mutation, however is a bit different, in the sense that it returns a function that you can call with a variable set:

```javascript
import { mutation } from 'urql';

mutation(AddTodo); // No initial variables

// After you pass 'addTodo' from the render prop to a component:

addTodo({ text: `I'm a variable!` });
```

## Cache control

Normally in `urql`, the cache is aggressively invalidated based upon `__typename`, but if you want finer grained control over your cache, you can use the `shouldInvalidate` prop. It is a function, that returns boolean, much like `shouldComponentUpdate`, which you can use to determine whether your data needs a refresh from the server. It gets called after every mutation:

```javascript
const MyComponent = () => (
  <Connect
    query={query(MyQuery)}
    shouldInvalidate={(changedTypenames, typenames, mutationResponse, data) => {
      return data.todos.some(d => d.id === mutationResponse.id);
    }}
    render={({ loaded, fetching, refetch, data, error, addTodo }) => {
      //...Your Component
    }}
  />
);
```

The signature of `shouldComponentUpdate` is basically:

* `changedTypenames` - The typenames returned from the mutation. ex: `['Todo']`
* `typenames` - The typenames that are included in your `Connect` component. ex: `['Todo', 'User', 'Author']`
* `response` - The actual data returned from the mutation. ex: `{ id: 123 }`
* `data` - The data that is local to your `Connect` component as a result of a query. ex: `{ todos: [] }`

Using all or some of these arguments can give you the power to pretty accurately describe whether your connection has now been invalidated.

## API

### `Client({url: string, fetchOptions?: object | () => object})`

Client is the constructor for your GraphQL client. It takes a configuration object as an argument, which is required. Providing a GraphQL api url via the `url` property is required. `fetchOptions` are the options provided to internal `fetch` calls, which can either be in `object` format, or a `function` that returns an `object`, in case you want to provide a dynamic header for a token or something.

Example:

```javascript
const client = new Client({ url: 'http://localhost:3000/graphql' });
```

### `<Provider client={UrqlClientInstance}/>`

Provider is a ReactJS component that is used to provide the `urql` client throughout your application.

Example:

```javascript
const client = new Client({ url: 'http://localhost:3000/graphql' });
//...
return (
  <Provider client={client}>
    <YourApp />
  </Provider>
);
```

### `<Connect />`

Connect is a ReactJS component that is used to execute queries and mutations and render child components with the results, using a render prop.

#### Props

| Name             | Value                                                                        | Default    | Description                                                                    |
| ---------------- | ---------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| query            | `QueryObject or [QueryObject]`                                               | `null`     | The query/queries you want connected to your component                         |
| mutation         | `MutationMap`                                                                | `null`     | The mutation/mutations you want connected to your component                    |
| cache            | `boolean`                                                                    | `true`     | Whether this component's queries should be cached                              |
| typeInvalidation | `boolean`                                                                    | `true`     | Whether this component's cache should be invalidated using typeNames           |
| shouldInvalidate | `(changedTypes, componentTypes, mutationResponse, componentData) => boolean` | `null`     | Function used to determine whether the component's cache should be invalidated |
| render           | `({RenderArgs})`                                                             | RenderArgs | Render prop used to render children                                            |

#### Render Args

The following fields are present on the render functions argument object:

| Name     | Value      | Default    | Description                                                     |
| -------- | ---------- | ---------- | --------------------------------------------------------------- |
| fetching | `boolean`  | `false`    | Fetching is true during any pending query or mutation operation |
| loaded   | `boolean`  | `false`    | Becomes true once the component gets data for the first time.   |
| error    | `object`   | `null`     | Any errors thrown during a query or mutation                    |
| data     | `object`   | `null`     | Any data returned as the result of a query                      |
| refetch  | `function` | `function` | Function used to refetch existing queries from the server       |

In addition to these, any specified mutations are also provided as their key in the mutation map. Mutations are functions that accept an object of variables as an argument.

Example:

```jsx
<Connect
  query={query(MyQuery)}
  render={({loaded, data}) => {
    return loaded ? <Loading/> : <List data={data.todos}>
  }}
/>

// with mutations

<Connect
  mutation={{
    addTodo: mutation(AddTodo)
  }}
  render={({ addTodo }) => {
    return <button type="button" onClick={addTodo}>Add Todo</button>
  }}
/>
```

### `ConnectHOC(options: object | (props) => object)(Component)`

ConnectHOC is a higher order component that essentially does the same thing as the `Connect` component. All of `Connect`'s props except for `render` are valid for the `options` object. Further, you can specify a function, which will provide the component's props and return a dynamic option set. The arguments you'd see in the `render` prop in `Connect` are passed automatically to the wrapped component.

Example:

```javascript
export default ConnectHOC({
  query: query(TodoQuery)
})(MyComponent);

// or

export default ConnectHOC((props) => {
  query: query(TodoQuery, { id: props.id })
})(MyComponent);
```

### `query(query: string, variables?: object) => {query: string, variables: object}`

`query` is a QueryObject creator.

Example:

```javascript
query(
  `
query($id: ID!) {
  todos(id: $id) {
    text
  }
}`,
  { id: 5 }
);
```

### `mutation(query: string, variables?: object) => {query: string, variables: object}`

`query` is a MutationObject creator.

Example:

```javascript
mutation(
  `
mutation($id: ID!) {
  addTodo(id: $id) {
    text
  }
}`,
  { id: 5 }
);
```

## TODO

* [ ] Server Side Rendering
* [ ] Client Side Resolvers
* [ ] External cache hooks
* [ ] Invalidation hooks
* [ ] Cache updates without server
* [ ] Fix Lint
* [ ] Prefix all errors with "Did I do that?"

## Prior Art

### Apollo
