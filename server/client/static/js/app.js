// Lê cookie (para pegar csrftoken)
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

// Cores para cada pessoa detectada
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
const resultBox = document.getElementById("result");
const classificationText = document.getElementById("classificationText");
const allPeopleInfo = document.getElementById("allPeopleInfo");
const peopleList = document.getElementById("peopleList");
const errorBox = document.getElementById("error");

const fileMode = document.getElementById("fileMode");
const cameraMode = document.getElementById("cameraMode");
const cameraContainer = document.getElementById("cameraContainer");
const video = document.getElementById("video");
const lastFrame = document.getElementById("lastFrame");
const lastFrameWrapper = document.getElementById("lastFrameWrapper");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraCtx = cameraCanvas.getContext("2d");
const startCamera = document.getElementById("startCamera");
const stopCamera = document.getElementById("stopCamera");
const cameraStatus = document.getElementById("cameraStatus");

let stream = null;
let detectionInterval = null;
let isDetecting = false;
let isProcessing = false;

// Alterna entre modo arquivo e câmera
fileMode.addEventListener("click", () => {
  fileMode.classList.add("bg-blue-600", "text-white");
  fileMode.classList.remove("bg-gray-200", "text-gray-700");
  cameraMode.classList.add("bg-gray-200", "text-gray-700");
  cameraMode.classList.remove("bg-blue-600", "text-white");

  form.classList.remove("hidden");
  cameraContainer.classList.add("hidden");
  stopCameraDetection();
});

cameraMode.addEventListener("click", () => {
  cameraMode.classList.add("bg-blue-600", "text-white");
  cameraMode.classList.remove("bg-gray-200", "text-gray-700");
  fileMode.classList.add("bg-gray-200", "text-gray-700");
  fileMode.classList.remove("bg-blue-600", "text-white");

  form.classList.add("hidden");
  cameraContainer.classList.remove("hidden");
  resultBox.classList.add("hidden");
  errorBox.classList.add("hidden");
});

// Inicia a câmera
startCamera.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      // Não precisamos mais ajustar o canvas aqui
    };

    startCamera.classList.add("hidden");
    stopCamera.classList.remove("hidden");

    isDetecting = true;
    isProcessing = false;
    detectFromCamera();
    detectionInterval = setInterval(detectFromCamera, 1000);

    cameraStatus.textContent = "Detectando a cada 1 segundo...";
  } catch (err) {
    console.error("Erro ao acessar câmera:", err);
    errorBox.textContent = "Não foi possível acessar a câmera.";
    errorBox.classList.remove("hidden");
  }
});

// Para a câmera
stopCamera.addEventListener("click", () => {
  stopCameraDetection();
  startCamera.classList.remove("hidden");
  stopCamera.classList.add("hidden");
  cameraStatus.textContent = "";
  lastFrame.classList.add("hidden");
});

function stopCameraDetection() {
  isDetecting = false;
  isProcessing = false;
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  cameraCtx.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
}

// Detecta pessoas na câmera
async function detectFromCamera() {
  if (!isDetecting || !video.srcObject) return;

  if (isProcessing) {
    console.log("Aguardando resposta anterior...");
    return;
  }

  try {
    isProcessing = true;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(video, 0, 0);

    const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.8);
    lastFrame.src = dataUrl;
    lastFrame.classList.remove("hidden");

    lastFrame.onload = () => {
      cameraCanvas.width = lastFrame.offsetWidth;
      cameraCanvas.height = lastFrame.offsetHeight;
    };

    const blob = await new Promise((resolve) =>
      tempCanvas.toBlob(resolve, "image/jpeg", 0.8)
    );

    const formData = new FormData();
    formData.append("image", blob, "camera.jpg");

    const csrftoken = getCookie("csrftoken");

    const res = await fetch("/", {
      method: "POST",
      body: formData,
      headers: csrftoken ? { "X-CSRFToken": csrftoken } : {},
    });

    if (!res.ok) throw new Error(`Erro ${res.status}`);

    const data = await res.json();

    cameraStatus.textContent = `${
      data.classification || "Nenhuma pessoa detectada"
    }`;

    drawCameraBoundingBoxes(data.all_people);

    classificationText.textContent =
      data.classification || "Nenhuma pessoa detectada";

    if (data.all_people && data.all_people.length > 0) {
      allPeopleInfo.classList.remove("hidden");
      peopleList.innerHTML = "";

      data.all_people.forEach((person, index) => {
        const color = colors[index % colors.length];
        const personCard = document.createElement("div");
        personCard.className = "bg-gray-50 p-4 rounded border-l-4";
        personCard.style.borderLeftColor = color;

        personCard.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-semibold text-lg" style="color: ${color}">Pessoa ${
          index + 1
        }</h4>
            <span class="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              ${(person.confidence * 100).toFixed(1)}% confiança
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm text-gray-700">
            <div>
              <span class="font-medium">Centro:</span> (${
                person.position.xywh.center_x
              }, ${person.position.xywh.center_y})
            </div>
            <div>
              <span class="font-medium">Tamanho:</span> ${
                person.position.xywh.width
              }×${person.position.xywh.height}
            </div>
          </div>
        `;

        peopleList.appendChild(personCard);
      });
    } else {
      allPeopleInfo.classList.add("hidden");
    }

    resultBox.classList.remove("hidden");
    errorBox.classList.add("hidden");
  } catch (err) {
    console.error("Erro na detecção:", err);
    cameraStatus.textContent = "Erro na detecção";
  } finally {
    isProcessing = false;
  }
}

// Desenha bounding boxes na câmera
function drawCameraBoundingBoxes(allPeople) {
  if (!allPeople || allPeople.length === 0) {
    cameraCtx.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
    return;
  }

  const scaleX = lastFrame.offsetWidth / lastFrame.naturalWidth;
  const scaleY = lastFrame.offsetHeight / lastFrame.naturalHeight;

  cameraCtx.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);

  allPeople.forEach((person, index) => {
    const pos = person.position.xyxy;
    const x1 = pos.x1 * scaleX;
    const y1 = pos.y1 * scaleY;
    const x2 = pos.x2 * scaleX;
    const y2 = pos.y2 * scaleY;

    const width = x2 - x1;
    const height = y2 - y1;

    const color = colors[index % colors.length];

    cameraCtx.strokeStyle = color;
    cameraCtx.lineWidth = 3;
    cameraCtx.strokeRect(x1, y1, width, height);

    cameraCtx.fillStyle = color + "1A";
    cameraCtx.fillRect(x1, y1, width, height);

    const label = `Pessoa ${index + 1} (${(person.confidence * 100).toFixed(
      1
    )}%)`;

    cameraCtx.font = "bold 14px Arial";
    const textWidth = cameraCtx.measureText(label).width;

    cameraCtx.fillStyle = color;
    cameraCtx.fillRect(x1, y1 - 25, textWidth + 10, 25);

    cameraCtx.fillStyle = "#FFFFFF";
    cameraCtx.fillText(label, x1 + 5, y1 - 7);
  });
}

// Mostra pré-visualização da imagem
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

// Função para desenhar todas as bounding boxes
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

// Envia o formulário via fetch
form.addEventListener("submit", async function (e) {
  e.preventDefault();
  errorBox.classList.add("hidden");
  resultBox.classList.add("hidden");
  allPeopleInfo.classList.add("hidden");
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Classificando...";

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const file = imageInput.files[0];
  if (!file) {
    errorBox.textContent = "Selecione uma imagem antes de enviar.";
    errorBox.classList.remove("hidden");
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  const csrftoken = getCookie("csrftoken");

  try {
    const res = await fetch("/", {
      method: "POST",
      body: formData,
      headers: csrftoken ? { "X-CSRFToken": csrftoken } : {},
    });

    if (!res.ok) {
      const text = await res.text().catch(() => null);
      throw new Error(`Erro ${res.status}${text ? ": " + text : ""}`);
    }

    const data = await res.json();

    classificationText.textContent =
      data.classification || "Nenhuma pessoa detectada";

    if (data.all_people && data.all_people.length > 0) {
      allPeopleInfo.classList.remove("hidden");
      peopleList.innerHTML = "";

      drawAllBoundingBoxes(data.all_people);

      data.all_people.forEach((person, index) => {
        const color = colors[index % colors.length];
        const personCard = document.createElement("div");
        personCard.className = "bg-gray-50 p-4 rounded border-l-4";
        personCard.style.borderLeftColor = color;

        personCard.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-semibold text-lg" style="color: ${color}">Pessoa ${
          index + 1
        }</h4>
            <span class="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              ${(person.confidence * 100).toFixed(1)}% confiança
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm text-gray-700">
            <div>
              <span class="font-medium">Centro:</span> (${
                person.position.xywh.center_x
              }, ${person.position.xywh.center_y})
            </div>
            <div>
              <span class="font-medium">Tamanho:</span> ${
                person.position.xywh.width
              }×${person.position.xywh.height}
            </div>
          </div>
        `;

        peopleList.appendChild(personCard);
      });
    }

    resultBox.classList.remove("hidden");
    previewContainer.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    errorBox.textContent =
      "Falha ao classificar a imagem. Verifique o backend.";
    errorBox.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});
