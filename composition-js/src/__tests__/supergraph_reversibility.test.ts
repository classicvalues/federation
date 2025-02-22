import { assertCompositionSuccess, composeAsFed2Subgraphs } from "./testHelper";
import gql from 'graphql-tag';
import { asFed2SubgraphDocument, buildSubgraph, buildSupergraphSchema, extractSubgraphsFromSupergraph, ServiceDefinition } from "@apollo/federation-internals";
import './matchers';

function composeAndTestReversibility(subgraphs: ServiceDefinition[]) {
  const result = composeAsFed2Subgraphs(subgraphs);
  assertCompositionSuccess(result);

  const extracted = extractSubgraphsFromSupergraph(buildSupergraphSchema(result.supergraphSdl)[0]);
  for (const expectedSubgraph of subgraphs) {
    const actual = extracted.get(expectedSubgraph.name)!;
    // Note: the subgraph extracted from the supergraph are created with their `@link` on the schema definition, not as an extension (no
    // strong reason for that, it's how the code was written), so let's match that so our follwoing `toMatchSubgraph` don't fail for that.
    const expected = buildSubgraph(expectedSubgraph.name, '', asFed2SubgraphDocument(expectedSubgraph.typeDefs, { addAsSchemaExtension: false }));
    expect(actual).toMatchSubgraph(expected);
  }
}

it('preserves the source of union members', () => {
  const s1 = {
    typeDefs: gql`
      type Query {
        uFromS1: U
      }

      union U = A | B

      type A {
        a: Int
      }

      type B {
        b: Int @shareable
      }
    `,
    name: 'S1',
  };

  const s2 = {
    typeDefs: gql`
      type Query {
        uFromS2: U
      }

      union U = B | C

      type B {
        b: Int @shareable
      }

      type C {
        c: Int
      }
    `,
    name: 'S2',
  };

  composeAndTestReversibility([s1, s2]);
});

it('preserves the source of enum values', () => {
  const s1 = {
    typeDefs: gql`
      type Query {
        eFromS1: E
      }

      enum E {
        A,
        B
      }
    `,
    name: 'S1',
  };

  const s2 = {
    typeDefs: gql`
      type Query {
        eFromS2: E
      }

      enum E {
        B,
        C
      }
    `,
    name: 'S2',
  };

  composeAndTestReversibility([s1, s2]);
});
