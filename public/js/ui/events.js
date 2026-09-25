export function on(selector, event, handler) {
  document
    .querySelectorAll(selector)
    .forEach((element) => element.addEventListener(event, handler));
}
