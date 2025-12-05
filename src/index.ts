// Point d'entrée public du package
// Ne supprime rien du projet; on ré-exporte simplement l'API destinée aux consommateurs.

// Important: en ESM (Node/Vite), les imports relatifs doivent inclure l'extension .js
// afin d'éviter "ERR_MODULE_NOT_FOUND" au runtime côté consommateur.
export * from './lib/signals';
export * from './lib/components';
export * from './lib/ssr';
// ATTENTION: n'exportez pas les plugins Vite depuis l'entrée principale destinée au navigateur.
// Les plugins s'exécutent côté build (Node) et embarquer leurs dépendances ici
// peut casser les consommateurs (ex: ReferenceError: process is not defined).
// Pour utiliser le plugin, importez depuis le sous-chemin: "nc-signals-components/vite".
