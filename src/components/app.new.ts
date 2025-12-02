import typescriptLogo from '../assets/typescript.svg'
import viteLogo from '/vite.svg'
import {html} from '../lib/components';
import {Counter} from "./counter.new";

type Props = {
    client?: boolean
};

export const App = ({client = true} : Props)=> html`<div>
    <a href="https://vite.dev">
        <img src="${viteLogo}" alt="vite logo" class="logo"/>
    </a>

    <a href="https://www.typescriptlang.org/">
        <img src="${typescriptLogo}" alt="typescript logo" class="logo vanilla"/>
    </a>

    <h1>Vite + TypeScript ${client ? 'CSR' : 'SSR'}</h1>

    ${Counter({label: "Clicks"})}

    <p>Click logos to learn more</p>
</div>`;