from django.shortcuts import render
from django.views import View
from django.http import JsonResponse

from PIL import Image
import io
from ultralytics import YOLO

# Load a COCO-pretrained YOLO11n model
model = YOLO("yolo11n.pt")

class ClassifierView(View):
    def get(self, request):
        return render(request, "index.html")
    def post(self, request):
        uploaded_file = request.FILES.get('image')
        if not uploaded_file:
            return JsonResponse({'error': 'Nenhuma imagem enviada.'}, status=400)

        try:
            # Lê e converte a imagem
            image_bytes = uploaded_file.read()
            image = Image.open(io.BytesIO(image_bytes))

            # Realiza a predição
            results = model.predict(image)
            boxes = results[0].boxes

            # Se nenhuma detecção foi encontrada
            if not boxes:
                return JsonResponse({
                    'classification': 'Nenhum objeto detectado'
                })

            # Pega a detecção com maior confiança
            best_box = max(boxes, key=lambda b: float(b.conf[0]))
            class_id = int(best_box.cls[0])
            confidence = float(best_box.conf[0])
            class_name = results[0].names[class_id]

            # Retorna o resultado em JSON
            return JsonResponse({
                'classification': class_name,
                'confidence': round(confidence, 3),
                'num_detections': len(boxes),
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)