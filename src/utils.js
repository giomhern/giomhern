export function displayDialogue(text, onDisplayEnd) {
  const content = typeof text === "string" ? { text } : text;
  const dialogueUI = document.getElementById("textbox-container");
  const dialogue = document.getElementById("dialogue");
  dialogueUI.style.display = "block";
  dialogue.replaceChildren();
  dialogue.scrollTop = 0;
  const message = document.createElement("span");
  dialogue.append(message);
  const segments = [
    { text: content.text, element: message },
    ...(content.links ?? []).map((link) => ({ text: link.label, link })),
  ];
  let segmentIndex = 0;
  let index = 0;
  const intervalRef = setInterval(() => {
    while (segmentIndex < segments.length && index >= segments[segmentIndex].text.length) {
      segmentIndex++;
      index = 0;
    }
    if (segmentIndex < segments.length) {
      const segment = segments[segmentIndex];
      if (!segment.element) {
        segment.element = document.createElement("span");
        segment.element.className = "dialogue-link";
        dialogue.append(segment.element);
      }
      segment.element.textContent = segment.text.slice(0, ++index);
    } else {
      clearInterval(intervalRef);
      // Keep link text plain while typing; activate it after the whole dialog finishes.
      for (const segment of segments.filter((segment) => segment.link)) {
        const anchor = document.createElement("a");
        anchor.className = "dialogue-link";
        anchor.textContent = segment.text;
        anchor.href = segment.link.href;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        segment.element.replaceWith(anchor);
      }
    }
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
