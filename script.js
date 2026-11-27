const googleFormId = "1FAIpQLSeQNujbqUuqO3JKfE4MVUfJktgb9VPddOGr8zrtoxoG12cQeQ";

const weddingTime = Date.parse(document.querySelector(".hero-date time").dateTime);
const countdownUnits = [
  { element: document.getElementById("days"), seconds: 86400 },
  { element: document.getElementById("hours"), seconds: 3600 },
  { element: document.getElementById("minutes"), seconds: 60 },
  { element: document.getElementById("seconds"), seconds: 1 },
];

function updateCountdown() {
  const remainingSeconds = Math.max(0, Math.ceil((weddingTime - Date.now()) / 1000));
  let remainder = remainingSeconds;

  for (const { element, seconds } of countdownUnits) {
    const value = String(Math.floor(remainder / seconds)).padStart(2, "0");
    if (element.textContent !== value) element.textContent = value;
    remainder %= seconds;
  }

  if (remainingSeconds === 0) {
    document.getElementById("countdown-message").hidden = false;
    return;
  }

  window.setTimeout(updateCountdown, 1000 - (Date.now() % 1000));
}

updateCountdown();

const form = document.getElementById("rsvp-form");
const guestName = document.getElementById("guest-name");
const guestCount = document.getElementById("guest-count");
const guestNeeds = document.getElementById("guest-needs");
const guestNotes = document.getElementById("guest-notes");
const notAttending = document.getElementById("count-not-attending");
const frame = document.getElementById("rsvp-frame");
const submitButton = form.querySelector("button[type='submit']");
const status = document.getElementById("rsvp-status");
let submissionTimer;

function updateGuestNeeds() {
  const isNotAttending = guestCount.valueAsNumber === 0;
  guestCount.setCustomValidity(isNotAttending ? notAttending.textContent.trim() : "");
  notAttending.hidden = !isNotAttending;
  const hasGuests = guestCount.valueAsNumber > 0 && guestCount.validity.valid;
  guestNeeds.hidden = !hasGuests;
  guestNeeds.disabled = !hasGuests;
}

function showStatus(message) {
  status.hidden = false;
  status.textContent = message;
}

guestCount.addEventListener("input", updateGuestNeeds);
guestCount.addEventListener("change", updateGuestNeeds);
window.addEventListener("pageshow", updateGuestNeeds);
guestName.addEventListener("input", () => guestName.setCustomValidity(""));
updateGuestNeeds();
form.action = `https://docs.google.com/forms/d/e/${googleFormId}/formResponse`;
submitButton.disabled = false;

function finishSubmission(message) {
  window.clearTimeout(submissionTimer);
  submissionTimer = undefined;
  submitButton.disabled = false;
  form.removeAttribute("aria-busy");
  showStatus(message);
}

form.addEventListener("submit", (event) => {
  if (submissionTimer !== undefined) {
    event.preventDefault();
    return;
  }

  guestName.value = guestName.value.trim();
  if (!guestName.value) {
    event.preventDefault();
    guestName.setCustomValidity("請填寫姓名。");
    guestName.reportValidity();
    return;
  }

  updateGuestNeeds();
  if (!form.reportValidity()) {
    event.preventDefault();
    return;
  }

  showStatus("正在送出回函…");
  form.setAttribute("aria-busy", "true");
  submitButton.disabled = true;
  submissionTimer = window.setTimeout(() => {
    finishSubmission("Google 表單回應逾時，收件狀態未確認。");
  }, 15000);
});

form.addEventListener("formdata", ({ formData }) => {
  const count = guestCount.valueAsNumber;
  if (count > 5) {
    // Google 表單以「其他」選項搭配備註記錄 6 人以上的人數。
    const notes = guestNotes.value.trim();
    formData.set(guestCount.name, "其他請填備註");
    formData.set(guestNotes.name, notes ? `參加午宴人數 ${count} 位\n${notes}` : `參加午宴人數 ${count} 位`);
  } else if (count > 0) {
    formData.set(guestCount.name, String(count));
  }
});

frame.addEventListener("load", () => {
  if (submissionTimer === undefined) return;

  try {
    if (frame.contentWindow.location.href === "about:blank") return;
  } catch (error) {
    // Google 的跨來源回應只能得知載入事件，無法讀取收件結果。
    if (error.name !== "SecurityError") throw error;
  }

  finishSubmission("回函已送往 Google 表單，收件狀態未確認。");
});
