import { render } from '@solidjs/web';
import "@web/lins/minimal.css"
import "./style.css";
import App from "~/app";
import {LocationContext} from "@web/router";

const app = document.getElementById("app");
if (!app) throw new Error("No app element found");

render(() => <LocationContext><App /></LocationContext>, app);
