import {html} from "../lib/components.ts";

type Props = {
    text: string
}

export function ListItem({text}: Props){
    return html`<li>${text}</li>`;
}