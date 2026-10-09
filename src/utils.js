export function displayDialogue(text, onDisplayEnd) {
  const content = typeof text === "string" ? { text } : text;
  const dialogueUI = document.getElementById("textbox-container");
  const dialogue = document.getElementById("dialogue");
  dialogueUI.style.display = "block";
  dialogue.replaceChildren();
  const message = document.createElement("span");
  dialogue.append(message);
  for (const link of content.links ?? []) {
    const anchor = document.createElement("a");
    anchor.textContent = link.label;
    anchor.href = link.href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    dialogue.append(document.createElement("br"), anchor);
  }

  let index = 0;
  let currentText = "";
  const intervalRef = setInterval(() => {
    if (index < content.text.length) {
      currentText += content.text[index];
      message.textContent = currentText;
      index++;
      return;
    }
    clearInterval(intervalRef);
  }, 5);

  const closeBtn = document.getElementById("close");
  function onCloseBtnClick() {
    onDisplayEnd();
    dialogueUI.style.display = "none";
    dialogue.innerHTML = "";
    clearInterval(intervalRef);
    closeBtn.removeEventListener("click", onCloseBtnClick);
    document.removeEventListener("keydown", onDialogKeyDown);
    document.getElementById("game").focus({ preventScroll: true });
  }

  function onDialogKeyDown(event) {
    if (event.key !== "Escape" || event.repeat) return;
    event.preventDefault();
    onCloseBtnClick();
  }

  closeBtn.addEventListener("click", onCloseBtnClick);
  document.addEventListener("keydown", onDialogKeyDown);
}

export function setCamScale(k) {
  const resizeFactor = k.width() / k.height();
  if (resizeFactor < 1) {
    k.camScale(k.vec2(1));
    return;
  }
  k.camScale(k.vec2(1.5));
}
