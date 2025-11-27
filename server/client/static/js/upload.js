function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

const colors = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

const imageInput = document.getElementById("image");
const previewContainer = document.getElementById("previewContainer");
const preview = document.getElementById("preview");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const form = document.getElementById("uploadForm");
const submitBtn = document.getElementById("submitBtn");

imageInput.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) {
    preview.src = "#";
    previewContainer.classList.add("hidden");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    preview.src = e.target.result;
    preview.onload = function () {
      canvas.width = preview.offsetWidth;
      canvas.height = preview.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    previewContainer.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

function drawAllBoundingBoxes(allPeople) {
  if (!allPeople || allPeople.length === 0) return;

  const scaleX = preview.offsetWidth / preview.naturalWidth;
  const scaleY = preview.offsetHeight / preview.naturalHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  allPeople.forEach((person, index) => {
    const pos = person.position.xyxy;
    const x1 = pos.x1 * scaleX;
    const y1 = pos.y1 * scaleY;
    const x2 = pos.x2 * scaleX;
    const y2 = pos.y2 * scaleY;

    const width = x2 - x1;
    const height = y2 - y1;

    const color = colors[index % colors.length];

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x1, y1, width, height);

    ctx.fillStyle = color + "1A";
    ctx.fillRect(x1, y1, width, height);

    const label = `Pessoa ${index + 1} (${(person.confidence * 100).toFixed(
      1
    )}%)`;

    ctx.font = "bold 14px Arial";
    const textWidth = ctx.measureText(label).width;

    ctx.fillStyle = color;
    ctx.fillRect(x1, y1 - 25, textWidth + 10, 25);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(label, x1 + 5, y1 - 7);
  });
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  errorBox.classList.add("hidden");
  resultBox.classList.add("hidden");
  allPeopleInfo.classList.add("hidden");
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Detectando...";

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const file = imageInput.files[0];
  if (!file) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  const csrftoken = getCookie("csrftoken");

  try {
    const res = await fetch("/upload/", {
      method: "POST",
      body: formData,
      headers: csrftoken ? { "X-CSRFToken": csrftoken } : {},
    });

    if (!res.ok) {
      const text = await res.text().catch(() => null);
      throw new Error(`Erro ${res.status}${text ? ": " + text : ""}`);
    }

    const data = await res.json();

    if (data.all_people && data.all_people.length > 0) {
      drawAllBoundingBoxes(data.all_people);
    }

    previewContainer.classList.remove("hidden");
  } catch (err) {
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});
