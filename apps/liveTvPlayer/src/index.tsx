import { render } from '@solidjs/web';
import App from './app';
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration"
import isBetween from 'dayjs/plugin/isBetween'
import "@web/lins/lumina.css"
import "@web/lins/elements"

dayjs.extend(duration)
dayjs.extend(isBetween)
const root = document.getElementById('root');

render(() => <App />, root!);
