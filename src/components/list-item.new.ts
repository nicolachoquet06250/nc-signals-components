import {html} from "../lib/components.ts";

type Props = {
    text: string
}

export const ListItem = ({text}: Props)=> html`<li>${text}</li>`;