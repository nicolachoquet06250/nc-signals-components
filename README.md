# nc-signals-components [![npm](https://github.com/nicolachoquet06250/nc-signals-components/actions/workflows/npm-package-deploy.yml/badge.svg)](https://github.com/nicolachoquet06250/nc-signals-components/actions/workflows/npm-package-deploy.yml)

Librairie en TypeScript proposant :

- Une lib de composants « vanilla » basée sur un tag template `html`, avec SSR, hydratation et montage côté client.
- Une lib de réactivité par signaux (signals) légère: `signal`, `computed`, `watchEffect`, `watch`, `watchOnce`.
- Un plugin Vite qui transforme automatiquement vos fonctions exportées en « composants » à partir des fichiers `*.ts`.

---

## Sommaire

- Présentation
- Installation & scripts
- Démarrage rapide
- Convention des composants
- Rendu client/serveur
- Documentation détaillée

---

## Présentation

Le rendu se fait via un DSL minimal `html` qui produit des `View` (fonctions `() => VNode`). Les composants sont des fonctions `(props) => View`. Le plugin Vite se charge d’enrober automatiquement vos fonctions exportées en composants utilisables.

La réactivité est fournie par une petite lib de signaux, inspirée des approches modernes: un signal est une fonction lisible/écrivable, et des valeurs dérivées peuvent être exprimées via `computed`.

---

## Installation via npm

Prérequis: Node 18+ recommandé.

```bash
# initialisation du projet
npm create vite@latest my-app --template vanilla-ts && cd my-app

# installation de la lib
npm i nc-signals-components

# lancer le serveur de développement
npm run dev
```

## Utilisation directement dans un module sans build
```js
import lib from 'https://cdn.jsdelivr.net/npm/nc-signals-components/+esm';

// votre code ici
```

## Utilisation dans le navigateur
```js
import('https://cdn.jsdelivr.net/npm/nc-signals-components/+esm').then(lib => {
    // votre code ici
})
```

## Démarrage rapide

### Rendu côté client

1) `src/main.ts`
    ```ts
    import {mount} from "nc-signals-components";
    import {App} from "./components/app";
    
    mount(App(), document.querySelector("#app")!)
    ```
2) Avec le plugin vite `autoComponentsPlugin`
   1) `src/components/app.ts`
    ```ts
    import {html} from "nc-signals-components";
    
    export const App = () => html`<main>Hello World!</main>`;
    ```
3) Sans le plugin vite `autoComponentsPlugin`
   1) `src/components/app.ts`
   ```ts
    import {html, defineComponent} from "nc-signals-components"; 

    export const App = defineComponent(() => html`<main>Hello World!</main>`);
    ```
   
### Rendu côté serveur

1) `src/entry-server.ts`
    ```ts
    import {renderToString} from 'nc-signals-components';
    import {App} from './components/app';
    
    export const render = () => renderToString(App, {client: false});
    ```
2) `src/entry-client.ts`
   ```ts
    import './style.css'
    import {hydrate} from 'nc-signals-components';
    import {App} from "./components/app";
    
    hydrate(App({client: false}), document.querySelector('#app')!);
    ```
3) `src/server.js`
    ```js
    import express from 'express';
    import { createServer as createViteServer } from 'vite';
    import fs from 'node:fs';
    import path from 'node:path';
    
    (async function createServer() {
        const app = express();
    
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom',
        });
    
        app.use(vite.middlewares);
    
        app.use(express.static(path.resolve("dist")));
    
        app.get('/', async (_req, res) => {
            try {
                const {render} = await vite.ssrLoadModule('/src/entry-server.ts')
                const appHtml = render();
    
                const manifest = JSON.parse(fs.readFileSync('./dist/.vite/manifest.json', 'utf-8'));
    
                const mainScript = manifest['src/entry-client.ts'];
    
                const mainPath = mainScript.file;
                const stylePaths = mainScript.css;
    
                const html = `
                <!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta charset="UTF-8" />
                    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>SSR + Hydrate Signals</title>
                    ${stylePaths.map(path => `<link rel="stylesheet" href="${path}">`).join('\n')}
                  </head>
                  <body>
                    <div id="app">${appHtml}</div>
                    <script async src="${mainPath}"></script>
                  </body>
                </html>`;
    
                res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
            } catch (e) {
                vite.ssrFixStacktrace(e);
                console.error(e);
                res.status(500).end(e.message);
            }
        });
    
        app.listen(5173, () => {
            console.log('🚀 SSR server running at http://localhost:5173');
        });
    })();

   ```

4) `vite.config.ts`
    ```ts
    import {defineConfig} from 'vite';
    import {autoComponentsPlugin} from 'nc-signals-components/vite';
    
    // https://vitejs.dev/config/
    export default defineConfig({
        build: {
            manifest: true,
            rolldownOptions: {
                input: "src/entry-client.ts",
            },
        }
    });
   ```

Le plugin Vite transformera automatiquement `App.ts` pour générer un composant exporté compatible avec `defineComponent` si besoin.

---

## Convention des composants

1) Avec le plugin vite `autoComponentsPlugin`
    > Écrivez des fonctions exportées dont le nom commence par une majuscule et qui retournent directement `html` (une `View`). Exemple:
    
    ```ts
    export function Button(props: { label: string }) {
      return html`<button>${props.label}</button>`;
    }
    ```
2) Sans le plugin vite `autoComponentsPlugin`
   > Exportez une constante qui appelle `defineComponent` prenant un callback qui retourne `html` (une `View`). Exemple:

    ```ts
    import {defineComponent} from "nc-signals-components";
   
    export const Button = defineComponent((props: { label: string }) => {
        return html`<button>${props.label}</button>`;
    });
    ```

### Le plugin Vite `autoComponentsPlugin`
Le plugin les transforme en composants équivalents à :

```ts
export const Button = defineComponent((args: Record<string, any>) => ButtonView(args));
```

L’import de `defineComponent` est injecté automatiquement si nécessaire.

Importation dans `vite.config.ts`: 

```ts
import {autoComponentsPlugin} from 'nc-signals-components/vite';

export default defineConfig({
  //...
  plugins: [autoComponentsPlugin()],
  //...  
})
```

---

---

## Documentation détaillée

Consultez la documentation complète (API, exemples, FAQ, plugin Vite, bonnes pratiques):

- [DOCUMENTATION.md](./DOCUMENTATION.md) 


