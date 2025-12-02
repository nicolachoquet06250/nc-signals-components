import type { Plugin } from 'vite';
import { parse } from '@babel/parser';
import trav from '@babel/traverse';
import { generate } from '@babel/generator';
import * as t from '@babel/types';

export interface AutoComponentsOptions {
    /**
     * Chemin du module qui exporte `defineComponent`
     * relatif au fichier transformé.
     * Exemple: "./components"
     */
    componentsModule?: string;
}

export const autoComponentsPlugin = (
    options: AutoComponentsOptions = {},
): Plugin => ({
    name: 'vite-plugin-auto-components',
    enforce: 'pre',

    transform(code, id) {
        // Ne traiter que les fichiers au format ".ts"
        if (!id.endsWith('.ts')) return null;
        // on évite de transformer le fichier des composants lui-même
        if (id.includes('components.ts')) return null;

        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['typescript'],
        });
        // console.log(id, ast)

        let changed = false;
        let hasDefineImport = false;
        // Module cible pour importer defineComponent. On part des options,
        // mais si on voit un import de {html} on réutilise son module.
        let targetComponentsModule = options.componentsModule ?? './components';

        // 1. vérifier s'il y a déjà un import defineComponent
        // @ts-ignore
        const traverse = trav.default;
        traverse(ast, {
            ImportDeclaration(path: any) {
                const source = path.node.source.value as string;

                // S'il y a un import de { html }, mémorise ce module comme cible
                const hasHtml = path.node.specifiers.some(
                    (s: any) => t.isImportSpecifier(s) && t.isIdentifier(s.imported, { name: 'html' }),
                );
                if (hasHtml) {
                    targetComponentsModule = source;
                }

                // Si defineComponent est déjà importé, on le note
                const hasDefine = path.node.specifiers.some(
                    (s: any) => t.isImportSpecifier(s) && t.isIdentifier(s.imported, { name: 'defineComponent' }),
                );
                if (hasDefine) hasDefineImport = true;
            },
        });

        traverse(ast, {
            // Forme supportée unique:
            // A) export function Foo(...) { return html`...`; }
            ExportNamedDeclaration(path: any) {
                const decl = path.node.declaration;
                if (!decl || !t.isFunctionDeclaration(decl) || !decl.id) return;

                const originalName = decl.id.name;
                if (!/^[A-Z]/.test(originalName)) return; // composant = nom qui commence par maj

                // Helpers de détection
                const isHtmlTagged = (n: any) =>
                    t.isTaggedTemplateExpression(n) && t.isIdentifier(n.tag, { name: 'html' });

                const fnReturnsHtmlDirect = () => {
                    let direct = false;
                    path.traverse({
                        ReturnStatement(rPath: any) {
                            const arg = rPath.node.argument;
                            if (isHtmlTagged(arg)) direct = true;
                        },
                    });
                    return direct;
                };

                const usesDirectHtml = fnReturnsHtmlDirect();
                if (!usesDirectHtml) return;

                changed = true;

                if (usesDirectHtml) {
                    const viewName = `${originalName}View`;
                    // 1) on renomme la fonction originale -> FooView
                    decl.id = t.identifier(viewName);
                    // 2) crée: export const Foo = defineComponent((...args) => FooView(...args));
                    //    Utilisation d'un rest parameter pour éviter les erreurs Babel
                    //    lorsque les paramètres originaux sont des patterns (ObjectPattern, ArrayPattern).
                    const restId = t.identifier('args');
                    const wrapperComponent = t.exportNamedDeclaration(
                        t.variableDeclaration('const', [
                            t.variableDeclarator(
                                t.identifier(originalName),
                                t.callExpression(t.identifier('defineComponent'), [
                                    t.arrowFunctionExpression(
                                        [t.restElement(restId)],
                                        t.callExpression(
                                            t.identifier(viewName),
                                            [t.spreadElement(restId)]
                                        ),
                                    ),
                                ]),
                            ),
                        ]),
                        [],
                    );
                    path.replaceWithMultiple([decl, wrapperComponent]);
                    return;
                }
            },
        });

        // 2. si on a ajouté des components, s'assurer qu'on importe defineComponent
        if (changed && !hasDefineImport) {
            const importDecl = t.importDeclaration(
                [t.importSpecifier(t.identifier('defineComponent'), t.identifier('defineComponent'))],
                t.stringLiteral(targetComponentsModule),
            );
            (ast.program.body as any).unshift(importDecl);
        }

        if (!changed) return null;

        const out = generate(ast, { decoratorsBeforeExport: true }, code);
        return {
            code: out.code,
            map: out.map,
        };
    },
})
