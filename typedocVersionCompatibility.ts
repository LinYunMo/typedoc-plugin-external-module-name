import * as ts from 'typescript';
import { Context } from 'typedoc/dist/lib/converter/context';
import { CommentPlugin } from 'typedoc/dist/lib/converter/plugins';
import { Comment, ProjectReflection } from 'typedoc/dist/lib/models';
import { memoize } from 'lodash';
import { satisfies } from 'semver';
import { Reflection } from 'typedoc/dist/lib/models/reflections';
import { ReflectionKind } from 'typedoc/dist/lib/models/reflections/abstract';
import { DeclarationReflection } from 'typedoc/dist/lib/models/reflections/declaration';

const typedocVersion = require('typedoc/package.json').version;

function checkTypedocVersion(semverString: string) {
  return satisfies(typedocVersion, semverString);
}

export const isTypedocVersion = memoize(checkTypedocVersion);

// before typedoc 0.17.0, ReflectionKind.Module was ReflectionKind.ExternalModule
const ModuleKind = isTypedocVersion('< 0.17.0') ? (ReflectionKind as any).ExternalModule : ReflectionKind.Module;
// before typedoc 0.17.0, ReflectionKind.Namespace was ReflectionKind.Module
const NamespaceKind = isTypedocVersion('< 0.17.0') ? ReflectionKind.Module : (ReflectionKind as any).Namespace;

export function isModuleOrNamespace(reflection: Reflection) {
  return reflection.kindOf(ModuleKind) || reflection.kindOf(NamespaceKind);
}

export function removeTags(comment: Comment, tag: string) {
  if (isTypedocVersion('< 0.17.0')) {
    return CommentPlugin.removeTags(comment, tag);
  } else {
    comment.removeTags(tag);
  }
}

export function removeReflection(project: ProjectReflection, reflection: Reflection) {
  if (isTypedocVersion('< 0.17.0')) {
    CommentPlugin.removeReflection(project, reflection);
  } else {
    project.removeReflection(reflection, true);
  }

  if (isTypedocVersion('>=0.16.0')) {
    delete project.reflections[reflection.id];
  }
}

export function createChildReflection(parent: Reflection, name: string) {
  if (isTypedocVersion('< 0.14.0')) {
    return new (DeclarationReflection as any)(parent, name, ModuleKind);
  } else {
    return new DeclarationReflection(name, ModuleKind, parent);
  }
}

/**
 * When we delete reflections, update the symbol mapping in order to fix:
 * https://github.com/christopherthielen/typedoc-plugin-external-module-name/issues/313
 * https://github.com/christopherthielen/typedoc-plugin-external-module-name/issues/193
 */
export function updateSymbolMapping(context: Context, symbol: ts.Symbol, reflection: Reflection) {
  if (!symbol) {
    return;
  }

  if (isTypedocVersion('< 0.16.0')) {
    // (context as any).registerReflection(reflection, null, symbol);
    (context.project as any).symbolMapping[(symbol as any).id] = reflection.id;
  } else {
    // context.registerReflection(reflection, symbol);
    const fqn = context.checker.getFullyQualifiedName(symbol);
    (context.project as any).fqnToReflectionIdMap.set(fqn, reflection.id);
  }
}
