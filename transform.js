"use strict";
const thirdPartyModules = require("./lib/thirdPartyModules").default;
const importSortFunc = require("./lib/importSort").default;
const jscodeshift = require("jscodeshift");
const rootSection = require("./lib/root");

function createImportStatement(moduleName, variableName, propName, kind) {
  let declaration;

  const variableIds = variableName.map(function(v) {
    return jscodeshift.importSpecifier(
      jscodeshift.identifier(v.imported),
      jscodeshift.identifier(v.local)
    );
  });

  if (propName) {
    const namespace = propName.namespace;
    const name = propName.name;
    let identifier;
    if (name) {
      identifier = jscodeshift.identifier(name);
      variableIds.unshift(
        jscodeshift.importDefaultSpecifier(identifier, identifier)
      );
    } else if (namespace) {
      identifier = jscodeshift.identifier(namespace);
      variableIds.unshift(
        jscodeshift.importNamespaceSpecifier(identifier, identifier)
      );
    }
  }

  declaration = jscodeshift.importDeclaration(
    variableIds,
    jscodeshift.literal(moduleName)
  );
  declaration.importKind = kind;

  return declaration;
}

const getSource = (key, path) => {
  if (key.includes('..') && path.startsWith('src/redux-app/')) {
    const pathArr = path.replace('src/', '').split('/')
    pathArr.pop()
    const keyArray = key.split('/')
    while(keyArray[0] === '..') {
      keyArray.shift()
      pathArr.pop()
    }
    if (keyArray[0] === 'shared') {
      keyArray.shift()
    }
    key = [...pathArr,...keyArray].join('/')
  }
  return key
}

module.exports = function(file, api) {
  console.log(file.path)
  const j = api.jscodeshift;
  const root = j(file.source);
  const imports = root.find(j.ImportDeclaration);

  // No imports, leave as is
  if (imports.size() === 0) {
    return file.source;
  }

  // Load all imports
  // Object is separated by type
  const newImports = {};

  imports.forEach(i => {
    const node = i.node;
    const source = getSource(node.source.value, file.path);
    const kind = node.importKind || "value";

    if (!newImports[kind]) {
      newImports[kind] = {};
    }

    if (!newImports[kind][source]) {
      newImports[kind][source] = {
        default: null,
        specifiers: []
      };
    }

    node.specifiers.forEach(specifier => {
      if (specifier.type === "ImportDefaultSpecifier") {
        newImports[kind][source].default = {
          name: specifier.local.name
        };
      } else if (specifier.type === "ImportNamespaceSpecifier") {
        newImports[kind][source].default = {
          namespace: specifier.local.name
        };
      } else {
        // Check the specifier has not all ready been placed in
        let found = false;
        newImports[kind][source].specifiers.forEach(spec => {
          if (spec.local === specifier.local.name) {
            found = true;
          }
          if (spec.imported === specifier.imported.name) {
            found = true;
          }
        });

        if (!found) {
          newImports[kind][source].specifiers.push({
            local: specifier.local.name,
            imported: specifier.imported.name
          });
        }
      }
    });
  });

  let outputImports = [];
  outputImports = outputImports.concat(
    createOutputImports(newImports["type"], "type", file.path)
  );
  outputImports = outputImports.concat(
    createOutputImports(newImports["value"], "value", file.path)
  );

  const comments = root.find(j.Program).get("body", 0).node.comments;
  root.find(j.ImportDeclaration).remove();
  outputImports.forEach(x => {
    const body = root.get().value.program.body;
    body.unshift(x);
  });

  root.get().node.comments = comments;
  let source = root.toSource({ quote: "single" });
  source = source.replace(/\/\/\$\$BLANK_LINE\n\n/g, "//$$$BLANK_LINE\n");
  return source.replace(/\/\/\$\$BLANK_LINE/g, "");
};

function createOutputImports(newImports, kind, path) {
  if (!newImports) {
    return [];
  }

  const thirdPartyImports = {};
  const rootImport = {}
  const firstPartyImports = {};
  const localImports = {};

  const outputImports = [];

  Object.keys(newImports).forEach(key => {
    const baseKey = key.split("/")[0];
    if (thirdPartyModules.indexOf(baseKey) > -1) {
      thirdPartyImports[key] = newImports[key];
    } else if (key.startsWith(".")) {
      localImports[key] = newImports[key];
    } else if(rootSection.check(key)) {
      rootImport[key] = newImports[key];
    } else {
      firstPartyImports[key] = newImports[key];
    }
  });

  const thirdKeys = Object.keys(thirdPartyImports)
    .sort(importSortFunc)
    .reverse();
  const rootKeys = Object.keys(rootImport)
    .sort(rootSection.sort)
    .reverse();
  const firstKeys = Object.keys(firstPartyImports)
    .sort(importSortFunc)
    .reverse();
  const localKeys = Object.keys(localImports)
    .sort(importSortFunc)
    .reverse();

  const blankLine = "//$$BLANK_LINE";

  function pushImports(keys) {
    if (keys.length > 0) {
      outputImports.push(blankLine);
    }

    keys.forEach(key => {
      outputImports.push(
        createImportStatement(
          key,
          newImports[key].specifiers.sort((a, b) =>
            a.imported.localeCompare(b.imported)
          ),
          newImports[key].default,
          kind
        )
      );
    });
  }

  pushImports(localKeys);
  pushImports(firstKeys);
  pushImports(rootKeys);
  pushImports(thirdKeys);

  return outputImports;
}
