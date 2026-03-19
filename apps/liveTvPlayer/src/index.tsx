import { render } from '@solidjs/web';
import duration from "dayjs/plugin/duration"
import isBetween from 'dayjs/plugin/isBetween'

import App from './app';
import dayjs from "dayjs";

dayjs.extend(duration)
dayjs.extend(isBetween)
const root = document.getElementById('root');

render(() => <App />, root!);
