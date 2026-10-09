export function setupTouchControls(element) {
  const pointers = new Map();
  const buttons = [...element.querySelectorAll("button")];
  let disabled = false;

  function refresh() {
    for (const button of buttons) {
      button.classList.toggle("pressed", [...pointers.values()].includes(button.dataset.direction));
    }
  }
  function clear() {
    pointers.clear();
    refresh();
  }
  function release(event) {
    event.preventDefault();
    event.stopPropagation();
    pointers.delete(event.pointerId);
    refresh();
  }
  for (const button of buttons) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button.dataset.direction);
      refresh();
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      button.addEventListener(type, release);
    }
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", clear);
  return {
    directions: () => new Set(pointers.values()),
    setDisabled(value) {
      disabled = value;
      for (const button of buttons) button.disabled = value;
      if (value) clear();
    },
  };
}
