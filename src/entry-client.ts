import './style.css'
import {App} from "./components/app.new";

App({client: false}).hydrate(document.querySelector('#app')!);
