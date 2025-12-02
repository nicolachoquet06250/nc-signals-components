// Point d'entrée public du package
// Ne supprime rien du projet; on ré-exporte simplement l'API destinée aux consommateurs.

// Important: en ESM (Node/Vite), les imports relatifs doivent inclure l'extension .js
// afin d'éviter "ERR_MODULE_NOT_FOUND" au runtime côté consommateur.
export * from './lib/signals.js';
export * from './lib/components.js';
export * from './plugins/vite-plugin-autocomponent.js';
