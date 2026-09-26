export function showToast({ title, detail, generator_name }, onOpen) {
  let region = document.querySelector("#toast-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "toast-region";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-label", "New notifications");
    document.body.append(region);
  }
  const toast = document.createElement("article");
  toast.className = "notification-toast";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const body = document.createElement("p");
  body.textContent = [generator_name, detail].filter(Boolean).join(" · ");
  const close = document.createElement("button");
  close.className = "toast-close";
  close.setAttribute("aria-label", "Dismiss notification");
  close.textContent = "×";
  close.onclick = () => toast.remove();
  toast.append(heading, body, close);
  if (onOpen) {
    const open = document.createElement("button");
    open.className = "toast-open";
    open.textContent = "View notifications";
    open.onclick = () => { toast.remove(); onOpen(); };
    toast.append(open);
  }
  region.append(toast);
  while (region.children.length > 4) region.firstElementChild.remove();
  let timer = setTimeout(() => toast.remove(), 12000);
  toast.onmouseenter = toast.onfocusin = () => clearTimeout(timer);
  toast.onmouseleave = () => { timer = setTimeout(() => toast.remove(), 12000); };
}
