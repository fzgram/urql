import {
  SelectionSetNode,
  FieldNode,
  DocumentNode,
  DefinitionNode,
  OperationDefinitionNode,
  parse,
  print,
} from 'graphql';

import { Query } from '../interfaces/index';

const TYPENAME_FIELD: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: '__typename',
  },
};

function addTypename(selectionSet: SelectionSetNode, isRoot = false) {
  if (selectionSet.selections) {
    if (!isRoot) {
      const exists = selectionSet.selections.some(selection => {
        return (
          selection.kind === 'Field' &&
          (selection as FieldNode).name.value === '__typename'
        );
      });

      if (!exists) {
        selectionSet.selections.push(TYPENAME_FIELD);
      }
    }

    selectionSet.selections.forEach(selection => {
      if (selection.kind === 'Field') {
        if (
          selection.name.value.lastIndexOf('__', 0) !== 0 &&
          selection.selectionSet
        ) {
          addTypename(selection.selectionSet);
        }
      } else if (selection.kind === 'InlineFragment') {
        if (selection.selectionSet) {
          addTypename(selection.selectionSet);
        }
      }
    });
  }
}

function addTypenameToDocument(doc: DocumentNode) {
  doc.definitions.forEach((definition: DefinitionNode) => {
    const isRoot = definition.kind === 'OperationDefinition';
    addTypename((definition as OperationDefinitionNode).selectionSet, isRoot);
  });

  return doc;
}

export function formatTypeNames(query: Query) {
  const doc = parse(query.query);
  return {
    query: print(addTypenameToDocument(doc)),
    variables: query.variables,
  };
}

export function gankTypeNamesFromResponse(response: object) {
  let typeNames = [];
  getTypeNameFromField(response, typeNames);
  return typeNames.filter((v, i, a) => a.indexOf(v) === i);
}

function getTypeNameFromField(obj: object, typenames: Array<string>) {
  Object.keys(obj).map(item => {
    if (typeof obj[item] === 'object') {
      if ('__typename' in obj[item]) {
        typenames.push(obj[item].__typename);
      }
      getTypeNameFromField(obj[item], typenames);
    }
  });
}
