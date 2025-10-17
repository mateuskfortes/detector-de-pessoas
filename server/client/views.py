from django.shortcuts import render
from django.views import View

from PIL import Image
import io
from ultralytics import YOLO

# Load a COCO-pretrained YOLO11n model
model = YOLO("yolo11n.pt")

class ClassifierView(View):
    def get(self, request):
        return render(request, "index.html")
    def post(self, request):
        uploaded_file = request.FILES['image']
        
        image_bytes = uploaded_file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        result = model.predict(image)
        boxes = result[0].boxes

        # Cada caixa tem:
        # - .xyxy: coordenadas do box [x1, y1, x2, y2]
        # - .cls: índice da classe (número)
        # - .conf: confiança da detecção

        for box in boxes:
            class_id = int(box.cls[0])     # índice da classe
            confidence = float(box.conf[0]) if box.conf is not None else None
            class_name = result[0].names[class_id]
            return render(request, "index.html", {"classification": f"Classe: {class_name}, Confiança: {confidence:.2f}"})