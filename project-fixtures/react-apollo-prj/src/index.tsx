import { createRoot } from 'react-dom/client';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { createFragmentRegistry } from '@apollo/client/cache';

import { App } from './App';

import { repositoryItemRepositoryDocument } from './RepositoryItem';

function Page() {
  const client = new ApolloClient({
    cache: new InMemoryCache({
      fragments: createFragmentRegistry(repositoryItemRepositoryDocument),
    }),
  });
  return (
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Page />);
