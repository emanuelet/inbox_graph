import { createApp } from "vue";
import Vue3Toastify from "vue3-toastify";
import toastCss from "vue3-toastify/dist/index.css?inline";
import SearchPage from "./components/SearchPage.vue";
import "./styles/app.scss";

const style = document.createElement("style");
style.textContent = toastCss;
document.head.appendChild(style);

const app = createApp(SearchPage);
app.use(Vue3Toastify, { position: "bottom-right", autoClose: 4000 });
app.mount("#app");
