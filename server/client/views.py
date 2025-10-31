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

            # Realiza a predição filtrando apenas a classe "person" (ID = 0 no COCO)
            results = model.predict(image, classes=[0])
            boxes = results[0].boxes

            # Se nenhuma pessoa foi detectada
            if not boxes or len(boxes) == 0:
                return JsonResponse({
                    'classification': 'Nenhuma pessoa detectada',
                    'num_detections': 0
                })

            # Pega a pessoa com maior confiança
            best_box = max(boxes, key=lambda b: float(b.conf[0]))
            class_id = int(best_box.cls[0])
            confidence = float(best_box.conf[0])
            class_name = results[0].names[class_id]
            
            # Extrai as coordenadas da bounding box
            xyxy = best_box.xyxy[0].tolist()
            xywh = best_box.xywh[0].tolist()
            
            # Coordenadas normalizadas
            xyxyn = best_box.xyxyn[0].tolist() if best_box.xyxyn is not None else None
            xywhn = best_box.xywhn[0].tolist() if best_box.xywhn is not None else None

            # Cria lista com todas as pessoas detectadas
            all_people = []
            for box in boxes:
                person_data = {
                    'confidence': round(float(box.conf[0]), 3),
                    'position': {
                        'xyxy': {
                            'x1': round(box.xyxy[0][0].item(), 2),
                            'y1': round(box.xyxy[0][1].item(), 2),
                            'x2': round(box.xyxy[0][2].item(), 2),
                            'y2': round(box.xyxy[0][3].item(), 2)
                        },
                        'xywh': {
                            'center_x': round(box.xywh[0][0].item(), 2),
                            'center_y': round(box.xywh[0][1].item(), 2),
                            'width': round(box.xywh[0][2].item(), 2),
                            'height': round(box.xywh[0][3].item(), 2)
                        }
                    }
                }
                all_people.append(person_data)

            # Retorna o resultado em JSON
            return JsonResponse({
                'classification': f'{len(boxes)} pessoa(s) detectada(s)',
                'confidence': round(confidence, 3),
                'num_detections': len(boxes),
                'position': {
                    'xyxy': {
                        'x1': round(xyxy[0], 2),
                        'y1': round(xyxy[1], 2),
                        'x2': round(xyxy[2], 2),
                        'y2': round(xyxy[3], 2)
                    },
                    'xywh': {
                        'center_x': round(xywh[0], 2),
                        'center_y': round(xywh[1], 2),
                        'width': round(xywh[2], 2),
                        'height': round(xywh[3], 2)
                    },
                    'normalized': {
                        'xyxy': xyxyn,
                        'xywh': xywhn
                    } if xyxyn and xywhn else None
                },
                'all_people': all_people  # Todas as pessoas detectadas
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
