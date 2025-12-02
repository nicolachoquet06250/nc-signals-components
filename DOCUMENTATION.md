### Bibliothèque de composants et de signaux — Guide d’utilisation

Dernière mise à jour: 2025-12-02 15:18

Ce document explique comment utiliser la librairie de composants (`src/lib/components.ts`) et la librairie de réactivité par signaux (`src/lib/signals.ts`), ainsi que l’intégration via le plugin Vite d’auto‑composants.

---

### Sommaire

- Présentation rapide
- Démarrage rapide
- Signaux (réactivité)
  - `signal`
  - `computed`
  - Effets et watchers: `watchEffect`, `watch`, `watchOnce`
  - Bonnes pratiques et patterns
- Composants et rendu
  - Concepts: `VNode`, `View`, `Component`
  - `defineComponent`
  - Le tag `html` (interpolation, attributs, événements, SSR/CSR)
  - Montage côté client: `mount`
  - Hydratation: `hydrate`
  - Rendu côté serveur: `renderToString`
  - Bonnes pratiques
- Plugin Vite d’auto‑composants
  - Convention des fichiers `*.ts`
  - Formes de composants supportées
  - Import automatique de `defineComponent`
- Exemples complets

---

### Présentation rapide

- La réactivité est basée sur des signaux minimalistes:
  - `signal(value)` crée un état mutable réactif, lisible/écrivable en appelant la fonction retournée.
  - `computed(getter)` crée une valeur dérivée, recalculée automatiquement.
  - `watchEffect`/`watch` permettent de réagir aux changements.

- Le rendu UI se fait avec un mini DSL `html` qui génère des `VNode` et des « vues » (`View`).
  - Un `Component<P>` est une fonction `(props: P) => View`.
  - `defineComponent(setup)` transforme un `setup(props) => View` en composant utilisable.
  - Le système supporte SSR (string) et hydratation côté client.

---

### Démarrage rapide

1) Créer un composant sous `src/components/MonComp.new.ts`:

```ts
import {html} from "../lib/components";

export function Hello(props: { name: string }) {
  return html`<h1>Hello ${props.name}!</h1>`;
}
```

2) Le plugin Vite transforme automatiquement ce fichier pour exposer `export const Hello = defineComponent((...args) => HelloView(...args))` et ajoute l’import de `defineComponent` si nécessaire.

3) Utiliser le composant dans un autre composant:

```ts
import {Hello} from "./Hello.new";
import {html} from "../lib/components";

export function App() {
  const hello = Hello({ name: "World" });
  return html`<main>${hello}</main>`;
}
```

4) Monter dans le client:

```ts
import {mount} from "./lib/components";
import {App} from "./components/App.new";

mount(App({}), document.getElementById("app")!);
```

5) Rendu SSR (optionnel):

```ts
import {renderToString} from "./lib/components";
import {App} from "./components/App.new";

const htmlString = renderToString(App, {});
```

---

### Signaux (réactivité)

Les APIs ci‑dessous proviennent de `src/lib/signals.ts`.

#### `signal<T>(initial: T)`

Crée un signal lisible/écrivable.

Caractéristiques:
- Appel en lecture: `count()` retourne la valeur courante.
- Écriture par affectation: `count(123)` remplace la valeur.
- Écriture par setter dédié: `count.set(123)`.
- Mise à jour fonctionnelle: `count.update(prev => prev + 1)`.

Exemple:

```ts
import {signal} from "../lib/signals";

const count = signal(0);

console.log(count()); // 0
count(1);
count.set(2);
count.update(p => p + 1); // 3
```

Dans les templates `html`, interpoler simplement le signal (sans l’appeler):

```ts
html`<button>Clicks: ${count}</button>`
```

Le système appelle automatiquement la fonction pour résoudre la valeur, et se réabonne correctement via les effets.

#### `computed<T>(getter | { get: () => T, set?: (v: T) => void })`

Crée une valeur dérivée qui se met à jour lorsque ses dépendances changent.

Deux formes:
- Lecture seule: `computed(() => count() * 2)`.
- Lecture/écriture: `computed({ get: ..., set: (v) => ... })` permettant d’assigner: `double(10)` ou `double.set(10)` selon votre logique.

Exemple:

```ts
import {signal, computed} from "../lib/signals";

const count = signal(2);
const double = computed(() => count() * 2);

console.log(double()); // 4
count.update(p => p + 1);
console.log(double()); // 6
```

#### `watchEffect(effect: (onCleanup: (fn: () => void) => void) => void): StopHandle`

Exécute la fonction immédiatement, suit automatiquement les dépendances lues durant son exécution et re‑exécute l’effet quand elles changent.

```ts
import {signal, watchEffect} from "../lib/signals";

const name = signal("Ada");
const stop = watchEffect(() => {
  console.log(`Hello ${name()}`);
});

name("Grace"); // re‑exécute l’effet
stop(); // arrête l’effet
```

`onCleanup(fn)` peut être utilisé dans l’effet pour nettoyer des ressources avant la prochaine exécution.

#### `watch(source, cb, options?)`

Observe un ou plusieurs producteurs de valeurs:
- `source`: un signal, une fonction `() => any`, ou un tableau de sources.
- `cb(value, oldValue, onCleanup)` est appelé sur changement.
- `options` peut contenir `immediate?: boolean` et `flush?: 'sync' | 'post'` (suivant l’implémentation).

```ts
import {signal, watch} from "../lib/signals";

const count = signal(0);
const stop = watch(count, (val, old) => {
  console.log("count:", val, "old:", old);
});

count(1);
stop();
```

#### `watchOnce(source, cb, options?)`

Comme `watch`, mais se désabonne automatiquement après la première notification.

---

### Composants et rendu

Les APIs ci‑dessous proviennent de `src/lib/components.ts`.

#### Concepts

- `VNode`: structure intermédiaire `{ html: string, setups: DomSetup[] }` utilisée pour l’assemblage SSR/CSR.
- `View`: fonction sans argument `() => VNode`. Une View encapsule un fragment d’UI prêt à être monté/ hydraté.
- `Component<P>`: fonction `(props: P) => View`. Un composant correspond à un « setup » qui produit une View.

#### `defineComponent<P>(setup: (props: P) => View): Component<P>`

Enrobe une fonction `setup` pour marquer la View retournée et faciliter l’interpolation dans `html`.

Usage direct:

```ts
import {defineComponent, html} from "../lib/components";

const Hello = defineComponent((props: { name: string }) => html`<h1>Hello ${props.name}</h1>`);

const view = Hello({ name: "World" });
```

Avec le plugin Vite (recommandé), vous écrivez simplement une fonction exportée et le plugin génère l’enrobage.

#### Le tag `html`

Signature: `html(strings: TemplateStringsArray, ...values: any[]): View`.

Fonctionnalités principales:
- Interpolation:
  - Valeurs primitives, tableaux (aplatis/concaténés), fonctions (traitées comme thunks: appelées jusqu’à obtenir une valeur non‑fonction), signaux (leur valeur est lue), Views et VNodes (insérées et fusionnées avec leurs `setups`).
- Attributs dynamiques:
  - Événements: attributs `on*` (p. ex. `onclick`, `oncontextmenu`) acceptent une fonction. En client, le listener est attaché puis l’attribut est nettoyé.
  - Autres attributs: les valeurs sont converties en chaîne via les mêmes règles d’interpolation.
- Marqueurs stables SSR/CSR:
  - Les parties d’événements génèrent un identifiant stable inclus côté SSR, réutilisé à l’hydratation pour cibler précisément le noeud.

Exemple:

```ts
const inc = () => count.update(p => p + 1);

return html`<button onclick="${inc}">Count: ${count}</button>`;
```

#### Montage côté client: `mount(view, container): StopHandle`

Monte une `View` dans un élément DOM. Retourne une fonction pour démonter/arrêter les effets.

```ts
import {mount} from "../lib/components";
mount(App({}), document.getElementById("app")!);
```

#### Hydratation: `hydrate(view, container): StopHandle`

Attache les `setups` (écouteurs, effets) sur un DOM déjà généré (SSR). Utiliser la même `View` que celle rendue côté serveur.

```ts
import {hydrate} from "../lib/components";
hydrate(App({}), document.getElementById("app")!);
```

#### Rendu serveur: `renderToString(compOrView, props?)`

Retourne une chaîne HTML. `compOrView` peut être:
- Une `View` (fonction `() => VNode`)
- Un `Component` (ex.: `App`) accompagné de `props`.

```ts
import {renderToString} from "../lib/components";
import {App} from "../components/App";

const html = renderToString(App, { /* props */ });
```

---

### Plugin Vite d’auto‑composants

Le plugin situé dans `src/plugins/vite-plugin-autocomponent.ts` transforme automatiquement vos fichiers source `*.new.ts` pour générer des composants à partir de fonctions exportées.

#### Convention des fichiers

- Seuls les fichiers se terminant par `.new.ts` sont analysés et transformés.
- Le fichier `components.ts` est explicitement ignoré pour éviter toute auto‑transformation.

#### Formes de composants supportées

Forme supportée (actuelle): la fonction retourne directement une `View` via `html`.

```ts
export function Button(props) {
  return html`<button>${props.label}</button>`;
}

// ou
// export const Button = (props) => html`<button>${props.label}</button>`;
```

Transformation appliquée:
- La fonction est renommée en `ButtonView`.
- Génération de `export const Button = defineComponent((...args) => ButtonView(...args))`.

#### Import automatique de `defineComponent`

- Le plugin détecte le module d’où `html` est importé (par exemple `"../lib/components"`) et insère l’import de `defineComponent` depuis ce même module si nécessaire.
- Sinon, il utilise l’option `componentsModule` (par défaut `"./components"`).

---

### Bonnes pratiques & pièges fréquents

- Toujours retourner une `View` depuis le `setup` d’un composant. Avec le format actuel, écrivez simplement `return html\`...\`` dans vos fonctions exportées `*.new.ts`. Si vous retournez un objet arbitraire, l’interpolation peut afficher `[object Object]`.
- Dans les templates, interpoler directement les signaux (sans `()`), ex.: `${count}`. Le système saura lire la valeur courante et réagir aux mises à jour.
- Pour les événements, passez une fonction: `onclick="${handler}"`. Ne mettez pas de chaînes de type `"handleClick()"`.
- Évitez les effets globaux; préférez `watchEffect` avec `onCleanup` dans les `setups` de composants pour gérer le cycle de vie.
- En SSR, utilisez `renderToString` côté serveur, puis `hydrate` côté client avec la même structure d’éléments pour assurer une hydratation fiable.

---

### Exemples complets

#### Compteur réactif

```ts
// src/components/counter.new.ts
import {computed, signal} from "../lib/signals";
import {html} from "../lib/components";

export function Counter<T extends { label: string }>(props: T) {
  const count = signal(0);
  const double = computed(() => count() * 2);
  // ou `const double = computed(() => count.value * 2);`

  const inc = () => count.set(c => c + 1);
  const decRight = (e: MouseEvent) => { e.preventDefault(); count.set(c => c - 1); };

  return html`<div class="card">
    <button type="button" onclick="${inc}" oncontextmenu="${decRight}">
      ${props.label}: ${count} (x2: ${double})
    </button>
  </div>`;
}
```

#### Application

```ts
// src/components/app.new.ts
import {html} from "../lib/components";
import {Counter} from "./counter.new";

export function App<T extends { client?: boolean }>({ client = true }: T) {
  const counter = Counter({ label: "Clicks" });

  return html`<div>
    <h1>Vite + TypeScript ${client ? 'CSR' : 'SSR'}</h1>
    ${counter}
  </div>`;
}

// ou
// export function App<T extends { client?: boolean }>({ client = true }: T) {
//   return html`<div>
//     <h1>Vite + TypeScript ${client ? 'CSR' : 'SSR'}</h1>
//     ${Counter({ label: "Clicks" })}
//   </div>`;
// }
```

#### Rendu client

```ts
// src/main.ts (extrait)
import {mount} from "./lib/components";
import {App} from "./components/app.new";

mount(App({ client: true }), document.getElementById("app")!);
```

#### Entrée client

```ts
// src/entry-client.ts (extrait)
import {hydrate} from "./lib/components";
import {App} from "./components/app.new";

hydrate(App({ client: false }), document.getElementById("app")!);
```

#### Rendu serveur

```ts
// Exemple d’utilisation côté serveur
import {renderToString} from "./lib/components";
import {App} from "./components/app.new";

const html = renderToString(App, { client: false });
// Injectez `html` dans votre template de page
```

---

### Référence API (récapitulatif)

- `signal<T>(initial: T)` → `Signal<T>` (callable):
  - lecture: `s()`
  - écriture: `s(v)` | `s.set(v)` | `s.update(fn)`
- `computed<T>(getter | {get, set?})` → `Computed<T>` (callable)
- `watchEffect(effect)` → `StopHandle`
- `watch(source, cb, options?)` → `StopHandle`
- `watchOnce(source, cb, options?)` → `StopHandle`
- `defineComponent<P>(setup: (props: P) => View)` → `Component<P>`
- `html` tag → `View`
- `mount(view, container)` → `StopHandle`
- `hydrate(view, container)` → `StopHandle`
- `renderToString(compOrView, props?)` → `string`

---

### FAQ

Q: Pourquoi vois‑je `[object Object]` dans le rendu ?

A: Cela arrive si vous interpoliez un objet arbitraire ou si votre fonction exportée n’a pas été transformée en composant et que vous insérez directement le résultat (qui n’est pas une `View`). Avec les règles actuelles du plugin, écrivez vos composants dans des fichiers `*.new.ts` et retournez directement `html\`...\``; le plugin générera `export const Comp = defineComponent((...args) => CompView(...args))`.

Q: Dois‑je appeler mes signaux dans le template (ex.: `${count()}`) ?

A: Non, il suffit d’écrire `${count}`. Le système sait résoudre `signal` et `computed` automatiquement.

Q: Comment lier un événement ?

A: Passez une fonction dans un attribut commençant par `on`: `onclick="${handler}"`. Elle sera attachée à l’hydratation/au montage.
