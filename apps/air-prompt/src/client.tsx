import {render} from "@solidjs/web";
import {LocationContext} from "@web/router";
import "./style.css";
import App from "~/app";

const app = document.getElementById("app");
if (!app) throw new Error("No app element found");

render(() => <LocationContext><App/></LocationContext>, app);
