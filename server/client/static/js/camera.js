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

const video = document.getElementById("video");
const lastFrame = document.getElementById("lastFrame");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraCtx = cameraCanvas.getContext("2d");
const startCamera = document.getElementById("startCamera");
const stopCamera = document.getElementById("stopCamera");
const cameraStatus = document.getElementById("cameraStatus");

let stream = null;
let detectionInterval = null;
let isDetecting = false;
let isProcessing = false;

startCamera.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    video.srcObject = stream;

    startCamera.classList.add("hidden");
    stopCamera.classList.remove("hidden");

    isDetecting = true;
    isProcessing = false;
    detectFromCamera();
    detectionInterval = setInterval(detectFromCamera, 1000);

    cameraStatus.textContent = "Detectando a cada 1 segundo...";
  } catch (err) {
    console.error("Erro ao acessar câmera:", err);
  }
});

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

async function detectFromCamera() {
  if (!isDetecting || !video.srcObject || isProcessing) {
    if (isProcessing) console.log("Aguardando resposta anterior...");
    return;
  }

  try {
    isProcessing = true;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(video, 0, 0);

    lastFrame.src = tempCanvas.toDataURL("image/jpeg", 0.8);
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

    const res = await fetch("/camera/", {
      method: "POST",
      body: formData,
      headers: csrftoken ? { "X-CSRFToken": csrftoken } : {},
    });

    if (!res.ok) throw new Error(`Erro ${res.status}`);
    const data = await res.json();

    const numPeople = data.all_people?.length || 0;
    cameraStatus.textContent =
      numPeople > 0
        ? `${numPeople} pessoa(s) detectada(s)`
        : "Nenhuma pessoa detectada";

    drawCameraBoundingBoxes(data.all_people);
  } catch (err) {
    console.error("Erro na detecção:", err);
    cameraStatus.textContent = "Erro na detecção: " + err.message;
  } finally {
    isProcessing = false;
  }
}

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
