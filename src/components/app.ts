import typescriptLogo from '../assets/typescript.svg'
import viteLogo from '/vite.svg'
import {defineComponent, html} from '../lib/components';
import {Counter} from "./counter";

export const App = defineComponent<{client?: boolean}>(({client = true}) => {
    const counter = Counter({label: "Clicks"});

    return html`
        <div>
            <a href="https://vite.dev">
                <img src="${viteLogo}" alt="vite logo" class="logo"/>
            </a>

            <a href="https://www.typescriptlang.org/">
                <img src="${typescriptLogo}" alt="typescript logo" class="logo vanilla"/>
            </a>

            <h1>Vite + TypeScript ${client ? 'CSR' : 'SSR'}</h1>

            ${counter}

            <p>Click logos to learn more</p>
        </div>`
});